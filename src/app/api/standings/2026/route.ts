import { NextResponse } from "next/server";

import {
  fetchAllWorldCupEvents,
  filterWorldCupEventsForClient,
  type GammaEvent,
} from "@/app/api/search/worldCupEvents";
import { aggregateWc2026Standings } from "@/lib/wc2026/aggregateStandings";

function fetchGammaJson(fetchUrl: string, agent: unknown): Promise<unknown> {
  const https = require("https");

  return new Promise((resolve, reject) => {
    https
      .get(fetchUrl, { agent }, (res: { on: (event: string, cb: (chunk?: string) => void) => void }) => {
        let body = "";
        res.on("data", (chunk?: string) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error("Parse error: " + body));
          }
        });
      })
      .on("error", reject);
  });
}

function fetchGammaEventsPage(fetchUrl: string, agent: unknown): Promise<GammaEvent[]> {
  return fetchGammaJson(fetchUrl, agent).then((data) => {
    if (Array.isArray(data)) return data as GammaEvent[];
    const wrapped = data as { events?: GammaEvent[] };
    return wrapped.events || [];
  });
}

export async function GET() {
  try {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const { HttpsProxyAgent } = require("https-proxy-agent");
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    const events = await fetchAllWorldCupEvents(
      (url) => fetchGammaEventsPage(url, agent),
      { includeClosed: true }
    );
    const filtered = filterWorldCupEventsForClient(events);
    const groups = aggregateWc2026Standings(filtered);

    return NextResponse.json(groups);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/standings/2026] failed:", message);
    return NextResponse.json({ error: "Standings request failed", details: message }, { status: 500 });
  }
}
