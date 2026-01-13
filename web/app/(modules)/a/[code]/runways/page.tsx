import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";


export const revalidate = 60 * 60 * 24;

function norm(code: string) {
  return code.trim().toUpperCase();
}

export async function generateMetadata({ params }: { params: { code: string } }) {
  const code = norm(params.code);

  const rows = await sql/* sql */`
    SELECT ident as icao, iata_code as iata, name
    FROM airports
    WHERE UPPER(ident)= ${code} OR UPPER(iata_code)= ${code}
    LIMIT 1;
  `;
  const a = rows[0];
  if (!a) return { title: "Runways – Airport not found" };

  return {
    title: `Runways – ${a.icao}${a.iata ? ` / ${a.iata}` : ""} – ${a.name}`,
    description: `Runway overview for ${a.icao}${a.iata ? ` (${a.iata})` : ""}: lengths, surfaces and lighting (where available). Reference only – not for real-world navigation.`,
    robots: { index: true, follow: true },
    alternates: { canonical: `/a/${a.icao}/runways` },
  };
}

export default async function RunwaysPage({ params }: { params: { code: string } }) {
  const code = norm(params.code);

  const arows = await sql/* sql */`
    SELECT id, ident as icao, iata_code as iata, name
    FROM airports
    WHERE UPPER(ident)= ${code} OR UPPER(iata_code)= ${code}
    LIMIT 1;
  `;
  const a = arows[0];
  if (!a) notFound();

  const runways = await sql/* sql */`
    SELECT
      le_ident, he_ident,
      length_ft, width_ft,
      surface,
      lighted,
      closed
    FROM runways
    WHERE airport_ref = ${a.id}
    ORDER BY length_ft DESC NULLS LAST;
  `;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">
          Runways – {a.icao}{a.iata ? ` / ${a.iata}` : ""} – {a.name}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Reference only – not for real-world navigation.
        </p>
      </header>

      <div className="grid gap-2">
        {runways.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runway data available.</p>
        ) : (
          runways.map((r: any, idx: number) => (
            <div key={idx} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  {r.le_ident} / {r.he_ident}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.lighted ? "Lighted" : "No lighting"}{r.closed ? " · Closed" : ""}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {r.length_ft ? `${r.length_ft} ft` : "—"} · {r.width_ft ? `${r.width_ft} ft` : "—"} · {r.surface || "—"}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Link className="text-sm underline" href={`/a/${a.icao}`}>Back to hub</Link>
        <Link className="text-sm underline" href={`/airports/${a.icao}`}>Open full airport page</Link>
      </div>
    </main>
  );
}
