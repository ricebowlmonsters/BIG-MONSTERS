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
for (let i = 0; i < blocks.length; i++) {
  const code = blocks[i];
  try {
    new Function(code);
    report.push(`BLOCK ${i + 1}: OK`);
  } catch (e) {
    const lines = code.split(/\r?\n/);
    const match = /<anonymous>:(\d+)/.exec(e.stack || '');
    const lineNo = match ? Number(match[1]) : 1;
    report.push(`BLOCK ${i + 1}: ERROR`);
    report.push(e.message);
    report.push(`LINE ${lineNo}`);
    for (let x = Math.max(0, lineNo - 12); x < Math.min(lines.length, lineNo + 12); x++) {
      report.push(`${x + 1}: ${lines[x]}`);
    }
    break;
  }
}
fs.writeFileSync('syntax-error-report.txt', report.join('\n'));
