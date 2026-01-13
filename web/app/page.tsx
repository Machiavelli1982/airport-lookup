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
        <h1 className="text-3xl font-semibold tracking-tight">
          Airport Lookup
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Reference-only airport information for flight simulation:
          runways (incl. lighting), frequencies, and navaids.
          Not for real-world navigation.
        </p>
      </section>

      {/* Search */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        {/* AirportSearch owns label + UX copy */}
        <AirportSearch />

        {/* Examples */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Examples
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((x) => (
              <Link
                key={x.code}
                href={`/airports/${x.code}`}
                className="rounded-full border bg-neutral-50 px-3 py-1.5 text-sm hover:bg-neutral-100"
              >
                {x.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold">Runways</div>
          <p className="mt-1 text-sm text-neutral-600">
            Length, surface, headings, closed status, and a clear runway lighting badge.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold">Frequencies</div>
          <p className="mt-1 text-sm text-neutral-600">
            TWR / GND / ATIS / APP etc. shown in MHz with consistent formatting.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold">Navaids</div>
          <p className="mt-1 text-sm text-neutral-600">
            VOR / NDB / DME with frequency or channel and position (where available).
          </p>
        </div>
      </section>

      {/* Transparency */}
      <section className="mt-8 rounded-2xl border bg-neutral-50 p-5">
        <div className="text-sm font-semibold">Transparency</div>
        <p className="mt-1 text-sm text-neutral-700">
          ILS data is intentionally not displayed because it is incomplete or unreliable
          in the current open dataset. For ILS and operational procedures, always refer to
          official AIP charts.
        </p>
      </section>
    </main>
  );
}
