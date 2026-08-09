import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const ASSET_ROOT = join(ROOT, 'assets')
const SUPPORTED = new Set(['.ogg', '.wav'])

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else if (entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())) files.push(path)
  }
  return files
}

const files = (await walk(ASSET_ROOT)).sort()
const embedded = Object.fromEntries(await Promise.all(files.map(async (path) => [
  `./${relative(ROOT, path).replaceAll('\\', '/')}`,
  (await readFile(path)).toString('base64'),
])))

await writeFile(
  join(ROOT, 'embedded-assets.js'),
  `window.__T37_R4_EMBEDDED_AUDIO__ = Object.freeze(${JSON.stringify(embedded)})\n`,
  'utf8',
)

process.stdout.write(`embedded ${files.length} assets\n`)
