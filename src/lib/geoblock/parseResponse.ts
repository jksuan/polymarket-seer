import type { GeoblockApiResponse } from "./types";

export function parseGeoblockBody(body: string): GeoblockApiResponse | null {
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    if (typeof data.blocked !== "boolean") return null;
    return {
      blocked: data.blocked,
      ip: typeof data.ip === "string" ? data.ip : undefined,
      country: typeof data.country === "string" ? data.country : undefined,
      region: typeof data.region === "string" ? data.region : undefined,
    };
  } catch {
    return null;
  }
}
