import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const port = 4192;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};
const server = createServer(async (request, response) => {
  try {
    const path = normalize(decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)).replace(/^[/\\]+/, '') || 'index.html';
    const target = join(root, path);
    if (!target.startsWith(root)) throw new Error('Path escaped evidence root');
    response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream' });
    response.end(await readFile(target));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});

const child = spawn(process.execPath, [join(root, 'browser-smoke.mjs'), `http://127.0.0.1:${port}/`, 'http'], {
  cwd: process.cwd(),
  stdio: 'inherit',
});
const code = await new Promise((resolve) => child.once('exit', resolve));
await new Promise((resolve) => server.close(resolve));
if (code !== 0) process.exitCode = code ?? 1;
