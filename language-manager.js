(function () {
  'use strict';

  const translations = {
    en: {
      'Kasir / Menu': 'Cashier / Menu', 'Pesanan Masuk': 'Incoming Orders', 'Kelola Menu': 'Manage Menu', 'Input Point': 'Add Points',
      'Laporan Pendapatan': 'Revenue Report', 'Dashboard Keuangan': 'Finance Dashboard', 'Validasi Voucher': 'Validate Voucher', 'QR Meja': 'Table QR',
      'Promo & Diskon': 'Promos & Discounts', 'Kelola Hadiah': 'Manage Rewards', 'Web Customer': 'Customer Web', 'Data & Penyimpanan': 'Data & Storage',
      'Pengaturan': 'Settings', 'Absensi & Jadwal': 'Attendance & Schedule', 'Data Karyawan (HR)': 'Employee Data (HR)', 'Reservasi': 'Reservations',
      'Stok Barang': 'Inventory', 'Absensi GPS': 'GPS Attendance', 'Pengajuan Dana': 'Fund Requests', 'Lihat Petty Cash': 'View Petty Cash',
      'Pembukuan': 'Bookkeeping', 'Lihat Inventaris': 'View Assets', 'Rekap Absensi GPS': 'GPS Attendance Recap', 'Arsip Dokumen & Meeting': 'Documents & Meetings',
      'Data Grid Editor': 'Data Grid Editor', 'Form Kebersihan': 'Cleaning Form', 'Modul Keuangan Baru': 'New Finance Module', 'Setting Keuangan': 'Finance Settings',
      'Input Transaksi': 'Enter Transactions', 'Laba Rugi & Stok': 'Profit, Loss & Inventory', 'Analisis BEP Cabang': 'Branch BEP Analysis',
      'Menu Utama': 'Main Menu', 'Selamat Datang': 'Welcome', 'Pemberitahuan': 'Notifications', 'Tidak ada notifikasi': 'No notifications',
      'Pesanan Baru': 'New Order', 'Nomor Meja': 'Table Number', 'Item': 'Item', 'Qty': 'Qty', 'Total': 'Total', 'Subtotal': 'Subtotal',
      'Discount': 'Discount', 'Pajak (10%)': 'Tax (10%)', 'Masukan Nominal Tunai': 'Enter Cash Amount', 'Print': 'Print', 'Dine-in': 'Dine-in',
      'Take-away': 'Take-away', 'Simpan': 'Save', 'Refresh': 'Refresh', 'Atur Urutan': 'Set Order', 'Export': 'Export', 'Excel': 'Excel', 'PDF': 'PDF',
      'Absensi, Jadwal & Gaji': 'Attendance, Schedule & Payroll', 'Kelola jadwal, absensi, laporan, dan gaji karyawan': 'Manage employee schedules, attendance, reports, and payroll',
      'Tanggal Mulai': 'Start Date', 'Tanggal Selesai': 'End Date', 'Sisa Cuti': 'Remaining Leave', 'Nama': 'Name', 'Jabatan': 'Position',
      'Join Date': 'Join Date', 'Laporan Absensi': 'Attendance Report', 'Pengajuan Absensi': 'Attendance Requests', 'Rekap Gaji': 'Payroll Recap',
      'Cuti & Lembur': 'Leave & Overtime', 'Bonus': 'Bonus', 'Save / Print Jadwal': 'Save / Print Schedule', 'Simpan': 'Save', 'Logout': 'Logout',
      'Menunggu': 'Pending', 'Disetujui': 'Approved', 'Ditolak': 'Rejected', 'Batal': 'Cancel', 'Cari': 'Search', 'Tambah': 'Add', 'Hapus': 'Delete',
      'Edit': 'Edit', 'Detail': 'Details', 'Kembali': 'Back', 'Kirim': 'Submit', 'Tutup': 'Close', 'Ya': 'Yes', 'Tidak': 'No',
      'Analisis Laba Rugi & BEP': 'Profit, Loss & BEP Analysis', 'Sistem Analisis Laba Rugi Cabang & Simulasi BEP': 'Branch Profit, Loss & BEP Simulation',
      'Dashboard konsolidasi F&B multi-outlet untuk membaca profitabilitas dan titik impas.': 'Consolidated multi-outlet F&B dashboard for profitability and break-even analysis.',
      'Import Accurate': 'Import Accurate', 'Atur Simulasi': 'Configure Simulation', 'Jalankan Simulasi': 'Run Simulation', 'Simpan PDF': 'Save PDF',
      'PANEL KONTROL & FILTER': 'CONTROL & FILTER PANEL', 'Skenario Pendapatan': 'Revenue Scenario', 'Standar Acuan Biaya': 'Standard Cost Basis',
      'Metode Laba Bersih': 'Net Profit Method', 'Filter Tampilan': 'Display Filter', 'Simulasi Mode': 'Simulation Mode', 'Rekapitulasi Laba Rugi Cabang': 'Branch Profit & Loss Summary',
      'Ringkasan Monitoring BEP & Target': 'BEP & Target Monitoring Summary', 'Absensi & Jadwal': 'Attendance & Schedule', 'Laporan Pendapatan': 'Revenue Report',
      'Muat Pengajuan': 'Load Requests', 'Klik Muat Pengajuan.': 'Click Load Requests.', 'Simpan Perubahan': 'Save Changes', 'Download Semua Slip (ZIP)': 'Download All Payslips (ZIP)',
      'Bonus Absensi': 'Attendance Bonus', 'Tambah Baris': 'Add Row', 'Print Laporan': 'Print Report', 'Kembali ke Rekap': 'Back to Summary',
      'Pilih Outlet:': 'Select Outlet:', 'Input Barang': 'Enter Items', 'Stok Barang': 'Inventory', 'Riwayat Input Barang': 'Item Entry History',
      'Barang Masuk': 'Incoming Goods', 'Barang Keluar': 'Outgoing Goods', 'Sisa': 'Remaining', 'Rusak': 'Damaged', 'Detail Barang': 'Item Details',
      'Simpan Data': 'Save Data', 'Simpan Data Stok': 'Save Inventory Data', 'Kelola Item': 'Manage Items', 'Riwayat Database': 'Database History',
      'Same Item on Sales': 'Sales Items', 'Fruits & Vegetables': 'Fruits & Vegetables', 'Same Item Not Sales': 'Non-sales Items', 'Tampilkan': 'Show',
      'Kembali ke Stok': 'Back to Inventory', 'Pilih Jenis': 'Select Type', 'Memuat data...': 'Loading data...', 'PREVIEW': 'PREVIEW',
      'PREVIEW FORM': 'FORM PREVIEW', 'Form Checklist Kebersihan': 'Cleaning Checklist Form', 'Pilih Form Kebersihan': 'Select Cleaning Form',
      'Cetak Form Kebersihan': 'Print Cleaning Form', 'Jenis Form Kebersihan': 'Cleaning Form Type', 'Silakan pilih form kebersihan...': 'Please select a cleaning form...',
      'Kelola Template Form Kebersihan': 'Manage Cleaning Form Templates', 'Buat Template Baru': 'Create New Template', 'Hapus Template': 'Delete Template',
      'Batal': 'Cancel', 'Simpan Template': 'Save Template', 'Nama Form / Lokasi Area': 'Form Name / Area', 'Daftar Tugas Kebersihan': 'Cleaning Task List'
    },
    'zh-TW': {
      'Kasir / Menu': '收銀台／選單', 'Pesanan Masuk': '進來的訂單', 'Kelola Menu': '管理選單', 'Input Point': '輸入點數',
      'Laporan Pendapatan': '收入報表', 'Dashboard Keuangan': '財務儀表板', 'Validasi Voucher': '驗證優惠券', 'QR Meja': '桌號 QR',
      'Promo & Diskon': '促銷與折扣', 'Kelola Hadiah': '管理獎勵', 'Web Customer': '顧客網站', 'Data & Penyimpanan': '資料與儲存',
      'Pengaturan': '設定', 'Absensi & Jadwal': '出勤與排班', 'Data Karyawan (HR)': '員工資料（人資）', 'Reservasi': '預約', 'Stok Barang': '庫存',
      'Absensi GPS': 'GPS 出勤', 'Pengajuan Dana': '資金申請', 'Lihat Petty Cash': '查看零用金', 'Pembukuan': '記帳', 'Lihat Inventaris': '查看資產',
      'Rekap Absensi GPS': 'GPS 出勤彙總', 'Arsip Dokumen & Meeting': '文件與會議檔案', 'Data Grid Editor': '資料表編輯器', 'Form Kebersihan': '清潔表單',
      'Modul Keuangan Baru': '新財務模組', 'Setting Keuangan': '財務設定', 'Input Transaksi': '輸入交易', 'Laba Rugi & Stok': '損益與庫存',
      'Analisis BEP Cabang': '分店損益平衡分析', 'Menu Utama': '主選單', 'Selamat Datang': '歡迎', 'Pemberitahuan': '通知', 'Tidak ada notifikasi': '沒有通知',
      'Pesanan Baru': '新訂單', 'Nomor Meja': '桌號', 'Item': '品項', 'Qty': '數量', 'Total': '總計', 'Subtotal': '小計', 'Discount': '折扣',
      'Pajak (10%)': '稅金（10%）', 'Masukan Nominal Tunai': '輸入現金金額', 'Print': '列印', 'Dine-in': '內用', 'Take-away': '外帶',
      'Simpan': '儲存', 'Refresh': '重新整理', 'Atur Urutan': '調整順序', 'Export': '匯出', 'Excel': 'Excel', 'PDF': 'PDF',
      'Absensi, Jadwal & Gaji': '出勤、排班與薪資', 'Tanggal Mulai': '開始日期', 'Tanggal Selesai': '結束日期', 'Sisa Cuti': '剩餘休假',
      'Nama': '姓名', 'Jabatan': '職位', 'Join Date': '加入日期', 'Laporan Absensi': '出勤報表', 'Pengajuan Absensi': '出勤申請',
      'Rekap Gaji': '薪資彙總', 'Cuti & Lembur': '休假與加班', 'Bonus': '獎金', 'Save / Print Jadwal': '儲存／列印排班', 'Logout': '登出',
      'Menunggu': '等待中', 'Disetujui': '已核准', 'Ditolak': '已拒絕', 'Batal': '取消', 'Cari': '搜尋', 'Tambah': '新增', 'Hapus': '刪除',
      'Edit': '編輯', 'Detail': '詳細資料', 'Kembali': '返回', 'Kirim': '提交', 'Tutup': '關閉', 'Ya': '是', 'Tidak': '否',
      'Analisis Laba Rugi & BEP': '損益與損益平衡分析', 'Sistem Analisis Laba Rugi Cabang & Simulasi BEP': '分店損益與損益平衡模擬系統',
      'Dashboard konsolidasi F&B multi-outlet untuk membaca profitabilitas dan titik impas.': '整合多門市 F&B 的獲利能力與損益平衡分析儀表板。',
      'Import Accurate': '匯入 Accurate', 'Atur Simulasi': '設定模擬', 'Jalankan Simulasi': '執行模擬', 'Simpan PDF': '儲存 PDF',
      'PANEL KONTROL & FILTER': '控制與篩選面板', 'Skenario Pendapatan': '收入情境', 'Standar Acuan Biaya': '成本標準基準', 'Metode Laba Bersih': '淨利潤方法',
      'Filter Tampilan': '顯示篩選', 'Simulasi Mode': '模擬模式', 'Rekapitulasi Laba Rugi Cabang': '分店損益彙總', 'Ringkasan Monitoring BEP & Target': '損益平衡與目標監控摘要',
      'Absensi & Jadwal': '出勤與排班', 'Muat Pengajuan': '載入申請', 'Klik Muat Pengajuan.': '請點擊「載入申請」。', 'Simpan Perubahan': '儲存變更',
      'Download Semua Slip (ZIP)': '下載所有薪資單（ZIP）', 'Bonus Absensi': '出勤獎金', 'Tambah Baris': '新增列', 'Print Laporan': '列印報表', 'Kembali ke Rekap': '返回彙總'
      , 'Pilih Outlet:': '選擇門市：', 'Input Barang': '輸入品項', 'Stok Barang': '庫存', 'Riwayat Input Barang': '品項輸入紀錄', 'Barang Masuk': '進貨',
      'Barang Keluar': '出貨', 'Sisa': '剩餘', 'Rusak': '損壞', 'Detail Barang': '品項詳細資料', 'Simpan Data': '儲存資料', 'Simpan Data Stok': '儲存庫存資料',
      'Kelola Item': '管理品項', 'Riwayat Database': '資料庫紀錄', 'Same Item on Sales': '銷售品項', 'Fruits & Vegetables': '水果與蔬菜', 'Same Item Not Sales': '非銷售品項',
      'Tampilkan': '顯示', 'Kembali ke Stok': '返回庫存', 'Pilih Jenis': '選擇類型', 'Memuat data...': '載入資料中……', 'PREVIEW': '預覽',
      'PREVIEW FORM': '表單預覽', 'Form Checklist Kebersihan': '清潔檢查表', 'Pilih Form Kebersihan': '選擇清潔表單', 'Cetak Form Kebersihan': '列印清潔表單',
      'Jenis Form Kebersihan': '清潔表單類型', 'Silakan pilih form kebersihan...': '請選擇清潔表單……', 'Kelola Template Form Kebersihan': '管理清潔表單範本',
      'Buat Template Baru': '建立新範本', 'Hapus Template': '刪除範本', 'Simpan Template': '儲存範本', 'Nama Form / Lokasi Area': '表單名稱／區域', 'Daftar Tugas Kebersihan': '清潔任務清單'
    }
  };

  let activeLanguage = 'id';
  let isTranslating = false;
  const fallbackCacheKey = 'rbm_language_fallback_cache_v1';
  let fallbackCache = {};
  try { fallbackCache = JSON.parse(localStorage.getItem(fallbackCacheKey) || '{}'); } catch (error) { fallbackCache = {}; }

  function saveFallbackCache() {
    try { localStorage.setItem(fallbackCacheKey, JSON.stringify(fallbackCache)); } catch (error) {}
  }

  function shouldTranslate(value) {
    return value && value.trim() && /[A-Za-z\u00C0-\u024F]/.test(value) && !/^([\d\s.,:%+\-/()]+|Rp\s?[\d.,]+)$/.test(value.trim());
  }

  async function translateWithFallback(value, language) {
    const text = value.trim();
    if (!shouldTranslate(text) || language === 'id') return null;
    const cacheKey = `${language}|${text}`;
    if (Object.prototype.hasOwnProperty.call(fallbackCache, cacheKey)) return fallbackCache[cacheKey];
    try {
      const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=${encodeURIComponent(language)}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(endpoint);
      if (!response.ok) return null;
      const payload = await response.json();
      const translated = Array.isArray(payload) && Array.isArray(payload[0])
        ? payload[0].map(part => part[0] || '').join('')
        : '';
      if (!translated || translated === text) return null;
      fallbackCache[cacheKey] = translated;
      saveFallbackCache();
      return translated;
    } catch (error) {
      return null;
    }
  }

  function restoreOriginalContent() {
    if (document.__rbmOriginalTitle) document.title = document.__rbmOriginalTitle;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.__rbmOriginalText) node.nodeValue = node.__rbmOriginalText;
    }
    document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
      ['placeholder', 'title', 'aria-label'].forEach(attribute => {
        const property = `__rbmOriginal${attribute.replace('-', '')}`;
        if (element[property]) element.setAttribute(attribute, element[property]);
      });
    });
  }

  async function translate(language) {
    const dictionary = translations[language];
    if (!dictionary && language !== 'id') return;
    activeLanguage = language;
    document.documentElement.lang = language;
    restoreOriginalContent();
    if (language === 'id') return;
    isTranslating = true;
    const originalTitle = document.__rbmOriginalTitle || document.title;
    document.__rbmOriginalTitle = originalTitle;
    const titleTranslation = dictionary[originalTitle] || await translateWithFallback(originalTitle, language);
    if (titleTranslation) document.title = titleTranslation;
    const fallbackNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const original = node.__rbmOriginalText || node.nodeValue;
      const trimmed = original.trim();
      node.__rbmOriginalText = original;
      if (!trimmed) continue;
      if (dictionary[trimmed]) {
        node.nodeValue = original.replace(trimmed, dictionary[trimmed]);
      } else if (shouldTranslate(trimmed)) {
        fallbackNodes.push({ node, original, trimmed });
      }
    }
    await Promise.all(fallbackNodes.map(async item => {
      const translatedText = await translateWithFallback(item.trimmed, language);
      if (translatedText && item.node.__rbmOriginalText === item.original) {
        item.node.nodeValue = item.original.replace(item.trimmed, translatedText);
      }
    }));
    document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
      ['placeholder', 'title', 'aria-label'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        const property = `__rbmOriginal${attribute.replace('-', '')}`;
        const original = element[property] || element.getAttribute(attribute);
        const trimmed = original.trim();
        element[property] = original;
        if (dictionary[trimmed]) {
          element.setAttribute(attribute, original.replace(trimmed, dictionary[trimmed]));
        } else {
          translateWithFallback(trimmed, language).then(translatedText => {
            if (translatedText && element[property] === original) element.setAttribute(attribute, original.replace(trimmed, translatedText));
          });
        }
      });
    });
    isTranslating = false;
  }

  function applyStoredLanguage() {
    const language = localStorage.getItem('rbm_language');
    if (language) translate(language);
  }

  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'RBM_SET_LANGUAGE') translate(event.data.language);
  });

  function startLanguageManager() {
    applyStoredLanguage();
    new MutationObserver(() => {
      if (!isTranslating && activeLanguage !== 'id') translate(activeLanguage);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.body) startLanguageManager();
  else document.addEventListener('DOMContentLoaded', startLanguageManager, { once: true });
})();
