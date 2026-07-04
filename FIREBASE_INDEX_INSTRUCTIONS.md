Cara pakai snippet indeks Firebase

1) Tujuan
- Menambahkan index pada field `outlet` untuk path yang dilaporkan di console:
  - `/rbm_pro/pengajuan_tf`
  - `/rbm_pro/petty_cash/pengajuan`

2) Pilihan penggunaan
- Jika Anda menggunakan Firebase Console: buka Realtime Database → Rules, lalu tambahkan/merge properti `".indexOn": ["outlet"]` pada node yang sesuai.
- Jika Anda deploy dari file lokal, gabungkan snippet dari `database.rules.suggest.json` ini ke file `database.rules.json` project Anda.

3) Contoh deploy (Firebase CLI)
```bash
firebase deploy --only database
```

4) Catatan penting
- Jangan menimpa aturan keamanan lain tanpa memeriksa. File contoh ini hanya berisi bagian index; jika Anda mengganti seluruh `database.rules.json`, pastikan aturan baca/tulis (`.read` / `.write`) tetap sesuai kebijakan Anda.
- Setelah menambahkan index, peringatan "Using an unspecified index" seharusnya hilang ketika query memakai `orderByChild('outlet')` atau filter yang sama.

Butuh saya langsung buat `database.rules.json` siap-deploy (saya bisa sertakan template aman)? Balas "ya" jika ingin saya buatkan file deploy-ready.
