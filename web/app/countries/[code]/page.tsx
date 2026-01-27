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
  Globe,
  Database,
  Filter,
  CheckSquare,
  Square
} from "lucide-react";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = "https://www.airportlookup.com";

/* ----------------------------- SEO & METADATA ----------------------------- */

type Props = { 
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; region?: string; ilsOnly?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  
  const country = (await sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`)[0];
  if (!country) return { title: "Country Not Found" };

  return {
    title: `${country.name} MSFS Airports — Runway & ILS Frequency Database`,
    description: `Technical database for MSFS 2024: Browse all airports in ${country.name}. Verified FAA and AIP 2026 ILS frequencies, lighting, and comms.`,
    alternates: { canonical: `/countries/${code.toLowerCase()}` },
  };
}

/* ----------------------------- COMPONENT ----------------------------- */

export default async function CountryPage(props: Props) {
  const { code: rawCode } = await props.params;
  const code = rawCode.toUpperCase();
  const searchParams = await props.searchParams;
  
  const currentType = searchParams.type || 'large_airport';
  const currentRegion = searchParams.region || '';
  const ilsOnly = searchParams.ilsOnly === 'true';

  // Länder-Daten, Regionen und ILS-Statistiken abrufen
  const [country, stats, regions, ilsStats] = await Promise.all([
    sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`,
    sql`
      SELECT 
        COUNT(id) FILTER (WHERE type = 'large_airport') as large_count,
        COUNT(id) FILTER (WHERE type = 'medium_airport') as medium_count,
        COUNT(id) FILTER (WHERE type = 'small_airport') as small_count,
        COUNT(id) FILTER (WHERE type = 'heliport') as heli_count,
        COUNT(id) as total_count
      FROM airports 
      WHERE iso_country = ${code}
    `,
    sql`
      SELECT DISTINCT r.name, r.code 
      FROM regions r 
      JOIN airports a ON r.code = a.iso_region 
      WHERE a.iso_country = ${code} 
      ORDER BY r.name ASC
    `,
    sql`
      SELECT COUNT(ri.id) as count 
      FROM runway_ils ri 
      JOIN airports a ON ri.airport_ident = a.ident 
      WHERE a.iso_country = ${code}
    `
  ]);

  if (!country[0]) notFound();

  // Dynamische SQL-Abfrage mit Filtern
  const airports = await sql`
    SELECT 
      ident, iata_code, name, municipality, type,
      EXISTS (SELECT 1 FROM runway_ils WHERE airport_ident = airports.ident) as has_ils
    FROM airports 
    WHERE iso_country = ${code} 
    AND type = ${currentType}
    ${currentRegion ? sql`AND iso_region = ${currentRegion}` : sql``}
    ${ilsOnly ? sql`AND EXISTS (SELECT 1 FROM runway_ils WHERE airport_ident = airports.ident)` : sql``}
    ORDER BY (iata_code IS NOT NULL) DESC, name ASC
    LIMIT 1000
  `;

  const getIcon = (type: string) => {
    switch (type) {
      case "large_airport": return <Plane className="w-5 h-5 text-blue-600" />;
      case "medium_airport": return <Plane className="w-4 h-4 text-emerald-600" />;
      case "small_airport": return <Plane className="w-3.5 h-3.5 text-amber-600" />;
      case "heliport": return <Helicopter className="w-4 h-4 text-purple-600" />;
      default: return <Plane className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link href="/countries" className="flex items-center gap-1 text-sm font-bold text-neutral-500 hover:text-blue-600 transition-colors mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Countries
      </Link>

      {/* GRAUER DISCLAIMER BADGE */}
      <p className="inline-block px-3 py-1.5 mb-6 text-[10px] font-bold tracking-widest uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm">
        Reference only — not for real-world navigation.
      </p>

      <div className="flex items-baseline gap-3 mb-2">
        <h1 className="text-4xl font-black text-neutral-900 dark:text-white">{country[0].name}</h1>
        <span className="text-xl font-bold text-neutral-300 dark:text-neutral-700">{code}</span>
      </div>

      {/* DATENBANK-INFO TEXT */}
      <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 mb-10 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="shrink-0 p-3 bg-blue-600 rounded-xl">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Our database currently covers <strong>{Number(stats[0].total_count).toLocaleString()} airports</strong> in {country[0].name}, 
            including {Number(stats[0].large_count).toLocaleString()} major hubs and {Number(stats[0].medium_count).toLocaleString()} regional airports. 
            We have verified <strong>{Number(ilsStats[0].count).toLocaleString()} ILS frequencies</strong> for this region 
            (FAA NASR for US / AIP 2026 for Global).
          </p>
        </div>
      </div>

      {/* TABS: Airport Types */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'large_airport', label: 'Major Hubs', count: stats[0].large_count },
          { id: 'medium_airport', label: 'Regional', count: stats[0].medium_count },
          { id: 'small_airport', label: 'Small Airfields', count: stats[0].small_count },
          { id: 'heliport', label: 'Heliports', count: stats[0].heli_count },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={`?type=${tab.id}${currentRegion ? `&region=${currentRegion}` : ''}${ilsOnly ? `&ilsOnly=true` : ''}`}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border whitespace-nowrap ${
              currentType === tab.id 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600'
            }`}
          >
            {tab.label} <span className="opacity-60 ml-1">({Number(tab.count).toLocaleString()})</span>
          </Link>
        ))}
      </div>

      {/* FILTER: Regions & ILS Checkbox */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3 flex-grow">
          <Filter className="w-4 h-4 text-neutral-400" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <Link 
              href={`?type=${currentType}${ilsOnly ? `&ilsOnly=true` : ''}`}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border ${!currentRegion ? 'bg-neutral-800 text-white border-neutral-800' : 'bg-white dark:bg-neutral-950 text-neutral-500 border-neutral-200'}`}
            >
              All Regions
            </Link>
            {regions.map((r) => (
              <Link
                key={r.code}
                href={`?type=${currentType}&region=${r.code}${ilsOnly ? `&ilsOnly=true` : ''}`}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap border ${currentRegion === r.code ? 'bg-neutral-800 text-white border-neutral-800' : 'bg-white dark:bg-neutral-950 text-neutral-500 border-neutral-200'}`}
              >
                {r.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-800 pt-4 md:pt-0 md:pl-6 flex items-center">
          <Link 
            href={`?type=${currentType}${currentRegion ? `&region=${currentRegion}` : ''}${!ilsOnly ? `&ilsOnly=true` : ''}`}
            className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 transition-colors"
          >
            {ilsOnly ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
            Show only airports with ILS
          </Link>
        </div>
      </div>

      {/* Airport Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {airports.map((a) => (
          <Link key={a.ident} href={`/airports/${a.ident}`} className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center shrink-0">
              {getIcon(a.type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-white">{a.ident}</span>
                {a.has_ils && (
                  <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">
                    ILS
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-neutral-500 truncate">{a.name}</div>
              <div className="text-[10px] text-neutral-400 uppercase font-medium">{a.municipality}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}