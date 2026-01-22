import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import pg from 'pg';

const { Client } = pg;
const ZIP_PATH = "./data/28DaySubscription_Effective_2025-12-25.zip";

async function run() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });

  try {
    const zip = new AdmZip(ZIP_PATH);
    const ilsEntry = zip.getEntries().find(e => e.entryName === "ILS.txt");
    const ilsContent = ilsEntry.getData().toString('utf8');
    const lines = ilsContent.split('\n');

    console.log(`✈️  Analysiere ${lines.length} Zeilen aus FAA ILS.txt...`);
    await client.connect();

    const ilsMap = new Map();

    for (const line of lines) {
      const recordType = line.substring(0, 4);
      const systemId = line.substring(4, 12).trim(); // z.B. 00128.*A

      if (!systemId) continue;

      if (recordType === 'ILS1') {
        const rwy = line.substring(15, 18).trim();
        const ident = line.substring(29, 35).trim();
        // Der Flughafen-Code steht bei FAA oft an Index 153 (3-4 Zeichen)
        const aptRaw = line.substring(153, 157).trim(); 
        
        if (aptRaw && rwy) {
          ilsMap.set(systemId, {
            icao: aptRaw.length === 3 ? `K${aptRaw}` : aptRaw, // ANB -> KANB
            runway: rwy,
            ident: ident,
            freq: null,
            course: null
          });
        }
      } 
      
      else if (recordType === 'ILS2') {
        if (ilsMap.has(systemId)) {
          // Die Frequenz steht laut deinem Dump bei Index 154 (ca. 7 Zeichen)
          const freqRaw = line.substring(154, 161).trim();
          if (freqRaw && !isNaN(parseFloat(freqRaw))) {
            ilsMap.get(systemId).freq = parseFloat(freqRaw);
          }
        }
      }
    }

    console.log(`🔍 Mapping abgeschlossen. Validiere Daten für DB-Update...`);

    let imported = 0;
    for (const data of ilsMap.values()) {
      // Nur importieren, wenn wir eine Frequenz UND einen Flughafen haben
      if (data.freq && data.icao) {
        try {
          await client.query(`
            INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_ident, source)
            VALUES ($1, $2, $3, $4, 'FAA')
            ON CONFLICT (airport_ident, runway_ident) DO UPDATE 
            SET ils_freq = EXCLUDED.ils_freq, 
                ils_ident = EXCLUDED.ils_ident
          `, [data.icao, data.runway, data.freq, data.ident]);
          imported++;
        } catch (dbErr) {
          // Ignoriere Fehler bei fehlenden Flughäfen in der Haupttabelle
        }
      }
    }

    console.log(`✅ Erfolg: ${imported} US-ILS Datensätze in die DB geschrieben.`);

  } catch (err) {
    console.error("❌ Kritischer Fehler:", err.message);
  } finally {
    await client.end();
  }
}

run();