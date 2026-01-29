#!/usr/bin/env node
/**
 * FAA d-TPP Metafile Approaches Import -> Neon Postgres (postgres.js)
 *
 * Run:
 *   cd web
 *   node --env-file=.env.local scripts/import-faa-approaches.mjs
 *
 * Optional:
 *   FAA_CYCLE=2601 node --env-file=.env.local scripts/import-faa-approaches.mjs
 *   SKIP_DB=1 node --env-file=.env.local scripts/import-faa-approaches.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";
import { XMLParser } from "fast-xml-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const METAFILE_PATH = path.resolve(__dirname, "../data/metafile.xml");
const AIRPORTS_CSV_PATH = path.resolve(__dirname, "../data/airports.csv");

const BATCH_SIZE = 5000;
const DEBUG_UNRESOLVED_SAMPLES = 10;

// ---------------- helpers ----------------
function isNonEmpty(s) {
  return typeof s === "string" && s.trim().length > 0;
}
function normUpper(s) {
  return String(s ?? "").trim().toUpperCase();
}
function normProcuid(x) {
  const s = String(x ?? "").trim();
  return s.length ? s : "";
}

/** CSV parser that supports quotes + commas inside quotes */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out;
}

function loadAirportMapping(csvPath) {
  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const header = parseCsvLine(lines[0]);
  if (header.length < 16) {
    throw new Error(
      `airports.csv header seems too short (${header.length}). Check file format.`
    );
  }

  // per handover (0-based):
  // ident idx 1, gps_code idx 14, local_code idx 15
  const IDX_IDENT = 1;
  const IDX_GPS = 14;
  const IDX_LOCAL = 15;

  const mapLocalToIcao = new Map();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (!row || row.length <= IDX_LOCAL) continue;

    const ident = normUpper(row[IDX_IDENT]);
    const gps = normUpper(row[IDX_GPS]);
    const local = normUpper(row[IDX_LOCAL]);

    if (!isNonEmpty(local)) continue;

    const icao = isNonEmpty(gps) ? gps : ident;
    if (isNonEmpty(icao) && icao.length === 4) {
      if (!mapLocalToIcao.has(local)) mapLocalToIcao.set(local, icao);
    }
  }

  return mapLocalToIcao;
}

function resolveIcao({ faaId, xmlIcao, mapLocalToIcao }) {
  let id = normUpper(faaId);
  const attr = normUpper(xmlIcao);

  if (isNonEmpty(attr) && attr.length === 4) return attr;

  // Handle region/book prefixes we see in ctx like "AKHIOK"
  // Try stripping leading 2-letter prefix if the rest looks like 3-4 char ident.
  if (/^[A-Z]{2}[A-Z0-9]{3,4}$/.test(id)) {
    const stripped = id.slice(2);
    // prefer mapping of stripped (FAA local_code) -> ICAO
    const mapped2 = mapLocalToIcao.get(stripped);
    if (isNonEmpty(mapped2) && mapped2.length === 4) return mapped2;

    // fallback rules on stripped
    if (/^[A-Z0-9]{3}$/.test(stripped)) return `K${stripped}`;
    if (/^[A-Z0-9]{4}$/.test(stripped)) return stripped;
  }

  const mapped = mapLocalToIcao.get(id);
  if (isNonEmpty(mapped) && mapped.length === 4) return mapped;

  if (/^[A-Z0-9]{3}$/.test(id)) return `K${id}`;
  if (/^[A-Z0-9]{4}$/.test(id)) return id;

  return "";
}


function extractRunwayDesignator(procedureName) {
  const s = String(procedureName ?? "");
  const m =
    s.match(/\bRWY\s*([0-3]?\d(?:[LRC])?)\b/i) ||
    s.match(/\bRUNWAY\s*([0-3]?\d(?:[LRC])?)\b/i);
  return m ? normUpper(m[1]) : "";
}

function detectCycle(xmlText) {
  const env = normUpper(process.env.FAA_CYCLE);
  if (isNonEmpty(env) && /^\d{4}$/.test(env)) return env;

  const m1 = xmlText.match(/\bcycle\s*=\s*"(\d{4})"/i);
  if (m1?.[1]) return m1[1];

  const m2 = xmlText.match(/\/d-tpp\/(\d{4})\//i);
  if (m2?.[1]) return m2[1];

  return "2601";
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Extract airport identifiers directly from a node OR ctx (fallback).
 * We still don't know the exact FAA metafile keys, so we keep it broad.
 */
function extractAirportFieldsFromNode(node, ctx) {
  const getFirstString = (vals) => {
    for (const v of vals) {
      const s = normUpper(v);
      if (isNonEmpty(s)) return s;
    }
    return "";
  };

  const faaId = getFirstString([
    node.apt_ident,
    node.APT_IDENT,
    node.airport_ident,
    node.AIRPORT_IDENT,
    node.airport_id,
    node.AIRPORT_ID,
    node.location_identifier,
    node.LOCATION_IDENTIFIER,
    node.faa_ident,
    node.FAA_IDENT,
    node.ident,
    node.IDENT,
    node["@_ID"],
    node["@_id"],
    node["@_apt_ident"],
    node["@_APT_IDENT"],
    node["@_airport_id"],
    node["@_AIRPORT_ID"],
    ctx?.faaId,
  ]);

  const xmlIcao = getFirstString([
    node.icao,
    node.ICAO,
    node["@_icao"],
    node["@_ICAO"],
    ctx?.xmlIcao,
  ]);

  let airportName = "";
  const ap =
    node.airport_name ??
    node.AIRPORT_NAME ??
    node.airport ??
    node.AIRPORT ??
    node.name ??
    node.NAME;

  if (typeof ap === "string") airportName = ap.trim();
  else if (ap && typeof ap === "object") {
    airportName = String(ap["#text"] ?? ap.text ?? ap._text ?? "").trim();
  }
  if (!isNonEmpty(airportName)) airportName = String(ctx?.airportName ?? "").trim();

  return { faaId, xmlIcao, airportName };
}

// ---------------- main ----------------
async function main() {
  if (!fs.existsSync(METAFILE_PATH)) throw new Error(`Missing: ${METAFILE_PATH}`);
  if (!fs.existsSync(AIRPORTS_CSV_PATH)) throw new Error(`Missing: ${AIRPORTS_CSV_PATH}`);

  console.log("Loading airport mapping (local_code -> ICAO) ...");
  const mapLocalToIcao = loadAirportMapping(AIRPORTS_CSV_PATH);
  console.log(`Mapping loaded: ${mapLocalToIcao.size.toLocaleString()} entries`);

  console.log("Reading metafile.xml ...");
  const xmlText = fs.readFileSync(METAFILE_PATH, "utf8");
  const cycle = detectCycle(xmlText);
  console.log(`FAA cycle: ${cycle}`);

  console.log("Parsing XML (fast-xml-parser) ...");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseTagValue: true,
    trimValues: true,
  });
  const doc = parser.parse(xmlText);

  // 2-pass: procuid -> airport mapping + chart collection
  const procuidToAirport = new Map(); // procuid => { faaId, xmlIcao, airportName }
  let procuidMapped = 0;

  function walkBuildProcuidMap(node, ctx) {
    if (node == null) return;

    if (Array.isArray(node)) {
      for (const item of node) walkBuildProcuidMap(item, ctx);
      return;
    }

    if (typeof node === "object") {
      // Update context if we encounter plausible airport fields
      const maybeAirportId =
        node.airport_ident ??
        node.AIRPORT_IDENT ??
        node.apt_ident ??
        node.APT_IDENT ??
        node.airport_id ??
        node.AIRPORT_ID ??
        node.location_identifier ??
        node.LOCATION_IDENTIFIER ??
        node.ident ??
        node.IDENT ??
        node["@_ID"] ??
        node["@_id"];

      const maybeIcao = node.icao ?? node.ICAO ?? node["@_icao"] ?? node["@_ICAO"];

      const nextCtx = { ...ctx };
      if (isNonEmpty(String(maybeAirportId ?? ""))) nextCtx.faaId = normUpper(maybeAirportId);
      if (isNonEmpty(String(maybeIcao ?? ""))) nextCtx.xmlIcao = normUpper(maybeIcao);

      const maybeName =
        node.airport_name ??
        node.AIRPORT_NAME ??
        node.airport ??
        node.AIRPORT ??
        node.name ??
        node.NAME;

      if (typeof maybeName === "string" && isNonEmpty(maybeName)) nextCtx.airportName = maybeName.trim();
      else if (maybeName && typeof maybeName === "object") {
        const t = String(maybeName["#text"] ?? maybeName.text ?? maybeName._text ?? "").trim();
        if (isNonEmpty(t)) nextCtx.airportName = t;
      }

      const p = normProcuid(node.procuid ?? node.PROCUID ?? node["@_procuid"] ?? node["@_PROCUID"]);
      if (p) {
        const { faaId, xmlIcao, airportName } = extractAirportFieldsFromNode(node, nextCtx);

        // store only if we actually got something useful
        if (
          (isNonEmpty(faaId) && /^[A-Z0-9]{3,4}$/.test(faaId)) ||
          (isNonEmpty(xmlIcao) && xmlIcao.length === 4) ||
          isNonEmpty(airportName)
        ) {
          if (!procuidToAirport.has(p)) {
            procuidToAirport.set(p, { faaId, xmlIcao, airportName });
            procuidMapped++;
          }
        }
      }

      for (const k of Object.keys(node)) {
        walkBuildProcuidMap(node[k], nextCtx);
      }
    }
  }

  console.log("Pass A: building procuid -> airport map ...");
  walkBuildProcuidMap(doc, { faaId: "", xmlIcao: "", airportName: "" });
  console.log(
    `procuid mapped: ${procuidMapped.toLocaleString()} | map size: ${procuidToAirport.size.toLocaleString()}`
  );

  console.log("Pass B: collecting charts ...");

  const rows = [];
  let unresolvedIcao = 0;
  let totalChartRecordsSeen = 0;
  let dbgCount = 0;

  function walkCollectCharts(node, ctx) {
    if (node == null) return;

    if (Array.isArray(node)) {
      for (const item of node) walkCollectCharts(item, ctx);
      return;
    }

    if (typeof node === "object") {
      // keep airport context if present
      if (node.airport_name) {
        const ap = node.airport_name;
        const apNodes = Array.isArray(ap) ? ap : [ap];

        for (const apNode of apNodes) {
          let faaId = "";
          let xmlIcao = "";
          let apName = "";

          if (typeof apNode === "string") apName = apNode;
          else if (apNode && typeof apNode === "object") {
            faaId = apNode["@_ID"] ?? apNode["@_id"] ?? "";
            xmlIcao = apNode["@_icao"] ?? apNode["@_ICAO"] ?? "";
            apName = apNode["#text"] ?? apNode.text ?? apNode._text ?? "";
          }

          const nextCtx = {
            ...ctx,
            faaId: normUpper(faaId || ctx?.faaId),
            xmlIcao: normUpper(xmlIcao || ctx?.xmlIcao),
            airportName: (apName || ctx?.airportName || "").trim(),
          };

          walkCollectCharts(apNode, nextCtx);
        }
      }

      // detect chart record
      const pdfName =
        node.pdf_name ??
        node.PDF_NAME ??
        node.PdfName ??
        node["@_pdf_name"] ??
        node["@_PDF_NAME"];

      const chartName =
        node.chart_name ??
        node.procedure_name ??
        node.chartName ??
        node.name ??
        node.CHART_NAME ??
        node["@_chart_name"] ??
        node["@_CHART_NAME"];

      if (isNonEmpty(pdfName) && isNonEmpty(chartName)) {
        totalChartRecordsSeen++;

        const p = normProcuid(node.procuid ?? node.PROCUID ?? node["@_procuid"] ?? node["@_PROCUID"]);

        let { faaId, xmlIcao, airportName } = extractAirportFieldsFromNode(node, ctx);

        // if chart record doesn't include airport fields, map via procuid
        if ((!isNonEmpty(faaId) && !isNonEmpty(xmlIcao) && !isNonEmpty(airportName)) && p && procuidToAirport.has(p)) {
          const m = procuidToAirport.get(p);
          faaId = m.faaId || faaId;
          xmlIcao = m.xmlIcao || xmlIcao;
          airportName = m.airportName || airportName;
        }

        const icao = resolveIcao({ faaId, xmlIcao, mapLocalToIcao });

        if (!isNonEmpty(icao)) {
          unresolvedIcao++;

          if (dbgCount < DEBUG_UNRESOLVED_SAMPLES) {
            dbgCount++;

            const keys = Object.keys(node);
            const interesting = keys
              .filter((k) => /icao|ident|airport|apt|loc|faa|id|procuid|nfd/i.test(k))
              .slice(0, 80);

            console.log(`\n--- UNRESOLVED SAMPLE ${dbgCount} ---`);
            console.log("pdfName:", String(pdfName).slice(0, 160));
            console.log("chartName:", String(chartName).slice(0, 160));
            console.log("procuid:", p);
            console.log("ctx.faaId:", ctx?.faaId, "ctx.xmlIcao:", ctx?.xmlIcao);
            console.log("mapped faaId:", faaId, "xmlIcao:", xmlIcao, "airportName:", airportName);
            console.log("interesting keys:", interesting);

            for (const k of interesting) {
              const v = node[k];
              if (typeof v === "string" || typeof v === "number") {
                console.log(`  ${k}:`, String(v).slice(0, 160));
              } else if (v && typeof v === "object") {
                console.log(`  ${k}:`, Object.keys(v).slice(0, 30));
              }
            }
          }
        } else {
          const procedureName = String(chartName).trim();
          const runway = extractRunwayDesignator(procedureName);
          const url = `https://aeronav.faa.gov/d-tpp/${cycle}/${String(pdfName).trim()}`;

          rows.push({
            icao,
            faa_ident: faaId,
            airport_name: airportName,
            procedure_name: procedureName,
            runway_designator: runway,
            chart_url: url,
          });
        }
      }

      for (const k of Object.keys(node)) {
        walkCollectCharts(node[k], ctx);
      }
    }
  }

  walkCollectCharts(doc, { faaId: "", xmlIcao: "", airportName: "" });

  console.log(
    `Chart records seen: ${totalChartRecordsSeen.toLocaleString()} | rows resolved: ${rows.length.toLocaleString()} | unresolved ICAO: ${unresolvedIcao.toLocaleString()}`
  );

  // de-dup
  const dedup = new Map();
  for (const r of rows) {
    const key = `${r.icao}||${r.procedure_name}||${r.chart_url}`;
    if (!dedup.has(key)) dedup.set(key, r);
  }
  const finalRows = Array.from(dedup.values());
  console.log(`After de-dup: ${finalRows.length.toLocaleString()} rows`);

  if (normUpper(process.env.SKIP_DB) === "1") {
    console.log("SKIP_DB=1 set -> not touching database.");
    return;
  }

  if (!isNonEmpty(process.env.DATABASE_URL)) {
    throw new Error(`DATABASE_URL missing. Ensure .env.local has DATABASE_URL=...`);
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 30,
    prepare: false,
  });

  try {
    console.log("TRUNCATE airport_approaches ...");
    await sql`TRUNCATE TABLE airport_approaches`;

    console.log(`Inserting in batches of ${BATCH_SIZE.toLocaleString()} ...`);
    const batches = chunkArray(finalRows, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      await sql`
        INSERT INTO airport_approaches (
          icao, faa_ident, airport_name, procedure_name, runway_designator, chart_url
        )
        SELECT
          x.icao,
          x.faa_ident,
          x.airport_name,
          x.procedure_name,
          x.runway_designator,
          x.chart_url
        FROM jsonb_to_recordset(${sql.json(batch)}::jsonb) AS x(
          icao text,
          faa_ident text,
          airport_name text,
          procedure_name text,
          runway_designator text,
          chart_url text
        )
      `;

      console.log(
        `Batch ${i + 1}/${batches.length} inserted (${batch.length.toLocaleString()} rows)`
      );
    }

    const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM airport_approaches`;
    console.log(`Done. airport_approaches rowcount: ${Number(count).toLocaleString()}`);
  } finally {
    await sql.end({ timeout: 30 });
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exitCode = 1;
});
