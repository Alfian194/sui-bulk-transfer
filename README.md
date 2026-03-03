# SUI Wallet Automation

Script otomatis untuk mengirim SUI dan SSR token ke banyak wallet sekaligus.

---

## Fitur

- **Menu 1** — Kirim SUI dari semua wallet ke 1 tujuan (menyisakan saldo sesuai config)
- **Menu 2** — Kirim SSR token dari semua wallet ke 1 tujuan (input manual jumlah per wallet)
- **Menu 3** — Master wallet kirim SUI ke semua wallet (input manual jumlah per wallet)

---

## Menjalankan di Codespace

### 1. Buka di Codespace Dan Clone Repository
``` 
git clone https://github.com/Alfian194/sui-bulk-transfer.git

cd sui-bulk-transfer

### 2. Install Dependencies
```bash
npm install @mysten/sui dotenv
```

### 3. Buat File Konfigurasi
```bash
# Buat config.json
nano config.json

# Buat mnemonics.json
nano mnemonics.json

# Buat .env
nano .env
```

### 4. Jalankan Script
```bash
npm start
```

---

## Menjalankan di Termux

### 1. Install Termux
Download Termux dari [F-Droid](https://f-droid.org/packages/com.termux/) (disarankan) atau Google Play Store.

### 2. Install Node.js & Git
```bash
pkg update && pkg upgrade
pkg install nodejs git
```

### 3. Clone Repository
```bash
git clone https://github.com/Alfian194/sui-bulk-transfer.git
cd sui-bulk-transfer
```

### 4. Install Dependencies
```bash
npm install @mysten/sui dotenv
```

---

## Konfigurasi

### config.json
Buat file `config.json` di folder project:
```json
{
  "rpc": "",
  "destination": "0xALAMAT_TUJUAN",
  "leaveSui": 0.0085,
  "ssrType": "0xTYPE_SSR_TOKEN"
}
```

- `rpc` — kosongkan untuk pakai mainnet default
- `destination` — alamat tujuan pengiriman SUI dan SSR
- `leaveSui` — jumlah SUI yang disisakan di setiap wallet (Menu 1)
- `ssrType` — coin type SSR token

### mnemonics.json
Buat file `mnemonics.json` berisi daftar mnemonic wallet:
```json
[
  "word1 word2 word3 ... word12",
  "word1 word2 word3 ... word12"
]
```

### .env
Buat file `.env` berisi private key master wallet (untuk Menu 3):
```
MASTER_PRIVATE_KEY=suiprivkey1qzg...
```

---

## Menjalankan Script

```bash
npm start
```

Pilih menu yang tersedia:
```
1. Send SUI ke 1 tujuan
2. Send SSR ke 1 tujuan
3. Master kirim ke semua wallet
```

---

## Catatan

- Pastikan saldo SUI master wallet cukup sebelum menjalankan Menu 3
- Script akan otomatis skip wallet yang saldonya tidak cukup
- Delay antar wallet adalah 3 detik setelah transaksi terkonfirmasi
