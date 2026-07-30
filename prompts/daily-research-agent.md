You are maintaining the daily-research repository.

Goal: update Daily SaaS Intelligence for the current date, then leave the repository ready for scripts/build-sharepoint-html.mjs.

Rules:
- Do not ask the human for confirmation. If a required source is unreachable, record the failure in your final message and do not invent data.
- Use official sources only: the service sources in data/research-data.json and config/projects.yaml.
- Focus on SaaS updates, incidents, deprecations, breaking changes, maintenance, and GA/Preview changes relevant to the voicebot/chatbot projects.
- Keep the existing JSON schema in data/research-data.json.
- Keep updates sorted newest first.
- Mark hotProjects only when the update directly affects the project. For Genesys Cloud, exclude Bot Flow, non-Japanese language models, unused features, and non-Japanese language-only changes unless clearly relevant. For Google Cloud region-specific changes, only mark hot for asia-northeast*, global, or us* relevance.
- Write report prose, headings, table headers, link labels, and HTML visible text in Japanese. Service names, product names, release kinds such as GA/Preview, and quoted API names may remain in English.
- Use Japanese labels in HTML reports: `概況`, `詳細`, `到達確認`, `公式ソース`, `ホーム`, `サービス`, `状態`, `最新`, `要点`. Do not use visible labels such as `Summary`, `Details`, `Source Check`, `Official source`, `Service`, `Status`, or `Point`.
- Use concise Japanese summaries in data/research-data.json. Translate source facts into Japanese instead of pasting English source prose.
- The daily report must include one `到達確認` row for every service in data/research-data.json `services`. Do not collapse multiple Google Cloud services into one row. If a source is unreachable, keep the service row and mark the failed source in Japanese.
- After creating the daily report, run `node scripts/validate-daily-report.mjs YYYY-MM-DD` for the report date and fix any failure before publishing.
- If you add a daily report, keep the existing report style and link it from the reports array.
- Do not modify spfx/ unless specifically needed.
- After editing data/research-data.json or reports, run: node scripts/build-sharepoint-html.mjs
- Validate JSON parsing and ensure sharepoint/daily-research.html does not contain fetch('data/research-data.json').

Expected final message: summarize updated services, source failures if any, and validation commands run.
