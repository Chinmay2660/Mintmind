// Copy a secret and try to clear it again after a while. Browsers may refuse to read or write the clipboard in the
// background, so clearing is a best effort and the message says so.
export const CLIPBOARD_CLEAR_MS = 20_000

export async function copySecret(text, clearAfter = CLIPBOARD_CLEAR_MS) {
  await navigator.clipboard.writeText(text)
  setTimeout(async () => {
    try { if ((await navigator.clipboard.readText()) === text) await navigator.clipboard.writeText('') }
    catch { try { await navigator.clipboard.writeText('') } catch { /* the browser said no */ } }
  }, clearAfter)
}
