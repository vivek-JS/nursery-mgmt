import {
  getTotalCapacity,
  getBookedPlants,
  getAvailablePlants,
  getSellableCapacity,
  getEffectiveBufferPct,
  getDisplayBufferAmount,
  getReleasableBuffer,
  getInheritedBufferReserve,
  hasInheritedBufferOnly,
  isSlotBufferMaterialized,
} from "./slotMetrics"

/** Buffer UX states for slot cards & modals */
export const BUFFER_UI_STATES = {
  RELEASABLE: "releasable",
  INHERITED: "inherited",
  CLEARED: "cleared",
  RESERVED: "reserved",
  NONE: "none",
}

export const getBufferUiState = (slot) => {
  if (!slot) return BUFFER_UI_STATES.NONE
  if (getReleasableBuffer(slot) > 0) return BUFFER_UI_STATES.RELEASABLE
  if (hasInheritedBufferOnly(slot)) return BUFFER_UI_STATES.INHERITED
  if (isSlotBufferMaterialized(slot)) return BUFFER_UI_STATES.CLEARED
  if (getDisplayBufferAmount(slot) > 0) return BUFFER_UI_STATES.RESERVED
  return BUFFER_UI_STATES.NONE
}

const STATE_STYLES = {
  [BUFFER_UI_STATES.RELEASABLE]: {
    shell: "from-violet-500/10 via-purple-50 to-fuchsia-50 border-violet-200",
    badge: "bg-violet-600 text-white",
    badgeLabel: "Ready to release",
    number: "text-violet-900",
    accent: "text-violet-600",
    bar: "bg-violet-500",
  },
  [BUFFER_UI_STATES.INHERITED]: {
    shell: "from-amber-500/10 via-amber-50 to-orange-50 border-amber-200",
    badge: "bg-amber-500 text-white",
    badgeLabel: "Inherited reserve",
    number: "text-amber-900",
    accent: "text-amber-700",
    bar: "bg-amber-400",
  },
  [BUFFER_UI_STATES.CLEARED]: {
    shell: "from-slate-100 to-white border-slate-200",
    badge: "bg-slate-500 text-white",
    badgeLabel: "All released",
    number: "text-slate-700",
    accent: "text-slate-500",
    bar: "bg-slate-300",
  },
  [BUFFER_UI_STATES.RESERVED]: {
    shell: "from-purple-50 to-white border-purple-200",
    badge: "bg-purple-600 text-white",
    badgeLabel: "Reserved",
    number: "text-purple-900",
    accent: "text-purple-600",
    bar: "bg-purple-500",
  },
  [BUFFER_UI_STATES.NONE]: {
    shell: "from-gray-50 to-white border-gray-200",
    badge: "bg-gray-400 text-white",
    badgeLabel: "No buffer",
    number: "text-gray-700",
    accent: "text-gray-500",
    bar: "bg-gray-300",
  },
}

export const getBufferStatusMeta = (slot) => {
  const state = getBufferUiState(slot)
  const styles = STATE_STYLES[state] || STATE_STYLES[BUFFER_UI_STATES.NONE]
  const total = getTotalCapacity(slot)
  const booked = getBookedPlants(slot)
  const available = getAvailablePlants(slot)
  const sellable = getSellableCapacity(slot)
  const pct = getEffectiveBufferPct(slot)
  const display = getDisplayBufferAmount(slot)
  const releasable = getReleasableBuffer(slot)
  const inherited = getInheritedBufferReserve(slot)

  const bufferBarPct =
    total > 0 ? Math.min(100, Math.round(((state === BUFFER_UI_STATES.INHERITED ? inherited : display) / total) * 100)) : 0

  let headline = "No buffer set"
  let subline = "This slot has no safety reserve"
  let primaryAction = null
  let secondaryAction = null

  switch (state) {
    case BUFFER_UI_STATES.RELEASABLE:
      headline = `${releasable.toLocaleString()} plants in reserve`
      subline = `${pct}% of ${total.toLocaleString()} capacity · tap Release to add to available`
      primaryAction = { id: "release", label: "Release to available" }
      secondaryAction = { id: "edit", label: "Adjust %" }
      break
    case BUFFER_UI_STATES.INHERITED:
      headline = `${inherited.toLocaleString()} plants suggested reserve`
      subline = `${pct}% inherited from plant settings · not locked on this slot yet`
      primaryAction = { id: "apply", label: "Apply to this slot" }
      secondaryAction = { id: "edit", label: "Change %" }
      break
    case BUFFER_UI_STATES.CLEARED:
      headline = "Reserve fully released"
      subline = `Available ${available.toLocaleString()} · ${booked.toLocaleString()} booked`
      primaryAction = { id: "edit", label: "Set buffer again" }
      break
    case BUFFER_UI_STATES.RESERVED:
      headline = `${display.toLocaleString()} plants reserved`
      subline = `${pct}% buffer on ${total.toLocaleString()} capacity`
      primaryAction = { id: "edit", label: "Adjust %" }
      break
    default:
      primaryAction = { id: "edit", label: "Add buffer %" }
      break
  }

  return {
    state,
    styles,
    total,
    booked,
    available,
    sellable,
    pct,
    display,
    releasable,
    inherited,
    bufferBarPct,
    headline,
    subline,
    primaryAction,
    secondaryAction,
    showActions: Boolean(primaryAction || secondaryAction),
  }
}
