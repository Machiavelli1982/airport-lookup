// web/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import AirportSearch from "@/app/components/AirportSearch";
import NearbyAirports from "@/app/components/NearbyAirports";

export const runtime = "nodejs";

const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MSFS Airport Lookup — ILS Frequencies, Runways & Navaids",
    template: "%s · Airport Lookup",
  },
  description:
    "The fastest technical reference for MSFS 2020/2024. Global database for ILS frequencies, runway lighting, ATIS/TWR comms, and Navaids for flight planning.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "MSFS Airport Lookup — ILS Frequencies & Technical Runway Data",
    description:
      "Global airport database for flight simulator pilots. Verified ILS approaches, runway lighting badges, and radio frequencies.",
    siteName: "Airport Lookup",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const EXAMPLES = [
  { code: "KJFK", label: "New York (KJFK)" },
  { code: "EGLL", label: "London (EGLL)" },
  { code: "EDDF", label: "Frankfurt (EDDF)" },
  { code: "EHAM", label: "Amsterdam (EHAM)" },
  { code: "KLAX", label: "Los Angeles (KLAX)" },
  { code: "LSZH", label: "Zürich (LSZH)" },
  { code: "LOWW", label: "Vienna (LOWW)" },
  { code: "OMDB", label: "Dubai (OMDB)" },
];

export default function Home() {
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

      {/* Hero Section - SEO Fokus: Sim-Relevanz */}
      <section className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Global MSFS Airport Database
        </h1>
        <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300">
          The essential <strong>flight simulator reference</strong>. Get instant access to 
          <strong> ILS frequencies</strong>, runway lighting, and Navaids for over 40,000 airports. 
          Built for <strong>MSFS 2020, MSFS 2024</strong>, and advanced aircraft like PMDG and Fenix.
        </p>
      </section>

      {/* Search Section */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <AirportSearch />
        
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Search by ICAO or IATA. We provide <strong>verified ILS approach data</strong>, 
          runway headings (mag/true), and technical communication frequencies (TWR, GND, DEP, APP).
        </p>

        {/* Global Hubs */}
        <div className="mt-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Strategic Virtual Hubs
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

      <NearbyAirports />

      {/* SEO Content Section - Maximierung der Relevanz */}
      <section className="mt-16 border-l-4 border-blue-500 pl-6 py-2">
          <h2 className="text-2xl font-bold mb-4">Optimized for SimBrief & VATSIM Pilots</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
            Planning a flight in <strong>SimBrief</strong> or flying online with <strong>VATSIM/IVAO</strong>? 
            Airport Lookup provides the technical "last mile" data. While charts are essential, our tool gives 
            you the <strong>ILS ident</strong>, localizer course, and <strong>runway lighting status</strong> (PAPI, VASI, REIL) 
            at a glance. Perfect for <strong>Xbox simmers</strong> and VR pilots who need a fast second-screen reference 
            for technical landing data.
          </p>
      </section>

      {/* Value Props */}
      <section className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Verified ILS Data</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Real-world localizer frequencies and courses for instrument landings in zero visibility.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Runway Lighting</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Detailed lighting info (Centerline, Touchdown, Edge) to identify runways at night.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Navaids & Comms</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Complete frequency list for VOR, NDB, and ATC (ATIS, Delivery, Ground, Tower).
          </p>
        </div>
      </section>

      {/* Transparency - Korrigiert auf "Inklusive ILS" */}
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-6">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
          Data Integrity
        </h3>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          Our technical database combines <strong>OurAirports</strong> public data with 
          <strong> FAA NASR</strong> instrument approach records. Updated for the latest MSFS 
          navigation cycles. Reference only — not for real-world aviation.
        </p>
      </section>

      {/* Internal Links Footer */}
      <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-bold text-neutral-500 uppercase mb-4">Technical Runway & ILS References</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          {EXAMPLES.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 underline underline-offset-4">
              {x.code} ILS Frequencies & Lighting
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}