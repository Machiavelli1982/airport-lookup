import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const revalidate = 60 * 60 * 24; // 24h

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const FALLBACK_BASE = "https://www.airportlookup.com";

function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    FALLBACK_BASE;

  const cleaned = String(raw).trim().replace(",", ".").replace(/\/$/, "");

  // if already has scheme, normalize to https
  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned.replace(/^http:\/\//i, "https://");
  }

  // otherwise, add https://
  return `https://${cleaned.replace(/^\/+/, "")}`;
}


function norm(input: unknown) {
  return String(input ?? "").trim().toUpperCase();
}

function codeFromOriginalUri(originalUri: string | null) {
  if (!originalUri) return "";
  const path = originalUri.split("?")[0] || "";
  const m = path.match(/^\/airports\/([^/]+)$/i);
  return m ? norm(decodeURIComponent(m[1])) : "";
}

export async function generateMetadata(props: any): Promise<Metadata> {
  const base = getBaseUrl();

  const p = await props?.params;
  let code = norm(p?.code);

  if (!code) {
    const h = await headers();
    code = codeFromOriginalUri(h.get("x-original-uri"));
  }
  if (!code) return {};

  const airportRows = await sql/* sql */`
    SELECT ident, iata_code, name, municipality, iso_country
    FROM airports
    WHERE ident = ${code} OR iata_code = ${code}
    LIMIT 1
  `;

  const a = airportRows?.[0];
  const ident = a?.ident ? norm(a.ident) : code;
  const name = a?.name ? String(a.name) : "";
  const city = a?.municipality ? String(a.municipality) : "";
  const country = a?.iso_country ? String(a.iso_country) : "";

  const placeBits = [city, country].filter(Boolean).join(", ");
  const titleCore = name ? `${ident} – ${name}` : ident;

  const title = `${titleCore} Frequencies & Runways | MSFS 2020 / 2024`;
  const description = [
    `Runway lengths, lighting status and ATC frequencies for ${titleCore}${
      placeBits ? ` (${placeBits})` : ""
    }.`,
    `Reference for Microsoft Flight Simulator (MSFS 2020 & MSFS 2024).`,
    `Not for real-world navigation.`,
  ].join(" ");

  const canonical = `${base}/airports/${ident}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Airport Lookup",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}


/* ----------------------------- helpers ----------------------------- */



function isNonEmpty(s: any) {
  return typeof s === "string" && s.trim().length > 0;
}

function fmtCoord(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(6);
}

function fmtFt(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x)} ft`;
}

function fmtMFromFt(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 0.3048)} m`;
}

function googleMapsLink(lat: any, lon: any) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `https://www.google.com/maps?q=${la},${lo}`;
}

function fmtFreqMHz(mhz: any) {
  const x = Number(mhz);
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(2)} MHz`;
}

function fmtNavaidFreq(freq_khz: any) {
  const x = Number(freq_khz);
  if (!Number.isFinite(x)) return null;
  // OurAirports: NDB in kHz; VOR/LOC/etc stored as kHz but represent MHz band
  if (x >= 100000) return `${(x / 1000).toFixed(2)} MHz`;
  return `${Math.round(x)} kHz`;
}

function pickPrimaryFrequency(frequencies: any[]) {
  if (!frequencies?.length) return null;

  // Sim-friendly: "first thing you'd try" (still reference-only)
  const priority = ["TWR", "CTAF", "UNICOM", "AFIS", "GND", "APP", "DEP", "ATIS"];

  const rank = (t: any) => {
    const up = String(t ?? "").toUpperCase();
    const idx = priority.indexOf(up);
    return idx === -1 ? 999 : idx;
  };

  const sorted = [...frequencies].sort((a, b) => {
    const ra = rank(a.type);
    const rb = rank(b.type);
    if (ra !== rb) return ra - rb;
    return Number(a.frequency_mhz ?? 0) - Number(b.frequency_mhz ?? 0);
  });

  return sorted[0] ?? null;
}

const asBool = (v: any) => v === true || v === 1 || v === "1";

/* ------------------------------ UI bits ---------------------------- */

function Badge(props: { text: string; tone?: "ok" | "muted" | "warn" }) {
  const tone = props.tone ?? "muted";
  const bg =
    tone === "ok"
      ? "rgba(34,197,94,0.14)"
      : tone === "warn"
      ? "rgba(245,158,11,0.16)"
      : "rgba(255,255,255,0.08)";
  const fg =
    tone === "ok"
      ? "rgba(34,197,94,1)"
      : tone === "warn"
      ? "rgba(245,158,11,1)"
      : "var(--muted)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: bg,
        color: fg,
        border: "1px solid var(--border)",
        letterSpacing: 0.2,
        maxWidth: "100%",
      }}
    >
      {props.text}
    </span>
  );
}

function Card(props: { title: string; subtitle?: string; children?: any }) {
  return (
    <section
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <h2 style={{ fontSize: 22, margin: 0, color: "var(--foreground)", fontWeight: 700 }}>
        {props.title}
      </h2>
      {props.subtitle ? (
        <p style={{ margin: "6px 0 0", color: "var(--muted)", fontWeight: 500 }}>
          {props.subtitle}
        </p>
      ) : null}
      {props.children ? (
        <div style={{ marginTop: 14, minWidth: 0 }}>{props.children}</div>
      ) : null}
    </section>
  );
}

/**
 * Mobile-stable KV row: key can shrink; value wraps long tokens.
 */
function KV(props: { k: string; v: any }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        flexWrap: "wrap",
        minWidth: 0,
      }}
    >
      <div
        style={{
          flex: "0 1 min(170px, 42vw)",
          color: "var(--muted)",
          maxWidth: "100%",
          fontWeight: 600,
        }}
      >
        {props.k}
      </div>
      <div
        style={{
          fontWeight: 600,
          color: "var(--foreground)",
          minWidth: 0,
          flex: "1 1 220px",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {props.v ?? "—"}
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "var(--foreground)",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  display: "inline-block",
  maxWidth: "100%",
};

/* ------------------------------ page ------------------------------- */

export default async function AirportPage(props: any) {
  const p = await props?.params;

  let code = norm(p?.code);
  if (!code) {
    const h = await headers();
    code = codeFromOriginalUri(h.get("x-original-uri"));
  }
  if (!code) notFound();

  const airportRows = await sql/* sql */`
    SELECT
      id,
      ident,
      iata_code,
      name,
      type,
      latitude_deg,
      longitude_deg,
      elevation_ft,
      continent,
      iso_country,
      iso_region,
      municipality,
      scheduled_service,
      gps_code,
      local_code,
      home_link,
      wikipedia_link,
      keywords
    FROM airports
    WHERE ident = ${code} OR iata_code = ${code}
    LIMIT 1
  `;
  const airport = airportRows?.[0];
  if (!airport) notFound();

  const runways = await sql/* sql */`
    SELECT
      id,
      length_ft,
      width_ft,
      surface,
      lighted,
      closed,
      le_ident,
      le_heading_degt,
      he_ident,
      he_heading_degt
    FROM runways
    WHERE airport_ref = ${airport.id}
    ORDER BY length_ft DESC NULLS LAST
  `;

  const frequencies = await sql/* sql */`
    SELECT
      id,
      type,
      description,
      frequency_mhz
    FROM frequencies
    WHERE airport_ref = ${airport.id}
    ORDER BY type ASC, frequency_mhz ASC
  `;

  const navaids = await sql/* sql */`
    SELECT
      id,
      ident,
      name,
      type,
      frequency_khz,
      latitude_deg,
      longitude_deg,
      elevation_ft,
      dme_frequency_khz,
      dme_channel,
      dme_latitude_deg,
      dme_longitude_deg,
      dme_elevation_ft,
      associated_airport
    FROM navaids
    WHERE associated_airport = ${airport.ident}
    ORDER BY type ASC, ident ASC
  `;

  const mapsUrl = googleMapsLink(airport.latitude_deg, airport.longitude_deg);

  const primaryFreq = pickPrimaryFrequency(frequencies);
  const longest = runways?.[0] ?? null;

  const showGps =
    isNonEmpty(airport.gps_code) && norm(airport.gps_code) !== norm(airport.ident);

  const associatedTop = (navaids ?? []).slice(0, 3);

  // Lighting summary (sim reference)
  const totalRunways = runways.length;
  const lightedCount = runways.filter((r: any) => asBool(r.lighted)).length;
  const closedCount = runways.filter((r: any) => asBool(r.closed)).length;

  const lightingBadge =
    totalRunways === 0
      ? null
      : lightedCount > 0
      ? { text: `LIGHTED ${lightedCount}/${totalRunways}`, tone: "ok" as const }
      : { text: "UNLIT (per dataset)", tone: "muted" as const };

  const closedBadge =
    totalRunways === 0
      ? null
      : closedCount > 0
      ? { text: `CLOSED ${closedCount}`, tone: "warn" as const }
      : null;
const base = getBaseUrl();
const canonicalUrl = `${base}/airports/${airport.ident}`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Airport",
  name: airport.name || airport.ident,
  iataCode: airport.iata_code || undefined,
  icaoCode: airport.ident || undefined,
  geo: {
    "@type": "GeoCoordinates",
    latitude: Number(airport.latitude_deg),
    longitude: Number(airport.longitude_deg),
  },
  url: canonicalUrl,
};

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "system-ui",
        minWidth: 0,
      }}
    ><script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>

      <div style={{ marginBottom: 12 }}>
        <Link
          href="/"
          style={{
            color: "var(--foreground)",
            textDecoration: "none",
            fontWeight: 600,
            opacity: 0.9,
            maxWidth: "100%",
            overflowWrap: "anywhere",
          }}
        >
          ← Back
        </Link>
      </div>

      <h1
        style={{
          fontSize: 44,
          letterSpacing: -0.5,
          margin: "8px 0 6px",
          maxWidth: "100%",
          overflowWrap: "anywhere",
          fontWeight: 700,
        }}
      >
        {airport.ident}
      </h1>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", fontWeight: 500 }}>
        Reference only — not for real-world navigation.
      </p>

      <div style={{ height: 18 }} />

      <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
        {/* Key Facts */}
        <Card
          title="Key Facts"
          subtitle="At-a-glance sim reference (runway, elevation, comm)."
        >
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
{/* Runway Summary */}
<div
  style={{
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 12,
    background: "rgba(255,255,255,0.03)",
    minWidth: 0,
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      flexWrap: "wrap",
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontWeight: 700,
        color: "var(--muted)",
        flex: "1 1 160px",
        minWidth: 0,
      }}
    >
      Runway Summary
    </div>

    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "flex-end",
        flex: "0 0 auto",
        maxWidth: "100%",
      }}
    >
      {lightingBadge ? (
        <Badge text={lightingBadge.text} tone={lightingBadge.tone} />
      ) : null}
      {closedBadge ? (
        <Badge text={closedBadge.text} tone={closedBadge.tone} />
      ) : null}
    </div>
  </div>

  {runways.length === 0 ? (
    <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 600 }}>
      No runway data available.
    </div>
  ) : (
    <div style={{ marginTop: 8, display: "grid", gap: 6, minWidth: 0 }}>
      {runways.map((r: any) => {
        const lighted = asBool(r.lighted);
        const closed = asBool(r.closed);

        return (
          <div
            key={r.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex: "1 1 240px",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                fontWeight: 700,
              }}
            >
              {r.le_ident ?? "—"} / {r.he_ident ?? "—"}
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                {" "}
                ·{" "}
                {r.length_ft
                  ? `${r.length_ft} ft / ${fmtMFromFt(r.length_ft)}`
                  : "—"}{" "}
                · {r.surface ?? "—"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                flex: "0 0 auto",
                maxWidth: "100%",
              }}
            >
              {closed ? <Badge text="CLOSED" tone="warn" /> : null}
              {lighted ? (
                <Badge text="LIGHTED" tone="ok" />
              ) : (
                <Badge text="UNLIT" tone="muted" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>


            {/* Elevation */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--muted)" }}>Field Elevation</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, minWidth: 0 }}>
                {fmtFt(airport.elevation_ft)}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                  / {fmtMFromFt(airport.elevation_ft)}
                </span>
              </div>
            </div>

            {/* Primary Frequency */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--muted)" }}>
                Primary / Contact Frequency
              </div>

              {primaryFreq ? (
                <>
                  <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700, minWidth: 0 }}>
                    {String(primaryFreq.type ?? "—").toUpperCase()}{" "}
                    {fmtFreqMHz(primaryFreq.frequency_mhz)}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--muted)",
                      fontWeight: 600,
                      minWidth: 0,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {primaryFreq.description ?? "—"}
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 600 }}>
                  No comm frequency in dataset.
                </div>
              )}
            </div>

            {/* Associated Navaids (top 3) */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--muted)" }}>
                Associated Navaids{" "}
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>
                  (reference only)
                </span>
              </div>

              {associatedTop.length === 0 ? (
                <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 600 }}>
                  No associated navaids in dataset.
                </div>
              ) : (
                <div style={{ marginTop: 8, display: "grid", gap: 6, minWidth: 0 }}>
                  {associatedTop.map((n: any) => (
                    <div
                      key={n.id}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: "1 1 220px",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "var(--foreground)" }}>
                          {n.ident ?? "—"}
                        </span>{" "}
                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                          · {n.type ?? "—"}
                        </span>
                        {n.name ? (
                          <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                            {" "}
                            · {n.name}
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                          maxWidth: "100%",
                        }}
                      >
                        {fmtNavaidFreq(n.frequency_khz) ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
{/* SEO Quick Guide (frozen exception, compact) */}
<section
  style={{
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 16,
    background: "rgba(255,255,255,0.02)",
    minWidth: 0,
    maxWidth: "100%",
  }}
>
  <h2
    style={{
      fontSize: 18,
      margin: 0,
      color: "var(--foreground)",
      fontWeight: 800,
      letterSpacing: -0.2,
    }}
  >
    {airport.ident} in MSFS 2020 / 2024: frequencies, runways, lights
  </h2>

  <p style={{ margin: "8px 0 0", color: "var(--muted)", fontWeight: 500, lineHeight: 1.45 }}>
    {airport.name ? (
      <>
        <strong style={{ color: "var(--foreground)" }}>{airport.name}</strong>{" "}
        {airport.municipality ? <>in {airport.municipality}</> : null}
        {airport.iso_country ? <> ({airport.iso_country})</> : null}
        {" "}— sim reference for quick ATC & runway planning.
      </>
    ) : (
      <>Sim reference for quick ATC & runway planning.</>
    )}
  </p>

  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
    {/* Runway sentence */}
    <p style={{ margin: 0, color: "var(--muted)", fontWeight: 500, lineHeight: 1.45 }}>
      <strong style={{ color: "var(--foreground)" }}>Runways:</strong>{" "}
      {totalRunways > 0 ? (
        <>
          {totalRunways} listed.{" "}
          {runways.length > 0 ? (
            <>
              Longest is{" "}
              <strong style={{ color: "var(--foreground)" }}>
                {runways[0]?.le_ident ?? "—"}/{runways[0]?.he_ident ?? "—"}
              </strong>{" "}
              at{" "}
              <strong style={{ color: "var(--foreground)" }}>
                {runways[0]?.length_ft ? `${runways[0].length_ft} ft` : "—"}
              </strong>
              {" "}({runways[0]?.length_ft ? fmtMFromFt(runways[0].length_ft) : "—"}).
            </>
          ) : null}{" "}
          Lighting:{" "}
          <strong style={{ color: "var(--foreground)" }}>
            {lightedCount}/{totalRunways} lighted
          </strong>
          {" "} (dataset).
        </>
      ) : (
        <>No runway data available in dataset.</>
      )}
    </p>

    {/* Primary frequency sentence */}
    <p style={{ margin: 0, color: "var(--muted)", fontWeight: 500, lineHeight: 1.45 }}>
      <strong style={{ color: "var(--foreground)" }}>Primary frequency:</strong>{" "}
      {primaryFreq ? (
        <>
          <strong style={{ color: "var(--foreground)" }}>
            {String(primaryFreq.type ?? "").toUpperCase()} {fmtFreqMHz(primaryFreq.frequency_mhz)}
          </strong>
          {primaryFreq.description ? <> ({primaryFreq.description})</> : null}.
        </>
      ) : (
        <>No comm frequency in dataset.</>
      )}
      {" "}Use for MSFS planning only — not for real-world navigation.
    </p>

    {/* Optional navaid line */}
    <p style={{ margin: 0, color: "var(--muted)", fontWeight: 500, lineHeight: 1.45 }}>
      <strong style={{ color: "var(--foreground)" }}>Navaids:</strong>{" "}
      {navaids.length > 0 ? (
        <>
          {Math.min(navaids.length, 5)} shown below (VOR/NDB/DME where available). If an ILS/LOC is missing,
          the dataset may not include it for this airport.
        </>
      ) : (
        <>No navaids listed for this airport in dataset.</>
      )}
    </p>
  </div>

  {/* Mini keyword footer (helps indexing, looks neutral) */}
  <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13, fontWeight: 500 }}>
    Keywords: {airport.ident}
    {airport.iata_code ? ` ${airport.iata_code}` : ""} runway lights, tower frequency, ground, atis, approach,
    MSFS 2020, MSFS 2024.
  </div>
</section>

        {/* Airport Info */}
        <Card title="Airport Info" subtitle="Name, codes, location, coordinates, elevation.">
          <KV k="Name" v={airport.name ?? "—"} />
          <KV k="Codes" v={`${airport.iata_code ?? "—"} / ${airport.ident}`} />
          <KV k="Type" v={airport.type ?? "—"} />
          <KV k="City" v={airport.municipality ?? "—"} />
          <KV k="Country" v={airport.iso_country ?? "—"} />
          <KV k="Region" v={airport.iso_region ?? "—"} />
          <KV k="Continent" v={airport.continent ?? "—"} />

          <KV
            k="Coordinates"
            v={
              mapsUrl ? (
                <a href={mapsUrl} target="_blank" style={linkStyle}>
                  {fmtCoord(airport.latitude_deg)}, {fmtCoord(airport.longitude_deg)}
                </a>
              ) : (
                `${fmtCoord(airport.latitude_deg)}, ${fmtCoord(airport.longitude_deg)}`
              )
            }
          />
          <KV k="Elevation" v={fmtFt(airport.elevation_ft)} />
          <KV k="Scheduled Service" v={airport.scheduled_service ?? "—"} />
          {showGps && <KV k="GPS / Local ident" v={airport.gps_code ?? "—"} />}
          <KV k="Local Code" v={airport.local_code ?? "—"} />

          {(isNonEmpty(airport.wikipedia_link) || isNonEmpty(airport.home_link)) && (
            <div style={{ marginTop: 10, minWidth: 0 }}>
              {isNonEmpty(airport.wikipedia_link) && (
                <div style={{ padding: "6px 0", minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-block",
                      color: "var(--muted)",
                      width: "min(170px, 42vw)",
                      maxWidth: "100%",
                      verticalAlign: "top",
                      fontWeight: 600,
                    }}
                  >
                    Wikipedia
                  </span>
                  <a href={airport.wikipedia_link} target="_blank" style={linkStyle}>
                    {airport.wikipedia_link}
                  </a>
                </div>
              )}
              {isNonEmpty(airport.home_link) && (
                <div style={{ padding: "6px 0", minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-block",
                      color: "var(--muted)",
                      width: "min(170px, 42vw)",
                      maxWidth: "100%",
                      verticalAlign: "top",
                      fontWeight: 600,
                    }}
                  >
                    Website
                  </span>
                  <a href={airport.home_link} target="_blank" style={linkStyle}>
                    {airport.home_link}
                  </a>
                </div>
              )}
            </div>
          )}

          {isNonEmpty(airport.keywords) && (
            <div
              style={{
                marginTop: 10,
                color: "var(--muted)",
                fontSize: 14,
                minWidth: 0,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                fontWeight: 500,
              }}
            >
              <strong style={{ color: "var(--foreground)", fontWeight: 700 }}>
                Keywords:
              </strong>{" "}
              {airport.keywords}
            </div>
          )}
        </Card>

        {/* Runways */}
        <Card title="Runways" subtitle="Runway list (length, surface, heading, lights).">
          {runways.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)", fontWeight: 500 }}>
              No runway records found.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              {runways.map((r: any) => {
                const lighted = asBool(r.lighted);
                const closed = asBool(r.closed);

                return (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(255,255,255,0.03)",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 12,
                        flexWrap: "wrap",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          minWidth: 0,
                          flex: "1 1 140px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {r.le_ident ?? "—"} / {r.he_ident ?? "—"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                          flex: "0 0 auto",
                          maxWidth: "100%",
                        }}
                      >
                        {closed ? <Badge text="CLOSED" tone="warn" /> : null}
                        {lighted ? (
                          <Badge text="LIGHTED" tone="ok" />
                        ) : (
                          <Badge text="UNLIT (dataset)" tone="muted" />
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "var(--muted)",
                        marginTop: 6,
                        fontWeight: 600,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {r.length_ft ? `${r.length_ft} ft / ${fmtMFromFt(r.length_ft)}` : "—"} ·{" "}
                      {r.surface ?? "—"} · HDG {r.le_heading_degt ?? "—"}° /{" "}
                      {r.he_heading_degt ?? "—"}°
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Frequencies */}
        <Card title="Frequencies" subtitle="TWR, GND, ATIS, APP, etc.">
          {frequencies.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)", fontWeight: 500 }}>
              No frequency records found.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              {frequencies.map((f: any) => (
                <div
                  key={f.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                    background: "rgba(255,255,255,0.03)",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      flex: "1 1 220px",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--foreground)" }}>
                      {String(f.type ?? "—").toUpperCase()}
                    </div>
                    {f.description ? (
                      <div style={{ color: "var(--muted)", fontWeight: 500, marginTop: 4 }}>
                        {f.description}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--foreground)",
                      whiteSpace: "nowrap",
                      flex: "0 0 auto",
                      maxWidth: "100%",
                    }}
                  >
                    {fmtFreqMHz(f.frequency_mhz)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Navaids */}
        <Card title="Navaids" subtitle="VOR/NDB/DME (dataset where available).">
          {navaids.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)", fontWeight: 500 }}>
              No navaid records found for this airport.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              {navaids.map((n: any) => {
                const hasPos =
                  Number.isFinite(Number(n.latitude_deg)) &&
                  Number.isFinite(Number(n.longitude_deg));

                const maps = hasPos
                  ? `https://www.google.com/maps?q=${Number(n.latitude_deg)},${Number(
                      n.longitude_deg
                    )}`
                  : null;

                return (
                  <div
                    key={n.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 12,
                      background: "rgba(255,255,255,0.03)",
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>
                      {n.ident ?? "—"} · {n.type ?? "—"}
                      {fmtNavaidFreq(n.frequency_khz) ? (
                        <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                          {" "}
                          · {fmtNavaidFreq(n.frequency_khz)}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        color: "var(--muted)",
                        marginTop: 4,
                        fontWeight: 500,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {n.name ?? "—"}
                    </div>

                    <div style={{ color: "var(--muted)", marginTop: 4, fontWeight: 600, minWidth: 0 }}>
                      {maps ? (
                        <a href={maps} target="_blank" style={{ ...linkStyle, fontWeight: 600 }}>
                          {fmtCoord(n.latitude_deg)}, {fmtCoord(n.longitude_deg)}
                        </a>
                      ) : (
                        `${fmtCoord(n.latitude_deg)}, ${fmtCoord(n.longitude_deg)}`
                      )}
                      {" · "}
                      {fmtFt(n.elevation_ft)}
                    </div>

                    {(n.dme_channel || n.dme_frequency_khz) && (
                      <div
                        style={{
                          color: "var(--muted)",
                          marginTop: 6,
                          fontWeight: 500,
                          minWidth: 0,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        <strong style={{ color: "var(--foreground)", fontWeight: 700 }}>
                          DME:
                        </strong>{" "}
                        {n.dme_channel ? `CH ${n.dme_channel}` : ""}
                        {n.dme_channel && n.dme_frequency_khz ? " · " : ""}
                        {n.dme_frequency_khz ? `${Math.round(Number(n.dme_frequency_khz))} kHz` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ padding: "10px 2px", color: "var(--muted)", fontSize: 14, minWidth: 0, fontWeight: 500 }}>
          Data: OurAirports (Public Domain). No guarantee of accuracy.
        </div>
      </div>
    </main>
  );
}
