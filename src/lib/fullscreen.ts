interface FsElement extends HTMLElement {
  webkitRequestFullscreen?: () => void
}

/** Toggle fullscreen on an element; returns false if unsupported. */
export function toggleFullscreen(el: HTMLElement | null): boolean {
  if (!el) return false
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return true
    }
    const fe = el as FsElement
    const req = fe.requestFullscreen || fe.webkitRequestFullscreen
    if (req) {
      req.call(el)
      return true
    }
    return false
  } catch {
    return false
  }
}

export function exitFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen()
  } catch {
    /* ignore */
  }
}
