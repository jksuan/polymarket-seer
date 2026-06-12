import { NextResponse } from "next/server";

import { aggregateWc2026Scorers } from "@/lib/wc2026/aggregateScorers";
import { fetchAllWc2026EspnEvents } from "@/lib/wc2026/espnScoreboard";

export async function GET() {
  try {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const { HttpsProxyAgent } = require("https-proxy-agent");
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    const events = await fetchAllWc2026EspnEvents(new Date(), agent);
    const scorers = aggregateWc2026Scorers(events);

    return NextResponse.json(scorers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[/api/scorers/2026] failed:", message);
    return NextResponse.json({ error: "Scorers request failed", details: message }, { status: 500 });
  }
}
