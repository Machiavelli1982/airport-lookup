// web/scripts/fix-transition-altitudes.mjs
import pg from "pg";

const { Client } = pg;

// MASSIVE LÄNDERLISTE (Standards für MSFS/IVAO/VATSIM)
// Werte in Fuß. Quellen: AIPs, vACC Standards, ICAO Defaults.
const countryStandards = {
  // --- NORDAMERIKA ---
  US: 18000, // USA
  CA: 18000, // Kanada
  MX: 18500, // Mexiko
  PA: 18000, // Panama
  CR: 18000, // Costa Rica
  SV: 18000, // El Salvador
  GT: 18000, // Guatemala
  HN: 18000, // Honduras
  NI: 18000, // Nicaragua
  DO: 18000, // Dom. Rep.
  PR: 18000, // Puerto Rico
  JM: 18000, // Jamaika
  BS: 18000, // Bahamas
  CU: 6000,  // Kuba (abweichend von US Standard)

  // --- SÜDAMERIKA (Oft hoch wegen Anden -> hier nur Low Level Standards) ---
  CO: 18000, // Kolumbien
  VE: 11000, // Venezuela
  BR: 7000,  // Brasilien (Variiert 4000-8000, 7000 ist guter Sim-Mittelwert)
  AR: 4000,  // Argentinien
  CL: 10000, // Chile
  PE: 4000,  // Peru (Lima), Cusco ist Fallback (siehe unten)

  // --- EUROPA ---
  DE: 5000,  // Deutschland
  AT: 10000, // Österreich (Wichtig: neu 10.000)
  CH: 7000,  // Schweiz
  FR: 5000,  // Frankreich
  GB: 6000,  // UK
  IE: 5000,  // Irland
  NL: 3000,  // Niederlande
  BE: 4500,  // Belgien
  LU: 5000,  // Luxemburg
  IT: 6000,  // Italien
  ES: 6000,  // Spanien
  PT: 4000,  // Portugal
  GR: 8000,  // Griechenland
  CY: 9000,  // Zypern
  MT: 5000,  // Malta
  TR: 10000, // Türkei
  DK: 5000,  // Dänemark
  NO: 7000,  // Norwegen
  SE: 5000,  // Schweden
  FI: 5000,  // Finnland
  IS: 7000,  // Island
  PL: 6500,  // Polen
  CZ: 5000,  // Tschechien
  SK: 10000, // Slowakei
  HU: 10000, // Ungarn
  RO: 4000,  // Rumänien
  BG: 9000,  // Bulgarien
  HR: 10000, // Kroatien
  SI: 9000,  // Slowenien
  RS: 10000, // Serbien
  BA: 10000, // Bosnien
  MK: 10000, // Nordmazedonien
  AL: 10000, // Albanien
  EE: 5000,  // Estland
  LV: 5000,  // Lettland
  LT: 5000,  // Litauen
  UA: 10000, // Ukraine (Oft QFE/Metrisch, 10k Standard)
  RU: 10000, // Russland (Sim Standard)

  // --- ASIEN ---
  JP: 14000, // Japan
  KR: 14000, // Südkorea
  KP: 10000, // Nordkorea
  CN: 9850,  // China (3000m ~ 9843ft)
  HK: 9000,  // Hong Kong
  TW: 11000, // Taiwan
  TH: 11000, // Thailand
  VN: 10000, // Vietnam
  SG: 11000, // Singapur
  MY: 11000, // Malaysia
  ID: 11000, // Indonesien
  PH: 11000, // Philippinen
  IN: 4000,  // Indien
  PK: 5000,  // Pakistan
  BD: 4000,  // Bangladesch
  LK: 11000, // Sri Lanka
  NP: 13000, // Nepal (Kathmandu, Rest über Fallback)

  // --- NAHOST ---
  AE: 13000, // VAE (Dubai etc)
  SA: 13000, // Saudi Arabien
  QA: 13000, // Katar
  BH: 13000, // Bahrain
  KW: 13000, // Kuwait
  OM: 13000, // Oman
  IL: 10000, // Israel
  JO: 13000, // Jordanien
  LB: 11000, // Libanon
  IR: 10000, // Iran

  // --- OZEANIEN ---
  AU: 10000, // Australien
  NZ: 13000, // Neuseeland
  FJ: 11000, // Fidschi

  // --- AFRIKA ---
  ZA: 11000, // Südafrika
  EG: 5000,  // Ägypten
  MA: 5000,  // Marokko
  TN: 5000,  // Tunesien
  KE: 10000, // Kenia
  // Viele afrikanische Staaten nutzen Standard 5000ft oder FL variabel -> Fallback
};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log("🔌 Connecting to Neon Postgres...");
  await client.connect();

  try {
    // 1. Schema prüfen
    console.log("🔨 Checking schema...");
    await client.query(`
      ALTER TABLE airports 
      ADD COLUMN IF NOT EXISTS transition_alt INTEGER;
    `);

    // 2. Bekannte Standards setzen
    console.log("🌍 Applying global national standards...");
    
    // Wir bauen einen Batch-Update für alle definierten Länder
    const cases = Object.entries(countryStandards)
      .map(([code, alt]) => `WHEN iso_country = '${code}' THEN ${alt}`)
      .join(" ");
    
    const codes = Object.keys(countryStandards).map(c => `'${c}'`).join(", ");

    if (cases.length > 0) {
      await client.query(`
        UPDATE airports 
        SET transition_alt = CASE 
          ${cases}
        END
        WHERE iso_country IN (${codes});
      `);
      console.log(`✅ Updated standards for ${Object.keys(countryStandards).length} countries.`);
    }

    // 3. Intelligenter Fallback für den "Rest der Welt"
    console.log("🏔️ Calculating dynamic altitudes for rest of the world...");

    // A: Niedrige Flughäfen ohne expliziten Standard -> 5000ft (Standard ICAO Empfehlung)
    await client.query(`
      UPDATE airports 
      SET transition_alt = 5000 
      WHERE transition_alt IS NULL 
      AND (elevation_ft IS NULL OR elevation_ft <= 2000);
    `);

    // B: Hohe Flughäfen (z.B. La Paz, Lhasa) -> Elevation + 3000ft Puffer, gerundet auf 1000er
    // Beispiel: Elevation 13300 -> +3000 = 16300 -> Aufrunden -> 17000ft TA
    await client.query(`
      UPDATE airports 
      SET transition_alt = CEIL((elevation_ft + 3000) / 1000.0) * 1000
      WHERE transition_alt IS NULL 
      AND elevation_ft > 2000;
    `);

    console.log("✅ Global database update complete. All airports patched.");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.end();
  }
}

run();