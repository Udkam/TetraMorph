# T37 Audio Audition R3 — Provenance

Status: **candidate for human listening; not production adoption**

## Selected source

- Publisher/project: [UI SFX](https://uisfx.com/)
- Primary source repository: [romainsimon/uisfx](https://github.com/romainsimon/uisfx)
- npm package: `uisfx@0.4.0`
- Source commit inspected: `2001f3dac2d1cf86ad99cbad5cef222c3a8b9082`
- Primary tarball: `https://registry.npmjs.org/uisfx/-/uisfx-0.4.0.tgz`
- Tarball integrity:
  `sha512-W891N75C09cvpaNeChP+7BiP0Yp5VSbrIcRgZvzpFUT3o/2DxZqROmUcX50oxeyMnY4Hqxu4jEfjndVUpmheEQ==`
- Audio license: `CC0-1.0`; the copied license is `LICENSE-AUDIO`.
- Source-code license: MIT. No UI SFX source code or runtime package is included in
  this audition.

## Bounded subset

The audition copies only 23 Ogg files:

- `studio`, `mechanical`, and `scifi`: `swipe`, `reorder`, `lock`, `drop`,
  `progress-step`, `complete`, and `start`;
- `glass`: `lock` and `snap` for the isolated Ice comparison.

The three ordinary families deliberately use the same semantic map:

| TetraMorph action | Source cue | Audition treatment |
| --- | --- | --- |
| lateral move | `swipe` | directional pan, shortened playback |
| rotate | `reorder` | faster detent-shaped playback |
| natural lock | `lock` | direct contact cue |
| hard drop | `drop` | descending cue with stronger target peak |
| 1–4 row clear | `progress-step` | one pulse per row from `clear-started` |
| four-line resolve | `complete` | restrained tail after the four row pulses |
| 3–2–1 resolve | `start` | final release after three progress pulses |

## Explicit exclusions

- No commercial game recording, copied cue, music, random asset aggregator, AI SFX
  generator output, or network playback is present.
- The full 936-file package and its runtime are not dependencies of TetraMorph.
- Kenney Interface Sounds and omgaudio were license-checked as CC0 alternatives but no
  file from either source is included here.
- Signal checks can reject clipping, broken decoding, or an inaudible candidate. They
  cannot accept taste, semantic clarity, or repetition comfort; those remain a human
  listening gate.
