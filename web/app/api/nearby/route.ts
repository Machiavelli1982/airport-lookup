import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function numParam(v: string | null) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const lat = numParam(searchParams.get("lat"));
  const lon = numParam(searchParams.get("lon"));
  const limitRaw = numParam(searchParams.get("limit"));
  const limit = Math.min(Math.max(limitRaw ?? 12, 1), 20);

  if (lat == null || lon == null) {
    return NextResponse.json(
      { error: "Missing or invalid lat/lon." },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "lat/lon out of range." },
      { status: 400 }
    );
  }

  // Haversine in km
  const rows = await sql/* sql */`
    WITH params AS (
      SELECT ${lat}::double precision AS lat, ${lon}::double precision AS lon
    )
    SELECT
      a.ident AS icao,
      a.iata_code AS iata,
      a.name,
      a.municipality,
      a.iso_country,
      (
        6371 * 2 * asin(
          sqrt(
            power(sin(radians((a.latitude_deg - (SELECT lat FROM params)) / 2)), 2) +
            cos(radians((SELECT lat FROM params))) * cos(radians(a.latitude_deg)) *
            power(sin(radians((a.longitude_deg - (SELECT lon FROM params)) / 2)), 2)
          )
        )
      ) AS distance_km
    FROM airports a
    WHERE
      a.latitude_deg IS NOT NULL
      AND a.longitude_deg IS NOT NULL
      AND a.type IN ('large_airport', 'medium_airport')
      AND a.ident IS NOT NULL
    ORDER BY distance_km ASC
    LIMIT ${limit};
  `;

  const items = rows.map((r: any) => ({
    icao: String(r.icao),
    iata: r.iata ? String(r.iata) : null,
    name: String(r.name ?? ""),
    municipality: r.municipality ? String(r.municipality) : null,
    iso_country: r.iso_country ? String(r.iso_country) : null,
    distance_km: Number(r.distance_km ?? 0),
  }));

  return NextResponse.json(
    { items },
    {
      headers: {
        // UX-only feature; cache short to avoid hammering DB
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
