const fs = require('node:fs');
const https = require('node:https');

const ARTICLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'subtitle',
    'summary_points',
    'sections',
    'action_tips',
    'tags',
    'disclaimer',
    'sources',
  ],
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    summary_points: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: { type: 'string' },
    },
    sections: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'paragraphs', 'expert_insight'],
        properties: {
          heading: { type: 'string' },
          paragraphs: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'string' },
          },
          expert_insight: { type: 'string' },
        },
      },
    },
    action_tips: {
      type: 'array',
      minItems: 5,
      maxItems: 6,
      items: { type: 'string' },
    },
    tags: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: { type: 'string' },
    },
    disclaimer: { type: 'string' },
    sources: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

function slugify(text) {
  return String(text)
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function createArticle(topic, themeName, data) {
  const now = new Date();
  const slug = slugify(data.title) || topic.id;

  return {
    topicId: topic.id,
    theme: themeName,
    slug: `${topic.id}-${slug}`,
    title: data.title,
    subtitle: data.subtitle,
    summaryPoints: data.summary_points,
    sections: data.sections,
    actionTips: data.action_tips,
    tags: data.tags,
    disclaimer: data.disclaimer,
    sources: data.sources || [],
    publishedLabel: `${now.getFullYear()}년 ${now.getMonth() + 1}월`,
    updatedLabel: `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`,
  };
}

function buildFallbackArticle(topic, themeName) {
  const title = topic.titleHint;
  return createArticle(topic, themeName, {
    title,
    subtitle: `${title}에 대한 수급 조건, 신청 방법, 주의사항을 한 번에 정리한 '${themeName}' 시리즈 글입니다.`,
    summary_points: [
      `${title}은 요건을 충족하면 별도 신청을 해야만 받을 수 있는 혜택으로, 자동 지급이 아니므로 신청 기한과 절차를 미리 확인하는 것이 중요합니다.`,
      `수급 조건에는 고용 형태, 근속 기간, 소득 기준 등 여러 요소가 복합적으로 작용하므로, 단순히 "해당 안 된다"고 포기하기 전에 정확한 기준을 먼저 확인해야 합니다.`,
      `핵심 키워드인 ${topic.keywords.join(', ')}는 신청 자격 판단의 중요한 기준이 되며, 관련 기관의 최신 고시 기준을 기준으로 계산해야 정확한 금액이 나옵니다.`,
      `많은 분들이 신청 기한을 놓쳐 수령 자격이 소멸되는 경우가 있습니다. 자격 발생 시점부터 법정 신청 기한을 미리 달력에 표시해 두는 것이 손실을 막는 가장 확실한 방법입니다.`,
      `온라인 신청(고용24, 복지로, 국민연금공단 등)이 가능한 경우가 많아 방문 없이도 처리할 수 있으며, 필요 서류를 미리 준비하면 처리 속도를 크게 단축할 수 있습니다.`,
    ],
    sections: [
      {
        heading: `${title} — 나는 해당될까? 기본 수급 조건 확인`,
        paragraphs: [
          `${title}은 일정 요건을 갖춘 사람에게 지급되는 혜택으로, 조건을 충족하더라도 직접 신청하지 않으면 받을 수 없습니다. 고용 형태(정규직·계약직·프리랜서 등), 근속 기간, 소득 기준에 따라 수급 자격이 달라질 수 있습니다. 정확한 기준은 매년 고시가 바뀔 수 있으므로 고용노동부 또는 해당 기관의 최신 공고를 반드시 확인하세요. "나는 해당 없겠지"라고 지레 포기하는 경우가 많은데, 생각보다 넓은 범위가 대상에 포함될 수 있습니다.`,
          `특히 계약직·아르바이트·단시간 근로자도 일정 요건을 충족하면 신청 자격이 생기는 경우가 있습니다. 근로 형태보다는 실제 근무 시간과 기간, 보험 가입 여부가 핵심 판단 기준이 되는 경우가 많습니다. 고용보험, 국민연금 등 4대 보험 가입 이력을 미리 점검해 두면 자격 여부를 빠르게 확인할 수 있습니다.`,
        ],
        expert_insight: '수급 자격은 퇴직·사직·계약 만료 등 이직 사유와 직접적으로 연결되는 경우가 많습니다. 이직 전에 수급 요건을 미리 확인해 두면 불필요한 손해를 방지할 수 있습니다.',
      },
      {
        heading: '얼마나 받을 수 있나 — 금액 계산 방법',
        paragraphs: [
          `${title}의 지급 금액은 평균임금, 소정근로시간, 근속 기간 등을 기준으로 산정하는 경우가 많습니다. 지급액에는 상한액과 하한액이 설정되어 있어, 임금이 매우 높거나 낮은 경우에도 일정 범위 내에서 수령하게 됩니다. 정확한 금액은 고용노동부 모의계산기(고용24) 또는 근로복지공단 홈페이지에서 미리 시뮬레이션해 볼 수 있습니다.`,
          `수령액에 영향을 주는 변수가 여러 개이므로, 단순히 월급만으로 계산하면 실제와 차이가 생길 수 있습니다. 상여금, 식대, 교통비 등 통상임금 포함 여부도 함께 확인해야 정확한 금액을 파악할 수 있습니다. 놓치기 쉬운 항목까지 포함해 계산하면 예상보다 더 많은 금액을 받을 수도 있습니다.`,
        ],
        expert_insight: '',
      },
      {
        heading: '신청 절차 — 어디서, 어떻게 해야 하나',
        paragraphs: [
          `${title} 신청은 온라인(고용24·복지로·국민연금공단 홈페이지 등)과 오프라인(관할 기관 직접 방문) 두 가지 방법으로 가능한 경우가 많습니다. 온라인 신청 시 공동인증서(구 공인인증서) 또는 간편인증(카카오·네이버 등)으로 본인 인증 후 진행할 수 있습니다. 필요 서류는 사전에 준비해 두어야 처리 지연 없이 빠르게 완료됩니다.`,
          `준비해야 할 서류는 주민등록등본, 통장 사본, 재직증명서(또는 이직확인서), 근로계약서 등이 기본이며, 상황에 따라 추가 서류가 요청될 수 있습니다. 서류 미비로 반려되면 처음부터 다시 진행해야 할 수 있으므로, 신청 전 체크리스트를 꼼꼼히 확인하는 것이 중요합니다.`,
        ],
        expert_insight: '온라인 신청이 가능한 경우 방문 대기 없이 빠르게 처리할 수 있습니다. 다만 첫 신청은 기관 방문이 필요한 경우도 있으므로 사전에 확인하세요.',
      },
      {
        heading: '놓치기 쉬운 주의사항과 흔한 실수',
        paragraphs: [
          `가장 많이 발생하는 실수는 신청 기한을 놓치는 것입니다. 대부분의 혜택은 자격 발생일로부터 일정 기간 내에 신청해야 소급 지급이 가능하며, 기한을 넘기면 남은 기간이 있어도 수령이 중단되거나 취소될 수 있습니다. 자격 발생 즉시 신청 일정을 잡는 것이 가장 안전합니다.`,
          `또한 수급 중 소득 발생, 취업, 해외 출국 등의 사유가 생기면 반드시 신고 의무가 발생합니다. 신고를 누락하면 이미 수령한 금액을 반환하거나 추가 제재를 받을 수 있으므로 변동 사항은 즉시 관할 기관에 알려야 합니다. 모르고 넘어가는 경우가 많아 주의가 필요합니다.`,
        ],
        expert_insight: '',
      },
      {
        heading: '마무리 — 지금 바로 확인하고 신청하세요',
        paragraphs: [
          `${title}은 이미 자격이 생겼는데도 신청하지 않아 매년 수많은 분들이 받을 수 있는 돈을 그냥 포기하는 대표적인 혜택입니다. 절차가 복잡하게 느껴지더라도 온라인 신청이 가능한 경우가 많고, 모의계산기를 통해 예상 금액을 미리 확인할 수 있습니다. 오늘 바로 관련 기관 홈페이지에서 나의 수급 자격부터 확인해 보세요.`,
          `한 번 정리해 두면 다음에도 같은 혜택을 놓치지 않게 됩니다. 주변 가족이나 지인 중에도 해당될 수 있는 분이 있다면 이 정보를 공유해 주세요. 알고 신청하는 것과 모르고 포기하는 것의 차이가 수백만 원이 될 수 있습니다.`,
        ],
        expert_insight: '',
      },
    ],
    action_tips: [
      '고용24(work.go.kr) 모의계산기에서 예상 수령액을 먼저 확인하세요.',
      '신청 기한을 달력이나 스마트폰 알림으로 미리 등록해 두세요 — 기한 초과 시 소급 불가인 경우가 많습니다.',
      '필요 서류(주민등록등본, 통장 사본, 이직확인서 등)를 미리 준비해 두면 신청 당일 처리가 빠릅니다.',
      '온라인 신청 시 공동인증서 또는 카카오·네이버 간편인증을 미리 확인해 두세요.',
      '수급 중 취업·소득 발생 시 즉시 관할 기관에 신고해 부당 수령 문제를 예방하세요.',
      '복지로(bokjiro.go.kr) 복지 서비스 모의계산에서 본인에게 해당하는 다른 혜택도 함께 확인해 보세요.',
    ],
    tags: [themeName, ...topic.keywords],
    disclaimer: '이 글은 일반적인 정보 제공을 목적으로 작성되었습니다. 수급 조건·금액·신청 절차는 개인 상황과 최신 고시 기준에 따라 달라질 수 있으므로, 정확한 내용은 고용노동부·근로복지공단 등 관련 기관에 직접 문의하시기 바랍니다.',
    sources: [],
  });
}

function postJson(url, headers, payload, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          if (response.statusCode >= 400) {
            reject(new Error(`HTTP ${response.statusCode}: ${raw}`));
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new Error('OpenAI request timed out.'));
    });
    request.write(body);
    request.end();
  });
}

function getOutputText(response) {
  for (const output of response.output || []) {
    for (const item of output.content || []) {
      if (typeof item.text === 'string') {
        return item.text;
      }
    }
  }

  if (typeof response.output_text === 'string' && response.output_text) {
    return response.output_text;
  }

  throw new Error('No text output returned from OpenAI.');
}

async function buildWithOpenAI(topic, promptText, options) {
  const input = [
    {
      role: 'system',
      content: promptText,
    },
    {
      role: 'user',
      content: [
        `주제: ${topic.titleHint}`,
        `관점: ${topic.angle}`,
        `대상 독자: ${topic.targetReader}`,
        `핵심 키워드: ${topic.keywords.join(', ')}`,
        `반드시 반영할 요소: ${topic.mustInclude}`,
      ].join('\n'),
    },
  ];

  const response = await postJson(
    'https://api.openai.com/v1/responses',
    {
      Authorization: `Bearer ${options.apiKey}`,
    },
    {
      model: options.model,
      reasoning: { effort: options.reasoningEffort },
      max_output_tokens: 8000,
      input,
      text: {
        format: {
          type: 'json_schema',
          name: 'health_article',
          strict: true,
          schema: ARTICLE_SCHEMA,
        },
      },
    }
  );

  const outputText = getOutputText(response);
  return createArticle(topic, options.themeName, JSON.parse(outputText));
}

async function buildArticle(topic, options) {
  const promptText = fs.readFileSync(options.promptPath, 'utf8');
  if (!options.apiKey) {
    console.warn('[WARN] OPENAI_API_KEY is missing. Using fallback article template.');
    return buildFallbackArticle(topic, options.themeName);
  }

  try {
    return await buildWithOpenAI(topic, promptText, options);
  } catch (error) {
    console.warn(`[WARN] OpenAI generation failed. Using fallback article template. ${error.message}`);
    return buildFallbackArticle(topic, options.themeName);
  }
}

module.exports = {
  buildArticle,
};
