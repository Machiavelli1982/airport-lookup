// web/app/airports/[code]/approaches/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, ChevronLeft, Target, Wind, PlaneTakeoff, Navigation } from "lucide-react";

export default async function ApproachesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();
  const shortIdent = ident.startsWith('K') ? ident.substring(1) : ident;

  // Daten-Aggregation: Wir holen Airport, alle Charts und ILS-Specs
  const [airport, charts, ilsSpecs] = await Promise.all([
    sql`SELECT name, ident FROM airports WHERE ident = ${ident} LIMIT 1`,
    sql`SELECT * FROM airport_approaches WHERE icao = ${ident} OR faa_ident = ${shortIdent}`,
    sql`SELECT * FROM runway_ils WHERE airport_ident = ${ident}`
  ]);

  if (!airport?.[0]) notFound();

  // Logik: Wir gruppieren Charts nach Runway für den Deep-Überblick
  // Wir casten hier auf 'any', um die TypeScript-Fehler beim Property-Zugriff zu umgehen
  const runwayGroups = ilsSpecs.map((spec: any) => ({
    ...spec,
    matchingCharts: charts.filter((c: any) => c.runway_designator === spec.runway_ident && c.procedure_type === 'IAP')
  }));

  // Restliche Prozeduren (STARs, DPs und IAPs ohne Runway-Zuweisung)
  const stars = charts.filter((c: any) => c.procedure_type === 'STAR');
  const departures = charts.filter((c: any) => c.procedure_type === 'DP' || c.procedure_type === 'ODP');

  return (
    <main style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto", color: "#e2e8f0" }}>
      <Link href={`/airports/${ident}`} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94a3b8", textDecoration: "none", marginBottom: "32px", fontWeight: "bold" }}>
        <ChevronLeft size={16} /> BACK TO {ident}
      </Link>

      <header style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: "48px", fontWeight: "900", letterSpacing: "-0.05em", margin: 0 }}>APPROACH BRIEFING</h1>
        <p style={{ fontSize: "20px", color: "#94a3b8" }}>{airport[0].name} · Terminal Procedures</p>
      </header>

      {/* RUNWAY CARDS: DIE KOMBINIERTE ANSICHT */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "12px", fontWeight: "900", color: "#10b981", letterSpacing: "0.2em", marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Target size={16} /> PRECISION APPROACHES BY RUNWAY
        </h2>
        
        <div style={{ display: "grid", gap: "24px" }}>
          {runwayGroups.map((group: any) => (
            <div key={group.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "24px", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px", borderBottom: "1px solid #1e293b", paddingBottom: "20px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontWeight: "900", color: "#64748b" }}>RUNWAY</span>
                  <div style={{ fontSize: "32px", fontWeight: "900" }}>{group.runway_ident}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: "900", color: "#64748b" }}>ILS FREQ</span>
                  <div style={{ fontSize: "32px", fontWeight: "900", color: "#10b981" }}>{group.ils_freq}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "10px", fontWeight: "900", color: "#64748b" }}>COURSE</span>
                  <div style={{ fontSize: "32px", fontWeight: "900" }}>{group.ils_course}°</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
                {group.matchingCharts.map((chart: any) => (
                  <ChartLink key={chart.id} name={chart.procedure_name} url={chart.chart_url} color="#10b981" />
                ))}
                {group.matchingCharts.length === 0 && (
                  <p style={{ color: "#475569", fontSize: "13px", fontStyle: "italic" }}>No matching FAA charts found for this runway.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STARs & DPs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px" }}>
        <CategorySection title="Standard Arrivals (STAR)" icon={<Wind size={18} />} data={stars} color="#a855f7" />
        <CategorySection title="Departures (DP/SID)" icon={<PlaneTakeoff size={18} />} data={departures} color="#f59e0b" />
      </div>
      
      <footer style={{ marginTop: "80px", textAlign: "center", padding: "40px", borderTop: "1px solid #1e293b", color: "#475569", fontSize: "12px" }}>
        Official Aeronautical Data · FAA d-TPP Cycle 2601 · Januar 2026
      </footer>
    </main>
  );
}

// Hilfs-Komponenten für sauberen Code
function CategorySection({ title, icon, data, color }: any) {
  if (data.length === 0) return null;
  return (
    <section>
      <h3 style={{ fontSize: "12px", fontWeight: "900", color: color, letterSpacing: "0.1em", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
        {icon} {title.toUpperCase()}
      </h3>
      <div style={{ display: "grid", gap: "8px" }}>
        {data.map((item: any) => (
          <ChartLink key={item.id} name={item.procedure_name} url={item.chart_url} color={color} />
        ))}
      </div>
    </section>
  );
}

function ChartLink({ name, url, color }: { name: string, url: string, color: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ 
      display: "flex", justifyContent: "space-between", alignItems: "center", 
      padding: "14px 18px", background: "#1e293b66", border: "1px solid #1e293b", 
      borderRadius: "14px", textDecoration: "none", color: "#cbd5e1", fontSize: "13px", fontWeight: "bold" 
    }}>
      {name}
      <FileText size={16} style={{ color: color, opacity: 0.8 }} />
    </a>
  );
}