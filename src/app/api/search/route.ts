import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    // 使用 Polymarket 官方 public-search 接口，参数名是 q 而不是 query
    const res = await fetch(
      `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q)}&limit=8`
    );
    const data = await res.json();

    // public-search 返回 { events: [], markets: [], profiles: [] }
    // 我们只取 events 部分
    const events: any[] = data.events || [];
    return NextResponse.json(events);
  } catch (error) {
    console.error("Gamma public-search Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
