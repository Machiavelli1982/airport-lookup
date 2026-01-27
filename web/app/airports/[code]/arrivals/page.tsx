// web/app/airports/[code]/arrivals/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChevronLeft, PlaneLanding, Info } from "lucide-react";
import Link from "next/link";
import Card from "@/app/components/Card";

export const runtime = "nodejs";

export default async function ArrivalsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  const airportRows = await sql`SELECT name, ident, municipality, type FROM airports WHERE ident = ${ident} LIMIT 1`;
  const airport = airportRows?.[0];

  if (!airport) notFound();

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/airports/${ident}`} style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={16} /> Back to {ident} Overview
        </Link>
      </div>

      <h1 style={{ fontSize: 36, margin: "8px 0 2px", fontWeight: 800 }}>{ident} Arrivals</h1>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>
        Arrival Guide & Flight Patterns · {airport.name}
      </p>

      <div style={{ height: 24 }} />

      {/* SEO-TEXT: Wichtig für das Google Ranking */}
      <section style={{ marginBottom: 20, padding: 16, background: "rgba(34,197,94,0.03)", borderRadius: 14, border: "1px solid var(--border)", fontSize: 14, lineHeight: "1.6", color: "var(--muted)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, color: "var(--foreground)" }}>
          <Info size={18} /> <strong style={{ fontWeight: 700 }}>MSFS 2024 Arrival Briefing</strong>
        </div>
        Welcome to the arrival board for <strong>{airport.name}</strong>. For pilots using Microsoft Flight Simulator, 
        understanding the flow of traffic is key for a realistic approach. This page provides the technical basis 
        for planning your descent into {airport.municipality || ident}.
      </section>

      <Card title="Traffic Information" subtitle="Flight patterns for virtual airline planning.">
        <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px dashed var(--border)" }}>
          <PlaneLanding size={32} style={{ color: "var(--muted)", marginBottom: 12, opacity: 0.5 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Standard Arrival Routes (STAR)</h3>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Typical arrival traffic for {airport.type === 'large_airport' ? 'commercial hub' : 'regional airfield'} operations.
          </p>
          <div style={{ marginTop: 20 }}>
             <Link href={`/airports/${ident}`} style={{ color: "var(--foreground)", fontWeight: 700, textDecoration: "underline" }}>
                Check {ident} ILS Frequencies for Landing →
             </Link>
          </div>
        </div>
      </Card>

      <footer style={{ marginTop: 40, padding: 20, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
        Data for flight simulation purposes. Not for real-world aviation use.
      </footer>
    </main>
  );
}