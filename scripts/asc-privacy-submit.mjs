import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const ASC_KEY_ID = 'M2TYDG9BL3';
const ASC_ISSUER_ID = '357d12f0-8971-458f-996a-3fe430476d64';
const ASC_APP_ID = '6761268455';
const KEY_PATH = join(ROOT, `AuthKey_${ASC_KEY_ID}.p8`);
const VERSION_ID = 'deb04d3a-4670-41d3-8262-874b8d5c8e98';

function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' };
  const payload = { iss: ASC_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const privateKey = readFileSync(KEY_PATH, 'utf8');
  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();
  const derSig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${derSig.toString('base64url')}`;
}

const TOKEN = generateJWT();

async function api(path, method = 'GET', body = null) {
  const url = path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com${path}`;
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.error(`API Error ${res.status} ${method} ${path}:`);
    console.error(JSON.stringify(data, null, 2));
  }
  return { status: res.status, data, ok: res.ok };
}

async function main() {
  console.log('=== Setting App Privacy & Submitting ===\n');

  // Step 1: Check current data usage declarations
  console.log('1. Checking current app data usages...');
  const usagesRes = await api(`/v1/apps/${ASC_APP_ID}/appDataUsages?limit=50`);
  if (usagesRes.ok) {
    console.log(`   Current data usages: ${usagesRes.data.data.length}`);
    for (const u of usagesRes.data.data) {
      console.log(`   - ${u.id}: category=${u.attributes?.category}`);
    }
  }

  // Step 2: Check app data usage purposes and categories available 
  console.log('\n2. Checking app data usage categories...');
  // The app is a water delivery app using Supabase - it collects:
  // - Phone number (for auth)
  // - Name (for delivery)
  // - Address (for delivery)
  // - Order data (purchases)
  
  // First, let's try to delete existing usages and set fresh ones
  // Or publish the "no data collected" if appropriate
  
  // Check if there's a way to publish data usages
  console.log('\n3. Checking appDataUsagePublications...');
  const pubRes = await api(`/v1/apps/${ASC_APP_ID}/appDataUsagePublications`);
  console.log(`   Status: ${pubRes.status}`);
  if (pubRes.ok) {
    console.log(`   Publications: ${JSON.stringify(pubRes.data.data, null, 2)}`);
  }

  // For a water delivery app that uses Supabase auth (phone/email), we need to declare:
  // The data types and purposes
  // Available categories: DEMOGRAPHICS, IDENTIFIERS, CONTACT_INFO, PURCHASES, etc.
  // Available purposes: APP_FUNCTIONALITY, ANALYTICS, PRODUCT_PERSONALIZATION, etc.

  // Let's declare the data we collect
  // For this app: phone number for auth -> CONTACT_INFO, purpose: APP_FUNCTIONALITY
  
  // First check what data usage categories/purposes are available
  console.log('\n4. Creating app data usage declarations...');
  
  // For a water delivery app, we collect:
  // 1. Phone Number -> DATA_TYPE: PHONE_NUMBER, category: CONTACT_INFO, purpose: APP_FUNCTIONALITY
  // 2. Name -> DATA_TYPE: NAME, category: CONTACT_INFO, purpose: APP_FUNCTIONALITY  
  // 3. Physical Address -> DATA_TYPE: PHYSICAL_ADDRESS, category: CONTACT_INFO, purpose: APP_FUNCTIONALITY
  // 4. Purchase History -> DATA_TYPE: PURCHASE_HISTORY, category: PURCHASES, purpose: APP_FUNCTIONALITY
  // 5. User ID -> DATA_TYPE: USER_ID, category: IDENTIFIERS, purpose: APP_FUNCTIONALITY

  const dataDeclarations = [
    { category: 'PHONE_NUMBER', purposes: ['APP_FUNCTIONALITY'], dataProtections: ['DATA_NOT_LINKED_TO_YOU'] },
    { category: 'NAME', purposes: ['APP_FUNCTIONALITY'], dataProtections: ['DATA_LINKED_TO_YOU'] },
    { category: 'PHYSICAL_ADDRESS', purposes: ['APP_FUNCTIONALITY'], dataProtections: ['DATA_LINKED_TO_YOU'] },
    { category: 'PURCHASE_HISTORY', purposes: ['APP_FUNCTIONALITY'], dataProtections: ['DATA_LINKED_TO_YOU'] },
    { category: 'USER_ID', purposes: ['APP_FUNCTIONALITY'], dataProtections: ['DATA_LINKED_TO_YOU'] },
  ];

  for (const decl of dataDeclarations) {
    for (const purpose of decl.purposes) {
      for (const protection of decl.dataProtections) {
        console.log(`   Creating: ${decl.category} / ${purpose} / ${protection}`);
        const createRes = await api('/v1/appDataUsages', 'POST', {
          data: {
            type: 'appDataUsages',
            attributes: {
              category: decl.category,
              grouping: {
                purpose: purpose,
                dataProtection: protection
              }
            },
            relationships: {
              app: {
                data: { type: 'apps', id: ASC_APP_ID }
              }
            }
          }
        });
        if (createRes.ok) {
          console.log(`   ✓ Created ${decl.category}`);
        } else {
          // Check if already exists or different format needed
          console.log(`   ✗ Failed for ${decl.category}`);
        }
      }
    }
  }

  // Step 5: Publish the data usages
  console.log('\n5. Publishing data usage declarations...');
  const publishRes = await api('/v1/appDataUsagePublications', 'POST', {
    data: {
      type: 'appDataUsagePublications',
      relationships: {
        app: {
          data: { type: 'apps', id: ASC_APP_ID }
        }
      }
    }
  });
  
  if (publishRes.ok) {
    console.log('   ✓ Data usages published!');
  } else {
    console.log('   Trying alternative approach...');
    
    // Maybe we need to use the newer privacy responses API
    // Let's check what endpoints are available
    const privacyCheck = await api(`/v1/apps/${ASC_APP_ID}?fields[apps]=contentRightsDeclaration`);
    if (privacyCheck.ok) {
      console.log(`   Content rights: ${privacyCheck.data.data.attributes.contentRightsDeclaration}`);
    }
  }

  // Step 6: Check again and try to submit
  console.log('\n6. Verifying data usages after changes...');
  const usages2 = await api(`/v1/apps/${ASC_APP_ID}/appDataUsages?limit=50`);
  if (usages2.ok) {
    console.log(`   Data usages: ${usages2.data.data.length}`);
  }

  // Step 7: Try to add version to one of the existing review submissions
  console.log('\n7. Attempting to add version to existing submission...');
  const addItem = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: {
          data: { type: 'reviewSubmissions', id: '576a26b3-f4ec-4321-8108-b062fb2e3510' }
        },
        appStoreVersion: {
          data: { type: 'appStoreVersions', id: VERSION_ID }
        }
      }
    }
  });
  
  if (addItem.ok) {
    console.log('   ✓ Version added to submission!');
    
    // Confirm
    console.log('   Confirming submission...');
    const confirm = await api('/v1/reviewSubmissions/576a26b3-f4ec-4321-8108-b062fb2e3510', 'PATCH', {
      data: {
        type: 'reviewSubmissions',
        id: '576a26b3-f4ec-4321-8108-b062fb2e3510',
        attributes: { submitted: true }
      }
    });
    if (confirm.ok) {
      console.log('   ✅ APP SUBMITTED FOR REVIEW!');
    } else {
      console.log('   ✗ Confirmation failed');
    }
  } else {
    console.log('   ✗ Still blocked');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
