import pg from "pg";
import https from "https";

const { Client } = pg;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

// Minimal CSV parser (works for OurAirports CSV; handles quoted fields)
function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n") {
        row.push(cur.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cur = "";
      } else {
        cur += c;
      }
    }
  }

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

function idxMap(header) {
  const m = new Map();
  header.forEach((h, i) => m.set(h.trim(), i));
  return m;
}

async function upsertCountries(client) {
  const url = "https://davidmegginson.github.io/ourairports-data/countries.csv";
  const csv = await fetchText(url);
  const rows = parseCsv(csv);
  const header = rows.shift();
  const idx = idxMap(header);

  const get = (r, name) => (idx.has(name) ? r[idx.get(name)] : "");

  await client.query("BEGIN");
  try {
    for (const r of rows) {
      const code = get(r, "code")?.trim();
      const name = get(r, "name")?.trim();
      if (!code || !name) continue;

      const continent = get(r, "continent")?.trim() || null;
      const wikipedia_link = get(r, "wikipedia_link")?.trim() || null;
      const keywords = get(r, "keywords")?.trim() || null;

      await client.query(
        `
        INSERT INTO countries(code, name, continent, wikipedia_link, keywords)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          continent = EXCLUDED.continent,
          wikipedia_link = EXCLUDED.wikipedia_link,
          keywords = EXCLUDED.keywords
        `,
        [code, name, continent, wikipedia_link, keywords]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

async function upsertRegions(client) {
  const url = "https://davidmegginson.github.io/ourairports-data/regions.csv";
  const csv = await fetchText(url);
  const rows = parseCsv(csv);
  const header = rows.shift();
  const idx = idxMap(header);

  const get = (r, name) => (idx.has(name) ? r[idx.get(name)] : "");

  await client.query("BEGIN");
  try {
    for (const r of rows) {
      const code = get(r, "code")?.trim();
      const name = get(r, "name")?.trim();
      const iso_country = get(r, "iso_country")?.trim();
      if (!code || !name || !iso_country) continue;

      const local_code = get(r, "local_code")?.trim() || null;
      const continent = get(r, "continent")?.trim() || null;
      const wikipedia_link = get(r, "wikipedia_link")?.trim() || null;
      const keywords = get(r, "keywords")?.trim() || null;

      await client.query(
        `
        INSERT INTO regions(code, local_code, name, continent, iso_country, wikipedia_link, keywords)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (code) DO UPDATE SET
          local_code = EXCLUDED.local_code,
          name = EXCLUDED.name,
          continent = EXCLUDED.continent,
          iso_country = EXCLUDED.iso_country,
          wikipedia_link = EXCLUDED.wikipedia_link,
          keywords = EXCLUDED.keywords
        `,
        [code, local_code, name, continent, iso_country, wikipedia_link, keywords]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("Importing countries...");
  await upsertCountries(client);
  console.log("Importing regions...");
  await upsertRegions(client);

  const c = await client.query("SELECT COUNT(*)::int AS n FROM countries");
  const r = await client.query("SELECT COUNT(*)::int AS n FROM regions");
  console.log(`Done. countries=${c.rows[0].n}, regions=${r.rows[0].n}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
