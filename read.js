#!/usr/bin/env node
// Reads the narration lines of one script aloud and saves each line as its own clip.
//   node read.js scripts/<name>.json [--shard=i/N]
// A script file is { "name": "...", "lines": ["first line", "second line", ...] }.
// A clip is named after the exact words, so changing a script only reads the lines that changed.
const { spawnSync } = require('node:child_process'); const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const file = process.argv[2], shard = (process.argv.find((a) => a.startsWith('--shard=')) || '').slice(8).split('/').map(Number);
if (!file || !fs.existsSync(file)) { console.error('give a script file, for example scripts/example.json'); process.exit(1); }
const job = JSON.parse(fs.readFileSync(file, 'utf8')), name = String(job.name || path.basename(file, '.json')).replace(/[^a-z0-9-]/gi, '-');
const out = path.join(__dirname, 'clips', name); fs.mkdirSync(out, { recursive: true });
const clean = (l) => String(l).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
const clipOf = (text) => crypto.createHash('sha1').update('chatterbox\n' + text).digest('hex').slice(0, 16);
const lines = (job.lines || []).map(clean).filter(Boolean).map((text) => ({ key: clipOf(text), text }));
const order = lines.map((_, k) => k).sort((a, b) => lines[b].text.length - lines[a].text.length || a - b);
const mine = (shard.length === 2 ? order.filter((_, k) => k % shard[1] === shard[0]) : order).map((k) => lines[k]);
const need = mine.filter((l, k, arr) => !fs.existsSync(path.join(out, l.key + '.raw.wav')) && arr.findIndex((m) => m.key === l.key) === k);
if (!need.length) { console.log(name + ': every line here is already read'); process.exit(0); }
console.log(`${name}: reading ${need.length} of ${lines.length} lines`);
const list = path.join(require('node:os').tmpdir(), `lines-${name}-${shard[0] || 0}.json`); fs.writeFileSync(list, JSON.stringify({ lines: need }));
const r = spawnSync('python3', [path.join(__dirname, 'voice-cb.py'), list, out], { stdio: 'inherit' }); process.exit(r.status === null ? 1 : r.status);
