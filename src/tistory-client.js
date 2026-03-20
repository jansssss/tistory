const fs = require('node:fs');
const { chromium } = require('playwright');

const UI_TEXT = {
  cancel: '\ucde8\uc18c',
  close: '\ub2eb\uae30',
  later: '\ub098\uc911\uc5d0',
  continueWriting: '\uacc4\uc18d \uc791\uc131',
  resumeWriting: '\uc774\uc5b4\uc4f0\uae30',
  title: '\uc81c\ubaa9',
  publish: '\ubc1c\ud589',
  publicPublish: '\uacf5\uac1c \ubc1c\ud589',
  confirm: '\ud655\uc778',
};

async function clickFirst(page, selectors, timeout = 5000) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await locator.click();
      return selector;
    } catch {
      // Try next selector.
    }
  }

  throw new Error(`No clickable element found for: ${selectors.join(', ')}`);
}

async function fillFirst(page, selectors, value, timeout = 5000) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'visible', timeout });
      await locator.fill(value);
      return selector;
    } catch {
      // Try next selector.
    }
  }

  throw new Error(`No fillable element found for: ${selectors.join(', ')}`);
}

async function dismissPopups(page) {
  const selectors = [
    `button:has-text("${UI_TEXT.cancel}")`,
    `button:has-text("${UI_TEXT.close}")`,
    `button:has-text("${UI_TEXT.later}")`,
    `button:has-text("${UI_TEXT.continueWriting}")`,
    `button:has-text("${UI_TEXT.resumeWriting}")`,
    '.btn_cancel',
    '.btn_close',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      if ((await locator.count()) > 0) {
        await locator.click();
      }
    } catch {
      // Popup not present.
    }
  }
}

async function setEditorContent(page, content) {
  const frameCandidates = page.frames().filter((frame) => frame !== page.mainFrame());

  for (const frame of frameCandidates) {
    const editable = frame.locator('[contenteditable="true"]').first();
    try {
      await editable.waitFor({ state: 'visible', timeout: 2000 });
      await editable.evaluate((node, html) => {
        node.innerHTML = html;
        node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '' }));
      }, content);
      return 'iframe [contenteditable="true"]';
    } catch {
      // Try next strategy.
    }
  }

  const strategy = await page.evaluate((html) => {
    const dispatchInput = (node) => {
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setNativeValue = (node) => {
      const prototype = Object.getPrototypeOf(node);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(node, html);
      } else {
        node.value = html;
      }
      dispatchInput(node);
    };

    const codeMirrorHost = document.querySelector('.CodeMirror');
    if (codeMirrorHost && codeMirrorHost.CodeMirror) {
      codeMirrorHost.CodeMirror.setValue(html);
      return '.CodeMirror';
    }

    const contentEditable = document.querySelector('.ProseMirror, [contenteditable="true"], div[role="textbox"]');
    if (contentEditable) {
      contentEditable.innerHTML = html;
      dispatchInput(contentEditable);
      return '[contenteditable="true"]';
    }

    const textarea = document.querySelector('textarea[name="content"], .CodeMirror textarea, textarea');
    if (textarea) {
      setNativeValue(textarea);
      return 'textarea';
    }

    return null;
  }, content);

  if (!strategy) {
    throw new Error('Could not find a post editor.');
  }

  return strategy;
}

async function publishPost({ blogUrl, title, content, storageStatePath, headless = true }) {
  if (!fs.existsSync(storageStatePath)) {
    throw new Error('auth.json is missing. Run "npm run auth" first.');
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();

  try {
    await page.goto(`${blogUrl.replace(/\/+$/, '')}/manage/newpost`, { waitUntil: 'domcontentloaded' });
    await dismissPopups(page);

    const titleSelector = await fillFirst(
      page,
      [
        '.textarea_tit',
        'input[name="title"]',
        'textarea[name="title"]',
        `input[placeholder*="${UI_TEXT.title}"]`,
        `textarea[placeholder*="${UI_TEXT.title}"]`,
      ],
      title
    );

    const contentStrategy = await setEditorContent(page, content);

    await page.waitForTimeout(3000);

    // 1단계: 완료
    await clickFirst(page, [
      '.btn_complete',
      `button:has-text("완료")`,
      `a:has-text("완료")`,
    ]);

    await page.waitForTimeout(3000);

    // 2단계: 공개 발행
    const publishButtonSelector = await clickFirst(page, [
      `button:has-text("${UI_TEXT.publicPublish}")`,
      `button:has-text("공개 발행")`,
    ], 10000);

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    return {
      titleSelector,
      contentStrategy,
      publishButtonSelector,
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  publishPost,
};
