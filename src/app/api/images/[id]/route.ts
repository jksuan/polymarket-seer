import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    // Handle both cases (id with and without .jpg)
    const id = resolvedParams.id.replace('.jpg', '');
    const filePath = path.join(process.cwd(), "public", "cards", `${id}.jpg`);

    // In dev mode, Next.js static asset server can be slow to pick up newly written files in /public.
    // By reading it directly off the filesystem in a dynamic route, we bypass that caching delay.
    if (!fs.existsSync(filePath)) {
        return new NextResponse("Not Found", { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "image/jpeg",
                // Tell Twitter crawler that this image never changes, cache it forever.
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (e) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
