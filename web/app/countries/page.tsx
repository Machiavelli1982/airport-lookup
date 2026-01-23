// web/app/countries/page.tsx
import Link from "next/link";
import { sql } from "@/lib/db";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  title: "All Countries & Regions — Airport Lookup",
  description: "Browse airports by country and region. Technical runway and ILS data for flight simulator pilots worldwide.",
  alternates: { canonical: "/countries" },
};

const CONTINENT_MAP: Record<string, string> = {
  'AF': 'Africa', 'AN': 'Antarctica', 'AS': 'Asia', 'EU': 'Europe', 
  'NA': 'North America', 'OC': 'Oceania', 'SA': 'South America'
};

export default async function CountriesOverview() {
  const countries = await sql`
    SELECT c.code, c.name, c.continent, COUNT(a.id) as airport_count
    FROM countries c
    JOIN airports a ON c.code = a.iso_country
    WHERE a.type IN ('large_airport', 'medium_airport')
    GROUP BY c.code, c.name, c.continent
    ORDER BY c.continent ASC, c.name ASC
  `;

  // Länder nach Kontinent gruppieren
  const grouped = countries.reduce((acc: any, c: any) => {
    const cont = CONTINENT_MAP[c.continent] || 'Other';
    if (!acc[cont]) acc[cont] = [];
    acc[cont].push(c);
    return acc;
  }, {});

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm font-semibold text-neutral-600 hover:text-blue-600">← Back to Home</Link>
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight mb-4">Browse Airports by Region</h1>
      <p className="text-lg text-neutral-600 mb-12 max-w-3xl">
        Select a country to view technical runway data, ILS frequencies, and radio comms for MSFS 2024. 
        Our database includes technical information for over 40,000 airports worldwide.
      </p>

      <div className="space-y-16">
        {Object.entries(grouped).map(([continent, list]: [any, any]) => (
          <section key={continent}>
            <h2 className="text-xl font-bold uppercase tracking-widest text-neutral-400 mb-6 border-b pb-2">
              {continent}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {list.map((c: any) => (
                <Link
                  key={c.code}
                  href={`/countries/${c.code.toLowerCase()}`}
                  className="p-4 rounded-xl border border-neutral-100 hover:border-blue-500 hover:shadow-sm transition-all bg-white"
                >
                  <span className="block text-sm font-bold text-neutral-900">{c.name}</span>
                  <span className="text-xs text-neutral-500">{c.airport_count} Hubs</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}