const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const os = require('os'); // [BARU] Untuk cek IP Address
const { exec } = require('child_process'); // [BARU] Untuk menjalankan perintah sistem

const app = express();
const PORT = 3001; // Port diubah ke 3001

// [KONFIGURASI] Ganti null dengan path lengkap jika ingin lokasi khusus
// Contoh Windows: "D:\\Data Kasir\\database.json" (Gunakan double backslash)
const CUSTOM_DB_PATH = null; 
const CONFIG_FILE = path.join(__dirname, 'server-config.json');

// Prioritas: 1. Config di atas, 2. Drag & Drop (Argumen), 3. Default folder ini
let currentDbFile = CUSTOM_DB_PATH || process.argv[2] || path.join(__dirname, 'database.json');

// [BARU] Cek apakah ada konfigurasi tersimpan (agar lokasi tidak reset saat restart)
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (savedConfig.dbPath) currentDbFile = savedConfig.dbPath;
    } catch (e) { console.error("Gagal memuat config:", e); }
}

// [SAFETY CHECK] Jika path yang dipilih adalah FOLDER, otomatis tambahkan 'database.json'
try {
    // Cek jika path ada dan berupa direktori
    if (fs.existsSync(currentDbFile) && fs.lstatSync(currentDbFile).isDirectory()) {
        console.log(`[INFO] Path yang dipilih adalah folder. Otomatis menambahkan filename.`);
        currentDbFile = path.join(currentDbFile, 'database.json');
    }
} catch(e) { console.error("Error checking path type:", e); }

app.use(cors());

// [BARU] Log setiap request agar terlihat di terminal
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use(bodyParser.json({ limit: '50mb' })); // Limit besar untuk gambar

// Load DB awal jika belum ada
// [BARU] Buat folder secara otomatis jika belum ada (misal D:\Data Baru\)
const dbDir = path.dirname(currentDbFile);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(currentDbFile)) {
    fs.writeFileSync(currentDbFile, JSON.stringify({}, null, 2));
}

// [BARU] Cek Info Server (Untuk memastikan lokasi file)
app.get('/info', (req, res) => {
    res.json({ 
        status: 'online', 
        port: PORT, 
        dbFile: currentDbFile 
    });
});

// [BARU] Endpoint untuk membuka dialog "Save As" (Pilih Folder & Nama)
app.post('/admin/browse-save', (req, res) => {
    // Dapatkan folder saat ini agar dialog mulai dari sana
    let currentDir = path.dirname(path.resolve(currentDbFile));
    // [FIX] Escape single quotes untuk PowerShell agar path tidak error
    currentDir = currentDir.replace(/'/g, "''");

    // Script PowerShell untuk membuka dialog Save File Windows
    // [FIX] Menggunakan single quotes untuk string PowerShell dan flatten command
    const psCommand = `
        Add-Type -AssemblyName System.Windows.Forms;
        $FileBrowser = New-Object System.Windows.Forms.SaveFileDialog;
        $FileBrowser.Filter = 'JSON Database (*.json)|*.json|All Files (*.*)|*.*';
        $FileBrowser.Title = 'Pilih Lokasi Database Baru';
        $FileBrowser.FileName = 'database_baru.json';
        $FileBrowser.InitialDirectory = '${currentDir}';
        $result = $FileBrowser.ShowDialog();
        if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Host $FileBrowser.FileName }
    `.replace(/\n/g, ' ');

    // [FIX] Tambahkan -ApartmentState STA agar dialog muncul (Penting!)
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -ApartmentState STA -Command "${psCommand.replace(/"/g, '\\"')}"`, { timeout: 0 }, (error, stdout, stderr) => {
        const selectedPath = stdout ? stdout.trim() : '';
        if (selectedPath) {
            res.json({ status: 'success', path: selectedPath });
        } else {
            res.json({ status: 'cancelled' });
        }
    });
});

// [BARU] Endpoint untuk mengubah lokasi database dari UI
app.post('/admin/config', (req, res) => {
    const { dbPath } = req.body;
    if (!dbPath) return res.status(400).json({ status: 'error', message: 'Path tidak boleh kosong' });

    try {
        // [BARU] Cek jika user hanya memasukkan folder, tambahkan database.json
        let finalPath = dbPath;
        if (fs.existsSync(dbPath) && fs.lstatSync(dbPath).isDirectory()) {
            finalPath = path.join(dbPath, 'database.json');
        }

        // Buat folder jika belum ada
        const dir = path.dirname(finalPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Buat file database kosong jika belum ada
        if (!fs.existsSync(finalPath)) fs.writeFileSync(finalPath, '{}');

        // Update variabel global
        currentDbFile = finalPath;

        // Simpan ke file config agar permanen
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ dbPath: currentDbFile }, null, 2));

        console.log(`[CONFIG] Lokasi database diubah ke: ${currentDbFile}`);
        res.json({ status: 'success', dbPath: currentDbFile });
    } catch (e) {
        console.error("Gagal ubah lokasi:", e);
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// GET Data
app.get('/db', (req, res) => {
    fs.readFile(currentDbFile, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.json(JSON.parse(data || '{}'));
    });
});

// SAVE Data
app.post('/db', (req, res) => {
    const newData = req.body;
    fs.writeFile(currentDbFile, JSON.stringify(newData, null, 2), (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server Database Lokal berjalan di http://localhost:${PORT}`);
    
    // [BARU] Tampilkan IP LAN untuk akses dari device lain
    const interfaces = os.networkInterfaces();
    let lanIp = 'localhost';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                lanIp = iface.address;
            }
        }
    }
    console.log(`📡 Akses dari HP/PC lain (Satu WiFi): http://${lanIp}:${PORT}/db`);
    console.log(`📂 Data tersimpan di: ${currentDbFile}`);
});
