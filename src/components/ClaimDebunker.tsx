import React from 'react';
import {
  AlertTriangle,
  XCircle,
  HelpCircle,
  Calculator,
  HardDrive,
  Wifi,
  KeyRound,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { CLAIMS_EVALUATION } from '../data/auditData';

export const ClaimDebunker: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Evaluation of "Result Section Verification" (Page 7)
            </h2>
            <p className="text-xs text-slate-400">
              Rigorous scientific and mathematical verification of the 3 performance claims in the upgrade proposal.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          The document concludes with: <em>"With these upgrades, the claims in your original 'Result' section are now technically substantiated."</em>{' '}
          However, our forensic audit demonstrates that{' '}
          <strong className="text-amber-300">none of the three claims are mathematically or physically valid</strong> under the code presented.
        </p>
      </div>

      {/* Claim Cards */}
      <div className="space-y-6">
        {CLAIMS_EVALUATION.map((evalItem) => (
          <div
            key={evalItem.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg"
          >
            {/* Header */}
            <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-400">{evalItem.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                    {evalItem.verdict}
                  </span>
                  <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                    {evalItem.verdictLabel}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Claim: &ldquo;{evalItem.claim}&rdquo;
                </h3>
              </div>
              <div className="text-xs text-slate-400 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800 max-w-md">
                Doc text: &ldquo;{evalItem.originalText}&rdquo;
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              {/* Technical Analysis */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Technical & Scientific Analysis</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  {evalItem.analysis}
                </p>
              </div>

              {/* Math & Physics Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <span>Mathematical & Hardware Proof</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {evalItem.mathBreakdown.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remediation / Production Reality */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/40 space-y-1">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  <span>Industry Standard Solution</span>
                </h4>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  {evalItem.recommendation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
