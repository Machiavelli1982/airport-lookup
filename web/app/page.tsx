// web/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import AirportSearch from "@/app/components/AirportSearch";
import NearbyAirports from "@/app/components/NearbyAirports";
import { Plane, Helicopter, Globe, ShieldCheck, Zap, Radio, Map } from "lucide-react";

export const runtime = "nodejs";

const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MSFS 2024 Global Airport Lookup — ILS, Runways & Navaids",
    template: "%s · Airport Lookup",
  },
  description:
    "Fast technical reference for Microsoft Flight Simulator 2024. Verified AIP 2026 ILS frequencies, runway lighting, and radio comms for 40,000+ airports worldwide.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Global MSFS Airport Lookup (Runways, Lights, ILS Frequencies)",
    description: "Search 40,000+ airports with verified 2026 AIP data for MSFS 2024.",
    siteName: "Airport Lookup",
  },
  twitter: {
    card: "summary_large_image",
    title: "MSFS Global Airport Lookup",
    description: "Verified 2026 ILS frequencies and runway data for flight simulation.",
  },
  robots: { index: true, follow: true },
};

// Globale Hubs mit Typ-Logik für Icons
const EXAMPLES = [
  { code: "KJFK", label: "New York", type: "large_airport" },
  { code: "EDDF", label: "Frankfurt", type: "large_airport" },
  { code: "EGLL", label: "London", type: "large_airport" },
  { code: "OMDB", label: "Dubai", type: "large_airport" },
  { code: "RJTT", label: "Tokyo", type: "large_airport" },
  { code: "FACT", label: "Cape Town", type: "large_airport" },
  { code: "YSSY", label: "Sydney", type: "large_airport" },
  { code: "SBGR", label: "São Paulo", type: "large_airport" },
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
            Verified AIP 2026 Global Data
          </span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Global MSFS Airport Lookup
        </h1>
        <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300">
          The essential <strong>flight simulator reference</strong> for pilots. Get instant access to 
          runway data, lighting systems, and verified <strong>ILS frequencies</strong> for over 40,000 airports worldwide. 
          Optimized for <strong>MSFS 2024</strong>.
        </p>
      </section>

      {/* Search & Examples Card */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <AirportSearch />
        
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Airport Lookup is a specialized MSFS reference tool. We provide <strong>AIP 2026 verified 
          ILS data</strong>, runway lighting badges, and essential comms (TWR/GND/APP). 
          Search by ICAO or IATA to access canonical data for every continent.
        </p>

        {/* Global Examples */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <Globe className="w-3 h-3" /> Worldwide Hubs & Popular Searches
          </div>
          <div className="flex flex-wrap gap-2">
            {/* IP-basierter Vorschlag */}
            <Link
              href={`/airports/${localHub.code}`}
              className="flex items-center gap-2 rounded-xl border-2 border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all"
            >
              <ShieldCheck className="w-4 h-4" /> 
              Your Region: {localHub.label} ({localHub.code})
            </Link>

            {EXAMPLES.map((x) => (
              <Link
                key={x.code}
                href={`/airports/${x.code}`}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all"
              >
                {getIcon(x.type)}
                {x.label} ({x.code})
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Nearby Feature */}
      <NearbyAirports />

      {/* SEO Text Block */}
      <section className="mt-16 border-l-4 border-emerald-500 pl-6 py-2">
          <h2 className="text-2xl font-bold mb-4">Precision for your MSFS Flight Plan</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
            Whether you are flying a heavy jet into <strong>Frankfurt (EDDF)</strong> or a small bush plane 
            into a remote airstrip, our database provides critical info for a successful landing. 
            We now offer <strong>global coverage</strong> including verified 2026 ILS frequencies, 
            approach lighting (PAPI/VASI), and Navaids (VOR/NDB) for the virtual skies. 
            Perfect for <strong>Xbox and PS5 simmers</strong> needing fast data on a second screen.
          </p>
      </section>

      {/* Feature Value Props */}
      <section className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <Zap className="w-6 h-6 text-emerald-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Runway & ILS</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Accurate lengths, surface types, and verified 2026 ILS/Localizer data for MSFS 2024.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <Radio className="w-6 h-6 text-blue-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Global Comms</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Quick access to TWR, GND, and ATIS frequencies for over 40,000 airports worldwide.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <Map className="w-6 h-6 text-amber-500 mb-3" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Verified Navaids</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Worldwide VOR, NDB, and DME stations with coordinates and frequency data.
          </p>
        </div>
      </section>

      {/* Transparency & Disclaimer */}
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-6">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
          Data Sources & Accuracy
        </h3>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          Airport metadata is sourced from <strong>OurAirports</strong>. Global ILS frequencies 
          are verified using <strong>AIP 2026</strong> datasets. 
          Reference only — not for real-world navigation.
        </p>
      </section>

      {/* Footer Links */}
      <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-bold text-neutral-500 uppercase mb-4">Global Hub Quick Links (Verified ILS)</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          {EXAMPLES.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 underline underline-offset-4">
              {x.code} {x.label} ILS & Comms
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}