import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ASC API credentials
const keyId = 'M2TYDG9BL3';
const issuerId = '357d12f0-8971-458f-996a-3fe430476d64';
const privateKey = fs.readFileSync(path.join(projectRoot, 'AuthKey_M2TYDG9BL3.p8'), 'utf8');

// Configuration
const LOCALIZATION_ID = '263284ae-36c3-4e27-ae92-78baf5fb4b13';
const DISPLAY_TYPE = 'APP_IPAD_PRO_3GEN_129';
const SCREENSHOT_DIR = path.join(projectRoot, 'assets', 'store-screenshots', 'ipadPro129');
const SCREENSHOT_FILES = ['screen1.png', 'screen2.png', 'screen3.png', 'screen4.png'];

const BASE_URL = 'https://api.appstoreconnect.apple.com';

function createJWT() {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = encode(header);
  const p = encode(payload);
  const si = h + '.' + p;
  const sign = crypto.createSign('SHA256');
  sign.update(si);
  const sig = sign.sign(privateKey);
  let off = 2;
  const rL = sig[off + 1];
  off += 2;
  let r = sig.slice(off, off + rL);
  off += rL + 1;
  const sL = sig[off];
  off += 1;
  let s = sig.slice(off, off + sL);
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  if (r.length < 32) r = Buffer.concat([Buffer.alloc(32 - r.length), r]);
  if (s.length < 32) s = Buffer.concat([Buffer.alloc(32 - s.length), s]);
  return si + '.' + Buffer.concat([r, s]).toString('base64url');
}

async function apiRequest(method, endpoint, body = null) {
  const token = createJWT();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!resp.ok) {
    console.error(`API ERROR ${resp.status} ${method} ${url}`);
    console.error(JSON.stringify(data, null, 2));
    throw new Error(`API ${resp.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
  }
  return data;
}

async function uploadChunk(url, fileData, offset, length, headers) {
  const chunk = fileData.slice(offset, offset + length);
  const fetchHeaders = {};
  for (const h of headers) {
    fetchHeaders[h.name] = h.value;
  }
  const resp = await fetch(url, {
    method: 'PUT',
    headers: fetchHeaders,
    body: chunk,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Upload chunk failed ${resp.status}: ${errText}`);
  }
  console.log(`    Uploaded chunk: offset=${offset}, length=${length} -> ${resp.status}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== iPad Pro 3rd Gen 12.9" Screenshot Upload ===\n');

  // Step 1: Create screenshot set
  console.log(`Step 1: Creating screenshot set for ${DISPLAY_TYPE}...`);
  const setBody = {
    data: {
      type: 'appScreenshotSets',
      attributes: {
        screenshotDisplayType: DISPLAY_TYPE,
      },
      relationships: {
        appStoreVersionLocalization: {
          data: {
            type: 'appStoreVersionLocalizations',
            id: LOCALIZATION_ID,
          },
        },
      },
    },
  };

  const setResp = await apiRequest('POST', '/v1/appScreenshotSets', setBody);
  const screenshotSetId = setResp.data.id;
  console.log(`  Screenshot set created: ${screenshotSetId}\n`);

  // Step 2-4: For each screenshot, reserve, upload, and commit
  for (let i = 0; i < SCREENSHOT_FILES.length; i++) {
    const fileName = SCREENSHOT_FILES[i];
    const filePath = path.join(SCREENSHOT_DIR, fileName);
    const fileData = fs.readFileSync(filePath);
    const fileSize = fileData.length;
    const md5 = crypto.createHash('md5').update(fileData).digest('hex');

    console.log(`Screenshot ${i + 1}/${SCREENSHOT_FILES.length}: ${fileName} (${fileSize} bytes, md5: ${md5})`);

    // Step 2: Create reservation
    console.log(`  Creating reservation...`);
    const reserveBody = {
      data: {
        type: 'appScreenshots',
        attributes: {
          fileName: fileName,
          fileSize: fileSize,
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

    const reserveResp = await apiRequest('POST', '/v1/appScreenshots', reserveBody);
    const screenshotId = reserveResp.data.id;
    const uploadOps = reserveResp.data.attributes.uploadOperations;
    console.log(`  Reservation created: ${screenshotId}`);
    console.log(`  Upload operations: ${uploadOps.length} chunk(s)`);

    // Step 3: Upload binary data
    console.log(`  Uploading binary data...`);
    for (const op of uploadOps) {
      await uploadChunk(op.url, fileData, op.offset, op.length, op.requestHeaders);
    }
    console.log(`  Upload complete.`);

    // Step 4: Commit with sourceFileChecksum as plain MD5 hex string
    console.log(`  Committing upload...`);
    const commitBody = {
      data: {
        type: 'appScreenshots',
        id: screenshotId,
        attributes: {
          uploaded: true,
          sourceFileChecksum: md5,
        },
      },
    };

    const commitResp = await apiRequest('PATCH', `/v1/appScreenshots/${screenshotId}`, commitBody);
    const state = commitResp.data.attributes.assetDeliveryState?.state || 'unknown';
    console.log(`  Committed! State: ${state}\n`);

    // Small delay between screenshots
    if (i < SCREENSHOT_FILES.length - 1) {
      await sleep(2000);
    }
  }

  console.log('=== All screenshots uploaded successfully! ===');
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
