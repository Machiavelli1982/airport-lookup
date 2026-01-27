// web/app/airports/[code]/approaches/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, ChevronLeft, Target, Wind, PlaneTakeoff, Navigation } from "lucide-react";

export default async function ApproachesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();
  const shortIdent = ident.startsWith('K') ? ident.substring(1) : ident;

  const [airport, charts, ilsSpecs] = await Promise.all([
    sql`SELECT name, ident FROM airports WHERE ident = ${ident} LIMIT 1`,
    sql`SELECT * FROM airport_approaches WHERE airport_ident IN (${ident}, ${shortIdent})`,
    sql`SELECT * FROM runway_ils WHERE airport_ident = ${ident}`
  ]);

  if (!airport?.[0]) notFound();

  // Gruppierung der Prozeduren
  const categories = {
    approaches: charts.filter(c => c.procedure_type === 'IAP'),
    arrivals: charts.filter(c => c.procedure_type === 'STAR'),
    departures: charts.filter(c => c.procedure_type === 'DP' || c.procedure_type === 'ODP'),
    minimums: charts.filter(c => c.procedure_type === 'MIN' || c.procedure_type === 'HOT'),
  };

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      <Link href={`/airports/${ident}`} style={{ color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 24 }}>
        <ChevronLeft size={16} /> Back to Overview
      </Link>

      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, margin: 0, letterSpacing: "-0.03em" }}>{ident}</h1>
        <p style={{ color: "var(--muted)", fontSize: 20, fontWeight: 500 }}>Terminal Procedures & Charts</p>
      </div>

      {/* SEKTION 1: ILS SPECS (DEIN BESTEHENDER CONTENT) */}
      {ilsSpecs.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Target size={18} /> Precision Approach Specs
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {ilsSpecs.map(spec => (
              <div key={spec.id} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: 16, borderRadius: 16, display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>RWY {spec.runway_ident}</span>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{spec.ils_freq} <span style={{ fontSize: 12, color: "var(--muted)" }}>MHz</span></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)" }}>COURSE</span>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{spec.ils_course}°</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEKTION 2: DIGITALE CHARTS (AUS FAA IMPORT) */}
      <div style={{ display: "grid", gap: 40 }}>
        
        <ApproachGroup title="Instrument Approaches (IAP)" icon={<Navigation size={18} />} data={categories.approaches} color="#3b82f6" />
        
        <ApproachGroup title="Standard Arrivals (STAR)" icon={<Wind size={18} />} data={categories.arrivals} color="#a855f7" />
        
        <ApproachGroup title="Departures (DP/SID)" icon={<PlaneTakeoff size={18} />} data={categories.departures} color="#f59e0b" />

        <ApproachGroup title="Minimums & Info" icon={<FileText size={18} />} data={categories.minimums} color="var(--muted)" />

      </div>

      <footer style={{ marginTop: 60, padding: 24, borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
        Data source: FAA Digital Terminal Procedures (d-TPP) · Cycle 2601
      </footer>
    </main>
  );
}

// Hilfs-Komponente für die Gruppen
function ApproachGroup({ title, icon, data, color }: { title: string, icon: any, data: any[], color: string }) {
  if (data.length === 0) return null;
  return (
    <section>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        {icon} {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
        {data.map(chart => (
          <a 
            key={chart.id} 
            href={chart.chart_url} 
            target="_blank" 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "14px 18px", 
              background: "rgba(255,255,255,0.02)", 
              border: "1px solid var(--border)", 
              borderRadius: 14, 
              textDecoration: "none", 
              color: "inherit",
              transition: "transform 0.1s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = color}
            onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>{chart.procedure_name}</span>
            <FileText size={16} style={{ color: color, opacity: 0.7 }} />
          </a>
        ))}
      </div>
    </section>
  );
}