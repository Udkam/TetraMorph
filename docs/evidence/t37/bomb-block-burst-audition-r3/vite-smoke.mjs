import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(root, '..', '..', '..', '..')
const server = await createServer({
  root: repositoryRoot,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 4193, strictPort: true },
})

try {
  await server.listen()
  const child = spawn(process.execPath, [
    join(root, 'browser-smoke.mjs'),
    'http://127.0.0.1:4193/docs/evidence/t37/bomb-block-burst-audition-r3/',
    'vite',
  ], { cwd: repositoryRoot, stdio: 'inherit' })
  const code = await new Promise((resolveExit) => child.once('exit', resolveExit))
  if (code !== 0) process.exitCode = code ?? 1
} finally {
  await server.close()
}
