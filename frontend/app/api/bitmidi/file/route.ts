import type { NextRequest } from "next/server";

/**
 * Proxy voor het downloaden van een BitMidi `.mid`-bestand. Alleen paden van de
 * vorm `/uploads/<naam>.mid` zijn toegestaan (SSRF-guard — geen open proxy).
 */
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!/^\/uploads\/[\w.-]+\.mid$/i.test(path)) {
    return new Response("Ongeldig pad", { status: 400 });
  }

  try {
    const res = await fetch(`https://bitmidi.com${path}`);
    if (!res.ok) {
      return new Response("Download mislukt", { status: 502 });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": "audio/midi",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("BitMidi onbereikbaar", { status: 502 });
  }
}
