/** Parse shed lagwad lines (batchNumber often SB-D-{shed}-{suffix}). */

export function linePlantQty(ln) {
  return Math.max(
    0,
    Number(ln?.availableQuantity) ||
      Number(ln?.remainingPlants) ||
      Number(ln?.plants) ||
      0
  )
}

/** Select value in complete form batch dropdown → free-text batch + optional shed. */
export const MANUAL_BATCH_PICK_KEY = "__manual_batch__"

export function parseLagwadBatchLine(ln) {
  const full = String(ln?.batchNumber ?? "").trim()
  const polly = String(ln?.pollyhouse ?? "").trim()
  const parts = full.split("-").filter(Boolean)

  if (parts.length >= 4 && parts[0] === "SB" && parts[1] === "D") {
    const shedFromName = parts[2]
    const suffix = parts.slice(3).join("-")
    const shed = polly || shedFromName
    const groupKey = suffix
    const groupLabel =
      suffix === "SB-OLD" || suffix === "OLD" ? "SB-OLD" : `SB-${suffix}`
    return {
      full,
      shed,
      suffix,
      groupKey,
      groupLabel,
    }
  }

  const shed = polly || "—"
  return {
    full,
    shed,
    suffix: full,
    groupKey: full,
    groupLabel: full,
  }
}

/** Level-1 options: SB-19, SB-510, … with total lagwad qty. */
export function batchPickGroupsFromLines(lines) {
  const map = new Map()
  for (const ln of lines || []) {
    const { groupKey, groupLabel } = parseLagwadBatchLine(ln)
    if (!groupKey) continue
    const cur = map.get(groupKey) || {
      groupKey,
      groupLabel,
      plants: 0,
      lines: [],
    }
    cur.plants += linePlantQty(ln)
    cur.lines.push(ln)
    map.set(groupKey, cur)
  }
  return [...map.values()].sort((a, b) => b.plants - a.plants)
}

/** Level-2 sheds for a batch pick group. */
export function shedsForBatchPickGroup(lines, groupKey) {
  const gk = String(groupKey ?? "").trim()
  const map = new Map()
  for (const ln of lines || []) {
    const parsed = parseLagwadBatchLine(ln)
    if (parsed.groupKey !== gk) continue
    const shed = String(parsed.shed || "—").trim() || "—"
    const cur = map.get(shed) || { pollyhouse: shed, plants: 0, lines: [] }
    cur.plants += linePlantQty(ln)
    cur.lines.push(ln)
    map.set(shed, cur)
  }
  return [...map.values()].sort((a, b) => b.plants - a.plants)
}

export function pickStockLineForGroupAndShed(lines, groupKey, shedValue) {
  const gk = String(groupKey ?? "").trim()
  const shed = String(shedValue ?? "").trim()
  const sheds = shedsForBatchPickGroup(lines, gk)
  if (shed) {
    const bucket = sheds.find((s) => s.pollyhouse === shed)
    if (bucket?.lines?.length) {
      return [...bucket.lines].sort((a, b) => linePlantQty(b) - linePlantQty(a))[0]
    }
  }
  if (sheds.length === 1 && sheds[0].lines?.length) {
    return [...sheds[0].lines].sort((a, b) => linePlantQty(b) - linePlantQty(a))[0]
  }
  for (const ln of lines || []) {
    if (parseLagwadBatchLine(ln).groupKey === gk) return ln
  }
  return null
}

export function batchPickGroupLabel(group, lines) {
  const qty = group?.plants ?? 0
  const label = group?.groupLabel || group?.groupKey || "—"
  if (qty > 0) return `${label} · ${qty.toLocaleString("en-IN")}`
  return label
}

export function shedPickLabel(sh) {
  const name = sh?.pollyhouse && sh.pollyhouse !== "—" ? String(sh.pollyhouse).trim() : "Shed"
  const qty = Math.max(0, Number(sh?.plants) || 0)
  if (qty > 0) return `${name} · ${qty.toLocaleString("en-IN")}`
  return name
}

/** Resolve stored UI keys to full batchNumber for API submit. */
export function resolveFullBatchNumberFromPick(lines, groupKey, shedValue) {
  const ln = pickStockLineForGroupAndShed(lines, groupKey, shedValue)
  return ln ? String(ln.batchNumber ?? "").trim() : String(groupKey ?? "").trim()
}

export function resolveBatchGroupKey(stockLines, stored) {
  const s = String(stored ?? "").trim()
  if (!s) return ""
  const groups = batchPickGroupsFromLines(stockLines || [])
  if (groups.some((g) => g.groupKey === s)) return s
  const pk = parseLagwadBatchLine({ batchNumber: s }).groupKey
  if (groups.some((g) => g.groupKey === pk)) return pk
  return s
}

function normBatchKey(v) {
  return String(v ?? "").trim().toLowerCase()
}

/**
 * Look up a typed batch/lot against lagwad lines (group key, label, or full batchNumber).
 * @returns {{ line: object, groupKey: string } | null}
 */
export function matchTypedBatchToStock(lines, typed, shedValue) {
  const t = String(typed ?? "").trim()
  if (!t) return null
  const source = lines || []
  const tNorm = normBatchKey(t)
  const groups = batchPickGroupsFromLines(source)
  const parsedKey = parseLagwadBatchLine({ batchNumber: t }).groupKey

  const group =
    groups.find((g) => normBatchKey(g.groupKey) === tNorm) ||
    groups.find((g) => normBatchKey(g.groupLabel) === tNorm) ||
    groups.find((g) => normBatchKey(g.groupKey) === normBatchKey(parsedKey))

  if (group) {
    const line = pickStockLineForGroupAndShed(source, group.groupKey, shedValue)
    return line ? { line, groupKey: group.groupKey } : null
  }

  const exact = source.find((ln) => normBatchKey(ln?.batchNumber) === tNorm)
  if (exact) {
    return { line: exact, groupKey: parseLagwadBatchLine(exact).groupKey }
  }
  return null
}
