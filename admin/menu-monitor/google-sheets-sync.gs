var HPP_KITCHEN_SPREADSHEET_ID = '1EL2qiwT5INX_ncuKEA1SoGfdZJawk_Vwxz2v-DPk2wY';
var HPP_KITCHEN_SHEET_NAME = 'Pantau Harga & Data Web';
var HPP_KITCHEN_HEADERS = ['kode_bahan', 'nama_bahan', 'kategori', 'satuan', 'harga'];
var HPP_KITCHEN_INITIALIZED_KEY = 'hpp_kitchen_sheet_initialized_v1';

function doGet(e) {
  try {
    requireKitchenSheetUser_();
    if (!e || !e.parameter || e.parameter.action !== 'getKitchenMaterials') {
      return jsonpKitchenResponse_({ status: 'error', message: 'Aksi tidak dikenal.' }, e && e.parameter && e.parameter.callback);
    }
    var spreadsheetId = String(e.parameter.spreadsheetId || HPP_KITCHEN_SPREADSHEET_ID).trim();
    if (!/^[A-Za-z0-9_-]{20,}$/.test(spreadsheetId)) throw new Error('ID spreadsheet tidak valid.');
    var sheet = getKitchenSheet_(spreadsheetId);
    var materials = readKitchenMaterials_(sheet);
    var properties = PropertiesService.getScriptProperties();
    var initialized = properties.getProperty(HPP_KITCHEN_INITIALIZED_KEY) === 'true';
    if (!initialized && materials.length) {
      properties.setProperty(HPP_KITCHEN_INITIALIZED_KEY, 'true');
      initialized = true;
    }
    return jsonpKitchenResponse_({ status: 'success', initialized: initialized, materials: materials }, e.parameter.callback);
  } catch (error) {
    return jsonpKitchenResponse_({ status: 'error', message: error.message }, e && e.parameter && e.parameter.callback);
  }
}

function doPost() {
  return kitchenFrameResponse_({
    type: 'hpp-kitchen-sheets',
    status: 'error',
    message: 'Master bahan baku dapur hanya dapat diubah langsung melalui Google Sheets.'
  });
}

function requireKitchenSheetUser_() {
  if (!Session.getActiveUser().getEmail()) throw new Error('Login ke akun Google yang memiliki akses ke spreadsheet.');
}

function getKitchenSheet_(spreadsheetId) {
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName(HPP_KITCHEN_SHEET_NAME);
  if (!sheet) throw new Error('Tab ' + HPP_KITCHEN_SHEET_NAME + ' tidak ditemukan.');
  if (!sheet.getLastRow()) throw new Error('Tab harus sudah memiliki header sebelum dibaca.');
  var headers = sheet.getRange(1, 1, 1, HPP_KITCHEN_HEADERS.length).getDisplayValues()[0]
    .map(function (value) { return String(value).trim().toLowerCase(); });
  if (headers.join('|') !== HPP_KITCHEN_HEADERS.join('|')) {
    throw new Error('Header tab harus berurutan: ' + HPP_KITCHEN_HEADERS.join(', '));
  }
  return sheet;
}

function readKitchenMaterials_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, HPP_KITCHEN_HEADERS.length).getValues()
    .filter(function (row) { return row[0] || row[1]; })
    .map(function (row) {
      return {
        code: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        category: String(row[2] || '').trim(),
        unit: String(row[3] || '').trim(),
        price: Number(row[4]) || 0
      };
    });
}

function jsonpKitchenResponse_(data, callback) {
  var safeCallback = /^[A-Za-z_$][\w.$]*$/.test(String(callback || '')) ? callback : '';
  var body = JSON.stringify(data).replace(/</g, '\\u003c');
  var output = safeCallback ? safeCallback + '(' + body + ');' : 'throw new Error(' + JSON.stringify(data.message || 'Permintaan ditolak.') + ');';
  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function kitchenFrameResponse_(data) {
  var message = JSON.stringify(data).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<script>window.parent.postMessage(' + message + ', "*");</script>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
