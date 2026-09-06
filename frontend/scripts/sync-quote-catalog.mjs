#!/usr/bin/env node
// Copies the canonical quote catalog from backend into frontend so calculator
// preview and issued offer can never drift. Runs on predev/prebuild.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(
  __dirname,
  "../../backend/src/api/quote-request/services/quote-catalog.json",
);
const DEST = resolve(__dirname, "../src/lib/quote/quote-catalog.json");

if (!existsSync(SRC)) {
  if (existsSync(DEST)) {
    console.log(`[sync-quote-catalog] backend source missing (${SRC}), using existing frontend copy`);
    process.exit(0);
  }
  console.error(`[sync-quote-catalog] backend source missing: ${SRC}`);
  process.exit(1);
}

const raw = readFileSync(SRC, "utf8");
mkdirSync(dirname(DEST), { recursive: true });
writeFileSync(DEST, raw);
console.log(`[sync-quote-catalog] ${SRC} -> ${DEST}`);
