# Third-party notices

TetraMorph packages all gameplay fonts locally. The application does not request a
font CDN at runtime.

## Metal

- Package: `@fontsource/metal` `5.3.0`.
- Upstream: <https://github.com/google/fonts>.
- Packaged subset: Latin normal weight 400.
- License: SIL Open Font License 1.1, distributed in the package `LICENSE`.

## Geist Mono

- Package: `@fontsource/geist-mono` `5.3.0`.
- Upstream: <https://github.com/vercel/geist-font>.
- Packaged subsets: Latin normal weights 400, 500, 600, and 700.
- License: SIL Open Font License 1.1, distributed in the package `LICENSE`.

## Noto Sans SC

- Package: `@fontsource/noto-sans-sc` `5.3.0`.
- Upstream: <https://github.com/notofonts/noto-cjk>.
- Packaged subsets: Simplified Chinese normal weights 400, 500, 600, and 700.
- License: SIL Open Font License 1.1, distributed in the package `LICENSE`.

## Playwrite New Zealand Basic

- Package: `@fontsource/playwrite-nz-basic` `5.3.0`.
- Upstream: Google Fonts Playwrite project.
- License: SIL Open Font License 1.1; see
  [`licenses/fonts/PlaywriteNZBasic-OFL.txt`](licenses/fonts/PlaywriteNZBasic-OFL.txt).

## Audio

TetraMorph packages the three T37 runtime samples below locally and makes no runtime
network request for them. Their exact hashes and provenance status are recorded in
[`licenses/audio/t37-audio-manifest.json`](licenses/audio/t37-audio-manifest.json).

### UI SFX Studio

- Files: `studio-progress-step.ogg` and `studio-start.ogg` from the bounded Studio
  subset of `uisfx@0.4.0`.
- Publisher/project: [UI SFX](https://uisfx.com/); source repository:
  [romainsimon/uisfx](https://github.com/romainsimon/uisfx) at commit
  `2001f3dac2d1cf86ad99cbad5cef222c3a8b9082`.
- License: CC0-1.0; see
  [`licenses/audio/CC0-1.0.txt`](licenses/audio/CC0-1.0.txt).

### Ice cubes by sbml

- Runtime file: `freeze-ice-cubes-hq.ogg`, the exact accepted Freesound-generated HQ
  Ogg preview for sound `819779`.
- Primary page: [Ice cubes by sbml](https://freesound.org/people/sbml/sounds/819779/).
- License: CC0-1.0; see
  [`licenses/audio/CC0-1.0.txt`](licenses/audio/CC0-1.0.txt).
- Provenance status: the uploader-original `819779__sbml__ice-cubes.wav` is still
  pending authenticated download and SHA-256 archival. The runtime Ogg is not
  represented as that original WAV.
