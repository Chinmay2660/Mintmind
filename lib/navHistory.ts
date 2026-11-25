// How many pages the person has opened inside the app in this tab, so a "back" link can go to where they came from
// (the Overview, Wealth, a search result...) when there is such a place, and to the list page when they landed here directly.
let pages = 0
let last = ''
export function notePage(path: string) { if (path !== last) { last = path; pages += 1 } }
export const canGoBackInApp = () => pages > 1

// A dialog closing itself through the history (see useBackToClose) also makes a "pop" the open-record handler would otherwise read as Back.
let dialogPopAt = 0
export const markDialogPop = () => { dialogPopAt = Date.now() }
export const dialogJustPopped = () => Date.now() - dialogPopAt < 400

// History entries that the app adds for open records and dialogs are taken off again with history.back() when they close from the screen.
// That back() raises a popstate of its own, which every listener must ignore. The event object is remembered so each listener gets the same answer.
let selfPops = 0
let lastEvt: Event | null = null
let lastWasSelf = false
export const expectSelfPop = () => { selfPops += 1 }
export function isSelfPop(e: Event) {
  if (e !== lastEvt) { lastEvt = e; lastWasSelf = selfPops > 0; if (lastWasSelf) selfPops -= 1 }
  return lastWasSelf
}

// One listener, always present, looks at every pop first, so a pop the app caused is counted even when the hook that caused it has already gone.
if (typeof window !== 'undefined') window.addEventListener('popstate', (e) => { isSelfPop(e) }, true)
