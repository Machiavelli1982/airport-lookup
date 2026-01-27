import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

// 1. Umgebungsvariablen laden
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');
config({ path: envPath });

// 2. Datenbank dynamisch importieren
const { sql } = await import('../lib/db.ts');

// AKTUELLER ZYKLUS JANUAR 2026
const CYCLE = "2601"; 
const FAA_XML_URL = `https://aeronav.faa.gov/d-tpp/${CYCLE}/xml_data/d-TPP_Metafile.xml`; 

async function importFAA() {
  console.log(`✈️  Fetching FAA d-TPP Metafile for Cycle ${CYCLE}...`);
  
  try {
    const response = await fetch(FAA_XML_URL);
    
    if (response.status === 404) {
      throw new Error(`FAA Cycle ${CYCLE} nicht gefunden. Prüfe https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dtpp/ für den aktuellen Zyklus.`);
    }

    if (!response.ok) {
      throw new Error(`FAA Server Fehler: ${response.status}`);
    }
    
    const xml = await response.text();
    const data = await parseStringPromise(xml);
    const digital_tpp = data.digital_tpp;
    let count = 0;

    console.log("💾 Synchronisiere Neon Datenbank...");

    for (const state of digital_tpp.state_code) {
      for (const city of state.city_name) {
        for (const airport of city.airport_name) {
          const ident = airport.$.ID; 
          const icao = airport.$.icao; 
          
          if (airport.record) {
            for (const record of airport.record) {
              const type = record.chart_code[0];
              const name = record.chart_name[0];
              const pdfName = record.pdf_name[0];
              // Konstruktion der PDF-URL für 2026
              const chartUrl = `https://aeronav.faa.gov/d-tpp/${CYCLE}/${pdfName}`;

              await sql`
                INSERT INTO airport_approaches (airport_ident, procedure_name, procedure_type, chart_url)
                VALUES (${icao || ident}, ${name}, ${type}, ${chartUrl})
                ON CONFLICT DO NOTHING
              `;
              count++;
            }
          }
        }
      }
    }
    console.log(`✅ Fertig! ${count} Prozeduren für 2026 importiert.`);
  } catch (error) {
    console.error("❌ Fehler beim Import:", error.message);
  } finally {
    process.exit(0);
  }
}

importFAA();