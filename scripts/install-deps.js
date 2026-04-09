#!/usr/bin/env node
import { execSync } from 'child_process';
import os from 'os';

const platform = os.platform();

console.log('🔧 Installing AK47 IDE dependencies...');
console.log(`   Platform: ${platform}`);

function runCommand(cmd, silent = false) {
  try {
    if (!silent) console.log(`   Running: ${cmd}`);
    execSync(cmd, { stdio: silent ? 'pipe' : 'inherit' });
    return true;
  } catch (e) {
    if (!silent) console.log(`   Failed: ${cmd}`);
    return false;
  }
}

const isWindows = platform === 'win32';
const isMac = platform === 'darwin';

if (isWindows) {
  console.log('\n📦 Installing Pyright via npm (Windows)...');
  runCommand('npm install -g pyright', false);
  
  console.log('\n📦 Installing Pyright via pip (Windows)...');
  runCommand('python -m pip install pyright', false);
  runCommand('python -m pip install --user pyright', false);
} else if (isMac) {
  console.log('\n📦 Installing Pyright via pip (macOS)...');
  runCommand('python3 -m pip install pyright', false);
  runCommand('python3 -m pip install --user pyright', false);
  
  console.log('\n📦 Trying homebrew pyright...');
  runCommand('brew install pyright', false);
} else {
  console.log('\n📦 Installing Pyright via pip (Linux)...');
  runCommand('python3 -m pip install pyright', false);
  runCommand('python3 -m pip install --user pyright', false);
  
  console.log('\n📦 Checking system pyright...');
  runCommand('apt-get update && apt-get install -y python3-pyright', true);
}

console.log('\n✅ Dependencies installation complete!');
console.log('\n🚀 You can now run: npm run tauri:dev');