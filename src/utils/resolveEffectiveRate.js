import moment from "moment"

function parseDefaultRate(subtype) {
  if (!subtype || subtype.rate === undefined || subtype.rate === null) return 0
  return typeof subtype.rate === "number" ? subtype.rate : parseFloat(subtype.rate) || 0
}

/**
 * Resolve order rate from subtype CMS data.
 * Farmer-gives-seed (RAISING) uses raisingRate when configured; otherwise monthly/default rates apply.
 */
export function resolveEffectiveRate(subtype, { farmerGivesSeed = false, deliveryDate = null } = {}) {
  if (!subtype) return 0

  const raisingRate = parseFloat(subtype.raisingRate) || 0
  if (farmerGivesSeed && raisingRate > 0) {
    return raisingRate
  }

  const defaultRate = parseDefaultRate(subtype)

  if (deliveryDate) {
    const deliveryMonth = moment(deliveryDate).format("MMMM")
    const monthlyRates = Array.isArray(subtype.monthlyRates) ? subtype.monthlyRates : []
    if (deliveryMonth && monthlyRates.length > 0) {
      const monthEntry = monthlyRates.find((mr) => mr.month === deliveryMonth)
      if (monthEntry && monthEntry.rate) {
        return parseFloat(monthEntry.rate) || 0
      }
    }
  }

  return defaultRate
}

export function mapSubtypeOption(subtype) {
  let rate = 0
  if (subtype.rates) {
    if (Array.isArray(subtype.rates)) {
      rate = subtype.rates.length > 0 ? subtype.rates[0] : 0
    } else {
      rate = subtype.rates
    }
  } else if (subtype.rate) {
    if (Array.isArray(subtype.rate)) {
      rate = subtype.rate.length > 0 ? subtype.rate[0] : 0
    } else {
      rate = subtype.rate
    }
  }

  return {
    label: subtype.subtypeName,
    value: subtype.subtypeId,
    rate,
    raisingRate: parseFloat(subtype.raisingRate) || 0,
    monthlyRates: Array.isArray(subtype.monthlyRates) ? subtype.monthlyRates : [],
  }
}
