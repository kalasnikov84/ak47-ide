#!/usr/bin/env node
import { execSync } from 'child_process';
import os from 'os';

const platform = os.platform();

function runCommand(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

function checkNode() {
  console.log('📌 Node.js:');
  const possiblePaths = [
    '/snap/bin/node',
    '/usr/bin/node',
    '/usr/local/bin/node',
    '/opt/nodejs/bin/node',
    process.env.HOME + '/.nvm/versions/node/v20.19.0/bin/node',
    process.env.HOME + '/.nvm/versions/node/v18.20.0/bin/node',
  ];

  for (const nodePath of possiblePaths) {
    try {
      const result = execSync(`"${nodePath}" --version`, { stdio: 'pipe' }).toString().trim();
      if (result && result.startsWith('v')) {
        console.log(`   ✓ ${result}`);
        return true;
      }
    } catch {}
  }

  console.log('   ✗ Not found. Please install Node.js 18+: https://nodejs.org');
  return false;
}

function checkPython() {
  console.log('\n📌 Python:');
  const possibleCmds = [
    'python3 --version',
    'python --version',
    '/usr/bin/python3 --version',
    '/usr/local/bin/python3 --version',
  ];

  for (const cmd of possibleCmds) {
    const result = runCommand(cmd);
    if (result && result.includes('Python')) {
      console.log(`   ✓ ${result}`);
      return true;
    }
  }

  console.log('   ✗ Not found. Please install Python 3.8+: https://python.org');
  return false;
}

function checkRust() {
  console.log('\n📌 Rust:');
  const rustVersion = runCommand('rustc --version');
  if (rustVersion) {
    console.log(`   ✓ ${rustVersion}`);
    return true;
  }

  console.log('   ⚠ Not found. Installing...');
  try {
    execSync('curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y', { stdio: 'inherit' });
    console.log('   ✓ Rust installed');
    return true;
  } catch {
    console.log('   ✗ Failed to install Rust. Please install manually: https://rustup.rs');
    return false;
  }
}

console.log('🔍 Checking system requirements...\n');

let hasIssues = false;

if (!checkNode()) hasIssues = true;
if (!checkPython()) hasIssues = true;
if (!checkRust()) hasIssues = true;

console.log('\n📌 Pyright:');
const pyrightPath = runCommand(platform === 'win32' ? 'where pyright' : 'which pyright');
if (pyrightPath) {
  console.log('   ✓ Found');
} else {
  console.log('   ⚠ Will be installed with npm postinstall');
}

if (hasIssues) {
  console.log('\n❌ Please install missing requirements and try again.');
  process.exit(1);
} else {
  console.log('\n✅ All requirements met!');
}