import {
  applyBufferToPlants,
  buildSelectedOrderRequestScope,
  computeRequestPlantsGap,
  pickPackingsForGap,
  sumRawGapFromCard,
} from "./sowingPackingUtils"

describe("computeRequestPlantsGap", () => {
  const baseCard = {
    sowingBuffer: 10,
    conversionFactor: 1000,
    totalPlantsToSowWithBuffer: 11000,
    totalPlantsToSowRaw: 10000,
    slots: [{ rawGap: 10000 }],
  }

  it("raising-only: no buffer on full gap", () => {
    const r = computeRequestPlantsGap({
      card: baseCard,
      raisingPackets: 10,
      conversionFactor: 1000,
    })
    expect(r.rawTotal).toBe(10000)
    expect(r.raisingPlants).toBe(10000)
    expect(r.companyRaw).toBe(0)
    expect(r.companyBuffered).toBe(0)
    expect(r.requestGap).toBe(10000)
  })

  it("company-only: buffer applies to entire raw gap", () => {
    const r = computeRequestPlantsGap({
      card: baseCard,
      raisingPackets: 0,
      conversionFactor: 1000,
    })
    expect(r.companyRaw).toBe(10000)
    expect(r.companyBuffered).toBe(11000)
    expect(r.requestGap).toBe(11000)
  })

  it("mixed: raising exact + buffered company remainder", () => {
    const r = computeRequestPlantsGap({
      card: baseCard,
      raisingPackets: 3,
      conversionFactor: 1000,
    })
    expect(r.raisingPlants).toBe(3000)
    expect(r.companyRaw).toBe(7000)
    expect(r.companyBuffered).toBe(7700)
    expect(r.requestGap).toBe(10700)
  })
})

describe("sumRawGapFromCard", () => {
  it("prefers totalPlantsToSowRaw when set", () => {
    expect(sumRawGapFromCard({ totalPlantsToSowRaw: 5000, slots: [{ rawGap: 100 }] })).toBe(5000)
  })

  it("sums slot rawGap when total missing", () => {
    expect(
      sumRawGapFromCard({
        slots: [{ rawGap: 3000 }, { rawGap: 2000 }],
      })
    ).toBe(5000)
  })
})

describe("pickPackingsForGap", () => {
  const packs = [
    { productId: "seed24", name: "Watermelon - Red King", availablePackets: 1, conversionFactor: 1100 },
    { productId: "wrk21", name: "Redking", availablePackets: 32, conversionFactor: 1030 },
    { productId: "seed42", name: "Watermelon - RedKing - 50 gm", availablePackets: 50, conversionFactor: 1000 },
  ]

  it("keeps a single packing when its stock covers the gap", () => {
    const picked = pickPackingsForGap(28560, packs)
    expect(picked.map((p) => p.productId)).toEqual(["seed42"])
  })

  it("adds the next batch only when the first stock is short", () => {
    const picked = pickPackingsForGap(60000, packs)
    expect(picked.map((p) => p.productId)).toEqual(["seed42", "wrk21"])
  })

  it("uses every stocked batch when one is still not enough", () => {
    const picked = pickPackingsForGap(90000, packs)
    expect(picked.map((p) => p.productId)).toEqual(["seed42", "wrk21", "seed24"])
  })

  it("does not add a zero-stock packing once one batch is chosen", () => {
    const picked = pickPackingsForGap(50000, [
      { productId: "a", availablePackets: 10, conversionFactor: 1000 },
      { productId: "b", availablePackets: 0, conversionFactor: 1000 },
    ])
    expect(picked.map((p) => p.productId)).toEqual(["a"])
  })
})

describe("applyBufferToPlants", () => {
  it("returns base when buffer is zero", () => {
    expect(applyBufferToPlants(1000, 0)).toBe(1000)
  })

  it("applies percentage", () => {
    expect(applyBufferToPlants(10000, 10)).toBe(11000)
  })
})

describe("buildSelectedOrderRequestScope", () => {
  const card = {
    sowingBuffer: 10,
    totalPlantsToSowRaw: 12000,
    slotIds: ["card-slot"],
  }
  const rows = [
    { orderId: "order-1", numberOfPlants: 3000, bookingSlot: "slot-1" },
    { orderId: "order-2", numberOfPlants: 5000, bookingSlot: "slot-2" },
    { orderId: "order-3", numberOfPlants: 1000, bookingSlot: "slot-2" },
  ]

  it("scopes one selected order and applies its buffer", () => {
    const scope = buildSelectedOrderRequestScope(card, rows, ["order-1"])

    expect(scope.linkedOrderIds).toEqual(["order-1"])
    expect(scope.slotIds).toEqual(["slot-1"])
    expect(scope.rawPlants).toBe(3000)
    expect(scope.gapCard.totalPlantsToSowWithBuffer).toBe(3300)
  })

  it("sums multiple selected orders and deduplicates their slots", () => {
    const scope = buildSelectedOrderRequestScope(card, rows, [
      "order-2",
      "order-3",
    ])

    expect(scope.linkedOrderIds).toEqual(["order-2", "order-3"])
    expect(scope.slotIds).toEqual(["slot-2"])
    expect(scope.rawPlants).toBe(6000)
    expect(scope.gapCard.totalPlantsToSowWithBuffer).toBe(6600)
  })

  it("packs leftover remaining only, not booked plants", () => {
    const scope = buildSelectedOrderRequestScope(
      card,
      [
        {
          orderId: "order-1",
          numberOfPlants: 20000,
          bookedPlants: 20000,
          coveredPlants: 2300,
          leftoverPlants: 17700,
          bookingSlot: "slot-1",
        },
      ],
      ["order-1"]
    )
    expect(scope.rawPlants).toBe(17700)
    expect(scope.gapCard.totalPlantsToSowWithBuffer).toBe(19470)
  })

  it("excludes an already-requested selected row", () => {
    const scope = buildSelectedOrderRequestScope(
      card,
      [{ ...rows[0], alreadyRequested: true }, rows[1]],
      ["order-1"]
    )

    expect(scope.linkedOrderIds).toEqual([])
    expect(scope.rawPlants).toBe(0)
  })

  it("empty drawer selection does not fall back to every open order", () => {
    const scope = buildSelectedOrderRequestScope(card, rows, [])
    expect(scope.linkedOrderIds).toEqual([])
    expect(scope.rawPlants).toBe(0)
  })
})
