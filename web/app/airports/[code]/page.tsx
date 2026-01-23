// web/app/airports/[code]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";

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
  frequency_mhz: number;
}

interface Navaid {
  id: number;
  ident: string;
  type: string;
  name: string;
  frequency_khz: number;
  latitude_deg: number;
  longitude_deg: number;
  elevation_ft: number | null;
}

interface RunwayIls {
  runway_ident: string;
  ils_freq: string | number;
  ils_ident: string;
  ils_course: string | number;
  source: string;
  created_at: string;
}

/* ----------------------------- HELPERS ----------------------------- */

function norm(code: string | undefined | null) {
  return (code ?? "").trim().toUpperCase();
}

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function fmtCoord(n: number | string | null | undefined) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(6) : "—";
}

function fmtFt(n: number | string | null | undefined) {
  const x = Number(n);
  return Number.isFinite(x) ? `${Math.round(x).toLocaleString()} ft` : "—";
}

function fmtMFromFt(n: number | string | null | undefined) {
  const x = Number(n);
  return Number.isFinite(x) ? `${Math.round(x * 0.3048).toLocaleString()} m` : "—";
}

function googleMapsLink(lat: number | string, lon: number | string) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function fmtFreqMHz(mhz: number | string | null | undefined) {
  const x = Number(mhz);
  return Number.isFinite(x) ? `${x.toFixed(2)} MHz` : "—";
}

function fmtNavaidFreq(freq_khz: number | string | null | undefined) {
  const x = Number(freq_khz);
  if (!Number.isFinite(x)) return null;
  if (x >= 100000) return `${(x / 1000).toFixed(2)} MHz`;
  return `${Math.round(x)} kHz`;
}

function surfaceLabel(surface: string | null | undefined) {
  const s = String(surface ?? "").trim().toUpperCase();
  if (!s) return "—";
  const map: Record<string, string> = {
    ASP: "Asphalt", CON: "Concrete", BIT: "Bitumen", GRE: "Grass", GRS: "Grass",
    TURF: "Turf", GRV: "Gravel", DRT: "Dirt", SND: "Sand", WTR: "Water",
    ICE: "Ice", SNW: "Snow", UNK: "Unknown",
  };
  return map[s] ?? surface;
}

async function lookupCountryName(isoCountry: string | null | undefined) {
  const code = norm(isoCountry);
  if (!code) return null;
  const rows = await sql<{ name: string }[]>`SELECT name FROM countries WHERE code = ${code} LIMIT 1`;
  return rows?.[0]?.name ? String(rows[0].name) : null;
}

async function lookupRegionName(isoRegion: string | null | undefined) {
  const code = norm(isoRegion);
  if (!code) return null;
  const rows = await sql<{ name: string }[]>`SELECT name FROM regions WHERE code = ${code} LIMIT 1`;
  return rows?.[0]?.name ? String(rows[0].name) : null;
}

function pickPrimaryFrequency(frequencies: Frequency[]) {
  if (!frequencies?.length) return null;
  const priority = ["TWR", "CTAF", "UNICOM", "AFIS", "GND", "APP", "DEP", "ATIS"];
  const rank = (t: string | null) => {
    const idx = priority.indexOf(String(t ?? "").toUpperCase());
    return idx === -1 ? 999 : idx;
  };
  return [...frequencies].sort((a, b) => rank(a.type) - rank(b.type) || Number(a.frequency_mhz) - Number(b.frequency_mhz))[0];
}

const asBool = (v: unknown): boolean => v === true || v === 1 || v === "1" || v === "t" || v === "true";

/* ----------------------------- SEO ----------------------------- */

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = norm(rawCode);
  const rows = await sql<Airport[]>`SELECT ident, iata_code, name FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`;
  const a = rows?.[0];
  if (!a) return { title: "Airport Not Found" };

  const title = `${a.ident}${a.iata_code ? ` / ${a.iata_code}` : ""} — ${a.name} (ILS, Runways, Frequencies)`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description: `Technical data for ${a.ident}: ILS frequencies, runway lengths, and navaids for MSFS 2020/2024.`,
    alternates: { canonical: `/airports/${a.ident}` },
  };
}

/* ------------------------------ UI COMPONENTS ---------------------------- */

function Badge({ text, tone = "muted" }: { text: string; tone?: "ok" | "muted" | "warn" }) {
  const colors = {
    ok: { bg: "rgba(34,197,94,0.14)", fg: "rgba(34,197,94,1)" },
    warn: { bg: "rgba(245,158,11,0.16)", fg: "rgba(245,158,11,1)" },
    muted: { bg: "rgba(255,255,255,0.08)", fg: "var(--muted)" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: colors[tone].bg, color: colors[tone].fg, border: "1px solid var(--border)", letterSpacing: 0.2 }}>
      {text}
    </span>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      <h2 style={{ fontSize: 22, margin: 0, color: "var(--foreground)", fontWeight: 700 }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 500, fontSize: 14 }}>{subtitle}</p>}
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", flexWrap: "wrap" }}>
      <div style={{ flex: "0 1 170px", color: "var(--muted)", fontWeight: 600 }}>{k}</div>
      <div style={{ fontWeight: 600, color: "var(--foreground)", flex: "1 1 220px", overflowWrap: "anywhere" }}>{v ?? "—"}</div>
    </div>
  );
}

/* ------------------------------ MAIN PAGE ------------------------------- */

export default async function AirportPage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = norm(rawCode);
  if (!code) notFound();

  const airportRows = await sql<Airport[]>`SELECT * FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`;
  const airport = airportRows?.[0];
  if (!airport) notFound();

  const [runways, frequencies, navaids, countryName, regionName, ilsData] = await Promise.all([
    sql<Runway[]>`SELECT * FROM runways WHERE airport_ref = ${airport.id} ORDER BY length_ft DESC NULLS LAST`,
    sql<Frequency[]>`SELECT * FROM frequencies WHERE airport_ref = ${airport.id} ORDER BY type ASC`,
    sql<Navaid[]>`SELECT * FROM navaids WHERE associated_airport = ${airport.ident} ORDER BY type ASC`,
    lookupCountryName(airport.iso_country),
    lookupRegionName(airport.iso_region),
    sql<RunwayIls[]>`SELECT * FROM runway_ils WHERE airport_ident = ${airport.ident}`
  ]);

  const hasIlsData = ilsData && ilsData.length > 0;
  const primaryFreq = pickPrimaryFrequency(frequencies);
  const associatedTop = navaids.slice(0, 3);

  // NEARBY AIRPORTS (Haversine SQL)
  const nearbyAirports = await sql`
    SELECT ident, name, municipality, type,
    (2 * 6371 * asin(sqrt(power(sin(radians((${airport.latitude_deg} - latitude_deg) / 2)), 2) + cos(radians(latitude_deg)) * cos(radians(${airport.latitude_deg})) * power(sin(radians((${airport.longitude_deg} - longitude_deg) / 2)), 2)))) as distance_km
    FROM airports
    WHERE ident != ${airport.ident} AND latitude_deg IS NOT NULL AND type IN ('large_airport','medium_airport')
    ORDER BY distance_km ASC LIMIT 5
  `;

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>← Back to Search</Link>
      </div>

      <h1 style={{ fontSize: 44, margin: "8px 0 2px", fontWeight: 800 }}>{airport.ident}</h1>
      <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, background: "#f0f0f0", display: "inline-block", padding: "4px 10px", borderRadius: 6, color: "#333", textTransform: "uppercase" }}>
        Flight Simulator Reference — Not for Real World Navigation
      </p>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>{airport.name}</p>

      <div style={{ height: 24 }} />

      <div style={{ display: "grid", gap: 14 }}>
        
        {/* Key Facts Card */}
        <Card title="Key Facts" subtitle="Essential technical summary for MSFS 2020/2024 and X-Plane.">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: hasIlsData ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>ILS Approach Status</span>
              <Badge text={hasIlsData ? "ILS FREQUENCIES VERIFIED ✅" : "ILS DATA NOT IN DATABASE"} tone={hasIlsData ? "ok" : "muted"} />
            </div>

            <KV k="Field Elevation" v={`${fmtFt(airport.elevation_ft)} / ${fmtMFromFt(airport.elevation_ft)}`} />
            <KV k="Primary Channel" v={primaryFreq ? `${primaryFreq.type} ${fmtFreqMHz(primaryFreq.frequency_mhz)} (${primaryFreq.description || ""})` : "—"} />
            
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 8, fontSize: 12, textTransform: "uppercase" }}>Runway Summary</div>
              {runways.map((r) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{r.le_ident}/{r.he_ident} · {r.length_ft} ft · {surfaceLabel(r.surface)}</span>
                  <Badge text={asBool(r.lighted) ? "LIGHTED" : "UNLIT"} tone={asBool(r.lighted) ? "ok" : "muted"} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Airport Info */}
        <Card title="Airport Details" subtitle="Full geographical and organizational metadata.">
          <KV k="Full Name" v={airport.name} />
          <KV k="ICAO / IATA" v={`${airport.ident} / ${airport.iata_code || "—"}`} />
          <KV k="Municipality" v={airport.municipality} />
          <KV k="Country" v={airport.iso_country ? `${airport.iso_country}${countryName ? ` — ${countryName}` : ""}` : "—"} />
          <KV k="Region" v={airport.iso_region ? `${airport.iso_region}${regionName ? ` — ${regionName}` : ""}` : "—"} />
          <KV k="GPS Coordinates" v={<a href={googleMapsLink(airport.latitude_deg, airport.longitude_deg)} target="_blank" style={{ color: "var(--foreground)", fontWeight: 700 }}>📍 {fmtCoord(airport.latitude_deg)}, {fmtCoord(airport.longitude_deg)} 🗺️</a>} />
          <KV k="Elevation" v={fmtFt(airport.elevation_ft)} />
          {isNonEmpty(airport.wikipedia_link) && <KV k="Wikipedia" v={<a href={airport.wikipedia_link} target="_blank" style={{ color: "inherit" }}>Open Article</a>} />}
          {isNonEmpty(airport.home_link) && <KV k="Official Website" v={<a href={airport.home_link} target="_blank" style={{ color: "inherit" }}>Visit Site</a>} />}
        </Card>

        {/* Runways Detail Section */}
        <Card title="Runways & ILS Approach Data" subtitle="Detailed dimensions and instrument landing frequencies.">
          {runways.map((r) => {
            const ils = ilsData?.find((i) => i.runway_ident === r.le_ident || i.runway_ident === r.he_ident);
            return (
              <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 12, background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 20 }}>Runway {r.le_ident} / {r.he_ident}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {ils && <Badge text="ILS" tone="ok" />}
                    <Badge text={asBool(r.lighted) ? "LIGHTED" : "UNLIT"} tone={asBool(r.lighted) ? "ok" : "muted"} />
                  </div>
                </div>
                <div style={{ color: "var(--muted)", fontWeight: 600, fontSize: 14, lineHeight: "1.6" }}>
                  <strong>Length:</strong> {r.length_ft ? `${r.length_ft.toLocaleString()} ft / ${fmtMFromFt(r.length_ft)}` : "—"} <br />
                  <strong>Width:</strong> {r.width_ft ? `${r.width_ft.toLocaleString()} ft / ${fmtMFromFt(r.width_ft)}` : "—"} <br />
                  <strong>Surface:</strong> {surfaceLabel(r.surface)} <br />
                  <strong>Heading:</strong> {r.le_heading_degt ?? "—"}° / {r.he_heading_degt ?? "—"}°
                </div>
                {ils && (
                  <div style={{ marginTop: 14, padding: 14, background: "rgba(34,197,94,0.05)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.15)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div><small style={{ color: "var(--muted)", fontWeight: 800 }}>ILS FREQUENCY</small><br/><span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 16 }}>{Number(ils.ils_freq).toFixed(2)} MHz</span></div>
                      <div><small style={{ color: "var(--muted)", fontWeight: 800 }}>ILS IDENT</small><br/><span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 16 }}>{ils.ils_ident}</span></div>
                      <div><small style={{ color: "var(--muted)", fontWeight: 800 }}>ILS COURSE</small><br/><span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 16 }}>{Number(ils.ils_course).toFixed(0)}°</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Nearby Airports Section */}
        <Card title="Nearby Airports" subtitle="Alternative airports in the vicinity (km & nm).">
          <div style={{ display: "grid", gap: 8 }}>
            {nearbyAirports.map((nb: any) => (
              <Link key={nb.ident} href={`/airports/${nb.ident}`} style={{ textDecoration: "none", color: "inherit", display: "flex", justifyContent: "space-between", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div><strong>{nb.ident}</strong> · <span style={{ color: "var(--muted)" }}>{nb.name}</span></div>
                <div style={{ fontWeight: 700 }}>{Math.round(nb.distance_km)} km / {Math.round(nb.distance_km * 0.539957)} nm</div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Frequencies Card */}
        <Card title="Communication Frequencies" subtitle="Air traffic control and advisory channels.">
          {frequencies.length > 0 ? frequencies.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{f.type} <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>{f.description}</span></div>
              <div style={{ fontWeight: 800, fontFamily: "monospace" }}>{fmtFreqMHz(f.frequency_mhz)}</div>
            </div>
          )) : <p style={{ color: "var(--muted)" }}>No frequency data available.</p>}
        </Card>

        {/* Navaids Card */}
        <Card title="Nearby Navaids" subtitle="Ground-based navigation aids (VOR, NDB, DME).">
          {navaids.length > 0 ? navaids.map((n) => (
            <div key={n.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 10, background: "rgba(255,255,255,0.01)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>{n.ident} · {n.type}</span>
                <span>{fmtNavaidFreq(n.frequency_khz)}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>{n.name} <br /> {fmtCoord(n.latitude_deg)}, {fmtCoord(n.longitude_deg)} · {fmtFt(n.elevation_ft)}</div>
            </div>
          )) : <p style={{ color: "var(--muted)" }}>No navaids found in vicinity.</p>}
        </Card>

        {/* Footer */}
        <div style={{ padding: "30px 10px", textAlign: "center", borderTop: "1px solid var(--border)", marginTop: 20 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            Base Airport Data: OurAirports (Public Domain) <br />
            ILS Data Updated: {hasIlsData ? ilsData[0].created_at : "Jan 2026"}
          </p>
        </div>
      </div>
    </main>
  );
}