import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";

export const revalidate = 86400; // 24h

// null/undefined-safe string helpers
function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function norm(v: unknown): string {
  return s(v).trim().toUpperCase();
}

function clean(v: unknown): string | null {
  const t = s(v).trim();
  return t.length ? t : null;
}

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}) {
  const code = norm(params.code);

  const rows = await sql/* sql */`
    SELECT ident as icao, iata_code as iata, name, municipality, iso_country, type
    FROM airports
    WHERE UPPER(ident)= ${code} OR UPPER(iata_code)= ${code}
    LIMIT 1;
  `;

  const a = rows[0];
  if (!a) return { title: "Airport not found" };

  const icao = clean(a.icao) ?? code;
  const iata = clean(a.iata);
  const name = clean(a.name) ?? "Airport";
  const title = `${icao}${iata ? ` / ${iata}` : ""} – ${name}`;
  const desc = `Quick airport reference for ${icao}${iata ? ` (${iata})` : ""}: runways, frequencies and key facts. Reference only – not for real-world navigation.`;

  return {
    title,
    description: desc,
    robots: { index: true, follow: true },
    alternates: { canonical: `/a/${icao}` },
  };
}

// Pre-render nur “große” Airports (optional: medium dazu)
export async function generateStaticParams() {
  const rows = await sql/* sql */`
    SELECT ident
    FROM airports
    WHERE type = 'large_airport'
       OR scheduled_service = 'yes'
    ORDER BY
      CASE WHEN type = 'large_airport' THEN 0 ELSE 1 END,
      CASE WHEN scheduled_service = 'yes' THEN 0 ELSE 1 END,
      ident
    LIMIT 2000;
  `;

  // IMPORTANT: filter out null/empty idents to avoid params.code === undefined
  return (rows as any[])
    .map((r) => clean(r?.ident))
    .filter((ident): ident is string => Boolean(ident))
    .map((ident) => ({ code: ident }));
}

export default async function AirportSeoHub({
  params,
}: {
  params: { code: string };
}) {
  const code = norm(params.code);

  const rows = await sql/* sql */`
    SELECT
      ident as icao,
      iata_code as iata,
      name,
      municipality,
      iso_country,
      type,
      elevation_ft
    FROM airports
    WHERE UPPER(ident)= ${code} OR UPPER(iata_code)= ${code}
    LIMIT 1;
  `;

  const a = rows[0];
  if (!a) notFound();

  const icao = clean(a.icao) ?? code;
  const iata = clean(a.iata);
  const name = clean(a.name) ?? "Airport";
  const municipality = clean(a.municipality);
  const isoCountry = clean(a.iso_country) ?? "";
  const typeLabel = (clean(a.type) ?? "").replaceAll("_", " ");
  const elevation = a.elevation_ft != null ? `${a.elevation_ft} ft` : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">
          {icao}
          {iata ? ` / ${iata}` : ""} – {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {municipality ? `${municipality}, ` : ""}
          {isoCountry}
          {typeLabel ? ` · ${typeLabel}` : ""}
          {elevation ? ` · ${elevation}` : ""}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Reference only – not for real-world navigation.
        </p>
      </header>

      <section className="grid gap-2">
        <Link
          className="rounded-md border p-3 hover:bg-muted"
          href={`/a/${icao}/runways`}
        >
          Runways
        </Link>
        <Link
          className="rounded-md border p-3 hover:bg-muted"
          href={`/a/${icao}/frequencies`}
        >
          Frequencies
        </Link>
        <Link
          className="rounded-md border p-3 hover:bg-muted"
          href={`/airports/${icao}`}
        >
          Open full airport page
        </Link>
      </section>
    </main>
  );
}
