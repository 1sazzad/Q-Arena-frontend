#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function isBinaryFileByExt(path) {
  const binExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.exe', '.dll', '.so', '.class', '.jar', '.zip', '.gz', '.7z', '.pdf', '.woff', '.woff2', '.ttf', '.eot'];
  return binExt.some(ext => path.toLowerCase().endsWith(ext));
}

function shouldSkip(path) {
  const skipDirs = ['node_modules/', 'dist/', 'build/', '.git/'];
  if (skipDirs.some(d => path.startsWith(d))) return true;
  if (isBinaryFileByExt(path)) return true;
  // skip common lock files
  const locks = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
  if (locks.includes(path)) return true;
  return false;
}

const tracked = run('git ls-files').split('\n').filter(Boolean);

let found = [];

// Quick check: .env should not be git-tracked
if (tracked.includes('.env')) {
  found.push({ file: '.env', rule: 'committed_.env' });
}

// Read .gitignore to ensure .env is ignored
let gitignore = '';
try {
  gitignore = fs.readFileSync('.gitignore', 'utf8');
} catch (e) {
  // ignore
}

const requiredIgnores = ['.env', '.env.local', '.env.*.local'];
let gitignoreMissing = requiredIgnores.filter(x => !gitignore.includes(x));
if (gitignoreMissing.length > 0) {
  // Inform but do not fail on missing ignore entries — we will return non-zero only if secrets found or .env committed
  console.log('Warning: .gitignore is missing entries for:', gitignoreMissing.join(', '));
}

// Patterns to detect (do not print values)
const checks = [
  { name: 'sk_live', re: /sk_live_[0-9A-Za-z\-_]{8,}/i, fail: true },
  { name: 'sk_test', re: /sk_test_[0-9A-Za-z\-_]{8,}/i, fail: true },
  { name: 'openai', re: /openai_api_key\s*=\s*[^\n\r]+/i, fail: true },
  { name: 'azure_openai', re: /azure_openai_api_key\s*=\s*[^\n\r]+/i, fail: true },
  { name: 'gemini', re: /gemini_api_key\s*=\s*[^\n\r]+/i, fail: true },
  { name: 'anthropic', re: /anthropic_api_key\s*=\s*[^\n\r]+/i, fail: true },
  { name: 'generic_secret', re: /(secret|jwt_secret|private_key|secret_key)\s*=\s*[^\n\r]+/i, fail: true },
  { name: 'aws_access_key', re: /AKIA[0-9A-Z]{8,}/, fail: true },
  { name: 'github_token', re: /ghp_[0-9A-Za-z_\-]{36,}/, fail: true },
  { name: 'javascript_uri', re: /href\s*=\s*"javascript:[^"\n\r]*/i, fail: false },
];

// Allowed placeholders (do not flag)
const allowedPlaceholders = ['your_api_key_here', 'example', 'placeholder', 'changeme', ''];

function looksLikePlaceholder(val) {
  if (!val) return true; // empty values ok
  const v = val.toLowerCase();
  return allowedPlaceholders.some(p => v.includes(p));
}

for (const file of tracked) {
  if (shouldSkip(file)) continue;
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    continue; // skip unreadable/binary
  }
  const lower = content.toLowerCase();

  // If file is .env.example, allow placeholders; skip scanning it for secrets
  if (file === '.env.example') continue;

  for (const c of checks) {
    const match = content.match(c.re);
    if (!match) continue;

    let value = match[0];
    const eqIdx = value.indexOf("=");
    if (eqIdx !== -1) {
      value = value.slice(eqIdx + 1).trim();
    }

    if (looksLikePlaceholder(value)) continue;

    if (c.fail === false) {
      continue;
    }

    found.push({ file, rule: c.name });
  }
}

if (found.length > 0) {
  console.error('Potential frontend secrets detected:');
  // Print unique results grouped by file
  const uniq = {};
  found.forEach(f => {
    uniq[f.file] = uniq[f.file] || new Set();
    uniq[f.file].add(f.rule);
  });
  for (const [file, rules] of Object.entries(uniq)) {
    console.error(`${file}: ${Array.from(rules).join(', ')}`);
  }
  console.error('Scan failed. Do not commit real secrets. Run locally to fix or remove tracked .env.');
  process.exitCode = 1;
  process.exit(1);
} else {
  console.log('No obvious frontend secrets found in tracked files.');
  process.exit(0);
}
