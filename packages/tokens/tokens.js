// Single source of truth for the look and feel of every sim.
// Change a value here, rebuild, and every sim updates.
// Interface colours are PROVISIONAL until the Skuulabs brand palette is ready.

module.exports = {
  apparatus: {
    glass:          '#D6EFFF',
    glassHighlight: '#FFFFFF',
    glassOutline:   '#3B4A5A',
    water:          '#8ACEFF',
    waterDeep:      '#3D97E0',
    solidFace:      '#B8C2CC',
    solidSide:      '#8D99A5',
    shadow:         'rgba(15, 23, 42, 0.18)',
    outlineWidth:   '2px'
  },

  interface: {
    text:       '#1F2937',
    textMuted:  '#5B6573',
    surface:    '#FFFFFF',
    background: '#F4F6F8',
    border:     '#D5DCE3',
    accent:     '#0F766E',
    onAccent:   '#FFFFFF',
    focus:      '#1D4ED8',
    radius:     '8px',
    fontStack:  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  },

  motion: {
    fast:   '120ms',
    normal: '240ms'
  }
};