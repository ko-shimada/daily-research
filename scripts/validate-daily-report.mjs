import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const reportDate = process.argv[2];

if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
  console.error('Usage: node scripts/validate-daily-report.mjs YYYY-MM-DD');
  process.exit(2);
}

const read = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const data = JSON.parse(read('data/research-data.json'));
const expectedRows = Array.isArray(data.services) ? data.services.length : 0;
const md = read(`${reportDate}.md`);
const html = read(`${reportDate}.html`);

const failures = [];

const forbiddenPatterns = [
  { label: 'Markdown English heading: Summary', pattern: /^## Summary\b/m, text: md },
  { label: 'Markdown English heading: Details', pattern: /^## Details\b/m, text: md },
  { label: 'Markdown English heading: Source Check', pattern: /^## Source Check\b/m, text: md },
  { label: 'Markdown English table header', pattern: /\|\s*Date\s*\|\s*Service\s*\|\s*Kind\s*\|\s*Summary\s*\|/i, text: md },
  { label: 'HTML English heading: Summary', pattern: /<h2[^>]*>\s*Summary\s*<\/h2>/i, text: html },
  { label: 'HTML English heading: Details', pattern: /<h2[^>]*>\s*Details\s*<\/h2>/i, text: html },
  { label: 'HTML English heading: Source Check', pattern: /<h2[^>]*>\s*Source Check\s*<\/h2>/i, text: html },
  { label: 'HTML English source link label', pattern: />\s*Official source\s*</i, text: html },
  { label: 'HTML English table headers', pattern: /<th>\s*Service\s*<\/th>|<th>\s*Status\s*<\/th>|<th>\s*Point\s*<\/th>/i, text: html },
];

for (const item of forbiddenPatterns) {
  if (item.pattern.test(item.text)) failures.push(item.label);
}

function markdownSection(text, heading) {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  if (start < 0) return '';
  const body = text.slice(start + marker.length);
  const next = body.search(/\n## /);
  return next >= 0 ? body.slice(0, next) : body;
}

function htmlSection(text, heading) {
  const marker = `<h2 class="sec-title">${heading}</h2>`;
  const start = text.indexOf(marker);
  if (start < 0) return '';
  const body = text.slice(start + marker.length);
  const nextFooter = body.indexOf('<footer');
  return nextFooter >= 0 ? body.slice(0, nextFooter) : body;
}

const mdSourceRows = markdownSection(md, '到達確認')
  .split(/\r?\n/)
  .filter((line) => /^\|/.test(line) && !/^\|\s*-+/.test(line) && !/\|\s*サービス\s*\|/.test(line))
  .length;

const htmlSourceRows = (htmlSection(html, '到達確認').match(/<tr>/g) ?? []).length;

if (expectedRows && mdSourceRows < expectedRows) {
  failures.push(`Markdown 到達確認 rows ${mdSourceRows} < services ${expectedRows}`);
}

if (expectedRows && htmlSourceRows < expectedRows) {
  failures.push(`HTML 到達確認 rows ${htmlSourceRows} < services ${expectedRows}`);
}

if (failures.length) {
  console.error(`Daily report validation failed for ${reportDate}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Daily report validation passed for ${reportDate}: source rows md=${mdSourceRows}, html=${htmlSourceRows}.`);
