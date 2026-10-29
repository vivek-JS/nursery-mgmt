/** Same crop buckets as the smart-shed API. Muskmelon shares the watermelon ceiling. */
export function cropPool(name) {
  const text = String(name || "")
  const s = text.toLowerCase()
  if (/papaya|pappaya|papai/.test(s) || text.includes("पपई")) return "papaya"
  if (/musk|kharbuj/.test(s) || text.includes("खरबूज")) return "melon"
  if (/water|tarbuj/.test(s) || text.includes("टरबूज") || text.includes("टरबुज") || text.includes("कलिंगड")) {
    return "melon"
  }
  return null
}

const fold = (value) => String(value || "").toLowerCase().replace(/\s+/g, "")

export function findSmartShed(sheds, shedName) {
  const text = String(shedName || "").trim()
  if (!text) return null
  const exact = (sheds || []).find((shed) => shed?.shadeName && shed.shadeName === text)
  if (exact) return exact
  const folded = fold(text)
  const hits = (sheds || []).filter((shed) =>
    (shed?.matchLabels || []).some((label) => label && folded.includes(fold(label)))
  )
  return hits.length === 1 ? hits[0] : null
}

/** True when adding these plants would push the shared floor over 100%. */
export function shedWouldOverflow(shed, pool, addPlants) {
  const add = Math.max(0, Number(addPlants) || 0)
  if (!pool || add < 1) return false
  return shedWouldOverflowMix(shed, pool === "papaya" ? add : 0, pool === "melon" ? add : 0)
}

/** Shed after adding plants of one pool: share used, overfull, and room left as papaya OR melon. */
export function fitAfter(shed, pool, addPlants) {
  const add = Math.max(0, Math.floor(Number(addPlants) || 0))
  const papayaMax = Number(shed?.papayaMax) || 0
  const melonMax = Number(shed?.melonMax) || 0
  if (papayaMax < 1 || melonMax < 1) return null
  const papayaUsed = (Number(shed.papayaOccupied) || 0) + (pool === "papaya" ? add : 0)
  const melonUsed = (Number(shed.melonOccupied) || 0) + (pool === "melon" ? add : 0)
  const before = (Number(shed.papayaOccupied) || 0) / papayaMax + (Number(shed.melonOccupied) || 0) / melonMax
  const used = papayaUsed / papayaMax + melonUsed / melonMax
  const vacant = Math.max(0, 1 - used)
  return {
    before,
    used,
    over: used > 1,
    papayaRoom: Math.floor(vacant * papayaMax + 1e-6),
    melonRoom: Math.floor(vacant * melonMax + 1e-6),
    maxAdd: Math.floor(Math.max(0, 1 - before) * (pool === "papaya" ? papayaMax : melonMax) + 1e-6),
  }
}

export function shedWouldOverflowMix(shed, papayaAdd, melonAdd) {
  const addPapaya = Math.max(0, Number(papayaAdd) || 0)
  const addMelon = Math.max(0, Number(melonAdd) || 0)
  if (!shed || (addPapaya < 1 && addMelon < 1)) return false
  const papayaMax = Number(shed.papayaMax) || 0
  const melonMax = Number(shed.melonMax) || 0
  if (papayaMax < 1 || melonMax < 1) return false
  const papayaUsed = (Number(shed.papayaOccupied) || 0) + addPapaya
  const melonUsed = (Number(shed.melonOccupied) || 0) + addMelon
  return papayaUsed / papayaMax + melonUsed / melonMax > 1
}
