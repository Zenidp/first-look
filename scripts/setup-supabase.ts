/**
 * Applies supabase/schema.sql and creates the storage bucket. Idempotent.
 *
 *   node --env-file=.env.local scripts/setup-supabase.ts
 *
 * Uses the Supabase Management API rather than the CLI or a direct Postgres
 * connection, for three reasons:
 *
 *   - No dependency. This project has zero runtime dependencies and the value
 *     of that is real. `pg` or the CLI binary would both be new surface for one
 *     setup command that runs a handful of times in the project's life.
 *   - A personal access token is revocable in one click from the dashboard. A
 *     direct connection string embeds the database password, which is harder to
 *     rotate and appears in full in every command that uses it.
 *   - It is a setup-time credential only. SUPABASE_ACCESS_TOKEN belongs in
 *     .env.local and must NOT be added to Vercel — the running app never needs
 *     it, and a deployment that holds it is holding admin rights it cannot use.
 *
 * Get a token at https://supabase.com/dashboard/account/tokens
 *
 * Never prints the token. Run `npm run check:supabase` afterwards to verify.
 */

export {};

import { readFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function die(message: string, hint?: string): never {
  console.log(`\n  \x1b[31mFAIL\x1b[0m ${message}`);
  if (hint) console.log(`       ${hint}`);
  console.log();
  process.exit(1);
}

if (!url) die("SUPABASE_URL is not set.");
if (!token) {
  die(
    "SUPABASE_ACCESS_TOKEN is not set.",
    "Create one at https://supabase.com/dashboard/account/tokens and put it in " +
      ".env.local. It is only needed for this script — do not add it to Vercel.",
  );
}

// The project ref is the subdomain of the project URL.
const ref = new URL(url).hostname.split(".")[0];

console.log(`\nSupabase setup — project ${ref}\n`);

// --- schema ------------------------------------------------------------------
const sqlPath = path.join(process.cwd(), "supabase", "schema.sql");
const sql = await readFile(sqlPath, "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const detail = (await res.text()).slice(0, 400);
  if (res.status === 401)
    die("Management API rejected the token.", "Is SUPABASE_ACCESS_TOKEN a valid personal access token?");
  if (res.status === 404)
    die(`Project ${ref} not found for this token.`, "The token must belong to the account that owns the project.");
  die(`schema failed (${res.status})`, detail);
}
console.log("  \x1b[32mOK\x1b[0m   schema applied (tables, ledger function, indexes)");

// --- storage -----------------------------------------------------------------
// Buckets are not database objects, so the SQL above does not create one.
if (!serviceKey) {
  console.log("  \x1b[33mWARN\x1b[0m SUPABASE_SERVICE_ROLE_KEY not set — skipping the bucket.");
} else {
  const h = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  const make = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ id: "fixtures", name: "fixtures", public: true }),
  });

  if (make.ok) {
    console.log("  \x1b[32mOK\x1b[0m   bucket `fixtures` created, public");
  } else {
    // Already there. Make sure it is public — a private bucket writes fine and
    // then serves nothing, which looks like a working app full of broken images.
    const fix = await fetch(`${url}/storage/v1/bucket/fixtures`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ public: true }),
    });
    console.log(
      fix.ok
        ? "  \x1b[32mOK\x1b[0m   bucket `fixtures` already existed, confirmed public"
        : `  \x1b[31mFAIL\x1b[0m bucket: ${(await fix.text()).slice(0, 160)}`,
    );
  }
}

console.log("\n  Done. Verify with: npm run check:supabase\n");
