import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24;

const CHUNK = 5000;

function xml(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, s, i) => acc + s + (values[i] ?? ""), "");
}

export async function GET() {
  const [{ count }] = await sql/* sql */`SELECT COUNT(*)::int as count FROM airports;`;
  const total = Number(count || 0);
  const parts = Math.max(1, Math.ceil(total / CHUNK));

  const base = "https://airportlookup.com";

  const body = xml`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from({ length: parts }).map((_, i) => {
  const n = i + 1;
  return `<sitemap><loc>${base}/sitemaps/airports-${n}.xml</loc></sitemap>`;
}).join("")}
</sitemapindex>`;

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
