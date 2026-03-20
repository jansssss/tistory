const fs = require('node:fs');
const path = require('node:path');
const { publishPost } = require('../src/tistory-client');

function getEnv(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function getRequiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function toBoolean(value, fallback) {
  if (!value) {
    return fallback;
  }
  return !['0', 'false', 'no'].includes(value.toLowerCase());
}

function resolveContent() {
  const content = process.env.TISTORY_CONTENT;
  if (content) {
    return content;
  }

  const contentFile = getEnv('TISTORY_CONTENT_FILE');
  if (!contentFile) {
    throw new Error('Set TISTORY_CONTENT or TISTORY_CONTENT_FILE.');
  }

  return fs.readFileSync(path.resolve(contentFile), 'utf8');
}

async function main() {
  const result = await publishPost({
    blogUrl: getRequiredEnv('TISTORY_BLOG_URL'),
    title: getRequiredEnv('TISTORY_TITLE'),
    content: resolveContent(),
    storageStatePath: path.resolve('auth.json'),
    headless: toBoolean(getEnv('HEADLESS', 'true'), true),
  });

  console.log(`Title selector: ${result.titleSelector}`);
  console.log(`Content strategy: ${result.contentStrategy}`);
  console.log(`Publish selector: ${result.publishButtonSelector}`);
  console.log('Publish request completed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
