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

function isNonEmpty(s: any) {
  return typeof s === "string" && s.trim().length > 0;
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
      ? "rgba(34,197,94,0.14)"
      : tone === "warn"
      ? "rgba(245,158,11,0.16)"
      : "rgba(255,255,255,0.10)";
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
        fontWeight: 800,
        background: bg,
        color: fg,
        border: "1px solid var(--border)",
        letterSpacing: 0.2,
        // safety for tiny screens
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
        // IMPORTANT: allow shrinking inside grid to avoid overflow on mobile
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <h2 style={{ fontSize: 22, margin: 0, color: "var(--foreground)" }}>
        {props.title}
      </h2>
      {props.subtitle ? (
        <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
          {props.subtitle}
        </p>
      ) : null}
      {props.children ? <div style={{ marginTop: 14, minWidth: 0 }}>{props.children}</div> : null}
    </section>
  );
}

/**
 * KV rows were a main source of "gequetscht" layout on phones because the key had a hard 170px.
 * This version keeps the two-column look on larger screens, but on mobile it can shrink and wrap cleanly.
 */
function KV(props: { k: string; v: any }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        flexWrap: "wrap",
        // allow flex items to shrink inside grid/cards
        minWidth: 0,
      }}
    >
      <div
        style={{
          // was fixed 170px → too wide on small screens
          flex: "0 1 min(170px, 42vw)",
          color: "var(--muted)",
          maxWidth: "100%",
        }}
      >
        {props.k}
      </div>
      <div
        style={{
          fontWeight: 600,
          color: "var(--foreground)",
          // allow long tokens (URLs, coords, etc.) to wrap instead of forcing width
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

  // Key Facts
  const longest = runways?.[0] ?? null;
  const primaryFreq = pickPrimaryFrequency(frequencies);

  const isLighted = (r: any) => String(r?.lighted) === "1" || r?.lighted === true;
  const isClosed = (r: any) => String(r?.closed) === "1" || r?.closed === true;

  const showGps =
    isNonEmpty(airport.gps_code) && norm(airport.gps_code) !== norm(airport.ident);

  const associatedTop = (navaids ?? []).slice(0, 3);

  const linkStyle = {
    fontWeight: 700,
    color: "var(--foreground)",
    // IMPORTANT: long URLs must wrap on mobile
    overflowWrap: "anywhere" as const,
    wordBreak: "break-word" as const,
    display: "inline-block",
    maxWidth: "100%",
  };

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "system-ui",
        // IMPORTANT: allow children to shrink; prevents grid overflow weirdness
        minWidth: 0,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/"
          style={{
            color: "var(--foreground)",
            textDecoration: "none",
            fontWeight: 700,
            opacity: 0.9,
            // safety for narrow screens
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
          // prevent giant header from forcing width
          maxWidth: "100%",
          overflowWrap: "anywhere",
        }}
      >
        {airport.ident}
      </h1>
      <p style={{ margin: 0, fontSize: 18, color: "var(--muted)", maxWidth: "100%" }}>
        Reference only — not for real-world navigation.
      </p>

      <div style={{ height: 18 }} />

      <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
        {/* Key Facts */}
        <Card title="Key Facts" subtitle="At-a-glance sim reference (runway, elevation, primary comm).">
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
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
                <div style={{ fontWeight: 800, color: "var(--muted)", flex: "1 1 160px", minWidth: 0 }}>
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
                  {/* your badges / status here */}
                </div>
              </div>

              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, minWidth: 0, overflowWrap: "anywhere" }}>
                {longest ? (
                  <>
                    {longest.le_ident ?? "—"} / {longest.he_ident ?? "—"}{" "}
                    <span style={{ color: "var(--muted)", fontWeight: 700 }}>
                      ·{" "}
                      {longest.length_ft
                        ? `${longest.length_ft} ft / ${fmtMFromFt(longest.length_ft)}`
                        : "—"}{" "}
                      · {longest.surface ?? "—"}
                    </span>
                  </>
                ) : (
                  <span style={{ color: "var(--muted)" }}>—</span>
                )}
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--muted)" }}>Field Elevation</div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, minWidth: 0 }}>
                {fmtFt(airport.elevation_ft)}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 700 }}>
                  / {fmtMFromFt(airport.elevation_ft)}
                </span>
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--muted)" }}>
                Primary / Contact Frequency
              </div>

              {primaryFreq ? (
                <>
                  <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, minWidth: 0 }}>
                    {String(primaryFreq.type ?? "—").toUpperCase()}{" "}
                    {fmtFreqMHz(primaryFreq.frequency_mhz)}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--muted)",
                      fontWeight: 700,
                      minWidth: 0,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {primaryFreq.description ?? "—"}
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 700 }}>
                  No comm frequency in dataset.
                </div>
              )}
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 800, color: "var(--muted)" }}>
                Associated Navaids{" "}
                <span style={{ fontWeight: 700, color: "var(--foreground)" }}>
                  (reference only)
                </span>
              </div>

              {associatedTop.length === 0 ? (
                <div style={{ marginTop: 6, color: "var(--muted)", fontWeight: 700 }}>
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
                        <span style={{ fontWeight: 900, color: "var(--foreground)" }}>
                          {n.ident ?? "—"}
                        </span>{" "}
                        <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                          · {n.type ?? "—"}
                        </span>
                        {n.name ? (
                          <span style={{ color: "var(--muted)", fontWeight: 700 }}>
                            {" "}
                            · {n.name}
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
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
                      // was hard 170px → shrink on mobile
                      width: "min(170px, 42vw)",
                      maxWidth: "100%",
                      verticalAlign: "top",
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
              }}
            >
              <strong style={{ color: "var(--foreground)" }}>Keywords:</strong>{" "}
              {airport.keywords}
            </div>
          )}
        </Card>

        {/* Runways */}
        <Card title="Runways" subtitle="Runway list (length, surface, heading).">
          {runways.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>No runway records found.</p>
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              {runways.map((r: any) => {
                const lighted = isLighted(r);
                const closed = isClosed(r);

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
                      <div style={{ fontWeight: 900, minWidth: 0, flex: "1 1 140px", overflowWrap: "anywhere" }}>
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
                        {/* keep your badges here */}
                        {/* Example:
                        {closed ? <Badge text="CLOSED" tone="warn" /> : null}
                        {lighted ? <Badge text="LIGHTED" tone="ok" /> : <Badge text="UNLIT" tone="muted" />}
                        */}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "var(--muted)",
                        marginTop: 6,
                        fontWeight: 700,
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
            <p style={{ margin: 0, color: "var(--muted)" }}>No frequency records found.</p>
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
                    <div style={{ fontWeight: 900, color: "var(--foreground)" }}>
                      {String(f.type ?? "—").toUpperCase()}
                    </div>
                    {f.description ? (
                      <div style={{ color: "var(--muted)", fontWeight: 700, marginTop: 4 }}>
                        {f.description}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontWeight: 900,
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
            <p style={{ margin: 0, color: "var(--muted)" }}>No navaid records found for this airport.</p>
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              {navaids.map((n: any) => {
                const hasPos =
                  Number.isFinite(Number(n.latitude_deg)) &&
                  Number.isFinite(Number(n.longitude_deg));

                const maps = hasPos
                  ? `https://www.google.com/maps?q=${Number(n.latitude_deg)},${Number(n.longitude_deg)}`
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
                    <div style={{ fontWeight: 900, minWidth: 0, overflowWrap: "anywhere" }}>
                      {n.ident ?? "—"} · {n.type ?? "—"}
                      {fmtNavaidFreq(n.frequency_khz) ? (
                        <span style={{ color: "var(--muted)", fontWeight: 800 }}>
                          {" "}
                          · {fmtNavaidFreq(n.frequency_khz)}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        color: "var(--muted)",
                        marginTop: 4,
                        fontWeight: 700,
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {n.name ?? "—"}
                    </div>

                    <div style={{ color: "var(--muted)", marginTop: 4, fontWeight: 700, minWidth: 0 }}>
                      {maps ? (
                        <a href={maps} target="_blank" style={{ ...linkStyle, fontWeight: 800 }}>
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
                          fontWeight: 700,
                          minWidth: 0,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        <strong style={{ color: "var(--foreground)" }}>DME:</strong>{" "}
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

        <div style={{ padding: "10px 2px", color: "var(--muted)", fontSize: 14, minWidth: 0 }}>
          Data: OurAirports (Public Domain). No guarantee of accuracy.
        </div>
      </div>
    </main>
  );
}
