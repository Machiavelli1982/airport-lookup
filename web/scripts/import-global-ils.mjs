import postgres from 'postgres';
import fetch from 'node-fetch';

const sql = postgres("postgresql://neondb_owner:npg_FV9CmJIZrQ3R@ep-super-smoke-agduxbza-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("🌐 Lade globalen ILS-Datensatz...");
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/OurAirports/ourairports-data/main/navaids.csv');
    const csvData = await response.text();
    const lines = csvData.split('\n');
    
    // Header sauber extrahieren
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const idx = {
      ident: headers.indexOf('ident'),
      type: headers.indexOf('type'),
      freq: headers.indexOf('frequency_khz'),
      icao: headers.indexOf('associated_airport'),
      usage: headers.indexOf('usage_code')
    };

    console.log("🚀 Starte Import...");
    let count = 0;

    await sql.begin(async sql => {
      for (let i = 1; i < lines.length; i++) {
        // Regex um Kommas innerhalb von Anführungszeichen zu ignorieren
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
        
        if (cols.length < 5) continue;

        const type = cols[idx.type];
        // Wir suchen nach allem, was ILS im Typ hat
        if (type && type.toUpperCase().includes('ILS')) {
          const icao = cols[idx.icao];
          const rwy = cols[idx.usage];
          const freqKhz = cols[idx.freq];
          const ident = cols[idx.ident];

          // Nur wenn Flughafen und Runway-Nummer (z.B. 16) existieren
          if (icao && rwy && rwy !== "" && freqKhz) {
            const freqMHz = (parseInt(freqKhz) / 1000).toFixed(2);
            
            await sql`
              INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_course, ils_ident)
              VALUES (${icao}, ${rwy}, ${freqMHz}, '000', ${ident})
              ON CONFLICT DO NOTHING
            `;
            count++;
          }
        }
      }
    });

    console.log(`✨ Erfolg! ${count} ILS-Einträge importiert.`);
  } catch (err) {
    console.error("❌ Fehler:", err);
  } finally {
    await sql.end();
    process.exit();
  }
}

run();