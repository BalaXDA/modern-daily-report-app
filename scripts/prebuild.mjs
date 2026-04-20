// Auto-configures Prisma for the current build environment.
//
// - If DATABASE_URL looks like a Postgres URL, flips the Prisma datasource
//   provider to "postgresql" before generating/pushing.
// - If DATABASE_URL is missing (e.g. first Vercel deploy before adding a DB),
//   skips `prisma db push` so the build still succeeds. The app will start
//   serving 500s until DATABASE_URL is set, then a redeploy will create the
//   tables.
// - Locally with the default file:./dev.db URL, leaves the schema as "sqlite".
//
// This means you never have to hand-edit prisma/schema.prisma to deploy.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const SCHEMA = "prisma/schema.prisma";

// Tiny .env loader for local builds. On Vercel, process.env is already populated.
if (existsSync(".env") && !process.env.DATABASE_URL) {
  for (const raw of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

const url = process.env.DATABASE_URL ?? "";

const isPostgres = /^postgres(ql)?:\/\//i.test(url);
const isSqliteFile = url.startsWith("file:");
const wantedProvider = isPostgres ? "postgresql" : "sqlite";

if (!existsSync(SCHEMA)) {
  console.error(`[prebuild] ${SCHEMA} not found.`);
  process.exit(1);
}

const original = readFileSync(SCHEMA, "utf8");
const updated = original.replace(
  /provider\s*=\s*"(sqlite|postgresql|mysql|sqlserver|mongodb|cockroachdb)"/,
  `provider = "${wantedProvider}"`,
);

if (updated !== original) {
  writeFileSync(SCHEMA, updated);
  console.log(`[prebuild] Switched Prisma provider to "${wantedProvider}".`);
} else {
  console.log(`[prebuild] Prisma provider already "${wantedProvider}".`);
}

console.log("[prebuild] Running prisma generate...");
execSync("npx prisma generate", { stdio: "inherit" });

if (!url) {
  console.warn(
    "[prebuild] WARNING: DATABASE_URL is not set. Skipping `prisma db push`. " +
      "Set DATABASE_URL in your environment and redeploy to create tables.",
  );
  process.exit(0);
}

if (!isPostgres && !isSqliteFile) {
  console.warn(
    `[prebuild] DATABASE_URL is set but does not look like postgres:// or file:. ` +
      "Skipping db push to be safe.",
  );
  process.exit(0);
}

console.log("[prebuild] Running prisma db push...");
execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });
console.log("[prebuild] Done.");
