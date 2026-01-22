import fs from "fs";
import { parse } from "csv-parse";
import pg from "pg";

const { Client } = pg;

// Konfiguration
const CSV_FILE = "./data/ILS_BASE.csv";

async function runImport() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    if (!fs.existsSync(CSV_FILE)) {
      throw new Error(`Datei nicht gefunden: ${CSV_FILE}`);
    }

    await client.connect();
    console.log("🐘 Datenbankverbindung hergestellt.");

    const parser = fs.createReadStream(CSV_FILE).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    );

    let count = 0;
    console.log("🚀 Starte Import aus ILS_BASE.csv...");

    for await (const row of parser) {
      // Mapping der FAA-Spalten auf deine Tabelle
      // FAA nutzt ARPT_ID (3-4 Zeichen), wir brauchen den ICAO-Code
      const airportIdent = row.ARPT_ID.length === 3 ? `K${row.ARPT_ID}` : row.ARPT_ID;
      const runwayIdent = row.RWY_END_ID;
      const freq = parseFloat(row.LOC_FREQ);
      const course = parseFloat(row.APCH_BEAR);
      const ident = row.ILS_LOC_ID;

      if (airportIdent && runwayIdent && !isNaN(freq)) {
        await client.query(
          `INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_course, ils_ident, source)
           VALUES ($1, $2, $3, $4, $5, 'FAA_CSV')
           ON CONFLICT (airport_ident, runway_ident) 
           DO UPDATE SET 
            ils_freq = EXCLUDED.ils_freq, 
            ils_course = EXCLUDED.ils_course, 
            ils_ident = EXCLUDED.ils_ident`,
          [airportIdent, runwayIdent, freq, course, ident]
        );
        count++;
      }
    }

    console.log(`✅ Erfolg: ${count} US-ILS Datensätze importiert.`);
  } catch (err) {
    console.error("❌ Fehler beim Import:", err.message);
  } finally {
    await client.end();
  }
}

runImport();