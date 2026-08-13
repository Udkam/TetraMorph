import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const failures = [];
const checks = [];

function check(name, value, details) {
  const passed = Boolean(value);
  checks.push({ name, passed, details });
  if (!passed) failures.push({ name, details });
}

async function hashFile(path) {
  const bytes = await readFile(join(root, path));
  return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

const provenance = JSON.parse(await readFile(join(root, 'provenance.json'), 'utf8'));
const index = await readFile(join(root, 'index.html'), 'utf8');
const script = await readFile(join(root, 'audition.js'), 'utf8');
const embedded = await readFile(join(root, 'embedded-audio.js'), 'utf8');

check('schema-version', provenance.schemaVersion === 1, provenance.schemaVersion);
check('integration-fail-closed', provenance.productionIntegration === 'closed' && index.includes('生产接入关闭'), provenance.productionIntegration);
check('default-rejection-normal', index.includes('id="normal-verdicts"') && script.includes('value="none" checked'), 'normal radio group renders none checked');
check('default-rejection-chain', index.includes('id="chain-verdicts"') && script.includes('value="none" checked'), 'chain radio group renders none checked');
check('record-does-not-accept', script.includes('生产接入仍关闭，需在任务中由玩家明确接受'), 'local record remains comparison only');
check('candidate-count', provenance.recipes.length === 3 && (script.match(/id: '[ABC]'/g) ?? []).length === 3, provenance.recipes.map((item) => item.candidate));
check('paired-cues', provenance.recipes.every((item) => item.normalSeconds > 0 && item.chainSeconds >= 2.2 && item.chainSeconds <= 3 && item.chainSeconds > item.normalSeconds), provenance.recipes);
check('no-oscillator', !script.includes('createOscillator') && provenance.processingBoundary.forbiddenNodes.includes('OscillatorNode'), 'no procedural pitched source');
check('controls-present', ['master-volume', 'stop-all', 'record-verdict', 'play-status'].every((id) => index.includes(`id="${id}"`)), 'volume, stop, result, status');
check('hq-preview-distinction', provenance.sources[0].mediaRole === 'official-hq-preview-not-original-wav' && index.includes('不是登录后提供的原始 WAV'), provenance.sources[0].mediaRole);
check('cc0-sources', provenance.sources.every((source) => source.license === 'CC0-1.0'), provenance.sources.map((source) => source.license));

for (const source of provenance.sources) {
  const media = await hashFile(source.mediaPath);
  check(`${source.id}-media-bytes`, media.bytes === source.mediaBytes, media);
  check(`${source.id}-media-sha256`, media.sha256 === source.mediaSha256, media.sha256);
  const page = await hashFile(source.pagePath);
  check(`${source.id}-page-bytes`, page.bytes === source.pageBytes, page);
  check(`${source.id}-page-sha256`, page.sha256 === source.pageSha256, page.sha256);
  check(`${source.id}-embedded-hash`, embedded.includes(source.mediaSha256) && embedded.includes(`"bytes":${source.mediaBytes}`), source.mediaSha256);
}

const license = await hashFile(provenance.license.localPath);
check('license-bytes', license.bytes === provenance.license.bytes, license);
check('license-sha256', license.sha256 === provenance.license.sha256, license.sha256);

const tracked = [
  '.gitattributes',
  'index.html',
  'styles.css',
  'audition.js',
  'embedded-audio.js',
  'generate-embedded-audio.mjs',
  'PROVENANCE.md',
  'provenance.json',
  'verify.mjs',
  'browser-smoke.mjs',
  'http-smoke.mjs',
  'vite-smoke.mjs',
  'browser-report-file.json',
  'browser-report-http.json',
  'audition-page-file.png',
  'audition-page-http.png',
  'browser-report-vite.json',
  'audition-page-vite.png',
  ...provenance.sources.flatMap((source) => [source.mediaPath, source.pagePath]),
  provenance.license.localPath,
];
const fileManifest = [];
for (const path of tracked) fileManifest.push({ path, ...(await hashFile(path)) });

const report = {
  generatedAt: new Date().toISOString(),
  root: relative(process.cwd(), root).replaceAll('\\', '/'),
  passed: failures.length === 0,
  summary: { checks: checks.length, failures: failures.length },
  checks,
  files: fileManifest,
};
await writeFile(join(root, 'verification-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
