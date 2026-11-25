import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { UI_STYLES } from './uiStyle.js'

// Guards the accent colour used for text and icons (the Tailwind text-primary class) in every look, light and dark:
// at least 4.5 : 1 (WCAG AA for normal text) against the page and card surfaces. Values come straight from app/globals.css.
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const rgb = (h, s, l) => {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}
const lum = (c) => { const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)

function block(open) {
  const i = css.indexOf(open)
  assert.ok(i >= 0, `block ${open}`)
  return css.slice(i, css.indexOf('\n  }', i))
}
function token(blk, name) {
  const m = blk.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`))
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

// where each look defines its tokens (the default Sage look lives in :root and .dark)
const LIGHT = { clean: '  :root {', purple: "  [data-style='purple'] {", graphite: "  [data-style='graphite'] {", mono: "  [data-style='mono'] {", ocean: "  [data-style='ocean'] {", sunset: "  [data-style='sunset'] {", rose: "  [data-style='rose'] {", forest: "  [data-style='forest'] {", clean2: "  [data-style='clean2'] {", retro: "  [data-style='paper']:not(.dark) {" }
const DARK = { clean: '  .dark {', purple: "  [data-style='purple'].dark {", graphite: "  [data-style='graphite'].dark {", mono: "  [data-style='mono'].dark {", ocean: "  [data-style='ocean'].dark {", sunset: "  [data-style='sunset'].dark {", rose: "  [data-style='rose'].dark {", forest: "  [data-style='forest'].dark {", clean2: "  [data-style='clean2'].dark {", retro: "  [data-style='paper'].dark {" }
// looks whose text-primary colour is overridden in the CSS, with the value the override uses
const TEXT_OVERRIDE = { 'retro:light': [134, 49, 28], 'retro:dark': [114, 38, 62], 'purple:dark': [277, 100, 76] }

test('every look is covered', () => {
  for (const s of UI_STYLES) { assert.ok(LIGHT[s.value], `light ${s.value}`); assert.ok(DARK[s.value], `dark ${s.value}`) }
})

for (const mode of ['light', 'dark']) {
  for (const s of UI_STYLES) {
    test(`${s.label} (${mode}): accent text is readable on the page and on cards`, () => {
      const blk = block((mode === 'light' ? LIGHT : DARK)[s.value])
      const bg = token(blk, 'background') || (mode === 'light' && s.value === 'purple' ? null : null)
      const card = token(blk, 'card') || bg
      const accent = TEXT_OVERRIDE[`${s.value}:${mode}`] || token(blk, 'primary')
      assert.ok(accent, 'accent token')
      // looks that only change some tokens inherit the rest from the default Sage look
      const base = block(mode === 'light' ? LIGHT.clean : DARK.clean)
      const pageBg = bg || token(base, 'background')
      const cardBg = card || token(base, 'card') || pageBg
      assert.ok(pageBg, 'background token')
      for (const [name, surface] of [['page', pageBg], ['card', cardBg]]) {
        const r = ratio(rgb(...accent), rgb(...surface))
        assert.ok(r >= 4.5, `${s.label} ${mode}: accent on ${name} is ${r.toFixed(2)} : 1`)
      }
    })
  }
}
