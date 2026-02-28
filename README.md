Sui Bulk Transfer
Script untuk bulk send koin di jaringan SUI — bisa kirim SUI atau SSR dari banyak wallet sekaligus, atau distribute dari 1 master wallet ke banyak wallet.

Fitur

Send SUI ke 1 tujuan dari banyak wallet
Send SSR ke 1 tujuan dari banyak wallet
Master Distribute — kirim SUI dari 1 wallet ke banyak wallet sekaligus


Persyaratan

Node.js v18 atau lebih baru
npm


Instalasi

Clone repo ini

git clone https://github.com/Alfian194/sui-bulk-transfer.git
cd sui-bulk-transfer

Install dependencies

bash   npm install

Konfigurasi
1. File .env
Buat file .env di root folder, isi dengan:
MASTER_PRIVATE_KEY=suiprivkey1xxxxxxxxxxxxxxxx

File ini hanya dibutuhkan jika menggunakan fitur Master Distribute.


2. File config.json
Sesuaikan isi config.json:
json{
  "rpc": "https://fullnode.mainnet.sui.io:443",
  "destination": "0xALAMAT_TUJUAN_KAMU",
  "leaveSui": 0.01,
  "delay": 1000,
  "ssrType": "0xSSR_COIN_TYPE"
}
FieldKeteranganrpcRPC endpoint jaringan SUIdestinationAlamat tujuan pengirimanleaveSuiSisa SUI yang ditinggal di wallet (untuk gas)delayJeda antar transaksi dalam milidetikssrTypeCoin type untuk token SSR

3. File mnemonics.json
Buat file mnemonics.json berisi daftar mnemonic wallet:
json[
  "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12",
  "word1 word2 word3 ..."
]

⚠️ JANGAN share file ini ke siapapun!


Cara Menjalankan
bashnode index.js ATAU npm start

Nanti akan muncul menu:
1. Send SUI ke 1 tujuan
2. Send SSR ke 1 tujuan
3. Master kirim ke semua wallet

Pilih menu:
Ketik angka sesuai pilihan lalu tekan Enter.

⚠️ Peringatan Keamanan

Jangan pernah share file .env dan mnemonics.json
Pastikan kedua file tersebut ada di .gitignore
Gunakan di jaringan testnet dulu sebelum mainnet
