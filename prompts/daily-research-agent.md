You are maintaining the daily-research repository.

Goal: update Daily SaaS Intelligence for the current date, then leave the repository ready for scripts/build-sharepoint-html.mjs.

Rules:
- Do not ask the human for confirmation. If a required source is unreachable, record the failure in your final message and do not invent data.
- Use official sources only: the service sources in data/research-data.json and config/projects.yaml.
- Focus on SaaS updates, incidents, deprecations, breaking changes, maintenance, and GA/Preview changes relevant to the voicebot/chatbot projects.
- Keep the existing JSON schema in data/research-data.json.
- Keep updates sorted newest first.
- Mark hotProjects only when the update directly affects the project. For Genesys Cloud, exclude Bot Flow, non-Japanese language models, unused features, and non-Japanese language-only changes unless clearly relevant. For Google Cloud region-specific changes, only mark hot for asia-northeast*, global, or us* relevance.
- Prefer concise Japanese summaries in data/research-data.json.
- If you add a daily report, keep the existing report style and link it from the reports array.
- Do not modify spfx/ unless specifically needed.
- After editing data/research-data.json or reports, run: node scripts/build-sharepoint-html.mjs
- Validate JSON parsing and ensure sharepoint/daily-research.html does not contain fetch('data/research-data.json').

Expected final message: summarize updated services, source failures if any, and validation commands run.