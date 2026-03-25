import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const key = process.env.DEEPGRAM_API_KEY;

        if (!key) {
            return NextResponse.json({ error: "DEEPGRAM_API_KEY is not configured in the environment" }, { status: 500 });
        }

        // Deepgram new Free Tier accounts sometimes block creating temporary sub-keys (manage.createProjectKey) 
        // leading to a 403 Forbidden Error. 
        // For a local app like this, it's perfectly safe to just vend the standard key to the browser memory directly.
        return NextResponse.json({ key });

    } catch (err: any) {
        console.error("Error generating Deepgram key:", err);
        return NextResponse.json({ error: "Failed to generate temporary authentication token" }, { status: 500 });
    }
}
