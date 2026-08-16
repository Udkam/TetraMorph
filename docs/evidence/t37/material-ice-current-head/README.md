# T37 Material + Ice current-HEAD evidence

Status: source-only harness. Human material/audio acceptance remains **OPEN / NOT
ACCEPTED** until the final consolidated review.

This directory re-computes Stage E whole-piece material proof against committed R5B
terminal head `171181228c0408cfa1bfb1259eb98c29a63efae3`. It uses the real product root,
real Mutation route, public DEV QA surface, current renderer, and current audio catalog.
Historical material PNGs and audits are never copied or read by these scripts.

## Coordinator-only generation

The source writer must not run this sequence. From repository root, first prove port
`5193` is free, then start exactly one project-owned Vite process:

```powershell
E:\Nodejs\node.exe node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5193 --strictPort
```

With that exact process alive, run in order:

```powershell
node docs/evidence/t37/material-ice-current-head/capture-semantic.mjs http://127.0.0.1:5193
node docs/evidence/t37/material-ice-current-head/capture-matrix.mjs http://127.0.0.1:5193
node docs/evidence/t37/material-ice-current-head/browser-smoke.mjs http://127.0.0.1:5193
node "C:\Users\Alex Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js" --url http://127.0.0.1:5193/play/mutation --iterations 3 --pause-ms 250 --screenshot-dir docs/evidence/t37/material-ice-current-head/client-smoke --actions-file docs/evidence/t37/material-ice-current-head/client-actions.json
node docs/evidence/t37/material-ice-current-head/write-manifest.mjs
```

The client script path is quoted because the user-profile path contains a space. Stop the
exact Vite PID and prove port
`5193` free before reviewing and committing the exact 37-file pre-report set. Inspect all
26 principal frames plus the three prescribed-client frames; JSON alone is not visual
acceptance. From the clean generated commit run:

```powershell
node docs/evidence/t37/material-ice-current-head/verify.mjs
```

That command may create only `verification-report.json`, which is committed separately.
An original uploader WAV is not present: `819779__sbml__ice-cubes.wav` remains login-gated,
with SHA-256 `null`. The product HQ Ogg and any preview are forbidden substitutes.
