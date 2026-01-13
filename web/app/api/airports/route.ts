import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs"; // safe default for postgres-js

function norm(q: string) {
  return q.trim().toUpperCase();
}

/**
 * GET /api/airports?q=loww
 * Ranking:
 * 0 ICAO exact
 * 1 IATA exact
 * 2 ICAO prefix
 * 3 IATA prefix
 * 4 municipality contains (city)
 * 5 name contains
 * 6 region/country contains (optional signal)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") ?? "").trim();
  const q = norm(qRaw);

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const likeRaw = `%${qRaw}%`;

  const items = await sql/* sql */`
    SELECT
      id,
      ident as icao,
      iata_code as iata,
      name,
      municipality,
      iso_country,
      iso_region,
      type,
      latitude_deg,
      longitude_deg
    FROM airports
    WHERE
      ident = ${q}
      OR iata_code = ${q}
      OR ident LIKE ${q + "%"}
      OR iata_code LIKE ${q + "%"}
      OR municipality ILIKE ${likeRaw}
      OR name ILIKE ${likeRaw}
      OR iso_region ILIKE ${likeRaw}
      OR iso_country ILIKE ${likeRaw}
    ORDER BY
      CASE
        WHEN ident = ${q} THEN 0
        WHEN iata_code = ${q} THEN 1
        WHEN ident LIKE ${q + "%"} THEN 2
        WHEN iata_code LIKE ${q + "%"} THEN 3
        WHEN municipality ILIKE ${likeRaw} THEN 4
        WHEN name ILIKE ${likeRaw} THEN 5
        ELSE 6
      END,
      -- tie-breakers (stable, friendly)
      municipality NULLS LAST,
      name ASC
    LIMIT 12;
  `;

  return NextResponse.json({ items });
}
