// web/scripts/import-global-ils.mjs
import fs from "fs";
import pg from "pg";
const { Client } = pg;

// Pfad zur globalen Quelle (z.B. OurAirports Navaids oder ein Sim-Export)
const NAV_FILE = "./data/navaids.csv"; 

async function importGlobal() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("🌍 Starte globalen ILS-Import...");

    // Wir nutzen hier OurAirports Navaids als Basis für die Welt
    // Da OurAirports keine direkte Runway-Zuordnung in der navaids.csv hat,
    // nutzen wir einen Trick: Wir matchen via Ident & Name (z.B. "ILS-cat-I-07L")
    
    const rows = await client.query(`
      SELECT id, ident, name, frequency_khz, associated_airport 
      FROM navaids 
      WHERE type IN ('ILS-LOC', 'ILS') AND associated_airport IS NOT NULL
    `);

    let count = 0;
    for (const nav of rows.rows) {
      // Extrahiere Runway aus dem Namen (z.B. "ILS-cat-I-25R" -> "25R")
      const rwyMatch = nav.name.match(/(\d{2}[LRC]?)/);
      const runwayIdent = rwyMatch ? rwyMatch[1] : null;
      const freq = nav.frequency_khz / 1000; // kHz zu MHz

      if (runwayIdent) {
        await client.query(
          `INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_ident, source)
           VALUES ($1, $2, $3, $4, 'OurAirports_Global')
           ON CONFLICT (airport_ident, runway_ident) DO UPDATE 
           SET ils_freq = EXCLUDED.ils_freq, ils_ident = EXCLUDED.ils_ident`,
          [nav.associated_airport, runwayIdent, freq, nav.ident]
        );
        count++;
      }
    }

    console.log(`✅ Globaler Import fertig: ${count} Datensätze verarbeitet.`);
  } catch (err) {
    console.error("❌ Fehler:", err.message);
  } finally {
    await client.end();
  }
}

importGlobal();