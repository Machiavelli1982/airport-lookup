// web/app/airports/[code]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import type { ReactNode } from "react";
import { 
  Plane, 
  Helicopter, 
  ShieldCheck, 
  Globe, 
  MapPin, 
  Database, 
  ChevronLeft,
  Activity
} from "lucide-react";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://www.airportlookup.com";

/* ----------------------------- TYPES & INTERFACES ----------------------------- */

interface Airport {
  id: number;
  ident: string;
  iata_code: string | null;
  name: string;
  type: string;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number | null;
  iso_country: string;
  iso_region: string;
  municipality: string | null;
  wikipedia_link: string | null;
  home_link: string | null;
  keywords: string | null;
}

interface Runway {
  id: number;
  le_ident: string;
  he_ident: string;
  length_ft: number | null;
  width_ft: number | null;
  surface: string | null;
  lighted: boolean | number | string;
  le_heading_degt: number | null;
  he_heading_degt: number | null;
}

interface Frequency {
  id: number;
  type: string;
  description: string | null;
  frequency_mhz: number | null;
}

/* ----------------------------- HELPERS ----------------------------- */

function norm(code: string | undefined | null) {
  return (code ?? "").trim().toUpperCase();
}

function numFmt(n: number | string | null | undefined): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString();
}

function fmtFt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? `${Math.round(x).toLocaleString()} ft` : "—";
}

function fmtMFromFt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? `${Math.round(x * 0.3048).toLocaleString()} m` : "—";
}

function fmtFreqMHz(mhz: any) {
  const x = Number(mhz);
  return Number.isFinite(x) ? `${x.toFixed(2)} MHz` : "—";
}

function surfaceLabel(surface: any) {
  const s = String(surface ?? "").trim().toUpperCase();
  if (!s) return "—";
  const map: Record<string, string> = {
    ASP: "Asphalt", CON: "Concrete", BIT: "Bitumen", GRE: "Grass", GRS: "Grass",
    TURF: "Turf", GRV: "Gravel", DRT: "Dirt", SND: "Sand", WTR: "Water",
    ICE: "Ice", SNW: "Snow", UNK: "Unknown",
  };
  return map[s] ?? surface;
}

const getIcon = (type: string) => {
  switch (type) {
    case "large_airport": return <Plane size={16} className="text-blue-600 shrink-0" />;
    case "medium_airport": return <Plane size={14} className="text-emerald-600 shrink-0" />;
    case "heliport": return <Helicopter size={14} className="text-purple-600 shrink-0" />;
    default: return <Plane size={14} className="text-neutral-400 shrink-0" />;
  }
};

async function lookupCountryName(isoCountry: string) {
  const code = norm(isoCountry);
  if (!code) return null;
  const rows = await sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`;
  return rows?.[0]?.name ? String(rows[0].name) : null;
}

/* ----------------------------- SEO ----------------------------- */

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = norm(rawCode);
  const rows = await sql`SELECT ident, iata_code, name FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`;
  const a = rows?.[0];
  if (!a) return { title: "Airport Not Found" };

  const codes = `${a.ident}${a.iata_code ? ` / ${a.iata_code}` : ""}`;
  return {
    title: `${codes} — ${a.name} (Runways, ILS, Frequencies)`,
    description: `Technical MSFS data for ${a.name} (${a.ident}). Runway lighting, verified 2026 ILS frequencies, and radio comms.`,
    alternates: { canonical: `/airports/${a.ident}` },
  };
}

/* ------------------------------ UI COMPONENTS ---------------------------- */

function Badge({ text, tone = "muted" }: { text: string; tone?: "ok" | "muted" | "warn" }) {
  const colors = {
    ok: { bg: "rgba(34,197,94,0.14)", fg: "rgba(34,197,94,1)" },
    warn: { bg: "rgba(245,158,11,0.16)", fg: "rgba(245,158,11,1)" },
    muted: { bg: "rgba(255,255,255,0.08)", fg: "rgba(255,255,255,0.5)" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 800, background: colors[tone].bg, color: colors[tone].fg,
      border: "1px solid rgba(255,255,255,0.1)", letterSpacing: 0.5, textTransform: "uppercase"
    }}>
      {text}
    </span>
  );
}

function Card({ title, subtitle, children, icon: Icon }: { title: string; subtitle?: string; children?: ReactNode; icon?: any }) {
  return (
    <section style={{ 
      background: "var(--card)", 
      border: "1px solid var(--border)", 
      borderRadius: 24, 
      padding: 24, 
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)" 
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: subtitle ? 4 : 16 }}>
        {Icon && <Icon size={20} className="text-blue-500" />}
        <h2 style={{ fontSize: 20, margin: 0, color: "var(--foreground)", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
      </div>
      {subtitle && <p style={{ margin: "0 0 16px", color: "var(--muted)", fontWeight: 600, fontSize: 14 }}>{subtitle}</p>}
      <div>{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <div style={{ flex: "0 0 140px", color: "var(--muted)", fontWeight: 600, fontSize: 14 }}>{k}</div>
      <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: 14, overflowWrap: "anywhere" }}>{v ?? "—"}</div>
    </div>
  );
}

/* ------------------------------ MAIN PAGE ------------------------------- */

export default async function AirportPage(props: Props) {
  const { code: rawCode } = await props.params;
  const code = norm(rawCode);
  
  const airportRows = await sql`SELECT * FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`;
  const airport = airportRows?.[0] as Airport | undefined;
  if (!airport) notFound();

  const [runways, frequencies, countryName, nearby] = await Promise.all([
    sql`SELECT * FROM runways WHERE airport_ref = ${airport.id} ORDER BY length_ft DESC`,
    sql`SELECT * FROM frequencies WHERE airport_ref = ${airport.id} ORDER BY type ASC`,
    lookupCountryName(airport.iso_country),
    sql`
      SELECT ident, name, type, 
        (6371 * acos(cos(radians(${airport.latitude_deg})) * cos(radians(latitude_deg)) * cos(radians(longitude_deg) - radians(${airport.longitude_deg})) + sin(radians(${airport.latitude_deg})) * sin(radians(latitude_deg)))) AS dist,
        EXISTS (SELECT 1 FROM runway_ils WHERE airport_ident = airports.ident) as has_ils
      FROM airports
      WHERE ident != ${airport.ident}
      AND type IN ('large_airport', 'medium_airport')
      ORDER BY dist ASC
      LIMIT 5
    `
  ]);

  const ilsSource = airport.iso_country === "US" ? "FAA NASR" : "AIP 2026 Researched";

  return (
    <main style={{ padding: "20px 16px 60px", maxWidth: 800, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      {/* HEADER & NAVIGATION */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ 
          color: "var(--foreground)", 
          textDecoration: "none", 
          display: "inline-flex", 
          alignItems: "center", 
          gap: 6, 
          fontWeight: 700,
          fontSize: 14,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: 12,
          border: "1px solid var(--border)"
        }}>
          <ChevronLeft size={16} /> Dashboard
        </Link>
      </div>

      {/* SAFETY DISCLAIMER */}
      <div style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: 8,
        padding: "8px 16px", 
        marginBottom: 24, 
        fontSize: 11, 
        fontWeight: 900, 
        textTransform: "uppercase", 
        background: "rgba(0,0,0,0.05)", 
        borderRadius: 10, 
        color: "var(--muted)", 
        border: "1px solid var(--border)",
        letterSpacing: "0.05em"
      }}>
        <ShieldCheck size={14} className="text-amber-500" />
        Reference only — not for real-world navigation.
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 56, margin: "0 0 4px", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {airport.ident}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 24, color: "var(--muted)", fontWeight: 600 }}>{airport.name}</p>
          {airport.iata_code && <Badge text={airport.iata_code} tone="muted" />}
        </div>
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {/* AIRPORT INFO */}
        <Card title="Technical Specs" icon={Database}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0 40px" }}>
            <div>
              <KV k="ICAO Identifier" v={airport.ident} />
              <KV k="IATA Code" v={airport.iata_code || "None"} />
              <KV k="Airport Type" v={airport.type.replace('_', ' ')} />
            </div>
            <div>
              <KV k="Municipality" v={airport.municipality} />
              <KV k="Elevation" v={`${fmtFt(airport.elevation_ft)} (${fmtMFromFt(airport.elevation_ft)})`} />
              <KV k="Country" v={
                <Link href={`/countries/${airport.iso_country.toLowerCase()}`} style={{ 
                  color: "var(--foreground)", 
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6 
                }}>
                  <Globe size={14} className="text-blue-500" /> {airport.iso_country} {countryName ? `(${countryName})` : ""}
                </Link>
              } />
            </div>
          </div>
        </Card>

        {/* RUNWAYS */}
        <Card title="Runways & Surfaces" icon={Plane}>
          <div style={{ display: "grid", gap: 12 }}>
            {runways.map((r: any) => (
              <div key={r.id} style={{ 
                border: "1px solid var(--border)", 
                borderRadius: 20, 
                padding: 20,
                background: "rgba(255,255,255,0.02)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>{r.le_ident} / {r.he_ident}</span>
                  <Badge text={r.lighted ? "LIGHTED" : "UNLIT"} tone={r.lighted ? "ok" : "muted"} />
                </div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>Dimensions</span>
                    <span style={{ fontWeight: 700 }}>{fmtFt(r.length_ft)} x {r.width_ft ? `${r.width_ft} ft` : "—"}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>Surface</span>
                    <span style={{ fontWeight: 700 }}>{surfaceLabel(r.surface)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* FREQUENCIES */}
        <Card title="Radio Frequencies" icon={Activity}>
          <div style={{ display: "grid", gap: 2 }}>
            {frequencies.length > 0 ? frequencies.map((f: any) => (
              <div key={f.id} style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: "12px 0", 
                borderBottom: "1px solid rgba(255,255,255,0.05)" 
              }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{f.type}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600 }}>{f.description}</span>
                </div>
                <div style={{ fontWeight: 900, fontSize: 16, fontFamily: "monospace", color: "#3b82f6" }}>
                  {fmtFreqMHz(f.frequency_mhz)}
                </div>
              </div>
            )) : <p style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 14 }}>No COM frequencies available.</p>}
          </div>
        </Card>

        {/* NEARBY AIRPORTS */}
        <Card title="Nearby Facilities" subtitle="Closest airports for alternates and regional planning." icon={MapPin}>
          <div style={{ display: "grid", gap: 12 }}>
            {nearby.map((nb: any) => (
              <Link key={nb.ident} href={`/airports/${nb.ident}`} style={{ 
                textDecoration: "none", 
                color: "inherit", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: "16px", 
                background: "rgba(255,255,255,0.03)", 
                borderRadius: 20, 
                border: "1px solid var(--border)",
                transition: "transform 0.2s"
              }} className="hover-card">
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: 12, 
                    background: "rgba(0,0,0,0.05)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    flexShrink: 0 
                  }}>
                    {getIcon(nb.type)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
                      {nb.ident}
                      {nb.has_ils && (
                        <span style={{ 
                          fontSize: 9, 
                          fontWeight: 900, 
                          background: "rgba(16,185,129,0.15)", 
                          color: "#10b981", 
                          padding: "2px 6px", 
                          borderRadius: 6, 
                          border: "1px solid rgba(16,185,129,0.2)" 
                        }}>ILS</span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: 13, 
                      color: "var(--muted)", 
                      fontWeight: 600, 
                      overflow: "hidden", 
                      textOverflow: "ellipsis", 
                      whiteSpace: "nowrap" 
                    }}>{nb.name}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--foreground)" }}>{Math.round(nb.dist)} km</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{Math.round(nb.dist * 0.54)} nm</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* FOOTER */}
        <footer style={{ 
          padding: "40px 0", 
          textAlign: "center", 
          borderTop: "1px solid var(--border)", 
          marginTop: 20 
        }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.8, fontWeight: 600 }}>
            Airport Data: <strong style={{ color: "var(--foreground)" }}>OurAirports</strong> (Public Domain) <br />
            ILS & Approach Data: <strong style={{ color: "var(--foreground)" }}>{ilsSource}</strong> · Verified AIP Cycle 2026 <br />
            <span style={{ color: "var(--foreground)", fontWeight: 800 }}>Reference only — not for real-world navigation.</span>
          </p>
        </footer>
      </div>
    </main>
  );
}