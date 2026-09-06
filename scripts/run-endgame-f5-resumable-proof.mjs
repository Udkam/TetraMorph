import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createResumableEndgameDiskFrontierStore } from './endgame-disk-frontier.mjs';

const RECEIPT_SCHEMA = 't37-f5-r7-receipt-v1';
const CHECKPOINT_SCHEMA = 't37-f5-r7-checkpoint-v1';
const COMPLETE_SCHEMA = 't37-f5-r7-complete-v1';
const RECOVERED_CHECKPOINT_SCHEMA = 't37-f5-r7-recovered-checkpoint-v1';
const RECEIPT_FILE_PATTERN = /^tip-g(\d{5})\.json$/u;
const SHA256_PATTERN = /^[0-9A-F]{64}$/u;
const RUNNER_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(RUNNER_PATH), '..');
const VITEST_ENTRY = path.join(REPOSITORY_ROOT, 'node_modules', 'vitest', 'vitest.mjs');
const DISCOVERY_TEST = 'src/game/core/endgameF5CertificateDiscovery.test.ts';

function runnerError(message) {
  return new Error(`F5 resumable proof runner: ${message}`);
}

function assertPlainDirectory(directoryPath, label) {
  const stat = fs.lstatSync(directoryPath);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw runnerError(`${label} must be a plain directory`);
}

function normalizedAbsolutePath(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) throw runnerError(`${label} must be absolute`);
  const normalized = path.normalize(value);
  const resolved = path.resolve(value);
  if (normalized !== resolved) throw runnerError(`${label} must already be normalized`);
  assertPlainDirectory(path.dirname(resolved), `${label} parent`);
  return resolved;
}

function parsePositiveInteger(value, label, maximum) {
  if (!/^(?:[1-9][0-9]*)$/u.test(value ?? '')) throw runnerError(`${label} must be a positive decimal integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) throw runnerError(`${label} exceeds ${maximum}`);
  return parsed;
}

function parseNonnegativeInteger(value, label, maximum) {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value ?? '')) throw runnerError(`${label} must be a nonnegative decimal integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) throw runnerError(`${label} exceeds ${maximum}`);
  return parsed;
}

function parseRecoveryTip(values) {
  const generationText = values.get('--recover-generation');
  const manifestSha256 = values.get('--recover-manifest-sha256');
  if ((generationText === undefined) !== (manifestSha256 === undefined)) {
    throw runnerError('--recover-generation and --recover-manifest-sha256 must be provided together');
  }
  if (generationText === undefined) return undefined;
  if (!SHA256_PATTERN.test(manifestSha256)) {
    throw runnerError('--recover-manifest-sha256 must be uppercase SHA-256');
  }
  return Object.freeze({
    generation: parseNonnegativeInteger(generationText, '--recover-generation', 32_767),
    manifestSha256,
  });
}

function parseArguments(argumentsVector) {
  const values = new Map();
  for (let index = 0; index < argumentsVector.length; index += 1) {
    const flag = argumentsVector[index];
    if (!flag.startsWith('--') || values.has(flag)) throw runnerError(`invalid or repeated argument ${flag}`);
    const value = argumentsVector[index + 1];
    if (value === undefined || value.startsWith('--')) throw runnerError(`${flag} requires a value`);
    values.set(flag, value);
    index += 1;
  }
  const allowed = new Set([
    '--level', '--stage', '--receipts', '--owner', '--max-advances',
    '--recover-generation', '--recover-manifest-sha256',
  ]);
  for (const flag of values.keys()) {
    if (!allowed.has(flag)) throw runnerError(`unknown argument ${flag}`);
  }
  const required = (flag) => {
    const value = values.get(flag);
    if (value === undefined) throw runnerError(`${flag} is required`);
    return value;
  };
  const levelId = required('--level');
  const ownerId = required('--owner');
  if (!/^[\x20-\x7E]{1,128}$/u.test(ownerId)) throw runnerError('--owner must be 1..128 printable ASCII bytes');
  return Object.freeze({
    levelId,
    stagePath: normalizedAbsolutePath(required('--stage'), '--stage'),
    receiptDirectory: normalizedAbsolutePath(required('--receipts'), '--receipts'),
    ownerId,
    maximumAdvances: parsePositiveInteger(values.get('--max-advances') ?? '1', '--max-advances', 64),
    recoveryTip: parseRecoveryTip(values),
  });
}

function receiptFileName(generation) {
  if (!Number.isSafeInteger(generation) || generation < 0 || generation > 99_999) {
    throw runnerError('receipt generation is outside 0..99999');
  }
  return `tip-g${String(generation).padStart(5, '0')}.json`;
}

function parseTip(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw runnerError(`${label} tip is not an object`);
  const record = value;
  if (Object.keys(record).length !== 2 || !Object.hasOwn(record, 'generation') || !Object.hasOwn(record, 'manifestSha256')) {
    throw runnerError(`${label} tip keys are invalid`);
  }
  const { generation, manifestSha256 } = record;
  if (!Number.isSafeInteger(generation) || generation < 0 || generation > 32_767 || typeof manifestSha256 !== 'string' || !SHA256_PATTERN.test(manifestSha256)) {
    throw runnerError(`${label} tip is invalid`);
  }
  return Object.freeze({ generation, manifestSha256 });
}

function parseReceipt(bytes, expected, fileName) {
  const text = Buffer.from(bytes).toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(Buffer.from(bytes)) || !text.endsWith('\n') || text.endsWith('\n\n')) {
    throw runnerError(`${fileName} is not canonical UTF-8/LF`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text.slice(0, -1));
  } catch {
    throw runnerError(`${fileName} is not JSON`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw runnerError(`${fileName} is not an object`);
  const expectedKeys = ['schema', 'levelId', 'routeSha256', 'stagePath', 'ownerId', 'status', 'tip'];
  if (Object.keys(parsed).join('\0') !== expectedKeys.join('\0')) throw runnerError(`${fileName} has unexpected keys`);
  if (
    parsed.schema !== RECEIPT_SCHEMA
    || parsed.levelId !== expected.levelId
    || parsed.stagePath !== expected.stagePath
    || parsed.ownerId !== expected.ownerId
    || (parsed.status !== 'searching' && parsed.status !== 'complete')
    || typeof parsed.routeSha256 !== 'string'
    || !SHA256_PATTERN.test(parsed.routeSha256)
  ) throw runnerError(`${fileName} does not bind this proof request`);
  const tip = parseTip(parsed.tip, fileName);
  const canonical = JSON.stringify({
    schema: parsed.schema,
    levelId: parsed.levelId,
    routeSha256: parsed.routeSha256,
    stagePath: parsed.stagePath,
    ownerId: parsed.ownerId,
    status: parsed.status,
    tip,
  });
  if (`${canonical}\n` !== text) throw runnerError(`${fileName} is not canonical`);
  return Object.freeze({ ...parsed, tip });
}

function readReceiptLedger(receiptDirectory, expected) {
  if (!fs.existsSync(receiptDirectory)) return Object.freeze([]);
  assertPlainDirectory(receiptDirectory, 'receipt directory');
  const names = fs.readdirSync(receiptDirectory, { encoding: 'utf8' }).sort();
  const receipts = [];
  for (const name of names) {
    const match = RECEIPT_FILE_PATTERN.exec(name);
    if (!match) throw runnerError(`receipt directory contains unexpected entry ${name}`);
    const generation = Number(match[1]);
    const filePath = path.join(receiptDirectory, name);
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw runnerError(`${name} must be a plain file`);
    const receipt = parseReceipt(fs.readFileSync(filePath), expected, name);
    if (receipt.tip.generation !== generation) throw runnerError(`${name} generation does not match its tip`);
    if (receipts.length !== generation) throw runnerError('receipt generations are not contiguous from zero');
    receipts.push(Object.freeze({ ...receipt, fileName: name }));
  }
  return Object.freeze(receipts);
}

function ensureReceiptDirectory(receiptDirectory) {
  if (!fs.existsSync(receiptDirectory)) fs.mkdirSync(receiptDirectory, { recursive: false, mode: 0o700 });
  assertPlainDirectory(receiptDirectory, 'receipt directory');
}

function makeReceipt(expected, result) {
  return Object.freeze({
    schema: RECEIPT_SCHEMA,
    levelId: expected.levelId,
    routeSha256: result.routeSha256,
    stagePath: expected.stagePath,
    ownerId: expected.ownerId,
    status: result.status,
    tip: result.tip,
  });
}

function appendReceipt(receiptDirectory, receipt) {
  const fileName = receiptFileName(receipt.tip.generation);
  const filePath = path.join(receiptDirectory, fileName);
  const bytes = Buffer.from(`${JSON.stringify(receipt)}\n`, 'utf8');
  if (fs.existsSync(filePath)) {
    if (!fs.readFileSync(filePath).equals(bytes)) throw runnerError(`${fileName} already exists with different bytes`);
    return fileName;
  }
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, 'wx', 0o600);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  return fileName;
}

function sameTip(left, right) {
  return left !== null
    && right !== null
    && left.generation === right.generation
    && left.manifestSha256 === right.manifestSha256;
}

function manifestFileName(generation) {
  if (!Number.isSafeInteger(generation) || generation < 0 || generation > 99_999) {
    throw runnerError('manifest generation is outside 0..99999');
  }
  return `manifest-g${String(generation).padStart(5, '0')}.json`;
}

function assertNoStagePartResidue(stagePath) {
  assertPlainDirectory(stagePath, 'resumable stage');
  for (const name of fs.readdirSync(stagePath, { encoding: 'utf8' })) {
    if (name.endsWith('.part')) throw runnerError(`resumable stage has uncommitted residue ${name}`);
  }
}

function assertExactManifestTip(stagePath, tip) {
  const manifestPath = path.join(stagePath, manifestFileName(tip.generation));
  const stat = fs.lstatSync(manifestPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw runnerError('recovery manifest must be a plain file');
  const actual = createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex').toUpperCase();
  if (actual !== tip.manifestSha256) throw runnerError('recovery manifest SHA-256 does not match the explicit tip');
}

function recoverUnreceiptedCheckpoint(options, priorReceipt) {
  const recoveryTip = options.recoveryTip;
  if (recoveryTip === undefined) throw runnerError('recovery requires an explicit manifest tip');
  if (priorReceipt === undefined || priorReceipt.status !== 'searching') {
    throw runnerError('recovery requires a prior searching receipt');
  }
  if (recoveryTip.generation !== priorReceipt.tip.generation + 1) {
    throw runnerError('recovery tip generation must be exactly the next receipt generation');
  }
  assertNoStagePartResidue(options.stagePath);
  assertExactManifestTip(options.stagePath, recoveryTip);

  let store;
  let loaded;
  let suspension;
  try {
    store = createResumableEndgameDiskFrontierStore({
      stagePath: options.stagePath,
      mode: 'resume',
      ownerId: options.ownerId,
      expectedTip: recoveryTip,
    });
    loaded = store.loadCheckpoint();
  } finally {
    if (store !== undefined) suspension = store.suspend();
  }

  if (suspension === undefined || suspension.closeFailed) {
    throw runnerError('recovery Store suspension was not clean');
  }
  if (loaded === undefined || !loaded.advanceAllowed || !sameTip(loaded.tip, recoveryTip)) {
    throw runnerError('recovery Store did not authenticate an advanceable exact tip');
  }
  const checkpoint = loaded.checkpoint;
  if (
    checkpoint === null
    || checkpoint.kind !== 'searching'
    || checkpoint.generation !== recoveryTip.generation
  ) throw runnerError('recovery requires an exact searching checkpoint');
  const binding = checkpoint.binding;
  if (binding.levelId !== options.levelId || typeof binding.candidateCommandStream !== 'string') {
    throw runnerError('recovery checkpoint binding does not match the requested level');
  }
  const routeSha256 = createHash('sha256').update(binding.candidateCommandStream, 'utf8').digest('hex').toUpperCase();
  if (routeSha256 !== priorReceipt.routeSha256) {
    throw runnerError('recovery checkpoint binding route does not match the prior receipt');
  }
  assertNoStagePartResidue(options.stagePath);
  assertExactManifestTip(options.stagePath, recoveryTip);
  return Object.freeze({
    kind: 'checkpoint',
    status: 'searching',
    levelId: options.levelId,
    route: binding.candidateCommandStream,
    routeSha256,
    generation: recoveryTip.generation,
    tip: recoveryTip,
    depth: checkpoint.depth,
    parentOffset: checkpoint.parentOffset,
    recovered: true,
  });
}

function parseProofResult(output) {
  const markers = [];
  for (const line of output.split(/\r?\n/u)) {
    for (const marker of ['F5_CHECKPOINT=', 'F5_CERTIFICATE=']) {
      const offset = line.indexOf(marker);
      if (offset >= 0) markers.push(Object.freeze({ marker, text: line.slice(offset + marker.length) }));
    }
  }
  if (markers.length !== 1) throw runnerError('child output must contain exactly one F5 checkpoint or certificate marker');
  let parsed;
  try {
    parsed = JSON.parse(markers[0].text);
  } catch {
    throw runnerError('child F5 marker is not JSON');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw runnerError('child F5 marker is not an object');
  const tip = parseTip(parsed.tip, 'child F5 marker');
  if (parsed.generation !== tip.generation || typeof parsed.levelId !== 'string' || typeof parsed.route !== 'string') {
    throw runnerError('child F5 marker has an invalid binding');
  }
  const routeSha256 = createHash('sha256').update(parsed.route, 'utf8').digest('hex').toUpperCase();
  if (markers[0].marker === 'F5_CHECKPOINT=') {
    if (parsed.schema !== CHECKPOINT_SCHEMA || !Number.isSafeInteger(parsed.depth) || parsed.depth < 0
      || !Number.isSafeInteger(parsed.parentOffset) || parsed.parentOffset < 0) {
      throw runnerError('child checkpoint fields are invalid');
    }
    return Object.freeze({ kind: 'checkpoint', status: 'searching', ...parsed, tip, routeSha256 });
  }
  if (parsed.schema !== COMPLETE_SCHEMA) throw runnerError('child certificate schema is invalid');
  return Object.freeze({ kind: 'complete', status: 'complete', ...parsed, tip, routeSha256 });
}

function runOneAdvance(options, priorReceipt) {
  const mode = priorReceipt === undefined ? 'create' : 'resume';
  const env = { ...process.env };
  delete env.ENDGAME_F5_CERTIFICATE_DISK_STAGE;
  delete env.ENDGAME_F5_CERTIFICATE_FIND_ROUTE;
  delete env.ENDGAME_F5_CERTIFICATE_RESUMABLE_EXPECTED_TIP;
  env.ENDGAME_F5_CERTIFICATE_DISCOVERY = options.levelId;
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_STAGE = options.stagePath;
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_OWNER = options.ownerId;
  env.ENDGAME_F5_CERTIFICATE_RESUMABLE_MODE = mode;
  if (priorReceipt !== undefined) env.ENDGAME_F5_CERTIFICATE_RESUMABLE_EXPECTED_TIP = JSON.stringify(priorReceipt.tip);
  const child = spawnSync(process.execPath, [VITEST_ENTRY, 'run', DISCOVERY_TEST, '--maxWorkers=1', '--disableConsoleIntercept'], {
    cwd: REPOSITORY_ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const stdout = child.stdout ?? '';
  const stderr = child.stderr ?? '';
  if (child.error || child.status !== 0) {
    process.stderr.write(stdout);
    process.stderr.write(stderr);
    throw runnerError(`child proof invocation failed${child.signal ? ` (${child.signal})` : ''}`);
  }
  return parseProofResult(stdout);
}

export function main(argumentsVector = process.argv.slice(2)) {
  const options = parseArguments(argumentsVector);
  const expected = Object.freeze({
    levelId: options.levelId,
    stagePath: options.stagePath,
    ownerId: options.ownerId,
  });
  let receipts = readReceiptLedger(options.receiptDirectory, expected);
  if (receipts.length === 0 && fs.existsSync(options.stagePath)) {
    throw runnerError('an unreceipted stage already exists; refusing ambiguous create');
  }
  if (receipts.length > 0 && !fs.existsSync(options.stagePath)) {
    throw runnerError('receipts exist but the resumable stage is absent');
  }
  ensureReceiptDirectory(options.receiptDirectory);
  let latest = receipts.at(-1);
  if (latest?.status === 'complete') throw runnerError('receipt ledger already records a complete certificate');
  if (options.recoveryTip !== undefined) {
    const result = recoverUnreceiptedCheckpoint(options, latest);
    const receipt = makeReceipt(expected, result);
    const fileName = appendReceipt(options.receiptDirectory, receipt);
    process.stdout.write(`F5_CHECKPOINT=${JSON.stringify({
      schema: RECOVERED_CHECKPOINT_SCHEMA,
      levelId: result.levelId,
      route: result.route,
      generation: result.generation,
      depth: result.depth,
      parentOffset: result.parentOffset,
      tip: result.tip,
      recovered: true,
      receipt: fileName,
    })}\n`);
    return;
  }
  for (let count = 0; count < options.maximumAdvances; count += 1) {
    const result = runOneAdvance(options, latest);
    if (result.levelId !== options.levelId) throw runnerError('child level does not match requested level');
    if (latest !== undefined && result.routeSha256 !== latest.routeSha256) throw runnerError('child route differs from receipt chain');
    const expectedGeneration = latest === undefined ? 0 : latest.tip.generation + 1;
    if (result.tip.generation !== expectedGeneration) throw runnerError('child generation is not the next receipt generation');
    const receipt = makeReceipt(expected, result);
    const fileName = appendReceipt(options.receiptDirectory, receipt);
    latest = Object.freeze({ ...receipt, fileName });
    receipts = Object.freeze([...receipts, latest]);
    const marker = result.kind === 'complete' ? 'F5_CERTIFICATE' : 'F5_CHECKPOINT';
    process.stdout.write(`${marker}=${JSON.stringify({ ...result, receipt: fileName })}\n`);
    if (result.kind === 'complete') return;
  }
}

export const F5_RESUMABLE_RUNNER_TESTING = Object.freeze({
  normalizedAbsolutePath,
  parseArguments,
  parseReceipt,
  readReceiptLedger,
  makeReceipt,
  appendReceipt,
  receiptFileName,
  manifestFileName,
  recoverUnreceiptedCheckpoint,
});

if (path.resolve(process.argv[1] ?? '') === RUNNER_PATH) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
