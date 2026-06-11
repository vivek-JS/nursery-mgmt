import { DELIVERY_BUCKETS, asDisplayLabel } from "./misConstants"

export function breakdownRowsToCsv(sectionTitle, rows) {
  const lines = []
  lines.push(sectionTitle)
  lines.push(
    [
      "Name",
      "Phone",
      "JobTitle",
      "Booking_Orders",
      "Booking_Plants",
      "Delivery_Total_Orders",
      "Delivery_Total_Plants",
      ...DELIVERY_BUCKETS.flatMap((b) => [`${b}_Orders`, `${b}_Plants`]),
    ].join(",")
  )
  for (const row of rows || []) {
    const d = row.delivery
    lines.push(
      [
        `"${asDisplayLabel(row.personName)}"`,
        `"${row.phoneNumber || ""}"`,
        `"${row.jobTitle || ""}"`,
        row.booking.orders,
        row.booking.plants,
        d.total.orders,
        d.total.plants,
        ...DELIVERY_BUCKETS.flatMap((b) => [d[b].orders, d[b].plants]),
      ].join(",")
    )
  }
  return lines
}

export function downloadCsv(filename, lineArrays) {
  const blob = new Blob([lineArrays.flat().join("\n")], { type: "text/csv;charset=utf-8;" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}
