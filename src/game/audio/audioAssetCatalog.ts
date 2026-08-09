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
