import { audioOut } from './audio.js?v=0.29.0';
import { TRACKS } from './tracks.js?v=0.29.0';

// All the music: a piece for each level and each boss (the menus play The
// Outer Belt's). They're written as code (music/source/) but far too heavy
// for a phone to play live, so tools/render-music.mjs records them into
// music/*.mp3, and this plays those recordings. A song loads when it's
// first needed (each level fetches its two ahead of time), plays its intro
// once, then loops the rest seamlessly. Changing songs crossfades.

const ALIAS = { title: 'belt' }; // the menus play The Outer Belt's piece
// How loud each plays (the recordings are all equally loud): the level
// themes sit a little under the boss songs.
const LOUD = 0.47;
const LEVEL = { belt: 0.7, rust: 0.7, frost: 0.7 };

const files = new Map(); // track -> its file, fetching (a promise)
const decoded = new Map(); // track -> its sound, ready to play (a promise)
let keep = new Set(); // tracks to keep ready (the current level's two)
let playing = null; // the name asked for ('title', 'rust', ...) or null
let current = null; // what's sounding: { track, src, bus }
let ticket = 0; // bumps on every start and stop, so a late load knows it's stale

const trackOf = (name) => ALIAS[name] || name;

function fetchTrack(track) {
  if (!files.has(track)) {
    const p = fetch(TRACKS[track].file).then((r) => {
      if (!r.ok) throw new Error('music ' + r.status);
      return r.arrayBuffer();
    });
    p.catch(() => files.delete(track)); // (try again next time it's wanted)
    files.set(track, p);
  }
  return files.get(track);
}

function decodeTrack(track, ac) {
  if (!decoded.has(track)) {
    const p = fetchTrack(track)
      // (decoding uses up the data it's given, so it gets a copy; older
      // iPhones only know the callback form)
      .then((data) => new Promise((ok, fail) => ac.decodeAudioData(data.slice(0), ok, fail)))
      .then((buffer) => ({ buffer, offset: offsetOf(buffer, track) }));
    p.catch(() => decoded.delete(track));
    decoded.set(track, p);
  }
  return decoded.get(track);
}

// A decoder may add a sliver of silence at the start of a file. Every
// song opens with a hit (where it lands in the file was measured as it was
// recorded: `hit`), so find that hit and shift the loop points by however
// far it moved.
function offsetOf(buffer, track) {
  const rate = buffer.sampleRate;
  const end = Math.min(buffer.length, Math.floor(rate * 0.6));
  let first = -1;
  for (let c = 0; c < buffer.numberOfChannels && first < 0; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < end; i++) {
      if (Math.abs(d[i]) > 0.02) {
        first = i;
        break;
      }
    }
  }
  const off = first < 0 ? 0 : first / rate - TRACKS[track].hit;
  return Math.abs(off) < 0.1 ? off : 0;
}

// Only the songs in use stay decoded (each takes about 20 MB of memory).
function trim() {
  for (const track of decoded.keys()) {
    if (!keep.has(track) && (!current || current.track !== track)) decoded.delete(track);
  }
}

// Get a level's songs ready before they're needed (its theme and its boss).
export function preloadMusic(names) {
  keep = new Set(names.map(trackOf).filter((t) => TRACKS[t]));
  trim();
  const out = audioOut();
  for (const track of keep) {
    if (out) decodeTrack(track, out.ac).catch(() => {});
    else fetchTrack(track).catch(() => {});
  }
}

// Start a song (a level's, a boss's or the menus'), crossfading from
// whatever is playing. Asking for the song already playing does nothing.
export function startMusic(name) {
  const out = audioOut();
  if (!out || playing === name) return;
  const track = trackOf(name);
  stopMusic(1);
  if (!TRACKS[track]) return; // (a level without music of its own: quiet)
  playing = name;
  const mine = ++ticket;
  decodeTrack(track, out.ac).then(
    ({ buffer, offset }) => {
      if (mine === ticket) begin(out, track, buffer, offset);
    },
    () => {}, // no music (offline?): the game carries on quietly
  );
}

function begin({ ac, master }, track, buffer, offset) {
  const T = TRACKS[track];
  const now = ac.currentTime;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, now);
  bus.gain.exponentialRampToValueAtTime(LOUD * (LEVEL[track] || 1), now + 0.25);
  bus.connect(master);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = T.loopStart + offset;
  src.loopEnd = Math.min(T.loopEnd + offset, buffer.duration);
  src.connect(bus);
  src.onended = () => bus.disconnect();
  src.start(now + 0.02, Math.max(0, T.start + offset - 0.02));
  current = { track, src, bus };
  trim();
}

export const musicPlaying = () => playing;

export function stopMusic(fade = 1.5) {
  ticket++;
  playing = null;
  const out = audioOut();
  if (!current || !out) return;
  const { src, bus } = current;
  current = null;
  const t = out.ac.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
  bus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  src.stop(t + fade + 0.05);
  trim();
}

// For the tests: what's sounding and where its loop is.
export function musicState() {
  if (!current) return null;
  const { track, src } = current;
  return { track, loop: src.loop, loopStart: src.loopStart, loopEnd: src.loopEnd, length: src.buffer.duration };
}
