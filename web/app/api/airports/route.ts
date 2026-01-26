import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function norm(q: string) {
  return q.trim().toUpperCase();
}

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
      longitude_deg,

      -- ILS Check (SEO & User Engagement)
      EXISTS (
        SELECT 1 FROM runway_ils 
        WHERE airport_ident = airports.ident
      ) as has_ils,

      -- ranking helpers
      (iata_code IS NOT NULL) as has_iata,
      (ident ~ '^[A-Z]{4}$') as is_icao4,
      (ident LIKE '%-%') as has_dash_ident,
      CASE
        WHEN type = 'large_airport' THEN 0
        WHEN type = 'medium_airport' THEN 1
        WHEN type = 'small_airport' THEN 2
        WHEN type = 'heliport' THEN 3
        WHEN type = 'seaplane_base' THEN 4
        WHEN type = 'balloonport' THEN 5
        WHEN type = 'closed' THEN 9
        ELSE 6
      END as type_rank
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
      -- primary: exact/prefix code matches always first
      CASE
        WHEN ident = ${q} THEN 0
        WHEN iata_code = ${q} THEN 1
        WHEN ident LIKE ${q + "%"} THEN 2
        WHEN iata_code LIKE ${q + "%"} THEN 3
        WHEN municipality ILIKE ${likeRaw} THEN 4
        WHEN name ILIKE ${likeRaw} THEN 5
        ELSE 6
      END,

      -- secondary: prefer airports with ILS data for better SEO results
      has_ils DESC,
      has_iata DESC,
      is_icao4 DESC,
      has_dash_ident ASC,

      -- push closed down
      type_rank ASC,

      -- stable tie-breakers
      municipality NULLS LAST,
      name ASC
    LIMIT 12;
  `;

  return NextResponse.json({
    // has_ils wird hier NICHT herausgefiltert, damit es im Frontend ankommt
    items: items.map(({ has_iata, is_icao4, has_dash_ident, type_rank, ...rest }: any) => rest),
  });
}
