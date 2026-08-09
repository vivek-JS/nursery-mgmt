import {
  groupOrdersByDeliveryDate,
  groupOrdersByDeliveryMonth,
  groupDeliveryDays,
  groupDeliveryMonths,
  buildSlotCards,
  groupSlotMonths,
  monthKeyFromDelivery,
  fmtMonthLabel,
  summarizeDeliveryMonths,
  daysBetweenYmd,
  calcDefaultPacketsUsed,
} from "./directSowUtils"

describe("directSowUtils month grouping", () => {
  const orders = [
    { orderId: "1", plants: 1000, deliveryDate: "2026-03-05" },
    { orderId: "2", plants: 2000, deliveryDate: "2026-03-15" },
    { orderId: "3", plants: 500, deliveryDate: "2026-04-01" },
  ]

  test("groupOrdersByDeliveryDate buckets by day", () => {
    const days = groupOrdersByDeliveryDate(orders)
    expect(days).toHaveLength(3)
    expect(days[0].plants).toBe(1000)
    expect(days[1].plants).toBe(2000)
  })

  test("groupOrdersByDeliveryMonth rolls up days", () => {
    const months = groupOrdersByDeliveryMonth(orders)
    expect(months).toHaveLength(2)
    const mar = months.find((m) => m.monthKey === "2026-03")
    expect(mar.plants).toBe(3000)
    expect(mar.dayCount).toBe(2)
    expect(mar.orders).toHaveLength(2)
  })

  test("monthKeyFromDelivery and fmtMonthLabel", () => {
    expect(monthKeyFromDelivery("2026-03-05")).toBe("2026-03")
    expect(fmtMonthLabel("2026-03")).toMatch(/Mar.*2026/)
  })

  test("summarizeDeliveryMonths skips _none", () => {
    const withNone = [
      ...orders,
      { orderId: "4", plants: 100, deliveryDate: null },
    ]
    const rows = summarizeDeliveryMonths(withNone)
    expect(rows.every((r) => r.monthKey !== "_none")).toBe(true)
  })

  test("buildSlotCards groups orders by booking slot", () => {
    const slots = [
      {
        slotId: "s1",
        startDay: "16-10-2025",
        endDay: "22-10-2025",
        deliveryKey: "2025-10-16",
        totalBookedPlants: 10000,
        primarySowed: 0,
        officeSowed: 0,
        plantReadyDays: 40,
      },
    ]
    const orders = [
      { orderId: "1", slotId: "s1", plants: 8500, deliveryDate: "2025-10-16" },
    ]
    const cards = buildSlotCards(orders, slots)
    expect(cards).toHaveLength(1)
    expect(cards[0].slotKey).toBe("s1")
    expect(cards[0].plants).toBe(8500)
    expect(cards[0].label).toContain("16-10-2025")
  })

  test("merge slot days without orders", () => {
    const slotDays = [{ slotId: "s1", deliveryKey: "2026-10-20", startDay: "20-10-2026" }]
    const days = groupDeliveryDays(orders, slotDays)
    expect(days.some((d) => d.deliveryKey === "2026-10-20" && d.noOrders)).toBe(true)
    const months = groupDeliveryMonths([], slotDays)
    expect(months.some((m) => m.monthKey === "2026-10")).toBe(true)
  })

  test("daysBetweenYmd allows same-day ready", () => {
    expect(daysBetweenYmd("2026-08-02", "2026-08-02")).toBe(0)
    expect(daysBetweenYmd("2026-08-02", "2026-08-10")).toBe(8)
  })

  test("calcDefaultPacketsUsed matches API ceil(plants/cf)", () => {
    expect(calcDefaultPacketsUsed(2500, 300)).toBe("9")
    expect(calcDefaultPacketsUsed(0, 300)).toBe("")
    expect(calcDefaultPacketsUsed(100, 0)).toBe("0")
  })
})
