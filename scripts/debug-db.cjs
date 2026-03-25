const { Client } = require("pg");

const REF = "iqxnbwfustwjrkgpzidv";
const DB_PASSWORD = "Mohsen9900&@";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeG5id2Z1c3R3anJrZ3B6aWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ0MDYzNywiZXhwIjoyMDkwMDE2NjM3fQ.LKPYNwqZbrY4cdxMOCwMjpOyI1nJGOHV89yOrZKVr-s";
const SUPABASE_URL = `https://${REF}.supabase.co`;

async function main() {
  console.log("🔍 Step 1: Verify service_role key works...\n");

  // Test API key
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=count`, {
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Prefer": "count=exact",
    },
  });
  console.log(`   API test: ${res.status} ${res.statusText}`);
  const countHeader = res.headers.get("content-range");
  console.log(`   Profiles count: ${countHeader}`);

  console.log("\n🔍 Step 2: Try different pg-meta endpoints...\n");

  const endpoints = [
    "/pg/query",
    "/pg-meta/query",
    "/pg/sql",
    "/pg-meta/sql",
    "/rest/v1/rpc",
    "/graphql/v1",
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetch(`${SUPABASE_URL}${ep}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: "SELECT 1" }),
      });
      console.log(`   ${ep}: ${r.status} ${r.statusText}`);
      if (r.status !== 404) {
        const body = await r.text();
        console.log(`   Body: ${body.slice(0, 200)}`);
      }
    } catch (e) {
      console.log(`   ${ep}: ${e.message}`);
    }
  }

  console.log("\n🔍 Step 3: DNS resolution tests...\n");

  const dns = require("dns").promises;
  const hosts = [
    `db.${REF}.supabase.co`,
    `${REF}.supabase.co`,
    `aws-0-us-east-1.pooler.supabase.com`,
    `aws-0-eu-west-1.pooler.supabase.com`,
    `aws-0-ap-southeast-1.pooler.supabase.com`,
  ];
  for (const host of hosts) {
    try {
      const addrs = await dns.resolve4(host);
      console.log(`   ✅ ${host} -> ${addrs.join(", ")}`);
    } catch (e) {
      console.log(`   ❌ ${host} -> ${e.code || e.message}`);
    }
  }

  console.log("\n🔍 Step 4: Try database connection with resolved host...\n");

  // Try connecting via the project's IP directly
  try {
    const addrs = await dns.resolve4(`${REF}.supabase.co`);
    console.log(`   Project IP: ${addrs[0]}`);
    
    // Try port 5432 direct
    const client = new Client({
      host: addrs[0],
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await Promise.race([
        client.connect(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
      ]);
      console.log("   ✅ Connected via IP!");
      const r = await client.query("SELECT current_database(), current_user, version()");
      console.log(`   DB: ${r.rows[0].current_database}, User: ${r.rows[0].current_user}`);
      await client.end();
    } catch (e) {
      console.log(`   ❌ IP connection: ${e.message}`);
      try { await client.end(); } catch {}
    }
  } catch (e) {
    console.log(`   ❌ DNS resolve: ${e.message}`);
  }

  // Try connecting with different user formats
  console.log("\n🔍 Step 5: Try pooler with different user formats...\n");

  const poolerHost = "aws-0-us-east-1.pooler.supabase.com";
  const userFormats = [
    `postgres.${REF}`,
    `postgres`,
    REF,
    `supabase_admin.${REF}`,
  ];
  
  for (const user of userFormats) {
    for (const port of [5432, 6543]) {
      const client = new Client({
        host: poolerHost,
        port,
        database: "postgres",
        user,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      try {
        await Promise.race([
          client.connect(),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
        ]);
        console.log(`   ✅ ${user}@${poolerHost}:${port} -> Connected!`);
        await client.end();
        return;
      } catch (e) {
        const msg = e.message.length > 60 ? e.message.slice(0, 60) + "..." : e.message;
        console.log(`   ❌ ${user}@:${port} -> ${msg}`);
        try { await client.end(); } catch {}
      }
    }
  }
}

main().catch(console.error);
