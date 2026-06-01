/**
 * Apply db/migrations/*.sql to Neon (requires DATABASE_URL).
 * Loads `.env.local` then `.env` from repo root (same as Next.js dev).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon, neonConfig } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const migrationsDir = join(repoRoot, "db", "migrations");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(repoRoot, ".env.local"));
loadEnvFile(join(repoRoot, ".env"));

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is not set. Add it to .env.local in the project root, then rerun npm run db:migrate"
  );
  process.exit(1);
}

/** 避免 Windows/代理环境下 WebSocket 连 Neon 失败，改用 HTTP */
neonConfig.poolQueryViaFetch = true;

function stripLineComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
}

function splitStatements(sqlText) {
  return sqlText
    .split(/;\s*\r?\n/)
    .map((s) => stripLineComments(s))
    .filter((chunk) => chunk.length > 0);
}

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No migration files found");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  for (const file of files) {
    const path = join(migrationsDir, file);
    const sqlText = readFileSync(path, "utf8");
    console.log(`Applying ${file}...`);
    for (const statement of splitStatements(sqlText)) {
      await sql.query(statement);
    }
  }
  console.log("All migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
