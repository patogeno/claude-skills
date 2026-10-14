#!/usr/bin/env node
// Hook handlers for the compact-check skill. One script, one subcommand per hook event:
//   post-compact  SessionStart(compact): tell Claude to re-read state
//   log-summary   PostCompact: append compact_summary to a log in the temp directory
// Every handler fails silently: a broken hook must never block the session.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATE_DIR = path.join(os.tmpdir(), 'claude-compact-check');

// Hard stop so a slow disk or a stuck stdin can never hold up the session.
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

function onPostCompact() {
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

const handlers = { 'post-compact': onPostCompact, 'log-summary': onLogSummary };

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
