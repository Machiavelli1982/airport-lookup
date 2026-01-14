import type { Metadata } from "next";
import Link from "next/link";
import AirportSearch from "@/app/components/AirportSearch";

export const runtime = "nodejs";

// IMPORTANT: set NEXT_PUBLIC_SITE_URL in Vercel (e.g. https://airportlookup.app)
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";

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
      "Search airports by ICAO/IATA and view runway lighting, frequencies (TWR/GND/ATIS/APP), and navaids. Reference only.",
    siteName: "Airport Lookup",
  },
  twitter: {
    card: "summary_large_image",
    title: "Airport Lookup for MSFS (Runways, Lights, Frequencies, Navaids)",
    description:
      "Search airports by ICAO/IATA and view runway lighting, frequencies, and navaids. Reference only.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const EXAMPLES = [
  { code: "LOWW", label: "Vienna (LOWW)" },
  { code: "LOWI", label: "Innsbruck (LOWI)" },
  { code: "LOWG", label: "Graz (LOWG)" },
  { code: "LOWK", label: "Klagenfurt (LOWK)" },
  { code: "EDDF", label: "Frankfurt (EDDF)" },
  { code: "LSZH", label: "Zürich (LSZH)" },
];

export default function Home() {
  // Structured data: tell Google this is a searchable site
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

      {/* Hero */}
      <section className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Airport Lookup
        </h1>

        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          Fast reference-only airport info for flight simulation (MSFS 2020 / MSFS 2024):
          runways (incl. lighting), frequencies, and navaids. Not for real-world navigation.
        </p>

        {/* Small, keyword-relevant helper line (doesn’t change UI much, but helps SEO) */}
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          Popular searches: runway lights, runway length, ATIS/TWR/GND frequencies, VOR/NDB/DME.
        </p>
      </section>

      {/* Search */}
      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
        <AirportSearch />

        {/* Examples */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
            Examples
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((x) => (
              <Link
                key={x.code}
                href={`/airports/${x.code}`}
                className="rounded-full border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Runways
          </div>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            Length, surface, headings, closed status, and a clear runway lighting badge.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Frequencies
          </div>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            TWR / GND / ATIS / APP etc. shown in MHz with consistent formatting.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Navaids
          </div>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            VOR / NDB / DME with frequency or channel and position (where available).
          </p>
        </div>
      </section>

      {/* Transparency */}
      <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-5">
        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Transparency
        </div>
        <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-300">
          ILS data is intentionally not displayed because it is incomplete or unreliable
          in the current open dataset. For ILS and operational procedures, always refer to
          official AIP charts.
        </p>
      </section>

      {/* Tiny internal link block (helps crawling; optional but recommended) */}
      <section className="mt-8 text-xs text-neutral-600 dark:text-neutral-400">
        <div className="font-medium text-neutral-700 dark:text-neutral-300">Quick links</div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
          {EXAMPLES.map((x) => (
            <Link key={x.code} href={`/airports/${x.code}`} className="underline underline-offset-2">
              {x.code} runway lights & frequencies
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
