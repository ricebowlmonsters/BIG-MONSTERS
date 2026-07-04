const fs = require('fs');
const path = 'rbm-pengajuan.html';
const html = fs.readFileSync(path, 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const blocks = [];
let m;
while ((m = re.exec(html)) !== null) {
  const attrs = m[0];
  if (/\bsrc\s*=/.test(attrs)) continue;
  blocks.push(m[1]);
}
const report = [];
for (let b = 0; b < blocks.length; b++) {
  const code = blocks[b];
  const stack = [];
  let state = 'code';
  let quote = '';
  let escape = false;
  let line = 1;
  let found = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (state === 'linecomment') {
      if (ch === '\n') { state = 'code'; line++; }
      continue;
    }
    if (state === 'blockcomment') {
      if (ch === '*' && code[i + 1] === '/') { state = 'code'; i++; }
      else if (ch === '\n') line++;
      continue;
    }
    if (state === 'string') {
      if (escape) { escape = false; }
      else if (ch === '\\') { escape = true; }
      else if (ch === quote) { state = 'code'; }
      else if (ch === '\n') line++;
      continue;
    }
    if (state === 'template') {
      if (escape) { escape = false; }
      else if (ch === '\\') { escape = true; }
      else if (ch === '`') { state = 'code'; }
      else if (ch === '\n') line++;
      continue;
    }
    if (ch === '/' && code[i + 1] === '/') { state = 'linecomment'; i++; continue; }
    if (ch === '/' && code[i + 1] === '*') { state = 'blockcomment'; i++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; state = 'string'; continue; }
    if (ch === '`') { quote = '`'; state = 'template'; continue; }
    if (ch === '{' || ch === '(' || ch === '[') {
      stack.push({ ch, line });
    } else if (ch === '}') {
      if (!stack.length || stack[stack.length - 1].ch !== '{') {
        report.push(`BLOCK ${b + 1}: extra closing } at line ${line}`);
        found = true;
        break;
      }
      stack.pop();
    } else if (ch === ')') {
      if (!stack.length || stack[stack.length - 1].ch !== '(') {
        report.push(`BLOCK ${b + 1}: extra closing ) at line ${line}`);
        found = true;
        break;
      }
      stack.pop();
    } else if (ch === ']') {
      if (!stack.length || stack[stack.length - 1].ch !== '[') {
        report.push(`BLOCK ${b + 1}: extra closing ] at line ${line}`);
        found = true;
        break;
      }
      stack.pop();
    }
    if (ch === '\n') line++;
  }
  if (!found) {
    if (state === 'linecomment' || state === 'blockcomment') {
      report.push(`BLOCK ${b + 1}: unterminated comment`);
    }
    if (stack.length) {
      report.push(`BLOCK ${b + 1}: remaining ${stack[stack.length - 1].ch} at line ${stack[stack.length - 1].line}`);
    } else {
      report.push(`BLOCK ${b + 1}: balanced`);
    }
  }
}
fs.writeFileSync('brace-report.txt', report.join('\n'));
