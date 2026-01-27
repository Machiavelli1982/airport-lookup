// web/app/airports/[code]/arrivals/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Card from "@/app/components/Card";
import { ExternalLink, Map, Navigation, Anchor } from "lucide-react";

export default async function ArrivalsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  const [airport, ilsProcedures] = await Promise.all([
    sql`SELECT name, ident, iso_country FROM airports WHERE ident = ${ident} LIMIT 1`,
    sql`SELECT * FROM runway_ils WHERE airport_ident = ${ident} ORDER BY runway_ident ASC`
  ]);

  if (!airport?.[0]) notFound();

  // Dynamischer Chart-Link (Beispiel für FAA/USA)
  const isUS = airport[0].iso_country === 'US';
  const chartLink = isUS 
    ? `https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dtpp/search/results/?cycle=2501&ident=${ident}`
    : `https://skyvector.com/airport/${ident}`;

  return (
    <main style={{ padding: 18, maxWidth: 800, margin: "0 auto" }}>
      <h1 className="text-3xl font-black">{ident} Terminal Procedures</h1>
      <p className="text-slate-400 mb-6">Verified ILS Approaches & Arrival STARs for {airport[0].name}</p>

      <div className="grid gap-6">
        {ilsProcedures.map((proc: any) => (
          <Card key={proc.runway_ident} title={`ILS or LOC RWY ${proc.runway_ident}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Frequency</span>
                <span className="font-mono text-lg text-emerald-400">{Number(proc.ils_freq).toFixed(2)}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Ident</span>
                <span className="font-mono text-lg text-blue-400">{proc.ils_ident}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Course</span>
                <span className="font-mono text-lg">{proc.ils_course}°</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Glideslope</span>
                <span className="font-mono text-lg">3.00°</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <a href={chartLink} target="_blank" className="flex-1 flex items-center justify-center gap-2 p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 font-bold hover:bg-emerald-500/20 transition-all">
                <Map size={18} /> View Approach Plate
              </a>
              <button className="p-3 bg-white/5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
                <Navigation size={18} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* SEO-Textblock: Erklärt STARs und Transitions */}
      <section className="mt-8 p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-sm leading-relaxed text-slate-400">
        <h3 className="text-white font-bold mb-2">Arrival Briefing (STARs & Procedures)</h3>
        For <strong>{ident}</strong>, pilots should plan their descent via standard terminal arrival routes. 
        The primary instrument approaches are based on the <strong>{airport[0].name}</strong> ILS systems. 
        Pilots are advised to verify transition altitudes and localizer identifiers before intercepting the final approach course.
      </section>
    </main>
  );
}