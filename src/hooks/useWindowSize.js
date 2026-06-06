import { useState, useEffect } from 'react'

export function useWindowSize() {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth
    return 1024
  })

  useEffect(() => {
    function handler() { setWidth(window.innerWidth) }
    // Fire immediately to sync
    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return { width, isMobile: width < 768, isTablet: width < 1024 }
}
