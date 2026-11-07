import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Database,
  Wifi,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import {
  analyzeZstdCompression,
  simulateMempoolInsert,
  calculateStateSyncFeasibility,
  MempoolEntry,
} from '../utils/auditLogic';

export const InteractiveSandboxes: React.FC = () => {
  const [activeSandbox, setActiveSandbox] = useState<'compression' | 'mempool' | 'sync' | 'root'>('compression');

  // Sandbox 1: Compression State
  const [txCount, setTxCount] = useState<number>(100);
  const [hasAsciiMemo, setHasAsciiMemo] = useState<boolean>(false);
  const compressionResult = useMemo(
    () => analyzeZstdCompression(txCount, hasAsciiMemo),
    [txCount, hasAsciiMemo]
  );

  // Sandbox 2: Mempool State
  const initialPool: MempoolEntry[] = [
    { feeRate: 10, txHash: '0x3f1a...8e21', sender: '0xAlice...1a2b' },
    { feeRate: 25, txHash: '0x7b4c...9d10', sender: '0xBob...4c5d' },
    { feeRate: 50, txHash: '0x1c9e...5f32', sender: '0xCharlie...7e8f' },
    { feeRate: 80, txHash: '0x9a2b...4c11', sender: '0xDave...9a0b' },
    { feeRate: 120, txHash: '0x5d8f...3a99', sender: '0xEve...c1d2' },
  ];
  const [poolCapacity, setPoolCapacity] = useState<number>(5);
  const [mempoolState, setMempoolState] = useState<MempoolEntry[]>(initialPool);
  const [newFee, setNewFee] = useState<number>(10);
  const [newSender, setNewSender] = useState<string>('0xMallory...9999');
  const [lastActionLog, setLastActionLog] = useState<string | null>(null);

  const handleMempoolInsert = () => {
    const hash = '0x' + Math.random().toString(16).substring(2, 8) + '...' + Math.random().toString(16).substring(2, 6);
    const newTx: MempoolEntry = { feeRate: newFee, txHash: hash, sender: newSender };
    const res = simulateMempoolInsert(mempoolState, poolCapacity, newTx);
    setMempoolState(res.poolState);

    if (!res.accepted) {
      setLastActionLog(`REJECTED by OMNEX v2 logic: "${res.rejectionReason}". (Attempted fee: ${newFee} <= Min fee: ${res.poolState[0]?.feeRate})`);
    } else if (res.evictedEntry) {
      setLastActionLog(`ACCEPTED: Fee ${newFee} evicted lowest transaction (Hash: ${res.evictedEntry.txHash}, Fee: ${res.evictedEntry.feeRate}).`);
    } else {
      setLastActionLog(`ACCEPTED: Transaction inserted into mempool (Current size: ${res.currentSize}/${poolCapacity}).`);
    }
  };

  const handleResetMempool = () => {
    setMempoolState(initialPool);
    setLastActionLog(null);
  };

  // Sandbox 3: State Sync State
  const [syncBandwidth, setSyncBandwidth] = useState<number>(100); // 100 Mbps
  const [syncChunkSize, setSyncChunkSize] = useState<number>(256); // 256 MB as per PDF
  const syncResult = useMemo(
    () => calculateStateSyncFeasibility(syncBandwidth, syncChunkSize),
    [syncBandwidth, syncChunkSize]
  );

  return (
    <div className="space-y-6">
      {/* Sandbox Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <button
          onClick={() => setActiveSandbox('compression')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSandbox === 'compression'
              ? 'bg-amber-950 text-amber-300 border border-amber-700/60 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-amber-400" />
          <span>1. Zstd Entropy & Compression Sandbox</span>
        </button>

        <button
          onClick={() => setActiveSandbox('mempool')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSandbox === 'mempool'
              ? 'bg-red-950 text-red-300 border border-red-700/60 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-red-400" />
          <span>2. Mempool Eviction & Lockout Simulator</span>
        </button>

        <button
          onClick={() => setActiveSandbox('sync')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSandbox === 'sync'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Wifi className="w-4 h-4 text-cyan-400" />
          <span>3. State-Sync 256MB Speed Calculator</span>
        </button>

        <button
          onClick={() => setActiveSandbox('root')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSandbox === 'root'
              ? 'bg-violet-950 text-violet-300 border border-violet-700/60 shadow-sm'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-violet-400" />
          <span>4. Merkle Root Conflation Visualizer</span>
        </button>
      </div>

      {/* SANDBOX 1: Zstd Entropy & Compression */}
      {activeSandbox === 'compression' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                CLAIM TEST: &ldquo;40% LESS TRAFFIC&rdquo;
              </span>
              <span className="text-xs text-slate-400">Information Theory & Shannon Entropy</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Why Cryptographic Wire Transactions Cannot Compress by 40%
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Compressors like Zstandard exploit statistical redundancy (repeated sequences, non-uniform byte distributions).
              However, Ed25519 signatures, BLS public keys, and Blake3 hashes have an entropy of ~7.994 bits/byte (maximum theoretical is 8.0).
              They appear as pure pseudo-random noise to compression algorithms.
            </p>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-mono">
                Batch Transaction Count: <strong className="text-white">{txCount} txs</strong>
              </label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={txCount}
                onChange={(e) => setTxCount(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="asciiMemo"
                checked={hasAsciiMemo}
                onChange={(e) => setHasAsciiMemo(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
              <label htmlFor="asciiMemo" className="text-slate-300 cursor-pointer">
                Include 32-byte repetitive text memo (only non-crypto portion that compresses)
              </label>
            </div>
          </div>

          {/* Visualization Bars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-mono">Total Wire Payload Size</div>
              <div className="text-2xl font-bold font-mono text-white">
                {(compressionResult.payloadSizeBytes / 1024).toFixed(2)} KB
              </div>
              <div className="text-[11px] text-slate-400">
                Crypto bytes (incompressible):{' '}
                <span className="text-red-400 font-bold">
                  {(
                    (compressionResult.cryptoPortionBytes / compressionResult.payloadSizeBytes) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-mono">Shannon Entropy</div>
              <div className="text-2xl font-bold font-mono text-cyan-400">
                {compressionResult.estimatedEntropyBitsPerByte.toFixed(2)} / 8.0
              </div>
              <div className="text-[11px] text-slate-400">
                Near 8.0 indicates high randomness (incompressible)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-red-900/50 space-y-2">
              <div className="text-xs text-slate-400 font-mono">Real vs Claimed Compression</div>
              <div className="flex items-baseline gap-3">
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {compressionResult.actualRealisticCompressionPercent}%
                </div>
                <div className="text-xs text-slate-400 line-through">
                  Claimed: {compressionResult.claimedCompressionPercent}%
                </div>
              </div>
              <div className="text-[11px] text-red-400 font-bold">
                Deficit: {(compressionResult.claimedCompressionPercent - compressionResult.actualRealisticCompressionPercent).toFixed(1)}% unachieved
              </div>
            </div>
          </div>

          {/* Visual Byte Distribution */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>WireTx Byte Composition</span>
              <span>84.2% Incompressible Cryptography</span>
            </div>
            <div className="h-6 w-full bg-slate-950 rounded-lg overflow-hidden flex border border-slate-800 text-[10px] font-mono font-bold text-center leading-6">
              <div
                className="bg-red-700/80 text-white"
                style={{
                  width: `${(compressionResult.cryptoPortionBytes / compressionResult.payloadSizeBytes) * 100}%`,
                }}
              >
                Signatures & Public Keys (Incompressible)
              </div>
              <div
                className="bg-emerald-600/80 text-white"
                style={{
                  width: `${(compressionResult.metadataPortionBytes / compressionResult.payloadSizeBytes) * 100}%`,
                }}
              >
                Metadata
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SANDBOX 2: Mempool Eviction & Lockout Simulator */}
      {activeSandbox === 'mempool' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                FLAW TEST: MEMPOOL EVICTION BUG
              </span>
              <span className="text-xs text-slate-400">BTreeSet Insertion & Lockout Vector</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Simulating OMNEX v2 Mempool Eviction Policy
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Inspect how the OMNEX code behaves when the mempool reaches capacity:
              <br />
              <code className="text-red-300 bg-slate-950 px-1 py-0.5 rounded font-mono text-[11px]">
                if fee_rate &lt;= min_entry.fee_rate &#123; bail!(&quot;Fee too low to enter full mempool&quot;); &#125;
              </code>
              <br />
              Notice that when equal-fee transactions arrive, they are rejected with an error! Furthermore, notice there is zero nonce tracking or protection against double-spends from the same sender.
            </p>
          </div>

          {/* Controls */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-mono block">Max Capacity:</span>
                  <select
                    value={poolCapacity}
                    onChange={(e) => setPoolCapacity(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 mt-0.5"
                  >
                    <option value={3}>3 transactions</option>
                    <option value={5}>5 transactions</option>
                    <option value={10}>10 transactions</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 font-mono block">New Tx Fee Rate (µ¢/byte):</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newFee}
                    onChange={(e) => setNewFee(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 mt-0.5 w-24 font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-400 font-mono block">Sender:</span>
                  <input
                    type="text"
                    value={newSender}
                    onChange={(e) => setNewSender(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 mt-0.5 w-36 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleMempoolInsert}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-800 hover:bg-red-700 text-white flex items-center gap-1.5 shadow transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute insert()</span>
                </button>
                <button
                  onClick={handleResetMempool}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Log Result */}
            {lastActionLog && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border ${
                  lastActionLog.startsWith('REJECTED')
                    ? 'bg-red-950/70 border-red-800 text-red-200'
                    : 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                }`}
              >
                {lastActionLog}
              </div>
            )}
          </div>

          {/* Current Mempool State Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-slate-400">
                Current Mempool State ({mempoolState.length} / {poolCapacity})
              </span>
              <span className="text-xs text-amber-400 font-mono">
                Sorted by: (fee_rate, tx_hash) Ascending
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Index in BTreeSet</th>
                    <th className="py-2.5 px-3">Fee Rate</th>
                    <th className="py-2.5 px-3">Transaction Hash</th>
                    <th className="py-2.5 px-3">Sender Address</th>
                    <th className="py-2.5 px-3">Eviction / Priority Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {mempoolState.map((entry, idx) => {
                    const isMin = idx === 0;
                    const isMax = idx === mempoolState.length - 1;

                    return (
                      <tr
                        key={entry.txHash}
                        className={
                          isMin
                            ? 'bg-red-950/20 text-red-300'
                            : isMax
                            ? 'bg-emerald-950/20 text-emerald-300'
                            : 'text-slate-300'
                        }
                      >
                        <td className="py-2 px-3">{idx}</td>
                        <td className="py-2 px-3 font-bold">{entry.feeRate} µ¢/byte</td>
                        <td className="py-2 px-3 text-slate-400">{entry.txHash}</td>
                        <td className="py-2 px-3 text-slate-400">{entry.sender}</td>
                        <td className="py-2 px-3">
                          {isMin && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px]">
                              Next to be evicted (pool.pop_first)
                            </span>
                          )}
                          {isMax && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                              Next to be included in block (pool.pop_last)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SANDBOX 3: State Sync Speed Calculator */}
      {activeSandbox === 'sync' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                PHYSICS AUDIT: &ldquo;&lt; 2S CATCH-UP&rdquo;
              </span>
              <span className="text-xs text-slate-400">Throughput, Hashing & Disk I/O Limits</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              State-Sync Latency & Bandwidth Feasibility Calculator
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Page 5 specifies:{' '}
              <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono text-[11px]">
                recv.read_chunk(256 * 1024 * 1024, true).await?
              </code>
              . A 256MB chunk equals 2,147 Megabits of data. Adjust network speed and chunk size to see why a &lt; 2.0s catch-up is impossible for normal validators.
            </p>
          </div>

          {/* Interactive Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-mono">
                <span>Available Network Bandwidth:</span>
                <strong className="text-cyan-400">{syncBandwidth} Mbps</strong>
              </div>
              <input
                type="range"
                min="20"
                max="2000"
                step="20"
                value={syncBandwidth}
                onChange={(e) => setSyncBandwidth(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>50 Mbps (Home)</span>
                <span>100 Mbps (Broadband)</span>
                <span>1 Gbps (Datacenter)</span>
                <span>2 Gbps (Extreme)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-mono">
                <span>Chunk Size:</span>
                <strong className="text-cyan-400">{syncChunkSize} MB</strong>
              </div>
              <input
                type="range"
                min="4"
                max="512"
                step="4"
                value={syncChunkSize}
                onChange={(e) => setSyncChunkSize(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>4 MB (Industry Standard)</span>
                <span>64 MB</span>
                <span>256 MB (OMNEX v2)</span>
                <span>512 MB</span>
              </div>
            </div>
          </div>

          {/* Calculation Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-mono">1. Network Transfer Time</span>
              <div className="text-xl font-bold font-mono text-white">
                {syncResult.transferTimeSeconds}s
              </div>
              <p className="text-[10px] text-slate-400">
                {(syncResult.chunkSizeBytes * 8 / 1_000_000).toFixed(0)} Mbits / {syncBandwidth} Mbps
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-mono">2. Blake3 Hashing Time</span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {syncResult.blake3HashingTimeSeconds}s
              </div>
              <p className="text-[10px] text-slate-400">~3.0 GB/s AVX-512 throughput</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-mono">3. RocksDB Write Time</span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {syncResult.rocksdbWriteTimeSeconds}s
              </div>
              <p className="text-[10px] text-slate-400">NVMe SSD @ 200 MB/s batched</p>
            </div>

            <div
              className={`p-4 rounded-xl border space-y-1 ${
                syncResult.meetsTarget
                  ? 'bg-emerald-950/40 border-emerald-800'
                  : 'bg-red-950/40 border-red-800'
              }`}
            >
              <span className="text-[11px] text-slate-300 font-mono font-bold">Total Catch-up Time</span>
              <div
                className={`text-xl font-bold font-mono ${
                  syncResult.meetsTarget ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {syncResult.totalCatchUpTimeSeconds}s
              </div>
              <p className="text-[10px] font-bold">
                {syncResult.meetsTarget ? '✓ Meets < 2s claim' : '✗ FAILS < 2s claim'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-4">
            <div>
              <strong className="text-white">Minimum Bandwidth Required to Hit &lt; 2s Target:</strong>
              <div className="text-slate-400 text-[11px] mt-0.5">
                (Assuming 0.5s reserved for Blake3 hashing and RocksDB batch commit)
              </div>
            </div>
            <div className="font-mono text-base font-bold text-amber-400 bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-800">
              {syncResult.minimumRequiredBandwidthMbps} Mbps (
              {(syncResult.minimumRequiredBandwidthMbps / 1000).toFixed(2)} Gbps)
            </div>
          </div>
        </div>
      )}

      {/* SANDBOX 4: Merkle Root Conflation Visualizer */}
      {activeSandbox === 'root' && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-violet-950 text-violet-300 border border-violet-800">
                CRITICAL FLAW: ROOT CONFLATION
              </span>
              <span className="text-xs text-slate-400">Cryptographic Accumulator vs Raw Chunk</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              Why `chunk_hash == expected_state_root` Bricks All Honest Syncs
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              In a partitioned ledger, state chunks represent small subsets of accounts. A global state root is the root of a Merkle Tree.
              Below is an interactive visual of why comparing a chunk hash directly to the state root guarantees that 100% of chunks fail verification.
            </p>
          </div>

          {/* Visual Merkle Diagram */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-6 text-center">
            {/* Top Root */}
            <div className="inline-block p-3 rounded-xl bg-purple-950/80 border border-purple-600 text-xs font-mono text-purple-200">
              <div className="font-bold text-purple-300 text-sm">Global State Root (expected_state_root)</div>
              <div className="text-[11px] text-purple-400 mt-1">0x89a4...c2e1 (Blake3 Root of Merkle Tree)</div>
            </div>

            {/* Tree Branch Connectors */}
            <div className="flex justify-center items-center gap-12 text-slate-600 font-mono text-xs">
              <div>↙ Branch A</div>
              <div>↘ Branch B</div>
            </div>

            {/* Tree Chunks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 space-y-1">
                <div className="font-bold">Chunk #1 (256MB)</div>
                <div className="text-[10px] text-slate-400">Blake3: 0x1111...aaaa</div>
                <div className="text-[10px] text-red-400 font-bold">≠ 0x89a4 (REJECTED)</div>
              </div>

              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 space-y-1">
                <div className="font-bold">Chunk #2 (256MB)</div>
                <div className="text-[10px] text-slate-400">Blake3: 0x2222...bbbb</div>
                <div className="text-[10px] text-red-400 font-bold">≠ 0x89a4 (REJECTED)</div>
              </div>

              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 space-y-1">
                <div className="font-bold">Chunk #3 (256MB)</div>
                <div className="text-[10px] text-slate-400">Blake3: 0x3333...cccc</div>
                <div className="text-[10px] text-red-400 font-bold">≠ 0x89a4 (REJECTED)</div>
              </div>

              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 space-y-1">
                <div className="font-bold">Chunk #4 (256MB)</div>
                <div className="text-[10px] text-slate-400">Blake3: 0x4444...dddd</div>
                <div className="text-[10px] text-red-400 font-bold">≠ 0x89a4 (REJECTED)</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/40 text-left text-xs text-red-200 space-y-1.5">
              <div className="font-bold text-red-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Result in OMNEX v2:</span>
              </div>
              <p>
                Because none of the individual chunk hashes equal the top-level tree root, OMNEX throws:{' '}
                <code className="bg-slate-950 px-1 py-0.5 rounded text-red-300 font-mono">
                  anyhow::bail!(&quot;CRITICAL: State root mismatch! Peer is malicious.&quot;)
                </code>{' '}
                on EVERY legitimate peer. Fast-sync cannot ever complete!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
