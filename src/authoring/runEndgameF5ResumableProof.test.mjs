import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { F5_RESUMABLE_RUNNER_TESTING, main } from '../../scripts/run-endgame-f5-resumable-proof.mjs';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const VITEST_ENTRY = path.join(REPOSITORY_ROOT, 'node_modules', 'vitest', 'vitest.mjs');

function temporaryReceiptDirectory(label) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `tetramorph-${label}-`));
  const receipts = path.join(parent, 'receipts');
  fs.mkdirSync(receipts);
  return Object.freeze({ parent, receipts });
}

function receiptContext(parent) {
  return Object.freeze({
    levelId: 't3r-cascade-05',
    stagePath: path.join(parent, 'stage'),
    ownerId: 't37-f5-test-owner',
  });
}

function proofResult(generation, routeSha256 = 'A'.repeat(64)) {
  return Object.freeze({
    routeSha256,
    status: 'searching',
    tip: Object.freeze({ generation, manifestSha256: `${generation.toString(16).toUpperCase()}`.padStart(64, 'B') }),
  });
}

function runnerArguments(context, additional = []) {
  return [
    '--level', context.levelId,
    '--stage', context.stagePath,
    '--receipts', context.receipts,
    '--owner', context.ownerId,
    '--max-advances', '1',
    ...additional,
  ];
}

function sealOneUnitWithoutReceipt(context, receipt) {
  const env = { ...process.env };
  delete env.ENDGAME_F5_CERTIFICATE_DISK_STAGE;
  delete env.ENDGAME_F5_CERTIFICATE_FIND_ROUTE;
  env.ENDGAME_F5_CERTIFICATE_DISCOVERY = context.levelId;
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_STAGE = context.stagePath;
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_OWNER = context.ownerId;
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_MODE = 'resume';
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_EXPECTED_TIP = JSON.stringify(receipt.tip);
  const child = spawnSync(process.execPath, [
    VITEST_ENTRY,
    'run',
    'src/game/core/endgameF5CertificateDiscovery.test.ts',
    '--maxWorkers=1',
    '--disableConsoleIntercept',
  ], {
    cwd: REPOSITORY_ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  expect(child.error).toBeUndefined();
  expect(child.status).toBe(0);
  expect(child.stdout).toContain('F5_CHECKPOINT=');
}

function manifestSha256(context, generation) {
  const fileName = F5_RESUMABLE_RUNNER_TESTING.manifestFileName(generation);
  return createHash('sha256')
    .update(fs.readFileSync(path.join(context.stagePath, fileName)))
    .digest('hex')
    .toUpperCase();
}

describe('F5 resumable proof receipt runner', () => {
  it('appends and reloads an immutable contiguous proof-tip chain', () => {
    const { parent, receipts } = temporaryReceiptDirectory('f5-r7-receipts');
    try {
      const context = receiptContext(parent);
      const first = F5_RESUMABLE_RUNNER_TESTING.makeReceipt(context, proofResult(0));
      const second = F5_RESUMABLE_RUNNER_TESTING.makeReceipt(context, proofResult(1));
      expect(F5_RESUMABLE_RUNNER_TESTING.appendReceipt(receipts, first)).toBe('tip-g00000.json');
      expect(F5_RESUMABLE_RUNNER_TESTING.appendReceipt(receipts, first)).toBe('tip-g00000.json');
      expect(F5_RESUMABLE_RUNNER_TESTING.appendReceipt(receipts, second)).toBe('tip-g00001.json');
      expect(F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context)).toEqual([
        expect.objectContaining({ ...first, fileName: 'tip-g00000.json' }),
        expect.objectContaining({ ...second, fileName: 'tip-g00001.json' }),
      ]);
      expect(() => F5_RESUMABLE_RUNNER_TESTING.appendReceipt(
        receipts,
        F5_RESUMABLE_RUNNER_TESTING.makeReceipt(context, proofResult(1, 'C'.repeat(64))),
      )).toThrow('already exists with different bytes');
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('fails closed on a receipt gap, wrong owner, or unknown directory entry', () => {
    const { parent, receipts } = temporaryReceiptDirectory('f5-r7-receipt-failures');
    try {
      const context = receiptContext(parent);
      const gap = F5_RESUMABLE_RUNNER_TESTING.makeReceipt(context, proofResult(1));
      fs.writeFileSync(path.join(receipts, 'tip-g00001.json'), `${JSON.stringify(gap)}\n`, 'utf8');
      expect(() => F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context)).toThrow('not contiguous');
      fs.rmSync(path.join(receipts, 'tip-g00001.json'));
      const wrongOwner = F5_RESUMABLE_RUNNER_TESTING.makeReceipt(
        Object.freeze({ ...context, ownerId: 'different-owner' }),
        proofResult(0),
      );
      fs.writeFileSync(path.join(receipts, 'tip-g00000.json'), `${JSON.stringify(wrongOwner)}\n`, 'utf8');
      expect(() => F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context)).toThrow('does not bind');
      fs.rmSync(path.join(receipts, 'tip-g00000.json'));
      fs.writeFileSync(path.join(receipts, 'surprise.txt'), 'not a receipt\n', 'utf8');
      expect(() => F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context)).toThrow('unexpected entry');
      expect(() => F5_RESUMABLE_RUNNER_TESTING.parseArguments([
        '--level', context.levelId,
        '--stage', context.stagePath,
        '--receipts', receipts,
        '--owner', context.ownerId,
        '--recover-generation', '1',
      ])).toThrow('must be provided together');
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it('recovers exactly one Store-authenticated sealed checkpoint without advancing it', () => {
    const { parent, receipts } = temporaryReceiptDirectory('f5-r7-recovery');
    try {
      const context = Object.freeze({ ...receiptContext(parent), receipts });
      main(runnerArguments(context));
      const first = F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context).at(-1);
      expect(first).toBeDefined();
      if (first === undefined) throw new Error('expected seeded receipt');
      sealOneUnitWithoutReceipt(context, first);
      const recoveryGeneration = first.tip.generation + 1;
      const correctHash = manifestSha256(context, recoveryGeneration);
      const wrongHash = `${correctHash.startsWith('A') ? 'B' : 'A'}${correctHash.slice(1)}`;
      expect(() => main(runnerArguments(context, [
        '--recover-generation', String(recoveryGeneration),
        '--recover-manifest-sha256', wrongHash,
      ]))).toThrow('recovery manifest SHA-256');
      expect(F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context)).toHaveLength(1);

      main(runnerArguments(context, [
        '--recover-generation', String(recoveryGeneration),
        '--recover-manifest-sha256', correctHash,
      ]));
      const ledger = F5_RESUMABLE_RUNNER_TESTING.readReceiptLedger(receipts, context);
      expect(ledger).toHaveLength(2);
      expect(ledger[1]).toEqual(expect.objectContaining({
        status: 'searching',
        routeSha256: first.routeSha256,
        tip: { generation: recoveryGeneration, manifestSha256: correctHash },
      }));
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }, 120_000);
});
