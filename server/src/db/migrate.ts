import { readdirSync, readFileSync } from "node:fs";
import { pool } from "./pool.js";

// Numbered files (001_*.sql, 002_*.sql, ...) run in order; every statement is idempotent so re-running is safe.
const dir = new URL("./", import.meta.url);
for (const file of readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  await pool.query(readFileSync(new URL(file, dir), "utf8"));
  console.log("applied", file);
}
await pool.end();
