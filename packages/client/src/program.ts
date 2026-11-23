import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { getAuthToken } from "@magicblock-labs/ephemeral-rollups-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { BASE_RPC, TEE_RPC, TEE_WS } from "./constants";
import idlJson from "./idl/blindside.json";
import type { Blindside } from "./idl/blindside";

export type { Blindside };
export type BlindsideProgram = Program<Blindside>;
/** Anything that can sign transactions: a wallet adapter or a keypair wallet. */
export type AnchorWallet = ConstructorParameters<typeof AnchorProvider>[1];
/** Signs the TEE login challenge (wallet adapters expose `signMessage`). */
export type MessageSigner = {
  publicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
};

export const idl = idlJson as Blindside;

export function createProgram(connection: Connection, wallet: AnchorWallet): BlindsideProgram {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program<Blindside>(idl, provider);
}

export const baseConnection = (rpc = BASE_RPC) => new Connection(rpc, "confirmed");

/** Log in to the private rollup; the token is valid for ~30 days. */
export async function teeLogin(signer: MessageSigner, rpc = TEE_RPC) {
  return getAuthToken(rpc, signer.publicKey, signer.signMessage);
}

/** A connection to the private rollup authenticated with a login token. */
export function teeConnection(token: string, rpc = TEE_RPC, ws = TEE_WS) {
  return new Connection(`${rpc}?token=${token}`, {
    commitment: "confirmed",
    wsEndpoint: `${ws}?token=${token}`,
  });
}
