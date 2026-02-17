import React from 'react'
import useIdleTimer from '../hooks/useIdleTimer'
import { logoutAndReload } from '../utils/auth'

export default function IdleManager({ timeoutMs }) {
  useIdleTimer(() => {
    // on timeout: clear session and reload to landing/login
    try { console.debug('[IdleManager] idle hook fired, logging out') } catch  {}
    logoutAndReload()
  }, timeoutMs)

  // Fallback poll: check last-activity timestamp periodically in case
  // activity events are suppressed and the hook's timer didn't fire.
  React.useEffect(() => {
    const checkInterval = Math.min(5000, Math.max(1000, Math.floor(timeoutMs / 10)))
    const id = setInterval(() => {
      try {
        const raw = window.__idle_last || sessionStorage.getItem('__idle_last')
        if (!raw) return
        const last = Number(raw)
        if (Number.isNaN(last)) return
        const elapsed = Date.now() - last
        if (elapsed >= timeoutMs) {
          try { console.debug('[IdleManager] fallback poll detected inactivity, logging out') } catch {}
          clearInterval(id)
          logoutAndReload()
        }
      } catch {
        // ignore
      }
    }, checkInterval)

    return () => clearInterval(id)
  }, [timeoutMs])

  return null
}
