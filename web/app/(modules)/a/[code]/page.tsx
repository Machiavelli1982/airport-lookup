import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";


export const revalidate = 86400; // 24h


function norm(code: string) {
  return code.trim().toUpperCase();
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

  const title = `${a.icao}${a.iata ? ` / ${a.iata}` : ""} – ${a.name}`;
  const desc = `Quick airport reference for ${a.icao}${a.iata ? ` (${a.iata})` : ""}: runways, frequencies and key facts. Reference only – not for real-world navigation.`;

  return {
    title,
    description: desc,
    robots: { index: true, follow: true },
    alternates: { canonical: `/a/${a.icao}` },
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
  return rows.map((r: any) => ({ code: r.ident }));
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">
          {a.icao}
          {a.iata ? ` / ${a.iata}` : ""} – {a.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {a.municipality ? `${a.municipality}, ` : ""}
          {a.iso_country} · {a.type.replaceAll("_", " ")}
          {a.elevation_ft != null ? ` · ${a.elevation_ft} ft` : ""}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Reference only – not for real-world navigation.
        </p>
      </header>

      <section className="grid gap-2">
        <Link className="rounded-md border p-3 hover:bg-muted" href={`/a/${a.icao}/runways`}>
          Runways
        </Link>
        <Link className="rounded-md border p-3 hover:bg-muted" href={`/a/${a.icao}/frequencies`}>
          Frequencies
        </Link>
        <Link className="rounded-md border p-3 hover:bg-muted" href={`/airports/${a.icao}`}>
          Open full airport page
        </Link>
      </section>
    </main>
  );
}
