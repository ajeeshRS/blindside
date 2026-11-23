/** Node-only helpers (keypair files). Not for the browser bundle. */
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import nacl from "tweetnacl";
import { baseConnection, createProgram, teeConnection, teeLogin, type AnchorWallet } from "./src/program";

export function loadKeypair(
  path = process.env.ANCHOR_WALLET ?? join(homedir(), ".config/solana/id.json"),
) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
}

export function keypairWallet(kp: Keypair): AnchorWallet {
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => {
      if ("version" in tx) tx.sign([kp]);
      else tx.partialSign(kp);
      return tx;
    },
    signAllTransactions: async (txs) => {
      for (const tx of txs) {
        if ("version" in tx) tx.sign([kp]);
        else tx.partialSign(kp);
      }
      return txs;
    },
  };
}

export const keypairSigner = (kp: Keypair) => ({
  publicKey: kp.publicKey,
  signMessage: async (m: Uint8Array) => nacl.sign.detached(m, kp.secretKey),
});

export const baseProgramFor = (kp: Keypair, rpc = process.env.BASE_RPC) =>
  createProgram(baseConnection(rpc), keypairWallet(kp));

export async function teeConnectionFor(kp: Keypair) {
  const { token } = await teeLogin(keypairSigner(kp));
  return teeConnection(token);
}

export async function teeProgramFor(kp: Keypair) {
  return createProgram(await teeConnectionFor(kp), keypairWallet(kp));
}
