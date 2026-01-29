import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, ChevronLeft, Target, Wind, PlaneTakeoff } from "lucide-react";

export default async function ApproachesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();
  const shortIdent = ident.startsWith('K') ? ident.substring(1) : ident;

  const [airport, charts, ilsSpecs] = await Promise.all([
    sql`SELECT name, ident FROM airports WHERE ident = ${ident} LIMIT 1`,
    sql`SELECT * FROM airport_approaches WHERE icao = ${ident} OR faa_ident = ${shortIdent}`,
    sql`SELECT * FROM runway_ils WHERE airport_ident = ${ident}`
  ]);

  if (!airport?.[0]) notFound();

  // Mapping: Wir verknüpfen ILS-Specs mit den passenden FAA-Charts
  const runwayGroups = ilsSpecs.map((spec: any) => ({
    id: spec.id,
    runway: spec.runway_ident,
    freq: spec.ils_freq,
    course: spec.ils_course,
    charts: charts.filter((c: any) => c.runway_designator === spec.runway_ident && c.procedure_type === 'IAP')
  }));

  const stars = charts.filter((c: any) => c.procedure_type === 'STAR');
  const departures = charts.filter((c: any) => c.procedure_type === 'DP' || c.procedure_type === 'ODP');

  return (
    <main style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto", color: "#f8fafc", fontFamily: "sans-serif" }}>
      <Link href={`/airports/${ident}`} style={{ color: "#64748b", textDecoration: "none", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px", marginBottom: "30px" }}>
        <ChevronLeft size={16} /> BACK TO OVERVIEW
      </Link>

      <h1 style={{ fontSize: "56px", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 10px 0" }}>{ident}</h1>
      <p style={{ fontSize: "20px", color: "#94a3b8", marginBottom: "50px" }}>Approach & Terminal Briefing for {airport[0].name}</p>

      {/* RUNWAY HUB SECTION */}
      <section style={{ marginBottom: "60px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 900, color: "#10b981", letterSpacing: "0.15em", marginBottom: "25px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Target size={18} /> PRECISION APPROACH HUB
        </h2>
        <div style={{ display: "grid", gap: "25px" }}>
          {runwayGroups.map((group: any) => (
            <div key={group.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "24px", padding: "30px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px", borderBottom: "1px solid #1e293b", paddingBottom: "20px" }}>
                <div><span style={{ fontSize: "10px", color: "#64748b", fontWeight: 900 }}>RWY</span><div style={{ fontSize: "32px", fontWeight: 900 }}>{group.runway}</div></div>
                <div style={{ textAlign: "center" }}><span style={{ fontSize: "10px", color: "#64748b", fontWeight: 900 }}>NAV FREQ</span><div style={{ fontSize: "32px", fontWeight: 900, color: "#10b981" }}>{group.freq}</div></div>
                <div style={{ textAlign: "right" }}><span style={{ fontSize: "10px", color: "#64748b", fontWeight: 900 }}>COURSE</span><div style={{ fontSize: "32px", fontWeight: 900 }}>{group.course}°</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                {group.charts.map((c: any) => (
                  <ChartCard key={c.id} name={c.procedure_name} url={c.chart_url} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "50px" }}>
        <CategoryList title="Arrivals (STAR)" data={stars} icon={<Wind size={18} />} color="#a855f7" />
        <CategoryList title="Departures (SID)" data={departures} icon={<PlaneTakeoff size={18} />} color="#f59e0b" />
      </div>
    </main>
  );
}

function ChartCard({ name, url }: { name: string, url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#1e293b", borderRadius: "15px", textDecoration: "none", color: "#e2e8f0", fontSize: "14px", fontWeight: 700, border: "1px solid #334155" }}>
      {name} <FileText size={16} style={{ opacity: 0.5 }} />
    </a>
  );
}

function CategoryList({ title, data, icon, color }: any) {
  if (data.length === 0) return null;
  return (
    <section>
      <h3 style={{ fontSize: "14px", fontWeight: 900, color: color, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", textTransform: "uppercase" }}>
        {icon} {title}
      </h3>
      <div style={{ display: "grid", gap: "10px" }}>
        {data.map((c: any) => <ChartCard key={c.id} name={c.procedure_name} url={c.chart_url} />)}
      </div>
    </section>
  );
}