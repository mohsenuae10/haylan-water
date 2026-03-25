const { Client } = require("pg");

const REF = "iqxnbwfustwjrkgpzidv";
const DB_PASSWORD = "Mohsen9900&@";

async function tryConnect(config, label) {
  const client = new Client({ ...config, connectionTimeoutMillis: 12000 });
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ]);
    console.log(`✅ ${label} -> Connected!`);
    const r = await client.query("SELECT current_database(), current_user");
    console.log(`   DB: ${r.rows[0].current_database}, User: ${r.rows[0].current_user}`);
    await client.end();
    return true;
  } catch (e) {
    const msg = e.message.length > 80 ? e.message.slice(0, 80) + "..." : e.message;
    console.log(`❌ ${label} -> ${msg}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  console.log("🔍 Testing all possible Supabase connection formats...\n");

  const hosts = [
    // Newer Supabase DB format
    `${REF}.supabase.co`,
    `db-${REF}.supabase.co`,
    `db.${REF}.supabase.co`,
    `${REF}.database.supabase.co`,
    `db-${REF}.database.supabase.co`,
    // Direct IP via hostname
    `${REF}.supabase.com`,
    `db.${REF}.supabase.com`,
  ];

  const users = ["postgres", `postgres.${REF}`];
  const ports = [5432, 6543];

  for (const host of hosts) {
    for (const user of users) {
      for (const port of ports) {
        const label = `${user}@${host}:${port}`;
        const found = await tryConnect({
          host, port, database: "postgres", user,
          password: DB_PASSWORD,
          ssl: { rejectUnauthorized: false },
        }, label);
        if (found) return;
      }
    }
  }

  // Also try all cloud pooler variations
  console.log("\n🔍 Testing more pooler regions...\n");
  const clouds = ["aws-0", "gcp-0", "azure-0"];
  const regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-central-1",
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
    "sa-east-1", "me-south-1", "af-south-1",
    "eu-north-1", "me-central-1",
  ];

  for (const cloud of clouds) {
    for (const region of regions) {
      const host = `${cloud}-${region}.pooler.supabase.com`;
      const label = `postgres.${REF}@${host}:6543`;
      const found = await tryConnect({
        host, port: 6543, database: "postgres",
        user: `postgres.${REF}`,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      }, label);
      if (found) return;
    }
  }

  console.log("\n❌ No connection method worked.");
  console.log("   Please check Settings → Database → Connection string in Supabase Dashboard");
}

main().catch(console.error);
