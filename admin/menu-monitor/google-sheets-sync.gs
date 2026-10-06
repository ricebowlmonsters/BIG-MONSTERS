var HPP_KITCHEN_SPREADSHEET_ID = '1EL2qiwT5INX_ncuKEA1SoGfdZJawk_Vwxz2v-DPk2wY';
var HPP_SHEETS_SYNC_VERSION = 'hpp-five-tabs-2026-10-06-5';
var HPP_SHEET_TABS = {
  kitchenMaterials: 'Bahan Baku Dapur',
  restoMaterials: 'Bahan Baku Resto',
  restoRecipes: 'Resep Resto',
  kitchenRecipes: 'Resep Dapur',
  packaging: 'Kemasan'
};
var HPP_SHEET_REQUIRED_HEADERS = {
  kitchenMaterials: ['kode_bahan', 'nama_bahan', 'kategori', 'satuan', 'harga', 'harga_standar'],
  restoMaterials: ['kode_bahan', 'nama_bahan', 'kategori', 'satuan', 'harga'],
  restoRecipes: ['kode_menu', 'nama_menu', 'kategori', 'harga_jual', 'kode_bahan', 'nama_bahan', 'qty', 'satuan'],
  kitchenRecipes: ['nama_produk', 'qty_barang_jadi', 'satuan_barang', 'harga_jual_satuan', 'nama_bahan_baku', 'qty_bahan', 'satuan_bahan'],
  packaging: ['nama', 'kode', 'qty', 'satuan']
};

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'getVersion') {
      return jsonpHppResponse_({ status: 'success', version: HPP_SHEETS_SYNC_VERSION }, e.parameter.callback);
    }
    if (!e || !e.parameter || (e.parameter.action !== 'getHppData' && e.parameter.action !== 'getKitchenMaterials')) {
      return jsonpHppResponse_({ status: 'error', message: 'Aksi tidak dikenal.' }, e && e.parameter && e.parameter.callback);
    }
    var spreadsheetId = String(e.parameter.spreadsheetId || HPP_KITCHEN_SPREADSHEET_ID).trim();
    if (!/^[A-Za-z0-9_-]{20,}$/.test(spreadsheetId)) throw new Error('ID spreadsheet tidak valid.');
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    if (e.parameter.action === 'getKitchenMaterials') {
      return jsonpHppResponse_({
        status: 'success',
        version: HPP_SHEETS_SYNC_VERSION,
        initialized: true,
        materials: readHppSheet_(spreadsheet, 'kitchenMaterials')
      }, e.parameter.callback);
    }
    var data = readAllHppSheets_(spreadsheet);
    var priceSync = syncKitchenSellingPrices_(spreadsheet, data);
    data.kitchenRecipes = priceSync.kitchenRecipes;
    return jsonpHppResponse_({
      status: 'success',
      version: HPP_SHEETS_SYNC_VERSION,
      data: data,
      priceSync: priceSync.summary
    }, e.parameter.callback);
  } catch (error) {
    return jsonpHppResponse_({ status: 'error', message: error.message }, e && e.parameter && e.parameter.callback);
  }
}

function doPost() {
  return HtmlService.createHtmlOutput('Perubahan data dilakukan langsung di spreadsheet. Saat aplikasi membaca data, Apps Script memperbarui kolom harga jual Resep Dapur yang dapat dihitung dari HPP.')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function readAllHppSheets_(spreadsheet) {
  var result = {};
  Object.keys(HPP_SHEET_TABS).forEach(function (key) {
    var tabName = HPP_SHEET_TABS[key];
    try {
      result[key] = readHppSheet_(spreadsheet, key);
    } catch (error) {
      throw new Error('Gagal membaca tab "' + tabName + '": ' + error.message);
    }
  });
  return result;
}

function syncKitchenSellingPrices_(spreadsheet, data) {
  var sheet = spreadsheet.getSheetByName(HPP_SHEET_TABS.kitchenRecipes);
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0].map(function (value) { return normalizeHppHeader_(value); });
  var priceColumn = headers.indexOf('harga_jual_satuan');
  var productColumn = headers.indexOf('nama_produk');
  if (priceColumn < 0 || productColumn < 0) {
    throw new Error('Kolom nama_produk atau harga_jual_satuan tidak ditemukan di tab Resep Dapur.');
  }

  var calculation = calculateKitchenSellingPrices_(data);
  var prices = calculation.prices;
  var pendingWrites = [];
  var unchangedRows = 0;
  var skippedRows = 0;
  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    var product = String(values[rowIndex][productColumn] || '').trim().toLowerCase();
    if (!product) continue;
    if (!Object.prototype.hasOwnProperty.call(prices, product)) {
      skippedRows += 1;
      continue;
    }
    var current = hppNumber_(values[rowIndex][priceColumn]);
    if (current === prices[product]) {
      unchangedRows += 1;
      continue;
    }
    pendingWrites.push({ row: rowIndex + 1, value: prices[product], product: product });
  }
  if (pendingWrites.length) {
    var blockStart = pendingWrites[0].row;
    var block = [[pendingWrites[0].value]];
    for (var writeIndex = 1; writeIndex < pendingWrites.length; writeIndex += 1) {
      var write = pendingWrites[writeIndex];
      if (write.row === blockStart + block.length) {
        block.push([write.value]);
        continue;
      }
      sheet.getRange(blockStart, priceColumn + 1, block.length, 1).setValues(block);
      blockStart = write.row;
      block = [[write.value]];
    }
    sheet.getRange(blockStart, priceColumn + 1, block.length, 1).setValues(block);
    SpreadsheetApp.flush();
    data.kitchenRecipes = readHppSheet_(spreadsheet, 'kitchenRecipes');
    var writtenPrices = {};
    data.kitchenRecipes.forEach(function (row) {
      var product = String(row.nama_produk || '').trim().toLowerCase();
      if (product) writtenPrices[product] = hppNumber_(row.harga_jual_satuan);
    });
    pendingWrites.forEach(function (write) {
      if (writtenPrices[write.product] !== write.value) {
        throw new Error('Harga kolom D untuk "' + write.product + '" tidak cocok setelah ditulis. Periksa proteksi tab atau kolom D.');
      }
    });
  }
  return {
    kitchenRecipes: data.kitchenRecipes,
    summary: {
      calculatedProducts: Object.keys(prices).length,
      updatedRows: pendingWrites.length,
      unchangedRows: unchangedRows,
      skippedRows: skippedRows,
      unpricedIngredientRows: calculation.unpricedIngredientRows
    }
  };
}

function calculateKitchenSellingPrices_(data) {
  var materials = {};
  data.kitchenMaterials.forEach(function (row) {
    var name = String(row.nama_bahan || '').trim().toLowerCase();
    if (!name) return;
    materials[name] = {
      price: hppNumber_(row.harga_standar),
      unit: row.satuan_2 || row.satuan || 'gr'
    };
  });

  var groups = {};
  var unpricedIngredientRows = 0;
  data.kitchenRecipes.forEach(function (row) {
    var name = String(row.nama_produk || '').trim().toLowerCase();
    if (!name) return;
    if (!groups[name]) {
      groups[name] = {
        yield: hppNumber_(row.qty_barang_jadi),
        yieldUnit: row.satuan_barang || 'gr',
        saleUnit: row.satuan_harga_jual || row.satuan_barang || 'gr',
        cost: 0
      };
    }
    var ingredientName = String(row.nama_bahan_baku || '').trim().toLowerCase();
    if (!ingredientName && !row.qty_bahan) return;
    var material = materials[ingredientName];
    var quantity = hppNumber_(row.qty_bahan);
    if (!ingredientName || !material) {
      if (quantity) unpricedIngredientRows += 1;
      return;
    }
    if (!quantity) return;
    groups[name].cost += quantity * material.price *
      hppUnitFactor_(row.satuan_bahan || material.unit) /
      hppUnitFactor_(material.unit);
  });

  var prices = {};
  Object.keys(groups).forEach(function (name) {
    var group = groups[name];
    if (!group.yield) return;
    var saleQuantity = group.yield * hppUnitFactor_(group.yieldUnit) / hppUnitFactor_(group.saleUnit);
    if (!saleQuantity) return;
    prices[name] = Math.ceil((group.cost / saleQuantity) / 1000) * 1000;
  });
  return {
    prices: prices,
    unpricedIngredientRows: unpricedIngredientRows
  };
}

function hppNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  var text = String(value == null ? '' : value).trim()
    .replace(/^rp\.?\s*/i, '')
    .replace(/\s/g, '');
  if (!text) return 0;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
  else text = text.replace(/[^0-9.,-]/g, '').replace(',', '.');
  var number = Number(text);
  return isFinite(number) ? number : 0;
}

function hppUnitFactor_(unit) {
  var normalized = String(unit || 'gr').trim().toLowerCase().replace(/[.\s]+/g, '');
  var factors = {
    g: 1, gr: 1, gram: 1, grams: 1,
    kg: 1000, kilogram: 1000,
    ml: 1, milliliter: 1,
    l: 1000, liter: 1000, ltr: 1000,
    pcs: 1, pc: 1, buah: 1, btl: 1, botol: 1, pack: 1, porsi: 1
  };
  return factors[normalized] || 1;
}

function readHppSheet_(spreadsheet, key) {
  var tabName = HPP_SHEET_TABS[key];
  var sheet = spreadsheet.getSheetByName(tabName);
  if (!sheet) throw new Error('Tab "' + tabName + '" tidak ditemukan di spreadsheet.');
  if (!sheet.getLastRow()) throw new Error('Tab "' + tabName + '" belum memiliki header.');
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function (value) { return normalizeHppHeader_(value); });
  var required = HPP_SHEET_REQUIRED_HEADERS[key];
  var missing = required.filter(function (header) { return headers.indexOf(header) === -1; });
  if (missing.length) {
    throw new Error('Header tab "' + tabName + '" belum lengkap. Kolom yang diperlukan: ' + missing.join(', '));
  }
  if (sheet.getLastRow() < 2) return [];

  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues();
  return values.filter(function (row) {
    return row.some(function (value) { return value !== '' && value !== null; });
  }).map(function (row) {
    var record = {};
      headers.forEach(function (header, index) {
        if (!header) return;
        var uniqueHeader = header;
        var suffix = 2;
        while (Object.prototype.hasOwnProperty.call(record, uniqueHeader)) {
          uniqueHeader = header + '_' + suffix;
          suffix += 1;
        }
        record[uniqueHeader] = row[index];
    });
    if (key === 'kitchenMaterials') {
      record.tampil_di_po = row[8] === true || String(row[8]).trim().toLowerCase() === 'true';
    }
    return record;
  });
}

function normalizeHppHeader_(value) {
  var header = String(value || '').trim().toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^\w]/g, '');
  var aliases = {
    satuan_barang_jadi: 'satuan_barang',
    satuan_hasil: 'satuan_barang',
    satuan_yield: 'satuan_barang',
    nama_product: 'nama_produk',
    jenis_kemasan: 'jenis',
    kategori_kemasan: 'jenis',
    tipe: 'jenis'
  };
  return aliases[header] || header;
}

function jsonpHppResponse_(data, callback) {
  var safeCallback = /^[A-Za-z_$][\w.$]*$/.test(String(callback || '')) ? callback : '';
  var body = JSON.stringify(data).replace(/</g, '\\u003c');
  var output = safeCallback ? safeCallback + '(' + body + ');' : 'throw new Error(' + JSON.stringify(data.message || 'Permintaan ditolak.') + ');';
  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
