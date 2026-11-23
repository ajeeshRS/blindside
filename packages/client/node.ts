/** Node-only helpers (keypair files). Not for the browser bundle. */
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { keypairSigner, keypairWallet } from "./src/keypair";
import { baseConnection, createProgram, teeConnection, teeLogin } from "./src/program";

export { keypairSigner, keypairWallet };

export function loadKeypair(
  path = process.env.ANCHOR_WALLET ?? join(homedir(), ".config/solana/id.json"),
) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
}

/**
 * The keeper's hot key: `KEEPER_SECRET_KEY` (JSON byte array, for servers),
 * else the file at `KEEPER_KEYPAIR`, else ~/.config/blindside/keeper.json.
 * It can only open rounds; the admin key stays off the server.
 */
export const KEEPER_KEYPAIR_PATH =
  process.env.KEEPER_KEYPAIR ?? join(homedir(), ".config/blindside/keeper.json");

export function loadKeeperKeypair() {
  const secret = process.env.KEEPER_SECRET_KEY;
  if (secret) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  return loadKeypair(KEEPER_KEYPAIR_PATH);
}

export const baseProgramFor = (kp: Keypair, rpc = process.env.BASE_RPC) =>
  createProgram(baseConnection(rpc), keypairWallet(kp));

export async function teeConnectionFor(kp: Keypair) {
  const { token } = await teeLogin(keypairSigner(kp));
  return teeConnection(token);
}

export async function teeProgramFor(kp: Keypair) {
  return createProgram(await teeConnectionFor(kp), keypairWallet(kp));
}
