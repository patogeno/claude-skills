#!/usr/bin/env node
// Hook handlers for the compact-check skill. One script, one subcommand per hook event:
//   prompt        UserPromptSubmit: nudge once per threshold when the context fills up
//   post-compact  SessionStart(compact): re-arm thresholds, tell Claude to re-read state
//   log-summary   PostCompact: append compact_summary to a log in the temp directory
// Every handler fails silently: a broken hook must never block the user's prompt.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const THRESHOLDS = [80, 60]; // percent, highest first
const DEFAULT_WINDOW = 200000;
const TAIL_BYTES = 512 * 1024; // the latest assistant turn is near the end of the transcript
const STATE_DIR = path.join(os.tmpdir(), 'claude-compact-check');

// Hard stop so a slow disk or a stuck stdin can never hold up the prompt.
setTimeout(() => process.exit(0), 3000).unref();

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function readTail(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - bytes);
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

// Context in use = every input token the latest main-thread request sent.
// Output tokens are excluded: they enter the context only as the next request's input.
function latestContextTokens(transcriptPath) {
  const lines = readTail(transcriptPath, TAIL_BYTES).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.includes('"usage"')) continue;
    let entry;
    try {
      entry = JSON.parse(line); // the first line of a tail may be cut mid-object
    } catch {
      continue;
    }
    if (entry.type !== 'assistant' || entry.isSidechain) continue;
    const u = entry.message && entry.message.usage;
    if (!u) continue;
    const total =
      (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    if (total > 0) return total; // skips synthetic entries that report zero usage
  }
  return null;
}

function contextWindow() {
  const n = parseInt(process.env.COMPACT_CHECK_WINDOW, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW;
}

function stateFile(sessionId) {
  return path.join(STATE_DIR, String(sessionId).replace(/[^A-Za-z0-9_-]/g, '_') + '.json');
}

function loadFired(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf8')).fired || [];
  } catch {
    return [];
  }
}

function saveFired(sessionId, fired) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(sessionId), JSON.stringify({ fired }));
}

function onPrompt(input) {
  if (!input.session_id || !input.transcript_path) return;
  const used = latestContextTokens(input.transcript_path);
  if (!used) return;
  const window = contextWindow();
  const pct = (used / window) * 100;
  const crossed = THRESHOLDS.find((t) => pct >= t);
  if (crossed === undefined) return;
  const fired = loadFired(input.session_id);
  if (fired.includes(crossed)) return;
  // Mark every threshold at or below this one, so a jump from 50% to 85% nudges once, not twice.
  saveFired(input.session_id, [...new Set([...fired, ...THRESHOLDS.filter((t) => t <= crossed)])]);
  process.stdout.write(
    `[compact-check] Context is about ${Math.round(pct)}% full ` +
      `(${Math.round(used / 1000)}k of ${Math.round(window / 1000)}k tokens). ` +
      'At the next natural break in the work, suggest the user run /compact-check before compacting.\n'
  );
}

function onPostCompact(input) {
  // The context just shrank, so both thresholds may be crossed again later in this session.
  if (input.session_id) {
    try {
      fs.unlinkSync(stateFile(input.session_id));
    } catch {}
  }
  process.stdout.write(
    'Context was just compacted. Before continuing, re-read MEMORY.md, run git status, ' +
      'and re-open any plan or handoff file the summary mentions.\n'
  );
}

function onLogSummary(input) {
  if (!input.compact_summary) return;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const entry =
    `=== ${new Date().toISOString()} session=${input.session_id || '?'} ` +
    `trigger=${input.trigger || '?'} cwd=${input.cwd || '?'}\n${input.compact_summary}\n\n`;
  fs.appendFileSync(path.join(STATE_DIR, 'compact-summaries.log'), entry);
}

const handlers = { prompt: onPrompt, 'post-compact': onPostCompact, 'log-summary': onLogSummary };

(async () => {
  try {
    const handler = handlers[process.argv[2]];
    if (!handler) return;
    const raw = await readStdin();
    handler(raw.trim() ? JSON.parse(raw) : {});
  } catch {
    // Silent by design. See header.
  }
  process.exit(0);
})();
