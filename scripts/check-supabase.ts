/**
 * Verifies the shared fixture cache end to end. Costs 0 Perfect Corp units.
 *
 *   node --env-file=.env.local scripts/check-supabase.ts
 *
 * Checks the four things that are actually easy to get wrong, in the order that
 * makes a failure diagnosable: credentials present, table reachable, bucket
 * writable, and public read working. A row and an object are written under a
 * throwaway key and deleted again, so nothing is left behind.
 *
 * Never prints a key. The service role key bypasses row-level security, and a
 * setup script that echoes it into a terminal buffer or a CI log is how that
 * kind of credential escapes.
 */

const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const ok = (m: string) => console.log(`  \x1b[32mOK\x1b[0m   ${m}`);
const bad = (m: string, detail?: string) => {
  console.log(`  \x1b[31mFAIL\x1b[0m ${m}`);
  if (detail) console.log(`       ${detail}`);
  failures++;
};
let failures = 0;

console.log("\nSupabase shared cache\n");

if (!url || !key) {
  bad(
    "credentials",
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set. " +
      "Project Settings > API in the Supabase dashboard; use the service_role key, not anon.",
  );
  console.log("\nThe app still runs without these — the cache layer is simply inert.\n");
  process.exit(1);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  console.log(`  \x1b[33mWARN\x1b[0m SUPABASE_URL looks unusual: ${url}`);
}
// A service_role JWT carries its role in the payload. Catching an anon key here
// saves a confusing permission error three checks later.
try {
  const role = JSON.parse(Buffer.from(key.split(".")[1], "base64").toString()).role;
  if (role === "service_role") ok("credentials present, key is service_role");
  else bad("wrong key", `this is the "${role}" key; the service_role key is required`);
} catch {
  ok("credentials present (key format not recognised, continuing)");
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const probe = `__check_${Date.now().toString(36)}`;

// --- table -------------------------------------------------------------------
try {
  const res = await fetch(`${url}/rest/v1/fixtures?select=key&limit=1`, { headers });
  if (res.ok) ok("table `fixtures` reachable");
  else if (res.status === 404)
    bad("table `fixtures` missing", "Run supabase/schema.sql in the SQL editor.");
  else bad(`table query returned ${res.status}`, (await res.text()).slice(0, 160));
} catch (e) {
  bad("cannot reach Supabase", String(e));
}

// --- write + read back -------------------------------------------------------
try {
  const res = await fetch(`${url}/rest/v1/fixtures?on_conflict=key`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: probe, feature: "__check", inputs: {}, units_spent: 0 }),
  });
  if (res.ok) ok("table writable");
  else bad(`table write returned ${res.status}`, (await res.text()).slice(0, 160));
} catch (e) {
  bad("table write failed", String(e));
}

// --- storage -----------------------------------------------------------------
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
try {
  const res = await fetch(`${url}/storage/v1/object/fixtures/${probe}.jpg`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: png,
  });
  if (res.ok) ok("bucket `fixtures` writable");
  else if (res.status === 404)
    bad("bucket `fixtures` missing", "Create a PUBLIC Storage bucket named `fixtures`.");
  else bad(`bucket write returned ${res.status}`, (await res.text()).slice(0, 160));
} catch (e) {
  bad("bucket write failed", String(e));
}

// Public read is what lets <img> and <video> load a result straight from
// storage. A private bucket writes fine and then serves nothing.
try {
  const res = await fetch(`${url}/storage/v1/object/public/fixtures/${probe}.jpg`);
  if (res.ok) ok("bucket is public (browsers can load results)");
  else
    bad(
      "bucket is not public",
      "Storage > fixtures > Settings, mark it public. Results would not load in the browser.",
    );
} catch (e) {
  bad("public read failed", String(e));
}

// --- usage ledger ------------------------------------------------------------
try {
  const res = await fetch(`${url}/rest/v1/rpc/add_usage`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ p_session: probe, p_units: 0 }),
  });
  if (res.ok) ok("usage ledger works");
  else bad(`add_usage returned ${res.status}`, "Did supabase/schema.sql run completely?");
} catch (e) {
  bad("usage ledger failed", String(e));
}

// --- clean up ----------------------------------------------------------------
await fetch(`${url}/rest/v1/fixtures?key=eq.${probe}`, { method: "DELETE", headers }).catch(() => {});
await fetch(`${url}/rest/v1/usage?session=eq.${probe}`, { method: "DELETE", headers }).catch(() => {});
await fetch(`${url}/storage/v1/object/fixtures/${probe}.jpg`, { method: "DELETE", headers }).catch(
  () => {},
);

console.log(
  failures === 0
    ? "\n  Shared cache is wired. Set the same two variables in Vercel and redeploy.\n"
    : `\n  ${failures} check(s) failed — see above.\n`,
);
process.exit(failures ? 1 : 0);
