import React, { useState } from 'react';
import { Header, TabType, ModeType } from './components/Header';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { VulnerabilityMatrix } from './components/VulnerabilityMatrix';
import { CodeInspector } from './components/CodeInspector';
import { ClaimDebunker } from './components/ClaimDebunker';
import { InteractiveSandboxes } from './components/InteractiveSandboxes';
import { RemediationRoadmap } from './components/RemediationRoadmap';
import { PdfDocumentViewer } from './components/PdfDocumentViewer';
import { MainnetProductionSuite } from './components/MainnetProductionSuite';
import { AUDIT_SUMMARY, FINDINGS, CLAIMS_EVALUATION } from './data/auditData';

export default function App() {
  const [activeMode, setActiveMode] = useState<ModeType>('mainnet');
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const handleExportReport = () => {
    let md = `# TECHNICAL ARCHITECTURE AUDIT & SECURITY EVALUATION
**Target:** ${AUDIT_SUMMARY.documentTitle}
**Date:** ${AUDIT_SUMMARY.evaluationDate}
**Overall Verdict:** ${AUDIT_SUMMARY.overallVerdict}
**Readiness Score:** ${AUDIT_SUMMARY.overallScore} / 100

---

## 1. Executive Summary
${AUDIT_SUMMARY.verdictExplanation}

### Readiness Breakdown:
${AUDIT_SUMMARY.metrics.map((m) => `- **${m.name}:** ${m.score}% (${m.status})`).join('\n')}

---

## 2. Vulnerability Catalog (${FINDINGS.length} Findings)

${FINDINGS.map(
  (f) => `### [${f.id}] ${f.title}
- **Severity:** ${f.severity} (CVSS ${f.cvss})
- **Location:** \`${f.file}\` (${f.lines})
- **Impact:** ${f.impact}
- **Root Cause:** ${f.rootCause}
- **PoC Attack Scenario:** ${f.attackScenario}

\`\`\`rust
// Remediation snippet
${f.remediationSnippet}
\`\`\`
`
).join('\n---\n')}

## 3. Evaluation of "Result Section Verification" Claims

${CLAIMS_EVALUATION.map(
  (c) => `### ${c.id}: "${c.claim}"
- **Verdict:** ${c.verdict} (${c.verdictLabel})
- **Document Text:** "${c.originalText}"
- **Analysis:** ${c.analysis}
- **Mathematical Breakdown:**
${c.mathBreakdown.map((s) => `  * ${s}`).join('\n')}
- **Industry Recommendation:** ${c.recommendation}
`
).join('\n---\n')}

## 4. Final Recommendation
The proposal is NOT ready for mainnet hardening. The engineering team must address Phase 1 (Cryptographic Non-Repudiation) and Phase 2 (Merkle Range Proofs for Warp Sync) before public testnet deployment.
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'OMNEX_v2_Technical_Security_Audit.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportReport={handleExportReport}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeMode === 'mainnet' ? (
          <MainnetProductionSuite />
        ) : (
          <>
            {activeTab === 'summary' && <ExecutiveSummary onNavigateTab={setActiveTab} />}
            {activeTab === 'vulnerabilities' && <VulnerabilityMatrix />}
            {activeTab === 'code' && <CodeInspector />}
            {activeTab === 'claims' && <ClaimDebunker />}
            {activeTab === 'sandboxes' && <InteractiveSandboxes />}
            {activeTab === 'roadmap' && <RemediationRoadmap onExport={handleExportReport} />}
            {activeTab === 'pdf' && <PdfDocumentViewer />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">OMNEX Mainnet v3.0.0 Control Suite</span>
            <span>•</span>
            <span>Production Byzantine Fault Tolerant Architecture</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveMode('audit');
                setActiveTab('pdf');
              }}
              className="hover:text-slate-300 transition-colors"
            >
              Source PDF
            </button>
            <button
              onClick={() => setActiveMode(activeMode === 'mainnet' ? 'audit' : 'mainnet')}
              className="hover:text-slate-300 transition-colors"
            >
              Toggle Mode ({activeMode === 'mainnet' ? 'View Audit' : 'View Mainnet v3'})
            </button>
            <button
              onClick={handleExportReport}
              className="hover:text-slate-300 transition-colors"
            >
              Export Report
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
