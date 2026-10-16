// Letters (`/blog/<slug>`) and the letter case (`/blog`) are routes nested in the map
// page, so they open over the map without unloading it, can be linked to, and close
// with Back. They behave like a stack: opening one pushes it, paging between them swaps
// in place, and closing steps back to wherever in the realm the visitor came from.

type RealmBack = '/' | '/blog' | null

// The map or the letter case, when the previous history entry is one of them. Null for
// a visitor who arrived on this page from elsewhere.
function realmBack(): RealmBack {
  const back = window.history.state?.back
  return back === '/' || back === '/blog' ? back : null
}

export function useLetterRoutes() {
  const router = useRouter()
  // Read once the page is in the browser; the server can't know.
  const cameFrom = ref<RealmBack>(null)
  onMounted(() => {
    cameFrom.value = realmBack()
  })

  return {
    cameFrom,
    open: (path: string) => router.push(path),
    swap: (path: string) => router.replace(path),
    // Someone who landed on a letter from a shared link goes on to the map.
    close: () => (realmBack() ? router.back() : router.push('/')),
  }
}

const SEAL_BREAK_MS = 480

// A sealed letter's seal cracks before it opens, long enough to see it go. Clicks meant
// for a new tab or window are left to the browser, since every letter is a real link.
export function useSealBreak(open: (path: string) => void) {
  const breaking = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  function breakSeal(event: MouseEvent, path: string, sealed = true) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (breaking.value) return
    if (!sealed || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      open(path)
      return
    }
    breaking.value = path
    timer = setTimeout(() => open(path), SEAL_BREAK_MS)
  }

  onBeforeUnmount(() => clearTimeout(timer))
  return { breaking, breakSeal }
}
