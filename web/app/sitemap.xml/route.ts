// web/app/sitemap.xml/route.ts
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

export async function GET() {
  const [{ count }] = await sql/* sql */`
    SELECT COUNT(*)::int AS count
    FROM airports
    WHERE type IN ('large_airport', 'medium_airport')
      AND ident IS NOT NULL
  `;

  const pages = Math.ceil((count || 0) / PAGE_SIZE);
  const base = getBaseUrl();
  const now = new Date().toISOString().split("T")[0];

  const urls = Array.from({ length: pages }, (_, i) => `
    <sitemap>
      <loc>${base}/sitemaps/airports/${i}.xml</loc>
      <lastmod>${now}</lastmod>
    </sitemap>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
