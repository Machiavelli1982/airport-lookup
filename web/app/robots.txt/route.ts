import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const txt = `User-agent: *
Allow: /

Disallow: /a/
Disallow: /api/

Sitemap: https://www.airportlookup.com/sitemap.xml
`;

  return new NextResponse(txt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
