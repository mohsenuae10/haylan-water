import pty from 'node-pty';
import { resolve } from 'path';

const ASC_KEY_ID = 'M2TYDG9BL3';
const ASC_ISSUER_ID = '357d12f0-8971-458f-996a-3fe430476d64';
const ASC_KEY_PATH = resolve('./AuthKey_M2TYDG9BL3.p8');
const APPLE_TEAM_ID = 'APX3Z7V273';

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
            .replace(/\x1b\][^\x07]*\x07/g, '')
            .replace(/[\x00-\x09\x0b-\x0c\x0e-\x1f]/g, '');
}

// Flexible prompts - each matched once
const prompts = [
  { id: 'keyId', match: /\? .*Key ID/i, answer: ASC_KEY_ID, type: 'text', used: false },
  { id: 'issuerId', match: /\? .*Issuer ID/i, answer: ASC_ISSUER_ID, type: 'text', used: false },
  { id: 'keyPath', match: /\? .*\.p8|\? .*Key Path/i, answer: ASC_KEY_PATH, type: 'text', used: false },
  { id: 'teamType', match: /\? .*Team Type/i, answer: null, type: 'select', downCount: 2, used: false },
  { id: 'teamId', match: /\? .*Apple Team ID/i, answer: APPLE_TEAM_ID, type: 'text', used: false },
  { id: 'reuseCert', match: /Reuse this distribution/i, answer: 'Y', type: 'text', used: false },
  { id: 'confirm_yn', match: /\(Y\/n\)/i, answer: 'Y', type: 'text', used: false },
  { id: 'generate', match: /\? .*Generate|\? .*create a new/i, answer: null, type: 'enter', used: false },
  { id: 'provision', match: /\? .*provisioning/i, answer: null, type: 'enter', used: false },
];

let buffer = '';
let processing = false;
let answeredCount = 0;

console.log('=== iOS Credential Setup ===\n');

const proc = pty.spawn('powershell.exe', [
  '-NoProfile', '-Command',
  'eas credentials:configure-build -p ios -e production'
], {
  name: 'xterm-color',
  cols: 120,
  rows: 40,
  cwd: process.cwd(),
  env: {
    ...process.env,
    EXPO_APPLE_TEAM_ID: APPLE_TEAM_ID,
    EXPO_ASC_API_KEY_PATH: ASC_KEY_PATH,
    EXPO_ASC_API_KEY_ISSUER_ID: ASC_ISSUER_ID,
    EXPO_ASC_API_KEY_ID: ASC_KEY_ID,
  },
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function findMatchingPrompt() {
  const clean = stripAnsi(buffer);
  for (const prompt of prompts) {
    if (!prompt.used && prompt.match.test(clean)) {
      return prompt;
    }
  }
  return null;
}

async function tryMatch() {
  if (processing) return;
  const prompt = findMatchingPrompt();
  if (!prompt) return;

  processing = true;
  await sleep(1500);

  if (prompt.type === 'text') {
    console.log(`\n>>> [${prompt.id}] Typing: "${prompt.answer}"`);
    proc.write(prompt.answer + '\r');
  } else if (prompt.type === 'select') {
    const count = prompt.downCount || 0;
    console.log(`\n>>> [${prompt.id}] Select (down x${count} + Enter)`);
    for (let i = 0; i < count; i++) {
      proc.write('\x1b[B');
      await sleep(300);
    }
    await sleep(500);
    proc.write('\r');
  } else if (prompt.type === 'enter') {
    console.log(`\n>>> [${prompt.id}] Enter`);
    proc.write('\r');
  }

  prompt.used = true;
  answeredCount++;
  buffer = '';
  processing = false;

  await sleep(3000);
  tryMatch();
}

proc.onData((data) => {
  process.stdout.write(data.toString());
  buffer += data.toString();
  tryMatch();
});

proc.onExit(({ exitCode: code }) => {
  console.log(`\n=== Exited: ${code} (answered ${answeredCount} prompts) ===`);
  process.exit(code ?? 1);
});

setTimeout(() => {
  console.log(`\n=== Timeout (180s). Buffer:\n${stripAnsi(buffer)}\n===`);
  proc.kill();
  process.exit(1);
}, 180000);
