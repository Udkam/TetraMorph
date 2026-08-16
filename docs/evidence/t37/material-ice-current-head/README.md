# T37 Material + Ice current-HEAD evidence

Status: source-only harness. Human material/audio acceptance remains **OPEN / NOT
ACCEPTED** until the final consolidated review.

This directory re-computes Stage E whole-piece material proof against committed R5B
terminal head `171181228c0408cfa1bfb1259eb98c29a63efae3`. It uses the real product root,
real Mutation route, public DEV QA surface, current renderer, and current audio catalog.
Historical material PNGs and audits are never copied or read by these scripts.

## Reproducible cold strict checkJs

Run this from the repository root. It creates a unique npm cache below `$env:TEMP`,
materializes only `typescript@7.0.2` and `@types/node@24.10.1`, verifies both fixed
versions, locates that invocation's temporary `@types` root, and checks the exact seven
JavaScript sources. It does not modify `package.json`, the lockfile, or the repository
dependency tree, and it does not use `skipLibCheck`.

```powershell
$repoRoot = (Resolve-Path '.').Path
$strictRoot = Join-Path $env:TEMP ("tetramorph-t37-checkjs-" + [Guid]::NewGuid().ToString('N'))
$strictCache = Join-Path $strictRoot 'npm-cache'
$priorNpmCache = $env:npm_config_cache
New-Item -ItemType Directory -Path $strictCache | Out-Null

try {
  $env:npm_config_cache = $strictCache
  Push-Location $env:TEMP
  try {
    npm.cmd exec --yes --package=typescript@7.0.2 --package=@types/node@24.10.1 -- tsc --version
    if ($LASTEXITCODE -ne 0) { throw 'The fixed npm exec environment failed to materialize.' }

    $npxCandidates = @(Get-ChildItem -LiteralPath (Join-Path $strictCache '_npx') -Directory | Where-Object {
      $typescriptPackage = Join-Path $_.FullName 'node_modules\typescript\package.json'
      $nodeTypesPackage = Join-Path $_.FullName 'node_modules\@types\node\package.json'
      (Test-Path -LiteralPath $typescriptPackage) -and (Test-Path -LiteralPath $nodeTypesPackage) -and
        ((Get-Content -LiteralPath $typescriptPackage -Raw -Encoding UTF8 | ConvertFrom-Json).version -eq '7.0.2') -and
        ((Get-Content -LiteralPath $nodeTypesPackage -Raw -Encoding UTF8 | ConvertFrom-Json).version -eq '24.10.1')
    })
    if ($npxCandidates.Count -ne 1) { throw "Expected one fixed npm exec environment; found $($npxCandidates.Count)." }

    $typeRoot = Join-Path $npxCandidates[0].FullName 'node_modules\@types'
    $repoTsc = Join-Path $repoRoot 'node_modules\.bin\tsc.cmd'
    if ((& $repoTsc --version) -ne 'Version 7.0.2') { throw 'Repository tsc is not the fixed 7.0.2 compiler.' }
    & $repoTsc `
      --ignoreConfig --noEmit --allowJs --checkJs --strict `
      --module NodeNext --moduleResolution NodeNext --target ES2023 --lib ES2023,DOM `
      --types node --typeRoots $typeRoot `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\evidence-contract.mjs') `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\product-fixture.mjs') `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\capture-semantic.mjs') `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\capture-matrix.mjs') `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\browser-smoke.mjs') `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\write-manifest.mjs') `
      (Join-Path $repoRoot 'docs\evidence\t37\material-ice-current-head\verify.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Strict checkJs failed.' }
  } finally {
    Pop-Location
  }
} finally {
  if ($null -eq $priorNpmCache) { Remove-Item Env:npm_config_cache -ErrorAction SilentlyContinue }
  else { $env:npm_config_cache = $priorNpmCache }
}
```

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
