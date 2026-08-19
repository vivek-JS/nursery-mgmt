import { useEffect, useRef, useState } from "react"

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Animates a metric tile from its previous value to the next one over `duration` ms. */
export const useCountUp = (target, duration = 300) => {
  const value = Number(target) || 0
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const frameRef = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0) {
      fromRef.current = value
      setDisplay(value)
      return undefined
    }

    const from = fromRef.current
    if (from === value) return undefined

    const start = performance.now()
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = value
      }
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      fromRef.current = value
    }
  }, [value, duration])

  return display
}

export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    if (typeof window?.matchMedia !== "function") return undefined
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = (e) => setReduced(e.matches)
    query.addEventListener?.("change", onChange)
    return () => query.removeEventListener?.("change", onChange)
  }, [])

  return reduced
}

export default useCountUp
