const fs = require('node:fs');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class HtmlRenderer {
  constructor(templatePath) {
    this.template = fs.readFileSync(templatePath, 'utf8');
    this.font = "'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif";
  }

  render(article) {
    const summaryItems = article.summaryPoints
      .map(
        (item) =>
          `<li style="font-family: ${this.font}; font-size: 15px; color: #2a3a5c; line-height: 1.7; margin-bottom: 8px; word-break: keep-all;">${escapeHtml(item)}</li>`
      )
      .join('\n');

    const sectionItems = article.sections
      .map((section) => {
        const paragraphsHtml = section.paragraphs
          .map(
            (paragraph) =>
              `<p style="font-family: ${this.font}; font-size: 16px; color: #3a4a62; margin: 0 0 14px; line-height: 1.9; word-break: keep-all;">${escapeHtml(paragraph)}</p>`
          )
          .join('');

        const insightHtml = section.expert_insight
          ? `<div style="background: #f0f4ff; border-left: 4px solid #3268ff; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 4px 0 20px;"><div style="font-family: ${this.font}; font-size: 12px; font-weight: 700; color: #3268ff; margin-bottom: 6px; letter-spacing: 0.04em;">전문가 인사이트</div><p style="font-family: ${this.font}; font-size: 15px; color: #2a3a5c; margin: 0; line-height: 1.75; word-break: keep-all;">${escapeHtml(section.expert_insight)}</p></div>`
          : '';

        return `<section><h2 style="font-family: ${this.font}; font-size: 22px; font-weight: 800; color: #1c2741; margin: 40px 0 14px; padding-bottom: 8px; border-bottom: 2px solid #eef2f7; letter-spacing: -0.02em; line-height: 1.4; word-break: keep-all;">${escapeHtml(section.heading)}</h2>${paragraphsHtml}${insightHtml}</section>`;
      })
      .join('\n');

    const tipItems = article.actionTips
      .map(
        (item) =>
          `<span style="display: inline-block; padding: 6px 14px; border-radius: 999px; background: #fff; border: 1.5px solid #ffcfc9; color: #cc3a28; font-size: 13px; font-weight: 600; line-height: 1.5; margin-bottom: 4px;">${escapeHtml(item)}</span>`
      )
      .join('\n');

    const tagItems = article.tags
      .map(
        (tag) =>
          `<span style="display: inline-block; padding: 6px 14px; border-radius: 999px; background: #fff; border: 1.5px solid #bdd0ff; color: #2652cc; font-size: 13px; font-weight: 600; line-height: 1;">${escapeHtml(tag)}</span>`
      )
      .join('\n');

    const sourcesSection = article.sources.length
      ? `<div style="margin-top: 28px; padding: 16px 18px; border-radius: 10px; background: #f8f9fb; border: 1px solid #e1e5eb;"><div style="font-family: ${this.font}; font-size: 13px; font-weight: 700; color: #7a8699; margin-bottom: 8px;">참고 자료</div><ul style="margin: 0; padding-left: 16px;">${article.sources.map((item) => `<li style="font-family: ${this.font}; font-size: 13px; color: #7a8699; line-height: 1.6;">${escapeHtml(item)}</li>`).join('\n')}</ul></div>`
      : '';

    return this.template
      .replace('$title', escapeHtml(article.title))
      .replace('$subtitle', escapeHtml(article.subtitle))
      .replace('$theme', escapeHtml(article.theme))
      .replace('$published_label', escapeHtml(article.publishedLabel))
      .replace('$updated_label', escapeHtml(article.updatedLabel))
      .replace('$summary_items', summaryItems)
      .replace('$section_items', sectionItems)
      .replace('$tip_items', tipItems)
      .replace('$tag_items', tagItems)
      .replace('$sources_section', sourcesSection)
      .replace('$disclaimer', escapeHtml(article.disclaimer));
  }
}

module.exports = {
  HtmlRenderer,
};
