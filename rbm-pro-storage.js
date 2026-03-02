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
        for (var c in this._cache) {
          if (Object.prototype.hasOwnProperty.call(this._cache, c) && c.indexOf(prefix) === 0) {
            var subKey = c.slice(prefix.length);
            rebuilt[subKey] = this._cache[c];
          }
        }
        if (Object.keys(rebuilt).length > 0) return JSON.stringify(rebuilt);
        return null;
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
    }
  };

  window.RBMStorage = RBMStorage;
})();
