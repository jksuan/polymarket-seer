import { NextRequest, NextResponse } from "next/server";
import { buildHmacSignature } from "@polymarket/builder-signing-sdk";

/**
 * Server-side Builder Signing Proxy
 * 
 * This API route securely holds the Polymarket Builder API credentials
 * and signs Relayer requests on behalf of the frontend client.
 * 
 * The frontend's RelayClient is configured with:
 *   new BuilderConfig({ remoteBuilderConfig: { url: "/api/sign" } })
 * 
 * The SDK internally POSTs { method, path, body } here, and expects
 * the 4 POLY_BUILDER_* headers back as JSON.
 */
export async function POST(request: NextRequest) {
    try {
        const { method, path, body } = await request.json();

        const key = process.env.POLY_BUILDER_API_KEY;
        const secret = process.env.POLY_BUILDER_SECRET;
        const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

        if (!key || !secret || !passphrase) {
            console.error("Missing POLY_BUILDER_* environment variables!");
            return NextResponse.json(
                { error: "Builder credentials not configured on server" },
                { status: 500 }
            );
        }

        const timestamp = Date.now().toString();

        const signature = buildHmacSignature(
            secret,
            parseInt(timestamp),
            method,
            path,
            body
        );

        return NextResponse.json({
            POLY_BUILDER_SIGNATURE: signature,
            POLY_BUILDER_TIMESTAMP: timestamp,
            POLY_BUILDER_API_KEY: key,
            POLY_BUILDER_PASSPHRASE: passphrase,
        });
    } catch (err: any) {
        console.error("Signing error:", err);
        return NextResponse.json(
            { error: err.message || "Signing failed" },
            { status: 500 }
        );
    }
}
