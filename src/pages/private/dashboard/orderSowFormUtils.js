import {
  todayYmd,
  addDaysToYmd,
  daysBetweenYmd,
  ymdToDdMm,
  calcDefaultPacketsUsed,
} from "../Sowing/admin-direct-sow/directSowUtils"

export { todayYmd, addDaysToYmd, daysBetweenYmd, ymdToDdMm, calcDefaultPacketsUsed }

export function parseSeedPlan(sowingPlan) {
  const company = Number(sowingPlan?.companySeedPackets) || 0
  const raising = Number(sowingPlan?.raisingSeedPackets) || 0
  let seedSource = String(sowingPlan?.seedSource || "").toUpperCase()
  if (!seedSource) {
    if (raising > 0 && company > 0) seedSource = "MIXED"
    else if (raising > 0) seedSource = "RAISING"
    else seedSource = "COMPANY"
  }
  const snap = sowingPlan?.raisingIntake || {}
  const raisingCollected =
    Boolean(sowingPlan?.raisingIntakeCollected) ||
    Boolean(sowingPlan?.raisingIntakeId) ||
    Boolean(snap?.intakeNumber)
  const raisingRemaining =
    Number(snap?.packetsRemaining) ||
    Number(snap?.packetsReceived) ||
    0
  return {
    seedSource,
    companyPackets: company,
    raisingPackets: raising,
    hasCompany: seedSource === "COMPANY" || seedSource === "MIXED" || company > 0,
    hasRaising: seedSource === "RAISING" || seedSource === "MIXED" || raising > 0,
    raisingCollected,
    raisingRemaining,
    defaultBatchNumber: String(snap?.batchNumber || "").trim(),
    intakeNumber: snap?.intakeNumber || "",
  }
}

export function buildPacketDefaults(sowingPlan, plants, conversionFactor) {
  const plan = parseSeedPlan(sowingPlan)
  let companyDefault = plan.companyPackets > 0 ? String(plan.companyPackets) : ""
  let raisingDefault = plan.raisingPackets > 0 ? String(plan.raisingPackets) : ""

  if (!companyDefault && !raisingDefault) {
    const calc = calcDefaultPacketsUsed(plants, conversionFactor)
    if (plan.hasRaising && !plan.hasCompany) raisingDefault = calc
    else if (plan.hasCompany) companyDefault = calc
    else if (calc) companyDefault = calc
  }

  return {
    ...plan,
    companyDefault,
    raisingDefault,
    totalDefault: String(
      (Number(companyDefault) || 0) + (Number(raisingDefault) || 0)
    ),
  }
}

export function findSubtypeMeta(plants = [], plantId, subtypeId) {
  if (!plantId) return { plantReadyDays: 0, conversionFactor: 1 }
  const plant = plants.find((p) => String(p._id) === String(plantId))
  const subtype = (plant?.subtypes || []).find(
    (st) => String(st._id) === String(subtypeId)
  )
  return {
    plantReadyDays: Math.max(0, Number(subtype?.plantReadyDays) || 0),
    conversionFactor: 1,
  }
}

export function totalPacketsUsed(companyVal, raisingVal) {
  return Math.max(0, Number(companyVal) || 0) + Math.max(0, Number(raisingVal) || 0)
}
