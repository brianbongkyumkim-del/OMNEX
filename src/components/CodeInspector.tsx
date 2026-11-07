import React, { useState } from 'react';
import { Code2, ShieldAlert, CheckCircle2, Copy, Check, FileCode, Layers } from 'lucide-react';
import { CODE_MODULES, CodeModule } from '../data/auditData';

export const CodeInspector: React.FC = () => {
  const [selectedModuleId, setSelectedModuleId] = useState<'p2p' | 'mempool' | 'sync' | 'node'>('sync');
  const [viewMode, setViewMode] = useState<'split' | 'original' | 'hardened'>('split');
  const [copied, setCopied] = useState<string | null>(null);

  const currentModule = CODE_MODULES.find((m) => m.id === selectedModuleId)!;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Crate Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {CODE_MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setSelectedModuleId(mod.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all ${
                selectedModuleId === mod.id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>{mod.file}</span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'split' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Split Comparison
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'original' ? 'bg-red-950 text-red-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vulnerable v2 Only
          </button>
          <button
            onClick={() => setViewMode('hardened')}
            className={`px-2.5 py-1 rounded transition-colors ${
              viewMode === 'hardened' ? 'bg-emerald-950 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hardened Fix Only
          </button>
        </div>
      </div>

      {/* Module Summary & Key Defects Callout */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>{currentModule.title}</span>
            <span className="text-xs text-slate-400 font-normal">({currentModule.description})</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
          {currentModule.keyIssues.map((issue, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-red-300/90 font-mono bg-red-950/30 p-2 rounded border border-red-900/20">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Viewer Panels */}
      <div
        className={`grid gap-4 ${
          viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {/* Left: Original v2 Code */}
        {(viewMode === 'split' || viewMode === 'original') && (
          <div className="rounded-xl border border-red-900/40 bg-slate-950 overflow-hidden flex flex-col">
            <div className="bg-red-950/60 border-b border-red-900/40 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span className="font-mono font-bold text-red-200">
                  {currentModule.file} (OMNEX v2 Proposal - Flawed)
                </span>
              </div>
              <button
                onClick={() => handleCopy(currentModule.originalCode, 'orig')}
                className="text-red-400 hover:text-red-200 p-1 rounded hover:bg-red-900/40 transition-colors"
                title="Copy code"
              >
                {copied === 'orig' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-red-200/90 overflow-x-auto leading-relaxed scrollbar-thin">
              <code>{currentModule.originalCode}</code>
            </pre>
          </div>
        )}

        {/* Right: Hardened Production Code */}
        {(viewMode === 'split' || viewMode === 'hardened') && (
          <div className="rounded-xl border border-emerald-900/40 bg-slate-950 overflow-hidden flex flex-col">
            <div className="bg-emerald-950/60 border-b border-emerald-900/40 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-bold text-emerald-200">
                  {currentModule.file} (Hardened Production Replacement)
                </span>
              </div>
              <button
                onClick={() => handleCopy(currentModule.hardenedCode, 'hardened')}
                className="text-emerald-400 hover:text-emerald-200 p-1 rounded hover:bg-emerald-900/40 transition-colors"
                title="Copy code"
              >
                {copied === 'hardened' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed scrollbar-thin">
              <code>{currentModule.hardenedCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
