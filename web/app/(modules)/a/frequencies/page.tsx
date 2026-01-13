import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";


export const revalidate = 86400;


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
  if (!a) return { title: "Frequencies – Airport not found" };

  return {
    title: `Frequencies – ${a.icao}${a.iata ? ` / ${a.iata}` : ""} – ${a.name}`,
    description: `Radio frequencies for ${a.icao}${a.iata ? ` (${a.iata})` : ""} (where available). Reference only – not for real-world navigation.`,
    robots: { index: true, follow: true },
    alternates: { canonical: `/a/${a.icao}/frequencies` },
  };
}

export default async function FrequenciesPage({ params }: { params: { code: string } }) {
  const code = norm(params.code);

  const arows = await sql/* sql */`
    SELECT id, ident as icao, iata_code as iata, name
    FROM airports
    WHERE UPPER(ident)= ${code} OR UPPER(iata_code)= ${code}
    LIMIT 1;
  `;
  const a = arows[0];
  if (!a) notFound();

const freqs = await sql/* sql */`
  SELECT type, description, frequency_mhz
  FROM frequencies
  WHERE airport_ref = ${a.id}
  ORDER BY type, frequency_mhz;
`;


  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">
          Frequencies – {a.icao}{a.iata ? ` / ${a.iata}` : ""} – {a.name}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Reference only – not for real-world navigation.
        </p>
      </header>

      <div className="grid gap-2">
        {freqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No frequency data available.</p>
        ) : (
          freqs.map((f: any, idx: number) => (
            <div key={idx} className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{f.type}</div>
                <div className="text-sm tabular-nums">
                  {f.frequency_mhz != null ? `${Number(f.frequency_mhz).toFixed(3)} MHz` : "—"}
                </div>
              </div>
              {f.description ? (
                <div className="mt-1 text-sm text-muted-foreground">{f.description}</div>
              ) : null}
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
