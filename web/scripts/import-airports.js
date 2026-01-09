import fs from "fs";
import { parse } from "csv-parse";
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

await client.query("TRUNCATE airports");

const parser = fs
  .createReadStream("data/airports.csv")
  .pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    })
  );

let count = 0;

for await (const row of parser) {
  await client.query(
    `
    INSERT INTO airports (
      id, ident, type, name,
      latitude_deg, longitude_deg, elevation_ft,
      continent, iso_country, iso_region, municipality,
      scheduled_service, gps_code, iata_code, local_code,
      home_link, wikipedia_link, keywords
    )
    VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,
      $8,$9,$10,$11,
      $12,$13,$14,$15,
      $16,$17,$18
    )
    `,
    [
      row.id,
      row.ident,
      row.type,
      row.name,
      row.latitude_deg || null,
      row.longitude_deg || null,
      row.elevation_ft || null,
      row.continent,
      row.iso_country,
      row.iso_region,
      row.municipality,
      row.scheduled_service,
      row.gps_code,
      row.iata_code,
      row.local_code,
      row.home_link,
      row.wikipedia_link,
      row.keywords,
    ]
  );

  count++;
  if (count % 5000 === 0) console.log(`Imported ${count}`);
}

console.log(`DONE: ${count} airports`);
await client.end();
