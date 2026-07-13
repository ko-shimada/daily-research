# Daily SharePoint Publishing

This automation keeps using the self-contained `sharepoint/daily-research.html` file.

## Flow

1. Run Codex CLI in this repository to update the research data.
2. Build a self-contained SharePoint HTML file with embedded CSS, JavaScript, and JSON data.
3. Copy the file into a OneDrive-synced SharePoint document library path.
4. Commit and push generated research changes to GitHub.
5. Let OneDrive sync the file to SharePoint.
6. Run the flow daily through Windows Task Scheduler.


## Configured SharePoint Destination

The requested SharePoint targets are recorded in `config/sharepoint-publish.json`.

- Current file URL: `https://sbplayers.sharepoint.com/:u:/s/CS_AI/IQD6MBPD-t4WSKy7kYTrM_1cAWmR75l7-zHcdNOlSkJYyVI?e=tsEJ5z`
- Destination folder URL: `https://sbplayers.sharepoint.com/:f:/s/CS_AI/IgDXSMXy73TbT7WEckZoXV27ASeYveOHUVgkYIRu90ydltI?e=oDcC6K`

The automation still needs the corresponding local OneDrive sync path because the daily task copies files from Windows. If the folder is not visible under `C:\Users\ko-shimada\OneDrive - ＳＢプレイヤーズ株式会社`, open the folder URL in SharePoint and select **Sync** or **Add shortcut to OneDrive**, then use the synced local folder path as `targetPath`.

## Configure Target Path

Set the final SharePoint/OneDrive sync destination in one of these ways:

- Pass `-TargetPath` to `scripts/run-daily-sharepoint.ps1`.
- Set the environment variable `DAILY_RESEARCH_SHAREPOINT_PATH`.
- Run the task registration script, which writes `config/sharepoint-publish.json`.

The detected local sync target is already set in `config/sharepoint-publish.json`.

The target should be a local OneDrive sync path, for example:

```text
C:\Users\ko-shimada\OneDrive - <company>\<site/library folder>\Daily SaaS Intelligence\daily-research.html
```

## Manual Run

Build and verify without copying:

```powershell
.\scripts\run-daily-sharepoint.ps1 -SkipCodex -NoCopy -NoGit
```

Run the full flow with an explicit target:

```powershell
.\scripts\run-daily-sharepoint.ps1 -TargetPath "C:\Users\ko-shimada\OneDrive - <company>\<site/library folder>\Daily SaaS Intelligence\daily-research.html"
```

## Register Daily Task

```powershell
.\scripts\register-daily-sharepoint-task.ps1 -TargetPath "C:\Users\ko-shimada\OneDrive - <company>\<site/library folder>\Daily SaaS Intelligence\daily-research.html" -At 08:30
```

The task runs only when the user is logged on, which keeps OneDrive sync available.

Do not switch the task to "Run whether user is logged on or not". On this managed PC the account has no "Log on as a batch job" right, so the task fails to launch with event 101 `Launch Failure`, error `2147943785` (`0x80070569`, the requested logon type is not granted). Interactive logon is required; `StartWhenAvailable` makes a missed 09:20 run start at the next logon.

## Codex CLI Resolution

The Codex CLI is not on `PATH` in the Task Scheduler environment. `scripts/run-daily-sharepoint.ps1` resolves the binary in this order:

1. `codex.path` in `config/sharepoint-publish.json` (currently `C:\Users\ko-shimada\.codex\.sandbox-bin\codex.exe`)
2. `codex` on `PATH`
3. `%USERPROFILE%\.codex\.sandbox-bin\codex.exe`

If a Codex update moves the binary, update `codex.path`. A run that fails immediately with "`codex` is not recognized" in `logs/daily-sharepoint-*.log` means all three lookups failed.

## Claude Code Fallback

When Codex is missing or exits non-zero (spend cap, rate limit, transient errors), the script re-runs the same research prompt with the Claude Code CLI in headless mode, configured by the `claudeFallback` block in `config/sharepoint-publish.json`:

- `enabled`: set `false` to disable the fallback entirely.
- `model`: model alias passed to `--model` (default `sonnet`).
- `permissionMode`: `dontAsk` denies any tool not on the allowlist without prompting, so unattended runs never hang.
- `allowedTools`: comma-separated allowlist (`WebSearch,WebFetch,Read,Edit,Write,Glob,Grep,Bash(node:*)`).

The Claude binary is resolved in this order:

1. `claudeFallback.path` in the config (currently the VS Code extension bundle under `%USERPROFILE%\.vscode\extensions\anthropic.claude-code-*`)
2. `claude` on `PATH`
3. The newest `anthropic.claude-code-*` VS Code extension bundle (auto-discovered, so extension updates don't break the fallback even if `claudeFallback.path` goes stale)

The transcript logs which engine ran: look for `Running Codex daily research agent...` vs `falling back to Claude Code (...)`.

## Troubleshooting

- Task result `0x1`: open the newest `logs/daily-sharepoint-*.log`; the transcript records the first failing step.
- `You hit your spend cap set by the owner of your workspace`: the Codex workspace spend cap is exhausted; a workspace owner must raise it. Until then only the Codex research step fails — `-SkipCodex` still rebuilds and republishes existing data.
- Event 101 / error `2147943785` when starting the task: the task was switched to password logon; re-register it with `scripts/register-daily-sharepoint-task.ps1` (interactive logon).


## GitHub Publishing

By default, the daily task commits generated research changes and pushes them to `origin/main` after the SharePoint file copy has succeeded.

The GitHub push step tracks these generated files:

- `data/research-data.json`
- `sharepoint/daily-research.html`
- date reports such as `2026-07-10.md` and `2026-07-10.html`
- `config/sharepoint-publish.json`

Disable this step by setting `git.enabled` to `false` in `config/sharepoint-publish.json`, or use `-NoGit` for a manual run.

## Logs

Logs are written to `logs/daily-sharepoint-*.log` and are intentionally ignored by Git.
