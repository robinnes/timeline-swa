export const TIME = {
  EPOCH: Date.UTC(2000,0,1),
  MS_PER_DAY: 86400000, // 1000*60*60*24
  ZOOM_FACTOR: 1.1,  // zoom speed applied to wheel and incremental panning 1.1
  PAN_FACTOR: 200,  // zoom speed for panning in fixed pan mode (arrow keys)
  MIN_MS_PER_PX: 1000,        // 5 minutes per pixel (very zoomed in) --1000 * 60 * 5
  MAX_MS_PER_PX: 1000 * 60 * 60 * 24 * 365 * 5, // ~5 years per pixel
  MAX_CLICK_MOVE: 1, // maximum mouse movement allowed for a mouse click
  ZOOM_SPEED: 10,  // auto zoom speed
  MU_FACTOR: -3.0, // "coefficient of friction"; rate by which momentum slows; orig. -4.0
  TICK_QUEUE_SIZE: 5, // the number of recent pointer speeds to base average on
  MIN_SPEED_FOR_THROW: 2 // minimum pointer speed (in pixels) to "throw" the canvas
};

export const DRAW = {
  MAX_LABEL_WIDTH: 150,
  LABEL_FONT: '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  TITLE_FONT: '600 14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  LABEL_LINE_HEIGHT: 18,
  LABEL_STEM_HEIGHT: 30,
  EDGE_GAP: 6,
  HIGHLIGHT_SHADOW: 'rgba(0,102,255,40)',
  HIGHLIGHT_GLOW: 30,
  LABEL_BRIGHTNESS: 0.85,  // default for label text
  DOT_HOVER_PAD: 6,  // maximum padding around dots for hover detection
  FADE_HIGHLIGHT_THRESHOLD: 0.4,  // lines where fade is below will not highlight
  MAX_SIGNIFICANCE: 6,  // largest possible value for event.significance
  DEFAULT_LINE_COLOR: "blue",
  THUMB_SIZE: 72,        // size in square pixes of native thumbnail image (54)
  THUMB_LABEL_SIZE: 36,  // size rendered on the canvas
  THUMB_LABEL_ROWS: 2    // the number of rows in labels needed to accommodate a thumbnail
};

export const ZOOM = {
  SIZE_ADJ: 1,  // 3
  PERSISTENCE: 1.3,
  FADE_IN: 1.4,  // 0.4
  FADE_OUT: 2,
  EVENT_MASTER: [
    { threshold:6, growth:1.5 },  // 5.5
    { threshold:7, growth:1.5 },  // 6.5
    { threshold:8, growth:1.5 },
    { threshold:9, growth:1.5 },
    { threshold:10, growth:1.5 }  // 10.5
  ],
  PERIOD_MASTER: [
    { threshold:6.5, growth:6.5 },
    { threshold:7.5, growth:7.5 },  // 7, 7
    { threshold:8.5, growth:8.5 },  // 8.5, 9
    { threshold:9.5, growth:9.5 },  // 10, 11
    { threshold:10.5, growth:10.5 }
  ]
}

export const TICK = {
  //PUSHING_THRESHOLD: 200, // px distance from corner label to start "pushing"
  MAX_TICK_LABEL_BRIGHT: 0.85, // max brightness for tick labels
  TICK_TOP: 6,
  TICK_LABEL_HEIGHT: 18,
  PADDING: 20,
  TICK_FONT: '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  MIN_WIDTH: 10,  // minimum width of ticks in pixels
  MINOR_LINE_COLOR: 'rgba(255,255,255,0.10)',
  MAJOR_LINE_COLOR: 'rgba(255,255,255,0.25)',
  NOW_LINE_COLOR: 'rgba(0, 123, 255, 0.7)'
};

export const TOUCH = {
  TAP_MAX_MS: 250,
  TAP_MAX_MOVE: 10,
  SIMULATE_MODE: false  // force pointer event handlers in mobile.js, even with a mouse
};

export const CONTAINER = 'timelines';