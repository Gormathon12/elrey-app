import { useEffect, useRef, useState } from 'react'

/**
 * Hook que anima un número desde 0 hasta `value` con easing easeOut.
 * @param {number} value  Valor final
 * @param {number} duration  Duración en ms (default 1200)
 */
export function useAnimatedNumber(value, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef(null)
  const frameRef = useRef(null)
  const fromRef  = useRef(0)

  useEffect(() => {
    if (value === undefined || value === null) return

    fromRef.current = display
    startRef.current = null

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // easeOut cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(fromRef.current + (value - fromRef.current) * eased)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(value)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return display
}
