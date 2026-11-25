/** The looks (labels shown in Settings; the stored values stay retro, clean, clean2, graphite, mono, purple so saved choices keep working). Violet (purple) is the default: it uses the normal 16px sans-serif body and passes AA contrast. Paper is a denser 13px monospace look and stays one tap away in Settings. */
export const UI_STYLE_KEY = 'mm-ui-style'
export const UI_STYLES = [
  { value: 'retro', label: 'Paper', note: 'Warm paper colours, small monospace text (denser)' },
  { value: 'clean', label: 'Sage', note: 'Light and calm, soft green, easy-to-read font' },
  { value: 'clean2', label: 'Lavender', note: 'Light and calm, lavender and blue' },
  { value: 'graphite', label: 'Ember', note: 'Charcoal greys with an orange accent' },
  { value: 'mono', label: 'Ink', note: 'Black, white and grey' },
  { value: 'purple', label: 'Violet', note: 'The default: purple accent on cool grey, regular-size text' },
  { value: 'ocean', label: 'Ocean', note: 'Cool blue and teal' },
  { value: 'sunset', label: 'Sunset', note: 'Warm amber and sand' },
  { value: 'rose', label: 'Rose', note: 'Soft rose and blush' },
  { value: 'forest', label: 'Forest', note: 'Deep green on warm stone' },
]

export const normaliseStyle = (v) => (UI_STYLES.some((o) => o.value === v) ? v : 'purple')

/** The attributes the page root carries for a look: Paper (retro) sets both, Sage (clean) sets none, every other look sets data-style only (the page itself starts as Violet). */
export const attrsFor = (style) => {
  const s = normaliseStyle(style)
  if (s === 'retro') return { 'data-style': 'paper', 'data-retro': 'true' }
  if (s === 'clean') return {}
  return { 'data-style': s }
}

/** Runs before the page paints, so the chosen look never flashes. The page starts as Violet (the default); anyone who chose another look has it applied here. Kept as a string for the head. */
export const BOOT_SCRIPT = `try{var v=localStorage.getItem('${UI_STYLE_KEY}'),r=document.documentElement,o=${JSON.stringify(UI_STYLES.map((x) => x.value).filter((x) => !['retro', 'clean', 'purple'].includes(x)))};if(v==='retro'){r.setAttribute('data-style','paper');r.setAttribute('data-retro','true')}else if(v==='clean'){r.removeAttribute('data-style')}else if(o.indexOf(v)>-1){r.setAttribute('data-style',v)}}catch(e){}`

export function applyStyle(style, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return
  const a = attrsFor(style)
  for (const k of ['data-style', 'data-retro']) { if (a[k]) root.setAttribute(k, a[k]); else root.removeAttribute(k) }
  try { localStorage.setItem(UI_STYLE_KEY, normaliseStyle(style)) } catch { /* private window: it still applies for this visit */ }
  // the tab icon follows the look (see lib/uiIcon.js)
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mm-look-change', { detail: normaliseStyle(style) })) } catch { /* no window */ }
}
