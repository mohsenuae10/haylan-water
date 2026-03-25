/**
 * Run the auth/RLS fix migration against Supabase.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SUPABASE_URL = "https://iqxnbwfustwjrkgpzidv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeG5id2Z1c3R3anJrZ3B6aWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ0MDYzNywiZXhwIjoyMDkwMDE2NjM3fQ.LKPYNwqZbrY4cdxMOCwMjpOyI1nJGOHV89yOrZKVr-s";
const REF = "iqxnbwfustwjrkgpzidv";

const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260325_fix_auth_and_rls.sql");
const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

// Regions to try for pooler
const REGIONS = [
  "us-east-1",
  "us-west-1", 
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
];

async function tryConnect(config, label) {
  console.log(`\n   Trying: ${label}...`);
  const client = new Client(config);
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout (10s)")), 10000)),
    ]);
    console.log(`   ✅ Connected!`);
    return client;
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    try { await client.end(); } catch {}
    return null;
  }
}

async function runSQL(client, sql) {
  try {
    await client.query(sql);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log("🔧 Haylan Water - Running Auth & RLS Fix Migration\n");

  // Build connection configs
  const configs = [];

  // Direct DB connection
  configs.push({
    config: {
      host: `db.${REF}.supabase.co`,
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: SERVICE_ROLE_KEY,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    },
    label: "Direct DB (db.ref.supabase.co:5432)",
  });

  // Pooler connections for multiple regions
  for (const region of REGIONS) {
    configs.push({
      config: {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 5432,
        database: "postgres",
        user: `postgres.${REF}`,
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      },
      label: `Session Pooler (${region}:5432)`,
    });
    configs.push({
      config: {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        user: `postgres.${REF}`,
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      },
      label: `Transaction Pooler (${region}:6543)`,
    });
  }

  // Try each connection
  let connectedClient = null;
  for (const { config, label } of configs) {
    const client = await tryConnect(config, label);
    if (client) {
      connectedClient = client;
      break;
    }
  }

  if (!connectedClient) {
    console.log("\n❌ Could not connect to database via any method.");
    console.log("   The service_role key cannot be used as a database password.");
    console.log("   Please run the SQL manually in Supabase SQL Editor.");
    process.exit(1);
  }

  // Run the full migration as a single transaction
  console.log("\n📄 Running migration...\n");
  const result = await runSQL(connectedClient, migrationSQL);

  if (result.success) {
    console.log("✅ Migration completed successfully!");
  } else {
    console.log("⚠️ Running as single block failed:", result.error);
    console.log("\n   Trying statement by statement...\n");

    // Split and run individually
    const statements = migrationSQL
      .replace(/--[^\n]*/g, "") // remove comments
      .split(/;\s*(?=\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let success = 0, failed = 0;
    for (const stmt of statements) {
      const r = await runSQL(connectedClient, stmt);
      if (r.success) {
        success++;
        console.log(`   ✅ ${stmt.slice(0, 70).replace(/\n/g, " ")}...`);
      } else {
        failed++;
        console.log(`   ⚠️ ${stmt.slice(0, 70).replace(/\n/g, " ")}...`);
        console.log(`      Error: ${r.error}`);
      }
    }
    console.log(`\n📊 Results: ${success} succeeded, ${failed} failed`);
  }

  await connectedClient.end();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
