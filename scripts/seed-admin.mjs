/**
 * Seed Admin Account Script
 * Creates an admin user in Supabase Auth + updates profile role
 * 
 * Usage: node scripts/seed-admin.mjs
 * 
 * Admin credentials:
 *   Phone: 700000000
 *   Password: admin123456
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://iqxnbwfustwjrkgpzidv.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-aetjXqchSabcCHsxL3jzA_fmj1KOY-";

// Admin credentials
const ADMIN_PHONE = "700000000";
const ADMIN_PASSWORD = "admin123456";
const ADMIN_NAME = "مسؤول هيلان";
const ADMIN_ADDRESS = "المقر الرئيسي - صنعاء";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedAdmin() {
  console.log("🔧 Creating admin account...");
  console.log(`   Phone: ${ADMIN_PHONE}`);
  console.log(`   Email: ${ADMIN_PHONE}@haylan.app`);
  console.log(`   Name: ${ADMIN_NAME}`);
  console.log("");

  // Step 1: Sign up the admin user
  console.log("📝 Step 1: Signing up admin user...");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: `${ADMIN_PHONE}@haylan.app`,
    password: ADMIN_PASSWORD,
    options: {
      data: {
        name: ADMIN_NAME,
        phone: ADMIN_PHONE,
        address: ADMIN_ADDRESS,
        role: "admin",
      },
    },
  });

  if (signUpError) {
    if (signUpError.message.includes("already registered") || signUpError.message.includes("already been registered")) {
      console.log("⚠️  User already exists. Trying to sign in...");
      
      // Sign in instead
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: `${ADMIN_PHONE}@haylan.app`,
        password: ADMIN_PASSWORD,
      });

      if (signInError) {
        console.error("❌ Failed to sign in:", signInError.message);
        console.log("   The admin account may already exist with a different password.");
        console.log("   Try logging in with phone 700000000 in the app.");
        process.exit(1);
      }

      console.log("✅ Signed in as existing user:", signInData.user.id);
      
      // Step 2: Update profile role to admin
      console.log("📝 Step 2: Updating profile role to admin...");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin", name: ADMIN_NAME, address: ADMIN_ADDRESS })
        .eq("id", signInData.user.id);

      if (updateError) {
        console.error("❌ Failed to update profile:", updateError.message);
        console.log("   You may need to run this SQL manually in Supabase SQL Editor:");
        console.log(`   UPDATE profiles SET role = 'admin' WHERE phone = '${ADMIN_PHONE}';`);
      } else {
        console.log("✅ Profile updated to admin role!");
      }

      await supabase.auth.signOut();
      printSuccess();
      return;
    }

    console.error("❌ Sign up failed:", signUpError.message);
    process.exit(1);
  }

  if (!signUpData.user) {
    console.error("❌ No user returned from sign up");
    process.exit(1);
  }

  console.log("✅ User created:", signUpData.user.id);

  // Wait for the trigger to create the profile
  console.log("⏳ Waiting for profile trigger...");
  await new Promise((r) => setTimeout(r, 2000));

  // Step 2: Update profile role to admin (the trigger creates with 'admin' from metadata,
  // but let's ensure it's set correctly)
  console.log("📝 Step 2: Ensuring profile role is admin...");
  
  // Sign in to get authenticated session
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: `${ADMIN_PHONE}@haylan.app`,
    password: ADMIN_PASSWORD,
  });

  if (loginError) {
    console.log("⚠️  Could not sign in after signup (email confirmation may be required).");
    console.log("   The profile should have been created with admin role via the trigger.");
    console.log("   If not, run this SQL in Supabase SQL Editor:");
    console.log(`   UPDATE profiles SET role = 'admin' WHERE phone = '${ADMIN_PHONE}';`);
    printSuccess();
    return;
  }

  // Verify profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", loginData.user.id)
    .single();

  if (profileError) {
    console.log("⚠️  Could not read profile:", profileError.message);
  } else {
    console.log("📋 Current profile:", JSON.stringify(profile, null, 2));
    
    if (profile.role !== "admin") {
      console.log("📝 Updating role to admin...");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", loginData.user.id);
      
      if (updateError) {
        console.error("⚠️  Could not update role via API:", updateError.message);
        console.log("   Run this SQL in Supabase SQL Editor:");
        console.log(`   UPDATE profiles SET role = 'admin' WHERE phone = '${ADMIN_PHONE}';`);
      } else {
        console.log("✅ Role updated to admin!");
      }
    } else {
      console.log("✅ Role is already admin!");
    }
  }

  await supabase.auth.signOut();
  printSuccess();
}

function printSuccess() {
  console.log("");
  console.log("═══════════════════════════════════════════════");
  console.log("  ✅ Admin account ready!");
  console.log("═══════════════════════════════════════════════");
  console.log(`  📱 Phone:    ${ADMIN_PHONE}`);
  console.log(`  🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`  👤 Name:     ${ADMIN_NAME}`);
  console.log(`  🛡️  Role:     admin`);
  console.log("═══════════════════════════════════════════════");
  console.log("");
  console.log("  Login in the app → you'll be redirected to Admin panel");
  console.log("");
}

seedAdmin().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
