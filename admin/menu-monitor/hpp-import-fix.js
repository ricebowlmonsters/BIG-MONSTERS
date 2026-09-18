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
    if (headers.indexOf('nama_produk') >= 0 || headers.indexOf('batch_yield') >= 0) {
      downloadInvalidRows([{ baris_excel: 1, alasan: 'File berisi Resep Dapur, bukan Resep Resto', kolom_terdeteksi: headers.join(', '), tindakan: 'Pilih jenis import Resep dapur' }]);
      throw new Error('File gagal diimport. Koreksi gagal diunduh sebagai baris-gagal-import-hpp.xlsx. File ini berisi Resep Dapur; pilih jenis import "Resep dapur".');
    }
    var required = ['kode_menu', 'nama_menu', 'kategori', 'harga_jual', 'kode_bahan', 'nama_bahan', 'qty', 'satuan'];
    var missingColumns = required.filter(function (name) { return index(name) < 0; });
    if (missingColumns.length) {
      downloadInvalidRows([{ baris_excel: 1, alasan: 'Kolom wajib tidak ditemukan', kolom_kurang: missingColumns.join(', '), kolom_terdeteksi: headers.join(', '), tindakan: 'Perbaiki header lalu import ulang' }]);
      throw new Error('File gagal diimport. Koreksi gagal diunduh sebagai baris-gagal-import-hpp.xlsx. Kolom kurang: ' + missingColumns.join(', ') + '.');
    }
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
    if (event.target.id !== 'apply-import' || !window.__hppWorkbook || document.querySelector('#import-type').value !== 'kitchen') return;
    try {
      event.preventDefault(); event.stopImmediatePropagation();
      var sheetName = window.__hppWorkbook.SheetNames.find(function (name) { return /resep\s*(menu\s*)?dapur|resep\s*kitchen/i.test(name); });
      var rows = sheetName ? XLSX.utils.sheet_to_json(window.__hppWorkbook.Sheets[sheetName], { header: 1, defval: '' }).filter(function (row) { return row.some(function (cell) { return String(cell).trim(); }); }) : [];
      if (!rows.length || rows[0].map(function (value) { return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_'); }).indexOf('nama_produk') < 0) {
        window.__hppWorkbook.SheetNames.some(function (name) {
          var candidate = XLSX.utils.sheet_to_json(window.__hppWorkbook.Sheets[name], { header: 1, defval: '' }).filter(function (row) { return row.some(function (cell) { return String(cell).trim(); }); });
          var candidateHeaders = candidate.length ? candidate[0].map(function (value) { return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_'); }) : [];
          if (candidateHeaders.indexOf('nama_produk') >= 0 || candidateHeaders.indexOf('nama_product') >= 0) { rows = candidate; return true; }
          return false;
        });
      }
      var firstHeaders = rows.length ? rows[0].map(function (value) { return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_'); }) : [];
      if (firstHeaders.indexOf('nama_produk') < 0 && firstHeaders.indexOf('nama_product') < 0) {
        var textRows = parseCsv(document.querySelector('#csv-text').value);
        if (textRows.length > 1) rows = textRows;
      }
      if (rows.length < 2) throw new Error('Sheet Resep Dapur kosong.');
      var headers = rows.shift().map(function (value) { return String(value).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s-]+/g, '_'); });
      if (headers.indexOf('nama_produk') < 0 && headers.indexOf('nama_product') < 0 && headers.indexOf('nama_bahan') >= 0 && (headers.indexOf('harga') >= 0 || headers.indexOf('harga_baru') >= 0)) {
        throw new Error('File yang dipilih adalah Bahan Baku Dapur, bukan Resep Dapur. Pilih file Resep Dapur dengan kolom nama_produk, qty_barang_jadi, satuan_barang_jadi, harga_jual_satuan, satuan_harga_jual, nama_bahan_baku, qty_bahan, satuan_bahan.');
      }
      var valueAt = function (row, names) { var position = names.map(function (name) { return headers.indexOf(name); }).find(function (index) { return index >= 0; }); return position >= 0 ? String(row[position] == null ? '' : row[position]).trim() : ''; };
      var grouped = {};
      rows.forEach(function (row, rowIndex) {
        var product = valueAt(row, ['nama_produk', 'nama_product', 'nama produk']), batch = numberValue(valueAt(row, ['batch_yield', 'yield', 'qty_barang_jadi', 'qty barang jadi'])), yieldUnit = valueAt(row, ['satuan_yield', 'satuan_hasil', 'unit_yield', 'satuan_barang_jadi', 'satuan barang jadi']) || 'gr', saleUnit = valueAt(row, ['satuan_harga_jual', 'satuan harga jual', 'satuan_penjualan', 'satuan_jual', 'unit_penjualan', 'satuan_sales']) || yieldUnit, cost = numberValue(valueAt(row, ['hpp_per_gram', 'hpp', 'cost'])), transfer = numberValue(valueAt(row, ['harga_transfer', 'harga_transfer_baru', 'harga_jual_satuan', 'harga jual satuan'])), ingredientName = valueAt(row, ['nama_bahan', 'bahan', 'ingredient', 'nama_bahan_baku', 'nama bahan baku']), qty = numberValue(valueAt(row, ['qty', 'jumlah', 'quantity', 'qty_bahan', 'qty bahan'])), unit = valueAt(row, ['satuan_bahan', 'satuan bahan', 'unit_bahan', 'satuan', 'unit']) || 'gr';
        if (!Number.isFinite(qty) && row.length >= 9 && Number.isFinite(numberValue(row[4])) && Number.isFinite(numberValue(row[7]))) {
          cost = numberValue(row[3]); transfer = numberValue(row[4]); saleUnit = String(row[5] || yieldUnit).trim(); ingredientName = String(row[6] || '').trim(); qty = numberValue(row[7]); unit = String(row[8] || 'gr').trim();
        }
        if (!product || !Number.isFinite(batch) || !ingredientName || ingredientName.toLowerCase() === 'kg' || ingredientName.toLowerCase() === 'gram' || !Number.isFinite(qty) || !Number.isFinite(transfer)) throw new Error('Baris ' + (rowIndex + 2) + ' wajib memiliki nama produk, qty barang jadi, satuan barang jadi, harga jual satuan, nama bahan baku, qty, dan satuan bahan. Pastikan kolom tidak bergeser.');
        var kitchenMaterial = materials.find(function (item) { return /^BB\.DAPUR\./i.test(String(item.code || '')) && String(item.name).trim().toLowerCase() === ingredientName.toLowerCase(); });
        var item = grouped[product] || (grouped[product] = { name: product.toUpperCase(), yield: batch, yieldUnit: yieldUnit, saleUnit: saleUnit, cost: Number.isFinite(cost) ? cost : 0, oldTransfer: transfer, newTransfer: transfer, items: [] });
        item.items.push([kitchenMaterial ? kitchenMaterial.code : '', ingredientName, qty, unit]);
      });
      var importedNames = Object.keys(grouped).map(function (name) { return name.toUpperCase(); });
      kitchen.splice(0, kitchen.length, ...kitchen.filter(function (entry) { return importedNames.indexOf(String(entry.name).toUpperCase()) < 0; }));
      Object.values(grouped).forEach(function (item) { kitchen.push(item); });
      saveImportedData(); renderStats(); renderResto(); renderKitchen(); renderDatabase(); closeImport(); window.__hppWorkbook = null;
    } catch (error) { importError.textContent = error.message; }
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
      var restoMaterials = materials.filter(function (item) { return !/^BB\.DAPUR\./i.test(String(item.code || '')); });
      materials.splice(0, materials.length, ...restoMaterials, ...imported); saveImportedData(); renderStats(); renderResto(); renderKitchen(); renderDatabase(); closeImport(); window.__hppWorkbook = null;
    } catch (error) { importError.textContent = error.message; }
  }, true);
})();
