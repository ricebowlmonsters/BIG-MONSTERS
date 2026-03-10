/**
 * firebase-storage.js
 * Satu titik penyimpanan ke Firebase – pengganti localStorage (app state) dan Google Sheets (Code.gs).
 * - App state: rbm_user, rbm_users, rbm_outlets, rbm_settings, printer, dll. → Firebase app_state/*
 * - Data RBM Pro (ex-Sheet): Petty Cash, Database barang, Inventaris, Pembukuan, Pengajuan, Bank → rbm_pro/*
 * Gunakan script ini setelah Firebase SDK (firebase-app.js, firebase-database.js) dimuat.
 */
(function(global) {
  'use strict';

  var db = null;
  var config = null;
  var useFirebase = false;

  // Pemetaan key localStorage → path Firebase (app_state)
  var APP_STATE_KEYS = {
    rbm_user: 'app_state/session',
    rbm_users: 'app_state/users',
    rbm_outlets: 'app_state/outlet_ids',
    rbm_outlet_names: 'app_state/outlet_names',
    rbm_last_selected_outlet: 'app_state/last_selected_outlet',
    rbm_db_connections: 'app_state/db_connections',
    rbm_active_connection_index: 'app_state/active_connection_index',
    rbm_settings: 'app_state/settings',
    rbm_menu_categories: 'app_state/menu_categories',
    rbm_printer_groups: 'app_state/printer_groups',
    rbm_printer_config: 'app_state/printer_config',
    rbm_payment_methods: 'payment_methods',
    rbm_points_history: 'rbm_pro/points_history',
    rbm_vouchers: 'rbm_pro/vouchers',
    rbm_active_outlets: 'app_state/active_outlets',
    rbm_outlet_locations: 'app_state/outlet_locations',
    rbm_quick_memos: 'app_state/quick_memos',
    rbm_manage_menu_outlet: 'app_state/manage_menu_outlet'
  };

  function getConnections() {
    try {
      var raw = localStorage.getItem('rbm_db_connections');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  var DEFAULT_FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDWQG53tP2zKILTwPSJQpiVzFNyvYLxLqw',
    authDomain: 'ricebowlmonst.firebaseapp.com',
    databaseURL: 'https://ricebowlmonst-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'ricebowlmonst',
    storageBucket: 'ricebowlmonst.firebasestorage.app',
    messagingSenderId: '723669558962',
    appId: '1:723669558962:web:c17a1a4683a86cc5a88bab',
    type: 'firebase'
  };

  function getActiveConnection() {
    var idx = parseInt(localStorage.getItem('rbm_active_connection_index') || '0', 10);
    var conns = getConnections();
    if (conns.length && conns[idx] && conns[idx].config) return conns[idx].config;
    if (conns.length && conns[0].config) return conns[0].config;
    return null;
  }

  function init() {
    if (db !== null) return !!useFirebase;
    config = getActiveConnection();
    if (!config) config = DEFAULT_FIREBASE_CONFIG;
    if (config.type === 'local' || config.type === 'server') return false;
    try {
      if (typeof firebase === 'undefined') return false;
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.database();
      useFirebase = true;
    } catch (e) {
      console.warn('firebase-storage: init failed', e);
    }
    return useFirebase;
  }

  function parseVal(val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string' && (val === '[]' || val === '{}')) return val.length === 2 ? (val === '[]' ? [] : {}) : val;
    return val;
  }

  // ---------- App state (pengganti localStorage untuk key rbm_*) ----------

  function getAppState(key) {
    var path = APP_STATE_KEYS[key];
    if (!path) return Promise.resolve(localStorage.getItem(key));
    var localVal = localStorage.getItem(key);
    if (!init()) return Promise.resolve(localVal);
    return db.ref(path).once('value').then(function(snap) {
      var v = snap.val();
      if (v !== undefined && v !== null) return typeof v === 'object' ? JSON.stringify(v) : String(v);
      return localVal;
    }).catch(function() { return localVal; });
  }

  function setAppState(key, value) {
    var path = APP_STATE_KEYS[key];
    try { localStorage.setItem(key, value); } catch (e) {}
    if (!path || !init()) return Promise.resolve();
    var toSet = value;
    try {
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) toSet = JSON.parse(value);
    } catch (e) {}
    return db.ref(path).set(toSet).catch(function(err) { console.warn('firebase-storage setAppState failed', key, err); });
  }

  function removeAppState(key) {
    try { localStorage.removeItem(key); } catch (e) {}
    var path = APP_STATE_KEYS[key];
    if (!path || !init()) return Promise.resolve();
    return db.ref(path).remove().catch(function(err) { console.warn('firebase-storage removeAppState failed', key, err); });
  }

  // ---------- Sesi aktif (satu akun hanya boleh login di satu perangkat) ----------
  function safeUsernameKey(username) {
    return String(username || '').replace(/[.#$[\]]/g, '_') || 'unknown';
  }

  function getActiveSession(username) {
    if (!init() || !username) return Promise.resolve(null);
    var path = 'app_state/active_sessions/' + safeUsernameKey(username);
    return db.ref(path).once('value').then(function(snap) {
      var v = snap.val();
      return v && typeof v === 'object' ? v : null;
    }).catch(function() { return null; });
  }

  function setActiveSession(username, sessionId) {
    if (!username || !sessionId) return Promise.resolve();
    if (!init()) return Promise.resolve();
    var path = 'app_state/active_sessions/' + safeUsernameKey(username);
    var payload = { sessionId: String(sessionId), lastLogin: Date.now() };
    return db.ref(path).set(payload).catch(function(err) { console.warn('firebase-storage setActiveSession failed', err); });
  }

  // ---------- Petty Cash (logika sama seperti Pembukuan: satu node per tanggal) ----------
  function getPettyCashPath(outletId) {
    var o = outletId || (typeof getRbmOutlet === 'function' && getRbmOutlet()) || (window.getRbmOutlet && window.getRbmOutlet());
    return 'rbm_pro/petty_cash/' + (o ? String(o).replace(/[.#$[\]]/g, '_') : 'default');
  }

  function getPettyCashDatePath(outletId, dateStr) {
    var d = (dateStr || '').toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return getPettyCashPath(outletId) + '/' + d;
    try {
      var parts = d.split('/');
      if (parts.length === 3) d = parts[2] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[0]).slice(-2);
    } catch (e) {}
    return getPettyCashPath(outletId) + '/' + (d || Date.now());
  }

  function normalizeDateKeyToYyyyMmDd(keyOrDate) {
    var s = (keyOrDate == null ? '' : keyOrDate).toString().trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      var p = s.split('/');
      return p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2);
    }
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      var parts = s.split('-');
      return parts[0] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[2]).slice(-2);
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) {
      var p2 = s.split('-');
      return p2[2] + '-' + ('0' + p2[1]).slice(-2) + '-' + ('0' + p2[0]).slice(-2);
    }
    try {
      var d = new Date(s);
      if (!isNaN(d.getTime())) return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    } catch (e) {}
    return s;
  }

  function getPettyCash(tanggalAwal, tanggalAkhir, outletId) {
    if (!init()) return Promise.resolve({ data: [], summary: { totalDebit: 0, totalKredit: 0, saldoAkhir: 0 } });
    var path = getPettyCashPath(outletId);
    return db.ref(path).once('value').then(function(snap) {
      var root = snap.val();
      if (!root || typeof root !== 'object') root = {};
      var oid = (outletId || '').toString().trim();
      if (oid && root[oid] && typeof root[oid] === 'object') root = root[oid];
      else if (!Array.isArray(root.transactions) && Object.keys(root).length === 1) {
        var onlyKey = Object.keys(root)[0];
        if (root[onlyKey] && typeof root[onlyKey] === 'object') root = root[onlyKey];
      }
      var tglAwalStr = (tanggalAwal || '').toString().trim();
      var tglAkhirStr = (tanggalAkhir || '').toString().trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tglAwalStr)) tglAwalStr = normalizeDateKeyToYyyyMmDd(tglAwalStr) || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tglAkhirStr)) tglAkhirStr = normalizeDateKeyToYyyyMmDd(tglAkhirStr) || '';
      var tglAwal = tglAwalStr ? new Date(tglAwalStr) : null;
      var tglAkhir = tglAkhirStr ? new Date(tglAkhirStr) : null;
      if (tglAkhir) tglAkhir.setHours(23, 59, 59, 999);
      var filtered = [];
      var totalDebit = 0, totalKredit = 0;
      var saldoAwal = 0;
      var runningSaldo = 0;
      var allKeys = Object.keys(root);
      var dateKeys = allKeys.filter(function(k) {
        if (k === 'transactions') return false;
        var node = root[k];
        if (!node || typeof node !== 'object') return false;
        var hasTransactions = Array.isArray(node.transactions) || (node.transactions && typeof node.transactions === 'object');
        if (!hasTransactions) return false;
        return true;
      });
      if (dateKeys.length === 0 && Array.isArray(root.transactions)) {
        var legacyList = root.transactions;
        legacyList.forEach(function(row, idx) {
          var t = row.tanggal || row.date;
          if (!t) return;
          var d = t instanceof Date ? t : new Date(t);
          d.setHours(0, 0, 0, 0);
          var dateKey = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
          if (tglAwal && d < tglAwal) return;
          if (tglAkhir && d > tglAkhir) return;
          var debit = parseFloat(row.debit || row.keluar || 0) || 0;
          var kredit = parseFloat(row.kredit || row.masuk || 0) || 0;
          runningSaldo = (parseFloat(row.saldo) || runningSaldo) - debit + kredit;
          filtered.push({
            no: filtered.length + 1,
            tanggal: row.tanggalStr || (d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()),
            nama: row.nama,
            jumlah: row.jumlah,
            satuan: row.satuan || '',
            harga: row.harga,
            debit: debit,
            kredit: kredit,
            saldo: runningSaldo,
            foto: row.foto || ''
          });
          totalDebit += debit;
          totalKredit += kredit;
        });
        var saldoAkhirLegacy = filtered.length ? (filtered[filtered.length - 1].saldo || 0) : 0;
        return { data: filtered, summary: { totalDebit: totalDebit, totalKredit: totalKredit, saldoAkhir: saldoAkhirLegacy } };
      }
      dateKeys.sort();
      dateKeys.forEach(function(dateKey) {
        var node = root[dateKey];
        var effectiveDate = normalizeDateKeyToYyyyMmDd(node.tanggal || dateKey);
        var arr = node && Array.isArray(node.transactions) ? node.transactions : (node && node.transactions && typeof node.transactions === 'object' ? Object.values(node.transactions) : []);
        
        // Jika tanggal sebelum periode, akumulasi ke Saldo Awal
        if (tglAwalStr && effectiveDate && effectiveDate < tglAwalStr) {
          arr.forEach(function(row) {
            var debit = parseFloat(row.debit || row.keluar || 0) || 0;
            var kredit = parseFloat(row.kredit || row.masuk || 0) || 0;
            saldoAwal = saldoAwal - debit + kredit;
          });
          return;
        }
        
        // Jika tanggal setelah periode, abaikan
        if (tglAkhirStr && effectiveDate && effectiveDate > tglAkhirStr) return;

        if (filtered.length === 0) runningSaldo = saldoAwal;

        arr.forEach(function(row, idxInDate) {
          var t = row.tanggal || row.date || dateKey;
          var d = t instanceof Date ? t : new Date(t);
          d.setHours(0, 0, 0, 0);
          var debit = parseFloat(row.debit || row.keluar || 0) || 0;
          var kredit = parseFloat(row.kredit || row.masuk || 0) || 0;
          runningSaldo = (parseFloat(row.saldo) || runningSaldo) - debit + kredit;
          filtered.push({
            no: filtered.length + 1,
            tanggal: row.tanggalStr || (d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()),
            nama: row.nama,
            jumlah: row.jumlah,
            satuan: row.satuan || '',
            harga: row.harga,
            debit: debit,
            kredit: kredit,
            saldo: runningSaldo,
            foto: row.foto || '',
            _firebaseDate: dateKey,
            _firebaseIndexInDate: idxInDate
          });
          totalDebit += debit;
          totalKredit += kredit;
        });
      });
      var saldoAkhir = filtered.length ? (filtered[filtered.length - 1].saldo || 0) : saldoAwal;
      return { data: filtered, summary: { totalDebit: totalDebit, totalKredit: totalKredit, saldoAkhir: saldoAkhir, saldoAwal: saldoAwal } };
    }).catch(function(err) {
      console.warn('getPettyCash failed', err);
      return { data: [], summary: {} };
    });
  }

  function savePettyCashTransactions(data, outletId) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var dateStr = (data.tanggal || '').toString().trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      var p = dateStr.split('/');
      dateStr = p[2] + '-' + ('0' + p[1]).slice(-2) + '-' + ('0' + p[0]).slice(-2);
    }
    var path = getPettyCashDatePath(outletId, dateStr);
    var newList = (data.transactions || []).map(function(trx) {
      var nominalPemasukan = parseFloat(trx.total) || parseFloat(trx.harga) || 0;
      var nominalPengeluaran = (parseFloat(trx.jumlah) || 0) * (parseFloat(trx.harga) || 0);
      return {
        tanggal: dateStr,
        date: dateStr,
        nama: trx.nama,
        jumlah: trx.jumlah != null ? trx.jumlah : 1,
        satuan: trx.satuan || '',
        harga: parseFloat(trx.harga) || (data.jenis === 'pemasukan' ? nominalPemasukan : 0),
        keluar: data.jenis === 'pengeluaran' ? nominalPengeluaran : 0,
        masuk: data.jenis === 'pemasukan' ? nominalPemasukan : 0,
        debit: data.jenis === 'pengeluaran' ? nominalPengeluaran : 0,
        kredit: data.jenis === 'pemasukan' ? nominalPemasukan : 0,
        foto: trx.fotoUrl || trx.foto || '',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
    });
    return db.ref(path).once('value').then(function(snap) {
      var existing = snap.val();
      var existingArr = existing && Array.isArray(existing.transactions) ? existing.transactions : (existing && existing.transactions && typeof existing.transactions === 'object' ? Object.values(existing.transactions) : []);
      existingArr = existingArr.concat(newList);
      return db.ref(path).set({
        tanggal: dateStr,
        transactions: existingArr,
        createdAt: (existing && existing.createdAt) || firebase.database.ServerValue.TIMESTAMP
      });
    }).then(function() { return '✅ Transaksi petty cash disimpan di Firebase.'; });
  }

  function deletePettyCashByDateAndIndex(dateStr, indexInDate, outletId) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var path = getPettyCashDatePath(outletId, dateStr);
    return db.ref(path).once('value').then(function(snap) {
      var node = snap.val();
      var arr = node && Array.isArray(node.transactions) ? node.transactions.slice() : (node && node.transactions && typeof node.transactions === 'object' ? Object.values(node.transactions) : []);
      if (indexInDate < 0 || indexInDate >= arr.length) return Promise.resolve();
      arr.splice(indexInDate, 1);
      if (arr.length === 0) return db.ref(path).remove();
      return db.ref(path).set({
        tanggal: node.tanggal || dateStr,
        transactions: arr,
        createdAt: node.createdAt || firebase.database.ServerValue.TIMESTAMP
      });
    }).then(function() { return '✅ Transaksi petty cash dihapus.'; });
  }

  function getPettyCashFullList(outletId) {
    if (!init()) return Promise.resolve([]);
    var path = getPettyCashPath(outletId);
    return db.ref(path).once('value').then(function(snap) {
      var root = snap.val();
      if (!root || typeof root !== 'object') return [];
      var list = [];
      Object.keys(root).forEach(function(dateKey) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
        var node = root[dateKey];
        var arr = node && Array.isArray(node.transactions) ? node.transactions : (node && node.transactions && typeof node.transactions === 'object' ? Object.values(node.transactions) : []);
        arr.forEach(function(row) { list.push(row); });
      });
      return list;
    });
  }

  function updatePettyCashTransactionByDateAndIndex(dateStr, indexInDate, data, outletId) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var path = getPettyCashDatePath(outletId, dateStr);
    return db.ref(path).once('value').then(function(snap) {
      var node = snap.val();
      var arr = node && Array.isArray(node.transactions) ? node.transactions.slice() : (node && node.transactions && typeof node.transactions === 'object' ? Object.values(node.transactions) : []);
      if (indexInDate < 0 || indexInDate >= arr.length) return Promise.resolve();
      var existing = arr[indexInDate] || {};
      arr[indexInDate] = {
        tanggal: data.tanggal != null ? data.tanggal : (existing.tanggal || dateStr),
        date: data.tanggal != null ? data.tanggal : (existing.date || dateStr),
        nama: data.nama != null ? data.nama : existing.nama,
        jumlah: data.jumlah != null ? data.jumlah : existing.jumlah,
        satuan: data.satuan != null ? data.satuan : (existing.satuan || ''),
        harga: data.harga != null ? parseFloat(data.harga) : (parseFloat(existing.harga) || 0),
        debit: data.debit != null ? parseFloat(data.debit) : (parseFloat(existing.debit) || 0),
        kredit: data.kredit != null ? parseFloat(data.kredit) : (parseFloat(existing.kredit) || 0),
        keluar: data.debit != null ? parseFloat(data.debit) : (parseFloat(existing.keluar) || 0),
        masuk: data.kredit != null ? parseFloat(data.kredit) : (parseFloat(existing.masuk) || 0),
        foto: data.foto !== undefined ? data.foto : (existing.foto || ''),
        createdAt: existing.createdAt || firebase.database.ServerValue.TIMESTAMP
      };
      return db.ref(path).set({
        tanggal: node.tanggal || dateStr,
        transactions: arr,
        createdAt: node.createdAt || firebase.database.ServerValue.TIMESTAMP
      });
    }).then(function() { return '✅ Transaksi petty cash diperbarui.'; });
  }

  function savePettyCashPengajuan(data) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var details = data.details || [];
    var ref = db.ref('rbm_pro/petty_cash/pengajuan');
    return ref.once('value').then(function(snap) {
      var arr = snap.val();
      if (!Array.isArray(arr)) arr = [];
      details.forEach(function(item) {
        var foto = item.fotoPengajuanUrl || (item.fotoPengajuan && item.fotoPengajuan.data ? 'data:' + (item.fotoPengajuan.mimeType || 'image/png') + ';base64,' + item.fotoPengajuan.data : '') || '';
        arr.push({
          tanggalPengajuan: item.tanggalPengajuan,
          nominal: parseFloat(item.nominal) || 0,
          fotoPengajuan: foto,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
      });
      return ref.set(arr);
    }).then(function() { return '✅ Pengajuan petty cash disimpan di Firebase.'; });
  }

  // ---------- Database barang (pengganti Sheet "Database" - simpanDataOnline) ----------

  function saveDatabaseBarang(dataList) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var updates = {};
    dataList.forEach(function(data) {
      var jenis = (data.jenis || '').toLowerCase().replace(/\s/g, '_');
      var key = 'rbm_pro/database_barang/' + jenis + '/' + (Date.now() + '_' + Math.random().toString(36).slice(2));
      updates[key] = {
        tanggal: data.tanggal,
        nama: data.nama,
        jumlah: data.jumlah,
        barangjadi: data.barangjadi || '',
        keteranganRusak: data.keteranganRusak || '',
        fotoRusak: data.fotoRusakUrl || data.fotoRusak || '',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
    });
    return db.ref().update(updates).then(function() { return '✅ Data barang disimpan di Firebase.'; });
  }

  // ---------- Inventaris (pengganti simpanDataInventaris) ----------
  function getInventarisPath(outletId) {
    var o = outletId || (typeof getRbmOutlet === 'function' && getRbmOutlet()) || (window.getRbmOutlet && window.getRbmOutlet()) || '';
    return 'rbm_pro/inventaris/' + (o || '_default') + '/dates';
  }

  function saveInventaris(dataList, outletId) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    if (!dataList.length) return Promise.resolve('ℹ️ Tidak ada data.');
    var base = getInventarisPath(outletId) + '/';
    var tanggal = dataList[0].tanggal;
    var dateKey = tanggal.replace(/-/g, '_');
    var updates = {};
    dataList.forEach(function(data) {
      updates[base + dateKey + '/' + (data.nama || '').trim()] = parseInt(data.jumlah, 10) || 0;
    });
    return db.ref().update(updates).then(function() { return '✅ Data inventaris disimpan di Firebase.'; });
  }

  function getInventaris(tglAwal, tglAkhir, outletId) {
    if (!init()) return Promise.resolve([]);
    var path = getInventarisPath(outletId);
    return db.ref(path).once('value').then(function(snap) {
      var dates = snap.val();
      if (!dates || typeof dates !== 'object') return [];
      var result = [];
      var start = tglAwal ? tglAwal.replace(/-/g, '_') : '';
      var end = tglAkhir ? tglAkhir.replace(/-/g, '_') : '';
      Object.keys(dates).forEach(function(dateKey) {
        if (tglAwal && dateKey < start) return;
        if (tglAkhir && dateKey > end) return;
        var tanggal = dateKey.replace(/_/g, '-');
        var items = dates[dateKey];
        if (items && typeof items === 'object') {
          Object.keys(items).forEach(function(nama) {
            result.push({ tanggal: tanggal, nama: nama, jumlah: String(items[nama] || 0) });
          });
        }
      });
      return result;
    }).catch(function() { return []; });
  }

  // ---------- Pembukuan (pengganti simpanDataPembukuan - Rekonsiliasi) ----------
  function getPembukuanPath(outletId) {
    var o = outletId || (typeof getRbmOutlet === 'function' && getRbmOutlet()) || (window.getRbmOutlet && window.getRbmOutlet()) || '';
    return 'rbm_pro/pembukuan/' + (o || '_default');
  }

  function savePembukuan(data, outletId) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var o = outletId || '';
    var isTrosoboFlat = (o && String(o).toLowerCase().indexOf('trosobo') >= 0);
    var key = isTrosoboFlat
      ? 'rbm_pro/pembukuan/' + (data.tanggal || Date.now())
      : getPembukuanPath(outletId) + '/' + (data.tanggal || Date.now());
    return db.ref(key).set({
      tanggal: data.tanggal,
      kasMasuk: data.kasMasuk || [],
      kasKeluar: data.kasKeluar || [],
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(function() { return '✅ Data pembukuan disimpan di Firebase.'; });
  }

  /** Pola tanggal YYYY-MM-DD untuk deteksi format flat (tanpa subfolder outlet). */
  function isDateKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
  }

  function getPembukuan(tglAwal, tglAkhir, outletId) {
    if (!init()) return Promise.resolve([]);
    var outLower = (outletId || '').toLowerCase();
    var isTrosobo = outLower.indexOf('trosobo') >= 0;
    // Untuk Trosobo: baca path flat DULU agar data lama + baru (yang sekarang disimpan ke flat) tetap utuh
    if (isTrosobo && db) {
      return db.ref('rbm_pro/pembukuan').once('value').then(function(rootSnap) {
        var root = rootSnap.val();
        if (!root || typeof root !== 'object') return [];
        var keys = Object.keys(root);
        if (keys.length === 0) return [];
        var all = {};
        keys.forEach(function(k) {
          if (isDateKey(k)) {
            all[k] = root[k];
          } else if (outLower.indexOf(k.toLowerCase()) >= 0 || k.toLowerCase().indexOf(outLower) >= 0) {
            var sub = root[k];
            if (sub && typeof sub === 'object') Object.keys(sub).forEach(function(d) { all[d] = sub[d]; });
          }
        });
        if (Object.keys(all).length === 0) return [];
        var g = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
        g._lastPembukuanOutletKey = 'Trosobo';
        return parsePembukuanAll(all, tglAwal, tglAkhir);
      }).catch(function() { return []; });
    }
    var path = getPembukuanPath(outletId);
    return db.ref(path).once('value').then(function(snap) {
      var all = snap.val();
      var effectiveKey = outletId || '_default';
      if ((!all || typeof all !== 'object' || Object.keys(all).length === 0) && db) {
        return db.ref('rbm_pro/pembukuan').once('value').then(function(rootSnap) {
          var root = rootSnap.val();
          if (!root || typeof root !== 'object') return [];
          var keys = Object.keys(root);
          if (keys.length === 0) return [];
          var firstKey = keys[0];
          if (isDateKey(firstKey)) {
            return [];
          }
          all = root[outletId];
          if (!all && outletId) {
            var matchedKey = keys.filter(function(k) {
              var lower = k.toLowerCase();
              var ol = (outletId || '').toLowerCase();
              return lower === ol || ol.indexOf(lower) >= 0 || lower.indexOf(ol) >= 0;
            })[0];
            if (matchedKey && root[matchedKey] && typeof root[matchedKey] === 'object') {
              all = root[matchedKey];
              effectiveKey = matchedKey;
            }
          } else if (all) {
            effectiveKey = outletId;
          }
          if (!all || typeof all !== 'object') return [];
          var g = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
          g._lastPembukuanOutletKey = effectiveKey;
          return parsePembukuanAll(all, tglAwal, tglAkhir);
        }).catch(function() { return []; });
      }
      var g = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
      g._lastPembukuanOutletKey = effectiveKey;
      return parsePembukuanAll(all, tglAwal, tglAkhir);
    }).catch(function() { return []; });
  }

  function parsePembukuanAll(all, tglAwal, tglAkhir) {
    if (!all || typeof all !== 'object') return [];
    var result = [];
    Object.keys(all).forEach(function(key) {
      var p = all[key];
      if (!p || !p.tanggal) return;
      var t = p.tanggal;
      if (tglAwal && t < tglAwal) return;
      if (tglAkhir && t > tglAkhir) return;
      result.push({ payload: { tanggal: p.tanggal, kasMasuk: p.kasMasuk || [], kasKeluar: p.kasKeluar || [] } });
    });
    result.sort(function(a, b) { return (a.payload.tanggal || '').localeCompare(b.payload.tanggal || ''); });
    return result;
  }

  function deletePembukuanDay(outletId, tanggal) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var tg = tanggal || '';
    var isTrosoboFlat = (outletId && String(outletId).toLowerCase().indexOf('trosobo') >= 0);
    var path = isTrosoboFlat
      ? 'rbm_pro/pembukuan/' + tg
      : getPembukuanPath(outletId) + '/' + tg;
    return db.ref(path).remove().then(function() { return '✅ Data pembukuan dihapus.'; });
  }

  // ---------- Pengajuan TF (pengganti simpanDataPengajuanTF) ----------

  function savePengajuanTF(data) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var details = data.details || [];
    var ref = db.ref('rbm_pro/pengajuan_tf');
    return ref.once('value').then(function(snap) {
      var arr = snap.val();
      if (!Array.isArray(arr)) arr = [];
      details.forEach(function(item) {
        var fotoNota = item.fotoNotaUrl || (item.fotoNota && item.fotoNota.data ? 'data:' + (item.fotoNota.mimeType || 'image/png') + ';base64,' + item.fotoNota.data : '');
        var fotoTtd = item.fotoTtdUrl || (item.fotoTtd && item.fotoTtd.data ? 'data:' + (item.fotoTtd.mimeType || 'image/png') + ';base64,' + item.fotoTtd.data : '');
        arr.push({
          tanggal: item.tanggal,
          suplier: item.suplier,
          tglNota: item.tglNota,
          tglJt: item.tglJt,
          nominal: parseFloat(item.nominal) || 0,
          total: parseFloat(item.total) || 0,
          bankAcc: item.bankAcc,
          atasNama: item.atasNama,
          keterangan: item.keterangan,
          fotoNotaUrl: fotoNota,
          fotoTtdUrl: fotoTtd,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
      });
      return ref.set(arr);
    }).then(function() { return '✅ Pengajuan TF disimpan di Firebase.'; });
  }

  // ---------- Pengajuan Bukti TF (pengganti simpanDataSudahTF) ----------

  function savePengajuanBuktiTF(data) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var details = data.details || [];
    var ref = db.ref('rbm_pro/pengajuan_bukti_tf');
    return ref.once('value').then(function(snap) {
      var arr = snap.val();
      if (!Array.isArray(arr)) arr = [];
      details.forEach(function(item) {
        var foto = item.fotoBuktiUrl || (item.fotoBukti && item.fotoBukti.data ? 'data:' + (item.fotoBukti.mimeType || 'image/png') + ';base64,' + item.fotoBukti.data : '') || '';
        arr.push({
          tanggalPengajuan: item.tanggalPengajuan,
          fotoBuktiUrl: foto,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
      });
      return ref.set(arr);
    }).then(function() { return '✅ Bukti TF disimpan di Firebase.'; });
  }

  // ---------- Bank (pengganti getDataBankBySuplier) ----------

  function getBankBySuplier(namaSuplier) {
    if (!init()) return Promise.resolve(null);
    return db.ref('rbm_pro/bank').once('value').then(function(snap) {
      var val = snap.val();
      if (!val || typeof val !== 'object') return null;
      var name = (namaSuplier || '').trim().toLowerCase();
      for (var key in val) {
        if (Object.prototype.hasOwnProperty.call(val, key) && key.toLowerCase() === name) {
          var o = val[key];
          return { noRekening: o.noRekening, namaPemilik: o.namaPemilik };
        }
      }
      if (val.nama && val.noRekening && val.namaPemilik) return { noRekening: val.noRekening, namaPemilik: val.namaPemilik };
      return null;
    }).catch(function() { return null; });
  }

  function setBankList(list) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var obj = {};
    (list || []).forEach(function(item) {
      var nama = (item.nama || item.suplier || '').trim();
      if (nama) obj[nama.toLowerCase()] = { noRekening: item.noRekening || '', namaPemilik: item.namaPemilik || '' };
    });
    return db.ref('rbm_pro/bank').set(obj).then(function() { return '✅ Daftar bank disimpan.'; });
  }

  // ---------- Pending RBM (RBM_PENDING_*) → rbm_pro/pending ----------

  function getPending(type) {
    var path = 'rbm_pro/pending/' + (type || 'PETTY_CASH');
    if (!init()) return Promise.resolve([]);
    return db.ref(path).once('value').then(function(snap) {
      var v = snap.val();
      return Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
    }).catch(function() { return []; });
  }

  function setPending(type, value) {
    var key = 'RBM_PENDING_' + (type || 'PETTY_CASH');
    if (!init()) return Promise.resolve();
    return db.ref('rbm_pro/pending/' + (type || 'PETTY_CASH')).set(Array.isArray(value) ? value : []).catch(function(err) { console.warn('setPending failed', err); });
  }

  // ---------- Sync dari Firebase ke localStorage (saat load) ----------
  function syncAppStateFromFirebase() {
    if (!init()) return Promise.resolve();
    var promises = [];
    Object.keys(APP_STATE_KEYS).forEach(function(key) {
      var path = APP_STATE_KEYS[key];
      promises.push(db.ref(path).once('value').then(function(snap) {
        var v = snap.val();
        if (v !== undefined && v !== null) {
          var str = typeof v === 'object' ? JSON.stringify(v) : String(v);
          try { localStorage.setItem(key, str); } catch (e) {}
        }
      }).catch(function() {}));
    });
    return Promise.all(promises);
  }

  // ---------- Patch localStorage: RBM_* HANYA di Firebase (tidak disimpan di localStorage) ----------
  function patchLocalStorageForFirebase() {
    var origSetItem = Storage.prototype.setItem;
    var origRemoveItem = Storage.prototype.removeItem;
    var origGetItem = Storage.prototype.getItem;

    Storage.prototype.setItem = function(key, value) {
      if (key && key.indexOf('RBM_') === 0) {
        if (global.RBMStorage && global.RBMStorage.isUsingFirebase && global.RBMStorage.isUsingFirebase()) {
          try { global.RBMStorage.setItem(key, value); } catch (e) {}
        } else {
          origSetItem.call(this, key, value);
        }
        return;
      }
      origSetItem.call(this, key, value);
      if (!key) return;
      if (key.indexOf('rbm_') === 0 && init()) {
        var path = APP_STATE_KEYS[key];
        if (path) {
          var toSet = value;
          try { if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) toSet = JSON.parse(value); } catch (e) {}
          db.ref(path).set(toSet).catch(function(err) { console.warn('firebase-storage patch setItem failed', key, err); });
        }
      }
    };

    Storage.prototype.getItem = function(key) {
      if (key && key.indexOf('RBM_') === 0 && global.RBMStorage) {
        if (global.RBMStorage.isUsingFirebase && global.RBMStorage.isUsingFirebase()) {
          try {
            var v = global.RBMStorage.getItem(key);
            return v !== null && v !== undefined ? v : null;
          } catch (e) {}
        }
        return origGetItem.call(this, key);
      }
      return origGetItem.call(this, key);
    };

    Storage.prototype.removeItem = function(key) {
      if (key && key.indexOf('RBM_') === 0) {
        if (global.RBMStorage && global.RBMStorage.isUsingFirebase && global.RBMStorage.isUsingFirebase()) {
          try { global.RBMStorage.setItem(key, ''); } catch (e) {}
        } else {
          origRemoveItem.call(this, key);
        }
        return;
      }
      origRemoveItem.call(this, key);
      if (!key) return;
      if (key.indexOf('rbm_') === 0 && init()) {
        var path = APP_STATE_KEYS[key];
        if (path) db.ref(path).remove().catch(function() {});
      }
    };
  }

  /** Jalankan sekali: init, sync dari Firebase, lalu patch localStorage agar semua tulis ke Firebase. */
  function enableFirebaseForAllStorage() {
    init();
    syncAppStateFromFirebase().then(function() { patchLocalStorageForFirebase(); }).catch(function() { patchLocalStorageForFirebase(); });
  }

  // ---------- Export ----------

  var FirebaseStorage = {
    init: init,
    isReady: function() { return useFirebase && db !== null; },
    syncAppStateFromFirebase: syncAppStateFromFirebase,
    patchLocalStorageForFirebase: patchLocalStorageForFirebase,
    enableFirebaseForAllStorage: enableFirebaseForAllStorage,
    getAppState: getAppState,
    setAppState: setAppState,
    removeAppState: removeAppState,
    getActiveSession: getActiveSession,
    setActiveSession: setActiveSession,
    getPettyCash: getPettyCash,
    savePettyCashTransactions: savePettyCashTransactions,
    deletePettyCashByDateAndIndex: deletePettyCashByDateAndIndex,
    getPettyCashFullList: getPettyCashFullList,
    updatePettyCashTransactionByDateAndIndex: updatePettyCashTransactionByDateAndIndex,
    savePettyCashPengajuan: savePettyCashPengajuan,
    saveDatabaseBarang: saveDatabaseBarang,
    saveInventaris: saveInventaris,
    getInventaris: getInventaris,
    savePembukuan: savePembukuan,
    getPembukuan: getPembukuan,
    deletePembukuanDay: deletePembukuanDay,
    savePengajuanTF: savePengajuanTF,
    savePengajuanBuktiTF: savePengajuanBuktiTF,
    getBankBySuplier: getBankBySuplier,
    setBankList: setBankList,
    getPending: getPending,
    setPending: setPending,
    db: function() { return db; },
    APP_STATE_KEYS: APP_STATE_KEYS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = FirebaseStorage;
  else global.FirebaseStorage = FirebaseStorage;

  // Otomatis aktifkan: sync dari Firebase + patch localStorage agar semua tulis ke Firebase
  if (global.document && global.addEventListener) {
    function run() { FirebaseStorage.enableFirebaseForAllStorage(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else setTimeout(run, 0);
  }
})(typeof window !== 'undefined' ? window : this);
