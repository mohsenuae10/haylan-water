const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const REF = "iqxnbwfustwjrkgpzidv";
const DB_PASSWORD = "Mohsen9900&@";

const migrationPath = path.join(__dirname, "..", "supabase", "migrations", "20260325_fix_auth_and_rls.sql");
const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

const REGIONS = ["us-east-1", "us-west-1", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"];

async function tryConnect(config, label) {
  console.log(`   Trying: ${label}...`);
  const client = new Client(config);
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
    ]);
    console.log(`   ✅ Connected!`);
    return client;
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
    try { await client.end(); } catch {}
    return null;
  }
}

async function main() {
  console.log("🔧 Running Auth & RLS Fix Migration\n");

  const configs = [
    // Direct DB
    {
      config: { host: `db.${REF}.supabase.co`, port: 5432, database: "postgres", user: "postgres", password: DB_PASSWORD, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 },
      label: "Direct DB (db.ref.supabase.co:5432)",
    },
    // Pooler sessions for each region
    ...REGIONS.flatMap(region => [
      {
        config: { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, database: "postgres", user: `postgres.${REF}`, password: DB_PASSWORD, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 },
        label: `Session Pooler (${region}:5432)`,
      },
      {
        config: { host: `aws-0-${region}.pooler.supabase.com`, port: 6543, database: "postgres", user: `postgres.${REF}`, password: DB_PASSWORD, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 },
        label: `Transaction Pooler (${region}:6543)`,
      },
    ]),
  ];

  let client = null;
  for (const { config, label } of configs) {
    client = await tryConnect(config, label);
    if (client) break;
  }

  if (!client) {
    console.log("\n❌ Could not connect. Please run SQL manually.");
    process.exit(1);
  }

  console.log("\n📄 Running migration...\n");
  try {
    await client.query(migrationSQL);
    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.log("⚠️ Full block failed:", err.message);
    console.log("   Retrying statement by statement...\n");

    // Split by $$ blocks awareness
    const stmts = [];
    let current = "";
    let inDollar = false;
    for (const line of migrationSQL.split("\n")) {
      if (line.includes("$$")) {
        const count = (line.match(/\$\$/g) || []).length;
        if (count % 2 === 1) inDollar = !inDollar;
      }
      current += line + "\n";
      if (!inDollar && line.trim().endsWith(";")) {
        const s = current.trim();
        if (s && !s.split("\n").every(l => l.trim().startsWith("--") || !l.trim())) {
          stmts.push(s);
        }
        current = "";
      }
    }

    let ok = 0, fail = 0;
    for (const s of stmts) {
      try {
        await client.query(s);
        ok++;
        const preview = s.split("\n").find(l => !l.trim().startsWith("--") && l.trim()) || s.slice(0, 60);
        console.log(`   ✅ ${preview.trim().slice(0, 80)}`);
      } catch (e) {
        fail++;
        const preview = s.split("\n").find(l => !l.trim().startsWith("--") && l.trim()) || s.slice(0, 60);
        console.log(`   ⚠️ ${preview.trim().slice(0, 80)}`);
        console.log(`      ${e.message}`);
      }
    }
    console.log(`\n📊 ${ok} succeeded, ${fail} failed`);
  }

  await client.end();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
