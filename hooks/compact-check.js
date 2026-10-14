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

const THRESHOLDS = [80, 60]; // percent of the real context window, highest first
// With no known window there is no percentage. Note the raw count once, at the size where
// the smallest standard window (200k) would reach its first threshold.
const UNKNOWN_WINDOW_NOTE_AT = 120000;
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

// Parsed transcript entries, newest first. The first line of a tail may be cut mid-object.
function* entriesNewestFirst(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      yield { line, entry: JSON.parse(line) };
    } catch {}
  }
}

// Context in use, measured as /context measures it: everything the latest main-thread
// request sent (input + cache reads + cache writes) plus the reply it added (output).
// A compaction after that request makes its usage stale; the boundary records the new size.
function latestContextTokens(lines) {
  for (const { line, entry } of entriesNewestFirst(lines)) {
    if (entry.type === 'system' && entry.subtype === 'compact_boundary') {
      const post = entry.compactMetadata && entry.compactMetadata.postTokens;
      return post > 0 ? post : null;
    }
    if (entry.type !== 'assistant' || entry.isSidechain || !line.includes('"usage"')) continue;
    const u = entry.message && entry.message.usage;
    if (!u) continue;
    const input =
      (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    if (input > 0) return input + (u.output_tokens || 0); // skips synthetic zero-usage entries
  }
  return null;
}

function parseCount(num, unit) {
  return Math.round(parseFloat(num) * ({ k: 1e3, m: 1e6 }[unit.toLowerCase()] || 1));
}

// The real window, from the latest /context output in the transcript ("163.6k/1m tokens (16%)").
// Neither the hook input nor the transcript's usage entries name the window or a "[1m]" variant.
function windowFromContextOutput(lines) {
  for (const { line, entry } of entriesNewestFirst(lines)) {
    if (!line.includes('local-command-stdout')) continue;
    const content = entry.content || (entry.message && entry.message.content);
    const text = (typeof content === 'string' ? content : JSON.stringify(content || '')).replace(
      /\u001b\[[0-9;]*m/g,
      ''
    );
    const m = text.match(/[\d.]+[kKmM]?\s*\/\s*([\d.]+)\s*([kKmM]?)\s*tokens\s*\(\d+%\)/);
    if (m) return parseCount(m[1], m[2]);
  }
  return null;
}

function positiveInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// The real window when it can be observed, else the user's setting, else null. Never a guess.
function contextWindow(lines, remembered) {
  const observed = windowFromContextOutput(lines);
  if (observed) return { window: observed, observed: true };
  if (remembered) return { window: remembered, observed: false };
  if (/\[1m\]/i.test(process.env.ANTHROPIC_MODEL || '')) return { window: 1000000, observed: false };
  const setting =
    positiveInt(process.env.COMPACT_CHECK_WINDOW_TOKENS) || positiveInt(process.env.COMPACT_CHECK_WINDOW);
  return { window: setting, observed: false };
}

function stateFile(sessionId) {
  return path.join(STATE_DIR, String(sessionId).replace(/[^A-Za-z0-9_-]/g, '_') + '.json');
}

function loadState(sessionId) {
  try {
    const s = JSON.parse(fs.readFileSync(stateFile(sessionId), 'utf8'));
    return { fired: s.fired || [], window: positiveInt(s.window) };
  } catch {
    return { fired: [], window: null };
  }
}

function saveState(sessionId, state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(sessionId), JSON.stringify(state));
}

const k = (n) => (n >= 1e6 ? `${+(n / 1e6).toFixed(2)}m` : `${Math.round(n / 1000)}k`);

function onPrompt(input) {
  if (!input.session_id || !input.transcript_path) return;
  const lines = readTail(input.transcript_path, TAIL_BYTES).split('\n');
  const used = latestContextTokens(lines);
  if (!used) return;
  const state = loadState(input.session_id);
  const { window, observed } = contextWindow(lines, state.window);
  // Remember a window seen in /context output: it scrolls out of the tail as the session grows.
  const next = { fired: state.fired, window: observed ? window : state.window };

  let message = null;
  if (window) {
    const pct = (used / window) * 100;
    const crossed = THRESHOLDS.find((t) => pct >= t);
    if (crossed !== undefined && !state.fired.includes(crossed)) {
      // Mark every threshold at or below this one, so a jump from 50% to 85% nudges once, not twice.
      next.fired = [...new Set([...state.fired, ...THRESHOLDS.filter((t) => t <= crossed)])];
      message =
        `[compact-check] Context is about ${Math.round(pct)}% full (${k(used)} of ${k(window)} tokens). ` +
        'At the next natural break in the work, suggest the user run /compact-check before compacting.';
    }
  } else if (used >= UNKNOWN_WINDOW_NOTE_AT && !state.fired.includes('raw')) {
    next.fired = [...state.fired, 'raw'];
    message =
      `[compact-check] Context holds about ${k(used)} tokens. The context window size is unknown, ` +
      'so this is not a percentage; do not suggest compacting on this alone. ' +
      'Run /context to see the window, or set COMPACT_CHECK_WINDOW_TOKENS for the 60%/80% reminders.';
  }
  if (message || next.window !== state.window) saveState(input.session_id, next);
  if (message) process.stdout.write(message + '\n');
}

function onPostCompact(input) {
  // The context just shrank, so every reminder may be needed again later in this session.
  // The window stays: compaction does not change it.
  if (input.session_id) {
    const { window } = loadState(input.session_id);
    try {
      if (window) saveState(input.session_id, { fired: [], window });
      else fs.unlinkSync(stateFile(input.session_id));
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
