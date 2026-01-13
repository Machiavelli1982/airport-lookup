// web/app/airports/[code]/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function norm(input: unknown) {
  return String(input ?? "").trim().toUpperCase();
}

function codeFromOriginalUri(originalUri: string | null) {
  if (!originalUri) return "";
  const path = originalUri.split("?")[0] || "";
  const m = path.match(/^\/airports\/([^/]+)$/i);
  return m ? norm(decodeURIComponent(m[1])) : "";
}

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

function ftToM(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.round(x * 0.3048);
}

function fmtFtM(n: any) {
  const ft = Number(n);
  if (!Number.isFinite(ft)) return "—";
  const m = ftToM(ft);
  return m ? `${Math.round(ft)} ft / ${m} m` : `${Math.round(ft)} ft`;
}

function googleMapsLink(lat: any, lon: any) {
  const la = Number(lat);
  const lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  return `https://www.google.com/maps?q=${la},${lo}`;
}

function Badge(props: { text: string; tone?: "ok" | "muted" | "warn" }) {
  const tone = props.tone ?? "muted";
  const bg =
    tone === "ok"
      ? "rgba(34,197,94,0.12)"
      : tone === "warn"
      ? "rgba(245,158,11,0.12)"
      : "rgba(0,0,0,0.06)";
  const fg =
    tone === "ok"
      ? "rgba(22,163,74,1)"
      : tone === "warn"
      ? "rgba(217,119,6,1)"
      : "rgba(0,0,0,0.65)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color: fg,
        border: "1px solid rgba(0,0,0,0.06)",
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {props.text}
    </span>
  );
}

function Card(props: {
  title: string;
  subtitle?: string;
  children?: any;
  right?: any;
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, margin: 0 }}>{props.title}</h2>
          {props.subtitle ? (
            <p style={{ margin: "6px 0 0", color: "rgba(0,0,0,0.65)" }}>
              {props.subtitle}
            </p>
          ) : null}
        </div>
        {props.right ? <div>{props.right}</div> : null}
      </div>

      {props.children ? (
        <div style={{ marginTop: 14, minWidth: 0 }}>{props.children}</div>
      ) : null}
    </section>
  );
}

function KV(props: { k: string; v: any }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      <div style={{ width: 170, color: "rgba(0,0,0,0.65)", flex: "0 0 auto" }}>
        {props.k}
      </div>
      <div
        style={{
          fontWeight: 600,
          minWidth: 0,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {props.v ?? "—"}
      </div>
    </div>
  );
}

function formatNavaidFrequency(frequency_khz: any) {
  const x = Number(frequency_khz);
  if (!Number.isFinite(x) || x <= 0) return null;

  // OurAirports: everything stored in kHz.
  // NDB = true kHz. VOR/LOC/ILS are in MHz-band but stored as kHz (e.g., 110400 => 110.40 MHz).
  if (x >= 100000) {
    const mhz = x / 1000;
    return `${mhz.toFixed(2)} MHz`;
  }
  return `${Math.round(x)} kHz`;
}

function formatFreqMHz(frequency_mhz: any) {
  // Frequencies table is frequency_mhz. Format with 2 decimals if numeric.
  const x = Number(frequency_mhz);
  if (!Number.isFinite(x) || x <= 0) return null;
  return `${x.toFixed(2)} MHz`;
}

function pickPrimaryFrequency(freqs: any[]) {
  if (!Array.isArray(freqs) || freqs.length === 0) return null;

  const pri: RegExp[] = [
    /(^|\b)(twr|tower)(\b|$)/i,
    /(^|\b)(ctaf|unicom)(\b|$)/i,
    /(^|\b)(afis)(\b|$)/i,
    /(^|\b)(gnd|ground)(\b|$)/i,
    /(^|\b)(app|approach|dep|departure)(\b|$)/i,
    /(^|\b)(atis)(\b|$)/i,
  ];

  const hay = (f: any) => `${f?.type ?? ""} ${f?.description ?? ""}`.trim();

  for (const rx of pri) {
    const hit = freqs.find((f) => rx.test(hay(f)));
    if (hit) return hit;
  }
  return freqs[0] ?? null;
}

function navaidTypeRank(t: any) {
  const s = String(t ?? "").toUpperCase();
  // Prefer VOR/DME-ish over NDB; keep it simple and non-operational.
  if (s.includes("VOR")) return 1;
  if (s.includes("DME")) return 2;
  if (s.includes("TACAN")) return 3;
  if (s.includes("NDB")) return 5;
  if (s.includes("LOC") || s.includes("ILS")) return 6;
  return 9;
}

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
    ORDER BY
      type ASC,
      ident ASC
  `;

  const mapsUrl = googleMapsLink(airport.latitude_deg, airport.longitude_deg);

  const showGpsCode =
    isNonEmpty(airport.gps_code) && norm(airport.gps_code) !== norm(airport.ident);

  const bestRunway = runways?.[0] ?? null;
  const bestRunwayLighted =
    bestRunway &&
    (String(bestRunway.lighted) === "1" || bestRunway.lighted === true);
  const bestRunwayClosed =
    bestRunway && (String(bestRunway.closed) === "1" || bestRunway.closed === true);

  const primaryFreq = pickPrimaryFrequency(frequencies);
  const primaryFreqText =
    primaryFreq && primaryFreq.frequency_mhz
      ? `${primaryFreq.type ?? "—"} ${formatFreqMHz(primaryFreq.frequency_mhz) ?? "—"}`
      : null;

  const topNavaids = Array.isArray(navaids)
    ? [...navaids]
        .sort((a: any, b: any) => {
          const ra = navaidTypeRank(a?.type);
          const rb = navaidTypeRank(b?.type);
          if (ra !== rb) return ra - rb;
          return String(a?.ident ?? "").localeCompare(String(b?.ident ?? ""));
        })
        .slice(0, 3)
    : [];

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "system-ui",
        overflowX: "hidden",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "rgba(0,0,0,0.7)", textDecoration: "none" }}>
          ← Back
        </Link>
      </div>

      <h1 style={{ fontSize: 44, letterSpacing: -0.5, margin: "8px 0 6px" }}>
        {airport.ident}
      </h1>
      <p style={{ margin: 0, fontSize: 18, color: "rgba(0,0,0,0.65)" }}>
        Reference only — not for real-world navigation.
      </p>

      <div style={{ height: 18 }} />

      <div style={{ display: "grid", gap: 14 }}>
        {/* Key Facts */}
        <Card
          title="Key Facts"
          subtitle="At-a-glance sim reference (runway, elevation, primary comm)."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {/* Runway Summary */}
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                    Runway Summary
                  </div>
                  {bestRunway ? (
                    <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                      <strong style={{ color: "rgba(0,0,0,0.85)" }}>
                        {bestRunway.le_ident ?? "—"} / {bestRunway.he_ident ?? "—"}
                      </strong>
                      {" · "}
                      {bestRunway.length_ft ? fmtFtM(bestRunway.length_ft) : "—"}
                      {" · "}
                      {bestRunway.surface ?? "—"}
                    </div>
                  ) : (
                    <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                      No runway records found.
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {bestRunway ? (
                    <>
                      <Badge
                        text={bestRunwayLighted ? "Lighted" : "Unlit"}
                        tone={bestRunwayLighted ? "ok" : "muted"}
                      />
                      {bestRunwayClosed ? <Badge text="Closed" tone="warn" /> : null}
                    </>
                  ) : (
                    <Badge text="No RWY data" tone="muted" />
                  )}
                </div>
              </div>
            </div>

            {/* Elevation + Primary Frequency */}
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "1fr",
              }}
            >
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900 }}>Field Elevation</div>
                <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                  {airport.elevation_ft
                    ? `${fmtFt(airport.elevation_ft)}${
                        ftToM(airport.elevation_ft) ? ` / ${ftToM(airport.elevation_ft)} m` : ""
                      }`
                    : "—"}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900 }}>Primary / Contact Frequency</div>
                <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                  {primaryFreqText ? (
                    <span style={{ fontWeight: 800, color: "rgba(0,0,0,0.85)" }}>
                      {primaryFreq.type ?? "—"}{" "}
                      {formatFreqMHz(primaryFreq.frequency_mhz) ?? "—"}
                    </span>
                  ) : (
                    "No comm frequency in dataset."
                  )}
                </div>
                {primaryFreq?.description ? (
                  <div style={{ color: "rgba(0,0,0,0.55)", marginTop: 4 }}>
                    {primaryFreq.description}
                  </div>
                ) : null}
              </div>

              {/* Optional: Associated Navaids (non-operational) */}
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 900, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  Associated Navaids{" "}
                  <span style={{ fontWeight: 700, color: "rgba(0,0,0,0.5)" }}>
                    (reference only)
                  </span>
                </div>
                {topNavaids.length === 0 ? (
                  <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                    No navaid records found for this airport.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    {topNavaids.map((n: any) => {
                      const f = formatNavaidFrequency(n.frequency_khz);
                      return (
                        <div
                          key={n.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                            <strong>{n.ident ?? "—"}</strong> · {n.type ?? "—"}
                            {n.name ? (
                              <span style={{ color: "rgba(0,0,0,0.55)" }}>
                                {" "}
                                · {n.name}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                            {f ?? "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

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
                <a
                  href={mapsUrl}
                  target="_blank"
                  style={{ fontWeight: 700, overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  {fmtCoord(airport.latitude_deg)}, {fmtCoord(airport.longitude_deg)}
                </a>
              ) : (
                `${fmtCoord(airport.latitude_deg)}, ${fmtCoord(airport.longitude_deg)}`
              )
            }
          />
          <KV k="Elevation" v={fmtFt(airport.elevation_ft)} />
          <KV k="Scheduled Service" v={airport.scheduled_service ?? "—"} />

          {showGpsCode ? <KV k="GPS / Local ident" v={airport.gps_code} /> : null}
          <KV k="Local Code" v={airport.local_code ?? "—"} />

          {(isNonEmpty(airport.wikipedia_link) || isNonEmpty(airport.home_link)) && (
            <div style={{ marginTop: 10 }}>
              {isNonEmpty(airport.wikipedia_link) && (
                <div style={{ padding: "6px 0" }}>
                  <span
                    style={{
                      width: 170,
                      display: "inline-block",
                      color: "rgba(0,0,0,0.65)",
                    }}
                  >
                    Wikipedia
                  </span>
                  <a
                    href={airport.wikipedia_link}
                    target="_blank"
                    style={{ fontWeight: 700, overflowWrap: "anywhere", wordBreak: "break-word" }}
                  >
                    {airport.wikipedia_link}
                  </a>
                </div>
              )}
              {isNonEmpty(airport.home_link) && (
                <div style={{ padding: "6px 0" }}>
                  <span
                    style={{
                      width: 170,
                      display: "inline-block",
                      color: "rgba(0,0,0,0.65)",
                    }}
                  >
                    Website
                  </span>
                  <a
                    href={airport.home_link}
                    target="_blank"
                    style={{ fontWeight: 700, overflowWrap: "anywhere", wordBreak: "break-word" }}
                  >
                    {airport.home_link}
                  </a>
                </div>
              )}
            </div>
          )}

          {isNonEmpty(airport.keywords) && (
            <div style={{ marginTop: 10, color: "rgba(0,0,0,0.65)", fontSize: 14 }}>
              <strong style={{ color: "rgba(0,0,0,0.75)" }}>Keywords:</strong>{" "}
              <span style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>
                {airport.keywords}
              </span>
            </div>
          )}
        </Card>

        <Card title="Runways" subtitle="Runway list (length, surface, heading).">
          {runways.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(0,0,0,0.65)" }}>No runway records found.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {runways.map((r: any) => {
                const lighted = String(r.lighted) === "1" || r.lighted === true;
                const closed = String(r.closed) === "1" || r.closed === true;

                return (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 14,
                      padding: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontWeight: 800, overflowWrap: "anywhere" }}>
                        {r.le_ident ?? "—"} / {r.he_ident ?? "—"}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge text={lighted ? "Lighted" : "Unlit"} tone={lighted ? "ok" : "muted"} />
                        {closed && <Badge text="Closed" tone="warn" />}
                      </div>
                    </div>

                    <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 6 }}>
                      {r.length_ft ? fmtFtM(r.length_ft) : "—"} · {r.surface ?? "—"} · HDG{" "}
                      {r.le_heading_degt ?? "—"}° / {r.he_heading_degt ?? "—"}°
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Frequencies (kept as full list; accordion later if desired) */}
        <Card title="Frequencies" subtitle="TWR, GND, ATIS, APP, etc.">
          {frequencies.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(0,0,0,0.65)" }}>No frequency records found.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {frequencies.map((f: any) => (
                <div
                  key={f.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, overflowWrap: "anywhere" }}>{f.type ?? "—"}</div>
                    <div
                      style={{
                        color: "rgba(0,0,0,0.65)",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {f.description ?? "—"}
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                    {formatFreqMHz(f.frequency_mhz) ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Navaids */}
        <Card title="Navaids" subtitle="VOR/NDB/DME/ILS (where available).">
          {navaids.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(0,0,0,0.65)" }}>
              No navaid records found for this airport.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {navaids.map((n: any) => {
                const hasPos =
                  Number.isFinite(Number(n.latitude_deg)) &&
                  Number.isFinite(Number(n.longitude_deg));

                const maps = hasPos
                  ? `https://www.google.com/maps?q=${Number(n.latitude_deg)},${Number(
                      n.longitude_deg
                    )}`
                  : null;

                const nFreq = formatNavaidFrequency(n.frequency_khz);
                const dmeFreq = formatNavaidFrequency(n.dme_frequency_khz);

                return (
                  <div
                    key={n.id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 14,
                      padding: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                      {n.ident ?? "—"} · {n.type ?? "—"}
                      {nFreq ? ` · ${nFreq}` : ""}
                    </div>

                    <div
                      style={{
                        color: "rgba(0,0,0,0.65)",
                        marginTop: 4,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {n.name ?? "—"}
                    </div>

                    <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                      {maps ? (
                        <a
                          href={maps}
                          target="_blank"
                          style={{
                            fontWeight: 700,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                          }}
                        >
                          {fmtCoord(n.latitude_deg)}, {fmtCoord(n.longitude_deg)}
                        </a>
                      ) : (
                        `${fmtCoord(n.latitude_deg)}, ${fmtCoord(n.longitude_deg)}`
                      )}
                      {" · "}
                      {fmtFt(n.elevation_ft)}
                    </div>

                    {(n.dme_channel || n.dme_frequency_khz) && (
                      <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 6 }}>
                        <strong style={{ color: "rgba(0,0,0,0.75)" }}>DME:</strong>{" "}
                        {n.dme_channel ? `CH ${n.dme_channel}` : ""}
                        {n.dme_channel && dmeFreq ? " · " : ""}
                        {dmeFreq ? dmeFreq : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ padding: "10px 2px", color: "rgba(0,0,0,0.55)", fontSize: 14 }}>
          Data: OurAirports (Public Domain). No guarantee of accuracy.
        </div>
      </div>
    </main>
  );
}
