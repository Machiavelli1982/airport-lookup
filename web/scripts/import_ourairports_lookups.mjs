import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env.local') });
const { sql } = await import('../lib/db.ts');

const CYCLE = "2601"; 
const FAA_XML_URL = `https://aeronav.faa.gov/d-tpp/${CYCLE}/xml_data/d-TPP_Metafile.xml`; 

// Hilfsfunktion: Extrahiert die Runway (z.B. "ILS RWY 04L" -> "04L")
function extractRunway(name) {
  const match = name.match(/RWY\s?(\d{1,2}[LRC]?)/i);
  return match ? match[1].toUpperCase() : null;
}

async function importFAA() {
  console.log("🚀 Starte Deep-Data Import...");
  const response = await fetch(FAA_XML_URL);
  const data = await parseStringPromise(await response.text());
  const digital_tpp = data.digital_tpp;
  let count = 0;

  console.log("💾 Befülle Datenbank mit Metadaten & Runway-Mapping...");

  for (const state of digital_tpp.state_code) {
    const sCode = state.$.ID;
    for (const city of state.city_name) {
      const cityName = city.$.ID;
      for (const airport of city.airport_name) {
        // Korrekter Zugriff auf Attribute via .$
        const faaId = airport.$?.ID; 
        const icao = airport.$?.icao;
        const airportFull = airport._?.trim() || faaId; // Der Textinhalt ist der Name

        if (airport.record) {
          for (const record of airport.record) {
            const name = record.chart_name[0];
            const rwy = extractRunway(name); 
            
            await sql`
              INSERT INTO airport_approaches 
              (airport_ident, procedure_name, procedure_type, chart_url, runway_designator)
              VALUES (
                ${icao || faaId}, 
                ${name}, 
                ${record.chart_code[0]}, 
                ${`https://aeronav.faa.gov/d-tpp/${CYCLE}/${record.pdf_name[0]}`},
                ${rwy}
              )
              ON CONFLICT DO NOTHING
            `;
            count++;
          }
        }
      }
    }
  }
  console.log(`✅ Fertig! ${count} Prozeduren mit Runway-Zuweisung importiert.`);
  process.exit(0);
}

importFAA();