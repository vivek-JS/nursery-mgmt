export const SLAB_CONDITIONS = [
  { value: "BELOW", label: "Below" },
  { value: "ABOVE", label: "Above" },
  { value: "BETWEEN", label: "Between" },
  { value: "AT_LEAST", label: "From (& above)" }
]

export const DEFAULT_CROPS = ["Banana", "Papaya", "Watermelon"]
export const DEFAULT_LOAD_TYPES = ["Regular", "Mini Jumbo"]

const round2 = (n) => Math.round(Number(n) * 100) / 100

export const formatRupee = (n) =>
  `₹${round2(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function slabLabel(slab) {
  if (!slab) return ""
  switch (slab.condition) {
    case "BELOW":
      return `Below ${slab.value}`
    case "ABOVE":
      return `Above ${slab.value}`
    case "BETWEEN":
      return `${slab.from} – ${slab.to}`
    case "AT_LEAST":
      return `${slab.value} & above`
    default:
      return ""
  }
}

export function slabMatches(slab, crates) {
  const c = Number(crates)
  if (!Number.isFinite(c)) return false
  switch (slab?.condition) {
    case "BELOW":
      return c < Number(slab.value)
    case "ABOVE":
      return c > Number(slab.value)
    case "BETWEEN":
      return c >= Number(slab.from) && c <= Number(slab.to)
    case "AT_LEAST":
      return c >= Number(slab.value)
    default:
      return false
  }
}

/** Lowest crate count the slab can apply to (for sorting). */
export function slabLowerBound(slab) {
  switch (slab?.condition) {
    case "BELOW":
      return -Infinity
    case "ABOVE":
      return Number(slab.value) + 0.5
    case "BETWEEN":
      return Number(slab.from)
    case "AT_LEAST":
      return Number(slab.value)
    default:
      return Infinity
  }
}

/** Highest crate count the slab can apply to (Infinity when open-ended). */
export function slabUpperBound(slab) {
  switch (slab?.condition) {
    case "BELOW":
      return Number(slab.value) - 0.5
    case "BETWEEN":
      return Number(slab.to)
    case "ABOVE":
    case "AT_LEAST":
      return Infinity
    default:
      return -Infinity
  }
}

export const sortSlabs = (slabs) =>
  [...(slabs || [])].sort((a, b) => slabLowerBound(a) - slabLowerBound(b))

const sameCrop = (a, b) =>
  String(a || "")
    .trim()
    .toLowerCase() ===
  String(b || "")
    .trim()
    .toLowerCase()

/** Crops used on a card, default crops first, then any custom ones in order of appearance. */
export function cropsOfCard(card) {
  const seen = []
  for (const lt of card?.loadTypes || []) {
    for (const s of lt.slabs || []) {
      if (s?.crop && !seen.some((c) => sameCrop(c, s.crop))) seen.push(String(s.crop).trim())
    }
  }
  const defaults = DEFAULT_CROPS.filter((c) => seen.some((s) => sameCrop(s, c)))
  return [...defaults, ...seen.filter((s) => !DEFAULT_CROPS.some((c) => sameCrop(c, s)))]
}

export const slabsForCrop = (loadType, crop) =>
  sortSlabs((loadType?.slabs || []).filter((s) => sameCrop(s.crop, crop)))

/**
 * Freight quote for one trip.
 * - localMarket: plants × local market rate per plant
 * - km below card.shortTripMaxKm: flat short-trip rate per km
 * - otherwise the crate slab for load type + crop; when crates fall between two slabs the lower slab is used
 */
export function quoteFreight(card, { loadTypeName, crop, crates, km, localMarket = false, plants } = {}) {
  if (!card) return { ok: false, message: "Select a vehicle" }
  const kmNum = Number(km)
  const hasKm = Number.isFinite(kmNum) && kmNum > 0

  if (localMarket) {
    const ratePerPlant = Number(card.localMarketRatePerPlant) || 0
    const p = Number(plants)
    const hasPlants = Number.isFinite(p) && p > 0
    return {
      ok: true,
      mode: "LOCAL_MARKET",
      ratePerPlant,
      amount: hasPlants ? round2(p * ratePerPlant) : null,
      message: hasPlants
        ? `${p.toLocaleString("en-IN")} plants × ${formatRupee(ratePerPlant)}`
        : "Enter number of plants"
    }
  }

  const shortKm = card.shortTripMaxKm
  if (shortKm != null && card.shortTripRatePerKm != null && hasKm && kmNum < Number(shortKm)) {
    const ratePerKm = Number(card.shortTripRatePerKm)
    return {
      ok: true,
      mode: "SHORT_TRIP",
      ratePerKm,
      amount: round2(kmNum * ratePerKm),
      message: `Below ${shortKm} km — flat ${formatRupee(ratePerKm)}/km`
    }
  }

  const loadType = (card.loadTypes || []).find((l) => sameCrop(l.name, loadTypeName))
  if (!loadType) return { ok: false, message: "Select a load type" }
  if (!crop) return { ok: false, message: "Select a crop" }
  const slabs = slabsForCrop(loadType, crop)
  if (!slabs.length) return { ok: false, message: `No ${crop} rates in ${loadType.name}` }

  const c = Number(crates)
  if (!Number.isFinite(c) || c <= 0) return { ok: false, message: "Enter number of crates" }

  let slab = slabs.find((s) => slabMatches(s, c))
  let inGap = false
  if (!slab) {
    const lower = slabs.filter((s) => slabUpperBound(s) < c)
    if (!lower.length) {
      return { ok: false, message: `No rate for ${c} crates (rates start at ${slabLabel(slabs[0])})` }
    }
    slab = lower.reduce((best, s) => (slabUpperBound(s) > slabUpperBound(best) ? s : best))
    inGap = true
  }
  const ratePerKm = Number(slab.ratePerKm)
  return {
    ok: true,
    mode: "SLAB",
    slab,
    inGap,
    ratePerKm,
    amount: hasKm ? round2(kmNum * ratePerKm) : null,
    message: inGap
      ? `${c} crates is between slabs — using lower slab (${slabLabel(slab)})`
      : `${slabLabel(slab)} crates`
  }
}

export const emptySlab = (crop = "Banana") => ({
  crop,
  condition: "BELOW",
  value: "",
  from: "",
  to: "",
  ratePerKm: ""
})

export const emptyCard = () => ({
  name: "",
  code: "",
  sortOrder: 0,
  isActive: true,
  localMarketRatePerPlant: 0.5,
  shortTripMaxKm: "",
  shortTripRatePerKm: "",
  notes: "",
  loadTypes: [
    { name: "Regular", slabs: [emptySlab()] },
    { name: "Mini Jumbo", slabs: [] }
  ]
})
