#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { createInterface } from 'readline';

const PLATFORM = process.platform;
const isWindows = PLATFORM === 'win32';
const isMac = PLATFORM === 'darwin';
const isLinux = PLATFORM === 'linux';

function runCommand(cmd, silent = false) {
  try {
    if (!silent) console.log(`  $ ${cmd}`);
    execSync(cmd, { stdio: silent ? 'pipe' : 'inherit' });
    return true;
  } catch (e) {
    return false;
  }
}

function getInstalledVersion(command) {
  try {
    const result = execSync(command, { stdio: 'pipe' }).toString().trim();
    return result;
  } catch {
    return null;
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function printHeader() {
  console.log(`\n${BLUE}${BOLD}╔══════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}${BOLD}║     AK47 IDE - Dependency Manager       ║${RESET}`);
  console.log(`${BLUE}${BOLD}╚══════════════════════════════════════════╝${RESET}\n`);
}

function printStatus(name, status, version = null) {
  const icon = status === 'ok' ? '✓' : status === 'old' ? '↓' : status === 'new' ? '↑' : '✗';
  const color = status === 'ok' ? GREEN : status === 'old' ? BLUE : status === 'new' ? YELLOW : RED;
  console.log(`  ${color}${icon}${RESET} ${name}${version ? ` (${version})` : ''}`);
}

async function checkNode() {
  let version = getInstalledVersion('node --version');
  if (version) {
    printStatus('Node.js', 'ok', version);
    return true;
  }
  printStatus('Node.js', 'new', 'NOT FOUND');
  return false;
}

async function checkPython() {
  let version = getInstalledVersion('python3 --version') || getInstalledVersion('python --version');
  if (version) {
    printStatus('Python', 'ok', version);
    return true;
  }
  printStatus('Python', 'new', 'NOT FOUND');
  return false;
}

async function checkRust() {
  let version = getInstalledVersion('rustc --version');
  if (version) {
    printStatus('Rust', 'ok', version);
    return true;
  }
  printStatus('Rust', 'new', 'NOT FOUND');
  return false;
}

async function checkPyright() {
  let version = getInstalledVersion(isWindows ? 'pyright --version' : 'pyright --version 2>/dev/null || pyright --version');
  if (version) {
    printStatus('Pyright', 'ok', version);
    return true;
  }
  printStatus('Pyright', 'new', 'NOT FOUND');
  return false;
}

async function installNode() {
  console.log(`\n${YELLOW}Installing Node.js...${RESET}`);
  if (isMac) {
    runCommand('brew install node');
  } else if (isLinux) {
    runCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
    runCommand('sudo apt-get install -y nodejs');
  } else {
    console.log('  Please install Node.js from https://nodejs.org');
  }
}

async function installPython() {
  console.log(`\n${YELLOW}Installing Python...${RESET}`);
  if (isMac) {
    runCommand('brew install python3');
  } else if (isLinux) {
    runCommand('sudo apt-get update');
    runCommand('sudo apt-get install -y python3 python3-pip python3-venv');
  } else {
    console.log('  Please install Python from https://python.org');
  }
}

async function installRust() {
  console.log(`\n${YELLOW}Installing Rust...${RESET}`);
  runCommand('curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y');
  runCommand('source $HOME/.cargo/env');
}

async function installPyright() {
  console.log(`\n${YELLOW}Installing Pyright...${RESET}`);
  runCommand('python3 -m pip install pyright');
  runCommand('python3 -m pip install --user pyright');
  if (isMac) {
    runCommand('brew install pyright');
  }
}

async function updatePyright() {
  console.log(`\n${YELLOW}Updating Pyright...${RESET}`);
  runCommand('python3 -m pip install --upgrade pyright');
}

async function installNpmDeps() {
  console.log(`\n${YELLOW}Installing npm dependencies...${RESET}`);
  runCommand('npm install');
}

async function main() {
  printHeader();

  console.log(`${BOLD}Checking system dependencies...${RESET}\n`);

  const hasNode = await checkNode();
  const hasPython = await checkPython();
  const hasRust = await checkRust();
  const hasPyright = await checkPyright();

  if (!hasNode || !hasPython || !hasRust) {
    console.log(`\n${RED}${BOLD}Missing required dependencies!${RESET}`);
    console.log(`${YELLOW}Please install missing dependencies and run this script again.${RESET}`);
    process.exit(1);
  }

  console.log(`\n${BOLD}Checking IDE dependencies...${RESET}\n`);

  let needsPyright = !hasPyright;
  let needsNpmInstall = false;

  try {
    execSync('npm list --depth=0', { stdio: 'pipe' });
  } catch {
    needsNpmInstall = true;
  }

  if (!needsPyright && !needsNpmInstall) {
    printStatus('All dependencies', 'ok');
    console.log(`\n${GREEN}Everything is up to date! Run:${RESET}`);
    console.log(`  ${BLUE}npm run tauri:dev${RESET}\n`);
    return;
  }

  console.log(`\n${YELLOW}Found items that need attention:${RESET}`);
  if (needsPyright) printStatus('Pyright', 'new', 'needs install');
  if (needsNpmInstall) printStatus('npm packages', 'new', 'needs install');

  const answer = await askQuestion(`\n${BOLD}Action: ${RESET}(${GREEN}i${RESET})nstall/${YELLOW}u${RESET}pdate/${BLUE}s${RESET}kip? [i/u/s]: `);

  if (answer === 's' || answer === 'skip') {
    console.log(`\n${YELLOW}Skipped. Run this script anytime to check dependencies.${RESET}`);
    return;
  }

  if (answer === 'i' || answer === 'install') {
    if (needsPyright) await installPyright();
    if (needsNpmInstall) await installNpmDeps();
  } else if (answer === 'u' || answer === 'update') {
    if (needsPyright || hasPyright) await installPyright();
    await installNpmDeps();
  }

  console.log(`\n${GREEN}${BOLD}✓ Setup complete!${RESET}`);
  console.log(`\nRun: ${BLUE}npm run tauri:dev${RESET}\n`);
}

main().catch(console.error);
