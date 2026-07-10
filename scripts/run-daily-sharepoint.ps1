param(
  [string]$RepoRoot,
  [string]$TargetPath,
  [switch]$SkipCodex,
  [switch]$NoCopy
)

$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

if (-not $RepoRoot) {
  $RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
} else {
  $RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
}

Set-Location -LiteralPath $RepoRoot
$logDir = Join-Path $RepoRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logPath = Join-Path $logDir ('daily-sharepoint-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
$lockPath = Join-Path $RepoRoot '.daily-research.lock'
$configPath = Join-Path $RepoRoot 'config\sharepoint-publish.json'
$config = if (Test-Path -LiteralPath $configPath) { Get-Content -Raw -Encoding utf8 -LiteralPath $configPath | ConvertFrom-Json } else { [pscustomobject]@{} }

if (-not $TargetPath) {
  if ($env:DAILY_RESEARCH_SHAREPOINT_PATH) {
    $TargetPath = $env:DAILY_RESEARCH_SHAREPOINT_PATH
  } elseif ($config.PSObject.Properties.Name -contains 'targetPath' -and $config.targetPath) {
    $TargetPath = $config.targetPath
  }
}

if ((Test-Path -LiteralPath $lockPath) -and ((Get-Date) - (Get-Item -LiteralPath $lockPath).LastWriteTime).TotalHours -lt 6) {
  throw "Another daily research run appears to be active: $lockPath"
}

New-Item -ItemType File -Force -Path $lockPath | Out-Null
Start-Transcript -Path $logPath -Append | Out-Null
try {
  Write-Host "Daily Research SharePoint publish started at $(Get-Date -Format o)"
  Write-Host "RepoRoot: $RepoRoot"

  $codexEnabled = $true
  if ($config.PSObject.Properties.Name -contains 'codex' -and $config.codex.PSObject.Properties.Name -contains 'enabled') {
    $codexEnabled = [bool]$config.codex.enabled
  }

  if (-not $SkipCodex -and $codexEnabled) {
    $promptPath = Join-Path $RepoRoot 'prompts\daily-research-agent.md'
    if ($config.PSObject.Properties.Name -contains 'codex' -and $config.codex.promptPath) {
      $promptPath = Join-Path $RepoRoot $config.codex.promptPath
    }
    if (-not (Test-Path -LiteralPath $promptPath)) { throw "Prompt file not found: $promptPath" }

    $codex = Get-Command codex -ErrorAction Stop
    $lastMessage = Join-Path $logDir 'codex-last-message.txt'
    $codexArgs = @('exec', '--cd', $RepoRoot, '--sandbox', 'workspace-write', '-c', 'approval_policy="never"', '--output-last-message', $lastMessage, '-')
    if ($config.PSObject.Properties.Name -contains 'codex' -and $config.codex.model) {
      $codexArgs = @('exec', '--cd', $RepoRoot, '--sandbox', 'workspace-write', '-m', $config.codex.model, '-c', 'approval_policy="never"', '--output-last-message', $lastMessage, '-')
    }

    Write-Host 'Running Codex daily research agent...'
    Get-Content -Raw -Encoding utf8 -LiteralPath $promptPath | & $codex.Source @codexArgs
    if ($LASTEXITCODE -ne 0) { throw "Codex exec failed with exit code $LASTEXITCODE" }
  } else {
    Write-Host 'Skipping Codex research step.'
  }

  Write-Host 'Building SharePoint single-file HTML...'
  & node (Join-Path $RepoRoot 'scripts\build-sharepoint-html.mjs')
  if ($LASTEXITCODE -ne 0) { throw "HTML build failed with exit code $LASTEXITCODE" }

  $sourcePath = Join-Path $RepoRoot 'sharepoint\daily-research.html'
  if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Built HTML not found: $sourcePath" }

  if ($NoCopy) {
    Write-Host 'NoCopy specified; skipping SharePoint copy.'
  } else {
    if (-not $TargetPath) {
      $folderUrl = if ($config.PSObject.Properties.Name -contains 'sharePoint') { $config.sharePoint.folderUrl } else { '' }
      throw "TargetPath is not configured. Set config/sharepoint-publish.json targetPath, pass -TargetPath, or set DAILY_RESEARCH_SHAREPOINT_PATH. SharePoint folder URL: $folderUrl"
    }
    $targetDir = Split-Path -Parent $TargetPath
    if (-not $targetDir) { throw "Invalid TargetPath: $TargetPath" }
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $tempTarget = Join-Path $targetDir ('.' + (Split-Path -Leaf $TargetPath) + '.tmp')
    Copy-Item -LiteralPath $sourcePath -Destination $tempTarget -Force
    Move-Item -LiteralPath $tempTarget -Destination $TargetPath -Force

    $srcHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourcePath).Hash
    $dstHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $TargetPath).Hash
    if ($srcHash -ne $dstHash) { throw 'Copied file hash does not match source file hash.' }
    Write-Host "Published to: $TargetPath"
  }

  Write-Host "Daily Research SharePoint publish completed at $(Get-Date -Format o)"
} finally {
  if (Test-Path -LiteralPath $lockPath) { Remove-Item -LiteralPath $lockPath -Force }
  Stop-Transcript | Out-Null
}