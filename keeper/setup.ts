/**
 * One-time devnet setup (idempotent): config + test-USDC mint + vault, the
 * keeper role (a hot key that can only open rounds), then the 8 round slots,
 * each created private and delegated to the TEE rollup.
 *
 *   pnpm setup:devnet
 */
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { configPda, keeperRolePda, mintPda, permissionAccounts, PROGRAM_ID, ROUND, setKeeper, slotPda } from "@blindside/client";
import { baseProgramFor, KEEPER_KEYPAIR_PATH, loadKeeperKeypair, loadKeypair } from "@blindside/client/node";

/** The keeper's key: from the environment, or a local file (created if missing). */
function keeperKey(): Keypair {
  if (process.env.KEEPER_SECRET_KEY || existsSync(KEEPER_KEYPAIR_PATH)) return loadKeeperKeypair();
  const kp = Keypair.generate();
  mkdirSync(dirname(KEEPER_KEYPAIR_PATH), { recursive: true });
  writeFileSync(KEEPER_KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  console.log("created keeper key at", KEEPER_KEYPAIR_PATH);
  return kp;
}

async function main() {
  const admin = loadKeypair();
  const program = baseProgramFor(admin);
  const conn = program.provider.connection;
  console.log("program", PROGRAM_ID.toBase58(), "admin", admin.publicKey.toBase58());

  if (!(await conn.getAccountInfo(configPda()))) {
    const sig = await program.methods.initialize().accounts({ admin: admin.publicKey }).rpc();
    console.log("test USDC mint", mintPda().toBase58());
    console.log("initialized", sig);
  } else {
    console.log("config exists");
  }

  // The keeper: its own key, a little SOL for fees, and the role on chain.
  const keeper = keeperKey();
  const role = await conn.getAccountInfo(keeperRolePda());
  const current = role ? program.coder.accounts.decode("keeperRole", role.data).keeper : null;
  if (!current?.equals(keeper.publicKey)) {
    console.log("keeper set", await setKeeper(program, keeper.publicKey));
  }
  if ((await conn.getBalance(keeper.publicKey)) < 0.02 * LAMPORTS_PER_SOL) {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: keeper.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    );
    await sendAndConfirmTransaction(conn, tx, [admin]);
    console.log("funded keeper with 0.05 SOL");
  }
  console.log("keeper", keeper.publicKey.toBase58());

  for (let i = 0; i < ROUND.slots; i++) {
    const slot = slotPda(i);
    let info = await conn.getAccountInfo(slot);
    if (!info) {
      const sig = await program.methods
        .initSlot(i)
        .accountsPartial({ admin: admin.publicKey, slot, permission: permissionAccounts(slot).permission })
        .rpc();
      console.log(`slot ${i} created`, sig);
      info = await conn.getAccountInfo(slot);
    }
    if (info && info.owner.equals(PROGRAM_ID)) {
      const p = permissionAccounts(slot);
      const sig = await program.methods
        .delegateSlot(i)
        .accountsPartial({
          admin: admin.publicKey,
          slot,
          permission: p.permission,
          permissionBuffer: p.permissionBuffer,
          permissionRecord: p.permissionRecord,
          permissionMetadata: p.permissionMetadata,
        })
        .rpc();
      console.log(`slot ${i} delegated`, sig);
    } else {
      console.log(`slot ${i} already delegated`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
