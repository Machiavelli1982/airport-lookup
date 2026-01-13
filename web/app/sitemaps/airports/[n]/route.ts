import { NextRequest } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const CHUNK = 5000;

function xmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ n: string }> }
) {
  const { n } = await context.params;

  const chunkIndex = Math.max(1, Number.parseInt(n, 10) || 1);
  const offset = (chunkIndex - 1) * CHUNK;

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

  const rows = await sql<{ ident: string }[]>`
    SELECT ident
    FROM airports
    WHERE ident IS NOT NULL AND ident <> ''
    ORDER BY ident ASC
    LIMIT ${CHUNK} OFFSET ${offset};
  `;

  const urls = rows
    .map((r) => r.ident?.trim().toUpperCase())
    .filter(Boolean)
    .map((ident) => {
      const loc = `${origin}/a/${encodeURIComponent(ident!)}`;
      return `  <url><loc>${xmlEscape(loc)}</loc></url>`;
    })
    .join("\n");

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
