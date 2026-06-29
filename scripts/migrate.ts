/**
 * One-time schema setup. Run with `npm run db:setup` after setting DATABASE_URL.
 * Idempotent (CREATE TABLE IF NOT EXISTS), so safe to re-run after deploy.
 */
import { Pool } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import path from "node:path";

async function main() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error("DATABASE_URL (or POSTGRES_URL) is not set.");
    process.exit(1);
  }
  const sql = readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8");
  const pool = new Pool({ connectionString });
  try {
    await pool.query(sql);
    console.log("✓ Schema applied.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
