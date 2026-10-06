# Sinkronisasi semua data HPP dari Google Sheets

Halaman HPP membaca lima tab spreadsheet setiap 60 detik:

1. `Bahan Baku Dapur`
2. `Bahan Baku Resto`
3. `Resep Resto`
4. `Resep Dapur`
5. `Kemasan`

Google Sheets menjadi satu-satunya sumber data HPP. Halaman membaca data dari spreadsheet; saat membaca data, Apps Script juga memperbarui kolom D tab `Resep Dapur` untuk harga jual yang dapat dihitung dari HPP. Ubah data lain langsung di tab Google Sheets; halaman tidak memuat data dari Firebase, cache lokal, atau import Excel/CSV.

## Header tab

Baris pertama setiap tab harus berisi header berikut. Huruf besar/kecil dan spasi tidak berpengaruh; kolom tambahan diperbolehkan.

| Tab | Header wajib |
|---|---|
| Bahan Baku Dapur | `kode_bahan`, `nama_bahan`, `kategori`, `satuan`, `harga`, `harga_standar` |
| Bahan Baku Resto | `kode_bahan`, `nama_bahan`, `kategori`, `satuan`, `harga` |
| Resep Resto | `kode_menu`, `nama_menu`, `kategori`, `harga_jual`, `kode_bahan`, `nama_bahan`, `qty`, `satuan` |
| Resep Dapur | `nama_produk`, `qty_barang_jadi`, `satuan_barang` (atau `satuan_barang_jadi`), `harga_jual_satuan`, `nama_bahan_baku`, `qty_bahan`, `satuan_bahan` |
| Kemasan | `kode`, `qty`, `satuan`, dan `nama` (atau dua kolom `nama` untuk jenis dan nama item). `jenis` atau `kategori` dapat dipakai untuk jenis kemasan. |

Pada tab `Bahan Baku Dapur`, harga baru untuk monitor HPP diambil dari kolom F (`harga_standar`), harga lama dari kolom E (`harga`), dan satuan HPP dari kolom G (`satuan`, yaitu kolom satuan kedua). Kolom D adalah satuan pembelian dan kolom H (`keterangan_satuan`) hanya keterangan jumlah/isi. Katalog PO Central Kitchen memakai kolom B sebagai nama, C sebagai kategori, D sebagai satuan, dan E sebagai harga. Checkbox di kolom I menentukan apakah barang muncul di katalog pilihan PO: dicentang berarti dapat dipilih, tidak dicentang berarti tidak muncul di PO. Setelah mengganti Apps Script agar membaca checkbox tersebut, deploy versi baru. Letakkan satu bahan/komponen pada setiap baris resep. Baris-baris dengan kode menu atau nama produk sama akan digabung menjadi satu resep. Kode bahan dapur ditampilkan dengan awalan `BB.DAPUR.` jika sheet belum mencantumkannya.

Pada tab `Resep Dapur`, harga jual selalu mengikuti HPP resep dan dihitung dari biaya bahan; halaman tidak menyediakan harga custom. Setiap kali aplikasi membaca data, Apps Script menghitung harga jual per satuan dengan aturan HPP yang sama seperti web, lalu memperbarui kolom D (`harga_jual_satuan`) untuk semua baris produk yang memiliki yield valid. Bahan resep yang tidak ditemukan atau tidak memiliki harga dihitung Rp0, sama seperti web, dan jumlah baris bahan tersebut dilaporkan agar nama bahan dapat diperbaiki di tab master. Produk dengan yield tidak valid tidak ditulis. Respons Apps Script memverifikasi nilai setelah penulisan dan halaman menampilkan jumlah baris kolom D yang diperbarui, sudah sama, atau tidak dapat dihitung. Kolom E (`satuan_harga_jual`) tetap digunakan sebagai satuan acuan perhitungan harga jual per satuan.

Template dengan lima tab dan header di atas dapat diunduh dari **Atur Link Sheets > Download Template Sheets**. Unggah file `.xlsx` tersebut ke Google Drive, lalu buka dengan Google Sheets untuk dijadikan spreadsheet data.

## Pasang Apps Script

1. Pada halaman HPP pilih **Atur Link Sheets**, lalu unduh **Download Apps Script**.
2. Buka spreadsheet, pilih **Ekstensi > Apps Script**, tempel isi file unduhan ke `Code.gs`, lalu simpan.
3. Pilih **Deploy > New deployment > Web app**. Pilih **Execute as: Me** agar script membaca spreadsheet dengan izin pemilik deployment.
4. Pilih **Who has access: Anyone** agar halaman dapat membaca tanpa login Google. Opsi **Anyone with Google account** dapat mengalihkan permintaan halaman ke login dan gagal. Akses Anyone membuat data yang dikembalikan endpoint dapat dibaca publik oleh siapa pun yang memiliki URL Web App; jangan gunakan untuk data rahasia.
5. Deploy, salin URL Web App yang berakhir `/exec`, lalu kembali ke **Atur Link Sheets**. Masukkan URL Web App dan URL spreadsheet, kemudian pilih **Simpan & Hubungkan**.
6. Setelah mengubah kode Apps Script, buka **Deploy > Manage deployments**, edit deployment, pilih **New version**, lalu deploy. Mengganti URL spreadsheet berikutnya cukup dilakukan dari halaman HPP.

Status di bagian atas halaman menunjukkan koneksi berhasil atau alasan kegagalan. Jika muncul pesan tab/header tidak ditemukan, cocokkan nama tab dan header pada tabel di atas. Jika muncul penolakan Google, periksa izin deployment, izin spreadsheet untuk akun pemilik deployment, dan pastikan deployment terbaru sudah aktif.

Pembacaan lima tab dapat memerlukan waktu jika spreadsheet berisi banyak baris. Halaman menunggu hingga 60 detik dan akan menampilkan status bahwa data sedang dibaca. Jika tetap timeout, buka Apps Script **Executions** untuk melihat apakah `doGet` gagal atau berhenti; jalankan ulang endpoint dengan `?action=getHppData&callback=tes`. Error validasi dari script menyebut nama tab spesifik (`Gagal membaca tab ...`); bila tidak ada respons sama sekali, periksa eksekusi Apps Script dan akses spreadsheet pemilik deployment.

Jika status menunjukkan **Aksi tidak dikenal**, URL Web App mengarah ke deployment Apps Script versi lama yang belum mendukung `getHppData`. Unduh Apps Script terbaru dari pengaturan, ganti seluruh isi `Code.gs`, lalu deploy versi baru dan pastikan URL `/exec` yang tersimpan adalah deployment aktif.

Jika pengujian `/exec?action=getVersion&callback=tes` menjawab `Aksi tidak dikenal`, deployment pada URL itu belum menjalankan kode terbaru. Versi Apps Script saat ini adalah `hpp-five-tabs-2026-10-06-4`. Pada proyek Apps Script yang URL deployment-nya dipakai halaman, ganti seluruh isi `Code.gs` dengan isi file Apps Script terbaru, simpan, lalu pada deployment dengan URL yang sama pilih **Edit > New version > Deploy**. Uji ulang URL `/exec?action=getVersion&callback=tes`; respons yang benar ialah `tes({"status":"success","version":"hpp-five-tabs-2026-10-06-4"});`. Jika respons tetap `Aksi tidak dikenal`, pastikan Anda mengedit proyek Apps Script yang benar dan menyalin URL `/exec` deployment tersebut ke pengaturan halaman.

Jika status Web App mengembalikan `Login ke akun Google yang memiliki akses ke spreadsheet`, deployment masih menjalankan kode lama yang berisi pemeriksaan login. Pesan tersebut tidak ada pada `google-sheets-sync.gs` terbaru dan muncul sebelum script memeriksa tab maupun header. Pada proyek Apps Script yang URL deployment-nya dipakai, ganti seluruh isi `Code.gs`, simpan, lalu pada deployment aktif pilih **Edit > New version > Deploy**. Jika jawaban masih meminta login, deployment/URL yang diuji belum memakai kode terbaru.
