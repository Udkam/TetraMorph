import { describe, expect, it } from 'vitest';
import { T37_AUDIO_ASSETS, type T37AudioAssetId } from './audioAssetCatalog';

const ASSET_IDS = [
  'studioProgress',
  'studioStart',
  'freezeIce',
] satisfies T37AudioAssetId[];

describe('T37 audio asset catalog', () => {
  it('exposes only the three human-accepted local runtime samples', () => {
    expect(Object.keys(T37_AUDIO_ASSETS)).toEqual(ASSET_IDS);

    for (const id of ASSET_IDS) {
      const asset = T37_AUDIO_ASSETS[id];
      expect(asset.url, id).toMatch(/\.ogg(?:\?|$)/);
      expect(asset.url, id).not.toMatch(/^https?:/);
      expect(asset.sha256, id).toMatch(/^[0-9a-f]{64}$/);
      expect(asset.license, id).toBe('CC0-1.0');
      expect(asset.licenseFile, id).toBe('licenses/audio/CC0-1.0.txt');
      expect(asset.uses.length, id).toBeGreaterThan(0);
    }
  });

  it('pins the accepted Studio bytes and audited UI SFX source', () => {
    expect(T37_AUDIO_ASSETS.studioProgress).toMatchObject({
      sha256: 'f3f02d93d22fc0d1d046674510cfff98235f4df8cc839b13c6da23bf6ea97b0c',
      uses: ['line-clear-row-pulse', 'countdown-step'],
      source: {
        package: 'uisfx@0.4.0',
        sourceCommit: '2001f3dac2d1cf86ad99cbad5cef222c3a8b9082',
        sourceFile: 'sounds/studio/progress-step.ogg',
      },
    });
    expect(T37_AUDIO_ASSETS.studioStart).toMatchObject({
      sha256: 'b85abe167750922700a1aa7f5d2f5e5162facfdc6782c298b9c825375bdfb388',
      uses: ['countdown-resolve'],
      source: {
        package: 'uisfx@0.4.0',
        sourceCommit: '2001f3dac2d1cf86ad99cbad5cef222c3a8b9082',
        sourceFile: 'sounds/studio/start.ogg',
      },
    });
  });

  it('pins the accepted Ice 2 window without pretending the preview is the original WAV', () => {
    expect(T37_AUDIO_ASSETS.freezeIce).toMatchObject({
      sha256: '5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450',
      uses: ['freeze-activation'],
      source: {
        publisher: 'Freesound',
        soundId: 819779,
        author: 'sbml',
        title: 'Ice cubes',
        runtimeFileKind: 'Freesound-generated HQ Ogg preview',
      },
      windowStartSeconds: 0.19375,
      windowDurationSeconds: 0.44,
      gain: 0.78,
      attack: 0.003,
      release: 0.012,
      originalFilename: '819779__sbml__ice-cubes.wav',
      originalSha256: null,
      status: 'pending',
    });
  });
});
