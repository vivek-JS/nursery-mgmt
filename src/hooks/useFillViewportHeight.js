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

function measureAvailableHeight(anchor, { minHeight, bottomGap }) {
  if (!anchor) return minHeight
  const scrollParent = findScrollParent(anchor)
  const anchorTop = anchor.getBoundingClientRect().top
  const bottom =
    scrollParent === document.documentElement
      ? window.innerHeight
      : scrollParent.getBoundingClientRect().bottom
  return Math.max(minHeight, Math.floor(bottom - anchorTop - bottomGap))
}

/**
 * Height from anchor top to the bottom of the nearest scroll container (or viewport).
 * Keeps virtualized tables/lists filling visible space without double page scroll.
 */
export function useFillViewportHeight(
  anchorRef,
  { minHeight = 280, bottomGap = 12, remeasureKey } = {}
) {
  const [height, setHeight] = useState(minHeight)

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return undefined

    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setHeight(measureAvailableHeight(anchor, { minHeight, bottomGap }))
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

    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [anchorRef, minHeight, bottomGap, remeasureKey])

  return height
}

export default useFillViewportHeight
