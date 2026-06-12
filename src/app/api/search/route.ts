import { NextResponse } from "next/server";

import {
  fetchAllWorldCupEvents,
  filterWorldCupEventsForClient,
  type GammaEvent,
} from "@/app/api/search/worldCupEvents";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const slug = searchParams.get("slug")?.trim() || "";
  const wcOnly = searchParams.get("wc") === "1";
  const includeClosed = searchParams.get("includeClosed") === "1";

  if (!q && !slug) {
    return NextResponse.json([]);
  }

  try {
    let events: GammaEvent[] = [];
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

    const { HttpsProxyAgent } = require("https-proxy-agent");
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    const isFIFAQuery = q.toLowerCase().includes("fifa world cup");
    const fetchWCAll = wcOnly || isFIFAQuery;

    if (slug) {
      const fetchUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
      const data = await fetchGammaJson(fetchUrl, agent);
      if (Array.isArray(data)) {
        events = data as GammaEvent[];
      } else {
        const wrapped = data as { events?: GammaEvent[] } | GammaEvent;
        events = (wrapped as { events?: GammaEvent[] }).events || [wrapped as GammaEvent];
      }
    } else if (fetchWCAll) {
      events = await fetchAllWorldCupEvents((url) => fetchGammaEventsPage(url, agent), {
        includeClosed,
      });
      events = filterWorldCupEventsForClient(events);
    } else {
      const fetchUrl = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q)}&limit=100`;
      events = await fetchGammaEventsPage(fetchUrl, agent);
    }

    if (fetchWCAll && q && !isFIFAQuery) {
      const lowerQ = q.toLowerCase();
      events = events.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(lowerQ)) ||
          (e.description && e.description.toLowerCase().includes(lowerQ))
      );
    }

    return NextResponse.json(events);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Gamma API Error Details:", message);
    return NextResponse.json({ error: "API Request failed", details: message }, { status: 500 });
  }
}
