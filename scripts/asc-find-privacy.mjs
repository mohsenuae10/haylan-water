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
  if (!res.ok && !path.includes('probe')) {
    console.error(`  Error ${res.status} ${method} ${path}`);
  }
  return { status: res.status, data, ok: res.ok };
}

async function main() {
  console.log('=== Finding App Privacy API Endpoints ===\n');

  // Try various API paths for app data/privacy
  const paths = [
    `/v1/apps/${ASC_APP_ID}/appDataUsages`,
    `/v2/apps/${ASC_APP_ID}/appDataUsages`,
    `/v1/apps/${ASC_APP_ID}/appPrivacyDeclarations`,
    `/v2/apps/${ASC_APP_ID}/appPrivacyDeclarations`,
    `/v1/apps/${ASC_APP_ID}/appDataUsageDeclarations`,
    `/v1/appDataUsageCategories`,
    `/v1/appDataUsagePurposes`,
    `/v1/appDataUsageDataProtections`,
  ];

  for (const path of paths) {
    const res = await api(path);
    console.log(`${res.status} ${path}`);
    if (res.ok) {
      console.log(`  ✓ FOUND! Data: ${JSON.stringify(res.data).substring(0, 200)}`);
    }
  }

  // Try the EAS metadata store approach instead
  console.log('\n=== Trying EAS metadata approach ===');
  
  // Actually let's try the correct Apple API for app privacy
  // The endpoint should be under appInfos
  const appInfoRes = await api(`/v1/apps/${ASC_APP_ID}/appInfos`);
  if (appInfoRes.ok) {
    const appInfoId = appInfoRes.data.data[0].id;
    console.log(`\nApp Info ID: ${appInfoId}`);
    
    // Try various relationship paths from appInfo
    const appInfoPaths = [
      `/v1/appInfos/${appInfoId}?include=primaryCategory,secondaryCategory`,
      `/v1/appInfos/${appInfoId}/relationships/primaryCategory`,
    ];
    
    for (const path of appInfoPaths) {
      const res = await api(path);
      console.log(`${res.status} ${path}`);
      if (res.ok) {
        console.log(`  Data: ${JSON.stringify(res.data.data?.attributes || res.data.data).substring(0, 200)}`);
      }
    }
  }

  // Let's check app relationships to find the right endpoint
  console.log('\n=== Checking app relationships ===');
  const appRes = await api(`/v1/apps/${ASC_APP_ID}`);
  if (appRes.ok) {
    const relationships = appRes.data.data.relationships;
    if (relationships) {
      console.log('Available relationships:');
      for (const [key, val] of Object.entries(relationships)) {
        console.log(`  - ${key}: ${val.links?.related || 'no link'}`);
      }
    }
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
