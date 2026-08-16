// @ts-check
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CLIENT, assertRuntimeInputBinding, getPrescribedClientPath, repo, root,
} from './evidence-contract.mjs';

/** @param {import('node:crypto').BinaryLike} value */
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
/** @param {any} left @param {any} right */
const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
/** @param {string} value */
function exactOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '5193'
    || url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error('Prescribed client origin must be exactly http://127.0.0.1:5193/.');
  }
  return url.origin;
}

const origin = exactOrigin(process.argv[2] ?? 'http://127.0.0.1:5193');
const runtimeInputBefore = assertRuntimeInputBinding();
const script = getPrescribedClientPath();
const clientLocator = runtimeInputBefore.environment?.prescribedClient?.locator;
const nodeLocator = runtimeInputBefore.environment?.node?.locator;
if (typeof clientLocator !== 'string' || typeof nodeLocator !== 'string') throw new Error('Portable prescribed-client locators are unavailable.');
const clientDirectory = join(root, 'client-smoke');
const attestationPath = join(root, 'client-attestation.json');
if (existsSync(clientDirectory) || existsSync(attestationPath)) {
  throw new Error('Prescribed-client outputs and attestation must be absent before capture.');
}
const args = [
  script,
  '--url', `${origin}/play/mutation`,
  '--iterations', '3',
  '--pause-ms', '250',
  '--screenshot-dir', 'docs/evidence/t37/material-ice-current-head/client-smoke',
  '--actions-file', 'docs/evidence/t37/material-ice-current-head/client-actions.json',
];
const startedAt = new Date().toISOString();
execFileSync(process.execPath, args, { cwd: repo, stdio: 'inherit' });

const clientDirectoryStat = lstatSync(clientDirectory);
if (!clientDirectoryStat.isDirectory() || clientDirectoryStat.isSymbolicLink()
  || realpathSync(clientDirectory) !== clientDirectory) throw new Error('Prescribed-client output directory is not one exact regular directory.');
const actualNames = (await readdir(clientDirectory)).sort();
const expectedNames = CLIENT.map((path) => path.slice('client-smoke/'.length)).sort();
if (!deepEqual(actualNames, expectedNames)) throw new Error(`Prescribed-client output set drifted: ${actualNames.join(',')}.`);
const outputs = [];
for (const path of CLIENT) {
  const outputPath = join(root, ...path.split('/'));
  const outputStat = lstatSync(outputPath);
  if (!outputStat.isFile() || outputStat.isSymbolicLink() || realpathSync(outputPath) !== outputPath) {
    throw new Error(`${path}: prescribed-client output is not one exact regular file.`);
  }
  let bytes = await readFile(outputPath);
  if (path.endsWith('.png')) {
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${path}: invalid PNG signature.`);
  } else {
    const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (value.includes('\r')) throw new Error(`${path}: CR bytes are forbidden.`);
    const state = JSON.parse(value);
    if (state?.mode !== 'sprint' || state?.screen !== 'game') throw new Error(`${path}: prescribed client did not remain in the Sprint game.`);
    if (!value.endsWith('\n')) {
      bytes = Buffer.from(`${value}\n`, 'utf8');
      await writeFile(outputPath, bytes);
    }
  }
  outputs.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
}
const runtimeInputAfter = assertRuntimeInputBinding(runtimeInputBefore.evidenceSourceHead);
if (!deepEqual(runtimeInputAfter, runtimeInputBefore)) throw new Error('Runtime input changed during the prescribed-client capture.');
const finishedAt = new Date().toISOString();

const report = {
  schema: 'tetramorph.t37.material-client-attestation.v1',
  generatedAt: new Date().toISOString(),
  passed: true,
  origin,
  startedAt,
  finishedAt,
  invocation: { executable: nodeLocator, args: [clientLocator, ...args.slice(1)] },
  runtimeInputBefore,
  runtimeInputAfter,
  outputs,
};
const finalNames = (await readdir(clientDirectory)).sort();
if (!deepEqual(finalNames, expectedNames) || existsSync(attestationPath)) throw new Error('Prescribed-client output set changed before attestation write.');
for (const output of outputs) {
  const outputPath = join(root, ...output.path.split('/'));
  const outputStat = lstatSync(outputPath);
  if (!outputStat.isFile() || outputStat.isSymbolicLink() || realpathSync(outputPath) !== outputPath) {
    throw new Error(`${output.path}: output identity changed before attestation write.`);
  }
  const bytes = await readFile(outputPath);
  if (bytes.length !== output.bytes || sha256(bytes) !== output.sha256) throw new Error(`${output.path}: bytes changed before attestation write.`);
}
await writeFile(attestationPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
