# T37 Bomb R3 — Stylized Block-Burst Audition

Contract base: `10dad00a67fc26ba8aeb0bde1edd3e54f02d4c7b` · generator commit: `037c45842aedb16a445bac6857e16a9f141d7be1`

This directory is an isolated human-listening surface. The six candidate WAVs are deterministic original synthesis; they do not reuse recorded explosion media and are not integrated into product audio.

| Cue | Duration | Peak | RMS | 2–6 kHz energy | SHA-256 |
| --- | ---: | ---: | ---: | ---: | --- |
| A normal | 0.32 s | 0.5000 | 0.1232 | 0.00% | 557dee352c68258ad7b8e0b8615925dbbf2a2a273e389c78b1ed453a7b88c9a9 |
| A chain | 0.92 s | 0.5000 | 0.0729 | 1.05% | cd76a23189e7fc2bd1a804694e237f0b7d9ecfbcc3d90692d01b778a987572b0 |
| B normal | 0.34 s | 0.5200 | 0.1099 | 0.01% | b456d4297bab0dac6a51ff6faa83da778b3eb2dd23cac1e98b794b7c3f32e6ab |
| B chain | 0.98 s | 0.5200 | 0.0649 | 3.18% | 025478fc60719328f88599138801b5f62cda9d2bbe0f38b11d35087a06307cdc |
| C normal | 0.30 s | 0.4800 | 0.1147 | 0.03% | 5ee70c5291606613ade6bde7c010c820f0765d938e909bd71e6282a4d9b4e29b |
| C chain | 0.88 s | 0.4800 | 0.0673 | 6.94% | 02ca0c9eda515a711e6bfb6a7b8cb988a4842197b0efd95dca0e501ccb4f6bf9 |

Generator SHA-256: recipes `c22a5bd280504bc1b649045095e7bad939cd55196657d8f436516bcf1f575fa6`; renderer `ecf257e39ecaa48ea4761773cb3eafb0229d9c8974a613592bb47f706376cfa3`; audition `7cc794dc3fb75079ca60d92d5a1706cbf0a03fa612c48b0f29b62942312913b6`; verifier `9f103ea01bea13bd1daa723476bd0f7c1a69e2adf1a3ca5cf7fbc5ff6047878d`; browser smoke `009b21897d9f740e23b7c615e5a2755411413aa447b6442d537575864cea9f9c`.

Accepted reference calibration: output gain 0.78; hard-drop peak 0.2524 before output; Studio one/four-line target peaks 0.50/0.54 before output.

Automated checks reject broken bytes, clipping, excessive high-frequency energy, timing drift, unbounded RMS/reference levels, and a mismatched chain onset. They cannot decide whether a cue sounds gentle, block-like, or appropriate. Human listening remains mandatory.

Run `node render-candidates.mjs`, `node verify.mjs`, and `node browser-smoke.mjs <url> <label>` from this directory. The current release gate uses both `file://` and a task-owned static HTTP URL; Vite is not required by this self-contained page.
