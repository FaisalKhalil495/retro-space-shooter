// Made by tools/render-music.mjs (don't edit by hand): the recorded songs.
// Times are in seconds into each file: the music starts at `start`, its
// opening hit is at `hit`, and it repeats from `loopStart` once it
// reaches `loopEnd`. The ?h= part changes only when a song is recorded
// again, so phones fetch it afresh then and otherwise keep their copy.
export const TRACKS = {
  belt: { file: 'music/belt.mp3?h=c93cebeed0', start: 0.05, hit: 0.0578, loopStart: 7.66905, loopEnd: 61.00238 },
  rust: { file: 'music/rust.mp3?h=812e24d141', start: 0.05, hit: 0.05678, loopStart: 6.45, loopEnd: 51.25 },
  frost: { file: 'music/frost.mp3?h=d297b8c8e4', start: 0.05, hit: 0.05676, loopStart: 10.48478, loopEnd: 62.6587 },
  rockjaw: { file: 'music/rockjaw.mp3?h=31a7cca318', start: 0.05, hit: 0.05687, loopStart: 2.77727, loopEnd: 43.68636 },
  march: { file: 'music/march.mp3?h=c28c2ee4ad', start: 0.05, hit: 0.05646, loopStart: 8.32586, loopEnd: 66.2569 },
  glacier: { file: 'music/glacier.mp3?h=1fc00bb910', start: 0.05, hit: 0.05723, loopStart: 5.65, loopEnd: 44.85 },
};
