# SharePoint package for Daily Research

This folder contains a SharePoint-ready single-file build of the Daily SaaS Intelligence page.

## File

- `daily-research.html`: self-contained HTML with embedded CSS, JavaScript, and research data.

## Notes

- The file does not depend on GitHub Pages, external JSON, or local CSS files.
- If the SharePoint tenant blocks direct HTML rendering in a document library, use a SharePoint page with an embed/file viewer option or publish through an approved SPFx/static-hosting path.
- The current SharePoint connector session exposes read/discovery tools only, so the final upload needs either a target SharePoint URL plus an available upload path, OneDrive sync, or a manual library upload.

## Automation

Daily publishing through Codex CLI, single-file rebuild, OneDrive sync copy, and Windows Task Scheduler is documented in AUTOMATION.md.
