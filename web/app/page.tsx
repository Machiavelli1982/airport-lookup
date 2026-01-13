import Link from "next/link";
import AirportSearch from "@/app/components/AirportSearch";

export const runtime = "nodejs";

const EXAMPLES = [
  { code: "LOWW", label: "Vienna (LOWW)" },
  { code: "LOWI", label: "Innsbruck (LOWI)" },
  { code: "LOWG", label: "Graz (LOWG)" },
  { code: "LOWK", label: "Klagenfurt (LOWK)" },
  { code: "EDDF", label: "Frankfurt (EDDF)" },
  { code: "LSZH", label: "Zürich (LSZH)" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Hero */}
      <section className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Airport Lookup
        </h1>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
          Reference-only airport information for flight simulation: runways (incl.
          lighting), frequencies, and navaids. Not for real-world navigation.
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
    </main>
  );
}
