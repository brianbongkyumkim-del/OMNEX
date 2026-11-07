export interface Finding {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvss: number;
  crate: 'p2p' | 'mempool' | 'sync' | 'node';
  file: string;
  lines: string;
  impact: string;
  attackScenario: string;
  rootCause: string;
  remediationSnippet: string;
}

export interface ClaimEvaluation {
  id: string;
  claim: string;
  originalText: string;
  verdict: 'UNFOUNDED' | 'MISLEADING' | 'PHYSICALLY_INFEASIBLE' | 'PARTIALLY_VALID';
  verdictLabel: string;
  analysis: string;
  mathBreakdown: string[];
  recommendation: string;
}

export interface CodeModule {
  id: 'p2p' | 'mempool' | 'sync' | 'node';
  title: string;
  file: string;
  description: string;
  originalCode: string;
  hardenedCode: string;
  keyIssues: string[];
}

export const AUDIT_SUMMARY = {
  documentTitle: "OMNEX-stack Architecture v2 (Technical Evaluation Follow-up)",
  attachmentPath: "/assets/aistudio/OMNEX_Final_1_7c541e6e.pdf",
  evaluationDate: "2026-11-07",
  overallVerdict: "FAILED SECURITY BASELINE - NOT READY FOR MAINNET HARDENING",
  overallScore: 28,
  metrics: [
    { name: "Cryptographic Soundness", score: 22, max: 100, status: "Critical Vulnerabilities" },
    { name: "P2P & Transport Security", score: 34, max: 100, status: "High Risk (MITM / Stream Leak)" },
    { name: "Mempool & DoS Resistance", score: 42, max: 100, status: "Moderate (Missing Nonce/RBF)" },
    { name: "Consensus Authority & Liveness", score: 18, max: 100, status: "Severe Flaw (Centralized/No Quorum)" },
    { name: "Benchmark Claims Feasibility", score: 25, max: 100, status: "Mathematically Unsubstantiated" },
  ],
  verdictExplanation:
    "While the v2 revision attempts to address previous findings (swapping BinaryHeap for BTreeSet, adding zstd compression, adding blake3 hashing), it introduces catastrophic cryptographic conflations (checking a single 256MB chunk hash against the global state root), destroys chain auditability and fork resolution by zeroing signatures before archival, leaves P2P completely vulnerable to MITM attacks through ephemeral self-signed certs, and retains an entirely non-distributed dummy consensus loop. The performance claims in the Results section are mathematically impossible or misattributed.",
};

export const FINDINGS: Finding[] = [
  {
    id: "VULN-01",
    title: "Catastrophic Conflation of Single Chunk Blake3 Hash with Global Merkle State Root",
    severity: "CRITICAL",
    cvss: 9.8,
    crate: "sync",
    file: "sync/src/lib.rs",
    lines: "Lines 25-27",
    impact:
      "State sync is guaranteed to fail for any multi-chunk state, or will accept corrupted state if an attacker can manipulate root parameters. No Merkle inclusion verification exists.",
    attackScenario:
      "In a real blockchain, state consists of millions of key-value pairs (accounts, balances, contracts) arranged in a Merkle Patricia Trie or Sparse Merkle Tree. The state root is a 32-byte cryptographic accumulator of the entire tree. The code does: `if chunk_hash != expected_state_root`. A chunk containing 256MB of raw accounts has a Blake3 hash that CANNOT equal the global state root unless the entire state is 1 chunk with zero tree hierarchy. Legitimate warp sync will reject all chunks from honest peers as 'malicious', bricking initial node sync.",
    rootCause:
      "Direct comparison of a flat partition hash with a hierarchical Merkle state root, omitting Merkle multiproof or range proof verification.",
    remediationSnippet: `// Verify chunk against Merkle state root using inclusion proof
let proof: MerkleRangeProof = bincode::deserialize(&recv.read_exact().await?)?;
if !proof.verify(expected_state_root, chunk.start_key, chunk.end_key, &chunk_hash) {
    anyhow::bail!("Chunk failed Merkle range inclusion proof against state root!");
}`,
  },
  {
    id: "VULN-02",
    title: "Signature Pruning Destroys Non-Repudiation, Chain Re-Org Auditing & Fork Proofs",
    severity: "CRITICAL",
    cvss: 9.1,
    crate: "node",
    file: "node/src/main.rs",
    lines: "Lines 32-34",
    impact:
      "Permanent destruction of transaction authenticity. The local database cannot prove sender authorization during chain re-orgs, historical audits, or dispute resolutions.",
    attackScenario:
      "The code zeroes out Ed25519 signatures: `wtx.tx.sig_ed25519 = [0; 64]; ledger.archive_pruned_tx(&wtx).await?;`. If a 2-block chain re-organization occurs, or if state needs to be rewound to re-execute transactions, the node can no longer verify that past transactions were authorized by account owners. Furthermore, if `tx_hash` is computed over the entire `WireTx`, zeroing the signature permanently corrupts the transaction hash, causing all indexer lookups by transaction ID to return mismatched hashes.",
    rootCause:
      "Mutating signed cryptographic payloads in-place before archival, confusing witness-segregated archival with irreversible zeroing of cryptographic witnesses.",
    remediationSnippet: `// Segregate witness (signature) into cold witness column family rather than zeroing
// Preserve cryptographic hash integrity and historical non-repudiation
ledger.archive_tx_with_witness(&wtx.tx, &wtx.witness).await?;`,
  },
  {
    id: "VULN-03",
    title: "Ephemeral Self-Signed TLS Certificates Prevent Node Identity & Enable Trivial MITM",
    severity: "CRITICAL",
    cvss: 8.9,
    crate: "p2p",
    file: "p2p/src/lib.rs",
    lines: "Lines 31-33",
    impact:
      "Total absence of P2P node identity (PeerID). Any malicious actor can intercept traffic, inject poisoned messages, perform Sybil attacks, or impersonate bootstrap nodes.",
    attackScenario:
      "`rcgen::generate_simple_self_signed(vec![\"OMNEX\".into()]).unwrap().into()` generates a brand new throwaway RSA/ECDSA key and certificate every time the node starts. Nodes do not authenticate peer public keys, do not pin bootstrap identities, and do not verify certificate chains. An attacker executing ARP spoofing or DNS poisoning on validator subnets can seamlessly terminate QUIC connections without detection.",
    rootCause:
      "Throwaway certificate generation without libp2p cryptographic PeerID derivation (e.g. Ed25519 node keypair) or TLS certificate pinning.",
    remediationSnippet: `// Load persistent node identity keypair and generate TLS cert bound to PeerID
let node_key = load_or_generate_identity(&config.identity_path)?;
let cert = generate_peer_bound_cert(&node_key, "OMNEX-NETWORK-V2")?;
let verifier = Arc::new(PeerIdCertificateVerifier::new());
cfg.client_config.dangerous().set_certificate_verifier(verifier);`,
  },
  {
    id: "VULN-04",
    title: "QUIC Stream Leak & Unbounded Stream Creation in Gossip Protocol",
    severity: "HIGH",
    cvss: 7.8,
    crate: "p2p",
    file: "p2p/src/lib.rs",
    lines: "Lines 22-26",
    impact:
      "Rapid exhaustion of QUIC MaxUniStreams connection limit; crashes P2P connections under moderate block gossip frequency.",
    attackScenario:
      "In `gossip_to_network`, for every peer and for every gossiped block/tx, `peer.open_uni().await` opens a new unidirectional stream. The code neither closes/finishes the stream (`send.finish().await`) nor awaits stream acknowledgments. QUIC protocol limits active streams per connection (`max_concurrent_uni_streams`, typically 100-256). Within seconds of gossip traffic, stream limits are hit, `open_uni()` stalls or throws an error, causing gossip to silently drop (`if let Ok(...)`).",
    rootCause:
      "Treating unidirectional QUIC streams as fire-and-forget datagrams rather than long-lived multiplexed streams or native QUIC datagrams.",
    remediationSnippet: `// Use QUIC datagrams for small gossip or reuse long-lived multiplexed gossip stream
for peer in peers.iter() {
    // Or open stream, write, and explicitly finish:
    if let Ok(mut send) = peer.open_uni().await {
        let _ = send.write_all(&compressed).await;
        let _ = send.finish().await;
    }
}`,
  },
  {
    id: "VULN-05",
    title: "Unbounded 256MB In-Memory Buffering Creates Remote Out-Of-Memory (OOM) Vector",
    severity: "HIGH",
    cvss: 7.5,
    crate: "sync",
    file: "sync/src/lib.rs",
    lines: "Lines 18-20",
    impact:
      "Single malicious peer can crash syncing validator nodes by forcing concurrent 256MB in-memory buffer allocations.",
    attackScenario:
      "`recv.read_chunk(256 * 1024 * 1024, true).await?.unwrap();` instructs the runtime to allocate up to 256 megabytes in heap memory for a single network chunk. If a node syncs from 4 peers or requests multiple chunks concurrently, 1GB to 4GB of RAM is instantly requested. An attacker running a slow-loris or oversized payload generator can exhaust validator memory, triggering the Linux OOM-killer.",
    rootCause:
      "Oversized 256MB monolithic chunk boundary instead of 2MB-4MB pipelined, streaming chunk boundaries with bounded memory pools.",
    remediationSnippet: `// Pipeline into 4MB bounded chunks with streaming Blake3 hasher
const CHUNK_SIZE: usize = 4 * 1024 * 1024; // 4MB
let mut hasher = blake3::Hasher::new();
while let Some(bytes) = recv.read_chunk_stream(CHUNK_SIZE).await? {
    hasher.update(&bytes);
    ledger.stream_write_chunk(&bytes)?;
}`,
  },
  {
    id: "VULN-06",
    title: "Consensus Loop is Completely Local & Centralized Without Validator Quorum",
    severity: "HIGH",
    cvss: 8.2,
    crate: "node",
    file: "node/src/main.rs",
    lines: "Lines 22-26",
    impact:
      "Zero network consensus. The node acts as an isolated unilateral dictator, committing blocks without cross-validator voting or cryptographic quorum.",
    attackScenario:
      "`ConsensusEngine::new().propose_and_commit(batch)` is invoked inside each node's local loop without exchanging pre-vote or pre-commit messages, without leader election, and without aggregating 2/3 + 1 threshold signatures. Every node running this loop will propose different batches in different orders, immediately causing 100% network fork divergence on block 1.",
    rootCause:
      "Replacing multi-validator BFT consensus (e.g. Tendermint/CometBFT/HotStuff) with a local deterministic commit call.",
    remediationSnippet: `// True distributed BFT round
let proposal = consensus_engine.create_proposal(batch, current_height, current_round);
p2p.broadcast_proposal(&proposal).await?;
let quorum_certificate = consensus_engine.wait_for_2f_plus_1_precommits(proposal.id).await?;
ledger.commit_with_qc(&proposal, &quorum_certificate).await?;`,
  },
  {
    id: "VULN-07",
    title: "Mempool Lacks Account Nonce Tracking, Double-Spend Eviction, and RBF",
    severity: "MEDIUM",
    cvss: 6.5,
    crate: "mempool",
    file: "mempool/src/lib.rs",
    lines: "Lines 38-48",
    impact:
      "Mempool spam and lock-up. Competing conflicting transactions cannot be replaced with higher fees, and accounts can spam invalid future nonces.",
    attackScenario:
      "The mempool only indexes by `(fee_rate, tx_hash)`. It does not index by `sender_account` or `nonce`. If Alice sends a transaction with nonce 1 and fee 10, then sends an emergency replacement with fee 100 to cancel it, the mempool stores both. Miners will pop the highest fee first, which may execute out of order or fail state execution, leaving the lower-fee transaction stuck or causing non-deterministic execution order.",
    rootCause:
      "Flat BTreeSet ordered strictly by fee without per-account dependency tracking.",
    remediationSnippet: `// Multi-index pool: ByAccountNonce for validity and ByFeeRate for block proposal
struct Mempool {
    by_account: HashMap<Address, BTreeMap<u64, WireTx>>,
    by_fee: BTreeSet<FeeEntry>,
}`,
  },
];

export const CODE_MODULES: CodeModule[] = [
  {
    id: "p2p",
    title: "1. P2P Network Layer (`p2p/src/lib.rs`)",
    file: "p2p/src/lib.rs",
    description: "QUIC transport with zstd compression and connection management",
    originalCode: `//! QUIC-based network layer with zstd compression
use quinn::{Connection, Endpoint};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct P2P {
    endpoint: Endpoint,
    peers: Arc<RwLock<Vec<Connection>>>, // UPGRADE: Track actual network peers
}

impl P2P {
    pub async fn bind(addr: SocketAddr) -> Result<Self> {
        let (cert, key) = Self::gen_cert();
        let mut cfg = quinn::ServerConfig::with_single_cert(vec![cert], key)?;
        let endpoint = Endpoint::server(cfg, addr)?;
        Ok(Self { endpoint, peers: Arc::new(RwLock::new(vec![])) })
    }

    pub async fn dial(&self, peer: SocketAddr) -> Result<Connection> {
        let conn = self.endpoint.connect(peer, "OMNEX")?.await?;
        self.peers.write().await.push(conn.clone());
        Ok(conn)
    }

    // UPGRADE: Actual network gossip with zstd compression
    pub async fn gossip_to_network(&self, data: &[u8]) {
        let compressed = zstd::encode_all(data, 3).unwrap_or_default();
        let peers = self.peers.read().await;

        for peer in peers.iter() {
            if let Ok(mut send) = peer.open_uni().await {
                let _ = send.write_all(&compressed).await;
            }
        }
    }

    fn gen_cert() -> (rustls::Certificate, rustls::PrivateKey) {
        rcgen::generate_simple_self_signed(vec!["OMNEX".into()]).unwrap().into()
    }
}`,
    hardenedCode: `//! Production Hardened QUIC Network Layer
use quinn::{Connection, Endpoint, ServerConfig, ClientConfig, TransportConfig};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

pub struct HardenedP2P {
    endpoint: Endpoint,
    // Track peers by cryptographic NodeID with connection health state
    peers: Arc<RwLock<HashMap<NodeId, PeerSession>>>,
    node_keypair: ed25519_dalek::Keypair,
}

pub struct PeerSession {
    connection: Connection,
    last_seen: std::time::Instant,
}

impl HardenedP2P {
    pub async fn bind(addr: SocketAddr, keypair: ed25519_dalek::Keypair) -> Result<Self> {
        // Persistent certificate pinned to NodeID public key
        let (cert, key) = Self::generate_node_identity_cert(&keypair)?;
        let mut transport = TransportConfig::default();
        transport.max_concurrent_uni_streams(512u32.into());
        transport.keep_alive_interval(Some(std::time::Duration::from_secs(5)));

        let mut server_cfg = ServerConfig::with_single_cert(vec![cert], key)?;
        server_cfg.transport_config(Arc::new(transport));

        let endpoint = Endpoint::server(server_cfg, addr)?;
        let p2p = Self {
            endpoint,
            peers: Arc::new(RwLock::new(HashMap::new())),
            node_keypair: keypair,
        };

        // Start inbound connection accept loop (missing in v2!)
        p2p.spawn_accept_loop();
        Ok(p2p)
    }

    pub async fn gossip_to_network(&self, data: &[u8]) {
        // Only compress if payload is non-cryptographic or exceeds threshold
        let payload = if data.len() > 1024 {
            zstd::encode_all(data, 3).unwrap_or_else(|_| data.to_vec())
        } else {
            data.to_vec()
        };

        let peers = self.peers.read().await;
        for (peer_id, session) in peers.iter() {
            // Explicitly finish stream to prevent stream leak DoS
            if let Ok(mut send) = session.connection.open_uni().await {
                tokio::spawn(async move {
                    let _ = send.write_all(&payload).await;
                    let _ = send.finish().await; // Critical: free QUIC stream ID!
                });
            }
        }
    }
}`,
    keyIssues: [
      "Ephemeral self-signed cert on every bind destroys node identity & invites MITM attacks",
      "No inbound accept loop: nodes can dial out, but never accept incoming connections into peers list",
      "Stream leak: `peer.open_uni()` called without `send.finish()` exhausts QUIC stream limits",
      "No dead-peer eviction: `Vec<Connection>` grows monotonically with defunct connections",
    ],
  },
  {
    id: "mempool",
    title: "2. Mempool Layer (`mempool/src/lib.rs`)",
    file: "mempool/src/lib.rs",
    description: "BTreeSet transaction priority queue and eviction engine",
    originalCode: `use std::collections::BTreeSet;
use tokio::sync::RwLock;

#[derive(Eq, PartialEq, Clone)]
struct Entry {
    fee_rate: u64, // µ¢ per byte
    tx_hash: [u8; 32],
    wtx: OMNEX_stack::proto::WireTx,
}

// UPGRADE: Sort by fee_rate, then hash.
impl Ord for Entry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (self.fee_rate, self.tx_hash).cmp(&(other.fee_rate, other.tx_hash))
    }
}
impl PartialOrd for Entry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

pub struct Mempool {
    // UPGRADE: BTreeSet allows popping both max (for blocks) and min (for eviction)
    inner: RwLock<BTreeSet<Entry>>,
    max_size: usize,
}

impl Mempool {
    pub fn new(max: usize) -> Self {
        Self { inner: RwLock::new(BTreeSet::new()), max_size: max }
    }

    pub async fn insert(&self, wtx: OMNEX_stack::proto::WireTx, fee_rate: u64) -> Result<()> {
        // UPGRADE: Validate cryptographic signature before polluting mempool
        if !wtx.verify_signature() {
            anyhow::bail!("Invalid transaction signature");
        }

        let mut pool = self.inner.write().await;
        let hash = blake3::hash(&bincode::serialize(&wtx)?).into();

        if pool.len() >= self.max_size {
            // UPGRADE: Evict lowest fee transaction to prevent cheap DoS attacks
            if let Some(min_entry) = pool.first().cloned() {
                if fee_rate <= min_entry.fee_rate {
                    anyhow::bail!("Fee too low to enter full mempool");
                }
                pool.pop_first();
            }
        }

        pool.insert(Entry { fee_rate, tx_hash: hash, wtx });
        Ok(())
    }

    pub async fn pop_batch(&self, n: usize) -> Vec<OMNEX_stack::proto::WireTx> {
        let mut pool = self.inner.write().await;
        let mut batch = Vec::new();
        // UPGRADE: Pop highest fees first
        for _ in 0..n {
            if let Some(entry) = pool.pop_last() {
                batch.push(entry.wtx);
            } else {
                break;
            }
        }
        batch
    }
}`,
    hardenedCode: `use std::collections::{BTreeMap, BTreeSet, HashMap};
use tokio::sync::RwLock;

pub struct HardenedMempool {
    // Multi-index architecture:
    // 1. Fee ordering for block packaging
    by_fee: RwLock<BTreeSet<FeeIndex>>,
    // 2. Account nonce tracking to prevent double-spends and enable RBF
    by_account: RwLock<HashMap<[u8; 32], BTreeMap<u64, StagedTx>>>,
    max_size: usize,
}

impl HardenedMempool {
    pub async fn insert(&self, wtx: WireTx, fee_rate: u64) -> Result<()> {
        // 1. Stateless signature check
        if !wtx.verify_signature() {
            anyhow::bail!("Cryptographic signature verification failed");
        }

        let sender = wtx.sender();
        let nonce = wtx.nonce();
        let hash = wtx.compute_hash();

        let mut by_account = self.by_account.write().await;
        let mut by_fee = self.by_fee.write().await;

        // 2. Check for Replace-By-Fee (RBF) if same account + same nonce
        if let Some(existing) = by_account.get_mut(&sender).and_then(|m| m.get(&nonce)) {
            if fee_rate < existing.fee_rate * 110 / 100 {
                anyhow::bail!("RBF requires at least 10% higher fee rate");
            }
            // Evict old transaction and replace
            by_fee.remove(&existing.to_fee_index());
        }

        // 3. Pool capacity check with proper eviction
        if by_fee.len() >= self.max_size {
            let min_entry = by_fee.iter().next().cloned().unwrap();
            if fee_rate <= min_entry.fee_rate {
                anyhow::bail!("Fee insufficient to displace existing transactions");
            }
            by_fee.remove(&min_entry);
            // Also clean up from account map
            if let Some(account_txs) = by_account.get_mut(&min_entry.sender) {
                account_txs.remove(&min_entry.nonce);
            }
        }

        // Insert into both indices
        let staged = StagedTx { wtx, fee_rate, hash, sender, nonce };
        by_fee.insert(staged.to_fee_index());
        by_account.entry(sender).or_default().insert(nonce, staged);
        Ok(())
    }
}`,
    keyIssues: [
      "`BTreeSet::pop_first()` and `pop_last()` are unstable nightly features in standard Rust",
      "No account nonce awareness: allows memory exhaustion with future nonces or conflicting double spends",
      "No Replace-By-Fee (RBF) mechanism: transactions stuck with low fees cannot be bumped",
      "`fee_rate <= min_entry.fee_rate` rejects equal-fee legitimate transactions when pool is full",
    ],
  },
  {
    id: "sync",
    title: "3. State-Sync Protocol (`sync/src/lib.rs`)",
    file: "sync/src/lib.rs",
    description: "Fast-sync / warp sync with chunk verification and ledger commit",
    originalCode: `use OMNEX_stack::p2p::P2P;
use OMNEX_stack::ledger::Ledger;

pub struct Sync {
    p2p: P2P,
    ledger: Ledger,
}

impl Sync {
    pub async fn warp(&self, target_height: u64, expected_state_root: [u8; 32]) -> Result<()> {
        let conn = self.p2p.dial(self.p2p.bootstrap_peers()[0]).await?;
        let (mut send, mut recv) = conn.open_bi().await?;

        send.write_all(&bincode::serialize(&SyncRequest::Warp(target_height))?).await?;

        // Read compressed chunk
        let chunk: SyncChunk = recv.read_chunk(256 * 1024 * 1024, true).await?.unwrap();

        // UPGRADE: Cryptographic verification of downloaded state
        let chunk_hash = blake3::hash(&chunk.data).into();
        if chunk_hash != expected_state_root {
            anyhow::bail!("CRITICAL: State root mismatch! Peer is malicious.");
        }

        let batch = chunk.into_batch()?;
        self.ledger.write_batch(batch)?;

        Ok(())
    }
}`,
    hardenedCode: `use OMNEX_stack::p2p::P2P;
use OMNEX_stack::ledger::Ledger;

pub struct HardenedSync {
    p2p: P2P,
    ledger: Ledger,
}

impl HardenedSync {
    pub async fn warp(&self, target_height: u64, expected_state_root: [u8; 32]) -> Result<()> {
        // Multi-peer round-robin with fallback (never hardcode [0])
        let peer = self.p2p.select_reputable_peer().await?;
        let conn = self.p2p.dial(peer).await?;
        let (mut send, mut recv) = conn.open_bi().await?;

        send.write_all(&bincode::serialize(&SyncRequest::Warp(target_height))?).await?;

        // Stream in bounded 4MB chunks to prevent 256MB heap OOM attacks
        const MAX_CHUNK_SIZE: usize = 4 * 1024 * 1024;
        let mut committed_chunks = 0;

        while let Some(chunk_envelope) = recv.read_chunk_envelope(MAX_CHUNK_SIZE).await? {
            // Verify Merkle Range Inclusion Proof against expected_state_root!
            // A chunk hash is NEVER equal to the global state root in a trie!
            if !chunk_envelope.merkle_proof.verify(
                expected_state_root,
                &chunk_envelope.key_range,
                &chunk_envelope.chunk_data,
            ) {
                anyhow::bail!("Merkle proof verification failed for state chunk {}", committed_chunks);
            }

            self.ledger.write_batch(chunk_envelope.into_batch()?)?;
            committed_chunks += 1;
        }

        // Final verification: compute local tree root and assert match
        let local_root = self.ledger.compute_state_root()?;
        if local_root != expected_state_root {
            anyhow::bail!("Final state root mismatch after applying all chunks");
        }

        Ok(())
    }
}`,
    keyIssues: [
      "CRITICAL: Compares raw chunk Blake3 hash directly to expected_state_root (impossible in multi-chunk trie)",
      "Single point of failure: `bootstrap_peers()[0]` panics if empty or fails if peer 0 is down",
      "OOM vulnerability: Allocates 256MB buffer in memory in a single syscall (`read_chunk(256 * 1024 * 1024)`)",
      "No rollback mechanism if `write_batch` fails midway through corrupted chunks",
    ],
  },
  {
    id: "node",
    title: "4. Top-Level Node Glue & Consensus (`node/src/main.rs`)",
    file: "node/src/main.rs",
    description: "Main server initialization, JSON-RPC, consensus loop, signature pruning",
    originalCode: `#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let p2p = P2P::bind("0.0.0.0:9000".parse()?).await?;
    let ledger = Ledger::open("ledger.db")?;
    let mempool = Mempool::new(10_000);
    let indexer = Indexer::new("index.db")?;

    // UPGRADE: Start RPC server over standard HTTP for Web3 tool compatibility
    let rpc_srv = RpcServer::new(ledger.clone(), mempool.clone());
    let server = jsonrpsee::server::ServerBuilder::default()
        .build("0.0.0.0:8545")
        .await?;
    let _rpc_handle = server.start(rpc_srv.into_rpc());

    // consensus loop
    loop {
        let batch = mempool.pop_batch(100).await;

        if !batch.is_empty() {
            let committed_block = ConsensusEngine::new().propose_and_commit(batch);

            // UPGRADE: Gossip the block WITH valid signatures first!
            let encoded_block = bincode::serialize(&committed_block)?;
            p2p.gossip_to_network(&encoded_block).await;

            // Apply to local state
            for mut wtx in committed_block.transactions {
                ledger.apply(&wtx, 10).await?;
                indexer.on_commit(&wtx)?;

                // UPGRADE: Prune signatures only AFTER propagation and validation
                // for local cold-storage space savings.
                wtx.tx.sig_ed25519 = [0; 64];
                ledger.archive_pruned_tx(&wtx).await?;
            }
        }

        tokio::time::sleep(Duration::from_millis(200)).await;
    }
}`,
    hardenedCode: `#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();

    let keypair = load_validator_keypair("validator.key")?;
    let p2p = HardenedP2P::bind("0.0.0.0:9000".parse()?, keypair.clone()).await?;
    let ledger = Ledger::open("ledger.db")?;
    let mempool = HardenedMempool::new(10_000);
    let indexer = Indexer::new("index.db")?;

    // Start JSON-RPC server with CORS and rate limits
    let rpc_srv = RpcServer::new(ledger.clone(), mempool.clone());
    let server = jsonrpsee::server::ServerBuilder::default()
        .build("0.0.0.0:8545")
        .await?;
    let _rpc_handle = server.start(rpc_srv.into_rpc());

    // Distributed BFT Consensus Engine (e.g. Tendermint/CometBFT)
    let consensus = BftConsensus::new(keypair, p2p.clone(), ledger.clone());

    // Main consensus engine loop (multi-validator round)
    while let Some(event) = consensus.next_event().await {
        match event {
            ConsensusEvent::ProposeRound(round) => {
                let batch = mempool.pop_batch(100).await;
                consensus.broadcast_proposal(round, batch).await?;
            }
            ConsensusEvent::BlockDecided(committed_block, quorum_cert) => {
                // Apply block verified by 2/3 + 1 validator signatures
                for wtx in &committed_block.transactions {
                    ledger.apply(wtx, committed_block.height).await?;
                    indexer.on_commit(wtx)?;

                    // ARCHIVAL: Segregate witness into cold storage without mutating hash!
                    // Do NOT overwrite sig_ed25519 with zeros in the tx record!
                    ledger.archive_with_segregated_witness(&wtx.tx, &wtx.witness).await?;
                }
            }
        }
    }
    Ok(())
}`,
    keyIssues: [
      "`ConsensusEngine::new().propose_and_commit(batch)` is purely unilateral/local (no multi-party consensus)",
      "Zeroing out signatures (`wtx.tx.sig_ed25519 = [0; 64]`) destroys non-repudiation and mutates tx hash",
      "Fixed 200ms sleep loop causes high CPU idle churn and lacks backpressure",
      "Unbounded JSON-RPC server on 0.0.0.0:8545 without rate limiting or authentication",
    ],
  },
];

export const CLAIMS_EVALUATION: ClaimEvaluation[] = [
  {
    id: "CLAIM-01",
    claim: "QUIC + zstd → 40% less traffic",
    originalText: "Validated by the zstd::encode_all logic added to the P2P module.",
    verdict: "UNFOUNDED",
    verdictLabel: "Mathematically Unsound (< 5-8% Realistic)",
    analysis:
      "A blockchain wire transaction (`WireTx`) consists overwhelmingly of raw cryptographic data: 32-byte Ed25519/BLS public keys, 64-byte Ed25519 signatures, and 32-byte Blake3/SHA256 hashes. Cryptographic outputs have a Shannon entropy approaching 8.0 bits per byte (indistinguishable from pseudo-random noise). Under DEFLATE, zlib, or zstd compression, random noise cannot be compressed and often slightly expands due to framing headers. In a standard 152-byte transfer, 128 bytes (84.2%) are incompressible cryptographic signatures and keys. Only ~24 bytes of metadata (nonce, small amounts, type flags) can be compressed. Real-world bandwidth reduction for wire transactions is 4% to 7% at best, making the 40% claim impossible for transaction gossip.",
    mathBreakdown: [
      "Total WireTx size: ~152 bytes",
      "Cryptographic payload (Sender Pubkey [32B] + Recipient Pubkey [32B] + Signature [64B]): 128 bytes (84.2%)",
      "Entropy of Ed25519 signature & keys: ~7.994 bits/byte (Kolmogorov complexity maximum)",
      "Theoretical maximum compression on 128B crypto payload: 0%",
      "Metadata payload (amount, fee, nonce): ~24 bytes (15.8%) compressible by ~40% -> saves ~10 bytes",
      "Net realistic compression ratio: (10 / 152) = 6.57% traffic reduction (NOT 40%)",
    ],
    recommendation:
      "To actually achieve 40%+ traffic reduction, implement transaction format compression (e.g., Compact Blocks / BIP 152, Erlay minisketch set reconciliation, or BLS signature aggregation), not generic zstd on raw signed wire transactions.",
  },
  {
    id: "CLAIM-02",
    claim: "Batch of 100 transfers → 0.00001 ¢ each",
    originalText:
      "Supported by the BTreeSet fee prioritization logic, ensuring network spam is dropped while efficiently packing blocks.",
    verdict: "MISLEADING",
    verdictLabel: "Economic Fallacy (Fee Sorting != Operating Cost)",
    analysis:
      "The document confuses a mempool's sorting policy with the real economic and infrastructural floor cost of running a decentralized blockchain. BTreeSet merely sorts entries in RAM by the number provided in `fee_rate`. It does not reduce the cost of state storage in RocksDB, SSD write amplification, network bandwidth egress on validators, or consensus message complexity. 0.00001 cents ($0.0000001 per tx) implies a block revenue of $0.00001 per 100 transactions, which fails to cover the basic electricity and AWS/bare-metal server cost of validator hardware.",
    mathBreakdown: [
      "Claimed fee: 0.00001 ¢ = $0.0000001 per transfer",
      "Per block of 100 txs: Total validator revenue = $0.0000100 (one-thousandth of a cent)",
      "Block interval: 200ms -> 5 blocks/sec -> 432,000 blocks/day",
      "Daily state bloat (100 txs * 152B * 432,000): ~6.56 GB of new state data per day (2.39 TB/year)",
      "Validator SSD storage & egress cost: > $5.00 - $15.00/day",
      "Validator daily revenue at claimed fee: $4.32/day (net negative operation, leading to validator centralization/abandonment)",
    ],
    recommendation:
      "Tie minimum fees to dynamic base fee mechanisms (EIP-1559 style) tied to byte size and state storage rent, rather than assuming arbitrary sub-penny fee stability.",
  },
  {
    id: "CLAIM-03",
    claim: "State-sync → < 2 s catch-up",
    originalText:
      "Validated by the streamlined QUIC transfer with the added blake3 state-root verification (ensuring it's fast and secure).",
    verdict: "PHYSICALLY_INFEASIBLE",
    verdictLabel: "Physically Infeasible on Standard Internet",
    analysis:
      "In `sync/src/lib.rs`, the code attempts to download a single chunk of up to 256 MB (`256 * 1024 * 1024`). Transferring 256 megabytes (2,048 Megabits) of raw state over the internet in less than 2.0 seconds requires a sustained, unthrottled line speed exceeding 1,024 Mbps (1.024 Gbps), assuming 0% packet loss, zero QUIC congestion window warm-up (slow-start), and zero latency. On a typical residential or cloud broadband connection (100-300 Mbps), transferring 256MB takes 7 to 25 seconds. Furthermore, hashing 256MB with Blake3 and deserializing bincode into RocksDB takes an additional 0.8-1.5 seconds.",
    mathBreakdown: [
      "Chunk size: 256 MB = 268,435,456 bytes = 2,147,483,648 bits",
      "Transfer time at 100 Mbps: 21.47 seconds",
      "Transfer time at 250 Mbps: 8.59 seconds",
      "Transfer time at 1,000 Mbps (1 Gbps): 2.15 seconds (still exceeds 2s target!)",
      "Minimum network throughput required for 1.5s transfer: 1,431 Mbps (1.43 Gbps sustained)",
      "Blake3 hashing (256MB): ~0.085s (on high-end AVX-512 CPU)",
      "Bincode deserialization & RocksDB write batch commit: ~1.28s",
      "Total minimum catchup duration on 100 Mbps line: ~22.8 seconds (1,140% slower than claim)",
    ],
    recommendation:
      "State sync should use pipelined multi-source range synchronization with 2MB-4MB chunk sizes, snapshot manifests, and concurrent peer downloading with Merkle branch proofs.",
  },
];
