import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const { id, imageBase64 } = await req.json();

        if (!id || !imageBase64) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Extract base64 data (remove the data:image/jpeg;base64, prefix)
        const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, "");

        // Path to public/cards folder
        const cardsDir = path.join(process.cwd(), "public", "cards");

        // Create directory if it doesn't exist
        if (!fs.existsSync(cardsDir)) {
            fs.mkdirSync(cardsDir, { recursive: true });
        }

        // Write file to local disk (which creates the static URL /cards/id.jpg)
        const filePath = path.join(cardsDir, `${id}.jpg`);
        fs.writeFileSync(filePath, base64Data, "base64");

        return NextResponse.json({ success: true, url: `/cards/${id}.jpg` });
    } catch (error) {
        console.error("Error saving card:", error);
        return NextResponse.json({ error: "Failed to save card" }, { status: 500 });
    }
}
