// "Ask how the build is going." ~30 s. The Ask desk (/ask) opened with the executive's scripted story
// (?demo=ask-bayside: the words are authored, the executive rollup and the backlog are read for real, nothing is
// billed). No project, no reset: the desk reads the seeded company as it is. Times are seconds; world space as in
// bayside.js (the window is 1440 x 900 under the bar).

export default {
  duration: 30,
  // no `project`: the page is the desk itself, opened at this path
  path: '/ask?demo=ask-bayside',
  stills: [4, 6.5, 10, 14, 19, 23, 26],
  url: 'app.lux.tech/ask',
  logo: '/lux-wordmark.svg',
  preroll: 0.4,

  ready: ['textarea', '[aria-label="Send"]'],
  settleMs: 3000,
  settleAfterReady: 100,
  anchors: {
    composer: 'textarea',
    send: '[aria-label="Send"]',
  },

  title: { text: 'Ask how the build is going.', out: 2.4 },
  end: [{ kind: 'url', text: 'app.lux.tech', in: 26.8, out: 28.8 }, { kind: 'logo', in: 28.8 }],
  scene: { in: 2.0, out: 27.2 },

  build(a, BAR) {
    const Wd = r => (r ? { x: r.x, y: r.y + BAR, w: r.w, h: r.h } : null);
    const composer = Wd(a.composer) ?? { x: 420, y: 760, w: 600, h: 48 };
    const cy = r => r.y + r.h / 2;
    return {
      camera: {
        start: { x: -70, y: -40, w: 1580, h: 1032 },
        moves: [
          // down to the question
          { t0: 2.6, t1: 5.2, box: { x: composer.x - 160, y: composer.y - 300, w: composer.w + 320, h: 420 }, vbox: { x: composer.x - 40, y: composer.y - 420, w: composer.w + 80, h: 800 } },
          // the answer, whole
          { t0: 9.6, t1: 12.6, box: { x: -40, y: 20, w: 1520, h: 910 }, vbox: { x: 360, y: -413, w: 1000, h: 1778 } },
          // the second question and its answer
          { t0: 16.0, t1: 18.6, box: { x: composer.x - 160, y: composer.y - 300, w: composer.w + 320, h: 420 }, vbox: { x: composer.x - 40, y: composer.y - 420, w: composer.w + 80, h: 800 } },
          { t0: 21.6, t1: 24.6, box: { x: -40, y: 20, w: 1520, h: 910 }, vbox: { x: 360, y: -413, w: 1000, h: 1778 } },
        ],
        drift: 0.010,
      },
      cursor: {
        start: [1180, 1010],
        fade: [2.4, 2.8],
        moves: [
          { to: 'textarea', ax: 0.5, ay: 0.5, at: 4.2, bow: -0.16 },
          { to: [composer.x + composer.w + 200, cy(composer) - 240], at: 9.0, bow: 0.14 },
          { to: 'textarea', ax: 0.5, ay: 0.5, at: 17.6, bow: -0.16 },
          { to: [composer.x + composer.w + 200, cy(composer) - 240], at: 22.0, bow: 0.14 },
        ],
        presses: [4.45, 17.85],
      },
      beats: [
        { at: 4.8, do: 'type', text: 'How is the Bayside build going?', cps: 12 },
        { at: 7.8, do: 'key', key: 'Enter' },
        { at: 18.2, do: 'type', text: 'What is blocking?', cps: 12 },
        { at: 20.0, do: 'key', key: 'Enter' },
      ],
    };
  },
};
