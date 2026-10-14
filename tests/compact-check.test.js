// Run with: node --test tests/
// Builds fixture transcripts in the shape Claude Code writes them, then runs the hook on them.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'hooks', 'compact-check.js');

function sandbox() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'compact-check-test-'));
}

// One main-thread assistant turn. `input` is what the request sent; `output` what it added.
function turn(input, output = 1000, extra = {}) {
  return {
    type: 'assistant',
    isSidechain: false,
    message: {
      model: 'claude-opus-5-5',
      usage: {
        input_tokens: 2,
        cache_read_input_tokens: input - 1002,
        cache_creation_input_tokens: 1000,
        output_tokens: output,
      },
    },
    ...extra,
  };
}

// /context output as Claude Code stores it: a local_command entry with ANSI colour codes.
function contextOutput(used, window, pct) {
  const grey = '\u001b[38;2;153;153;153m';
  return {
    type: 'system',
    subtype: 'local_command',
    isSidechain: false,
    content:
      `<local-command-stdout> \u001b[1mContext Usage\u001b[22m\n${grey}⛁ ⛶ ⛶\u001b[39m  ` +
      `${grey}${used}/${window} tokens (${pct}%)\u001b[39m\n` +
      `\u001b[1mAuto-compact window: \u001b[22m${grey}${window} tokens\u001b[39m\n</local-command-stdout>`,
  };
}

function compactBoundary(preTokens, postTokens) {
  return { type: 'system', subtype: 'compact_boundary', compactMetadata: { trigger: 'auto', preTokens, postTokens } };
}

function runHook(dir, entries, { sessionId = 's1', env = {}, sub = 'prompt' } = {}) {
  const transcript = path.join(dir, `${sessionId}.jsonl`);
  fs.writeFileSync(transcript, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  const cleanEnv = { ...process.env };
  for (const name of ['ANTHROPIC_MODEL', 'COMPACT_CHECK_WINDOW', 'COMPACT_CHECK_WINDOW_TOKENS']) delete cleanEnv[name];
  const result = spawnSync(process.execPath, [HOOK, sub], {
    input: JSON.stringify({ session_id: sessionId, transcript_path: transcript }),
    // The hook keeps per-session state under os.tmpdir(); point it into the sandbox.
    env: { ...cleanEnv, TMPDIR: dir, TEMP: dir, TMP: dir, ...env },
    encoding: 'utf8',
  });
  return result.stdout.trim();
}

test('200k session at 83% gets the 80% reminder', () => {
  const out = runHook(sandbox(), [contextOutput('120.3k', '200k', 60), turn(165000)]);
  console.log('200k session:', out);
  assert.match(out, /about 83% full \(166k of 200k tokens\)/);
});

test('1M session at 163.6k, as /context reported it, stays silent', () => {
  // The numbers from the session that reported "102% full": the last request sent 162,393 tokens
  // and added 1,414; /context then showed 163.6k/1m.
  const out = runHook(sandbox(), [turn(162393, 1414), contextOutput('163.6k', '1m', 16)]);
  console.log('1M session at 16%:', JSON.stringify(out));
  assert.strictEqual(out, '');
});

test('1M session at 65% gets the 60% reminder, against 1m', () => {
  const out = runHook(sandbox(), [contextOutput('163.6k', '1m', 16), turn(650000)]);
  console.log('1M session at 65%:', out);
  assert.match(out, /about 65% full \(651k of 1m tokens\)/);
});

test('usage from before a compaction is not reported', () => {
  // The regression: a 203k pre-compaction turn, then an auto-compaction down to 13.8k.
  const out = runHook(sandbox(), [turn(203093, 1199), compactBoundary(204962, 13813)], {
    env: { COMPACT_CHECK_WINDOW_TOKENS: '200000' },
  });
  assert.strictEqual(out, '');
});

test('sidechain usage is ignored', () => {
  const out = runHook(sandbox(), [contextOutput('1k', '200k', 1), turn(50000), turn(190000, 0, { isSidechain: true })]);
  assert.strictEqual(out, '');
});

test('unknown window prints the raw count without a percentage', () => {
  const out = runHook(sandbox(), [turn(162393, 1414)]);
  console.log('unknown window:', out);
  assert.match(out, /Context holds about 164k tokens/);
  assert.doesNotMatch(out, /% full/);
});

test('COMPACT_CHECK_WINDOW_TOKENS sets the window when /context was never run', () => {
  const out = runHook(sandbox(), [turn(165000)], { env: { COMPACT_CHECK_WINDOW_TOKENS: '200000' } });
  assert.match(out, /about 83% full \(166k of 200k tokens\)/);
});

test('a "[1m]" model in ANTHROPIC_MODEL means a 1M window', () => {
  const out = runHook(sandbox(), [turn(165000)], { env: { ANTHROPIC_MODEL: 'claude-opus-5-5[1m]' } });
  assert.strictEqual(out, '');
});

test('a window seen once is remembered after /context leaves the transcript tail', () => {
  const dir = sandbox();
  assert.strictEqual(runHook(dir, [contextOutput('100k', '1m', 10), turn(100000)]), '');
  // Same session, /context no longer visible: still measured against 1m, so still silent.
  assert.strictEqual(runHook(dir, [turn(300000)]), '');
});

test('each threshold fires once, and compaction re-arms them but keeps the window', () => {
  const dir = sandbox();
  const entries = [contextOutput('120k', '200k', 60), turn(125000)];
  assert.match(runHook(dir, entries), /about 63% full/);
  assert.strictEqual(runHook(dir, entries), '');
  assert.match(runHook(dir, [], { sub: 'post-compact' }), /Context was just compacted/);
  assert.match(runHook(dir, [turn(125000)]), /about 63% full \(126k of 200k tokens\)/);
});
