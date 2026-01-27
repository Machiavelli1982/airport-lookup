// web/app/airports/[code]/approaches/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Card from "@/app/components/Card";
import { Navigation, Map, Info } from "lucide-react";
import Link from "next/link";

export default async function ApproachesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  // Wir holen den Airport und alle zugehörigen ILS-Daten
  const [airport, ilsData] = await Promise.all([
    sql`SELECT name, ident, elevation_ft FROM airports WHERE ident = ${ident} LIMIT 1`,
    sql`SELECT * FROM runway_ils WHERE airport_ident = ${ident} ORDER BY runway_ident ASC`
  ]);

  if (!airport?.[0]) notFound();

  return (
    <main style={{ padding: 18, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui" }}>
      <Link href={`/airports/${ident}`} style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
        ← Back to {ident} Overview
      </Link>

      <h1 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 4px" }}>{ident} Approaches</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>Instrument Approach Procedures (IAP) & Technical Briefing</p>

      {ilsData.length > 0 ? (
        <div style={{ display: "grid", gap: 16 }}>
          {ilsData.map((proc: any) => (
            <Card key={proc.runway_ident} title={`ILS or LOC RWY ${proc.runway_ident}`}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                <div style={{ padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, display: "block" }}>FREQUENCY</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>{Number(proc.ils_freq).toFixed(2)}</span>
                </div>
                <div style={{ padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, display: "block" }}>IDENT</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6", fontFamily: "monospace" }}>{proc.ils_ident}</span>
                </div>
                <div style={{ padding: 10, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 800, display: "block" }}>COURSE</span>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{proc.ils_course}°</span>
                </div>
              </div>
              
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <a href={`https://skyvector.com/airport/${ident}`} target="_blank" style={{ flex: 1, padding: "10px", textAlign: "center", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700, border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  View Charts
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card title="No ILS Data">
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>
            This airport primarily supports visual approaches (VFR).
          </p>
        </Card>
      )}
    </main>
  );
}