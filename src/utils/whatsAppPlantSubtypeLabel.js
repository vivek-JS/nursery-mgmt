/**
 * Same rules as FINAL_NURSERY_BE/utils/whatsAppPlantSubtypeLabel.js (keep in sync).
 */
export function formatWhatsAppPlantSubtypeLabel(plantTypeName, rawSubtype) {
  const raw = String(rawSubtype ?? "").trim();
  if (!raw || raw === "N/A") return raw || "N/A";

  const plant = String(plantTypeName ?? "").trim() || "Papaya";

  // Already fully formatted (e.g. "Papaya plant no 15")
  if (/plant\s+no\s+\d+/i.test(raw)) return raw;

  const compact = raw.replace(/\s+/g, " ").trim();
  // "15 no" or "15 no." → "<Plant> plant no 15"
  let m = compact.match(/^(\d+)\s*no\.?$/i);
  if (m) return `${plant} plant no ${m[1]}`;
  // "no 15" or "no. 15" → "<Plant> plant no 15"
  m = compact.match(/^no\.?\s*(\d+)$/i);
  if (m) return `${plant} plant no ${m[1]}`;
  return raw;
}
