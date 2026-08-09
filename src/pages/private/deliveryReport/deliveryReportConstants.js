export const STEP_LABELS = [
  "Plant",
  "Subtype",
  "Date range",
  "Delivery type",
  "Status",
  "Advance orders",
]

export const COHORT_OPTIONS = [
  {
    id: "native",
    label: "Native delivery",
    hint: "मूळ delivery window — rolled नाही",
  },
  {
    id: "rolled",
    label: "Rolled in",
    hint: "Past-due slot मधून या window मध्ये आलेले",
  },
  {
    id: "deliveryChanged",
    label: "Delivery changed",
    hint: "या कालावधीत delivery date बदललेले (delivery date देखील या range मध्ये असावी)",
  },
]

export const STATUS_OPTIONS = [
  { id: "ACCEPTED", label: "Accepted" },
  { id: "FARM_READY", label: "Farm ready" },
  { id: "READY_FOR_DISPATCH", label: "Ready for dispatch" },
  { id: "DISPATCH_PROCESS", label: "Loading / In dispatch" },
]

export const YET_TO_DISPATCH_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "ASSIGNED",
  "FARM_READY",
  "READY_FOR_DISPATCH",
]

export const ADVANCE_OPTIONS = [
  { id: "collected", label: "Advance collected", hint: "Advance जमा झालेले" },
  { id: "pending", label: "Advance pending", hint: "Advance अद्याप pending" },
]

export const STATUS_COLORS = {
  ACCEPTED: { bg: "#e8f5e9", color: "#2e7d32" },
  FARM_READY: { bg: "#fff8e1", color: "#f57f17" },
  READY_FOR_DISPATCH: { bg: "#fff3e0", color: "#e65100" },
  DISPATCH_PROCESS: { bg: "#fce4ec", color: "#c2185b" },
  PENDING: { bg: "#eceff1", color: "#546e7a" },
  ASSIGNED: { bg: "#e3f2fd", color: "#1565c0" },
}

export const COHORT_COLORS = {
  native: { bg: "#e8f5e9", color: "#2e7d32" },
  rolled: { bg: "#fff3e0", color: "#e65100" },
  deliveryChanged: { bg: "#e3f2fd", color: "#1565c0" },
}

export const DEFAULT_FILTERS = {
  plantId: "",
  plantName: "",
  subtypeId: "",
  subtypeName: "",
  includePastDueBeyondRange: false,
  cohorts: ["native", "rolled"],
  statuses: ["ACCEPTED"],
  advancePayment: ["collected", "pending"],
}

export function advanceFilterSummary(advancePayment = []) {
  if (!advancePayment?.length) return ""
  const labels = ADVANCE_OPTIONS.filter((o) => advancePayment.includes(o.id)).map((o) => o.label)
  return labels.join(" + ")
}

export const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN"))

export const fmtRs = (n) => {
  if (n == null || Number.isNaN(Number(n))) return "—"
  return `₹${Number(n).toLocaleString("en-IN")}`
}

/** Resolve plant document id from slots/get-plants row (plantId | _id | id). */
export function resolvePlantRowId(plant) {
  const id = plant?.plantId ?? plant?._id ?? plant?.id
  if (id == null || id === "") return ""
  const s = String(id).trim()
  if (!s || s === "undefined" || s === "null") return ""
  return s
}

export function isValidMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim())
}
