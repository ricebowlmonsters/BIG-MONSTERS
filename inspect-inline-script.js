const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('rbm-pengajuan.html', 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let m; let idx = 0;
while ((m = re.exec(html)) !== null) {
  const attrs = m[0];
  if (/\bsrc\s*=/.test(attrs)) continue;
  idx++;
  const code = m[1];
  try {
    new vm.Script(code);
    console.log('BLOCK', idx, 'OK');
  } catch (e) {
    console.log('BLOCK', idx, 'ERROR');
    console.log(e.message);
    const lines = code.split(/\r?\n/);
    const match = /:(\d+):/.exec(e.stack || '');
    const lineNo = match ? Number(match[1]) : 1;
    console.log('LINE', lineNo);
    for (let i = Math.max(0, lineNo - 8); i < Math.min(lines.length, lineNo + 8); i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
    break;
  }
}
