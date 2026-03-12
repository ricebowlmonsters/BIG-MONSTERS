/**
 * RBM Pro Storage: Firebase (Data & Storage) atau fallback localStorage
 * Data tersimpan di Firebase Realtime Database under /rbm_pro dan tampil di halaman Data & Penyimpanan.
 */
(function() {
  var _origSetItem = Storage.prototype.setItem;
  var _origGetItem = Storage.prototype.getItem;

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

  function getConnections() {
    try {
      var stored = localStorage.getItem('rbm_db_connections');
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  function getActiveConnection() {
    var idx = parseInt(localStorage.getItem('rbm_active_connection_index') || '0', 10);
    var conns = getConnections();
    if (conns.length && conns[idx] && conns[idx].config) return conns[idx].config;
    if (conns.length && conns[0].config) return conns[0].config;
    return DEFAULT_FIREBASE_CONFIG;
  }

  function keyToPath(key) {
    if (key.indexOf('RBM_') !== 0) return key.replace(/^RBM_/, '').toLowerCase().replace(/_/g, '_');
    if (key.indexOf('RBM_GAJI_') === 0) return 'gaji/' + key.slice(9);
    if (key.indexOf('RBM_BONUS_') === 0) return 'bonus/' + key.slice(10);
    if (key.indexOf('RBM_JADWAL_NOTE_') === 0) return 'jadwal_notes/' + key.slice(16);
    return key.replace(/^RBM_/, '').toLowerCase();
  }

  function flattenToCache(obj, prefix, out) {
    prefix = prefix || '';
    out = out || {};
    if (obj === null || obj === undefined) return out;
    if (Array.isArray(obj)) { out[prefix.replace(/\/$/, '')] = obj; return out; }
    if (typeof obj !== 'object') { out[prefix.replace(/\/$/, '')] = obj; return out; }
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var full = prefix + k;
      var v = obj[k];
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && typeof v.getMonth !== 'function') {
        flattenToCache(v, full + '/', out);
      } else {
        out[full] = v;
      }
    }
    return out;
  }

  var RBMStorage = {
    _cache: {},
    _db: null,
    _useFirebase: false,
    _readyPromise: null,

    init: function() {
      var conn = getActiveConnection();
      if (!conn) return;
      if (conn.type === 'local' || conn.type === 'server') return;
      try {
        if (typeof firebase === 'undefined') return;
        if (!firebase.apps.length) firebase.initializeApp(conn);
        this._db = firebase.database();
        this._useFirebase = true;
      } catch (e) {
        console.warn('RBM Storage: Firebase init failed', e);
      }
      this._initDevTools(); // [DEV] Cek apakah mode developer aktif
    },

    loadFromFirebase: function() {
      var self = this;
      if (!this._db) {
        this._readyPromise = Promise.resolve();
        return this._readyPromise;
      }
      this._readyPromise = this._db.ref('rbm_pro').once('value').then(function(snap) {
        var val = snap.val();
        if (val && typeof val === 'object') {
          self._cache = flattenToCache(val, '', {});
          
          // [PERBAIKAN] Cache data penting ke localStorage agar load halaman berikutnya instan
          try {
            // Cache Employees (Global & Per Outlet)
            Object.keys(self._cache).forEach(function(k) {
              if (k === 'employees' || k.indexOf('employees_') === 0) {
                var localKey = 'RBM_' + k.toUpperCase();
                localStorage.setItem(localKey, JSON.stringify(self._cache[k]));
              }
              // Cache Konfigurasi GPS
              if (k === 'gps_config' || k.indexOf('gps_config_') === 0) {
                var localKey = 'RBM_' + k.toUpperCase();
                localStorage.setItem(localKey, JSON.stringify(self._cache[k]));
              }
              // Cache Shift/Jam Kerja
              if (k === 'gps_jam_config' || k.indexOf('gps_jam_config_') === 0) {
                var localKey = 'RBM_' + k.toUpperCase();
                localStorage.setItem(localKey, JSON.stringify(self._cache[k]));
              }
            });
          } catch(e) { console.warn('Cache to localStorage failed', e); }
        }
        // [FIREBASE ONLY] Data RBM Pro hanya dari Firebase, tidak merge dari localStorage
      }).catch(function(err) {
        console.warn('RBM Storage: load failed', err);
        self._useFirebase = false;
      });
      return this._readyPromise;
    },

    ready: function() {
      var self = this;
      if (this._readyPromise) return this._readyPromise;
      this.init();
      return this.loadFromFirebase();
    },

    getItem: function(key) {
      if (!key || key.indexOf('RBM_') !== 0) return _origGetItem.call(localStorage, key);
      var path = keyToPath(key);
      if (this._useFirebase) {
        if (this._cache.hasOwnProperty(path)) {
          var v = this._cache[path];
          var isEmpty = v === undefined || v === null ||
            (Array.isArray(v) && v.length === 0) ||
            (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
          if (!isEmpty) return typeof v === 'string' ? v : JSON.stringify(v);
        }
        var prefix = path + '/';
        var rebuilt = {};
        var hasPrefixData = false;
        for (var c in this._cache) {
          if (Object.prototype.hasOwnProperty.call(this._cache, c) && c.indexOf(prefix) === 0) {
            hasPrefixData = true;
            var subKey = c.slice(prefix.length);
            rebuilt[subKey] = this._cache[c];
          }
        }
        if (hasPrefixData && Object.keys(rebuilt).length > 0) return JSON.stringify(rebuilt);
        // [FIX] Jika tidak ada di cache Firebase, coba ambil dari localStorage sebagai fallback
        // Ini penting agar UI bisa load cepat saat pertama kali buka halaman.
        return _origGetItem.call(localStorage, key);
      }
      return _origGetItem.call(localStorage, key);
    },

    isUsingFirebase: function() {
      return !!this._useFirebase;
    },

    setItem: function(key, value) {
      if (!key || key.indexOf('RBM_') !== 0) {
        try { localStorage.setItem(key, value); } catch (e) { console.warn('setItem failed', key, e); }
        return Promise.resolve();
      }
      var path = keyToPath(key);
      if (this._useFirebase && this._db) {
        var toSet = value;
        try {
          if (typeof value === 'string') toSet = JSON.parse(value);
        } catch (e) { toSet = value; }
        this._cache[path] = toSet;
        
        // [PERBAIKAN] Simpan juga ke localStorage untuk cache offline/startup cepat
        // Khusus untuk data master yang sering dibaca (Karyawan, Config)
        if (key.indexOf('RBM_EMPLOYEES') === 0 || key.indexOf('RBM_GPS_') === 0) {
           try { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); } catch(e) {}
        }

        var refPath = 'rbm_pro/' + path.replace(/\//g, '/');
        return this._db.ref(refPath).set(toSet);
      }
      try {
        _origSetItem.call(localStorage, key, value);
      } catch (e) {
        if (e && e.name === 'QuotaExceededError') {
          alert('Penyimpanan penuh. Pastikan koneksi Firebase aktif agar data disimpan ke cloud.');
        } else {
          alert('Gagal menyimpan.');
        }
      }
      return Promise.resolve();
    },

    // =========================================================================
    // [FITUR RAHASIA DEVELOPER] - Import Excel Absensi
    // Cara Pakai: Buka Console (F12), ketik: RBMStorage.enableDevMode()
    // =========================================================================
    
    enableDevMode: function() {
      localStorage.setItem('RBM_DEV_MODE', 'true');
      alert('✅ Developer Mode AKTIF. Tombol Import akan muncul di pojok kanan bawah.\nSilakan Refresh halaman.');
    },

    disableDevMode: function() {
      localStorage.removeItem('RBM_DEV_MODE');
      alert('❌ Developer Mode NON-AKTIF.');
      location.reload();
    },

    _initDevTools: function() {
      if (localStorage.getItem('RBM_DEV_MODE') !== 'true') return;

      // [DEV] Inject tombol Import ke header halaman Absensi (Input Absensi Manual)
      // Menggunakan interval karena halaman mungkin SPA (Single Page App) yang berubah kontennya
      var self = this;
      setInterval(function() {
        // Cari header yang mengandung kata "Absensi" atau "Input Absensi"
        // [DEV] Tambahkan selector h3 untuk menangkap header modal/section kecil
        var headers = document.querySelectorAll('.page-header h2, h1.rbm-page-title, h3');
        headers.forEach(function(h) {
          // Cek apakah ini header yang tepat dan belum ada tombolnya
          if ((h.innerText.includes('Absensi') || h.innerText.includes('Jadwal') || h.innerText.includes('Input Absensi')) && !h.querySelector('#rbm-dev-import-btn')) {
            var btn = document.createElement('button');
            btn.id = 'rbm-dev-import-btn';
            btn.innerHTML = '📥 Import (Dev)';
            btn.style.marginLeft = '15px';
            btn.style.background = '#2e7d32'; // Hijau Excel
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.padding = '4px 8px';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '12px';
            btn.style.verticalAlign = 'middle';
            btn.title = 'Fitur Developer: Import Data Absensi dari Excel';
            btn.onclick = function() { self.importAbsensiExcel(); };
            h.appendChild(btn);
          }
        });
      }, 1000);
    },

    importAbsensiExcel: function() {
      // 1. Load Library SheetJS (XLSX) jika belum ada
      if (typeof XLSX === 'undefined') {
        var script = document.createElement('script');
        script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
        script.onload = () => { this.importAbsensiExcel(); };
        document.head.appendChild(script);
        console.log('⏳ Mengunduh library Excel...');
        return;
      }

      // 2. Buat input file hidden
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx, .xls, .csv';
      input.style.display = 'none';
      
      input.onchange = (e) => {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = (e) => {
          try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, {type: 'array'});
            var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            // Konversi ke JSON
            var jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
              alert('File Excel kosong!');
              return;
            }

            console.log('📄 Data Excel Terbaca:', jsonData);
            
            // [DEV] Deteksi Format: GPS Logs vs Rekap Absensi
            var firstRow = jsonData[0];
            var isGpsLog = firstRow && (firstRow.hasOwnProperty('Tipe') || firstRow.hasOwnProperty('Type') || firstRow.hasOwnProperty('Jam') || firstRow.hasOwnProperty('Time'));

            if (isGpsLog) {
              // --- IMPORT GPS LOGS (Untuk Input Absensi Manual) ---
              var outletSelect = document.getElementById('rbm-outlet-select');
              var outletId = outletSelect ? outletSelect.value : '';
              var storageKey = outletId ? 'RBM_GPS_LOGS_' + outletId : 'RBM_GPS_LOGS';

              // Ambil data lama
              var existingRaw = this.getItem(storageKey);
              var existing = [];
              try { existing = existingRaw ? JSON.parse(existingRaw) : []; } catch(e) {}

              var newLogs = jsonData.map(function(row) {
                return {
                  id: Date.now() + Math.random(),
                  date: row['Tanggal'] || row['Date'] || new Date().toISOString().slice(0,10),
                  time: row['Jam'] || row['Time'] || '00:00:00',
                  name: row['Nama'] || row['Name'] || 'Unknown',
                  type: row['Tipe'] || row['Type'] || 'Masuk',
                  lat: row['Lat'] || null,
                  lng: row['Lng'] || null,
                  photo: row['Foto'] || row['Photo'] || '',
                  manualEntry: true
                };
              });

              var combined = existing.concat(newLogs);
              this.setItem(storageKey, JSON.stringify(combined)).then(function() {
                alert('✅ Berhasil Import ' + newLogs.length + ' data GPS Logs ke ' + storageKey);
                location.reload();
              });

            } else {
              // --- IMPORT REKAP ABSENSI (Format Lama) ---
              this.setItem('RBM_ABSENSI', JSON.stringify(jsonData)).then(function() {
                alert('✅ Berhasil Import ' + jsonData.length + ' data rekap absensi!\nData tersimpan di key: RBM_ABSENSI');
                location.reload();
              });
            }

          } catch (err) {
            console.error(err);
            alert('Gagal memproses file: ' + err.message);
          }
        };
        reader.readAsArrayBuffer(file);
      };

      input.click();
    }
  };

  window.RBMStorage = RBMStorage;
})();
