import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Reset the app scroll container on every route change. */
export function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('.app-main')
    if (main) {
      main.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}
