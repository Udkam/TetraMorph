# T37 Audio Audition R4 — Provenance

Status: **failed-item re-audition; not production adoption**

R4 preserves the exact R3 Studio row-clear and countdown assets already accepted by
the player. It only re-auditions lateral movement, rotation, natural lock, hard drop,
and Ice. No candidate is allowed into the runtime until the player listens to this
page and accepts it.

## Frozen accepted subset

Source: [UI SFX](https://uisfx.com/), package `uisfx@0.4.0`, source repository
[romainsimon/uisfx](https://github.com/romainsimon/uisfx), inspected commit
`2001f3dac2d1cf86ad99cbad5cef222c3a8b9082`. UI SFX audio is `CC0-1.0`;
its code is MIT and is not included here.

| Local file | SHA-256 | Contract |
| --- | --- | --- |
| `assets/accepted-studio/progress-step.ogg` | `f3f02d93d22fc0d1d046674510cfff98235f4df8cc839b13c6da23bf6ea97b0c` | accepted row pulse and 3·2·1 step |
| `assets/accepted-studio/start.ogg` | `b85abe167750922700a1aa7f5d2f5e5162facfdc6782c298b9c825375bdfb388` | accepted GO resolve |

The accepted R3 treatment remains unchanged, including its dedicated compressor
(`-10 dB` threshold, `10 dB` knee, `4:1`, 3 ms attack, 120 ms release). A four-row
clear is now exactly four `progress-step` pulses at `0 / 60 / 120 / 180 ms`; it has no
`complete` asset or resolve tail.

## Reworked ordinary actions

The action candidates use the same UI SFX source and license, but only the `soft`
pack. UI SFX describes this pack as rounded, warm, and reassuring. Its 12 ms source
attack and low transient setting are materially softer than the rejected Studio
action treatment. The R4 map also removes the rejected `1.75× / 1.45× / 1.18×`
pitch-up and replaces abrupt voice stops with short gain releases.

| TetraMorph event | Local file | SHA-256 | R4 treatment |
| --- | --- | --- | --- |
| move left | `assets/soft/back.ogg` | `dfb62e244e01dfa3549aeca70bcb4dc1f24a9e714c45afcff06e4c523ad06d43` | native leftward contour; 12/18 ms envelope; LP 2.6 kHz |
| move right | `assets/soft/forward.ogg` | `7f7ee911d2574bdfcb059a8d60d9909cd2196d6dcd3a80eed147ce7a8fa58761` | native rightward contour; 12/18 ms envelope; LP 2.6 kHz |
| rotate | `assets/soft/reorder.ogg` | `a1d9ca2db096d21fe2191733bbe658bec7ac42bd708f67c6d777dcd341baab6a` | 1.05×; 16/24 ms envelope; LP 2.3 kHz |
| natural lock | `assets/soft/lock.ogg` | `51fd3ef83754c5c48f9843a368153fd42b7e3bfeb27a4dfcf1be7855fc3f174e` | 0.92×; 18/28 ms envelope; LP 1.9 kHz |
| hard drop | `assets/soft/drop.ogg` | `8b9b2437106ec9cd7616c6e41856d31318b782e7e234f8a4c081b625f7e32722` | 0.88×; 14/36 ms envelope; LP 1.6 kHz; broad +2.5 dB at 160 Hz |

The browser calibrates every processed recipe to its declared **post-filter** peak.
This prevents the softening filters from silently turning the cue down. Continuous
movement releases the old voice over 12 ms before it stops, so retriggering does not
create a hard-cut click.

## Reworked Ice candidates

### Freeze Spell

- Primary page: [OpenGameArt — Freeze Spell](https://opengameart.org/content/freeze-spell-0)
- Author: `artisticdude`
- Page statement: experimental freeze/ice spell created for the FOSS RPG
  *Summoning Wars*
- License shown on the source page: `CC0`
- Direct source file: `https://opengameart.org/sites/default/files/freeze.wav`
- Local source: `assets/ice/freeze.wav`, 613,544 bytes
- SHA-256: `dc16da845f18f88885db4584205a4ad9b84a8da6e377b79d4511b366cc8631f1`
- Audition slice: `0.690–1.140 s`, rate `1.00`; its strongest release falls at
  approximately 320 ms after the visual starts. R4 uses 20/95 ms envelope, HP 100 Hz,
  -2 dB high shelf at 5 kHz, and LP 8.5 kHz.

### Ice breaking/shattering

- Primary page: [OpenGameArt — Ice breaking/shattering](https://opengameart.org/content/ice-breakingshattering)
- Author: `IgnasD`
- License shown on the source page: `CC0`
- Current downloaded archive: `IceShatters_0.zip`, 75,074 bytes
- Archive SHA-256: `b84ea396fac1af183dd2cb205a01edaa94b493ffb36965eafe59912e41cf9eb7`
- Selected source: archive member `IceShatters/LedasLuzta4.ogg`
- Local source: `assets/ice/ledas-luzta-4.ogg`, 18,326 bytes
- SHA-256: `81558c035953d4e595640be7ba1a645c47c6f4b72f38de43a44d36fa70d52b8c`
- Audition slice: `0.025–0.520 s`, rate `0.83`; the main shard release falls at
  approximately 327 ms. R4 uses a 14 ms attack, -5 dB high shelf at 4.2 kHz, and
  LP 7 kHz.

### Offline composite

`assets/ice/freeze-shard-composite.wav` combines a low-level Freeze Spell body with
the later IceShatters release. It is rendered deterministically by
`render-ice-composite.mjs` into one 48 kHz stereo buffer so two runtime voices cannot
compete for the same peak. Its SHA-256 is
`fea3b7e185441bd68707602ad0efa284c279d32d7511c7600a47ab7e6e240082`.
Both inputs are CC0, so the derivative remains CC0.

## Explicit exclusions

- R3 Studio/Mechanical/Sci-fi action mappings and the R3 Glass Ice pair remain
  rejected; none is present as an open R4 candidate.
- OpenGameArt `Ice spells` (`coldsnap.wav`, `ice.wav`) was license-checked as CC0 but
  excluded from R4 because its analyzed high-frequency concentration and crest made
  it likely to repeat the piercing/too-quiet tradeoff.
- omgaudio was license-checked as CC0 but its current `Ice shard` preset is explicitly
  a high-pitched zap with a 1 ms attack; it was excluded before audition.
- Dreamy was excluded for ordinary actions because its long echoing tails overlap at
  gameplay input rates. Zen was excluded because its short attack reintroduces the
  same sharp-edge risk.
- There is no commercial-game recording, copied music, AI-generated SFX, runtime
  package dependency, or network playback in this page.
- Automated checks can reject broken decoding, silence, clipping, a missing direct-file
  asset, or an incorrect action map. They cannot accept tone, fatigue, loudness, or
  semantic fit; those remain a human listening decision.
