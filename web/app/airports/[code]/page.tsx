// web/app/airports/[code]/page.tsx

import Link from "next/link";
import { headers } from "next/headers";
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
  return `https://www.google.com/maps?q=${la},${lo}`;
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

/* ----------------------------- SEO (generateMetadata) ----------------------------- */

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const code = norm(resolvedParams?.code);

  // Fallback Metadata Objekt - WICHTIG: index: true standardmäßig
  const baseFallback: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: `${code || "Airport"} — Airport Lookup (Runways, Frequencies, Lights)`,
    description: `Airport ${code}: runway lengths, lights, frequencies, and navaids for MSFS 2020/2024.`,
    alternates: { canonical: `/airports/${code}` },
    robots: { index: true, follow: true },
  };

  if (!code) return baseFallback;

  try {
    const rows = await sql`
      SELECT ident as icao, iata_code as iata, name
      FROM airports
      WHERE ident = ${code} OR iata_code = ${code}
      LIMIT 1
    `;
    const a = rows?.[0];

    if (!a?.icao) return baseFallback;

    const codes = `${a.icao}${a.iata ? ` / ${a.iata}` : ""}`;
    const title = `${codes} — ${a.name} (Runways, Frequencies, Lights)`;
    const desc = `${a.name} (${codes}): runway lengths & lights, frequencies, and navaids for MSFS.`;

    return {
      ...baseFallback,
      title,
      description: desc,
      alternates: { canonical: `/airports/${a.icao}` },
      openGraph: {
        type: "website",
        url: `/airports/${a.icao}`,
        title,
        description: desc,
        siteName: "Airport Lookup",
      },
      twitter: { card: "summary", title, description: desc },
    };
  } catch (e) {
    console.error("Metadata Error", e);
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
  const p = await props.params;
  const code = norm(p?.code);
  if (!code) notFound();

  const [airportRows, navaids] = await Promise.all([
    sql`SELECT * FROM airports WHERE ident = ${code} OR iata_code = ${code} LIMIT 1`,
    sql`SELECT * FROM navaids WHERE associated_airport = ${code} ORDER BY type ASC, ident ASC`
  ]);

  const airport = airportRows?.[0];
  if (!airport) notFound();

  const [runways, frequencies] = await Promise.all([
    sql`SELECT * FROM runways WHERE airport_ref = ${airport.id} ORDER BY length_ft DESC NULLS LAST`,
    sql`SELECT * FROM frequencies WHERE airport_ref = ${airport.id} ORDER BY type ASC, frequency_mhz ASC`
  ]);

  const mapsUrl = googleMapsLink(airport.latitude_deg, airport.longitude_deg);
  const primaryFreq = pickPrimaryFrequency(frequencies);
  const canonicalUrl = `${SITE_URL}/airports/${airport.ident}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: airport.name,
    iataCode: airport.iata_code,
    icaoCode: airport.ident,
    geo: { "@type": "GeoCoordinates", latitude: airport.latitude_deg, longitude: airport.longitude_deg },
    url: canonicalUrl,
  };

  return (
    <main style={{ padding: 18, maxWidth: 720, margin: "0 auto", fontFamily: "system-ui" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--foreground)", textDecoration: "none", fontWeight: 600, opacity: 0.9 }}>← Back</Link>
      </div>

      <h1 style={{ fontSize: 44, letterSpacing: -0.5, margin: "8px 0 6px", fontWeight: 700 }}>{airport.ident}</h1>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>{airport.name}</p>

      <div style={{ height: 18 }} />

      <div style={{ display: "grid", gap: 14 }}>
        <Card title="Key Facts" subtitle="At-a-glance sim reference.">
          <div style={{ display: "grid", gap: 10 }}>
            {/* Runway Summary */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 12, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "var(--muted)" }}>Runway Summary</span>
                <div style={{ display: "flex", gap: 8 }}>
                   {runways.some((r: any) => asBool(r.lighted)) && <Badge text="LIGHTED" tone="ok" />}
                   {runways.some((r: any) => asBool(r.closed)) && <Badge text="CLOSED" tone="warn" />}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                {runways.slice(0, 3).map((r: any) => (
                  <div key={r.id} style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {r.le_ident}/{r.he_ident} · {r.length_ft} ft · {surfaceLabel(r.surface)}
                  </div>
                ))}
              </div>
            </div>

            <KV k="Elevation" v={`${fmtFt(airport.elevation_ft)} / ${fmtMFromFt(airport.elevation_ft)}`} />
            <KV k="Primary Freq" v={primaryFreq ? `${primaryFreq.type} ${fmtFreqMHz(primaryFreq.frequency_mhz)}` : "N/A"} />
          </div>
        </Card>

        <Card title="Airport Info">
          <KV k="Name" v={airport.name} />
          <KV k="Codes" v={`${airport.iata_code || "—"} / ${airport.ident}`} />
          <KV k="Municipality" v={airport.municipality} />
          <KV k="Coordinates" v={mapsUrl ? <a href={mapsUrl} target="_blank" style={{ color: "inherit" }}>{fmtCoord(airport.latitude_deg)}, {fmtCoord(airport.longitude_deg)}</a> : "—"} />
          {isNonEmpty(airport.wikipedia_link) && <KV k="Wikipedia" v={<a href={airport.wikipedia_link} target="_blank" style={{ color: "inherit" }}>Open Article</a>} />}
        </Card>

        <Card title="Frequencies">
          {frequencies.map((f: any) => (
            <KV key={f.id} k={f.type} v={`${fmtFreqMHz(f.frequency_mhz)} (${f.description || "No desc"})`} />
          ))}
        </Card>

        <Card title="Navaids">
          {navaids.map((n: any) => (
            <KV key={n.id} k={`${n.type} ${n.ident}`} v={fmtNavaidFreq(n.frequency_khz)} />
          ))}
        </Card>
      </div>
    </main>
  );
}