import type { GeoblockApiResponse } from "./types";

const GEOBLOCK_URL = "https://polymarket.com/api/geoblock";

function parseGeoblockBody(body: string): GeoblockApiResponse | null {
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

/**
 * Server-side fetch to polymarket.com geoblock (honors HTTPS_PROXY like other API routes).
 */
export function fetchPolymarketGeoblock(clientIp?: string): Promise<GeoblockApiResponse> {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (proxyUrl) {
    return fetchViaHttpsProxy(clientIp);
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (clientIp) headers["X-Forwarded-For"] = clientIp;

  return fetch(GEOBLOCK_URL, { headers, cache: "no-store" }).then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Geoblock upstream HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const parsed = parseGeoblockBody(text);
    if (!parsed) throw new Error("Geoblock upstream invalid JSON");
    return parsed;
  });
}

function fetchViaHttpsProxy(clientIp?: string): Promise<GeoblockApiResponse> {
  const https = require("https") as typeof import("https");
  const { HttpsProxyAgent } = require("https-proxy-agent") as {
    HttpsProxyAgent: new (url: string) => import("https").Agent;
  };
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (clientIp) headers["X-Forwarded-For"] = clientIp;

  return new Promise((resolve, reject) => {
    const req = https.get(
      GEOBLOCK_URL,
      { agent, headers },
      (res) => {
        let body = "";
        res.on("data", (chunk: Buffer | string) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Geoblock upstream HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          const parsed = parseGeoblockBody(body);
          if (!parsed) {
            reject(new Error("Geoblock upstream invalid JSON"));
            return;
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", reject);
  });
}
