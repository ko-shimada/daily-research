import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, 'index.html');
const cssPath = path.join(repoRoot, 'style.css');
const dataPath = path.join(repoRoot, 'data', 'research-data.json');
const outPath = path.join(repoRoot, 'sharepoint', 'daily-research.html');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function escapeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function replaceOnce(text, pattern, replacement, label) {
  const next = text.replace(pattern, replacement);
  if (next === text) {
    throw new Error('Pattern not found while building SharePoint HTML: ' + label);
  }
  return next;
}

const sharePointCss = `

/* SharePoint single-file adjustments */
.ed-archive-entry {
  display: grid;
  gap: 5px;
  min-height: 90px;
  padding: 13px;
  border: 1px solid var(--ed-line);
  background: #fff;
  color: var(--ed-ink);
}
.ed-archive-entry strong { font-family: "Noto Serif JP", serif; font-size: 18px; }
.ed-archive-entry span { color: var(--ed-muted); font-size: 12px; line-height: 1.55; }
`;

const css = read(cssPath) + sharePointCss;
const data = JSON.parse(read(dataPath));
let html = read(indexPath);

html = html.replace(/\s*<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/npm\/@tabler\/icons-webfont[^>]+>\s*/g, '\n');
html = html.replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]+>\s*/g, '\n');
html = replaceOnce(
  html,
  /<link rel="stylesheet" href="style\.css[^>]+>/,
  '<style>\n' + css + '\n</style>',
  'stylesheet link'
);
html = html.replace('<title>デイリーリサーチ</title>', '<title>デイリーリサーチ SharePoint版</title>');
html = html.replace(
  /<a href="https:\/\/github\.com\/ko-shimada\/daily-research" class="ed-github"[^>]*>[\s\S]*?<\/a>/,
  '<span class="ed-github">SharePoint版 / Daily SaaS Intelligence</span>'
);
html = html.replace(
  /<button id="clear-filter" type="button" aria-label="条件をクリア" title="条件をクリア"><i class="ti ti-filter-x"><\/i><\/button>/,
  '<button id="clear-filter" type="button" aria-label="条件をクリア" title="条件をクリア">Clear</button>'
);
html = replaceOnce(
  html,
  /^\s*fetch\('data\/research-data\.json[^\n]+\n/m,
  "  try { state.data = JSON.parse(document.getElementById('research-data').textContent); render(); } catch(e) { $('service-list').innerHTML='<p class=\"ed-empty\">\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f\u3002</p>'; }\n",
  'data fetch line'
);
html = replaceOnce(
  html,
  /<script>\s*\(function\(\)\{/,
  '<script type="application/json" id="research-data">' + escapeJsonForScript(data) + '</script>\n\n<script>\n(function(){',
  'main script insertion point'
);

html = html.replace(
  /\$\('stat-latest'\)\.innerHTML = latestReport \? '<a href="'\+latestReport\.href\+'">'\+fmt\(latestReport\.date\)\+'<\/a>' : '-';/,
  "$('stat-latest').textContent = latestReport ? fmt(latestReport.date) : '-';"
);
html = html.replace(
  /\$\('archive-list'\)\.innerHTML = data\.reports\.map\(function\(r\)\{ return '<a href="'\+r\.href\+'"><strong>'\+fmt\(r\.date\)\+'<\/strong><span>'\+r\.summary\+'<\/span><\/a>'; \}\)\.join\(''\);/,
  "$('archive-list').innerHTML = data.reports.map(function(r){ return '<div class=\"ed-archive-entry\"><strong>'+fmt(r.date)+'</strong><span>'+r.summary+'</span></div>'; }).join('');"
);
html = html.replace(
  /\$\('featured-update'\)\.innerHTML = '<div class="ed-kicker">Latest Signal<\/div><h2>'\+hotMark\(u\)\+u\.title\+'<\/h2><p>'\+u\.summary\+'<\/p><div class="ed-feature-meta"><span>'\+fmt\(u\.date\)\+'<\/span><span>'\+u\.kind\+'<\/span><a href="'\+u\.report\+'">レポートを読む<\/a><\/div>';/,
  "$('featured-update').innerHTML = '<div class=\"ed-kicker\">Latest Signal</div><h2>'+hotMark(u)+u.title+'</h2><p>'+u.summary+'</p><div class=\"ed-feature-meta\"><span>'+fmt(u.date)+'</span><span>'+u.kind+'</span><a target=\"_blank\" rel=\"noopener noreferrer\" href=\"'+u.source+'\">公式ソース</a></div>';"
);
html = html.replace(
  /function updateHtml\(u\)\{ return '<div class="ed-update"><div><span>'\+fmt\(u\.date\)\+'<\/span><b>'\+u\.kind\+'<\/b><\/div><h3>'\+hotMark\(u\)\+u\.title\+'<\/h3><p>'\+u\.summary\+'<\/p><a href="'\+u\.report\+'">該当レポート<\/a><a target="_blank" rel="noopener noreferrer" href="'\+u\.source\+'">公式ソース<\/a><\/div>'; \}/,
  "function updateHtml(u){ return '<div class=\"ed-update\"><div><span>'+fmt(u.date)+'</span><b>'+u.kind+'</b></div><h3>'+hotMark(u)+u.title+'</h3><p>'+u.summary+'</p><a target=\"_blank\" rel=\"noopener noreferrer\" href=\"'+u.source+'\">公式ソース</a></div>'; }"
);

if (html.includes("fetch('data/research-data.json")) {
  throw new Error('SharePoint HTML still contains external data fetch.');
}
if (html.includes('}).then(function(data)')) {
  throw new Error('SharePoint HTML still contains leftover fetch promise chain.');
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log('Built ' + path.relative(repoRoot, outPath) + ' (' + Buffer.byteLength(html, 'utf8') + ' bytes)');