const fs = require('fs');
const html = fs.readFileSync('rbm-pengajuan.html', 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let m; let idx = 0;
while ((m = re.exec(html)) !== null) {
  const attrs = m[0];
  if (/\bsrc\s*=/.test(attrs)) continue;
  idx++;
  const code = m[1];
  const stack = [];
  let state = 'code';
  let quote = '';
  let escape = false;
  let line = 1;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (state === 'linecomment') { if (ch === '\n') { state = 'code'; line++; } continue; }
    if (state === 'blockcomment') { if (ch === '*' && code[i + 1] === '/') { state = 'code'; i++; } else if (ch === '\n') line++; continue; }
    if (state === 'string') { if (escape) { escape = false; } else if (ch === '\\') { escape = true; } else if (ch === quote) { state = 'code'; } else if (ch === '\n') line++; continue; }
    if (state === 'template') { if (escape) { escape = false; } else if (ch === '\\') { escape = true; } else if (ch === '`') { state = 'code'; } else if (ch === '\n') line++; continue; }
    if (ch === '/' && code[i + 1] === '/') { state = 'linecomment'; i++; continue; }
    if (ch === '/' && code[i + 1] === '*') { state = 'blockcomment'; i++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; state = 'string'; continue; }
    if (ch === '`') { quote = '`'; state = 'template'; continue; }
    if (ch === '{' || ch === '(' || ch === '[') {
      stack.push({ ch, line });
    } else if (ch === '}') {
      if (!stack.length || stack[stack.length - 1].ch !== '{') {
        console.log(JSON.stringify({ block: idx, issue: 'extra }', line }));
        process.exit(0);
      }
      stack.pop();
    } else if (ch === ')') {
      if (!stack.length || stack[stack.length - 1].ch !== '(') {
        console.log(JSON.stringify({ block: idx, issue: 'extra )', line }));
        process.exit(0);
      }
      stack.pop();
    } else if (ch === ']') {
      if (!stack.length || stack[stack.length - 1].ch !== '[') {
        console.log(JSON.stringify({ block: idx, issue: 'extra ]', line }));
        process.exit(0);
      }
      stack.pop();
    }
    if (ch === '\n') line++;
  }
  if (state === 'linecomment' || state === 'blockcomment') {
    console.log(JSON.stringify({ block: idx, issue: 'unterminated comment', line }));
    process.exit(0);
  }
  if (stack.length) {
    console.log(JSON.stringify({ block: idx, issue: 'remaining', top: stack[stack.length - 1].ch, line: stack[stack.length - 1].line }));
    process.exit(0);
  }
}
console.log('NO_MISMATCH');
