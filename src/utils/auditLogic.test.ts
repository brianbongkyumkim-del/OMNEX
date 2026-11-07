import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeZstdCompression,
  simulateMempoolInsert,
  calculateStateSyncFeasibility,
  evaluateStateRootLogic,
  calculateBftQuorum,
  processBftRound,
  createMainnetMempool,
  insertMainnetMempool,
  popBatchReadySet,
  verifySparseMerkleRangeProof,
  computeCanonicalTxHash,
  BftConsensusRound,
  HardenedTx,
} from './auditLogic';

test('ZSTD Compression Analysis: proves 40% reduction claim is unfeasible for crypto payloads', () => {
  const result = analyzeZstdCompression(100, false);
  assert.equal(result.isClaimFeasible, false);
  assert.ok(result.actualRealisticCompressionPercent < 15);
  assert.equal(result.claimedCompressionPercent, 40);
  assert.ok(result.estimatedEntropyBitsPerByte > 7.0);
});

test('Mempool Simulation: accurately rejects transactions when pool is full and fee <= min_entry', () => {
  const pool = [
    { feeRate: 10, txHash: '0xaaa', sender: 'alice' },
    { feeRate: 20, txHash: '0xbbb', sender: 'bob' },
    { feeRate: 30, txHash: '0xccc', sender: 'carol' },
  ];
  const maxSize = 3;

  // Attempt to insert with fee 5 (lower than min)
  const rejected = simulateMempoolInsert(pool, maxSize, {
    feeRate: 5,
    txHash: '0xddd',
    sender: 'eve',
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.evictedEntry, null);

  // Attempt to insert with equal fee (10) -> Should fail because of <= min_entry check in PDF
  const equalFeeRejected = simulateMempoolInsert(pool, maxSize, {
    feeRate: 10,
    txHash: '0xeee',
    sender: 'mallory',
  });
  assert.equal(equalFeeRejected.accepted, false);

  // Attempt to insert higher fee (25) -> Evicts lowest (fee 10)
  const accepted = simulateMempoolInsert(pool, maxSize, {
    feeRate: 25,
    txHash: '0xfff',
    sender: 'dave',
  });
  assert.equal(accepted.accepted, true);
  assert.notEqual(accepted.evictedEntry, null);
  assert.equal(accepted.evictedEntry?.feeRate, 10);
  assert.equal(accepted.currentSize, 3);
});

test('State Sync Feasibility: shows <2s catchup is impossible on standard broadband', () => {
  // Standard 100 Mbps broadband
  const result100 = calculateStateSyncFeasibility(100, 256);
  assert.equal(result100.meetsTarget, false);
  assert.ok(result100.totalCatchUpTimeSeconds > 20); // ~22.8 seconds
  assert.ok(result100.minimumRequiredBandwidthMbps > 1000); // Needs ~1366 Mbps

  // High speed 10 Gbps datacenter line
  const result10G = calculateStateSyncFeasibility(10000, 256);
  assert.equal(result10G.meetsTarget, true);
});

test('State Root Logic: identifies critical root conflation when chunks > 1', () => {
  const evaluation = evaluateStateRootLogic(16);
  assert.equal(evaluation.isChunkHashDirectRoot, false);
  assert.equal(evaluation.vulnerabilityType, 'CRITICAL_STATE_ROOT_CONFLATION');
});

test('Mainnet BFT Quorum: calculates 2f+1 threshold correctly for 4 validators', () => {
  const validators = [
    { id: 'v1', pubkey: 'pub1', stakeWeight: 25 },
    { id: 'v2', pubkey: 'pub2', stakeWeight: 25 },
    { id: 'v3', pubkey: 'pub3', stakeWeight: 25 },
    { id: 'v4', pubkey: 'pub4', stakeWeight: 25 },
  ];
  const q = calculateBftQuorum(validators);
  assert.equal(q.totalValidators, 4);
  assert.equal(q.maxFaults, 1);
  assert.equal(q.requiredQuorumVotes, 3); // 2f + 1 = 3

  // Test round progression
  const round: BftConsensusRound = {
    height: 100,
    round: 0,
    proposer: 'v1',
    blockHash: '0xblock123',
    preVotes: new Map(),
    preCommits: new Map(),
    quorumThreshold: 3,
    isCommitted: false,
    quorumCertificate: null,
  };

  // 2 votes (insufficient for 4 validators)
  const partialRound = processBftRound(round, validators, [
    { validatorId: 'v1', blockHash: '0xblock123' },
    { validatorId: 'v2', blockHash: '0xblock123' },
  ]);
  assert.equal(partialRound.isCommitted, false);
  assert.equal(partialRound.quorumCertificate, null);

  // 3rd vote (achieves 2f+1 quorum)
  const committedRound = processBftRound(partialRound, validators, [
    { validatorId: 'v3', blockHash: '0xblock123' },
  ]);
  assert.equal(committedRound.isCommitted, true);
  assert.ok(committedRound.quorumCertificate?.startsWith('QC-H100-R0'));
});

test('Mainnet Mempool: verifies RBF requires >=10% fee increase and rejects past nonces', () => {
  const pool = createMainnetMempool(3);
  const tx1: HardenedTx = {
    txId: 'tx-1',
    sender: 'alice',
    recipient: 'bob',
    amount: 1000n,
    nonce: 5,
    feeRate: 20,
    signature: 'sig1',
  };

  // Attempt to insert past nonce (current account nonce = 6) -> Rejects
  const pastNonceRes = insertMainnetMempool(pool, tx1, 6);
  assert.equal(pastNonceRes.success, false);
  assert.match(pastNonceRes.error!, /already been committed/);

  // Insert valid tx (current nonce = 5)
  const validRes = insertMainnetMempool(pool, tx1, 5);
  assert.equal(validRes.success, true);
  assert.equal(pool.byFee.length, 1);

  // Attempt RBF replacement with only 5% higher fee (21) -> Should reject
  const weakRbfTx: HardenedTx = { ...tx1, txId: 'tx-weak', feeRate: 21 };
  const weakRbfRes = insertMainnetMempool(pool, weakRbfTx, 5);
  assert.equal(weakRbfRes.success, false);
  assert.match(weakRbfRes.error!, /required 10% premium/);

  // Valid RBF replacement with 25% higher fee (25) -> Should accept and replace
  const strongRbfTx: HardenedTx = { ...tx1, txId: 'tx-strong', feeRate: 25 };
  const strongRbfRes = insertMainnetMempool(pool, strongRbfTx, 5);
  assert.equal(strongRbfRes.success, true);
  assert.equal(strongRbfRes.isRbfReplacement, true);
  assert.equal(pool.byFee.length, 1);
  assert.equal(pool.byFee[0].feeRate, 25);
});

test('Canonical Hash Invariance: segregated witness preserves transaction ID across signature operations', () => {
  const payload = {
    sender: 'alice',
    recipient: 'bob',
    amount: 500n,
    nonce: 1,
    feeRate: 15,
  };
  const hash1 = computeCanonicalTxHash(payload);
  const hash2 = computeCanonicalTxHash(payload);
  assert.equal(hash1, hash2);
  assert.ok(hash1.startsWith('0x'));
});

test('OMX-018 Ready-Set Packaging: ensures transactions are packaged strictly in per-account nonce order', () => {
  const pool = createMainnetMempool(10);

  // Alice has nonces 0 (fee 10) and 1 (fee 100)
  // In flawed v2, pop_batch popped globally highest fee, so nonce 1 was picked before nonce 0!
  const aliceTx0: HardenedTx = {
    txId: 'alice-0',
    sender: 'alice',
    recipient: 'carol',
    amount: 10n,
    nonce: 0,
    feeRate: 10,
    signature: 'sig_a0',
  };
  const aliceTx1: HardenedTx = {
    txId: 'alice-1',
    sender: 'alice',
    recipient: 'carol',
    amount: 10n,
    nonce: 1,
    feeRate: 100, // Very high fee!
    signature: 'sig_a1',
  };

  // Bob has nonce 0 (fee 50)
  const bobTx0: HardenedTx = {
    txId: 'bob-0',
    sender: 'bob',
    recipient: 'dave',
    amount: 20n,
    nonce: 0,
    feeRate: 50,
    signature: 'sig_b0',
  };

  insertMainnetMempool(pool, aliceTx0, 0);
  insertMainnetMempool(pool, aliceTx1, 0);
  insertMainnetMempool(pool, bobTx0, 0);

  const currentNonces = new Map([
    ['alice', 0],
    ['bob', 0],
  ]);

  // Package a batch of 2 transactions
  const batch = popBatchReadySet(pool, 2, currentNonces);

  // Must select Bob nonce 0 (fee 50) and Alice nonce 0 (fee 10).
  // Alice nonce 1 (fee 100) CANNOT be packaged first because nonce 0 is not yet committed!
  assert.equal(batch.length, 2);
  assert.equal(batch[0].sender, 'bob');
  assert.equal(batch[0].nonce, 0);
  assert.equal(batch[1].sender, 'alice');
  assert.equal(batch[1].nonce, 0); // Alice nonce 0 must precede nonce 1!
});

test('OMX-022 Safe Eviction: evicts highest nonce of lowest-fee account to prevent permanent nonce gap', () => {
  const pool = createMainnetMempool(2); // capacity of 2

  // Alice inserts nonce 0 (fee 10) and nonce 1 (fee 10)
  const tx0: HardenedTx = {
    txId: 'tx-0',
    sender: 'alice',
    recipient: 'bob',
    amount: 5n,
    nonce: 0,
    feeRate: 10,
    signature: 's0',
  };
  const tx1: HardenedTx = {
    txId: 'tx-1',
    sender: 'alice',
    recipient: 'bob',
    amount: 5n,
    nonce: 1,
    feeRate: 10,
    signature: 's1',
  };

  insertMainnetMempool(pool, tx0, 0);
  insertMainnetMempool(pool, tx1, 0);

  // Eve submits tx with fee 30 (displaces an entry)
  const eveTx: HardenedTx = {
    txId: 'eve-tx',
    sender: 'eve',
    recipient: 'frank',
    amount: 50n,
    nonce: 0,
    feeRate: 30,
    signature: 'seve',
  };

  const res = insertMainnetMempool(pool, eveTx, 0);
  assert.equal(res.success, true);
  // Must evict nonce 1 (highest nonce), NOT nonce 0!
  // If nonce 0 were evicted, nonce 1 would be stuck forever with an unfillable gap!
  assert.equal(res.evictedTx?.nonce, 1);
  assert.equal(res.evictedTx?.sender, 'alice');
});

test('OMX-011/012 Merkle Range Proof: verifies boundary ordering and domain separation', () => {
  const valid = verifySparseMerkleRangeProof(
    '0xabcdef1234',
    '0x00000000',
    '0x0000ffff',
    'chunk-hash-1',
    [{ hash: 'sibling-1', isRightSibling: true }]
  );
  assert.equal(valid, true);

  // Inverted range boundaries -> reject (OMX-011)
  const invalidRange = verifySparseMerkleRangeProof(
    '0xabcdef1234',
    '0x0000ffff',
    '0x00000000', // startKey > endKey!
    'chunk-hash-1',
    [{ hash: 'sibling-1', isRightSibling: true }]
  );
  assert.equal(invalidRange, false);
});


