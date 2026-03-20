const fs = require('node:fs');
const path = require('node:path');

function loadDotenvFile(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) {
    return;
  }

  const lines = fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getEnv(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function toBoolean(value, fallback) {
  if (!value) {
    return fallback;
  }

  return !['0', 'false', 'no'].includes(value.toLowerCase());
}

function loadConfig() {
  const projectRoot = path.resolve(__dirname, '..');
  loadDotenvFile(path.join(projectRoot, '.env'));

  return {
    projectRoot,
    themeName: getEnv('BLOG_THEME_NAME', '세상만사 돈이야기'),
    topicsPath: path.join(projectRoot, 'data', 'tistory_300.csv'),
    templatePath: path.join(projectRoot, 'templates', 'article.html'),
    promptPath: path.join(projectRoot, 'prompts', 'health_article_prompt.txt'),
    previewDir: path.join(projectRoot, 'output', 'previews'),
    payloadDir: path.join(projectRoot, 'output', 'payloads'),
    authPath: path.join(projectRoot, 'auth.json'),
    openaiApiKey: getEnv('OPENAI_API_KEY') || null,
    openaiModel: getEnv('OPENAI_MODEL', 'gpt-5.4-mini'),
    openaiReasoningEffort: getEnv('OPENAI_REASONING_EFFORT', 'medium'),
    tistoryBlogUrl: getEnv('TISTORY_BLOG_URL', 'https://more-naver.tistory.com'),
    headless: toBoolean(getEnv('HEADLESS', 'false'), false),
  };
}

module.exports = {
  loadConfig,
};
