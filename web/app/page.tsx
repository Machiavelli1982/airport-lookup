// web/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import AirportSearch from "@/app/components/AirportSearch";
import NearbyAirports from "@/app/components/NearbyAirports";
import { sql } from "@/lib/db";
import { 
  Plane, 
  Helicopter, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Radio, 
  Map, 
  ChevronRight, 
  Database,
  Info,
  Server
} from "lucide-react";

export const runtime = "nodejs";

const SITE_URL = "https://www.airportlookup.com";

/* ----------------------------- SEO & METADATA ----------------------------- */

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Professional MSFS 2024 Airport Database — Verified ILS & FAA Data",
    template: "%s · Airport Lookup",
  },
  description:
    "The ultimate technical reference for Microsoft Flight Simulator 2024. 40,000+ airports, 3,000+ verified ILS frequencies, and official FAA NASR data.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Global MSFS Airport Lookup (Runways, Lights, ILS Frequencies)",
    description: "Search 40,000+ airports with verified FAA and researched AIP 2026 data for MSFS 2024.",
    siteName: "Airport Lookup",
  },
  robots: { index: true, follow: true },
};

/* ----------------------------- CONSTANTS ----------------------------- */

const GLOBAL_HUBS = [
  { code: "KJFK", label: "New York", type: "large_airport", has_ils: true },
  { code: "EDDF", label: "Frankfurt", type: "large_airport", has_ils: true },
  { code: "EGLL", label: "London", type: "large_airport", has_ils: true },
  { code: "OMDB", label: "Dubai", type: "large_airport", has_ils: true },
  { code: "RJTT", label: "Tokyo", type: "large_airport", has_ils: true },
  { code: "FACT", label: "Cape Town", type: "large_airport", has_ils: true },
  { code: "YSSY", label: "Sydney", type: "large_airport", has_ils: true },
  { code: "SBGR", label: "São Paulo", type: "large_airport", has_ils: true },
];

const COUNTRY_HUB_MAP: Record<string, { code: string; label: string }> = {
  DE: { code: "EDDF", label: "Frankfurt" },
  AT: { code: "LOWW", label: "Vienna" },
  CH: { code: "LSZH", label: "Zurich" },
  GB: { code: "EGLL", label: "London" },
  US: { code: "KJFK", label: "New York" },
  FR: { code: "LFPG", label: "Paris" },
  JP: { code: "RJTT", label: "Tokyo" },
  AU: { code: "YSSY", label: "Sydney" },
};

/* ------------------------------ MAIN PAGE ------------------------------- */

export default async function Home() {
  const headerList = await headers();
  const countryCode = headerList.get("x-vercel-ip-country") || "US";
  const localHub = COUNTRY_HUB_MAP[countryCode] || COUNTRY_HUB_MAP["US"];

  // Detaillierte Länder-Statistiken inklusive ILS-Anzahl für den SEO-Flex
  const countryStats = await sql`
    SELECT 
      c.code, 
      c.name,
      COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'large_airport') as hubs,
      COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'medium_airport') as regional,
      COUNT(DISTINCT a.id) as total,
      COUNT(DISTINCT ri.id) as ils_total
    FROM countries c
    JOIN airports a ON c.code = a.iso_country
    LEFT JOIN runway_ils ri ON a.ident = ri.airport_ident
    WHERE a.type IN ('large_airport', 'medium_airport', 'small_airport')
    GROUP BY c.code, c.name
    ORDER BY hubs DESC
    LIMIT 12
  `;

  const getIcon = (type: string) => {
    switch (type) {
      case "large_airport": return <Plane className="w-4 h-4 text-blue-600 shrink-0" />;
      case "medium_airport": return <Plane className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "small_airport": return <Plane className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case "heliport": return <Helicopter className="w-4 h-4 text-purple-600 shrink-0" />;
      default: return <Plane className="w-4 h-4 text-neutral-400 shrink-0" />;
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Airport Lookup",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/airports/{search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Section */}
      <section className="mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-6">
          The Professional MSFS Airport Database
        </h1>
        
        {/* DATABASE STATS FLEX BAR - Zeigt unsere Power sofort an */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <Server className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-black text-sm">40,000+</span>
            <span className="text-blue-900/60 dark:text-blue-100/60 text-[10px] font-bold uppercase tracking-widest">Airports</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-600 font-black text-sm">3,000+</span>
            <span className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-widest">Verified ILS</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <Database className="w-4 h-4 text-amber-600" />
            <span className="text-amber-600 font-black text-sm">Official FAA</span>
            <span className="text-amber-900/60 dark:text-amber-100/60 text-[10px] font-bold uppercase tracking-widest">Data Source</span>
          </div>
        </div>

        <p className="text-xl text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-3xl">
          Search the world's most accurate technical reference for <strong>Microsoft Flight Simulator 2024</strong>. 
          Featuring <strong>official FAA data</strong> for the USA and 2026 AIP researched international records. 
          The go-to tool for real-time runway lighting, nav-aids, and approach frequencies.
        </p>
        
        <p className="mt-6 inline-block px-3 py-1.5 text-[10px] font-black tracking-[0.2em] uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm">
          Reference only — not for real-world navigation.
        </p>
      </section>

      {/* Search & Hubs Card */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-xl shadow-blue-500/5 mb-10">
        <AirportSearch />
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Our database includes <strong>comprehensive coverage of the United States</strong> via official FAA NASR cycles, 
            ensuring every localized runway and frequency is simulation-ready for your next IFR flight.
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            International hubs are updated via researched <strong>AIP 2026</strong> datasets, 
            providing verified ILS identifiers and lighting configurations for global MSFS 2024 operations.
          </p>
        </div>

        {/* Global Examples with Icons & ILS Badges */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <Globe className="w-3 h-3" /> Worldwide Hubs & Popular Searches
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/airports/${localHub.code}`}
              className="flex items-center gap-2 rounded-xl border-2 border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all"
            >
              <ShieldCheck className="w-4 h-4" /> 
              Your Region: {localHub.label} ({localHub.code})
              <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-600 px-1 rounded">ILS</span>
            </Link>

            {GLOBAL_HUBS.map((x) => (
              <Link
                key={x.code}
                href={`/airports/${x.code}`}
                className="group flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-blue-50 transition-all"
              >
                {getIcon(x.type)}
                {x.label} ({x.code})
                {x.has_ils && <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-600 px-1 rounded">ILS</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <NearbyAirports />

      {/* Feature Value Props */}
      <section className="mt-16 grid gap-6 md:grid-cols-3 mb-12">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:shadow-lg transition-shadow">
          <Zap className="w-6 h-6 text-emerald-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Runway & ILS</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Get accurate lengths, surfaces, and <strong>verified 2026 ILS frequencies</strong> for precision landings in MSFS 2024.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:shadow-lg transition-shadow">
          <Radio className="w-6 h-6 text-blue-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Global Comms</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Quickly find TWR, GND, and ATIS frequencies for over 40,000 airports worldwide.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 hover:shadow-lg transition-shadow">
          <Map className="w-6 h-6 text-amber-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Navaids</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Full coverage of VOR, NDB, and DME stations with verified frequencies and coordinates.
          </p>
        </div>
      </section>

      {/* Browse Airports by Country */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-neutral-900 dark:text-white">
          <Globe className="w-5 h-5 text-blue-500" /> Browse Global Hubs by Country
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countryStats.map((c) => (
            <Link 
              key={c.code} 
              href={`/countries/${c.code.toLowerCase()}`} 
              className="group p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {c.name}
                </span>
                <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-500">
                  {c.code}
                </span>
              </div>
              <div className="flex gap-4 text-[10px] font-black uppercase tracking-tighter">
                <div className="flex flex-col">
                  <span className="text-blue-600 dark:text-blue-400">{c.hubs}</span>
                  <span className="text-neutral-400">Hubs</span>
                </div>
                <div className="flex flex-col border-l border-neutral-100 dark:border-neutral-800 pl-4">
                  <span className="text-emerald-600 dark:text-emerald-400">{c.ils_total}</span>
                  <span className="text-neutral-400">ILS Freq</span>
                </div>
                <div className="flex flex-col border-l border-neutral-100 dark:border-neutral-800 pl-4">
                  <span className="text-neutral-900 dark:text-neutral-100">{c.total}</span>
                  <span className="text-neutral-400">Total</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/countries" className="inline-flex items-center gap-1 mt-8 text-sm font-bold text-blue-600 hover:underline transition-all">
          View all countries and specialized regions <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* SEO Footer Links */}
      <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-bold text-neutral-500 uppercase mb-4 flex items-center gap-2">
          <Info className="w-3 h-3" /> Verified ILS Hubs & Technical Comms
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          {GLOBAL_HUBS.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 underline underline-offset-4">
              {x.code} {x.label} ILS & Lighting
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}