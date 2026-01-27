// web/app/countries/[code]/page.tsx
import { sql } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { 
  Plane, 
  Helicopter, 
  ChevronLeft, 
  MapPin, 
  ShieldCheck,
  Globe
} from "lucide-react";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = "https://www.airportlookup.com";

/* ----------------------------- SEO & METADATA ----------------------------- */

type Props = { 
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  
  const country = (await sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`)[0];
  if (!country) return { title: "Country Not Found" };

  return {
    title: `${country.name} MSFS Airports — Runway & ILS Data`,
    description: `Technical database for MSFS 2024: Browse all airports in ${country.name}. Verified ILS frequencies, runway lighting, and radio comms.`,
    alternates: { canonical: `/countries/${code.toLowerCase()}` },
  };
}

/* ----------------------------- COMPONENT ----------------------------- */

export default async function CountryPage(props: Props) {
  const { code: rawCode } = await props.params;
  const code = rawCode.toUpperCase();
  const searchParams = await props.searchParams;
  
  // Aktueller Filter (Default: Large Airports / Hubs)
  const currentType = searchParams.type || 'large_airport';

  // Länder-Infos und Statistiken parallel laden
  const [country, stats] = await Promise.all([
    sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`,
    sql`
      SELECT 
        COUNT(id) FILTER (WHERE type = 'large_airport') as large_count,
        COUNT(id) FILTER (WHERE type = 'medium_airport') as medium_count,
        COUNT(id) FILTER (WHERE type = 'small_airport') as small_count,
        COUNT(id) FILTER (WHERE type = 'heliport') as heli_count
      FROM airports 
      WHERE iso_country = ${code}
    `
  ]);

  if (!country[0]) notFound();

  // Flughäfen basierend auf dem gewählten Filter laden
  const airports = await sql`
    SELECT 
      ident, 
      iata_code, 
      name, 
      municipality, 
      type,
      EXISTS (
        SELECT 1 FROM runway_ils 
        WHERE airport_ident = airports.ident
      ) as has_ils
    FROM airports 
    WHERE iso_country = ${code} 
    AND type = ${currentType}
    ORDER BY (iata_code IS NOT NULL) DESC, name ASC
    LIMIT 1000
  `;

  // Icon-Logik identisch zur Suche
  const getIcon = (type: string) => {
    switch (type) {
      case "large_airport": return <Plane className="w-5 h-5 text-blue-600" />;
      case "medium_airport": return <Plane className="w-4 h-4 text-emerald-600" />;
      case "small_airport": return <Plane className="w-3.5 h-3.5 text-amber-600" />;
      case "heliport": return <Helicopter className="w-4 h-4 text-purple-600" />;
      default: return <Plane className="w-4 h-4 text-neutral-400" />;
    }
  };

  const tabs = [
    { id: 'large_airport', label: 'Major Hubs', count: stats[0].large_count },
    { id: 'medium_airport', label: 'Regional', count: stats[0].medium_count },
    { id: 'small_airport', label: 'Small Airfields', count: stats[0].small_count },
    { id: 'heliport', label: 'Heliports', count: stats[0].heli_count },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Navigation & Header */}
      <div className="mb-8">
        <Link href="/countries" className="flex items-center gap-1 text-sm font-bold text-neutral-500 hover:text-blue-600 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Countries
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-6 h-6 text-blue-500" />
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white">
            {country[0].name}
          </h1>
        </div>
        <p className="text-neutral-500 font-medium">
          Technical MSFS database for {country[0].name}. Verified FAA and AIP 2026 data.
        </p>
      </div>

      {/* Filter Tabs - Entscheidend für Performance bei >16.000 Einträgen */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-scrollbar">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/countries/${code.toLowerCase()}?type=${tab.id}`}
            className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold transition-all border whitespace-nowrap ${
              currentType === tab.id 
              ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-blue-300'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
              currentType === tab.id ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
            }`}>
              {Number(tab.count).toLocaleString()}
            </span>
          </Link>
        ))}
      </div>

      {/* Airport Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {airports.length > 0 ? (
          airports.map((a) => (
            <Link 
              key={a.ident} 
              href={`/airports/${a.ident}`} 
              className="group flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              {/* Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                {getIcon(a.type)}
              </div>

              {/* Info Area */}
              <div className="min-w-0 flex-grow">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {a.ident}
                  </span>
                  {a.iata_code && (
                    <span className="text-[10px] font-bold text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-1 rounded">
                      {a.iata_code}
                    </span>
                  )}
                  {a.has_ils && (
                    <span className="flex items-center gap-0.5 text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">
                      <ShieldCheck className="w-2.5 h-2.5" /> ILS
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300 truncate">
                  {a.name}
                </div>
                <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-tight truncate flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {a.municipality || 'Unknown Region'}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-neutral-100 dark:border-neutral-800">
            <p className="text-neutral-500 font-medium italic">No airports of this type found in this region.</p>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <footer className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <p className="text-xs text-neutral-500 font-medium leading-relaxed">
          Technical landing data for <strong>{country[0].name}</strong> is compiled using FAA NASR (US) and researched AIP 2026 (Global) datasets. <br />
          Data for simulation only — not for real-world navigation.
        </p>
      </footer>
    </main>
  );
}