param(
  [string]$RepoRoot,
  [string]$TargetPath,
  [switch]$SkipCodex,
  [switch]$NoCopy,
  [switch]$NoGit
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

    $codexPath = $null
    $configuredCodexPath = $null
    if ($config.PSObject.Properties.Name -contains 'codex' -and $config.codex.PSObject.Properties.Name -contains 'path') {
      $configuredCodexPath = $config.codex.path
    }
    if ($configuredCodexPath -and (Test-Path -LiteralPath $configuredCodexPath)) {
      $codexPath = $configuredCodexPath
    } else {
      $codexCommand = Get-Command codex -ErrorAction SilentlyContinue
      if ($codexCommand) {
        $codexPath = $codexCommand.Source
      } else {
        $fallbackCodexPath = Join-Path $env:USERPROFILE '.codex\.sandbox-bin\codex.exe'
        if (Test-Path -LiteralPath $fallbackCodexPath) {
          $codexPath = $fallbackCodexPath
        }
      }
    }
    $researchFailure = $null
    if ($codexPath) {
      Write-Host "Codex CLI: $codexPath"

      $lastMessage = Join-Path $logDir 'codex-last-message.txt'
      $codexArgs = @('exec', '--cd', $RepoRoot, '--sandbox', 'workspace-write', '-c', 'approval_policy="never"', '--output-last-message', $lastMessage, '-')
      if ($config.PSObject.Properties.Name -contains 'codex' -and $config.codex.model) {
        $codexArgs = @('exec', '--cd', $RepoRoot, '--sandbox', 'workspace-write', '-m', $config.codex.model, '-c', 'approval_policy="never"', '--output-last-message', $lastMessage, '-')
      }

      Write-Host 'Running Codex daily research agent...'
      Get-Content -Raw -Encoding utf8 -LiteralPath $promptPath | & $codexPath @codexArgs
      if ($LASTEXITCODE -ne 0) {
        $researchFailure = "Codex exec failed with exit code $LASTEXITCODE"
      } elseif ((Test-Path -LiteralPath $logPath) -and (Select-String -LiteralPath $logPath -Pattern 'ERROR codex_core' -Quiet)) {
        $researchFailure = "Codex exec reported internal tool errors (see $logPath)"
      }
    } else {
      $researchFailure = "Codex CLI not found. Checked config codex.path ('$configuredCodexPath'), PATH (codex command), and $(Join-Path $env:USERPROFILE '.codex\.sandbox-bin\codex.exe')"
    }

    if ($researchFailure) {
      $claudeConfig = $null
      if ($config.PSObject.Properties.Name -contains 'claudeFallback') { $claudeConfig = $config.claudeFallback }
      $claudeEnabled = $false
      if ($claudeConfig -and $claudeConfig.PSObject.Properties.Name -contains 'enabled') { $claudeEnabled = [bool]$claudeConfig.enabled }
      if (-not $claudeEnabled) { throw "$researchFailure (Claude fallback is disabled)" }

      $claudePath = $null
      if ($claudeConfig.PSObject.Properties.Name -contains 'path' -and $claudeConfig.path -and (Test-Path -LiteralPath $claudeConfig.path)) {
        $claudePath = $claudeConfig.path
      } else {
        $claudeCommand = Get-Command claude -ErrorAction SilentlyContinue
        if ($claudeCommand) {
          $claudePath = $claudeCommand.Source
        } else {
          $extensionClaude = Get-ChildItem -Path (Join-Path $env:USERPROFILE '.vscode\extensions\anthropic.claude-code-*\resources\native-binary\claude.exe') -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
          if ($extensionClaude) { $claudePath = $extensionClaude.FullName }
        }
      }
      if (-not $claudePath) { throw "$researchFailure; Claude fallback CLI not found (checked config claudeFallback.path, PATH, and VS Code extension bundle)" }

      $claudeModel = 'sonnet'
      if ($claudeConfig.PSObject.Properties.Name -contains 'model' -and $claudeConfig.model) { $claudeModel = $claudeConfig.model }
      $claudePermissionMode = 'dontAsk'
      if ($claudeConfig.PSObject.Properties.Name -contains 'permissionMode' -and $claudeConfig.permissionMode) { $claudePermissionMode = $claudeConfig.permissionMode }
      $claudeAllowedTools = 'WebSearch,WebFetch,Read,Edit,Write,Glob,Grep,Bash(node:*)'
      if ($claudeConfig.PSObject.Properties.Name -contains 'allowedTools' -and $claudeConfig.allowedTools) { $claudeAllowedTools = $claudeConfig.allowedTools }

      Write-Host "Claude CLI: $claudePath"
      Write-Host "$researchFailure; falling back to Claude Code ($claudeModel)..."
      Get-Content -Raw -Encoding utf8 -LiteralPath $promptPath | & $claudePath -p --model $claudeModel --permission-mode $claudePermissionMode --allowedTools $claudeAllowedTools --output-format text
      if ($LASTEXITCODE -ne 0) { throw "Claude fallback failed with exit code $LASTEXITCODE ($researchFailure)" }
      Write-Host 'Claude fallback completed the research step.'
    }
  } else {
    Write-Host 'Skipping Codex research step.'
  }

  $reportDate = Get-Date -Format 'yyyy-MM-dd'
  $reportValidator = Join-Path $RepoRoot 'scripts\validate-daily-report.mjs'
  if (Test-Path -LiteralPath $reportValidator) {
    Write-Host "Validating daily report quality for $reportDate..."
    & node $reportValidator $reportDate
    if ($LASTEXITCODE -ne 0) { throw "Daily report validation failed with exit code $LASTEXITCODE" }
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

  $gitEnabled = $true
  if ($config.PSObject.Properties.Name -contains 'git' -and $config.git.PSObject.Properties.Name -contains 'enabled') {
    $gitEnabled = [bool]$config.git.enabled
  }

  if (-not $NoGit -and $gitEnabled) {
    Write-Host 'Publishing Git changes...'
    $git = Get-Command git -ErrorAction Stop
    $remote = 'origin'
    $branch = 'main'
    if ($config.PSObject.Properties.Name -contains 'git') {
      if ($config.git.PSObject.Properties.Name -contains 'remote' -and $config.git.remote) { $remote = $config.git.remote }
      if ($config.git.PSObject.Properties.Name -contains 'branch' -and $config.git.branch) { $branch = $config.git.branch }
    }

    $currentBranch = (& $git.Source -C $RepoRoot branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0) { throw "git branch check failed with exit code $LASTEXITCODE" }
    if ($currentBranch -and $currentBranch -ne $branch) {
      throw "Current Git branch is '$currentBranch', expected '$branch'."
    }

    & $git.Source -C $RepoRoot add -- data/research-data.json sharepoint/daily-research.html config/sharepoint-publish.json
    if ($LASTEXITCODE -ne 0) { throw "git add failed with exit code $LASTEXITCODE" }

    $reportFiles = Get-ChildItem -LiteralPath $RepoRoot -File |
      Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}\.(html|md)$' } |
      ForEach-Object { $_.FullName }
    if ($reportFiles) {
      & $git.Source -C $RepoRoot add -- $reportFiles
      if ($LASTEXITCODE -ne 0) { throw "git add report files failed with exit code $LASTEXITCODE" }
    }

    & $git.Source -C $RepoRoot diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
      Write-Host 'No Git changes to commit.'
    } elseif ($LASTEXITCODE -eq 1) {
      $commitDate = Get-Date -Format 'yyyy-MM-dd'
      & $git.Source -C $RepoRoot commit -m "chore: update daily research $commitDate"
      if ($LASTEXITCODE -ne 0) { throw "git commit failed with exit code $LASTEXITCODE" }
      & $git.Source -C $RepoRoot push $remote $branch
      if ($LASTEXITCODE -ne 0) { throw "git push failed with exit code $LASTEXITCODE" }
      Write-Host "Pushed Git changes to $remote/$branch"
    } else {
      throw "git diff --cached failed with exit code $LASTEXITCODE"
    }
  } else {
    Write-Host 'Skipping Git publish step.'
  }

  Write-Host "Daily Research SharePoint publish completed at $(Get-Date -Format o)"
} finally {
  if (Test-Path -LiteralPath $lockPath) { Remove-Item -LiteralPath $lockPath -Force }
  Stop-Transcript | Out-Null
}
