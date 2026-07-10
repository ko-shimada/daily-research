param(
  [Parameter(Mandatory = $true)]
  [string]$TargetPath,
  [string]$At = '08:30',
  [string]$TaskName = 'Daily Research SharePoint Publish',
  [switch]$SkipCodex
)

$ErrorActionPreference = 'Stop'
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$configPath = Join-Path $repoRoot 'config\sharepoint-publish.json'
$config = if (Test-Path -LiteralPath $configPath) { Get-Content -Raw -Encoding utf8 -LiteralPath $configPath | ConvertFrom-Json } else { [pscustomobject]@{} }

if (-not ($config.PSObject.Properties.Name -contains 'targetPath')) { $config | Add-Member -NotePropertyName targetPath -NotePropertyValue '' }
$config.targetPath = $TargetPath
if (-not ($config.PSObject.Properties.Name -contains 'schedule')) { $config | Add-Member -NotePropertyName schedule -NotePropertyValue ([pscustomobject]@{}) }
$config.schedule.taskName = $TaskName
$config.schedule.time = $At
$config | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath $configPath

$runner = Join-Path $repoRoot 'scripts\run-daily-sharepoint.ps1'
$args = '-NoProfile -ExecutionPolicy Bypass -File "' + $runner + '"'
if ($SkipCodex) { $args += ' -SkipCodex' }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $args -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel LeastPrivilege
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Write-Host "Registered scheduled task: $TaskName"
Write-Host "Daily trigger: $At"
Write-Host "TargetPath: $TargetPath"