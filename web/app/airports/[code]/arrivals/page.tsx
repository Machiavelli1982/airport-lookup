// web/app/airports/[code]/arrivals/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChevronLeft, PlaneLanding, MapPin, Wind } from "lucide-react";
import Link from "next/link";
import Card from "@/app/components/Card";

export default async function ArrivalsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  const airport = (await sql`SELECT * FROM airports WHERE ident = ${ident} LIMIT 1`)[0];
  if (!airport) notFound();

  // Wir holen nahegelegene Flughäfen als potenzielle "Origins"
  const origins = await sql`
    SELECT ident, name, municipality, dist 
    FROM (SELECT *, (2 * 6371 * asin(sqrt(power(sin(radians((${airport.latitude_deg} - latitude_deg) / 2)), 2) + cos(radians(latitude_deg)) * cos(radians(${airport.latitude_deg})) * power(sin(radians((${airport.longitude_deg} - longitude_deg) / 2)), 2)))) as dist FROM airports) a
    WHERE ident != ${ident} AND type IN ('large_airport', 'medium_airport')
    ORDER BY dist ASC LIMIT 8
  `;

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <Link href={`/airports/${ident}`} style={{ color: "var(--foreground)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600 }}>
        <ChevronLeft size={16} /> Back to {airport.name}
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "16px 0 4px" }}>{ident} Arrivals</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>Typical Arrival Patterns & IFR Procedures</p>

      <Card title="Typical Origin Airports" subtitle="Common regional flight connections for MSFS planning.">
        <div style={{ display: "grid", gap: 12 }}>
          {origins.map((o: any) => (
            <div key={o.ident} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{o.ident} — {o.municipality}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{o.name}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600 }}>
                {Math.round(o.dist * 0.54)} nm <br />
                <span style={{ color: "var(--muted)" }}>Est. ETE: {Math.round(o.dist / 7)} min</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section style={{ marginTop: 24, padding: 16, background: "rgba(59, 130, 246, 0.05)", borderRadius: 16, border: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Wind size={18} className="text-blue-400" /> STAR Briefing (Standard Arrival)
        </h3>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: "1.6" }}>
          For your approach into <strong>{airport.name}</strong>, expect vectoring based on current VATSIM or MSFS Live Traffic. 
          The elevation of <strong>{airport.elevation_ft} ft</strong> requires a stabilized approach. 
          Check the <Link href={`/airports/${ident}#runways`} style={{ color: "var(--foreground)", fontWeight: 700 }}>ILS Frequencies</Link> for the active runway.
        </p>
      </section>
    </main>
  );
}