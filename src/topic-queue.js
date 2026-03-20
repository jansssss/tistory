const fs = require('node:fs');

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function rowToTopic(row) {
  const num = String(row['번호'] ?? '').trim();
  const keyword = String(row['키워드'] ?? '').trim();
  return {
    id: `ts-${num.padStart(3, '0')}`,
    titleHint: keyword,
    angle: '',
    targetReader: '',
    keywords: [keyword],
    mustInclude: '',
    priority: Number.parseInt(num, 10) || 999,
    status: String(row['status'] ?? 'pending').trim(),
    scheduledDate: '',
  };
}

class TopicQueue {
  constructor(csvPath) {
    this.csvPath = csvPath;
  }

  loadAll() {
    const raw = fs.readFileSync(this.csvPath, 'utf8').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseCsvLine(lines[0]);

    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      return rowToTopic(row);
    });
  }

  listPending() {
    return this.loadAll()
      .filter((topic) => topic.status === 'pending')
      .sort((left, right) => left.priority - right.priority);
  }

  getById(topicId) {
    const topic = this.loadAll().find((item) => item.id === topicId);
    if (!topic) {
      throw new Error(`Topic not found: ${topicId}`);
    }
    return topic;
  }

  nextTopic() {
    const pending = this.listPending();
    if (pending.length === 0) {
      throw new Error('No pending topic is available.');
    }
    return pending[0];
  }

  updateStatus(topicId, newStatus) {
    const raw = fs.readFileSync(this.csvPath, 'utf8').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((line) => parseCsvLine(line));

    // 번호 컬럼으로 매칭 (ts-001 → "1")
    const numIndex = headers.indexOf('번호');
    const statusIndex = headers.indexOf('status');
    const targetNum = String(Number.parseInt(topicId.replace('ts-', ''), 10));
    let updated = false;

    for (const row of rows) {
      if (String(row[numIndex]).trim() === targetNum) {
        row[statusIndex] = newStatus;
        updated = true;
        break;
      }
    }

    if (!updated) {
      throw new Error(`Topic not found: ${topicId}`);
    }

    const serialized = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map((row) => row.map(escapeCsvCell).join(',')),
    ].join('\n');

    fs.writeFileSync(this.csvPath, `${serialized}\n`, 'utf8');
  }
}

module.exports = {
  TopicQueue,
};
