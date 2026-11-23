import { BASE_RPC } from "@blindside/client";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

/**
 * Devnet gas drip: sends a new player a little devnet SOL for account rent
 * and fees, once, so nobody has to find a faucet. The sponsor key comes from
 * SPONSOR_SECRET_KEY (a JSON byte array) and only ever holds devnet SOL.
 */
const DRIP = 0.02 * LAMPORTS_PER_SOL;
const ENOUGH = 0.015 * LAMPORTS_PER_SOL;
const PER_IP_PER_HOUR = 5;

const recent = new Map<string, number[]>();
const served = new Set<string>();

function sponsor(): Keypair | null {
  const secret = process.env.SPONSOR_SECRET_KEY;
  if (!secret) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const payer = sponsor();
  if (!payer) {
    return Response.json({ error: "Gas drip isn't configured." }, { status: 503 });
  }

  let address: PublicKey;
  try {
    const body = (await request.json()) as { address?: string };
    address = new PublicKey(String(body.address));
  } catch {
    return Response.json({ error: "Send { address } as a Solana address." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= PER_IP_PER_HOUR) {
    return Response.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }

  const connection = new Connection(process.env.SOLANA_RPC_URL ?? BASE_RPC, "confirmed");
  const balance = await connection.getBalance(address);
  if (balance >= ENOUGH) return Response.json({ sent: 0, balance });
  if (served.has(address.toBase58())) {
    return Response.json({ error: "This wallet already got its devnet SOL." }, { status: 429 });
  }

  hits.push(now);
  recent.set(ip, hits);
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: address, lamports: DRIP }),
      ),
      [payer],
    );
    served.add(address.toBase58());
    return Response.json({ sent: DRIP, signature });
  } catch (e) {
    return Response.json(
      { error: `Couldn't send devnet SOL: ${(e as Error).message.slice(0, 120)}` },
      { status: 502 },
    );
  }
}
