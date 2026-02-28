import dotenv from "dotenv";
import fs from "fs";
import readline from "readline";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

dotenv.config();

/* ================= LOAD FILE ================= */

const config = JSON.parse(fs.readFileSync("./config.json"));
const mnemonics = JSON.parse(fs.readFileSync("./mnemonics.json"));

const client = new SuiClient({ url: config.rpc });

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
    return Ed25519Keypair.deriveKeypair(
      process.env.MASTER_MNEMONIC.trim()
    );
  }

  return null;
}

/* ============================= */
/* 1️⃣ SEND SUI KE 1 TUJUAN */
/* ============================= */

async function sendSui() {
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

      tx.transferObjects(
        [coin],
        tx.pure.address(config.destination)
      );

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
/* 2️⃣ SEND SSR KE 1 TUJUAN */
/* ============================= */

async function sendSSR() {
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
      const [coin] = tx.splitCoins(
        tx.object(coins.data[0].coinObjectId),
        [tx.pure.u64(total)]
      );

      tx.transferObjects(
        [coin],
        tx.pure.address(config.destination)
      );

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
/* 3️⃣ MASTER DISTRIBUTE KE SEMUA */
/* ================================== */

async function masterDistribute() {
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

  const perWallet =
    (total - config.leaveSui) / mnemonics.length;

  for (let mnemonic of mnemonics) {
    try {
      const wallet = getKeypairFromMnemonic(mnemonic);
      const address = wallet.getPublicKey().toSuiAddress();

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(Math.floor(perWallet * 1e9)),
      ]);

      tx.transferObjects(
        [coin],
        tx.pure.address(address)
      );

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

/* ================= CLI ================= */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n1. Send SUI ke 1 tujuan");
console.log("2. Send SSR ke 1 tujuan");
console.log("3. Master kirim ke semua wallet");

rl.question("\nPilih menu: ", (menu) => {
  if (menu === "1") sendSui();
  else if (menu === "2") sendSSR();
  else if (menu === "3") masterDistribute();
  else process.exit();
});