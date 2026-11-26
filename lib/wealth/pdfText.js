// Reads the text of a PDF inside the browser. The file is never uploaded and the password is only used for this call.

const MAX_PAGES = 250

/** Groups text pieces into lines by their vertical position and keeps wide gaps as column breaks. */
export function itemsToLines(items) {
  const rows = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const x = it.transform[4], y = it.transform[5]
    let row = rows.find((r) => Math.abs(r.y - y) <= 3)
    if (!row) { row = { y, parts: [] }; rows.push(row) }
    row.parts.push({ x, w: it.width || 0, s: it.str })
  }
  rows.sort((a, b) => b.y - a.y)
  return rows.map((r) => {
    r.parts.sort((a, b) => a.x - b.x)
    let out = '', end = null
    for (const p of r.parts) {
      if (end !== null) { const gap = p.x - end; out += gap > 12 ? '   ' : gap > 1.5 ? ' ' : '' }
      out += p.s
      end = p.x + p.w
    }
    return out.trim()
  }).filter(Boolean)
}

/**
 * Returns { text } or { needPassword: true, wrongPassword: boolean }.
 * Statements from CAMS, KFintech and NSDL are normally protected by a password such as your PAN.
 */
export async function readPdfText(file, password) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  const data = new Uint8Array(await file.arrayBuffer())
  let doc
  const task = pdfjs.getDocument({ data, password: password || undefined })
  try {
    doc = await task.promise
  } catch (e) {
    if (e && e.name === 'PasswordException') return { needPassword: true, wrongPassword: e.code === 2 }
    throw e
  }
  const out = []
  const pages = Math.min(doc.numPages, MAX_PAGES)
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    out.push(...itemsToLines(content.items))
  }
  // the text is already read; letting go of the file must never fail the import (newer pdf.js keeps destroy on the loading task)
  try { await (task.destroy ? task.destroy() : doc.destroy?.()) } catch { /* nothing to release */ }
  return { text: out.join('\n') }
}
