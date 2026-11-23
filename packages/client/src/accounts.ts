import { PublicKey } from "@solana/web3.js";
import { playerPda, slotPda } from "./pdas";
import type { BlindsideProgram } from "./program";

type Fetched<K extends "slot" | "player" | "config"> = Awaited<
  ReturnType<BlindsideProgram["account"][K]["fetch"]>
>;
export type SlotAccount = Fetched<"slot">;
export type PlayerAccount = Fetched<"player">;

/** A round slot, or null if this connection isn't allowed to read it (yet). */
export async function readSlot(program: BlindsideProgram, index: number): Promise<SlotAccount | null> {
  const info = await program.provider.connection.getAccountInfo(slotPda(index)).catch(() => null);
  if (!info) return null;
  return program.coder.accounts.decode("slot", info.data);
}

/** A player's balance account and its current owner (program = on base, else delegated). */
export async function readPlayer(program: BlindsideProgram, owner: PublicKey) {
  const info = await program.provider.connection.getAccountInfo(playerPda(owner)).catch(() => null);
  if (!info) return null;
  return {
    owner: info.owner,
    data: program.coder.accounts.decode("player", info.data) as PlayerAccount,
  };
}
