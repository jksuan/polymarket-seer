import { neon } from "@neondatabase/serverless";

let sqlInstance: ReturnType<typeof neon> | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL?.trim();
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!sqlInstance) {
    sqlInstance = neon(url);
  }
  return sqlInstance;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
