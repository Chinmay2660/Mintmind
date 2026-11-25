// The app icon follows the chosen look: the tab icon is the wallet mark in that look's own accent colour.
// The accent values below are the light-mode --primary of each look in app/globals.css (HSL: hue, saturation %, lightness %).
// An installed app's home-screen icon is a fixed file chosen at install time, so only the browser tab icon can follow the look.

export const LOOK_ACCENT = {
  purple: [277, 100, 50],
  clean: [155, 21, 39],
  clean2: [222, 70, 52],
  graphite: [17, 92, 39],
  mono: [0, 0, 13],
  ocean: [199, 85, 32],
  sunset: [30, 95, 33],
  rose: [340, 75, 44],
  forest: [150, 60, 26],
  retro: [84, 47, 79],
}

const hex = ([h, s, l]) => {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

const luminance = (hexColor) => {
  const c = [1, 3, 5].map((i) => parseInt(hexColor.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** { bg, ink } for a look: the accent as the background, and the darker or lighter of black and white for the mark. */
export function iconColors(look) {
  const bg = hex(LOOK_ACCENT[look] || LOOK_ACCENT.purple)
  const ink = luminance(bg) > 0.4 ? '#141613' : '#FFFFFF'
  return { bg, ink }
}

export function iconSvg(look) {
  const { bg, ink } = iconColors(look)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${bg}"/><g fill="none" stroke="${ink}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"><path d="M150 176V150a24 24 0 0 1 24-24h164a24 24 0 0 1 24 24v26"/><rect x="108" y="176" width="296" height="214" rx="44"/><rect x="296" y="244" width="108" height="78" rx="28"/><circle cx="338" cy="283" r="9" fill="${ink}" stroke="none"/></g></svg>`
}

export const iconHref = (look) => `data:image/svg+xml,${encodeURIComponent(iconSvg(look))}`

export const LOOK_EVENT = 'mm-look-change'

/**
 * Point every browser tab icon link at the look's icon. The existing links are edited in place (not replaced) so the page
 * never has a second, conflicting icon. Returns true when something had to change.
 */
export function applyIcon(look, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return false
  const href = iconHref(look)
  let links = [...doc.querySelectorAll('link[rel~="icon"]')]
  if (!links.length) {
    const l = doc.createElement('link')
    l.rel = 'icon'
    doc.head.appendChild(l)
    links = [l]
  }
  let changed = false
  for (const l of links) {
    if (l.getAttribute('href') === href) continue
    l.setAttribute('href', href)
    l.setAttribute('type', 'image/svg+xml')
    l.removeAttribute('sizes')
    changed = true
  }
  return changed
}
