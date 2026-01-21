import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  // Wir zählen alle relevanten Airport-Typen für die Simulation
  // Inklusive small_airport, um auf die volle Abdeckung zu kommen
  const [{ count }] = await sql`
    SELECT count(*)::int FROM airports 
    WHERE type IN ('large_airport', 'medium_airport', 'small_airport')
  `;
  
  const PAGE_SIZE = 5000;
  const pages = Math.ceil(count / PAGE_SIZE);
  const base = "https://www.airportlookup.com";

  const sitemaps = Array.from({ length: pages }, (_, i) => `
    <sitemap>
      <loc>${base}/sitemaps/airports/${i}</loc>
    </sitemap>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: { 
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate" 
    },
  });
}