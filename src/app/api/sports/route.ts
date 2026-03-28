import { NextResponse } from "next/server";

/**
 * Proxy for the Gamma API /sports endpoint.
 *
 * The browser cannot directly call gamma-api.polymarket.com due to CORS
 * restrictions. This server-side route fetches the data and relays it
 * back to the client with proper CORS headers.
 *
 * Response is cached for 1 hour (CDN) / 24 hours (browser) since league
 * data rarely changes.
 */
export async function GET() {
  try {
    const res = await fetch("https://gamma-api.polymarket.com/sports", {
      next: { revalidate: 3600 }, // ISR: revalidate every hour
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gamma API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("[/api/sports] Gamma API fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch sports data" },
      { status: 500 }
    );
  }
}
