function parseNumber(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return value;
  var s = String(value).trim();
  s = s.replace(/[^0-9,.-]/g, '');
  var commaCount = (s.match(/,/g) || []).length;
  var dotCount = (s.match(/\./g) || []).length;
  if (commaCount > 0 && dotCount > 0) {
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (commaCount > 0) {
    if (commaCount > 1) s = s.replace(/,/g, '');
    else s = s.replace(/,/g, '.');
  } else if (dotCount > 1) {
    s = s.replace(/\./g, '');
  }
  var num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function oldLogic(list) {
  var lastKreditTxIndex = -1;
  for (var i = list.length - 1; i >= 0; i--) {
    if ((list[i].kredit || list[i].masuk || 0) > 0) {
      lastKreditTxIndex = i;
      break;
    }
  }
  var saldoSebelumLastKredit = 0;
  if (lastKreditTxIndex > 0 && typeof list[lastKreditTxIndex - 1].saldo !== 'undefined') {
    saldoSebelumLastKredit = parseNumber(list[lastKreditTxIndex - 1].saldo);
  } else if (lastKreditTxIndex > 0) {
    let saldoBerjalan = 0;
    for (let i = 0; i < lastKreditTxIndex; i++) {
      const trx = list[i];
      saldoBerjalan = (saldoBerjalan * 100 - (trx.debit || 0) * 100 + (trx.kredit || 0) * 100) / 100;
    }
    saldoSebelumLastKredit = saldoBerjalan;
  }
  return saldoSebelumLastKredit;
}

var list = [
  { tanggal: '2026-06-30', kredit: 700874, saldo: 700874 },
  { tanggal: '2026-07-07', debit: 10000, saldo: 690877.5 },
  { tanggal: '2026-07-10', kredit: 1000000, saldo: 1690877.5 }
];

var result = oldLogic(list);
console.log('old result', result);
if (result !== 690874) {
  console.error('TEST FAILED');
  process.exit(1);
}
