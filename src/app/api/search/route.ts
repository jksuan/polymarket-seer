import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const slug = searchParams.get("slug")?.trim() || "";
  const wcOnly = searchParams.get("wc") === "1";

  if (!q && !slug) {
    return NextResponse.json([]);
  }

  try {
    let events: any[] = [];
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    const https = require('https');
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    
    let fetchUrl = '';
    const isFIFAQuery = q.toLowerCase().includes('fifa world cup');
    const fetchWCAll = wcOnly || isFIFAQuery;

    if (slug) {
      fetchUrl = `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`;
    } else if (fetchWCAll) {
      // 102232 is the specific tag_id for '2026 FIFA World Cup' events
      fetchUrl = `https://gamma-api.polymarket.com/events?tag_id=102232&active=true&closed=false&limit=100&order=volume&ascending=false`;
    } else {
      fetchUrl = `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q)}&limit=100`;
    }

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

    if (slug) {
      events = Array.isArray(data) ? data : (data.events || [data]);
    } else {
      events = Array.isArray(data) ? data : (data.events || []);
    }

    // Local filtering for World Cup targeted queries
    if (fetchWCAll && q && !isFIFAQuery) {
      const lowerQ = q.toLowerCase();
      events = events.filter(e => 
        (e.title && e.title.toLowerCase().includes(lowerQ)) || 
        (e.description && e.description.toLowerCase().includes(lowerQ))
      );
    }

    return NextResponse.json(events);
  } catch (error: any) {
    console.error("Gamma API Error Details:", error.message || error);
    return NextResponse.json({ error: "API Request failed", details: error.message }, { status: 500 });
  }
}
