import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ASC API credentials from eas.json
const ASC_KEY_ID = 'M2TYDG9BL3';
const ASC_ISSUER_ID = '357d12f0-8971-458f-996a-3fe430476d64';
const ASC_APP_ID = '6761268455';
const KEY_PATH = join(ROOT, `AuthKey_${ASC_KEY_ID}.p8`);

// Generate JWT for App Store Connect API
function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'ES256',
    kid: ASC_KEY_ID,
    typ: 'JWT'
  };
  const payload = {
    iss: ASC_ISSUER_ID,
    iat: now,
    exp: now + 1200, // 20 minutes
    aud: 'appstoreconnect-v1'
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = readFileSync(KEY_PATH, 'utf8');
  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();
  
  const derSig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  const signature = derSig.toString('base64url');

  return `${signingInput}.${signature}`;
}

const TOKEN = generateJWT();
const BASE = 'https://api.appstoreconnect.apple.com/v1';

async function api(path, method = 'GET', body = null) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
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

// ---- Main ----
async function main() {
  console.log('=== App Store Connect API ===\n');

  // 1. Get app info
  console.log('1. Getting app info...');
  const appRes = await api(`/apps/${ASC_APP_ID}?include=appStoreVersions&fields[appStoreVersions]=versionString,appStoreState,appVersionState,createdDate`);
  if (!appRes.ok) { console.error('Failed to get app'); return; }
  
  const app = appRes.data.data;
  console.log(`   App: ${app.attributes.name} (${app.attributes.bundleId})`);
  
  const versions = appRes.data.included || [];
  console.log(`   Versions found: ${versions.length}`);
  for (const v of versions) {
    console.log(`   - ${v.attributes.versionString} | State: ${v.attributes.appStoreState || v.attributes.appVersionState} | ID: ${v.id}`);
  }

  // 2. Find the version that needs submission (PREPARE_FOR_SUBMISSION or READY_FOR_REVIEW etc.)
  let editVersion = versions.find(v => 
    v.attributes.appStoreState === 'PREPARE_FOR_SUBMISSION' || 
    v.attributes.appVersionState === 'PREPARE_FOR_SUBMISSION'
  );
  
  if (!editVersion) {
    editVersion = versions.find(v => 
      v.attributes.appStoreState === 'READY_FOR_REVIEW' || 
      v.attributes.appVersionState === 'READY_FOR_REVIEW'
    );
  }

  if (!editVersion) {
    console.log('\n   No editable version found. Checking all versions...');
    const allVersions = await api(`/apps/${ASC_APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,READY_FOR_REVIEW,DEVELOPER_ACTION_NEEDED,INVALID_BINARY,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED,WAITING_FOR_EXPORT_COMPLIANCE,WAITING_FOR_REVIEW,IN_REVIEW,PENDING_DEVELOPER_RELEASE&limit=10`);
    if (allVersions.ok && allVersions.data.data.length > 0) {
      editVersion = allVersions.data.data[0];
      console.log(`   Found version: ${editVersion.attributes.versionString} | State: ${editVersion.attributes.appStoreState}`);
    } else {
      console.log('   No editable version found at all.');
      // Try to get all versions regardless of state
      const anyVersions = await api(`/apps/${ASC_APP_ID}/appStoreVersions?limit=10`);
      if (anyVersions.ok) {
        for (const v of anyVersions.data.data) {
          console.log(`   - ${v.attributes.versionString} | State: ${v.attributes.appStoreState} | ID: ${v.id}`);
        }
        // Pick the first non-live version
        editVersion = anyVersions.data.data[0];
      }
      if (!editVersion) return;
    }
  }

  const versionId = editVersion.id;
  const versionState = editVersion.attributes.appStoreState;
  console.log(`\n2. Working with version ${editVersion.attributes.versionString} (${versionState}) ID: ${versionId}`);

  // 3. Get detailed version info
  console.log('\n3. Getting version details...');
  const versionDetail = await api(`/appStoreVersions/${versionId}?include=appStoreVersionLocalizations,build,appStoreReviewDetail,appStoreVersionPhasedRelease`);
  if (versionDetail.ok) {
    const vd = versionDetail.data.data;
    console.log(`   Version: ${vd.attributes.versionString}`);
    console.log(`   State: ${vd.attributes.appStoreState}`);
    console.log(`   Copyright: ${vd.attributes.copyright}`);
    console.log(`   Release Type: ${vd.attributes.releaseType}`);
    
    const included = versionDetail.data.included || [];
    const localizations = included.filter(i => i.type === 'appStoreVersionLocalizations');
    const build = included.find(i => i.type === 'builds');
    const reviewDetail = included.find(i => i.type === 'appStoreReviewDetails');
    
    console.log(`   Localizations: ${localizations.length}`);
    for (const l of localizations) {
      console.log(`     - ${l.attributes.locale}: "${l.attributes.description?.substring(0, 50)}..."`);
      console.log(`       Keywords: ${l.attributes.keywords}`);
      console.log(`       Support URL: ${l.attributes.supportUrl}`);
      console.log(`       Marketing URL: ${l.attributes.marketingUrl}`);
    }
    
    if (build) {
      console.log(`   Build: ${build.attributes?.version || 'linked'} (ID: ${build.id})`);
    } else {
      console.log('   Build: NOT LINKED - need to attach build');
    }
    
    if (reviewDetail) {
      console.log(`   Review Detail: exists (ID: ${reviewDetail.id})`);
    } else {
      console.log('   Review Detail: NOT SET');
    }
  }

  // 4. Check if build is attached, if not attach it
  console.log('\n4. Checking build attachment...');
  const buildRel = await api(`/appStoreVersions/${versionId}/relationships/build`);
  if (buildRel.ok) {
    if (buildRel.data.data) {
      console.log(`   Build is attached: ${buildRel.data.data.id}`);
    } else {
      console.log('   No build attached. Finding latest build...');
      const builds = await api(`/builds?filter[app]=${ASC_APP_ID}&filter[processingState]=VALID&sort=-uploadedDate&limit=5`);
      if (builds.ok && builds.data.data.length > 0) {
        const latestBuild = builds.data.data[0];
        console.log(`   Latest build: ${latestBuild.attributes.version} (${latestBuild.id})`);
        
        // Attach build to version
        const attachRes = await api(`/appStoreVersions/${versionId}/relationships/build`, 'PATCH', {
          data: { type: 'builds', id: latestBuild.id }
        });
        if (attachRes.ok) {
          console.log('   ✓ Build attached successfully!');
        } else {
          console.error('   ✗ Failed to attach build');
        }
      }
    }
  }

  // 5. Check/Create App Store Review Detail (contact info)
  console.log('\n5. Checking review detail...');
  const reviewRes = await api(`/appStoreVersions/${versionId}/appStoreReviewDetail`);
  if (!reviewRes.ok || !reviewRes.data.data) {
    console.log('   Creating review detail...');
    const createReview = await api('/appStoreReviewDetails', 'POST', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: {
          contactFirstName: 'Mohsen',
          contactLastName: 'Haylan',
          contactEmail: 'alkurbi2013@gmail.com',
          contactPhone: '+971000000000'
        },
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId }
          }
        }
      }
    });
    if (createReview.ok) {
      console.log('   ✓ Review detail created');
    } else {
      console.log('   Trying to update existing...');
    }
  } else {
    console.log(`   Review detail exists: ${reviewRes.data.data.id}`);
    // Update it to make sure info is correct
    const updateReview = await api(`/appStoreReviewDetails/${reviewRes.data.data.id}`, 'PATCH', {
      data: {
        type: 'appStoreReviewDetails',
        id: reviewRes.data.data.id,
        attributes: {
          contactFirstName: 'Mohsen',
          contactLastName: 'Haylan',
          contactEmail: 'alkurbi2013@gmail.com',
          contactPhone: '+971000000000'
        }
      }
    });
    if (updateReview.ok) console.log('   ✓ Review detail updated');
  }

  // 6. Check localizations
  console.log('\n6. Checking localizations...');
  const locsRes = await api(`/appStoreVersions/${versionId}/appStoreVersionLocalizations`);
  if (locsRes.ok) {
    const locs = locsRes.data.data;
    console.log(`   Found ${locs.length} localizations`);
    
    const requiredLocs = {
      'en-US': {
        description: 'Haylan Group app for ordering and delivering water. The app allows you to easily order water and track your orders in real-time. Enjoy fast and reliable delivery service to your home or office.',
        keywords: 'water,delivery,haylan,order,home water,drinking water,water delivery',
        supportUrl: 'https://mohsenuae10.github.io/haylan-water/privacy-policy.html',
        marketingUrl: 'https://mohsenuae10.github.io/haylan-water/',
        whatsNew: 'Performance improvements and bug fixes'
      },
      'ar-SA': {
        description: 'تطبيق مجموعة هيلان لطلب وتوصيل المياه. يتيح لك التطبيق طلب المياه بسهولة وتتبع طلباتك في الوقت الفعلي. استمتع بخدمة توصيل سريعة وموثوقة لمنزلك أو مكتبك.',
        keywords: 'مياه,توصيل,هيلان,طلب,مياه منزلية,مياه شرب,توصيل منزلي',
        supportUrl: 'https://mohsenuae10.github.io/haylan-water/privacy-policy.html',
        marketingUrl: 'https://mohsenuae10.github.io/haylan-water/',
        whatsNew: 'تحسينات على الأداء وإصلاح الأخطاء'
      }
    };

    for (const [locale, attrs] of Object.entries(requiredLocs)) {
      const existing = locs.find(l => l.attributes.locale === locale);
      if (existing) {
        console.log(`   Updating ${locale}...`);
        const upd = await api(`/appStoreVersionLocalizations/${existing.id}`, 'PATCH', {
          data: {
            type: 'appStoreVersionLocalizations',
            id: existing.id,
            attributes: attrs
          }
        });
        if (upd.ok) console.log(`   ✓ ${locale} updated`);
        else console.log(`   ✗ ${locale} update failed`);
      } else {
        console.log(`   Creating ${locale}...`);
        const crt = await api('/appStoreVersionLocalizations', 'POST', {
          data: {
            type: 'appStoreVersionLocalizations',
            attributes: { locale, ...attrs },
            relationships: {
              appStoreVersion: {
                data: { type: 'appStoreVersions', id: versionId }
              }
            }
          }
        });
        if (crt.ok) console.log(`   ✓ ${locale} created`);
        else console.log(`   ✗ ${locale} creation failed`);
      }
    }
  }

  // 7. Check app-level info (privacy policy, category etc.)
  console.log('\n7. Checking app info...');
  const appInfoRes = await api(`/apps/${ASC_APP_ID}/appInfos`);
  if (appInfoRes.ok && appInfoRes.data.data.length > 0) {
    const appInfo = appInfoRes.data.data[0];
    console.log(`   App Info ID: ${appInfo.id}`);
    console.log(`   App Store Age Rating: ${appInfo.attributes.appStoreAgeRating}`);
    console.log(`   Brazil Age Rating: ${appInfo.attributes.brazilAgeRating}`);
    console.log(`   Korean Age Rating: ${appInfo.attributes.koreaAgeRating}`);
    
    // Check app info localizations
    const appInfoLocs = await api(`/appInfos/${appInfo.id}/appInfoLocalizations`);
    if (appInfoLocs.ok) {
      console.log(`   App Info Localizations: ${appInfoLocs.data.data.length}`);
      for (const l of appInfoLocs.data.data) {
        console.log(`     - ${l.attributes.locale}: name="${l.attributes.name}" subtitle="${l.attributes.subtitle}" privacyPolicyUrl="${l.attributes.privacyPolicyUrl}"`);
        
        // Update privacy policy URL if missing
        if (!l.attributes.privacyPolicyUrl) {
          console.log(`     Updating privacy policy for ${l.attributes.locale}...`);
          await api(`/appInfoLocalizations/${l.id}`, 'PATCH', {
            data: {
              type: 'appInfoLocalizations',
              id: l.id,
              attributes: {
                privacyPolicyUrl: 'https://mohsenuae10.github.io/haylan-water/privacy-policy.html'
              }
            }
          });
        }
      }
    }

    // Check categories
    const catRes = await api(`/appInfos/${appInfo.id}/relationships/primaryCategory`);
    if (catRes.ok) {
      console.log(`   Primary Category: ${catRes.data.data ? catRes.data.data.id : 'NOT SET'}`);
      if (!catRes.data.data) {
        // Set Food & Drink as primary category
        await api(`/appInfos/${appInfo.id}/relationships/primaryCategory`, 'PATCH', {
          data: { type: 'appCategories', id: 'FOOD_AND_DRINK' }
        });
        console.log('   ✓ Primary category set to FOOD_AND_DRINK');
      }
    }
  }

  // 8. Check age rating declaration
  console.log('\n8. Checking age rating...');
  const ageRatingRes = await api(`/apps/${ASC_APP_ID}/ageRatingDeclaration`);
  if (ageRatingRes.ok && ageRatingRes.data.data) {
    console.log(`   Age rating declaration exists: ${ageRatingRes.data.data.id}`);
    // Update to ensure all ratings are NONE
    const ageUpdate = await api(`/ageRatingDeclarations/${ageRatingRes.data.data.id}`, 'PATCH', {
      data: {
        type: 'ageRatingDeclarations',
        id: ageRatingRes.data.data.id,
        attributes: {
          alcoholTobaccoOrDrugUseOrReferences: 'NONE',
          contests: 'NONE',
          gamblingSimulated: 'NONE',
          horrorOrFearThemes: 'NONE',
          matureOrSuggestiveThemes: 'NONE',
          medicalOrTreatmentInformation: 'NONE',
          profanityOrCrudeHumor: 'NONE',
          sexualContentGraphicAndNudity: 'NONE',
          sexualContentOrNudity: 'NONE',
          violenceCartoonOrFantasy: 'NONE',
          violenceRealistic: 'NONE',
          violenceRealisticProlongedGraphicOrSadistic: 'NONE',
          unrestrictedWebAccess: false,
          gamblingAndContests: false,
          seventeenPlus: false,
          lootBox: false
        }
      }
    });
    if (ageUpdate.ok) console.log('   ✓ Age rating updated');
    else console.log('   ✗ Age rating update failed');
  }

  // 9. Check screenshots exist
  console.log('\n9. Checking screenshots...');
  if (locsRes.ok) {
    for (const loc of locsRes.data.data) {
      const ssRes = await api(`/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
      if (ssRes.ok) {
        console.log(`   ${loc.attributes.locale}: ${ssRes.data.data.length} screenshot sets`);
        for (const ss of ssRes.data.data) {
          const ssDetail = await api(`/appScreenshotSets/${ss.id}/appScreenshots`);
          if (ssDetail.ok) {
            console.log(`     - ${ss.attributes.screenshotDisplayType}: ${ssDetail.data.data.length} screenshots`);
          }
        }
      }
    }
  }

  // 10. Now check if version is ready to submit  
  console.log('\n10. Checking if version is ready for submission...');
  const finalVersion = await api(`/appStoreVersions/${versionId}`);
  if (finalVersion.ok) {
    const state = finalVersion.data.data.attributes.appStoreState;
    console.log(`   Current state: ${state}`);
    
    if (state === 'PREPARE_FOR_SUBMISSION') {
      console.log('\n11. Submitting for App Review...');
      const submitRes = await api('/appStoreVersionSubmissions', 'POST', {
        data: {
          type: 'appStoreVersionSubmissions',
          relationships: {
            appStoreVersion: {
              data: { type: 'appStoreVersions', id: versionId }
            }
          }
        }
      });
      
      if (submitRes.ok) {
        console.log('   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY!');
      } else {
        // Try the newer submissions API
        console.log('   Trying newer submission API...');
        const submitRes2 = await api('/submissions', 'POST', {
          data: {
            type: 'submissions',
            relationships: {
              items: {
                data: [{ type: 'appStoreVersions', id: versionId }]
              }
            }
          }
        });
        if (submitRes2.ok) {
          console.log('   ✅ APP SUBMITTED FOR REVIEW SUCCESSFULLY! (new API)');
        } else {
          console.log('   ✗ Submission failed. Checking what is missing...');
          
          // Check what's blocking
          const issues = await api(`/appStoreVersions/${versionId}?fields[appStoreVersions]=appStoreState,appVersionState`);
          if (issues.ok) console.log('   Version state:', JSON.stringify(issues.data.data.attributes));
        }
      }
    } else if (state === 'WAITING_FOR_REVIEW' || state === 'IN_REVIEW') {
      console.log('   ✅ App is already submitted/in review!');
    } else if (state === 'READY_FOR_SALE') {
      console.log('   ✅ App is already live!');
    } else {
      console.log(`   Current state "${state}" - may need manual attention`);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
