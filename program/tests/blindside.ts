/**
 * End-to-end test on MagicBlock devnet: one real round on the Private
 * Ephemeral Rollup, with the real SOL/USD feed and two throwaway
 * players funded from the admin wallet. No mocks — this is the privacy proof.
 *
 * Needs: the program deployed and `scripts/setup.ts` run once.
 * Takes ~2–3 minutes (it waits for a full 90 s round).
 *
 *   pnpm test:devnet
 *
 * Unit tests for the round rules live in programs/blindside/src/logic.rs
 * (`cargo test`).
 */
import { assert } from "chai";
import { PERMISSION_PROGRAM_ID } from "@magicblock-labs/ephemeral-rollups-sdk";
import { getAccount } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  claim,
  configPda,
  currentRound,
  delegatePlayer,
  deposit,
  faucet,
  join,
  leave,
  nowS,
  ONE_USDC,
  openRound,
  OUTCOME,
  permissionAccounts,
  placeCall,
  playerPda,
  PROGRAM_ID,
  readPlayer,
  readSlot,
  recomputeOffset,
  reveal,
  ROUND,
  roundStart,
  SIDE,
  sleep,
  sleepUntil,
  slotIndex,
  slotPda,
  STATUS,
  tick,
  userAta,
  withdrawRaw,
  type BlindsideProgram,
} from "@blindside/client";
import { baseProgramFor, loadKeeperKeypair, loadKeypair, teeConnectionFor, teeProgramFor } from "@blindside/client/node";

const UP = SIDE.up;
const DOWN = SIDE.down;
const DEPOSIT = 20;
const STAKE = 5;

async function expectFailure(p: Promise<unknown>, label: string) {
  try {
    await p;
  } catch {
    return;
  }
  assert.fail(`${label} should have failed`);
}

describe("blindside on devnet (private rollup)", function () {
  this.timeout(10 * 60 * 1000);

  const admin = loadKeypair();
  const keeper = loadKeeperKeypair();
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  const outsider = Keypair.generate();

  let adminTee: BlindsideProgram;
  let keeperTee: BlindsideProgram;
  let aliceTee: BlindsideProgram;
  let bobTee: BlindsideProgram;
  let round: number;
  let index: number;
  let ticker: NodeJS.Timeout | undefined;

  before(async () => {
    const base = baseProgramFor(admin);
    assert.ok(await base.provider.connection.getAccountInfo(configPda()), "run scripts/setup.ts first");
    const slotInfo = await base.provider.connection.getAccountInfo(slotPda(0));
    assert.ok(slotInfo && !slotInfo.owner.equals(PROGRAM_ID), "slots must be delegated (scripts/setup.ts)");

    // Fund the throwaway players with a little devnet SOL for base-layer rent.
    const tx = new Transaction();
    for (const kp of [alice, bob]) {
      tx.add(SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: kp.publicKey, lamports: 0.03 * LAMPORTS_PER_SOL }));
    }
    await sendAndConfirmTransaction(base.provider.connection, tx, [admin]);

    // Each player: faucet → join → deposit → delegate their balance to the TEE.
    for (const kp of [alice, bob]) {
      const p = baseProgramFor(kp);
      await faucet(p);
      await join(p);
      await deposit(p, DEPOSIT);
      await delegatePlayer(p);
    }

    adminTee = await teeProgramFor(admin);
    keeperTee = await teeProgramFor(keeper);
    aliceTee = await teeProgramFor(alice);
    bobTee = await teeProgramFor(bob);
  });

  after(() => ticker && clearInterval(ticker));

  it("opens the next round on the private rollup", async () => {
    round = currentRound() + 1;
    // Need ~30 s of lead for VRF; if the next round is too close, use the one after.
    if (roundStart(round) - nowS() < 20) round += 1;
    index = slotIndex(round);
    await sleepUntil(roundStart(round) - 30);
    await expectFailure(openRound(aliceTee, round), "a player opening a round");
    await expectFailure(openRound(adminTee, round), "the admin opening a round (only the keeper key can)");
    try {
      await openRound(keeperTee, round);
    } catch (e) {
      // A keeper may already have opened it; the rest of the test still applies.
      console.log("    open_round:", (e as Error).message.slice(0, 120));
    }
    // Steady ticks, like the keeper.
    ticker = setInterval(() => tick(adminTee, index).catch(() => {}), 400);
  });

  it("hides the round from everyone while it runs — including the admin and players", async () => {
    await sleepUntil(roundStart(round) + 2);
    const outsiderConn = await teeConnectionFor(outsider);
    for (const [who, conn] of [
      ["outsider", outsiderConn],
      ["admin", adminTee.provider.connection],
      ["player", aliceTee.provider.connection],
    ] as const) {
      const info = await conn.getAccountInfo(slotPda(index)).catch(() => null);
      assert.isNull(info, `${who} must not be able to read the running round`);
    }
  });

  it("hides the transactions that touch the round, including the keeper's secret", async () => {
    const outsiderConn = await teeConnectionFor(outsider);
    const sigs = await outsiderConn.getSignaturesForAddress(slotPda(index), { limit: 25 }).catch(() => []);
    for (const s of sigs) {
      const tx = await outsiderConn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 }).catch(() => null);
      if (!tx) continue;
      const ixs = tx.transaction.message.compiledInstructions ?? [];
      const keys = tx.transaction.message.staticAccountKeys ?? [];
      for (const ix of ixs) {
        const programId = keys[ix.programIdIndex];
        if (programId?.equals(PROGRAM_ID)) {
          assert.equal(ix.data.length, 0, `instruction data visible to an outsider in ${s.signature}`);
        }
      }
      assert.isNotOk(tx.meta?.logMessages?.length, `logs visible to an outsider in ${s.signature}`);
    }
  });

  it("lets players read only their own balance", async () => {
    const own = await readPlayer(aliceTee, alice.publicKey);
    assert.ok(own, "alice can read her balance");
    assert.equal(own!.data.balance.toNumber(), DEPOSIT * ONE_USDC);
    const other = await aliceTee.provider.connection.getAccountInfo(playerPda(bob.publicKey)).catch(() => null);
    assert.isNull(other, "alice can't read bob's balance");
  });

  it("accepts calls, one per player", async () => {
    await placeCall(aliceTee, round, UP, STAKE);
    await placeCall(bobTee, round, DOWN, STAKE);
    await expectFailure(placeCall(aliceTee, round, DOWN, STAKE), "a second call");
    const a = await readPlayer(aliceTee, alice.publicKey);
    assert.equal(a!.data.balance.toNumber(), (DEPOSIT - STAKE) * ONE_USDC);
    assert.equal(a!.data.pending, 1);
  });

  it("rejects a reveal before 80 seconds (the early-reveal bug)", async () => {
    await expectFailure(reveal(adminTee, index), "an early reveal");
    const outsiderConn = await teeConnectionFor(outsider);
    assert.isNull(await outsiderConn.getAccountInfo(slotPda(index)).catch(() => null), "still hidden");
  });

  it("reveals at 80 seconds and the round makes sense", async () => {
    await sleepUntil(roundStart(round) + ROUND.reveal + 1);
    if (ticker) clearInterval(ticker);
    await reveal(adminTee, index).catch(async (e) => {
      // A keeper may have revealed first.
      console.log("    reveal:", (e as Error).message.slice(0, 120));
    });
    await sleep(1500);

    const outsiderProgram = await teeProgramFor(outsider);
    const slot = await readSlot(outsiderProgram, index);
    assert.ok(slot, "anyone can read the round after the reveal");
    assert.equal(slot!.round.toNumber(), round);
    assert.equal(slot!.status, STATUS.revealed);
    console.log(
      `    close at ${slot!.offsetS}s, strike ${slot!.strike.toString()} → ${slot!.settle.toString()}, outcome ${slot!.outcome}, void reason ${slot!.voidReason}`,
    );
    assert.equal(slot!.seeded, 1, "close was fixed at 10 s");
    assert.isAtLeast(slot!.offsetS, ROUND.closeMin);
    assert.isAtMost(slot!.offsetS, ROUND.closeMax);
    // Anyone can now check the close from the public secret and nonces.
    const mixed = slot!.calls.slice(0, slot!.seedCalls);
    assert.equal(recomputeOffset(slot!.secret, mixed), slot!.offsetS, "close recomputes from public data");
    assert.equal(slot!.seedCalls, 2, "both early calls were mixed into the close");
    if (slot!.outcome !== OUTCOME.void) {
      const start = roundStart(round);
      assert.approximately(slot!.strikeTs.toNumber() - start, slot!.offsetS, 2, "strike recorded at the close");
      assert.approximately(slot!.settleTs.toNumber() - slot!.strikeTs.toNumber(), ROUND.hold, 2, "result 30 s later");
      const up = slot!.settle.gt(slot!.strike);
      assert.equal(slot!.outcome, up ? OUTCOME.up : OUTCOME.down);
    }
    assert.equal(slot!.callCount, 2);
  });

  it("pays out and conserves funds", async () => {
    for (const kp of [alice, bob]) {
      await claim(adminTee, index, kp.publicKey).catch((e) => console.log("    claim:", (e as Error).message.slice(0, 120)));
    }
    await expectFailure(claim(adminTee, index, alice.publicKey), "a double claim");
    const a = (await readPlayer(aliceTee, alice.publicKey))!.data;
    const b = (await readPlayer(bobTee, bob.publicKey))!.data;
    assert.equal(a.pending, 0);
    assert.equal(b.pending, 0);
    assert.equal(a.balance.toNumber() + b.balance.toNumber(), 2 * DEPOSIT * ONE_USDC, "nothing created or lost");
    console.log(`    alice ${a.balance.toNumber() / ONE_USDC} USDC, bob ${b.balance.toNumber() / ONE_USDC} USDC`);
  });

  it("brings a balance back to the base layer and withdraws it", async () => {
    await leave(aliceTee);
    const base = baseProgramFor(alice);
    const player = playerPda(alice.publicKey);
    for (let i = 0; i < 40; i++) {
      const info = await base.provider.connection.getAccountInfo(player);
      if (info?.owner.equals(PROGRAM_ID)) break;
      await sleep(1500);
    }
    const p = await base.account.player.fetch(player);
    const before = (await getAccount(base.provider.connection, userAta(alice.publicKey))).amount;
    await withdrawRaw(base, p.balance);
    const after = (await getAccount(base.provider.connection, userAta(alice.publicKey))).amount;
    assert.equal(Number(after - before), p.balance.toNumber());
  });

  it("keeps the permission program as the owner of round permissions", async () => {
    // Sanity: the slot's permission account exists and is delegated (owned by the delegation program on base).
    const base = baseProgramFor(admin);
    const info = await base.provider.connection.getAccountInfo(permissionAccounts(slotPda(index)).permission);
    assert.ok(info, "permission exists");
    assert.isFalse(info!.owner.equals(PERMISSION_PROGRAM_ID), "permission is delegated to the rollup");
  });
});
