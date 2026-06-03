import { NextResponse } from "next/server";
import { resolveClientIp } from "@/lib/geoblock/clientIp";
import { fetchPolymarketGeoblock } from "@/lib/geoblock/fetchUpstream";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 60;

/**
 * GET /api/geoblock
 *
 * Proxies Polymarket geographic compliance check for the end-user IP.
 * @see https://docs.polymarket.com/api-reference/geoblock
 */
export async function GET(request: Request) {
  const clientIp = resolveClientIp(request);

  try {
    const data = await fetchPolymarketGeoblock(clientIp);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error("[geoblock] upstream failed:", error);
    return NextResponse.json(
      {
        error: "UPSTREAM_FAILED",
        message: error instanceof Error ? error.message : "Failed to reach geoblock service",
      },
      { status: 502 }
    );
  }
}
