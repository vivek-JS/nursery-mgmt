import { useLayoutEffect, useState } from "react"

function findScrollParent(el) {
  let node = el?.parentElement
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node)
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return node
    }
    node = node.parentElement
  }
  return document.documentElement
}

function measureAvailableHeight(anchor, { minHeight, bottomGap, maxHeight }) {
  if (!anchor) return minHeight
  const scrollParent = findScrollParent(anchor)
  const anchorRect = anchor.getBoundingClientRect()

  let fill
  if (scrollParent === document.documentElement) {
    // Clamp top so page scroll cannot inflate height when the anchor moves above the viewport.
    const visibleTop = Math.max(anchorRect.top, 72)
    fill = window.innerHeight - visibleTop - bottomGap
  } else {
    const parentRect = scrollParent.getBoundingClientRect()
    const visibleTop = Math.max(anchorRect.top, parentRect.top)
    fill = parentRect.bottom - visibleTop - bottomGap
  }

  if (maxHeight != null) fill = Math.min(fill, maxHeight)
  return Math.max(minHeight, Math.floor(fill))
}

/**
 * Height from anchor top to the bottom of the nearest scroll container (or viewport).
 * Remeasures on resize/layout only — not on scroll — so virtualized lists stay a stable size.
 */
export function useFillViewportHeight(
  anchorRef,
  { minHeight = 280, bottomGap = 12, maxHeight, remeasureKey } = {}
) {
  const [height, setHeight] = useState(minHeight)

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return undefined

    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setHeight(measureAvailableHeight(anchor, { minHeight, bottomGap, maxHeight }))
      })
    }

    measure()

    const ro = new ResizeObserver(measure)
    let node = anchor.parentElement
    while (node) {
      ro.observe(node)
      node = node.parentElement
    }
    ro.observe(document.documentElement)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) measure()
      },
      { root: null, threshold: 0 }
    )
    io.observe(anchor)

    window.addEventListener("resize", measure)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [anchorRef, minHeight, bottomGap, maxHeight, remeasureKey])

  return height
}

export default useFillViewportHeight
