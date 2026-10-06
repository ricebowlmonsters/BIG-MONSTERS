(function () {
  'use strict';

  var endpoint = String(localStorage.getItem('hpp_kitchen_sheets_url') || window.HPP_KITCHEN_SHEETS_URL || '').trim();
  var lastSynced = null;
  var applyingRemote = false;
  var sheetReady = false;
  var firebaseSanitized = false;
  var currentStatus = '';
  var currentConnected = false;
  var pollGeneration = 0;
  var pollInProgress = false;
  function kitchenMaterials() {
    return typeof window.getKitchenMaterialsForSheets === 'function' ? window.getKitchenMaterialsForSheets() : [];
  }

  function fingerprint(items) {
    return JSON.stringify(items.map(function (item) {
      return [item.code, item.name, item.category, item.unit, Number(item.price) || 0];
    }));
  }

  function normalizeKitchenMaterials(items) {
    return items.map(function (item, index) {
      var code = String(item.code || '').trim();
      if (!/^BB\.DAPUR\./i.test(code)) {
        var suffix = /^\d+$/.test(code) ? code.padStart(4, '0') : code || String(index + 1).padStart(4, '0');
        code = 'BB.DAPUR.' + suffix;
      }
      return Object.assign({}, item, { code: code });
    });
  }

  function setStatus(message, connected) {
    var live = document.querySelector('.live');
    if (!live) return;
    currentStatus = message;
    currentConnected = connected;
    var dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = connected ? '#2aa775' : '#c38d1d';
    live.replaceChildren(dot, document.createTextNode(' ' + message));
  }

  var liveStatus = document.querySelector('.live');
  if (liveStatus && window.MutationObserver) {
    new MutationObserver(function () {
      if (currentStatus && liveStatus.textContent.trim() !== currentStatus) setStatus(currentStatus, currentConnected);
    }).observe(liveStatus, { childList: true, characterData: true, subtree: true });
  }

  function applyRemote(items) {
    var normalizedItems = normalizeKitchenMaterials(items);
    var remoteFingerprint = fingerprint(normalizedItems);
    if (remoteFingerprint === fingerprint(kitchenMaterials())) {
      lastSynced = remoteFingerprint;
      return true;
    }
    applyingRemote = true;
    try {
      if (typeof window.applyKitchenMaterialsFromSheets !== 'function') return false;
      window.applyKitchenMaterialsFromSheets(normalizedItems);
    } finally {
      applyingRemote = false;
    }
    if (kitchenMaterials().length !== normalizedItems.length) {
      lastSynced = fingerprint(kitchenMaterials());
      setStatus('Jumlah bahan tidak cocok; Sheet tidak diubah untuk mencegah data hilang.', false);
      return false;
    }
    lastSynced = remoteFingerprint;
    return true;
  }

  function readSheet(onResult, onError) {
    if (!endpoint) return onError(new Error('URL deployment Apps Script belum diatur.'));
    var requestedEndpoint = endpoint;
    var callbackName = '__hppKitchenSheets' + Date.now() + Math.floor(Math.random() * 1000);
    var script = document.createElement('script');
    var timeout = window.setTimeout(function () { finish(new Error('Waktu baca Google Sheets habis.')); }, 12000);
    function finish(error, result) {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
      if (error) onError(error); else onResult(result);
    }
    window[callbackName] = function (result) { finish(null, result); };
    script.onerror = function () { finish(new Error('Google menolak akses. Login ke akun Google yang punya akses Editor ke Sheet pada browser ini; jika masih gagal, periksa akses deployment Web app.')); };
    var spreadsheetId = localStorage.getItem('hpp_kitchen_spreadsheet_id') || '';
    script.src = requestedEndpoint + (requestedEndpoint.indexOf('?') === -1 ? '?' : '&') +
      'action=getKitchenMaterials&callback=' + callbackName +
      (spreadsheetId ? '&spreadsheetId=' + encodeURIComponent(spreadsheetId) : '') +
      '&_=' + Date.now();
    document.head.appendChild(script);
  }

  function poll() {
    if (pollInProgress) return;
    if (!endpoint) {
      setStatus('Google Sheets belum dikonfigurasi', false);
      return;
    }
    pollInProgress = true;
    var generation = pollGeneration;
    readSheet(function (result) {
      pollInProgress = false;
      if (generation !== pollGeneration) return;
      if (!result || result.status !== 'success') {
        var message = result && result.message || 'respons tidak valid';
        if (/illegal spreadsheet id or key/i.test(message)) {
          message += ' — Web App belum memakai versi Apps Script terbaru atau masih membuka spreadsheet ID lama.';
        }
        setStatus('Google Sheets: ' + message, false);
        return;
      }
      sheetReady = true;
      var items = normalizeKitchenMaterials(Array.isArray(result.materials) ? result.materials : []);
      if (!result.initialized && !items.length) {
        lastSynced = fingerprint(items);
        setStatus('Belum ada bahan di Google Sheets', true);
      } else {
        var previousFingerprint = fingerprint(kitchenMaterials());
        if (!applyRemote(items)) return;
        if (!firebaseSanitized) {
          firebaseSanitized = true;
          if (previousFingerprint === fingerprint(kitchenMaterials())) window.saveImportedData();
        }
        setStatus('Sinkron dengan Google Sheets', true);
      }
    }, function (error) {
      pollInProgress = false;
      if (generation === pollGeneration) setStatus('Google Sheets: ' + error.message, false);
    });
  }

  function validWebAppUrl(value) {
    try {
      var parsed = new URL(value);
      return parsed.protocol === 'https:' &&
        parsed.hostname === 'script.google.com' &&
        /^\/macros\/s\/[^/]+\/exec\/?$/.test(parsed.pathname);
    } catch (error) {
      return false;
    }
  }

  function setupUrlSettings() {
    var trigger = document.querySelector('#open-sheets-settings');
    if (!trigger) return;

    var panel = document.createElement('section');
    panel.className = 'import-panel';
    panel.id = 'sheets-settings-panel';
    panel.setAttribute('aria-label', 'Pengaturan Google Sheets');
    panel.innerHTML = '<div class="import-box"><div class="card-head"><div><div class="eyebrow">Koneksi database</div><h2>Atur Link Google Sheets</h2><p class="note">Isi URL Web App dan link spreadsheet yang ingin dipakai. Pengaturan tersimpan di browser ini.</p></div><button class="close" type="button" data-sheets-close aria-label="Tutup">×</button></div><label for="sheets-webapp-url" class="note">1. URL Web App Apps Script (akhiri dengan /exec)</label><input id="sheets-webapp-url" type="url" class="search" autocomplete="url" placeholder="https://script.google.com/macros/s/.../exec" style="width:100%;margin:6px 0 14px"><label for="sheets-spreadsheet-url" class="note">2. Link spreadsheet Google (salin URL spreadsheet lengkap)</label><input id="sheets-spreadsheet-url" type="url" class="search" autocomplete="url" placeholder="https://docs.google.com/spreadsheets/d/..." style="width:100%;margin-top:6px"><div style="margin-top:16px;padding:13px 15px;border:1px solid var(--line);border-radius:8px;background:#f6f8f5"><strong style="display:block;margin-bottom:7px;color:var(--teal-dark)">Catatan &amp; tutorial</strong><ol style="margin:0;padding-left:20px;color:var(--muted);font-size:12px;line-height:1.65"><li>Jika ini pertama kali menghubungkan, unduh Apps Script di bawah lalu salin isinya ke file <code>Code.gs</code> pada proyek Apps Script di spreadsheet.</li><li>URL Web App diambil dari Apps Script: <b>Deploy → Manage deployments</b>, lalu salin URL Web App yang berakhir <code>/exec</code>.</li><li>Link spreadsheet disalin dari Google Sheets. Pastikan akun Google yang dipakai punya akses ke spreadsheet.</li><li>Tekan <b>Simpan &amp; Hubungkan</b>. Status koneksi muncul di bagian atas halaman HPP.</li><li>Jika baru mengganti kode Apps Script, deploy sebagai <b>New version</b> satu kali. Sesudah itu, ganti link spreadsheet cukup dari pengaturan ini.</li></ol></div><p class="import-error" id="sheets-settings-error" role="status"></p><div class="import-actions" style="justify-content:space-between;flex-wrap:wrap"><a class="import-secondary" href="./google-sheets-sync.gs" download="google-sheets-sync.gs" style="display:inline-flex;align-items:center;text-decoration:none">Download Apps Script</a><div style="display:flex;gap:9px"><button class="import-secondary" type="button" data-sheets-close>Tutup</button><button class="import-button" id="save-sheets-url" type="button">Simpan &amp; Hubungkan</button></div></div></div>';
    document.body.appendChild(panel);

    var input = panel.querySelector('#sheets-webapp-url');
    var spreadsheetInput = panel.querySelector('#sheets-spreadsheet-url');
    var error = panel.querySelector('#sheets-settings-error');
    function selectedSpreadsheetId(value) {
      var entry = value.trim();
      if (!entry) return '';
      if (/^[A-Za-z0-9_-]{20,}$/.test(entry)) return entry;
      try {
        var parsed = new URL(entry);
        var match = parsed.hostname === 'docs.google.com' && parsed.pathname.match(/^\/spreadsheets\/d\/([^/]+)/);
        return match ? match[1] : null;
      } catch (parseError) {
        return null;
      }
    }
    input.value = endpoint;
    spreadsheetInput.value = localStorage.getItem('hpp_kitchen_spreadsheet_url') || window.HPP_KITCHEN_SPREADSHEET_URL || '';
    trigger.addEventListener('click', function () {
      error.textContent = '';
      input.value = endpoint;
      spreadsheetInput.value = localStorage.getItem('hpp_kitchen_spreadsheet_url') || window.HPP_KITCHEN_SPREADSHEET_URL || '';
      panel.classList.add('open');
      input.focus();
    });
    panel.querySelectorAll('[data-sheets-close]').forEach(function (button) {
      button.addEventListener('click', function () { panel.classList.remove('open'); });
    });
    panel.addEventListener('click', function (event) {
      if (event.target === panel) panel.classList.remove('open');
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.classList.contains('open')) panel.classList.remove('open');
    });
    panel.querySelector('#save-sheets-url').addEventListener('click', function () {
      var nextEndpoint = input.value.trim();
      var nextSpreadsheetUrl = spreadsheetInput.value.trim();
      var nextSpreadsheetId = selectedSpreadsheetId(nextSpreadsheetUrl);
      if (!validWebAppUrl(nextEndpoint)) {
        error.textContent = 'URL tidak valid. Gunakan URL Web App Google Apps Script yang berakhiran /exec.';
        input.focus();
        return;
      }
      if (nextSpreadsheetId === null) {
        error.textContent = 'Link spreadsheet tidak valid. Tempel URL Google Sheets atau kosongkan untuk memakai spreadsheet bawaan deployment.';
        spreadsheetInput.focus();
        return;
      }
      endpoint = nextEndpoint.replace(/\/+$/, '');
      localStorage.setItem('hpp_kitchen_sheets_url', endpoint);
      if (nextSpreadsheetId) {
        localStorage.setItem('hpp_kitchen_spreadsheet_id', nextSpreadsheetId);
        localStorage.setItem('hpp_kitchen_spreadsheet_url', nextSpreadsheetUrl);
      } else {
        localStorage.removeItem('hpp_kitchen_spreadsheet_id');
        localStorage.removeItem('hpp_kitchen_spreadsheet_url');
      }
      panel.classList.remove('open');
      pollGeneration++;
      pollInProgress = false;
      lastSynced = null;
      sheetReady = false;
      setStatus('Menguji koneksi Google Sheets…', false);
      poll();
    });
  }

  if (typeof window.saveImportedData === 'function') {
    var originalSave = window.saveImportedData;
    window.saveImportedData = function () {
      var self = this;
      var args = arguments;
      var result = window.withoutKitchenMaterialsForPersistence(function () {
        return originalSave.apply(self, args);
      });
      return result;
    };
  }

  if (typeof window.applySavedData === 'function') {
    var originalApplySavedData = window.applySavedData;
    window.applySavedData = function (saved) {
      var filtered = window.filterKitchenMaterialsFromSavedData(saved);
      var result = originalApplySavedData.apply(this, [filtered]);
      if (filtered !== saved && sheetReady) window.setTimeout(function () { window.saveImportedData(); }, 0);
      return result;
    };
  }

  window.setTimeout(function () {
    window.removeKitchenMaterialsFromMemory();
  }, 0);
  setupUrlSettings();
  window.setTimeout(poll, 0);
  window.setInterval(poll, 15000);
})();
