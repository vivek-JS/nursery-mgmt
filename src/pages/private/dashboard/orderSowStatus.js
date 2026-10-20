export function heldPartialPlants(details) {
  const rows = Array.isArray(details?.sowingPartialCover)
    ? details.sowingPartialCover
    : details?.sowingPartialCover?.plants
      ? [details.sowingPartialCover]
      : []
  return rows.reduce((s, r) => s + (Number(r.plants) || 0), 0)
}

export function isExcessSowCover(details) {
  return (
    Array.isArray(details?.sowingCoverSources) &&
    details.sowingCoverSources.length > 0 &&
    !details?.sowingCoverReversedAt
  )
}

/** need | partial | excess | sown */
export function resolveOrderSowStatus(details) {
  const held = heldPartialPlants(details)
  const excess = isExcessSowCover(details)
  if (details?.sowingDone) {
    if (excess) {
      return {
        key: "excess",
        label: "Excess sow",
        title: "Covered from excess sowing",
        className: "bg-amber-50 text-amber-900 border border-amber-200",
      }
    }
    return {
      key: "sown",
      label: "Sowed",
      title: "Sow completed",
      className: "bg-green-50 text-green-800 border border-green-200",
    }
  }
  if (held > 0 || details?.leftoverFromIncomplete) {
    return {
      key: "partial",
      label: "Partial sow",
      title: held > 0
        ? `${held.toLocaleString("en-IN")} plants already held · leftover still needs sowing`
        : "Leftover plants after incomplete sowing — still needs a new request",
      className: "bg-yellow-50 text-yellow-900 border border-yellow-300",
      held,
      leftoverFromIncomplete: Boolean(details?.leftoverFromIncomplete),
    }
  }
  return {
    key: "need",
    label: "Need sow",
    title: "Not sown yet",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  }
}
