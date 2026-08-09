import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const paths = [
  'assets/ice/giwake-ice-breaking-1-hq.ogg',
  'assets/ice/sbml-ice-cubes-hq.ogg',
  'assets/ice/ecfike-ice-crack-9-hq.ogg',
]

const embedded = Object.fromEntries(await Promise.all(paths.map(async (path) => [
  `./${path}`,
  (await readFile(join(root, path))).toString('base64'),
])))

await writeFile(
  join(root, 'embedded-assets.js'),
  `window.__T37_R5_EMBEDDED_AUDIO__ = Object.freeze(${JSON.stringify(embedded)})\n`,
  'utf8',
)
