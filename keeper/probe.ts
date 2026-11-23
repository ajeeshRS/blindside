/**
 * Read-only network check: what the private (TEE) rollup can see.
 * Uses a throwaway keypair; sends no transactions and spends nothing.
 *
 *   pnpm probe
 */
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BASE_RPC, SOL_USD_FEED, teeConnection, teeLogin } from "@blindside/client";
import { keypairSigner } from "@blindside/client/node";

const FEED = SOL_USD_FEED;
const VRF_EPHEMERAL_QUEUE = new PublicKey("5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc");
const BASE = BASE_RPC;
const ER_AS = "https://devnet-as.magicblock.app";

function decode(data: Buffer) {
  return {
    raw: data.readBigInt64LE(73),
    exp: data.readInt32LE(89),
    publish: data.readBigInt64LE(93),
    len: data.length,
  };
}

async function read(label: string, conn: Connection, key: PublicKey) {
  try {
    const info = await conn.getAccountInfo(key, "confirmed");
    if (!info) return console.log(`${label}: no account`);
    const d = info.data.length >= 101 ? decode(info.data) : null;
    console.log(
      `${label}: owner=${info.owner.toBase58()} len=${info.data.length}`,
      d ? `price=${Number(d.raw) / 1e8} publish=${d.publish}` : "",
    );
  } catch (e) {
    console.log(`${label}: error ${(e as Error).message}`);
  }
}

async function main() {
  await read("base   feed", new Connection(BASE), FEED);
  const er = new Connection(ER_AS);
  await read("as-ER  feed", er, FEED);
  await new Promise((r) => setTimeout(r, 1500));
  await read("as-ER  feed +1.5s", er, FEED);

  const kp = Keypair.generate();
  const { token } = await teeLogin(keypairSigner(kp));
  const tee = teeConnection(token);
  console.log("tee slot", await tee.getSlot());
  await read("TEE    feed", tee, FEED);
  await new Promise((r) => setTimeout(r, 1500));
  await read("TEE    feed +1.5s", tee, FEED);
  await read("TEE    vrf ephemeral queue", tee, VRF_EPHEMERAL_QUEUE);
  await read("as-ER  vrf ephemeral queue", er, VRF_EPHEMERAL_QUEUE);
  console.log("now ms", Date.now());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
