import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import pg from 'pg';

const { Client } = pg;

// Konfiguration - Nutzt deine manuell geladene Datei
const ZIP_PATH = "./data/28DaySubscription_Effective_2025-12-25.zip";

async function run() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });

  try {
    if (!fs.existsSync(ZIP_PATH)) {
      throw new Error(`Datei nicht gefunden unter ${ZIP_PATH}. Bitte dorthin verschieben.`);
    }

    console.log("📦 1. Öffne lokales FAA-Paket...");
    const zip = new AdmZip(ZIP_PATH);
    const ilsEntry = zip.getEntries().find(e => e.entryName === "ILS.txt");
    
    if (!ilsEntry) throw new Error("ILS.txt nicht im ZIP gefunden!");
    
    const ilsContent = ilsEntry.getData().toString('utf8');
    const lines = ilsContent.split('\n');

    await client.connect();
    console.log("🐘 Datenbankverbindung steht.");

    let count = 0;
    
    // Wir nutzen eine Map, um Daten aus verschiedenen Zeilentypen (ILS1, ILS2) zusammenzuführen
    // Schlüssel ist eine Kombination aus Airport + Runway
    const ilsMap = new Map();

    console.log("🔍 Verarbeite Datensätze...");

    for (const line of lines) {
      const recordType = line.substring(0, 4);

      if (recordType === 'ILS1') {
        const airportIdent = line.substring(30, 34).trim();
        const runwayIdent = line.substring(34, 37).trim();
        const ilsIdent = line.substring(4, 10).trim();
        const key = `${airportIdent}-${runwayIdent}`;

        ilsMap.set(key, {
          icao: `K${airportIdent}`, // FAA nutzt 3-Letter IDs, wir brauchen K...
          runway: runwayIdent,
          ident: ilsIdent
        });
      } 
      
      else if (recordType === 'ILS2') {
        // Hier stecken oft die Frequenzen und Kurse
        const airportIdent = line.substring(30, 34).trim();
        const runwayIdent = line.substring(34, 37).trim();
        const key = `${airportIdent}-${runwayIdent}`;

        if (ilsMap.has(key)) {
          const entry = ilsMap.get(key);
          // Frequenz steht oft ab Position 38 (Beispielhaft, FAA Specs variieren leicht)
          const freqRaw = line.substring(37, 44).trim();
          const courseRaw = line.substring(44, 50).trim();
          
          if (freqRaw) entry.freq = parseFloat(freqRaw) / 100; // FAA speichert oft ohne Komma
          if (courseRaw) entry.course = parseFloat(courseRaw);
        }
      }
    }

    // Bulk-Insert in die Datenbank
    for (const [key, data] of ilsMap.entries()) {
      if (data.freq) {
        await client.query(`
          INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_course, ils_ident, source)
          VALUES ($1, $2, $3, $4, $5, 'FAA')
          ON CONFLICT (airport_ident, runway_ident) DO UPDATE 
          SET ils_freq = EXCLUDED.ils_freq, 
              ils_course = EXCLUDED.ils_course,
              ils_ident = EXCLUDED.ils_ident
        `, [data.icao, data.runway, data.freq, data.course || null, data.ident]);
        count++;
      }
    }

    console.log(`✅ Erfolg: ${count} US-ILS Datensätze importiert/aktualisiert.`);

  } catch (err) {
    console.error("❌ Fehler:", err.message);
  } finally {
    await client.end();
  }
}

run();