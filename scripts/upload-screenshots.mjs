import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────
const keyId    = 'M2TYDG9BL3';
const issuerId = '357d12f0-8971-458f-996a-3fe430476d64';
const privateKey = fs.readFileSync(path.join(ROOT, 'AuthKey_M2TYDG9BL3.p8'), 'utf8');

const enUSLocalizationId = '263284ae-36c3-4e27-ae92-78baf5fb4b13';

const BASE = 'https://api.appstoreconnect.apple.com';

// Display types and their screenshot directories
const displayTypes = [
  { type: 'APP_IPHONE_67',     dir: 'iphone67' },
  { type: 'APP_IPHONE_65',     dir: 'iphone65' },
  { type: 'APP_IPHONE_55',     dir: 'iphone55' },
  { type: 'APP_IPAD_PRO_129',  dir: 'ipadPro129' },
];

const screenshotFiles = ['screen1.png', 'screen2.png', 'screen3.png', 'screen4.png'];

// ── JWT ─────────────────────────────────────────────────────────────────────
function createJWT() {
  const header  = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now     = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = encode(header);
  const p = encode(payload);
  const si = h + '.' + p;

  const sign = crypto.createSign('SHA256');
  sign.update(si);
  const sig = sign.sign(privateKey);

  // DER → raw (r,s) for ES256
  let off = 2;
  const rL = sig[off + 1]; off += 2;
  let r = sig.slice(off, off + rL); off += rL + 1;
  const sL = sig[off]; off += 1;
  let s = sig.slice(off, off + sL);

  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  if (r.length < 32) r = Buffer.concat([Buffer.alloc(32 - r.length), r]);
  if (s.length < 32) s = Buffer.concat([Buffer.alloc(32 - s.length), s]);

  return si + '.' + Buffer.concat([r, s]).toString('base64url');
}

let jwt = createJWT();

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function apiRequest(method, urlPath, body = null, retries = 2) {
  const url = urlPath.startsWith('http') ? urlPath : BASE + urlPath;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts);
      const text = await res.text();

      if (res.status === 401 && attempt < retries) {
        console.log('  JWT expired, refreshing...');
        jwt = createJWT();
        continue;
      }

      // 204 No Content is success (e.g. DELETE responses)
      if (res.status === 204) {
        return { ok: true, status: 204, data: {} };
      }

      if (!res.ok) {
        console.error(`  API ${method} ${urlPath} => ${res.status}`);
        console.error(`  Response: ${text.slice(0, 500)}`);
        return { ok: false, status: res.status, text };
      }

      const data = text ? JSON.parse(text) : {};
      return { ok: true, status: res.status, data };
    } catch (err) {
      if (attempt < retries) {
        console.log(`  Network error, retrying (${attempt + 1}/${retries})...`);
        await sleep(2000);
        continue;
      }
      console.error(`  Network error: ${err.message}`);
      return { ok: false, status: 0, text: err.message };
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function md5(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// ── Step 1: Create Screenshot Sets ──────────────────────────────────────────
async function createScreenshotSet(localizationId, displayType) {
  console.log(`\n  Creating screenshot set: ${displayType} for localization ${localizationId}`);
  const body = {
    data: {
      type: 'appScreenshotSets',
      attributes: {
        screenshotDisplayType: displayType,
      },
      relationships: {
        appStoreVersionLocalization: {
          data: {
            type: 'appStoreVersionLocalizations',
            id: localizationId,
          },
        },
      },
    },
  };
  const result = await apiRequest('POST', '/v1/appScreenshotSets', body);
  if (result.ok) {
    const setId = result.data.data.id;
    console.log(`  => Screenshot set created: ${setId}`);
    return setId;
  } else {
    // If already existing, try to find it
    if (result.text && result.text.includes('ENTITY_ERROR.RELATIONSHIP.INVALID')) {
      console.log(`  Set may already exist. Trying to fetch existing sets...`);
      return await findExistingScreenshotSet(localizationId, displayType);
    }
    console.error(`  Failed to create screenshot set for ${displayType}`);
    return null;
  }
}

async function findExistingScreenshotSet(localizationId, displayType) {
  const url = `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`;
  const result = await apiRequest('GET', url);
  if (result.ok && result.data.data) {
    const match = result.data.data.find(s => s.attributes.screenshotDisplayType === displayType);
    if (match) {
      console.log(`  => Found existing screenshot set: ${match.id}`);
      return match.id;
    }
  }
  console.error(`  Could not find existing screenshot set for ${displayType}`);
  return null;
}

// ── Step 2: Create Screenshot Reservation ───────────────────────────────────
async function createScreenshotReservation(screenshotSetId, fileName, fileSize) {
  console.log(`    Creating reservation for ${fileName} (${fileSize} bytes)...`);
  const body = {
    data: {
      type: 'appScreenshots',
      attributes: {
        fileName,
        fileSize,
      },
      relationships: {
        appScreenshotSet: {
          data: {
            type: 'appScreenshotSets',
            id: screenshotSetId,
          },
        },
      },
    },
  };
  const result = await apiRequest('POST', '/v1/appScreenshots', body);
  if (result.ok) {
    const screenshot = result.data.data;
    console.log(`    => Reservation created: ${screenshot.id}`);
    return screenshot;
  }
  console.error(`    Failed to create reservation for ${fileName}`);
  return null;
}

// ── Step 3: Upload the binary data ──────────────────────────────────────────
async function uploadScreenshotData(uploadOperations, fileBuffer) {
  console.log(`    Uploading ${uploadOperations.length} part(s)...`);
  for (const op of uploadOperations) {
    const { url, length, offset, method: httpMethod, requestHeaders } = op;
    const chunk = fileBuffer.slice(offset, offset + length);

    const hdrs = {};
    for (const h of requestHeaders) {
      hdrs[h.name] = h.value;
    }

    try {
      const res = await fetch(url, {
        method: httpMethod || 'PUT',
        headers: hdrs,
        body: chunk,
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`    Upload part failed: ${res.status} ${text.slice(0, 300)}`);
        return false;
      }
      console.log(`    => Part uploaded (offset=${offset}, length=${length})`);
    } catch (err) {
      console.error(`    Upload error: ${err.message}`);
      return false;
    }
  }
  return true;
}

// ── Step 4: Commit the upload ───────────────────────────────────────────────
async function commitScreenshot(screenshotId, checksum) {
  console.log(`    Committing screenshot ${screenshotId}...`);
  const body = {
    data: {
      type: 'appScreenshots',
      id: screenshotId,
      attributes: {
        uploaded: true,
        sourceFileChecksum: checksum,
      },
    },
  };
  const result = await apiRequest('PATCH', `/v1/appScreenshots/${screenshotId}`, body);
  if (result.ok) {
    console.log(`    => Committed successfully`);
    return true;
  }
  console.error(`    Failed to commit screenshot ${screenshotId}`);
  return false;
}

// ── Cleanup: Delete existing screenshot sets ────────────────────────────────
async function deleteExistingScreenshotSets(localizationId) {
  console.log(`\n  Cleaning up existing screenshot sets for localization ${localizationId}...`);
  const url = `/v1/appStoreVersionLocalizations/${localizationId}/appScreenshotSets`;
  const result = await apiRequest('GET', url);
  if (!result.ok || !result.data.data || result.data.data.length === 0) {
    console.log('  No existing sets found.');
    return;
  }
  for (const set of result.data.data) {
    console.log(`  Deleting screenshot set ${set.id} (${set.attributes.screenshotDisplayType})...`);
    const delResult = await apiRequest('DELETE', `/v1/appScreenshotSets/${set.id}`);
    if (delResult.ok || delResult.status === 204) {
      console.log(`  => Deleted`);
    } else {
      console.log(`  => Delete returned status ${delResult.status}`);
    }
    await sleep(500);
  }
  console.log('  Cleanup complete.\n');
}

// ── Main Flow ───────────────────────────────────────────────────────────────
async function uploadScreenshotsForLocalization(localizationId, localeName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Uploading screenshots for locale: ${localeName} (${localizationId})`);
  console.log('='.repeat(70));

  // Clean up old broken screenshot sets first
  await deleteExistingScreenshotSets(localizationId);

  const results = { success: 0, failed: 0, details: [] };

  for (const dt of displayTypes) {
    console.log(`\n--- Display type: ${dt.type} (${dt.dir}) ---`);

    // Step 1: Create fresh screenshot set
    const setId = await createScreenshotSet(localizationId, dt.type);
    if (!setId) {
      console.error(`  Skipping ${dt.type} - no screenshot set`);
      for (const f of screenshotFiles) {
        results.failed++;
        results.details.push({ file: `${dt.dir}/${f}`, status: 'FAILED', reason: 'No screenshot set' });
      }
      continue;
    }

    // Process each screenshot file
    for (const fileName of screenshotFiles) {
      const filePath = path.join(ROOT, 'assets', 'store-screenshots', dt.dir, fileName);
      console.log(`\n  Processing: ${dt.dir}/${fileName}`);

      if (!fs.existsSync(filePath)) {
        console.error(`    File not found: ${filePath}`);
        results.failed++;
        results.details.push({ file: `${dt.dir}/${fileName}`, status: 'FAILED', reason: 'File not found' });
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = fileBuffer.length;
      const checksum = md5(fileBuffer);
      console.log(`    Size: ${fileSize}, MD5: ${checksum}`);

      // Step 2: Create reservation
      const reservation = await createScreenshotReservation(setId, fileName, fileSize);
      if (!reservation) {
        results.failed++;
        results.details.push({ file: `${dt.dir}/${fileName}`, status: 'FAILED', reason: 'Reservation failed' });
        continue;
      }

      const uploadOps = reservation.attributes.uploadOperations;
      const screenshotId = reservation.id;

      if (!uploadOps || uploadOps.length === 0) {
        console.error(`    No upload operations returned`);
        results.failed++;
        results.details.push({ file: `${dt.dir}/${fileName}`, status: 'FAILED', reason: 'No upload operations' });
        continue;
      }

      // Step 3: Upload the binary data
      const uploaded = await uploadScreenshotData(uploadOps, fileBuffer);
      if (!uploaded) {
        results.failed++;
        results.details.push({ file: `${dt.dir}/${fileName}`, status: 'FAILED', reason: 'Upload failed' });
        continue;
      }

      // Step 4: Commit
      const committed = await commitScreenshot(screenshotId, checksum);
      if (committed) {
        results.success++;
        results.details.push({ file: `${dt.dir}/${fileName}`, status: 'OK', screenshotId });
      } else {
        results.failed++;
        results.details.push({ file: `${dt.dir}/${fileName}`, status: 'FAILED', reason: 'Commit failed' });
      }

      // Small delay to avoid rate limiting
      await sleep(500);
    }
  }

  return results;
}

// ── Entry Point ─────────────────────────────────────────────────────────────
async function main() {
  console.log('App Store Connect Screenshot Uploader');
  console.log(`Project: ${ROOT}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Verify the key
  try {
    const testJWT = createJWT();
    console.log(`JWT created successfully (length: ${testJWT.length})`);
  } catch (err) {
    console.error(`Failed to create JWT: ${err.message}`);
    process.exit(1);
  }

  // Upload for en-US only
  const enResults = await uploadScreenshotsForLocalization(enUSLocalizationId, 'en-US');

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('UPLOAD SUMMARY');
  console.log('='.repeat(70));
  console.log(`Successful: ${enResults.success}`);
  console.log(`Failed:     ${enResults.failed}`);
  console.log(`Total:      ${enResults.success + enResults.failed}`);
  console.log('\nDetails:');
  for (const d of enResults.details) {
    if (d.status === 'OK') {
      console.log(`  [OK]     ${d.file} => ${d.screenshotId}`);
    } else {
      console.log(`  [FAILED] ${d.file} => ${d.reason}`);
    }
  }

  if (enResults.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
