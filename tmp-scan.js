const fs = require('fs');
const html = fs.readFileSync('rbm-pengajuan.html', 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const blocks = [];
let m; 
while ((m = re.exec(html)) !== null) {
  const attrs = m[0];
  if (/\bsrc\s*=/.test(attrs)) continue;
  blocks.push(m[1]);
}
const report = [];
for (let i = 0; i < blocks.length; i++) {
  const code = blocks[i];
  const stack = [];
  let state = 'code';
  let quote = '';
  let escape = false;
  let line = 1;
  for (let j = 0; j < code.length; j++) {
    const ch = code[j];
    if (state === 'linecomment') { if (ch === '\n') { state = 'code'; line++; } continue; }
    if (state === 'blockcomment') { if (ch === '*' && code[j + 1] === '/') { state = 'code'; j++; } else if (ch === '\n') line++; continue; }
    if (state === 'string') { if (escape) { escape = false; } else if (ch === '\\') { escape = true; } else if (ch === quote) { state = 'code'; } else if (ch === '\n') line++; continue; }
    if (state === 'template') { if (escape) { escape = false; } else if (ch === '\\') { escape = true; } else if (ch === '`') { state = 'code'; } else if (ch === '\n') line++; continue; }
    if (ch === '/' && code[j + 1] === '/') { state = 'linecomment'; j++; continue; }
    if (ch === '/' && code[j + 1] === '*') { state = 'blockcomment'; j++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; state = 'string'; continue; }
    if (ch === '`') { quote = '`'; state = 'template'; continue; }
    if (ch === '{' || ch === '(' || ch === '[') { stack.push({ ch, line }); }
    else if (ch === '}') { if (!stack.length || stack[stack.length - 1].ch !== '{') { report.push({ block: i + 1, issue: 'extra }', line }); fs.writeFileSync('tmp-scan-result.json', JSON.stringify(report, null, 2)); process.exit(0); } stack.pop(); }
    else if (ch === ')') { if (!stack.length || stack[stack.length - 1].ch !== '(') { report.push({ block: i + 1, issue: 'extra )', line }); fs.writeFileSync('tmp-scan-result.json', JSON.stringify(report, null, 2)); process.exit(0); } stack.pop(); }
    else if (ch === ']') { if (!stack.length || stack[stack.length - 1].ch !== '[') { report.push({ block: i + 1, issue: 'extra ]', line }); fs.writeFileSync('tmp-scan-result.json', JSON.stringify(report, null, 2)); process.exit(0); } stack.pop(); }
    if (ch === '\n') line++;
  }
  report.push({ block: i + 1, remaining: stack.length, top: stack[stack.length - 1] ? stack[stack.length - 1].ch : null });
}
fs.writeFileSync('tmp-scan-result.json', JSON.stringify(report, null, 2));
