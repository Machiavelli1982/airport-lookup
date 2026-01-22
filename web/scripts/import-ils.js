import fs from 'fs';
import { parse } from 'csv-parse/sync';
import pg from 'pg';
const { Client } = pg;

async function importILS() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. Daten laden (Lokal statt curl für Stabilität)
  const runwaysCsv = fs.readFileSync('./data/runways.csv', 'utf-8');
  const navaidsCsv = fs.readFileSync('./data/navaids.csv', 'utf-8');

  const runways = parse(runwaysCsv, { columns: true, skip_empty_lines: true });
  const navaids = parse(navaidsCsv, { columns: true, skip_empty_lines: true });

  console.log(`Verarbeite ${runways.length} Runways und ${navaids.length} Navaids...`);

  // 2. Filter für ILS (Typen: ILS-I, ILS-II, ILS-III, etc.)
  const ilsData = navaids.filter(n => n.type.startsWith('ILS'));

  for (const ils of ilsData) {
    // Finde die passende Runway am selben Flughafen
    // Oft matcht der ident des ILS mit der Runway (z.B. "I-JFK" für Runway 13L)
    const airport = ils.associated_airport;
    
    // Extrahiere Frequenz (khz zu MHz)
    const freqMhz = (parseFloat(ils.frequency_khz) / 1000).toFixed(2);

    // SQL Batch mit ON CONFLICT für saubere Updates
    const query = `
      INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_course, ils_ident)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (airport_ident, runway_ident) 
      DO UPDATE SET ils_freq = EXCLUDED.ils_freq, ils_course = EXCLUDED.ils_course, ils_ident = EXCLUDED.ils_ident;
    `;

    // Wir müssen hier ggf. noch Logik einbauen, um die genaue runway_ident (16L etc.) 
    // aus dem ILS-Namen oder den Koordinaten zu mappen.
    try {
      // Dummy mapping: ils_course nehmen wir aus der navaid info oder setzen es später
      await client.query(query, [airport, "UNKNOWN_MATCH", freqMhz, ils.magnetic_variation_deg, ils.ident]);
    } catch (e) {
      console.error(`Fehler bei ${airport}: ${e.message}`);
    }
  }

  await client.end();
  console.log("ILS Import abgeschlossen.");
}

importILS();