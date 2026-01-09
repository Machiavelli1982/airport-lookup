import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs"; // safe default for postgres-js

function norm(q: string) {
  return q.trim().toUpperCase();
}

/**
 * GET /api/airports?q=loww
 * - Match ICAO exakt bevorzugt
 * - IATA exakt sekundär
 * - danach Prefix/Name fuzzy light (ILIKE)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qRaw = searchParams.get("q") ?? "";
  const q = norm(qRaw);

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  // Heuristik: User tippt oft ICAO/IATA -> wir ranken exact > prefix > name
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
      OR name ILIKE ${"%" + qRaw.trim() + "%"}
    ORDER BY
      CASE
        WHEN ident = ${q} THEN 0
        WHEN iata_code = ${q} THEN 1
        WHEN ident LIKE ${q + "%"} THEN 2
        WHEN iata_code LIKE ${q + "%"} THEN 3
        ELSE 4
      END,
      name ASC
    LIMIT 12;
  `;

  return NextResponse.json({ items });
}
