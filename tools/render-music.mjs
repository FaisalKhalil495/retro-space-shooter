// Records the soundtrack into audio files the game plays.
//
// The music is written as code (music/source/songs.js, played with the
// instruments in music/source/soundtrack.js), but it's far too heavy for a
// phone to play live, so this records each song in a headless browser,
// folds the echo and reverb that ring past the end back onto the loop's
// start (so the loop joins without a gap or a cut-off), evens out the
// tone and loudness (a little less deep bass, which phone speakers can't
// play anyway, a little more top), saves music/<name>.mp3 and writes
// js/tracks.js (where each song's loop starts and ends).
//
// Usage (each song takes minutes; three are recorded at a time):
//   PLAYWRIGHT_PATH=/opt/node22/lib/node_modules/playwright node tools/render-music.mjs [name ...]
// `--tracks` only rewrites js/tracks.js from the recordings already there.
// Needs ffmpeg.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { serve, ROOT } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const T0 = 0.05; // every song starts this far into its file
const RATE = 44100;
const TAIL = 4; // seconds recorded past the end, then folded onto the loop
// Phone-speaker tone: less deep bass (more for the two with a big drone).
const BASS = { frost: -6, glacier: -6 };
const LUFS = -14;

const { SONGS } = await import(join(ROOT, 'music/source/songs.js'));
const args = process.argv.slice(2);
const tracksOnly = args.includes('--tracks');
const names = tracksOnly ? [] : args.length ? args : Object.keys(SONGS);
for (const n of names) if (!SONGS[n]) throw new Error('no song called ' + n);

const { server, base } = await serve();
const tmp = mkdtempSync(join(tmpdir(), 'ember-music-'));

async function record(name) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.log(name, 'error:', e.message));
    await page.goto(base + 'music/source/');
    const t = Date.now();
    const b64 = await page.evaluate(async ({ name, T0, RATE, TAIL }) => {
      const I = await import('/music/source/soundtrack.js');
      const M = await import('/music/source/songs.js');
      const song = M.SONGS[name];
      const S = 60 / song.bpm / 4;
      const len = song.bars * song.spb * S;
      const ac = new window.OfflineAudioContext(2, Math.ceil(RATE * (T0 + len + TAIL)), RATE);
      I.bind(ac, ac.destination, S * 4);
      M.schedule(name, T0);
      const buf = await ac.startRendering();
      const end = Math.round((T0 + len) * RATE);
      const loop = Math.round((T0 + song.loop * song.spb * S) * RATE);
      const out = new Float32Array(end * 2);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = end; i < d.length; i++) d[loop + i - end] += d[i]; // the ringing past the end
        for (let i = 0; i < end; i++) out[i * 2 + c] = d[i];
      }
      const u8 = new Uint8Array(out.buffer);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return window.btoa(s);
    }, { name, T0, RATE, TAIL });
    const raw = join(tmp, name + '.f32');
    writeFileSync(raw, Buffer.from(b64, 'base64'));
    const tone = `bass=g=${BASS[name] ?? -4}:f=110,treble=g=2:f=4000`;
    const input = ['-f', 'f32le', '-ar', String(RATE), '-ac', '2', '-i', raw];
    // Measure the loudness, then set it with one fixed gain (no pumping
    // level changes, so the loop's two ends match) and a peak limiter.
    const log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -f f32le -ar ${RATE} -ac 2 -i '${raw}' -af '${tone},ebur128' -f null - 2>&1`], { encoding: 'utf8' });
    const I = Number(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold[\s\S]*Loudness range/.exec(log)[1]);
    const file = join(ROOT, 'music', name + '.mp3');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...input, '-af', `${tone},volume=${(LUFS - I).toFixed(2)}dB,alimiter=limit=0.95:level=false:latency=1`, '-c:a', 'libmp3lame', '-b:a', '128k', file]);
    console.log(`${name}: ${((Date.now() - t) / 1000).toFixed(0)} s to record, loudness was ${I} LUFS`);
  } finally {
    await browser.close();
  }
}

// Three at a time.
const queue = [...names];
await Promise.all([0, 1, 2].map(async () => {
  while (queue.length) await record(queue.shift());
}));

// Where a song's opening hit lands in its decoded file, found exactly as
// js/music.js finds it (first sample louder than 0.02, left channel
// first). The game finds it again in what the phone decoded; any
// difference is silence the phone's decoder added, and the loop shifts by it.
function firstHit(file) {
  const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-t', '0.6', '-f', 'f32le', '-ar', String(RATE), '-']);
  const d = new Float32Array(raw.buffer, raw.byteOffset, raw.length >> 2);
  for (let c = 0; c < 2; c++) {
    for (let i = c; i < d.length; i += 2) if (Math.abs(d[i]) > 0.02) return (i >> 1) / RATE;
  }
  throw new Error('no opening hit in ' + file);
}

// js/tracks.js: every song's file and loop, for js/music.js.
const lines = [];
for (const name of Object.keys(SONGS)) {
  const file = join(ROOT, 'music', name + '.mp3');
  if (!existsSync(file)) continue;
  const song = SONGS[name];
  const S = 60 / song.bpm / 4;
  const hash = createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 10);
  const r = (x) => Math.round(x * 100000) / 100000;
  lines.push(`  ${name}: { file: 'music/${name}.mp3?h=${hash}', start: ${T0}, hit: ${r(firstHit(file))}, loopStart: ${r(T0 + song.loop * song.spb * S)}, loopEnd: ${r(T0 + song.bars * song.spb * S)} },`);
}
writeFileSync(join(ROOT, 'js/tracks.js'), `// Made by tools/render-music.mjs (don't edit by hand): the recorded songs.
// Times are in seconds into each file: the music starts at \`start\`, its
// opening hit is at \`hit\`, and it repeats from \`loopStart\` once it
// reaches \`loopEnd\`. The ?h= part changes only when a song is recorded
// again, so phones fetch it afresh then and otherwise keep their copy.
export const TRACKS = {
${lines.join('\n')}
};
`);
rmSync(tmp, { recursive: true, force: true });
server.close();
console.log('Wrote js/tracks.js');
