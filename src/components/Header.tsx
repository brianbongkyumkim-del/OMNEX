import React from 'react';
import {
  ShieldAlert,
  FileText,
  Code2,
  Cpu,
  Flame,
  CheckCircle2,
  ExternalLink,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { AUDIT_SUMMARY } from '../data/auditData';

export type TabType =
  | 'summary'
  | 'vulnerabilities'
  | 'code'
  | 'claims'
  | 'sandboxes'
  | 'roadmap'
  | 'pdf';

export type ModeType = 'audit' | 'mainnet';

interface HeaderProps {
  activeMode: ModeType;
  onSelectMode: (mode: ModeType) => void;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onExportReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onSelectMode,
  activeTab,
  onSelectTab,
  onExportReport,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Top Warning Banner / Mainnet Success Banner */}
      {activeMode === 'audit' ? (
        <div className="bg-red-950/80 border-b border-red-800/60 px-4 py-2 text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
            <span>
              <strong className="font-semibold text-red-100">AUDIT CONCLUSION:</strong> The upgraded
              OMNEX-stack v2 fails critical security and consensus baselines (Readiness: 28/100).
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onSelectMode('mainnet')}
              className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold transition-colors"
            >
              Switch to Production Mainnet v3 &rarr;
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="font-semibold text-emerald-100">PRODUCTION MAINNET v3 READY:</strong>{' '}
              All 7 vulnerabilities resolved. BFT consensus, SMT range sync, segregated witness archival, and persistent TLS active.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 font-mono text-[11px] border border-emerald-700/50">
              Readiness: 98 / 100
            </span>
            <button
              onClick={() => onSelectMode('audit')}
              className="px-2.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700 transition-colors"
            >
              View Audit Findings
            </button>
          </div>
        </div>
      )}

      {/* Main App Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border ${
              activeMode === 'mainnet'
                ? 'bg-gradient-to-br from-emerald-600/30 to-cyan-600/20 border-emerald-500/40 text-emerald-400'
                : 'bg-gradient-to-br from-red-600/30 to-amber-600/20 border-red-500/40 text-red-400'
            }`}
          >
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">OMNEX Stack</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                  activeMode === 'mainnet'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {activeMode === 'mainnet' ? 'v3.0.0 Mainnet Production' : 'v2 Security Audit'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {activeMode === 'mainnet'
                ? 'Hardened Byzantine Fault Tolerant Blockchain Architecture & Node Suite'
                : 'Technical Evaluation & Vulnerability Catalog'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onSelectMode('mainnet')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeMode === 'mainnet'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mainnet v3 (Hardened)</span>
          </button>

          <button
            onClick={() => onSelectMode('audit')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeMode === 'audit'
                ? 'bg-slate-800 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>Audit Findings</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onSelectMode('audit');
              onSelectTab('pdf');
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Source PDF</span>
          </button>

          <button
            onClick={onExportReport}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700/80 hover:bg-emerald-600 text-white flex items-center gap-1.5 shadow-sm transition-colors border border-emerald-600/40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-start sm:justify-center overflow-x-auto gap-1.5 border-t border-slate-900 py-2 scrollbar-none text-xs">
        <button
          onClick={() => onSelectTab('summary')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'summary'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span>Executive Audit</span>
        </button>

        <button
          onClick={() => onSelectTab('vulnerabilities')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'vulnerabilities'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Vulnerability Matrix</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-950 text-red-300 font-mono border border-red-800/80">
            7
          </span>
        </button>

        <button
          onClick={() => onSelectTab('code')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'code'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Code Inspector & Fixes</span>
        </button>

        <button
          onClick={() => onSelectTab('claims')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'claims'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          <span>Claims Debunking</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 font-mono border border-amber-800/80">
            3
          </span>
        </button>

        <button
          onClick={() => onSelectTab('sandboxes')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'sandboxes'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span>Exploit Sandboxes</span>
        </button>

        <button
          onClick={() => onSelectTab('roadmap')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'roadmap'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hardened Roadmap</span>
        </button>

        <button
          onClick={() => onSelectTab('pdf')}
          className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'pdf'
              ? 'bg-slate-800 text-white shadow-inner font-semibold border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Original PDF</span>
        </button>
      </div>
    </header>
  );
};
