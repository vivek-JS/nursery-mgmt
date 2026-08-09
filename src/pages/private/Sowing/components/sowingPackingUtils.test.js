import {
  applyBufferToPlants,
  computeRequestPlantsGap,
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

describe("applyBufferToPlants", () => {
  it("returns base when buffer is zero", () => {
    expect(applyBufferToPlants(1000, 0)).toBe(1000)
  })

  it("applies percentage", () => {
    expect(applyBufferToPlants(10000, 10)).toBe(11000)
  })
})
