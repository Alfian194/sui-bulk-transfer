import dotenv from "dotenv";
import fs from "fs";
import readline from "readline";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

dotenv.config();

/* ================= READLINE ================= */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

/* ================= SETUP ================= */

async function runSetup() {
  console.log("\n=============================");
  console.log("   SUI BULK TRANSFER SETUP   ");
  console.log("=============================\n");

  /* ======= CONFIG.JSON ======= */
  console.log("📋 Setup config.json\n");

  const destination = await question("Masukkan alamat tujuan (destination): ");
  const leaveSui = await question("Berapa SUI yang ditinggal tiap wallet untuk gas? (contoh: 0.01): ");
  const delay = await question("Delay antar transaksi dalam ms? (contoh: 1000): ");
  const ssrType = await question("Coin type SSR (kosongkan jika tidak pakai): ");
  const rpc = await question("RPC endpoint (Enter untuk default mainnet): ");

  const config = {
    rpc: rpc.trim() || "https://fullnode.mainnet.sui.io:443",
    destination: destination.trim(),
    leaveSui: parseFloat(leaveSui) || 0.01,
    delay: parseInt(delay) || 1000,
    ssrType: ssrType.trim() || "",
  };

  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  console.log("\n✅ config.json berhasil dibuat!\n");

  /* ======= .ENV ======= */
  console.log("🔐 Setup .env (untuk fitur Master Distribute)\n");
  console.log("Pilih metode master wallet:");
  console.log("1. Private Key");
  console.log("2. Mnemonic");
  console.log("3. Lewati (skip)\n");

  const envChoice = await question("Pilih (1/2/3): ");

  if (envChoice === "1") {
    const privateKey = await question("Masukkan MASTER_PRIVATE_KEY: ");
    fs.writeFileSync("./.env", `MASTER_PRIVATE_KEY=${privateKey.trim()}\n`);
    console.log("\n✅ .env berhasil dibuat!\n");
  } else if (envChoice === "2") {
    const mnemonic = await question("Masukkan MASTER_MNEMONIC (12 kata): ");
    fs.writeFileSync("./.env", `MASTER_MNEMONIC=${mnemonic.trim()}\n`);
    console.log("\n✅ .env berhasil dibuat!\n");
  } else {
    console.log("\n⏭️  .env dilewati\n");
  }

  /* ======= MNEMONICS.JSON ======= */
  console.log("💼 Setup mnemonics.json\n");

  const mnemonics = [];
  let addMore = true;

  while (addMore) {
    const mnemonic = await question(`Masukkan mnemonic wallet ke-${mnemonics.length + 1}: `);
    mnemonics.push(mnemonic.trim());

    const more = await question("Tambah wallet lagi? (y/n): ");
    addMore = more.toLowerCase() === "y";
  }

  fs.writeFileSync("./mnemonics.json", JSON.stringify(mnemonics, null, 2));
  console.log("\n✅ mnemonics.json berhasil dibuat!\n");

  console.log("=============================");
  console.log("✅ Setup selesai!");
  console.log("=============================\n");

  // reload dotenv setelah setup
  dotenv.config();
}

/* ================= LOAD FILE ================= */

async function loadFiles() {
  // Cek apakah file config dan mnemonics sudah ada
  if (!fs.existsSync("./config.json") || !fs.existsSync("./mnemonics.json")) {
    console.log("\n⚠️  File config.json atau mnemonics.json tidak ditemukan.");
    console.log("Menjalankan setup otomatis...\n");
    await runSetup();
  }

  const config = JSON.parse(fs.readFileSync("./config.json"));
  const mnemonics = JSON.parse(fs.readFileSync("./mnemonics.json"));
  return { config, mnemonics };
}

/* ================= UTIL ================= */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getKeypairFromMnemonic(mnemonic) {
  return Ed25519Keypair.deriveKeypair(mnemonic.trim());
}

function getMasterKeypair() {
  if (process.env.MASTER_PRIVATE_KEY) {
    const { secretKey } = decodeSuiPrivateKey(
      process.env.MASTER_PRIVATE_KEY.trim()
    );
    return Ed25519Keypair.fromSecretKey(secretKey);
  }

  if (process.env.MASTER_MNEMONIC) {
    return Ed25519Keypair.deriveKeypair(process.env.MASTER_MNEMONIC.trim());
  }

  return null;
}

/* ============================= */
/* 1️⃣  SEND SUI KE 1 TUJUAN     */
/* ============================= */

async function sendSui(client, config, mnemonics) {
  for (let mnemonic of mnemonics) {
    try {
      const keypair = getKeypairFromMnemonic(mnemonic);
      const address = keypair.getPublicKey().toSuiAddress();

      const balance = await client.getBalance({
        owner: address,
        coinType: "0x2::sui::SUI",
      });

      const total = Number(balance.totalBalance) / 1e9;
      const amount = total - config.leaveSui;

      console.log("\nWallet:", address);
      console.log("Saldo:", total);

      if (amount <= 0) {
        console.log("Saldo tidak cukup, skip");
        continue;
      }

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(Math.floor(amount * 1e9)),
      ]);

      tx.transferObjects([coin], tx.pure.address(config.destination));

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
      });

      console.log("SUI terkirim:", result.digest);

      await sleep(config.delay);
    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  process.exit();
}

/* ============================= */
/* 2️⃣  SEND SSR KE 1 TUJUAN     */
/* ============================= */

async function sendSSR(client, config, mnemonics) {
  for (let mnemonic of mnemonics) {
    try {
      const keypair = getKeypairFromMnemonic(mnemonic);
      const address = keypair.getPublicKey().toSuiAddress();

      const coins = await client.getCoins({
        owner: address,
        coinType: config.ssrType,
      });

      if (!coins.data.length) {
        console.log("\nWallet:", address);
        console.log("Tidak ada SSR, skip");
        continue;
      }

      let total = 0;
      coins.data.forEach((c) => (total += Number(c.balance)));

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [
        tx.pure.u64(total),
      ]);

      tx.transferObjects([coin], tx.pure.address(config.destination));

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
      });

      console.log("\nWallet:", address);
      console.log("SSR terkirim:", result.digest);

      await sleep(config.delay);
    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  process.exit();
}

/* ================================== */
/* 3️⃣  MASTER DISTRIBUTE KE SEMUA    */
/* ================================== */

async function masterDistribute(client, config, mnemonics) {
  const masterKeypair = getMasterKeypair();

  if (!masterKeypair) {
    console.log("MASTER key tidak ditemukan di .env");
    return;
  }

  const masterAddress = masterKeypair.getPublicKey().toSuiAddress();

  const balance = await client.getBalance({
    owner: masterAddress,
    coinType: "0x2::sui::SUI",
  });

  const total = Number(balance.totalBalance) / 1e9;

  console.log("\nMaster:", masterAddress);
  console.log("Saldo:", total);

  if (total <= config.leaveSui) {
    console.log("Saldo master tidak cukup");
    return;
  }

  const perWallet = (total - config.leaveSui) / mnemonics.length;

  for (let mnemonic of mnemonics) {
    try {
      const wallet = getKeypairFromMnemonic(mnemonic);
      const address = wallet.getPublicKey().toSuiAddress();

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(Math.floor(perWallet * 1e9)),
      ]);

      tx.transferObjects([coin], tx.pure.address(address));

      const result = await client.signAndExecuteTransaction({
        signer: masterKeypair,
        transaction: tx,
      });

      console.log("Kirim ke", address, result.digest);

      await sleep(config.delay);
    } catch (err) {
      console.log("Error:", err.message);
    }
  }

  process.exit();
}

/* ================= MAIN ================= */

async function main() {
  const { config, mnemonics } = await loadFiles();
  const client = new SuiClient({ url: config.rpc });

  console.log("\n1. Send SUI ke 1 tujuan");
  console.log("2. Send SSR ke 1 tujuan");
  console.log("3. Master kirim ke semua wallet");

  rl.question("\nPilih menu: ", (menu) => {
    if (menu === "1") sendSui(client, config, mnemonics);
    else if (menu === "2") sendSSR(client, config, mnemonics);
    else if (menu === "3") masterDistribute(client, config, mnemonics);
    else process.exit();
  });
}

main();