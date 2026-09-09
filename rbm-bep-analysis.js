(function () {
  'use strict';
  var outlets = [];
  var controls = { skenarioPendapatan: 'Real', standarAcuanBiaya: 'Non Standart', metodeLabaBersih: 'Sistem', filterTampilan: 'Semua', simulasiMode: 'OFF' };
  var report;
  var accurateImport = null;
  var uploadHistory = [];
  var activeUploadId = null;
  var accurateDb = null;
  var accurateCloudPath = 'rbm_pro/accurate_upload_history';
  var accurateActivePath = 'rbm_pro/accurate_active_upload_id';
  function money(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0); }
  function pct(value) { return (value || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'; }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]; }); }
  function hasPdfAccess() {
    try { var user = JSON.parse(localStorage.getItem('rbm_user') || '{}'); var role = String(user.role || '').toLowerCase(); var username = String(user.username || user.nama || '').toLowerCase(); return role === 'owner' || role === 'developer' || username === 'developer'; } catch (error) { return false; }
  }
  function setupPdfAccess() { var button = document.getElementById('export-pdf'); if (button && hasPdfAccess()) button.classList.add('is-authorized'); }
  async function exportPdf() {
    if (!hasPdfAccess()) { window.alert('Akses laporan PDF hanya untuk Owner atau Developer.'); return; }
    if (!outlets.length) { window.alert('Belum ada data Accurate untuk dibuat PDF.'); return; }
    if (typeof html2canvas === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) { window.alert('Komponen PDF belum siap. Periksa koneksi internet lalu coba lagi.'); return; }
    var button = document.getElementById('export-pdf'); button.disabled = true; button.textContent = 'Membuat PDF...';
    try {
      var source = document.querySelector('.bep-shell');
      var clone = source.cloneNode(true); clone.querySelectorAll('button, input, select').forEach(function (element) { element.remove(); }); clone.style.background = '#ffffff'; clone.style.padding = '24px'; clone.style.width = '1500px';
      var wrapper = document.createElement('div'); wrapper.style.position = 'fixed'; wrapper.style.left = '-10000px'; wrapper.style.top = '0'; wrapper.style.background = '#fff'; wrapper.appendChild(clone); document.body.appendChild(wrapper);
      var canvas = await html2canvas(clone, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true }); wrapper.remove();
      var jsPDF = window.jspdf.jsPDF; var pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); var pageWidth = pdf.internal.pageSize.getWidth(); var pageHeight = pdf.internal.pageSize.getHeight(); var imageWidth = pageWidth - 16; var usableHeight = pageHeight - 14; var sliceHeight = Math.floor(canvas.width * usableHeight / imageWidth); var offset = 0; var pageNumber = 0;
      while (offset < canvas.height) { if (pageNumber > 0) pdf.addPage(); var height = Math.min(sliceHeight, canvas.height - offset); var slice = document.createElement('canvas'); slice.width = canvas.width; slice.height = height; slice.getContext('2d').drawImage(canvas, 0, offset, canvas.width, height, 0, 0, slice.width, slice.height); var image = slice.toDataURL('image/jpeg', 0.88); var renderedHeight = height * imageWidth / canvas.width; pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text('Laporan Analisis Laba Rugi & BEP - ' + new Date().toLocaleString('id-ID') + ' - Halaman ' + (pageNumber + 1), 8, 5); pdf.addImage(image, 'JPEG', 8, 8, imageWidth, renderedHeight); offset += height; pageNumber += 1; }
      pdf.save('laporan-laba-rugi-bep-' + new Date().toISOString().slice(0, 10) + '.pdf');
    } catch (error) { window.alert('PDF gagal dibuat: ' + (error.message || 'Kesalahan tidak diketahui.')); } finally { button.disabled = false; button.textContent = '📄 Simpan PDF'; }
  }
  function initAccurateDb() {
    try { accurateDb = typeof initRbmDB === 'function' ? initRbmDB() : null; } catch (error) { accurateDb = null; }
  }
  async function loadUploadHistory() {
    try { uploadHistory = JSON.parse(localStorage.getItem('rbm_accurate_upload_history') || '[]'); } catch (error) { uploadHistory = []; }
    if (!uploadHistory.length) { try { var legacy = JSON.parse(localStorage.getItem('rbm_accurate_branch_reports') || '{}'); if (legacy.records && Array.isArray(legacy.records)) { legacy.id = legacy.id || 'upload-legacy'; legacy.displayName = legacy.displayName || legacy.fileName || 'Import Accurate sebelumnya'; legacy.uploadedAt = legacy.uploadedAt || new Date().toISOString(); uploadHistory = [legacy]; localStorage.setItem('rbm_accurate_upload_history', JSON.stringify(uploadHistory)); } } catch (error) { /* Ignore malformed legacy storage. */ } }
    if (accurateDb && accurateDb.ref) { try { var snapshot = await accurateDb.ref(accurateCloudPath).once('value'); var cloud = snapshot.val(); if (cloud && Array.isArray(cloud.records)) uploadHistory = cloud.records; else if (cloud && typeof cloud === 'object') uploadHistory = Object.keys(cloud).map(function (key) { return cloud[key]; }); if (uploadHistory.length) localStorage.setItem('rbm_accurate_upload_history', JSON.stringify(uploadHistory)); var activeSnapshot = await accurateDb.ref(accurateActivePath).once('value'); var cloudActive = activeSnapshot.val(); if (cloudActive) localStorage.setItem('rbm_accurate_active_upload_id', cloudActive); } catch (error) { /* Use the local cache when Firebase is unavailable. */ } }
    var current = localStorage.getItem('rbm_accurate_active_upload_id'); activeUploadId = current || (uploadHistory[0] && uploadHistory[0].id) || null;
  }
  function persistUploadHistory() { localStorage.setItem('rbm_accurate_upload_history', JSON.stringify(uploadHistory)); if (activeUploadId) localStorage.setItem('rbm_accurate_active_upload_id', activeUploadId); else localStorage.removeItem('rbm_accurate_active_upload_id'); if (accurateDb && accurateDb.ref) { accurateDb.ref(accurateCloudPath).set(uploadHistory).catch(function () { /* Keep local cache if cloud save fails. */ }); accurateDb.ref(accurateActivePath).set(activeUploadId || null).catch(function () { /* Keep local active state if cloud save fails. */ }); } }
  function formatUploadDate(value) { var date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID'); }
  function renderUploadHistory() {
    var container = document.getElementById('accurate-history-list'); if (!container) return;
    if (!uploadHistory.length) { container.innerHTML = '<div class="bep-empty-state">Belum ada riwayat upload.</div>'; return; }
    container.innerHTML = uploadHistory.map(function (item) { return '<div class="accurate-history-item ' + (item.id === activeUploadId ? 'is-active' : '') + '"><div><strong>' + escapeHtml(item.displayName || item.fileName) + '</strong><small>' + escapeHtml(item.periodLabel || '-') + ' · ' + item.records.length + ' cabang · ' + formatUploadDate(item.uploadedAt) + (item.id === activeUploadId ? ' · Aktif' : '') + '</small></div><div class="accurate-history-actions">' + (item.id === activeUploadId ? '<button type="button" disabled>Aktif</button>' : '<button type="button" class="use" data-history-use="' + item.id + '">Gunakan</button>') + '<button type="button" data-history-rename="' + item.id + '">Ganti Nama</button><button type="button" class="delete" data-history-delete="' + item.id + '">Hapus</button></div></div>'; }).join('');
    container.querySelectorAll('[data-history-use]').forEach(function (button) { button.addEventListener('click', function () { activateUpload(button.dataset.historyUse); }); });
    container.querySelectorAll('[data-history-rename]').forEach(function (button) { button.addEventListener('click', function () { renameUpload(button.dataset.historyRename); }); });
    container.querySelectorAll('[data-history-delete]').forEach(function (button) { button.addEventListener('click', function () { deleteUpload(button.dataset.historyDelete); }); });
  }
  function renameUpload(id) { var item = uploadHistory.find(function (entry) { return entry.id === id; }); if (!item) return; var name = window.prompt('Nama baru untuk data upload:', item.displayName || item.fileName); if (name && name.trim()) { item.displayName = name.trim(); persistUploadHistory(); renderUploadHistory(); } }
  function activateUpload(id) { var item = uploadHistory.find(function (entry) { return entry.id === id; }); if (!item || !item.records) return; activeUploadId = item.id; outlets = []; applyAccurateRecords(item.records); localStorage.setItem('rbm_accurate_branch_reports', JSON.stringify(item)); persistUploadHistory(); render(); renderUploadHistory(); }
  function deleteUpload(id) { var item = uploadHistory.find(function (entry) { return entry.id === id; }); if (!item || !window.confirm('Hapus riwayat data "' + (item.displayName || item.fileName) + '"?')) return; uploadHistory = uploadHistory.filter(function (entry) { return entry.id !== id; }); if (activeUploadId === id) { activeUploadId = uploadHistory[0] ? uploadHistory[0].id : null; if (activeUploadId) { outlets = []; applyAccurateRecords(uploadHistory[0].records); localStorage.setItem('rbm_accurate_branch_reports', JSON.stringify(uploadHistory[0])); } else { outlets = []; localStorage.removeItem('rbm_accurate_branch_reports'); } render(); } persistUploadHistory(); renderUploadHistory(); }
  function renderAccuratePreview(parsed) {
    var meta = document.getElementById('accurate-meta'), preview = document.getElementById('accurate-preview'), save = document.getElementById('accurate-save');
    accurateImport = parsed; save.disabled = !parsed.records.length;
    meta.innerHTML = '<span><strong>Sheet:</strong> ' + escapeHtml(parsed.sheetName) + '</span><span><strong>Periode:</strong> ' + escapeHtml(parsed.period.label || '-') + '</span><span><strong>Cabang terdeteksi:</strong> ' + parsed.records.length + '</span>';
    var html = '<table><thead><tr><th>Nama Cabang</th><th>Omset</th><th>Total HPP</th><th>Total Opex</th><th>Laba Bersih</th><th>Validasi</th></tr></thead><tbody>';
    parsed.records.forEach(function (record) { var incomplete = !record.branchName || (!record.omset && !record.hpp && !record.totalOpex && !record.labaBersih); var warning = record.warning || (incomplete ? 'Data tidak lengkap' : 'OK'); html += '<tr class="' + (warning === 'OK' ? '' : 'accurate-warning') + '"><td>' + escapeHtml(record.branchName) + '</td><td>' + money(record.omset) + '</td><td>' + money(record.hpp) + '</td><td>' + money(record.totalOpex) + '</td><td>' + money(record.labaBersih) + '</td><td>' + escapeHtml(warning) + '</td></tr>'; });
    preview.innerHTML = html + '</tbody></table>';
  }
  function resetAccurateImport() { accurateImport = null; document.getElementById('accurate-file').value = ''; document.getElementById('accurate-file-status').textContent = 'File .xlsx atau .xls'; document.getElementById('accurate-meta').innerHTML = ''; document.getElementById('accurate-preview').innerHTML = '<div style="padding:28px;text-align:center;color:#64748b;font-size:13px;">Preview akan muncul setelah file diproses.</div>'; document.getElementById('accurate-save').disabled = true; }
  async function handleAccurateFile(file) {
    var status = document.getElementById('accurate-file-status');
    if (!file) return;
    status.textContent = 'Memproses file dengan SheetJS...';
    try { renderAccuratePreview(await window.AccurateParser.parseFile(file)); status.textContent = 'File berhasil dibaca. Periksa preview sebelum menyimpan.'; } catch (error) { accurateImport = null; document.getElementById('accurate-save').disabled = true; status.textContent = error.message || 'File gagal diproses.'; }
  }
  function saveAccurateImport() {
    if (!accurateImport || !accurateImport.records.length) return;
    var confirmed = window.confirm('Simpan data ke sistem? Data akan diterapkan ke Dashboard dan Kalkulator BEP.');
    if (!confirmed) return;
    var historyItem = Object.assign({}, accurateImport, { id: 'upload-' + Date.now(), displayName: accurateImport.fileName, uploadedAt: new Date().toISOString() });
    uploadHistory = [historyItem].concat(uploadHistory.filter(function (item) { return item.fileName !== historyItem.fileName || item.periodLabel !== historyItem.periodLabel; })); activeUploadId = historyItem.id; localStorage.setItem('rbm_accurate_branch_reports', JSON.stringify(historyItem)); persistUploadHistory();
    applyAccurateRecords(accurateImport.records);
    render(); renderUploadHistory(); document.getElementById('accurate-backdrop').classList.remove('is-open'); resetAccurateImport();
  }
  function applyAccurateRecords(records) {
    records.forEach(function (record) { var outlet = outlets.find(function (item) { return item.name.toLowerCase() === String(record.branchName || '').toLowerCase(); }); if (!outlet) { outlet = { id: record.id, name: record.branchName, costCenter: /central kitchen/i.test(record.branchName), simulationRevenue: 0 }; outlets.push(outlet); } outlet.revenue = Number(record.omset) || 0; outlet.hpp = Number(record.hpp) || 0; outlet.salary = Number(record.biayaGaji) || 0; outlet.electricity = Number(record.biayaListrik) || 0; outlet.other = Number(record.biayaOpsLain) || 0; outlet.nonOperating = Number(record.nonOpex) || 0; outlet.targetRevenue = window.RbmBepCalculations.calculateRealBep(outlet); outlet.targetAuto = true; });
  }
  function loadSavedAccurateRecords() {
    return loadUploadHistory().then(function () { var saved = uploadHistory.find(function (item) { return item.id === activeUploadId; }) || uploadHistory[0]; if (saved && saved.records) { activeUploadId = saved.id; localStorage.setItem('rbm_accurate_branch_reports', JSON.stringify(saved)); applyAccurateRecords(saved.records); } });
  }
  function selectedRows() { return report.rows.filter(function (row) { return controls.filterTampilan === 'Semua' || (controls.filterTampilan === 'Hanya Real' && row.realRevenue > 0) || (controls.filterTampilan === 'Hanya Standar' && row.revenue > 0); }); }
  function emptyDashboard() {
    var message = '<div class="bep-empty-state"><strong>Belum ada data Accurate.</strong><span>Upload file melalui tombol “Import Accurate” untuk mengisi dashboard.</span></div>';
    document.getElementById('bep-kpi-output').innerHTML = message; document.getElementById('bep-table-output').innerHTML = message; document.getElementById('bep-monitor-output').innerHTML = message;
  }
  function renderRatioSettings() {
    var ratios = window.RbmBepCalculations.RATIOS;
    var items = [{ key: 'hpp', label: 'Beban Pokok Penjualan (HPP / Food Cost)' }, { key: 'salary', label: '  • Beban Gaji & SDM (Labor / Payroll)' }, { key: 'electricity', label: '  • Beban Listrik & Utilitas (Listrik, Air, Gas)' }, { key: 'other', label: '  • Beban Operasional Lainnya' }, { key: 'nonOperating', label: 'Beban Non Operasional' }, { key: 'netProfit', label: 'Laba Bersih Operasional (Net Profit)' }];
    var html = '<table class="bep-settings-table"><thead><tr><th>Komponen Finansial</th><th>Standar</th><th>Non Standar</th></tr></thead><tbody>';
    items.forEach(function (item) { html += '<tr><td class="' + (item.key === 'salary' || item.key === 'electricity' || item.key === 'other' ? 'sub-label' : '') + '">' + item.label + '</td><td><input type="number" min="0" max="100" step="0.1" data-ratio="standard.' + item.key + '" value="' + (ratios.standard[item.key] * 100) + '">%</td><td><input type="number" min="0" max="100" step="0.1" data-ratio="nonStandard.' + item.key + '" value="' + (ratios.nonStandard[item.key] * 100) + '">%</td></tr>'; });
    html += '<tr><td><strong>Total Beban Operasional (Opex)</strong></td><td><strong>' + ((ratios.standard.salary + ratios.standard.electricity + ratios.standard.other) * 100).toFixed(1) + '%</strong></td><td><strong>' + ((ratios.nonStandard.salary + ratios.nonStandard.electricity + ratios.nonStandard.other) * 100).toFixed(1) + '%</strong></td></tr><tr><td><strong>Total Alokasi Biaya & Profit</strong></td><td><strong>' + ((ratios.standard.hpp + ratios.standard.salary + ratios.standard.electricity + ratios.standard.other + ratios.standard.nonOperating + ratios.standard.netProfit) * 100).toFixed(1) + '%</strong></td><td><strong>' + ((ratios.nonStandard.hpp + ratios.nonStandard.salary + ratios.nonStandard.electricity + ratios.nonStandard.other + ratios.nonStandard.nonOperating + ratios.nonStandard.netProfit) * 100).toFixed(1) + '%</strong></td></tr></tbody></table>';
    return html;
  }
  function renderTargetSettings() {
    var html = '<table class="bep-target-table"><thead><tr><th>Outlet</th><th>Real</th><th>Manual HPP</th><th>Target</th><th>Simulasi</th></tr></thead><tbody>';
    outlets.forEach(function (outlet) { var realBep = window.RbmBepCalculations.calculateRealBep(outlet); var target = outlet.targetAuto !== false ? realBep : outlet.targetRevenue; if (outlet.targetAuto !== false) outlet.targetRevenue = target; html += '<tr><td>' + escapeHtml(outlet.name) + '<small class="target-source">' + (outlet.targetAuto !== false ? 'Otomatis dari BEP Real' : 'Manual') + '</small></td><td>' + money(outlet.revenue) + '</td><td><input type="number" min="0" data-hpp-setting="' + outlet.id + '" value="' + Math.round(outlet.hpp) + '"></td><td><input type="number" min="0" data-target-input="' + outlet.id + '" value="' + Math.round(target) + '"><button type="button" class="target-reset" data-target-reset="' + outlet.id + '">Auto</button></td><td><input type="number" min="0" data-simulation-setting="' + outlet.id + '" value="' + outlet.simulationRevenue + '"></td></tr>'; });
    return html + '</tbody></table>';
  }
  function bindSettings() {
    document.querySelectorAll('[data-ratio]').forEach(function (input) { input.addEventListener('change', function () { var parts = input.dataset.ratio.split('.'); window.RbmBepCalculations.RATIOS[parts[0]][parts[1]] = (Number(input.value) || 0) / 100; render(); }); });
    document.querySelectorAll('[data-hpp-setting]').forEach(function (input) { input.addEventListener('change', function () { var outlet = outlets.find(function (item) { return item.id === input.dataset.hppSetting; }); if (outlet) { outlet.hpp = Number(input.value) || 0; outlet.targetAuto = true; outlet.targetRevenue = window.RbmBepCalculations.calculateRealBep(outlet); } render(); }); });
    document.querySelectorAll('[data-target-input]').forEach(function (input) { input.addEventListener('change', function () { var outlet = outlets.find(function (item) { return item.id === input.dataset.targetInput; }); if (outlet) { outlet.targetRevenue = Number(input.value) || 0; outlet.targetAuto = false; } render(); }); });
    document.querySelectorAll('[data-target-reset]').forEach(function (button) { button.addEventListener('click', function () { var outlet = outlets.find(function (item) { return item.id === button.dataset.targetReset; }); if (outlet) { outlet.targetRevenue = window.RbmBepCalculations.calculateRealBep(outlet); outlet.targetAuto = true; render(); } }); });
    document.querySelectorAll('[data-simulation-setting]').forEach(function (input) { input.addEventListener('change', function () { var outlet = outlets.find(function (item) { return item.id === input.dataset.simulationSetting; }); if (outlet) outlet.simulationRevenue = Number(input.value) || 0; render(); }); });
  }
  function renderKpis(total, rows) {
    return '<div class="bep-kpis"><div class="bep-kpi"><span>Total Omset Konsolidasian</span><strong>' + money(total.revenue) + '</strong></div><div class="bep-kpi"><span>Total Target Omset BEP</span><strong>' + money(total.bep) + '</strong></div><div class="bep-kpi ' + (total.gap >= 0 ? 'is-positive' : 'is-negative') + '"><span>Total Gap / Selisih BEP</span><strong>' + money(total.gap) + '</strong></div><div class="bep-kpi"><span>Rasio Capai BEP</span><strong>' + pct(total.bepAchievement * 100) + '</strong></div><div class="bep-kpi"><span>Status Outlet</span><strong>' + rows.filter(function (row) { return row.achieved === true; }).length + ' Capai / ' + rows.filter(function (row) { return row.achieved === false; }).length + ' Belum</strong></div></div>';
  }
  function renderTable(rows, total) {
    var showReal = controls.filterTampilan !== 'Hanya Standar';
    var showStandard = controls.filterTampilan !== 'Hanya Real';
    var columns = [{ key: 'revenue', label: 'Pendapatan', standard: false }];
    if (showReal) columns.push({ key: 'hpp', label: 'HPP Real', standard: false });
    if (showStandard) { columns.push({ key: 'hppStandard', label: 'HPP Std', standard: false }); columns.push({ key: 'hppHealthy', label: 'HPP Sehat', standard: false }); }
    var costColumns = [{ key: 'salary', standardKey: 'standardSalary', label: 'Gaji' }, { key: 'electricity', standardKey: 'standardElectricity', label: 'Listrik' }, { key: 'other', standardKey: 'standardOther', label: 'Ops Lain' }, { key: 'opex', standardKey: 'standardOpex', label: 'Total Opex' }, { key: 'nonOperating', standardKey: 'standardNonOperating', label: 'Non-Opex' }];
    costColumns.forEach(function (column) { if (showReal) columns.push({ key: column.key, label: column.label + ' Real', standard: false }); if (showStandard) columns.push({ key: column.standardKey, label: column.label + ' Std', standard: true }); });
    columns.push({ key: 'grossProfit', label: 'Laba Kotor', standard: false }, { key: 'netProfit', label: 'Laba Bersih', standard: false }, { key: 'bep', label: 'Target BEP', standard: false }, { key: 'gap', label: 'Selisih BEP', standard: false }, { key: 'bepPlusTen', label: 'BEP + 10%', standard: false });
    var html = '<div class="bep-table-scroll"><table class="bep-main-table"><thead><tr><th>Outlet</th>' + columns.map(function (column) { return '<th class="' + (column.standard ? 'col-standard' : (column.key !== 'revenue' && column.key !== 'bep' && column.key !== 'bepPlusTen' ? 'col-real' : '')) + '">' + column.label + '<br><small>' + (column.key === 'revenue' || column.key === 'bep' || column.key === 'bepPlusTen' ? 'Nominal' : '% Omset') + '</small></th>'; }).join('') + '</tr></thead><tbody>';
    rows.concat([total]).forEach(function (row) {
      var hppAlert = row.hppRealPercent > 0.38 ? 'is-warning' : '';
      var cell = function (column) { var amount = row[column.key] || 0, isPercentOnly = column.key !== 'revenue' && column.key !== 'bep' && column.key !== 'bepPlusTen'; var className = (column.standard ? 'col-standard ' : (column.key !== 'revenue' && column.key !== 'bep' && column.key !== 'bepPlusTen' ? 'col-real ' : '')) + (column.key === 'hpp' && hppAlert ? 'is-warning ' : '') + (column.key === 'netProfit' && row.netProfit < 0 ? 'is-negative ' : '') + (column.key === 'gap' ? (row.gap < 0 ? 'is-negative' : 'is-positive') : ''); return '<td class="' + className.trim() + '">' + money(amount) + (isPercentOnly ? '<br><small>' + pct(window.RbmBepCalculations.ratio(amount, row.revenue) * 100) + '</small>' : '') + '</td>'; };
      html += '<tr class="' + (row.id === 'total' ? 'is-total' : '') + '"><td><strong>' + escapeHtml(row.name) + '</strong>' + (row.costCenter ? '<small>Cost center</small>' : '') + '</td>' + columns.map(cell).join('') + '</tr>';
    });
    return html + '</tbody></table></div>';
  }
  function renderMonitoring(rows, total) {
    var html = '<div class="bep-monitor-table"><table class="bep-simple-table"><thead><tr><th>Outlet</th><th>Omset</th><th>BEP</th><th>Omset vs BEP</th><th>BEP + 10%</th><th>Status</th></tr></thead><tbody>';
    rows.concat([total]).forEach(function (row) { html += '<tr class="' + (row.id === 'total' ? 'is-total' : '') + '"><td>' + escapeHtml(row.name) + '</td><td>' + money(row.revenue) + '</td><td>' + money(row.bep) + '</td><td class="' + (row.gap >= 0 ? 'is-positive' : 'is-negative') + '">' + money(row.gap) + '</td><td>' + money(row.bepPlusTen) + '</td><td>' + (row.id === 'total' ? (row.gap >= 0 ? 'Di Atas BEP' : 'Di Bawah BEP') : (row.costCenter ? '-' : row.achieved ? 'Lulus BEP' : 'Belum BEP')) + '</td></tr>'; });
    return html + '</tbody></table></div>';
  }
  function render() {
    if (!outlets.length) { emptyDashboard(); return; }
    report = window.RbmBepCalculations.calculateReport(outlets, controls); var rows = selectedRows();
    document.getElementById('bep-kpi-output').innerHTML = renderKpis(report.total, rows); document.getElementById('bep-table-output').innerHTML = renderTable(rows, report.total); document.getElementById('bep-monitor-output').innerHTML = renderMonitoring(rows, report.total);
    document.getElementById('bep-ratio-settings').innerHTML = renderRatioSettings(); document.getElementById('bep-target-settings').innerHTML = renderTargetSettings(); bindSettings();
  }
  function openSimulation() { document.getElementById('simulation-drawer').classList.add('is-open'); document.getElementById('simulation-backdrop').classList.add('is-open'); }
  function closeSimulation() { document.getElementById('simulation-drawer').classList.remove('is-open'); document.getElementById('simulation-backdrop').classList.remove('is-open'); }
  function init() {
    setupPdfAccess();
    ['skenarioPendapatan', 'standarAcuanBiaya', 'metodeLabaBersih', 'filterTampilan', 'simulasiMode'].forEach(function (key) { var input = document.querySelector('[data-control="' + key + '"]'); input.addEventListener('change', function () { controls[key] = input.type === 'checkbox' ? (input.checked ? 'ON' : 'OFF') : input.value; render(); }); });
    document.getElementById('open-simulation').addEventListener('click', openSimulation); document.getElementById('close-simulation').addEventListener('click', closeSimulation); document.getElementById('simulation-backdrop').addEventListener('click', closeSimulation); document.getElementById('bep-mode-simulation').addEventListener('click', function () { controls.skenarioPendapatan = 'Simulasi'; controls.simulasiMode = 'ON'; document.querySelector('[data-control="skenarioPendapatan"]').value = 'Simulasi'; document.querySelector('[data-control="simulasiMode"]').checked = true; render(); });
    document.getElementById('open-accurate-import').addEventListener('click', function () { renderUploadHistory(); document.getElementById('accurate-backdrop').classList.add('is-open'); }); document.getElementById('close-accurate-import').addEventListener('click', function () { document.getElementById('accurate-backdrop').classList.remove('is-open'); resetAccurateImport(); }); document.getElementById('accurate-cancel').addEventListener('click', resetAccurateImport); document.getElementById('accurate-save').addEventListener('click', saveAccurateImport); document.getElementById('accurate-file').addEventListener('change', function () { handleAccurateFile(this.files[0]); });
    document.getElementById('export-pdf').addEventListener('click', exportPdf);
    var dropzone = document.getElementById('accurate-dropzone'); dropzone.addEventListener('dragover', function (event) { event.preventDefault(); dropzone.classList.add('is-dragging'); }); dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('is-dragging'); }); dropzone.addEventListener('drop', function (event) { event.preventDefault(); dropzone.classList.remove('is-dragging'); handleAccurateFile(event.dataTransfer.files[0]); });
    document.querySelectorAll('[data-simulation-input]').forEach(function (input) { input.addEventListener('input', function () { var outlet = outlets.find(function (item) { return item.id === input.dataset.simulationInput; }); if (outlet) outlet.simulationRevenue = Number(input.value) || 0; render(); }); }); initAccurateDb(); loadSavedAccurateRecords().then(function () { renderUploadHistory(); render(); });
  }
  document.addEventListener('DOMContentLoaded', init);
}());