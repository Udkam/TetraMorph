import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const assetsRoot = join(root, 'assets')

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) files.push(...await walk(child))
    else if (entry.isFile() && entry.name.endsWith('.ogg')) files.push(child)
  }
  return files
}

const files = (await walk(assetsRoot)).sort()
const embedded = Object.fromEntries(await Promise.all(files.map(async (path) => {
  const key = `./${relative(root, path).replaceAll('\\', '/')}`
  return [key, (await readFile(path)).toString('base64')]
})))

const output = `window.__T37_EMBEDDED_AUDIO__ = Object.freeze(${JSON.stringify(embedded)})\n`
await writeFile(join(root, 'embedded-assets.js'), output, 'utf8')
process.stdout.write(`embedded_assets=${files.length}\n`)
