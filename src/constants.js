export const TIME = {
  EPOCH: Date.UTC(2000,0,1),
  MS_PER_DAY: 86400000, // 1000*60*60*24
  ZOOM_FACTOR: 1.1,  // zoom speed applied to wheel and incremental panning
  PAN_FACTOR: 200,
  MIN_MS_PER_PX: 1000 * 60 * 5,        // 5 minutes per pixel (very zoomed in)
  MAX_MS_PER_PX: 1000 * 60 * 60 * 24 * 365 * 5, // ~5 years per pixel
  MAX_CLICK_MOVE: 1, // maximum mouse movement allowed for a mouse click
  ZOOM_SPEED: 10  // auto zoom speed
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
  DEFAULT_LINE_COLOR: "blue"
};

export const TICK = {
  PUSHING_THRESHOLD: 150, // px distance from corner label to start "pushing"
  MAX_TICK_LABEL_BRIGHT: 0.85, // max brightness for tick labels
  TICK_TOP: 6,
  TICK_LABEL_HEIGHT: 18,
  PADDING: 20
};