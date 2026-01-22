// web/app/airports/[code]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 86400; // 24h

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://www.airportlookup.com";

/* ----------------------------- HELPERS ----------------------------- */

function norm(code: string | undefined | null) {
  return (code ?? "").trim().toUpperCase();
}

function isNonEmpty(s: any) {
  return typeof s === "string" && s.trim().length > 0;
}

function fmtCoord(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(6) : "—";
}

function fmtFt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? `${Math.round(x)} ft` : "—";
}

function fmtMFromFt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? `${Math.round(x * 0.3048)} m` : "—";
}

function googleMapsLink(lat: any, lon: any) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${la},${lo}`;
}

function fmtFreqMHz(mhz: any) {
  const x = Number(mhz);
  return Number.isFinite(x) ? `${x.toFixed(2)} MHz` : "—";
}

function fmtNavaidFreq(freq_khz: any) {
  const x = Number(freq_khz);
  if (!Number.isFinite(x)) return null;
  if (x >= 100000) return `${(x / 1000).toFixed(2)} MHz`;
  return `${Math.round(x)} kHz`;
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

async function lookupCountryName(isoCountry: any) {
  const code = norm(isoCountry);
  if (!code) return null;
  const rows = await sql`SELECT name FROM countries WHERE code = ${code} LIMIT 1`;
  return rows?.[0]?.name ? String(rows[0].name) : null;
}

async function lookupRegionName(isoRegion: any) {
  const code = norm(isoRegion);
  if (!code) return null;
  const rows = await sql`SELECT name FROM regions WHERE code = ${code} LIMIT 1`;
  return rows?.[0]?.name ? String(rows[0].name) : null;
}

function pickPrimaryFrequency(frequencies: any[]) {
  if (!frequencies?.length) return null;
  const priority = ["TWR", "CTAF", "UNICOM", "AFIS", "GND", "APP", "DEP", "ATIS"];
  const rank = (t: any) => {
    const idx = priority.indexOf(String(t ?? "").toUpperCase());
    return idx === -1 ? 999 : idx;
  };
  return [...frequencies].sort((a, b) => rank(a.type) - rank(b.type) || Number(a.frequency_mhz) - Number(b.frequency_mhz))[0];
}

const asBool = (v: any) => v === true || v === 1 || v === "1";

/* ----------------------------- SEO ----------------------------- */

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = norm(rawCode);

  const baseFallback: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: `${code || "Airport"} — Runways, ILS Frequencies & Frequencies`,
    description: `Technical data for ${code}: ILS frequencies, runway lengths, and navaids for MSFS 2020/2024.`,
    alternates: { canonical: `/airports/${code}` },
    robots: { index: true, follow: true },
  };

  if (!code) return baseFallback;

  try {
    const rows = await sql`SELECT ident, iata_code, name FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`;
    const a = rows?.[0];
    if (!a?.ident) return baseFallback;

    const title = `${a.ident}${a.iata_code ? ` / ${a.iata_code}` : ""} — ${a.name} (ILS, Runways, Frequencies)`;
    
    return {
      ...baseFallback,
      title,
      alternates: { canonical: `/airports/${a.ident}` },
      openGraph: { type: "website", url: `/airports/${a.ident}`, title, siteName: "Airport Lookup" },
    };
  } catch (e) {
    return baseFallback;
  }
}

/* ------------------------------ UI COMPONENTS ---------------------------- */

function Badge({ text, tone = "muted" }: { text: string; tone?: "ok" | "muted" | "warn" }) {
  const colors = {
    ok: { bg: "rgba(34,197,94,0.14)", fg: "rgba(34,197,94,1)" },
    warn: { bg: "rgba(245,158,11,0.16)", fg: "rgba(245,158,11,1)" },
    muted: { bg: "rgba(255,255,255,0.08)", fg: "var(--muted)" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 700, background: colors[tone].bg, color: colors[tone].fg,
      border: "1px solid var(--border)", letterSpacing: 0.2
    }}>
      {text}
    </span>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children?: any }) {
  return (
    <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 18, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
      <h2 style={{ fontSize: 22, margin: 0, color: "var(--foreground)", fontWeight: 700 }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 500 }}>{subtitle}</p>}
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
    </section>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0", flexWrap: "wrap" }}>
      <div style={{ flex: "0 1 170px", color: "var(--muted)", fontWeight: 600 }}>{k}</div>
      <div style={{ fontWeight: 600, color: "var(--foreground)", flex: "1 1 220px", overflowWrap: "anywhere" }}>{v ?? "—"}</div>
    </div>
  );
}

/* ------------------------------ MAIN PAGE ------------------------------- */

export default async function AirportPage(props: Props) {
  const { code: rawCode } = await props.params;
  const code = norm(rawCode);
  if (!code) notFound();

  const airportRows = await sql`SELECT * FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`;
  const airport = airportRows?.[0];
  if (!airport) notFound();

  const [runways, frequencies, navaids, countryName, regionName, ilsData] = await Promise.all([
    sql`SELECT * FROM runways WHERE airport_ref = ${airport.id} ORDER BY length_ft DESC NULLS LAST`,
    sql`SELECT * FROM frequencies WHERE airport_ref = ${airport.id} ORDER BY type ASC, frequency_mhz ASC`,
    sql`SELECT * FROM navaids WHERE associated_airport = ${airport.ident} ORDER BY type ASC, ident ASC`,
    lookupCountryName(airport.iso_country),
    lookupRegionName(airport.iso_region),
    sql`SELECT * FROM runway_ils WHERE airport_ident = ${airport.ident}`
  ]);

  const hasIls = ilsData && ilsData.length > 0;
  const ilsSource = ilsData?.[0]?.source || "FAA/Global Dataset";
  const ilsUpdated = ilsData?.[0]?.created_at ? new Date(ilsData[0].created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Jan 2026";

  const mapsUrl = googleMapsLink(airport.latitude_deg, airport.longitude_deg);
  const primaryFreq = pickPrimaryFrequency(frequencies);
  const associatedTop = (navaids ?? []).slice(0, 3);

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600 }}>← Back</Link>
      </div>

      <h1 style={{ fontSize: 44, margin: "8px 0 2px", fontWeight: 800 }}>{airport.ident}</h1>
      <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, background: "#f0f0f0", display: "inline-block", padding: "4px 10px", borderRadius: 6, color: "#333", textTransform: "uppercase" }}>
        Reference only — not for real-world navigation.
      </p>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>{airport.name}</p>

      <div style={{ height: 24 }} />

      <div style={{ display: "grid", gap: 14 }}>
        
        {/* Key Facts mit ILS Status */}
        <Card title="Key Facts" subtitle="Sim planning summary.">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: hasIls ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>ILS Precision Approach</span>
              <Badge text={hasIls ? "ILS AVAILABLE ✅" : "VFR / VISUAL ONLY"} tone={hasIls ? "ok" : "muted"} />
            </div>

            <KV k="Field Elevation" v={`${fmtFt(airport.elevation_ft)} / ${fmtMFromFt(airport.elevation_ft)}`} />
            <KV k="Primary Channel" v={primaryFreq ? `${primaryFreq.type} ${fmtFreqMHz(primaryFreq.frequency_mhz)}` : "—"} />
            
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 8, fontSize: 12, textTransform: "uppercase" }}>Runway Summary</div>
              {runways.map((r: any) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                  <span style={{ fontWeight: 700 }}>{r.le_ident}/{r.he_ident} · {r.length_ft} ft</span>
                  <Badge text={asBool(r.lighted) ? "LIGHTED" : "UNLIT"} tone={asBool(r.lighted) ? "ok" : "muted"} />
                </div>
              ))}
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 700, color: "var(--muted)", marginBottom: 8, fontSize: 12, textTransform: "uppercase" }}>Associated Navaids</div>
              {associatedTop.map((n: any) => (
                <div key={n.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  <span>{n.ident} · {n.type}</span>
                  <span>{fmtNavaidFreq(n.frequency_khz)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Airport Info */}
        <Card title="Airport Info" subtitle="Location and meta data.">
          <KV k="Name" v={airport.name} />
          <KV k="Codes" v={`${airport.iata_code || "—"} / ${airport.ident}`} />
          <KV k="Type" v={airport.type} />
          <KV k="City" v={airport.municipality} />
          <KV k="Country" v={airport.iso_country ? `${airport.iso_country}${countryName ? ` — ${countryName}` : ""}` : "—"} />
          <KV k="Region" v={airport.iso_region ? `${airport.iso_region}${regionName ? ` — ${regionName}` : ""}` : "—"} />
          <KV k="Coordinates" v={mapsUrl ? <a href={mapsUrl} target="_blank" style={{ color: "inherit", fontWeight: 700 }}>{fmtCoord(airport.latitude_deg)}, {fmtCoord(airport.longitude_deg)}</a> : "—"} />
          <KV k="Elevation" v={fmtFt(airport.elevation_ft)} />
          {isNonEmpty(airport.wikipedia_link) && <KV k="Wikipedia" v={<a href={airport.wikipedia_link} target="_blank" style={{ color: "inherit" }}>Open Article</a>} />}
          {isNonEmpty(airport.home_link) && <KV k="Website" v={<a href={airport.home_link} target="_blank" style={{ color: "inherit" }}>Visit Site</a>} />}
          {isNonEmpty(airport.keywords) && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 8, fontSize: 13 }}>
              <strong>Keywords:</strong> {airport.keywords}
            </div>
          )}
        </Card>

        {/* Runways & ILS Detail */}
        <Card title="Runways & Approach" subtitle="Technical data for landings.">
          {runways.map((r: any) => {
            const ils = ilsData?.find((i: any) => i.runway_ident === r.le_ident || i.runway_ident === r.he_ident);
            return (
              <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginBottom: 12, background: "rgba(255,255,255,0.01)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 20 }}>RWY {r.le_ident} / {r.he_ident}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {ils && <Badge text="ILS AVAILABLE" tone="ok" />}
                    <Badge text={asBool(r.lighted) ? "LIGHTED" : "UNLIT"} tone={asBool(r.lighted) ? "ok" : "muted"} />
                  </div>
                </div>
                
                <div style={{ color: "var(--muted)", fontWeight: 600, fontSize: 14 }}>
                  {r.length_ft ? `${r.length_ft} ft / ${fmtMFromFt(r.length_ft)}` : "—"}
                  {" · "}
                  {r.width_ft ? `${r.width_ft} ft wide` : ""}
                  {" · "}
                  {surfaceLabel(r.surface)}
                  <br />
                  Heading: {r.le_heading_degt ?? "—"}° / {r.he_heading_degt ?? "—"}°
                </div>

                {ils && (
                  <div style={{ marginTop: 12, padding: 12, background: "rgba(34,197,94,0.05)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.15)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>FREQ</div>
                        <div style={{ fontWeight: 800, fontFamily: "monospace" }}>{Number(ils.ils_freq).toFixed(2)} MHz</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>IDENT</div>
                        <div style={{ fontWeight: 800, fontFamily: "monospace" }}>{ils.ils_ident}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700 }}>COURSE</div>
                        <div style={{ fontWeight: 800, fontFamily: "monospace" }}>{Number(ils.ils_course).toFixed(0)}°</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Frequencies */}
        <Card title="Frequencies" subtitle="Communication channels.">
          {frequencies.map((f: any) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700 }}>{f.type} <span style={{ color: "var(--muted)", fontWeight: 500, marginLeft: 8 }}>{f.description}</span></div>
              <div style={{ fontWeight: 800 }}>{fmtFreqMHz(f.frequency_mhz)}</div>
            </div>
          ))}
        </Card>

        {/* Navaids */}
        <Card title="Navaids Detail" subtitle="VOR, NDB, and DME stations.">
          {navaids.map((n: any) => (
            <div key={n.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                <span>{n.ident} · {n.type}</span>
                <span>{fmtNavaidFreq(n.frequency_khz)}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 4, fontWeight: 600 }}>
                {n.name} <br />
                {fmtCoord(n.latitude_deg)}, {fmtCoord(n.longitude_deg)} · {fmtFt(n.elevation_ft)}
              </div>
            </div>
          ))}
        </Card>

        {/* Footer */}
        <div style={{ padding: "20px 10px", textAlign: "center", opacity: 0.6 }}>
          <p style={{ fontSize: 12, margin: 0 }}>
            Source: <strong style={{color: "var(--foreground)"}}>{ilsSource}</strong> · 
            Cycle: <strong style={{color: "var(--foreground)"}}>{ilsUpdated}</strong>
          </p>
        </div>
      </div>
    </main>
  );
}