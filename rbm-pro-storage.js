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
    databaseURL: 'https://ricebowlmonst-default-rtdb.firebaseio.com',
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
    // Samakan konversi karakter khusus dengan yang ada di loadFromFirebase
    return key.replace(/^RBM_/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
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
      
      // [PERBAIKAN] Deteksi Outlet Aktif agar Firebase mendownload data yang tepat (misal: employees_sidoarjo)
      var outlet = '';
      try {
         var params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
         var urlOutlet = params ? params.get('outlet') : null;
         if (urlOutlet) outlet = urlOutlet.trim();
         var el = typeof document !== 'undefined' ? document.getElementById('rbm-outlet-select') : null;
         if (!outlet) outlet = (el && el.value) ? el.value : (localStorage.getItem('rbm_last_selected_outlet') || '');
         if (!outlet) {
             var outlets = JSON.parse(localStorage.getItem('rbm_outlets') || '[]');
             if (outlets.length) outlet = outlets[0];
         }
      } catch(e) {}
      var sfx = outlet ? '_' + outlet.toLowerCase().replace(/[^a-z0-9]/g, '_') : '';

      var nodesToLoad = ['employees' + sfx, 'gps_config' + sfx, 'gps_jam_config' + sfx, 'employees']; 
      if (outlet) nodesToLoad.push(outlet); // Load format lama rbm_pro/sidoarjo just in case
      var page = typeof window !== 'undefined' ? (window.RBM_PAGE || '') : '';
      
      if (page === 'absensi-gps-view') {
          // [OPTIMASI KILAT] Di HP karyawan, JANGAN load data berat seperti absensi_data, gaji, bonus
          nodesToLoad.push('jadwal_data' + sfx, 'gps_logs' + sfx);
      } else if (page.indexOf('absensi') >= 0 || page.indexOf('jadwal') >= 0) {
          // [FIX] Gunakan absensi_data & jadwal_data agar cocok dengan nama saat disimpan
          nodesToLoad.push('absensi_data' + sfx, 'jadwal_data' + sfx, 'jadwal_notes', 'gaji', 'bonus', 'gps_logs' + sfx, 'gps_logs');
      } else if (page.indexOf('petty-cash') >= 0) {
          // [OPTIMASI KILAT] Jangan load seluruh petty_cash karena data sangat besar dan sudah diload otomatis sesuai tanggal
      } else if (page.indexOf('barang') >= 0 || page.indexOf('stok') >= 0) {
          nodesToLoad.push('stok_items' + sfx);
      } else if (page.indexOf('pembukuan') >= 0 || page.indexOf('keuangan') >= 0) {
          nodesToLoad.push('bank');
      } else if (page.indexOf('inventaris') >= 0) {
          // Jangan load inventaris secara global
      } else if (page.indexOf('pengajuan') >= 0) {
          // Jangan load pengajuan secara global
      } else {
          nodesToLoad.push('stok_items' + sfx, 'absensi' + sfx); // Fallback standar
      }

      // Hapus duplikat node jika ada
      var uniqueNodes = [];
      nodesToLoad.forEach(function(n) { if (uniqueNodes.indexOf(n) === -1) uniqueNodes.push(n); });

      var promises = uniqueNodes.map(function(node) {
          // [OPTIMASI KILAT] Batasi unduhan foto GPS maksimal 500 data terakhir agar loading instan
          if (node.indexOf('gps_logs') === 0) {
              var limit = (page === 'absensi-gps-view') ? 50 : 500; // HP Karyawan cukup 50 data terakhir agar kilat
              return self._db.ref('rbm_pro/' + node).limitToLast(limit).once('value').then(function(snap) {
                  return { key: node, val: snap.val() };
              });
          }
          // Unduhan standar untuk node lainnya
          return self._db.ref('rbm_pro/' + node).once('value').then(function(snap) {
              return { key: node, val: snap.val() };
          });
      });

      this._readyPromise = Promise.all(promises).then(function(results) {
        var rootVal = {};
        results.forEach(function(res) {
            if (res.val !== null) {
                var parts = res.key.split('/');
                var curr = rootVal;
                for(var i=0; i<parts.length-1; i++){ if(!curr[parts[i]]) curr[parts[i]]={}; curr=curr[parts[i]]; }
                curr[parts[parts.length-1]] = res.val;
            }
        });
        
        self._cache = rootVal;
        
        try {
          if (rootVal.employees) localStorage.setItem('RBM_EMPLOYEES_ALL', JSON.stringify(rootVal.employees));
          
          if (sfx) {
              var empKey = 'employees' + sfx;
              if (rootVal[empKey]) localStorage.setItem('RBM_EMPLOYEES' + sfx, JSON.stringify(rootVal[empKey]));
              
              var gpsKey = 'gps_config' + sfx;
              if (rootVal[gpsKey]) localStorage.setItem('RBM_GPS_CONFIG' + sfx, JSON.stringify(rootVal[gpsKey]));
              
              var jamKey = 'gps_jam_config' + sfx;
              if (rootVal[jamKey]) localStorage.setItem('RBM_GPS_JAM_CONFIG' + sfx, JSON.stringify(rootVal[jamKey]));
          }
        } catch(e) {}
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
        var self = this;
        var getFromCache = function(targetPath) {
            var parts = targetPath.split('/');
            var curr = self._cache;
            for (var i = 0; i < parts.length; i++) {
                if (curr && typeof curr === 'object' && curr.hasOwnProperty(parts[i])) {
                    curr = curr[parts[i]];
                } else {
                    return null;
                }
            }
            var v = curr;
            var isEmpty = v === undefined || v === null ||
              (Array.isArray(v) && v.length === 0) ||
              (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
            if (isEmpty) return null;
            
            // Perbaikan Krusial: Transformasi Object Firebase kembali menjadi Array
            if (typeof v === 'object' && !Array.isArray(v)) {
                var ks = Object.keys(v);
                var isArrayLike = ks.length > 0 && ks.every(function(k) { return !isNaN(k); });
                if (isArrayLike) {
                    var arr = [];
                    ks.forEach(function(k) { arr[Number(k)] = v[k]; });
                    v = arr.filter(function(x) { return x !== null && x !== undefined; });
                } else if (targetPath.indexOf('employees') >= 0) {
                    // [FIX] Paksa konversi Object berantakan menjadi Array berurutan
                    var arr2 = [];
                    ks.forEach(function(k) { arr2.push(v[k]); });
                    v = arr2;
                }
            }
            return typeof v === 'string' ? v : JSON.stringify(v);
        };

        var val = getFromCache(path);
        if (val !== null) return val;

        // Auto-Fallback ke data format lama (contoh: rbm_pro/sidoarjo/employees)
        var rawOutlet = '';
        try {
            var el = typeof document !== 'undefined' ? document.getElementById('rbm-outlet-select') : null;
            rawOutlet = (el && el.value) ? el.value : (localStorage.getItem('rbm_last_selected_outlet') || '');
        } catch(e) {}
        if (rawOutlet) {
            if (path.indexOf('employees_') === 0) { var fb = getFromCache(rawOutlet + '/employees'); if (fb) return fb; }
            if (path.indexOf('absensi_data_') === 0) { var fb = getFromCache(rawOutlet + '/absensi_data'); if (fb) return fb; }
            if (path.indexOf('jadwal_data_') === 0) { var fb = getFromCache(rawOutlet + '/jadwal_data'); if (fb) return fb; }
            if (path.indexOf('gps_logs_') === 0) { var fb = getFromCache(rawOutlet + '/gps_logs'); if (fb) return fb; }
        }

        // Auto-Fallback ke Data Master jika cabang baru
        if (path.indexOf('employees_') === 0) { var fb = getFromCache('employees'); if (fb) return fb; }
        if (path.indexOf('stok_items_') === 0) { var fb = getFromCache('stok_items'); if (fb) return fb; }
        if (path.indexOf('gps_config_') === 0) { var fb = getFromCache('gps_config'); if (fb) return fb; }
        if (path.indexOf('gps_jam_config_') === 0) { var fb = getFromCache('gps_jam_config'); if (fb) return fb; }

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
        try { if (typeof value === 'string') toSet = JSON.parse(value); } catch (e) { toSet = value; }
        
        var parts = path.split('/');
        var curr = this._cache;
        for (var i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
        }
        curr[parts[parts.length - 1]] = toSet;
        
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
