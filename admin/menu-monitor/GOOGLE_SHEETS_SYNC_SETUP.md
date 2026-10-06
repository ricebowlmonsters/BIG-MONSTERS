# Sinkronisasi Google Sheets

Konektor ini menyinkronkan master bahan baku dapur antara halaman HPP dan tab `Pantau Harga & Data Web`. Kolom harus berurutan: `kode_bahan`, `nama_bahan`, `kategori`, `satuan`, `harga`. Master bahan dapur tidak dimuat atau disimpan melalui Firebase maupun cache lokal; data menu, resep, dan bahan resto tetap memakai penyimpanan HPP yang sudah ada. Pengaturan link ada pada tombol **Atur Link Sheets** di halaman HPP, tepat di samping **Lihat Data Upload**. Pengaturan tersebut tersimpan di browser yang digunakan.

## Pasang Apps Script

1. Dari halaman HPP, klik **Atur Link Sheets** lalu klik **Download Apps Script**. File `google-sheets-sync.gs` akan diunduh.
2. Buka spreadsheet tujuan, lalu pilih **Ekstensi > Apps Script** untuk membuat proyek Apps Script khusus spreadsheet ini. Buka `Code.gs`, ganti seluruh isinya dengan isi file yang diunduh, lalu simpan.
3. Pilih **Deploy > New deployment > Web app**. Atur **Execute as** ke **User accessing the web app** dan batasi **Who has access** ke akun/domain Google yang memang akan memakai sinkronisasi. Jangan pilih akses anonim. Pengguna harus login ke akun Google yang sama dan memiliki akses Editor ke spreadsheet.
4. Selesaikan otorisasi Google, lalu salin URL deployment yang berakhiran `/exec`.
5. Pada halaman HPP, klik **Atur Link Sheets** (di samping **Lihat Data Upload**). Tempel URL Web App `/exec` pada kolom pertama, lalu URL spreadsheet lengkap dari browser pada kolom kedua. Klik **Simpan & Hubungkan**. URL spreadsheet dibaca dari pola `/spreadsheets/d/{ID}`; akun yang sedang mengakses Web App harus memiliki akses Editor ke spreadsheet tersebut.
6. Untuk mengaktifkan pemilihan spreadsheet dari halaman, deploy kode `google-sheets-sync.gs` terbaru satu kali: buka **Deploy > Manage deployments**, edit deployment aktif, pilih **New version**, lalu klik **Deploy**. Kode versi baru menerima ID spreadsheet pilihan dari pengaturan halaman. Setelah versi ini terpasang, pergantian spreadsheet berikutnya cukup dilakukan dari halaman web tanpa mengedit kode lagi.

Deployment sebagai pengguna yang mengakses membuat izin spreadsheet tetap mengikuti akun Google pengguna. Saat pertama kali memakai konektor, login ke Google pada browser yang sama dan setujui permintaan akses Apps Script. Jika halaman menampilkan `Google menolak akses`, pastikan browser tersebut login ke akun yang punya akses Editor, lalu periksa **Deploy > Manage deployments** dan pastikan deployment aktif, bukan akses `Only myself` jika akun pengguna berbeda. Setelah mengubah pilihan akses atau kode, buat versi deployment baru dan gunakan URL `/exec` dari deployment aktif.

Tab dengan header berbeda akan ditolak tanpa menghapus data yang sudah ada. Konektor hanya membaca master dapur dari Sheet setiap 15 detik; aplikasi web tidak mengirim perubahan bahan dapur ke Sheet. Apps Script menolak semua POST dan tidak membuat atau mengubah tab. Setelah Sheet terhubung dan memiliki data/ditandai siap, salinan lama master dapur pada record Firebase HPP dibersihkan. Untuk mengubah bahan dapur, edit langsung tab Google Sheets lalu tunggu sinkronisasi ke web.

Jika Apps Script sudah pernah di-deploy, salin versi terbaru dari `google-sheets-sync.gs` ke editor Apps Script dan deploy sebagai **New version**. Jangan lanjutkan edit data sampai deployment aktif menggunakan versi read-only ini.
