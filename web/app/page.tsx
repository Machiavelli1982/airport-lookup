import type { Metadata } from "next";
import Link from "next/link";
import AirportSearch from "@/app/components/AirportSearch";
import NearbyAirports from "@/app/components/NearbyAirports";

export const runtime = "nodejs";

// Base URL für Canonical und OpenGraph
const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Airport Lookup for MSFS (Runways, Lights, Frequencies, Navaids)",
    template: "%s · Airport Lookup",
  },
  description:
    "Fast airport reference for Microsoft Flight Simulator (MSFS 2020/2024): runway data incl. lighting, tower/ground/ATIS frequencies, and navaids. Reference only — not for real-world navigation.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Airport Lookup for MSFS (Runways, Lights, Frequencies, Navaids)",
    description:
      "Search airports by ICAO/IATA and view runway lighting, frequencies (TWR/GND/ATIS/APP), and navaids for MSFS 2020 & 2024.",
    siteName: "Airport Lookup",
  },
  twitter: {
    card: "summary_large_image",
    title: "Airport Lookup for MSFS (Runways, Lights, Frequencies, Navaids)",
    description: "Fast reference for MSFS runway lighting, frequencies, and navaids.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Internationale Beispiele für globalen SEO-Flow
const EXAMPLES = [
  { code: "KJFK", label: "New York (KJFK)" },
  { code: "EGLL", label: "London (EGLL)" },
  { code: "EDDF", label: "Frankfurt (EDDF)" },
  { code: "OMDB", label: "Dubai (OMDB)" },
  { code: "RJTT", label: "Tokyo (RJTT)" },
  { code: "LOWW", label: "Vienna (LOWW)" },
];

export default function Home() {
  // Structured data: Google Sitelinks Searchbox
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Airport Lookup
        </h1>
        <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300">
          Fast reference-only airport info for <strong>Microsoft Flight Simulator (MSFS 2020 / 2024)</strong>. 
          Runway lighting, frequencies, and navaids. Not for real-world navigation.
        </p>

        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Search over 5,000 airports: runway lights, lengths, ATIS/TWR/GND frequencies, VOR/NDB/DME.
        </p>
      </section>

      {/* Search & Examples Card */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <AirportSearch />
        
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Airport Lookup is a specialized MSFS reference tool. We provide instant access to 
          <strong> runway lighting badges</strong>, runway headings, and essential comms (TWR/GND/APP). 
          Search by ICAO or IATA to access canonical data pages for large, medium, and small airports.
        </p>

        {/* Global Examples */}
        <div className="mt-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Global Hubs
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((x) => (
              <Link
                key={x.code}
                href={`/airports/${x.code}`}
                className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all"
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Nearby Feature (UX & Engagement) */}
      <NearbyAirports />

      {/* Feature Value Props */}
      <section className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Runway Data</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Get accurate lengths, surfaces, and lighting status for safe landings in MSFS 2024.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Radio Comms</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Quickly find TWR, GND, and ATIS frequencies without digging through complex charts.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Navaids</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Full coverage of VOR, NDB, and DME stations with frequencies and coordinates.
          </p>
        </div>
      </section>

      {/* Transparency & Disclaimer */}
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-6">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
          Data & Accuracy
        </h3>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          ILS data is excluded to maintain reliability. For official flight procedures and real-world 
          navigation, always use current AIP charts.
        </p>
      </section>

      {/* SEO Internal Link Footer */}
      <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-bold text-neutral-500 uppercase mb-4">Quick Airport Links</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          {EXAMPLES.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 underline underline-offset-4">
              {x.code} Frequencies & Runways
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}