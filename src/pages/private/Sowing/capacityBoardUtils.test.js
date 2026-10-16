import { boardColumns, cellFor, columnTotals, exportSheet, filterRows, slotTabs, sortRows } from "./capacityBoardUtils"
import { slotRangeLabel } from "./capacitySheetUtils"

const cell = (startDay, endDay, ready, booked, extra = {}) => ({
  slotId: `${startDay}`,
  startDay,
  endDay,
  ready,
  booked,
  net: ready - booked,
  gap: 0,
  ...extra,
})

const papaya = {
  plantId: "p1",
  plantName: "Papaya",
  subtypeId: "s1",
  subtypeName: "Taiwan 786",
  slotDays: 7,
  stock: { inShed: 8200, readyNow: 8200, batches: [] },
  current: cell("12-10-2026", "18-10-2026", 11100, 12300, { overdue: { booked: 5100, unsold: 0 }, slotIds: ["a", "b"] }),
  upcoming: [cell("19-10-2026", "25-10-2026", 6500, 5000), cell("26-10-2026", "01-11-2026", 8000, 5200)],
  totals: { ready: 25600 },
}

const tomato = {
  plantId: "p2",
  plantName: "Tomato",
  subtypeId: "s2",
  subtypeName: "US 440",
  slotDays: 7,
  stock: { inShed: 0, readyNow: 0, batches: [] },
  current: cell("12-10-2026", "18-10-2026", 2200, 1800, { overdue: { booked: 0, unsold: 0 }, slotIds: ["c"] }),
  upcoming: [cell("19-10-2026", "25-10-2026", 3200, 2000)],
  totals: { ready: 5400 },
}

const chilli = { ...tomato, plantId: "p3", plantName: "Chilli", subtypeName: "Teja", slotDays: 1 }

test("range labels", () => {
  expect(slotRangeLabel("16-10-2026", "16-10-2026")).toBe("16 Oct")
  expect(slotRangeLabel("16-10-2026", "18-10-2026")).toBe("16–18 Oct")
  expect(slotRangeLabel("30-10-2026", "05-11-2026")).toBe("30 Oct–5 Nov")
})

test("one tab per slot length, shortest first", () => {
  expect(slotTabs([papaya, tomato, chilli]).map((t) => [t.key, t.count])).toEqual([
    ["1d", 1],
    ["7d", 2],
  ])
})

test("columns share dates when every variety uses the same window", () => {
  const columns = boardColumns([papaya, tomato], 7)
  expect(columns.map((c) => c.key)).toEqual(["current", "u0", "u1"])
  expect(columns[0]).toMatchObject({ range: "12–18 Oct", shared: true })
  expect(columns[1]).toMatchObject({ range: "19–25 Oct", shared: true, sub: "Slot 2" })
  expect(cellFor(tomato, columns[2])).toBeNull()
})

test("columns flag differing windows", () => {
  const shifted = { ...tomato, upcoming: [cell("20-10-2026", "26-10-2026", 1, 0)] }
  expect(boardColumns([papaya, shifted], 7)[1].shared).toBe(false)
})

test("filters and urgent-first sort", () => {
  expect(filterRows([papaya, tomato], { capacity: "short" }).map((r) => r.plantName)).toEqual(["Papaya"])
  expect(filterRows([papaya, tomato], { capacity: "overdue" }).map((r) => r.plantName)).toEqual(["Papaya"])
  expect(filterRows([papaya, tomato], { capacity: "stock" }).map((r) => r.plantName)).toEqual(["Papaya"])
  expect(filterRows([papaya, tomato], { search: "us 4" }).map((r) => r.plantName)).toEqual(["Tomato"])
  expect(sortRows([tomato, papaya], { key: "urgent" }, []).map((r) => r.plantName)).toEqual(["Papaya", "Tomato"])
  expect(sortRows([papaya, tomato], { key: "name", dir: "desc" }, []).map((r) => r.plantName)).toEqual(["Tomato", "Papaya"])
})

test("column totals and export", () => {
  const columns = boardColumns([papaya, tomato], 7)
  const totals = columnTotals([papaya, tomato], columns)
  expect(totals[0]).toEqual({ ready: 13300, booked: 14100, net: -800, overdue: 5100 })
  const sheet = exportSheet([papaya], columns, "7-Day slots")
  expect(sheet.headers).toContain("Overdue booked")
  expect(sheet.rows[0].slice(0, 4)).toEqual(["Papaya", "Taiwan 786", 8200, 8200])
})
