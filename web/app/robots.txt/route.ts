export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24;

export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://airportlookup.com/sitemap.xml
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
