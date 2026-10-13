// The cursor: a vector macOS arrow and pointing hand, moved along curved, eased paths.
// Everything is a pure function of time, so a frame always renders the same way (no jitter, no state).

// Arrow: tip at (0,0). Near-black fill, white outline (stroke drawn under the fill), soft small shadow.
export const ARROW = {
  hot: [0, 0],
  svg: `<path d="M1 1 L1 18.2 L5.3 14.1 L8.15 20.6 L11.1 19.35 L8.35 13 L14.2 13 Z"
    fill="#111214" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"/>`,
};

// Pointing hand, like macOS: white glove, near-black outline, hotspot on the index fingertip.
export const HAND = {
  hot: [9.25, 1.6],
  svg: `<path d="M7.5 3.35C7.5 2.4 8.3 1.6 9.25 1.6S11 2.4 11 3.35V10.1C11 9.3 11.7 8.7 12.5 8.7S14 9.3 14 10.1V10.9
    C14 10.1 14.7 9.6 15.5 9.6S17 10.2 17 11V11.8C17 11.1 17.7 10.6 18.45 10.6S19.9 11.2 19.9 12V17.3
    C19.9 20.1 18.7 22 17.5 23V24.6H9.1V23.2C7.7 22 6.1 20 4.3 17.6L2.5 15.2C1.8 14.3 2 13.2 2.8 12.7S4.6 12.4 5.2 13.2
    L7.5 16Z" fill="#fff" stroke="#111214" stroke-width="1.15" stroke-linejoin="round"/>
    <path d="M11 10.1V14.6M14 10.9V14.6M17 11.8V14.6" stroke="#111214" stroke-width="1" stroke-linecap="round" fill="none"/>`,
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smoother = u => u * u * u * (u * (u * 6 - 15) + 10);
const sine = u => 0.5 - 0.5 * Math.cos(Math.PI * u);

// Duration from distance: long moves are quicker per pixel, short ones slow and precise.
export const durFor = dist => 0.42 + 0.3 * Math.log2(1 + dist / 90);

// Progress along a move: velocity peaks early (a confident start), the approach is long and soft,
// it overshoots by a hair and settles back. Velocity is zero at both ends and continuous throughout.
function progress(u, overshoot) {
  const k = 0.86;
  if (u < k) {
    const v = u / k;
    return (1 + overshoot) * smoother(Math.pow(v, 0.82));
  }
  return 1 + overshoot - overshoot * sine((u - k) / (1 - k));
}

// A move bows gently: control point off the chord, to one side, like a wrist pivoting.
function bezier(a, b, bow, s) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const c = [mx - dy * bow, my + dx * bow];
  const i = 1 - s;
  return [i * i * a[0] + 2 * i * s * c[0] + s * s * b[0], i * i * a[1] + 2 * i * s * c[1] + s * s * b[1]];
}

// moves: [{to:[x,y], at: arrival time, dur?: s, bow?: n}], start: [x,y]
// presses: [time | {at, soft: true}, ...]  (each press holds the button for PRESS seconds; a soft press is the
// cursor's own motion only — no real mouse button — for a control the film arms another way)
// resolve(m, i) -> {to, from?} | null: the comp measures a target it cannot know up front (a button that
// only appears later) and may start a move where another hand let go; null = not knowable yet, hold here.
export const PRESS = 0.085;
export function cursorAt(t, start, moves, presses, resolve = m => ({ to: m.to })) {
  let pos = start, from = start;
  for (const [i, m] of moves.entries()) {
    const r = resolve(m, i);
    if (!r) break;
    if (r.from) { from = r.from; pos = from; }
    const to = r.to;
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const dur = m.dur ?? durFor(dist);
    const t0 = m.at - dur;
    if (t >= m.at) { pos = to; from = to; continue; }
    if (t > t0) {
      const ov = Math.min(0.012, 2.2 / Math.max(dist, 1));
      pos = bezier(from, to, m.bow ?? 0.14, clamp(progress((t - t0) / dur, ov), -0.1, 1.1));
    }
    break;
  }
  // press: 0.9 scale, in over 2 frames, held, out over ~4 frames
  let scale = 1, down = false;
  for (const press of presses) {
    const p = typeof press === 'number' ? press : press.at;
    const soft = typeof press === 'object' && press.soft;
    if (!soft && t >= p && t < p + PRESS) down = true;
    const inn = clamp((t - p) / 0.03), out = clamp((t - p - PRESS) / 0.07);
    const k = inn * (1 - sine(out));
    if (k > 0) scale = Math.min(scale, 1 - 0.1 * k);
  }
  return { pos, scale, down };
}
