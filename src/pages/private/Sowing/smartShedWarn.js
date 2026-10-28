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
