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
    databaseURL: 'https://ricebowlmonst-default-rtdb.firebaseio.com',
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

  // ---------- Petty Cash (pengganti Sheet "Pety Cash") ----------

  function getPettyCash(tanggalAwal, tanggalAkhir) {
    if (!init()) return Promise.resolve({ data: [], summary: { totalDebit: 0, totalKredit: 0, saldoAkhir: 0 } });
    return db.ref('rbm_pro/petty_cash/transactions').once('value').then(function(snap) {
      var raw = snap.val();
      var list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
      var tglAwal = tanggalAwal ? new Date(tanggalAwal) : null;
      var tglAkhir = tanggalAkhir ? new Date(tanggalAkhir) : null;
      if (tglAkhir) tglAkhir.setHours(23, 59, 59, 999);
      var filtered = [];
      var totalDebit = 0, totalKredit = 0;
      var runningSaldo = 0;
      list.forEach(function(row) {
        var t = row.tanggal || row.date;
        if (!t) return;
        var d = t instanceof Date ? t : new Date(t);
        d.setHours(0, 0, 0, 0);
        if (tglAwal && d < tglAwal) return;
        if (tglAkhir && d > tglAkhir) return;
        var debit = parseFloat(row.debit || row.keluar || 0) || 0;
        var kredit = parseFloat(row.kredit || row.masuk || 0) || 0;
        runningSaldo = (parseFloat(row.saldo) || runningSaldo) - debit + kredit;
        filtered.push({
          no: row.no,
          tanggal: row.tanggalStr || (d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear()),
          nama: row.nama,
          jumlah: row.jumlah,
          satuan: row.satuan,
          harga: row.harga,
          debit: debit,
          kredit: kredit,
          saldo: runningSaldo,
          foto: row.foto || ''
        });
        totalDebit += debit;
        totalKredit += kredit;
      });
      var saldoAkhir = filtered.length ? (filtered[filtered.length - 1].saldo || 0) : 0;
      return { data: filtered, summary: { totalDebit: totalDebit, totalKredit: totalKredit, saldoAkhir: saldoAkhir } };
    }).catch(function(err) {
      console.warn('getPettyCash failed', err);
      return { data: [], summary: {} };
    });
  }

  function savePettyCashTransactions(data) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var list = (data.transactions || []).map(function(trx) {
      return {
        tanggal: data.tanggal,
        date: data.tanggal,
        nama: trx.nama,
        jumlah: trx.jumlah,
        satuan: trx.satuan || '',
        harga: parseFloat(trx.harga) || 0,
        keluar: data.jenis === 'pengeluaran' ? (parseFloat(trx.jumlah) || 0) * (parseFloat(trx.harga) || 0) : 0,
        masuk: data.jenis !== 'pengeluaran' ? (parseFloat(trx.jumlah) || 0) : 0,
        debit: data.jenis === 'pengeluaran' ? (parseFloat(trx.jumlah) || 0) * (parseFloat(trx.harga) || 0) : 0,
        kredit: data.jenis !== 'pengeluaran' ? (parseFloat(trx.jumlah) || 0) : 0,
        foto: trx.fotoUrl || trx.foto || '',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
    });
    return db.ref('rbm_pro/petty_cash/transactions').transaction(function(current) {
      var arr = Array.isArray(current) ? current.slice() : [];
      list.forEach(function(item) { arr.push(item); });
      return arr;
    }).then(function() { return '✅ Transaksi petty cash disimpan di Firebase.'; });
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

  function saveInventaris(dataList) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    if (!dataList.length) return Promise.resolve('ℹ️ Tidak ada data.');
    var tanggal = dataList[0].tanggal;
    var dateKey = tanggal.replace(/-/g, '_');
    var updates = {};
    dataList.forEach(function(data) {
      updates['rbm_pro/inventaris/dates/' + dateKey + '/' + (data.nama || '').trim()] = parseInt(data.jumlah, 10) || 0;
    });
    return db.ref().update(updates).then(function() { return '✅ Data inventaris disimpan di Firebase.'; });
  }

  // ---------- Pembukuan (pengganti simpanDataPembukuan - Rekonsiliasi) ----------

  function savePembukuan(data) {
    if (!init()) return Promise.reject(new Error('Firebase tidak tersedia'));
    var key = 'rbm_pro/pembukuan/' + (data.tanggal || Date.now());
    return db.ref(key).set({
      tanggal: data.tanggal,
      kasMasuk: data.kasMasuk || [],
      kasKeluar: data.kasKeluar || [],
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(function() { return '✅ Data pembukuan disimpan di Firebase.'; });
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
    getPettyCash: getPettyCash,
    savePettyCashTransactions: savePettyCashTransactions,
    savePettyCashPengajuan: savePettyCashPengajuan,
    saveDatabaseBarang: saveDatabaseBarang,
    saveInventaris: saveInventaris,
    savePembukuan: savePembukuan,
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
