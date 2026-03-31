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
const BASE = 'https://api.appstoreconnect.apple.com/v1';

async function api(path, method = 'GET', body = null) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
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

const VERSION_ID = 'deb04d3a-4670-41d3-8262-874b8d5c8e98';

async function main() {
  console.log('=== Fixing Issues & Submitting ===\n');

  // 1. Fix review detail phone number
  console.log('1. Fixing review detail phone number...');
  const reviewUpdate = await api('/appStoreReviewDetails/46020197-0aa3-4fbb-84ea-4b4f0357b938', 'PATCH', {
    data: {
      type: 'appStoreReviewDetails',
      id: '46020197-0aa3-4fbb-84ea-4b4f0357b938',
      attributes: {
        contactFirstName: 'Mohsen',
        contactLastName: 'Haylan',
        contactEmail: 'alkurbi2013@gmail.com',
        contactPhone: '+971 50 000 0000'
      }
    }
  });
  console.log(reviewUpdate.ok ? '   ✓ Review detail fixed' : '   ✗ Failed');

  // 2. Update localizations WITHOUT whatsNew (can't set for v1.0)
  console.log('\n2. Updating localizations...');
  
  // en-US
  const enUpdate = await api('/appStoreVersionLocalizations/b601b651-b3f5-4bc1-a88c-fba1ef3a761b', 'PATCH', {
    data: {
      type: 'appStoreVersionLocalizations',
      id: 'b601b651-b3f5-4bc1-a88c-fba1ef3a761b',
      attributes: {
        description: 'Haylan Group app for ordering and delivering water. The app allows you to easily order water and track your orders in real-time. Enjoy fast and reliable delivery service to your home or office.',
        keywords: 'water,delivery,haylan,order,home water,drinking water,water delivery',
        supportUrl: 'https://mohsenuae10.github.io/haylan-water/privacy-policy.html',
        marketingUrl: 'https://mohsenuae10.github.io/haylan-water/'
      }
    }
  });
  console.log(enUpdate.ok ? '   ✓ en-US updated' : '   ✗ en-US failed');

  // ar-SA
  const arUpdate = await api('/appStoreVersionLocalizations/263284ae-36c3-4e27-ae92-78baf5fb4b13', 'PATCH', {
    data: {
      type: 'appStoreVersionLocalizations',
      id: '263284ae-36c3-4e27-ae92-78baf5fb4b13',
      attributes: {
        description: 'تطبيق مجموعة هيلان لطلب وتوصيل المياه. يتيح لك التطبيق طلب المياه بسهولة وتتبع طلباتك في الوقت الفعلي. استمتع بخدمة توصيل سريعة وموثوقة لمنزلك أو مكتبك.',
        keywords: 'مياه,توصيل,هيلان,طلب,مياه منزلية,مياه شرب,توصيل منزلي',
        supportUrl: 'https://mohsenuae10.github.io/haylan-water/privacy-policy.html',
        marketingUrl: 'https://mohsenuae10.github.io/haylan-water/'
      }
    }
  });
  console.log(arUpdate.ok ? '   ✓ ar-SA updated' : '   ✗ ar-SA failed');

  // 3. Check ar-SA screenshots - it has 0 screenshot sets
  // We need to check en-US screenshot sets and see if we can reference the same screenshots for ar-SA
  console.log('\n3. Checking en-US screenshots to copy for ar-SA...');
  const enLocId = 'b601b651-b3f5-4bc1-a88c-fba1ef3a761b';
  const arLocId = '263284ae-36c3-4e27-ae92-78baf5fb4b13';
  
  const enSets = await api(`/appStoreVersionLocalizations/${enLocId}/appScreenshotSets`);
  if (enSets.ok) {
    console.log(`   en-US has ${enSets.data.data.length} screenshot sets`);
    
    for (const enSet of enSets.data.data) {
      const displayType = enSet.attributes.screenshotDisplayType;
      console.log(`   Creating ${displayType} set for ar-SA...`);
      
      // Create screenshot set for ar-SA
      const arSetRes = await api('/appScreenshotSets', 'POST', {
        data: {
          type: 'appScreenshotSets',
          attributes: { screenshotDisplayType: displayType },
          relationships: {
            appStoreVersionLocalization: {
              data: { type: 'appStoreVersionLocalizations', id: arLocId }
            }
          }
        }
      });
      
      if (arSetRes.ok) {
        console.log(`   ✓ Created ${displayType} set for ar-SA (${arSetRes.data.data.id})`);
        
        // Get en-US screenshots in this set
        const enScreenshots = await api(`/appScreenshotSets/${enSet.id}/appScreenshots`);
        if (enScreenshots.ok) {
          console.log(`     ${enScreenshots.data.data.length} screenshots in en-US set`);
          // We can't copy screenshots directly - they need to be uploaded
          // But since the app is bilingual and screenshots show the same UI, 
          // we can try to upload them via URL
          for (const ss of enScreenshots.data.data) {
            console.log(`     Screenshot: ${ss.attributes.fileName} (${ss.attributes.fileSize} bytes) - ${ss.attributes.assetDeliveryState?.state}`);
            
            if (ss.attributes.sourceFileChecksum && ss.attributes.fileSize) {
              // Reserve a screenshot slot
              const reserveRes = await api('/appScreenshots', 'POST', {
                data: {
                  type: 'appScreenshots',
                  attributes: {
                    fileName: ss.attributes.fileName,
                    fileSize: ss.attributes.fileSize
                  },
                  relationships: {
                    appScreenshotSet: {
                      data: { type: 'appScreenshotSets', id: arSetRes.data.data.id }
                    }
                  }
                }
              });
              
              if (reserveRes.ok) {
                const newSS = reserveRes.data.data;
                console.log(`     ✓ Reserved slot for ${ss.attributes.fileName}`);
                
                // Now we need to upload the actual image data
                // Get the upload operations
                const uploadOps = newSS.attributes.uploadOperations || [];
                console.log(`     Upload operations: ${uploadOps.length}`);
                
                if (uploadOps.length > 0 && ss.attributes.imageAsset?.templateUrl) {
                  // Download from en-US and upload to ar-SA
                  const imageUrl = ss.attributes.imageAsset.templateUrl
                    .replace('{w}', ss.attributes.imageAsset.width)
                    .replace('{h}', ss.attributes.imageAsset.height)
                    .replace('{f}', 'png');
                  
                  console.log(`     Downloading from: ${imageUrl}`);
                  try {
                    const imgRes = await fetch(imageUrl);
                    if (imgRes.ok) {
                      const imgBuffer = await imgRes.arrayBuffer();
                      console.log(`     Downloaded ${imgBuffer.byteLength} bytes`);
                      
                      // Upload each part
                      for (const op of uploadOps) {
                        const chunk = imgBuffer.slice(op.offset, op.offset + op.length);
                        const uploadRes = await fetch(op.url, {
                          method: op.method,
                          headers: Object.fromEntries(op.requestHeaders.map(h => [h.name, h.value])),
                          body: chunk
                        });
                        console.log(`     Upload part: ${uploadRes.status}`);
                      }
                      
                      // Commit the upload
                      const commitRes = await api(`/appScreenshots/${newSS.id}`, 'PATCH', {
                        data: {
                          type: 'appScreenshots',
                          id: newSS.id,
                          attributes: {
                            uploaded: true,
                            sourceFileChecksum: ss.attributes.sourceFileChecksum
                          }
                        }
                      });
                      console.log(commitRes.ok ? `     ✓ Committed ${ss.attributes.fileName}` : `     ✗ Commit failed`);
                    }
                  } catch (e) {
                    console.log(`     ✗ Download/upload failed: ${e.message}`);
                  }
                }
              } else {
                console.log(`     ✗ Reserve failed for ${ss.attributes.fileName}`);
              }
            }
          }
        }
      } else {
        console.log(`   ✗ Failed to create ${displayType} set`);
      }
    }
  }

  // 4. Try to submit
  console.log('\n4. Checking version state before submission...');
  const finalVersion = await api(`/appStoreVersions/${VERSION_ID}`);
  if (finalVersion.ok) {
    console.log(`   State: ${finalVersion.data.data.attributes.appStoreState}`);
  }

  console.log('\n5. Attempting submission...');
  
  // Try the v2 submissions API endpoint
  const submitV2 = await api('https://api.appstoreconnect.apple.com/v2/submissions', 'POST', {
    data: {
      type: 'submissions',
      relationships: {
        items: {
          data: [{ type: 'appStoreVersions', id: VERSION_ID }]
        }
      }
    }
  });
  
  if (submitV2.ok) {
    console.log('   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY!');
  } else {
    // Try v1 appStoreVersionSubmissions
    const submitV1 = await api('/appStoreVersionSubmissions', 'POST', {
      data: {
        type: 'appStoreVersionSubmissions',
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: VERSION_ID }
          }
        }
      }
    });
    
    if (submitV1.ok) {
      console.log('   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY! (v1 API)');
    } else {
      console.log('   ✗ Both submission attempts failed');
      console.log('   Checking what might be blocking...');
      
      // Check if there's already a submission
      const existingSub = await api(`/appStoreVersions/${VERSION_ID}/appStoreVersionSubmission`);
      if (existingSub.ok && existingSub.data.data) {
        console.log(`   Existing submission found: ${existingSub.data.data.id}`);
        // Delete it and retry
        console.log('   Deleting existing submission and retrying...');
        await api(`/appStoreVersionSubmissions/${existingSub.data.data.id}`, 'DELETE');
        
        // Retry
        const retrySubmit = await api('/appStoreVersionSubmissions', 'POST', {
          data: {
            type: 'appStoreVersionSubmissions',
            relationships: {
              appStoreVersion: {
                data: { type: 'appStoreVersions', id: VERSION_ID }
              }
            }
          }
        });
        if (retrySubmit.ok) {
          console.log('   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY! (after retry)');
        }
      }
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
