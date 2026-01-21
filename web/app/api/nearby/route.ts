// web/app/api/nearby/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function haversineKmSql(lat: number, lon: number) {
  return sql/* sql */`
    2 * 6371 * asin(
      sqrt(
        power(sin(radians((${lat} - latitude_deg) / 2)), 2) +
        cos(radians(latitude_deg)) * cos(radians(${lat})) *
        power(sin(radians((${lon} - longitude_deg) / 2)), 2)
      )
    )
  `;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const country = searchParams.get("country");
  const limit = Math.min(Number(searchParams.get("limit") || "12"), 25);

  // 1) Geo mode (User Location)
  if (lat && lon) {
    const latNum = Number(lat);
    const lonNum = Number(lon);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
    }

    const distanceKm = haversineKmSql(latNum, lonNum);

    const rows = await sql/* sql */`
      SELECT
        ident as icao,
        iata_code as iata,
        name,
        municipality,
        iso_country,
        latitude_deg,
        longitude_deg,
        type,
        (${distanceKm}) as distance_km
      FROM airports
      WHERE
        latitude_deg IS NOT NULL
        AND longitude_deg IS NOT NULL
        -- NEU: small_airport hinzugefügt
        AND type IN ('large_airport','medium_airport','small_airport')
      ORDER BY 
        -- Gewichtung: Große Flughäfen erscheinen bei gleicher Distanz eher oben
        distance_km ASC,
        CASE type
          WHEN 'large_airport' THEN 0
          WHEN 'medium_airport' THEN 1
          ELSE 2
        END
      LIMIT ${limit};
    `;

    return NextResponse.json({ mode: "geo", items: rows });
  }

  // 2) Country fallback mode
  if (country) {
    const cc = country.trim().toUpperCase();

    const rows = await sql/* sql */`
      SELECT
        ident as icao,
        iata_code as iata,
        name,
        municipality,
        iso_country,
        latitude_deg,
        longitude_deg,
        type
      FROM airports
      WHERE
        iso_country = ${cc}
        AND type IN ('large_airport','medium_airport','small_airport')
      ORDER BY
        CASE type
          WHEN 'large_airport' THEN 0
          WHEN 'medium_airport' THEN 1
          WHEN 'small_airport' THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT ${limit};
    `;

    return NextResponse.json({ mode: "country", country: cc, items: rows });
  }

  return NextResponse.json({ error: "Provide lat/lon or country" }, { status: 400 });
}