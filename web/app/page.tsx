// web/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import AirportSearch from "@/app/components/AirportSearch";
import NearbyAirports from "@/app/components/NearbyAirports";
import { sql } from "@/lib/db"; // Für den dynamischen Länder-Abruf

export const runtime = "nodejs";

const SITE_URL = "https://www.airportlookup.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MSFS 2024 Airport Lookup — ILS, Runways & Navaids (PS5 / Xbox / PC)",
    template: "%s · Airport Lookup",
  },
  description:
    "Fast technical reference for Microsoft Flight Simulator 2024 (PS5, Xbox, PC). Global runway data, verified US ILS frequencies (FAA), and radio comms.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

// Verifizierte US-Hubs (FAA Daten) 
const US_ILS_HUBS = [
  { code: "KJFK", label: "New York (KJFK)" },
  { code: "KLAX", label: "Los Angeles (KLAX)" },
  { code: "KORD", label: "Chicago (KORD)" },
  { code: "KATL", label: "Atlanta (KATL)" },
  { code: "KSFO", label: "San Francisco (KSFO)" },
  { code: "KSEA", label: "Seattle (KSEA)" },
  { code: "KMIA", label: "Miami (KMIA)" },
  { code: "KDFW", label: "Dallas (KDFW)" },
];

export default async function Home() {
  // Wir holen uns die Top-Länder mit den meisten Flughäfen für die SEO-Sektion
  const topCountries = await sql`
    SELECT c.code, c.name, COUNT(a.id) as count
    FROM countries c
    JOIN airports a ON c.code = a.iso_country
    WHERE a.type IN ('large_airport', 'medium_airport')
    GROUP BY c.code, c.name
    ORDER BY count DESC
    LIMIT 24
  `;

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

      {/* Hero Section  */}
      <section className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
          MSFS 2024 Airport Lookup
        </h1>
        <p className="mt-3 text-lg text-neutral-700 dark:text-neutral-300">
          The essential <strong>flight simulator reference</strong> for pilots on <strong>PS5, Xbox, and PC</strong>. 
          Get instant access to technical runway data, lighting systems, and radio frequencies. 
          Verified <strong>ILS approach data</strong> for US airports. Optimized for <strong>MSFS 2024</strong>.
        </p>
      </section>

      {/* Search & Strategic Hubs Card  */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
        <AirportSearch />
        
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Airport Lookup is a specialized reference tool for the sim community. We provide 
          <strong> verified ILS frequencies</strong>, runway lighting badges, and essential ATC comms. 
          Search over 40,000 airports worldwide by ICAO or IATA code.
        </p>

        {/* Global Hubs (Verified US Data)  */}
        <div className="mt-8">
          <div className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Verified US ILS Hubs (FAA Data)
          </div>
          <div className="flex flex-wrap gap-2">
            {US_ILS_HUBS.map((x) => (
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

      {/* Dynamic Nearby Feature  */}
      <NearbyAirports />

      {/* SEO Text Block - Fokus auf PS5 & SimBrief  */}
      <section className="mt-16 border-l-4 border-blue-500 pl-6 py-2">
          <h2 className="text-2xl font-bold mb-4">Master your MSFS 2024 Flight Plan on PS5 & Xbox</h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
            Whether you are flying a complex approach into <strong>New York (KJFK)</strong> on your 
            <strong> PS5</strong> or exploring remote airfields on PC, our database provides the 
            critical instrument data you need. We bridge the gap for <strong>SimBrief</strong> and 
            <strong> VATSIM</strong> pilots by providing <strong>Localizer Courses</strong> and 
            <strong> runway lighting status</strong> at a glance. Perfect for console simmers who 
            need a fast technical reference on a second screen.
          </p>
      </section>

      {/* NEU: Browse by Country Section [cite: 21] */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">Browse Airports by Country</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {topCountries.map((c: any) => (
            <Link
              key={c.code}
              href={`/countries/${c.code}`}
              className="group flex flex-col p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-500 transition-all shadow-sm"
            >
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-500">{c.name}</span>
              <span className="text-xs text-neutral-500 mt-1">{numFmt(c.count)} Hubs</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature Value Props  */}
      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Runway & ILS</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Accurate lengths, surfaces, and <strong>verified ILS frequencies</strong> (FAA NASR) for US hubs.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Radio Frequencies</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Quickly find TWR, GND, delivery, and ATIS frequencies for global airports.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <h3 className="font-bold text-neutral-900 dark:text-white">Navaid DB</h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Full reference for VOR, NDB, and DME stations with precise coordinates and frequencies.
          </p>
        </div>
      </section>

      {/* Data Transparency & Disclaimer  */}
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-6">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
          Data Sources & Accuracy
        </h3>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          Airport metadata is sourced from <strong>OurAirports</strong> (Public Domain). 
          Instrument Approach Data (ILS) for the United States is provided by <strong>FAA NASR</strong> 
          (National Airspace System Resources) . 
          Reference only — not for real-world navigation.
        </p>
      </section>

      {/* SEO Internal Link Footer - Nur US-Links (Verified)  */}
      <section className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
        <div className="text-xs font-bold text-neutral-500 uppercase mb-4">Verified US Runway Lights & ILS Comms</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
          {US_ILS_HUBS.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="text-neutral-600 dark:text-neutral-400 hover:text-blue-600 underline underline-offset-4">
              {x.code} ILS Freq & Runway Lighting
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

// Helper für Tausendertrenner (Hydration-Safe) 
function numFmt(n: number | string | null | undefined): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}