/**
 * One-time devnet setup (idempotent): config + test-USDC mint + vault, then
 * the 8 round slots, each created private and delegated to the TEE rollup.
 *
 *   pnpm setup:devnet
 */
import { configPda, mintPda, permissionAccounts, PROGRAM_ID, ROUND, slotPda } from "@blindside/client";
import { baseProgramFor, loadKeypair } from "@blindside/client/node";

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
