const { chromium } = require('playwright');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const DEFAULT_LOGIN_URL = 'https://www.tistory.com/auth/login';

function getEnv(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

async function waitForEnter(message) {
  const rl = readline.createInterface({ input, output });

  try {
    await rl.question(message);
  } finally {
    rl.close();
  }
}

async function main() {
  const loginUrl = getEnv('TISTORY_LOGIN_URL', DEFAULT_LOGIN_URL);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    console.log('Complete the Tistory login in the browser, then press Enter here.');
    await waitForEnter('Press Enter after login: ');
    await context.storageState({ path: 'auth.json' });
    console.log('Saved auth.json');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
