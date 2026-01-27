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
  Square,
  ChevronDown
} from "lucide-react";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

type Props = { 
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; region?: string; ilsOnly?: string }>;
};

/* ----------------------------- SEO ----------------------------- */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const country = (await sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`)[0];
  if (!country) return { title: "Country Not Found" };

  return {
    title: `${country.name} MSFS Airports — Runway & ILS Database`,
    description: `Technical MSFS 2024 database for ${country.name}. Verified FAA and AIP 2026 ILS frequencies and lighting.`,
  };
}

/* ----------------------------- COMPONENT ----------------------------- */

export default async function CountryPage(props: Props) {
  const { code: rawCode } = await props.params;
  const code = rawCode.toUpperCase();
  const sParams = await props.searchParams;
  
  const currentType = sParams.type || 'large_airport';
  const currentRegion = sParams.region || '';
  const ilsOnly = sParams.ilsOnly === 'true';

  // Daten abrufen: Country, Stats, Regions (gefiltert), ILS-Stats
  const [country, stats, regions, ilsStats] = await Promise.all([
    sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`,
    sql`
      SELECT 
        COUNT(id) FILTER (WHERE type = 'large_airport') as large_count,
        COUNT(id) FILTER (WHERE type = 'medium_airport') as medium_count,
        COUNT(id) FILTER (WHERE type = 'small_airport') as small_count,
        COUNT(id) FILTER (WHERE type = 'heliport') as heli_count,
        COUNT(id) as total_count
      FROM airports WHERE iso_country = ${code}
    `,
    sql`
      SELECT DISTINCT r.name, r.code 
      FROM regions r 
      JOIN airports a ON r.code = a.iso_region 
      WHERE a.iso_country = ${code} 
      AND r.name IS NOT NULL AND r.name != '' AND r.name NOT ILIKE '%unassigned%'
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

  // Flughafen-Liste mit Filtern
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
    LIMIT 500
  `;

  const getIcon = (type: string) => {
    switch (type) {
      case "large_airport": return <Plane className="w-5 h-5 text-blue-600 shrink-0" />;
      case "medium_airport": return <Plane className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "heliport": return <Helicopter className="w-4 h-4 text-purple-600 shrink-0" />;
      default: return <Plane className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link href="/countries" className="flex items-center gap-1 text-sm font-bold text-neutral-500 hover:text-blue-600 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to Countries
      </Link>

      {/* DISCLAIMER BADGE */}
      <p className="inline-block px-3 py-1.5 mb-6 text-[10px] font-bold tracking-widest uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-md border border-neutral-200 dark:border-neutral-700">
        Reference only — not for real-world navigation.
      </p>

      <h1 className="text-4xl font-black mb-4 flex items-center gap-3">
        {country[0].name} <span className="text-neutral-300 dark:text-neutral-700 text-2xl">{code}</span>
      </h1>

      {/* DATENBANK ÜBERBLICK */}
      <div className="bg-blue-600/5 border border-blue-600/10 rounded-2xl p-6 mb-10 flex gap-5 items-start">
        <div className="bg-blue-600 p-3 rounded-xl hidden sm:block">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          Our global database provides <strong>{Number(stats[0].total_count).toLocaleString()} airports</strong> in {country[0].name}. 
          This includes {Number(stats[0].large_count).toLocaleString()} major hubs and {Number(stats[0].medium_count).toLocaleString()} regional airports. 
          We have verified <strong>{Number(ilsStats[0].count).toLocaleString()} ILS frequencies</strong> for this region. 
          Data source: <strong>{code === 'US' ? 'FAA NASR' : 'AIP 2026 & International Records'}</strong>.
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* VERTICAL COLLAPSIBLE FILTERS */}
        <aside className="w-full lg:w-64 shrink-0">
          <details open className="group mb-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <summary className="list-none p-4 font-bold text-sm flex justify-between items-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <span className="flex items-center gap-2"><Filter className="w-4 h-4" /> Airport Type</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-1">
              {[
                { id: 'large_airport', label: 'Major Hubs' },
                { id: 'medium_airport', label: 'Regional' },
                { id: 'small_airport', label: 'Small Airfields' },
                { id: 'heliport', label: 'Heliports' }
              ].map((t) => (
                <Link
                  key={t.id}
                  href={`?type=${t.id}${currentRegion ? `&region=${currentRegion}` : ''}${ilsOnly ? `&ilsOnly=true` : ''}`}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${currentType === t.id ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </details>

          {/* ILS CHECKBOX */}
          <Link 
            href={`?type=${currentType}${currentRegion ? `&region=${currentRegion}` : ''}${!ilsOnly ? `&ilsOnly=true` : ''}`}
            className="flex items-center gap-3 p-4 mb-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs font-bold hover:border-emerald-500 transition-all"
          >
            {ilsOnly ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5 text-neutral-300" />}
            <span>Show only with ILS</span>
          </Link>

          {/* REGIONS FILTER */}
          <details className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <summary className="list-none p-4 font-bold text-sm flex justify-between items-center cursor-pointer hover:bg-neutral-50 transition-colors">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Regions</span>
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 max-h-[400px] overflow-y-auto no-scrollbar flex flex-col gap-1">
              <Link 
                href={`?type=${currentType}${ilsOnly ? `&ilsOnly=true` : ''}`}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${!currentRegion ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
              >
                All Regions
              </Link>
              {regions.map((r) => (
                <Link
                  key={r.code}
                  href={`?type=${currentType}&region=${r.code}${ilsOnly ? `&ilsOnly=true` : ''}`}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${currentRegion === r.code ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
                >
                  {r.name}
                </Link>
              ))}
            </div>
          </details>
        </aside>

        {/* AIRPORT GRID */}
        <div className="flex-grow grid gap-3 sm:grid-cols-2">
          {airports.map((a) => (
            <Link 
              key={a.ident} 
              href={`/airports/${a.ident}`} 
              className="group flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-400 transition-all shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center shrink-0 flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                {getIcon(a.type)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-white">{a.ident}</span>
                  {a.has_ils && (
                    <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter shrink-0">
                      ILS
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-neutral-500 truncate">{a.name}</div>
                <div className="text-[10px] text-neutral-400 font-bold uppercase truncate">{a.municipality}</div>
              </div>
            </Link>
          ))}
          {airports.length === 0 && (
            <div className="col-span-full py-20 text-center text-neutral-400 font-medium italic border-2 border-dashed border-neutral-100 rounded-3xl">
              No airports found matching these filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}