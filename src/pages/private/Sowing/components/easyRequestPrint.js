import { fmt, packingsOf } from "./sowingPackingUtils"

function plantsForCard(card) {
  return (
    Number(card.totalPlantsToSowWithBuffer) ||
    Number(card.totalPlantsToSowRaw) ||
    Number(card.totalGap) ||
    0
  )
}

function packetsForCard(card) {
  const plants = plantsForCard(card)
  const cf =
    Number(card.conversionFactor) ||
    Number(packingsOf(card)[0]?.conversionFactor) ||
    0
  if (!cf) return "—"
  return `${(plants / cf).toFixed(2)} pkt`
}

export function buildEasyRequestPrintHtml({
  cards = [],
  inProgressCards = [],
  summary = {},
  sowHorizonDays = 0,
}) {
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const windowLabel =
    sowHorizonDays > 0 ? `overdue + today through +${sowHorizonDays}d` : "overdue + today"

  const requestRows = cards
    .map(
      (c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.plantName || "—"}</td>
      <td>${c.subtypeName || "—"}</td>
      <td align="right">${fmt(plantsForCard(c))}</td>
      <td align="right">${packetsForCard(c)}</td>
      <td align="right">${fmt(c.availablePackets, 1)}</td>
      <td>${c.requestPending || c.activeRequest ? "Pending / issued" : "Open"}</td>
    </tr>`
    )
    .join("")

  const progressRows = inProgressCards
    .map(
      (c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${c.plantName || "—"}</td>
      <td>${c.subtypeName || "—"}</td>
      <td align="right">${fmt(c.totalPacketsInProgress || c.activeRequest?.packetsRequested || 0, 1)} pkt</td>
      <td align="right">${fmt(c.totalPlantsInProgress || 0)}</td>
      <td>${c.activeRequest?.requestNumber || "—"}</td>
    </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Inventory Requests — ${date}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 16px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 16px; }
    .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .pill { border: 1px solid #ccc; border-radius: 6px; padding: 8px 12px; min-width: 120px; }
    .pill strong { display: block; font-size: 15px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f3f4f6; }
    h2 { font-size: 14px; margin: 16px 0 8px; }
    @media print { @page { margin: 1cm; } }
  </style>
</head>
<body>
  <h1>Inventory Requests Report</h1>
  <div class="meta">${date} · Sow window: ${windowLabel}</div>
  <div class="summary">
    <div class="pill"><span>Due (overdue)</span><strong>${fmt(summary.totalDueGap || 0)}</strong></div>
    <div class="pill"><span>Today</span><strong>${fmt(summary.totalTodayGap || 0)}</strong></div>
    <div class="pill"><span>Plants needed</span><strong>${fmt(summary.totalPlantsNeeded || 0)}</strong></div>
    <div class="pill"><span>Sowing in progress</span><strong>${inProgressCards.length}</strong></div>
  </div>
  <h2>Open requests (${cards.length})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Plant</th><th>Subtype</th><th>Plants</th><th>Packets</th><th>Stock</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${requestRows || '<tr><td colspan="7">None</td></tr>'}</tbody>
  </table>
  <h2>Sowing in progress (${inProgressCards.length})</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Plant</th><th>Subtype</th><th>Packets issued</th><th>Plants expected</th><th>Request #</th>
      </tr>
    </thead>
    <tbody>${progressRows || '<tr><td colspan="6">None</td></tr>'}</tbody>
  </table>
</body>
</html>`
}

export function printEasyRequestReport(ctx) {
  const html = buildEasyRequestPrintHtml(ctx)
  const win = window.open("", "_blank")
  if (!win) return false
  win.document.write(html)
  win.document.close()
  setTimeout(() => {
    win.focus()
    win.print()
    win.onafterprint = () => win.close()
  }, 400)
  return true
}
