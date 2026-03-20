const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('../src/config');
const { TopicQueue } = require('../src/topic-queue');
const { buildArticle } = require('../src/article-generator');
const { HtmlRenderer } = require('../src/html-renderer');
const { publishPost } = require('../src/tistory-client');

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, options };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function saveFile(outputPath, content) {
  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, content, 'utf8');
  return outputPath;
}

function pickTopic(queue, topicId) {
  return topicId ? queue.getById(topicId) : queue.nextTopic();
}

async function generate(config, topic) {
  const article = await buildArticle(topic, {
    themeName: config.themeName,
    promptPath: config.promptPath,
    apiKey: config.openaiApiKey,
    model: config.openaiModel,
    reasoningEffort: config.openaiReasoningEffort,
  });
  const renderer = new HtmlRenderer(config.templatePath);
  const html = renderer.render(article);

  const previewPath = saveFile(path.join(config.previewDir, `${article.slug}.html`), html);
  const payloadPath = saveFile(path.join(config.payloadDir, `${article.slug}.json`), JSON.stringify(article, null, 2));

  return { article, html, previewPath, payloadPath };
}

function printUsage() {
  console.log('Usage: node scripts/pipeline.js <list-topics|preview|publish> [--topic-id <id>]');
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const queue = new TopicQueue(config.topicsPath);

  if (command === 'list-topics') {
    for (const topic of queue.listPending()) {
      console.log(`${topic.id}\t${topic.priority}\t${topic.titleHint}`);
    }
    return;
  }

  if (!['preview', 'publish'].includes(command)) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const topic = pickTopic(queue, options['topic-id']);
  const { article, html, previewPath, payloadPath } = await generate(config, topic);

  console.log(`Topic: ${topic.id} ${topic.titleHint}`);
  console.log(`Preview: ${previewPath}`);
  console.log(`Payload: ${payloadPath}`);

  if (command === 'preview') {
    return;
  }

  const publishResult = await publishPost({
    blogUrl: config.tistoryBlogUrl,
    title: article.title,
    content: html,
    storageStatePath: config.authPath,
    headless: config.headless,
  });

  queue.updateStatus(topic.id, 'published');
  console.log(`Published to: ${config.tistoryBlogUrl}`);
  console.log(`Title selector: ${publishResult.titleSelector}`);
  console.log(`Content strategy: ${publishResult.contentStrategy}`);
  console.log(`Publish selector: ${publishResult.publishButtonSelector}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
