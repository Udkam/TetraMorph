import { describe, expect, it } from 'vitest';
// @ts-expect-error Vitest runs this byte fixture audit in Node while product types omit Node.
import { createHash } from 'node:crypto';
// @ts-expect-error Vitest runs this byte fixture audit in Node while product types omit Node.
import { readFileSync } from 'node:fs';
import { T37_AUDIO_ASSETS, type T37AudioAssetId } from './audioAssetCatalog';

const ASSET_IDS = [
  'studioProgress',
  'studioStart',
  'freezeIce',
  'bombFamiliarA',
  'bombFamiliarB',
  'bombFamiliarC',
] satisfies T37AudioAssetId[];

const EXTERNAL_CC0_ASSET_IDS = [
  'studioProgress',
  'studioStart',
  'freezeIce',
] as const;

function inspectPcm16Wav(candidate: 'A' | 'B' | 'C') {
  const bytes = readFileSync(new URL(
    `../../assets/audio/t37/bomb-familiar-${candidate.toLowerCase()}.wav`,
    import.meta.url,
  ));
  const formatOffset = bytes.indexOf(new Uint8Array([0x66, 0x6d, 0x74, 0x20]));
  const dataOffset = bytes.indexOf(new Uint8Array([0x64, 0x61, 0x74, 0x61]));
  const channels = bytes.readUInt16LE(formatOffset + 10);
  const sampleRate = bytes.readUInt32LE(formatOffset + 12);
  const bitsPerSample = bytes.readUInt16LE(formatOffset + 22);
  const dataBytes = bytes.readUInt32LE(dataOffset + 4);
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    riff: bytes.toString('ascii', 0, 4),
    wave: bytes.toString('ascii', 8, 12),
    encoding: bytes.readUInt16LE(formatOffset + 8),
    channels,
    sampleRate,
    bitsPerSample,
    frames: dataBytes / channels / (bitsPerSample / 8),
  };
}

describe('T37 audio asset catalog', () => {
  it('exposes the three external samples and three provisional project-generated Bomb stems', () => {
    expect(Object.keys(T37_AUDIO_ASSETS)).toEqual(ASSET_IDS);

    for (const id of EXTERNAL_CC0_ASSET_IDS) {
      const asset = T37_AUDIO_ASSETS[id];
      expect(asset.url, id).toMatch(/\.ogg(?:\?|$)/);
      expect(asset.url, id).not.toMatch(/^https?:/);
      expect(asset.sha256, id).toMatch(/^[0-9a-f]{64}$/);
      expect(asset.license, id).toBe('CC0-1.0');
      expect(asset.licenseFile, id).toBe('licenses/audio/CC0-1.0.txt');
      expect(asset.uses.length, id).toBeGreaterThan(0);
    }
  });

  it('binds byte-exact R5A PCM16 stems without claiming human acceptance', () => {
    const expected = {
      bombFamiliarA: ['A', 'be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254'],
      bombFamiliarB: ['B', 'b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc'],
      bombFamiliarC: ['C', 'ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6'],
    } as const;

    for (const [id, [candidate, sha256]] of Object.entries(expected)) {
      const asset = T37_AUDIO_ASSETS[id as keyof typeof expected];
      expect(asset.url, id).toMatch(/\.wav(?:\?|$)/);
      expect(asset.sha256, id).toBe(sha256);
      expect(asset.format, id).toEqual({
        encoding: 'PCM16 WAV', sampleRate: 48_000, channels: 1, frames: 8_640,
      });
      expect(asset.source, id).toMatchObject({
        kind: 'project-generated',
        candidate,
        evidenceCommit: '99b47be36835c9ed1b9c72f2a0caf653cd2739a3',
        evidencePath: `docs/evidence/t37/bomb-familiar-language-audition-r5a/assets/${candidate}.wav`,
        humanAccepted: false,
      });
      expect(asset.status, id).toBe('provisional');
      expect(inspectPcm16Wav(candidate)).toEqual({
        sha256,
        riff: 'RIFF',
        wave: 'WAVE',
        encoding: 1,
        channels: 1,
        sampleRate: 48_000,
        bitsPerSample: 16,
        frames: 8_640,
      });
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
