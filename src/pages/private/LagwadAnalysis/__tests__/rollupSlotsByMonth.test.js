import {
  buildLagwadLineSeries,
  firstWhereAbove,
  rollupSlotsByMonth
} from "../lagwadAnalysisUi"

const slot = (over) => ({
  _id: "x",
  month: "August",
  windowState: "upcoming",
  actualPlants: 0,
  expectedMortality: 0,
  actualReadyPlants: 0,
  remainingToDispatch: 0,
  totalBookedPlants: 0,
  totalDispatchedPlants: 0,
  availablePlants: 0,
  rolledInActualReadyPlants: 0,
  rolledInOrderPlants: 0,
  lineCount: 0,
  batchCount: 0,
  overdueLineCount: 0,
  avgOverdueDays: 0,
  maxOverdueDays: 0,
  isOverbooked: false,
  ...over
})

describe("rollupSlotsByMonth", () => {
  it("sums each pool across the windows of a month", () => {
    const [august] = rollupSlotsByMonth([
      slot({ _id: "a", actualPlants: 1000, expectedMortality: 100, actualReadyPlants: 400 }),
      slot({ _id: "b", actualPlants: 500, expectedMortality: 50, actualReadyPlants: 200 })
    ])

    expect(august.month).toBe("August")
    expect(august.slotCount).toBe(2)
    expect(august.sellable).toBe(1500)
    expect(august.mortality).toBe(150)
    expect(august.ready).toBe(600)
  })

  it("returns months in calendar order, not insertion order", () => {
    const months = rollupSlotsByMonth([
      slot({ _id: "a", month: "September" }),
      slot({ _id: "b", month: "March" }),
      slot({ _id: "c", month: "August" })
    ])
    expect(months.map((m) => m.month)).toEqual(["March", "August", "September"])
  })

  it("keeps expired windows out of the active availability figures", () => {
    const [august] = rollupSlotsByMonth([
      slot({ _id: "a", windowState: "expired", availablePlants: 900, actualReadyPlants: 700 }),
      slot({ _id: "b", windowState: "current", availablePlants: 300, actualReadyPlants: 200 })
    ])

    expect(august.available).toBe(1200)
    expect(august.activeAvailable).toBe(300)
    expect(august.activeReady).toBe(200)
    expect(august.expiredReady).toBe(700)
    expect(august.hasExpired).toBe(true)
    expect(august.hasCurrent).toBe(true)
  })

  it("derives the ready gap from delivery owed versus ready on hand", () => {
    const [august] = rollupSlotsByMonth([
      slot({ _id: "a", actualPlants: 900, actualReadyPlants: 300, remainingToDispatch: 1000 })
    ])
    expect(august.readyGap).toBe(700)
    expect(august.physicalGap).toBe(100)
  })

  it("weights the average overdue days by how many lines each window contributes", () => {
    const [august] = rollupSlotsByMonth([
      slot({ _id: "a", overdueLineCount: 9, avgOverdueDays: 10, maxOverdueDays: 20 }),
      slot({ _id: "b", overdueLineCount: 1, avgOverdueDays: 30, maxOverdueDays: 30 })
    ])
    // A plain mean of 10 and 30 would report 20 and overstate the problem.
    expect(august.overdueLineCount).toBe(10)
    expect(august.avgOverdueDays).toBe(12)
    expect(august.maxOverdueDays).toBe(30)
  })

  it("handles an empty selection", () => {
    expect(rollupSlotsByMonth([])).toEqual([])
    expect(rollupSlotsByMonth(undefined)).toEqual([])
  })
})

describe("buildLagwadLineSeries", () => {
  const months = [
    { month: "August", label: "Aug", sellable: 27000, ready: 14000, delivery: 26000 },
    { month: "September", label: "Sep", sellable: 4500, ready: 0, delivery: 3000 }
  ]

  it("plots this-month values so the four lines can cross", () => {
    const [aug, sep] = buildLagwadLineSeries(months)

    expect(aug).toMatchObject({
      delivery: 26000,
      actual: 27000,
      ready: 14000,
      futureNeed: 12000
    })
    expect(sep).toMatchObject({
      delivery: 3000,
      actual: 4500,
      ready: 0,
      futureNeed: 3000
    })
  })

  it("accumulates when asked for a running total", () => {
    const [, sep] = buildLagwadLineSeries(months, { cumulative: true })

    expect(sep).toMatchObject({
      delivery: 29000,
      actual: 31500,
      ready: 14000,
      futureNeed: 15000
    })
  })

  it("finds the first month where delivery overtakes ready", () => {
    const rows = buildLagwadLineSeries(months)
    expect(firstWhereAbove(rows, "delivery", "ready").label).toBe("Aug")
    expect(firstWhereAbove(rows, "delivery", "actual")).toBeNull()
  })
})
