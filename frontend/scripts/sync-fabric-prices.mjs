#!/usr/bin/env node
// Copies canonical fabric prices from backend into frontend so the two cannot drift.
// Runs on predev/prebuild. Fails the build if the backend file is missing.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../../backend/src/api/order/services/fabric-prices.json");
const DEST = resolve(__dirname, "../src/lib/fabric-prices.json");

if (!existsSync(SRC)) {
  if (existsSync(DEST)) {
    console.log(`[sync-fabric-prices] backend source missing (${SRC}), using existing frontend copy`);
    process.exit(0);
  }
  console.error(`[sync-fabric-prices] backend source missing: ${SRC}`);
  process.exit(1);
}

const raw = readFileSync(SRC, "utf8");
mkdirSync(dirname(DEST), { recursive: true });
writeFileSync(DEST, raw);
console.log(`[sync-fabric-prices] ${SRC} -> ${DEST}`);
