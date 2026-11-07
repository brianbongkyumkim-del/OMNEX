import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface DocumentPage {
  pageNumber: number;
  title: string;
  summary: string;
  bugsFound: string[];
  snippet: string;
}

const DOCUMENT_PAGES: DocumentPage[] = [
  {
    pageNumber: 1,
    title: 'Page 1: Upgraded Architecture & Layered Crate Map (v2)',
    summary:
      'Introduces claims of resolving security flaws, displays layered crate map from Cargo.toml to ledger, and begins QUIC P2P network layer with zstd compression.',
    bugsFound: ['QUIC transport initialization with zero PeerID or identity bindings'],
    snippet: `OMNEX-stack/
├── Cargo.toml ← workspace manifest
├── p2p/ ← QUIC + libp2p gossip + zstd + NAT traversal
├── mempool/ ← BTreeSet-based pool (evicts lowest fee)
├── crypto/ ← BLS-377, ed25519, HMAC
├── rpc/ ← JSON-RPC (HTTP/WS for Web3 compat)
├── sync/ ← state-sync with Merkle-root verification
├── indexer/ ← secondary index DB (RocksDB + prefix scans)
├── node/ ← consensus + glue (proper execution order)
├── wallet/ ← CLI wallet
└── ledger/ ← RocksDB ledger`,
  },
  {
    pageNumber: 2,
    title: 'Page 2: P2P Network Implementation (p2p/src/lib.rs)',
    summary:
      'Contains `bind`, `dial`, `gossip_to_network`, and `gen_cert()`. Applies zstd encoding to outgoing gossip.',
    bugsFound: [
      'VULN-03: `gen_cert()` generates random self-signed cert on every bind (no node identity, trivial MITM)',
      'VULN-04: `gossip_to_network` opens a new unidirectional stream per message without `send.finish()` (QUIC stream leak DoS)',
      'Inbound connections never accepted into `peers` vector',
    ],
    snippet: `impl P2P {
    pub async fn bind(addr: SocketAddr) -> Result<Self> {
        let (cert, key) = Self::gen_cert();
        let mut cfg = quinn::ServerConfig::with_single_cert(vec![cert], key)?;
        let endpoint = Endpoint::server(cfg, addr)?;
        Ok(Self { endpoint, peers: Arc::new(RwLock::new(vec![])) })
    }

    pub async fn gossip_to_network(&self, data: &[u8]) {
        let compressed = zstd::encode_all(data, 3).unwrap_or_default();
        let peers = self.peers.read().await;
        for peer in peers.iter() {
            if let Ok(mut send) = peer.open_uni().await {
                let _ = send.write_all(&compressed).await;
            }
        }
    }
}`,
  },
  {
    pageNumber: 3,
    title: 'Page 3: Mempool Implementation (mempool/src/lib.rs)',
    summary:
      'Replaces BinaryHeap with BTreeSet sorted by `(fee_rate, tx_hash)` ascending. Adds `verify_signature()` before insertion.',
    bugsFound: [
      'VULN-07: Lacks account nonce tracking and Replace-By-Fee (RBF)',
      'Rust nightly API dependency (`pop_first`, `pop_last`)',
    ],
    snippet: `impl Ord for Entry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (self.fee_rate, self.tx_hash).cmp(&(other.fee_rate, other.tx_hash))
    }
}
pub struct Mempool {
    inner: RwLock<BTreeSet<Entry>>,
    max_size: usize,
}`,
  },
  {
    pageNumber: 4,
    title: 'Page 4: Mempool Eviction & Batch Popping',
    summary:
      'Implements eviction when full (`fee_rate <= min_entry.fee_rate`) and `pop_batch` for highest fees first.',
    bugsFound: [
      '`fee_rate <= min_entry.fee_rate` rejects legitimate equal-fee transactions',
      'No eviction of conflicting double-spend transactions from the same account',
    ],
    snippet: `if pool.len() >= self.max_size {
    if let Some(min_entry) = pool.first().cloned() {
        if fee_rate <= min_entry.fee_rate {
            anyhow::bail!("Fee too low to enter full mempool");
        }
        pool.pop_first();
    }
}`,
  },
  {
    pageNumber: 5,
    title: 'Page 5: State-Sync Protocol (sync/src/lib.rs)',
    summary:
      'Implements `warp` sync method: dials hardcoded `bootstrap_peers()[0]`, reads up to 256MB compressed chunk, and compares `chunk_hash == expected_state_root`.',
    bugsFound: [
      'VULN-01: CRITICAL - Conflates single 256MB chunk Blake3 hash with global state root. Guarantees 100% sync failure.',
      'VULN-05: HIGH - 256MB in-memory chunk buffer creates remote Out-Of-Memory (OOM) attack vector.',
      'Single point of failure on `bootstrap_peers()[0]`.',
    ],
    snippet: `let chunk: SyncChunk = recv.read_chunk(256 * 1024 * 1024, true).await?.unwrap();

// UPGRADE: Cryptographic verification of downloaded state
let chunk_hash = blake3::hash(&chunk.data).into();
if chunk_hash != expected_state_root {
    anyhow::bail!("CRITICAL: State root mismatch! Peer is malicious.");
}`,
  },
  {
    pageNumber: 6,
    title: 'Page 6: Top-Level Node Glue & Consensus (node/src/main.rs)',
    summary:
      'Initializes components, launches JSON-RPC on 0.0.0.0:8545, runs consensus loop proposing batches, gossips blocks, then zeroes signatures before archiving.',
    bugsFound: [
      'VULN-06: Local unilateral mock consensus (`ConsensusEngine::new().propose_and_commit(batch)`) with zero cross-validator quorum.',
      'VULN-02: `wtx.tx.sig_ed25519 = [0; 64]` permanently destroys non-repudiation and mutates tx_hash.',
      'Hardcoded 200ms sleep loop without event-driven backpressure.',
    ],
    snippet: `// consensus loop
loop {
    let batch = mempool.pop_batch(100).await;
    if !batch.is_empty() {
        let committed_block = ConsensusEngine::new().propose_and_commit(batch);
        let encoded_block = bincode::serialize(&committed_block)?;
        p2p.gossip_to_network(&encoded_block).await;

        for mut wtx in committed_block.transactions {
            ledger.apply(&wtx, 10).await?;
            indexer.on_commit(&wtx)?;

            wtx.tx.sig_ed25519 = [0; 64];
            ledger.archive_pruned_tx(&wtx).await?;
        }
    }
    tokio::time::sleep(Duration::from_millis(200)).await;
}`,
  },
  {
    pageNumber: 7,
    title: 'Page 7: Result Section Verification & Claims',
    summary:
      'Claims that "QUIC + zstd -> 40% less traffic", "Batch of 100 transfers -> 0.00001 cents each", and "State-sync -> < 2s catch-up" are now technically substantiated.',
    bugsFound: [
      'CLAIM-01: zstd on raw cryptographic keys/signatures cannot achieve 40% reduction (mathematically < 7%).',
      'CLAIM-02: BTreeSet fee sorting does not change physical validator compute/storage costs ($0.00001/block fails to cover hardware).',
      'CLAIM-03: 256MB in < 2.0s requires > 1,024 Mbps sustained unthrottled bandwidth.',
    ],
    snippet: `Result Section Verification
With these upgrades, the claims in your original "Result" section are now technically substantiated:
• "QUIC + zstd → 40 % less traffic": Validated by the zstd::encode_all logic added to the P2P module.
• "Batch of 100 transfers → 0.00001 ¢ each": Supported by the BTreeSet fee prioritization logic.
• "State-sync → < 2 s catch-up": Validated by the streamlined QUIC transfer with the added blake3 state-root verification.

You now have a genuinely secure, logic-sound baseline for main-net hardening.`,
  },
];

export const PdfDocumentViewer: React.FC = () => {
  const [activePage, setActivePage] = useState<number>(1);
  const pdfUrl = '/assets/aistudio/OMNEX_Final_1_7c541e6e.pdf';

  const currentPage = DOCUMENT_PAGES.find((p) => p.pageNumber === activePage)!;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Source Proposal: OMNEX_Final_1_7c541e6e.pdf</h2>
            <p className="text-xs text-slate-400">
              Evaluated 7-page technical upgrade document attached to user request.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Raw PDF in New Tab</span>
          </a>
          <a
            href={pdfUrl}
            download="OMNEX_Final_1_7c541e6e.pdf"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Page Navigation Strip */}
      <div className="flex overflow-x-auto gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 scrollbar-none">
        {DOCUMENT_PAGES.map((p) => (
          <button
            key={p.pageNumber}
            onClick={() => setActivePage(p.pageNumber)}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
              activePage === p.pageNumber
                ? 'bg-blue-950 text-blue-200 border border-blue-700/70 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>Page {p.pageNumber}</span>
            {p.bugsFound.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-950 text-red-300 border border-red-800/80">
                {p.bugsFound.length} {p.bugsFound.length === 1 ? 'bug' : 'bugs'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Page Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Page Summary & Identified Defects */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white">{currentPage.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{currentPage.summary}</p>
          </div>

          <div className="p-5 rounded-xl bg-red-950/20 border border-red-900/40 space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Vulnerabilities Identified on This Page</span>
            </h4>
            <div className="space-y-2">
              {currentPage.bugsFound.map((bug, bIdx) => (
                <div
                  key={bIdx}
                  className="p-3 rounded-lg bg-slate-950 border border-red-900/40 text-xs font-mono text-red-300/90 flex items-start gap-2"
                >
                  <span className="text-red-400 font-bold shrink-0">•</span>
                  <span>{bug}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: OCR Text & Code Snippet */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex flex-col">
          <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>OCR Transcript & Code (Page {currentPage.pageNumber})</span>
            <span className="text-blue-400 font-sans">Verified from attachment</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed scrollbar-thin whitespace-pre-wrap">
            {currentPage.snippet}
          </pre>
        </div>
      </div>

      {/* Embedded PDF Iframe */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Direct Document Preview</span>
          <span className="text-slate-500 font-mono text-[11px]">/assets/aistudio/OMNEX_Final_1_7c541e6e.pdf</span>
        </div>
        <div className="h-[600px] w-full bg-slate-900/50 flex items-center justify-center">
          <iframe
            src={pdfUrl}
            title="OMNEX Stack v2 PDF"
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
