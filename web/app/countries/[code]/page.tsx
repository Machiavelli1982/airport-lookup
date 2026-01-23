// web/app/countries/[code]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import type { ReactNode } from "react";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://www.airportlookup.com";

/* ----------------------------- TYPES ----------------------------- */

interface Country {
  code: string;
  name: string;
}

interface AirportSummary {
  ident: string;
  iata_code: string | null;
  name: string;
  municipality: string | null;
  type: string;
}

/* ----------------------------- HELPERS ----------------------------- */

function norm(code: string | undefined | null) {
  return (code ?? "").trim().toUpperCase();
}

function numFmt(n: number | string | null | undefined): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* ----------------------------- SEO & METADATA ----------------------------- */

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = norm(rawCode);
  
  try {
    const rows = await sql<Country[]>`SELECT name FROM countries WHERE code = ${code} LIMIT 1`;
    const country = rows?.[0];
    
    if (!country) return { title: "Country Not Found" };

    const title = `Airports in ${country.name} — MSFS 2024 Technical Reference`;
    const description = `Complete list of airports in ${country.name}. Technical data including ILS frequencies, runway lighting, and ATC comms for MSFS 2024 and SimBrief.`;

    return {
      metadataBase: new URL(SITE_URL),
      title,
      description,
      alternates: { canonical: `/countries/${code}` },
    };
  } catch (e) {
    return { title: "Browse Airports" };
  }
}

/* ------------------------------ UI COMPONENTS ---------------------------- */

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      <h2 style={{ fontSize: 22, margin: 0, color: "var(--foreground)", fontWeight: 700 }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 500, fontSize: 14 }}>{subtitle}</p>}
      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

/* ------------------------------ MAIN PAGE ------------------------------- */

export default async function CountryPage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = norm(rawCode);
  if (!code) notFound();

  // Country Name & Top Airports parallel abrufen
  const [countryRows, airportRows] = await Promise.all([
    sql<Country[]>`SELECT * FROM countries WHERE code = ${code} LIMIT 1`,
    sql<AirportSummary[]>`
      SELECT ident, iata_code, name, municipality, type
      FROM airports
      WHERE iso_country = ${code}
        AND type IN ('large_airport', 'medium_airport', 'small_airport')
      ORDER BY 
        CASE type 
          WHEN 'large_airport' THEN 1 
          WHEN 'medium_airport' THEN 2 
          WHEN 'small_airport' THEN 3 
          ELSE 4 
        END ASC,
        name ASC
    `
  ]);

  const country = countryRows?.[0];
  if (!country) notFound();

  // Statistiken für SEO-Text
  const largeCount = airportRows.filter(a => a.type === 'large_airport').length;
  const mediumCount = airportRows.filter(a => a.type === 'medium_airport').length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Airports in ${country.name}`,
    "itemListElement": airportRows.slice(0, 20).map((a, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${SITE_URL}/airports/${a.ident}`,
      "name": `${a.ident} - ${a.name}`
    }))
  };

  return (
    <main style={{ padding: 18, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>← Back to Overview</Link>
      </div>

      <h1 style={{ fontSize: 44, margin: "8px 0 2px", fontWeight: 800 }}>Airports in {country.name}</h1>
      <p style={{ margin: "0 0 24px", fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>
        Browse {numFmt(airportRows.length)} airports in {country.name}. Get technical landing data for MSFS 2024.
      </p>

      {/* SEO Text Block */}
      <section style={{ marginBottom: 30, borderLeft: "4px solid #3b82f6", paddingLeft: 16 }}>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Complete database for flight simulator pilots flying in <strong>{country.name}</strong>. 
          This list includes <strong>{largeCount} major hubs</strong> and {mediumCount} regional airports. 
          Perfect for planning VATSIM routes or SimBrief flight plans on PS5, Xbox, and PC. 
          Select an airport below to view detailed <strong>ILS frequencies</strong>, runway lighting status, and ATC frequencies.
        </p>
      </section>

      <div style={{ display: "grid", gap: 14 }}>
        <Card title="Major Hubs & Regional Airports" subtitle={`ICAO / IATA reference for ${country.name}`}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {airportRows.map((a) => (
              <Link 
                key={a.ident} 
                href={`/airports/${a.ident}`}
                style={{ 
                  textDecoration: "none", 
                  color: "inherit",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "border-color 0.2s"
                }}
                className="hover-card"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 800, fontSize: 18 }}>{a.ident}</span>
                  {a.iata_code && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>{a.iata_code}</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{a.municipality || "—"}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
        Technical data for MSFS 2024 Console & PC. Sourced from OurAirports Public Domain data.
      </footer>
    </main>
  );
}