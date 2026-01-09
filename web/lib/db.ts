import postgres from "postgres";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_FV9CmJIZrQ3R@ep-super-smoke-agduxbza-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

export const sql = postgres(DATABASE_URL, {
  ssl: "require",
});
