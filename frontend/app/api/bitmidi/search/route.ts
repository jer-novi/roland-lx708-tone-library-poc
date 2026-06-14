import type { NextRequest } from "next/server";

/** Proxy voor de publieke BitMidi-zoek-API (vermijdt CORS in de browser). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ result: { results: [] } });

  try {
    const res = await fetch(
      `https://bitmidi.com/api/midi/search?q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) {
      return new Response("BitMidi-zoekopdracht mislukt", { status: 502 });
    }
    const data = await res.json();
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return new Response("BitMidi onbereikbaar", { status: 502 });
  }
}
