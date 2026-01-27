// web/app/airports/[code]/departures/page.tsx
import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChevronLeft, PlaneTakeoff } from "lucide-react";
import Link from "next/link";
import Card from "@/app/components/Card";

export const runtime = "nodejs";

export default async function DeparturesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ident = code.toUpperCase();

  const airportRows = await sql`SELECT name, ident FROM airports WHERE ident = ${ident} LIMIT 1`;
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
        Scheduled Departure Board · {airport.name}
      </p>

      <div style={{ height: 24 }} />

      <Card title="Flight Schedule" subtitle="Planned departures for MSFS virtual airline planning.">
        <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px dashed var(--border)" }}>
          <PlaneTakeoff size={32} style={{ color: "var(--muted)", marginBottom: 12, opacity: 0.5 }} />
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            Compiling seasonal flight schedule...
          </p>
        </div>
      </Card>

      <footer style={{ marginTop: 40, padding: 20, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 11, color: "var(--muted)" }}>
        Data based on seasonal schedules for 2026. Verify with official airline resources for real-world travel.
      </footer>
    </main>
  );
}