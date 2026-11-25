"use client";

import { useAnchorWallet, useWallet, type AnchorWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { useMemo } from "react";

/*
 * Signing with the network named. wallet-adapter's signTransaction and
 * signAllTransactions call the Wallet Standard `solana:signTransaction`
 * feature without a `chain`, so wallets such as Backpack and Solflare assume
 * mainnet and refuse with "Network mismatch" while set to devnet. Here we call
 * the feature ourselves with `chain: "solana:devnet"`. Wallets that aren't
 * Wallet Standard (the built-in test wallet) keep their own signing.
 */

const CHAIN = "solana:devnet";
const SIGN_TRANSACTION = "solana:signTransaction";

type StandardAccount = { address: string; features: readonly string[] };
type SignTransactionFeature = {
  signTransaction(
    ...inputs: { account: StandardAccount; transaction: Uint8Array; chain?: string }[]
  ): Promise<readonly { signedTransaction: Uint8Array }[]>;
};
type StandardWallet = {
  accounts: readonly StandardAccount[];
  features: Readonly<Record<string, unknown>>;
};

const serialize = (tx: Transaction | VersionedTransaction) =>
  tx instanceof VersionedTransaction
    ? tx.serialize()
    : new Uint8Array(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));

const deserialize = <T extends Transaction | VersionedTransaction>(original: T, bytes: Uint8Array): T =>
  (original instanceof VersionedTransaction
    ? VersionedTransaction.deserialize(bytes)
    : Transaction.from(bytes)) as T;

/** The connected wallet as an Anchor wallet whose signatures are always for devnet. */
export function useDevnetWallet(): AnchorWallet | undefined {
  const anchor = useAnchorWallet();
  const { wallet } = useWallet();

  return useMemo(() => {
    if (!anchor) return undefined;
    const standard = (wallet?.adapter as { wallet?: StandardWallet } | undefined)?.wallet;
    const feature = standard?.features[SIGN_TRANSACTION] as SignTransactionFeature | undefined;
    const address = anchor.publicKey.toBase58();
    const account = standard?.accounts.find((a) => a.address === address);
    if (!feature || !account || !account.features.includes(SIGN_TRANSACTION)) return anchor;

    const signAllTransactions = async <T extends Transaction | VersionedTransaction>(txs: T[]) => {
      const signed = await feature.signTransaction(
        ...txs.map((tx) => ({ account, chain: CHAIN, transaction: serialize(tx) })),
      );
      return txs.map((tx, i) => deserialize(tx, signed[i].signedTransaction));
    };
    return {
      publicKey: anchor.publicKey,
      signAllTransactions,
      signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) =>
        (await signAllTransactions([tx]))[0],
    };
  }, [anchor, wallet]);
}
