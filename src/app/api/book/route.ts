import { NextResponse } from "next/server";

// Force Next.js to treat this route as dynamic (never cache)
export const dynamic = 'force-dynamic';

/**
 * GET /api/book?token_id=<TOKEN_ID>
 * 
 * Server-side proxy for the Polymarket CLOB orderbook API.
 * Fetches BOTH the orderbook and tick-size in parallel, then merges
 * them into a single response so the client never has a race condition.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get("token_id");

  if (!tokenId) {
    return NextResponse.json({ error: "Missing token_id parameter" }, { status: 400 });
  }

  try {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const https = require('https');
    const { HttpsProxyAgent } = require('https-proxy-agent');

    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    // Helper: fetch a URL and parse JSON
    const fetchJson = (url: string): Promise<any> =>
      new Promise((resolve, reject) => {
        https.get(url, { agent }, (res: any) => {
          let body = '';
          res.on('data', (chunk: any) => body += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error("Parse error: " + body)); }
          });
        }).on('error', reject);
      });

    const encodedId = encodeURIComponent(tokenId);
    const ts = Date.now();

    // Fire both requests in parallel
    const [bookData, tickData] = await Promise.all([
      fetchJson(`https://clob.polymarket.com/book?token_id=${encodedId}&_t=${ts}`),
      fetchJson(`https://clob.polymarket.com/tick-size?token_id=${encodedId}`).catch(() => null),
    ]);

    // Merge tick-size into the book response
    const merged = {
      ...bookData,
      minimum_tick_size: tickData?.minimum_tick_size ?? null,
    };

    return NextResponse.json(merged, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error: any) {
    console.error("CLOB Book API Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch orderbook", details: error.message },
      { status: 500 }
    );
  }
}
