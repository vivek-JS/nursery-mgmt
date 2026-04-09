/**
 * Mirrors FINAL_NURSERY_BE/utility/watiPlantText.js for WhatsApp preview UI.
 */

import { formatWhatsAppPlantSubtypeLabel } from "./whatsAppPlantSubtypeLabel.js"

export const WATI_MERGED_SUBTYPE_PLACEHOLDER = "\u2014"

export function isNumberNoVarietyName(s) {
  const t = String(s ?? "").trim()
  if (!t) return false
  return /^\d+\s*no\.?$/i.test(t) || /^\d+no\.?$/i.test(t)
}

export function watiPlantAndSubtypeParams(plantNameRaw, subtypeRaw) {
  const plant = String(plantNameRaw ?? "").trim() || "Plants"
  const sub = String(subtypeRaw ?? "").trim()
  if (!sub || sub === "N/A" || sub === "Unknown") {
    return { plantParam: plant, subtypeParam: "N/A" }
  }

  if (!isNumberNoVarietyName(sub)) {
    return { plantParam: plant, subtypeParam: sub }
  }

  const plantLower = plant.toLowerCase()
  const subLower = sub.toLowerCase()
  const alreadyHasSubtype =
    plantLower.includes(subLower) || plantLower.includes(`plant no ${subLower}`)

  if (alreadyHasSubtype) {
    return { plantParam: plant, subtypeParam: WATI_MERGED_SUBTYPE_PLACEHOLDER }
  }

  /** e.g. "15 no" → "Papaya plant no 15" (never "…15 no" in customer text); aligned with WATI backend. */
  return {
    plantParam: formatWhatsAppPlantSubtypeLabel(plant, sub),
    subtypeParam: WATI_MERGED_SUBTYPE_PLACEHOLDER,
  }
}

export function isMergedSubtypePlaceholder(subtypeParam) {
  return subtypeParam === WATI_MERGED_SUBTYPE_PLACEHOLDER
}
