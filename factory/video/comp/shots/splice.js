// "Generate splice plans." ~40 s. On the splice demo project (the finished Bayside design, nothing handed to
// splicing): the cursor types the ask, the agent reads the design (scripted words, the real digest), then the
// cursor opens Splice Diagrams, compiles the handoff and approves it. On a demo project Approve draws the
// skeleton AND fills every tray from the plan's own calls — no model — so the workspace opens on the finished
// plan. Times are seconds; world space as in bayside.js. Everything on the splice route is a selector target,
// measured when the cursor sets off (the route does not exist when the film starts).

export default {
  duration: 40,
  seedStep: 'network-bayside-splice-demo', // Acme — Bayside (splice demo): laid down or reset by the seed, each take
  stills: [4, 7, 11, 15, 19.5, 23, 27, 30, 34],
  url: 'app.lux.tech/projects/acme-bayside',
  logo: '/lux-wordmark.svg',
  preroll: 0.4,

  ready: ['[data-tour="chat-composer"] textarea', '.mapboxgl-canvas', '[data-tour="demo-rail"]'],
  settleMs: 5000,
  settleAfterReady: 160,
  anchors: {
    composer: '[data-tour="chat-composer"] textarea',
    map: '.mapboxgl-canvas',
    rail: '[data-tour="demo-rail"]',
    diagrams: '[data-tour="splice-diagrams-button"]',
  },

  prompt: 'Generate the splice plans.',

  title: { text: 'Generate splice plans.', out: 2.4 },
  end: [{ kind: 'url', text: 'app.lux.tech', in: 36.6, out: 38.8 }, { kind: 'logo', in: 38.8 }],
  scene: { in: 2.0, out: 37.0 },

  build(a, BAR) {
    const Wd = r => (r ? { x: r.x, y: r.y + BAR, w: r.width ?? r.w, h: r.height ?? r.h } : null);
    const composer = Wd(a.composer), map = Wd(a.map);
    const cx = r => r.x + r.w / 2, cy = r => r.y + r.h / 2;
    const chat = composer ? { x: composer.x - 28, y: BAR, w: 1440 - (composer.x - 28), h: 900 } : { x: 1100, y: BAR, w: 340, h: 900 };
    const mapBox = { x: map?.x ?? 56, y: BAR, w: chat.x - (map?.x ?? 56), h: 900 };
    return {
      camera: {
        start: { x: -70, y: -40, w: 1580, h: 1032 },
        moves: [
          // the finished design, then down to the prompt box
          { t0: 3.0, t1: 6.0, box: { x: chat.x - 120, y: 480, w: chat.w + 160, h: 440 }, vbox: { x: chat.x - 40, y: 300, w: chat.w + 60, h: 640 } },
          // the answer in the chat
          { t0: 10.6, t1: 13.4, box: { x: chat.x - 40, y: 40, w: chat.w + 80, h: 900 }, vbox: { x: chat.x - 10, y: 30, w: chat.w + 20, h: 900 } },
          // the handoff card over the map
          { t0: 15.6, t1: 18.4, box: { x: mapBox.x + 60, y: 60, w: mapBox.w - 120, h: 820 }, vbox: { x: mapBox.x + 200, y: -100, w: 620, h: 1100 } },
          // the filled sheets, whole window
          { t0: 29.0, t1: 33.0, box: { x: -40, y: 20, w: 1520, h: 910 }, vbox: { x: 360, y: -413, w: 1000, h: 1778 } },
        ],
        drift: 0.010,
      },
      cursor: {
        start: [1180, 1010],
        fade: [2.4, 2.8],
        moves: [
          { to: '[data-tour="chat-composer"] textarea', ax: 0.88, ay: 0.5, at: 4.2, bow: -0.16 },
          // the top-bar door to the splice board, once the agent has answered
          { to: '[data-tour="splice-diagrams-button"]', at: 14.6, bow: 0.14 },
          { to: '[data-tour="splice-compile"]', at: 18.8, bow: 0.12 },
          { to: '[aria-label="Expand handoff details"]', at: 22.6, bow: 0.1 },
          { to: '[data-tour="splice-approve"]', at: 26.2, bow: 0.14 },
          { to: [mapBox.x + mapBox.w * 0.5, 520], at: 33.0, bow: 0.18 },
        ],
        presses: [4.45, 14.85, 19.05, 22.85, 26.45],
      },
      beats: [
        { at: 4.8, do: 'key', key: 'Control+A' },
        { at: 5.0, do: 'type', text: 'Generate the splice plans.', cps: 12 },
        { at: 7.6, do: 'key', key: 'Enter' },
      ],
    };
  },
};
