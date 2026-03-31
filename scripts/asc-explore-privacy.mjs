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
  return { status: res.status, data, ok: res.ok };
}

async function main() {
  console.log('=== Exploring Privacy API endpoints ===\n');

  // Try different API versions
  const versions = ['v1', 'v2', 'v3'];
  const resources = [
    'appDataUsages',
    'appDataUsageCategories', 
    'appDataUsageDataProtections',
    'appDataUsagePurposes',
    'appDataUsageGroupings',
    'appDataUsagePublications',
    'privacyDetails',
    'appPrivacyDetails',
  ];

  for (const ver of versions) {
    for (const res of resources) {
      // Try as nested under apps
      const r1 = await api(`/${ver}/apps/${ASC_APP_ID}/${res}`);
      if (r1.ok || r1.status !== 404) {
        console.log(`✓ ${r1.status} /${ver}/apps/${ASC_APP_ID}/${res}`);
        if (r1.ok) console.log(`  ${JSON.stringify(r1.data).substring(0, 300)}`);
        else console.log(`  ${JSON.stringify(r1.data).substring(0, 300)}`);
      }
      
      // Try as top-level resource
      const r2 = await api(`/${ver}/${res}?filter[app]=${ASC_APP_ID}&limit=5`);
      if (r2.ok || r2.status !== 404) {
        console.log(`✓ ${r2.status} /${ver}/${res}?filter[app]=${ASC_APP_ID}`);
        if (r2.ok) console.log(`  ${JSON.stringify(r2.data).substring(0, 300)}`);
        else console.log(`  ${JSON.stringify(r2.data).substring(0, 300)}`);
      }
    }
  }

  // Also try the OpenAPI spec
  console.log('\n=== Checking Apple OpenAPI spec for data usage endpoints ===');
  try {
    const specRes = await fetch('https://developer.apple.com/tutorials/data/documentation/appstoreconnectapi.json');
    if (specRes.ok) {
      const spec = await specRes.json();
      // Search for privacy or data usage related paths
      const paths = JSON.stringify(spec).match(/appDataUsag\w+|privac\w+|dataUsag\w+/gi);
      if (paths) {
        const unique = [...new Set(paths)];
        console.log('Found references:', unique.join(', '));
      }
    }
  } catch (e) {
    console.log('Could not fetch spec:', e.message);
  }
}

main().catch(console.error);
