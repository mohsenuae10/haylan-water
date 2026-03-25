/**
 * Try every possible Supabase API endpoint for running SQL.
 */
const REF = "iqxnbwfustwjrkgpzidv";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeG5id2Z1c3R3anJrZ3B6aWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ0MDYzNywiZXhwIjoyMDkwMDE2NjM3fQ.LKPYNwqZbrY4cdxMOCwMjpOyI1nJGOHV89yOrZKVr-s";
const DB_PASSWORD = "Mohsen9900&@";

const TEST_SQL = "SELECT 1 as test";

async function tryEndpoint(url, method, headers, body, label) {
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const status = res.status;
    const text = await res.text().catch(() => "");
    if (status < 400) {
      console.log(`✅ ${label}: ${status} -> ${text.slice(0, 150)}`);
      return true;
    } else if (status === 404) {
      // skip
    } else {
      console.log(`❌ ${label}: ${status} -> ${text.slice(0, 150)}`);
    }
  } catch (e) {
    console.log(`❌ ${label}: ${e.message}`);
  }
  return false;
}

async function main() {
  console.log("🔍 Searching for SQL execution endpoint...\n");

  const projectUrl = `https://${REF}.supabase.co`;
  const mgmtUrl = "https://api.supabase.com";

  const authHeaders = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
  };

  // Try project-level endpoints
  const projectEndpoints = [
    "/pg/query",
    "/pg/sql",  
    "/pg-meta/query",
    "/pg-meta/default/query",
    "/pg-meta/v1/query",
    "/database/query",
    "/sql",
    "/admin/query",
  ];

  for (const ep of projectEndpoints) {
    await tryEndpoint(
      `${projectUrl}${ep}`,
      "POST",
      authHeaders,
      { query: TEST_SQL },
      `Project ${ep}`
    );
  }

  // Try management API endpoints
  console.log("\n--- Management API ---\n");
  const mgmtEndpoints = [
    `/v1/projects/${REF}/database/query`,
    `/v1/projects/${REF}/sql`,
    `/v1/projects/${REF}/db/query`,
    `/platform/pg/${REF}/query`,
    `/platform/pg-meta/${REF}/query`,
    `/v1/pg/${REF}/query`,
  ];

  for (const ep of mgmtEndpoints) {
    await tryEndpoint(
      `${mgmtUrl}${ep}`,
      "POST",
      { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE_KEY}` },
      { query: TEST_SQL },
      `MGMT ${ep}`
    );
  }

  // Try with basic auth (postgres:password) encoded as base64
  console.log("\n--- Basic Auth attempts ---\n");
  const basicAuth = Buffer.from(`postgres:${DB_PASSWORD}`).toString("base64");

  for (const ep of ["/pg/query", "/pg-meta/default/query"]) {
    await tryEndpoint(
      `${projectUrl}${ep}`,
      "POST",
      { "Content-Type": "application/json", "Authorization": `Basic ${basicAuth}` },
      { query: TEST_SQL },
      `Basic Auth ${ep}`
    );
  }

  // Try GraphQL mutation approach
  console.log("\n--- GraphQL SQL approach ---\n");
  await tryEndpoint(
    `${projectUrl}/graphql/v1`,
    "POST",
    authHeaders,
    { query: `mutation { sql(query: "${TEST_SQL}") { rows } }` },
    "GraphQL mutation"
  );

  // Try calling the DB with connection string URI format
  console.log("\n--- Connection string URI test ---\n");
  const { Client } = require("pg");
  
  // Try URI format
  const uris = [
    `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@${REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${REF}:${encodeURIComponent(DB_PASSWORD)}@${REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${REF}:${encodeURIComponent(DB_PASSWORD)}@${REF}.supabase.co:6543/postgres`,
  ];

  for (const uri of uris) {
    const sanitized = uri.replace(encodeURIComponent(DB_PASSWORD), "***");
    const client = new Client({ connectionString: uri, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try {
      await Promise.race([
        client.connect(),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)),
      ]);
      console.log(`✅ URI: ${sanitized}`);
      await client.end();
      return;
    } catch (e) {
      console.log(`❌ URI ${sanitized}: ${e.message.slice(0, 60)}`);
      try { await client.end(); } catch {}
    }
  }
}

main().catch(console.error);
