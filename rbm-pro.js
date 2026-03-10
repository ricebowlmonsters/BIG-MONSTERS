(function() {
  if (!window.RBMStorage) {
    window.RBMStorage = { getItem: function(k) { return localStorage.getItem(k); }, setItem: function(k, v) { localStorage.setItem(k, v); }, ready: function() { return Promise.resolve(); } };
  }
  // Hanya Owner yang boleh menghapus/mengedit data yang sudah masuk; Manager hanya lihat & input baru
  window.rbmOnlyOwnerCanEditDelete = function() {
    try { var u = JSON.parse(localStorage.getItem('rbm_user') || '{}'); return u.role === 'owner'; } catch(e) { return false; }
  };
  function setVal(id, val) { var e = document.getElementById(id); if (e) e.value = val; }
  function getRbmOutlet() { var s = document.getElementById('rbm-outlet-select'); return (s && s.value) ? s.value : ''; }
  window.getRbmOutlet = getRbmOutlet;
  function getRbmStorageKey(baseKey) { var o = getRbmOutlet(); return o ? baseKey + '_' + o : baseKey; }
  window.onload = function() {
    var runInit = function() {
    var now = new Date();
    var fmt = function(d) { return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2); };
    var today = fmt(now);
    var firstDay = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    // Periode Gaji: Tanggal 26 Bulan Lalu s/d Tanggal 25 Bulan Ini
    var payrollStart = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 26));
    var payrollEnd = fmt(new Date(now.getFullYear(), now.getMonth(), 25));

    setVal("tanggal_barang", today);
    setVal("tanggal_keuangan", today);
    setVal("tanggal_inventaris", today);
    setVal("tanggal_pembukuan", today);
    setVal("pc_input_tanggal", today);
    setVal("pc_bulan_filter", today.slice(0, 7));
    setVal("pengajuan_saldo_date", today);
    setVal("pengajuan_filter_date_start", today);
    setVal("pengajuan_filter_date_end", today);
    setVal("pembukuan_bulan_filter", today.slice(0, 7));
    setVal("inv_tanggal_awal", firstDay);
    setVal("inv_tanggal_akhir", today);
    setVal("absensi_tgl_awal", payrollStart);
    setVal("absensi_tgl_akhir", payrollEnd);
    setVal("bonus_start_date", payrollStart);
    setVal("bonus_end_date", payrollEnd);
    setVal("res_filter_start", firstDay);
    setVal("res_filter_end", today);
    setVal("stok_bulan_filter", today.slice(0, 7));
    setVal("rekap_gps_start", payrollStart);
    setVal("rekap_gps_end", payrollEnd);
    setVal("riwayat_barang_start", firstDay);
    setVal("riwayat_barang_end", today);
    var pageView = window.RBM_PAGE || (window.location.hash || '').replace(/^#/, '');
    var containers = document.querySelectorAll('.view-container');
    if (containers.length === 1) {
      containers[0].style.display = 'block';
      var viewId = containers[0].id;
      if (viewId === 'absensi-view') renderAbsensiTable();
      else if (viewId === 'reservasi-view') renderReservasiCalendar();
      else if (viewId === 'stok-barang-view') renderStokTable();
      else if (viewId === 'absensi-gps-view') { initAbsensiGPS(); loadOfficeConfig(); if (typeof loadJamConfig === 'function') loadJamConfig(); }
      else if (viewId === 'rekap-absensi-gps-view') { populateRekapGpsFilterNama(); loadRekapAbsensiGPS(); }
    } else if (pageView && document.getElementById(pageView)) {
      showView(pageView);
    } else {
      var first = document.querySelector('.view-container');
      if (first) { first.style.display = 'block'; }
    }
    if (document.getElementById('detail-container-barang')) createBarangRows();
    if (document.getElementById('detail-container-keuangan')) createTransactionRows();
    if (document.getElementById('detail-container-inventaris')) createInventarisRows();
    if (document.getElementById('detail-container-pembukuan')) createPembukuanRows();
    if (document.getElementById('pengajuan-form-container')) createPengajuanForm();
    if (document.getElementById('pc_input_jenis')) createPettyCashInputRows();
    var saldoEl = document.getElementById("pengajuan_saldo_date");
    if (saldoEl && typeof calculateSisaUangPengajuan === 'function') calculateSisaUangPengajuan();
    var outletSel = document.getElementById('rbm-outlet-select');
    if (outletSel) outletSel.addEventListener('change', function() {
      var page = window.RBM_PAGE;
      if (page === 'absensi-view' && typeof renderAbsensiTable === 'function') {
        window._absensiViewData = undefined;
        window._absensiViewEmployees = undefined;
        renderAbsensiTable();
      }
      else if (page === 'rekap-absensi-gps-view') {
        if (typeof populateRekapGpsFilterNama === 'function') { populateRekapGpsFilterNama(); }
        if (typeof loadRekapAbsensiGPS === 'function') loadRekapAbsensiGPS();
      }
      else if (page === 'lihat-pembukuan-view' && typeof loadPembukuanData === 'function') loadPembukuanData();
      else if (page === 'lihat-petty-cash-view' && typeof loadPettyCashData === 'function') loadPettyCashData();
      else if (page === 'lihat-inventaris-view' && typeof loadInventarisData === 'function') loadInventarisData();
      else if (page === 'stok-barang-view' && typeof renderStokTable === 'function') renderStokTable();
      else if (page === 'input-barang-view' && typeof createBarangRows === 'function') createBarangRows();
      else if ((page === 'lihat-reservasi-view' || page === 'input-reservasi-view') && typeof loadReservasiData === 'function') { loadReservasiData(); if (typeof renderReservasiCalendar === 'function') renderReservasiCalendar(); }
      else if (page === 'absensi-gps-view') {
        if (typeof loadOfficeConfig === 'function') loadOfficeConfig();
        if (typeof loadJamConfig === 'function') loadJamConfig();
        if (typeof initAbsensiGPS === 'function') initAbsensiGPS();
      }
    });
    };
    if (window.RBMStorage && window.RBMStorage.ready) {
      window.RBMStorage.ready().then(runInit).catch(function() { runInit(); });
    } else {
      runInit();
    }
  };

  function showView(viewId) {
    document.querySelectorAll('.view-container').forEach(function(view) { view.style.display = 'none'; });
    var el = document.getElementById(viewId);
    if (el) el.style.display = 'block';
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector('[onclick="showView(\'' + viewId + '\')"]');
    if (activeBtn) activeBtn.classList.add('active');
    if (viewId === 'absensi-view') {
        renderAbsensiTable();
    }
    if (viewId === 'reservasi-view' || viewId === 'lihat-reservasi-view') {
        renderReservasiCalendar();
    }
    if (viewId === 'stok-barang-view') {
        renderStokTable();
    }
    if (viewId === 'absensi-gps-view') {
        initAbsensiGPS();
        loadOfficeConfig();
    }
    if (viewId === 'rekap-absensi-gps-view') {
        populateRekapGpsFilterNama();
        loadRekapAbsensiGPS();
    }
    if (viewId === 'lihat-petty-cash-view' && typeof loadPettyCashData === 'function') loadPettyCashData();
    if (viewId === 'lihat-pembukuan-view' && typeof loadPembukuanData === 'function') loadPembukuanData();
  }
  // expose globally just in case script loads after user interaction
  window.showView = showView;

  function setOutput(outputEl, msg, isSuccess) {
    if (!outputEl) return;
    outputEl.innerText = msg;
    outputEl.className = 'output-msg ' + (isSuccess ? 'success' : 'error');
  }

  function isGoogleScript() {
    return typeof google !== 'undefined' && google.script && google.script.run;
  }

  /** Jika FirebaseStorage tersedia dan terkoneksi, pakai Firebase (bukan Google Sheets). */
  function useFirebaseBackend() {
    if (typeof FirebaseStorage === 'undefined') return false;
    try {
      FirebaseStorage.init();
      return FirebaseStorage.isReady();
    } catch (e) { return false; }
  }

  // safe JSON parse utility: returns fallback when input is null/empty/invalid
  function safeParse(str, fallback) {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn('safeParse failed, returning fallback', e);
      return fallback;
    }
  }

  function sanitizeForStorage(obj) {
    if (!obj) return obj;
    const j = JSON.stringify(obj, function(k, v) {
      // if (k === 'data' && typeof v === 'string' && v.length > 5000) return '[foto-disimpan-terpisah]';
      // if (k === 'foto' && v && v.data) return { fileName: v.fileName, mimeType: v.mimeType, data: '[base64]' };
      if (k === 'fotoRusak' && v && v.data) return { fileName: v.fileName, mimeType: v.mimeType, data: '[base64]' };
      if (k === 'fotoPengajuan' && v && v.data) return { fileName: v.fileName, mimeType: v.mimeType, data: '[base64]' };
      if (k === 'fotoBukti' && v && v.data) return { fileName: v.fileName, mimeType: v.mimeType, data: '[base64]' };
      if (k === 'fotoNota' && v && v.data) return { fileName: v.fileName, mimeType: v.mimeType, data: '[base64]' };
      if (k === 'fotoTtd' && v && v.data) return { fileName: v.fileName, mimeType: v.mimeType, data: '[base64]' };
      return v;
    });
    return safeParse(j, null);
  }

  function savePendingToLocalStorage(type, payload) {
    try {
      const key = getRbmStorageKey('RBM_PENDING_' + type);
      const existing = safeParse(RBMStorage.getItem(key), []);
      const item = { ts: new Date().toISOString(), payload: sanitizeForStorage(payload) };
      existing.push(item);
      RBMStorage.setItem(key, JSON.stringify(existing));
      return true;
    } catch (e) {
      console.warn('localStorage save error', e);
      return false;
    }
  }

  function formatRupiah(n) {
    return 'Rp ' + (n || 0).toLocaleString('id-ID');
  }

  function formatRupiahInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        input.value = 'Rp ' + parseInt(value).toLocaleString('id-ID');
    } else {
        input.value = '';
    }
  }

  function createPettyCashInputRows() {
    const container = document.getElementById("detail-container-petty-cash");
    const jenis = document.getElementById("pc_input_jenis").value;
    container.innerHTML = "";

    if (!jenis) {
      for (let i = 0; i < 8; i++) {
        container.innerHTML += `<div class="row-group"><div style="flex: 2.5;"><input type="text" placeholder="Pilih Jenis Transaksi di atas" disabled></div><div style="flex: 1.2;"><input type="text" placeholder="..." disabled></div></div>`;
      }
      return;
    }

    const isPengeluaran = (jenis === 'pengeluaran');

    for (let i = 0; i < 10; i++) {
      const row = document.createElement("div");
      row.className = "row-group";

      const namaInput = `<div class="col-nama"><input type="text" class="pc_nama" placeholder="${isPengeluaran ? 'Nama Barang' : 'Keterangan'}"></div>`;
      const jumlahInput = `<div class="col-jumlah"><input type="number" class="pc_jumlah" placeholder="Qty" oninput="calculatePettyCashRowTotal(this)"></div>`;
      const hargaInput = `<div class="col-harga"><input type="number" class="pc_harga" placeholder="Harga Satuan" oninput="calculatePettyCashRowTotal(this)"></div>`;
      const totalInput = `<div class="col-total"><input type="text" class="pc_total" placeholder="Total Rp" readonly style="background: #f0f0f0; font-weight: bold;"></div>`;
      const satuanInput = `<div class="col-satuan"><input type="text" class="pc_satuan" placeholder="Satuan"></div>`;
      const fotoInput = `<div class="col-foto" style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
        <input type="file" class="pc_foto" accept="image/*" style="display:none">
        <button type="button" class="btn btn-secondary" onclick="triggerPcFoto(this, true)" style="font-size:12px;padding:4px 8px;">Kamera</button>
        <button type="button" class="btn btn-secondary" onclick="triggerPcFoto(this, false)" style="font-size:12px;padding:4px 8px;">Pilih Foto</button>
        <span class="pc_foto_label" style="font-size:12px;color:#666;">-</span>
      </div>`;
      const nominalPemasukanInput = `<div class="col-jumlah" style="flex: 1.5;"><input type="number" class="pc_nominal_pemasukan" placeholder="Nominal (Rp)"></div>`;

      if (isPengeluaran) {
        row.innerHTML = namaInput + jumlahInput + satuanInput + hargaInput + totalInput + fotoInput;
      } else {
        row.innerHTML = namaInput + nominalPemasukanInput + fotoInput;
      }

      container.appendChild(row);
      var fileInput = row.querySelector(".pc_foto");
      if (fileInput) {
        fileInput.addEventListener("change", function() {
          var label = row.querySelector(".pc_foto_label");
          if (label) label.textContent = this.files[0] ? this.files[0].name : "-";
        });
      }
    }
  }

  function triggerPcFoto(btn, useCamera) {
    var row = btn.closest(".row-group");
    if (!row) return;
    var input = row.querySelector(".pc_foto");
    if (!input) return;
    if (useCamera) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.value = "";
    input.click();
  }

  function removePettyCashInputRow(btn) {
    var row = btn.closest(".row-group");
    if (!row) return;
    var container = document.getElementById("detail-container-petty-cash");
    var rows = container.querySelectorAll(".row-group");
    if (rows.length <= 1) return;
    row.remove();
  }

  function calculatePettyCashRowTotal(element) {
    const row = element.closest('.row-group');
    const qty = parseFloat(row.querySelector(".pc_jumlah").value) || 0;
    const harga = parseFloat(row.querySelector(".pc_harga").value) || 0;
    const total = qty * harga;
    const totalField = row.querySelector(".pc_total");
    if (totalField) {
      totalField.value = total > 0 ? total.toLocaleString('id-ID') : "";
    }
  }

  function submitPettyCashData() {
    const button = document.getElementById("submitButtonPettyCash");
    const output = document.getElementById("outputPettyCash");
    const tanggal = document.getElementById("pc_input_tanggal").value;
    const jenis = document.getElementById("pc_input_jenis").value;

    button.disabled = true;
    button.innerText = "Menyimpan... ⏳";
    output.innerText = "";

    if (!tanggal || !jenis) {
      output.innerText = "⚠️ Tanggal dan Jenis Transaksi wajib diisi.";
      button.disabled = false;
      button.innerText = "Simpan Data";
      return;
    }

    const rows = document.querySelectorAll("#input-petty-cash-view .row-group");
    const transactionList = [];
    const filePromises = [];

    rows.forEach(row => {
      const namaInput = row.querySelector(".pc_nama");
      let transaction = null;

      if (jenis === 'pengeluaran') {
        const jumlahInput = row.querySelector(".pc_jumlah");
        if (namaInput && jumlahInput && namaInput.value.trim() && jumlahInput.value.trim()) {
          const hargaVal = parseFloat(row.querySelector(".pc_harga")?.value) || 0;
          const jumlahVal = parseFloat(jumlahInput.value) || 0;
          const total = (jumlahVal * hargaVal);
          transaction = {
            nama: namaInput.value.trim(),
            jumlah: jumlahInput.value.trim(),
            metode: "",
            satuan: row.querySelector(".pc_satuan")?.value.trim() || "",
            harga: row.querySelector(".pc_harga")?.value.trim() || "",
            total: total,
            foto: null
          };
        }
      } else {
        const nominalInput = row.querySelector(".pc_nominal_pemasukan");
        if (namaInput && nominalInput && namaInput.value.trim() && nominalInput.value.trim()) {
          const total = parseFloat(nominalInput.value) || 0;
          transaction = {
            nama: namaInput.value.trim(),
            jumlah: 1,
            metode: "",
            satuan: "",
            harga: total,
            total: total,
            foto: null
          };
        }
      }

      if (transaction) {
        transactionList.push(transaction);

        const fileInput = row.querySelector(".pc_foto");
        if (fileInput && fileInput.files[0]) {
          const file = fileInput.files[0];
          const promise = new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const fileData = e.target.result.split(",");
              transaction.foto = { fileName: file.name, mimeType: file.type, data: fileData[1] };
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          filePromises.push(promise);
        }
      }
    });

    if (transactionList.length === 0) {
      output.innerText = "⚠️ Masukkan minimal 1 data transaksi.";
      button.disabled = false;
      button.innerText = "Simpan Data";
      return;
    }

    Promise.all(filePromises).then(() => {
      const dataToSend = { tanggal: tanggal, jenis: jenis, transactions: transactionList };
      if (useFirebaseBackend()) {
        FirebaseStorage.savePettyCashTransactions(dataToSend, getRbmOutlet()).then(showResultPettyCash).catch(function(err) {
          showResultPettyCash('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.'));
        });
        return;
      }
      if (!isGoogleScript()) {
        savePendingToLocalStorage('PETTY_CASH', dataToSend);
        showResultPettyCash('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
        return;
      }
      google.script.run.withSuccessHandler(showResultPettyCash).simpanTransaksiBatch(dataToSend);
    }).catch(error => {
      setOutput(output, "❌ Gagal memproses file: " + error, false);
      button.disabled = false;
      button.innerText = "Simpan Data";
    });
  }

  function showResultPettyCash(res) {
    const output = document.getElementById("outputPettyCash");
    const button = document.getElementById("submitButtonPettyCash");
    setOutput(output, res, res.includes('✅'));
    button.disabled = false;
    button.innerText = "Simpan Data";
    document.getElementById("pc_input_jenis").value = "";
    createPettyCashInputRows();
    setTimeout(() => { output.innerText = "" }, 4000);
  }

function savePembukuanToJpg() {
    const monthFilter = document.getElementById("pembukuan_bulan_filter");
    const monthVal = monthFilter ? monthFilter.value : '';
    
    if (!monthVal) { alert("Pilih bulan terlebih dahulu."); return; }
    
    // Gunakan tanggal awal sebagai target
    const targetDate = monthVal + '-01';
    
    if(!confirm("Fitur Save JPG akan mencetak laporan harian untuk tanggal pertama bulan yang dipilih: " + targetDate + ". Lanjutkan?")) return;

    // Ambil data
    let pending = window._lastPembukuanPending;
    if (!pending && !useFirebaseBackend()) {
        pending = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PEMBUKUAN')), []);
    }
    if (!pending) pending = [];

    // [BARU] Hitung Saldo Awal & Total Hari Ini (Kumulatif)
    let saldoAwal = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;
    let dayData = null;

    pending.forEach(item => {
        const p = item.payload;
        if (!p || !p.tanggal) return;

        if (p.tanggal < targetDate) {
            // Akumulasi Saldo Awal (transaksi sebelum tanggal target)
            if (p.kasMasuk) {
                p.kasMasuk.forEach(m => {
                    let fisikVal = parseFloat(m.fisik) || 0;
                    if (m.keterangan && m.keterangan.toUpperCase() === 'VCR') {
                        fisikVal = (parseFloat(m.vcr) || 0) * 20000;
                    }
                    saldoAwal += fisikVal;
                });
            }
            if (p.kasKeluar) {
                p.kasKeluar.forEach(k => {
                    saldoAwal -= parseFloat(k.setor) || 0;
                });
            }
        } else if (p.tanggal === targetDate) {
            // Data hari ini
            dayData = item;
        }
    });
    
    if (!dayData && saldoAwal === 0) {
        alert("Tidak ada data untuk tanggal " + targetDate);
        return;
    }

    // [BARU] Hitung subtotal untuk hari ini agar sesuai dengan tampilan tabel
    let subtotalCatatan = 0;
    let subtotalFisik = 0;
    let subtotalSelisih = 0;
    let subtotalKeluar = 0;
    const p = dayData ? dayData.payload : { kasMasuk: [], kasKeluar: [] };

    (p.kasMasuk || []).forEach(m => {
        const catatanVal = parseFloat(m.catatan) || 0;
        let fisikVal = parseFloat(m.fisik) || 0;
        if (m.keterangan && m.keterangan.toUpperCase() === 'VCR') {
            fisikVal = (parseFloat(m.vcr) || 0) * 20000;
        }
        subtotalCatatan += catatanVal;
        subtotalFisik += fisikVal;
        subtotalSelisih += (fisikVal - catatanVal);
    });
    (p.kasKeluar || []).forEach(k => {
        subtotalKeluar += parseFloat(k.setor) || 0;
    });

    const saldoAkhir = saldoAwal + subtotalFisik - subtotalKeluar;

    // Buat elemen HTML temporary untuk di-capture
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute; top:-9999px; left:-9999px; width:600px; background:white; padding:30px; font-family:sans-serif; color:#333; border:1px solid #ccc;';
    
    let html = `
        <h2 style="text-align:center; margin:0 0 10px 0; color:#1e40af;">Laporan Pembukuan Harian</h2>
        <p style="text-align:center; margin:0 0 20px 0; font-size:14px; color:#666;">Tanggal: ${targetDate}</p>
        
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:20px; background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
            <div style="text-align:center;">
                <div style="font-size:11px; color:#666;">Saldo Awal</div>
                <div style="font-size:14px; font-weight:bold; color:#6b7280;">${formatRupiah(saldoAwal)}</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:11px; color:#666;">Masuk</div>
                <div style="font-size:14px; font-weight:bold; color:#1e40af;">${formatRupiah(subtotalFisik)}</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:11px; color:#666;">Keluar</div>
                <div style="font-size:14px; font-weight:bold; color:#dc2626;">${formatRupiah(subtotalKeluar)}</div>
            </div>
            <div style="text-align:center;">
                <div style="font-size:11px; color:#666;">Saldo Akhir</div>
                <div style="font-size:14px; font-weight:bold; color:#059669;">${formatRupiah(saldoAkhir)}</div>
            </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
                <tr style="background:#1e40af; color:white;">
                    <th style="padding:8px; border:1px solid #ccc;">Keterangan</th>
                    <th style="padding:8px; border:1px solid #ccc;">Catatan</th>
                    <th style="padding:8px; border:1px solid #ccc;">Fisik / Setor</th>
                    <th style="padding:8px; border:1px solid #ccc;">Selisih</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Render Rows
    (p.kasMasuk || []).forEach(m => {
        let fisikVal = parseFloat(m.fisik) || 0;
        let fisikDisplay = formatRupiah(fisikVal);
        if (m.keterangan && m.keterangan.toUpperCase() === 'VCR') {
            fisikVal = (parseFloat(m.vcr) || 0) * 20000;
            fisikDisplay = `${m.vcr} (VCR)`;
        }
        let selisihVal = fisikVal - (parseFloat(m.catatan) || 0);
        html += `<tr><td style="padding:6px; border:1px solid #eee;">${m.keterangan}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${formatRupiah(m.catatan)}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${fisikDisplay}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${formatRupiah(selisihVal)}</td></tr>`;
    });

    // [BARU] Tambahkan baris subtotal
    html += `<tr style="background:#e2e8f0; font-weight:bold;"><td style="padding:6px; border:1px solid #eee; text-align:center;">TOTAL</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${formatRupiah(subtotalCatatan)}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${formatRupiah(subtotalFisik)}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${formatRupiah(subtotalSelisih)}</td></tr>`;

    (p.kasKeluar || []).forEach(k => {
        html += `<tr style="background:#f0fdf4;"><td style="padding:6px; border:1px solid #eee;">${k.keterangan}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">-</td><td style="padding:6px; border:1px solid #eee; text-align:right;">${formatRupiah(k.setor)}</td><td style="padding:6px; border:1px solid #eee; text-align:right;">-</td></tr>`;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    html2canvas(wrap, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Laporan_Pembukuan_${targetDate}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        document.body.removeChild(wrap);
    }).catch(err => {
        alert("Gagal menyimpan JPG: " + err);
        document.body.removeChild(wrap);
    });
}

  function loadPettyCashData() {
    const tbody = document.getElementById("pc_tbody");
    const summaryEl = document.getElementById("pc_summary");
    if (!tbody || !summaryEl) return;

    tbody.innerHTML = '<tr><td colspan="11" class="table-loading">Memuat data...</td></tr>';
    summaryEl.style.display = 'none';

    const monthFilter = document.getElementById("pc_bulan_filter");
    const monthVal = monthFilter ? monthFilter.value : '';
    if (!monthVal) {
        tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Pilih bulan terlebih dahulu.</td></tr>';
        summaryEl.style.display = 'none';
        return;
    }
    const [year, month] = monthVal.split('-');
    const tglAwal = `${year}-${month}-01`;
    const tglAkhir = new Date(year, parseInt(month, 10), 0).toLocaleDateString('sv').slice(0, 10);

    function renderPettyCashFromResult(result) {
      var data = result && result.data ? result.data : [];
      var summary = (result && result.summary) ? result.summary : { totalDebit: 0, totalKredit: 0, saldoAkhir: 0 };
      window._lastPettyCashData = data;
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Tidak ada data untuk rentang tanggal ini.</td></tr>';
      } else {
        tbody.innerHTML = data.map(function(row) {
          var aksiBtn = (row._firebaseDate != null && row._firebaseIndexInDate != null)
            ? '<button type="button" class="btn btn-secondary" style="font-size:11px; padding:4px 8px; margin-right:4px; background:#ffc107; color:#000; border:none;" onclick="editPettyCashItemFirebase(\'' + (row._firebaseDate || '') + '\', ' + (row._firebaseIndexInDate ?? '') + ')">Edit</button><button class="btn-small-danger" onclick="deletePettyCashItemFirebase(\'' + (row._firebaseDate || '') + '\', ' + (row._firebaseIndexInDate ?? '') + ')">Hapus</button>'
            : '-';
          return '<tr><td>' + (row.no || '') + '</td><td>' + (row.tanggal || '') + '</td><td>' + (row.nama || '') + '</td><td class="num">' + (row.jumlah || '') + '</td><td>' + (row.satuan || '') + '</td><td class="num">' + (row.harga ? formatRupiah(row.harga) : '') + '</td><td class="num">' + (row.debit ? formatRupiah(row.debit) : '') + '</td><td class="num">' + (row.kredit ? formatRupiah(row.kredit) : '') + '</td><td class="num">' + (row.saldo ? formatRupiah(row.saldo) : '') + '</td><td>' + (row.foto ? '<a class="foto-link" href="' + row.foto + '" target="_blank">Lihat</a>' : '-') + '</td><td>' + aksiBtn + '</td></tr>';
        }).join('');
      }
      summaryEl.style.display = 'grid';
      var totalDebitEl = document.getElementById("pc_total_debit");
      var saldoAwalEl = document.getElementById("pc_saldo_awal");
      var totalKreditEl = document.getElementById("pc_total_kredit");
      var saldoAkhirEl = document.getElementById("pc_saldo_akhir");
      if (totalDebitEl) totalDebitEl.textContent = formatRupiah(summary.totalDebit || 0);
      // [UBAH] Total Kredit = Saldo Awal + Total Pemasukan Periode Ini
      var totalDana = (summary.saldoAwal || 0) + (summary.totalKredit || 0);
      if (totalKreditEl) totalKreditEl.textContent = formatRupiah(totalDana);
      if (saldoAkhirEl) saldoAkhirEl.textContent = formatRupiah(summary.saldoAkhir || 0);
      if (saldoAwalEl) saldoAwalEl.textContent = formatRupiah(summary.saldoAwal || 0);
    }

    if (useFirebaseBackend() && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.getPettyCash) {
      FirebaseStorage.getPettyCash(tglAwal, tglAkhir, getRbmOutlet()).then(renderPettyCashFromResult).catch(function(err) {
        tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Gagal memuat: ' + (err && err.message ? err.message : '') + '</td></tr>';
        summaryEl.style.display = 'none';
      });
      return;
    }
    if (!isGoogleScript()) {
      const pending = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PETTY_CASH')), []);
      if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Tidak ada data. Buka dari Google Apps Script untuk data dari sheet, atau input data dulu.</td></tr>';
        return;
      }
      let no = 0;
      let totalDebit = 0, totalKredit = 0;
      let saldoAwal = 0;
      let runningSaldo = 0;
      const rows = [];
      
      // Sort data pending berdasarkan tanggal agar perhitungan saldo urut
      pending.sort((a, b) => (a.payload.tanggal || '').localeCompare(b.payload.tanggal || ''));

      pending.forEach(function(item, parentIdx) {
        const p = item.payload || {};
        
        // [FIX] Filter data berdasarkan tanggal yang dipilih
        let d = p.tanggal || '';
        // Normalize stored date to YYYY-MM-DD (pad single digits) just for comparison
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(d)) {
             const parts = d.split('-');
             d = parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0');
        }
        
        // Jika tanggal sebelum periode, hitung sebagai Saldo Awal
        if (d < tglAwal) {
            (p.transactions || []).forEach(function(trx) {
                const debit = (p.jenis === 'pengeluaran' && trx.total) ? parseFloat(trx.total) || 0 : 0;
                const kredit = (p.jenis === 'pemasukan' && trx.total) ? parseFloat(trx.total) || 0 : 0;
                saldoAwal = saldoAwal - debit + kredit;
            });
            return;
        }
        
        // Jika tanggal setelah periode, abaikan
        if (d > tglAkhir) return;

        // Set runningSaldo awal jika ini baris pertama yang ditampilkan
        if (rows.length === 0) runningSaldo = saldoAwal;

        (p.transactions || []).forEach(function(trx, trxIdx) {
          no++;
          const debit = (p.jenis === 'pengeluaran' && trx.total) ? parseFloat(trx.total) || 0 : 0;
          const kredit = (p.jenis === 'pemasukan' && trx.total) ? parseFloat(trx.total) || 0 : 0;
          totalDebit += debit;
          totalKredit += kredit;
          runningSaldo = runningSaldo - debit + kredit;
          
          let fotoDisplay = '-';
          if (trx.foto && trx.foto.data && trx.foto.data !== '[base64]') {
            fotoDisplay = `<img src="data:${trx.foto.mimeType};base64,${trx.foto.data}" style="height:40px; border-radius:4px; cursor:pointer;" title="${trx.foto.fileName}" onclick="showImageModal(this.src)">`;
          }
          
          rows.push({ no, tanggal: p.tanggal || '-', nama: trx.nama || '', jumlah: trx.jumlah, satuan: trx.satuan || '', harga: trx.harga || '', debit, kredit, saldo: runningSaldo, foto: fotoDisplay, parentIdx, trxIdx });
        });
      });
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Tidak ada data untuk rentang ini.</td></tr>';
        // [FIX] Reset summary jika tidak ada data
        document.getElementById("pc_total_debit").textContent = formatRupiah(0);
        document.getElementById("pc_total_kredit").textContent = formatRupiah(0);
        document.getElementById("pc_saldo_akhir").textContent = formatRupiah(saldoAwal); // Tampilkan saldo awal sebagai saldo akhir
        if (document.getElementById("pc_saldo_awal")) document.getElementById("pc_saldo_awal").textContent = formatRupiah(saldoAwal);
        return;
      }
      tbody.innerHTML = rows.map(row => `
        <tr>
          <td>${row.no}</td>
          <td>${row.tanggal}</td>
          <td>${row.nama}</td>
          <td class="num">${row.jumlah || ''}</td>
          <td>${row.satuan}</td>
          <td class="num">${row.harga ? formatRupiah(row.harga) : ''}</td>
          <td class="num">${row.debit ? formatRupiah(row.debit) : ''}</td>
          <td class="num">${row.kredit ? formatRupiah(row.kredit) : ''}</td>
          <td class="num">${formatRupiah(row.saldo)}</td>
          <td>${row.foto}</td>
          <td><button type="button" class="btn btn-secondary" style="font-size:11px; padding:4px 8px; margin-right:4px; background:#ffc107; color:#000; border:none;" onclick="editPettyCashItem(${row.parentIdx}, ${row.trxIdx})">Edit</button><button class="btn-small-danger" onclick="deletePettyCashItem(${row.parentIdx}, ${row.trxIdx})">Hapus</button></td>
        </tr>
      `).join('');
      summaryEl.style.display = 'grid';
      document.getElementById("pc_total_debit").textContent = formatRupiah(totalDebit);
      if (document.getElementById("pc_saldo_awal")) document.getElementById("pc_saldo_awal").textContent = formatRupiah(saldoAwal);
      // [UBAH] Total Kredit = Saldo Awal + Total Pemasukan Periode Ini
      document.getElementById("pc_total_kredit").textContent = formatRupiah(saldoAwal + totalKredit);
      document.getElementById("pc_saldo_akhir").textContent = formatRupiah(runningSaldo);
      return;
    }

    google.script.run
      .withSuccessHandler(function(result) {
        if (result.error) {
          tbody.innerHTML = '<tr><td colspan="11" class="table-empty">' + result.error + '</td></tr>';
          return;
        }
        const data = result.data || [];
        const summary = result.summary || {};

        if (data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Tidak ada data untuk rentang tanggal ini.</td></tr>';
        } else {
          tbody.innerHTML = data.map(row => `
            <tr>
              <td>${row.no || ''}</td>
              <td>${row.tanggal || ''}</td>
              <td>${row.nama || ''}</td>
              <td class="num">${row.jumlah || ''}</td>
              <td>${row.satuan || ''}</td>
              <td class="num">${row.harga ? formatRupiah(row.harga) : ''}</td>
              <td class="num">${row.debit ? formatRupiah(row.debit) : ''}</td>
              <td class="num">${row.kredit ? formatRupiah(row.kredit) : ''}</td>
              <td class="num">${row.saldo ? formatRupiah(row.saldo) : ''}</td>
              <td>${row.foto ? '<a class="foto-link" href="' + row.foto + '" target="_blank">Lihat</a>' : '-'}</td>
              <td>-</td>
            </tr>
          `).join('');
        }

        summaryEl.style.display = 'grid';
        document.getElementById("pc_total_debit").textContent = formatRupiah(summary.totalDebit);
        if (document.getElementById("pc_saldo_awal")) document.getElementById("pc_saldo_awal").textContent = formatRupiah(summary.saldoAwal || 0);
        document.getElementById("pc_total_kredit").textContent = formatRupiah(summary.totalKredit);
        document.getElementById("pc_saldo_akhir").textContent = formatRupiah(summary.saldoAkhir);
      })
      .withFailureHandler(function(err) {
        tbody.innerHTML = '<tr><td colspan="11" class="table-empty">Gagal memuat: ' + err.message + '</td></tr>';
      })
      .getDataPettyCash(tglAwal, tglAkhir);
  }

  const defaultSisaItems = ["S. Vietnam", "S. Teriyaki", "S. Madu", "S. Asam Manis", "S. Ladah Hitam", "Daging Rice Bowl", "Ayam Rice Bowl", "Ayam Filet", "Toping Ayam", "Toping Jamur", "K. Merah", "K. Hijau", "Timun", "Tomat", "Pokcoy", "Bombay", "Daun Bawang", "Semangka", "Melon", "Buah Naga", "Nutrijel Gelap", "Nutrijel Terang", "Gula Es Campur", "S. Jawa", "Beras"];
  const defaultInventarisItems = ["Name Tag", "Baju", "Topi", "Apron", "Sumpit Kecil", "Sumpit Besar", "Sompet Besi", "Tray Waiter", "Tray Kasir", "tray Kecil", "Astray", "Sendok", "Garbu", "Tempat Es CMPR", "Sendok Es CMPR K", "Sendok Es CMPR B", "Mangkok 1p", "Mangkok 2p", "Mangkok 4p", "Mangkok 8p", "Mangkok 10p", "Mangkok 30p", "Mangkok Mie Kuah", "Mangkok Rice Bowl", "Mangkok Kuah", "Meja", "Kursi Hitam", "Kursi Kayu", "Tempat Sambel Kotak Hitam", "Tempat Sambel", "Tempat Sambel Besar", "Tempat Sambel Kotak", "Tempat Saos", "Tempat Tusuk Gigi", "Nomer Meja", "Tempat Menu", "Gelas Panas", "Gelas Dingin", "Saringan Mie", "Serok Pengorengan", "Stainless Bulat Cuci Beras", "Capitan Setelsis", "Piring Gorengan Kecil", "Piring gorengan Besar", "Tutup Stainless Kecil 22", "Tutup Stainless Besar", "Tempat Sambal Stainless", "Waterjack Kecil", "Waterjack Besar", "Loyang Stainless", "Tutup Stainless Sedang", "Food Pan Stenlist GN 1/9", "Food Pan Stenlist GN 1/3", "Food Pan Stenlist GN 1/3 (200)", "Panci", "Wajan Kecil", "Wajan Besar", "Teflon", "Solet Telur", "Sutil Plastik", "Cetakan Telur", "Kompor Getra (Mie)", "Kompor Miyako", "Kompor Tungku", "Kompor Dudukan", "Kompor Jos", "Pengorengan", "Kompor Rumah Tangga", "Kompor Tungku", "Kompor Dudukan", "Tempat Pemanas Air", "Fliser", "Chiler", "Pendingin Air", "Penghangat Air", "Rice Cooker", "Magic Jar", "Kompor Hook", "Fryerr", "Rak Piring Kecil", "Rak Piring Besar", "Rak Barang", "Freezer kecil", "Freezer BESAR", "Kipas Angin Kecil", "Kipas Angin Besar", "Kulkas", "Blender", "Meja Dapur", "Washtaffle", "Botol Kecap Asin", "Rak Bumbu", "Botol Telur/SKM", "Skup Tepung", "Keranjang Freezer", "Sutil Stainless", "Dispenser Tisu", "Galon", "Talenan", "Timbangan", "Pisau Kecil", "Pisau Sedang", "Pisau Besar", "Pisau Roti", "Apar Pemadam", "Corong", "Tempat Sampah Kecil", "Tempat Sampah Besar", "Troli", "Payung", "Tempat Payung", "Mosquito Killer Kriskow", "Kulkas Kecil", "Electric Ice Shaver", "Gea", "Cup Sealer", "Mesin Gula", "Tempat Es Batu Kristal", "Rak Bar + Krupuk", "Tempat Cup 12 oz", "Ciller Kondimen Es Campur", "Tempat Biru Sendok Garbu", "Rak Kecil Stainlees", "Standing Menu Besar", "Standing Menu Kecil", "Print Checker", "Astray Sampah", "Mesin EDC Mandiri", "Mesin EDC BCA", "Kalkulator", "Pembatas Kasir", "Mesin Absen", "Karpet Playground", "Kuda", "Prosotan", "Standing Bunga", "Baby Chair", "Semprotan", "Karpet Karet Hutam", "Speaker", "Mixer", "Mix", "Akrilik Open/Close", "Keset", "Rak Meja Waiter", "Sikat Besar", "Sikat Kecil", "Sikat WC", "Spons Kuning Hija", "Skep Kecil", "Skep Besar", "Loby Duster", "Watering Pot", "Pel 1 Set", "Dispenser Tisu Kecil", "Dispenser Stella Matic Refill", "Pengharum Ruangan", "Burung Hantu", "Bak", "Gayung", "Botol Sabun Cuci Tangan", "Pager Gantung", "Daun Gantung", "Daun Gantung Bulat", "Mini Pot Kamar Mandi", "Pigora Kecil", "Pigora sedang", "pigora besar", "Gantungan baju", "Lap Kecil", "Blower", "Jam dinding", "Cikrak", "Sapu", "Pel Bar", "Remote AC", "Pigora Menu", "Papan kecil", "Papan Sedang", "CCTV", "Remote TB", "Tusuk Print Checker", "Bel", "NeonBox", "Standing Warming", "Bax Biru", "Cas Type C", "Hp Resto", "Mouse", "Stapless", "Layar Proyektor", "Di spenser solasi", "Gunting kecil", "Gunting sedang", "PC"];

  function createBarangRows(){
    const container=document.getElementById("detail-container-barang");
    container.innerHTML="";
    const jenis=document.getElementById("jenis_barang").value;
    
    // --- Datalist logic start ---
    const oldDatalist1 = document.getElementById("nama-items");
    if(oldDatalist1) oldDatalist1.remove();
    const oldDatalist2 = document.getElementById("barang-items-datalist");
    if(oldDatalist2) oldDatalist2.remove();

    // Create datalist from Stok Barang (aman jika sales/fruits/notsales bukan array)
    const stokKey = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_STOK_ITEMS') : 'RBM_STOK_ITEMS';
    const raw = safeParse(RBMStorage.getItem(stokKey), { sales: [], fruits: [], notsales: [] });
    const sales = Array.isArray(raw && raw.sales) ? raw.sales : [];
    const fruits = Array.isArray(raw && raw.fruits) ? raw.fruits : [];
    const notsales = Array.isArray(raw && raw.notsales) ? raw.notsales : [];
    const combinedItems = [ ...sales, ...fruits, ...notsales ];
    const uniqueNames = [...new Set(combinedItems.map(item => item.name))];

    if (uniqueNames.length > 0) {
        const datalist = document.createElement("datalist");
        datalist.id = "barang-items-datalist";
        datalist.innerHTML = uniqueNames.map(item => `<option value="${item}"></option>`).join("");
        document.body.appendChild(datalist);
    }
    // --- Datalist logic end ---

    for(let i=0;i<9;i++){
        const row=document.createElement("div");
        row.className="row-group";
        
        const namaDiv=document.createElement("div");
        namaDiv.style.flex="2.5";
        const namaInput=document.createElement("input");
        namaInput.type="text";
        namaInput.className="nama_barang";
        namaInput.placeholder="Nama Barang";
        if(jenis && uniqueNames.length > 0){ 
            namaInput.setAttribute("list","barang-items-datalist");
        }
        namaDiv.appendChild(namaInput);

        const satuanDiv=document.createElement("div");
        satuanDiv.style.flex="0.9";
        satuanDiv.style.minWidth="60px";
        const satuanInput=document.createElement("input");
        satuanInput.type="text";
        satuanInput.className="satuan_barang";
        satuanInput.placeholder="Satuan";
        satuanInput.readOnly=true;
        satuanInput.style.background="#f0f0f0";
        satuanInput.style.cursor="default";
        satuanInput.title="Otomatis dari Stok Barang";
        satuanDiv.appendChild(satuanInput);
        namaInput.addEventListener("input", function(){
            const unit = getStokUnitByName(this.value);
            satuanInput.value = unit;
        });
        namaInput.addEventListener("change", function(){
            const unit = getStokUnitByName(this.value);
            satuanInput.value = unit;
        });
        
        const jumlahDiv=document.createElement("div");
        jumlahDiv.style.flex="1.2";
        const jumlahInput=document.createElement("input");
        jumlahInput.type="number";
        jumlahInput.className="jumlah_barang";
        jumlahInput.placeholder="Jumlah";
        jumlahDiv.appendChild(jumlahInput);
        
        const barangJadiDiv=document.createElement("div");
        barangJadiDiv.style.flex="1.2";
        barangJadiDiv.style.display=jenis==="barang keluar"?"block":"none";
        const barangJadiInput=document.createElement("input");
        barangJadiInput.type="text";
        barangJadiInput.className="barangjadi_barang";
        barangJadiInput.placeholder="Barang Jadi";
        barangJadiDiv.appendChild(barangJadiInput);

        const keteranganRusakDiv = document.createElement("div");
        keteranganRusakDiv.style.flex = "2";
        keteranganRusakDiv.style.display = jenis === "rusak" ? "block" : "none";
        const keteranganRusakInput = document.createElement("textarea");
        keteranganRusakInput.className = "keterangan_rusak";
        keteranganRusakInput.placeholder = "Keterangan mengapa rusak...";
        keteranganRusakInput.rows = 1;
        keteranganRusakDiv.appendChild(keteranganRusakInput);

        const rusakTujuanDiv = document.createElement("div");
        rusakTujuanDiv.style.flex = "1.8";
        rusakTujuanDiv.style.display = jenis === "rusak" ? "block" : "none";
        rusakTujuanDiv.title = "Pilih kategori tujuan rusak: Same Item on Sales, Fruits & Vegetables, atau Same Item Not Sales";
        const rusakTujuanLabel = document.createElement("label");
        rusakTujuanLabel.style.display = "block";
        rusakTujuanLabel.style.fontSize = "11px";
        rusakTujuanLabel.style.color = "#64748b";
        rusakTujuanLabel.style.marginBottom = "2px";
        rusakTujuanLabel.textContent = "Rusak masuk ke:";
        rusakTujuanDiv.appendChild(rusakTujuanLabel);
        const rusakTujuanSelect = document.createElement("select");
        rusakTujuanSelect.className = "rusak_tujuan_kategori";
        rusakTujuanSelect.innerHTML = '<option value="sales">Same Item on Sales</option><option value="fruits">Fruits & Vegetables</option><option value="notsales">Same Item Not Sales</option>';
        rusakTujuanSelect.style.padding = "6px 8px";
        rusakTujuanSelect.style.width = "100%";
        rusakTujuanDiv.appendChild(rusakTujuanSelect);

        const fotoRusakDiv = document.createElement("div");
        fotoRusakDiv.style.flex = "1.5";
        fotoRusakDiv.style.display = jenis === "rusak" ? "block" : "none";
        const fotoRusakInput = document.createElement("input");
        fotoRusakInput.type = "file";
        fotoRusakInput.className = "foto_barang_rusak";
        fotoRusakInput.accept = "image/*";
        fotoRusakDiv.appendChild(fotoRusakInput);

        row.appendChild(namaDiv);
        row.appendChild(satuanDiv);
        row.appendChild(jumlahDiv);
        row.appendChild(barangJadiDiv);
        row.appendChild(keteranganRusakDiv);
        row.appendChild(rusakTujuanDiv);
        row.appendChild(fotoRusakDiv);
        container.appendChild(row)
    }
}

function submitDataBarang(){
    const button=document.getElementById("submitButtonBarang");
    button.disabled=true;
    button.innerText="Menyimpan... ⏳";
    const tanggal=document.getElementById("tanggal_barang").value;
    const jenis=document.getElementById("jenis_barang").value;
    const rows=document.querySelectorAll("#input-barang-view .row-group");
    const dataList=[];
    const filePromises = [];
    const stokUpdates = [];
    const reportItems = []; // Array untuk menampung laporan status stok

    if(!tanggal||!jenis){
        document.getElementById("outputBarang").innerText="⚠️ Tanggal dan Jenis wajib diisi.";
        button.disabled=false;
        button.innerText="Simpan Data Barang";
        return
    }
    
    rows.forEach(row=>{
        const nama=row.querySelector(".nama_barang").value.trim();
        const jumlah=row.querySelector(".jumlah_barang").value.trim();
        const barangjadi=row.querySelector(".barangjadi_barang")?.value.trim()||"";
        
        if(nama&&jumlah){
            const itemData = {tanggal,jenis,nama,jumlah,barangjadi, keteranganRusak: null, fotoRusak: null, tujuanKategori: null};
            
            if (jenis === 'rusak') {
                itemData.keteranganRusak = row.querySelector(".keterangan_rusak")?.value.trim() || "";
                itemData.tujuanKategori = row.querySelector(".rusak_tujuan_kategori")?.value || "sales";
                const fotoInput = row.querySelector(".foto_barang_rusak");
                if (fotoInput && fotoInput.files[0]) {
                    const file = fotoInput.files[0];
                    const promise = new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = e => {
                            const fileData = e.target.result.split(",");
                            itemData.fotoRusak = { fileName: file.name, mimeType: file.type, data: fileData[1] };
                            resolve();
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    filePromises.push(promise);
                }
            }
            dataList.push(itemData);
        }
    });
    
    if(dataList.length===0){
        document.getElementById("outputBarang").innerText="⚠️ Masukkan minimal 1 data barang.";
        button.disabled=false;
        button.innerText="Simpan Data Barang";
        return
    }

    Promise.all(filePromises).then(() => {
        // Validasi: barang rusak wajib ada keterangan ATAU foto (minimal salah satu)
        const rusakRows = dataList.filter(d => d.jenis === 'rusak');
        const rusakInvalid = rusakRows.some(d => {
            const hasKet = d.keteranganRusak && d.keteranganRusak.trim();
            const hasFoto = d.fotoRusak && d.fotoRusak.data;
            return !hasKet && !hasFoto;
        });
        if (rusakInvalid) {
            document.getElementById("outputBarang").innerText = "⚠️ Barang rusak wajib diisi Keterangan atau Foto (minimal salah satu).";
            button.disabled = false;
            button.innerText = "Simpan Data Barang";
            return;
        }

        const stokUpdates = [];
        const reportItems = [];
        dataList.forEach(itemData => {
            let itemInfo = null;
            if (itemData.jenis === 'rusak') {
                itemInfo = findStokItemIdByCategory(itemData.nama, itemData.tujuanKategori || 'sales');
                if (!itemInfo) itemInfo = findStokItemId(itemData.nama);
            } else {
                itemInfo = findStokItemId(itemData.nama);
            }
            let isNew = false;
            if (!itemInfo) {
                const stokKey = getRbmStorageKey('RBM_STOK_ITEMS');
                const allItems = safeParse(RBMStorage.getItem(stokKey), { sales: [], fruits: [], notsales: [] });
                const newId = Date.now() + Math.floor(Math.random() * 10000);
                const newItem = { id: newId, name: itemData.nama, unit: 'Pcs', ratio: 1 };
                allItems.sales.push(newItem);
                RBMStorage.setItem(stokKey, JSON.stringify(allItems));
                itemInfo = { id: newId, category: 'sales', ratio: 1, name: itemData.nama };
                isNew = true;
            }
            if (itemInfo) {
                const u = { id: itemInfo.id, date: itemData.tanggal, type: itemData.jenis, qty: parseFloat(itemData.jumlah), extra: itemData.barangjadi };
                if (itemData.jenis === 'rusak') {
                    u.keterangan = itemData.keteranganRusak || '';
                    u.foto = itemData.fotoRusak || null;
                }
                stokUpdates.push(u);
                reportItems.push({ name: itemData.nama, category: itemInfo.category, date: itemData.tanggal, isNew: isNew });
            }
        });

        if (!isGoogleScript()) {
          savePendingToLocalStorage('BARANG', dataList);
          processStokUpdates(stokUpdates);
          if (reportItems.length > 0) {
              let msg = "Laporan Update Stok:\n";
              reportItems.forEach(item => {
                  msg += `- ${item.name}: Masuk ke kategori '${item.category}' pada tgl ${item.date}`;
                  if (item.isNew) msg += " (Item Baru - Default Sales)";
                  msg += "\n";
              });
              msg += "\nJika tidak muncul di tabel, pastikan Anda melihat Tab Kategori dan Bulan yang sesuai.";
              alert(msg);
          }
          showResultBarang('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
          return;
        }
        if (useFirebaseBackend()) {
          FirebaseStorage.saveDatabaseBarang(dataList).then(showResultBarang).catch(function(err) { showResultBarang('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
          return;
        }
        google.script.run.withSuccessHandler(showResultBarang).simpanDataOnline(dataList);
    }).catch(error => {
        document.getElementById("outputBarang").innerText="❌ Gagal memproses file: "+error;
        button.disabled=false;
        button.innerText="Simpan Data";
    });
}

function showResultBarang(res) {
  const output = document.getElementById("outputBarang");
  const button = document.getElementById("submitButtonBarang");
  output.innerText = res;
  button.disabled = false;
  button.innerText = "Simpan Data Barang";
  document.getElementById("jenis_barang").value = "";
  createBarangRows();
  setTimeout(() => { output.innerText = "" }, 3000);
}

function createTransactionRows() {
  const container = document.getElementById("detail-container-keuangan");
  const jenis = document.getElementById("jenis_transaksi").value;
  container.innerHTML = "";

  if (!jenis) {
    for (let i = 0; i < 8; i++) {
      container.innerHTML += `<div class="row-group"><div style="flex: 2.5;"><input type="text" placeholder="Pilih Jenis Transaksi di atas" disabled></div><div style="flex: 1.2;"><input type="text" placeholder="..." disabled></div></div>`;
    }
    return;
  }

  const isPengeluaran = (jenis === 'pengeluaran');

  for (let i = 0; i < 10; i++) {
    const row = document.createElement("div");
    row.className = "row-group";

    const namaInput = `<div class="col-nama"><input type="text" class="nama_keuangan" placeholder="${isPengeluaran ? 'Nama Barang' : 'Keterangan'}"></div>`;
    const jumlahInput = `<div class="col-jumlah"><input type="number" class="jumlah_keuangan" placeholder="Qty" oninput="calculateRowTotal(this)"></div>`;
    const hargaInput = `<div class="col-harga"><input type="number" class="harga_keuangan" placeholder="Harga Satuan" oninput="calculateRowTotal(this)"></div>`;
    const totalInput = `<div class="col-total"><input type="text" class="total_keuangan" placeholder="Total Rp" readonly style="background: #f0f0f0; font-weight: bold;"></div>`;
    const satuanInput = `<div class="col-satuan"><input type="text" class="satuan_keuangan" placeholder="Satuan"></div>`;
    const fotoInput = `<div class="col-foto"><input type="file" class="foto_keuangan" accept="image/*"></div>`;

    if (isPengeluaran) {
      row.innerHTML = namaInput + jumlahInput + satuanInput + hargaInput + totalInput + fotoInput;
    } else {
      row.innerHTML = namaInput + jumlahInput + fotoInput;
    }

    container.appendChild(row);
  }
}

function calculateRowTotal(element) {
  const row = element.closest('.row-group');
  const qty = parseFloat(row.querySelector(".jumlah_keuangan").value) || 0;
  const harga = parseFloat(row.querySelector(".harga_keuangan").value) || 0;
  const total = qty * harga;
  const totalField = row.querySelector(".total_keuangan");
  if (totalField) {
    totalField.value = total > 0 ? total.toLocaleString('id-ID') : "";
  }
}

function submitTransactions() {
  const button = document.getElementById("submitButtonKeuangan");
  const output = document.getElementById("outputKeuangan");
  const tanggal = document.getElementById("tanggal_keuangan").value;
  const jenis = document.getElementById("jenis_transaksi").value;

  button.disabled = true;
  button.innerText = "Menyimpan... ⏳";
  output.innerText = "";

  if (!tanggal || !jenis) {
    output.innerText = "⚠️ Tanggal dan Jenis Transaksi wajib diisi.";
    button.disabled = false;
    button.innerText = "Simpan Transaksi";
    return;
  }

  const rows = document.querySelectorAll("#input-keuangan-view .row-group");
  const transactionList = [];
  const filePromises = [];

  rows.forEach(row => {
    const namaInput = row.querySelector(".nama_keuangan");
    const jumlahInput = row.querySelector(".jumlah_keuangan");

    if (namaInput && jumlahInput && namaInput.value.trim() && jumlahInput.value.trim()) {
      const transaction = {
        nama: namaInput.value.trim(),
        jumlah: jumlahInput.value.trim(),
        metode: row.querySelector(".metode_keuangan")?.value.trim() || "",
        satuan: row.querySelector(".satuan_keuangan")?.value.trim() || "",
        harga: row.querySelector(".harga_keuangan")?.value.trim() || "",
        total: (parseFloat(jumlahInput.value) || 0) * (parseFloat(row.querySelector(".harga_keuangan")?.value) || 0),
        foto: null
      };
      transactionList.push(transaction);

      const fileInput = row.querySelector(".foto_keuangan");
      if (fileInput && fileInput.files[0]) {
        const file = fileInput.files[0];
        const promise = new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fileData = e.target.result.split(",");
            transaction.foto = { fileName: file.name, mimeType: file.type, data: fileData[1] };
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        filePromises.push(promise);
      }
    }
  });

  if (transactionList.length === 0) {
    output.innerText = "⚠️ Masukkan minimal 1 data transaksi.";
    button.disabled = false;
    button.innerText = "Simpan Transaksi";
    return;
  }

  Promise.all(filePromises).then(() => {
    const dataToSend = { tanggal: tanggal, jenis: jenis, transactions: transactionList };
    if (useFirebaseBackend()) {
      FirebaseStorage.savePettyCashTransactions(dataToSend, getRbmOutlet()).then(showResultKeuangan).catch(function(err) { showResultKeuangan('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
      return;
    }
    if (!isGoogleScript()) {
      savePendingToLocalStorage('KEUANGAN', dataToSend);
      showResultKeuangan('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
      return;
    }
    google.script.run.withSuccessHandler(showResultKeuangan).simpanTransaksiBatch(dataToSend);
  }).catch(error => {
    output.innerText = "❌ Gagal memproses file: " + error;
    button.disabled = false;
    button.innerText = "Simpan Transaksi";
  });
}

function showResultKeuangan(res) {
  const output = document.getElementById("outputKeuangan");
  const button = document.getElementById("submitButtonKeuangan");
  output.innerText = res;
  button.disabled = false;
  button.innerText = "Simpan Transaksi";
  document.getElementById("jenis_transaksi").value = "";
  createTransactionRows();
  setTimeout(() => { output.innerText = "" }, 4000);
}

function getInventarisDaftarBarang() {
  var key = getRbmStorageKey('RBM_INVENTARIS_DAFTAR_BARANG');
  var raw = RBMStorage.getItem(key);
  var arr = safeParse(raw, []);
  if (!Array.isArray(arr)) return defaultInventarisItems.slice();
  if (arr.length === 0) return defaultInventarisItems.slice();
  return arr;
}

function setInventarisDaftarBarang(arr) {
  var key = getRbmStorageKey('RBM_INVENTARIS_DAFTAR_BARANG');
  RBMStorage.setItem(key, JSON.stringify(Array.isArray(arr) ? arr : []));
}

function addInventarisDaftarBarang(nama) {
  var n = (nama || '').trim();
  if (!n) return;
  var list = getInventarisDaftarBarang();
  if (!Array.isArray(list)) list = [];
  else list = list.slice();
  if (list.indexOf(n) >= 0) return;
  list.push(n);
  list.sort(function(a, b) { return String(a).localeCompare(String(b)); });
  setInventarisDaftarBarang(list);
  var inp = document.getElementById('inv_daftar_barang_nama');
  if (inp) inp.value = '';
  renderInventarisDaftarBarang();
  if (document.getElementById('detail-container-inventaris') && typeof createInventarisRows === 'function') createInventarisRows();
}

function removeInventarisDaftarBarang(idx) {
  var list = getInventarisDaftarBarang();
  if (!Array.isArray(list)) list = [];
  else list = list.slice();
  if (idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  setInventarisDaftarBarang(list.length ? list : []);
  renderInventarisDaftarBarang();
  if (document.getElementById('detail-container-inventaris') && typeof createInventarisRows === 'function') createInventarisRows();
}

function renderInventarisDaftarBarang() {
  var tbody = document.getElementById('inv_daftar_barang_tbody');
  if (!tbody) return;
  var list = getInventarisDaftarBarang();
  if (!Array.isArray(list)) list = [];
  tbody.innerHTML = list.map(function(nama, i) {
    var esc = ('' + nama).replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/>/g, '&gt;');
    return '<tr><td>' + esc + '</td><td><button type="button" onclick="removeInventarisDaftarBarang(' + i + ')" style="background:#fff; color:#333; border:1px solid #ccc; padding:6px 10px; font-size:14px; cursor:pointer; border-radius:4px; min-width:36px;">×</button></td></tr>';
  }).join('');
}

function openInventarisDaftarModal() {
  var modal = document.getElementById('invDaftarBarangModal');
  if (!modal) return;
  var inp = document.getElementById('inv_daftar_barang_nama');
  if (inp) inp.value = '';
  renderInventarisDaftarBarang();
  modal.style.display = 'flex';
}

function closeInventarisDaftarModal() {
  var modal = document.getElementById('invDaftarBarangModal');
  if (modal) modal.style.display = 'none';
}

function createInventarisRows() {
  const container = document.getElementById("detail-container-inventaris");
  if (!container) return;
  container.innerHTML = "";
  var items = getInventarisDaftarBarang();
  if (!Array.isArray(items) || items.length === 0) items = defaultInventarisItems;
  items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "row-group";
    row.innerHTML = `
      <div style="flex:2.5;"><input type="text" class="nama_inventaris" value="${String(item).replace(/"/g, '&quot;')}" readonly style="background: #f1f5f9; color: #334155;"></div>
      <div style="flex:1;"><input type="number" class="jumlah_inventaris" placeholder="Jumlah"></div>`;
    container.appendChild(row);
  });
}

function submitDataInventaris() {
  const button = document.getElementById("submitButtonInventaris");
  const output = document.getElementById("outputInventaris");
  const tanggal = document.getElementById("tanggal_inventaris").value;

  button.disabled = true;
  button.innerText = "Menyimpan... ⏳";
  output.innerText = "";

  if (!tanggal) {
    output.innerText = "⚠️ Tanggal wajib diisi.";
    button.disabled = false;
    button.innerText = "Simpan Data Inventaris";
    return;
  }

  const rows = document.querySelectorAll("#input-inventaris-view .row-group");
  const dataList = [];

  rows.forEach(row => {
    const nama = row.querySelector(".nama_inventaris").value.trim();
    const jumlah = row.querySelector(".jumlah_inventaris").value.trim();
    if (nama && jumlah) {
      dataList.push({ tanggal, nama, jumlah });
    }
  });

  if (dataList.length === 0) {
    output.innerText = "⚠️ Masukkan minimal 1 data inventaris.";
    button.disabled = false;
    button.innerText = "Simpan Data";
    return;
  }

  if (useFirebaseBackend()) {
    FirebaseStorage.saveInventaris(dataList, getRbmOutlet()).then(showResultInventaris).catch(function(err) { showResultInventaris('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
    return;
  }
  if (!isGoogleScript()) {
    savePendingToLocalStorage('INVENTARIS', dataList);
    showResultInventaris('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
    return;
  }
  google.script.run.withSuccessHandler(showResultInventaris).simpanDataInventaris(dataList);
}

function showResultInventaris(res) {
  const output = document.getElementById("outputInventaris");
  const button = document.getElementById("submitButtonInventaris");
  output.innerText = res;
  button.disabled = false;
  button.innerText = "Simpan Data Inventaris";
  createInventarisRows();
  if (document.getElementById("inv_table") && typeof loadInventarisData === "function") loadInventarisData();
  setTimeout(() => { output.innerText = "" }, 3000);
}

  function setupDatalists() {
    if (!document.getElementById("pembukuan-list")) {
      const datalist = document.createElement("datalist");
      datalist.id = "pembukuan-list";
      const options = ["CASH", "BCA INTRANSIT", "MANDIRI INTRANSIT", "VOUCHER RBM", "DP", "PELUNASAN RESERVASI TF RBM", "KAS BESAR", "FOC BIL COMPLIMENT", "LAIN-LAIN"];
      datalist.innerHTML = options.map(item => `<option value="${item}">`).join("");
      document.body.appendChild(datalist);
    }
  }
  
  function toggleComment(element, forceShow = false) {
    const column = element.closest('.pembukuan-col-fisik, .pembukuan-col-selisih');
    if (!column) return;

    const wrapper = column.querySelector('.input-wrapper');
    const numberInput = wrapper.querySelector('input[type="number"]');
    const commentIcon = column.querySelector('.comment-icon');
    const commentInput = wrapper.querySelector('textarea');

    if (numberInput.style.display !== 'none' || forceShow) {
        numberInput.style.display = 'none';
        if(commentIcon) commentIcon.style.display = 'none';
        commentInput.style.display = 'block';
        commentInput.focus();
    } else {
        numberInput.style.display = 'block';
        if(commentIcon) commentIcon.style.display = 'flex';
        commentInput.style.display = 'none';
    }
  }

  function hitungSelisih(inputElement) {
      const row = inputElement.closest('.row-group-pembukuan');
      const catatan = parseFloat(row.querySelector('.pembukuan_catatan').value) || 0;
      const fisik = parseFloat(row.querySelector('.pembukuan_fisik').value) || 0;
      const selisihInput = row.querySelector('.pembukuan_selisih');
      selisihInput.value = fisik - catatan;
  }

  function handleKeteranganChange(inputElement) {
      const row = inputElement.closest('.row-group-pembukuan');
      const catatanCol = row.querySelector('.pembukuan-col-catatan');
      const fisikCol = row.querySelector('.pembukuan-col-fisik');
      const selisihCol = row.querySelector('.pembukuan-col-selisih');
      const vcrCol = row.querySelector('.pembukuan-col-vcr');
      
      const fisikIcon = fisikCol.querySelector('.comment-icon');
      const selisihIcon = selisihCol.querySelector('.comment-icon');

      const value = inputElement.value.trim().toUpperCase();
      
      toggleComment(fisikIcon, false);
      toggleComment(selisihIcon, false);
      fisikCol.querySelector('.pembukuan_komentar_fisik').required = false;
      
      // Default display
      catatanCol.style.display = 'block';
      fisikCol.style.display = 'block';
      selisihCol.style.display = 'block';
      vcrCol.style.display = 'none';
      if(fisikIcon) fisikIcon.style.display = 'flex';
      if(selisihIcon) selisihIcon.style.display = 'flex';

      if (value === 'VCR') {
          catatanCol.style.display = 'none';
          fisikCol.style.display = 'none';
          selisihCol.style.display = 'none';
          vcrCol.style.display = 'block';
      } else if (value === 'KAS BESAR') {
          // Logika Baru: Kas Besar otomatis note "GOFOOD & SHOPPEFOOD" di server
          // Hide comment icons as they are ignored/overwritten by script
          if(fisikIcon) fisikIcon.style.display = 'none';
          if(selisihIcon) selisihIcon.style.display = 'none';
      } else if (value === 'DP') {
          // Logika Baru: DP Reservasi wajib ada note
          toggleComment(fisikIcon, true);
          const commentInput = fisikCol.querySelector('.pembukuan_komentar_fisik');
          commentInput.required = true;
          commentInput.placeholder = 'Wajib: Tgl & Nama Reservasi';
      }
  }

function createKasMasukRow() {
    const baris = document.createElement('div');
    baris.className = "row-group-pembukuan";
    baris.innerHTML = `
        <div class="pembukuan-col-detail" style="flex-basis: 180px; flex-grow: 2.5;">
            <input type="text" class="pembukuan_ket_masuk" list="pembukuan-list" placeholder="Detail">
        </div>
        <div class="pembukuan-col-catatan" style="flex-basis: 120px; flex-grow: 1.5;">
            <input type="number" class="pembukuan_catatan" placeholder="Catatan">
        </div>
        <div class="pembukuan-col-fisik" style="flex-basis: 160px; flex-grow: 2;">
            <div class="input-wrapper">
                <input type="number" class="pembukuan_fisik" placeholder="Fisik / Settl">
                <textarea class="pembukuan_komentar_fisik" placeholder="Komentar Fisik..." style="display: none;"></textarea>
            </div>
            <div class="comment-icon">+</div>
        </div>
        <div class="pembukuan-col-selisih" style="flex-basis: 160px; flex-grow: 2;">
            <div class="input-wrapper">
                <input type="number" class="pembukuan_selisih" placeholder="Selisih" readonly>
                <textarea class="pembukuan_komentar_selisih" placeholder="Komentar Selisih..." style="display: none;"></textarea>
            </div>
            <div class="comment-icon">+</div>
        </div>
        <div class="pembukuan-col-vcr" style="display: none; flex-basis: 120px; flex-grow: 1.5;">
            <input type="number" class="pembukuan_vcr" placeholder="Jml VCR">
        </div>
    `;

    baris.querySelector('.pembukuan_ket_masuk').addEventListener('input', (e) => handleKeteranganChange(e.target));
    baris.querySelector('.pembukuan_catatan').addEventListener('input', (e) => hitungSelisih(e.target));
    baris.querySelector('.pembukuan_fisik').addEventListener('input', (e) => hitungSelisih(e.target));
    baris.querySelectorAll('.comment-icon').forEach(icon => { icon.addEventListener('click', (e) => toggleComment(e.target)); });
    baris.querySelectorAll('textarea').forEach(textarea => { textarea.addEventListener('blur', (e) => toggleComment(e.target)); });

    return baris;
}

function createKasKeluarRow() {
    const baris = document.createElement('div');
    baris.className = "row-group";
    baris.innerHTML = `
        <div style="flex:2;"><input type="text" class="pembukuan_ket_keluar" placeholder="Detail Transaksi"></div>
        <div style="flex:1;"><input type="number" class="pembukuan_setor" placeholder="Jumlah Setor"></div>
        <div style="flex:1.5;"><input type="file" class="pembukuan_foto" accept="image/*"></div>
    `;
    return baris;
}

function createPembukuanRows() {
    const container = document.getElementById("detail-container-pembukuan");
    const jenis = document.getElementById("jenis_transaksi_pembukuan").value;

    container.innerHTML = "";

    if (!jenis) {
        container.innerHTML = `<div class="row-group"><div><input type="text" placeholder="Pilih Jenis Transaksi di atas" disabled></div></div>`;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    let rowCount;
    let rowGenerator;

    if (jenis === 'kas-masuk') {
        setupDatalists();
        rowCount = 8;
        rowGenerator = createKasMasukRow;
    } else if (jenis === 'kas-keluar') {
        rowCount = 5;
        rowGenerator = createKasKeluarRow;
    } else {
        return;
    }

    for (let i = 0; i < rowCount; i++) {
        fragment.appendChild(rowGenerator());
    }

    container.appendChild(fragment);
}

  function submitDataPembukuan(){
      const button=document.getElementById("submitButtonPembukuan");
      button.disabled=true; button.innerText="Menyimpan... ⏳";
      const output=document.getElementById("outputPembukuan"); output.innerText="";
      const tanggal=document.getElementById("tanggal_pembukuan").value;
      const tipeForm=document.getElementById("jenis_transaksi_pembukuan").value;
      
      if(!tanggal||!tipeForm){
          output.innerText="⚠️ Tanggal dan Jenis Transaksi wajib diisi.";
          button.disabled=false; button.innerText="Simpan Data Pembukuan";
          return;
      }
      
      const dataMasuk=[];
      const dataKeluar=[];
      const filePromises=[];
      const rows=document.querySelectorAll("#detail-container-pembukuan .row-group-pembukuan, #detail-container-pembukuan .row-group");
      
      if(tipeForm==='kas-masuk'){
          let isDataValid = true;
          rows.forEach(row=>{
              const keteranganElement = row.querySelector(".pembukuan_ket_masuk");
              if (!keteranganElement) return;
              const keterangan = keteranganElement.value.trim();
              if (!keterangan) return;

              const catatan=row.querySelector(".pembukuan_catatan").value.trim();
              const fisik=row.querySelector(".pembukuan_fisik").value.trim();
              const vcr=row.querySelector(".pembukuan_vcr").value.trim();
              const komentarFisik = row.querySelector(".pembukuan_komentar_fisik").value.trim();
              const komentarSelisih = row.querySelector(".pembukuan_komentar_selisih").value.trim();
              
              if (keterangan && (fisik || vcr || komentarFisik || komentarSelisih)) {
                  if (keterangan.trim().toUpperCase() === 'DP' && !komentarFisik) {
                      output.innerText = `⚠️ Untuk transaksi 'DP', komentar Fisik wajib diisi.`;
                      isDataValid = false;
                  }
                  dataMasuk.push({ keterangan, catatan, fisik, vcr, komentarFisik, komentarSelisih });
              }
          });
          if (!isDataValid) { 
              button.disabled=false; button.innerText="Simpan Data Pembukuan";
              return; 
          }
          if (dataMasuk.length > 0) {
            const dataToSend = { tanggal, kasMasuk: dataMasuk, kasKeluar: [] };
            if (useFirebaseBackend()) {
              FirebaseStorage.savePembukuan(dataToSend, getRbmOutlet()).then(showResultPembukuan).catch(function(err) { showResultPembukuan('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
            } else if (!isGoogleScript()) {
              savePendingToLocalStorage('PEMBUKUAN', dataToSend);
              showResultPembukuan('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
            } else {
              google.script.run.withSuccessHandler(showResultPembukuan).simpanDataPembukuan(dataToSend);
            }
          } else {
            output.innerText="⚠️ Masukkan minimal 1 baris detail transaksi.";
            button.disabled = false; button.innerText = "Simpan Data Pembukuan";
          }
      } else if(tipeForm==='kas-keluar'){
          rows.forEach(row=>{
              const keteranganElement = row.querySelector(".pembukuan_ket_keluar");
              if (!keteranganElement) return;
              const keterangan = keteranganElement.value.trim();
              const setor=row.querySelector(".pembukuan_setor").value.trim();
              const fileInput=row.querySelector(".pembukuan_foto");
              
              if(setor){
                  const itemKeluar={keterangan,setor,foto:null};
                  dataKeluar.push(itemKeluar);
                  if(fileInput&&fileInput.files[0]){
                      const file=fileInput.files[0];
                      const promise=new Promise((resolve,reject)=>{
                          const reader=new FileReader;
                          reader.onload=e=>{
                              const fileData=e.target.result.split(",");
                              itemKeluar.foto={fileName:file.name,mimeType:file.type,data:fileData[1]};
                              resolve();
                          };
                          reader.onerror=reject;
                          reader.readAsDataURL(file);
                      });
                      filePromises.push(promise);
                  }
              }
          });
          if(dataKeluar.length===0){
              output.innerText="⚠️ Masukkan minimal 1 baris detail transaksi.";
              button.disabled = false; button.innerText = "Simpan Data Pembukuan";
              return;
          }
          Promise.all(filePromises).then(()=>{
              const dataToSend={tanggal,kasMasuk:[],kasKeluar:dataKeluar};
              if (useFirebaseBackend()) {
                FirebaseStorage.savePembukuan(dataToSend, getRbmOutlet()).then(showResultPembukuan).catch(function(err) { showResultPembukuan('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
              } else if (!isGoogleScript()) {
                savePendingToLocalStorage('PEMBUKUAN', dataToSend);
                showResultPembukuan('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
              } else {
                google.script.run.withSuccessHandler(showResultPembukuan).simpanDataPembukuan(dataToSend);
              }
          }).catch(error=>{
              output.innerText="❌ Gagal memproses file: "+error;
              button.disabled=false; button.innerText="Simpan Data Pembukuan";
          });
      }
  }
 
  function showResultPembukuan(res){
      const output=document.getElementById("outputPembukuan");
      const button=document.getElementById("submitButtonPembukuan");
      output.innerText=res;
      button.disabled=false;
      button.innerText="Simpan Data Pembukuan";
      document.getElementById("jenis_transaksi_pembukuan").value="";
      createPembukuanRows();
      if (document.getElementById("pembukuan_tbody") && typeof loadPembukuanData === "function") loadPembukuanData();
      setTimeout(()=>{output.innerText=""},4e3);
  }

function createPengajuanForm() {
  const container = document.getElementById("pengajuan-form-container");
  const jenisPengajuan = document.getElementById("jenis_pengajuan").value;
  container.innerHTML = "";

  if (!jenisPengajuan) {
    container.innerHTML = `<div class="row-group"><div><input type="text" placeholder="Pilih Jenis Pengajuan di atas" disabled></div></div>`;
    return;
  }

  container.innerHTML += `
    <div class="pengajuan-field">
        <label>Tanggal Pengajuan</label>
        <input type="date" id="tanggal_pengajuan" value="${new Date().toISOString().split("T")[0]}">
    </div>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  `;

  if (jenisPengajuan === 'pengajuan-tf') {
    container.innerHTML += `<h3>Detail Pengajuan Transfer</h3>`;
    for (let i = 0; i < 5; i++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'row-group';
      rowDiv.style.alignItems = 'flex-start';
      rowDiv.innerHTML = `
        <div style="flex:1 1 200px;;"><label>Nama Suplier</label><input type="text" class="pengajuan_tf_suplier" placeholder="Nama Suplier" onblur="isiOtomatisDataBank(this)"></div>
        <div style="flex:1;"><label>Tgl. Nota</label><input type="date" class="pengajuan_tf_tgl_nota" value="${new Date().toISOString().split("T")[0]}"></div>
        <div style="flex:1;"><label>Tgl. J/T</label><input type="date" class="pengajuan_tf_tgl_jt"></div>
        <div style="flex:1 1 200px;;"><label>Nominal</label><input type="number" class="pengajuan_tf_nominal" placeholder="Nominal (Rp)" oninput="samakanTotal(this)"></div>
        <div style="flex:1 1 200px;;"><label>Total</label><input type="number" class="pengajuan_tf_total" placeholder="Total (Rp)"></div>
        <div style="flex:1 1 200px;;"><label>Bank Acc</label><input type="text" class="pengajuan_tf_bank_acc" placeholder="Bank & No. Rekening"></div>
        <div style="flex:1 1 200px;;"><label>A/N</label><input type="text" class="pengajuan_tf_atas_nama" placeholder="Atas Nama"></div>
        <div style="flex:1 1 200px;;"><label>Keterangan</label><select class="pengajuan_tf_keterangan keterangan-select" onchange="applyKeteranganColor(this)"><option value="">-- Keterangan --</option><option value="Barang Sudah datang">Barang Sudah datang</option><option value="Barang Belum Datang">Barang Belum Datang</option><option value="DP">DP</option><option value="Pelunasan DP">Pelunasan DP</option><option value="Pelunasan di Awal">Pelunasan di Awal</option></select></div>
        <div style="flex:1 1 200px;;"><label>Foto TTD</label><input type="file" class="pengajuan_tf_foto_ttd" accept="image/*"></div>
      `;
      container.appendChild(rowDiv);
    }
  } else if (jenisPengajuan === 'pengajuan-petty-cash') {
    container.innerHTML += `<h3>Detail Pengajuan Petty Cash</h3>`;
    for (let i = 0; i < 5; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row-group';
        rowDiv.style.alignItems = 'flex-start';
        rowDiv.innerHTML = `
            <div style="flex:1;"><label>Nominal</label><input type="number" class="pengajuan_pc_nominal" placeholder="Nominal (Rp)"></div>
            <div style="flex:1.5;"><label>Foto Pengajuan</label><input type="file" class="pengajuan_pc_foto_pengajuan" accept="image/*"></div>
        `;
        container.appendChild(rowDiv);
    }
  } else if (jenisPengajuan === 'sudah-tf') {
    container.innerHTML += `<h3>Laporan Bukti Transfer</h3>`;
    for (let i = 0; i < 5; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row-group';
        rowDiv.style.alignItems = 'flex-start';
        rowDiv.innerHTML = `
            <div style="flex:1.5;"><label>Foto Bukti TF</label><input type="file" class="sudah_tf_foto_bukti" accept="image/*"></div>
        `;
        container.appendChild(rowDiv);
    }
  }
}

function isiOtomatisDataBank(inputElement) {
  const nama = inputElement.value.trim();
  const parent = inputElement.closest('.row-group');
  const bankField = parent.querySelector('.pengajuan_tf_bank_acc');
  const anField = parent.querySelector('.pengajuan_tf_atas_nama');

  if (!nama) {
    bankField.value = "";
    anField.value = "";
    return;
  }

  if (!isGoogleScript()) {
    bankField.value = "";
    anField.value = "";
    return;
  }

  google.script.run.withSuccessHandler(data => {
    if (data) {
      bankField.value = data.noRekening || "";
      anField.value = data.namaPemilik || "";
    } else {
      bankField.value = "";
      anField.value = "";
    }
  }).getDataBankBySuplier(nama);
}

function samakanTotal(input) {
  const container = input.closest('div').parentElement; 
  const totalInput = container.querySelector('.pengajuan_tf_total');
  if (totalInput) {
    totalInput.value = input.value;
  }
}

function submitDataPengajuan() {
  const button = document.getElementById("submitButtonPengajuan");
  button.disabled = true;
  button.innerText = "Menyimpan... ⏳";
  const output = document.getElementById("outputPengajuan");
  output.innerText = "";

  const jenisPengajuan = document.getElementById("jenis_pengajuan").value;
  const tanggalPengajuanGlobal = document.getElementById("tanggal_pengajuan").value;

  if (!jenisPengajuan || !tanggalPengajuanGlobal) {
    output.innerText = "⚠️ Pilih Jenis Pengajuan dan Tanggal Pengajuan terlebih dahulu.";
    resetButton();
    return;
  }

  const rows = document.querySelectorAll("#pengajuan-form-container .row-group");
  const dataList = [];
  const filePromises = [];

  if (jenisPengajuan === 'pengajuan-tf') {
    rows.forEach(row => {
      const suplier = row.querySelector(".pengajuan_tf_suplier").value.trim();
      const nominal = row.querySelector(".pengajuan_tf_nominal").value.trim();
      const total = row.querySelector(".pengajuan_tf_total").value.trim();

      if (suplier && (nominal || total)) {
        const pengajuanItem = {
          tanggal: tanggalPengajuanGlobal,
          suplier,
          tglNota: row.querySelector(".pengajuan_tf_tgl_nota").value.trim(),
          tglJt: row.querySelector(".pengajuan_tf_tgl_jt").value.trim(),
          nominal,
          total,
          bankAcc: row.querySelector(".pengajuan_tf_bank_acc").value.trim(),
          atasNama: row.querySelector(".pengajuan_tf_atas_nama").value.trim(),
          keterangan: row.querySelector(".pengajuan_tf_keterangan").value.trim(),
          fotoNota: null,
        };
        dataList.push(pengajuanItem);

        const fotoNotaInput = row.querySelector(".pengajuan_tf_foto_nota");
        if (fotoNotaInput?.files[0]) {
          filePromises.push(readFileAsBase64(fotoNotaInput.files[0]).then(result => {
            pengajuanItem.fotoNota = result;
          }));
        }
        const fotoTtdInput = row.querySelector(".pengajuan_tf_foto_ttd");
        if (fotoTtdInput?.files[0]) {
          filePromises.push(readFileAsBase64(fotoTtdInput.files[0]).then(result => {
            pengajuanItem.fotoTtd = result;
          }));
        }
      }
    });

    if (dataList.length === 0) {
      output.innerText = "⚠️ Masukkan minimal 1 data (Suplier dan Nominal/Total wajib diisi).";
      resetButton();
      return;
    }

    Promise.all(filePromises).then(() => {
      const payload = { jenis: jenisPengajuan, details: dataList };
      if (useFirebaseBackend()) {
        FirebaseStorage.savePengajuanTF(payload).then(showResultPengajuan).catch(function(err) { showResultPengajuan('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
        return;
      }
      if (!isGoogleScript()) {
        savePendingToLocalStorage('PENGAJUAN_TF', payload);
        showResultPengajuan('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
      } else {
        google.script.run.withSuccessHandler(showResultPengajuan).simpanDataPengajuanTF(payload);
      }
    }).catch(error => {
      output.innerText = "❌ Gagal memproses file: " + error;
      resetButton();
    });

  } else if (jenisPengajuan === 'pengajuan-petty-cash') {
    rows.forEach(row => {
      const nominalPc = row.querySelector(".pengajuan_pc_nominal").value.trim();

      if (nominalPc) {
        const pettyCashItem = {
          tanggalPengajuan: tanggalPengajuanGlobal,
          nominal: nominalPc,
          fotoPengajuan: null
        };
        dataList.push(pettyCashItem);

        const fotoPengajuanInput = row.querySelector(".pengajuan_pc_foto_pengajuan");
        if (fotoPengajuanInput?.files[0]) {
          filePromises.push(readFileAsBase64(fotoPengajuanInput.files[0]).then(result => {
            pettyCashItem.fotoPengajuan = result;
          }));
        }
      }
    });

    if (dataList.length === 0) {
      output.innerText = "⚠️ Masukkan minimal 1 data (Nominal wajib diisi).";
      resetButton();
      return;
    }

    Promise.all(filePromises).then(() => {
      const payload = { jenis: jenisPengajuan, details: dataList };
      if (useFirebaseBackend()) {
        FirebaseStorage.savePettyCashPengajuan(payload).then(showResultPengajuan).catch(function(err) { showResultPengajuan('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
        return;
      }
      if (!isGoogleScript()) {
        savePendingToLocalStorage('PENGAJUAN_PC', payload);
        showResultPengajuan('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
      } else {
        google.script.run.withSuccessHandler(showResultPengajuan).simpanDataPengajuanPC(payload);
      }
    }).catch(error => {
      output.innerText = "❌ Gagal memproses file: " + error;
      resetButton();
    });

  } else if (jenisPengajuan === 'sudah-tf') {
    rows.forEach(row => {
      const fotoBuktiInput = row.querySelector(".sudah_tf_foto_bukti");

      if (fotoBuktiInput?.files[0]) {
        const sudahTfItem = {
          tanggalPengajuan: tanggalPengajuanGlobal,
          fotoBukti: null
        };
        dataList.push(sudahTfItem);

        filePromises.push(readFileAsBase64(fotoBuktiInput.files[0]).then(result => {
          sudahTfItem.fotoBukti = result;
        }));
      }
    });

    if (dataList.length === 0) {
      output.innerText = "⚠️ Masukkan minimal 1 file bukti transfer.";
      resetButton();
      return;
    }
    Promise.all(filePromises).then(() => {
        const payload = { jenis: jenisPengajuan, details: dataList };
        if (useFirebaseBackend()) {
          FirebaseStorage.savePengajuanBuktiTF(payload).then(showResultPengajuan).catch(function(err) { showResultPengajuan('❌ ' + (err && err.message ? err.message : 'Gagal menyimpan ke Firebase.')); });
          return;
        }
        if (!isGoogleScript()) {
          savePendingToLocalStorage('PENGAJUAN_SUDAH_TF', payload);
          showResultPengajuan('✅ Data disimpan sementara di perangkat. Buka dari Google Apps Script untuk sinkron ke sheet.');
        } else {
          google.script.run.withSuccessHandler(showResultPengajuan).simpanDataSudahTF(payload);
        }
    }).catch(error => {
        output.innerText = "❌ Gagal memproses file: " + error;
        resetButton();
    });

  } else {
    output.innerText = `⚠️ Fitur untuk "${jenisPengajuan}" belum diimplementasikan.`;
    resetButton();
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const [header, data] = e.target.result.split(",");
      resolve({ fileName: file.name, mimeType: file.type, data });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resetButton() {
  const button = document.getElementById("submitButtonPengajuan");
  button.disabled = false;
  button.innerText = "Simpan Data Pengajuan";
}

function applyKeteranganColor(selectElement) {
  const value = selectElement.value;
  if (value === 'Sudah Di terima') selectElement.classList.add('keterangan-color-urgent');
  else if (value === 'Pelunasan di Awal') selectElement.classList.add('keterangan-color-penting');
  else if (value === 'Pembayaran') selectElement.classList.add('keterangan-color-biasa');
  else if (value === 'Dp') selectElement.classList.add('keterangan-color-biasa');
  else if (value === 'Pelunasan Dp') selectElement.classList.add('keterangan-color-biasa');
}

function showResultPengajuan(res) {
  const output = document.getElementById("outputPengajuan");
  output.innerText = res;
  resetButton();
  document.getElementById("jenis_pengajuan").value = "";
  createPengajuanForm();
  setTimeout(() => { output.innerText = "" }, 4000);
}

function exportPettyCashToExcel() {
  const table = document.getElementById("pc_table");
  if (!table) return;

  const monthFilter = document.getElementById("pc_bulan_filter");
  const monthVal = monthFilter ? monthFilter.value : '';
  const [year, month] = monthVal.split('-');
  const tglAwal = `${year}-${month.padStart(2, '0')}-01`;
  const tglAkhir = new Date(year, parseInt(month, 10), 0).toLocaleDateString('sv').slice(0, 10);
  const debit = document.getElementById("pc_total_debit").textContent;
  const kredit = document.getElementById("pc_total_kredit").textContent;
  const saldo = document.getElementById("pc_saldo_akhir").textContent;
  const filename = `Laporan_Petty_Cash_${monthVal}.xls`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #000000; padding: 5px; vertical-align: top; }
        th { background-color: #1e40af; color: #ffffff; }
        .num { mso-number-format:"\#\,\#\#0"; text-align: right; }
      </style>
    </head>
    <body>
      <h2 style="text-align:center; margin:0;">Laporan Petty Cash</h2>
      <p style="text-align:center; margin:5px 0 20px; color:#666;">Periode: ${tglAwal} s/d ${tglAkhir}</p>
      
      <table style="width: 60%; margin: 0 auto 20px auto;">
        <tr>
          <th style="background:#f0f0f0; color:#333;">Total Debit</th>
          <th style="background:#f0f0f0; color:#333;">Total Kredit</th>
          <th style="background:#f0f0f0; color:#333;">Saldo Akhir</th>
        </tr>
        <tr>
          <td style="text-align:center; font-weight:bold; color:#1e40af;">${debit}</td>
          <td style="text-align:center; font-weight:bold; color:#1e40af;">${kredit}</td>
          <td style="text-align:center; font-weight:bold; color:#1e40af;">${saldo}</td>
        </tr>
      </table>
      ${table.outerHTML}
    </body>
    </html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function triggerImportPettyCashExcel() {
  var el = document.getElementById('import_petty_cash_file');
  if (el) { el.value = ''; el.click(); }
}
function processImportPettyCashExcel(input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { alert('Library Excel belum dimuat. Pastikan halaman memuat xlsx.'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet);
      if (!rows.length) { alert('File kosong atau tidak ada baris data.'); input.value = ''; return; }
      var groups = {};
      rows.forEach(function(r) {
        var tanggal = (r['Tanggal'] != null ? String(r['Tanggal']) : '').trim();
        if (!tanggal) return;
        if (tanggal.indexOf('/') >= 0) {
          var p = tanggal.split('/');
          if (p.length >= 3) tanggal = p[2] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[0]).padStart(2, '0');
        } else if (tanggal.length === 8 && tanggal.indexOf('-') < 0) {
          tanggal = tanggal.slice(0, 4) + '-' + tanggal.slice(4, 6) + '-' + tanggal.slice(6, 8);
        }
        var jenis = (r['Jenis'] != null ? String(r['Jenis']).toLowerCase() : '').trim();
        if (jenis !== 'pemasukan' && jenis !== 'pengeluaran') return;
        var nama = (r['Nama'] != null ? String(r['Nama']) : (r['Keterangan'] != null ? String(r['Keterangan']) : '')).trim();
        if (!nama) return;
        var jumlah = parseFloat(r['Jumlah']) || 1;
        var satuan = (r['Satuan'] != null ? String(r['Satuan']) : '').trim();
        var harga = parseFloat(r['Harga']) || 0;
        var total = (harga && jumlah) ? jumlah * harga : (parseFloat(r['Total']) || parseFloat(r['Kredit']) || parseFloat(r['Debit']) || jumlah);
        var key = tanggal + '|' + jenis;
        if (!groups[key]) groups[key] = { tanggal: tanggal, jenis: jenis, transactions: [] };
        groups[key].transactions.push({
          nama: nama,
          jumlah: jumlah,
          satuan: satuan,
          harga: harga || total,
          total: total,
          foto: null
        });
      });
      var payloads = Object.keys(groups).map(function(k) { return groups[k]; });
      if (payloads.length === 0) { alert('Tidak ada baris valid. Kolom: Tanggal, Jenis (pemasukan/pengeluaran), Nama, Jumlah, Satuan, Harga.'); input.value = ''; return; }
      var outlet = getRbmOutlet();
      if (useFirebaseBackend() && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.savePettyCashTransactions) {
        var idx = 0;
        function next() {
          if (idx >= payloads.length) {
            alert('Import selesai: ' + payloads.length + ' grup transaksi petty cash.');
            var elBulan = document.getElementById('pc_bulan_filter');
            if (elBulan && payloads.length > 0) {
              var dates = payloads.map(function(p) { return (p.tanggal || '').toString().trim(); }).filter(Boolean);
              if (dates.length > 0) {
                dates.sort();
                elBulan.value = dates[0].slice(0, 7);
              }
            }
            input.value = '';
            if (typeof loadPettyCashData === 'function') {
              setTimeout(function() { loadPettyCashData(); }, 400);
            }
            return;
          }
          FirebaseStorage.savePettyCashTransactions(payloads[idx], outlet).then(function() { idx++; next(); }).catch(function(err) { alert('Gagal: ' + (err && err.message ? err.message : '')); input.value = ''; });
        }
        next();
      } else {
        payloads.forEach(function(p) { savePendingToLocalStorage('PETTY_CASH', p); });
        alert('Import selesai: ' + payloads.length + ' grup transaksi petty cash (disimpan di perangkat).');
        if (typeof loadPettyCashData === 'function') loadPettyCashData();
        input.value = '';
      }
    } catch (err) { alert('Error baca file: ' + (err && err.message ? err.message : '')); input.value = ''; }
  };
  reader.readAsArrayBuffer(file);
}

function downloadTemplatePettyCashExcel() {
  if (typeof XLSX === 'undefined') { alert('Library Excel belum dimuat.'); return; }
  var headers = ['Tanggal', 'Jenis', 'Nama', 'Jumlah', 'Satuan', 'Harga'];
  var contoh = [
    ['2026-03-01', 'pemasukan', 'Setoran kas', 1, 'kali', 500000],
    ['2026-03-01', 'pengeluaran', 'Beli alat tulis', 2, 'pack', 15000]
  ];
  var aoa = [headers].concat(contoh);
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Petty Cash');
  XLSX.writeFile(wb, 'Template_Import_Petty_Cash.xlsx');
}

function printPettyCashReport() {
  const table = document.getElementById("pc_table");
  if (!table) return;

  const monthFilter = document.getElementById("pc_bulan_filter");
  const monthVal = monthFilter ? monthFilter.value : '';
  const [year, month] = monthVal.split('-');
  const tglAwal = `${year}-${month.padStart(2, '0')}-01`;
  const tglAkhir = new Date(year, parseInt(month, 10), 0).toLocaleDateString('sv').slice(0, 10);
  const debit = document.getElementById("pc_total_debit").textContent;
  const kredit = document.getElementById("pc_total_kredit").textContent;
  const saldo = document.getElementById("pc_saldo_akhir").textContent;

  const printWindow = window.open('', '', 'height=600,width=900');
  if (!printWindow) return;

  // build html in one template string to avoid quoting issues
  const html = `
    <html>
      <head>
        <title>Laporan Petty Cash</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h2 { text-align: center; margin-bottom: 5px; }
          p.period { text-align: center; margin-top: 0; color: #666; font-size: 14px; }
          .summary-box { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f8f9fa; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; color: #1e40af; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
          th { background-color: #1e40af; color: white; -webkit-print-color-adjust: exact; }
          .num { text-align: right; }
          img { max-height: 40px; border-radius: 4px; }
          @media print { @page { size: landscape; margin: 1cm; } body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h2>Laporan Petty Cash</h2>
        <p class="period">Periode: ${tglAwal} s/d ${tglAkhir}</p>
        <div class="summary-box">
          <div class="summary-item"><div class="summary-label">Total Debit</div><div class="summary-value">${debit}</div></div>
          <div class="summary-item"><div class="summary-label">Total Kredit</div><div class="summary-value">${kredit}</div></div>
          <div class="summary-item"><div class="summary-label">Saldo Akhir</div><div class="summary-value">${saldo}</div></div>
        </div>
        ${table.outerHTML}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function deletePettyCashItem(parentIdx, trxIdx) {
  if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
  if(!confirm("Yakin ingin menghapus data ini?")) return;
  const key = getRbmStorageKey('RBM_PENDING_PETTY_CASH');
  let pending = safeParse(RBMStorage.getItem(key), []);
  
  if (pending[parentIdx] && pending[parentIdx].payload && pending[parentIdx].payload.transactions) {
    pending[parentIdx].payload.transactions.splice(trxIdx, 1);
    // Jika transaksi dalam satu tanggal habis, hapus parent-nya
    if (pending[parentIdx].payload.transactions.length === 0) {
      pending.splice(parentIdx, 1);
    }
    RBMStorage.setItem(key, JSON.stringify(pending));
    loadPettyCashData(); // Refresh tabel
  }
}

function deletePettyCashItemFirebase(firebaseDate, indexInDate) {
  if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  if (typeof FirebaseStorage === 'undefined' || !FirebaseStorage.deletePettyCashByDateAndIndex) { alert('Fungsi hapus Firebase tidak tersedia.'); return; }
  FirebaseStorage.deletePettyCashByDateAndIndex(firebaseDate, parseInt(indexInDate, 10), getRbmOutlet()).then(function() {
    if (typeof loadPettyCashData === 'function') loadPettyCashData();
  }).catch(function(err) {
    alert('Gagal menghapus: ' + (err && err.message ? err.message : ''));
  });
}

function toggleEditPcFields() {
  var jenis = document.getElementById('editPcJenis');
  var pengeluaranEl = document.getElementById('editPcPengeluaranFields');
  var pemasukanEl = document.getElementById('editPcPemasukanFields');
  if (!jenis || !pengeluaranEl || !pemasukanEl) return;
  if (jenis.value === 'pengeluaran') {
    pengeluaranEl.style.display = 'block';
    pemasukanEl.style.display = 'none';
  } else {
    pengeluaranEl.style.display = 'none';
    pemasukanEl.style.display = 'block';
  }
}

function openEditPettyCashModal(data, source, parentIdx, trxIdx, firebaseIndex, firebaseDate, firebaseIndexInDate) {
  if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat mengedit data.'); return; }
  var modal = document.getElementById('editPettyCashModal');
  if (!modal) return;
  document.getElementById('editPcSource').value = source || '';
  document.getElementById('editPcParentIdx').value = parentIdx != null ? parentIdx : '';
  document.getElementById('editPcTrxIdx').value = trxIdx != null ? trxIdx : '';
  document.getElementById('editPcFirebaseIndex').value = firebaseIndex != null ? firebaseIndex : '';
  var elDate = document.getElementById('editPcFirebaseDate');
  var elIdx = document.getElementById('editPcFirebaseIndexInDate');
  if (elDate) elDate.value = firebaseDate != null ? firebaseDate : '';
  if (elIdx) elIdx.value = firebaseIndexInDate != null ? firebaseIndexInDate : '';
  var tanggal = data.tanggal || '';
  if (tanggal && tanggal.indexOf('/') !== -1) {
    var parts = tanggal.split('/');
    if (parts.length === 3) tanggal = parts[2] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[0]).slice(-2);
  } else if (tanggal && tanggal.length === 10 && tanggal.charAt(4) === '-') {
    // already YYYY-MM-DD
  } else if (data.date) {
    try { var d = new Date(data.date); tanggal = d.toISOString().slice(0, 10); } catch(e) {}
  }
  document.getElementById('editPcTanggal').value = tanggal || '';
  var jenis = data.jenis || (parseFloat(data.debit) > 0 ? 'pengeluaran' : 'pemasukan');
  document.getElementById('editPcJenis').value = jenis;
  document.getElementById('editPcNama').value = data.nama || '';
  document.getElementById('editPcJumlah').value = data.jumlah != null ? data.jumlah : '';
  document.getElementById('editPcSatuan').value = data.satuan || '';
  document.getElementById('editPcHarga').value = data.harga != null ? data.harga : '';
  document.getElementById('editPcNominal').value = (data.kredit != null ? parseFloat(data.kredit) : (data.harga != null ? parseFloat(data.harga) : '')) || '';
  toggleEditPcFields();
  modal.style.display = 'flex';
}

function closeEditPettyCashModal() {
  var modal = document.getElementById('editPettyCashModal');
  if (modal) modal.style.display = 'none';
}

function saveEditPettyCashModal() {
  if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat mengedit data.'); return; }
  var source = document.getElementById('editPcSource').value;
  var parentIdx = parseInt(document.getElementById('editPcParentIdx').value, 10);
  var trxIdx = parseInt(document.getElementById('editPcTrxIdx').value, 10);
  var firebaseIndex = parseInt(document.getElementById('editPcFirebaseIndex').value, 10);
  var firebaseDate = document.getElementById('editPcFirebaseDate') ? document.getElementById('editPcFirebaseDate').value : '';
  var firebaseIndexInDate = document.getElementById('editPcFirebaseIndexInDate') ? parseInt(document.getElementById('editPcFirebaseIndexInDate').value, 10) : 0;
  var tanggal = document.getElementById('editPcTanggal').value;
  var jenis = document.getElementById('editPcJenis').value;
  var nama = (document.getElementById('editPcNama').value || '').trim();
  if (!nama) { alert('Nama / Keterangan wajib diisi.'); return; }
  if (source === 'local') {
    var key = getRbmStorageKey('RBM_PENDING_PETTY_CASH');
    var pending = safeParse(RBMStorage.getItem(key), []);
    if (!pending[parentIdx] || !pending[parentIdx].payload || !pending[parentIdx].payload.transactions || !pending[parentIdx].payload.transactions[trxIdx]) { alert('Data tidak ditemukan.'); return; }
    var trx = pending[parentIdx].payload.transactions[trxIdx];
    pending[parentIdx].payload.tanggal = tanggal;
    pending[parentIdx].payload.jenis = jenis;
    if (jenis === 'pengeluaran') {
      var jumlah = parseFloat(document.getElementById('editPcJumlah').value) || 0;
      var harga = parseFloat(document.getElementById('editPcHarga').value) || 0;
      trx.nama = nama;
      trx.jumlah = jumlah;
      trx.satuan = (document.getElementById('editPcSatuan').value || '').trim();
      trx.harga = harga;
      trx.total = jumlah * harga;
    } else {
      var nominal = parseFloat(document.getElementById('editPcNominal').value) || 0;
      trx.nama = nama;
      trx.jumlah = 1;
      trx.satuan = '';
      trx.harga = nominal;
      trx.total = nominal;
    }
    RBMStorage.setItem(key, JSON.stringify(pending));
    closeEditPettyCashModal();
    if (typeof loadPettyCashData === 'function') loadPettyCashData();
    return;
  }
  if (source === 'firebase' && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.updatePettyCashTransactionByDateAndIndex) {
    var firebaseDateEl = document.getElementById('editPcFirebaseDate');
    var firebaseIndexInDateEl = document.getElementById('editPcFirebaseIndexInDate');
    var firebaseDate = firebaseDateEl ? firebaseDateEl.value : '';
    var firebaseIndexInDate = firebaseIndexInDateEl ? parseInt(firebaseIndexInDateEl.value, 10) : 0;
    var debit = 0, kredit = 0;
    var jumlah = 1, satuan = '', harga = 0;
    if (jenis === 'pengeluaran') {
      jumlah = parseFloat(document.getElementById('editPcJumlah').value) || 0;
      satuan = (document.getElementById('editPcSatuan').value || '').trim();
      harga = parseFloat(document.getElementById('editPcHarga').value) || 0;
      debit = jumlah * harga;
    } else {
      kredit = parseFloat(document.getElementById('editPcNominal').value) || 0;
      harga = kredit;
    }
    FirebaseStorage.updatePettyCashTransactionByDateAndIndex(firebaseDate, firebaseIndexInDate, {
      tanggal: tanggal,
      nama: nama,
      jumlah: jumlah,
      satuan: satuan,
      harga: harga,
      debit: debit,
      kredit: kredit
    }, getRbmOutlet()).then(function() {
      closeEditPettyCashModal();
      if (typeof loadPettyCashData === 'function') loadPettyCashData();
    }).catch(function(err) {
      alert('Gagal menyimpan: ' + (err && err.message ? err.message : ''));
    });
  }
}

function editPettyCashItem(parentIdx, trxIdx) {
  if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat mengedit data.'); return; }
  var key = getRbmStorageKey('RBM_PENDING_PETTY_CASH');
  var pending = safeParse(RBMStorage.getItem(key), []);
  if (!pending[parentIdx] || !pending[parentIdx].payload || !pending[parentIdx].payload.transactions || !pending[parentIdx].payload.transactions[trxIdx]) return;
  var p = pending[parentIdx].payload;
  var trx = p.transactions[trxIdx];
  var data = {
    tanggal: p.tanggal,
    jenis: p.jenis,
    nama: trx.nama,
    jumlah: trx.jumlah,
    satuan: trx.satuan || '',
    harga: trx.harga,
    kredit: p.jenis === 'pemasukan' ? (trx.total || trx.harga) : 0,
    debit: p.jenis === 'pengeluaran' ? trx.total : 0
  };
  openEditPettyCashModal(data, 'local', parentIdx, trxIdx, null);
}

function editPettyCashItemFirebase(firebaseDate, indexInDate) {
  if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat mengedit data.'); return; }
  var dataList = window._lastPettyCashData;
  if (!Array.isArray(dataList)) { alert('Data tidak ditemukan. Silakan refresh tabel.'); return; }
  var idx = parseInt(indexInDate, 10);
  var row = dataList.find(function(r) { return (r._firebaseDate === firebaseDate || r._firebaseDate === String(firebaseDate)) && (r._firebaseIndexInDate === idx || r._firebaseIndexInDate === indexInDate); });
  if (!row) { alert('Data tidak ditemukan.'); return; }
  var data = {
    tanggal: row._firebaseDate || row.tanggal,
    nama: row.nama,
    jumlah: row.jumlah,
    satuan: row.satuan || '',
    harga: row.harga,
    debit: parseFloat(row.debit) || 0,
    kredit: parseFloat(row.kredit) || 0
  };
  openEditPettyCashModal(data, 'firebase', null, null, null, firebaseDate, indexInDate);
}

function showImageModal(src, caption) {
  var imgEl = document.getElementById('modalImage');
  if (imgEl) imgEl.src = src || '';
  var capEl = document.getElementById('modalImageCaption');
  if (capEl) {
    if (caption) {
      capEl.textContent = caption;
      capEl.style.display = 'block';
    } else {
      capEl.textContent = '';
      capEl.style.display = 'none';
    }
  }
  var modal = document.getElementById('imageModal');
  if (modal) modal.style.display = 'flex';
}

function closeImageModal() {
  var modal = document.getElementById('imageModal');
  if (modal) modal.style.display = 'none';
}

function calculateSisaUangPengajuan() {
    var dateEl = document.getElementById("pengajuan_saldo_date");
    var outEl = document.getElementById("pengajuan_sisa_uang_val");
    if (!dateEl || !outEl) return;
    const dateVal = dateEl.value;
    if (!dateVal) return;

    const pending = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PETTY_CASH')), []);
    let saldo = 0;

    pending.forEach(item => {
        const p = item.payload;
        if (p.tanggal <= dateVal) {
            (p.transactions || []).forEach(trx => {
                const amount = parseFloat(trx.total) || 0;
                if (p.jenis === 'pemasukan') saldo += amount;
                else if (p.jenis === 'pengeluaran') saldo -= amount;
            });
        }
    });

    outEl.textContent = formatRupiah(saldo);
}

function loadLihatPengajuanData() {
    const dateStart = document.getElementById("pengajuan_filter_date_start").value;
    const dateEnd = document.getElementById("pengajuan_filter_date_end").value;
    const tbody = document.getElementById("pengajuan_tbody");
    tbody.innerHTML = '';
    
    if (!dateStart || !dateEnd) {
        tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Pilih rentang tanggal terlebih dahulu</td></tr>';
        return;
    }
    
    let rows = [];
    let runningSaldo = 0;
    let no = 0;

    // Ambil data dari Petty Cash (per lokasi)
    const pcData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PETTY_CASH')), []);
    pcData.forEach((item, parentIdx) => {
        const p = item.payload;
        (p.transactions || []).forEach((trx, trxIdx) => {
            const debit = (p.jenis === 'pengeluaran' && trx.total) ? parseFloat(trx.total) : 0;
            const kredit = (p.jenis === 'pemasukan' && trx.total) ? parseFloat(trx.total) : 0;
            runningSaldo = runningSaldo - debit + kredit;

            if (p.tanggal >= dateStart && p.tanggal <= dateEnd) {
                no++;
                
                rows.push({
                    no,
                    tanggal: p.tanggal,
                    nama: trx.nama || '',
                    jumlah: trx.jumlah || '',
                    satuan: trx.satuan || '',
                    harga: trx.harga || 0,
                    debit,
                    kredit,
                    saldo: runningSaldo
                });
            }
        });
    });
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="table-empty">Tidak ada transaksi petty cash pada rentang tanggal ini</td></tr>';
        return;
    }
    
    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>${r.no}</td>
            <td>${r.tanggal}</td>
            <td>${r.nama}</td>
            <td class="num">${r.jumlah}</td>
            <td>${r.satuan}</td>
            <td class="num">${r.harga ? formatRupiah(r.harga) : ''}</td>
            <td class="num">${r.debit ? formatRupiah(r.debit) : ''}</td>
            <td class="num">${r.kredit ? formatRupiah(r.kredit) : ''}</td>
            <td class="num">${formatRupiah(r.saldo)}</td>
        </tr>
    `).join('');
}

function exportRekapToExcel() {
  const table = document.getElementById("rekap_table");
  if (!table) return;

  const tglAwal = document.getElementById("pengajuan_filter_date_start").value;
  const tglAkhir = document.getElementById("pengajuan_filter_date_end").value;
  const sisaUang = document.getElementById("pengajuan_sisa_uang_val").textContent;
  const filename = `Rekap_Petty_Cash_${tglAwal}_sd_${tglAkhir}.xls`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #000;padding:5px;}th{background-color:#1e40af;color:#fff;}.num{mso-number-format:"\#\,\#\#0";text-align:right;}</style></head>
    <body>
      <h2 style="text-align:center;">Rekap Petty Cash</h2>
      <p style="text-align:center;">Periode: ${tglAwal} s/d ${tglAkhir}</p>
      <p style="text-align:center; font-weight:bold; font-size:16px;">Sisa Uang: ${sisaUang}</p>
      ${table.outerHTML}
    </body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function printRekapReport() {
  const table = document.getElementById("rekap_table");
  if (!table) return;

  const tglAwal = document.getElementById("pengajuan_filter_date_start").value;
  const tglAkhir = document.getElementById("pengajuan_filter_date_end").value;
  const sisaUang = document.getElementById("pengajuan_sisa_uang_val").textContent;

  const printWindow = window.open('', '', 'height=600,width=900');
  printWindow.document.write('<html><head><title>Rekap Petty Cash</title>');
  printWindow.document.write('<style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #ccc;padding:8px;}th{background:#1e40af;color:white;}.num{text-align:right;}@media print{@page{size:landscape;}}</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write(`<h2 style="text-align:center;">Rekap Petty Cash</h2>`);
  printWindow.document.write(`<p style="text-align:center;">Periode: ${tglAwal} s/d ${tglAkhir}</p>`);
  printWindow.document.write(`<div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold; color:#059669;">Sisa Uang: ${sisaUang}</div>`);
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function sendRekapEmail() {
  if (!confirm("Kirim laporan rekap ini via Gmail?")) return;
  
  const tglAwal = document.getElementById("pengajuan_filter_date_start").value;
  const tglAkhir = document.getElementById("pengajuan_filter_date_end").value;
  const sisaUang = document.getElementById("pengajuan_sisa_uang_val").textContent;
  const table = document.getElementById("rekap_table");
  
  // Buat body email sederhana (HTML table)
  const htmlBody = `
    <h2>Rekap Petty Cash</h2>
    <p>Periode: ${tglAwal} s/d ${tglAkhir}</p>
    <h3>Sisa Uang: ${sisaUang}</h3>
    <br>
    <table border="1" style="border-collapse:collapse; width:100%;">
      ${table.innerHTML}
    </table>
  `;

  if (isGoogleScript()) {
    google.script.run
      .withSuccessHandler(() => alert("Email berhasil dikirim!"))
      .withFailureHandler((e) => alert("Gagal kirim email: " + e))
      .sendEmailReport(tglAwal, tglAkhir, sisaUang, htmlBody);
  } else {
    // Fallback untuk lokal: Buka mailto (hanya teks sederhana karena mailto tidak support HTML body kompleks)
    const subject = `Laporan Rekap Petty Cash ${tglAwal} - ${tglAkhir}`;
    const body = `Laporan Rekap Petty Cash\nPeriode: ${tglAwal} s/d ${tglAkhir}\nSisa Uang: ${sisaUang}\n\n(Silakan lampirkan file Excel/PDF manual jika diperlukan)`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}

function loadPembukuanData() {
    const tbody = document.getElementById("pembukuan_tbody");
    const summaryEl = document.getElementById("pembukuan_summary");
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Memuat data...</td></tr>';
    summaryEl.style.display = 'none';
    
    const monthFilter = document.getElementById("pembukuan_bulan_filter");
    const monthVal = monthFilter ? monthFilter.value : '';
    if (!monthVal) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Pilih bulan terlebih dahulu.</td></tr>';
        summaryEl.style.display = 'none';
        return;
    }

    const [year, month] = monthVal.split('-');
    const tglAwal = `${year}-${month}-01`;
    const tglAkhir = new Date(year, parseInt(month, 10), 0).toLocaleDateString('sv').slice(0, 10);

    function renderPembukuanFromPending(pending) {
        if (!Array.isArray(pending)) pending = [];

        // [BARU] Tahap 1: Pisahkan data sebelum periode dan dalam periode
        let saldoAwalCashMasuk = 0;
        let saldoAwalKasKeluar = 0;
        const dataPeriode = [];

        pending.forEach((item) => {
            const p = item.payload;
            if (!p || !p.tanggal) return;

            if (p.tanggal < tglAwal) {
                // Akumulasi untuk Saldo Awal
                if (p.kasMasuk && p.kasMasuk.length > 0) {
                    p.kasMasuk.forEach(km => {
                        if (km.keterangan && km.keterangan.toUpperCase() === 'CASH') {
                            let fisikVal = parseFloat(km.fisik) || 0;
                            if (km.keterangan.toUpperCase() === 'VCR') {
                                fisikVal = (parseFloat(km.vcr) || 0) * 20000;
                            }
                            saldoAwalCashMasuk += fisikVal;
                        }
                    });
                }
                if (p.kasKeluar && p.kasKeluar.length > 0) {
                    p.kasKeluar.forEach(kk => {
                        saldoAwalKasKeluar += parseFloat(kk.setor) || 0;
                    });
                }
            } else if (p.tanggal >= tglAwal && p.tanggal <= tglAkhir) {
                // Kumpulkan data untuk periode yang dipilih
                dataPeriode.push(item);
            }
        });

        const saldoAwal = saldoAwalCashMasuk - saldoAwalKasKeluar;

        // [DIUBAH] Tahap 2: Proses data HANYA untuk periode yang dipilih
        let totalCashMasuk = 0;
        let totalKasKeluar = 0;
        let rows = [];

        dataPeriode.forEach((item, parentIdx) => { // Loop pada dataPeriode, bukan 'pending'
            const p = item.payload;
            // Kas Masuk
            if (p.kasMasuk && p.kasMasuk.length > 0) {
                p.kasMasuk.forEach((km, subIdx) => {
                    let fisikVal = parseFloat(km.fisik) || 0;
                    let catatanVal = parseFloat(km.catatan) || 0;
                    let fisikDisplay = formatRupiah(fisikVal);
                    let selisihVal = 0;
                    
                    if(km.keterangan && km.keterangan.toUpperCase() === 'VCR') {
                        const jmlVcr = parseFloat(km.vcr) || 0;
                        fisikVal = jmlVcr * 20000;
                        fisikDisplay = `${km.vcr} (VCR)`;
                    } else {
                        selisihVal = fisikVal - catatanVal;
                    }

                    if (km.keterangan && km.keterangan.toUpperCase() === 'CASH') totalCashMasuk += fisikVal;

                    const komentarFisik = km.komentarFisik || '';
                    const komentarSelisih = km.komentarSelisih || '';
                    rows.push({
                        tanggal: p.tanggal,
                        keterangan: km.keterangan,
                        catatan: km.catatan ? formatRupiah(km.catatan) : '-',
                        fisik: fisikDisplay,
                        selisih: (km.fisik || km.catatan) ? formatRupiah(selisihVal) : '-',
                        komentarFisik,
                        komentarSelisih,
                        catatanVal: catatanVal,
                        fisikVal: fisikVal,
                        selisihVal: selisihVal,
                        foto: '-',
                        parentIdx: parentIdx,
                        type: 'kasMasuk',
                        subIdx: subIdx
                    });
                });
            }
            // Kas Keluar
            if (p.kasKeluar && p.kasKeluar.length > 0) {
                p.kasKeluar.forEach((kk, subIdx) => {
                    const setor = parseFloat(kk.setor) || 0;
                    totalKasKeluar += setor;
    
                    let fotoDisplay = '-';
                    if (kk.foto && kk.foto.data && kk.foto.mimeType) {
                         fotoDisplay = `<img src="data:${kk.foto.mimeType};base64,${kk.foto.data}" style="height:40px; border-radius:4px; cursor:pointer;" onclick="showImageModal(this.src)">`;
                    }
                    rows.push({
                        tanggal: p.tanggal,
                        keterangan: kk.keterangan,
                        catatan: '-',
                        fisik: formatRupiah(kk.setor),
                        selisih: '-',
                        komentarFisik: '',
                        komentarSelisih: '',
                        catatanVal: 0,
                        fisikVal: setor,
                        selisihVal: 0,
                        foto: fotoDisplay,
                        parentIdx: parentIdx,
                        type: 'kasKeluar',
                        subIdx: subIdx
                    });
                });
            }
        });

        // [DIUBAH] Hitung saldo akhir kumulatif
        const saldoAkhir = saldoAwal + totalCashMasuk - totalKasKeluar;

        if (rows.length === 0 && saldoAwal === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Tidak ada data untuk rentang ini.</td></tr>';
            document.getElementById("pembukuan_saldo_awal").textContent = "Rp 0";
            document.getElementById("pembukuan_total_cash").textContent = "Rp 0";
            document.getElementById("pembukuan_total_keluar").textContent = "Rp 0";
            document.getElementById("pembukuan_total_fisik").textContent = "Rp 0";
            summaryEl.style.display = 'grid';
            return;
        }

    // group rows by date and calculate per-date subtotals
    const grouped = {};
    rows.forEach(r => {
        if (!grouped[r.tanggal]) { 
            grouped[r.tanggal] = { masuk: [], keluar: [], subtotalCatatan: 0, subtotalFisik: 0, subtotalSelisih: 0 }; 
        }
        if (r.type === 'kasMasuk') {
            grouped[r.tanggal].masuk.push(r);
            grouped[r.tanggal].subtotalCatatan += r.catatanVal || 0;
            grouped[r.tanggal].subtotalFisik += r.fisikVal || 0;
            grouped[r.tanggal].subtotalSelisih += r.selisihVal || 0;
        } else {
            grouped[r.tanggal].keluar.push(r);
        }
    });

    // build HTML using grouped data
    let html = '';
    Object.keys(grouped).sort().forEach(date => {
        const group = grouped[date];
        
        // 1. Render Kas Masuk
        group.masuk.forEach((r, i) => {
            html += '<tr>';
            if (i === 0) {
                html += `<td rowspan="${group.masuk.length}" style="vertical-align: middle; text-align: center; background-color: #f1f5f9; font-weight: 500;">${date}</td>`;
            }
            // build memo icon that shows popup with comment (data-memo + delegation agar klik selalu jalan)
            let fisikCell = r.fisik;
            if (r.komentarFisik) {
                const displayDate = date.split('-').reverse().join('/');
                const info = `${displayDate} - Fisik<br>${r.komentarFisik}`;
                const safe = ('' + info).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                fisikCell += ` <span class="memo-icon" data-memo="${safe}" title="Klik untuk lihat komentar">📝</span>`;
            }
            let selisihCell = r.selisih;
            if (r.komentarSelisih) {
                const displayDate = date.split('-').reverse().join('/');
                const info = `${displayDate} - Selisih<br>${r.komentarSelisih}`;
                const safe = ('' + info).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                selisihCell += ` <span class="memo-icon" data-memo="${safe}" title="Klik untuk lihat komentar">📝</span>`;
            }
            html += `
                <td>${r.keterangan}</td>
                <td class="num">${r.catatan}</td>
                <td class="num">${fisikCell}</td>
                <td class="num">${selisihCell}</td>
                <td>${r.foto}</td>
                <td>
                    ${window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete() ? `<button class="btn-small-danger" style="background: #ffc107; color: #000;" onclick="editPembukuanItem(${r.parentIdx}, '${r.type}', ${r.subIdx})">Edit</button>
                    <button class="btn-small-danger" onclick="deletePembukuanItem(${r.parentIdx}, '${r.type}', ${r.subIdx})">Hapus</button>` : '-'}
                </td>
            `;
            html += '</tr>';
        });
        
        // 2. Render Subtotal (Hanya Kas Masuk)
        html += `
            <tr style="background: #e2e8f0; font-weight: bold;">
                <td colspan="2" style="text-align: center;">TOTAL ${date}</td>
                <td class="num">${formatRupiah(group.subtotalCatatan)}</td>
                <td class="num">${formatRupiah(group.subtotalFisik)}</td>
                <td class="num">${formatRupiah(group.subtotalSelisih)}</td>
                <td></td>
                <td></td>
            </tr>
        `;

        // 3. Render Kas Keluar (Di bawah Total, Warna Hijau)
        group.keluar.forEach((r) => {
            html += '<tr style="background-color: #d1fae5;">';
            html += `<td style="vertical-align: middle; text-align: center; background-color: #d1fae5; font-weight: 500;">${date}</td>`;
            html += `
                <td>${r.keterangan}</td>
                <td class="num">${r.catatan}</td>
                <td class="num">${r.fisik}</td>
                <td class="num">${r.selisih}</td>
                <td>${r.foto}</td>
                <td>
                    ${window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete() ? `<button class="btn-small-danger" style="background: #ffc107; color: #000;" onclick="editPembukuanItem(${r.parentIdx}, '${r.type}', ${r.subIdx})">Edit</button>
                    <button class="btn-small-danger" onclick="deletePembukuanItem(${r.parentIdx}, '${r.type}', ${r.subIdx})">Hapus</button>` : '-'}
                </td>
            `;
            html += '</tr>';
        });
    });

    // do not include a global total row; only per-date subtotals are needed
    tbody.innerHTML = html;
    document.getElementById("pembukuan_saldo_awal").textContent = formatRupiah(saldoAwal);
    document.getElementById("pembukuan_total_cash").textContent = formatRupiah(totalCashMasuk);
    document.getElementById("pembukuan_total_keluar").textContent = formatRupiah(totalKasKeluar);
    document.getElementById("pembukuan_total_fisik").textContent = formatRupiah(saldoAkhir);
    summaryEl.style.display = 'grid';
    }

    if (typeof FirebaseStorage !== 'undefined' && FirebaseStorage.getPembukuan && useFirebaseBackend()) {
      FirebaseStorage.getPembukuan(tglAwal, tglAkhir, getRbmOutlet()).then(function(pending) {
        window._lastPembukuanPending = pending;
        renderPembukuanFromPending(pending);
      }).catch(function() {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Gagal memuat data.</td></tr>';
        summaryEl.style.display = 'none';
      });
      return;
    }
    var localPending = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PEMBUKUAN')), []);
    window._lastPembukuanPending = localPending;
    renderPembukuanFromPending(localPending);
}

function toggleMemo(icon) {
    // not used any more
}

function showMemoPopup(text, doc) {
    if (!text) return;
    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return;
    var overlay = d.getElementById('memoModalOverlay');
    var content = d.getElementById('memoModalContent');
    if (!overlay || !content) return;
    var parts = text.split('<br>');
    var html = '';
    if (parts.length > 0) {
        html += '<div class="memo-modal-header">' + parts[0] + '</div>';
        if (parts.length > 1) html += parts.slice(1).join('<br>');
    }
    content.innerHTML = html;
    overlay.style.display = 'flex';
    window._memoOverlayDoc = d;
}

function closeMemoPopup() {
    var d = window._memoOverlayDoc || (typeof document !== 'undefined' ? document : null);
    if (d) {
        var overlay = d.getElementById('memoModalOverlay');
        if (overlay) overlay.style.display = 'none';
    }
    window._memoOverlayDoc = null;
}

document.addEventListener('click', function(e) {
    var el = e.target && (e.target.closest ? e.target.closest('.memo-icon') : null);
    if (!el || !el.getAttribute('data-memo')) return;
    var text = el.getAttribute('data-memo');
    if (!text) return;
    showMemoPopup(text, el.ownerDocument || document);
}, true);

function deletePembukuanItem(parentIdx, type, subIdx) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    if(!confirm("Yakin ingin menghapus data ini?")) return;

    var pending = window._lastPembukuanPending;
    if (useFirebaseBackend() && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.deletePembukuanDay && pending && pending[parentIdx] && pending[parentIdx].payload) {
        var p = pending[parentIdx].payload;
        var kasMasuk = (p.kasMasuk || []).slice();
        var kasKeluar = (p.kasKeluar || []).slice();
        if (type === 'kasMasuk' && kasMasuk.length > subIdx) kasMasuk.splice(subIdx, 1);
        else if (type === 'kasKeluar' && kasKeluar.length > subIdx) kasKeluar.splice(subIdx, 1);
        var outlet = (window._lastPembukuanOutletKey !== undefined && window._lastPembukuanOutletKey !== '') ? window._lastPembukuanOutletKey : getRbmOutlet();
        if (kasMasuk.length === 0 && kasKeluar.length === 0) {
            FirebaseStorage.deletePembukuanDay(outlet, p.tanggal).then(function() { loadPembukuanData(); }).catch(function(err) { alert('Gagal hapus: ' + (err && err.message ? err.message : '')); loadPembukuanData(); });
        } else {
            FirebaseStorage.savePembukuan({ tanggal: p.tanggal, kasMasuk: kasMasuk, kasKeluar: kasKeluar }, outlet).then(function() { loadPembukuanData(); }).catch(function(err) { alert('Gagal update: ' + (err && err.message ? err.message : '')); loadPembukuanData(); });
        }
        return;
    }

    const key = getRbmStorageKey('RBM_PENDING_PEMBUKUAN');
    let localPending = safeParse(RBMStorage.getItem(key), []);
    if (localPending[parentIdx] && localPending[parentIdx].payload) {
        const payload = localPending[parentIdx].payload;
        if (type === 'kasMasuk' && payload.kasMasuk) payload.kasMasuk.splice(subIdx, 1);
        else if (type === 'kasKeluar' && payload.kasKeluar) payload.kasKeluar.splice(subIdx, 1);
        if ((!payload.kasMasuk || payload.kasMasuk.length === 0) && (!payload.kasKeluar || payload.kasKeluar.length === 0)) {
            localPending.splice(parentIdx, 1);
        }
        RBMStorage.setItem(key, JSON.stringify(localPending));
        loadPembukuanData();
    }
}

function editPembukuanItem(parentIdx, type, subIdx) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat mengedit data.'); return; }
    if(!confirm("Edit data ini? Data akan dipindahkan ke form input dan dihapus dari daftar ini.")) return;

    var pending = window._lastPembukuanPending;
    if (!pending && !useFirebaseBackend()) {
      var key = getRbmStorageKey('RBM_PENDING_PEMBUKUAN');
      pending = safeParse(RBMStorage.getItem(key), []);
    }
    var item = pending && pending[parentIdx];
    if (!item || !item.payload) return;

    const p = item.payload;
    let dataToEdit = null;
    
    if (type === 'kasMasuk' && p.kasMasuk && p.kasMasuk[subIdx]) {
        dataToEdit = p.kasMasuk[subIdx];
    } else if (type === 'kasKeluar' && p.kasKeluar && p.kasKeluar[subIdx]) {
        dataToEdit = p.kasKeluar[subIdx];
    }
    
    if (!dataToEdit) return;

    // Pindah ke view input
    showView('pembukuan-keuangan-view');
    
    // Set tanggal
    document.getElementById("tanggal_pembukuan").value = p.tanggal;
    
    // Set jenis dan generate rows
    const jenisSelect = document.getElementById("jenis_transaksi_pembukuan");
    jenisSelect.value = (type === 'kasMasuk') ? 'kas-masuk' : 'kas-keluar';
    createPembukuanRows();
    
    // Isi data ke baris pertama
    const container = document.getElementById("detail-container-pembukuan");
    const firstRow = container.querySelector(type === 'kasMasuk' ? '.row-group-pembukuan' : '.row-group');
    
    if (firstRow) {
        if (type === 'kasMasuk') {
            if(firstRow.querySelector(".pembukuan_ket_masuk")) firstRow.querySelector(".pembukuan_ket_masuk").value = dataToEdit.keterangan || '';
            if(firstRow.querySelector(".pembukuan_catatan")) firstRow.querySelector(".pembukuan_catatan").value = dataToEdit.catatan || '';
            if(firstRow.querySelector(".pembukuan_fisik")) firstRow.querySelector(".pembukuan_fisik").value = dataToEdit.fisik || '';
            if(firstRow.querySelector(".pembukuan_vcr")) firstRow.querySelector(".pembukuan_vcr").value = dataToEdit.vcr || '';
            
            // Trigger perhitungan selisih dan display logic
            firstRow.querySelector(".pembukuan_ket_masuk").dispatchEvent(new Event('input'));
            firstRow.querySelector(".pembukuan_fisik").dispatchEvent(new Event('input'));
            
            // Isi komentar jika ada
            if (dataToEdit.komentarFisik) {
                firstRow.querySelector(".pembukuan_komentar_fisik").value = dataToEdit.komentarFisik;
                // Force show comment field logic if needed, simplified here
            }
            if (dataToEdit.komentarSelisih) {
                firstRow.querySelector(".pembukuan_komentar_selisih").value = dataToEdit.komentarSelisih;
            }
        } else {
            if(firstRow.querySelector(".pembukuan_ket_keluar")) firstRow.querySelector(".pembukuan_ket_keluar").value = dataToEdit.keterangan || '';
            if(firstRow.querySelector(".pembukuan_setor")) firstRow.querySelector(".pembukuan_setor").value = dataToEdit.setor || '';
            // Foto tidak bisa di-restore ke input file karena security browser
            if (dataToEdit.foto) {
                alert("Catatan: Foto sebelumnya tidak dapat dimuat kembali ke input file. Silakan upload ulang jika perlu.");
            }
        }
    }

    if (useFirebaseBackend() && typeof FirebaseStorage !== 'undefined' && pending) {
        var kasMasuk = (p.kasMasuk || []).slice();
        var kasKeluar = (p.kasKeluar || []).slice();
        if (type === 'kasMasuk' && kasMasuk.length > subIdx) kasMasuk.splice(subIdx, 1);
        else if (type === 'kasKeluar' && kasKeluar.length > subIdx) kasKeluar.splice(subIdx, 1);
        var outlet = (window._lastPembukuanOutletKey !== undefined && window._lastPembukuanOutletKey !== '') ? window._lastPembukuanOutletKey : getRbmOutlet();
        if (kasMasuk.length === 0 && kasKeluar.length === 0) {
            FirebaseStorage.deletePembukuanDay(outlet, p.tanggal).then(function() { loadPembukuanData(); }).catch(function() { loadPembukuanData(); });
        } else {
            FirebaseStorage.savePembukuan({ tanggal: p.tanggal, kasMasuk: kasMasuk, kasKeluar: kasKeluar }, outlet).then(function() { loadPembukuanData(); }).catch(function() { loadPembukuanData(); });
        }
    } else {
        deletePembukuanItem(parentIdx, type, subIdx);
    }
}

function exportPembukuanToExcel() {
  const tglAwal = document.getElementById("pembukuan_tanggal_awal").value;
  const tglAkhir = document.getElementById("pembukuan_tanggal_akhir").value;
  const filename = `Laporan_Pembukuan_${tglAwal}_sd_${tglAkhir}.xls`;

  function buildAndDownloadExcel(pending) {
    pending = Array.isArray(pending) ? pending : [];
  let rows = [];

  let totalCashMasuk = 0;
  let totalKasKeluar = 0;
  let totalFisikSheet = 0;

  pending.forEach((item) => {
      const p = item.payload;
      if (p.tanggal >= tglAwal && p.tanggal <= tglAkhir) {
          if (p.kasMasuk && p.kasMasuk.length > 0) {
              p.kasMasuk.forEach((km) => {
                  let fisikVal = parseFloat(km.fisik) || 0;
                  let catatanVal = parseFloat(km.catatan) || 0;
                  let fisikDisplay = formatRupiah(fisikVal);
                  let selisihVal = 0;
                  if(km.keterangan && km.keterangan.toUpperCase() === 'VCR') {
                      const jmlVcr = parseFloat(km.vcr) || 0;
                      fisikVal = jmlVcr * 20000;
                      fisikDisplay = `${km.vcr} (VCR)`;
                  } else {
                      selisihVal = fisikVal - catatanVal;
                  }

                  if (km.keterangan && km.keterangan.toUpperCase() === 'CASH') {
                      totalCashMasuk += fisikVal;
                  }

                  rows.push({
                      tanggal: p.tanggal,
                      keterangan: km.keterangan,
                      catatan: km.catatan ? formatRupiah(km.catatan) : '-',
                      fisik: fisikDisplay,
                      selisih: (km.fisik || km.catatan) ? formatRupiah(selisihVal) : '-',
                      komentarFisik: km.komentarFisik || '',
                      komentarSelisih: km.komentarSelisih || '',
                      catatanVal: catatanVal,
                      fisikVal: fisikVal,
                      selisihVal: selisihVal,
                      foto: '-',
                      type: 'kasMasuk'
                  });
              });
          }
          if (p.kasKeluar && p.kasKeluar.length > 0) {
              p.kasKeluar.forEach((kk) => {
                  const setor = parseFloat(kk.setor) || 0;
                  
                  totalKasKeluar += setor;

                  rows.push({
                      tanggal: p.tanggal,
                      keterangan: kk.keterangan,
                      catatan: '-',
                      fisik: formatRupiah(kk.setor),
                      selisih: '-',
                      komentarFisik: '',
                      komentarSelisih: '',
                      catatanVal: 0,
                      fisikVal: setor,
                      selisihVal: 0,
                      foto: kk.foto ? '(Ada Foto)' : '-',
                      type: 'kasKeluar'
                  });
              });
          }
      }
  });

  totalFisikSheet = totalCashMasuk - totalKasKeluar;

  const grouped = {};
  rows.forEach(r => {
      if (!grouped[r.tanggal]) grouped[r.tanggal] = { masuk: [], keluar: [], subtotalCatatan: 0, subtotalFisik: 0, subtotalSelisih: 0 };
      if (r.type === 'kasMasuk') {
          grouped[r.tanggal].masuk.push(r);
          grouped[r.tanggal].subtotalCatatan += r.catatanVal || 0;
          grouped[r.tanggal].subtotalFisik += r.fisikVal || 0;
          grouped[r.tanggal].subtotalSelisih += r.selisihVal || 0;
      } else {
          grouped[r.tanggal].keluar.push(r);
      }
  });

  const esc = (str) => {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  };

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">\n';
  
  xml += '<Styles>\n';
  xml += ' <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style>\n';
  xml += ' <Style ss:ID="sHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e40af" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="sData"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
  xml += ' <Style ss:ID="sCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
  xml += ' <Style ss:ID="sNum"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
  xml += ' <Style ss:ID="sTotal"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/><Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="sTotalLabel"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/><Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="sTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1e40af"/></Style>\n';
  xml += ' <Style ss:ID="sSubtitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11" ss:Color="#64748b"/></Style>\n';
  xml += ' <Style ss:ID="sSummaryLabel"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e40af" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="sSummaryValue"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/></Style>\n';
  xml += ' <Style ss:ID="sDataGreen"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Interior ss:Color="#d1fae5" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="sNumGreen"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Interior ss:Color="#d1fae5" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="sCenterGreen"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Interior ss:Color="#d1fae5" ss:Pattern="Solid"/></Style>\n';
  xml += '</Styles>\n';

  xml += '<Worksheet ss:Name="Laporan Pembukuan">\n';
  xml += ' <Table>\n';
  xml += '  <Column ss:Width="80"/>\n';
  xml += '  <Column ss:Width="200"/>\n';
  xml += '  <Column ss:Width="100"/>\n';
  xml += '  <Column ss:Width="100"/>\n';
  xml += '  <Column ss:Width="100"/>\n';
  xml += '  <Column ss:Width="60"/>\n';

  xml += '  <Row ss:Height="25">\n';
  xml += `   <Cell ss:StyleID="sTitle" ss:MergeAcross="5"><Data ss:Type="String">Laporan Pembukuan</Data></Cell>\n`;
  xml += '  </Row>\n';
  xml += '  <Row ss:Height="20">\n';
  xml += `   <Cell ss:StyleID="sSubtitle" ss:MergeAcross="5"><Data ss:Type="String">Periode: ${tglAwal} s/d ${tglAkhir}</Data></Cell>\n`;
  xml += '  </Row>\n';
  xml += '  <Row ss:Index="4">\n';
  xml += '  </Row>\n';
  
  xml += '  <Row>\n';
  xml += `   <Cell ss:StyleID="sSummaryLabel" ss:MergeAcross="1"><Data ss:Type="String">Total Cash Masuk (G4)</Data></Cell>\n`;
  xml += `   <Cell ss:StyleID="sSummaryValue"><Data ss:Type="String">${esc(formatRupiah(totalCashMasuk))}</Data></Cell>\n`;
  xml += '  </Row>\n';
  xml += '  <Row>\n';
  xml += `   <Cell ss:StyleID="sSummaryLabel" ss:MergeAcross="1"><Data ss:Type="String">Total Kas Keluar (H4)</Data></Cell>\n`;
  xml += `   <Cell ss:StyleID="sSummaryValue"><Data ss:Type="String">${esc(formatRupiah(totalKasKeluar))}</Data></Cell>\n`;
  xml += '  </Row>\n';
  xml += '  <Row>\n';
  xml += `   <Cell ss:StyleID="sSummaryLabel" ss:MergeAcross="1"><Data ss:Type="String">Total Fisik (Sheet)</Data></Cell>\n`;
  xml += `   <Cell ss:StyleID="sSummaryValue"><Data ss:Type="String">${esc(formatRupiah(totalFisikSheet))}</Data></Cell>\n`;
  xml += '  </Row>\n';
  
  xml += '  <Row>\n';
  xml += '  </Row>\n';
  xml += '  <Row>\n';
  xml += '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Tanggal</Data></Cell>\n';
  xml += '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Keterangan</Data></Cell>\n';
  xml += '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Catatan</Data></Cell>\n';
  xml += '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Fisik / Setor</Data></Cell>\n';
  xml += '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Selisih</Data></Cell>\n';
  xml += '   <Cell ss:StyleID="sHeader"><Data ss:Type="String">Foto</Data></Cell>\n';
  xml += '  </Row>\n';

  Object.keys(grouped).sort().forEach(date => {
      const group = grouped[date];
      
      // 1. Kas Masuk
      group.masuk.forEach((r, i) => {
          xml += '  <Row>\n';
          if (i === 0) {
              const merge = group.masuk.length > 1 ? ` ss:MergeDown="${group.masuk.length - 1}"` : '';
              xml += `   <Cell ss:StyleID="sCenter"${merge}><Data ss:Type="String">${esc(date)}</Data></Cell>\n`;
              xml += `   <Cell ss:StyleID="sData"><Data ss:Type="String">${esc(r.keterangan)}</Data></Cell>\n`;
          } else {
              xml += `   <Cell ss:StyleID="sData" ss:Index="2"><Data ss:Type="String">${esc(r.keterangan)}</Data></Cell>\n`;
          }
          xml += `   <Cell ss:StyleID="sNum"><Data ss:Type="String">${esc(r.catatan)}</Data></Cell>\n`;
          
          // Fisik with Comment
          xml += `   <Cell ss:StyleID="sNum"><Data ss:Type="String">${esc(r.fisik)}</Data>`;
          if (r.komentarFisik) {
              xml += `<Comment ss:Author="RBM"><ss:Data>${esc(r.komentarFisik)}</ss:Data></Comment>`;
          }
          xml += `</Cell>\n`;

          // Selisih with Comment
          xml += `   <Cell ss:StyleID="sNum"><Data ss:Type="String">${esc(r.selisih)}</Data>`;
          if (r.komentarSelisih) {
              xml += `<Comment ss:Author="RBM"><ss:Data>${esc(r.komentarSelisih)}</ss:Data></Comment>`;
          }
          xml += `</Cell>\n`;

          xml += `   <Cell ss:StyleID="sData"><Data ss:Type="String">${esc(r.foto)}</Data></Cell>\n`;
          xml += '  </Row>\n';
      });
      
      // Subtotal Row
      xml += '  <Row>\n';
      xml += `   <Cell ss:StyleID="sTotalLabel" ss:MergeAcross="1"><Data ss:Type="String">TOTAL ${esc(date)}</Data></Cell>\n`;
      xml += `   <Cell ss:StyleID="sTotal"><Data ss:Type="String">${esc(formatRupiah(group.subtotalCatatan))}</Data></Cell>\n`;
      xml += `   <Cell ss:StyleID="sTotal"><Data ss:Type="String">${esc(formatRupiah(group.subtotalFisik))}</Data></Cell>\n`;
      xml += `   <Cell ss:StyleID="sTotal"><Data ss:Type="String">${esc(formatRupiah(group.subtotalSelisih))}</Data></Cell>\n`;
      xml += `   <Cell ss:StyleID="sTotal"><Data ss:Type="String"></Data></Cell>\n`;
      xml += '  </Row>\n';

      // 3. Kas Keluar (Green)
      group.keluar.forEach((r) => {
          xml += '  <Row>\n';
          xml += `   <Cell ss:StyleID="sCenterGreen"><Data ss:Type="String">${esc(date)}</Data></Cell>\n`;
          xml += `   <Cell ss:StyleID="sDataGreen"><Data ss:Type="String">${esc(r.keterangan)}</Data></Cell>\n`;
          xml += `   <Cell ss:StyleID="sNumGreen"><Data ss:Type="String">${esc(r.catatan)}</Data></Cell>\n`;
          xml += `   <Cell ss:StyleID="sNumGreen"><Data ss:Type="String">${esc(r.fisik)}</Data></Cell>\n`;
          xml += `   <Cell ss:StyleID="sNumGreen"><Data ss:Type="String">${esc(r.selisih)}</Data></Cell>\n`;
          xml += `   <Cell ss:StyleID="sDataGreen"><Data ss:Type="String">${esc(r.foto)}</Data></Cell>\n`;
          xml += '  </Row>\n';
      });
  });

  xml += ' </Table>\n';
  xml += '</Worksheet>\n';
  xml += '</Workbook>';

  const blob = new Blob(['\ufeff', xml], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  }

  if (typeof FirebaseStorage !== 'undefined' && FirebaseStorage.getPembukuan && useFirebaseBackend()) {
    FirebaseStorage.getPembukuan(tglAwal, tglAkhir, getRbmOutlet()).then(function(p) {
      buildAndDownloadExcel(p || []);
    }).catch(function() {
      buildAndDownloadExcel(window._lastPembukuanPending || safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PEMBUKUAN')), []));
    });
  } else {
    buildAndDownloadExcel(window._lastPembukuanPending || safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_PEMBUKUAN')), []));
  }
}

function triggerImportPembukuanExcel() {
  var el = document.getElementById('import_pembukuan_file');
  if (el) { el.value = ''; el.click(); }
}
function parseRupiahExcel(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  var s = String(val).replace(/Rp\s*/gi, '').replace(/\./g, '').replace(/,/g, '.').trim();
  return parseFloat(s) || 0;
}

function processImportPembukuanExcel(input) {
  var file = input && input.files && input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { alert('Library Excel belum dimuat. Pastikan halaman memuat xlsx.'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, { type: 'array' });
      var sheet = workbook.Sheets[workbook.SheetNames[0]];
      var aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      var headerRowIdx = 0;
      for (var i = 0; i < aoa.length; i++) {
        var first = (aoa[i] && aoa[i][0] != null) ? String(aoa[i][0]).trim() : '';
        if (first === 'Tanggal') { headerRowIdx = i; break; }
      }
      var headers = (aoa[headerRowIdx] || []).map(function(h) { return (h != null && h !== '') ? String(h).trim() : ''; });
      var rows = aoa.slice(headerRowIdx + 1).map(function(arr) {
        var o = {};
        headers.forEach(function(h, j) { if (h) o[h] = arr[j]; });
        return o;
      });
      if (!rows.length) { alert('File kosong atau tidak ada baris data.'); input.value = ''; return; }
      var byDate = {};
      var hasFormatExport = false;
      rows.forEach(function(r) {
        var kolomKeterangan = (r['Keterangan'] != null ? String(r['Keterangan']) : '').trim();
        var kolomFisikSetor = r['Fisik / Setor'] != null ? r['Fisik / Setor'] : r['Fisik'];
        if (r['Fisik / Setor'] !== undefined || (kolomKeterangan && (String(r['Catatan'] || '').indexOf('Rp') >= 0 || String(kolomFisikSetor || '').indexOf('Rp') >= 0))) hasFormatExport = true;
      });
      if (hasFormatExport) {
        var currentDate = '';
        var modeKeluar = false;
        rows.forEach(function(r) {
          var rawTanggal = (r['Tanggal'] != null ? String(r['Tanggal']) : '').trim();
          var keterangan = (r['Keterangan'] != null ? String(r['Keterangan']) : '').trim();
          if (!keterangan && !rawTanggal && parseRupiahExcel(r['Catatan']) === 0 && parseRupiahExcel(r['Fisik / Setor'] || r['Fisik']) === 0) return;
          if (keterangan === 'Laporan Pembukuan' || (keterangan && keterangan.indexOf('Periode:') === 0)) return;
          if (rawTanggal && (rawTanggal.indexOf('Laporan') >= 0 || rawTanggal.indexOf('Periode') >= 0)) return;
          if (keterangan.toUpperCase().indexOf('TOTAL ') === 0) {
            modeKeluar = true;
            return;
          }
          var tanggal = rawTanggal || currentDate;
          if (tanggal) {
            if (tanggal.indexOf('/') >= 0) {
              var p = tanggal.split('/');
              if (p.length >= 3) tanggal = p[2] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[0]).padStart(2, '0');
            } else if (tanggal.length === 8 && tanggal.indexOf('-') < 0) {
              tanggal = tanggal.slice(0, 4) + '-' + tanggal.slice(4, 6) + '-' + tanggal.slice(6, 8);
            }
            currentDate = tanggal;
          } else {
            tanggal = currentDate;
          }
          if (!tanggal) return;
          if (!byDate[tanggal]) { byDate[tanggal] = { tanggal: tanggal, kasMasuk: [], kasKeluar: [] }; modeKeluar = false; }
          var catatanVal = parseRupiahExcel(r['Catatan']);
          var fisikSetorVal = parseRupiahExcel(r['Fisik / Setor'] != null ? r['Fisik / Setor'] : r['Fisik']);
          if (modeKeluar) {
            if (!keterangan && fisikSetorVal === 0) return;
            byDate[tanggal].kasKeluar.push({ keterangan: keterangan, setor: fisikSetorVal, foto: null });
          } else {
            if (!keterangan && catatanVal === 0 && fisikSetorVal === 0) return;
            byDate[tanggal].kasMasuk.push({
              keterangan: keterangan,
              catatan: String(catatanVal),
              fisik: String(fisikSetorVal),
              vcr: (r['VCR'] != null ? String(r['VCR']) : '').trim(),
              komentarFisik: (r['KomentarFisik'] != null ? String(r['KomentarFisik']) : '').trim(),
              komentarSelisih: (r['KomentarSelisih'] != null ? String(r['KomentarSelisih']) : '').trim()
            });
          }
        });
      } else {
        rows.forEach(function(r) {
          var tanggal = (r['Tanggal'] != null ? String(r['Tanggal']) : '').trim();
          if (!tanggal) return;
          if (tanggal.indexOf('/') >= 0) {
            var p = tanggal.split('/');
            if (p.length >= 3) tanggal = p[2] + '-' + String(p[1]).padStart(2, '0') + '-' + String(p[0]).padStart(2, '0');
          } else if (tanggal.length === 8 && tanggal.indexOf('-') < 0) {
            tanggal = tanggal.slice(0, 4) + '-' + tanggal.slice(4, 6) + '-' + tanggal.slice(6, 8);
          }
          var tipe = (r['Tipe'] != null ? String(r['Tipe']).toLowerCase() : (r['Type'] != null ? String(r['Type']).toLowerCase() : '')).trim();
          var isKeluar = (tipe.indexOf('keluar') >= 0 || tipe === 'kas keluar');
          if (isKeluar) {
            var keterangan = (r['Keterangan'] != null ? String(r['Keterangan']) : '').trim();
            var setor = parseFloat(r['Setor']) || parseRupiahExcel(r['Fisik']) || 0;
            if (!keterangan && !setor) return;
            if (!byDate[tanggal]) byDate[tanggal] = { tanggal: tanggal, kasMasuk: [], kasKeluar: [] };
            byDate[tanggal].kasKeluar.push({ keterangan: keterangan, setor: setor, foto: null });
          } else {
            var ket = (r['Keterangan'] != null ? String(r['Keterangan']) : '').trim();
            var catatan = parseRupiahExcel(r['Catatan']) || parseFloat(r['Catatan']) || 0;
            var fisik = parseRupiahExcel(r['Fisik']) || parseFloat(r['Fisik']) || 0;
            var vcr = (r['VCR'] != null ? String(r['VCR']) : '').trim();
            if (!ket && !catatan && !fisik && !vcr) return;
            if (!byDate[tanggal]) byDate[tanggal] = { tanggal: tanggal, kasMasuk: [], kasKeluar: [] };
            byDate[tanggal].kasMasuk.push({
              keterangan: ket,
              catatan: String(catatan),
              fisik: String(fisik),
              vcr: vcr,
              komentarFisik: (r['KomentarFisik'] != null ? String(r['KomentarFisik']) : '').trim(),
              komentarSelisih: (r['KomentarSelisih'] != null ? String(r['KomentarSelisih']) : '').trim()
            });
          }
        });
      }
      var payloads = Object.keys(byDate).sort().map(function(k) { return byDate[k]; });
      if (payloads.length === 0) { alert('Tidak ada baris valid. Gunakan format: Tanggal, Keterangan, Catatan, Fisik / Setor, Selisih, Foto (sama seperti hasil Export).'); input.value = ''; return; }
      var outlet = getRbmOutlet();
      if (useFirebaseBackend() && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.savePembukuan) {
        var idx = 0;
        function next() {
          if (idx >= payloads.length) { alert('Import selesai: ' + payloads.length + ' tanggal pembukuan.'); if (typeof loadPembukuanData === 'function') loadPembukuanData(); input.value = ''; return; }
          FirebaseStorage.savePembukuan(payloads[idx], outlet).then(function() { idx++; next(); }).catch(function(err) { alert('Gagal: ' + (err && err.message ? err.message : '')); input.value = ''; });
        }
        next();
      } else {
        payloads.forEach(function(p) { savePendingToLocalStorage('PEMBUKUAN', p); });
        alert('Import selesai: ' + payloads.length + ' tanggal pembukuan (disimpan di perangkat).');
        if (typeof loadPembukuanData === 'function') loadPembukuanData();
        input.value = '';
      }
    } catch (err) { alert('Error baca file: ' + (err && err.message ? err.message : '')); input.value = ''; }
  };
  reader.readAsArrayBuffer(file);
}

function downloadTemplatePembukuanExcel() {
  if (typeof XLSX === 'undefined') { alert('Library Excel belum dimuat.'); return; }
  // Format sama dengan hasil Export Excel: Tanggal, Keterangan, Catatan, Fisik / Setor, Selisih, Foto
  var headers = ['Tanggal', 'Keterangan', 'Catatan', 'Fisik / Setor', 'Selisih', 'Foto'];
  var contoh = [
    ['2026-03-01', 'CASH', 'Rp 3683804', 'Rp 3.684.000', 'Rp 196', ''],
    ['', 'MANDIRI INTRANSIT', 'Rp 2095458', 'Rp 2.095.458', 'Rp 0', ''],
    ['', 'KAS BESAR', 'Rp 33601', 'Rp 33.601', 'Rp 0', ''],
    ['', 'TOTAL 2026-03-01', 'Rp 5.812.863', 'Rp 5.813.059', 'Rp 196', ''],
    ['2026-03-01', 'Setor ke bank', '', 'Rp 500000', '', '']
  ];
  var aoa = [['Laporan Pembukuan'], ['Periode: (isi tanggal dari - sampai)'], []].concat([headers]).concat(contoh);
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Pembukuan');
  XLSX.writeFile(wb, 'Template_Import_Pembukuan.xlsx');
}

function printPembukuanReport() {
    // Reuse existing print logic structure
    window.print();
}

function loadInventarisData() {
  const table = document.getElementById("inv_table");
  const thead = table.querySelector("thead");
  const tbody = document.getElementById("inv_tbody");
  
  tbody.innerHTML = '<tr><td colspan="5" class="table-loading">Memuat data...</td></tr>';
  
  const tglAwal = document.getElementById("inv_tanggal_awal").value;
  const tglAkhir = document.getElementById("inv_tanggal_akhir").value;

  // Fungsi untuk merender data menjadi Matrix (Pivot)
  const renderPivot = (data) => {
      if (!data || data.length === 0) {
          thead.innerHTML = '<tr><th>No</th><th>Nama Barang</th><th>Status</th></tr>';
          tbody.innerHTML = '<tr><td colspan="3" class="table-empty">Tidak ada data ditemukan.</td></tr>';
          return;
      }

      // 1. Ambil tanggal unik & urutkan
      const dates = [...new Set(data.map(d => d.tanggal))].sort();
      
      // 2. Ambil nama barang unik & urutkan
      const items = [...new Set(data.map(d => d.nama))].sort();

      // 3. Buat Header Table (Tanggal sebagai kolom)
      let headerHtml = '<tr><th style="width: 50px;">No</th><th>Nama Barang</th>';
      dates.forEach(d => {
          // Format tanggal jadi dd/mm agar hemat tempat
          const dateObj = new Date(d);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          headerHtml += `<th class="num">${day}/${month}/${year}</th>`;
      });
      headerHtml += '</tr>';
      thead.innerHTML = headerHtml;

      // 4. Buat Body Table
      let bodyHtml = '';
      items.forEach((item, index) => {
          bodyHtml += `<tr><td>${index + 1}</td><td>${item}</td>`;
          
          dates.forEach(date => {
              // Cari data yang cocok
              // Kita ambil data terakhir jika ada duplikat input di tanggal yang sama
              const matches = data.filter(d => d.nama === item && d.tanggal === date);
              let val = '-';
              let valForEdit = '';

              if (matches.length > 0) {
                  val = matches[matches.length - 1].jumlah;
                  valForEdit = val;
              }

              let cellClass = 'num clickable-cell';
              let onClick = `onclick="openEditInventaris('${item.replace(/'/g, "\\'")}', '${date}', '${valForEdit}')"`;
              bodyHtml += `<td class="${cellClass}" ${onClick} title="Klik untuk edit/tambah">${val}</td>`;
          });
          
          bodyHtml += '</tr>';
      });
      tbody.innerHTML = bodyHtml;
  };

  // Local Storage Logic (Offline/Pending)
  if (!useFirebaseBackend() && !isGoogleScript()) {
    const pending = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_PENDING_INVENTARIS')), []);
    let flatData = [];
    
    pending.forEach((item) => {
      const dataList = item.payload || [];
      dataList.forEach((data) => {
        if (data.tanggal >= tglAwal && data.tanggal <= tglAkhir) {
          flatData.push({
            tanggal: data.tanggal,
            nama: data.nama,
            jumlah: data.jumlah
          });
        }
      });
    });

    renderPivot(flatData);
    return;
  }

  // Firebase: load inventaris dari Firebase
  if (typeof FirebaseStorage !== 'undefined' && FirebaseStorage.getInventaris && useFirebaseBackend()) {
    FirebaseStorage.getInventaris(tglAwal, tglAkhir, getRbmOutlet()).then(function(list) {
      renderPivot(list || []);
    }).catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error: ' + (err && err.message ? err.message : 'Gagal memuat') + '</td></tr>';
    });
    return;
  }

  // Google Script Logic (Placeholder - Anda perlu membuat fungsi getLaporanInventaris di GAS)
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(renderPivot)
      .withFailureHandler(function(err) {
         tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Error: ' + (err && err.message ? err.message : 'Gagal memuat') + '</td></tr>';
      })
      .getLaporanInventaris(tglAwal, tglAkhir);
    return;
  }

  renderPivot([]);
}

function exportInventarisToExcel() {
  const table = document.getElementById("inv_table");
  if (!table) return;
  const tglAwal = document.getElementById("inv_tanggal_awal").value;
  const tglAkhir = document.getElementById("inv_tanggal_akhir").value;
  const filename = `Laporan_Inventaris_${tglAwal}_sd_${tglAkhir}.xls`;
  
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #000;padding:5px;}th{background-color:#1e40af;color:#fff;}.num{mso-number-format:"\#\,\#\#0";text-align:right;}</style></head><body><h2 style="text-align:center;">Laporan Inventaris</h2><p style="text-align:center;">Periode: ${tglAwal} s/d ${tglAkhir}</p>${table.outerHTML}</body></html>`;
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function printInventarisReport() {
  const table = document.getElementById("inv_table");
  if (!table) return;
  const tglAwal = document.getElementById("inv_tanggal_awal").value;
  const tglAkhir = document.getElementById("inv_tanggal_akhir").value;

  const printWindow = window.open('', '', 'height=600,width=900');
  printWindow.document.write('<html><head><title>Laporan Inventaris</title><style>body{font-family:sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;font-size:12px;}th,td{border:1px solid #ccc;padding:8px;}th{background:#1e40af;color:white;}.num{text-align:right;}@media print{@page{size:portrait;}}</style></head><body>');
  printWindow.document.write(`<h2 style="text-align:center;">Laporan Inventaris</h2><p style="text-align:center;">Periode: ${tglAwal} s/d ${tglAkhir}</p>`);
  printWindow.document.write(table.outerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function openEditInventaris(nama, tanggal, jumlah) {
    document.getElementById('editInvNama').value = nama;
    document.getElementById('editInvTanggal').value = tanggal;
    document.getElementById('editInvJumlah').value = jumlah;
    
    const d = new Date(tanggal);
    const displayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    document.getElementById('editInvInfo').innerHTML = `<strong>${nama}</strong><br>${displayDate}`;
    var modal = document.getElementById('editInventarisModal');
    if (modal) {
        var btns = modal.querySelectorAll('button');
        var canEdit = window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete();
        if (btns[0]) btns[0].style.display = canEdit ? '' : 'none';
        if (btns[1]) btns[1].style.display = canEdit ? '' : 'none';
    }
    if (modal) modal.style.display = 'flex';
}

function closeEditInventaris() {
    document.getElementById('editInventarisModal').style.display = 'none';
}

function saveEditInventaris() {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat mengedit data.'); return; }
    const nama = document.getElementById('editInvNama').value;
    const tanggal = document.getElementById('editInvTanggal').value;
    const jumlah = document.getElementById('editInvJumlah').value;
    
    if (jumlah === '') { alert("Jumlah harus diisi"); return; }
    processInventarisUpdate(nama, tanggal, jumlah);
}

function deleteEditInventaris() {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    if (!confirm("Hapus data inventaris ini? (Jumlah akan di-set ke 0)")) return;
    const nama = document.getElementById('editInvNama').value;
    const tanggal = document.getElementById('editInvTanggal').value;
    processInventarisUpdate(nama, tanggal, 0);
}

function processInventarisUpdate(nama, tanggal, jumlah) {
    const dataList = [{ tanggal: tanggal, nama: nama, jumlah: jumlah }];
    closeEditInventaris();
    
    const tbody = document.getElementById("inv_tbody");
    tbody.innerHTML = '<tr><td colspan="100%" class="table-loading">Menyimpan perubahan...</td></tr>';

    if (useFirebaseBackend()) {
        FirebaseStorage.saveInventaris(dataList, getRbmOutlet()).then(function(res) { alert(res); loadInventarisData(); }).catch(function(err) { alert("Error: " + (err && err.message ? err.message : '')); loadInventarisData(); });
        return;
    }
    if (!isGoogleScript()) {
        savePendingToLocalStorage('INVENTARIS', dataList);
        loadInventarisData();
    } else {
        google.script.run.withSuccessHandler(function(res) { alert(res); loadInventarisData(); }).withFailureHandler(function(err) { alert("Error: " + err.message); loadInventarisData(); }).simpanDataInventaris(dataList);
    }
}

// ================= ABSENSI LOGIC =================
const ABSENSI_CODES = ['H', 'R', 'O', 'S', 'I', 'A', 'DP', 'PH', 'AL', ''];
const JADWAL_CODES = ['P', 'M', 'S', 'Off', 'PH', 'AL', 'DP', ''];
function getJadwalCodesList() {
    var c = typeof getGpsJamConfig === 'function' ? getGpsJamConfig() : {};
    if (c.shifts && Array.isArray(c.shifts) && c.shifts.length > 0) {
        var codes = c.shifts.map(function(s) { return s.code || ''; }).filter(Boolean);
        return codes.concat(['Off', 'PH', 'AL', 'DP', '']);
    }
    return JADWAL_CODES;
}

function updateJadwalLegend() {
    var el = document.getElementById('legend-jadwal');
    if (!el) return;
    var c = typeof getGpsJamConfig === 'function' ? getGpsJamConfig() : {};
    var html = '';
    if (c.shifts && Array.isArray(c.shifts) && c.shifts.length > 0) {
        c.shifts.forEach(function(s) {
            var code = (s.code || '').toString().replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/>/g, '&gt;');
            var name = (s.name || code).toString().replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/>/g, '&gt;');
            html += '<span class="badge jadwal-' + code + '">' + code + ': ' + name + '</span>';
        });
    } else {
        html += '<span class="badge jadwal-P">P: Pagi</span><span class="badge jadwal-M">M: Middle</span><span class="badge jadwal-S">S: Sore</span>';
    }
    html += '<span class="badge jadwal-Off">Off: Libur</span><span class="badge status-C">PH/AL/DP: Cuti</span>';
    el.innerHTML = html;
    el.style.display = 'flex';
    el.style.gap = '10px';
    el.style.flexWrap = 'wrap';
}

let activeAbsensiMode = 'absensi';

function syncAbsensiPeriodAndRefresh() {
    window._absensiViewData = undefined; // agar periode baru di-load dari Firebase
    switchAbsensiTab(activeAbsensiMode);
}

function switchAbsensiTab(mode) {
    mode = mode || activeAbsensiMode;
    activeAbsensiMode = mode;
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('tab-btn-' + mode);
    if(activeBtn) activeBtn.classList.add('active');

    // Hide all content sections
    document.getElementById('tab-content-input').style.display = 'none';
    document.getElementById('tab-content-laporan').style.display = 'none';
    document.getElementById('tab-content-gaji').style.display = 'none';
    document.getElementById('tab-content-bonus').style.display = 'none';

    if (mode === 'absensi' || mode === 'jadwal') {
        window._absensiViewData = undefined; // load data yang sesuai mode (Absensi vs Jadwal)
        document.getElementById('tab-content-input').style.display = 'block';
        renderAbsensiTable(mode);
    } else if (mode === 'laporan') {
        document.getElementById('tab-content-laporan').style.display = 'block';
        renderRekapAbsensiReport();
    } else if (mode === 'gaji') {
        document.getElementById('tab-content-gaji').style.display = 'block';
        renderRekapGaji();
    } else if (mode === 'bonus') {
        document.getElementById('tab-content-bonus').style.display = 'block';
        renderBonusTab();
    }
}

function renderAbsensiTable(mode) {
    if (mode) activeAbsensiMode = mode;
    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    const thead = document.getElementById("absensi_thead");
    const tbody = document.getElementById("absensi_tbody");

    if (!tglAwal || !tglAkhir) return;

    // Toggle Legends
    const isJadwal = activeAbsensiMode === 'jadwal';
    const legendAbsensi = document.getElementById('legend-absensi');
    const legendJadwal = document.getElementById('legend-jadwal');
    if (legendAbsensi && legendJadwal) {
        legendAbsensi.style.display = isJadwal ? 'none' : 'flex';
        legendJadwal.style.display = isJadwal ? 'flex' : 'none';
        if (isJadwal && typeof updateJadwalLegend === 'function') updateJadwalLegend();
    }

    // Generate Date Range
    const dates = [];
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    // Determine Codes and Headers (jadwal: ikut daftar shift dari Pengaturan Jadwal & Absensi)
    const rekapHeaders = isJadwal ? (typeof getJadwalCodesList === 'function' ? getJadwalCodesList().filter(function(c) { return c !== ''; }) : ['P','M','S','Off','PH','AL','DP']) : ['H','R','O','S','I','A','DP','PH','AL'];
    const dataKey = getRbmStorageKey(isJadwal ? 'RBM_JADWAL_DATA' : 'RBM_ABSENSI_DATA');
    if (window._absensiViewData === undefined) {
        window._absensiViewData = safeParse(RBMStorage.getItem(dataKey), {});
    }
    const storedData = window._absensiViewData;

    const extraColsVisible = RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_EXTRA_COLS')) !== '0';
    const table = document.getElementById('absensi_table');
    const toggleBtn = document.getElementById('absensi-toggle-cols-btn');

    // 1. Build Header (Email dihapus; Jabatan, Join Date, Sisa Cuti bisa dilipat via icon mata di samping Save/Print Jadwal)
    let row1 = `
        <tr>
            <th rowspan="2" style="position:sticky; left:0; z-index:10; min-width: 40px; background: #1e40af;">No</th>
            <th rowspan="2" style="position:sticky; left:40px; z-index:10; min-width:150px; background: #1e40af;">Nama</th>
            <th rowspan="2" class="col-jabatan" style="min-width:100px; background: #1e40af;">Jabatan</th>
            <th rowspan="2" class="col-joindate" style="min-width:110px; background: #1e40af;">Join Date</th>
            <th colspan="3" class="col-sisa-cuti" style="background: #1e40af;">Sisa Cuti</th>
            <th colspan="${dates.length}">Tanggal (${tglAwal} s/d ${tglAkhir}) - ${isJadwal ? 'JADWAL' : 'ABSENSI'}</th>
            <th colspan="${rekapHeaders.length}">Rekap ${isJadwal ? 'Jadwal' : 'Absensi'}</th>
            <th rowspan="2">Aksi</th>
        </tr>
        <tr>`;
    
    row1 += `<th class="col-sisa-cuti" style="min-width:60px; background: #1e40af;">AL</th>`;
    row1 += `<th class="col-sisa-cuti" style="min-width:60px; background: #1e40af;">DP</th>`;
    row1 += `<th class="col-sisa-cuti" style="min-width:60px; background: #1e40af;">PH</th>`;

    dates.forEach(d => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        row1 += `<th style="font-size:11px; min-width:35px;">${day}/${month}</th>`;
    });

    rekapHeaders.forEach(h => { row1 += `<th>${h}</th>`; });
    row1 += `</tr>`;
    thead.innerHTML = row1;
    if (table) {
        if (extraColsVisible) table.classList.remove('hide-extra-cols'); else table.classList.add('hide-extra-cols');
    }
    if (toggleBtn) {
        toggleBtn.title = extraColsVisible ? 'Sembunyikan Jabatan, Join Date, Sisa Cuti' : 'Tampilkan Jabatan, Join Date, Sisa Cuti';
        toggleBtn.innerHTML = '&#128065;';
    }

    // 2. Load Data (in-memory; simpan ke Firebase hanya saat klik Simpan)
    if (window._absensiViewEmployees === undefined || !Array.isArray(window._absensiViewEmployees)) {
        window._absensiViewEmployees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    }
    const employees = window._absensiViewEmployees;
    if (employees.length === 0) {
        employees.push({id: 1, name: "Budi", jabatan: "Kitchen", joinDate: "2023-01-01", sisaAL:12, sisaDP:0, sisaPH:0});
        employees.push({id: 2, name: "Siti", jabatan: "Server", joinDate: "2023-02-15", sisaAL:12, sisaDP:0, sisaPH:0});
    }

    // 3. Build Body
    tbody.innerHTML = '';
    employees.forEach((emp, index) => {
        const tr = document.createElement('tr');
        
        // Static Info (Email dihapus; Jabatan, Join Date, Sisa Cuti bisa dilipat via icon di samping Save/Print Jadwal)
        let html = `
            <td style="position:sticky; left:0; background:white; z-index:5;">${index + 1}</td>
            <td style="position:sticky; left:40px; background:white; z-index:5; text-align:left;">
                <input type="text" value="${emp.name}" onchange="updateEmployee(${index}, 'name', this.value)" style="border:none; width:100%; padding:0;">
            </td>
            <td class="col-jabatan">
                <input type="text" value="${emp.jabatan}" onchange="updateEmployee(${index}, 'jabatan', this.value)" style="border:none; width:80px; padding:0;">
            </td>
            <td class="col-joindate">
                <input type="date" value="${emp.joinDate || ''}" onchange="updateEmployee(${index}, 'joinDate', this.value)" style="border:none; width:100px; padding:0; font-size:11px;">
            </td>
            <td class="col-sisa-cuti">
                <input type="number" value="${emp.sisaAL||0}" onchange="updateEmployee(${index}, 'sisaAL', this.value)" style="width:50px; padding:5px; border:1px solid #eee; text-align:center;">
            </td>
            <td class="col-sisa-cuti">
                <input type="number" value="${emp.sisaDP||0}" onchange="updateEmployee(${index}, 'sisaDP', this.value)" style="width:50px; padding:5px; border:1px solid #eee; text-align:center;">
            </td>
            <td class="col-sisa-cuti">
                <input type="number" value="${emp.sisaPH||0}" onchange="updateEmployee(${index}, 'sisaPH', this.value)" style="width:50px; padding:5px; border:1px solid #eee; text-align:center;">
            </td>
        `;

        // Date Cells
        let counts = {};
        rekapHeaders.forEach(h => counts[h] = 0);
        
        dates.forEach(d => {
            const dateKey = d.toISOString().split('T')[0];
            const key = `${dateKey}_${emp.id || index}`;
            const status = storedData[key] || '';
            
            if (status && counts.hasOwnProperty(status)) counts[status]++;
            
            let colorClass = '';
            if (isJadwal) {
                 if (['PH','AL','DP'].includes(status)) colorClass = 'status-C';
                 else if (status) colorClass = 'jadwal-' + status;
            } else {
                 if (status) {
                    let type = status.charAt(0);
                    if(['DP','PH','AL'].includes(status)) type = 'C';
                    colorClass = `status-${type}`;
                 }
            }
            html += `<td class="absensi-cell ${colorClass}" onclick="cycleAbsensiStatus(this, '${key}')">${status}</td>`;
        });

        // Rekap Columns
        rekapHeaders.forEach(h => {
            html += `<td class="rekap-${h}" style="text-align:center;">${counts[h]}</td>`;
        });
        html += `<td>${window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete() ? '<button class="btn-small-danger" onclick="removeEmployee(' + index + ')">x</button>' : '-'}</td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function toggleAbsensiExtraCols(btn) {
    const table = document.getElementById('absensi_table');
    if (!table) return;
    const isHidden = table.classList.contains('hide-extra-cols');
    if (isHidden) {
        table.classList.remove('hide-extra-cols');
        RBMStorage.setItem(getRbmStorageKey('RBM_ABSENSI_EXTRA_COLS'), '1');
        if (btn) { btn.title = 'Sembunyikan Jabatan, Join Date, Sisa Cuti'; btn.innerHTML = '&#128065;'; }
    } else {
        table.classList.add('hide-extra-cols');
        RBMStorage.setItem(getRbmStorageKey('RBM_ABSENSI_EXTRA_COLS'), '0');
        if (btn) { btn.title = 'Tampilkan Jabatan, Join Date, Sisa Cuti'; btn.innerHTML = '&#128065;'; }
    }
}

function cycleAbsensiStatus(cell, key) {
    const isJadwal = activeAbsensiMode === 'jadwal';
    const codes = isJadwal ? (typeof getJadwalCodesList === 'function' ? getJadwalCodesList() : JADWAL_CODES) : ABSENSI_CODES;
    const current = cell.innerText;
    let nextIdx = codes.indexOf(current) + 1;
    if (nextIdx >= codes.length) nextIdx = 0;
    const next = codes[nextIdx];
    
    cell.innerText = next;
    
    // Update Class
    cell.className = 'absensi-cell'; // reset
    if (next) {
        if (isJadwal) {
             if (['PH','AL','DP'].includes(next)) cell.classList.add('status-C');
             else if (next) cell.classList.add('jadwal-' + next);
        } else {
             let type = next.charAt(0);
             if(['DP','PH','AL'].includes(next)) type = 'C';
             cell.classList.add(`status-${type}`);
        }
    }

    // Simpan di memori saja; akan tersimpan ke Firebase saat user klik tombol Simpan
    if (window._absensiViewData === undefined) {
        window._absensiViewData = safeParse(RBMStorage.getItem(getRbmStorageKey(isJadwal ? 'RBM_JADWAL_DATA' : 'RBM_ABSENSI_DATA')), {});
    }
    window._absensiViewData[key] = next;
}

function updateEmployee(index, field, value) {
    if (window._absensiViewEmployees === undefined || !Array.isArray(window._absensiViewEmployees)) {
        window._absensiViewEmployees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    }
    const employees = window._absensiViewEmployees;
    if (employees[index]) {
        employees[index][field] = value;
    }
    saveAbsensiToFirebase(true); // [AUTO-SAVE] Simpan otomatis saat edit
    renderAbsensiTable();
}

function addEmployeeRow() {
    if (window._absensiViewEmployees === undefined || !Array.isArray(window._absensiViewEmployees)) {
        window._absensiViewEmployees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    }
    const employees = window._absensiViewEmployees;
    const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id || 0)) + 1 : 1;
    employees.push({ id: newId, name: "Nama Baru", jabatan: "-", email: "", joinDate: "", sisaAL:0, sisaDP:0, sisaPH:0 });
    saveAbsensiToFirebase(true); // [AUTO-SAVE] Simpan otomatis saat tambah
    renderAbsensiTable();
}

function removeEmployee(index) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data karyawan.'); return; }
    if(!confirm("Hapus karyawan ini?")) return;
    if (window._absensiViewEmployees === undefined || !Array.isArray(window._absensiViewEmployees)) {
        window._absensiViewEmployees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    }
    window._absensiViewEmployees.splice(index, 1);
    saveAbsensiToFirebase(true); // [AUTO-SAVE] Simpan otomatis saat hapus
    renderAbsensiTable();
}

function saveAbsensiData() {
    renderAbsensiTable();
}

/** Simpan data Absensi & Jadwal (karyawan + status per tanggal) ke Firebase. Panggil saat user klik tombol Simpan. */
function saveAbsensiToFirebase(silent) {
    var employees = window._absensiViewEmployees;
    if (!employees || !Array.isArray(employees)) {
        if (!silent) alert('Tidak ada data karyawan untuk disimpan.');
        return;
    }
    var data = window._absensiViewData;
    if (data === undefined) data = {};
    var isJadwal = (typeof activeAbsensiMode !== 'undefined' && activeAbsensiMode === 'jadwal');
    var keyEmployees = getRbmStorageKey('RBM_EMPLOYEES');
    var keyData = getRbmStorageKey(isJadwal ? 'RBM_JADWAL_DATA' : 'RBM_ABSENSI_DATA');
    var msg = document.getElementById('absensi-save-feedback');
    function showSuccess() {
        if (msg) {
            msg.textContent = 'Data tersimpan.';
            msg.style.color = '#16a34a';
            setTimeout(function() { msg.textContent = ''; }, 3000);
        } else {
            if (!silent) alert('Data tersimpan.');
        }
    }
    function showError() {
        if (msg) {
            msg.textContent = 'Gagal menyimpan. Cek koneksi internet.';
            msg.style.color = '#dc2626';
        } else {
            if (!silent) alert('Gagal menyimpan. Cek koneksi internet.');
        }
    }
    if (msg && !silent) msg.textContent = 'Menyimpan...';
    var p1 = RBMStorage.setItem(keyEmployees, JSON.stringify(employees));
    var p2 = RBMStorage.setItem(keyData, JSON.stringify(data));
    Promise.all([p1, p2]).then(function() {
        showSuccess();
    }).catch(function(err) {
        console.warn('saveAbsensiToFirebase failed', err);
        showError();
    });
}

function renderRekapAbsensiReport() {
    const tglAwalEl = document.getElementById("absensi_tgl_awal");
    const tglAkhirEl = document.getElementById("absensi_tgl_akhir");
    const tglAwal = tglAwalEl ? tglAwalEl.value : '';
    const tglAkhir = tglAkhirEl ? tglAkhirEl.value : '';
    
    if (!tglAwal || !tglAkhir) {
        alert("Pilih tanggal mulai dan selesai terlebih dahulu.");
        return;
    }

    // Update Header Text
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const d1 = new Date(tglAwal).toLocaleDateString('id-ID', options);
    const d2 = new Date(tglAkhir).toLocaleDateString('id-ID', options);
    document.getElementById("rekap_periode_text").innerText = `Absensi Periode ${d1} s/d ${d2}`;
    
    // Update Sign Date
    const todayStr = new Date().toLocaleDateString('id-ID', options);
    const signDateEl = document.getElementById("rekap_sign_date");
    if(signDateEl) signDateEl.innerText = `Sidoarjo, ${todayStr}`;

    // Generate Dates
    const dates = [];
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    const thead = document.getElementById("rekap_absen_thead");
    const tbody = document.getElementById("rekap_absen_tbody");
    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);

    // 1. Build Header
    let hRow1 = `
        <tr>
            <th rowspan="2" style="border:1px solid black; padding:4px;">NO</th>
            <th rowspan="2" style="border:1px solid black; padding:4px;">ID KARYAWAN</th>
            <th rowspan="2" style="border:1px solid black; padding:4px;">NAMA</th>
            <th rowspan="2" style="border:1px solid black; padding:4px;">JABATAN</th>
            <th colspan="${dates.length}" style="border:1px solid black; padding:4px;">PERIODE (${d1} - ${d2})</th>
            <th rowspan="2" style="border:1px solid black; padding:4px; width:40px;">TOTAL HARI KERJA</th>
            <th rowspan="2" style="border:1px solid black; padding:4px; width:40px;">TOTAL SISA CUTI</th>
            <th colspan="8" style="border:1px solid black; padding:4px;">ABSENSI/TIDAK HADIR</th>
        </tr>
        <tr>`;
    
    // Date Sub-headers
    dates.forEach(d => {
        hRow1 += `<th style="border:1px solid black; padding:2px; min-width:20px;">${d.getDate()}</th>`;
    });

    // Absensi Sub-headers
    const absTypes = ['A', 'I', 'S', 'OFF', 'DP', 'PH', 'AL', 'JML'];
    absTypes.forEach(t => {
        hRow1 += `<th style="border:1px solid black; padding:2px; min-width:25px;">${t}</th>`;
    });
    hRow1 += `</tr>`;
    thead.innerHTML = hRow1;

    // 2. Build Body
    let bodyHtml = '';
    if (employees.length === 0) {
        bodyHtml = `<tr><td colspan="${7 + dates.length + 8}" style="text-align:center; padding:10px; border:1px solid black;">Tidak ada data karyawan</td></tr>`;
    } else {
        employees.forEach((emp, idx) => {
            let row = `<tr>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${idx + 1}</td>`;
            row += `<td style="border:1px solid black; padding:4px;">${emp.id || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px;">${emp.name}</td>`;
            row += `<td style="border:1px solid black; padding:4px;">${emp.jabatan}</td>`;

            let counts = { H:0, A:0, I:0, S:0, OFF:0, DP:0, PH:0, AL:0 };
            
            // Date Cells
            dates.forEach(d => {
                const dateKey = d.toISOString().split('T')[0];
                const key = `${dateKey}_${emp.id || idx}`;
                const status = absensiData[key] || '';
                
                // Fix: Map 'O' to 'OFF' for counting
                let countKey = status;
                if (status === 'O') countKey = 'OFF';

                if (status && counts.hasOwnProperty(countKey)) {
                    counts[countKey]++;
                }
                
                row += `<td style="border:1px solid black; padding:2px; text-align:center; font-size:9px;">${status}</td>`;
            });

            // Calculations
            const totalHariKerja = counts.H; 
            const totalSisaCuti = (parseInt(emp.sisaAL)||0) + (parseInt(emp.sisaDP)||0) + (parseInt(emp.sisaPH)||0);
            const totalJml = dates.length; 

            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${totalHariKerja}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${totalSisaCuti}</td>`;

            // Breakdown Columns
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.A || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.I || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.S || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.OFF || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.DP || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.PH || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${counts.AL || '-'}</td>`;
            row += `<td style="border:1px solid black; padding:4px; text-align:center;">${totalJml}</td>`;

            row += `</tr>`;
            bodyHtml += row;
        });
    }
    tbody.innerHTML = bodyHtml;

    var rbmUser = null;
    try { rbmUser = JSON.parse(localStorage.getItem('rbm_user') || '{}'); } catch (e) {}
    var namaEl = document.getElementById('rekap_dibuat_nama');
    var jabatanEl = document.getElementById('rekap_dibuat_jabatan');
    var displayName = (rbmUser && (rbmUser.nama || rbmUser.name || rbmUser.username)) ? (rbmUser.nama || rbmUser.name || rbmUser.username) : '-';
    var displayJabatan = (rbmUser && (rbmUser.jabatan || rbmUser.role)) ? (rbmUser.jabatan || (rbmUser.role ? rbmUser.role.charAt(0).toUpperCase() + rbmUser.role.slice(1) : '')) : '-';
    if (namaEl) namaEl.textContent = displayName;
    if (jabatanEl) jabatanEl.textContent = displayJabatan;
}

function generateKodeSetupAbsensi() {
    var outletId = typeof getRbmOutlet === 'function' ? getRbmOutlet() : (document.getElementById('rbm-outlet-select') && document.getElementById('rbm-outlet-select').value) || '';
    if (!outletId) {
        alert('Pilih outlet terlebih dahulu.');
        return;
    }
    var names = JSON.parse(localStorage.getItem('rbm_outlet_names') || '{}');
    var outletName = names[outletId] || (outletId.charAt(0).toUpperCase() + outletId.slice(1));
    var employees = [];
    try {
        var key = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_EMPLOYEES') : 'RBM_EMPLOYEES_' + outletId;
        employees = JSON.parse(RBMStorage.getItem(key) || '[]');
    } catch (e) {}
    var payload = { outletId: outletId, outletName: outletName, employees: employees };
    var kode = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(kode).then(function() {
            alert('Kode Setup telah disalin ke clipboard. Berikan ke karyawan untuk paste di halaman Absensi GPS saat diminta.');
        }).catch(function() {
            prompt('Salin kode berikut dan kirim ke karyawan:', kode);
        });
    } else {
        prompt('Salin kode berikut dan kirim ke karyawan:', kode);
    }
}

function printRekapAbsensiArea() {
    const printContent = document.getElementById('printable-rekap-area').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
}

function resizeInput(el) {
    // Minimal 50px (cukup untuk 3 digit), estimasi 8px per karakter + buffer
    el.style.width = Math.max(50, (el.value.length * 8) + 20) + 'px';
}

// ================= REKAP GAJI LOGIC =================
function renderRekapGaji() {
    const tglAwalEl = document.getElementById("absensi_tgl_awal");
    const tglAkhirEl = document.getElementById("absensi_tgl_akhir");
    const tglAwal = tglAwalEl ? tglAwalEl.value : '';
    const tglAkhir = tglAkhirEl ? tglAkhirEl.value : '';
    
    if (!tglAwal || !tglAkhir) { alert("Pilih tanggal terlebih dahulu"); return; }

    // Update Header Text
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const d1 = new Date(tglAwal).toLocaleDateString('id-ID', options);
    const d2 = new Date(tglAkhir).toLocaleDateString('id-ID', options);
    document.getElementById("gaji_periode_text").innerText = `Absensi Periode ${d1} s/d ${d2}`;
    document.getElementById("gaji_sign_date").innerText = `Sidoarjo, ${new Date().toLocaleDateString('id-ID', options)}`;

    var rbmUser = null;
    try { rbmUser = JSON.parse(localStorage.getItem('rbm_user') || '{}'); } catch (e) {}
    var gajiNamaEl = document.getElementById('gaji_dibuat_nama');
    var gajiJabatanEl = document.getElementById('gaji_dibuat_jabatan');
    var displayName = (rbmUser && (rbmUser.nama || rbmUser.name || rbmUser.username)) ? (rbmUser.nama || rbmUser.name || rbmUser.username) : '-';
    var displayJabatan = (rbmUser && (rbmUser.jabatan || rbmUser.role)) ? (rbmUser.jabatan || (rbmUser.role ? rbmUser.role.charAt(0).toUpperCase() + rbmUser.role.slice(1) : '')) : '-';
    if (gajiNamaEl) gajiNamaEl.textContent = displayName;
    if (gajiJabatanEl) gajiJabatanEl.textContent = displayJabatan;

    const tbody = document.getElementById("gaji_tbody");
    const thead = document.getElementById("gaji_thead");
    const tfoot = document.getElementById("gaji_tfoot");
    
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    // Data Gaji Periodik (Hutang, Terlambat, dll) disimpan terpisah agar tidak hilang saat refresh
    const gajiPeriodKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    const gajiPeriodData = safeParse(RBMStorage.getItem(gajiPeriodKey), {});

    // Generate Dates for counting
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    const dates = [];
    while (curr <= end) { dates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }

    // Header (NO dan NAMA dibekukan saat scroll horizontal)
    thead.innerHTML = `
        <tr style="background:#1e40af; color:white;">
            <th rowspan="2" style="border:1px solid #ccc; padding:4px; position:sticky; left:0; z-index:11; background:#1e40af; min-width:40px;">NO</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px; position:sticky; left:40px; z-index:11; background:#1e40af; min-width:120px;">NAMA</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">JABATAN</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">BANK</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">NO REK</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">HK<br>TARGET</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">HK<br>AKTUAL</th>
            <th colspan="8" style="border:1px solid #ccc; padding:4px;">ABSENSI</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">GAJI POKOK</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">GAJI/HARI</th>
            <th colspan="2" style="border:1px solid #ccc; padding:4px;">POTONGAN KEHADIRAN</th>
            <th colspan="3" style="border:1px solid #ccc; padding:4px;">KETERLAMBATAN</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">HUTANG</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">UANG MAKAN</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">TUNJANGAN</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">GRAND TOTAL</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">PEMBAYARAN</th>
            <th rowspan="2" style="border:1px solid #ccc; padding:4px;">AKSI</th>
        </tr>
        <tr style="background:#3b82f6; color:white; font-size:9px;">
            <th>A</th><th>I</th><th>S</th><th>OFF</th><th>DP</th><th>PH</th><th>AL</th><th>JML</th>
            <th>HARI</th><th>Rp</th>
            <th>JAM</th><th>RATE/JAM</th><th>TOTAL</th>
        </tr>
    `;

    let totalGrand = 0;
    let html = '';

    employees.forEach((emp, idx) => {
        // 1. Hitung Absensi
        let counts = { H:0, A:0, I:0, S:0, OFF:0, DP:0, PH:0, AL:0 };
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = absensiData[key];
            
            let countKey = status;
            if (status === 'O') countKey = 'OFF';

            if (status && counts.hasOwnProperty(countKey)) {
                counts[countKey]++;
            }
        });

        // 2. Ambil Data Tersimpan / Default
        const pData = gajiPeriodData[emp.id || idx] || {};
        let jamTerlambat = pData.jamTerlambat !== undefined ? parseFloat(pData.jamTerlambat) : 0;
        const totalMenitTelatGps = getTotalMenitTelatFromGps(emp.id || idx, emp.name, tglAwal, tglAkhir);
        if (totalMenitTelatGps > 0) {
            jamTerlambat = Math.round((totalMenitTelatGps / MENIT_TELAT_PER_JAM_GAJI) * 10) / 10;
            if (!gajiPeriodData[emp.id || idx]) gajiPeriodData[emp.id || idx] = {};
            gajiPeriodData[emp.id || idx].jamTerlambat = jamTerlambat;
            RBMStorage.setItem(gajiPeriodKey, JSON.stringify(gajiPeriodData));
        }
        
        // Static Data (Save to Employee Object)
        const bank = emp.bank || '';
        const noRek = emp.noRek || '';
        const gajiPokok = parseInt(emp.gajiPokok) || 0;
        
        // Period Data (Save to Period Object)
        const hkTarget = pData.hkTarget !== undefined ? parseInt(pData.hkTarget) : 26;
        const potHari = pData.potHari !== undefined ? parseFloat(pData.potHari) : 0; // Default 0
        const hutang = pData.hutang !== undefined ? parseInt(pData.hutang) : 0;
        const tunjangan = pData.tunjangan !== undefined ? parseInt(pData.tunjangan) : 0;
        const metodeBayar = pData.metodeBayar || 'TF';

        // 3. Rumus Perhitungan
        const gajiPerHari = Math.round(gajiPokok / 30); // Rumus: GP / 30
        const potTerlambatPerJam = Math.round(gajiPokok / 240); // Rumus: GP / 240
        const uangMakan = counts.H * 10000; // Rumus: HK Aktual * 10.000
        
        const totalPotKehadiran = Math.round(potHari * gajiPerHari);
        const totalPotTerlambat = Math.round(jamTerlambat * potTerlambatPerJam);
        
        const grandTotal = gajiPokok - totalPotKehadiran - totalPotTerlambat - hutang + uangMakan + tunjangan;
        totalGrand += grandTotal;

        // Hitung lebar awal berdasarkan isi data
        const wBank = Math.max(60, (bank.length * 8) + 15);
        const wRek = Math.max(80, (noRek.length * 8) + 15);
        const wHK = Math.max(50, (String(hkTarget).length * 8) + 20);
        const wGP = Math.max(90, (String(gajiPokok).length * 8) + 15);
        const wPot = Math.max(50, (String(potHari).length * 8) + 20);
        const wJam = Math.max(50, (String(jamTerlambat).length * 8) + 20);
        const wHutang = Math.max(80, (String(hutang).length * 8) + 15);
        const wTunj = Math.max(80, (String(tunjangan).length * 8) + 15);

        // 4. Render Row (NO dan NAMA sticky) - simpan hanya saat klik Simpan Perubahan
        html += `<tr data-emp-index="${idx}" data-emp-id="${emp.id||idx}">
            <td style="text-align:center; position:sticky; left:0; background:white; z-index:5; border:1px solid #ccc;">${idx + 1}</td>
            <td style="position:sticky; left:40px; background:white; z-index:5; border:1px solid #ccc;">${emp.name}</td>
            <td>${emp.jabatan}</td>
            <td><input type="text" data-field="bank" value="${bank}" oninput="resizeInput(this)" style="width:${wBank}px; border:none; font-size:10px; padding:5px;"></td>
            <td><input type="text" data-field="noRek" value="${noRek}" oninput="resizeInput(this)" style="width:${wRek}px; border:none; font-size:10px; padding:5px;"></td>
            <td><input type="number" data-field="hkTarget" value="${hkTarget}" oninput="resizeInput(this)" style="width:${wHK}px; text-align:center; padding:5px;"></td>
            <td style="text-align:center; font-weight:bold;">${counts.H}</td>
            
            <!-- Absensi Counts -->
            <td style="text-align:center; font-size:9px;">${counts.A||'-'}</td>
            <td style="text-align:center; font-size:9px;">${counts.I||'-'}</td>
            <td style="text-align:center; font-size:9px;">${counts.S||'-'}</td>
            <td style="text-align:center; font-size:9px;">${counts.OFF||'-'}</td>
            <td style="text-align:center; font-size:9px;">${counts.DP||'-'}</td>
            <td style="text-align:center; font-size:9px;">${counts.PH||'-'}</td>
            <td style="text-align:center; font-size:9px;">${counts.AL||'-'}</td>
            <td style="text-align:center; font-size:9px;">${dates.length}</td>

            <!-- Financials -->
            <td><input type="text" data-field="gajiPokok" value="${formatRupiah(gajiPokok)}" oninput="resizeInput(this)" style="width:${wGP}px; text-align:right; padding:5px;"></td>
            <td style="text-align:right;">${formatRupiah(gajiPerHari)}</td>
            
            <!-- Potongan Kehadiran -->
            <td><input type="number" data-field="potHari" value="${potHari}" oninput="resizeInput(this)" style="width:${wPot}px; text-align:center; padding:5px;" placeholder="0"></td>
            <td style="text-align:right;">${formatRupiah(totalPotKehadiran)}</td>

            <!-- Keterlambatan -->
            <td><input type="number" data-field="jamTerlambat" value="${jamTerlambat}" oninput="resizeInput(this)" style="width:${wJam}px; text-align:center; padding:5px;" placeholder="0"></td>
            <td style="text-align:right; font-size:9px;">${formatRupiah(potTerlambatPerJam)}</td>
            <td style="text-align:right;">${formatRupiah(totalPotTerlambat)}</td>

            <!-- Lainnya -->
            <td><input type="text" data-field="hutang" value="${formatRupiah(hutang)}" oninput="resizeInput(this)" style="width:${wHutang}px; text-align:right; padding:5px;" placeholder="Rp 0"></td>
            <td style="text-align:right;">${formatRupiah(uangMakan)}</td>
            <td><input type="text" data-field="tunjangan" value="${formatRupiah(tunjangan)}" oninput="resizeInput(this)" style="width:${wTunj}px; text-align:right; padding:5px;" placeholder="Rp 0"></td>
            
            <td style="text-align:right; font-weight:bold; background:#e0f2fe;">${formatRupiah(grandTotal)}</td>
            <td>
                <select data-field="metodeBayar" style="width:50px; font-size:10px; padding:0;">
                    <option value="TF" ${metodeBayar==='TF'?'selected':''}>TF</option>
                    <option value="CASH" ${metodeBayar==='CASH'?'selected':''}>CASH</option>
                </select>
            </td>
            <td>
                <button class="btn-small-danger" style="background:#0d6efd; border:none; padding: 5px 8px;" onclick="generateAndShowSlip(${idx})">Slip</button>
                <button class="btn-small-danger" style="background:#198754; border:none; padding: 5px 8px; margin-left:4px;" onclick="sendSlipEmail(${idx})">Email</button>
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
    tfoot.innerHTML = `<tr><td colspan="28" style="text-align:right; font-weight:bold; padding:10px;">TOTAL PENGELUARAN GAJI: ${formatRupiah(totalGrand)}</td><td></td></tr>`;
}

function saveRekapGajiData() {
    var tglAwalEl = document.getElementById('absensi_tgl_awal');
    var tglAkhirEl = document.getElementById('absensi_tgl_akhir');
    var tglAwal = tglAwalEl ? tglAwalEl.value : '';
    var tglAkhir = tglAkhirEl ? tglAkhirEl.value : '';
    if (!tglAwal || !tglAkhir) {
        alert('Pilih periode tanggal terlebih dahulu.');
        return;
    }
    var parseRp = function(str) { return parseInt(String(str || '0').replace(/[^0-9]/g, ''), 10) || 0; };
    var employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    var gajiKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    var gajiData = safeParse(RBMStorage.getItem(gajiKey), {});
    var tbody = document.getElementById('gaji_tbody');
    if (!tbody || !tbody.rows) {
        alert('Tabel rekap gaji tidak ditemukan.');
        return;
    }
    for (var r = 0; r < tbody.rows.length; r++) {
        var tr = tbody.rows[r];
        var empIdx = parseInt(tr.getAttribute('data-emp-index'), 10);
        var empId = parseInt(tr.getAttribute('data-emp-id'), 10);
        if (isNaN(empIdx) || !employees[empIdx]) continue;
        var inpBank = tr.querySelector('input[data-field="bank"]');
        var inpNoRek = tr.querySelector('input[data-field="noRek"]');
        var inpGajiPokok = tr.querySelector('input[data-field="gajiPokok"]');
        var inpHkTarget = tr.querySelector('input[data-field="hkTarget"]');
        var inpPotHari = tr.querySelector('input[data-field="potHari"]');
        var inpJamTerlambat = tr.querySelector('input[data-field="jamTerlambat"]');
        var inpHutang = tr.querySelector('input[data-field="hutang"]');
        var inpTunjangan = tr.querySelector('input[data-field="tunjangan"]');
        var selMetode = tr.querySelector('select[data-field="metodeBayar"]');
        if (inpBank) employees[empIdx].bank = inpBank.value || '';
        if (inpNoRek) employees[empIdx].noRek = inpNoRek.value || '';
        if (inpGajiPokok) employees[empIdx].gajiPokok = parseRp(inpGajiPokok.value);
        if (!gajiData[empId]) gajiData[empId] = {};
        if (inpHkTarget) gajiData[empId].hkTarget = parseInt(inpHkTarget.value, 10) || 0;
        if (inpPotHari) gajiData[empId].potHari = parseFloat(inpPotHari.value) || 0;
        if (inpJamTerlambat) gajiData[empId].jamTerlambat = parseFloat(inpJamTerlambat.value) || 0;
        if (inpHutang) gajiData[empId].hutang = parseRp(inpHutang.value);
        if (inpTunjangan) gajiData[empId].tunjangan = parseRp(inpTunjangan.value);
        if (selMetode) gajiData[empId].metodeBayar = selMetode.value || 'TF';
    }
    RBMStorage.setItem(getRbmStorageKey('RBM_EMPLOYEES'), JSON.stringify(employees));
    RBMStorage.setItem(gajiKey, JSON.stringify(gajiData));
    alert('Data Rekap Gaji tersimpan.');
}

function updateEmpGaji(idx, field, val) {
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    if (employees[idx]) {
        if (field === 'gajiPokok') {
            employees[idx][field] = parseInt(String(val).replace(/[^0-9]/g, '')) || 0;
        } else {
            employees[idx][field] = val;
        }
        RBMStorage.setItem(getRbmStorageKey('RBM_EMPLOYEES'), JSON.stringify(employees));
        renderRekapGaji(); // Recalculate
    }
}

function updatePeriodGaji(start, end, empId, field, val) {
    const key = getRbmStorageKey('RBM_GAJI_' + start + '_' + end);
    const data = safeParse(RBMStorage.getItem(key), {});
    if (!data[empId]) data[empId] = {};
    if (['hutang', 'tunjangan'].includes(field)) {
        data[empId][field] = parseInt(String(val).replace(/[^0-9]/g, '')) || 0;
    } else {
        data[empId][field] = val;
    }
    RBMStorage.setItem(key, JSON.stringify(data));
    renderRekapGaji(); // Recalculate
}

function printRekapGaji() {
    const printContent = document.getElementById('printable-gaji-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
}

let currentSlipIdx = -1;

function generateAndShowSlip(idx) {
    currentSlipIdx = idx;
    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    
    if (!tglAwal || !tglAkhir) { alert("Tanggal pada halaman rekap gaji belum diatur."); return; }

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const emp = employees[idx];
    if (!emp) { alert("Karyawan tidak ditemukan."); return; }

    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    const gajiPeriodKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    const gajiPeriodData = safeParse(RBMStorage.getItem(gajiPeriodKey), {});

    // --- Start of calculation logic (copied & adapted from renderRekapGaji) ---
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    const dates = [];
    while (curr <= end) { dates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }

    let counts = { H:0, A:0, I:0, S:0, OFF:0, DP:0, PH:0, AL:0 };
    dates.forEach(d => {
        const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
        const status = absensiData[key];
        if (status && (counts.hasOwnProperty(status) || status === 'H')) {
            if(counts.hasOwnProperty(status)) counts[status]++;
            else if(status === 'H') counts.H++;
        }
    });

    const pData = gajiPeriodData[emp.id || idx] || {};
    const gajiPokok = parseInt(emp.gajiPokok) || 0;
    const potHari = pData.potHari !== undefined ? parseFloat(pData.potHari) : 0;
    const jamTerlambat = pData.jamTerlambat !== undefined ? parseFloat(pData.jamTerlambat) : 0;
    const hutang = pData.hutang !== undefined ? parseInt(pData.hutang) : 0;
    const tunjangan = pData.tunjangan !== undefined ? parseInt(pData.tunjangan) : 0;

    const gajiPerHari = Math.round(gajiPokok / 30);
    const potTerlambatPerJam = Math.round(gajiPokok / 240);
    const uangMakan = counts.H * 10000;
    
    const totalPotKehadiran = Math.round(potHari * gajiPerHari);
    const totalPotTerlambat = Math.round(jamTerlambat * potTerlambatPerJam);
    
    const totalPendapatan = gajiPokok + tunjangan + uangMakan; // Lembur is not implemented yet
    const grandTotal = totalPendapatan - totalPotKehadiran - totalPotTerlambat - hutang;
    // --- End of calculation logic ---

    // Populate the slip
    const options = { month: 'long', year: 'numeric' };
    const periodeText = new Date(tglAwal).toLocaleDateString('id-ID', options).toUpperCase();
    document.getElementById('slip_periode_text').innerText = `BULAN ${periodeText}`;

    document.getElementById('slip_nama').innerText = emp.name || '-';
    document.getElementById('slip_jabatan').innerText = emp.jabatan || '-';

    document.getElementById('slip_gaji_pokok').innerText = formatRupiah(gajiPokok);
    document.getElementById('slip_tunjangan').innerText = formatRupiah(tunjangan);
    document.getElementById('slip_uang_makan').innerText = formatRupiah(uangMakan);
    document.getElementById('slip_total_pendapatan').innerText = formatRupiah(totalPendapatan);

    document.getElementById('slip_pot_absensi').innerText = formatRupiah(totalPotKehadiran);
    document.getElementById('slip_pot_terlambat').innerText = formatRupiah(totalPotTerlambat);
    document.getElementById('slip_hutang').innerText = formatRupiah(hutang);
    document.getElementById('slip_grand_total').innerText = formatRupiah(grandTotal);

    showView('slip-gaji-view');
}

function printSlipGaji() {
    window.print();
}

function sendCurrentSlipEmail() {
    if (currentSlipIdx === -1) return;
    sendSlipEmail(currentSlipIdx);
}

function sendSlipEmail(idx) {
    if (!confirm("Kirim slip gaji via email ke karyawan ini?")) return;

    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const emp = employees[idx];
    
    if (!emp || !emp.email) {
        alert("Email karyawan belum diisi. Silakan isi di tab Absensi.");
        return;
    }

    // Re-calculate for Email Body
    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    const gajiPeriodKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    const gajiPeriodData = safeParse(RBMStorage.getItem(gajiPeriodKey), {});
    let counts = { H:0 };
    let curr = new Date(tglAwal); const end = new Date(tglAkhir);
    while (curr <= end) {
        const key = `${curr.toISOString().split('T')[0]}_${emp.id || idx}`;
        if (absensiData[key] === 'H') counts.H++;
        curr.setDate(curr.getDate() + 1);
    }
    const pData = gajiPeriodData[emp.id || idx] || {};
    const gajiPokok = parseInt(emp.gajiPokok) || 0;
    const potHari = parseFloat(pData.potHari) || 0;
    const jamTerlambat = parseFloat(pData.jamTerlambat) || 0;
    const hutang = parseInt(pData.hutang) || 0;
    const tunjangan = parseInt(pData.tunjangan) || 0;
    const gajiPerHari = Math.round(gajiPokok / 30);
    const potTerlambatPerJam = Math.round(gajiPokok / 240);
    const uangMakan = counts.H * 10000;
    const totalPotKehadiran = Math.round(potHari * gajiPerHari);
    const totalPotTerlambat = Math.round(jamTerlambat * potTerlambatPerJam);
    const totalPendapatan = gajiPokok + tunjangan + uangMakan;
    const grandTotal = totalPendapatan - totalPotKehadiran - totalPotTerlambat - hutang;

    const htmlBody = `
        <div style="font-family: Courier New, monospace; padding: 20px; border: 1px solid #ccc; max-width: 600px;">
            <h3 style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px;">SLIP GAJI - RICE BOWL MONSTERS</h3>
            <p>Periode: ${new Date(tglAwal).toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</p>
            <table style="width:100%; margin-bottom:20px;"><tr><td>Nama</td><td>: ${emp.name}</td></tr><tr><td>Jabatan</td><td>: ${emp.jabatan}</td></tr></table>
            <table style="width:100%; border-collapse:collapse;">
                <tr><td colspan="3" style="font-weight:bold; padding-top:10px;">PENDAPATAN</td></tr>
                <tr><td>Gaji Pokok</td><td>:</td><td style="text-align:right;">${formatRupiah(gajiPokok)}</td></tr>
                <tr><td>Tunjangan</td><td>:</td><td style="text-align:right;">${formatRupiah(tunjangan)}</td></tr>
                <tr><td>Uang Makan</td><td>:</td><td style="text-align:right;">${formatRupiah(uangMakan)}</td></tr>
                <tr><td style="font-weight:bold;">Total Pendapatan</td><td>:</td><td style="text-align:right; font-weight:bold;">${formatRupiah(totalPendapatan)}</td></tr>
                <tr><td colspan="3" style="font-weight:bold; padding-top:10px;">POTONGAN</td></tr>
                <tr><td>Absensi</td><td>:</td><td style="text-align:right;">${formatRupiah(totalPotKehadiran)}</td></tr>
                <tr><td>Terlambat</td><td>:</td><td style="text-align:right;">${formatRupiah(totalPotTerlambat)}</td></tr>
                <tr><td>Hutang</td><td>:</td><td style="text-align:right;">${formatRupiah(hutang)}</td></tr>
                <tr><td colspan="3" style="border-top:2px solid black; padding-top:10px; font-weight:bold;">GRAND TOTAL: ${formatRupiah(grandTotal)}</td></tr>
            </table>
        </div>`;

    if (isGoogleScript()) {
        google.script.run.withSuccessHandler(() => alert("Email terkirim ke " + emp.email)).withFailureHandler((e) => alert("Gagal: " + e)).sendEmailSlip(emp.email, `Slip Gaji ${emp.name}`, htmlBody);
    } else {
        console.log(htmlBody);
        alert("Fitur email memerlukan backend Google Apps Script. Cek console untuk preview HTML.");
    }
}

function exportCompleteAbsensiExcel() {
    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    
    if (!tglAwal || !tglAkhir) {
        alert("Harap pilih Tanggal Mulai dan Selesai di tab Absensi terlebih dahulu.");
        return;
    }

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
    const gajiKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    const gajiData = safeParse(RBMStorage.getItem(gajiKey), {});

    // Generate Dates
    const dates = [];
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    const esc = (str) => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    };

    const formatMoney = (n) => {
        if (isNaN(n) || n === null) return 'Rp 0';
        return 'Rp ' + (n || 0).toLocaleString('id-ID');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">\n';
    
    // Styles
    xml += '<Styles>\n';
    xml += ' <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders/><Font ss:FontName="Calibri" ss:Size="11"/><Interior/><NumberFormat/><Protection/></Style>\n';
    xml += ' <Style ss:ID="sTitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="18" ss:Bold="1" ss:Color="#1e40af"/></Style>\n';
    xml += ' <Style ss:ID="sSubtitle"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="12" ss:Color="#64748b"/></Style>\n';
    xml += ' <Style ss:ID="sHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e3a8a" ss:Pattern="Solid"/></Style>\n';
    xml += ' <Style ss:ID="sHeaderBlue"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#2563eb" ss:Pattern="Solid"/></Style>\n';
    xml += ' <Style ss:ID="sHeaderGreen"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#16a34a" ss:Pattern="Solid"/></Style>\n';
    xml += ' <Style ss:ID="sDateHeader"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1" ss:Color="#333333"/><Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/></Style>\n';
    xml += ' <Style ss:ID="sData"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
    xml += ' <Style ss:ID="sCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>\n';
    xml += ' <Style ss:ID="sNum"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><NumberFormat ss:Format="#,##0"/></Style>\n';
    xml += ' <Style ss:ID="sNumCurrency"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><NumberFormat ss:Format="&quot;Rp&quot;\\ #,##0"/></Style>\n';
    xml += ' <Style ss:ID="sTotalLabel"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/><Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/></Style>\n';
    xml += ' <Style ss:ID="sTotalNum"><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/></Borders><Font ss:Bold="1"/><Interior ss:Color="#e2e8f0" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;Rp&quot;\\ #,##0"/></Style>\n';
    xml += '</Styles>\n';

    const absensiRekapHeaders = ['H','R','O','S','I','A','DP','PH','AL'];
    const jadwalRekapHeaders = ['P','M','S','Off','PH','AL','DP'];

    // --- SHEET 1: ABSENSI ---
    xml += `<Worksheet ss:Name="Absensi">\n<Table>\n`;
    xml += '<Column ss:Width="30"/>\n<Column ss:Width="150"/>\n<Column ss:Width="100"/>\n<Column ss:Width="80"/>\n'; // No, Nama, Jabatan, Join
    xml += '<Column ss:Width="40"/>\n<Column ss:Width="40"/>\n<Column ss:Width="40"/>\n'; // Cuti
    dates.forEach(() => xml += '<Column ss:Width="35"/>\n');
    absensiRekapHeaders.forEach(() => xml += '<Column ss:Width="35"/>\n');
    
    xml += `<Row ss:Height="25"><Cell ss:StyleID="sTitle" ss:MergeAcross="${6 + dates.length + absensiRekapHeaders.length}"><Data ss:Type="String">LAPORAN ABSENSI HARIAN</Data></Cell></Row>\n`;
    xml += `<Row ss:Height="20"><Cell ss:StyleID="sSubtitle" ss:MergeAcross="${6 + dates.length + absensiRekapHeaders.length}"><Data ss:Type="String">Periode: ${tglAwal} s/d ${tglAkhir}</Data></Cell></Row>\n`;
    xml += '<Row ss:Height="10"></Row>\n';

    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">No</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Nama</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Jabatan</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Join Date</Data></Cell>\n';
    xml += `<Cell ss:StyleID="sHeaderBlue" ss:MergeAcross="2"><Data ss:Type="String">Sisa Cuti</Data></Cell>\n`;
    xml += `<Cell ss:StyleID="sHeaderGreen" ss:MergeAcross="${dates.length - 1}"><Data ss:Type="String">Tanggal</Data></Cell>\n`;
    xml += `<Cell ss:StyleID="sHeaderBlue" ss:MergeAcross="${absensiRekapHeaders.length - 1}"><Data ss:Type="String">Rekap Absensi</Data></Cell>\n`;
    xml += '</Row>\n';
    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeaderBlue" ss:Index="5"><Data ss:Type="String">AL</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">DP</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">PH</Data></Cell>\n';
    dates.forEach(d => { xml += `<Cell ss:StyleID="sDateHeader"><Data ss:Type="String">${d.getDate()}</Data></Cell>\n`; });
    absensiRekapHeaders.forEach(h => { xml += `<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">${h}</Data></Cell>\n`; });
    xml += '</Row>\n';
    
    employees.forEach((emp, idx) => {
        let counts = {};
        absensiRekapHeaders.forEach(h => counts[h] = 0);
        xml += '<Row>\n';
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>\n<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.name)}</Data></Cell>\n<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.jabatan)}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="String">${esc(emp.joinDate)}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${emp.sisaAL || 0}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${emp.sisaDP || 0}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${emp.sisaPH || 0}</Data></Cell>\n`;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = absensiData[key] || '';
            if (status && counts.hasOwnProperty(status)) counts[status]++;
            xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="String">${esc(status)}</Data></Cell>\n`;
        });
        absensiRekapHeaders.forEach(h => { xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${counts[h]}</Data></Cell>\n`; });
        xml += '</Row>\n';
    });
    xml += '</Table>\n</Worksheet>\n';

    // --- SHEET 2: JADWAL ---
    xml += `<Worksheet ss:Name="Jadwal">\n<Table>\n`;
    xml += '<Column ss:Width="30"/>\n<Column ss:Width="150"/>\n<Column ss:Width="100"/>\n<Column ss:Width="80"/>\n';
    xml += '<Column ss:Width="40"/>\n<Column ss:Width="40"/>\n<Column ss:Width="40"/>\n';
    dates.forEach(() => xml += '<Column ss:Width="35"/>\n');
    jadwalRekapHeaders.forEach(() => xml += '<Column ss:Width="35"/>\n');

    xml += `<Row ss:Height="25"><Cell ss:StyleID="sTitle" ss:MergeAcross="${6 + dates.length + jadwalRekapHeaders.length}"><Data ss:Type="String">JADWAL KERJA</Data></Cell></Row>\n`;
    xml += `<Row ss:Height="20"><Cell ss:StyleID="sSubtitle" ss:MergeAcross="${6 + dates.length + jadwalRekapHeaders.length}"><Data ss:Type="String">Periode: ${tglAwal} s/d ${tglAkhir}</Data></Cell></Row>\n`;
    xml += '<Row ss:Height="10"></Row>\n';

    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">No</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Nama</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Jabatan</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Join Date</Data></Cell>\n';
    xml += `<Cell ss:StyleID="sHeaderBlue" ss:MergeAcross="2"><Data ss:Type="String">Sisa Cuti</Data></Cell>\n`;
    xml += `<Cell ss:StyleID="sHeaderGreen" ss:MergeAcross="${dates.length - 1}"><Data ss:Type="String">Tanggal</Data></Cell>\n`;
    xml += `<Cell ss:StyleID="sHeaderBlue" ss:MergeAcross="${jadwalRekapHeaders.length - 1}"><Data ss:Type="String">Rekap Jadwal</Data></Cell>\n`;
    xml += '</Row>\n';
    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeaderBlue" ss:Index="5"><Data ss:Type="String">AL</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">DP</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">PH</Data></Cell>\n';
    dates.forEach(d => { xml += `<Cell ss:StyleID="sDateHeader"><Data ss:Type="String">${d.getDate()}</Data></Cell>\n`; });
    jadwalRekapHeaders.forEach(h => { xml += `<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">${h}</Data></Cell>\n`; });
    xml += '</Row>\n';

    employees.forEach((emp, idx) => {
        let counts = {};
        jadwalRekapHeaders.forEach(h => counts[h] = 0);
        xml += '<Row>\n';
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>\n<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.name)}</Data></Cell>\n<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.jabatan)}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="String">${esc(emp.joinDate)}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${emp.sisaAL || 0}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${emp.sisaDP || 0}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${emp.sisaPH || 0}</Data></Cell>\n`;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = jadwalData[key] || '';
            if (status && counts.hasOwnProperty(status)) counts[status]++;
            xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="String">${esc(status)}</Data></Cell>\n`;
        });
        jadwalRekapHeaders.forEach(h => { xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${counts[h]}</Data></Cell>\n`; });
        xml += '</Row>\n';
    });
    xml += '</Table>\n</Worksheet>\n';

    // --- SHEET 3: LAPORAN ABSEN ---
    const rekapAbsenHeaders = ['A', 'I', 'S', 'OFF', 'DP', 'PH', 'AL', 'JML'];
    xml += `<Worksheet ss:Name="Laporan Absen">\n<Table>\n`;
    xml += '<Column ss:Width="30"/>\n<Column ss:Width="80"/>\n<Column ss:Width="150"/>\n<Column ss:Width="100"/>\n'; // No, ID, Nama, Jabatan
    dates.forEach(() => xml += '<Column ss:Width="30"/>\n');
    xml += '<Column ss:Width="60"/>\n<Column ss:Width="60"/>\n'; // Total HK, Sisa Cuti
    rekapAbsenHeaders.forEach(() => xml += '<Column ss:Width="35"/>\n');

    xml += `<Row ss:Height="25"><Cell ss:StyleID="sTitle" ss:MergeAcross="${5 + dates.length + rekapAbsenHeaders.length}"><Data ss:Type="String">REKAPITULASI KEHADIRAN</Data></Cell></Row>\n`;
    xml += `<Row ss:Height="20"><Cell ss:StyleID="sSubtitle" ss:MergeAcross="${5 + dates.length + rekapAbsenHeaders.length}"><Data ss:Type="String">Periode: ${tglAwal} s/d ${tglAkhir}</Data></Cell></Row>\n`;
    xml += '<Row ss:Height="10"></Row>\n';

    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">No</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">ID</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Nama</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Jabatan</Data></Cell>\n';
    xml += `<Cell ss:StyleID="sHeaderGreen" ss:MergeAcross="${dates.length - 1}"><Data ss:Type="String">Periode</Data></Cell>\n`;
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Total HK</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">Sisa Cuti</Data></Cell>\n';
    xml += `<Cell ss:StyleID="sHeaderBlue" ss:MergeAcross="${rekapAbsenHeaders.length - 1}"><Data ss:Type="String">Absensi</Data></Cell>\n`;
    xml += '</Row>\n';
    xml += '<Row ss:Height="20">\n';
    dates.forEach((d, i) => { xml += `<Cell ss:StyleID="sDateHeader" ${i === 0 ? 'ss:Index="5"' : ''}><Data ss:Type="String">${d.getDate()}</Data></Cell>\n`; });
    rekapAbsenHeaders.forEach((h, i) => { xml += `<Cell ss:StyleID="sHeaderBlue" ${i === 0 ? `ss:Index="${7 + dates.length}"` : ''}><Data ss:Type="String">${h}</Data></Cell>\n`; });
    xml += '</Row>\n';

    employees.forEach((emp, idx) => {
        let counts = { H:0, A:0, I:0, S:0, OFF:0, DP:0, PH:0, AL:0 };
        xml += '<Row>\n';
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>\n<Cell ss:StyleID="sCenter"><Data ss:Type="String">${emp.id || '-'}</Data></Cell>\n<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.name)}</Data></Cell>\n<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.jabatan)}</Data></Cell>\n`;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = absensiData[key] || '';
            let countKey = status;
            if (status === 'O') countKey = 'OFF';
            if (status && counts.hasOwnProperty(countKey)) counts[countKey]++;
            xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="String">${esc(status)}</Data></Cell>\n`;
        });
        const totalSisaCuti = (emp.sisaAL || 0) + (emp.sisaDP || 0) + (emp.sisaPH || 0);
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${counts.H}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${totalSisaCuti}</Data></Cell>\n`;
        rekapAbsenHeaders.forEach(h => {
            if (h === 'JML') {
                xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${dates.length}</Data></Cell>\n`;
            } else {
                xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${counts[h]}</Data></Cell>\n`;
            }
        });
        xml += '</Row>\n';
    });
    xml += '</Table>\n</Worksheet>\n';

    // --- SHEET 4: REKAP GAJI ---
    xml += `<Worksheet ss:Name="Rekap Gaji">\n<Table>\n`;
    const gajiHeaders = ['NO', 'NAMA', 'JABATAN', 'BANK', 'NO REK', 'HK TARGET', 'HK AKTUAL', 'A', 'I', 'S', 'OFF', 'DP', 'PH', 'AL', 'JML', 'GAJI POKOK', 'GAJI/HARI', 'HARI', 'Rp', 'JAM', 'RATE/JAM', 'TOTAL', 'HUTANG', 'UANG MAKAN', 'TUNJANGAN', 'GRAND TOTAL', 'PEMBAYARAN'];
    gajiHeaders.forEach(h => xml += `<Column ss:Width="${h.length > 5 ? '100' : '60'}"/>\n`);

    xml += `<Row ss:Height="25"><Cell ss:StyleID="sTitle" ss:MergeAcross="${gajiHeaders.length - 1}"><Data ss:Type="String">REKAPITULASI GAJI KARYAWAN</Data></Cell></Row>\n`;
    xml += `<Row ss:Height="20"><Cell ss:StyleID="sSubtitle" ss:MergeAcross="${gajiHeaders.length - 1}"><Data ss:Type="String">Periode: ${tglAwal} s/d ${tglAkhir}</Data></Cell></Row>\n`;
    xml += '<Row ss:Height="10"></Row>\n';

    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">NO</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">NAMA</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">JABATAN</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">BANK</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">NO REK</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">HK TARGET</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">HK AKTUAL</Data></Cell>\n';
    xml += `<Cell ss:StyleID="sHeaderBlue" ss:MergeAcross="7"><Data ss:Type="String">ABSENSI</Data></Cell>\n`;
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">GAJI POKOK</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">GAJI/HARI</Data></Cell>\n';
    xml += `<Cell ss:StyleID="sHeaderGreen" ss:MergeAcross="1"><Data ss:Type="String">POT. KEHADIRAN</Data></Cell>\n`;
    xml += `<Cell ss:StyleID="sHeaderGreen" ss:MergeAcross="2"><Data ss:Type="String">KETERLAMBATAN</Data></Cell>\n`;
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">HUTANG</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">UANG MAKAN</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">TUNJANGAN</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">GRAND TOTAL</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeader" ss:MergeDown="1"><Data ss:Type="String">PEMBAYARAN</Data></Cell>\n';
    xml += '</Row>\n';
    xml += '<Row ss:Height="20">\n';
    xml += '<Cell ss:StyleID="sHeaderBlue" ss:Index="8"><Data ss:Type="String">A</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">I</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">S</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">OFF</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">DP</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">PH</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">AL</Data></Cell>\n<Cell ss:StyleID="sHeaderBlue"><Data ss:Type="String">JML</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeaderGreen" ss:Index="18"><Data ss:Type="String">HARI</Data></Cell>\n<Cell ss:StyleID="sHeaderGreen"><Data ss:Type="String">Rp</Data></Cell>\n';
    xml += '<Cell ss:StyleID="sHeaderGreen"><Data ss:Type="String">JAM</Data></Cell>\n<Cell ss:StyleID="sHeaderGreen"><Data ss:Type="String">RATE/JAM</Data></Cell>\n<Cell ss:StyleID="sHeaderGreen"><Data ss:Type="String">TOTAL</Data></Cell>\n';
    xml += '</Row>\n';

    let totalGrand = 0;
    employees.forEach((emp, idx) => {
        let counts = { H:0, A:0, I:0, S:0, OFF:0, DP:0, PH:0, AL:0 };
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = absensiData[key];
            let countKey = status;
            if (status === 'O') countKey = 'OFF';
            if (status && counts.hasOwnProperty(countKey)) counts[countKey]++;
        });

        const pData = gajiData[emp.id || idx] || {};
        const gajiPokok = parseInt(emp.gajiPokok) || 0;
        const hkTarget = pData.hkTarget !== undefined ? parseInt(pData.hkTarget) : 26;
        const potHari = pData.potHari !== undefined ? parseFloat(pData.potHari) : 0;
        const jamTerlambat = pData.jamTerlambat !== undefined ? parseFloat(pData.jamTerlambat) : 0;
        const hutang = parseInt(pData.hutang) || 0;
        const tunjangan = parseInt(pData.tunjangan) || 0;
        const metodeBayar = pData.metodeBayar || 'TF';

        const gajiPerHari = Math.round(gajiPokok / 30);
        const potTerlambatPerJam = Math.round(gajiPokok / 240);
        const uangMakan = counts.H * 10000;
        const totalPotKehadiran = Math.round(potHari * gajiPerHari);
        const totalPotTerlambat = Math.round(jamTerlambat * potTerlambatPerJam);
        const grandTotal = gajiPokok - totalPotKehadiran - totalPotTerlambat - hutang + uangMakan + tunjangan;
        totalGrand += grandTotal;

        xml += '<Row>\n';
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.name)}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.jabatan)}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.bank)}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sData"><Data ss:Type="String">${esc(emp.noRek)}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${hkTarget}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${counts.H}</Data></Cell>\n`;
        // Absensi
        ['A', 'I', 'S', 'OFF', 'DP', 'PH', 'AL'].forEach(h => { xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${counts[h]}</Data></Cell>\n`; });
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${dates.length}</Data></Cell>\n`;
        // Gaji
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${gajiPokok}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${gajiPerHari}</Data></Cell>\n`;
        // Potongan
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${potHari}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${totalPotKehadiran}</Data></Cell>\n`;
        // Terlambat
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="Number">${jamTerlambat}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${potTerlambatPerJam}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${totalPotTerlambat}</Data></Cell>\n`;
        // Lainnya
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${hutang}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${uangMakan}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${tunjangan}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sNumCurrency"><Data ss:Type="Number">${grandTotal}</Data></Cell>\n`;
        xml += `<Cell ss:StyleID="sCenter"><Data ss:Type="String">${esc(metodeBayar)}</Data></Cell>\n`;
        xml += '</Row>\n';
    });

    // Total Row
    xml += '<Row>\n';
    xml += `<Cell ss:StyleID="sTotalLabel" ss:MergeAcross="25"><Data ss:Type="String">TOTAL PENGELUARAN GAJI</Data></Cell>\n`;
    xml += `<Cell ss:StyleID="sTotalNum"><Data ss:Type="Number">${totalGrand}</Data></Cell>\n`;
    xml += '</Row>\n';

    xml += '</Table>\n</Worksheet>\n';

    xml += '</Workbook>';

    const blob = new Blob(['\ufeff', xml], { type: 'application/vnd.ms-excel' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Laporan_Lengkap_${tglAwal}_sd_${tglAkhir}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function exportCompleteAbsensiPDF() {
    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    
    if (!tglAwal || !tglAkhir) {
        alert("Harap pilih Tanggal Mulai dan Selesai di tab Absensi terlebih dahulu.");
        return;
    }

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
    const gajiKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    const gajiData = safeParse(RBMStorage.getItem(gajiKey), {});

    // Generate Dates
    const dates = [];
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    const formatMoney = (n) => {
        if (isNaN(n) || n === null) return 'Rp 0';
        return 'Rp ' + (n || 0).toLocaleString('id-ID');
    };

    var styleBlock = '<style>body{font-family:sans-serif;font-size:10px;}h2,h3{text-align:center;margin:5px 0;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:4px;text-align:center;}th{background-color:#1e40af;color:#fff;}.text-left{text-align:left;}.text-right{text-align:right;}</style>';

    // --- 1. ABSENSI (halaman sendiri) ---
    var htmlAbsensi = styleBlock + `<h2>LAPORAN ABSENSI HARIAN</h2><h3>Periode: ${tglAwal} s/d ${tglAkhir}</h3><table><thead><tr>
        <th rowspan="2">No</th><th rowspan="2">Nama</th><th rowspan="2">Jabatan</th>
        <th colspan="${dates.length}">Tanggal</th><th colspan="9">Rekap</th></tr><tr>`;
    dates.forEach(d => htmlAbsensi += `<th>${d.getDate()}</th>`);
    ['H','R','O','S','I','A','DP','PH','AL'].forEach(h => htmlAbsensi += `<th>${h}</th>`);
    htmlAbsensi += `</tr></thead><tbody>`;
    employees.forEach((emp, idx) => {
        let counts = {H:0,R:0,O:0,S:0,I:0,A:0,DP:0,PH:0,AL:0};
        htmlAbsensi += `<tr><td>${idx+1}</td><td class="text-left">${emp.name}</td><td class="text-left">${emp.jabatan}</td>`;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = absensiData[key] || '';
            let countKey = status === 'O' ? 'O' : status;
            if(counts.hasOwnProperty(countKey)) counts[countKey]++;
            htmlAbsensi += `<td>${status}</td>`;
        });
        ['H','R','O','S','I','A','DP','PH','AL'].forEach(h => htmlAbsensi += `<td>${counts[h]}</td>`);
        htmlAbsensi += `</tr>`;
    });
    htmlAbsensi += `</tbody></table>`;

    // --- 2. JADWAL (halaman sendiri) ---
    var htmlJadwal = styleBlock + `<h2>JADWAL KERJA</h2><h3>Periode: ${tglAwal} s/d ${tglAkhir}</h3><table><thead><tr>
        <th rowspan="2">No</th><th rowspan="2">Nama</th><th rowspan="2">Jabatan</th>
        <th colspan="${dates.length}">Tanggal</th><th colspan="7">Rekap</th></tr><tr>`;
    dates.forEach(d => htmlJadwal += `<th>${d.getDate()}</th>`);
    ['P','M','S','Off','PH','AL','DP'].forEach(h => htmlJadwal += `<th>${h}</th>`);
    htmlJadwal += `</tr></thead><tbody>`;
    employees.forEach((emp, idx) => {
        let counts = {P:0,M:0,S:0,Off:0,PH:0,AL:0,DP:0};
        htmlJadwal += `<tr><td>${idx+1}</td><td class="text-left">${emp.name}</td><td class="text-left">${emp.jabatan}</td>`;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = jadwalData[key] || '';
            if(counts.hasOwnProperty(status)) counts[status]++;
            htmlJadwal += `<td>${status}</td>`;
        });
        ['P','M','S','Off','PH','AL','DP'].forEach(h => htmlJadwal += `<td>${counts[h]}</td>`);
        htmlJadwal += `</tr>`;
    });
    htmlJadwal += `</tbody></table>`;

    // --- 3. LAPORAN ABSEN (halaman sendiri) ---
    var htmlLaporanAbsen = styleBlock + `<h2>REKAP ABSENSI / LAPORAN ABSEN</h2><h3>Periode: ${tglAwal} s/d ${tglAkhir}</h3><table><thead><tr>
        <th rowspan="2">No</th><th rowspan="2">ID</th><th rowspan="2">Nama</th><th rowspan="2">Jabatan</th>
        <th colspan="${dates.length}">Periode</th><th rowspan="2">Total HK</th><th rowspan="2">Sisa Cuti</th><th colspan="8">Absensi</th></tr><tr>`;
    dates.forEach(d => htmlLaporanAbsen += `<th>${d.getDate()}</th>`);
    ['A','I','S','OFF','DP','PH','AL','JML'].forEach(h => htmlLaporanAbsen += `<th>${h}</th>`);
    htmlLaporanAbsen += `</tr></thead><tbody>`;
    employees.forEach((emp, idx) => {
        let counts = { H:0, A:0, I:0, S:0, OFF:0, DP:0, PH:0, AL:0 };
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = absensiData[key] || '';
            let countKey = status === 'O' ? 'OFF' : status;
            if (status && counts.hasOwnProperty(countKey)) counts[countKey]++;
        });
        const totalSisaCuti = (parseInt(emp.sisaAL)||0) + (parseInt(emp.sisaDP)||0) + (parseInt(emp.sisaPH)||0);
        htmlLaporanAbsen += `<tr><td>${idx+1}</td><td>${emp.id || '-'}</td><td class="text-left">${emp.name}</td><td class="text-left">${emp.jabatan}</td>`;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            htmlLaporanAbsen += `<td>${absensiData[key] || ''}</td>`;
        });
        htmlLaporanAbsen += `<td>${counts.H}</td><td>${totalSisaCuti}</td><td>${counts.A}</td><td>${counts.I}</td><td>${counts.S}</td><td>${counts.OFF}</td><td>${counts.DP}</td><td>${counts.PH}</td><td>${counts.AL}</td><td>${dates.length}</td></tr>`;
    });
    htmlLaporanAbsen += `</tbody></table>`;

    // --- 4. REKAP GAJI (halaman sendiri) ---
    var totalGrand = 0;
    var rowsGaji = '';
    employees.forEach((emp, idx) => {
        let hkAktual = 0;
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            if(absensiData[key] === 'H') hkAktual++;
        });
        const pData = gajiData[emp.id || idx] || {};
        const gajiPokok = parseInt(emp.gajiPokok) || 0;
        const potHari = parseFloat(pData.potHari) || 0;
        const jamTerlambat = parseFloat(pData.jamTerlambat) || 0;
        const hutang = parseInt(pData.hutang) || 0;
        const tunjangan = parseInt(pData.tunjangan) || 0;
        const gajiPerHari = Math.round(gajiPokok / 30);
        const potTerlambatPerJam = Math.round(gajiPokok / 240);
        const uangMakan = hkAktual * 10000;
        const totalPotKehadiran = Math.round(potHari * gajiPerHari);
        const totalPotTerlambat = Math.round(jamTerlambat * potTerlambatPerJam);
        const grandTotal = gajiPokok - totalPotKehadiran - totalPotTerlambat - hutang + uangMakan + tunjangan;
        totalGrand += grandTotal;
        rowsGaji += `<tr><td>${idx+1}</td><td class="text-left">${emp.name}</td><td class="text-left">${emp.jabatan}</td><td>${hkAktual}</td><td class="text-right">${formatMoney(gajiPokok)}</td><td>${potHari}</td><td class="text-right">${formatMoney(totalPotKehadiran)}</td><td>${jamTerlambat}</td><td class="text-right">${formatMoney(potTerlambatPerJam)}</td><td class="text-right">${formatMoney(totalPotTerlambat)}</td><td class="text-right">${formatMoney(hutang)}</td><td class="text-right">${formatMoney(uangMakan)}</td><td class="text-right">${formatMoney(tunjangan)}</td><td class="text-right" style="font-weight:bold;">${formatMoney(grandTotal)}</td></tr>`;
    });
    var htmlGaji = styleBlock + `<h2>REKAPITULASI GAJI KARYAWAN</h2><h3>Periode: ${tglAwal} s/d ${tglAkhir}</h3><table><thead><tr>
        <th rowspan="2">No</th><th rowspan="2">Nama</th><th rowspan="2">Jabatan</th><th rowspan="2">HK</th><th rowspan="2">Gaji Pokok</th>
        <th colspan="2">Potongan</th><th colspan="3">Terlambat</th><th rowspan="2">Hutang</th><th rowspan="2">Makan</th><th rowspan="2">Tunjangan</th><th rowspan="2">Grand Total</th></tr><tr>
        <th>Hari</th><th>Rp</th><th>Jam</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rowsGaji}</tbody></table>`;
    htmlGaji += `<p style="text-align:right;font-weight:bold;margin-top:8px;">TOTAL: ${formatMoney(totalGrand)}</p>`;

    if (typeof window.jspdf !== 'undefined' && typeof html2canvas !== 'undefined') {
        var pageW, pageH, margin, usableW, usableH, pxToMm;
        function addSectionToPdf(doc, sectionHtml, addNewPageBefore) {
            return new Promise(function(resolve, reject) {
                var wrap = document.createElement('div');
                wrap.style.cssText = 'position:absolute;left:0;top:-99999px;width:1100px;min-height:200px;padding:16px;font-family:sans-serif;font-size:10px;background:#fff;color:#333;box-sizing:border-box;';
                wrap.innerHTML = sectionHtml;
                document.body.appendChild(wrap);
                html2canvas(wrap, { scale: 1, backgroundColor: '#ffffff' }).then(function(canvas) {
                    document.body.removeChild(wrap);
                    if (addNewPageBefore) doc.addPage('l');
                    pageW = doc.internal.pageSize.getWidth();
                    pageH = doc.internal.pageSize.getHeight();
                    margin = 8;
                    usableW = pageW - margin * 2;
                    usableH = pageH - margin * 2;
                    pxToMm = 25.4 / 96;
                    var imgWmm = canvas.width * pxToMm;
                    var imgHmm = canvas.height * pxToMm;
                    var scale = Math.min(usableW / imgWmm, usableH / imgHmm, 1);
                    var drawW = imgWmm * scale;
                    var drawH = imgHmm * scale;
                    if (drawH <= usableH && drawW <= usableW) {
                        doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, drawW, drawH);
                    } else {
                        var totalH = drawH;
                        var drawn = 0;
                        while (drawn < totalH) {
                            var pageImgH = Math.min(usableH, totalH - drawn);
                            var srcY = (drawn / totalH) * canvas.height;
                            var srcH = (pageImgH / totalH) * canvas.height;
                            var small = document.createElement('canvas');
                            small.width = canvas.width;
                            small.height = Math.ceil(srcH);
                            small.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, small.width, small.height);
                            doc.addImage(small.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, drawW, pageImgH);
                            drawn += pageImgH;
                            if (drawn < totalH) doc.addPage('l');
                        }
                    }
                    resolve();
                }).catch(function(e) {
                    if (wrap.parentNode) document.body.removeChild(wrap);
                    reject(e);
                });
            });
        }

        var doc = new window.jspdf.jsPDF('l', 'mm', 'a4');
        pageW = doc.internal.pageSize.getWidth();
        pageH = doc.internal.pageSize.getHeight();
        margin = 8;
        usableW = pageW - margin * 2;
        usableH = pageH - margin * 2;
        pxToMm = 25.4 / 96;

        addSectionToPdf(doc, htmlAbsensi, false)
            .then(function() { return addSectionToPdf(doc, htmlJadwal, true); })
            .then(function() { return addSectionToPdf(doc, htmlLaporanAbsen, true); })
            .then(function() { return addSectionToPdf(doc, htmlGaji, true); })
            .then(function() {
                var namaFile = 'Laporan_Lengkap_' + (tglAwal || '').replace(/-/g, '') + '_sd_' + (tglAkhir || '').replace(/-/g, '') + '.pdf';
                doc.save(namaFile);
            })
            .catch(function(err) {
                alert('Gagal membuat PDF. Coba lagi atau gunakan Print lalu pilih Simpan sebagai PDF.');
            });
    } else {
        var html = '<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:10px;}h2,h3{text-align:center;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:4px;}th{background:#1e40af;color:#fff;}.text-left{text-align:left;}.text-right{text-align:right;} .break{page-break-before:always;}</style></head><body>' +
            htmlAbsensi + '<div class="break"></div>' + htmlJadwal.replace(styleBlock,'') + '<div class="break"></div>' + htmlLaporanAbsen.replace(styleBlock,'') + '<div class="break"></div>' + htmlGaji.replace(styleBlock,'') + '</body></html>';
        var printWindow = window.open('', '', 'height=600,width=900');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(function() { printWindow.print(); printWindow.close(); }, 500);
    }
}

function openJadwalModal() {
    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    
    document.getElementById("jadwal_preview_start").value = tglAwal;
    document.getElementById("jadwal_preview_end").value = tglAkhir;
    
    // Load saved note based on date range
    const noteKey = getRbmStorageKey('RBM_JADWAL_NOTE_' + tglAwal + '_' + tglAkhir);
    const savedNote = RBMStorage.getItem(noteKey) || "";
    document.getElementById("jadwal_notes").value = savedNote;

    document.getElementById("jadwalModal").style.display = "flex";
    updateJadwalPreview();
}

function closeJadwalModal() {
    document.getElementById("jadwalModal").style.display = "none";
}

function updateJadwalPreview() {
    const tglAwal = document.getElementById("jadwal_preview_start").value;
    const tglAkhir = document.getElementById("jadwal_preview_end").value;
    const notes = document.getElementById("jadwal_notes").value;
    const container = document.getElementById("jadwalPreviewArea");

    // Save note automatically
    if (tglAwal && tglAkhir) {
        const noteKey = getRbmStorageKey('RBM_JADWAL_NOTE_' + tglAwal + '_' + tglAkhir);
        RBMStorage.setItem(noteKey, notes);
    }

    if (!tglAwal || !tglAkhir) {
        container.innerHTML = '<p style="text-align:center;">Pilih tanggal terlebih dahulu.</p>';
        return;
    }

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});

    const dates = [];
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const d1 = new Date(tglAwal).toLocaleDateString('id-ID', options);
    const d2 = new Date(tglAkhir).toLocaleDateString('id-ID', options);

    let html = `
    <div style="font-family: 'Segoe UI', sans-serif; padding: 10px;">
        <h2 style="text-align:center; margin:0 0 5px 0; font-size:18px;">JADWAL KERJA KARYAWAN</h2>
        <h3 style="text-align:center; margin:0 0 15px 0; font-size:14px; font-weight:normal; color:#333;">Periode: ${d1} s/d ${d2}</h3>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
            <thead>
                <tr>
                    <th style="border:1px solid #000; padding:6px; background:#f2f2f2; width:30px;">No</th>
                    <th style="border:1px solid #000; padding:6px; background:#f2f2f2; text-align:left; width:150px;">Nama</th>
                    <th style="border:1px solid #000; padding:6px; background:#f2f2f2; text-align:left; width:100px;">Jabatan</th>
    `;
    
    dates.forEach(d => {
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
        html += `<th style="border:1px solid #000; padding:6px; background:#f2f2f2; text-align:center;">${dayName}<br>${d.getDate()}</th>`;
    });
    
    html += `<th style="border:1px solid #000; padding:6px; background:#f2f2f2; width:35px;">PH</th>`;
    html += `<th style="border:1px solid #000; padding:6px; background:#f2f2f2; width:35px;">AL</th>`;
    html += `<th style="border:1px solid #000; padding:6px; background:#f2f2f2; width:35px;">DP</th>`;
    
    html += `</tr></thead><tbody>`;

    employees.forEach((emp, idx) => {
        html += `<tr>
            <td style="border:1px solid #000; padding:6px; text-align:center;">${idx + 1}</td>
            <td style="border:1px solid #000; padding:6px;">${emp.name}</td>
            <td style="border:1px solid #000; padding:6px;">${emp.jabatan}</td>`;
            
        dates.forEach(d => {
            const key = `${d.toISOString().split('T')[0]}_${emp.id || idx}`;
            const status = jadwalData[key] || '';
            
            let bg = '';
            let color = '#000';
            if (status === 'P') { bg = '#ffedd5'; color = '#9a3412'; }
            else if (status === 'M') { bg = '#e0f2fe'; color = '#075985'; }
            else if (status === 'S') { bg = '#fae8ff'; color = '#86198f'; }
            else if (status === 'Off') { bg = '#f1f5f9'; color = '#64748b'; }
            else if (['PH','AL','DP'].includes(status)) { bg = '#dbeafe'; color = '#1e40af'; }
            
            const style = bg ? `background-color:${bg}; color:${color};` : '';
            
            html += `<td style="border:1px solid #000; padding:6px; text-align:center; ${style}">${status}</td>`;
        });
        html += `<td style="border:1px solid #000; padding:6px; text-align:center;">${emp.sisaPH || 0}</td>`;
        html += `<td style="border:1px solid #000; padding:6px; text-align:center;">${emp.sisaAL || 0}</td>`;
        html += `<td style="border:1px solid #000; padding:6px; text-align:center;">${emp.sisaDP || 0}</td>`;
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    
    if (notes) {
        html += `<div style="margin-top: 15px; text-align: left; font-size: 12px; color: #000;"><strong>Catatan:</strong><br>${notes}</div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

function printJadwalPreview() {
    const content = document.getElementById("jadwalPreviewArea").innerHTML;
    const printWindow = window.open('', '', 'height=700,width=800');
    printWindow.document.write('<html><head><title>Jadwal Kerja</title>');
    printWindow.document.write('<style>body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #000; padding: 6px; } @media print { @page { size: landscape; margin: 10mm; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

function saveJadwalImage() {
    const container = document.getElementById("jadwalPreviewArea");
    const content = container.firstElementChild;
    
    if (!content) {
        alert("Silakan klik 'Lihat Preview' terlebih dahulu.");
        return;
    }

    const tglAwal = document.getElementById("jadwal_preview_start").value;
    const tglAkhir = document.getElementById("jadwal_preview_end").value;

    html2canvas(content, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        const a = document.createElement('a');
        a.href = canvas.toDataURL("image/jpeg", 0.9);
        a.download = `Jadwal_Kerja_${tglAwal}_sd_${tglAkhir}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

async function downloadAllSlipsAsZip(event) {
    const tglAwal = document.getElementById("absensi_tgl_awal").value;
    const tglAkhir = document.getElementById("absensi_tgl_akhir").value;
    
    if (!tglAwal || !tglAkhir) { alert("Pilih tanggal terlebih dahulu di filter Rekap Gaji."); return; }

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    if (employees.length === 0) { alert("Tidak ada data karyawan."); return; }

    // UI Feedback
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Memproses... (0/" + employees.length + ")";
    btn.disabled = true;

    const zip = new JSZip();
    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
    const gajiPeriodKey = getRbmStorageKey('RBM_GAJI_' + tglAwal + '_' + tglAkhir);
    const gajiPeriodData = safeParse(RBMStorage.getItem(gajiPeriodKey), {});

    // Create temp container off-screen
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.top = '-9999px';
    wrapper.style.left = '-9999px';
    wrapper.style.width = '800px'; 
    wrapper.style.backgroundColor = '#ffffff';
    document.body.appendChild(wrapper);

    // Date generation
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    const dates = [];
    while (curr <= end) { dates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    
    const options = { month: 'long', year: 'numeric' };
    const periodeText = new Date(tglAwal).toLocaleDateString('id-ID', options).toUpperCase();

    try {
        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            btn.innerText = `Memproses... (${i+1}/${employees.length})`;

            // Calculate Data (Logic same as renderRekapGaji)
            let counts = { H:0 };
            dates.forEach(d => {
                const key = `${d.toISOString().split('T')[0]}_${emp.id || i}`;
                if (absensiData[key] === 'H') counts.H++;
            });

            const pData = gajiPeriodData[emp.id || i] || {};
            const gajiPokok = parseInt(emp.gajiPokok) || 0;
            const potHari = parseFloat(pData.potHari) || 0;
            const jamTerlambat = parseFloat(pData.jamTerlambat) || 0;
            const hutang = parseInt(pData.hutang) || 0;
            const tunjangan = parseInt(pData.tunjangan) || 0;

            const gajiPerHari = Math.round(gajiPokok / 30);
            const potTerlambatPerJam = Math.round(gajiPokok / 240);
            const uangMakan = counts.H * 10000;
            const totalPotKehadiran = Math.round(potHari * gajiPerHari);
            const totalPotTerlambat = Math.round(jamTerlambat * potTerlambatPerJam);
            const totalPendapatan = gajiPokok + tunjangan + uangMakan;
            const grandTotal = totalPendapatan - totalPotKehadiran - totalPotTerlambat - hutang;

            // Render HTML Template
            wrapper.innerHTML = `
                <div style="padding: 40px; font-family: 'Courier New', Courier, monospace; color: #000; border: 1px solid #eee; background: white;">
                    <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px;">
                        <h3 style="margin: 0; font-size: 18px; font-weight: bold;">SLIP GAJI KARYAWAN</h3>
                        <h4 style="margin: 5px 0 0; font-size: 16px; font-weight: bold;">RICE BOWL MONSTERS</h4>
                        <p style="margin: 5px 0 0; font-size: 14px;">BULAN ${periodeText}</p>
                    </div>
                    <table style="width: 100%; margin-bottom: 20px; font-size: 14px; border-collapse: collapse;"><tr><td style="width: 120px; padding: 2px 0;">Nama</td><td style="width: 10px;">:</td><td style="font-weight: bold;">${emp.name}</td></tr><tr><td style="padding: 2px 0;">Jabatan</td><td>:</td><td>${emp.jabatan}</td></tr><tr><td style="padding: 2px 0;">Bagian</td><td>:</td><td>Rice Bowl Monsters</td></tr></table>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;"><tr><td style="padding: 8px 0; font-weight: bold;" colspan="4">Pendapatan (+):</td></tr><tr><td style="padding-left: 15px;">Gaji Pokok</td><td>:</td><td style="text-align: right;">${formatRupiah(gajiPokok)}</td><td></td></tr><tr><td style="padding-left: 15px;">Tunjangan</td><td>:</td><td style="text-align: right;">${formatRupiah(tunjangan)}</td><td></td></tr><tr><td style="padding-left: 15px;">Lembur Minggu</td><td>:</td><td style="text-align: right;">Rp -</td><td></td></tr><tr style="border-bottom: 1px solid black;"><td style="padding-left: 15px; padding-bottom: 8px;">Uang Makan</td><td style="padding-bottom: 8px;">:</td><td style="text-align: right; padding-bottom: 8px;">${formatRupiah(uangMakan)}</td><td style="text-align: right; font-weight: bold; padding-bottom: 8px;">+</td></tr><tr><td style="font-weight: bold; padding-top: 8px;">Total</td><td style="font-weight: bold; padding-top: 8px;">:</td><td style="text-align: right; font-weight: bold; padding-top: 8px;">${formatRupiah(totalPendapatan)}</td><td></td></tr><tr><td colspan="4" style="height: 20px;"></td></tr><tr><td style="padding: 8px 0; font-weight: bold;" colspan="4">Pengurangan (-):</td></tr><tr><td style="padding-left: 15px;">Potongan Absensi</td><td>:</td><td style="text-align: right;">${formatRupiah(totalPotKehadiran)}</td><td></td></tr><tr><td style="padding-left: 15px;">Potongan Terlambat</td><td>:</td><td style="text-align: right;">${formatRupiah(totalPotTerlambat)}</td><td></td></tr><tr><td style="padding-left: 15px;">Hutang Karyawan</td><td>:</td><td style="text-align: right;">${formatRupiah(hutang)}</td><td></td></tr><tr><td colspan="4" style="height: 20px;"></td></tr><tr style="background: #f0f0f0; border-top: 2px solid black; border-bottom: 2px solid black;"><td style="font-weight: bold; padding: 10px;">Grand Total Gaji</td><td style="font-weight: bold; padding: 10px;">:</td><td style="text-align: right; font-weight: bold; padding: 10px;">${formatRupiah(grandTotal)}</td><td></td></tr></table>
                    <div style="margin-top: 50px; width: 200px; font-size: 14px;"><p style="margin-bottom: 70px;">Dibuat Oleh:</p><p style="font-weight: bold; text-decoration: underline; margin: 0;">Admin</p></div>
                </div>`;

            // Convert to JPG & Add to Zip
            const canvas = await html2canvas(wrapper, { scale: 1.5, backgroundColor: "#ffffff" });
            const imgData = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
            zip.file(`Slip_${emp.name.replace(/[^a-z0-9]/gi, '_')}.jpg`, imgData, {base64: true});
        }

        // Download Zip
        const content = await zip.generateAsync({type:"blob"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        a.download = `Slip_Gaji_All_${tglAwal}_${tglAkhir}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) {
        console.error(e);
        alert("Gagal: " + e.message);
    } finally {
        document.body.removeChild(wrapper);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// ================= BONUS LOGIC =================
function renderBonusTab() {
    const tglAwal = document.getElementById("bonus_start_date").value;
    const tglAkhir = document.getElementById("bonus_end_date").value;
    if (!tglAwal || !tglAkhir) return;

    const key = getRbmStorageKey('RBM_BONUS_' + tglAwal + '_' + tglAkhir);
    const savedData = safeParse(RBMStorage.getItem(key), { absensi: [], omset: { total: 0, persen: 0, excludedIds: [] } });
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);

    // --- 1. Render Bonus Absensi ---
    const absensiTbody = document.getElementById("bonus_absensi_tbody");
    absensiTbody.innerHTML = "";
    
    // Helper to create row
    const createRow = (data = {}) => {
        const tr = document.createElement("tr");
        let options = `<option value="">-- Pilih --</option>`;
        employees.forEach(emp => {
            options += `<option value="${emp.name}" ${data.name === emp.name ? 'selected' : ''}>${emp.name}</option>`;
        });

        tr.innerHTML = `
            <td><select class="bonus-absensi-name" style="width:100%; padding:5px;">${options}</select></td>
            <td><input type="text" class="bonus-absensi-nominal" value="${data.nominal ? formatRupiah(data.nominal) : ''}" oninput="formatRupiahInput(this); calculateBonusAbsensiTotal()" style="width:100%; padding:5px; text-align:right;"></td>
            <td><input type="text" class="bonus-absensi-ket" value="${data.keterangan || ''}" placeholder="Ket..." style="width:100%; padding:5px;"></td>
            <td><button class="btn-small-danger" onclick="this.closest('tr').remove(); calculateBonusAbsensiTotal()">x</button></td>
        `;
        absensiTbody.appendChild(tr);
    };

    if (savedData.absensi && savedData.absensi.length > 0) {
        savedData.absensi.forEach(item => createRow(item));
    } else {
        createRow(); // Empty row
    }
    calculateBonusAbsensiTotal();

    // --- 2. Render Bonus Omset ---
    document.getElementById("bonus_omset_total").value = savedData.omset.total ? formatRupiah(savedData.omset.total) : "";
    document.getElementById("bonus_omset_persen").value = savedData.omset.persen || "";

    const omsetTbody = document.getElementById("bonus_omset_tbody");
    omsetTbody.innerHTML = "";
    
    employees.forEach(emp => {
        const isExcluded = (savedData.omset.excludedIds || []).includes(emp.id);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${emp.name}<br><span style="font-size:10px; color:#666;">${emp.jabatan}</span></td>
            <td style="text-align:center;">
                <input type="checkbox" class="bonus-omset-check" value="${emp.id}" ${!isExcluded ? 'checked' : ''} onchange="calculateBonusOmset()">
            </td>
            <td style="text-align:right;" class="bonus-omset-nominal-display">-</td>
        `;
        omsetTbody.appendChild(tr);
    });
    calculateBonusOmset();
}

function addBonusAbsensiRow() {
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const tbody = document.getElementById("bonus_absensi_tbody");
    const tr = document.createElement("tr");
    let options = `<option value="">-- Pilih --</option>`;
    employees.forEach(emp => {
        options += `<option value="${emp.name}">${emp.name}</option>`;
    });

    tr.innerHTML = `
        <td><select class="bonus-absensi-name" style="width:100%; padding:5px;">${options}</select></td>
        <td><input type="text" class="bonus-absensi-nominal" oninput="formatRupiahInput(this); calculateBonusAbsensiTotal()" style="width:100%; padding:5px; text-align:right;"></td>
        <td><input type="text" class="bonus-absensi-ket" placeholder="Ket..." style="width:100%; padding:5px;"></td>
        <td><button class="btn-small-danger" onclick="this.closest('tr').remove(); calculateBonusAbsensiTotal()">x</button></td>
    `;
    tbody.appendChild(tr);
}

function calculateBonusAbsensiTotal() {
    let total = 0;
    document.querySelectorAll(".bonus-absensi-nominal").forEach(input => {
        const val = parseInt(input.value.replace(/[^0-9]/g, '')) || 0;
        total += val;
    });
    document.getElementById("bonus_absensi_total").innerText = formatRupiah(total);
}

function calculateBonusOmset() {
    const omsetStr = document.getElementById("bonus_omset_total").value;
    const omset = parseInt(omsetStr.replace(/[^0-9]/g, '')) || 0;
    const persen = parseFloat(document.getElementById("bonus_omset_persen").value) || 0;
    
    const pool = Math.round(omset * (persen / 100));
    document.getElementById("bonus_omset_pool").value = formatRupiah(pool);

    const checkboxes = document.querySelectorAll(".bonus-omset-check:checked");
    const count = checkboxes.length;
    const perPerson = count > 0 ? Math.round(pool / count) : 0;

    // Reset all displays first
    document.querySelectorAll(".bonus-omset-nominal-display").forEach(el => el.innerText = "Rp 0");

    // Update checked rows
    checkboxes.forEach(cb => {
        const row = cb.closest("tr");
        row.querySelector(".bonus-omset-nominal-display").innerText = formatRupiah(perPerson);
    });
}

function saveBonusData() {
    const tglAwal = document.getElementById("bonus_start_date").value;
    const tglAkhir = document.getElementById("bonus_end_date").value;
    if (!tglAwal || !tglAkhir) { alert("Pilih tanggal terlebih dahulu."); return; }

    const absensiData = [];
    document.querySelectorAll("#bonus_absensi_tbody tr").forEach(tr => {
        const name = tr.querySelector(".bonus-absensi-name").value;
        const nominal = parseInt(tr.querySelector(".bonus-absensi-nominal").value.replace(/[^0-9]/g, '')) || 0;
        const keterangan = tr.querySelector(".bonus-absensi-ket").value;
        if (name) absensiData.push({ name, nominal, keterangan });
    });

    const omsetTotal = parseInt(document.getElementById("bonus_omset_total").value.replace(/[^0-9]/g, '')) || 0;
    const omsetPersen = parseFloat(document.getElementById("bonus_omset_persen").value) || 0;
    const excludedIds = [];
    document.querySelectorAll(".bonus-omset-check:not(:checked)").forEach(cb => excludedIds.push(parseInt(cb.value)));

    const data = { absensi: absensiData, omset: { total: omsetTotal, persen: omsetPersen, excludedIds } };
    RBMStorage.setItem(getRbmStorageKey('RBM_BONUS_' + tglAwal + '_' + tglAkhir), JSON.stringify(data));
    alert("✅ Data Bonus tersimpan.");
}

function exportBonusAbsensiExcel() {
    const tglAwal = document.getElementById("bonus_start_date").value;
    const tglAkhir = document.getElementById("bonus_end_date").value;
    const rows = document.querySelectorAll("#bonus_absensi_tbody tr");
    const total = document.getElementById("bonus_absensi_total").innerText;

    let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += '<Styles><Style ss:ID="sHeader"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e40af" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style><Style ss:ID="sData"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style></Styles>';
    xml += '<Worksheet ss:Name="Bonus Absensi"><Table>';
    xml += '<Column ss:Width="30"/><Column ss:Width="150"/><Column ss:Width="100"/><Column ss:Width="150"/>';
    
    xml += `<Row><Cell ss:MergeAcross="3" ss:StyleID="sHeader"><Data ss:Type="String">LAPORAN BONUS ABSENSI (${tglAwal} s/d ${tglAkhir})</Data></Cell></Row>`;
    xml += '<Row><Cell ss:StyleID="sHeader"><Data ss:Type="String">No</Data></Cell><Cell ss:StyleID="sHeader"><Data ss:Type="String">Nama</Data></Cell><Cell ss:StyleID="sHeader"><Data ss:Type="String">Nominal</Data></Cell><Cell ss:StyleID="sHeader"><Data ss:Type="String">Keterangan</Data></Cell></Row>';

    rows.forEach((tr, i) => {
        const name = tr.querySelector(".bonus-absensi-name").value;
        const nominal = tr.querySelector(".bonus-absensi-nominal").value;
        const ket = tr.querySelector(".bonus-absensi-ket").value;
        if(name) {
            xml += `<Row><Cell ss:StyleID="sData"><Data ss:Type="Number">${i+1}</Data></Cell><Cell ss:StyleID="sData"><Data ss:Type="String">${name}</Data></Cell><Cell ss:StyleID="sData"><Data ss:Type="String">${nominal}</Data></Cell><Cell ss:StyleID="sData"><Data ss:Type="String">${ket}</Data></Cell></Row>`;
        }
    });

    xml += `<Row><Cell></Cell><Cell><Data ss:Type="String">TOTAL</Data></Cell><Cell><Data ss:Type="String">${total}</Data></Cell></Row>`;
    xml += '</Table></Worksheet></Workbook>';

    const blob = new Blob([xml], {type: 'application/vnd.ms-excel'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Bonus_Absensi_${tglAwal}_${tglAkhir}.xls`;
    a.click();
}

function exportBonusAbsensiPDF() {
    const tglAwal = document.getElementById("bonus_start_date").value;
    const tglAkhir = document.getElementById("bonus_end_date").value;
    const rows = document.querySelectorAll("#bonus_absensi_tbody tr");
    const total = document.getElementById("bonus_absensi_total").innerText;

    let html = `<html><head><title>Bonus Absensi</title><style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;} th{background:#1e40af;color:white;}</style></head><body>`;
    html += `<h2 style="text-align:center;">Laporan Bonus Absensi</h2><p style="text-align:center;">Periode: ${tglAwal} s/d ${tglAkhir}</p>`;
    html += `<table><thead><tr><th>No</th><th>Nama</th><th>Nominal</th><th>Keterangan</th></tr></thead><tbody>`;
    
    let no = 1;
    rows.forEach(tr => {
        const name = tr.querySelector(".bonus-absensi-name").value;
        const nominal = tr.querySelector(".bonus-absensi-nominal").value;
        const ket = tr.querySelector(".bonus-absensi-ket").value;
        if(name) {
            html += `<tr><td style="text-align:center;">${no++}</td><td>${name}</td><td style="text-align:right;">${nominal}</td><td>${ket}</td></tr>`;
        }
    });
    html += `<tr><td colspan="2" style="text-align:right;font-weight:bold;">TOTAL</td><td style="text-align:right;font-weight:bold;">${total}</td><td></td></tr>`;
    html += `</tbody></table></body></html>`;

    const win = window.open('', '', 'height=600,width=800');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

function exportBonusOmsetExcel() {
    const tglAwal = document.getElementById("bonus_start_date").value;
    const tglAkhir = document.getElementById("bonus_end_date").value;
    const omset = document.getElementById("bonus_omset_total").value;
    const persen = document.getElementById("bonus_omset_persen").value;
    const pool = document.getElementById("bonus_omset_pool").value;
    const rows = document.querySelectorAll("#bonus_omset_tbody tr");

    let xml = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    xml += '<Styles><Style ss:ID="sHeader"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#059669" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style><Style ss:ID="sData"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style></Styles>';
    xml += '<Worksheet ss:Name="Bonus Omset"><Table>';
    xml += '<Column ss:Width="30"/><Column ss:Width="150"/><Column ss:Width="80"/><Column ss:Width="100"/>';
    
    xml += `<Row><Cell ss:MergeAcross="3" ss:StyleID="sHeader"><Data ss:Type="String">LAPORAN BONUS OMSET (${tglAwal} s/d ${tglAkhir})</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Total Omset:</Data></Cell><Cell><Data ss:Type="String">${omset}</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Persentase:</Data></Cell><Cell><Data ss:Type="String">${persen}%</Data></Cell></Row>`;
    xml += `<Row><Cell><Data ss:Type="String">Total Dibagi:</Data></Cell><Cell><Data ss:Type="String">${pool}</Data></Cell></Row>`;
    xml += '<Row></Row>';

    xml += '<Row><Cell ss:StyleID="sHeader"><Data ss:Type="String">No</Data></Cell><Cell ss:StyleID="sHeader"><Data ss:Type="String">Nama</Data></Cell><Cell ss:StyleID="sHeader"><Data ss:Type="String">Status</Data></Cell><Cell ss:StyleID="sHeader"><Data ss:Type="String">Nominal</Data></Cell></Row>';

    rows.forEach((tr, i) => {
        const nameHtml = tr.cells[0].innerHTML;
        const name = nameHtml.split('<br>')[0]; // Ambil nama saja
        const checked = tr.querySelector(".bonus-omset-check").checked;
        const nominal = tr.querySelector(".bonus-omset-nominal-display").innerText;
        
        xml += `<Row><Cell ss:StyleID="sData"><Data ss:Type="Number">${i+1}</Data></Cell><Cell ss:StyleID="sData"><Data ss:Type="String">${name}</Data></Cell><Cell ss:StyleID="sData"><Data ss:Type="String">${checked ? 'Dapat' : 'Tidak'}</Data></Cell><Cell ss:StyleID="sData"><Data ss:Type="String">${nominal}</Data></Cell></Row>`;
    });

    xml += '</Table></Worksheet></Workbook>';

    const blob = new Blob([xml], {type: 'application/vnd.ms-excel'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Bonus_Omset_${tglAwal}_${tglAkhir}.xls`;
    a.click();
}

function exportBonusOmsetPDF() {
    const tglAwal = document.getElementById("bonus_start_date").value;
    const tglAkhir = document.getElementById("bonus_end_date").value;
    const omset = document.getElementById("bonus_omset_total").value;
    const persen = document.getElementById("bonus_omset_persen").value;
    const pool = document.getElementById("bonus_omset_pool").value;
    const rows = document.querySelectorAll("#bonus_omset_tbody tr");

    let html = `<html><head><title>Bonus Omset</title><style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;} th{background:#059669;color:white;}</style></head><body>`;
    html += `<h2 style="text-align:center;">Laporan Bonus Omset</h2><p style="text-align:center;">Periode: ${tglAwal} s/d ${tglAkhir}</p>`;
    
    html += `<div style="margin-bottom:20px; padding:10px; border:1px solid #ddd; background:#f9f9f9;">`;
    html += `<strong>Total Omset:</strong> ${omset}<br>`;
    html += `<strong>Persentase:</strong> ${persen}%<br>`;
    html += `<strong>Total Dibagi:</strong> ${pool}`;
    html += `</div>`;

    html += `<table><thead><tr><th>No</th><th>Nama</th><th>Status</th><th>Nominal</th></tr></thead><tbody>`;
    
    rows.forEach((tr, i) => {
        const nameHtml = tr.cells[0].innerHTML;
        const name = nameHtml.split('<br>')[0];
        const checked = tr.querySelector(".bonus-omset-check").checked;
        const nominal = tr.querySelector(".bonus-omset-nominal-display").innerText;
        
        html += `<tr><td style="text-align:center;">${i+1}</td><td>${name}</td><td style="text-align:center;">${checked ? '✅' : '-'}</td><td style="text-align:right;">${nominal}</td></tr>`;
    });
    html += `</tbody></table></body></html>`;

    const win = window.open('', '', 'height=600,width=800');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

// ================= RESERVASI LOGIC =================
function submitReservasi() {
    const pj = document.getElementById("res_pj").value;
    const nama = document.getElementById("res_nama").value;
    const wa = document.getElementById("res_wa").value;
    const tanggal = document.getElementById("res_tanggal").value;
    const jamMulai = document.getElementById("res_jam_mulai").value;
    const jamSelesai = document.getElementById("res_jam_selesai").value;
    const jmlTamu = document.getElementById("res_jml_tamu").value;
    const ruangan = document.getElementById("res_ruangan").value;
    const meja = document.getElementById("res_meja").value;
    const fasilitas = document.getElementById("res_fasilitas").value;
    const dp = document.getElementById("res_dp").value;

    if (!nama || !tanggal || !jamMulai) {
        alert("Nama, Tanggal, dan Jam Mulai wajib diisi!");
        return;
    }

    const reservasiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_RESERVASI_DATA')), []);
    // Generate ID: RES + Timestamp
    const timestamp = new Date().toISOString();
    const id = "RES-" + Date.now().toString().slice(-6);

    const newRes = {
        id, pj, timestamp, nama, tanggal, jamMulai, jamSelesai, wa, jmlTamu, ruangan, meja, fasilitas, dp
    };

    reservasiData.push(newRes);
    RBMStorage.setItem(getRbmStorageKey('RBM_RESERVASI_DATA'), JSON.stringify(reservasiData));
    
    alert("✅ Reservasi Berhasil Disimpan!");
    
    // Reset Form
    document.getElementById("res_nama").value = "";
    document.getElementById("res_wa").value = "";
    document.getElementById("res_jml_tamu").value = "";
    document.getElementById("res_meja").value = "";
    document.getElementById("res_fasilitas").value = "";
    document.getElementById("res_dp").value = "";
    
    loadReservasiData();
    renderReservasiCalendar();
}

function loadReservasiData() {
    const tglAwal = document.getElementById("res_filter_start").value;
    const tglAkhir = document.getElementById("res_filter_end").value;
    const tbody = document.getElementById("reservasi_tbody");
    
    const allData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_RESERVASI_DATA')), []);
    
    // Filter by date range
    const filtered = allData.filter(d => d.tanggal >= tglAwal && d.tanggal <= tglAkhir);
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Tidak ada data reservasi pada rentang tanggal ini.</td></tr>';
        return;
    }

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    let html = '';
    filtered.forEach((res, idx) => {
        html += `<tr>
            <td><span style="font-size:11px; font-weight:bold; color:#1e40af;">${res.id}</span></td>
            <td>${res.tanggal}</td>
            <td>${res.nama}<br><span style="font-size:10px; color:#666;">${res.wa}</span></td>
            <td>${res.jamMulai} - ${res.jamSelesai}</td>
            <td style="text-align:center;">${res.jmlTamu}</td>
            <td>${res.ruangan}</td>
            <td style="text-align:right;">${formatRupiah(res.dp)}</td>
            <td>
                <button class="btn-small-danger" style="background:#0d6efd;" onclick="printReservasiBill('${res.id}')">Print Bill</button>
                ${window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete() ? '<button class="btn-small-danger" onclick="deleteReservasi(\'' + res.id + '\')">Hapus</button>' : '-'}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function deleteReservasi(id) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    if(!confirm("Hapus data reservasi ini?")) return;
    let allData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_RESERVASI_DATA')), []);
    allData = allData.filter(d => d.id !== id);
    RBMStorage.setItem(getRbmStorageKey('RBM_RESERVASI_DATA'), JSON.stringify(allData));
    loadReservasiData();
    renderReservasiCalendar();
}

function printReservasiBill(id) {
    const allData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_RESERVASI_DATA')), []);
    const res = allData.find(d => d.id === id);
    if (!res) return;

    const win = window.open('', '', 'height=600,width=400');
    const html = `
    <html><head><title>Bill Reservasi</title>
    <style>
        body { font-family: 'Courier New', monospace; padding: 20px; font-size: 12px; color: #000; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
        .row { display: flex; margin-bottom: 5px; }
        .label { width: 100px; font-weight: bold; }
        .val { flex: 1; }
        .footer { text-align: center; margin-top: 20px; border-top: 2px dashed #000; padding-top: 10px; }
    </style>
    </head><body>
        <div class="header">
            <h2 style="margin:0;">RICE BOWL MONSTERS</h2>
            <p style="margin:5px 0;">BUKTI RESERVASI</p>
            <p style="margin:0; font-size:10px;">ID: ${res.id}</p>
        </div>
        <div class="row"><div class="label">PJ</div><div class="val">: ${res.pj}</div></div>
        <div class="row"><div class="label">Tgl Pesan</div><div class="val">: ${new Date(res.timestamp).toLocaleDateString('id-ID')}</div></div>
        <br>
        <div class="row"><div class="label">Nama</div><div class="val">: ${res.nama}</div></div>
        <div class="row"><div class="label">No WA</div><div class="val">: ${res.wa}</div></div>
        <div class="row"><div class="label">Tgl Acara</div><div class="val">: ${res.tanggal}</div></div>
        <div class="row"><div class="label">Waktu</div><div class="val">: ${res.jamMulai} s/d ${res.jamSelesai}</div></div>
        <div class="row"><div class="label">Jml Tamu</div><div class="val">: ${res.jmlTamu} Orang</div></div>
        <div class="row"><div class="label">Ruangan</div><div class="val">: ${res.ruangan}</div></div>
        <div class="row"><div class="label">Meja</div><div class="val">: ${res.meja}</div></div>
        <div class="row"><div class="label">Fasilitas</div><div class="val">: ${res.fasilitas}</div></div>
        <br>
        <div class="row" style="font-size:14px; font-weight:bold;">
            <div class="label">DP MASUK</div>
            <div class="val">: ${formatRupiah(res.dp)}</div>
        </div>
        <div class="footer">
            <p>Terima Kasih atas Reservasi Anda</p>
            <p style="font-size:10px;">Harap simpan bukti ini</p>
        </div>
    </body></html>`;
    
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
}

let calCurrentDate = new Date();

function renderReservasiCalendar() {
    const grid = document.getElementById('calendar_grid');
    const monthYear = document.getElementById('cal_month_year');
    if (!grid || !monthYear) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    monthYear.innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    let html = '';
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    days.forEach(d => html += `<div class="calendar-day-header">${d}</div>`);

    // Previous month filler
    for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div class="calendar-day other-month"></div>`;
    }

    const reservasiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_RESERVASI_DATA')), []);

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const isToday = (dateStr === new Date().toISOString().split('T')[0]);
        
        // Find events
        const events = reservasiData.filter(r => r.tanggal === dateStr);
        
        let eventsHtml = '';
        events.forEach(ev => {
            let colorClass = 'indoor'; // default
            if (ev.ruangan.toLowerCase().includes('outdoor')) colorClass = 'outdoor';
            else if (ev.ruangan.toLowerCase().includes('vip')) colorClass = 'vip';
            else if (ev.ruangan.toLowerCase().includes('meeting')) colorClass = 'meeting';
            
            eventsHtml += `<div class="cal-event ${colorClass}" title="${ev.nama} (${ev.jamMulai}-${ev.jamSelesai}) - ${ev.ruangan}">${ev.jamMulai} ${ev.nama}</div>`;
        });

        html += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectCalendarDate('${dateStr}')">
            <div class="calendar-day-number">${i}</div>
            ${eventsHtml}
        </div>`;
    }

    grid.innerHTML = html;
}

function changeCalendarMonth(offset) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + offset);
    renderReservasiCalendar();
}

function selectCalendarDate(dateStr) {
    var el = document.getElementById("res_tanggal");
    if (el) el.value = dateStr;
    showView('input-reservasi-view');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
    }
}

// ================= STOK BARANG LOGIC =================
let activeStokTab = 'sales'; // sales, fruits, notsales

// Helper to find item ID by name across all categories
function findStokItemId(name) {
    const stokKey = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_STOK_ITEMS') : 'RBM_STOK_ITEMS';
    const allItems = safeParse(RBMStorage.getItem(stokKey), {sales:[], fruits:[], notsales:[]});
    for (const cat in allItems) {
        const list = allItems[cat];
        if (!Array.isArray(list)) continue;
        const item = list.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
        if (item) return { id: item.id, category: cat, ratio: item.ratio, name: item.name };
    }
    return null;
}

// Cari item by nama di kategori tertentu (untuk rusak: bedakan Sales vs Fruits)
function findStokItemIdByCategory(name, category) {
    if (!name || !name.trim() || !category) return null;
    const stokKey = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_STOK_ITEMS') : 'RBM_STOK_ITEMS';
    const allItems = safeParse(RBMStorage.getItem(stokKey), { sales: [], fruits: [], notsales: [] });
    const list = Array.isArray(allItems && allItems[category]) ? allItems[category] : null;
    if (!list) return null;
    const item = list.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
    if (item) return { id: item.id, category: category, ratio: item.ratio, name: item.name };
    return null;
}

// Ambil satuan dari Stok Barang berdasarkan nama (untuk Input Barang)
function getStokUnitByName(name) {
    if (!name || !name.trim()) return '';
    const stokKey = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_STOK_ITEMS') : 'RBM_STOK_ITEMS';
    const allItems = safeParse(RBMStorage.getItem(stokKey), { sales: [], fruits: [], notsales: [] });
    for (const cat in allItems) {
        const list = Array.isArray(allItems[cat]) ? allItems[cat] : [];
        const item = list.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
        if (item && item.unit) return item.unit;
    }
    return '';
}

function getPreviousMonth(monthVal) {
    if (!monthVal || monthVal.length < 7) return '';
    var parts = monthVal.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    m--;
    if (m < 1) { m = 12; y--; }
    return y + '-' + String(m).padStart(2, '0');
}

// Process updates from Input Barang
function processStokUpdates(updates) {
    const stokKey = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
    let data = safeParse(RBMStorage.getItem(stokKey), {});
    
    updates.forEach(u => {
        // Key format: ITEMID_TYPE_DATE (e.g., 1_in_2023-10-01)
        // Date from input is YYYY-MM-DD.
        // We need to handle accumulation for In/Out/Rusak, but overwrite for Sisa?
        // For simplicity, we add to existing values for flow types.
        
        if (u.type === 'barang masuk') {
            const key = `${u.id}_in_${u.date}`;
            data[key] = (parseFloat(data[key]) || 0) + u.qty;
        } else if (u.type === 'barang keluar') {
            const keyOut = `${u.id}_out_${u.date}`; // For Fruits/NotSales
            const keyOutPck = `${u.id}_outpck_${u.date}`; // For Sales (if manual out is needed, though Sales uses Sisa logic)
            data[keyOut] = (parseFloat(data[keyOut]) || 0) + u.qty;
            data[keyOutPck] = (parseFloat(data[keyOutPck]) || 0) + u.qty;
            
            if (u.extra) { // Barang Jadi / Finished
                const keyFin = `${u.id}_fin_${u.date}`;
                data[keyFin] = (parseFloat(data[keyFin]) || 0) + parseFloat(u.extra); // Assuming extra is number
            }
        } else if (u.type === 'rusak') {
            const key = `${u.id}_rusak_${u.date}`;
            data[key] = (parseFloat(data[key]) || 0) + u.qty;
            if (u.keterangan != null || (u.foto && u.foto.data)) {
                const detailKey = getRbmStorageKey('RBM_STOK_RUSAK_DETAIL');
                let details = safeParse(RBMStorage.getItem(detailKey), {});
                const detailId = `${u.id}_${u.date}`;
                const fotoDataUrl = u.foto && u.foto.data ? `data:${u.foto.mimeType || 'image/jpeg'};base64,${u.foto.data}` : null;
                details[detailId] = { keterangan: u.keterangan || '', foto: fotoDataUrl };
                RBMStorage.setItem(detailKey, JSON.stringify(details));
            }
        } else if (u.type === 'sisa') {
            const key = `${u.id}_sisa_${u.date}`;
            data[key] = u.qty; // Overwrite sisa
        }
    });
    
    RBMStorage.setItem(stokKey, JSON.stringify(data));
}

function getRusakDetail(itemId, dateKey) {
    const detailKey = getRbmStorageKey('RBM_STOK_RUSAK_DETAIL');
    const details = safeParse(RBMStorage.getItem(detailKey), {});
    const id = `${itemId}_${dateKey}`;
    return details[id] || null;
}

function showRusakDetailModal(itemId, dateKey, itemName) {
    const detail = getRusakDetail(itemId, dateKey);
    const modal = document.getElementById('rusakDetailModal');
    const titleEl = document.getElementById('rusakDetailModalTitle');
    const bodyEl = document.getElementById('rusakDetailModalBody');
    const imgEl = document.getElementById('rusakDetailModalImg');
    if (!modal || !bodyEl) return;
    if (titleEl) titleEl.textContent = 'Detail Barang Rusak — ' + (itemName || '');
    const tgl = dateKey ? dateKey.split('-').reverse().join('/') : '';
    if (detail) {
        bodyEl.innerHTML = (tgl ? '<p style="margin:0 0 10px; color:#64748b;">Tanggal: ' + tgl + '</p>' : '') +
            (detail.keterangan ? '<p style="margin:0 0 10px; white-space:pre-wrap;">' + (detail.keterangan.replace(/</g,'&lt;').replace(/>/g,'&gt;')) + '</p>' : '<p style="margin:0 0 10px; color:#94a3b8;">Tidak ada keterangan.</p>');
        if (imgEl) {
            if (detail.foto) {
                imgEl.src = detail.foto;
                imgEl.style.display = 'block';
                imgEl.style.maxWidth = '100%';
                imgEl.style.maxHeight = '280px';
                imgEl.style.marginTop = '10px';
                imgEl.style.borderRadius = '8px';
            } else {
                imgEl.src = '';
                imgEl.style.display = 'none';
            }
        }
    } else {
        bodyEl.innerHTML = (tgl ? '<p>Tanggal: ' + tgl + '</p>' : '') + '<p style="color:#94a3b8;">Tidak ada detail keterangan/foto untuk rusak ini.</p>';
        if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
    }
    modal.style.display = 'flex';
}

function closeRusakDetailModal() {
    const modal = document.getElementById('rusakDetailModal');
    if (modal) modal.style.display = 'none';
}

function switchStokTab(tab) {
    activeStokTab = tab;
    document.querySelectorAll('#stok-barang-view .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-stok-${tab}`).classList.add('active');
    renderStokTable();
}

function getStokItems(category) {
    const stokKey = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_STOK_ITEMS') : 'RBM_STOK_ITEMS';
    const allItems = safeParse(RBMStorage.getItem(stokKey), {
        sales: [
            {id:1, name:'Ayam', unit:'Ekor', ratio:1}, 
            {id:2, name:'Saus BBQ', unit:'Pck', ratio:20}
        ],
        fruits: [
            {id:101, name:'Tomat', unit:'Kg', ratio:1},
            {id:102, name:'Selada', unit:'Ikat', ratio:1}
        ],
        notsales: [
            {id:201, name:'Tisu', unit:'Pack', ratio:1},
            {id:202, name:'Sabun Cuci', unit:'Btl', ratio:1}
        ]
    });
    const list = allItems && allItems[category];
    return Array.isArray(list) ? list : [];
}

// Untuk tab Same Item on Sales: gabung item Sales + item Fruits yang belum ada di Sales (nama sama)
function getStokItemsForSalesTab() {
    const sales = getStokItems('sales');
    const fruits = getStokItems('fruits');
    const salesNames = new Set(sales.map(s => s.name.toLowerCase()));
    const fruitsOnly = fruits.filter(f => !salesNames.has(f.name.toLowerCase()));
    return [...sales, ...fruitsOnly];
}

function renderStokTable() {
    const monthVal = document.getElementById("stok_bulan_filter").value;
    if (!monthVal) return;

    const [year, month] = monthVal.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    const items = activeStokTab === 'sales' ? getStokItemsForSalesTab() : getStokItems(activeStokTab);
    const stokKey = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
    const stokData = safeParse(RBMStorage.getItem(stokKey), {});

    const thead = document.getElementById("stok_thead");
    const tbody = document.getElementById("stok_tbody");

    // --- BUILD HEADER ---
    let hRow1 = `<tr>
        <th rowspan="2" style="left:0; z-index:20; min-width:150px;">Nama Barang</th>
        <th rowspan="2" style="left:150px; z-index:20; min-width:60px;">Satuan</th>
        <th rowspan="2" style="min-width:60px;">Awal</th>`;
    
    let hRow2 = `<tr>`;

    // Columns per day based on category
    let colsPerDay = 0;
    let colLabels = [];
    
    if (activeStokTab === 'sales') {
        colsPerDay = 5; // In, Out(Pck), Out(Por), Rusak, Total
        colLabels = ['In', 'Out(Pck)', 'Out(Por)', 'Rusak', 'Total'];
    } else if (activeStokTab === 'fruits') {
        colsPerDay = 6; // In, Out, Finish, Waste, Rusak, Total
        colLabels = ['In', 'Out', 'Finish', 'Waste', 'Rusak', 'Total'];
    } else {
        colsPerDay = 4; // In, Out, Rusak, Total
        colLabels = ['In', 'Out', 'Rusak', 'Total'];
    }

    for (let d = 1; d <= daysInMonth; d++) {
        hRow1 += `<th colspan="${colsPerDay}">${d}</th>`;
        colLabels.forEach(lbl => hRow2 += `<th>${lbl}</th>`);
    }

    // Summary Columns
    hRow1 += `<th colspan="2">Total</th><th rowspan="2">SO Akhir</th></tr>`;
    hRow2 += `<th>In</th><th>Out</th></tr>`;

    thead.innerHTML = hRow1 + hRow2;

    // --- BUILD BODY ---
    const prevMonth = getPreviousMonth(monthVal);
    let bodyHtml = '';
    items.forEach(item => {
        // Stok awal: jika kosong, ambil dari SO Akhir bulan lalu (rollover otomatis)
        let awalVal = getStokValue(stokData, item.id, 'awal', monthVal);
        if (awalVal === '' || awalVal === undefined || awalVal === null) {
            const prevSo = getStokValue(stokData, item.id, 'so_akhir', prevMonth);
            if (prevSo !== '' && prevSo !== undefined && prevSo !== null) {
                awalVal = prevSo;
                updateStokValue(item.id, 'awal', monthVal, prevSo);
            }
        }
        let currentStock = parseFloat(awalVal) || 0;

        // Determine item name color based on source
        let nameColor = '#ffffff';
        if (activeStokTab === 'sales') {
            const fruitItem = getStokItems('fruits').find(f => f.name.toLowerCase() === item.name.toLowerCase());
            nameColor = fruitItem ? '#bfdbfe' : '#d1d5db';
        } else if (activeStokTab === 'fruits') {
            nameColor = '#bfdbfe';
        } else {
            nameColor = '#d1d5db';
        }
        
        let rowHtml = `<tr>
            <td style="position:sticky; left:0; background:${nameColor}; z-index:15; text-align:left; font-weight:bold;">${item.name}</td>
            <td style="position:sticky; left:150px; background:white; z-index:15;">${item.unit}</td>
            <td><input type="number" class="stok-input" value="${awalVal !== '' && awalVal !== undefined ? awalVal : ''}" readonly style="background:#f0f0f0; font-weight:bold;" title="Stok awal = SO akhir bulan lalu (otomatis, tidak bisa diedit)"></td>`;

        let totalIn = 0;
        let totalOut = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${monthVal}-${String(d).padStart(2,'0')}`;
            let valIn = parseFloat(getStokValue(stokData, item.id, `in_${dateKey}`)) || 0;
            const valRusak = parseFloat(getStokValue(stokData, item.id, `rusak_${dateKey}`)) || 0;
            let valOut = 0;
            
            if (activeStokTab === 'sales') {
                // Logic: In comes from Input Barang. 
                // BUT if this item exists in Fruits & Veg (as Finished), In = Finished of Fruits.
                // We check if there is a Fruit item with same name.
                const fruitItem = getStokItems('fruits').find(f => f.name.toLowerCase() === item.name.toLowerCase());
                let isLinked = false;
                if (fruitItem) {
                    const valFinFruit = parseFloat(getStokValue(stokData, fruitItem.id, `fin_${dateKey}`)) || 0;
                    valIn = valFinFruit; // Override In automatically
                    isLinked = true;
                }

                // Out otomatis = (Total kemarin + Masuk) - Sisa. Total = Total kemarin + In - Out - Rusak.
                let valSisaInput = getStokValue(stokData, item.id, `sisa_${dateKey}`);
                let valSisa = valSisaInput !== '' && valSisaInput !== undefined && valSisaInput !== null 
                    ? parseFloat(valSisaInput) 
                    : 0;
                const outEffective = Math.max(0, (currentStock + valIn) - valSisa); // Out = (ttl kemarin + masuk) - sisa
                const valTotal = currentStock + valIn - outEffective - valRusak;
                const valTotalClamped = Math.max(0, valTotal);

                currentStock = valTotalClamped;

                const valOutPor = outEffective * (item.ratio || 1);

                totalIn += valIn;
                totalOut += outEffective;

                // Determine In color based on source
                const inStyle = isLinked 
                    ? 'readonly style="background:#bfdbfe; font-weight:bold;"' 
                    : 'readonly style="background:#d1d5db; font-weight:bold;"';

                if (valSisaInput !== '' && valSisaInput !== undefined && valSisaInput !== null) {
                    updateStokValue(item.id, `sisa_${dateKey}`, monthVal, valSisaInput);
                }

                const rusakCell = valRusak > 0
                    ? `<td style="cursor:pointer; background:#fef3c7; font-weight:bold; padding:6px; text-align:center;" onclick="showRusakDetailModal('${item.id}','${dateKey}','${(item.name||'').replace(/'/g,"\\'")}')" title="Klik untuk lihat keterangan dan foto">${valRusak}</td>`
                    : `<td><input type="number" class="stok-input" value="${valRusak || ''}" readonly style="background:#d1d5db; font-weight:bold;"></td>`;
                rowHtml += `
                    <td><input type="number" class="stok-input" value="${valIn || ''}" ${inStyle} onchange=""></td>
                    <td><input type="number" class="stok-input" id="outpck_${item.id}_${dateKey}" value="${outEffective || ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                    <td><input type="number" class="stok-input" id="outpor_${item.id}_${dateKey}" value="${valOutPor || ''}" readonly style="background:#e5e7eb;"></td>
                    ${rusakCell}
                    <td><input type="number" class="stok-input" id="total_${item.id}_${dateKey}" value="${(valTotalClamped === 0 || valTotalClamped) ? valTotalClamped : ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                `;
            } else if (activeStokTab === 'fruits') {
                const valOut = parseFloat(getStokValue(stokData, item.id, `out_${dateKey}`)) || 0;
                const valFin = getStokValue(stokData, item.id, `fin_${dateKey}`);
                const valWaste = valOut - (parseFloat(valFin)||0);
                
                currentStock = currentStock + valIn - valOut - valRusak;

                totalIn += valIn;
                totalOut += valOut;

                const rusakCellF = valRusak > 0
                    ? `<td style="cursor:pointer; background:#fef3c7; font-weight:bold; padding:6px; text-align:center;" onclick="showRusakDetailModal('${item.id}','${dateKey}','${(item.name||'').replace(/'/g,"\\'")}')" title="Klik untuk lihat keterangan dan foto">${valRusak}</td>`
                    : `<td><input type="number" class="stok-input" value="${valRusak || ''}" readonly style="background:#d1d5db; font-weight:bold;"></td>`;
                rowHtml += `
                    <td><input type="number" class="stok-input" value="${valIn || ''}" readonly style="background:#d1d5db; font-weight:bold;"></td>
                    <td><input type="number" class="stok-input" value="${valOut || ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                    <td><input type="number" class="stok-input" value="${valFin || ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                    <td><input type="number" class="stok-input" id="waste_${item.id}_${dateKey}" value="${valWaste}" readonly style="background:#e5e7eb; font-weight:bold;"></td>
                    ${rusakCellF}
                    <td><input type="number" class="stok-input total-stok-${item.id}" id="total_${item.id}_${dateKey}" value="${(currentStock === 0 || currentStock) ? currentStock : ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                `;
            } else {
                const valOut = parseFloat(getStokValue(stokData, item.id, `out_${dateKey}`)) || 0;
                
                currentStock = currentStock + valIn - valOut - valRusak;

                totalIn += valIn;
                totalOut += valOut;

                const rusakCellN = valRusak > 0
                    ? `<td style="cursor:pointer; background:#fef3c7; font-weight:bold; padding:6px; text-align:center;" onclick="showRusakDetailModal('${item.id}','${dateKey}','${(item.name||'').replace(/'/g,"\\'")}')" title="Klik untuk lihat keterangan dan foto">${valRusak}</td>`
                    : `<td><input type="number" class="stok-input" value="${valRusak || ''}" readonly style="background:#d1d5db; font-weight:bold;"></td>`;
                rowHtml += `
                    <td><input type="number" class="stok-input" value="${valIn || ''}" readonly style="background:#d1d5db; font-weight:bold;"></td>
                    <td><input type="number" class="stok-input" value="${valOut || ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                    ${rusakCellN}
                    <td><input type="number" class="stok-input total-stok-${item.id}" id="total_${item.id}_${dateKey}" value="${(currentStock === 0 || currentStock) ? currentStock : ''}" readonly style="background:#bfdbfe; font-weight:bold;"></td>
                `;
            }
        }

        // Tampilkan SO Akhir: utamakan nilai yang sudah disimpan (hasil edit user); kalau kosong pakai hasil hitung
        let soAkhirDisplay = getStokValue(stokData, item.id, 'so_akhir', monthVal);
        if (soAkhirDisplay === '' || soAkhirDisplay === undefined || soAkhirDisplay === null)
            soAkhirDisplay = currentStock;
        rowHtml += `
            <td style="font-weight:bold; background:#f0f0f0;">${totalIn}</td>
            <td style="font-weight:bold; background:#f0f0f0;">${totalOut}</td>
            <td><input type="number" class="stok-input" id="so_akhir_${item.id}_${monthVal}" value="${soAkhirDisplay}" onchange="updateStokValue('${item.id}', 'so_akhir', '${monthVal}', this.value)" style="width:60px; font-weight:bold;" title="Stok akhir bulan (edit otomatis tersimpan)"></td>
        </tr>`;
        bodyHtml += rowHtml;
    });
    tbody.innerHTML = bodyHtml;
}

function getStokValue(data, itemId, field, monthVal) {
    // Key format: ITEMID_FIELD (e.g., 1_in_2023-10-01)
    // For monthly fields like 'awal', key is 1_awal_2023-10
    let key = '';
    if (field === 'awal' || field === 'so_akhir') {
        key = `${itemId}_${field}_${monthVal}`;
    } else {
        key = `${itemId}_${field}`;
    }
    return data[key] || '';
}

function updateStokValue(itemId, field, monthVal, value) {
    const stokKey = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
    let data = safeParse(RBMStorage.getItem(stokKey), {});
    let key = '';
    if (field === 'awal' || field === 'so_akhir') {
        key = `${itemId}_${field}_${monthVal}`;
    } else {
        key = `${itemId}_${field}`;
    }
    data[key] = value;
    RBMStorage.setItem(stokKey, JSON.stringify(data));
}

function updateStokFruits(itemId, dateKey, monthVal, value, type) {
    // 1. Save changed value
    updateStokValue(itemId, `${type}_${dateKey}`, monthVal, value);
    
    // 2. Recalculate Waste
    const stokKey = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
    const data = safeParse(RBMStorage.getItem(stokKey), {});
    const outVal = parseFloat(data[`${itemId}_out_${dateKey}`]) || 0;
    const finVal = parseFloat(data[`${itemId}_fin_${dateKey}`]) || 0;
    const waste = outVal - finVal;
    
    // 3. Update UI
    const el = document.getElementById(`waste_${itemId}_${dateKey}`);
    if(el) el.value = waste;
    recalculateStokRow(itemId, monthVal);
}

function recalculateStokRow(itemId, monthVal) {
    const stokKey = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
    const stokData = safeParse(RBMStorage.getItem(stokKey), {});
    const items = activeStokTab === 'sales' ? getStokItemsForSalesTab() : getStokItems(activeStokTab);
    const item = items.find(i => String(i.id) === String(itemId));
    if (!item) return;

    const [year, month] = monthVal.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let currentStock = parseFloat(getStokValue(stokData, itemId, 'awal', monthVal)) || 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = `${monthVal}-${String(d).padStart(2,'0')}`;
        let valIn = parseFloat(getStokValue(stokData, itemId, `in_${dateKey}`)) || 0;
        const valRusak = parseFloat(getStokValue(stokData, itemId, `rusak_${dateKey}`)) || 0;
        let valOut = 0;

        if (activeStokTab === 'sales') {
            const fruitItem = getStokItems('fruits').find(f => f.name.toLowerCase() === item.name.toLowerCase());
            if (fruitItem) {
                const valFinFruit = parseFloat(getStokValue(stokData, fruitItem.id, `fin_${dateKey}`)) || 0;
                valIn = valFinFruit;
            }

            // Out otomatis = (Total kemarin + Masuk) - Sisa.
            let valSisaInput = getStokValue(stokData, itemId, `sisa_${dateKey}`);
            let valSisa = valSisaInput !== '' && valSisaInput !== undefined && valSisaInput !== null 
                ? parseFloat(valSisaInput) 
                : 0;
            const outEffective = Math.max(0, (currentStock + valIn) - valSisa);
            let valTotal = currentStock + valIn - outEffective - valRusak;
            if (valTotal < 0) valTotal = 0;
            currentStock = valTotal;

            const elOutPck = document.getElementById(`outpck_${itemId}_${dateKey}`);
            const elOutPor = document.getElementById(`outpor_${itemId}_${dateKey}`);
            const elTotal = document.getElementById(`total_${itemId}_${dateKey}`);
            if (elOutPck) elOutPck.value = (outEffective === 0 || outEffective) ? outEffective : '';
            if (elOutPor) elOutPor.value = (outEffective === 0 || outEffective) ? (outEffective * (item.ratio || 1)) : '';
            if (elTotal) elTotal.value = (valTotal === 0 || valTotal) ? valTotal : '';

        } else {
            valOut = parseFloat(getStokValue(stokData, itemId, `out_${dateKey}`)) || 0;
            currentStock = currentStock + valIn - valOut - valRusak;
            
            const elTotal = document.getElementById(`total_${itemId}_${dateKey}`);
            if (elTotal) elTotal.value = (currentStock === 0 || currentStock) ? currentStock : '';
            
            // If this is a Fruit item, we might need to trigger update on linked Sales item?
            // For simplicity, we assume user refreshes or we'd need complex dependency tracking.
        }
    }
    
    // SO Akhir = stok akhir bulan (total hari terakhir), agar bulan berikutnya stok awal terisi otomatis
    updateStokValue(itemId, 'so_akhir', monthVal, currentStock);
    const elSoAkhir = document.getElementById('so_akhir_' + itemId + '_' + monthVal);
    if (elSoAkhir) elSoAkhir.value = currentStock;
}

function saveStokData() {
    var msg = (window.RBMStorage && window.RBMStorage._useFirebase)
        ? "✅ Data Stok tersimpan ke Firebase."
        : "✅ Data Stok tersimpan di perangkat (Local Storage).";
    alert(msg);
}

function getStokTableForExport() {
    const table = document.getElementById('stok_table');
    const monthVal = document.getElementById('stok_bulan_filter') && document.getElementById('stok_bulan_filter').value;
    if (!table) return { tableEl: null, monthVal: monthVal || '' };
    const clone = table.cloneNode(true);
    clone.querySelectorAll('td').forEach(td => {
        td.removeAttribute('onclick');
        const input = td.querySelector('input');
        if (input) {
            td.textContent = input.value || '';
            td.removeAttribute('style');
            td.style.border = '1px solid #ddd';
            td.style.padding = '4px';
        }
    });
    clone.querySelectorAll('th').forEach(th => {
        th.removeAttribute('onclick');
    });
    return { tableEl: clone, monthVal: monthVal || '' };
}

function exportStokBarangToExcel() {
    const monthVal = document.getElementById('stok_bulan_filter') && document.getElementById('stok_bulan_filter').value;
    if (!monthVal) {
        alert('Pilih Bulan & Tahun terlebih dahulu.');
        return;
    }
    const { tableEl, monthVal: m } = getStokTableForExport();
    if (!tableEl) {
        alert('Tabel stok tidak ditemukan. Klik Tampilkan / pilih bulan.');
        return;
    }
    const label = activeStokTab === 'sales' ? 'Same_Item_on_Sales' : activeStokTab === 'fruits' ? 'Fruits_Vegetables' : 'Same_Item_Not_Sales';
    const fileName = `Stok_Barang_${label}_${m}.xlsx`;
    if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.table_to_sheet(tableEl);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stok ' + label.substring(0, 28));
        XLSX.writeFile(wb, fileName);
    } else {
        const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse;}th,td{border:1px solid #000;padding:4px;}th{background:#1e40af;color:#fff;}</style></head><body><h2>Stok Barang</h2><p>Bulan: ' + m + '</p>' + tableEl.outerHTML + '</body></html>';
        const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.xlsx', '.xls');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function exportStokBarangToPdf() {
    const monthVal = document.getElementById('stok_bulan_filter') && document.getElementById('stok_bulan_filter').value;
    if (!monthVal) {
        alert('Pilih Bulan & Tahun terlebih dahulu.');
        return;
    }
    const { tableEl, monthVal: m } = getStokTableForExport();
    if (!tableEl) {
        alert('Tabel stok tidak ditemukan.');
        return;
    }
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert('Library PDF belum dimuat. Refresh halaman lalu coba lagi.');
        return;
    }
    var origTable = document.getElementById('stok_table');
    var fullTableWidth = (origTable && (origTable.scrollWidth > 0)) ? origTable.scrollWidth + 80 : 8000;
    var fullTableHeight = (origTable && (origTable.scrollHeight > 0)) ? origTable.scrollHeight + 100 : 4000;
    const label = activeStokTab === 'sales' ? 'Same Item on Sales' : activeStokTab === 'fruits' ? 'Fruits & Vegetables' : 'Same Item Not Sales';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:0;top:-99999px;width:' + fullTableWidth + 'px;min-height:' + fullTableHeight + 'px;padding:16px;font-family:Arial,sans-serif;color:#333;font-size:11px;background:#fff;overflow:visible;box-sizing:border-box;';
    wrap.innerHTML = '<h2 style="text-align:center;margin-bottom:4px;">Stok Barang</h2><p class="period" style="text-align:center;margin-top:0;color:#666;">Bulan: ' + m + ' &mdash; ' + label + '</p>' + tableEl.outerHTML;
    var tbl = wrap.querySelector('table');
    tbl.removeAttribute('class');
    tbl.style.borderCollapse = 'collapse';
    tbl.style.width = 'auto';
    tbl.style.tableLayout = 'auto';
    wrap.querySelectorAll('th, td').forEach(function(cell) {
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '4px';
        cell.style.whiteSpace = 'nowrap';
        cell.style.position = 'static';
        cell.style.left = '';
        cell.style.right = '';
        cell.style.zIndex = '';
    });
    wrap.querySelectorAll('th').forEach(function(th) { th.style.background = '#1e40af'; th.style.color = 'white'; });
    tbl.querySelectorAll('thead').forEach(function(thead) { thead.style.display = ''; });
    tbl.querySelectorAll('tbody').forEach(function(tbody) { tbody.style.display = ''; });
    [].forEach.call(tbl.querySelectorAll('tr'), function(tr) {
        var cells = tr.querySelectorAll('th, td');
        if (cells.length > 0) cells[0].style.minWidth = '150px';
        if (cells.length > 1) cells[1].style.minWidth = '60px';
    });
    document.body.appendChild(wrap);
    var tw = tbl.scrollWidth;
    var th = tbl.scrollHeight;
    if (tw > 0) wrap.style.width = (tw + 80) + 'px';
    if (th > 0) wrap.style.minHeight = (th + 120) + 'px';
    var captureScale = (wrap.scrollWidth > 3500 || wrap.scrollHeight > 2500) ? 1 : 2;
    html2canvas(wrap, { scale: captureScale, backgroundColor: '#ffffff' }).then(function(canvas) {
        document.body.removeChild(wrap);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 8;
        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;
        var pxToMm = 25.4 / 96;
        var imgWmm = canvas.width * pxToMm;
        var imgHmm = canvas.height * pxToMm;
        var scale = Math.min(usableW / imgWmm, usableH / imgHmm, 1);
        var drawW = imgWmm * scale;
        var drawH = imgHmm * scale;
        if (drawH <= usableH && drawW <= usableW) {
            doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, drawW, drawH);
        } else {
            var totalH = drawH;
            var drawn = 0;
            while (drawn < totalH) {
                var pageImgH = Math.min(usableH, totalH - drawn);
                var srcY = (drawn / totalH) * canvas.height;
                var srcH = (pageImgH / totalH) * canvas.height;
                var small = document.createElement('canvas');
                small.width = canvas.width;
                small.height = Math.ceil(srcH);
                small.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, small.width, small.height);
                doc.addImage(small.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, drawW, pageImgH);
                drawn += pageImgH;
                if (drawn < totalH) doc.addPage('l');
            }
        }
        doc.save('Stok_Barang_' + (label.replace(/\s+/g, '_')) + '_' + (m || '').replace(/\//g, '-') + '.pdf');
    }).catch(function(err) {
        if (wrap.parentNode) document.body.removeChild(wrap);
        alert('Gagal membuat PDF: ' + (err.message || err));
    });
}

function manageStokItems() {
    const tbody = document.getElementById("stok_item_tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    const items = getStokItems(activeStokTab);
    var tabLabel = activeStokTab === 'sales' ? 'Same Item on Sales' : activeStokTab === 'fruits' ? 'Fruits & Vegetables' : 'Same Item Not Sales';
    var titleEl = document.getElementById("stokItemModalTitle");
    if (titleEl) titleEl.textContent = "Kelola Item Stok (" + tabLabel + ")";
    var subEl = document.getElementById("stokItemModalSub");
    if (subEl) subEl.textContent = "Menambah/hapus item di tab \"" + tabLabel + "\". Setelah tambah, tutup modal dan cek tabel di tab tersebut.";
    items.forEach(function(item, idx) {
        var qtyPorsi = 1;
        if (item.ratio) {
            qtyPorsi = 1 / item.ratio;
            qtyPorsi = Math.round((qtyPorsi + Number.EPSILON) * 100) / 100;
        }
        var actionCell = (window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete()) ? '<button class="btn-small-danger" onclick="removeStokItem(' + idx + ')">x</button>' : '-';
        tbody.innerHTML += "<tr><td>" + item.name + "</td><td>" + item.unit + "</td><td>" + qtyPorsi + "</td><td>" + actionCell + "</td></tr>";
    });
    document.getElementById("stokItemModal").style.display = "flex";
}

function addStokItem() {
    const name = document.getElementById("new_stok_name").value;
    const unit = document.getElementById("new_stok_unit").value;
    const qtyPorsi = parseFloat(document.getElementById("new_stok_qty_porsi").value);
    
    if(!name) { alert("Nama item wajib diisi"); return; }

    let ratio = 1;
    if (qtyPorsi && qtyPorsi > 0) {
        // Jika user mengisi pembagi (misal 70gr), maka ratio = 1/70
        ratio = 1 / qtyPorsi;
    }

    const stokKey = getRbmStorageKey('RBM_STOK_ITEMS');
    const allItems = safeParse(RBMStorage.getItem(stokKey), {sales:[], fruits:[], notsales:[]});
    if (!Array.isArray(allItems[activeStokTab])) allItems[activeStokTab] = [];
    const newId = Date.now();
    allItems[activeStokTab].push({id: newId, name, unit, ratio});
    
    // Jika menambah di Fruits & Vegetables, otomatis tambah ke Same Item on Sales
    if (activeStokTab === 'fruits') {
        if (!Array.isArray(allItems.sales)) allItems.sales = [];
        const exists = allItems.sales.some(i => i.name.toLowerCase() === name.toLowerCase());
        if (!exists) {
            allItems.sales.push({id: newId + 1, name, unit, ratio});
        }
    }
    
    RBMStorage.setItem(stokKey, JSON.stringify(allItems));
    
    document.getElementById("new_stok_name").value = "";
    document.getElementById("new_stok_unit").value = "";
    document.getElementById("new_stok_qty_porsi").value = "";
    manageStokItems(); // Refresh modal
    renderStokTable(); // Refresh table
}

function removeStokItem(idx) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    if(!confirm("Hapus item ini?")) return;
    const stokKey = getRbmStorageKey('RBM_STOK_ITEMS');
    const allItems = safeParse(RBMStorage.getItem(stokKey), {sales:[], fruits:[], notsales:[]});
    if (Array.isArray(allItems[activeStokTab])) allItems[activeStokTab].splice(idx, 1);
    RBMStorage.setItem(stokKey, JSON.stringify(allItems));
    manageStokItems();
    renderStokTable();
}


function triggerStokImport() {
    document.getElementById('importStokInput').click();
}

function processStokImport(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
            alert("File kosong atau format salah.");
            return;
        }

        const stokKey = getRbmStorageKey('RBM_STOK_ITEMS');
        const allItems = safeParse(RBMStorage.getItem(stokKey), {sales:[], fruits:[], notsales:[]});
        if (!Array.isArray(allItems[activeStokTab])) allItems[activeStokTab] = [];
        let count = 0;

        json.forEach(row => {
            const name = row['Nama'] || row['Nama Item'] || row['Name'];
            const unit = row['Satuan'] || row['Unit'];
            const qtyPorsi = row['Qty per Porsi'] || row['Qty/Porsi'] || row['Qty'] || 1;

            if (name && unit) {
                let ratio = 1;
                const qtyVal = parseFloat(qtyPorsi);
                if (qtyVal && qtyVal > 0) ratio = 1 / qtyVal;

                const exists = allItems[activeStokTab].some(i => i.name.toLowerCase() === name.toLowerCase());
                if (!exists) {
                    const newId = Date.now() + Math.floor(Math.random() * 1000) + count;
                    allItems[activeStokTab].push({id: newId, name, unit, ratio});
                    count++;
                }
            }
        });

        RBMStorage.setItem(stokKey, JSON.stringify(allItems));
        alert(`Berhasil mengimpor ${count} item baru.`);
        manageStokItems();
        renderStokTable();
        input.value = '';
    };
    reader.readAsArrayBuffer(file);
}

function exportStokItemsToExcel() {
    const items = getStokItems(activeStokTab);
    if (items.length === 0) { alert("Tidak ada data."); return; }
    const data = items.map(item => {
        let qtyPorsi = 1;
        if (item.ratio) qtyPorsi = Math.round((1 / item.ratio + Number.EPSILON) * 100) / 100;
        return { "Nama": item.name, "Satuan": item.unit, "Qty per Porsi": qtyPorsi };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Items");
    XLSX.writeFile(wb, `Stok_Items_${activeStokTab}.xlsx`);
}

// Global variable to store all riwayat data
let riwayatBarangData = {
    'barang masuk': [],
    'barang keluar': [],
    'sisa': [],
    'rusak': []
};

function loadRiwayatBarang() {
    const start = document.getElementById("riwayat_barang_start").value;
    const end = document.getElementById("riwayat_barang_end").value;
    
    const key = getRbmStorageKey('RBM_PENDING_BARANG');
    const pending = safeParse(RBMStorage.getItem(key), []);
    
    // Reset grouped data
    riwayatBarangData = {
        'barang masuk': [],
        'barang keluar': [],
        'sisa': [],
        'rusak': []
    };
    
    // Group data by jenis
    pending.forEach((submission, parentIdx) => {
        const items = submission.payload || [];
        if (Array.isArray(items)) {
            items.forEach((item, itemIdx) => {
                if (item.tanggal >= start && item.tanggal <= end) {
                    // Normalize jenis to match groupedData keys
                    const jenis = item.jenis.toLowerCase().trim();
                    const groupKey = jenis === 'barang masuk' ? 'barang masuk' :
                                     jenis === 'barang keluar' ? 'barang keluar' :
                                     jenis === 'sisa' ? 'sisa' :
                                     jenis === 'rusak' ? 'rusak' : null;
                    
                    if (groupKey) {
                        riwayatBarangData[groupKey].push({
                            item: item,
                            parentIdx: parentIdx,
                            itemIdx: itemIdx
                        });
                    }
                }
            });
        }
    });
    
    // Display first tab (barang masuk)
    filterRiwayatBarang('barang masuk', document.querySelector('[data-filter="barang masuk"]'));
}

function filterRiwayatBarang(jenis, buttonElement) {
    // Update active button
    document.querySelectorAll('.riwayat-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    buttonElement.classList.add('active');
    
    // Get data for selected jenis
    const items = riwayatBarangData[jenis] || [];
    const container = document.getElementById("riwayat_barang_table_container");
    
    if (items.length === 0) {
        container.innerHTML = '<div class="riwayat-empty">📭 Tidak ada data untuk kategori ini</div>';
        return;
    }
    
    // Define config for each jenis
    const jenisList = {
        'barang masuk': { emoji: '📥', label: 'Barang Masuk', icon: 'Masuk' },
        'barang keluar': { emoji: '📤', label: 'Barang Keluar', icon: 'Keluar' },
        'sisa': { emoji: '📦', label: 'Sisa Stok', icon: 'Sisa' },
        'rusak': { emoji: '⚠️', label: 'Barang Rusak', icon: 'Rusak' }
    };
    
    const config = jenisList[jenis];
    
    let tableHtml = `
        <div style="margin-bottom:10px;">${window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete() ? '<button type="button" class="btn btn-small-danger" onclick="hapusRiwayatBarangYangDitandai()" id="btn_hapus_tandai_riwayat_barang">🗑️ Hapus yang ditandai</button>' : '<span style="color:#64748b;">Hapus data hanya untuk Owner.</span>'}</div>
        <table class="riwayat-data-table">
            <thead>
                <tr>
                    <th style="width:42px;" title="Tandai untuk hapus"><input type="checkbox" id="riwayat_barang_select_all" onclick="toggleRiwayatBarangSelectAll(this)"></th>
                    <th>Tanggal</th>
                    <th>Nama Barang</th>
                    <th>Jumlah</th>
                    <th>Ket / Extra</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    items.forEach(data => {
        const item = data.item;
        let extra = item.barangjadi ? `(Jadi: ${item.barangjadi})` : '';
        if (item.keteranganRusak) extra += ` ${item.keteranganRusak}`;
        
        tableHtml += `
            <tr>
                <td style="text-align:center;"><input type="checkbox" class="riwayat_barang_row_check" data-parent="${data.parentIdx}" data-item="${data.itemIdx}"></td>
                <td>${item.tanggal}</td>
                <td><strong>${item.nama}</strong></td>
                <td class="num"><strong>${item.jumlah}</strong></td>
                <td>${extra}</td>
                <td>${window.rbmOnlyOwnerCanEditDelete && window.rbmOnlyOwnerCanEditDelete() ? '<button class="btn-small-danger" onclick="deleteRiwayatBarang(' + data.parentIdx + ',' + data.itemIdx + ')">Hapus</button>' : '-'}</td>
            </tr>
        `;
    });
    
    tableHtml += `
            </tbody>
        </table>
        <div class="riwayat-count">Total: <strong>${items.length}</strong> item${items.length > 1 ? 's' : ''}</div>
    `;
    
    container.innerHTML = tableHtml;
}

function toggleRiwayatBarangSelectAll(checkbox) {
    document.querySelectorAll('#riwayat_barang_table_container .riwayat_barang_row_check').forEach(cb => {
        cb.checked = !!checkbox.checked;
    });
}

function hapusRiwayatBarangYangDitandai() {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    const checked = document.querySelectorAll('#riwayat_barang_table_container .riwayat_barang_row_check:checked');
    if (!checked.length) {
        alert('Tandai dulu item yang ingin dihapus (centang checkbox).');
        return;
    }
    const selections = Array.from(checked).map(cb => ({ parentIdx: parseInt(cb.dataset.parent, 10), itemIdx: parseInt(cb.dataset.item, 10) }));
    if (!confirm('Hapus ' + selections.length + ' data yang ditandai? Stok akan diperbarui.')) return;
    deleteRiwayatBarangBulk(selections);
}

function deleteRiwayatBarangBulk(selections) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    if (!selections.length) return;
    selections.sort((a, b) => (b.parentIdx - a.parentIdx) || (b.itemIdx - a.itemIdx));
    const key = getRbmStorageKey('RBM_PENDING_BARANG');
    let pending = safeParse(RBMStorage.getItem(key), []);
    const stokKeyBarang = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
    let stokData = safeParse(RBMStorage.getItem(stokKeyBarang), {});

    selections.forEach(({ parentIdx, itemIdx }) => {
        const submission = pending[parentIdx];
        if (!submission || !submission.payload || !submission.payload[itemIdx]) return;
        const p = submission.payload[itemIdx];
        const itemInfo = findStokItemId(p.nama);
        if (itemInfo) {
            const dateKey = p.tanggal;
            const jenis = (p.jenis || '').toLowerCase().trim();
            if (jenis === 'barang masuk') {
                const k = `${itemInfo.id}_in_${dateKey}`;
                stokData[k] = (parseFloat(stokData[k]) || 0) - parseFloat(p.jumlah);
            } else if (jenis === 'barang keluar') {
                const keyOut = `${itemInfo.id}_out_${dateKey}`;
                const keyOutPck = `${itemInfo.id}_outpck_${dateKey}`;
                stokData[keyOut] = (parseFloat(stokData[keyOut]) || 0) - parseFloat(p.jumlah);
                stokData[keyOutPck] = (parseFloat(stokData[keyOutPck]) || 0) - parseFloat(p.jumlah);
                if (p.barangjadi) {
                    const keyFin = `${itemInfo.id}_fin_${dateKey}`;
                    stokData[keyFin] = (parseFloat(stokData[keyFin]) || 0) - parseFloat(p.barangjadi);
                }
            } else if (jenis === 'rusak') {
                const k = `${itemInfo.id}_rusak_${dateKey}`;
                stokData[k] = (parseFloat(stokData[k]) || 0) - parseFloat(p.jumlah);
            } else if (jenis === 'sisa') {
                delete stokData[`${itemInfo.id}_sisa_${dateKey}`];
            }
        }
        submission.payload.splice(itemIdx, 1);
    });

    pending = pending.filter(s => s && s.payload && s.payload.length > 0);
    RBMStorage.setItem(stokKeyBarang, JSON.stringify(stokData));
    RBMStorage.setItem(key, JSON.stringify(pending));

    const start = document.getElementById("riwayat_barang_start") && document.getElementById("riwayat_barang_start").value;
    const end = document.getElementById("riwayat_barang_end") && document.getElementById("riwayat_barang_end").value;
    riwayatBarangData = { 'barang masuk': [], 'barang keluar': [], 'sisa': [], 'rusak': [] };
    pending.forEach((submission, parentIdx) => {
        const items = submission.payload || [];
        if (Array.isArray(items)) {
            items.forEach((item, itemIdx) => {
                if (item.tanggal >= start && item.tanggal <= end) {
                    const jenis = (item.jenis || '').toLowerCase().trim();
                    const groupKey = jenis === 'barang masuk' ? 'barang masuk' : jenis === 'barang keluar' ? 'barang keluar' : jenis === 'sisa' ? 'sisa' : jenis === 'rusak' ? 'rusak' : null;
                    if (groupKey) riwayatBarangData[groupKey].push({ item: item, parentIdx: parentIdx, itemIdx: itemIdx });
                }
            });
        }
    });
    const activeBtn = document.querySelector('.riwayat-filter-btn.active');
    if (activeBtn) filterRiwayatBarang(activeBtn.dataset.filter, activeBtn);
}

function deleteRiwayatBarang(parentIdx, itemIdx) {
    if (window.rbmOnlyOwnerCanEditDelete && !window.rbmOnlyOwnerCanEditDelete()) { alert('Hanya Owner yang dapat menghapus data.'); return; }
    if(!confirm("Hapus data ini? Stok akan diperbarui.")) return;
    
    const key = getRbmStorageKey('RBM_PENDING_BARANG');
    const pending = safeParse(RBMStorage.getItem(key), []);
    const submission = pending[parentIdx];
    if (!submission || !submission.payload || !submission.payload[itemIdx]) return;
    
    const p = submission.payload[itemIdx];
    const itemInfo = findStokItemId(p.nama);
    
    if (itemInfo) {
        const stokKeyBarang = getRbmStorageKey('RBM_STOK_TRANSACTIONS');
        let stokData = safeParse(RBMStorage.getItem(stokKeyBarang), {});
        const dateKey = p.tanggal;
        const jenis = p.jenis.toLowerCase().trim();
        
        if (jenis === 'barang masuk') {
            const key = `${itemInfo.id}_in_${dateKey}`;
            stokData[key] = (parseFloat(stokData[key]) || 0) - parseFloat(p.jumlah);
        } else if (jenis === 'barang keluar') {
            const keyOut = `${itemInfo.id}_out_${dateKey}`;
            const keyOutPck = `${itemInfo.id}_outpck_${dateKey}`;
            stokData[keyOut] = (parseFloat(stokData[keyOut]) || 0) - parseFloat(p.jumlah);
            stokData[keyOutPck] = (parseFloat(stokData[keyOutPck]) || 0) - parseFloat(p.jumlah);
            if (p.barangjadi) {
                const keyFin = `${itemInfo.id}_fin_${dateKey}`;
                stokData[keyFin] = (parseFloat(stokData[keyFin]) || 0) - parseFloat(p.barangjadi);
            }
        } else if (jenis === 'rusak') {
            const key = `${itemInfo.id}_rusak_${dateKey}`;
            stokData[key] = (parseFloat(stokData[key]) || 0) - parseFloat(p.jumlah);
        } else if (jenis === 'sisa') {
            const key = `${itemInfo.id}_sisa_${dateKey}`;
            delete stokData[key];
        }
        RBMStorage.setItem(stokKeyBarang, JSON.stringify(stokData));
    }
    
    submission.payload.splice(itemIdx, 1);
    if (submission.payload.length === 0) pending.splice(parentIdx, 1);
    
    RBMStorage.setItem(key, JSON.stringify(pending));
    
    // Reload data and keep current filter active
    const start = document.getElementById("riwayat_barang_start").value;
    const end = document.getElementById("riwayat_barang_end").value;
    
    const pendingData = safeParse(RBMStorage.getItem(key), []);
    
    // Reset grouped data
    riwayatBarangData = {
        'barang masuk': [],
        'barang keluar': [],
        'sisa': [],
        'rusak': []
    };
    
    // Group data by jenis
    pendingData.forEach((submission, parentIdx) => {
        const items = submission.payload || [];
        if (Array.isArray(items)) {
            items.forEach((item, itemIdx) => {
                if (item.tanggal >= start && item.tanggal <= end) {
                    const jenis = item.jenis.toLowerCase().trim();
                    const groupKey = jenis === 'barang masuk' ? 'barang masuk' :
                                     jenis === 'barang keluar' ? 'barang keluar' :
                                     jenis === 'sisa' ? 'sisa' :
                                     jenis === 'rusak' ? 'rusak' : null;
                    
                    if (groupKey) {
                        riwayatBarangData[groupKey].push({
                            item: item,
                            parentIdx: parentIdx,
                            itemIdx: itemIdx
                        });
                    }
                }
            });
        }
    });
    
    // Refresh current active filter
    const activeBtn = document.querySelector('.riwayat-filter-btn.active');
    if (activeBtn) {
        const jenis = activeBtn.getAttribute('data-filter');
        filterRiwayatBarang(jenis, activeBtn);
    }
}

function getRiwayatBarangDataForExport() {
    const start = document.getElementById("riwayat_barang_start") && document.getElementById("riwayat_barang_start").value;
    const end = document.getElementById("riwayat_barang_end") && document.getElementById("riwayat_barang_end").value;
    const rows = [];
    ['barang masuk', 'barang keluar', 'sisa', 'rusak'].forEach(jenis => {
        (riwayatBarangData[jenis] || []).forEach(({ item }) => {
            let ket = item.barangjadi ? `Jadi: ${item.barangjadi}` : '';
            if (item.keteranganRusak) ket += (ket ? ' | ' : '') + item.keteranganRusak;
            rows.push({
                Tanggal: item.tanggal,
                Jenis: jenis,
                'Nama Barang': item.nama,
                Jumlah: item.jumlah,
                Keterangan: ket || ''
            });
        });
    });
    return { rows, tglAwal: start || '', tglAkhir: end || '' };
}

function exportRiwayatBarangToExcel() {
    const { rows, tglAwal, tglAkhir } = getRiwayatBarangDataForExport();
    if (rows.length === 0) {
        alert('Tidak ada data untuk di-export. Pilih periode lalu klik Tampilkan terlebih dahulu.');
        return;
    }
    if (typeof XLSX !== 'undefined') {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Barang');
        XLSX.writeFile(wb, `Riwayat_Barang_${tglAwal || 'start'}_${tglAkhir || 'end'}.xlsx`);
    } else {
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse;}th,td{border:1px solid #000;padding:6px;}th{background:#1e40af;color:#fff;}</style></head><body><h2>Riwayat Input Barang</h2><p>Periode: ${tglAwal} s/d ${tglAkhir}</p><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nama Barang</th><th>Jumlah</th><th>Keterangan</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.Tanggal}</td><td>${r.Jenis}</td><td>${r['Nama Barang']}</td><td>${r.Jumlah}</td><td>${r.Keterangan}</td></tr>`).join('')}</tbody></table></body></html>`;
        const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Riwayat_Barang_${tglAwal || 'start'}_${tglAkhir || 'end'}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function exportRiwayatBarangToPdf() {
    const { rows, tglAwal, tglAkhir } = getRiwayatBarangDataForExport();
    if (rows.length === 0) {
        alert('Tidak ada data untuk dicetak/PDF. Pilih periode lalu klik Tampilkan terlebih dahulu.');
        return;
    }
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        alert('Library PDF belum dimuat. Refresh halaman lalu coba lagi.');
        return;
    }
    const tableRows = rows.map(r => `<tr><td>${r.Tanggal}</td><td>${r.Jenis}</td><td>${r['Nama Barang']}</td><td>${r.Jumlah}</td><td>${r.Keterangan}</td></tr>`).join('');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;top:0;width:900px;padding:20px;font-family:Arial,sans-serif;color:#333;font-size:12px;background:#fff;';
    wrap.innerHTML = '<h2 style="text-align:center;margin-bottom:5px;">Riwayat Input Barang</h2><p class="period" style="text-align:center;margin-top:0;color:#666;">Periode: ' + tglAwal + ' s/d ' + tglAkhir + '</p><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="border:1px solid #ddd;padding:8px;background:#1e40af;color:white;">Tanggal</th><th style="border:1px solid #ddd;padding:8px;background:#1e40af;color:white;">Jenis</th><th style="border:1px solid #ddd;padding:8px;background:#1e40af;color:white;">Nama Barang</th><th style="border:1px solid #ddd;padding:8px;background:#1e40af;color:white;">Jumlah</th><th style="border:1px solid #ddd;padding:8px;background:#1e40af;color:white;">Keterangan</th></tr></thead><tbody>' + tableRows + '</tbody></table>';
    wrap.querySelectorAll('td').forEach(function(td) { td.style.border = '1px solid #ddd'; td.style.padding = '8px'; });
    document.body.appendChild(wrap);
    html2canvas(wrap, { scale: 2, backgroundColor: '#ffffff' }).then(function(canvas) {
        document.body.removeChild(wrap);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 10;
        const w = pageW - margin * 2;
        const h = (canvas.height * w) / canvas.width;
        if (h <= pageH - margin * 2) {
            doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, w, h);
        } else {
            var totalH = h;
            var drawn = 0;
            while (drawn < totalH) {
                var pageImgH = Math.min(pageH - margin * 2, totalH - drawn);
                var srcY = (drawn / totalH) * canvas.height;
                var srcH = (pageImgH / totalH) * canvas.height;
                var small = document.createElement('canvas');
                small.width = canvas.width;
                small.height = Math.ceil(srcH);
                small.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, small.width, small.height);
                doc.addImage(small.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, w, pageImgH);
                drawn += pageImgH;
                if (drawn < totalH) doc.addPage();
            }
        }
        doc.save('Riwayat_Barang_' + (tglAwal || 'start').replace(/-/g, '') + '_' + (tglAkhir || 'end').replace(/-/g, '') + '.pdf');
    }).catch(function(err) {
        document.body.removeChild(wrap);
        alert('Gagal membuat PDF: ' + (err.message || err));
    });
}

// ================= ABSENSI GPS LOGIC =================
let gpsStream = null;
let gpsWatchId = null;
let currentPos = null;

function getOfficeConfigFromStorage() {
    var outletId = typeof getRbmOutlet === 'function' ? getRbmOutlet() : '';
    if (outletId) {
        try {
            var locs = JSON.parse(localStorage.getItem('rbm_outlet_locations') || '{}');
            var loc = locs[outletId];
            if (loc && (loc.lat != null || loc.lon != null)) {
                return {
                    lat: String(loc.lat != null ? loc.lat : ''),
                    lng: String(loc.lon != null ? loc.lon : ''),
                    radius: (loc.radius != null && loc.radius >= 0) ? loc.radius : 50
                };
            }
        } catch (e) {}
    }
    var key = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_GPS_CONFIG') : 'RBM_GPS_CONFIG';
    return safeParse(RBMStorage.getItem(key), { lat: '', lng: '', radius: 50 });
}

function loadOfficeConfig() {
    var config = getOfficeConfigFromStorage();
    var latEl = document.getElementById('gps_office_lat');
    var lngEl = document.getElementById('gps_office_lng');
    var radEl = document.getElementById('gps_office_radius');
    if (latEl) latEl.value = config.lat;
    if (lngEl) lngEl.value = config.lng;
    if (radEl) radEl.value = config.radius;
}

function saveOfficeConfig() {
    var latEl = document.getElementById('gps_office_lat');
    var lngEl = document.getElementById('gps_office_lng');
    var radEl = document.getElementById('gps_office_radius');
    if (!latEl || !lngEl || !radEl) return;
    var lat = latEl.value;
    var lng = lngEl.value;
    var radius = radEl.value;
    var key = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_GPS_CONFIG') : 'RBM_GPS_CONFIG';
    RBMStorage.setItem(key, JSON.stringify({ lat: lat, lng: lng, radius: radius }));
    alert("Konfigurasi Lokasi Disimpan!");
    if (typeof checkDistance === 'function') checkDistance();
}

function setCurrentLocationAsOffice() {
    var latEl = document.getElementById('gps_office_lat');
    var lngEl = document.getElementById('gps_office_lng');
    if (!latEl || !lngEl) return;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (pos) {
            latEl.value = pos.coords.latitude;
            lngEl.value = pos.coords.longitude;
        }, function (err) { alert("Gagal ambil lokasi: " + err.message); });
    } else {
        alert("Geolocation tidak didukung browser ini.");
    }
}

var RBM_GPS_JAM_DEFAULTS = {
    jamMasukPagi: '08:30', jamPulangPagi: '17:00',
    jamMasukMiddle: '12:30', jamPulangMiddle: '21:00',
    jamMasukSore: '16:30', jamPulangSore: '17:00',
    durasiIstirahatPagi: 60,
    durasiIstirahatMiddle: 60,
    durasiIstirahatSore: 60,
    menitTelatPerJamGaji: 10
};

var RBM_GPS_SHIFTS_DEFAULT = [
    { code: 'P', name: 'Pagi', jamMasuk: '08:30', jamPulang: '17:00', durasiIstirahat: 60 },
    { code: 'M', name: 'Middle', jamMasuk: '12:30', jamPulang: '21:00', durasiIstirahat: 60 },
    { code: 'S', name: 'Sore', jamMasuk: '16:30', jamPulang: '17:00', durasiIstirahat: 60 }
];

function getGpsJamConfig() {
    var key = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_GPS_JAM_CONFIG') : 'RBM_GPS_JAM_CONFIG';
    var stored = safeParse(RBMStorage.getItem(key), {});
    if (stored.shifts && Array.isArray(stored.shifts) && stored.shifts.length > 0) {
        return {
            shifts: stored.shifts,
            menitTelatPerJamGaji: typeof stored.menitTelatPerJamGaji === 'number' ? stored.menitTelatPerJamGaji : (parseInt(stored.menitTelatPerJamGaji, 10) || 10)
        };
    }
    var num = function(v, def) { var n = parseInt(v, 10); return (n >= 0 && n <= 999) ? n : def; };
    return {
        shifts: null,
        jamMasukPagi: stored.jamMasukPagi || RBM_GPS_JAM_DEFAULTS.jamMasukPagi,
        jamPulangPagi: stored.jamPulangPagi || RBM_GPS_JAM_DEFAULTS.jamPulangPagi,
        jamMasukMiddle: stored.jamMasukMiddle || RBM_GPS_JAM_DEFAULTS.jamMasukMiddle,
        jamPulangMiddle: stored.jamPulangMiddle || RBM_GPS_JAM_DEFAULTS.jamPulangMiddle,
        jamMasukSore: stored.jamMasukSore || RBM_GPS_JAM_DEFAULTS.jamMasukSore,
        jamPulangSore: stored.jamPulangSore || RBM_GPS_JAM_DEFAULTS.jamPulangSore,
        durasiIstirahatPagi: num(stored.durasiIstirahatPagi, RBM_GPS_JAM_DEFAULTS.durasiIstirahatPagi),
        durasiIstirahatMiddle: num(stored.durasiIstirahatMiddle, RBM_GPS_JAM_DEFAULTS.durasiIstirahatMiddle),
        durasiIstirahatSore: num(stored.durasiIstirahatSore, RBM_GPS_JAM_DEFAULTS.durasiIstirahatSore),
        menitTelatPerJamGaji: typeof stored.menitTelatPerJamGaji === 'number' ? stored.menitTelatPerJamGaji : (parseInt(stored.menitTelatPerJamGaji, 10) || 10)
    };
}

function getShiftByCodeFromConfig(shiftCode) {
    var c = getGpsJamConfig();
    if (c.shifts && Array.isArray(c.shifts)) {
        for (var i = 0; i < c.shifts.length; i++) {
            if (c.shifts[i].code === shiftCode) return c.shifts[i];
        }
        return null;
    }
    return null;
}

function getJadwalLabelFromConfig(shiftCode) {
    var s = getShiftByCodeFromConfig(shiftCode);
    if (s && s.name) return s.name;
    return (typeof JADWAL_LABEL !== 'undefined' && JADWAL_LABEL[shiftCode]) ? JADWAL_LABEL[shiftCode] : (shiftCode || '');
}

function getDurasiIstirahatMenitFromConfig(shift) {
    var s = getShiftByCodeFromConfig(shift);
    if (s && s.durasiIstirahat != null) return parseInt(s.durasiIstirahat, 10) || 60;
    var c = getGpsJamConfig();
    if (c.shifts) return 60;
    if (shift === 'P') return c.durasiIstirahatPagi;
    if (shift === 'M') return c.durasiIstirahatMiddle;
    if (shift === 'S') return c.durasiIstirahatSore;
    return 60;
}

function getBatasMasukFromConfig(shift) {
    var s = getShiftByCodeFromConfig(shift);
    if (s && s.jamMasuk) return s.jamMasuk;
    var c = getGpsJamConfig();
    if (c.shifts) return '';
    if (shift === 'P') return c.jamMasukPagi;
    if (shift === 'M') return c.jamMasukMiddle;
    if (shift === 'S') return c.jamMasukSore;
    return (typeof JADWAL_BATAS_MASUK !== 'undefined' && JADWAL_BATAS_MASUK[shift]) ? JADWAL_BATAS_MASUK[shift] : '';
}

function getBatasPulangFromConfig(shift) {
    var s = getShiftByCodeFromConfig(shift);
    if (s && s.jamPulang) return s.jamPulang;
    var c = getGpsJamConfig();
    if (c.shifts) return '';
    if (shift === 'P') return c.jamPulangPagi;
    if (shift === 'M') return c.jamPulangMiddle;
    if (shift === 'S') return c.jamPulangSore;
    return (typeof JADWAL_BATAS_PULANG !== 'undefined' && JADWAL_BATAS_PULANG[shift]) ? JADWAL_BATAS_PULANG[shift] : '';
}

function getMenitTelatPerJamGajiFromConfig() {
    return getGpsJamConfig().menitTelatPerJamGaji;
}

function addGpsShiftRow(shift) {
    var tbody = document.getElementById('gps_shifts_tbody');
    if (!tbody) return;
    var row = document.createElement('tr');
    var s = shift || { code: '', name: '', jamMasuk: '08:00', jamPulang: '17:00', durasiIstirahat: 60 };
    row.innerHTML =
        '<td><input type="text" class="gps-shift-code" placeholder="P" value="' + (s.code || '').replace(/"/g, '&quot;') + '" style="width:100%; max-width:60px;" maxlength="8"></td>' +
        '<td><input type="text" class="gps-shift-name" placeholder="Nama shift" value="' + (s.name || '').replace(/"/g, '&quot;') + '" style="width:100%;"></td>' +
        '<td><input type="time" class="gps-shift-masuk" value="' + (s.jamMasuk || '08:00') + '" style="width:100%;"></td>' +
        '<td><input type="time" class="gps-shift-pulang" value="' + (s.jamPulang || '17:00') + '" style="width:100%;"></td>' +
        '<td><input type="number" class="gps-shift-istirahat" value="' + (s.durasiIstirahat != null ? s.durasiIstirahat : 60) + '" min="0" max="999" style="width:70px;"></td>' +
        '<td><button type="button" class="btn-secondary" onclick="this.closest(\'tr\').remove()" style="padding:2px 6px; font-size:11px;">Hapus</button></td>';
    tbody.appendChild(row);
}

function loadJamConfig() {
    var key = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_GPS_JAM_CONFIG') : 'RBM_GPS_JAM_CONFIG';
    var stored = safeParse(RBMStorage.getItem(key), {});
    var tbody = document.getElementById('gps_shifts_tbody');
    if (tbody) {
        tbody.innerHTML = '';
        var shifts = stored.shifts && Array.isArray(stored.shifts) && stored.shifts.length > 0
            ? stored.shifts
            : RBM_GPS_SHIFTS_DEFAULT;
        for (var i = 0; i < shifts.length; i++) addGpsShiftRow(shifts[i]);
    }
    var menitEl = document.getElementById('gps_menit_telat_per_jam');
    if (menitEl) menitEl.value = (typeof stored.menitTelatPerJamGaji === 'number' ? stored.menitTelatPerJamGaji : (parseInt(stored.menitTelatPerJamGaji, 10) || 10));
}

function saveJamConfig() {
    var tbody = document.getElementById('gps_shifts_tbody');
    var shifts = [];
    if (tbody) {
        var rows = tbody.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var code = (r.querySelector('.gps-shift-code') && r.querySelector('.gps-shift-code').value || '').trim();
            var name = (r.querySelector('.gps-shift-name') && r.querySelector('.gps-shift-name').value || '').trim();
            var jamMasuk = r.querySelector('.gps-shift-masuk') && r.querySelector('.gps-shift-masuk').value;
            var jamPulang = r.querySelector('.gps-shift-pulang') && r.querySelector('.gps-shift-pulang').value;
            var durasi = parseInt(r.querySelector('.gps-shift-istirahat') && r.querySelector('.gps-shift-istirahat').value, 10);
            if (!code) continue;
            shifts.push({
                code: code,
                name: name || code,
                jamMasuk: jamMasuk || '08:00',
                jamPulang: jamPulang || '17:00',
                durasiIstirahat: (durasi >= 0 && durasi <= 999) ? durasi : 60
            });
        }
    }
    if (shifts.length === 0) shifts = RBM_GPS_SHIFTS_DEFAULT;
    var menitTelatPerJamGaji = parseInt(document.getElementById('gps_menit_telat_per_jam') && document.getElementById('gps_menit_telat_per_jam').value, 10) || 10;
    var key = typeof getRbmStorageKey === 'function' ? getRbmStorageKey('RBM_GPS_JAM_CONFIG') : 'RBM_GPS_JAM_CONFIG';
    var p = RBMStorage.setItem(key, JSON.stringify({ shifts: shifts, menitTelatPerJamGaji: menitTelatPerJamGaji }));
    if (p && typeof p.then === 'function') {
        p.then(function() { alert("Pengaturan Jam Disimpan!"); }).catch(function(err) { alert("Gagal menyimpan: " + (err && err.message ? err.message : 'periksa koneksi')); });
    } else {
        alert("Pengaturan Jam Disimpan!");
    }
}

function initAbsensiGPS() {
    // Fungsi ini dipanggil setelah DB siap, jadi kita panggil lagi untuk me-refresh data.
    // UI awal (nama karyawan) sudah di-load dari cache di bawah.
    populateGpsNames();
    loadOfficeConfig();
    if (typeof loadJamConfig === 'function') loadJamConfig();
    initAbsensiHardware(); // Panggil lagi untuk memastikan, tidak akan jalan ganda
}

function populateGpsNames() {
    const select = document.getElementById('gps_absen_name');
    if (!select) return;
    const currentValue = select.value;

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    employees.forEach(emp => {
        select.innerHTML += `<option value="${emp.name}">${emp.name}</option>`;
    });
    if (Array.from(select.options).some(opt => opt.value === currentValue)) {
        select.value = currentValue;
    }
    if (!select.onchange) select.onchange = function() { updateGpsJadwalDisplay(); };
    updateGpsJadwalDisplay();
}

function initAbsensiHardware() {
    if (window._gpsHardwareStarted) return; // Cegah double init
    window._gpsHardwareStarted = true;

    // [FIX] Bersihkan pencarian lokasi sebelumnya
    if (typeof gpsWatchId !== 'undefined' && gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }

    // Start Camera
    const video = document.getElementById('gps_video');
    if (video && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
            gpsStream = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            var msg = (err && err.name === 'NotAllowedError') ? "Izin kamera ditolak atau ditutup" : "Kamera tidak tersedia";
            var el = document.getElementById('gps_status_overlay');
            if (el) el.innerText = msg;
        });
    }

    // Start GPS Watch
    if (navigator.geolocation) {
        // [OPTIMASI] Tambahkan timeout 20 detik & maximumAge 0
        // Ini memaksa browser untuk tidak menunggu selamanya jika sinyal susah
        var geoOptions = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

        gpsWatchId = navigator.geolocation.watchPosition(
            pos => {
                currentPos = pos.coords;
                checkDistance();
            },
            err => {
                var msg = "GPS Error: " + err.message;
                if (err.code === 1) msg = "❌ Izin Lokasi Ditolak. Mohon izinkan di pengaturan browser.";
                else if (err.code === 2) msg = "❌ Lokasi tidak tersedia. Pastikan GPS aktif.";
                else if (err.code === 3) msg = "⚠️ Sinyal GPS Lemah (Timeout). Coba geser ke area terbuka.";
                
                var el = document.getElementById('gps_status_overlay');
                if(el) el.innerHTML = msg + " <button class='btn-secondary' style='padding:2px 6px; font-size:10px; margin-left:5px;' onclick='window._gpsHardwareStarted=false; initAbsensiHardware()'>Ulangi</button>";
            },
            geoOptions
        );
    } else {
        var el = document.getElementById('gps_status_overlay');
        if(el) el.innerText = "Browser tidak support GPS";
    }
}

// Stop camera/gps when leaving view (optional optimization)

function checkDistance() {
    var latEl = document.getElementById('gps_office_lat');
    var lngEl = document.getElementById('gps_office_lng');
    var radEl = document.getElementById('gps_office_radius');
    var officeLat, officeLng, maxRadius;
    if (latEl && lngEl && radEl) {
        officeLat = parseFloat(latEl.value);
        officeLng = parseFloat(lngEl.value);
        maxRadius = parseFloat(radEl.value) || 50;
    } else {
        var config = getOfficeConfigFromStorage();
        officeLat = parseFloat(config.lat);
        officeLng = parseFloat(config.lng);
        maxRadius = parseFloat(config.radius) || 50;
    }

    var statusEl = document.getElementById('gps_status_overlay');
    var infoEl = document.getElementById('gps_distance_info');
    if (!statusEl || !infoEl) return;

    if (!currentPos || isNaN(officeLat) || isNaN(officeLng)) {
        statusEl.innerText = "Menunggu Konfigurasi / Sinyal GPS...";
        return;
    }

    var dist = getDistanceFromLatLonInM(currentPos.latitude, currentPos.longitude, officeLat, officeLng);
    var distStr = Math.round(dist);

    var infoText = "Jarak ke titik: " + distStr + " Meter (Max: " + maxRadius + "m)";
    infoEl.innerText = infoText;

    var inRange = dist <= maxRadius;

    if (inRange) {
        statusEl.innerText = "✅ Dalam Area Absensi";
        statusEl.style.background = "rgba(25, 135, 84, 0.7)";
    } else {
        statusEl.innerText = "❌ Di Luar Area Absensi";
        statusEl.style.background = "rgba(220, 53, 69, 0.7)";
    }

    // Logic Kunci Tombol berdasarkan Status Absensi
    var nameEl = document.getElementById('gps_absen_name');
    var name = nameEl ? nameEl.value : '';
    
    var disableAll = !inRange || !name;
    var statusMsg = "";

    if (name) {
        var gpsKey = getRbmStorageKey('RBM_GPS_LOGS');
        var logs = safeParse(RBMStorage.getItem(gpsKey), []);
        var now = new Date();
        var today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
        
        var todayLogs = logs.filter(function(l) { return l.name === name && l.date === today; });
        var hasMasuk = todayLogs.some(function(l) { return l.type === 'Masuk'; });
        var hasPulang = todayLogs.some(function(l) { return l.type === 'Pulang'; });

        if (hasPulang) {
            statusMsg = "Sudah Absen Pulang Hari Ini";
        } else if (hasMasuk) {
            statusMsg = "Sudah Absen Masuk";
            var breaks = todayLogs.filter(function(l) { return l.type === 'Istirahat Keluar' || l.type === 'Istirahat Kembali'; });
            var lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;
            if (lastBreak && lastBreak.type === 'Istirahat Keluar') {
                statusMsg += " (Sedang Istirahat)";
            } else {
            }
        } else {
            statusMsg = "Belum Absen Masuk";
        }
    }

    if (statusMsg) {
        infoEl.innerHTML = infoText + "<br><div style='margin-top:6px; font-weight:bold; color:#1e40af; background:#dbeafe; padding:6px 12px; border-radius:6px; display:inline-block; font-size:13px;'>" + statusMsg + "</div>";
    } else {
        infoEl.innerText = infoText;
    }

    var btnM = document.getElementById('btn_absen_masuk');
    var btnP = document.getElementById('btn_absen_pulang');
    var btnBO = document.getElementById('btn_absen_break_out');
    var btnBI = document.getElementById('btn_absen_break_in');

    if (btnM) btnM.disabled = disableAll;
    if (btnP) btnP.disabled = disableAll;
    if (btnBO) btnBO.disabled = disableAll;
    if (btnBI) btnBI.disabled = disableAll;
}

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    var R = 6371000; // Radius of the earth in m
    var dLat = deg2rad(lat2-lat1);
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in m
    return d;
}

function deg2rad(deg) { return deg * (Math.PI/180); }

function getBreakStats(logs, name, date) {
    let total = 0;
    let lastOut = null;
    logs.forEach(l => {
        if (l.name === name && l.date === date) {
            if (l.type === 'Istirahat Keluar') {
                lastOut = parseTimeToMinutes(l.time);
            } else if (l.type === 'Istirahat Kembali') {
                if (lastOut !== null) {
                    let inTime = parseTimeToMinutes(l.time);
                    let dur = inTime - lastOut;
                    if (dur < 0) dur += 24 * 60;
                    total += dur;
                    lastOut = null;
                }
            }
        }
    });
    return { total, lastOut };
}

function loadRekapAbsensiGPS() {
    const tglAwal = document.getElementById("rekap_gps_start").value;
    const tglAkhir = document.getElementById("rekap_gps_end").value;
    const filterNama = document.getElementById("rekap_gps_filter_nama").value;
    const tbody = document.getElementById("rekap_gps_tbody");

    // [NEW] Cek status tombol mata (Tampilkan/Sembunyikan baris kosong)
    const showEmpty = localStorage.getItem('RBM_SHOW_EMPTY_ABSENSI') !== '0';
    const toggleBtn = document.getElementById('toggle-empty-rows-btn');
    if (toggleBtn) {
        toggleBtn.innerHTML = showEmpty ? '👁️' : '🙈';
        toggleBtn.title = showEmpty ? 'Sembunyikan yang belum absen' : 'Tampilkan yang belum absen';
        toggleBtn.style.opacity = showEmpty ? '1' : '0.7';
    }

    // Ambil Data
    const logs = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_GPS_LOGS')), []);
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});

    let filtered = logs.filter(l => l.date >= tglAwal && l.date <= tglAkhir);

    // Generate Range Tanggal
    const dates = [];
    let curr = new Date(tglAwal);
    const end = new Date(tglAkhir);
    while (curr <= end) {
        dates.push(new Date(curr).toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }

    // Grouping: Inisialisasi slot untuk SEMUA karyawan di SEMUA tanggal
    const grouped = {};
    dates.forEach(d => {
        employees.forEach(emp => {
            const key = `${d}_${emp.name}`;
            grouped[key] = { date: d, name: emp.name, masuk: null, breakOuts: [], breakIns: [], pulang: null, hasLog: false };
        });
    });

    // Isi dengan data Log yang ada
    filtered.forEach(log => {
        const key = `${log.date}_${log.name}`;
        // Jika ada log dari nama yg tidak ada di master karyawan, tetap buat entry
        if (!grouped[key]) {
            grouped[key] = { date: log.date, name: log.name, masuk: null, breakOuts: [], breakIns: [], pulang: null, hasLog: true };
        }
        grouped[key].hasLog = true;

        if (log.type === 'Masuk' && !grouped[key].masuk) grouped[key].masuk = log;
        else if (log.type === 'Pulang') grouped[key].pulang = log;
        else if (log.type === 'Istirahat Keluar') grouped[key].breakOuts.push(log);
        else if (log.type === 'Istirahat Kembali') grouped[key].breakIns.push(log);
    });

    const canDelete = window.rbmOnlyOwnerCanEditDelete && (window.rbmOnlyOwnerCanEditDelete() || (JSON.parse(localStorage.getItem('rbm_user')||'{}').username||'').toLowerCase() === 'burhan');

    // Filter & Sort Keys
    let keys = Object.keys(grouped);
    if (filterNama) keys = keys.filter(k => grouped[k].name === filterNama);
    
    keys.sort((a, b) => {
        if (grouped[a].date !== grouped[b].date) return grouped[b].date.localeCompare(grouped[a].date); // Tanggal Desc
        return grouped[a].name.localeCompare(grouped[b].name); // Nama Asc
    });

    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="table-empty">Tidak ada data karyawan/absensi.</td></tr>';
        return;
    }

    function isTelat(date, name, masukLog) {
        if (!masukLog || !masukLog.time) return false;
        const emp = employees.find(e => e.name === name);
        const empId = emp ? (emp.id != null ? emp.id : employees.indexOf(emp)) : null;
        if (empId === null) return false;
        const jadwalKey = `${date}_${empId}`;
        const shift = jadwalData[jadwalKey];
        const batas = (typeof getBatasMasukFromConfig === 'function' ? getBatasMasukFromConfig(shift) : null) || JADWAL_BATAS_MASUK[shift];
        if (!batas) return false;
        const menitBatas = parseTimeToMinutes(batas);
        const menitMasuk = parseTimeToMinutes(masukLog.time);
        return menitMasuk > menitBatas;
    }
    function hasTelatAtauPulangCepat(item, date, name) {
        const d = getDetailTelatUntukRekap(date, name, item, employees, jadwalData);
        return d.totalMenit > 0;
    }

    function getLupaAbsen(item) {
        const lupa = [];
        if (!item.masuk) lupa.push('Masuk');
        if (item.breakOuts.length > item.breakIns.length) lupa.push('Istirahat Kembali');
        if (item.breakIns.length > item.breakOuts.length) lupa.push('Istirahat Keluar');
        if (!item.pulang) lupa.push('Pulang');
        if (lupa.length === 0) return '-';
        return 'Lupa ' + lupa.join(' & ');
    }

    let html = '';
    keys.forEach(k => {
        const item = grouped[k];
        
        // [FIX] Tampilkan baris kosong jika tidak ada log (Belum Absen)
        if (!item.hasLog) {
            if (showEmpty) {
                html += `<tr style="background:#f8fafc; color:#94a3b8;"><td>${item.date}</td><td>${item.name}</td><td colspan="8" style="text-align:center; font-style:italic; font-size:12px;">Tidak ada data absensi (Belum Absen / Libur)</td></tr>`;
            }
            return;
        }

        const buildGpsLogCaption = (log) => {
            if (!log) return '';
            let s = (log.name || '') + ' - ' + (log.type || '') + ' | ' + (log.date || '') + ' ' + (log.time || '');
            if (log.lat != null && log.lng != null) s += ' | Lat: ' + Number(log.lat).toFixed(5) + ', Lng: ' + Number(log.lng).toFixed(5);
            return s;
        };
        const renderCell = (logOrArray) => {
            const renderSingleLog = (log) => {
                if (!log || log.id == null) return '<span>-</span>';
                const photoEsc = (log.photo || '').replace(/'/g, "\\'");
                const captionEsc = buildGpsLogCaption(log).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const timeHtml = `<span style="cursor:pointer; color:blue; text-decoration:underline;" onclick="showImageModal('${photoEsc}', '${captionEsc}')">${log.time}</span>`;
                const deleteHtml = canDelete ? ` <span style="cursor:pointer; color:#dc3545; font-size:14px; vertical-align:middle; margin-left:4px;" onclick="deleteSingleGpsLog(${log.id})" title="Hapus absensi ini">&#x2715;</span>` : '';
                return `<div style="white-space:nowrap; display:flex; align-items:center; justify-content:flex-start;">${timeHtml}${deleteHtml}</div>`;
            };
            if (!logOrArray) return renderSingleLog(null);
            if (Array.isArray(logOrArray)) return logOrArray.length > 0 ? logOrArray.map(renderSingleLog).join('') : '-';
            return renderSingleLog(logOrArray);
        };
        const telat = isTelat(item.date, item.name, item.masuk);
        const detailTelat = getDetailTelatUntukRekap(item.date, item.name, item, employees, jadwalData);
        const punyaTelatPulangCepat = detailTelat.totalMenit > 0;
        const lupaAbsen = getLupaAbsen(item);
        const lupaMasuk = !item.masuk;
        const lupaPulang = !item.pulang;
        const lupaBreakOut = item.breakIns.length > item.breakOuts.length;
        const lupaBreakIn = item.breakOuts.length > item.breakIns.length;
        const detailTelatEsc = JSON.stringify({ lines: detailTelat.lines }).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const telatHtml = (telat || punyaTelatPulangCepat) ? '<span style="color:#b91c1c; font-weight:bold; cursor:pointer; text-decoration:underline;" onclick="showDetailTelatModal(\'' + item.date + '\', \'' + (item.name || '').replace(/'/g, "\\'") + '\', \'' + detailTelatEsc + '\')">Ya</span>' : '-';
        const lupaHtml = lupaAbsen !== '-' ? '<span style="color:#b45309; font-weight:bold; cursor:pointer; text-decoration:underline;" onclick="showDetailLupaModal(\'' + item.date + '\', \'' + (item.name || '').replace(/'/g, "\\'") + '\', ' + lupaMasuk + ', ' + lupaPulang + ', ' + lupaBreakOut + ', ' + lupaBreakIn + ')">' + lupaAbsen + '</span>' : '-';
        let photosHtml = '';
        if (item.masuk) {
            const capMasuk = buildGpsLogCaption(item.masuk).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            photosHtml += `<img src="${item.masuk.photo}" style="height:30px; margin:1px; cursor:pointer;" onclick="showImageModal(this.src, '${capMasuk}')" title="Masuk">`;
        }
        if (item.breakOuts.length > 0) {
            item.breakOuts.forEach(log => {
                const cap = buildGpsLogCaption(log).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                photosHtml += `<img src="${log.photo}" style="height:30px; margin:1px; cursor:pointer;" onclick="showImageModal(this.src, '${cap}')" title="Istirahat Keluar">`;
            });
        }
        if (item.breakIns.length > 0) {
            item.breakIns.forEach(log => {
                const cap = buildGpsLogCaption(log).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                photosHtml += `<img src="${log.photo}" style="height:30px; margin:1px; cursor:pointer;" onclick="showImageModal(this.src, '${cap}')" title="Istirahat Kembali">`;
            });
        }
        if (item.pulang) {
            const capPulang = buildGpsLogCaption(item.pulang).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            photosHtml += `<img src="${item.pulang.photo}" style="height:30px; margin:1px; cursor:pointer;" onclick="showImageModal(this.src, '${capPulang}')" title="Pulang">`;
        }
        const breakStats = getBreakStats(filtered, item.name, item.date);
        const totalIstirahat = breakStats.total > 0 ? breakStats.total + ' menit' : '-';
        html += `<tr${telat || punyaTelatPulangCepat || lupaAbsen !== '-' ? ' style="background:#fef2f2;"' : ''}>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${renderCell(item.masuk)}</td>
            <td>${renderCell(item.breakOuts)}</td>
            <td>${renderCell(item.breakIns)}</td>
            <td>${totalIstirahat}</td>
            <td>${renderCell(item.pulang)}</td>
            <td>${telatHtml}</td>
            <td>${lupaHtml}</td>
            <td>${photosHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    const legend = document.getElementById('rekap_gps_legend');
    if (legend) legend.style.display = 'block';
}

function toggleEmptyRows() {
    const current = localStorage.getItem('RBM_SHOW_EMPTY_ABSENSI') !== '0';
    localStorage.setItem('RBM_SHOW_EMPTY_ABSENSI', current ? '0' : '1');
    loadRekapAbsensiGPS();
}

function deleteSingleGpsLog(logId) {
    var u = JSON.parse(localStorage.getItem('rbm_user') || '{}');
    var isDev = (u.username || '').toString().toLowerCase() === 'burhan';
    var isOwner = u.role === 'owner';
    
    if (!isDev && !isOwner) {
        alert('Akses ditolak. Hanya Owner atau Developer yang bisa menghapus data.');
        return;
    }
    
    if (!confirm('Yakin ingin menghapus 1 data absensi ini?')) return;
    
    var key = getRbmStorageKey('RBM_GPS_LOGS');
    var logs = safeParse(RBMStorage.getItem(key), []);
    
    var logToDelete = logs.find(l => l.id == logId);
    if (!logToDelete) { alert('Data tidak ditemukan untuk dihapus.'); return; }

    var newLogs = logs.filter(function(l) {
        return l.id != logId;
    });
    
    RBMStorage.setItem(key, JSON.stringify(newLogs)).then(function() {
        loadRekapAbsensiGPS();
        alert('Data absensi untuk ' + logToDelete.name + ' (' + logToDelete.type + ' ' + logToDelete.time + ') berhasil dihapus.');
    });
}

function populateRekapGpsFilterNama() {
    const filterSelect = document.getElementById("rekap_gps_filter_nama");
    if (!filterSelect) return;
    var key = getRbmStorageKey('RBM_GPS_LOGS');
    var logs = safeParse(RBMStorage.getItem(key), []);
    var names = [];
    var seen = {};
    logs.forEach(function(log) {
        var n = (log && log.name || '').trim();
        if (n && !seen[n]) { seen[n] = true; names.push(n); }
    });
    
    // [FIX] Selalu gabungkan dengan data Master Karyawan agar nama yang belum absen tetap muncul
    var employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    employees.forEach(function(emp) {
        var n = (emp && emp.name || '').trim();
        if (n && !seen[n]) { seen[n] = true; names.push(n); }
    });

    names.sort(function(a, b) { return String(a).localeCompare(String(b)); });
    
    var currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Semua</option>';
    names.forEach(function(n) {
        var opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n;
        filterSelect.appendChild(opt);
    });
    if (currentVal && names.indexOf(currentVal) >= 0) filterSelect.value = currentVal;
}

// Data rekap GPS untuk export (Excel/PDF) - sama filter dengan tampilan
function getRekapAbsensiGpsDataForExport() {
    const tglAwal = document.getElementById("rekap_gps_start").value;
    const tglAkhir = document.getElementById("rekap_gps_end").value;
    const filterNama = document.getElementById("rekap_gps_filter_nama").value;
    const logs = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_GPS_LOGS')), []);
    let filtered = logs.filter(l => l.date >= tglAwal && l.date <= tglAkhir);
    if (filterNama) filtered = filtered.filter(l => l.name === filterNama);
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
    const grouped = {};
    filtered.forEach(log => {
        const key = `${log.date}_${log.name}`;
        if (!grouped[key]) grouped[key] = { date: log.date, name: log.name, masuk: null, breakOuts: [], breakIns: [], pulang: null };
        if (log.type === 'Masuk' && !grouped[key].masuk) grouped[key].masuk = log;
        else if (log.type === 'Pulang') grouped[key].pulang = log;
        else if (log.type === 'Istirahat Keluar') grouped[key].breakOuts.push(log);
        else if (log.type === 'Istirahat Kembali') grouped[key].breakIns.push(log);
    });
    const keys = Object.keys(grouped).sort().reverse();
    const rows = [];
    keys.forEach(k => {
        const item = grouped[k];
        const telatDetail = getDetailTelatUntukRekap(item.date, item.name, item, employees, jadwalData);
        const telat = telatDetail.totalMenit > 0 ? 'Ya (' + telatDetail.totalMenit + ' menit)' : '-';
        let lupa = [];
        if (!item.masuk) lupa.push('Masuk');
        if (item.breakOuts.length > item.breakIns.length) lupa.push('Istirahat Kembali');
        if (item.breakIns.length > item.breakOuts.length) lupa.push('Istirahat Keluar');
        if (!item.pulang) lupa.push('Pulang');
        const lupaAbsen = lupa.length ? 'Lupa ' + lupa.join(' & ') : '-';
        const foto = [item.masuk, ...item.breakOuts, ...item.breakIns, item.pulang].filter(Boolean).length ? 'Ada' : '-';
        const breakStats = getBreakStats(filtered, item.name, item.date);
        rows.push({
            date: item.date,
            name: item.name,
            masuk: item.masuk ? item.masuk.time : '-',
            breakOut: item.breakOuts.length ? item.breakOuts.map(l => l.time).join(', ') : '-',
            breakIn: item.breakIns.length ? item.breakIns.map(l => l.time).join(', ') : '-',
            totalIstirahat: breakStats.total > 0 ? breakStats.total + ' menit' : '-',
            pulang: item.pulang ? item.pulang.time : '-',
            telat: telat,
            lupaAbsen: lupaAbsen,
            foto: foto
        });
    });
    return { tglAwal, tglAkhir, filterNama, rows };
}

function exportRekapAbsensiGpsToExcel() {
    const data = getRekapAbsensiGpsDataForExport();
    if (data.rows.length === 0) {
        alert('Tidak ada data untuk di-export. Pilih periode dan klik Tampilkan terlebih dahulu.');
        return;
    }
    const filename = 'Rekap_Absensi_GPS_' + data.tglAwal + '_sd_' + data.tglAkhir + '.xls';
    let tableRows = '';
    data.rows.forEach(r => {
        tableRows += `<tr>
            <td>${r.date}</td>
            <td>${r.name}</td>
            <td>${r.masuk}</td>
            <td>${r.breakOut}</td>
            <td>${r.breakIn}</td>
            <td>${r.totalIstirahat}</td>
            <td>${r.pulang}</td>
            <td>${r.telat}</td>
            <td>${r.lupaAbsen}</td>
            <td>${r.foto}</td>
        </tr>`;
    });
    const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">
    <style>table{border-collapse:collapse;width:100%;} th,td{border:1px solid #333;padding:6px;} th{background:#1e40af;color:#fff;}</style>
    </head>
    <body>
    <h2 style="text-align:center;">Rekap Absensi GPS</h2>
    <p style="text-align:center;margin:5px 0 15px;">Riwayat absensi foto dan lokasi. Periode: ${data.tglAwal} s/d ${data.tglAkhir}</p>
    <table>
    <thead><tr>
        <th>Tanggal</th><th>Nama</th><th>Masuk</th><th>Istirahat Keluar</th><th>Istirahat Kembali</th><th>Total Istirahat</th><th>Pulang</th><th>Telat</th><th>Lupa Absen</th><th>Foto</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
    </table>
    </body>
    </html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function printRekapAbsensiGpsPdf() {
    const data = getRekapAbsensiGpsDataForExport();
    if (data.rows.length === 0) {
        alert('Tidak ada data untuk dicetak. Pilih periode dan klik Tampilkan terlebih dahulu.');
        return;
    }
    const printWindow = window.open('', '', 'height=700,width=900');
    if (!printWindow) { alert('Izinkan pop-up untuk mencetak / save PDF.'); return; }
    let tableRows = '';
    data.rows.forEach(r => {
        tableRows += `<tr>
            <td>${r.date}</td>
            <td>${r.name}</td>
            <td>${r.masuk}</td>
            <td>${r.breakOut}</td>
            <td>${r.breakIn}</td>
            <td>${r.totalIstirahat}</td>
            <td>${r.pulang}</td>
            <td>${r.telat}</td>
            <td>${r.lupaAbsen}</td>
            <td>${r.foto}</td>
        </tr>`;
    });
    const html = `
    <html>
    <head><title>Rekap Absensi GPS</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;color:#333;}
      h2{text-align:center;margin-bottom:5px;}
      p.period{text-align:center;margin-top:0;color:#666;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th,td{border:1px solid #ddd;padding:8px;}
      th{background:#1e40af;color:white;-webkit-print-color-adjust:exact;}
      @media print{@page{size:landscape;margin:1cm;} body{-webkit-print-color-adjust:exact;}}
    </style>
    </head>
    <body>
    <h2>Rekap Absensi GPS</h2>
    <p class="period">Riwayat absensi foto dan lokasi. Periode: ${data.tglAwal} s/d ${data.tglAkhir}</p>
    <table>
    <thead><tr>
      <th>Tanggal</th><th>Nama</th><th>Masuk</th><th>Istirahat Keluar</th><th>Istirahat Kembali</th><th>Total Istirahat</th><th>Pulang</th><th>Telat</th><th>Lupa Absen</th><th>Foto</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
    </table>
    </body>
    </html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function() { printWindow.print(); printWindow.close(); }, 500);
}

// Batas jam masuk & pulang per shift (format HH:mm). 10 menit telat = 1 jam di Rekap Gaji.
const JADWAL_BATAS_MASUK = { 'P': '08:30', 'M': '12:30', 'S': '16:30' };
const JADWAL_BATAS_PULANG = { 'P': '17:00', 'M': '21:00', 'S': '17:00' };
const JADWAL_LABEL = { 'P': 'Pagi', 'M': 'Middle', 'S': 'Sore', 'Off': 'Libur' };
const MENIT_TELAT_PER_JAM_GAJI = 10; // 10 menit = 1 jam untuk potongan gaji

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = String(timeStr).replace(/,/g, '.').split(/[.:]/).map(n => parseInt(n, 10) || 0);
    const h = parts[0] || 0, m = parts[1] || 0;
    return h * 60 + m;
}

function getDetailTelatUntukRekap(date, name, item, employees, jadwalData) {
    const emp = employees.find(e => e.name === name);
    const empId = emp ? (emp.id != null ? emp.id : employees.indexOf(emp)) : null;
    if (empId === null) return { totalMenit: 0, lines: [], jamUntukGaji: 0 };
    const jadwalKey = `${date}_${empId}`;
    const shift = jadwalData[jadwalKey];
    const batasMasuk = (typeof getBatasMasukFromConfig === 'function' ? getBatasMasukFromConfig(shift) : null) || JADWAL_BATAS_MASUK[shift];
    const batasPulang = (typeof getBatasPulangFromConfig === 'function' ? getBatasPulangFromConfig(shift) : null) || JADWAL_BATAS_PULANG[shift];
    const lines = [];
    let menitTelatMasuk = 0, menitPulangCepat = 0;
    if (item.masuk && item.masuk.time && batasMasuk) {
        const menitBatas = parseTimeToMinutes(batasMasuk);
        const menitMasuk = parseTimeToMinutes(item.masuk.time);
        if (menitMasuk > menitBatas) {
            menitTelatMasuk = menitMasuk - menitBatas;
            lines.push('Telat Masuk: ' + menitTelatMasuk + ' menit (Batas ' + batasMasuk + ', Masuk ' + item.masuk.time + ')');
        }
    }
    if (item.pulang && item.pulang.time && batasPulang) {
        const menitBatas = parseTimeToMinutes(batasPulang);
        const menitPulang = parseTimeToMinutes(item.pulang.time);
        if (menitPulang < menitBatas) {
            menitPulangCepat = menitBatas - menitPulang;
            lines.push('Pulang Cepat: ' + menitPulangCepat + ' menit (Batas ' + batasPulang + ', Pulang ' + item.pulang.time + ')');
        }
    }
    const totalMenit = menitTelatMasuk + menitPulangCepat;
    const menitPerJam = typeof getMenitTelatPerJamGajiFromConfig === 'function' ? getMenitTelatPerJamGajiFromConfig() : MENIT_TELAT_PER_JAM_GAJI;
    const jamUntukGaji = menitPerJam > 0 ? totalMenit / menitPerJam : 0;
    if (totalMenit > 0) lines.push('Total durasi telat: ' + totalMenit + ' menit (= ' + jamUntukGaji.toFixed(1) + ' jam untuk Rekap Gaji)');
    return { totalMenit, lines, jamUntukGaji, menitTelatMasuk, menitPulangCepat };
}

function showDetailTelatModal(date, name, detailJson) {
    if (typeof detailJson === 'string') {
        detailJson = detailJson.replace(/&quot;/g, '"');
        try { detailJson = JSON.parse(detailJson); } catch (e) { detailJson = { lines: [] }; }
    }
    const detail = detailJson || {};
    const title = document.getElementById('gpsDetailModalTitle');
    const body = document.getElementById('gpsDetailModalBody');
    title.textContent = 'Detail Telat - ' + name + ' (' + date + ')';
    body.innerHTML = detail.lines && detail.lines.length ? detail.lines.map(l => '<p style="margin:4px 0;">' + l + '</p>').join('') : '<p>Tidak ada detail telat.</p>';
    var footer = document.getElementById('gpsDetailModalFooter');
    if (footer && typeof getMenitTelatPerJamGajiFromConfig === 'function') {
        var n = getMenitTelatPerJamGajiFromConfig();
        footer.textContent = 'Aturan: ' + n + ' menit telat = 1 jam (masuk ke Rekap Gaji)';
    }
    document.getElementById('gpsDetailModal').style.display = 'flex';
}

function showDetailLupaModal(date, name, lupaMasuk, lupaPulang, lupaBreakOut, lupaBreakIn) {
    const title = document.getElementById('gpsDetailModalTitle');
    const body = document.getElementById('gpsDetailModalBody');
    title.textContent = 'Detail Lupa Absen - ' + name + ' (' + date + ')';
    const lines = [];
    if (lupaMasuk) lines.push('Tidak ada catatan absen <strong>Masuk</strong> pada tanggal ini.');
    if (lupaBreakOut) lines.push('Tidak ada catatan absen <strong>Istirahat Keluar</strong> pada tanggal ini.');
    if (lupaBreakIn) lines.push('Tidak ada catatan absen <strong>Istirahat Kembali</strong> pada tanggal ini.');
    if (lupaPulang) lines.push('Tidak ada catatan absen <strong>Pulang</strong> pada tanggal ini.');
    body.innerHTML = lines.length ? lines.map(l => '<p style="margin:8px 0;">' + l + '</p>').join('') : '<p>-</p>';
    document.getElementById('gpsDetailModal').style.display = 'flex';
}

function closeGpsDetailModal() {
    const el = document.getElementById('gpsDetailModal');
    if (el) el.style.display = 'none';
}

// Total menit telat dari GPS untuk satu karyawan dalam periode (untuk Rekap Gaji)
function getTotalMenitTelatFromGps(empId, empName, tglAwal, tglAkhir) {
    const logs = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_GPS_LOGS')), []);
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
    const byDate = {};
    logs.forEach(log => {
        if (log.name !== empName) return;
        if (log.date < tglAwal || log.date > tglAkhir) return;
        const key = log.date;
        if (!byDate[key]) byDate[key] = { masuk: null, pulang: null };
        if (log.type === 'Masuk') byDate[key].masuk = log;
        if (log.type === 'Pulang') byDate[key].pulang = log;
    });
    let totalMenit = 0;
    Object.keys(byDate).forEach(date => {
        const item = byDate[date];
        const d = getDetailTelatUntukRekap(date, empName, item, [{ id: empId, name: empName }], jadwalData);
        totalMenit += d.totalMenit;
    });
    return totalMenit;
}

function updateGpsJadwalDisplay() {
    const name = document.getElementById('gps_absen_name').value;
    const box = document.getElementById('gps_jadwal_display');
    const textEl = document.getElementById('gps_jadwal_text');
    if (!box || !textEl) return;
    if (!name) {
        box.style.display = 'none';
        return;
    }
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const emp = employees.find(e => e.name === name);
    if (!emp) {
        textEl.textContent = '-';
        box.style.display = 'block';
        return;
    }
    const now = new Date();
    const today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
    const key = `${today}_${emp.id || employees.indexOf(emp)}`;
    const shift = jadwalData[key] || '';
    const label = (typeof getJadwalLabelFromConfig === 'function' ? getJadwalLabelFromConfig(shift) : null) || (typeof JADWAL_LABEL !== 'undefined' && JADWAL_LABEL[shift]) || shift || 'Tidak ada jadwal';
    
    // Hitung sisa istirahat
    const gpsKey = getRbmStorageKey('RBM_GPS_LOGS');
    const logs = safeParse(RBMStorage.getItem(gpsKey), []);
    const stats = getBreakStats(logs, name, today);
    const batasMenit = typeof getDurasiIstirahatMenitFromConfig === 'function' ? getDurasiIstirahatMenitFromConfig(shift) : 60;
    
    let info = '';
    if (shift) {
        info += `<br><span style="font-size:0.9em; color:#555;">Jatah Istirahat: ${batasMenit} menit.</span>`;
        if (stats.total > 0) {
            info += `<br><span style="font-size:0.9em; color:#555;">Terpakai: ${stats.total} menit.</span>`;
        }
        
        if (stats.lastOut !== null) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            let currentDur = currentMinutes - stats.lastOut;
            if (currentDur < 0) currentDur += 24 * 60;
            info += `<br><span style="color:#d97706; font-weight:bold;">Sedang Istirahat: ${currentDur} menit.</span>`;
        } else {
            const sisa = batasMenit - stats.total;
            info += sisa >= 0 ? `<br><span style="color:#16a34a; font-weight:bold;">Sisa: ${sisa} menit.</span>` : `<br><span style="color:#dc2626; font-weight:bold;">Over: ${Math.abs(sisa)} menit.</span>`;
        }
    }

    const quote = `<br><br><div style="font-style:italic; color:#6b7280; font-size:0.9em; border-top:1px solid #e5e7eb; padding-top:8px;">"Lakukan rutinitas pekerjaanmu dengan senang hati"</div>`;

    textEl.innerHTML = (shift ? `${shift} (${label})` : label) + info + quote;
    box.style.display = 'block';
    if (typeof checkDistance === 'function') checkDistance();
}

function processAbsensiGPS(type) {
    const name = document.getElementById('gps_absen_name').value;
    if (!name) { showCustomAlert("Pilih nama karyawan dulu!", "Perhatian", "error"); return; }
    
    // Cek riwayat untuk peringatan (bukan kunci mati)
    const gpsKey = getRbmStorageKey('RBM_GPS_LOGS');
    const logs = safeParse(RBMStorage.getItem(gpsKey), []);
    const now = new Date();
    const today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);
    const todayLogs = logs.filter(l => l.name === name && l.date === today);
    
    const hasMasuk = todayLogs.some(l => l.type === 'Masuk');
    const hasPulang = todayLogs.some(l => l.type === 'Pulang');
    const breaks = todayLogs.filter(l => l.type === 'Istirahat Keluar' || l.type === 'Istirahat Kembali');
    const lastBreak = breaks.length > 0 ? breaks[breaks.length - 1] : null;
    const isOnBreak = lastBreak && lastBreak.type === 'Istirahat Keluar';

    let warning = null;

    if (type === 'Masuk' && hasMasuk) {
        warning = "Anda sudah absen Masuk hari ini.<br>Ingin absen Masuk lagi?";
    } else if (type === 'Pulang') {
        if (hasPulang) warning = "Anda sudah absen Pulang hari ini.<br>Ingin absen Pulang lagi?";
        else if (!hasMasuk) warning = "Anda belum absen Masuk hari ini.<br>Yakin ingin absen Pulang?";
    } else if (type === 'Istirahat Keluar') {
        if (!hasMasuk) warning = "Anda belum absen Masuk.<br>Yakin ingin absen Istirahat?";
        else if (isOnBreak) warning = "Anda tercatat sedang istirahat.<br>Ingin absen Istirahat Keluar lagi?";
    } else if (type === 'Istirahat Kembali') {
        if (!hasMasuk) warning = "Anda belum absen Masuk.<br>Yakin ingin absen Selesai Istirahat?";
        else if (!isOnBreak) warning = "Anda tidak tercatat sedang istirahat.<br>Yakin ingin absen Selesai Istirahat?";
    }

    if (warning) {
        showCustomConfirm(warning, "Konfirmasi Absensi", function() {
            _executeAbsensiGPS(type);
        });
    } else {
        _executeAbsensiGPS(type);
    }
}

function _executeAbsensiGPS(type) {
    const name = document.getElementById('gps_absen_name').value;
    if (!currentPos) { showCustomAlert("Lokasi belum ditemukan! Pastikan GPS aktif.", "GPS Error", "error"); return; }

    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    const emp = employees.find(e => e.name === name);
    const empId = emp ? (emp.id || employees.indexOf(emp)) : null;
    
    const now = new Date();
    const today = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);

    const video = document.getElementById('gps_video');
    const canvas = document.getElementById('gps_canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dateStr = now.toLocaleDateString('id-ID');
    const timeStr = now.toLocaleTimeString('id-ID');
    const locStr = `Lat: ${currentPos.latitude.toFixed(5)}, Lng: ${currentPos.longitude.toFixed(5)}`;

    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.fillRect(0, canvas.height - 60, canvas.width, 60);
    context.font = "16px Arial";
    context.fillStyle = "white";
    context.fillText(`${name} - ${type}`, 10, canvas.height - 35);
    context.font = "12px Arial";
    context.fillText(`${dateStr} ${timeStr} | ${locStr}`, 10, canvas.height - 15);

    const photoData = canvas.toDataURL('image/jpeg', 0.7);

    const log = {
        id: Date.now(),
        timestamp: now.toISOString(),
        date: today,
        time: timeStr,
        name: name,
        type: type,
        lat: currentPos.latitude,
        lng: currentPos.longitude,
        photo: photoData
    };

    const gpsKey = getRbmStorageKey('RBM_GPS_LOGS');
    const logs = safeParse(RBMStorage.getItem(gpsKey), []);

    // Peringatan durasi istirahat (sebelum push log Selesai Istirahat)
    if (type === 'Istirahat Kembali' && empId !== null) {
        const stats = getBreakStats(logs, name, today);
        if (stats.lastOut !== null) {
            var menitSelesai = now.getHours() * 60 + now.getMinutes();
            var durasiIni = menitSelesai - stats.lastOut;
            if (durasiIni < 0) durasiIni += 24 * 60;
            var totalDurasi = stats.total + durasiIni;

            var jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
            var jadwalKey = today + '_' + empId;
            var shift = jadwalData[jadwalKey];
            var batasMenit = typeof getDurasiIstirahatMenitFromConfig === 'function' ? getDurasiIstirahatMenitFromConfig(shift) : 60;
            var labelShift = (typeof getJadwalLabelFromConfig === 'function' ? getJadwalLabelFromConfig(shift) : null) || (typeof JADWAL_LABEL !== 'undefined' && JADWAL_LABEL[shift]) || (shift || 'Shift');

            if (batasMenit > 0) {
                if (totalDurasi > batasMenit) {
                    showCustomAlert("⚠️ Peringatan: Total durasi istirahat melebihi batas!<br><br>" + "Shift " + labelShift + ": batas " + batasMenit + " menit.<br>" + "Sudah diambil: " + stats.total + " menit.<br>" + "Istirahat ini: " + durasiIni + " menit.<br>" + "Total: " + totalDurasi + " menit.<br>" + "Over: " + (totalDurasi - batasMenit) + " menit.", "Over Istirahat", "warning");
                } else {
                    showCustomAlert("✅ Selesai Istirahat.<br><br>" + "Istirahat ini: " + durasiIni + " menit.<br>" + "Total hari ini: " + totalDurasi + " menit.<br>" + "Sisa: " + (batasMenit - totalDurasi) + " menit.", "Info Istirahat", "success");
                }
            }
        }
    }

    logs.push(log);
    RBMStorage.setItem(gpsKey, JSON.stringify(logs));

    // Jika absen Masuk: set Hadir (H) di tab Absensi & Jadwal
    if (type === 'Masuk' && empId !== null) {
        const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
        const absKey = `${today}_${empId}`;
        absensiData[absKey] = 'H';
        RBMStorage.setItem(getRbmStorageKey('RBM_ABSENSI_DATA'), JSON.stringify(absensiData));
    }

    // Cek telat (hanya untuk Masuk)
    if (type === 'Masuk' && empId !== null) {
        const jadwalData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_JADWAL_DATA')), {});
        const jadwalKey = `${today}_${empId}`;
        const shift = jadwalData[jadwalKey];
        const batas = (typeof getBatasMasukFromConfig === 'function' ? getBatasMasukFromConfig(shift) : null) || JADWAL_BATAS_MASUK[shift];
        if (batas) {
            const menitBatas = parseTimeToMinutes(batas);
            const jamNow = now.getHours();
            const menitNow = now.getMinutes();
            const menitSekarang = jamNow * 60 + menitNow;
            if (menitSekarang > menitBatas) {
                showCustomAlert("⚠️ Anda tercatat TELAT.<br>Batas masuk " + ((typeof getJadwalLabelFromConfig === 'function' ? getJadwalLabelFromConfig(shift) : null) || (typeof JADWAL_LABEL !== 'undefined' && JADWAL_LABEL[shift]) || shift) + ": " + batas + "<br>Waktu Anda: " + timeStr, "Terlambat", "warning");
            }
        }
    }

    showCustomAlert(`Absensi ${type} Berhasil!`, "Sukses", "success");
    if (typeof updateGpsJadwalDisplay === 'function') updateGpsJadwalDisplay();
}

function loadMyGpsHistory() {
    const name = document.getElementById('gps_absen_name').value;
    if (!name) { alert("Pilih nama karyawan terlebih dahulu!"); return; }
    
    const logs = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_GPS_LOGS')), []);
    // Filter by name and sort descending
    const myLogs = logs.filter(l => l.name === name).sort((a, b) => {
        const ta = a.timestamp || (a.date + 'T' + a.time);
        const tb = b.timestamp || (b.date + 'T' + b.time);
        return tb.localeCompare(ta);
    });

    const listContainer = document.getElementById('gpsHistoryList');
    if (!listContainer) return;
    
    if (myLogs.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">Belum ada riwayat absensi untuk ' + name + '.</div>';
    } else {
        let html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
        html += '<thead style="background:#f8fafc; color:#64748b;"><tr><th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Tanggal</th><th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Jam</th><th style="padding:10px; text-align:left; border-bottom:1px solid #e2e8f0;">Status</th></tr></thead><tbody>';
        
        myLogs.slice(0, 50).forEach(log => {
            let color = '#334155';
            let bg = 'transparent';
            if (log.type === 'Masuk') { color = '#15803d'; bg = '#f0fdf4'; }
            else if (log.type === 'Pulang') { color = '#b91c1c'; bg = '#fef2f2'; }
            else if (log.type.includes('Istirahat')) { color = '#b45309'; bg = '#fffbeb'; }
            
            html += `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px; color:#334155;">${log.date}</td><td style="padding:10px; color:#334155;">${log.time}</td><td style="padding:10px;"><span style="color:${color}; background:${bg}; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600;">${log.type}</span></td></tr>`;
        });
        html += '</tbody></table>';
        if (myLogs.length > 50) {
            html += '<div style="text-align:center; padding:10px; font-size:11px; color:#94a3b8;">Menampilkan 50 data terakhir</div>';
        }
        listContainer.innerHTML = html;
    }

    const modal = document.getElementById('gpsHistoryModal');
    if (modal) modal.style.display = 'flex';
}

function closeGpsHistoryModal() {
    const modal = document.getElementById('gpsHistoryModal');
    if (modal) modal.style.display = 'none';
}

function populateManualAbsenNameSelect() {
    const sel = document.getElementById('manual_absen_name');
    if (!sel) return;
    const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
    sel.innerHTML = '<option value="">-- Pilih Nama --</option>';
    employees.forEach(function(emp) {
        const opt = document.createElement('option');
        opt.value = emp.name;
        opt.textContent = emp.name;
        sel.appendChild(opt);
    });
}

function compressImageDataUrl(dataUrl, maxWidth, quality, callback) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.match(/^data:image\//)) {
        if (callback) callback(dataUrl || '');
        return;
    }
    var img = new Image();
    img.onload = function() {
        var w = img.width, h = img.height;
        if (w <= maxWidth && h <= maxWidth) {
            try {
                var c = document.createElement('canvas');
                c.width = w; c.height = h;
                var ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                if (callback) callback(c.toDataURL('image/jpeg', quality || 0.55));
            } catch (e) { if (callback) callback(dataUrl); }
            return;
        }
        var r = maxWidth / Math.max(w, h);
        var nw = Math.round(w * r), nh = Math.round(h * r);
        var canvas = document.createElement('canvas');
        canvas.width = nw; canvas.height = nh;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, nw, nh);
        try {
            if (callback) callback(canvas.toDataURL('image/jpeg', quality || 0.55));
        } catch (e) { if (callback) callback(dataUrl); }
    };
    img.onerror = function() { if (callback) callback(dataUrl); };
    img.src = dataUrl;
}

function saveAbsensiGpsManual(name, type, date, time, photoData, feedbackEl, noAlert) {
    return new Promise(function(resolve, reject) {
        if (!name || !date || !time) {
            if (feedbackEl) { feedbackEl.textContent = 'Nama, tanggal, dan jam wajib.'; feedbackEl.style.color = '#b91c1c'; }
            resolve(false);
            return;
        }
        function doSave(photo) {
            const employees = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_EMPLOYEES')), []);
            const emp = employees.find(function(e) { return e.name === name; });
            const empId = emp ? (emp.id != null ? emp.id : employees.indexOf(emp)) : null;
            var timeDisplay = (time.length >= 8 && time.indexOf(':') >= 0) ? time.slice(0, 8) : (time.length >= 5 ? time.slice(0, 5) : time);
            if (timeDisplay.length === 5) timeDisplay = timeDisplay + ':00';
            var isoTime = (time.length >= 8 && /^\d{2}:\d{2}:\d{2}$/.test(time.slice(0, 8))) ? time.slice(0, 8) : (time.length >= 5 ? time.slice(0, 5) + ':00' : time + ':00');
            var isoDate = date + 'T' + isoTime;
            var d = new Date(isoDate);
            if (isNaN(d.getTime())) d = new Date();
            const log = {
                id: Date.now() + Math.floor(Math.random() * 1000), // Tambah random agar ID unik jika loop cepat
                timestamp: d.toISOString(),
                date: date,
                time: timeDisplay,
                name: name,
                type: type,
                lat: null,
                lng: null,
                photo: photo || '',
                manualEntry: true
            };
            const gpsKey = getRbmStorageKey('RBM_GPS_LOGS');
            const logs = safeParse(RBMStorage.getItem(gpsKey), []);
            logs.push(log);
            RBMStorage.setItem(gpsKey, JSON.stringify(logs)).then(function() {
                if (type === 'Masuk' && empId !== null) {
                    const absensiData = safeParse(RBMStorage.getItem(getRbmStorageKey('RBM_ABSENSI_DATA')), {});
                    const absKey = date + '_' + empId;
                    absensiData[absKey] = 'H';
                    RBMStorage.setItem(getRbmStorageKey('RBM_ABSENSI_DATA'), JSON.stringify(absensiData));
                }
                if (feedbackEl) {
                    feedbackEl.textContent = 'Absensi ' + type + ' berhasil disimpan (manual). Tanggal: ' + date + ', Jam: ' + timeDisplay;
                    feedbackEl.style.color = 'var(--success)';
                }
                if (!noAlert) alert('Absensi ' + type + ' berhasil disimpan.');
                resolve(true);
            });
        }
        if (photoData && typeof photoData === 'string' && photoData.indexOf('data:image') === 0) {
            compressImageDataUrl(photoData, 800, 0.55, doSave);
        } else {
            doSave(photoData || '');
        }
    });
}

  // Expose functions for inline handlers (onclick/onchange) di halaman RBM terpisah
  if (typeof createPettyCashInputRows !== 'undefined') window.createPettyCashInputRows = createPettyCashInputRows;
  if (typeof createBarangRows !== 'undefined') window.createBarangRows = createBarangRows;
  if (typeof openJadwalModal !== 'undefined') window.openJadwalModal = openJadwalModal;
  if (typeof toggleAbsensiExtraCols !== 'undefined') window.toggleAbsensiExtraCols = toggleAbsensiExtraCols;
  if (typeof selectCalendarDate !== 'undefined') window.selectCalendarDate = selectCalendarDate;
  if (typeof switchStokTab !== 'undefined') window.switchStokTab = switchStokTab;
  if (typeof loadPettyCashData !== 'undefined') window.loadPettyCashData = loadPettyCashData;
  if (typeof loadPembukuanData !== 'undefined') window.loadPembukuanData = loadPembukuanData;
  if (typeof loadInventarisData !== 'undefined') window.loadInventarisData = loadInventarisData;
  if (typeof loadRekapAbsensiGPS !== 'undefined') window.loadRekapAbsensiGPS = loadRekapAbsensiGPS;
  if (typeof createPembukuanRows !== 'undefined') window.createPembukuanRows = createPembukuanRows;
  if (typeof saveAbsensiData !== 'undefined') window.saveAbsensiData = saveAbsensiData;
  if (typeof saveAbsensiToFirebase !== 'undefined') window.saveAbsensiToFirebase = saveAbsensiToFirebase;
  if (typeof updateEmployee !== 'undefined') window.updateEmployee = updateEmployee;
  if (typeof addEmployeeRow !== 'undefined') window.addEmployeeRow = addEmployeeRow;
  if (typeof removeEmployee !== 'undefined') window.removeEmployee = removeEmployee;
  if (typeof cycleAbsensiStatus !== 'undefined') window.cycleAbsensiStatus = cycleAbsensiStatus;
  if (typeof switchAbsensiTab !== 'undefined') window.switchAbsensiTab = switchAbsensiTab;
  if (typeof syncAbsensiPeriodAndRefresh !== 'undefined') window.syncAbsensiPeriodAndRefresh = syncAbsensiPeriodAndRefresh;
  if (typeof submitPettyCashData !== 'undefined') window.submitPettyCashData = submitPettyCashData;
  if (typeof submitDataBarang !== 'undefined') window.submitDataBarang = submitDataBarang;
  if (typeof submitDataInventaris !== 'undefined') window.submitDataInventaris = submitDataInventaris;
  if (typeof submitDataPembukuan !== 'undefined') window.submitDataPembukuan = submitDataPembukuan;
  if (typeof updateJadwalPreview !== 'undefined') window.updateJadwalPreview = updateJadwalPreview;
  if (typeof printJadwalPreview !== 'undefined') window.printJadwalPreview = printJadwalPreview;
  if (typeof saveJadwalImage !== 'undefined') window.saveJadwalImage = saveJadwalImage;
  if (typeof closeJadwalModal !== 'undefined') window.closeJadwalModal = closeJadwalModal;
  if (typeof printRekapAbsensiArea !== 'undefined') window.printRekapAbsensiArea = printRekapAbsensiArea;
  if (typeof printRekapGaji !== 'undefined') window.printRekapGaji = printRekapGaji;
  if (typeof saveRekapGajiData !== 'undefined') window.saveRekapGajiData = saveRekapGajiData;
  if (typeof downloadAllSlipsAsZip !== 'undefined') window.downloadAllSlipsAsZip = downloadAllSlipsAsZip;
  if (typeof submitReservasi !== 'undefined') window.submitReservasi = submitReservasi;
  if (typeof loadReservasiData !== 'undefined') window.loadReservasiData = loadReservasiData;
  if (typeof changeCalendarMonth !== 'undefined') window.changeCalendarMonth = changeCalendarMonth;
  if (typeof renderReservasiCalendar !== 'undefined') window.renderReservasiCalendar = renderReservasiCalendar;
  if (typeof saveStokData !== 'undefined') window.saveStokData = saveStokData;
  if (typeof renderStokTable !== 'undefined') window.renderStokTable = renderStokTable;
  if (typeof updateStokValue !== 'undefined') window.updateStokValue = updateStokValue;
  if (typeof recalculateStokRow !== 'undefined') window.recalculateStokRow = recalculateStokRow;
  if (typeof manageStokItems !== 'undefined') window.manageStokItems = manageStokItems;
  if (typeof addStokItem !== 'undefined') window.addStokItem = addStokItem;
  if (typeof removeStokItem !== 'undefined') window.removeStokItem = removeStokItem;
  if (typeof triggerStokImport !== 'undefined') window.triggerStokImport = triggerStokImport;
  if (typeof exportStokItemsToExcel !== 'undefined') window.exportStokItemsToExcel = exportStokItemsToExcel;
  if (typeof processStokImport !== 'undefined') window.processStokImport = processStokImport;
  if (typeof exportStokBarangToExcel !== 'undefined') window.exportStokBarangToExcel = exportStokBarangToExcel;
  if (typeof exportStokBarangToPdf !== 'undefined') window.exportStokBarangToPdf = exportStokBarangToPdf;
  if (typeof filterRiwayatBarang !== 'undefined') window.filterRiwayatBarang = filterRiwayatBarang;
  if (typeof loadRiwayatBarang !== 'undefined') window.loadRiwayatBarang = loadRiwayatBarang;
  if (typeof deleteRiwayatBarang !== 'undefined') window.deleteRiwayatBarang = deleteRiwayatBarang;
  if (typeof toggleRiwayatBarangSelectAll !== 'undefined') window.toggleRiwayatBarangSelectAll = toggleRiwayatBarangSelectAll;
  if (typeof hapusRiwayatBarangYangDitandai !== 'undefined') window.hapusRiwayatBarangYangDitandai = hapusRiwayatBarangYangDitandai;
  if (typeof exportRiwayatBarangToExcel !== 'undefined') window.exportRiwayatBarangToExcel = exportRiwayatBarangToExcel;
  if (typeof exportRiwayatBarangToPdf !== 'undefined') window.exportRiwayatBarangToPdf = exportRiwayatBarangToPdf;
  if (typeof triggerImportPettyCashExcel !== 'undefined') window.triggerImportPettyCashExcel = triggerImportPettyCashExcel;
  if (typeof processImportPettyCashExcel !== 'undefined') window.processImportPettyCashExcel = processImportPettyCashExcel;
  if (typeof downloadTemplatePettyCashExcel !== 'undefined') window.downloadTemplatePettyCashExcel = downloadTemplatePettyCashExcel;
  if (typeof exportPettyCashToExcel !== 'undefined') window.exportPettyCashToExcel = exportPettyCashToExcel;
  if (typeof printPettyCashReport !== 'undefined') window.printPettyCashReport = printPettyCashReport;
  if (typeof triggerImportPembukuanExcel !== 'undefined') window.triggerImportPembukuanExcel = triggerImportPembukuanExcel;
  if (typeof processImportPembukuanExcel !== 'undefined') window.processImportPembukuanExcel = processImportPembukuanExcel;
  if (typeof downloadTemplatePembukuanExcel !== 'undefined') window.downloadTemplatePembukuanExcel = downloadTemplatePembukuanExcel;
  if (typeof exportRekapToExcel !== 'undefined') window.exportRekapToExcel = exportRekapToExcel;
  if (typeof printRekapReport !== 'undefined') window.printRekapReport = printRekapReport;
  if (typeof sendRekapEmail !== 'undefined') window.sendRekapEmail = sendRekapEmail;
  if (typeof loadLihatPengajuanData !== 'undefined') window.loadLihatPengajuanData = loadLihatPengajuanData;
  if (typeof exportPembukuanToExcel !== 'undefined') window.exportPembukuanToExcel = exportPembukuanToExcel;
  if (typeof printPembukuanReport !== 'undefined') window.printPembukuanReport = printPembukuanReport;
  if (typeof savePembukuanToJpg !== 'undefined') window.savePembukuanToJpg = savePembukuanToJpg;
  if (typeof printInventarisReport !== 'undefined') window.printInventarisReport = printInventarisReport;
  if (typeof exportInventarisToExcel !== 'undefined') window.exportInventarisToExcel = exportInventarisToExcel;
  if (typeof exportRekapAbsensiGpsToExcel !== 'undefined') window.exportRekapAbsensiGpsToExcel = exportRekapAbsensiGpsToExcel;
  if (typeof printRekapAbsensiGpsPdf !== 'undefined') window.printRekapAbsensiGpsPdf = printRekapAbsensiGpsPdf;
  if (typeof exportCompleteAbsensiExcel !== 'undefined') window.exportCompleteAbsensiExcel = exportCompleteAbsensiExcel;
  if (typeof exportCompleteAbsensiPDF !== 'undefined') window.exportCompleteAbsensiPDF = exportCompleteAbsensiPDF;
  if (typeof generateKodeSetupAbsensi !== 'undefined') window.generateKodeSetupAbsensi = generateKodeSetupAbsensi;
  if (typeof generateAndShowSlip !== 'undefined') window.generateAndShowSlip = generateAndShowSlip;
  if (typeof sendSlipEmail !== 'undefined') window.sendSlipEmail = sendSlipEmail;
  if (typeof saveBonusData !== 'undefined') window.saveBonusData = saveBonusData;
  if (typeof exportBonusAbsensiExcel !== 'undefined') window.exportBonusAbsensiExcel = exportBonusAbsensiExcel;
  if (typeof exportBonusAbsensiPDF !== 'undefined') window.exportBonusAbsensiPDF = exportBonusAbsensiPDF;
  if (typeof printReservasiBill !== 'undefined') window.printReservasiBill = printReservasiBill;
  if (typeof deleteReservasi !== 'undefined') window.deleteReservasi = deleteReservasi;
  if (typeof updateGpsJadwalDisplay !== 'undefined') window.updateGpsJadwalDisplay = updateGpsJadwalDisplay;
  if (typeof processAbsensiGPS !== 'undefined') window.processAbsensiGPS = processAbsensiGPS;
  if (typeof loadMyGpsHistory !== 'undefined') window.loadMyGpsHistory = loadMyGpsHistory;
  if (typeof closeGpsHistoryModal !== 'undefined') window.closeGpsHistoryModal = closeGpsHistoryModal;
  if (typeof populateManualAbsenNameSelect !== 'undefined') window.populateManualAbsenNameSelect = populateManualAbsenNameSelect;
  if (typeof saveAbsensiGpsManual !== 'undefined') window.saveAbsensiGpsManual = saveAbsensiGpsManual;
  if (typeof deletePettyCashItem !== 'undefined') window.deletePettyCashItem = deletePettyCashItem;
  if (typeof deletePettyCashItemFirebase !== 'undefined') window.deletePettyCashItemFirebase = deletePettyCashItemFirebase;
  if (typeof toggleEditPcFields !== 'undefined') window.toggleEditPcFields = toggleEditPcFields;
  if (typeof openEditPettyCashModal !== 'undefined') window.openEditPettyCashModal = openEditPettyCashModal;
  if (typeof closeEditPettyCashModal !== 'undefined') window.closeEditPettyCashModal = closeEditPettyCashModal;
  if (typeof saveEditPettyCashModal !== 'undefined') window.saveEditPettyCashModal = saveEditPettyCashModal;
  if (typeof editPettyCashItem !== 'undefined') window.editPettyCashItem = editPettyCashItem;
  if (typeof editPettyCashItemFirebase !== 'undefined') window.editPettyCashItemFirebase = editPettyCashItemFirebase;
  if (typeof editPembukuanItem !== 'undefined') window.editPembukuanItem = editPembukuanItem;
  if (typeof deletePembukuanItem !== 'undefined') window.deletePembukuanItem = deletePembukuanItem;
  if (typeof openEditInventaris !== 'undefined') window.openEditInventaris = openEditInventaris;
  if (typeof closeEditInventaris !== 'undefined') window.closeEditInventaris = closeEditInventaris;
  if (typeof saveEditInventaris !== 'undefined') window.saveEditInventaris = saveEditInventaris;
  if (typeof deleteEditInventaris !== 'undefined') window.deleteEditInventaris = deleteEditInventaris;
  if (typeof getInventarisDaftarBarang !== 'undefined') window.getInventarisDaftarBarang = getInventarisDaftarBarang;
  if (typeof addInventarisDaftarBarang !== 'undefined') window.addInventarisDaftarBarang = addInventarisDaftarBarang;
  if (typeof removeInventarisDaftarBarang !== 'undefined') window.removeInventarisDaftarBarang = removeInventarisDaftarBarang;
  if (typeof renderInventarisDaftarBarang !== 'undefined') window.renderInventarisDaftarBarang = renderInventarisDaftarBarang;
  if (typeof openInventarisDaftarModal !== 'undefined') window.openInventarisDaftarModal = openInventarisDaftarModal;
  if (typeof closeInventarisDaftarModal !== 'undefined') window.closeInventarisDaftarModal = closeInventarisDaftarModal;
  if (typeof showDetailLupaModal !== 'undefined') window.showDetailLupaModal = showDetailLupaModal;
  if (typeof showImageModal !== 'undefined') window.showImageModal = showImageModal;
  if (typeof closeImageModal !== 'undefined') window.closeImageModal = closeImageModal;
  if (typeof showMemoPopup !== 'undefined') window.showMemoPopup = showMemoPopup;
  if (typeof closeMemoPopup !== 'undefined') window.closeMemoPopup = closeMemoPopup;
  if (typeof showRusakDetailModal !== 'undefined') window.showRusakDetailModal = showRusakDetailModal;
  if (typeof closeRusakDetailModal !== 'undefined') window.closeRusakDetailModal = closeRusakDetailModal;
  if (typeof showDetailTelatModal !== 'undefined') window.showDetailTelatModal = showDetailTelatModal;
  if (typeof closeGpsDetailModal !== 'undefined') window.closeGpsDetailModal = closeGpsDetailModal;
  if (typeof calculatePettyCashRowTotal !== 'undefined') window.calculatePettyCashRowTotal = calculatePettyCashRowTotal;
  if (typeof triggerPcFoto !== 'undefined') window.triggerPcFoto = triggerPcFoto;
  if (typeof removePettyCashInputRow !== 'undefined') window.removePettyCashInputRow = removePettyCashInputRow;
  if (typeof addEmployeeRow !== 'undefined') window.addEmployeeRow = addEmployeeRow;
  if (typeof setCurrentLocationAsOffice !== 'undefined') window.setCurrentLocationAsOffice = setCurrentLocationAsOffice;
  if (typeof saveOfficeConfig !== 'undefined') window.saveOfficeConfig = saveOfficeConfig;
  if (typeof loadOfficeConfig !== 'undefined') window.loadOfficeConfig = loadOfficeConfig;
  if (typeof saveJamConfig !== 'undefined') window.saveJamConfig = saveJamConfig;
  if (typeof loadJamConfig !== 'undefined') window.loadJamConfig = loadJamConfig;
  if (typeof addGpsShiftRow !== 'undefined') window.addGpsShiftRow = addGpsShiftRow;
  if (typeof cycleAbsensiStatus !== 'undefined') window.cycleAbsensiStatus = cycleAbsensiStatus;
  if (typeof updateJadwalLegend !== 'undefined') window.updateJadwalLegend = updateJadwalLegend;
  if (typeof deleteSingleGpsLog !== 'undefined') window.deleteSingleGpsLog = deleteSingleGpsLog;
  if (typeof toggleEmptyRows !== 'undefined') window.toggleEmptyRows = toggleEmptyRows;
  if (typeof showCustomAlert !== 'undefined') window.showCustomAlert = showCustomAlert;
  if (typeof initAbsensiHardware !== 'undefined') window.initAbsensiHardware = initAbsensiHardware;
  if (typeof showCustomConfirm !== 'undefined') window.showCustomConfirm = showCustomConfirm;
  if (typeof populateGpsNames !== 'undefined') window.populateGpsNames = populateGpsNames;
})();

// [OPTIMASI] Jalankan Kamera & GPS segera setelah halaman siap (tanpa menunggu DB)
if (window.RBM_PAGE === 'absensi-gps-view') {
    function runGpsEarlyInit() {
        if (window.initAbsensiHardware) window.initAbsensiHardware();
        // [OPTIMASI 2] Langsung isi nama dari cache localStorage, jangan tunggu DB
        if (window.populateGpsNames) window.populateGpsNames();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runGpsEarlyInit);
    } else {
        runGpsEarlyInit();
    }
}

function showCustomAlert(message, title, type) {
    let modal = document.getElementById('rbm-custom-alert');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rbm-custom-alert';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:none; align-items:center; justify-content:center; z-index:10000;';
        modal.innerHTML = `
            <div style="background:white; padding:24px; border-radius:16px; max-width:85%; width:320px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <style>@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
                <div id="rbm-alert-icon" style="font-size:48px; margin-bottom:16px;"></div>
                <h3 id="rbm-alert-title" style="margin:0 0 8px; color:#1e293b; font-size: 18px; font-weight: 700;"></h3>
                <p id="rbm-alert-msg" style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.5;"></p>
                <button onclick="document.getElementById('rbm-custom-alert').style.display='none'" style="background:#1e40af; color:white; border:none; padding:12px 0; border-radius:10px; font-weight:600; cursor:pointer; width:100%; font-size:14px; transition: background 0.2s;">Tutup</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const iconEl = document.getElementById('rbm-alert-icon');
    const titleEl = document.getElementById('rbm-alert-title');
    const msgEl = document.getElementById('rbm-alert-msg');
    
    titleEl.textContent = title || 'Info';
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
    
    if (type === 'success') {
        iconEl.textContent = '✅';
        titleEl.style.color = '#15803d';
    } else if (type === 'error') {
        iconEl.textContent = '❌';
        titleEl.style.color = '#b91c1c';
    } else if (type === 'warning') {
        iconEl.textContent = '⚠️';
        titleEl.style.color = '#b45309';
    } else {
        iconEl.textContent = 'ℹ️';
        titleEl.style.color = '#1e293b';
    }
    
    modal.style.display = 'flex';
}

function showCustomConfirm(message, title, onYes) {
    let modal = document.getElementById('rbm-custom-confirm');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'rbm-custom-confirm';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:none; align-items:center; justify-content:center; z-index:10001;';
        modal.innerHTML = `
            <div style="background:white; padding:24px; border-radius:16px; max-width:85%; width:320px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="font-size:48px; margin-bottom:16px;">❓</div>
                <h3 id="rbm-confirm-title" style="margin:0 0 8px; color:#1e293b; font-size: 18px; font-weight: 700;"></h3>
                <p id="rbm-confirm-msg" style="margin:0 0 24px; color:#64748b; font-size:14px; line-height:1.5;"></p>
                <div style="display:flex; gap:10px;">
                    <button id="rbm-confirm-no" style="flex:1; background:#e2e8f0; color:#475569; border:none; padding:12px 0; border-radius:10px; font-weight:600; cursor:pointer; font-size:14px;">Batal</button>
                    <button id="rbm-confirm-yes" style="flex:1; background:#1e40af; color:white; border:none; padding:12px 0; border-radius:10px; font-weight:600; cursor:pointer; font-size:14px;">Ya, Lanjut</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const titleEl = document.getElementById('rbm-confirm-title');
    const msgEl = document.getElementById('rbm-confirm-msg');
    const yesBtn = document.getElementById('rbm-confirm-yes');
    const noBtn = document.getElementById('rbm-confirm-no');
    
    titleEl.textContent = title || 'Konfirmasi';
    msgEl.innerHTML = message;
    
    // Clone buttons to remove old listeners
    const newYes = yesBtn.cloneNode(true);
    const newNo = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYes, yesBtn);
    noBtn.parentNode.replaceChild(newNo, noBtn);
    
    newYes.onclick = function() {
        document.getElementById('rbm-custom-confirm').style.display = 'none';
        if (onYes) onYes();
    };
    newNo.onclick = function() {
        document.getElementById('rbm-custom-confirm').style.display = 'none';
    };
    
    modal.style.display = 'flex';
}
