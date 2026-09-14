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
  function normalizeHeader(value) {
    var header = String(value == null ? '' : value).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    var aliases = {
      kode: 'kode_menu', nama: 'nama_menu', kategori_menu: 'kategori', harga: 'harga_jual',
      code_menu: 'kode_menu', menu_code: 'kode_menu', menu_name: 'nama_menu', category: 'kategori',
      selling_price: 'harga_jual', bahan_code: 'kode_bahan', ingredient_code: 'kode_bahan',
      bahan_name: 'nama_bahan', ingredient_name: 'nama_bahan', quantity: 'qty', unit: 'satuan'
    };
    return aliases[header] || header;
  }
  function csvCell(value) { var text = String(value == null ? '' : value); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; }
  function downloadInvalidRows(rows) {
    if (!rows.length || typeof XLSX === 'undefined') return;
    window.__hppImportFailures = rows;
    var sheet = XLSX.utils.json_to_sheet(rows);
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Baris Gagal');
    XLSX.writeFile(workbook, 'baris-gagal-import-hpp.xlsx');
  }
  function menuCsv(sheet) {
    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).filter(function (row) { return row.some(function (cell) { return String(cell).trim(); }); });
    if (rows.length < 2) throw new Error('Sheet Resep Menu kosong.');
    var headers = rows.shift().map(normalizeHeader), index = function (name) { return headers.indexOf(name); };
    var required = ['kode_menu', 'nama_menu', 'kategori', 'harga_jual', 'kode_bahan', 'nama_bahan', 'qty', 'satuan'];
    required.forEach(function (name) { if (index(name) < 0) throw new Error('Kolom ' + name + ' tidak ditemukan di sheet Resep Menu.'); });
    var output = [required];
    var invalidRows = [];
    rows.forEach(function (row, rowIndex) {
      var values = required.map(function (name) { return row[index(name)]; });
      var missing = [];
      if (!values[0]) missing.push('kode_menu');
      if (!values[1]) missing.push('nama_menu');
      if (!values[2]) missing.push('kategori');
      if (!Number.isFinite(numberValue(values[3]))) missing.push('harga_jual');
      if (!values[4]) missing.push('kode_bahan');
      if (!values[5]) missing.push('nama_bahan');
      if (!Number.isFinite(numberValue(values[6]))) missing.push('qty');
      if (!values[7]) missing.push('satuan');
      if (missing.length) invalidRows.push({ baris_excel: rowIndex + 2, alasan: 'Kolom bermasalah: ' + missing.join(', '), kode_menu: values[0] || '', nama_menu: values[1] || '', kategori: values[2] || '', harga_jual: values[3] || '', kode_bahan: values[4] || '', nama_bahan: values[5] || '', qty: values[6] || '', satuan: values[7] || '' });
      values[3] = numberValue(values[3]); values[6] = numberValue(values[6]); output.push(values);
    });
    if (invalidRows.length) {
      downloadInvalidRows(invalidRows);
      throw new Error('Ditemukan ' + invalidRows.length + ' baris bermasalah. File baris-gagal-import-hpp.xlsx otomatis diunduh; periksa kolom alasan.');
    }
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
    if (event.target.id !== 'apply-import' || !window.__hppWorkbook || document.querySelector('#import-type').value !== 'menus') return;
    var sheetName = window.__hppWorkbook.SheetNames.find(function (name) { return /resep\s*menu/i.test(name); }) || window.__hppWorkbook.SheetNames[0];
    try {
      event.preventDefault(); event.stopImmediatePropagation();
      window.applyCodeImport('menus', menuCsv(window.__hppWorkbook.Sheets[sheetName]));
      saveImportedData(); renderStats(); renderResto(); renderKitchen(); renderDatabase(); closeImport(); window.__hppWorkbook = null;
    } catch (error) { importError.textContent = error.message; }
  }, true);
  document.addEventListener('click', function (event) {
    if (event.target.id !== 'apply-import' || !window.__hppWorkbook || document.querySelector('#import-type').value !== 'kitchenMaterials') return;
    try {
      event.preventDefault(); event.stopImmediatePropagation();
      var sheetName = window.__hppWorkbook.SheetNames.find(function (name) { return /bahan\s*baku\s*dapur/i.test(name); }) || window.__hppWorkbook.SheetNames[0];
      var rows = XLSX.utils.sheet_to_json(window.__hppWorkbook.Sheets[sheetName], { header: 1, defval: '' }).filter(function (row) { return row.some(function (cell) { return String(cell).trim(); }); });
      if (rows.length < 2) throw new Error('Sheet Bahan Baku Dapur kosong.');
      var headers = rows.shift().map(function (value) { return String(value).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s-]+/g, '_'); });
      var position = function (names) { return names.map(function (name) { return headers.indexOf(name); }).find(function (index) { return index >= 0; }); };
      var categoryIndex = position(['kategori', 'category']), nameIndex = position(['nama_bahan', 'nama', 'name']), priceIndex = position(['harga', 'harga_baru', 'harga_lama', 'price']), unitIndex = position(['satuan', 'unit']);
      if (nameIndex < 0 || priceIndex < 0) throw new Error('Kolom wajib tidak ditemukan. Gunakan nama_bahan dan harga.');
      var invalidRows = [], imported = [];
      rows.forEach(function (row, rowIndex) {
        var name = String(row[nameIndex] == null ? '' : row[nameIndex]).trim(), price = numberValue(row[priceIndex]);
        if (!name || !Number.isFinite(price)) {
          invalidRows.push({ baris_excel: rowIndex + 2, alasan: (!name ? 'nama_bahan kosong' : 'harga kosong atau bukan angka'), kategori: row[categoryIndex] || '', nama_bahan: name, harga: row[priceIndex] || '', satuan: row[unitIndex] || '' });
          return;
        }
        imported.push({ code: 'BB.DAPUR.' + String(rowIndex + 1).padStart(4, '0'), name: name, category: String(row[categoryIndex] || '').trim(), unit: String(row[unitIndex] || '').trim(), old: price, new: price });
      });
      if (invalidRows.length) {
        downloadInvalidRows(invalidRows);
        throw new Error('Ditemukan ' + invalidRows.length + ' baris bermasalah. File baris-gagal-import-hpp.xlsx otomatis diunduh.');
      }
      materials.splice(0, materials.length, ...imported); saveImportedData(); renderStats(); renderResto(); renderKitchen(); renderDatabase(); closeImport(); window.__hppWorkbook = null;
    } catch (error) { importError.textContent = error.message; }
  }, true);
})();
