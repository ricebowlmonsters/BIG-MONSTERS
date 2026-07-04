const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('rbm-pengajuan.html', 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const blocks = [];
let m;
while ((m = re.exec(html)) !== null) {
  const attrs = m[0];
  if (/\bsrc\s*=/.test(attrs)) continue;
  blocks.push(m[1]);
}
const code = blocks[blocks.length - 1];
try {
  new vm.Script(code);
  console.log('LAST INLINE SCRIPT OK');
} catch (e) {
  console.log('LAST INLINE SCRIPT ERROR');
  console.log(e.message);
  const lines = code.split(/\r?\n/);
  const match = /:(\d+):/.exec(e.stack || '');
  const lineNo = match ? Number(match[1]) : 1;
  console.log('LINE', lineNo);
  for (let i = Math.max(0, lineNo - 12); i < Math.min(lines.length, lineNo + 12); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
