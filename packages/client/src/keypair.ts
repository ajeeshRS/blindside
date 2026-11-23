import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import type { AnchorWallet, MessageSigner } from "./program";

/** Sign transactions with an in-memory keypair (keeper, tests, the devnet test wallet). */
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

/** Sign the private-rollup login challenge with an in-memory keypair. */
export const keypairSigner = (kp: Keypair): MessageSigner => ({
  publicKey: kp.publicKey,
  signMessage: async (m: Uint8Array) => nacl.sign.detached(m, kp.secretKey),
});
