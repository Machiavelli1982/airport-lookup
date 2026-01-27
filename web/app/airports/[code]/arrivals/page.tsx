// web/app/airports/[code]/arrivals/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Card from "@/app/components/Card"; // Falls exportiert, sonst inline Card nutzen

export default async function ArrivalsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  const airport = (await sql`SELECT name, ident, municipality FROM airports WHERE ident = ${ident} LIMIT 1`)[0];
  if (!airport) notFound();

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
        {airport.ident} Live Arrivals
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 20 }}>
        Real-time flight tracking and arrival schedule for {airport.name}.
      </p>

      <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, textAlign: "center" }}>
        <h3 style={{ margin: 0 }}>Live Flight Board</h3>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Data synchronization for MSFS 2024 Live Traffic...
        </p>
        
        {/* Platzhalter für API-Integration oder Iframe-Logik */}
        <div style={{ height: 300, background: "rgba(0,0,0,0.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border)" }}>
           <span style={{ color: "var(--muted)" }}>Live Data Stream (API Connection Pending)</span>
        </div>
      </div>
      
      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Flight Simulator Integration</h2>
        <p style={{ fontSize: 14, lineHeight: "1.6", color: "var(--muted)" }}>
          Use these real-world arrivals to set up your AI traffic in <strong>Microsoft Flight Simulator</strong>. 
          Once you identified an incoming flight, check the <a href={`/airports/${ident}`} style={{ color: "var(--foreground)", fontWeight: 700 }}>{ident} ILS Frequencies</a> for your approach.
        </p>
      </section>
    </main>
  );
}