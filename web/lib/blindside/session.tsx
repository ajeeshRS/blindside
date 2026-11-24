"use client";

import {
  BN,
  baseConnection,
  createProgram,
  delegatePlayerIx,
  depositIx,
  faucetIx,
  FAUCET_USDC,
  joinIx,
  leave,
  ONE_USDC,
  placeCall,
  playerPda,
  PROGRAM_ID,
  readPlayer,
  sleep,
  teeConnection,
  teeLogin,
  userAta,
  withdrawRaw,
  type BlindsideProgram,
} from "@blindside/client";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, type PublicKey } from "@solana/web3.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SOLANA_RPC_URL } from "@/lib/config";
import { getArchived } from "./archive";
import { getCalls, rememberCall } from "./my-calls";
import { fetchResult } from "./results";

/** Where the player's balance is. */
export type PlayerStatus =
  | { kind: "loading" }
  | { kind: "none" }
  /** On the base layer: can deposit, withdraw, or go back to playing. */
  | { kind: "base"; balance: number; pending: number }
  /** In the private rollup: can play. Balance is readable once signed in. */
  | { kind: "playing"; balance: number | null; pending: number };

type Session = {
  publicKey: PublicKey | null;
  /** Signed in to the private rollup (needed to read your balance and call). */
  signedIn: boolean;
  player: PlayerStatus;
  /** Test USDC in the wallet (not yet deposited). */
  walletUsdc: number | null;
  sol: number | null;
  /** What's running right now, for buttons and progress. */
  busy: string | null;
  steps: { label: string; done: boolean }[];
  signIn: () => Promise<void>;
  start: () => Promise<void>;
  call: (round: number, side: number, amountUsdc: number) => Promise<string>;
  cashOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

const TOKEN_KEY = (pk: string) => `blindside:tee:${pk}`;
const START_DEPOSIT = FAUCET_USDC;

function loadToken(pk: string) {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY(pk));
    if (!raw) return null;
    const t = JSON.parse(raw) as { token: string; expiresAt: number };
    return t.expiresAt > Date.now() + 60_000 ? t.token : null;
  } catch {
    return null;
  }
}
function saveToken(pk: string, token: string, expiresAt: number) {
  try {
    window.localStorage.setItem(TOKEN_KEY(pk), JSON.stringify({ token, expiresAt }));
  } catch {
    // Not persisted: sign in again next visit.
  }
}

export function BlindsideSession({ children }: { children: ReactNode }) {
  const anchorWallet = useAnchorWallet();
  const { signMessage } = useWallet();
  const publicKey = anchorWallet?.publicKey ?? null;
  const key = publicKey?.toBase58() ?? null;

  const base = useMemo<BlindsideProgram | null>(
    () => (anchorWallet ? createProgram(baseConnection(SOLANA_RPC_URL), anchorWallet) : null),
    [anchorWallet],
  );
  const [token, setToken] = useState<string | null>(null);
  const tee = useMemo<BlindsideProgram | null>(
    () => (anchorWallet && token ? createProgram(teeConnection(token), anchorWallet) : null),
    [anchorWallet, token],
  );

  const [player, setPlayer] = useState<PlayerStatus>({ kind: "loading" });
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null);
  const [sol, setSol] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ label: string; done: boolean }[]>([]);
  const busyRef = useRef(false);

  // Restore a saved rollup login for this wallet.
  useEffect(() => {
    setToken(key ? loadToken(key) : null);
    setPlayer({ kind: "loading" });
  }, [key]);

  const refresh = useCallback(async () => {
    if (!base || !publicKey) return;
    const conn = base.provider.connection;
    const [info, lamports, ata] = await Promise.all([
      conn.getAccountInfo(playerPda(publicKey)).catch(() => null),
      conn.getBalance(publicKey).catch(() => null),
      conn.getTokenAccountBalance(userAta(publicKey)).catch(() => null),
    ]);
    setSol(lamports === null ? null : lamports / 1e9);
    setWalletUsdc(ata ? Number(ata.value.amount) / ONE_USDC : 0);
    if (!info) return setPlayer({ kind: "none" });
    if (info.owner.equals(PROGRAM_ID)) {
      const p = base.coder.accounts.decode("player", info.data);
      return setPlayer({
        kind: "base",
        balance: p.balance.toNumber() / ONE_USDC,
        pending: p.pending,
      });
    }
    // Delegated: the live balance is only readable from the private rollup.
    const live = tee ? await readPlayer(tee, publicKey).catch(() => null) : null;
    setPlayer({
      kind: "playing",
      balance: live ? live.data.balance.toNumber() / ONE_USDC : null,
      pending: live ? live.data.pending : 0,
    });
  }, [base, tee, publicKey]);

  // Save results for your recent calls as soon as they're revealed, from any
  // page: round slots are reused after ~12 minutes.
  useEffect(() => {
    if (!key) return;
    const capture = () => {
      const now = Date.now() / 1000;
      for (const c of getCalls()) {
        if (c.wallet !== key || getArchived(c.round)) continue;
        const revealAt = (c.round * 90 + 80);
        if (now < revealAt || now > revealAt + 8 * 90) continue;
        void fetchResult(c.round).catch(() => null);
      }
    };
    capture();
    const id = setInterval(capture, 15_000);
    return () => clearInterval(id);
  }, [key]);

  useEffect(() => {
    void refresh();
    if (!base) return;
    const id = setInterval(() => void refresh(), 5000);
    return () => clearInterval(id);
  }, [refresh, base]);

  const run = useCallback(async <T,>(label: string, fn: () => Promise<T>) => {
    if (busyRef.current) throw new Error("Busy");
    busyRef.current = true;
    setBusy(label);
    try {
      return await fn();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage || !key) throw new Error("Connect a wallet first.");
    await run("Signing in to the private rollup", async () => {
      const { token: t, expiresAt } = await teeLogin({ publicKey, signMessage });
      saveToken(key, t, expiresAt);
      setToken(t);
    });
  }, [publicKey, signMessage, key, run]);

  /** Everything a new player needs, with as few approvals as possible. */
  const start = useCallback(async () => {
    if (!base || !anchorWallet || !publicKey) throw new Error("Connect a wallet first.");
    const conn = base.provider.connection;
    await run("Setting up", async () => {
      const plan = [
        { label: "Devnet SOL for fees", done: false },
        { label: `${START_DEPOSIT} test USDC`, done: false },
        { label: "Your game balance", done: false },
        { label: "Moved into the private rollup", done: false },
        { label: "Signed in", done: false },
      ];
      const mark = (i: number) => {
        plan[i].done = true;
        setSteps(plan.map((s) => ({ ...s })));
      };
      setSteps(plan.map((s) => ({ ...s })));

      // 1. A little devnet SOL for rent and fees, if needed.
      if ((await conn.getBalance(publicKey)) < 0.012e9) {
        const r = await fetch("/api/gas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: publicKey.toBase58() }),
        });
        if (!r.ok) {
          const { error } = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(error ?? "Couldn't get devnet SOL. Add some to this wallet and retry.");
        }
        for (let i = 0; i < 20 && (await conn.getBalance(publicKey)) < 0.012e9; i++) await sleep(1000);
      }
      mark(0);

      // 2–4. Faucet + join in one tx, deposit + delegate in another; one approval.
      const info = await conn.getAccountInfo(playerPda(publicKey));
      const ataBal = await conn
        .getTokenAccountBalance(userAta(publicKey))
        .then((b) => Number(b.value.amount) / ONE_USDC)
        .catch(() => 0);
      // Use what's already in the wallet; only ask the faucet if it's empty
      // (the faucet has an hourly cooldown).
      const useFaucet = ataBal < 1;
      const deposit = useFaucet ? START_DEPOSIT : Math.min(ataBal, START_DEPOSIT);
      const first = new Transaction();
      if (useFaucet) first.add(await faucetIx(base));
      if (!info) first.add(await joinIx(base));
      const second = new Transaction();
      if (deposit >= 1) second.add(await depositIx(base, deposit));
      second.add(await delegatePlayerIx(base));

      const txs = [first, second].filter((t) => t.instructions.length > 0);
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
      for (const t of txs) {
        t.feePayer = publicKey;
        t.recentBlockhash = blockhash;
      }
      const signed = await anchorWallet.signAllTransactions(txs);
      for (const t of signed) {
        const sig = await conn.sendRawTransaction(t.serialize());
        const res = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
        if (res.value.err) throw new Error(`Setup transaction failed: ${JSON.stringify(res.value.err)}`);
      }
      mark(1);
      mark(2);
      mark(3);

      // 5. Sign in to the private rollup (one message signature).
      let t = key ? loadToken(key) : null;
      if (!t) {
        if (!signMessage) throw new Error("This wallet can't sign messages.");
        const login = await teeLogin({ publicKey, signMessage });
        saveToken(publicKey.toBase58(), login.token, login.expiresAt);
        t = login.token;
      }
      setToken(t);
      mark(4);
    });
    await refresh();
  }, [base, anchorWallet, publicKey, signMessage, key, run, refresh]);

  const call = useCallback(
    async (round: number, side: number, amountUsdc: number) => {
      if (!tee) throw new Error("Sign in to the private rollup first.");
      const sig = await run("Sending your call", () => placeCall(tee, round, side, amountUsdc));
      rememberCall({ round, side, amount: amountUsdc, sig, at: Date.now(), wallet: key ?? "" });
      void refresh();
      return sig;
    },
    [tee, run, refresh, key],
  );

  /** Bring the balance back to the base layer and withdraw it to the wallet. */
  const cashOut = useCallback(async () => {
    if (!base || !publicKey) throw new Error("Connect a wallet first.");
    await run("Cashing out", async () => {
      const conn = base.provider.connection;
      let info = await conn.getAccountInfo(playerPda(publicKey));
      if (info && !info.owner.equals(PROGRAM_ID)) {
        if (!tee) throw new Error("Sign in to the private rollup first.");
        await leave(tee);
        for (let i = 0; i < 40; i++) {
          info = await conn.getAccountInfo(playerPda(publicKey));
          if (info?.owner.equals(PROGRAM_ID)) break;
          await sleep(1500);
        }
      }
      if (!info?.owner.equals(PROGRAM_ID)) throw new Error("The balance is still settling. Try again in a moment.");
      const p = base.coder.accounts.decode("player", info.data);
      if (p.balance.gt(new BN(0))) await withdrawRaw(base, p.balance);
    });
    await refresh();
  }, [base, publicKey, tee, run, refresh]);

  const value = useMemo<Session>(
    () => ({
      publicKey,
      signedIn: Boolean(tee),
      player,
      walletUsdc,
      sol,
      busy,
      steps,
      signIn,
      start,
      call,
      cashOut,
      refresh,
    }),
    [publicKey, tee, player, walletUsdc, sol, busy, steps, signIn, start, call, cashOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside <BlindsideSession>");
  return s;
}
