export function firstRow<T>(rows: unknown): T | undefined {
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  return rows[0] as T;
}

export function allRows<T>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows as T[];
}
