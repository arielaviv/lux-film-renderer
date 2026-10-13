// "Upload existing infrastructure." ~16 s. The plant arrives as files: a folder on the ground beside the browser,
// the cursor drags poles, then spans, onto the map; each drop is a real file into the product's own file drop,
// which writes a tagged GeoJSON straight to the ontology's layer. The project is the upload demo (no plant);
// its reset clears what a take dropped in. Times are seconds; world space as in bayside.js.

export default {
  duration: 16,
  seedStep: 'network-bayside-upload-demo', // Acme — Bayside (upload demo): laid down or reset by the seed, each take
  stills: [3, 4.6, 5.6, 7, 9.6, 11, 13],
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
  },

  // the folder beside the browser (world coordinates: left of the window, see #folder in the comp)
  folder: {
    name: 'Bayside',
    files: [
      { name: 'poles.geojson', size: '545 KB' },
      { name: 'aerial-spans.geojson', size: '251 KB' },
      { name: 'ducts.geojson', size: '38 KB' },
      { name: 'addresses.csv', size: '91 KB' },
    ],
  },

  title: { text: 'Upload existing infrastructure.', out: 2.4 },
  end: [{ kind: 'url', text: 'app.lux.tech', in: 13.6, out: 15.4 }, { kind: 'logo', in: 15.4 }],
  scene: { in: 2.0, out: 14.0 },

  build(a, BAR) {
    const map = a.map ? { x: a.map.x, y: a.map.y + BAR, w: a.map.w, h: a.map.h } : { x: 56, y: BAR, w: 1384, h: 900 };
    // the folder's rows, in world coordinates (#folder: left -440, top 150; bar 38 px; a row 41 px)
    const row = i => [-440 + 60, 150 + 38 + 20 + i * 41];
    const onMap = [map.x + map.w * 0.42, map.y + map.h * 0.5];
    return {
      camera: {
        // wide, folder and window both in frame; a slow push toward the map as the plant lands
        start: { x: -520, y: -60, w: 2060, h: 1080 },
        moves: [
          { t0: 9.6, t1: 13.4, box: { x: -40, y: 20, w: 1520, h: 910 }, vbox: { x: 360, y: -413, w: 1000, h: 1778 } },
        ],
        drift: 0.008,
      },
      cursor: {
        start: [-300, 700],
        fade: [2.4, 2.8],
        moves: [
          { to: row(0), at: 3.6, bow: 0.12 },                 // poles.geojson in the folder
          { to: onMap, at: 5.4, bow: -0.18, dur: 1.4 },       // dragged onto the map
          { to: row(1), at: 7.6, bow: 0.12 },                 // aerial-spans.geojson
          { to: [onMap[0] + 90, onMap[1] - 40], at: 9.4, bow: -0.18, dur: 1.4 },
          { to: [map.x + map.w - 120, map.y + 640], at: 12.0, bow: 0.2 }, // park
        ],
        presses: [],
      },
      beats: [
        // the file leaves the folder when the move to the map begins (dur), and lands at `at`
        { at: 5.4, do: 'drop', file: 'poles.geojson', mime: 'application/geo+json', dur: 1.4 },
        { at: 9.4, do: 'drop', file: 'aerial-spans.geojson', mime: 'application/geo+json', dur: 1.4 },
      ],
    };
  },
};
