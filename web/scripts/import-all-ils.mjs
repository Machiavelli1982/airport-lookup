import postgres from 'postgres';

const sql = postgres("postgresql://neondb_owner:npg_FV9CmJIZrQ3R@ep-super-smoke-agduxbza-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("🚀 Starte Massen-Import für die wichtigsten globalen Hubs...");
  
  const data = [
    // EUROPA (DACH + Major)
    { icao: 'EDDF', rwy: '07R', freq: '110.70', course: '073', call: 'IFRW' },
    { icao: 'EDDF', rwy: '25L', freq: '111.15', course: '253', call: 'IFLW' },
    { icao: 'EDDM', rwy: '08L', freq: '109.30', course: '082', call: 'IMS' },
    { icao: 'EDDM', rwy: '26R', freq: '108.70', course: '262', call: 'IMN' },
    { icao: 'EDDL', rwy: '23L', freq: '109.90', course: '229', call: 'IDL' },
    { icao: 'EDDH', rwy: '15', freq: '110.50', course: '151', call: 'IHH' },
    { icao: 'LOWW', rwy: '11', freq: '110.30', course: '116', call: 'IWW' },
    { icao: 'LOWW', rwy: '16', freq: '108.50', course: '164', call: 'IOE' },
    { icao: 'LSZH', rwy: '14', freq: '108.30', course: '137', call: 'IZH' },
    { icao: 'EGLL', rwy: '27L', freq: '109.50', course: '272', call: 'IAA' },
    { icao: 'EGLL', rwy: '27R', freq: '110.30', course: '272', call: 'IRW' },
    { icao: 'EHAM', rwy: '18R', freq: '110.10', course: '183', call: 'IWB' },
    { icao: 'LFPG', rwy: '26L', freq: '109.35', course: '266', call: 'CGO' },
    // USA (High Traffic)
    { icao: 'KJFK', rwy: '04R', freq: '109.30', course: '044', call: 'IJFK' },
    { icao: 'KJFK', rwy: '13L', freq: '111.50', course: '133', call: 'IHI' },
    { icao: 'KLAX', rwy: '25L', freq: '109.90', course: '251', call: 'I-LAX' },
    { icao: 'KLAX', rwy: '24R', freq: '108.50', course: '251', call: 'I-OSS' },
    { icao: 'KORD', rwy: '10C', freq: '108.95', course: '101', call: 'I-SXJ' },
    { icao: 'KATL', rwy: '08L', freq: '110.50', course: '095', call: 'I-GAY' },
    { icao: 'KSFO', rwy: '28L', freq: '111.70', course: '284', call: 'I-SFO' },
    // ASIEN / ME
    { icao: 'OMDB', rwy: '12L', freq: '110.10', course: '120', call: 'IDXB' },
    { icao: 'VHHH', rwy: '07L', freq: '111.10', course: '073', call: 'ITR' },
    { icao: 'RJTT', rwy: '34L', freq: '111.90', course: '337', call: 'ITA' }
    // ... (hier könnten wir hunderte weitere einfügen)
  ];

  try {
    let count = 0;
    await sql.begin(async sql => {
      for (const item of data) {
        await sql`
          INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_course, ils_ident)
          VALUES (${item.icao}, ${item.rwy}, ${item.freq}, ${item.course}, ${item.call})
          ON CONFLICT DO NOTHING
        `;
        count++;
      }
    });
    console.log(`✨ Erfolg! ${count} Top-Flughäfen importiert.`);
  } catch (err) {
    console.error("❌ Fehler:", err.message);
  } finally {
    await sql.end();
    process.exit();
  }
}

run();