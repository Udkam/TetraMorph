# T37 Material + Ice current-HEAD evidence

Status: source-only harness. Human material/audio acceptance remains **OPEN / NOT
ACCEPTED** until the final consolidated review.

This directory re-computes Stage E whole-piece material proof against committed R5B
terminal head `171181228c0408cfa1bfb1259eb98c29a63efae3`. It uses the real product root,
real Mutation route, public DEV QA surface, current renderer, and current audio catalog.
Historical material PNGs and audits are never copied or read by these scripts.

The browser contract keeps representation and lifecycle boundaries explicit. An App
mtime touch requires byte-for-byte identical checkout content, fatal UTF-8 decoding,
CRLF-to-LF canonical bytes equal to the frozen Git blob, and clean-filter object identity;
mixed LF/CRLF checkout representation is therefore allowed but content drift is not.
HMR accepts a fresh `200` transformed App response only when its weak ETag is independently
recomputed from the captured response body with Vite's bundled `etag@1.8.1` algorithm,
followed by either a fresh `200` or an ETag-bound `304` bootstrap response. A reload is
counted only when the frame event is bound to its exact main-frame document request;
direct instrumentation of `History.prototype.replaceState` and `pushState` must observe
exactly one route-preserving `replaceState`, bound to the reloaded document and its separate
same-document navigation. The exposed History binding is drained without swallowing errors;
an exact `uiExitArm` cursor is frozen after the exit confirmation opens and immediately before
its route-changing confirmation, so extra History calls cannot hide after HMR while the normal
exit remains allowed. Ice responses use four explicit phases: `initial-freeze`,
`pre-hmr`, `hmr`, and `post-hmr`; only the two frozen initial responses are materialized as
provenance bytes, while every later response must remain inside its recorded phase marker
boundary and the Ice HMR phase markers must equal the primary HMR window markers.

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

The source writer must not run this sequence. Start from the committed source candidate with
the exact 36 pre-manifest outputs absent. The shared runtime-input v2 preflight rejects HEAD,
index, tracked, untracked, ignored, raw-source, clean-filter, frozen `src` tree, and external
fixture drift. The in-repository generators run it both before capture and before writing; the
generic prescribed client is bracketed by two byte-identical preflight attestations. From the
repository root, use one exact owned Vite PID and an exception-safe cleanup boundary:

```powershell
$port = 5193
$origin = "http://127.0.0.1:$port"
$repoRoot = (Resolve-Path '.').Path
$nodePath = (Resolve-Path 'E:\Nodejs\node.exe').Path
$existing = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
if ($existing.Count -ne 0) { throw "Port $port is already owned by PID(s): $($existing.OwningProcess -join ',')." }

$vite = Start-Process -FilePath $nodePath -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -ArgumentList @(
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', "$port", '--strictPort'
)
try {
  $deadline = [DateTime]::UtcNow.AddSeconds(12)
  $ready = $false
  while ([DateTime]::UtcNow -lt $deadline) {
    $vite.Refresh()
    if ($vite.HasExited) { throw "Owned Vite PID $($vite.Id) exited before readiness." }
    $listener = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
    if ($listener.Count -eq 1 -and $listener[0].OwningProcess -eq $vite.Id) {
      try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "$origin/" -TimeoutSec 2
        if ($response.StatusCode -eq 200) { $ready = $true; break }
      } catch { }
    }
    Start-Sleep -Milliseconds 100
  }
  if (-not $ready) { throw "Owned Vite PID $($vite.Id) did not become ready." }

  node docs/evidence/t37/material-ice-current-head/capture-semantic.mjs $origin
  if ($LASTEXITCODE -ne 0) { throw 'Semantic capture failed.' }
  node docs/evidence/t37/material-ice-current-head/capture-matrix.mjs $origin
  if ($LASTEXITCODE -ne 0) { throw 'Matrix capture failed.' }
  node docs/evidence/t37/material-ice-current-head/browser-smoke.mjs $origin
  if ($LASTEXITCODE -ne 0) { throw 'Browser lifecycle capture failed.' }

  $clientBindingBefore = node docs/evidence/t37/material-ice-current-head/evidence-contract.mjs --preflight
  if ($LASTEXITCODE -ne 0) { throw 'Prescribed-client input preflight failed.' }
  node "C:\Users\Alex Chen\.codex\skills\develop-web-game\scripts\web_game_playwright_client.js" --url "$origin/play/mutation" --iterations 3 --pause-ms 250 --screenshot-dir docs/evidence/t37/material-ice-current-head/client-smoke --actions-file docs/evidence/t37/material-ice-current-head/client-actions.json
  if ($LASTEXITCODE -ne 0) { throw 'Prescribed client failed.' }
  $clientBindingAfter = node docs/evidence/t37/material-ice-current-head/evidence-contract.mjs --preflight
  if ($LASTEXITCODE -ne 0 -or $clientBindingAfter -cne $clientBindingBefore) { throw 'Prescribed-client runtime input changed.' }

  node docs/evidence/t37/material-ice-current-head/write-manifest.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Manifest writer failed.' }
} finally {
  $vite.Refresh()
  if (-not $vite.HasExited) {
    Stop-Process -Id $vite.Id
    $stopDeadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
      Start-Sleep -Milliseconds 100
      $vite.Refresh()
    } while (-not $vite.HasExited -and [DateTime]::UtcNow -lt $stopDeadline)
    if (-not $vite.HasExited) { throw "Owned Vite PID $($vite.Id) did not exit." }
  }
  $releaseDeadline = [DateTime]::UtcNow.AddSeconds(5)
  do {
    $remaining = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
    if ($remaining.Count -eq 0) { break }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $releaseDeadline)
  if ($remaining.Count -ne 0) { throw "Port $port remains owned after stopping exact PID $($vite.Id)." }
}
```

The client script path is quoted because the user-profile path contains a space. The `finally`
block stops only the process started above and proves port `5193` free before review. Commit the
exact 37-file pre-report set only after that release proof. Inspect all
26 principal frames plus the three prescribed-client frames; JSON alone is not visual
acceptance. From the clean generated commit run:

```powershell
node docs/evidence/t37/material-ice-current-head/verify.mjs
```

That command may create only `verification-report.json`, which is committed separately.
An original uploader WAV is not present: `819779__sbml__ice-cubes.wav` remains login-gated,
with SHA-256 `null`. The product HQ Ogg and any preview are forbidden substitutes.
