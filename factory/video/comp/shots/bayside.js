// "Select an area. Ask for the network." ~61 s. The area is an irregular six-sided outline, drawn vertex by vertex;
// the ask, the plan, Accept; the closures land (turn 3, the solver in the sandbox); "Connect every home." routes the
// cabinets, drops, distribution and feeder (turn 4) and tilts the map; the film ends on the finished network.
// Times are seconds. World space = the browser window: (0,0) is its top-left, the app starts at y = BAR.
// `a` holds rects measured from the live workspace by render.mjs (page px): draw = the toolbar's draw-area
// button, composer = the prompt box, send = its send button, map = the map canvas, rail = the demo rail.
// The ring is drawn by the product's own demo hand (lux:demo-draw → the real draw tool, real scan); the film's
// cursor follows that pointer. The prompt box is measured late (the scan drops the area's pin into it, which
// moves it), and the plan's Accept only exists once the agent proposes, so its rect is read when it appears.

const RING = [
  [-73.7779, 40.7533],
  [-73.7738, 40.7528],
  [-73.7684, 40.7536],
  [-73.7679, 40.7569],
  [-73.7716, 40.7584],
  [-73.7772, 40.7577],
  [-73.7779, 40.7533],
];

export default {
  duration: 61,
  project: 'cmv44175r0001bpdij8yae87u', // Acme — Bayside (film 2): a copy of the demo project (tools/copy-project.mjs)
  url: 'app.lux.tech/projects/acme-bayside',
  logo: '/lux-wordmark.svg', // on the app's origin
  preroll: 0.4,

  // what the workspace must show before the film starts (inside the app)
  // the composer, the map, and the demo rail — the rail only mounts once the project record (the demo
  // flag, the light mode) has loaded, so a half-loaded workspace does not count
  ready: ['[data-tour="chat-composer"] textarea', '.mapboxgl-canvas', '[data-tour="demo-rail"]'],
  settleMs: 5000,
  settleAfterReady: 160,
  anchors: {
    draw: '[aria-label="draw area · ctrl+u"]',
    composer: '[data-tour="chat-composer"] textarea',
    send: '[aria-label="send message"]',
    map: '.mapboxgl-canvas',
    rail: '[data-tour="demo-rail"]',
  },

  ring: RING,
  // the map's hover cards (a pole's tag under the drawing hand) have no part in this film
  css: '.mapboxgl-popup{display:none!important}',
  stills: [6, 9, 11.5, 13, 14, 21, 25.5, 29, 31.5, 35, 38, 40.5, 44, 48, 53, 59.5],
  prompt: 'Plan a GPON build for this area. Aerial on the existing poles where we can.',

  title: { text: 'Select an area. Ask for the network.', out: 2.6 },
  end: [
    { kind: 'url', text: 'app.lux.tech', in: 56.1, out: 58.5 },
    { kind: 'logo', in: 58.5 },
  ],
  scene: { in: 2.2, out: 56.5 },

  build(a, BAR) {
    const Wd = r => (r ? { x: r.x, y: r.y + BAR, w: r.w, h: r.h } : null);
    const draw = Wd(a.draw), composer = Wd(a.composer), map = Wd(a.map);
    const cx = r => r.x + r.w / 2, cy = r => r.y + r.h / 2;
    // The map canvas runs the full width under the chat panel, so the panel is read off the composer:
    // its left edge, a little outside the prompt box; its width, to the window's edge.
    const chat = composer
      ? { x: composer.x - 28, y: BAR, w: 1440 - (composer.x - 28), h: 900 }
      : { x: 1100, y: BAR, w: 340, h: 900 };
    const mapBox = { x: map?.x ?? 56, y: BAR, w: chat.x - (map?.x ?? 56), h: 900 };
    return {
      camera: {
        start: { x: -70, y: -40, w: 1580, h: 1032 },
        moves: [
          // onto the map while the ring is drawn — after the press on the draw button, which sits in the
          // composer's toolbar at the window's foot and must be in frame when the cursor lands on it
          { t0: 4.9, t1: 8.0, box: { x: mapBox.x + 60, y: mapBox.y + 40, w: mapBox.w - 120, h: mapBox.h - 140 },
            vbox: { x: mapBox.x + 200, y: mapBox.y - 120, w: 620, h: 1100 } },
          // back out as the scan lands, then down to the prompt box
          { t0: 13.8, t1: 16.6, box: { x: -20, y: 60, w: 1480, h: 833 }, vbox: { x: 360, y: -413, w: 1000, h: 1778 } },
          { t0: 16.4, t1: 19.2, box: { x: chat.x - 120, y: 480, w: chat.w + 160, h: 440 }, vbox: { x: chat.x - 40, y: 300, w: chat.w + 60, h: 640 } },
          // the answer: the chat panel, whole
          { t0: 24.6, t1: 27.4, box: { x: chat.x - 40, y: 40, w: chat.w + 80, h: 900 }, vbox: { x: chat.x - 10, y: 30, w: chat.w + 20, h: 900 } },
          // the plan card over the map's right half, then the whole window as the build starts
          { t0: 27.6, t1: 30.4, box: { x: mapBox.x + mapBox.w * 0.45, y: 300, w: mapBox.w * 0.55 + chat.w, h: 640 },
            vbox: { x: mapBox.x + mapBox.w * 0.55, y: 180, w: 560, h: 980 } },
          { t0: 33.0, t1: 37.0, box: { x: -40, y: 20, w: 1520, h: 910 }, vbox: { x: 360, y: -413, w: 1000, h: 1778 } },
          // down to the prompt box for the second ask
          { t0: 37.4, t1: 39.4, box: { x: chat.x - 120, y: 480, w: chat.w + 160, h: 440 }, vbox: { x: chat.x - 40, y: 300, w: chat.w + 60, h: 640 } },
          // the map, whole, as the cables route and it tilts to 3D
          { t0: 41.8, t1: 44.8, box: { x: mapBox.x + 10, y: BAR + 10, w: mapBox.w - 20, h: 880 },
            vbox: { x: mapBox.x + mapBox.w * 0.3, y: -150, w: 620, h: 1100 } },
          // and a slow push into the finished network
          { t0: 49.0, t1: 55.0, box: { x: mapBox.x + mapBox.w * 0.16, y: BAR + 150, w: mapBox.w * 0.68, h: 600 },
            vbox: { x: mapBox.x + mapBox.w * 0.36, y: 0, w: 500, h: 900 } },
        ],
        drift: 0.010,
      },
      cursor: {
        start: [1180, 1010],
        fade: [2.7, 3.0],
        moves: [
          // the draw-area button in the composer's toolbar
          { to: draw ? [cx(draw), cy(draw)] : [1230, 905], at: 4.3, bow: 0.14 },
          // after the ring (the product's hand drew it; the cursor rode along): into the prompt box, past the
          // end of the pin the scan left there, measured once the pin is in
          { from: 'follow', to: '[data-tour="chat-composer"] textarea', ax: 0.88, ay: 0.5, measureAt: 16.4, at: 17.3, bow: -0.16 },
          // the plan's Accept, measured when the card is up
          { to: '[data-tour="plan-accept"]', at: 31.2, bow: 0.18 },
          // park on the map's edge while the closures land
          { to: [mapBox.x + mapBox.w - 90, 640], at: 34.6, bow: 0.2 },
          // back into the prompt box for "Connect every home."
          { to: '[data-tour="chat-composer"] textarea', ax: 0.5, ay: 0.5, at: 38.6, bow: -0.16 },
          // and off the map while the network routes
          { to: [mapBox.x + mapBox.w - 90, 640], at: 43.2, bow: 0.2 },
        ],
        // The draw button is a soft press: the demo hand's own request arms the draw tool (the button lights
        // up from that), and a real press on top made the tool start twice, which throws the first ring away.
        presses: [{ at: 4.55, soft: true }, 17.55, 31.45, 38.85],
      },
      beats: [
        { at: 5.0, do: 'draw' },
        // the scan put its "[Pin: Selected Area]" token in the box; the prompt replaces it (select all, type)
        { at: 17.9, do: 'key', key: 'Control+A' },
        { at: 18.2, do: 'type', text: 'Plan a GPON build for this area. Aerial on the existing poles where we can.', cps: 11.5 },
        { at: 24.9, do: 'key', key: 'Enter' },
        // turn 4: cabinets, drops, distribution, feeder, then the map tilts
        { at: 39.2, do: 'type', text: 'Connect every home.', cps: 12 },
        { at: 41.3, do: 'key', key: 'Enter' },
      ],
    };
  },
};
