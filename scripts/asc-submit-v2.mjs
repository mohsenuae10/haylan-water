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
  console.log('=== Submitting via Review Submissions API ===\n');

  // Step 0: Check screenshots exist for all required device types on en-US
  console.log('0. Verifying screenshots...');
  const verLocRes = await api(`/v1/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`);
  if (verLocRes.ok) {
    for (const loc of verLocRes.data.data) {
      const setsRes = await api(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
      if (setsRes.ok) {
        console.log(`   ${loc.attributes.locale} (${loc.id}): ${setsRes.data.data.length} screenshot sets`);
        for (const s of setsRes.data.data) {
          const shots = await api(`/v1/appScreenshotSets/${s.id}/appScreenshots`);
          const count = shots.ok ? shots.data.data.length : '?';
          console.log(`     ${s.attributes.screenshotDisplayType}: ${count} screenshots`);
        }
      }
    }
  }

  // Step 1: Check if there are existing review submissions
  console.log('\n1. Checking existing review submissions...');
  const existingRes = await api(`/v1/reviewSubmissions?filter[app]=${ASC_APP_ID}&filter[state]=WAITING_FOR_REVIEW,UNRESOLVED,IN_REVIEW`);
  if (existingRes.ok) {
    console.log(`   Found ${existingRes.data.data.length} existing review submissions`);
    for (const sub of existingRes.data.data) {
      console.log(`   - ${sub.id}: state=${sub.attributes.state}`);
    }
  }

  // Also check for ready/canceling etc
  const allSubs = await api(`/v1/reviewSubmissions?filter[app]=${ASC_APP_ID}`);
  if (allSubs.ok) {
    console.log(`   All review submissions: ${allSubs.data.data.length}`);
    for (const sub of allSubs.data.data) {
      console.log(`   - ${sub.id}: state=${sub.attributes.state}, platform=${sub.attributes.platform}`);
    }
  }

  // Step 2: Create a new review submission
  console.log('\n2. Creating review submission...');
  const createRes = await api('/v1/reviewSubmissions', 'POST', {
    data: {
      type: 'reviewSubmissions',
      attributes: {
        platform: 'IOS'
      },
      relationships: {
        app: {
          data: { type: 'apps', id: ASC_APP_ID }
        }
      }
    }
  });
  
  if (!createRes.ok) {
    console.log('   Failed to create review submission.');
    
    // If there's a conflict, try to use existing one
    if (createRes.status === 409) {
      console.log('   Conflict - checking for existing submission to use...');
      const readySubs = await api(`/v1/reviewSubmissions?filter[app]=${ASC_APP_ID}&filter[state]=READY_FOR_REVIEW`);
      if (readySubs.ok && readySubs.data.data.length > 0) {
        const existing = readySubs.data.data[0];
        console.log(`   Found existing: ${existing.id} (state: ${existing.attributes.state})`);
        
        // Try to confirm it directly
        console.log('   Confirming existing submission...');
        const confirmRes = await api(`/v1/reviewSubmissions/${existing.id}`, 'PATCH', {
          data: {
            type: 'reviewSubmissions',
            id: existing.id,
            attributes: {
              submitted: true
            }
          }
        });
        if (confirmRes.ok) {
          console.log('   ✅ EXISTING SUBMISSION CONFIRMED FOR REVIEW!');
          return;
        }
      }
    }
    return;
  }

  const submissionId = createRes.data.data.id;
  console.log(`   ✓ Review submission created: ${submissionId}`);
  console.log(`   State: ${createRes.data.data.attributes.state}`);

  // Step 3: Add the app store version as an item
  console.log('\n3. Adding app store version to review submission...');
  const addItemRes = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: {
          data: { type: 'reviewSubmissions', id: submissionId }
        },
        appStoreVersion: {
          data: { type: 'appStoreVersions', id: VERSION_ID }
        }
      }
    }
  });
  
  if (addItemRes.ok) {
    console.log(`   ✓ Version added to submission: ${addItemRes.data.data.id}`);
    console.log(`   State: ${addItemRes.data.data.attributes.state}`);
  } else {
    console.log('   ✗ Failed to add version to submission');
    
    // Check items already on this submission
    const itemsRes = await api(`/v1/reviewSubmissions/${submissionId}/items`);
    if (itemsRes.ok) {
      console.log(`   Existing items: ${itemsRes.data.data.length}`);
      for (const item of itemsRes.data.data) {
        console.log(`   - ${item.id}: state=${item.attributes.state}`);
      }
    }
  }

  // Step 4: Confirm (submit) the review submission
  console.log('\n4. Confirming review submission...');
  const confirmRes = await api(`/v1/reviewSubmissions/${submissionId}`, 'PATCH', {
    data: {
      type: 'reviewSubmissions',
      id: submissionId,
      attributes: {
        submitted: true
      }
    }
  });
  
  if (confirmRes.ok) {
    console.log(`   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY!`);
    console.log(`   Submission state: ${confirmRes.data.data.attributes.state}`);
  } else {
    console.log('   ✗ Failed to confirm submission');

    // Check the submission state
    const checkRes = await api(`/v1/reviewSubmissions/${submissionId}`);
    if (checkRes.ok) {
      console.log(`   Submission state: ${checkRes.data.data.attributes.state}`);
    }
    
    // Check what's blocking
    console.log('\n   Checking what might be missing...');
    
    // Check version state
    const versionCheck = await api(`/v1/appStoreVersions/${VERSION_ID}?include=appStoreVersionLocalizations,build`);
    if (versionCheck.ok) {
      const v = versionCheck.data.data;
      console.log(`   Version state: ${v.attributes.appStoreState}`);
      
      const included = versionCheck.data.included || [];
      const build = included.find(i => i.type === 'builds');
      console.log(`   Build attached: ${build ? 'YES (' + build.id + ')' : 'NO'}`);
    }

    // Check export compliance
    console.log('\n   Checking build export compliance...');
    const buildRel = await api(`/v1/appStoreVersions/${VERSION_ID}/relationships/build`);
    if (buildRel.ok && buildRel.data.data) {
      const buildId = buildRel.data.data.id;
      console.log(`   Build ID: ${buildId}`);
      
      // Check build details
      const buildDetail = await api(`/v1/builds/${buildId}?include=buildBetaDetail`);
      if (buildDetail.ok) {
        const b = buildDetail.data.data;
        console.log(`   Build version: ${b.attributes.version}`);
        console.log(`   Processing state: ${b.attributes.processingState}`);
        console.log(`   Uses non-exempt encryption: ${b.attributes.usesNonExemptEncryption}`);
      }
    }
  }

  // Final check
  console.log('\n5. Final version status check...');
  const finalCheck = await api(`/v1/appStoreVersions/${VERSION_ID}`);
  if (finalCheck.ok) {
    console.log(`   Version: ${finalCheck.data.data.attributes.versionString}`);
    console.log(`   State: ${finalCheck.data.data.attributes.appStoreState}`);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
