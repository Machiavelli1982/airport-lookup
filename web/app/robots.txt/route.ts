// web/app/robots.txt/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24;

export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;

  const body =
    `User-agent: *\n` +
    `Allow: /\n` +
    `Sitemap: ${origin}/sitemap.xml\n`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
