import {
  BaseMessageSignerWalletAdapter,
  WalletNotConnectedError,
  WalletReadyState,
  type WalletName,
} from "@solana/wallet-adapter-base";
import { Keypair, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

/**
 * A devnet-only wallet that lives in this browser: one click, no extension,
 * no pop-up per call. It exists so judges and new players can try Blindside
 * without setting up a devnet wallet. It holds only test funds.
 */
export const TestWalletName = "Blindside test wallet" as WalletName<"Blindside test wallet">;

const STORAGE_KEY = "blindside:test-wallet";

const ICON =
  "data:image/svg+xml;base64," +
  (typeof btoa === "function"
    ? btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="15" fill="#2E5BFF"/><path d="M14 40 L22 31 L29 36 L40 22" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="22" r="4.5" fill="#fff"/><line x1="44" y1="12" x2="44" y2="52" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-dasharray="3 3"/></svg>',
      )
    : "");

function loadOrCreate(): Keypair {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
  } catch {
    // Fall through to a fresh key (private mode, cleared storage).
  }
  const kp = Keypair.generate();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(kp.secretKey)));
  } catch {
    // Not persisted; it still works for this tab.
  }
  return kp;
}

export class TestWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = TestWalletName;
  url = "https://github.com/ajeeshRS/blindside";
  icon = ICON;
  readonly supportedTransactionVersions = new Set(["legacy", 0] as const);

  private keypair: Keypair | null = null;
  private _connecting = false;

  get publicKey() {
    return this.keypair?.publicKey ?? null;
  }
  get connecting() {
    return this._connecting;
  }
  get readyState() {
    return typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.Loadable;
  }

  async connect() {
    this._connecting = true;
    try {
      this.keypair = loadOrCreate();
      this.emit("connect", this.keypair.publicKey);
    } finally {
      this._connecting = false;
    }
  }

  async disconnect() {
    // Keep the key in storage so the balance is still there next time.
    this.keypair = null;
    this.emit("disconnect");
  }

  private kp() {
    if (!this.keypair) throw new WalletNotConnectedError();
    return this.keypair;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    const kp = this.kp();
    if ("version" in tx) tx.sign([kp]);
    else tx.partialSign(kp);
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    for (const tx of txs) await this.signTransaction(tx);
    return txs;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return nacl.sign.detached(message, this.kp().secretKey);
  }
}
