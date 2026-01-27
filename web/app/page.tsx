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
  Info
} from "lucide-react";

export const runtime = "nodejs";

const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Global MSFS 2024 Airport Lookup — Verified ILS, Runways & Navaids",
    template: "%s · Airport Lookup",
  },
  description:
    "Fast technical reference for Microsoft Flight Simulator 2024. Verified FAA (USA) and researched AIP 2026 (Global) ILS frequencies, runway lighting, and radio comms.",
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

// Globale Hubs mit verifizierten ILS-Daten
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

export default async function Home() {
  const headerList = await headers();
  const countryCode = headerList.get("x-vercel-ip-country") || "US";
  const localHub = COUNTRY_HUB_MAP[countryCode] || COUNTRY_HUB_MAP["US"];

  // Detaillierte Länder-Statistiken inklusive ILS-Anzahl
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
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-md border border-emerald-500/20 uppercase tracking-widest">
            FAA (US) & Researched AIP 2026 (Global)
          </span>
        </div>
        
        {/* DER WICHTIGE GRAUE DISCLAIMER BADGE */}
        <p className="inline-block px-3 py-1.5 mb-6 text-[11px] font-bold tracking-widest uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm">
          Reference only — not for real-world navigation.
        </p>

        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Global MSFS Airport Lookup
        </h1>
        <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed">
          The essential <strong>flight simulator reference</strong> for pilots. Get instant access to 
          runway data, lighting systems, and verified <strong>ILS frequencies</strong> (FAA for USA, researched AIP for Global) 
          for over 40,000 airports. Optimized for <strong>MSFS 2024</strong>.
        </p>
      </section>

      {/* Search & Hubs Card */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm mb-10">
        <AirportSearch />
        
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Airport Lookup provides dual-source precision: Official <strong>FAA NASR</strong> for the United States 
          and researched <strong>AIP 2026</strong> datasets for international hubs. 
          Instant access to runway lighting badges, approach frequencies, and Nav-Aids.
        </p>

        {/* Global Examples with Icons & ILS Badges */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
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

      {/* Feature Value Props & SEO Block */}
      <section className="mt-16 grid gap-6 md:grid-cols-3 mb-12">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <Zap className="w-6 h-6 text-emerald-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Runway & ILS</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Get accurate lengths, surfaces, and <strong>verified 2026 ILS frequencies</strong> for landings in MSFS 2024.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <Radio className="w-6 h-6 text-blue-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Global Comms</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Quickly find TWR, GND, and ATIS frequencies for over 40,000 airports worldwide.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <Map className="w-6 h-6 text-amber-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Navaids</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Full coverage of VOR, NDB, and DME stations with verified frequencies and coordinates.
          </p>
        </div>
      </section>

      <section className="mb-16 border-l-4 border-emerald-500 pl-6 py-2">
          <h2 className="text-2xl font-bold mb-4">Precision Landing Data for MSFS</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
            From major global hubs like <strong>London Heathrow (EGLL)</strong> to small remote strips, our database provides 
            the critical landing info required for a successful flight. We offer <strong>global coverage</strong> including 
            verified 2026 ILS frequencies, lighting systems, and Navaids (VOR/NDB) for every virtual sky. 
          </p>
      </section>

      {/* Browse Airports by Country */}
      <section className="mt-16">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-neutral-900 dark:text-white">
          <Map className="w-5 h-5 text-blue-500" /> Browse Airports by Country
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

      {/* Data Source Transparency & Disclaimer */}
      <section className="mt-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-neutral-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
            Data Sources & Verification
          </h3>
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
          Our landing data is compiled from <strong>FAA NASR</strong> (USA) and researched 
          <strong> AIP 2026</strong> international datasets (Global). 
          Metadata provided via OurAirports. <strong>Reference only — not for real-world navigation.</strong>
        </p>
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