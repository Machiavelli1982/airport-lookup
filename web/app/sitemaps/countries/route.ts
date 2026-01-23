// web/app/sitemaps/countries/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
const SITE_URL = "https://www.airportlookup.com";

export async function GET() {
  const rows = await sql`SELECT code FROM countries ORDER BY code ASC`;
  const now = new Date().toISOString().split("T")[0];

  const urls = rows.map((r: any) => `
  <url>
    <loc>${SITE_URL}/countries/${r.code.toLowerCase()}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}