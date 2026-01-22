import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const PAGE_SIZE = 5000;
const SITE_URL = "https://www.airportlookup.com";

export async function GET(
  _req: Request,
  context: { params: Promise<{ n: string }> }
) {
  const { n } = await context.params;
  const page = Math.max(0, parseInt(n, 10) || 0);
  const offset = page * PAGE_SIZE;

  // Wir laden die ICAO-Codes und prüfen via LEFT JOIN auf ILS-Daten
  // DISTINCT sorgt dafür, dass wir trotz mehrerer Runways pro Airport nur eine Zeile erhalten
  const rows = await sql`
    SELECT DISTINCT a.ident, 
           CASE WHEN ri.airport_ident IS NOT NULL THEN 1 ELSE 0 END as has_ils
    FROM airports a
    LEFT JOIN runway_ils ri ON a.ident = ri.airport_ident
    WHERE a.type IN ('large_airport', 'medium_airport', 'small_airport')
      AND a.ident IS NOT NULL
    ORDER BY a.ident ASC
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `;

  const now = new Date().toISOString().split("T")[0];

  const urls = rows
    .map(
      (r: any) => `
  <url>
    <loc>${SITE_URL}/airports/${r.ident}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.has_ils === 1 ? 'weekly' : 'monthly'}</changefreq>
    <priority>${r.has_ils === 1 ? '1.0' : '0.6'}</priority>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: { 
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate"
    },
  });
}