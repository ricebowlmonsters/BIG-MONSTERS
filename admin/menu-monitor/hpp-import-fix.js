(function () {
  'use strict';
  function numberValue(value) {
    if (typeof value === 'number') return value;
    var text = String(value == null ? '' : value).trim().replace(/^rp\.?\s*/i, '').replace(/\s/g, '');
    if (!text) return NaN;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
    else text = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
    return Number(text);
  }
  function normalizeHeader(value) { return String(value == null ? '' : value).replace(/^\uFEFF/, '').trim().toLowerCase(); }
  function csvCell(value) { var text = String(value == null ? '' : value); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; }
  function menuCsv(sheet) {
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).filter(function (row) { return row.some(function (cell) { return String(cell).trim(); }); });
    if (rows.length < 2) throw new Error('Sheet Resep Menu kosong.');
    var headers = rows.shift().map(normalizeHeader), index = function (name) { return headers.indexOf(name); };
    var required = ['kode_menu', 'nama_menu', 'kategori', 'harga_jual', 'kode_bahan', 'nama_bahan', 'qty', 'satuan'];
    required.forEach(function (name) { if (index(name) < 0) throw new Error('Kolom ' + name + ' tidak ditemukan di sheet Resep Menu.'); });
    var output = [required];
    rows.forEach(function (row) {
      var values = required.map(function (name) { return row[index(name)]; });
      if (!values[0] || !values[1] || !values[2] || !values[4] || !values[5] || !Number.isFinite(numberValue(values[3])) || !Number.isFinite(numberValue(values[6])) || !values[7]) throw new Error('Resep menu wajib memiliki kode menu, nama menu, kategori, harga jual, kode bahan, nama bahan, qty, dan satuan.');
      values[3] = numberValue(values[3]); values[6] = numberValue(values[6]); output.push(values);
    });
    return output.map(function (row) { return row.map(csvCell).join(','); }).join('\n');
  }
  document.addEventListener('change', function (event) {
    if (event.target.id !== 'csv-file') return;
    var file = event.target.files && event.target.files[0];
    if (!file || !/\.xlsx?$/i.test(file.name)) return;
    var reader = new FileReader();
    reader.onload = function () { window.__hppWorkbook = XLSX.read(reader.result, { type: 'array' }); };
    reader.readAsArrayBuffer(file);
  }, true);
  document.addEventListener('click', function (event) {
    if (event.target.id !== 'apply-import' || !window.__hppWorkbook || !window.importType || importType.value !== 'menus') return;
    var sheetName = window.__hppWorkbook.SheetNames.find(function (name) { return /resep\s*menu/i.test(name); }) || window.__hppWorkbook.SheetNames[0];
    try {
      event.preventDefault(); event.stopImmediatePropagation();
      window.applyCodeImport('menus', menuCsv(window.__hppWorkbook.Sheets[sheetName]));
      saveImportedData(); renderStats(); renderResto(); renderKitchen(); renderDatabase(); closeImport(); window.__hppWorkbook = null;
    } catch (error) { importError.textContent = error.message; }
  }, true);
})();
