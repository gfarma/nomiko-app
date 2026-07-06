import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI (db push / migrate / studio) does not auto-load env files in v7.
// Load .env.local first (Next.js convention), then .env as fallback.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
