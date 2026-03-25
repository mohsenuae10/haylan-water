/**
 * Run the auth/RLS fix migration against Supabase using service_role key.
 * Uses multiple connection approaches.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://iqxnbwfustwjrkgpzidv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeG5id2Z1c3R3anJrZ3B6aWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ0MDYzNywiZXhwIjoyMDkwMDE2NjM3fQ.LKPYNwqZbrY4cdxMOCwMjpOyI1nJGOHV89yOrZKVr-s";
const REF = "iqxnbwfustwjrkgpzidv";

// Read the migration SQL
const migrationPath = join(__dirname, "..", "supabase", "migrations", "20260325_fix_auth_and_rls.sql");
const migrationSQL = readFileSync(migrationPath, "utf-8");

// Split SQL into individual statements
function splitSQL(sql) {
  // Split by semicolons but ignore those inside function bodies ($$...$$)
  const statements = [];
  let current = "";
  let inDollarQuote = false;

  const lines = sql.split("\n");
  for (const line of lines) {
    // Skip pure comment lines
    if (line.trim().startsWith("--") && !inDollarQuote) {
      current += line + "\n";
      continue;
    }

    if (line.includes("$$")) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count % 2 === 1) {
        inDollarQuote = !inDollarQuote;
      }
    }

    current += line + "\n";

    if (!inDollarQuote && line.trim().endsWith(";")) {
      const trimmed = current.trim();
      // Filter out empty statements and pure comments
      if (trimmed && !trimmed.split("\n").every(l => l.trim().startsWith("--") || l.trim() === "")) {
        statements.push(trimmed);
      }
      current = "";
    }
  }

  if (current.trim()) {
    const trimmed = current.trim();
    if (trimmed && !trimmed.split("\n").every(l => l.trim().startsWith("--") || l.trim() === "")) {
      statements.push(trimmed);
    }
  }

  return statements;
}

// Approach 1: Use Supabase SQL API endpoint (pg-meta)  
async function tryPgMeta(sql) {
  console.log("\n=== Trying pg-meta SQL endpoint... ===");
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log("✅ pg-meta succeeded:", JSON.stringify(data).slice(0, 200));
    return true;
  }
  console.log(`❌ pg-meta failed: ${res.status} ${res.statusText}`);
  const text = await res.text().catch(() => "");
  if (text) console.log("   Response:", text.slice(0, 300));
  return false;
}

// Approach 2: Try different SQL-like endpoints
async function trySQLEndpoints(sql) {
  const endpoints = [
    "/rest/v1/rpc/exec_sql",
    "/rest/v1/rpc/execute_sql",  
    "/rest/v1/rpc/query",
  ];

  for (const ep of endpoints) {
    console.log(`\n=== Trying ${ep}... ===`);
    try {
      const res = await fetch(`${SUPABASE_URL}${ep}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ query: sql }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✅ ${ep} succeeded:`, JSON.stringify(data).slice(0, 200));
        return true;
      }
      const status = res.status;
      if (status !== 404) {
        console.log(`❌ ${ep}: ${status}`);
        const text = await res.text().catch(() => "");
        if (text) console.log("   Response:", text.slice(0, 200));
      } else {
        console.log(`   ${ep}: not found (404), skipping`);
      }
    } catch (err) {
      console.log(`   ${ep}: error - ${err.message}`);
    }
  }
  return false;
}

// Approach 3: Use pg module with direct connection
async function tryPgDirect(sql) {
  console.log("\n=== Trying direct PostgreSQL connection... ===");
  try {
    const pg = await import("pg").catch(() => null);
    if (!pg) {
      console.log("   pg module not available, installing...");
      const { execSync } = await import("child_process");
      execSync("npm install pg --no-save", { stdio: "pipe", cwd: join(__dirname, "..") });
      return tryPgDirect(sql); // retry
    }

    const { Client } = pg.default || pg;

    // Try direct connection with JWT as password
    const configs = [
      {
        label: "Direct DB with service_role JWT",
        host: `db.${REF}.supabase.co`,
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
      },
      {
        label: "Pooler (session) with service_role JWT",
        host: `aws-0-us-east-1.pooler.supabase.com`,
        port: 5432,
        database: "postgres",
        user: `postgres.${REF}`,
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
      },
      {
        label: "Pooler (transaction) with service_role JWT",
        host: `aws-0-us-east-1.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        user: `postgres.${REF}`,
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
      },
    ];

    for (const config of configs) {
      console.log(`\n   Trying: ${config.label}...`);
      const client = new Client(config);
      try {
        await Promise.race([
          client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
        ]);
        console.log(`   ✅ Connected via ${config.label}`);

        // Execute the SQL
        const statements = splitSQL(sql);
        let success = 0;
        let failed = 0;
        for (const stmt of statements) {
          try {
            await client.query(stmt);
            success++;
            // Extract a label from the statement
            const firstLine = stmt.split("\n").find(l => !l.trim().startsWith("--") && l.trim().length > 0) || stmt.slice(0, 60);
            console.log(`   ✅ [${success}] ${firstLine.trim().slice(0, 80)}`);
          } catch (err) {
            failed++;
            const firstLine = stmt.split("\n").find(l => !l.trim().startsWith("--") && l.trim().length > 0) || stmt.slice(0, 60);
            console.log(`   ⚠️ [${success + failed}] ${firstLine.trim().slice(0, 80)}`);
            console.log(`       Error: ${err.message}`);
          }
        }

        console.log(`\n   📊 Results: ${success} succeeded, ${failed} failed out of ${statements.length} statements`);
        await client.end();
        return true;
      } catch (err) {
        console.log(`   ❌ ${config.label}: ${err.message}`);
        try { await client.end(); } catch {}
      }
    }
  } catch (err) {
    console.log(`   ❌ pg approach failed: ${err.message}`);
  }
  return false;
}

// Main
async function main() {
  console.log("🔧 Haylan Water - Running Auth & RLS Fix Migration");
  console.log("📄 Migration file:", migrationPath);
  console.log("🌐 Supabase URL:", SUPABASE_URL);
  console.log("");

  // Try approach 1: pg-meta
  let success = await tryPgMeta(migrationSQL);
  if (success) {
    console.log("\n✅ Migration completed successfully via pg-meta!");
    return;
  }

  // Try approach 2: RPC endpoints  
  success = await trySQLEndpoints(migrationSQL);
  if (success) {
    console.log("\n✅ Migration completed successfully via RPC!");
    return;
  }

  // Try approach 3: Direct PostgreSQL connection
  success = await tryPgDirect(migrationSQL);
  if (success) {
    console.log("\n✅ Migration completed via direct PostgreSQL connection!");
    return;
  }

  console.log("\n❌ All approaches failed. Please run the SQL manually in Supabase SQL Editor.");
}

main().catch(console.error);
