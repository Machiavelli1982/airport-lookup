// web/scripts/fetch-faa-data.mjs
import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';

const FAA_URL = "https://nfdc.faa.gov/webContent/28DaySub/current_subscriber_files.zip";
const DEST = "./data/faa_raw.zip";

console.log("✈️  Lade FAA NASR Daten herunter (Public Domain)...");

const file = fs.createWriteStream(DEST);
https.get(FAA_URL, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("✅ Download abgeschlossen. Entpacke Daten...");
    // Hier würde das Entpacken der ILS.txt oder APT.txt folgen
  });
});