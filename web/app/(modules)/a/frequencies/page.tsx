import Link from "next/link";
import { sql } from "@/lib/db";

export const revalidate = 86400; // 24h

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function clean(v: unknown): string | null {
  const t = s(v).trim();
  return t.length ? t : null;
}

export default async function FrequenciesIndex({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // optional query, robust bei undefined/array
  const qRaw = searchParams?.q;
  const q = clean(Array.isArray(qRaw) ? qRaw[0] : qRaw);

  // Wenn du ohne Query einfach eine kleine “Top” Liste zeigen willst:
  // (oder leere Seite mit Hinweis)
  const rows =
    q
      ? await sql/* sql */`
          SELECT
            airport_ident as icao,
            type,
            description,
            frequency_mhz
          FROM frequencies
          WHERE airport_ident ILIKE ${q + "%"}
             OR type ILIKE ${"%" + q + "%"}
             OR description ILIKE ${"%" + q + "%"}
          ORDER BY airport_ident, type
          LIMIT 200;
        `
      : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Frequencies</h1>
        <p className="text-sm text-muted-foreground">
          Reference only – not for real-world navigation.
        </p>
      </header>

      {!q ? (
        <p className="text-sm text-muted-foreground">
          Add <span className="font-mono">?q=LOWW</span> to search.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No results for “{q}”.</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((r: any, idx: number) => {
            const icao = clean(r.icao) ?? "";
            const label = [
              clean(r.type)?.toUpperCase(),
              clean(r.description),
              r.frequency_mhz != null ? `${r.frequency_mhz} MHz` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={idx} className="rounded-md border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-medium">
                    {icao ? (
                      <Link className="underline" href={`/a/${icao}`}>
                        {icao}
                      </Link>
                    ) : (
                      "Unknown"
                    )}
                  </div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{label}</div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
