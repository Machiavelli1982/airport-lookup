// web/app/sitemap.xml/route.ts
import { NextRequest } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24; // 24h
const CHUNK = 5000;

function xmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

  const [{ cnt }] = await sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM airports
    WHERE ident IS NOT NULL AND ident <> '';
  `;

  const total = Number(cnt) || 0;
  const chunks = Math.max(1, Math.ceil(total / CHUNK));

  const sitemaps = Array.from({ length: chunks }, (_, i) => i + 1)
    .map((i) => {
      const loc = `${origin}/sitemaps/airports/${i}`;
      return `  <sitemap><loc>${xmlEscape(loc)}</loc></sitemap>`;
    })
    .join("\n");

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${sitemaps}\n` +
    `</sitemapindex>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
