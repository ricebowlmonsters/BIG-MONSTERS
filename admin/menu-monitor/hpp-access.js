(function () {
  'use strict';

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

  document.addEventListener('DOMContentLoaded', function () {
    if (!isAllowed()) { denyAccess(); return; }
  });
})();
