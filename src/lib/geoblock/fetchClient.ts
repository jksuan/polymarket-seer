import { GEOBLOCK_PROXY_PATH, GEOBLOCK_UPSTREAM_URL } from "./constants";
import { parseGeoblockBody } from "./parseResponse";
import type { GeoblockApiResponse, GeoblockCheckErrorCode, GeoblockStatus } from "./types";

function toStatus(
  data: GeoblockApiResponse,
  error: GeoblockCheckErrorCode | null
): GeoblockStatus {
  return {
    blocked: data.blocked,
    ip: data.ip,
    country: data.country,
    region: data.region,
    loading: false,
    error,
    checkedAt: Date.now(),
  };
}

function errorStatus(code: GeoblockCheckErrorCode): GeoblockStatus {
  return {
    blocked: false,
    loading: false,
    error: code,
    checkedAt: Date.now(),
  };
}

/** Browser direct call — uses the user IP (required on Vercel; server proxy egress is US). */
export async function fetchGeoblockDirect(): Promise<GeoblockStatus> {
  const res = await fetch(GEOBLOCK_UPSTREAM_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Geoblock direct HTTP ${res.status}`);
  }
  const parsed = parseGeoblockBody(await res.text());
  if (!parsed) {
    throw new Error("Geoblock direct invalid JSON");
  }
  return toStatus(parsed, null);
}

/** Same-origin proxy; may reflect server region, not the end user. */
export async function fetchGeoblockViaProxy(): Promise<GeoblockStatus> {
  const res = await fetch(GEOBLOCK_PROXY_PATH, { cache: "no-store" });
  if (!res.ok) {
    return errorStatus("UPSTREAM_FAILED");
  }
  const data = (await res.json()) as GeoblockApiResponse & { error?: string };
  if (typeof data.blocked !== "boolean") {
    return errorStatus("INVALID_RESPONSE");
  }
  return toStatus(data, null);
}

/** Prefer direct (user IP); fall back to proxy for SSR-blocked or network errors. */
export async function fetchGeoblockForUser(): Promise<GeoblockStatus> {
  try {
    return await fetchGeoblockDirect();
  } catch {
    return fetchGeoblockViaProxy();
  }
}
