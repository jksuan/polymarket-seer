import { NextResponse } from "next/server";

// Force Next.js to treat this route as dynamic (never cache)
export const dynamic = 'force-dynamic';

/**
 * GET /api/book?token_id=<TOKEN_ID>
 * 
 * Server-side proxy for the Polymarket CLOB orderbook API.
 * This is needed because the browser cannot directly connect to
 * clob.polymarket.com (and wss:// WebSocket) from within China.
 * The server-side route uses the HTTP_PROXY / HTTPS_PROXY env vars
 * via https-proxy-agent so the request can go through.
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
    // Append a timestamp parameter to bust any Cloudflare/edge caches on Polymarket's side
    const fetchUrl = `https://clob.polymarket.com/book?token_id=${encodeURIComponent(tokenId)}&_t=${Date.now()}`;

    const data: any = await new Promise((resolve, reject) => {
      https.get(fetchUrl, { agent }, (res: any) => {
        let body = '';
        res.on('data', (chunk: any) => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error("Parse error: " + body)); }
        });
      }).on('error', reject);
    });

    return NextResponse.json(data, {
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
