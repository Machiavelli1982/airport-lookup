// web/app/api/nearby/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Berechnet die Distanz in Kilometern auf einer Kugel (Haversine-Formel).
 * Integriert direkt in den SQL-Query für maximale Performance.
 */
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

  // 1) GEOGRAFISCHER MODUS (Nutzer-Standort)
  if (lat && lon) {
    const latNum = Number(lat);
    const lonNum = Number(lon);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const distanceKm = haversineKmSql(latNum, lonNum);

    const rows = await sql/* sql */`
      SELECT
        ident as icao,
        iata_code as iata,
        name,
        municipality,
        iso_country,
        type,
        (${distanceKm}) as distance_km
      FROM airports
      WHERE
        latitude_deg IS NOT NULL
        AND longitude_deg IS NOT NULL
        -- NEU: Wir beziehen nun auch kleine Plätze und Heliports mit ein
        AND type IN ('large_airport','medium_airport','small_airport','heliport')
      ORDER BY 
        distance_km ASC,
        -- Bei gleicher Distanz priorisieren wir größere Plätze
        CASE type
          WHEN 'large_airport' THEN 0
          WHEN 'medium_airport' THEN 1
          WHEN 'small_airport' THEN 2
          ELSE 3
        END
      LIMIT ${limit};
    `;

    return NextResponse.json({ mode: "geo", items: rows });
  }

  // 2) FALLBACK MODUS (Nach Land)
  if (country) {
    const cc = country.trim().toUpperCase();

    const rows = await sql/* sql */`
      SELECT
        ident as icao,
        iata_code as iata,
        name,
        municipality,
        type
      FROM airports
      WHERE
        iso_country = ${cc}
        AND type IN ('large_airport','medium_airport','small_airport','heliport')
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