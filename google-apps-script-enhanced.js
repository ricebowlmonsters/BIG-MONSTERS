/******************************************************************************
 * Rice Bowl Monster - Combined API (Fixed for Custom Headers)
 ******************************************************************************/

// ===== 1. CONFIGURATION: Define Sheet Names Here =====
const SHEET_USERS = 'users'; 
const SHEET_MENU = 'menu';
const SHEET_VOUCHERS = 'vouchers';
const SHEET_MERCHANDISE = 'merchandise';
const SHEET_LOCATIONS = 'locations';
const SHEET_LOG_TUKAR_POIN = 'Log Tukar Poin';
const SHEET_POINT_HISTORY = 'POINT_HISTORY';
const SHEET_CLAIMS = 'claims'; 

// ===== 2. CORE HELPER FUNCTIONS =====

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toLowerCase() === name.toLowerCase()) {
        return sheets[i];
      }
    }
    sh = ss.insertSheet(name);
  }
  return sh;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readHeaderMap(sheet) {
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  header.forEach((h, idx) => {
    map[String(h).toLowerCase().trim()] = idx + 1;
  });
  return map;
}

function findUserRowByPhone(phone) {
  const sh = getSheet(SHEET_USERS);
  const lastRow = sh.getLastRow();
  const headerMap = readHeaderMap(sh);

  if (lastRow < 2)   return { row: -1, data: null, sheet: sh, headerMap: headerMap };
  
  // [FIX] Deteksi kolom Phone
  const phoneCol = headerMap['phone'] || headerMap['no hp'] || headerMap['no telepon'] || 2;
  
  // [FIX KRITIKAL] Deteksi kolom Nama
  // HAPUS 'username' dari fallback agar tidak salah ambil kolom C.
  // Jika tidak ada header 'nama'/'name', PAKSA ambil Kolom 1 (Kolom A).
  const namaCol = headerMap['nama'] || headerMap['name'] || headerMap['customer'] || 1;
  
  // [FIX] Deteksi kolom Points
  const pointsCol = headerMap['points sisa'] || headerMap['points'] || headerMap['point'] || headerMap['jumlah point'] || 4;

  const targetDigits = String(phone).replace(/\D+/g, '');
  const values = sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).getValues();
  
  for (let i = 0; i < values.length; i++) {
    const rowIndex = i + 2;
    const pIdx = (phoneCol > 0) ? phoneCol - 1 : 1;
    const cellVal = values[i][pIdx];
    
    const cellStr = cellVal === null || cellVal === undefined ? '' : String(cellVal);
    const sheetDigits = cellStr.replace(/\D+/g, '');

    if (sheetDigits === targetDigits) {
      const rowValues = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
      
      const user = {
        phone: cellStr,
        nama: '',
        username: '',
        points: 0
      };
      
      // Ambil Nama (Prioritas Kolom A jika header aneh)
      if (namaCol > 0 && rowValues[namaCol - 1]) {
        user.nama = rowValues[namaCol - 1];
      } else {
        user.nama = rowValues[0]; // Default mutlak ke kolom pertama
      }

      // Ambil Username (jika ada)
      const usernameCol = headerMap['username'];
      if (usernameCol > 0) {
         user.username = rowValues[usernameCol - 1];
      }

      // Ambil Poin
      if (pointsCol > 0) {
        user.points = Number(rowValues[pointsCol - 1] || 0);
      }
      
      return { row: rowIndex, data: user, headerMap, sheet: sh };
    }
  }

  return { row: -1, data: null, headerMap, sheet: sh };
}

function ensureRedemptionLogHeaders(sheet) {
  const headers = ['TIMESTAMP', 'PHONE', 'NAMA', 'REWARD', 'COST', 'CODE'];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  let currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const normalizedHeaders = currentHeaders.map(value => String(value).trim().toLowerCase());
  ['status', 'validatedat', 'validatedby', 'rewardid'].forEach(header => {
    if (!normalizedHeaders.includes(header)) {
      sheet.getRange(1, currentHeaders.length + 1).setValue(header.toUpperCase());
      currentHeaders.push(header.toUpperCase());
      normalizedHeaders.push(header);
    }
  });

  const headerMap = {};
  currentHeaders.forEach((header, index) => {
    headerMap[String(header).trim().toLowerCase()] = index + 1;
  });
  return headerMap;
}

function getDataFromSheet(sheetName, requiredColumns) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getDataRange().getValues();
  const items = [];
  const headers = data[0].map(h => h.toLowerCase().trim());

  const indices = {};
  for (const colName in requiredColumns) {
    const index = headers.indexOf(requiredColumns[colName]);
    if (index !== -1) indices[colName] = index;
    else indices[colName] = -1;
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.join('').trim() !== '') {
      const item = {};
      let hasData = false;
      for (const colName in indices) {
        if (indices[colName] !== -1) {
          item[colName] = row[indices[colName]];
          hasData = true;
        } else {
          item[colName] = '';
        }
      }
      if (hasData) items.push(item);
    }
  }
  return items;
}

function writePointHistory({ phone, nama, amount, source, operator }) {
  const sheet = getSheet(SHEET_POINT_HISTORY);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['TIMESTAMP', 'PHONE', 'NAMA', 'AMOUNT', 'SOURCE', 'OPERATOR']);
  }
  const now = new Date();
  sheet.appendRow([now, phone, nama || '', Number(amount || 0), source || 'unknown', operator || 'system']);
}

// ===== 3. HTTP HANDLERS =====

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getLocations') return handleGetLocations();
    if (action === 'getMenuData') return handleGetMenuData();
    if (action === 'getGoogleReviews') return handleGetGoogleReviews();
    if (action === 'getRedemptionHistory') return handleGetRedemptionHistory(e.parameter.phone);

    const phoneNumber = (e.parameter.phone || '').trim();
    if (phoneNumber) {
      const { data } = findUserRowByPhone(phoneNumber);
      if (!data) return createJsonResponse({ status: 'error', message: 'Phone number not registered.' });
      return createJsonResponse({ status: 'success', data: data });
    }
    return createJsonResponse({ status: 'error', message: 'Invalid request.' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: 'Server error: ' + error.message });
  }
}

function handleGetRedemptionHistory(phone) {
  const cleanPhone = String(phone || '').trim();
  const phoneDigits = cleanPhone.replace(/\D+/g, '');
  if (!phoneDigits) {
    return createJsonResponse({ status: 'error', message: 'Phone number is required.' });
  }

  const { data: user } = findUserRowByPhone(cleanPhone);
  if (!user) {
    return createJsonResponse({ status: 'error', message: 'Customer not found.' });
  }

  const sheet = getSheet(SHEET_LOG_TUKAR_POIN);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return createJsonResponse({ status: 'success', data: [] });

  const headerMap = ensureRedemptionLogHeaders(sheet);
  const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const history = rows.reduce(function(items, row) {
    const rowPhone = String(row[headerMap.phone - 1] || '').replace(/\D+/g, '');
    if (rowPhone !== phoneDigits) return items;

    const code = String(row[headerMap.code - 1] || '').trim().toUpperCase();
    const reward = String(row[headerMap.reward - 1] || '').trim();
    if (!code || !reward) return items;

    const rawStatus = String(row[headerMap.status - 1] || 'active').trim().toLowerCase();
    const claimTime = row[headerMap.timestamp - 1];
    const usedDate = row[headerMap.validatedat - 1];
    items.push({
      id: code,
      code: code,
      nama: reward,
      point: Number(row[headerMap.cost - 1]) || 0,
      status: rawStatus === 'used' ? 'used' : 'unclaimed',
      rewardId: String(row[headerMap.rewardid - 1] || ''),
      claimTime: claimTime instanceof Date ? claimTime.toISOString() : String(claimTime || ''),
      usedDate: usedDate instanceof Date ? usedDate.toISOString() : String(usedDate || '')
    });
    return items;
  }, []);

  history.sort(function(a, b) {
    return new Date(b.claimTime).getTime() - new Date(a.claimTime).getTime();
  });
  return createJsonResponse({ status: 'success', data: history });
}

function handleGetGoogleReviews() {
  const properties = PropertiesService.getScriptProperties();
  const accountId = (properties.getProperty('GBP_ACCOUNT_ID') || '').trim();
  const locationId = (properties.getProperty('GBP_LOCATION_ID') || '').trim();
  if (!accountId || !locationId) {
    return createJsonResponse({
      status: 'error',
      message: 'GBP_ACCOUNT_ID dan GBP_LOCATION_ID belum diatur di Script Properties.'
    });
  }

  const reviews = [];
  let pageToken = '';
  for (let page = 0; page < 20; page++) {
    let url = 'https://mybusiness.googleapis.com/v4/accounts/' + encodeURIComponent(accountId) +
      '/locations/' + encodeURIComponent(locationId) + '/reviews?pageSize=50';
    if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    const code = response.getResponseCode();
    const body = response.getContentText();
    if (code < 200 || code >= 300) throw new Error('Google Business Profile API HTTP ' + code + ': ' + body);
    const data = JSON.parse(body || '{}');
    (data.reviews || []).forEach(function(review) {
      reviews.push({
        date: review.createTime ? review.createTime.slice(0, 10) : '',
        name: review.reviewer && review.reviewer.displayName ? review.reviewer.displayName : 'Anonim',
        rating: normalizeGoogleRating(review.starRating),
        text: review.comment || ''
      });
    });
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  return createJsonResponse({ status: 'success', reviews: reviews });
}

function normalizeGoogleRating(value) {
  const ratings = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return ratings[String(value || '').toUpperCase()] || Number(value) || 0;
}

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    if (!action) throw new Error('Action parameter is missing.');

    switch (action) {
      case 'register': return handleRegister(requestData);
      case 'getUserData': return handleGetUserData(requestData);
      case 'updateUserData': return handleUpdateUserData(requestData);
      case 'getMenuItems': return handleGetMenuItems();
      case 'getVoucherData': return handleGetVoucherData();
      case 'getMerchandiseData': return handleGetMerchandiseData();
      case 'addPoints': return handleAddPoints(requestData);
      case 'validateClaimCode': return handleValidateClaimCode(requestData);
      case 'getMenuData': return handleGetMenuData();
      
      case 'redeemReward': 
      case 'generateClaimCode': 
        return handleRedeemReward(requestData);

      default: throw new Error('Unknown action: ' + action);
    }

  } catch (error) {
    return createJsonResponse({ status: 'error', message: 'Failed to process request: ' + error.message });
  }
}

// ===== 4. ACTION HANDLERS =====

function handleRegister(requestData) {
  const { nama, username } = requestData;
  if (!nama || !username) throw new Error('Name and Phone Number cannot be empty.');
  const sheet = getSheet(SHEET_USERS);
  // Format: Nama, Phone, Username (kosong), Points
  sheet.appendRow([nama, username, '', 0]);
  return createJsonResponse({ status: 'success', message: 'Registration successful!' });
}

function handleGetUserData(requestData) {
  const phone = requestData.phone;
  if (!phone) throw new Error("Phone number is required.");
  const { data } = findUserRowByPhone(phone);
  if (data) return createJsonResponse({ status: 'success', user: data });
  return createJsonResponse({ status: 'error', message: 'User not found.' });
}

function handleUpdateUserData(requestData) {
  const phone = String(requestData.phone || '').trim();
  const newName = String(requestData.newName || '').trim();
  if (!phone || !newName) {
    return createJsonResponse({ status: 'error', message: 'Phone number and name are required.' });
  }

  const { row, data, headerMap, sheet } = findUserRowByPhone(phone);
  if (!data) return createJsonResponse({ status: 'error', message: 'Customer not found.' });

  const nameColumn = headerMap['nama'] || headerMap['name'] || headerMap['customer'] || 1;
  sheet.getRange(row, nameColumn).setValue(newName);
  return createJsonResponse({
    status: 'success',
    message: 'Nama berhasil diperbarui.',
    data: { phone: data.phone, nama: newName }
  });
}

function handleGetMenuItems() {
  const menuItems = getDataFromSheet(SHEET_MENU, { nama: 'nama', harga: 'harga', gambar_url: 'gambar_url', kategori: 'kategori' });
  return createJsonResponse({ status: 'success', data: menuItems });
}

function handleGetVoucherData() {
  const vouchers = getDataFromSheet(SHEET_VOUCHERS, { nama: 'nama', point: 'point', foto: 'foto' });
  return createJsonResponse({ status: 'success', data: vouchers });
}

function handleGetMerchandiseData() {
  const merchandise = getDataFromSheet(SHEET_MERCHANDISE, { nama: 'nama', point: 'point', foto: 'foto' });
  return createJsonResponse({ status: 'success', data: merchandise });
}

function handleGetLocations() {
  try {
    const locations = getDataFromSheet(SHEET_LOCATIONS, { nama: 'nama', lat: 'lat', lng: 'lng' });
    return createJsonResponse({ status: 'success', data: locations });
  } catch (e) { return createJsonResponse({ status: 'success', data: [] }); }
}

function handleRedeemReward(requestData) {
  const { phone, reward, cost, nama, rewardId } = requestData;
  const rewardCost = parseInt(cost);

  if (!phone || !reward || isNaN(rewardCost)) {
    return createJsonResponse({ status: 'error', message: 'Data tidak lengkap (phone/reward/cost).' });
  }
  
  const { row, data, headerMap, sheet } = findUserRowByPhone(phone);
  if (!data) return createJsonResponse({ status: 'error', message: 'User tidak ditemukan.' });

  const pointsCol = headerMap['points sisa'] || headerMap['points'] || headerMap['point'] || 4;
  const currentPoints = parseInt(data.points || 0);

  if (currentPoints >= rewardCost) {
    const newPoints = currentPoints - rewardCost;
    
    const customerName = nama || data.nama || '';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_LOG_TUKAR_POIN);
    
    if (!logSheet) {
      logSheet = ss.insertSheet(SHEET_LOG_TUKAR_POIN);
    }
    const logHeaders = ensureRedemptionLogHeaders(logSheet);

    const prefix = String(reward).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3).padEnd(3, 'X');
    const existingCodes = logSheet.getLastRow() > 1
      ? logSheet.getRange(2, logHeaders.code, logSheet.getLastRow() - 1, 1).getValues().flat().map(code => String(code).toUpperCase())
      : [];
    let uniqueCode = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const candidate = `${prefix}-${suffix}`;
      if (!existingCodes.includes(candidate)) {
        uniqueCode = candidate;
        break;
      }
    }
    if (!uniqueCode) {
      return createJsonResponse({ status: 'error', message: 'Tidak dapat membuat kode klaim unik. Silakan coba lagi.' });
    }

    const logRow = [];
    logRow[logHeaders.timestamp - 1] = new Date();
    logRow[logHeaders.phone - 1] = phone;
    logRow[logHeaders.nama - 1] = customerName;
    logRow[logHeaders.reward - 1] = reward;
    logRow[logHeaders.cost - 1] = rewardCost;
    logRow[logHeaders.code - 1] = uniqueCode;
    logRow[logHeaders.status - 1] = 'active';
    logRow[logHeaders.validatedat - 1] = '';
    logRow[logHeaders.rewardid - 1] = String(rewardId || '');
    logSheet.appendRow(logRow);
    sheet.getRange(row, pointsCol).setValue(newPoints);

    writePointHistory({
      phone: phone,
      nama: customerName,
      amount: -rewardCost,
      source: 'Redeem: ' + reward,
      operator: 'System'
    });

    return createJsonResponse({ 
      status: 'success', 
      message: 'Penukaran berhasil.', 
      newPoints: newPoints,
      data: {
        code: uniqueCode,
        claimTime: new Date()
      }
    });
  } else {
    return createJsonResponse({ status: 'error', message: 'Poin tidak cukup.' });
  }
}

function handleAddPoints(requestData) {
  const { phone, nominal, points, source, operator, nama } = requestData;
  const cleanPhone = String(phone || '').trim();
  const addPoints = Number(points || 0);

  if (!cleanPhone) return createJsonResponse({ status: 'error', message: 'phone is required' });
  if (!(addPoints > 0)) return createJsonResponse({ status: 'error', message: 'points must be > 0' });

  const { row, data, headerMap, sheet } = findUserRowByPhone(cleanPhone);
  if (!data) return createJsonResponse({ status: 'error', message: 'Customer not found.' });

  const pointsCol = headerMap['points sisa'] || headerMap['points'] || headerMap['point'] || 4;
  const currentPoints = data.points;
  const newPoints = currentPoints + addPoints;
  sheet.getRange(row, pointsCol).setValue(newPoints);

  const customerName = nama || data.nama || '';
  writePointHistory({ phone: cleanPhone, nama: customerName, amount: addPoints, source: source, operator: operator });

  return createJsonResponse({ status: 'success', data: { phone: cleanPhone, points_before: currentPoints, points_after: newPoints, added: addPoints } });
}

function handleValidateClaimCode(data) {
  const code = String(data.code || '').trim().toUpperCase();
  const operator = data.operator || 'unknown';
  if (!/^[A-Z0-9]{3}-[0-9]{1,4}$/.test(code)) {
    return createJsonResponse({
      status: 'error',
      message: 'Format kode tidak valid. Gunakan format seperti DIS-9845.',
      code: 'INVALID_FORMAT'
    });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return createJsonResponse({ status: 'error', message: 'Server sedang memproses klaim lain. Coba lagi sebentar.' });
  }

  try {
    const logSheet = getSheet(SHEET_LOG_TUKAR_POIN);
    const headerMap = ensureRedemptionLogHeaders(logSheet);
    const lastRow = logSheet.getLastRow();
    if (lastRow < 2) {
      return createJsonResponse({ status: 'error', message: 'Kode klaim tidak ditemukan.', code: 'CODE_NOT_FOUND' });
    }

    const values = logSheet.getRange(2, 1, lastRow - 1, logSheet.getLastColumn()).getValues();
    let activeMatch = null;
    let usedMatch = null;
    for (let index = 0; index < values.length; index++) {
      const row = values[index];
      if (String(row[headerMap.code - 1] || '').trim().toUpperCase() !== code) continue;

      const status = String(row[headerMap.status - 1] || 'active').trim().toLowerCase();
      const match = { row, sheetRow: index + 2 };
      if (status === 'used') {
        usedMatch = match;
      } else {
        activeMatch = match;
        break;
      }
    }

    if (!activeMatch) {
      if (usedMatch) {
        const row = usedMatch.row;
        return createJsonResponse({
          status: 'error',
          message: 'Kode sudah pernah digunakan.',
          code: 'ALREADY_USED',
          data: {
            itemName: row[headerMap.reward - 1] || '',
            userPhone: row[headerMap.phone - 1] || '',
            userName: row[headerMap.nama - 1] || '',
            usedBy: row[headerMap.validatedby - 1] || '',
            usedAt: row[headerMap.validatedat - 1] || ''
          }
        });
      }
      return createJsonResponse({ status: 'error', message: 'Kode klaim tidak ditemukan.', code: 'CODE_NOT_FOUND' });
    }

    const row = activeMatch.row;
    const claimTime = row[headerMap.timestamp - 1];
    const rewardName = row[headerMap.reward - 1];
    const customerPhone = row[headerMap.phone - 1];
    const customerName = row[headerMap.nama - 1];
    if (!rewardName || !customerPhone || !customerName || !claimTime) {
      return createJsonResponse({
        status: 'error',
        message: 'Data hadiah pada log klaim tidak lengkap. Periksa baris kode ini di sheet Log Tukar Poin.',
        code: 'INCOMPLETE_DATA'
      });
    }

    const claimDate = claimTime instanceof Date ? claimTime : new Date(claimTime);
    if (!isNaN(claimDate.getTime())) {
      const ageInDays = (Date.now() - claimDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > 30) {
        return createJsonResponse({ status: 'error', message: 'Kode klaim sudah kedaluwarsa.', code: 'EXPIRED' });
      }
    }

    const validatedAt = new Date();
    logSheet.getRange(activeMatch.sheetRow, headerMap.status).setValue('used');
    logSheet.getRange(activeMatch.sheetRow, headerMap.validatedat).setValue(validatedAt);
    logSheet.getRange(activeMatch.sheetRow, headerMap.validatedby).setValue(operator);

    return createJsonResponse({
      status: 'success',
      message: 'Kode valid. Voucher dapat digunakan.',
      data: {
        code: code,
        itemName: rewardName,
        userPhone: customerPhone,
        userName: customerName,
        claimTime: claimTime,
        validatedAt: validatedAt,
        validatedBy: operator
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetMenuData() {
  return createJsonResponse({ status: 'success', data: { riceBowl: [], mie: [], minuman: [], esCampur: [], gorengan: [] } });
}
