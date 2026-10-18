import {
  boardColumns,
  cellDueBy,
  cellFor,
  columnTotals,
  exportSheet,
  filterRows,
  groupByCrop,
  modeAmount,
  modeCards,
  modeTotal,
  slotTabs,
  sortRows,
  splitTotals,
  stockBatchSheet,
} from "./capacityBoardUtils"
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

const keyed = (c) => ({ ...c, key: c.startDay.split("-").reverse().join("-") })

const papaya = {
  plantId: "p1",
  plantName: "Papaya",
  subtypeId: "s1",
  subtypeName: "Taiwan 786",
  slotDays: 7,
  stock: { inShed: 8200, readyNow: 8200, batches: [] },
  current: cell("12-10-2026", "18-10-2026", 11100, 12300, { overdue: { booked: 5100, unsold: 0 }, slotIds: ["a", "b"] }),
  cells: [keyed(cell("19-10-2026", "25-10-2026", 6500, 5000)), keyed(cell("26-10-2026", "01-11-2026", 8000, 5200))],
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
  cells: [keyed(cell("19-10-2026", "25-10-2026", 3200, 2000))],
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

test("stock-only varieties get the last tab and a batch-wise export", () => {
  const banana = {
    plantId: "p9",
    plantName: "Banana",
    subtypeId: "s9",
    subtypeName: "G9",
    slotDays: 0,
    sowingAllowed: false,
    stock: {
      inShed: 1729,
      readyNow: 1500,
      batches: [
        { shed: "Shed 2", batchNumber: "B7", inShed: 1729, readyNow: 1500, notReady: 229, lagwadDate: "2026-08-01T00:00:00.000Z", readyDate: "2026-10-01T00:00:00.000Z", nextReadyDate: "2026-10-30T00:00:00.000Z" },
      ],
    },
    current: {},
    upcoming: [],
    totals: { ready: 0 },
  }
  expect(slotTabs([banana, papaya]).map((t) => [t.key, t.label])).toEqual([
    ["7d", "7-Day slots"],
    ["0d", "Shed stock only"],
  ])
  const sheet = stockBatchSheet([banana], "Shed stock only")
  expect(sheet.rows).toEqual([["Banana", "G9", "Shed 2", "B7", "2026-08-01", "2026-10-01", 1729, 1500, 229, "2026-10-30"]])
})

test("columns are now + only the dates that have plants, in date order", () => {
  const columns = boardColumns([papaya, tomato])
  expect(columns.map((c) => c.key)).toEqual(["now", "2026-10-19", "2026-10-26"])
  expect(columns[0]).toMatchObject({ range: "12–18 Oct", shared: true })
  expect(columns[1]).toMatchObject({ range: "19–25 Oct", sub: "7 days" })
  expect(cellFor(tomato, columns[1]).ready).toBe(3200)
  expect(cellFor(tomato, columns[2])).toBeNull()
})

test("day-wise columns jump over empty days; differing current windows are flagged", () => {
  const day = (d, ready) => keyed(cell(`${d}-10-2026`, `${d}-10-2026`, ready, 0))
  const a = { ...chilli, current: cell("16-10-2026", "16-10-2026", 300, 200), cells: [day("20", 900)] }
  const b = { ...chilli, plantId: "p4", current: cell("16-10-2026", "16-10-2026", 0, 0), cells: [day("17", 50), day("20", 10)] }
  expect(boardColumns([a]).map((c) => c.range)).toEqual(["16 Oct", "20 Oct"])
  expect(boardColumns([a, b]).map((c) => [c.range, c.sub])).toEqual([
    ["16 Oct", "Now + overdue"],
    ["17 Oct", "Sat"],
    ["20 Oct", "Tue"],
  ])
  const shifted = { ...tomato, current: cell("13-10-2026", "19-10-2026", 1, 0) }
  expect(boardColumns([papaya, shifted])[0].shared).toBe(false)
})

test("3-day groups use the API's now cell and group crops in sorted order", () => {
  const grouped = { ...chilli, now: { ...cell("16-10-2026", "18-10-2026", 500, 100), key: "now" }, cells: [keyed(cell("19-10-2026", "21-10-2026", 40, 0))] }
  const columns = boardColumns([grouped])
  expect(columns.map((c) => [c.range, c.sub])).toEqual([
    ["16–18 Oct", "Now + overdue"],
    ["19–21 Oct", "3 days"],
  ])
  expect(cellFor(grouped, columns[0]).ready).toBe(500)
  const papaya2 = { ...papaya, subtypeId: "s9", subtypeName: "Red Lady" }
  expect(groupByCrop([papaya, tomato, papaya2]).map((g) => [g.crop, g.rows.length])).toEqual([
    ["Papaya", 2],
    ["Tomato", 1],
  ])
})

test("excess / gap modes keep only free or only short dates", () => {
  expect(modeCards(papaya, "excess").map((c) => c.key)).toEqual(["2026-10-19", "2026-10-26"])
  expect(modeCards(papaya, "gap").map((c) => [c.key, modeAmount(c, "gap")])).toEqual([["now", 1200]])
  expect(modeCards(papaya, "all").map((c) => c.key)).toEqual(["now", "2026-10-19", "2026-10-26"])
  expect(modeTotal(papaya, "excess")).toBe(1500 + 2800)
  expect(modeTotal(papaya, "all")).toBe(1200 + 1500 + 2800)
  expect(splitTotals(papaya)).toEqual({ excess: 4300, unsown: 1200 })
  expect(modeTotal(tomato, "gap")).toBe(0)
  expect(filterRows([papaya, tomato], { mode: "gap" }).map((r) => r.plantName)).toEqual(["Papaya"])
  expect(filterRows([papaya, tomato], { mode: "excess" }).map((r) => r.plantName)).toEqual(["Papaya", "Tomato"])
  expect(filterRows([papaya, tomato], { mode: "all" }).map((r) => r.plantName)).toEqual(["Papaya", "Tomato"])
  expect(cellDueBy({ slotIds: ["n1"], startDay: "01-11-2026" }, [{ slotIds: ["n1"], sowBy: "14-10-2026" }])).toBe(
    "14-10-2026"
  )
  expect(sortRows([tomato, papaya], { key: "total", dir: "desc", mode: "excess" }, []).map((r) => r.plantName)).toEqual([
    "Papaya",
    "Tomato",
  ])
})

test("filters and urgent-first sort", () => {
  expect(filterRows([papaya, tomato], { search: "us 4" }).map((r) => r.plantName)).toEqual(["Tomato"])
  expect(sortRows([tomato, papaya], { key: "urgent" }, []).map((r) => r.plantName)).toEqual(["Papaya", "Tomato"])
  expect(sortRows([papaya, tomato], { key: "name", dir: "desc" }, []).map((r) => r.plantName)).toEqual(["Tomato", "Papaya"])
})

test("column totals and export", () => {
  const columns = boardColumns([papaya, tomato])
  const totals = columnTotals([papaya, tomato], columns)
  expect(totals[0]).toEqual({ ready: 13300, booked: 14100, net: -800, overdue: 5100 })
  const sheet = exportSheet([papaya], columns, "7-Day slots")
  expect(sheet.headers).toContain("Overdue booked")
  expect(sheet.rows[0].slice(0, 4)).toEqual(["Papaya", "Taiwan 786", 8200, 8200])
})
