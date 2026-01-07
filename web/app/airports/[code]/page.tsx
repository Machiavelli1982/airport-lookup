import Link from "next/link";

export default async function AirportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const airportCode = (code || "").toUpperCase();

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6">
          <Link href="/" className="text-sm text-neutral-700 underline">
            ← Back
          </Link>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {airportCode}
          </h1>

          <p className="mt-2 text-sm text-neutral-600">
            Reference only — not for real-world navigation.
          </p>
        </header>

        <div className="space-y-3">
          {[
            { title: "Airport Info", text: "Name, country, coordinates, elevation." },
            { title: "Runways", text: "Runway list (length, surface, heading)." },
            { title: "Frequencies", text: "TWR, GND, ATIS, APP, etc." },
            { title: "Navaids", text: "VOR/NDB/DME/ILS (where available)." },
            { title: "Charts", text: "External links only (no hosting, no embedding)." },
          ].map((card) => (
            <section
              key={card.title}
              className="rounded-2xl border border-neutral-200 p-4 shadow-sm"
            >
              <h2 className="text-base font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{card.text}</p>
            </section>
          ))}
        </div>

        <footer className="mt-8 text-xs text-neutral-600">
          Data: OurAirports (Public Domain). No guarantee of accuracy.
        </footer>
      </div>
    </main>
  );
}
