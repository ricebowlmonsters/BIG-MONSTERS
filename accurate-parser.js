(function (global) {
  'use strict';
  var OUTLET_NAMES = ['Central Kitchen', 'Rice Bowl Monsters - Ponti', 'Rice Bowl Monsters - Trosobo', 'Rice Bowl Monsters - Royal Plaza', 'Rice Bowl Monsters - Darmokali'];
  var LABELS = {
    omset: ['jumlah pendapatan'], hpp: ['jumlah beban pokok penjualan'], labaKotor: ['laba kotor'], biayaGaji: ['beban gaji & upah'], biayaListrik: ['beban listrik'], totalOpex: ['jumlah beban operasional'], nonOpex: ['jumlah beban non operasional'], labaBersih: ['laba bersih']
  };
  function text(value) { return String(value == null ? '' : value).trim(); }
  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    var clean = text(value).replace(/Rp/gi, '').replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '').replace(/,/g, '.');
    var parsed = Number(clean.replace(/[^0-9eE+\-.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function findSheet(workbook) {
    var name = workbook.SheetNames.find(function (sheetName) { return /laba\s*(atau|\/)\s*rugi/i.test(sheetName); });
    return name || workbook.SheetNames[0];
  }
  function findRow(rows, label) {
    var wanted = label.toLowerCase();
    return rows.findIndex(function (row) { return row.some(function (cell) { return text(cell).toLowerCase().replace(/\s+/g, ' ').indexOf(wanted) >= 0; }); });
  }
  function toIsoDate(raw) {
    var months = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agustus: 8, sep: 9, september: 9, okt: 10, oktober: 10, nov: 11, november: 11, des: 12, desember: 12 };
    var match = text(raw).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (!match || !months[match[2].toLowerCase()]) return '';
    return match[3] + '-' + String(months[match[2].toLowerCase()]).padStart(2, '0') + '-' + String(match[1]).padStart(2, '0');
  }
  function extractPeriod(rows) {
    var source = text((rows[2] || []).join(' '));
    var match = source.match(/(?:Dari\s+)?(.+?)\s+s\/d\s+(.+)/i);
    return { label: source, start: match ? toIsoDate(match[1]) : '', end: match ? toIsoDate(match[2]) : '' };
  }
  function detectBranchColumns(rows) {
    var headerIndex = rows.findIndex(function (row) { return row.some(function (cell) { return /deskripsi/i.test(text(cell)); }); });
    var header = rows[headerIndex >= 0 ? headerIndex : 4] || [];
    return header.map(function (cell, index) { var name = text(cell); return OUTLET_NAMES.some(function (outlet) { return name.toLowerCase().indexOf(outlet.toLowerCase()) >= 0; }) ? { index: index, name: name } : null; }).filter(Boolean);
  }
  function parseSheet(rows, fileName, sheetName) {
    var period = extractPeriod(rows), columns = detectBranchColumns(rows);
    if (!columns.length) throw new Error('Kolom cabang tidak ditemukan pada baris header laporan.');
    var result = columns.map(function (branch) { var record = { id: 'accurate-' + branch.index + '-' + branch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), branchName: branch.name, periodLabel: period.label, periodStart: period.start, periodEnd: period.end, omset: 0, hpp: 0, labaKotor: 0, biayaGaji: 0, biayaListrik: 0, biayaOpsLain: 0, totalOpex: 0, nonOpex: 0, labaBersih: 0, uploadedAt: new Date().toISOString(), sourceFile: fileName, sourceSheet: sheetName }; Object.keys(LABELS).forEach(function (key) { var rowIndex = findRow(rows, LABELS[key][0]); if (rowIndex >= 0) record[key] = parseNumber(rows[rowIndex][branch.index]); }); record.biayaOpsLain = record.totalOpex - record.biayaGaji - record.biayaListrik; record.warning = record.omset < 0 || record.hpp < 0 || record.totalOpex < 0 || record.labaBersih < 0 ? 'Ada nilai minus' : ''; return record; });
    return { period: period, sheetName: sheetName, fileName: fileName, records: result };
  }
  async function parseFile(file) {
    if (!file || !/\.(xlsx|xls)$/i.test(file.name)) throw new Error('File harus berekstensi .xlsx atau .xls.');
    if (typeof XLSX === 'undefined') throw new Error('Library SheetJS belum tersedia.');
    var workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    var sheetName = findSheet(workbook), rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    return parseSheet(rows, file.name, sheetName);
  }
  global.AccurateParser = { parseFile: parseFile, parseSheet: parseSheet, parseNumber: parseNumber };
}(window));