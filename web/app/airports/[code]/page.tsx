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
      }}
    >
      {props.text}
    </span>
  );
}


function fmtFt(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x)} ft`;
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

function Card(props: { title: string; subtitle?: string; children?: any }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}
    >
      <h2 style={{ fontSize: 22, margin: 0 }}>{props.title}</h2>
      {props.subtitle ? (
        <p style={{ margin: "6px 0 0", color: "rgba(0,0,0,0.65)" }}>
          {props.subtitle}
        </p>
      ) : null}
      {props.children ? <div style={{ marginTop: 14 }}>{props.children}</div> : null}
    </section>
  );
}

function KV(props: { k: string; v: any }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "6px 0" }}>
      <div style={{ width: 170, color: "rgba(0,0,0,0.65)" }}>{props.k}</div>
      <div style={{ fontWeight: 600 }}>{props.v ?? "—"}</div>
    </div>
  );
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

  // Runways: headings heißen bei dir ..._degt
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

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "system-ui",
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
                <a href={mapsUrl} target="_blank" style={{ fontWeight: 700 }}>
                  {fmtCoord(airport.latitude_deg)}, {fmtCoord(airport.longitude_deg)}
                </a>
              ) : (
                `${fmtCoord(airport.latitude_deg)}, ${fmtCoord(airport.longitude_deg)}`
              )
            }
          />
          <KV k="Elevation" v={fmtFt(airport.elevation_ft)} />
          <KV k="Scheduled Service" v={airport.scheduled_service ?? "—"} />
          <KV k="GPS Code" v={airport.gps_code ?? "—"} />
          <KV k="Local Code" v={airport.local_code ?? "—"} />

          {(isNonEmpty(airport.wikipedia_link) || isNonEmpty(airport.home_link)) && (
            <div style={{ marginTop: 10 }}>
              {isNonEmpty(airport.wikipedia_link) && (
                <div style={{ padding: "6px 0" }}>
                  <span style={{ width: 170, display: "inline-block", color: "rgba(0,0,0,0.65)" }}>
                    Wikipedia
                  </span>
                  <a href={airport.wikipedia_link} target="_blank" style={{ fontWeight: 700 }}>
                    {airport.wikipedia_link}
                  </a>
                </div>
              )}
              {isNonEmpty(airport.home_link) && (
                <div style={{ padding: "6px 0" }}>
                  <span style={{ width: 170, display: "inline-block", color: "rgba(0,0,0,0.65)" }}>
                    Website
                  </span>
                  <a href={airport.home_link} target="_blank" style={{ fontWeight: 700 }}>
                    {airport.home_link}
                  </a>
                </div>
              )}
            </div>
          )}

          {isNonEmpty(airport.keywords) && (
            <div style={{ marginTop: 10, color: "rgba(0,0,0,0.65)", fontSize: 14 }}>
              <strong style={{ color: "rgba(0,0,0,0.75)" }}>Keywords:</strong>{" "}
              {airport.keywords}
            </div>
          )}
        </Card>

        <Card title="Runways" subtitle="Runway list (length, surface, heading).">
          {runways.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(0,0,0,0.65)" }}>
              No runway records found.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {runways.map((r) => {
  const lighted = String(r.lighted) === "1" || r.lighted === true;
  const closed = String(r.closed) === "1" || r.closed === true;

  return (
    <div
      key={r.id}
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>
          {r.le_ident ?? "—"} / {r.he_ident ?? "—"}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge text={lighted ? "Lighted" : "Unlit"} tone={lighted ? "ok" : "muted"} />
          {closed && <Badge text="Closed" tone="warn" />}
        </div>
      </div>

      <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 6 }}>
        {r.length_ft ? `${r.length_ft} ft` : "—"} · {r.surface ?? "—"} ·
        HDG {r.le_heading_degt ?? "—"}° / {r.he_heading_degt ?? "—"}°
      </div>
    </div>
  );
})}

            </div>
          )}
        </Card>

        <Card title="Frequencies" subtitle="TWR, GND, ATIS, APP, etc.">
          {frequencies.length === 0 ? (
            <p style={{ margin: 0, color: "rgba(0,0,0,0.65)" }}>
              No frequency records found.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {frequencies.map((f) => (
                <div
                  key={f.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>{f.type ?? "—"}</div>
                    <div style={{ color: "rgba(0,0,0,0.65)" }}>
                      {f.description ?? "—"}
                    </div>
                  </div>
                  <div style={{ fontWeight: 900 }}>
                    {f.frequency_mhz ? `${f.frequency_mhz} MHz` : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

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

                const maps =
                  hasPos
                    ? `https://www.google.com/maps?q=${Number(n.latitude_deg)},${Number(
                        n.longitude_deg
                      )}`
                    : null;

                return (
                  <div
                    key={n.id}
                    style={{
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>
                      {n.ident ?? "—"} · {n.type ?? "—"}
                      {n.frequency_khz ? ` · ${n.frequency_khz} kHz` : ""}
                    </div>

                    <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                      {n.name ?? "—"}
                    </div>

                    <div style={{ color: "rgba(0,0,0,0.65)", marginTop: 4 }}>
                      {maps ? (
                        <a href={maps} target="_blank" style={{ fontWeight: 700 }}>
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
                        {n.dme_channel && n.dme_frequency_khz ? " · " : ""}
                        {n.dme_frequency_khz ? `${n.dme_frequency_khz} kHz` : ""}
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
