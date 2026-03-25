/**
 * Apply fixes using Supabase REST API + service_role key.
 * Since direct DB access is blocked, we use the Management API approach.
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://iqxnbwfustwjrkgpzidv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeG5id2Z1c3R3anJrZ3B6aWR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ0MDYzNywiZXhwIjoyMDkwMDE2NjM3fQ.LKPYNwqZbrY4cdxMOCwMjpOyI1nJGOHV89yOrZKVr-s";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("🔧 Haylan Water - Applying fixes via REST API\n");

  // Step 1: Check current state
  console.log("📋 Step 1: Checking current database state...\n");

  const { data: profiles, error: profErr } = await supabase.from("profiles").select("*");
  console.log(`   Profiles: ${profiles?.length || 0} records`, profErr ? `(Error: ${profErr.message})` : "✅");
  if (profiles?.length) {
    profiles.forEach(p => console.log(`     - ${p.name} | ${p.phone} | role: ${p.role}`));
  }

  const { data: products, error: prodErr } = await supabase.from("products").select("id, name_ar, is_active, category");
  console.log(`   Products: ${products?.length || 0} records`, prodErr ? `(Error: ${prodErr.message})` : "✅");

  const { data: categories, error: catErr } = await supabase.from("categories").select("*");
  console.log(`   Categories: ${categories?.length || 0} records`, catErr ? `(Error: ${catErr.message})` : "✅");

  // Step 2: Test user creation via admin API
  console.log("\n📋 Step 2: Testing user signup flow...\n");

  const testPhone = "777777777";
  const testEmail = `${testPhone}@haylan.app`;

  // Check if test user already exists
  const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.find(u => u.email === testEmail);
  if (existing) {
    console.log(`   Test user already exists (${existing.id}), cleaning up...`);
    // Delete existing test user first
    await supabase.from("profiles").delete().eq("id", existing.id);
    await supabase.auth.admin.deleteUser(existing.id);
    console.log("   Cleaned up test user");
  }

  // Try creating a test user
  console.log("   Creating test user...");
  const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: "Test123456",
    email_confirm: true,
    user_metadata: {
      name: "مستخدم تجريبي",
      phone: testPhone,
      address: "عنوان تجريبي",
      role: "customer",
    },
  });

  if (signUpError) {
    console.log(`   ❌ User creation failed: ${signUpError.message}`);
    console.log("\n   This confirms the 'Database error saving new user' issue.");
    console.log("   The handle_new_user() trigger is failing.\n");

    // Step 3: Try to fix by creating user with auto_confirm and then manually creating profile
    console.log("📋 Step 3: Trying workaround - create user without trigger...\n");

    // Try again - sometimes the error is in the trigger but user gets created
    const { data: { users: checkUsers } } = await supabase.auth.admin.listUsers();
    const checkUser = checkUsers?.find(u => u.email === testEmail);

    if (checkUser) {
      console.log(`   User WAS created despite error (id: ${checkUser.id})`);
      console.log("   Creating profile manually via REST...");

      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: checkUser.id,
        name: "مستخدم تجريبي",
        phone: testPhone,
        address: "عنوان تجريبي",
        role: "customer",
      });

      if (profileErr) {
        console.log(`   ❌ Profile creation failed: ${profileErr.message}`);
      } else {
        console.log("   ✅ Profile created manually!");
      }

      // Clean up
      await supabase.from("profiles").delete().eq("id", checkUser.id);
      await supabase.auth.admin.deleteUser(checkUser.id);
      console.log("   Cleaned up test user");
    } else {
      console.log("   User was NOT created (trigger blocked it entirely).");
    }
  } else {
    console.log(`   ✅ User created successfully! ID: ${authData.user?.id}`);
    
    // Check if profile was auto-created
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single();
    if (profile) {
      console.log("   ✅ Profile auto-created by trigger!");
      console.log(`     Name: ${profile.name}, Phone: ${profile.phone}, Role: ${profile.role}`);
    } else {
      console.log("   ⚠️ Profile NOT auto-created. Trigger issue confirmed.");
      console.log("   Creating profile manually...");
      const { error } = await supabase.from("profiles").insert({
        id: authData.user.id,
        name: "مستخدم تجريبي",
        phone: testPhone,
        address: "عنوان تجريبي",
        role: "customer",
      });
      console.log(error ? `   ❌ ${error.message}` : "   ✅ Manual profile created");
    }

    // Clean up test user
    await supabase.from("profiles").delete().eq("id", authData.user.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log("   Cleaned up test user");
  }

  // Step 4: Test product creation with service_role
  console.log("\n📋 Step 4: Testing product creation (as service_role)...\n");

  const { data: testProduct, error: createErr } = await supabase.from("products").insert({
    name: "Test Product",
    name_ar: "منتج تجريبي",
    size: "test",
    price: 100,
    category: "water",
  }).select().single();

  if (createErr) {
    console.log(`   ❌ Product creation failed: ${createErr.message}`);
  } else {
    console.log(`   ✅ Product created (id: ${testProduct.id})`);
    // Clean up
    await supabase.from("products").delete().eq("id", testProduct.id);
    console.log("   Cleaned up test product");
  }

  // Step 5: Summary and next steps
  console.log("\n" + "=".repeat(60));
  console.log("📊 DIAGNOSIS COMPLETE");
  console.log("=".repeat(60));
}

main().catch(console.error);
