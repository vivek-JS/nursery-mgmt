import * as XLSX from "xlsx"
import moment from "moment"
import { advanceFilterSummary } from "./deliveryReportConstants"
import { downloadCsv } from "../adminStats/misExportUtils"

export const EXPORT_COLUMNS = [
  { key: "orderId", label: "Order ID" },
  { key: "farmerName", label: "Farmer" },
  { key: "farmerMobile", label: "Mobile" },
  { key: "farmerVillage", label: "Village" },
  { key: "farmerTaluka", label: "Taluka" },
  { key: "farmerDistrict", label: "District" },
  { key: "plantTypeName", label: "Plant" },
  { key: "plantSubtypeName", label: "Subtype" },
  { key: "plants", label: "Plants" },
  { key: "rate", label: "Rate" },
  { key: "amount", label: "Amount" },
  { key: "deliveryDate", label: "Delivery Date" },
  { key: "orderStatus", label: "Status" },
  { key: "advanceCollected", label: "Advance Collected" },
  { key: "advancePending", label: "Advance Pending" },
  { key: "cohortTags", label: "Delivery Type" },
]

function formatDate(val) {
  if (!val) return ""
  if (val?.format && typeof val.format === "function") {
    return val.format("DD-MM-YYYY")
  }
  const d = moment(val)
  return d.isValid() ? d.utcOffset(330).format("DD-MM-YYYY") : ""
}

function cohortLabel(id) {
  if (id === "native") return "Native"
  if (id === "rolled") return "Rolled"
  if (id === "deliveryChanged") return "Changed"
  return id
}

export function mapOrderExportRow(o) {
  const plants = o.plants ?? o.linePlantTotal ?? o.numberOfPlants ?? 0
  const rate = Number(o.rate) || 0
  const amount = o.amount ?? plants * rate
  return {
    orderId: o.orderId ?? "",
    farmerName: o.farmerName || o.orderFor?.name || "",
    farmerMobile: o.farmerMobile ?? "",
    farmerVillage: o.farmerVillage ?? "",
    farmerTaluka: o.farmerTaluka ?? "",
    farmerDistrict: o.farmerDistrict ?? "",
    plantTypeName: o.plantTypeName ?? "",
    plantSubtypeName: o.plantSubtypeName ?? "",
    plants,
    rate,
    amount,
    deliveryDate: formatDate(o.deliveryDate),
    orderStatus: o.orderStatus ?? "",
    advanceCollected: Number(o.advanceCollected) || 0,
    advancePending: Number(o.advancePending) || 0,
    cohortTags: (o.cohortTags || []).map(cohortLabel).join(", "),
  }
}

function escapeCsvCell(val) {
  const s = val === undefined || val === null ? "" : String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function ordersToCsvLines(orders) {
  const header = EXPORT_COLUMNS.map((c) => c.label)
  const rows = (orders || []).map((o) => {
    const row = mapOrderExportRow(o)
    return EXPORT_COLUMNS.map((c) => escapeCsvCell(row[c.key]))
  })
  return [header, ...rows]
}

export function downloadDeliveryReportCsv({ filters, orders }) {
  const plant = (filters.plantName || "plant").replace(/\s+/g, "-")
  const stamp = moment().format("YYYY-MM-DD")
  downloadCsv(`delivery-report-${plant}-${stamp}.csv`, ordersToCsvLines(orders))
}

function buildSummarySheet(filters, summary, orderCount) {
  const lines = [
    ["Delivery Report"],
    [],
    ["Plant", filters.plantName || ""],
    ["Subtype", filters.subtypeName || "All"],
    [
      "Date range",
      `${formatDate(filters.startDate) || ""} to ${formatDate(filters.endDate) || ""}`,
    ],
    ["Include backlog before range", filters.includePastDueBeyondRange ? "Yes" : "No"],
    ["Delivery types", (filters.cohorts || []).join(", ")],
    ["Statuses", (filters.statuses || []).join(", ")],
    [
      "Advance orders filter",
      advanceFilterSummary(filters.advancePayment) || "All",
    ],
    [],
    ["Summary"],
    ["Total orders", summary?.totals?.orders ?? orderCount],
    ["Total plants", summary?.totals?.plants ?? ""],
    ["Total amount", summary?.totals?.amount ?? ""],
    ["Advance collected (orders)", summary?.byPayment?.advanceCollected ?? ""],
    ["Advance pending (orders)", summary?.byPayment?.advancePending ?? ""],
    [],
    ["By status"],
    ["Status", "Orders", "Plants", "Amount"],
  ]

  for (const row of summary?.byStatus || []) {
    lines.push([row.status, row.orders, row.plants, row.amount ?? ""])
  }

  lines.push([], ["By delivery type"], ["Type", "Orders", "Plants", "Amount"])
  for (const row of summary?.byCohort || []) {
    lines.push([cohortLabel(row.cohort), row.orders, row.plants, row.amount ?? ""])
  }

  return lines
}

export function downloadDeliveryReportExcel({ filters, summary, orders }) {
  const plant = (filters.plantName || "plant").replace(/\s+/g, "-")
  const stamp = moment().format("YYYY-MM-DD")
  const filename = `delivery-report-${plant}-${stamp}.xlsx`

  const wb = XLSX.utils.book_new()

  const summaryAoA = buildSummarySheet(filters, summary, orders?.length || 0)
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoA), "Summary")

  const orderRows = (orders || []).map(mapOrderExportRow)
  const orderSheet = XLSX.utils.json_to_sheet(orderRows, {
    header: EXPORT_COLUMNS.map((c) => c.key),
  })
  XLSX.utils.book_append_sheet(wb, orderSheet, "Orders")

  const headerRow = EXPORT_COLUMNS.map((c) => c.label)
  orderSheet["!cols"] = headerRow.map((label) => ({ wch: Math.max(label.length + 2, 12) }))

  XLSX.writeFile(wb, filename)
}
