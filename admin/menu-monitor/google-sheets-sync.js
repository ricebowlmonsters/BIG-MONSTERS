(function () {
  'use strict';

  var endpoint = String(localStorage.getItem('hpp_kitchen_sheets_url') || window.HPP_KITCHEN_SHEETS_URL || '').trim();
  var lastSynced = null;
  var currentStatus = '';
  var currentConnected = false;
  var pollGeneration = 0;
  var pollInProgress = false;
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

  function readSheet(onResult, onError) {
    if (!endpoint) return onError(new Error('URL deployment Apps Script belum diatur.'));
    var requestedEndpoint = endpoint;
    var callbackName = '__hppKitchenSheets' + Date.now() + Math.floor(Math.random() * 1000);
    var script = document.createElement('script');
    var settled = false;
    var timeout = window.setTimeout(function () {
      finish(new Error('Web App tidak mengirim respons dalam 60 detik. Periksa eksekusi Apps Script dan jumlah baris pada kelima tab.'), null, true);
    }, 60000);
    function finish(error, result, keepCallback) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script.remove();
      if (keepCallback) {
        window.setTimeout(function () { delete window[callbackName]; }, 120000);
      } else {
        delete window[callbackName];
      }
      if (error) onError(error); else onResult(result);
    }
    window[callbackName] = function (result) {
      if (settled) {
        delete window[callbackName];
        return;
      }
      finish(null, result);
    };
    script.onerror = function () { finish(new Error('Web App mengalihkan ke halaman login/menolak akses. Di Deploy > Manage deployments, pilih Execute as: Me dan Who has access: Anyone (bukan Anyone with Google account), lalu deploy New version.')); };
    var spreadsheetId = localStorage.getItem('hpp_kitchen_spreadsheet_id') || '';
    script.src = requestedEndpoint + (requestedEndpoint.indexOf('?') === -1 ? '?' : '&') +
      'action=getHppData&callback=' + callbackName +
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
    setStatus('Membaca data dari lima tab Google Sheets…', false);
    readSheet(function (result) {
      pollInProgress = false;
      if (generation !== pollGeneration) return;
      if (!result || result.status !== 'success') {
        var message = result && result.message || 'respons tidak valid';
        if (/login ke akun google yang memiliki akses ke spreadsheet/i.test(message)) {
          message = 'Deployment Apps Script yang aktif masih menjalankan pemeriksaan login lama (pesan ini tidak ada di Code.gs terbaru). Ganti seluruh Code.gs pada proyek yang URL-nya dipakai, simpan, lalu Deploy > Manage deployments > Edit > New version. Error ini terjadi sebelum pemeriksaan tab/header Sheets.';
        }
        if (/illegal spreadsheet id or key/i.test(message)) {
          message += ' — Web App belum memakai versi Apps Script terbaru atau masih membuka spreadsheet ID lama.';
        }
        if (/aksi tidak dikenal|unknown action/i.test(message)) {
          message = 'Versi Apps Script yang aktif belum mendukung sinkronisasi lima tab. Unduh Apps Script terbaru di pengaturan, ganti isi Code.gs, lalu Deploy sebagai New version.';
        }
        setStatus('Google Sheets: ' + message, false);
        return;
      }
      if (!result.data || !Array.isArray(result.data.kitchenMaterials) ||
          !Array.isArray(result.data.restoMaterials) || !Array.isArray(result.data.restoRecipes) ||
          !Array.isArray(result.data.kitchenRecipes) || !Array.isArray(result.data.packaging)) {
        setStatus('Google Sheets: format lima tab tidak lengkap; data halaman tidak diubah.', false);
        return;
      }
      if (!result.priceSync || typeof result.priceSync.updatedRows !== 'number' ||
          typeof result.priceSync.unchangedRows !== 'number' || typeof result.priceSync.skippedRows !== 'number' ||
          typeof result.priceSync.unpricedIngredientRows !== 'number') {
        setStatus('Data terbaca dari Google Sheets, tetapi deployment Apps Script belum mengirim hasil sinkronisasi harga kolom D. Deploy versi terbaru hpp-five-tabs-2026-10-06-4.', false);
        return;
      }
      var remoteFingerprint = JSON.stringify(result.data);
      if (remoteFingerprint !== lastSynced) {
        if (typeof window.applyAllHppDataFromSheets !== 'function') {
          setStatus('Fungsi pemetaan data Sheets belum tersedia di halaman.', false);
          return;
        }
        try {
          window.applyAllHppDataFromSheets(result.data);
          lastSynced = remoteFingerprint;
        } catch (error) {
          setStatus('Google Sheets: data gagal dipetakan — ' + error.message, false);
          return;
        }
      }
      setStatus('Data dimuat dari Google Sheets', true);
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
    panel.innerHTML = '<div class="import-box"><div class="card-head"><div><div class="eyebrow">Koneksi database</div><h2>Atur Link Google Sheets</h2><p class="note">Isi URL Web App dan link spreadsheet yang ingin dipakai. Pengaturan tersimpan di browser ini.</p></div><button class="close" type="button" data-sheets-close aria-label="Tutup">×</button></div><label for="sheets-webapp-url" class="note">1. URL Web App Apps Script (akhiri dengan /exec)</label><input id="sheets-webapp-url" type="url" class="search" autocomplete="url" placeholder="https://script.google.com/macros/s/.../exec" style="width:100%;margin:6px 0 14px"><label for="sheets-spreadsheet-url" class="note">2. Link spreadsheet Google (salin URL spreadsheet lengkap)</label><input id="sheets-spreadsheet-url" type="url" class="search" autocomplete="url" placeholder="https://docs.google.com/spreadsheets/d/..." style="width:100%;margin-top:6px"><div style="margin-top:16px;padding:13px 15px;border:1px solid var(--line);border-radius:8px;background:#f6f8f5"><strong style="display:block;margin-bottom:7px;color:var(--teal-dark)">Catatan &amp; tutorial</strong><ol style="margin:0;padding-left:20px;color:var(--muted);font-size:12px;line-height:1.65"><li>Jika ini pertama kali menghubungkan, unduh Apps Script di bawah lalu salin isinya ke file <code>Code.gs</code> pada proyek Apps Script di spreadsheet.</li><li>URL Web App diambil dari Apps Script: <b>Deploy → Manage deployments</b>, lalu salin URL Web App yang berakhir <code>/exec</code>.</li><li>Link spreadsheet disalin dari Google Sheets. Pastikan akun Google yang dipakai punya akses ke spreadsheet.</li><li>Tekan <b>Simpan &amp; Hubungkan</b>. Status koneksi muncul di bagian atas halaman HPP.</li><li>Jika baru mengganti kode Apps Script, deploy sebagai <b>New version</b> satu kali. Sesudah itu, ganti link spreadsheet cukup dari pengaturan ini.</li></ol></div><p class="import-error" id="sheets-settings-error" role="status"></p><div class="import-actions" style="justify-content:space-between;flex-wrap:wrap"><div style="display:flex;gap:9px;flex-wrap:wrap"><a class="import-secondary" href="./google-sheets-sync.gs" download="google-sheets-sync.gs" style="display:inline-flex;align-items:center;text-decoration:none">Download Apps Script</a><button class="import-secondary" id="download-sheets-template" type="button">Download Template Sheets</button></div><div style="display:flex;gap:9px"><button class="import-secondary" type="button" data-sheets-close>Tutup</button><button class="import-button" id="save-sheets-url" type="button">Simpan &amp; Hubungkan</button></div></div></div>';
    document.body.appendChild(panel);
    var tutorialList = panel.querySelector('.import-box ol');
    if (tutorialList) {
      var sourceNote = document.createElement('li');
      sourceNote.textContent = 'Koneksi ini membaca lima tab: Bahan Baku Dapur, Bahan Baku Resto, Resep Resto, Resep Dapur, dan Kemasan. Ubah data langsung di spreadsheet.';
      tutorialList.insertBefore(sourceNote, tutorialList.firstChild);
      var accessNote = document.createElement('li');
      accessNote.textContent = 'Pilih Execute as: Me dan Who has access: Anyone agar Web App dapat dibaca halaman tanpa login Google. Jika akses Anyone tidak tersedia, permintaan dari halaman dapat dialihkan ke login dan gagal. Endpoint dapat dibaca publik oleh siapa pun yang memiliki URL.';
      tutorialList.appendChild(accessNote);
    }

    var input = panel.querySelector('#sheets-webapp-url');
    var spreadsheetInput = panel.querySelector('#sheets-spreadsheet-url');
    var error = panel.querySelector('#sheets-settings-error');
    panel.querySelector('#download-sheets-template').addEventListener('click', function () {
      if (!window.XLSX || !window.XLSX.utils || !window.XLSX.writeFile) {
        error.textContent = 'Fitur template belum termuat. Muat ulang halaman lalu coba lagi.';
        return;
      }
      var workbook = window.XLSX.utils.book_new();
      var tabs = [
        { name: 'Bahan Baku Dapur', headers: ['kode_bahan', 'nama_bahan', 'kategori', 'satuan', 'harga', 'harga_standar', 'keterangan_satuan'] },
        { name: 'Bahan Baku Resto', headers: ['kode_bahan', 'nama_bahan', 'kategori', 'satuan', 'harga'] },
        { name: 'Resep Resto', headers: ['kode_menu', 'nama_menu', 'kategori', 'harga_jual', 'kode_bahan', 'nama_bahan', 'qty', 'satuan'] },
        { name: 'Resep Dapur', headers: ['nama_produk', 'qty_barang_jadi', 'satuan_barang', 'harga_jual_satuan', 'satuan_harga_jual', 'nama_bahan_baku', 'qty_bahan', 'satuan_bahan'] },
        { name: 'Kemasan', headers: ['jenis', 'kode', 'nama', 'qty', 'satuan'] }
      ];
      tabs.forEach(function (tab) {
        var sheet = window.XLSX.utils.aoa_to_sheet([tab.headers]);
        sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
        sheet['!cols'] = tab.headers.map(function (header) { return { wch: Math.max(header.length + 3, 16) }; });
        window.XLSX.utils.book_append_sheet(workbook, sheet, tab.name);
      });
      window.XLSX.writeFile(workbook, 'template-google-sheets-hpp.xlsx');
      error.textContent = 'Template lima tab berhasil diunduh. Unggah file ke Google Drive lalu buka dengan Google Sheets.';
    });
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
      setStatus('Menguji koneksi Google Sheets…', false);
      poll();
    });
  }

  if (typeof window.applyAllHppDataFromSheets === 'function') {
    window.applyAllHppDataFromSheets({
      kitchenMaterials: [],
      restoMaterials: [],
      restoRecipes: [],
      kitchenRecipes: [],
      packaging: []
    });
  }
  localStorage.removeItem('rbm_hpp_monitor_imports');
  ['#open-import', '#view-upload', '#import-panel'].forEach(function (selector) {
    var element = document.querySelector(selector);
    if (element) element.remove();
  });
  window.saveImportedData = function () {
    setStatus('Google Sheets adalah sumber data. Ubah data langsung di spreadsheet.', currentConnected);
    window.setTimeout(poll, 0);
  };
  setupUrlSettings();
  window.setTimeout(poll, 0);
  window.setInterval(poll, 60000);
})();
