import freezeIceUrl from '../../assets/audio/t37/freeze-ice-cubes-hq.ogg?url';
import studioProgressUrl from '../../assets/audio/t37/studio-progress-step.ogg?url';
import studioStartUrl from '../../assets/audio/t37/studio-start.ogg?url';

const CC0_LICENSE = 'CC0-1.0' as const;
const CC0_LICENSE_FILE = 'licenses/audio/CC0-1.0.txt' as const;

const STUDIO_SOURCE = {
  publisher: 'UI SFX',
  projectUrl: 'https://uisfx.com/',
  repositoryUrl: 'https://github.com/romainsimon/uisfx',
  package: 'uisfx@0.4.0',
  sourceCommit: '2001f3dac2d1cf86ad99cbad5cef222c3a8b9082',
} as const;

const R5A_STEM_FORMAT = {
  encoding: 'PCM16 WAV',
  sampleRate: 48_000,
  channels: 1,
  frames: 8_640,
} as const;

const r5aStemSource = (candidate: 'A' | 'B' | 'C') => ({
  kind: 'project-generated',
  candidate,
  evidenceCommit: '99b47be36835c9ed1b9c72f2a0caf653cd2739a3',
  evidencePath: `docs/evidence/t37/bomb-familiar-language-audition-r5a/assets/${candidate}.wav`,
  contract: 'T37 R5A familiar-language audition',
  humanAccepted: false,
} as const);

/** Rejected source bytes retained for historical audit, never imported into the product bundle. */
export const REJECTED_BOMB_STEM_ARCHIVE = Object.freeze({
  A: Object.freeze({
    relativePath: 'src/assets/audio/t37/bomb-familiar-a.wav',
    sha256: 'be2b68b51e29ac0a040491b9f7e4b5f1633907cd6075cfe421a8e722380ea254',
    format: R5A_STEM_FORMAT,
    source: r5aStemSource('A'),
    status: 'human-rejected',
  }),
  B: Object.freeze({
    relativePath: 'src/assets/audio/t37/bomb-familiar-b.wav',
    sha256: 'b9ffeee9ec38007e5d3e8aa86997b62da939af968cec3f5bd83892337641f3fc',
    format: R5A_STEM_FORMAT,
    source: r5aStemSource('B'),
    status: 'human-rejected',
  }),
  C: Object.freeze({
    relativePath: 'src/assets/audio/t37/bomb-familiar-c.wav',
    sha256: 'ed866e4e50e39a2292d99c175c3be04881d6fe7720f32508afd4c7ebf7c5bcc6',
    format: R5A_STEM_FORMAT,
    source: r5aStemSource('C'),
    status: 'human-rejected',
  }),
});

/** Byte-frozen T37 samples. Audio playback policy remains owned by AudioEngine. */
export const T37_AUDIO_ASSETS = {
  studioProgress: {
    url: studioProgressUrl,
    sha256: 'f3f02d93d22fc0d1d046674510cfff98235f4df8cc839b13c6da23bf6ea97b0c',
    license: CC0_LICENSE,
    licenseFile: CC0_LICENSE_FILE,
    uses: ['line-clear-row-pulse', 'countdown-step'],
    source: {
      ...STUDIO_SOURCE,
      sourceFile: 'sounds/studio/progress-step.ogg',
    },
  },
  studioStart: {
    url: studioStartUrl,
    sha256: 'b85abe167750922700a1aa7f5d2f5e5162facfdc6782c298b9c825375bdfb388',
    license: CC0_LICENSE,
    licenseFile: CC0_LICENSE_FILE,
    uses: ['countdown-resolve'],
    source: {
      ...STUDIO_SOURCE,
      sourceFile: 'sounds/studio/start.ogg',
    },
  },
  freezeIce: {
    url: freezeIceUrl,
    sha256: '5a68425717de348ba3d10767618fa4c428a97f26c2e85abc96f45b7bfb35a450',
    license: CC0_LICENSE,
    licenseFile: CC0_LICENSE_FILE,
    uses: ['freeze-activation'],
    source: {
      publisher: 'Freesound',
      pageUrl: 'https://freesound.org/people/sbml/sounds/819779/',
      soundId: 819779,
      author: 'sbml',
      title: 'Ice cubes',
      runtimeFileKind: 'Freesound-generated HQ Ogg preview',
      originalFormat: 'WAV, 1.723 seconds, 96 kHz, 32-bit, stereo',
    },
    windowStartSeconds: 0.19375,
    windowDurationSeconds: 0.44,
    gain: 0.78,
    attack: 0.003,
    release: 0.012,
    originalFilename: '819779__sbml__ice-cubes.wav',
    originalSha256: null,
    status: 'pending',
  },
} as const;

export type T37AudioAssetId = keyof typeof T37_AUDIO_ASSETS;
