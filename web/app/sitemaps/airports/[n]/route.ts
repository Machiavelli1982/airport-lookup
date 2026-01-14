// web/app/sitemaps/airports/[n]/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 5000;
const FALLBACK_BASE = "https://www.airportlookup.com";

function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    FALLBACK_BASE;

  return raw
    .replace(",", ".")
    .replace(/^https?:\/\//, "https://")
    .replace(/\/$/, "");
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ n: string }> }
) {
  const { n } = await context.params;
  const page = Math.max(0, parseInt(n, 10) || 0);
  const offset = page * PAGE_SIZE;

  const rows = await sql/* sql */`
    SELECT ident
    FROM airports
    WHERE type IN ('large_airport', 'medium_airport')
      AND ident IS NOT NULL
    ORDER BY ident ASC
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `;

  const base = getBaseUrl();
  const now = new Date().toISOString().split("T")[0];

  const urls = rows
    .map(
      (r: any) => `
  <url>
    <loc>${base}/airports/${r.ident}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
