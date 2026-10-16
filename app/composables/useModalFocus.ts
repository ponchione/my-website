import type { Ref } from 'vue'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// A modal pop-up takes the focus when it opens and keeps Tab and Shift+Tab cycling
// through its own controls, so they never wander off to the map behind it. Whatever
// had the focus before gets it back when the pop-up closes.
export function useModalFocus(frame: Readonly<Ref<HTMLElement | null>>) {
  let opener: Element | null = null

  function holdFocus(event: KeyboardEvent) {
    const element = frame.value
    if (event.key !== 'Tab' || !element) return
    const controls = [...element.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = controls[0]
    const last = controls[controls.length - 1]
    const active = document.activeElement
    const inside = active instanceof Node && element.contains(active)
    if (!first || !last) {
      event.preventDefault()
      element.focus({ preventScroll: true })
    }
    else if (event.shiftKey ? !inside || active === first || active === element : !inside || active === last) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
  }

  onMounted(() => {
    opener = document.activeElement
    // Somewhere for the keyboard to start; a pop-up may then focus a control of its own.
    frame.value?.focus({ preventScroll: true })
    document.addEventListener('keydown', holdFocus)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', holdFocus)
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
  })
}
