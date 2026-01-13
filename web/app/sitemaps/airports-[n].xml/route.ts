import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24;

const CHUNK = 5000;

function xmlEscape(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function GET(
  _req: Request,
  { params }: { params: { n: string } }
) {
  const n = Math.max(1, Number(params.n || 1));
  const offset = (n - 1) * CHUNK;

  const rows = await sql/* sql */`
    SELECT ident
    FROM airports
    ORDER BY ident
    LIMIT ${CHUNK} OFFSET ${offset};
  `;

  const base = "https://airportlookup.com";
  const urls = rows
    .map((r: any) => {
      const code = encodeURIComponent(String(r.ident).toUpperCase());
      return `<url><loc>${base}/a/${xmlEscape(code)}</loc></url>`;
    })
    .join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
