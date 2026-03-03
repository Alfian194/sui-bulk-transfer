# SUI Wallet Automation

Script otomatis untuk mengirim SUI dan SSR token ke banyak wallet sekaligus.

---

## Fitur

- **Menu 1** — Kirim SUI dari semua wallet ke 1 tujuan (menyisakan saldo sesuai config)
- **Menu 2** — Kirim SSR token dari semua wallet ke 1 tujuan (input manual jumlah per wallet)
- **Menu 3** — Master wallet kirim SUI ke semua wallet (input manual jumlah per wallet)

---

## Menjalankan di Codespace

**1. Clone Repository**
```bash
git clone https://github.com/Alfian194/sui-bulk-transfer.git
cd sui-bulk-transfer
```

**2. Install Dependencies**
```bash
npm install @mysten/sui dotenv
```

**3. Buat File Konfigurasi**
```bash
cp mnemonics.example.json mnemonics.json
nano mnemonics.json
```
```bash
cp .env.example .env
nano .env
```

**4. Jalankan Script**
```bash
npm start
```

---

## Menjalankan di Termux

**1. Install Termux**

Download Termux dari Google Play Store.

**2. Install Node.js & Git**
```bash
pkg update && pkg upgrade
pkg install nodejs git
```

**3. Clone Repository**
```bash
git clone https://github.com/Alfian194/sui-bulk-transfer.git
cd sui-bulk-transfer
```

**4. Install Dependencies**
```bash
npm install @mysten/sui dotenv
```

**5. Buat File Konfigurasi**
```bash
cp mnemonics.example.json mnemonics.json
nano mnemonics.json
```
```bash
cp .env.example .env
nano .env
```

**6. Jalankan Script**
```bash
npm start
```

---

## Konfigurasi

**config.json**
```json
{
  "rpc": "https://fullnode.mainnet.sui.io",
  "destination": "0x150ebc490620ce05775803cc55f0e33a16db1a6a7646501cd4b8989343d38799",
  "leaveSui": 0.0085,
  "delay": 3000,
  "ssrType": "0x79f0b9a0862120619e0ed79690c81be28032b63b2b4fb19226dc81f40fa60d03::SSR::SSR"
}
```

- `rpc` — RPC endpoint mainnet SUI
- `destination` — alamat tujuan pengiriman SUI dan SSR
- `leaveSui` — jumlah SUI yang disisakan di setiap wallet (Menu 1)
- `delay` — delay antar wallet dalam milidetik
- `ssrType` — coin type SSR token

**mnemonics.json** (salin dari template)
```bash
cp mnemonics.example.json mnemonics.json
nano mnemonics.json
```
Isi dengan phrase wallet kamu:
```json
[
  "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12",
  "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
]
```

**.env** (salin dari template)
```bash
cp .env.example .env
nano .env
```
Isi dengan private key master wallet:
```
MASTER_PRIVATE_KEY=suiprivkey1qzg...
```

---

## Catatan

- File `mnemonics.json` dan `.env` tidak akan ter-push ke GitHub karena ada di `.gitignore`
- Phrase dan private key kamu **hanya tersimpan di device kamu sendiri**
- Pastikan saldo SUI master wallet cukup sebelum menjalankan Menu 3
- Script akan otomatis skip wallet yang saldonya tidak cukup
- Delay antar wallet adalah 3 detik setelah transaksi terkonfirmasi
