(function () {
  'use strict';

  var FIREBASE_KEY = 'rbm_hpp_monitor';

  function currentUser() {
    try { return JSON.parse(localStorage.getItem('rbm_user') || '{}'); } catch (error) { return {}; }
  }

  function isAllowed() {
    var user = currentUser();
    var role = String(user.role || '').toLowerCase();
    var username = String(user.username || '').toLowerCase();
    return role === 'owner' || role === 'developer' || username === 'burhan' || username === 'developer';
  }

  function denyAccess() {
    document.documentElement.innerHTML = '<body style="margin:0;background:#f5f8f5;color:#172529;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><main style="max-width:440px;padding:32px;background:#fff;border:1px solid #dce7e3;border-radius:10px"><h2>Akses terbatas</h2><p>Halaman HPP Resto & Kitchen hanya dapat dibuka oleh Owner atau Developer.</p><button onclick="location.href=\'../../index.html\'">Kembali</button></main></body>';
  }

  function applyCloud(value) {
    if (!value || typeof window.applySavedData !== 'function') return;
    var saved = typeof value === 'string' ? JSON.parse(value) : value;
    if (saved.source !== 'excel-import') return;
    window.applySavedData(saved);
    localStorage.setItem('rbm_hpp_monitor_imports', JSON.stringify(saved));
    if (typeof window.renderStats === 'function') window.renderStats();
    if (typeof window.renderResto === 'function') window.renderResto();
    if (typeof window.renderKitchen === 'function') window.renderKitchen();
    if (typeof window.renderDatabase === 'function') window.renderDatabase();
  }

  function syncFromFirebase() {
    if (!window.FirebaseStorage || !FirebaseStorage.getAppState) return;
    FirebaseStorage.getAppState(FIREBASE_KEY).then(function (value) {
      if (value) applyCloud(value);
      var live = document.querySelector('.live');
      if (live) live.innerHTML = '<span class="dot"></span> Terhubung ke Firebase <span>|</span> Data aktif';
    }).catch(function (error) { console.warn('HPP Firebase load failed', error); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!isAllowed()) { denyAccess(); return; }
    window.setTimeout(syncFromFirebase, 0);
  });
})();
