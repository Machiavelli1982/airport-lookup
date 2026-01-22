import postgres from 'postgres';

// Wir nutzen direkt deine verifizierte URL
const sql = postgres("postgresql://neondb_owner:npg_FV9CmJIZrQ3R@ep-super-smoke-agduxbza-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("🚀 Starte ILS-Import für LOWW...");
  
  const data = [
    { ident: 'LOWW', rwy: '11', freq: '110.30', course: '116', call: 'IWW' },
    { ident: 'LOWW', rwy: '16', freq: '108.50', course: '164', call: 'IOE' },
    { ident: 'LOWW', rwy: '29', freq: '109.50', course: '296', call: 'INN' },
    { ident: 'LOWW', rwy: '34', freq: '108.90', course: '344', call: 'IWE' }
  ];

  try {
    for (const item of data) {
      await sql`
        INSERT INTO runway_ils (airport_ident, runway_ident, ils_freq, ils_course, ils_ident)
        VALUES (${item.ident}, ${item.rwy}, ${item.freq}, ${item.course}, ${item.call})
        ON CONFLICT DO NOTHING
      `;
      console.log(`✅ ${item.ident} RWY ${item.rwy} importiert.`);
    }
    console.log("✨ Alle Testdaten erfolgreich in Neon gespeichert!");
  } catch (err) {
    console.error("❌ Fehler beim Import:", err);
  } finally {
    await sql.end();
    process.exit();
  }
}

run();