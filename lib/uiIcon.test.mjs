import test from 'node:test'
import assert from 'node:assert/strict'
import { LOOK_ACCENT, iconColors, iconSvg, iconHref } from './uiIcon.js'
import { UI_STYLES } from './uiStyle.js'

test('every look has an icon colour, and unknown looks fall back to Violet', () => {
  for (const s of UI_STYLES) assert.ok(LOOK_ACCENT[s.value], `accent for ${s.value}`)
  assert.deepEqual(iconColors('nope'), iconColors('purple'))
})

test('looks get different icons, with a readable mark on each', () => {
  const bgs = new Set(UI_STYLES.map((s) => iconColors(s.value).bg))
  assert.equal(bgs.size, UI_STYLES.length)
  assert.equal(iconColors('purple').bg, '#9D00FF')
  assert.equal(iconColors('retro').ink, '#141613') // light sage gets the dark mark
  assert.equal(iconColors('mono').ink, '#FFFFFF') // near-black gets the white mark
})

test('the icon is a valid svg data address that carries the look colour', () => {
  const svg = iconSvg('ocean')
  assert.ok(svg.startsWith('<svg') && svg.includes(iconColors('ocean').bg))
  assert.ok(iconHref('ocean').startsWith('data:image/svg+xml,%3Csvg'))
})
