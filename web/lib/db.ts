import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL. Set it in your environment (e.g. Vercel Project Settings → Environment Variables)."
  );
}

export const sql = postgres(DATABASE_URL, {
  ssl: "require",
});
