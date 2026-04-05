import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proxy-image?url=<encoded_url>
 *
 * Server-side image proxy to bypass CORS restrictions.
 * Fetches the remote image on the server (no CORS) and returns it
 * to the browser with proper headers so html2canvas can read pixels.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Mimic a normal browser request
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
