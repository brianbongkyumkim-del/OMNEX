import React from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  Zap,
  Server,
  Lock,
  Wifi,
  FileCode,
  Activity,
  GitBranch,
} from 'lucide-react';
import { AUDIT_SUMMARY, FINDINGS, CLAIMS_EVALUATION } from '../data/auditData';
import { TabType } from './Header';

interface ExecutiveSummaryProps {
  onNavigateTab: (tab: TabType) => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/40 border border-red-900/40 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-300 border border-red-700/60">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>SECURITY AUDIT VERDICT: CRITICAL FAILURE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              OMNEX-Stack v2 Architecture Audit & Evaluation
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We performed an exhaustive line-by-line cryptographic, networking, and consensus audit of the{' '}
              <strong className="text-white">OMNEX v2 upgrade proposal</strong>. While this version swaps a BinaryHeap
              for BTreeSet and adds Blake3 and zstd,{' '}
              <span className="text-red-300 font-semibold underline decoration-red-500/60">
                it introduces fatal cryptographic bugs, destroys transaction non-repudiation, suffers from QUIC stream leaks,
                and relies on an entirely centralized mock consensus engine
              </span>
              . It cannot withstand hostile mainnet adversarial conditions.
            </p>
          </div>

          {/* Readiness Score Card */}
          <div className="shrink-0 w-full sm:w-auto p-5 rounded-xl bg-slate-950/80 border border-red-800/60 text-center flex flex-col items-center justify-center min-w-[220px]">
            <span className="text-xs uppercase font-mono text-slate-400 font-bold tracking-wider">
              Mainnet Readiness Score
            </span>
            <div className="my-2 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-black text-red-400">28</span>
              <span className="text-xl font-bold text-slate-500">/ 100</span>
            </div>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-950 text-red-300 border border-red-800/60">
              NOT MAINNET READY
            </span>
            <p className="text-[11px] text-slate-400 mt-2">
              7 severe defects • 3 invalid claims
            </p>
          </div>
        </div>

        {/* Quick Metric Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-8 pt-6 border-t border-slate-800/80">
          {AUDIT_SUMMARY.metrics.map((m, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-medium">{m.name}</span>
                <span className="font-mono font-bold text-red-400">{m.score}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    m.score < 30 ? 'bg-red-500' : m.score < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${m.score}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block truncate">{m.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The 4 Catastrophic Architectural Defects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <span>The 4 Fatal Flaws Discovered in OMNEX v2</span>
            </h3>
            <p className="text-xs text-slate-400">
              Direct implementation defects from the submitted Rust snippets that will cause catastrophic network failure.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('vulnerabilities')}
            className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 group"
          >
            <span>View All 7 Findings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Defect 1 */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-red-900/40 hover:border-red-700/60 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                CRITICAL • CVSS 9.8
              </span>
              <span className="text-xs text-slate-400 font-mono">sync/src/lib.rs:25</span>
            </div>
            <h4 className="text-base font-bold text-white">
              1. Flat Chunk Hash Conflated With Merkle State Root
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              The warp sync code checks{' '}
              <code className="text-red-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                chunk_hash != expected_state_root
              </code>
              . A 256MB chunk of accounts is merely a leaf/partition of state. In any tree-structured ledger, a chunk's flat Blake3 hash is mathematically incapable of matching the tree's global Merkle state root. Honest peers are immediately ejected as "malicious".
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 text-xs text-red-300/90 font-mono border border-red-900/30">
              let chunk_hash = blake3::hash(&chunk.data).into();<br />
              if chunk_hash != expected_state_root &#123; bail!("State root mismatch!"); &#125;
            </div>
          </div>

          {/* Defect 2 */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-red-900/40 hover:border-red-700/60 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                CRITICAL • CVSS 9.1
              </span>
              <span className="text-xs text-slate-400 font-mono">node/src/main.rs:32</span>
            </div>
            <h4 className="text-base font-bold text-white">
              2. Signature Zeroing Destroys Non-Repudiation & Re-Org Auditing
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              The consensus loop zeros signatures before archiving:{' '}
              <code className="text-red-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                wtx.tx.sig_ed25519 = [0; 64]
              </code>
              . This permanently erases user authorization proofs from the ledger. If a chain reorganization occurs, past blocks cannot be validated. It also mutates the transaction hash, causing all indexer queries to break.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 text-xs text-red-300/90 font-mono border border-red-900/30">
              wtx.tx.sig_ed25519 = [0; 64]; // UPGRADE: Prune signatures<br />
              ledger.archive_pruned_tx(&wtx).await?;
            </div>
          </div>

          {/* Defect 3 */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-red-900/40 hover:border-red-700/60 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                CRITICAL • CVSS 8.9
              </span>
              <span className="text-xs text-slate-400 font-mono">p2p/src/lib.rs:31</span>
            </div>
            <h4 className="text-base font-bold text-white">
              3. Ephemeral Self-Signed TLS Destroys Node Identity & Enables MITM
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every time a node binds, it calls{' '}
              <code className="text-red-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                rcgen::generate_simple_self_signed(vec!["OMNEX".into()])
              </code>
              . There is no persistent node identity (PeerID), no public key pinning, and no certificate verification. Any adversary on the network can impersonate bootstrap nodes or decrypt/modify QUIC streams at will.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 text-xs text-red-300/90 font-mono border border-red-900/30">
              fn gen_cert() -&gt; (rustls::Certificate, rustls::PrivateKey) &#123;<br />
              &nbsp;&nbsp;rcgen::generate_simple_self_signed(vec!["OMNEX".into()]).unwrap().into()<br />
              &#125;
            </div>
          </div>

          {/* Defect 4 */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-amber-900/40 hover:border-amber-700/60 transition-colors space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                HIGH • CVSS 8.2
              </span>
              <span className="text-xs text-slate-400 font-mono">node/src/main.rs:22</span>
            </div>
            <h4 className="text-base font-bold text-white">
              4. Consensus Loop is Entirely Local (Zero Quorum Consensus)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              The node executes{' '}
              <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                ConsensusEngine::new().propose_and_commit(batch)
              </code>{' '}
              in an isolated unilateral loop. There is no Byzantine Fault Tolerant (BFT) voting, no threshold signatures, no leader schedule, and no quorum certificate. Every validator will create divergent conflicting blocks, instantly partitioning the network.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 text-xs text-amber-300/90 font-mono border border-amber-900/30">
              // Local commit without cross-validator voting or 2/3 quorum!<br />
              let committed_block = ConsensusEngine::new().propose_and_commit(batch);
            </div>
          </div>
        </div>
      </div>

      {/* Layered Crate Map vs Reality */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Layered Crate Map Analysis (Document Claim vs Technical Reality)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Evaluation of the architectural layers proposed in Page 1 of the PDF.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Crate</th>
                <th className="py-2.5 px-3">Stated Purpose in v2</th>
                <th className="py-2.5 px-3">Actual Code Implementation</th>
                <th className="py-2.5 px-3">Security & Architectural Verdict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-cyan-400">p2p/</td>
                <td className="py-3 px-3 text-slate-300">QUIC + libp2p gossip + zstd + NAT traversal</td>
                <td className="py-3 px-3 text-red-300">
                  Raw Quinn endpoint without libp2p, ephemeral self-signed certs, no inbound peer accept loop, stream leak on gossip.
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px]">
                    CRITICAL (MITM / Stream Exhaustion)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-cyan-400">mempool/</td>
                <td className="py-3 px-3 text-slate-300">BTreeSet-based pool (evicts lowest fee)</td>
                <td className="py-3 px-3 text-amber-300">
                  BTreeSet sorted by (fee_rate, hash), uses nightly pop_first/last, drops equal-fee txs, no nonce/account index.
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                    MEDIUM RISK (Spam / Unstable API)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-cyan-400">sync/</td>
                <td className="py-3 px-3 text-slate-300">state-sync with Merkle-root verification</td>
                <td className="py-3 px-3 text-red-300">
                  NO Merkle root verification! Conflates raw 256MB chunk Blake3 hash with state root. Hardcoded [0] peer.
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px]">
                    CRITICAL (100% Sync Bricking)
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 font-bold text-cyan-400">node/</td>
                <td className="py-3 px-3 text-slate-300">consensus + glue (proper execution order)</td>
                <td className="py-3 px-3 text-red-300">
                  Local unilateral mock consensus; destroys audit proofs by zeroing Ed25519 signatures; 200ms sleep loop.
                </td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px]">
                    CRITICAL (Destroys Non-Repudiation)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Claims Breakdown Teaser */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-amber-950/20 border border-amber-900/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Debunking the 3 "Result Section Verification" Claims
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('claims')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 group"
          >
            <span>See Shannon Entropy & Physics Calculations</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-amber-400 font-semibold">1. "QUIC + zstd → 40% less traffic"</div>
            <p className="text-slate-400 text-[11px]">
              <strong>Verdict: Unfounded.</strong> 84% of a wire tx consists of Ed25519 signatures and public keys with ~7.99 bits of entropy per byte. True savings are &lt; 7%.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-amber-400 font-semibold">2. "Batch of 100 transfers → 0.00001 ¢ each"</div>
            <p className="text-slate-400 text-[11px]">
              <strong>Verdict: Misleading.</strong> BTreeSet fee sorting doesn't offset RocksDB write amplification or validator infrastructure costs ($0.00001 revenue/block).
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-amber-400 font-semibold">3. "State-sync → &lt; 2 s catch-up"</div>
            <p className="text-slate-400 text-[11px]">
              <strong>Verdict: Physically Infeasible.</strong> Transferring 256MB in under 2 seconds requires &gt; 1,024 Mbps unthrottled line rate, disregarding disk I/O.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
