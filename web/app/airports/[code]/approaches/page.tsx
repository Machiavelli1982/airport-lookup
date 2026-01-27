// web/app/airports/[code]/approaches/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, ShieldCheck, ChevronLeft, Map } from "lucide-react";

export default async function ApproachesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();
  
  // US-Spezialfall: JFK (3-stellig) vs KJFK (4-stellig)
  const shortIdent = ident.startsWith('K') && ident.length === 4 ? ident.substring(1) : ident;

  const [airport, faaCharts] = await Promise.all([
    sql`SELECT name, ident FROM airports WHERE ident = ${ident} LIMIT 1`,
    // Wir suchen nach beiden Varianten und nutzen ILIKE für Case-Insensitivity
    sql`SELECT * FROM airport_approaches 
        WHERE TRIM(airport_ident) ILIKE ${ident} 
        OR TRIM(airport_ident) ILIKE ${shortIdent} 
        ORDER BY procedure_name ASC`
  ]);

  if (!airport?.[0]) notFound();

  return (
    <main style={{ padding: 18, maxWidth: 850, margin: "0 auto", fontFamily: "system-ui" }}>
      <Link href={`/airports/${ident}`} style={{ color: "var(--muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 700, marginBottom: 20 }}>
        <ChevronLeft size={16} /> Back to Overview
      </Link>

      <h1 style={{ fontSize: 42, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{ident} Approaches</h1>
      <p style={{ color: "var(--muted)", fontSize: 18, marginBottom: 30 }}>Technical Terminal Procedures for {airport[0].name}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(16, 185, 129, 0.05)", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.2)", marginBottom: 30 }}>
        <ShieldCheck className="text-emerald-500" size={20} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>AIRAC CYCLE 2601 VERIFIED DATA</span>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {faaCharts.length > 0 ? (
          faaCharts.map((app: any) => (
            <div key={app.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{app.procedure_name}</h3>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>{app.procedure_type || 'IAP'}</span>
              </div>
              <a href={app.chart_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--foreground)", color: "var(--background)", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
                <FileText size={16} /> PDF Chart
              </a>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.02)", borderRadius: 20, border: "1px dashed var(--border)" }}>
            <Map size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ color: "var(--muted)" }}>No digital procedures found in DB for {ident} or {shortIdent}.</p>
          </div>
        )}
      </div>
    </main>
  );
}