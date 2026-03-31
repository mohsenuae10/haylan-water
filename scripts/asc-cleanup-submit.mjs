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
  console.log('=== Clean Up & Submit ===\n');

  // Step 1: First try to add item to an existing submission and confirm
  console.log('1. Trying to use existing submission...');
  const existingId = '576a26b3-f4ec-4321-8108-b062fb2e3510';
  
  // Check items in this submission
  const itemsCheck = await api(`/v1/reviewSubmissions/${existingId}/items`);
  if (itemsCheck.ok) {
    console.log(`   Items in submission: ${itemsCheck.data.data.length}`);
  }
  
  // Try adding version to existing submission
  console.log('   Adding version to existing submission...');
  const addItem = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: {
          data: { type: 'reviewSubmissions', id: existingId }
        },
        appStoreVersion: {
          data: { type: 'appStoreVersions', id: VERSION_ID }
        }
      }
    }
  });
  
  if (addItem.ok) {
    console.log(`   ✓ Added version to submission`);
    
    // Now confirm
    console.log('   Confirming submission...');
    const confirm = await api(`/v1/reviewSubmissions/${existingId}`, 'PATCH', {
      data: {
        type: 'reviewSubmissions',
        id: existingId,
        attributes: { submitted: true }
      }
    });
    
    if (confirm.ok) {
      console.log(`   ✅ APP SUBMITTED FOR REVIEW! State: ${confirm.data.data.attributes.state}`);
      return;
    } else {
      console.log('   ✗ Confirm failed');
    }
  } else {
    console.log('   ✗ Could not add item to existing submission');
  }

  // Step 2: Cancel all existing submissions
  console.log('\n2. Canceling all 5 existing empty submissions...');
  const allSubs = await api(`/v1/reviewSubmissions?filter[app]=${ASC_APP_ID}`);
  if (allSubs.ok) {
    for (const sub of allSubs.data.data) {
      if (sub.attributes.state === 'READY_FOR_REVIEW') {
        console.log(`   Canceling ${sub.id}...`);
        // To cancel, we PATCH with canceled: true
        const cancelRes = await api(`/v1/reviewSubmissions/${sub.id}`, 'PATCH', {
          data: {
            type: 'reviewSubmissions',
            id: sub.id,
            attributes: { canceled: true }
          }
        });
        if (cancelRes.ok) {
          console.log(`   ✓ Canceled ${sub.id}`);
        } else {
          // Try DELETE
          console.log(`   Trying DELETE...`);
          const delRes = await api(`/v1/reviewSubmissions/${sub.id}`, 'DELETE');
          console.log(delRes.ok ? `   ✓ Deleted ${sub.id}` : `   ✗ Could not delete`);
        }
      }
    }
  }

  // Wait a moment
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: Create fresh submission with version
  console.log('\n3. Creating fresh review submission...');
  const createRes = await api('/v1/reviewSubmissions', 'POST', {
    data: {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: {
        app: {
          data: { type: 'apps', id: ASC_APP_ID }
        }
      }
    }
  });
  
  if (!createRes.ok) {
    console.log('   ✗ Still cannot create submission');
    
    // Check how many are left
    const remaining = await api(`/v1/reviewSubmissions?filter[app]=${ASC_APP_ID}`);
    if (remaining.ok) {
      console.log(`   Remaining submissions: ${remaining.data.data.length}`);
      for (const s of remaining.data.data) {
        console.log(`   - ${s.id}: ${s.attributes.state}`);
      }
      
      // Try to use a CANCELING state one that might now be COMPLETE
      for (const s of remaining.data.data) {
        if (s.attributes.state === 'READY_FOR_REVIEW' || s.attributes.state === 'COMPLETE' || s.attributes.state === 'CANCELING') {
          // Try to add item
          const tryAdd = await api('/v1/reviewSubmissionItems', 'POST', {
            data: {
              type: 'reviewSubmissionItems',
              relationships: {
                reviewSubmission: { data: { type: 'reviewSubmissions', id: s.id } },
                appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } }
              }
            }
          });
          if (tryAdd.ok) {
            console.log(`   ✓ Added version to ${s.id}`);
            const tryConfirm = await api(`/v1/reviewSubmissions/${s.id}`, 'PATCH', {
              data: {
                type: 'reviewSubmissions', id: s.id,
                attributes: { submitted: true }
              }
            });
            if (tryConfirm.ok) {
              console.log(`   ✅ APP SUBMITTED FOR REVIEW!`);
              return;
            }
          }
        }
      }
    }
    return;
  }

  const newSubId = createRes.data.data.id;
  console.log(`   ✓ Created: ${newSubId}`);

  // Step 4: Add version item
  console.log('\n4. Adding version to submission...');
  const addRes = await api('/v1/reviewSubmissionItems', 'POST', {
    data: {
      type: 'reviewSubmissionItems',
      relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: newSubId } },
        appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } }
      }
    }
  });
  
  if (!addRes.ok) {
    console.log('   ✗ Failed to add version');
    return;
  }
  console.log(`   ✓ Added version item: ${addRes.data.data.id}`);

  // Step 5: Confirm submission
  console.log('\n5. Confirming submission...');
  const confirmRes = await api(`/v1/reviewSubmissions/${newSubId}`, 'PATCH', {
    data: {
      type: 'reviewSubmissions',
      id: newSubId,
      attributes: { submitted: true }
    }
  });
  
  if (confirmRes.ok) {
    console.log(`   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY!`);
    console.log(`   State: ${confirmRes.data.data.attributes.state}`);
  } else {
    console.log('   ✗ Submission confirmation failed');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
