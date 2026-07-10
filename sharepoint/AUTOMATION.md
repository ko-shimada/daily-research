# Daily SharePoint Publishing

This automation keeps using the self-contained `sharepoint/daily-research.html` file.

## Flow

1. Run Codex CLI in this repository to update the research data.
2. Build a self-contained SharePoint HTML file with embedded CSS, JavaScript, and JSON data.
3. Copy the file into a OneDrive-synced SharePoint document library path.
4. Let OneDrive sync the file to SharePoint.
5. Run the flow daily through Windows Task Scheduler.

## Configure Target Path

Set the final SharePoint/OneDrive sync destination in one of these ways:

- Pass `-TargetPath` to `scripts/run-daily-sharepoint.ps1`.
- Set the environment variable `DAILY_RESEARCH_SHAREPOINT_PATH`.
- Run the task registration script, which writes `config/sharepoint-publish.json`.

The target should be a local OneDrive sync path, for example:

```text
C:\Users\ko-shimada\OneDrive - <company>\<site/library folder>\Daily SaaS Intelligence\daily-research.html
```

## Manual Run

Build and verify without copying:

```powershell
.\scripts\run-daily-sharepoint.ps1 -SkipCodex -NoCopy
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

## Logs

Logs are written to `logs/daily-sharepoint-*.log` and are intentionally ignored by Git.