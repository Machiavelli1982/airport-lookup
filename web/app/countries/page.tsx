// web/app/countries/page.tsx
import Link from "next/link";
import { sql } from "@/lib/db";
import type { Metadata } from "next";
import { 
  Globe, 
  Map, 
  ChevronLeft, 
  Search, 
  Plane, 
  ShieldCheck,
  LayoutGrid,
  Database
} from "lucide-react";
import CountryBrowser from "@/app/countries/CountryBrowser"; // Wir erstellen diese Client-Komponente gleich mit

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  title: "All Countries & Regions — Airport Lookup",
  description: "Browse 200+ countries for technical MSFS runway and ILS data. Global coverage for flight simulator pilots.",
  alternates: { canonical: "/countries" },
};

const CONTINENT_MAP: Record<string, string> = {
  'AF': 'Africa', 'AN': 'Antarctica', 'AS': 'Asia', 'EU': 'Europe', 
  'NA': 'North America', 'OC': 'Oceania', 'SA': 'South America'
};

export default async function CountriesOverview() {
  // Erweitertes SQL für Hub- und ILS-Statistiken pro Land
  const countries = await sql`
    SELECT 
      c.code, 
      c.name, 
      c.continent, 
      COUNT(DISTINCT a.id) as airport_count,
      COUNT(DISTINCT ri.id) as ils_count
    FROM countries c
    JOIN airports a ON c.code = a.iso_country
    LEFT JOIN runway_ils ri ON a.ident = ri.airport_ident
    WHERE a.type IN ('large_airport', 'medium_airport', 'small_airport')
    GROUP BY c.code, c.name, c.continent
    ORDER BY c.name ASC
  `;

  // Daten für die Kontinent-Navigation vorbereiten
  const grouped = countries.reduce((acc: any, c: any) => {
    const cont = CONTINENT_MAP[c.continent] || 'Other';
    if (!acc[cont]) acc[cont] = [];
    acc[cont].push(c);
    return acc;
  }, {});

  const continents = Object.keys(grouped).sort();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Header Bereich */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-neutral-500 hover:text-blue-600 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        {/* GRAUER DISCLAIMER BADGE */}
        <p className="inline-block px-3 py-1.5 mb-6 text-[10px] font-bold tracking-widest uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm">
          Reference only — not for real-world navigation.
        </p>

        <h1 className="text-4xl font-black mb-4 flex items-center gap-3 text-neutral-900 dark:text-white">
          <Globe className="w-8 h-8 text-blue-500" /> Browse by Country
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl leading-relaxed font-medium">
          Select a country to view technical runway lighting, verified ILS frequencies, and radio comms for MSFS 2024. 
          Our database includes professional data for over 40,000 airports worldwide.
        </p>
      </div>

      {/* Kontinent-Schnellauswahl (Jump-Links) */}
      <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar">
        {continents.map((cont) => (
          <a
            key={cont}
            href={`#${cont.replace(/\s+/g, '-').toLowerCase()}`}
            className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap border border-transparent hover:border-blue-500"
          >
            {cont}
          </a>
        ))}
      </div>

      {/* Die interaktive Länder-Liste (mit Suche) */}
      <CountryBrowser initialData={grouped} continents={continents} />

      {/* Transparenz-Sektion am Ende */}
      <section className="mt-20 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-neutral-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Global Data Coverage</h3>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed font-medium">
          We provide high-fidelity data sourced from FAA NASR (United States) and researched AIP 2026 (Global) datasets. 
          ILS verification status is updated weekly to ensure accuracy for the virtual skies of MSFS 2024. 
          Reference only — not for real-world navigation.
        </p>
      </section>
    </main>
  );
}