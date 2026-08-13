import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const server = await createServer({
  root,
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 4193,
    strictPort: true,
  },
});

try {
  await server.listen();
  const child = spawn(process.execPath, [join(root, 'browser-smoke.mjs'), 'http://127.0.0.1:4193/', 'vite'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  const code = await new Promise((resolve) => child.once('exit', resolve));
  if (code !== 0) process.exitCode = code ?? 1;
} finally {
  await server.close();
}
