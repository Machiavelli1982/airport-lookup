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
    default: "MSFS 2024 Airport Lookup — ILS, Runways & Navaids (PS5 / Xbox / PC)",
    template: "%s · Airport Lookup",
  },
  description: "Fast technical reference for MSFS 2024 on PS5, Xbox, and PC. Global database for ILS frequencies, runway lighting, and Navaids.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

// Verifizierte ILS-Hubs aus import-all-ils.mjs
const ILS_HUBS = [
  { code: "EDDF", label: "Frankfurt (EDDF)" },
  { code: "EDDM", label: "München (EDDM)" },
  { code: "EGLL", label: "London (EGLL)" },
  { code: "EHAM", label: "Amsterdam (EHAM)" },
  { code: "KJFK", label: "New York (KJFK)" },
  { code: "KLAX", label: "Los Angeles (KLAX)" },
  { code: "OMDB", label: "Dubai (OMDB)" },
  { code: "LOWW", label: "Wien (LOWW)" },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          Global MSFS 2024 Airport Database
        </h1>
        <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300">
          The essential <strong>flight simulator reference</strong> for <strong>PS5, Xbox</strong>, and PC. 
          Get instant access to <strong>ILS frequencies</strong>, runway lighting, and Navaids for over 40,000 airports. 
          Perfect for <strong>SimBrief</strong> planning and high-fidelity aircraft like PMDG and Fenix.
        </p>
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <AirportSearch />
        
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Airport Lookup provides <strong>verified ILS approach data</strong> for MSFS 2024. 
          Search by ICAO for <strong>Localizer Courses</strong> and ATC frequencies (TWR/GND/ATIS).
        </p>

        <div className="mt-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">Verified ILS Hubs</div>
          <div className="flex flex-wrap gap-2">
            {ILS_HUBS.map((x) => (
              <Link key={x.code} href={`/airports/${x.code}`} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-all">
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <NearbyAirports />

      <section className="mt-16 border-l-4 border-blue-500 pl-6 py-2">
          <h2 className="text-2xl font-bold mb-4">Optimized for SimBrief & Console Pilots</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
            Flying <strong>MSFS 2024 on PS5 or Xbox</strong>? Get critical landing data on your second screen. 
            We provide <strong>runway lighting status</strong>, ILS identifiers, and Navaids (VOR/NDB) 
            to help you navigate the virtual skies without opening complex charts.
          </p>
      </section>

      {/* Internal Links Footer mit echtem ILS-Fokus */}
      <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-bold text-neutral-500 uppercase mb-4">Verified ILS Frequencies & Lighting</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          {ILS_HUBS.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 underline underline-offset-4">
              {x.code} ILS Freq & Lighting
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}