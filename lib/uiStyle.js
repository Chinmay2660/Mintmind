/** The two looks. Retro is the default; Clean is the plain base style with a regular sans font and cool colours. */
export const UI_STYLE_KEY = 'mm-ui-style'
export const UI_STYLES = [
  { value: 'retro', label: 'Retro', note: 'Warm paper colours and a monospace font' },
  { value: 'clean', label: 'Clean', note: 'Plain white and grey with a regular font' },
]

export const normaliseStyle = (v) => (v === 'clean' ? 'clean' : 'retro')

/** The attributes the page root carries for a style: Retro sets both, Clean sets neither. */
export const attrsFor = (style) => (normaliseStyle(style) === 'retro' ? { 'data-style': 'paper', 'data-retro': 'true' } : {})

/** Runs before the page paints, so the chosen look never flashes. Kept as a string for the head. */
export const BOOT_SCRIPT = `try{if(localStorage.getItem('${UI_STYLE_KEY}')==='clean'){var r=document.documentElement;r.removeAttribute('data-style');r.removeAttribute('data-retro')}}catch(e){}`

export function applyStyle(style, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return
  const a = attrsFor(style)
  for (const k of ['data-style', 'data-retro']) { if (a[k]) root.setAttribute(k, a[k]); else root.removeAttribute(k) }
  try { localStorage.setItem(UI_STYLE_KEY, normaliseStyle(style)) } catch { /* private window: it still applies for this visit */ }
}
