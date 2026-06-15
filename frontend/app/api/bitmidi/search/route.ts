import type { NextRequest } from "next/server";

/** Toegestane sorteervelden — alleen deze worden naar BitMidi doorgegeven. */
const ORDER_BY = new Set(["plays", "views", "createdAt"]);

/**
 * Proxy voor de publieke BitMidi-API (vermijdt CORS in de browser).
 *
 * - `q` ingevuld  → `/api/midi/search` (zoeken).
 * - `q` leeg      → `/api/midi/all` (browse — bv. de populairste tracks).
 *
 * Doorgegeven: `orderBy` (whitelist, default `plays`) en `page` (paginering).
 * De upstream `result` bevat `total`/`pageTotal` zodat de UI "meer laden" kan tonen.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const orderByParam = sp.get("orderBy") ?? "";
  const orderBy = ORDER_BY.has(orderByParam) ? orderByParam : "plays";
  const page = Math.max(0, Number.parseInt(sp.get("page") ?? "0", 10) || 0);

  const upstream = new URL(
    q ? "https://bitmidi.com/api/midi/search" : "https://bitmidi.com/api/midi/all"
  );
  if (q) upstream.searchParams.set("q", q);
  upstream.searchParams.set("orderBy", orderBy);
  upstream.searchParams.set("page", String(page));

  try {
    const res = await fetch(upstream, { headers: { Accept: "application/json" } });
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
