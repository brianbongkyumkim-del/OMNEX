import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Download,
  Terminal,
  ArrowRight,
  GitPullRequest,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { FINDINGS, AUDIT_SUMMARY } from '../data/auditData';

interface RoadmapStep {
  phase: string;
  title: string;
  duration: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM';
  description: string;
  items: string[];
}

export const RemediationRoadmap: React.FC<{ onExport: () => void }> = ({ onExport }) => {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setCompletedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ROADMAP_STEPS: RoadmapStep[] = [
    {
      phase: 'Phase 1',
      title: 'Cryptographic Integrity & Witness Segregation',
      duration: 'Week 1 - 2',
      priority: 'URGENT',
      description:
        'Halt signature erasure before archiving; decouple witness signatures into a secondary cold column family without mutating transaction hashes or destroying auditability.',
      items: [
        'Stop zeroing `sig_ed25519 = [0; 64]` in `node/src/main.rs`.',
        'Implement segregated witness storage (`archive_with_witness`) to preserve transaction hash invariance.',
        'Ensure chain re-organization engine can re-verify original Ed25519 author signatures.',
        'Fix Blake3 state root calculation to use Sparse Merkle Tree (SMT) or Merkle Patricia Trie.',
      ],
    },
    {
      phase: 'Phase 2',
      title: 'State-Sync Overhaul & Merkle Range Inclusion Proofs',
      duration: 'Week 3 - 4',
      priority: 'URGENT',
      description:
        'Replace flat chunk hash check with Merkle branch verification. Downsize 256MB monolithic chunks to 4MB streaming envelopes to eliminate remote OOM vectors.',
      items: [
        'Replace `chunk_hash == expected_state_root` with `proof.verify_range(root, start_key, end_key, chunk)`.',
        'Reduce maximum chunk envelope from 256MB to 4MB with bounded streaming backpressure.',
        'Implement multi-peer round-robin sync; eliminate single-point-of-failure `bootstrap_peers()[0]`.',
        'Add atomic RocksDB write batch rollback on invalid chunk checksums.',
      ],
    },
    {
      phase: 'Phase 3',
      title: 'P2P Identity & QUIC Stream Lifecycle Hardening',
      duration: 'Week 5 - 6',
      priority: 'HIGH',
      description:
        'Introduce persistent NodeID keypairs, TLS certificate pinning, inbound connection accept loops, and explicit QUIC stream cleanup.',
      items: [
        'Eliminate ephemeral `rcgen::generate_simple_self_signed` on startup; bind TLS cert to persistent Ed25519 PeerID.',
        'Implement inbound connection listener loop (`endpoint.accept().await`) to maintain bidirectional mesh.',
        'Fix gossip stream leak: call `send.finish().await` or migrate to QUIC Unreliable Datagrams for block announcements.',
        'Implement heartbeat ping/pong and prune defunct connections from `peers` collection.',
      ],
    },
    {
      phase: 'Phase 4',
      title: 'Distributed BFT Consensus Architecture',
      duration: 'Week 7 - 9',
      priority: 'HIGH',
      description:
        'Upgrade local `ConsensusEngine::new().propose_and_commit()` into a real multi-validator Byzantine Fault Tolerant protocol with 2/3 + 1 Quorum Certificates.',
      items: [
        'Implement 2-phase BFT (Propose -> Pre-vote -> Pre-commit -> Commit) or integrate CometBFT / Malachite.',
        'Aggregate validator BLS-377 / Ed25519 threshold signatures into a block Quorum Certificate (QC).',
        'Enforce round-robin or stake-weighted leader election schedule.',
        'Replace fixed 200ms `tokio::time::sleep` loop with event-driven consensus state transitions.',
      ],
    },
    {
      phase: 'Phase 5',
      title: 'Mempool Account Nonce Indexing & EIP-1559 Fee Market',
      duration: 'Week 10 - 11',
      priority: 'MEDIUM',
      description:
        'Upgrade mempool from flat BTreeSet into a dual-index structure with account nonce sequencing and Replace-By-Fee (RBF).',
      items: [
        'Index transactions by `(sender, nonce)` to eliminate replay, out-of-order execution, and double-spends.',
        'Add Replace-By-Fee (RBF) requiring >= 10% higher fee rate for duplicate nonce replacement.',
        'Eliminate unstable Rust nightly APIs (`pop_first()`, `pop_last()`) using stable standard library patterns.',
        'Implement dynamic EIP-1559 base fee algorithm adjusting to gas/byte demand.',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Blueprint Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                OMNEX v3 PRODUCTION SPECIFICATION
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Remediation Roadmap: Transitioning to Mainnet Readiness
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              An engineering-grade execution plan to resolve all 7 security findings and transform OMNEX into an auditable, high-throughput, Byzantine fault-tolerant decentralized ledger.
            </p>
          </div>

          <button
            onClick={onExport}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Formal Audit Report (.md)</span>
          </button>
        </div>
      </div>

      {/* Phases Grid */}
      <div className="space-y-5">
        {ROADMAP_STEPS.map((step, sIdx) => (
          <div
            key={sIdx}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  {step.phase}
                </span>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400 font-mono">{step.duration}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    step.priority === 'URGENT'
                      ? 'bg-red-950 text-red-300 border-red-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {step.priority}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>

            {/* Checklist items */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-500 font-bold block">
                Engineering Action Items:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {step.items.map((item, iIdx) => {
                  const itemKey = `${sIdx}-${iIdx}`;
                  const isChecked = !!completedItems[itemKey];

                  return (
                    <button
                      key={iIdx}
                      onClick={() => toggleItem(itemKey)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-mono flex items-start gap-2.5 transition-colors ${
                        isChecked
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span className={isChecked ? 'line-through text-slate-400' : ''}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
