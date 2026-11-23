import {
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";

const pda = (...seeds: (Buffer | Uint8Array)[]) =>
  PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];

export const configPda = () => pda(Buffer.from("config"));
export const mintPda = () => pda(Buffer.from("mint"));
export const vaultPda = () => pda(Buffer.from("vault"));
export const slotPda = (index: number) => pda(Buffer.from("round_slot"), Buffer.from([index]));
export const playerPda = (owner: PublicKey) => pda(Buffer.from("player"), owner.toBuffer());
export const dripPda = (owner: PublicKey) => pda(Buffer.from("drip"), owner.toBuffer());
export const keeperRolePda = () => pda(Buffer.from("keeper"));
export const userAta = (owner: PublicKey) => getAssociatedTokenAddressSync(mintPda(), owner);

/** The permission PDA for an account, and the delegation PDAs for that permission. */
export function permissionAccounts(account: PublicKey) {
  const permission = permissionPdaFromAccount(account);
  return {
    permission,
    permissionBuffer: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
      permission,
      PERMISSION_PROGRAM_ID,
    ),
    permissionRecord: delegationRecordPdaFromDelegatedAccount(permission),
    permissionMetadata: delegationMetadataPdaFromDelegatedAccount(permission),
  };
}
