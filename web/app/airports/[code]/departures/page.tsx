// web/app/airports/[code]/departures/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChevronLeft, Plane } from "lucide-react";
import Link from "next/link";
import Card from "@/app/components/Card";

export const runtime = "nodejs";

export default async function DeparturesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  const airportRows = await sql`SELECT name, ident, municipality FROM airports WHERE ident = ${ident} LIMIT 1`;
  const airport = airportRows?.[0];

  if (!airport) notFound();

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/airports/${ident}`} style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={16} /> Back to {ident} Overview
        </Link>
      </div>

      <h1 style={{ fontSize: 36, margin: "8px 0 2px", fontWeight: 800 }}>{ident} Departures</h1>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>
        Live Departure Board · {airport.name}
      </p>

      <div style={{ height: 24 }} />

      <Card title="Scheduled Departures" subtitle="Real-time flight data for MSFS pilots.">
        <div style={{ 
          padding: "40px 20px", 
          textAlign: "center", 
          background: "rgba(255,255,255,0.02)", 
          borderRadius: 14, 
          border: "1px dashed var(--border)" 
        }}>
          <Plane size={32} style={{ color: "var(--muted)", marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Connecting to live flight stream...
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", opacity: 0.7, marginTop: 4 }}>
            Verification of 2026 scheduling data in progress.
          </p>
        </div>
      </Card>

      <section style={{ marginTop: 30, padding: 16, background: "rgba(59, 130, 246, 0.03)", borderRadius: 14, border: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>MSFS 2024 Tip</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: "1.5", margin: 0 }}>
          Check the departure runway here to pre-plan your taxi route. Match the real-world departure time with your simulator settings for maximum immersion.
        </p>
      </section>
    </main>
  );
}