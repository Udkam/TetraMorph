import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Vercel static publication', () => {
  it('builds only dist and rewrites game routes without swallowing missing assets', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    expect(config.framework).toBe('vite');
    expect(config.installCommand).toBe('npm ci');
    expect(config.buildCommand).toBe('npm run build');
    expect(config.outputDirectory).toBe('dist');
    expect(config.rewrites).toEqual([
      { source: '/play/:path*', destination: '/index.html' },
      { source: '/endgames/:path*', destination: '/index.html' },
    ]);
    expect(config.headers[0].source).toBe('/assets/:path*');
    expect(config.headers[0].headers[0].value).toContain('immutable');
  });
});
