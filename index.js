
const fs = require("fs");
const readline = require("readline");
require("dotenv").config();

const { SuiClient, getFullnodeUrl } = require("@mysten/sui/client");
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
const { Transaction } = require("@mysten/sui/transactions");

// ================= CONFIG =================
const config = JSON.parse(fs.readFileSync("./config.json"));
const mnemonics = JSON.parse(fs.readFileSync("./mnemonics.json"));

const client = new SuiClient({
  url: config.rpc || getFullnodeUrl("mainnet"),
});

const MIN_DELAY = 3000;

// ================= COLORS =================
const c = {
  reset:  "\x1b[0m",
  cyan:   "\x1b[36m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  white:  "\x1b[37m",
};

function cyan(text)   { return `${c.cyan}${text}${c.reset}`; }
function green(text)  { return `${c.green}${text}${c.reset}`; }
function red(text)    { return `${c.red}${text}${c.reset}`; }
function yellow(text) { return `${c.yellow}${text}${c.reset}`; }
function white(text)  { return `${c.white}${text}${c.reset}`; }

// ================= HELPER =================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getKeypair(mnemonic) {
  return Ed25519Keypair.deriveKeypair(mnemonic.trim());
}

function getKeypairFromPrivateKey(privateKey) {
  return Ed25519Keypair.fromSecretKey(privateKey.trim());
}

// ================= MENU 1 =================
async function sendSui() {
  console.log(cyan("\n========== MENU 1: Send SUI ke 1 Tujuan =========="));

  const total_wallets = mnemonics.length;

  for (let i = 0; i < mnemonics.length; i++) {
    const start = Date.now();
    const counter = cyan(`[${i + 1}/${total_wallets}]`);

    try {
      const keypair = getKeypair(mnemonics[i]);
      const address = keypair.getPublicKey().toSuiAddress();

      const balance = await client.getBalance({
        owner: address,
        coinType: "0x2::sui::SUI",
      });

      const total = Number(balance.totalBalance) / 1e9;

      console.log(`\n${counter} ${white("Wallet  :")} ${cyan(address)}`);
      console.log(`       ${white("Saldo   :")} ${white(total + " SUI")}`);

      const sendAmount = total - config.leaveSui;

      if (sendAmount <= 0) {
        console.log(`       ${white("Status  :")} ${red("Saldo tidak cukup, skip")}`);
      } else {
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [
          tx.pure.u64(Math.floor(sendAmount * 1e9)),
        ]);

        tx.transferObjects([coin], tx.pure.address(config.destination));

        const result = await client.signAndExecuteTransaction({
          signer: keypair,
          transaction: tx,
        });

        await client.waitForTransaction({ digest: result.digest });

        console.log(`       ${white("Kirim   :")} ${white(sendAmount.toFixed(6) + " SUI")}`);
        console.log(`       ${white("Sisa    :")} ${white(config.leaveSui + " SUI")}`);
        console.log(`       ${white("Tujuan  :")} ${white(config.destination)}`);
        console.log(`       ${white("Digest  :")} ${yellow(result.digest)}`);
        console.log(`       ${white("Status  :")} ${green("Berhasil ✓")}`);
      }
    } catch (err) {
      console.log(`       ${white("Error   :")} ${red(err.message)}`);
    }

    await sleep(Math.max(0, MIN_DELAY - (Date.now() - start)));
  }

  console.log(cyan("\n========== Selesai ==========\n"));
  process.exit();
}

// ================= MENU 2 =================
// Self transfer - kirim semua SSR ke diri sendiri
async function selfTransferSSR() {
  console.log(cyan("\n========== MENU 2: Self Transfer SSR =========="));

  const total_wallets = mnemonics.length;

  for (let i = 0; i < mnemonics.length; i++) {
    const start = Date.now();
    const counter = cyan(`[${i + 1}/${total_wallets}]`);

    try {
      const keypair = getKeypair(mnemonics[i]);
      const address = keypair.getPublicKey().toSuiAddress();

      const coins = await client.getCoins({
        owner: address,
        coinType: config.ssrType,
      });

      if (coins.data.length === 0) {
        console.log(`\n${counter} ${white("Wallet  :")} ${cyan(address)}`);
        console.log(`       ${white("Status  :")} ${red("Tidak ada SSR, skip")}`);
      } else {
        let totalBalance = 0;
        coins.data.forEach((c) => (totalBalance += Number(c.balance)));
        const totalSSR = totalBalance / 1e9;

        const tx = new Transaction();
        const primaryCoin = tx.object(coins.data[0].coinObjectId);

        // Merge semua coin SSR jika lebih dari 1
        if (coins.data.length > 1) {
          tx.mergeCoins(
            primaryCoin,
            coins.data.slice(1).map((c) => tx.object(c.coinObjectId))
          );
        }

        // Transfer semua SSR ke diri sendiri
        tx.transferObjects([primaryCoin], tx.pure.address(address));

        const result = await client.signAndExecuteTransaction({
          signer: keypair,
          transaction: tx,
        });

        await client.waitForTransaction({ digest: result.digest });

        console.log(`\n${counter} ${white("Wallet  :")} ${cyan(address)}`);
        console.log(`       ${white("Saldo   :")} ${white(totalSSR + " SSR")}`);
        console.log(`       ${white("Kirim   :")} ${white(totalSSR + " SSR")}`);
        console.log(`       ${white("Tujuan  :")} ${green("Diri Sendiri")}`);
        console.log(`       ${white("Digest  :")} ${yellow(result.digest)}`);
        console.log(`       ${white("Status  :")} ${green("Berhasil ✓")}`);
      }
    } catch (err) {
      console.log(`\n${counter} ${white("Error   :")} ${red(err.message)}`);
    }

    await sleep(Math.max(0, MIN_DELAY - (Date.now() - start)));
  }

  console.log(cyan("\n========== Selesai ==========\n"));
  process.exit();
}

// ================= MENU 3 =================
async function sendFromMaster(amountPerWallet) {
  console.log(cyan("\n========== MENU 3: Master Kirim ke Semua Wallet =========="));

  const masterPrivateKey = process.env.MASTER_PRIVATE_KEY;

  if (!masterPrivateKey) {
    console.log(red("Error: MASTER_PRIVATE_KEY tidak ditemukan di .env"));
    return;
  }

  let masterKeypair;
  try {
    masterKeypair = getKeypairFromPrivateKey(masterPrivateKey);
  } catch {
    console.log(red("Error: MASTER_PRIVATE_KEY format salah"));
    return;
  }

  const masterAddress = masterKeypair.getPublicKey().toSuiAddress();

  const balance = await client.getBalance({
    owner: masterAddress,
    coinType: "0x2::sui::SUI",
  });

  const total = Number(balance.totalBalance) / 1e9;
  const totalNeeded = amountPerWallet * mnemonics.length;

  console.log(`\n${white("Master       :")} ${cyan(masterAddress)}`);
  console.log(`${white("Saldo Master :")} ${white(total + " SUI")}`);
  console.log(`${white("Per Wallet   :")} ${white(amountPerWallet + " SUI")}`);
  console.log(`${white("Jumlah Wallet:")} ${white(mnemonics.length)}`);
  console.log(`${white("Total Kirim  :")} ${white(totalNeeded.toFixed(6) + " SUI")}`);

  if (total < totalNeeded) {
    console.log(red(`\nError: Saldo tidak cukup! Butuh ${totalNeeded.toFixed(6)} SUI untuk ${mnemonics.length} wallet`));
    process.exit();
    return;
  }

  console.log(white("\n---------------------------------------------------"));

  const total_wallets = mnemonics.length;

  for (let i = 0; i < mnemonics.length; i++) {
    const start = Date.now();
    const counter = cyan(`[${i + 1}/${total_wallets}]`);

    try {
      const keypair = getKeypair(mnemonics[i]);
      const address = keypair.getPublicKey().toSuiAddress();

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(Math.floor(amountPerWallet * 1e9)),
      ]);

      tx.transferObjects([coin], tx.pure.address(address));

      const result = await client.signAndExecuteTransaction({
        signer: masterKeypair,
        transaction: tx,
      });

      await client.waitForTransaction({ digest: result.digest });

      console.log(`\n${counter} ${white("Kirim ke :")} ${cyan(address)}`);
      console.log(`       ${white("Jumlah   :")} ${white(amountPerWallet + " SUI")}`);
      console.log(`       ${white("Digest   :")} ${yellow(result.digest)}`);
      console.log(`       ${white("Status   :")} ${green("Berhasil ✓")}`);
    } catch (err) {
      console.log(`\n${counter} ${white("Error    :")} ${red(err.message)}`);
    }

    await sleep(Math.max(0, MIN_DELAY - (Date.now() - start)));
  }

  console.log(cyan("\n========== Selesai ==========\n"));
  process.exit();
}

// ================= CLI =================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.clear();
console.log(cyan(" ██╗  ██╗███████╗██╗   ██╗     █████╗ ███╗   ██╗████████╗███████╗██╗  ██╗"));
console.log(cyan(" ██║  ██║██╔════╝╚██╗ ██╔╝    ██╔══██╗████╗  ██║╚══██╔══╝██╔════╝██║ ██╔╝"));
console.log(cyan(" ███████║█████╗   ╚████╔╝     ███████║██╔██╗ ██║   ██║   █████╗  █████╔╝ "));
console.log(cyan(" ██╔══██║██╔══╝    ╚██╔╝      ██╔══██║██║╚██╗██║   ██║   ██╔══╝  ██╔═██╗ "));
console.log(cyan(" ██║  ██║███████╗   ██║       ██║  ██║██║ ╚████║   ██║   ███████╗██║  ██╗"));
console.log(cyan(" ╚═╝  ╚═╝╚══════╝   ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝"));
console.log(cyan(""));
console.log(cyan(" █████╗ ███████╗███████╗███╗   ██╗ ██████╗ "));
console.log(cyan("██╔══██╗██╔════╝██╔════╝████╗  ██║██╔════╝ "));
console.log(cyan("███████║███████╗█████╗  ██╔██╗ ██║██║  ███╗"));
console.log(cyan("██╔══██║╚════██║██╔══╝  ██║╚██╗██║██║   ██║"));
console.log(cyan("██║  ██║███████║███████╗██║ ╚████║╚██████╔╝"));
console.log(cyan("╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ "));
console.log(yellow("\n                  SUI Wallet Automation"));
console.log(white("                     by @Alfian194\n"));

console.log(cyan("╔══════════════════════════════════╗"));
console.log(cyan("║") + white("  1. Send SUI ke 1 tujuan         ") + cyan("║"));
console.log(cyan("║") + white("  2. Self Transfer SSR            ") + cyan("║"));
console.log(cyan("║") + white("  3. Master kirim ke semua wallet ") + cyan("║"));
console.log(cyan("╚══════════════════════════════════╝"));

rl.question(white("\nPilih menu: "), (menu) => {
  if (menu === "1") {
    sendSui();
  } else if (menu === "2") {
    selfTransferSSR();
  } else if (menu === "3") {
    rl.question(white("Jumlah SUI per wallet: "), (amount) => {
      const amountPerWallet = parseFloat(amount);
      if (isNaN(amountPerWallet) || amountPerWallet <= 0) {
        console.log(red("Error: Jumlah tidak valid"));
        process.exit();
      } else {
        sendFromMaster(amountPerWallet);
      }
    });
  } else {
    console.log(red("Error: Menu tidak valid"));
    process.exit();
  }
});
