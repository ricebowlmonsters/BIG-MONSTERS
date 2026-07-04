const fs = require('fs');
const path = 'rbm-pengajuan.html';
const html = fs.readFileSync(path, 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let matches = [];
let m;
while ((m = re.exec(html)) !== null) {
  const attrs = m[0];
  if (/\bsrc\s*=/.test(attrs)) continue;
  matches.push(m[1]);
}
for (let i = 0; i < matches.length; i++) {
  const code = matches[i];
  try {
    new Function(code);
    console.log('SCRIPT', i + 1, 'OK');
  } catch (e) {
    console.log('SCRIPT', i + 1, 'ERROR');
    console.log(e.message);
    const lines = code.split(/\r?\n/);
    const mm = (e.stack || '').match(/<anonymous>:(\d+)/);
    const lineNo = mm ? Number(mm[1]) : 1;
    console.log('line', lineNo);
    const start = Math.max(0, lineNo - 15);
    const end = Math.min(lines.length, lineNo + 15);
    console.log(lines.slice(start, end).join('\n'));
    break;
  }
}
