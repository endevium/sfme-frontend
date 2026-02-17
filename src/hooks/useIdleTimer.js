import { useEffect, useRef } from 'react'

// Default timeout: 10 minutes (in milliseconds).
// Change this only for global default behavior; pass `timeout` param to
// `useIdleTimer` to override per-instance (e.g. for testing).
const DEFAULT_TIMEOUT = 10 * 60 * 1000 // 10 minutes

export default function useIdleTimer(onTimeout, timeout = DEFAULT_TIMEOUT) {
  const timerRef = useRef(null)
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      // Debug: log when timer is (re)started
      try { console.debug('[useIdleTimer] reset timer, firing in', timeout, 'ms') } catch {}
      // record last activity timestamp (use window global and sessionStorage as fallback)
      try {
        const t = Date.now()
        try { window.__idle_last = t } catch (e) {}
        try { sessionStorage.setItem('__idle_last', String(t)) } catch (e) {}
      } catch (e) {}
      timerRef.current = setTimeout(() => {
        try { console.debug('[useIdleTimer] timeout fired') } catch {}
        onTimeout()
      }, timeout)
    }

    // start timer immediately
    resetTimer()

    events.forEach((e) => window.addEventListener(e, resetTimer, true))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer, true))
    }
  }, [onTimeout, timeout])
}
