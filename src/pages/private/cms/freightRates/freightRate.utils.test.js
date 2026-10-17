import { quoteFreight, slabLabel, sortSlabs, cropsOfCard } from "./freightRate.utils"

const chotaHathi = {
  name: "Chota Hathi",
  localMarketRatePerPlant: 0.5,
  shortTripMaxKm: 100,
  shortTripRatePerKm: 12.75,
  loadTypes: [
    {
      name: "Regular",
      slabs: [
        { crop: "Banana", condition: "ABOVE", value: 125, ratePerKm: 12.75 },
        { crop: "Banana", condition: "BELOW", value: 116, ratePerKm: 11.75 },
        { crop: "Papaya", condition: "BELOW", value: 110, ratePerKm: 11.75 }
      ]
    },
    { name: "Mini Jumbo", slabs: [{ crop: "Banana", condition: "BELOW", value: 55, ratePerKm: 11.75 }] }
  ]
}

const eicher = {
  name: "Eicher",
  localMarketRatePerPlant: 0.5,
  loadTypes: [{ name: "Regular", slabs: [{ crop: "Banana", condition: "ABOVE", value: 500, ratePerKm: 31 }] }]
}

describe("freight rate utils", () => {
  it("labels and sorts slabs", () => {
    expect(slabLabel({ condition: "BETWEEN", from: 188, to: 200 })).toBe("188 – 200")
    expect(slabLabel({ condition: "AT_LEAST", value: 320 })).toBe("320 & above")
    expect(sortSlabs(chotaHathi.loadTypes[0].slabs).map(slabLabel)).toEqual([
      "Below 116",
      "Below 110",
      "Above 125"
    ])
  })

  it("lists default crops first", () => {
    expect(cropsOfCard({ loadTypes: [{ slabs: [{ crop: "Tomato" }, { crop: "Banana" }] }] })).toEqual([
      "Banana",
      "Tomato"
    ])
  })

  it("uses the crate slab for banana below 116 crates", () => {
    const q = quoteFreight(chotaHathi, { loadTypeName: "Regular", crop: "Banana", crates: 100, km: 200 })
    expect(q).toMatchObject({ ok: true, mode: "SLAB", ratePerKm: 11.75, amount: 2350, inGap: false })
  })

  it("uses the upper slab above 125 crates", () => {
    const q = quoteFreight(chotaHathi, { loadTypeName: "Regular", crop: "Banana", crates: 130, km: 150 })
    expect(q).toMatchObject({ ratePerKm: 12.75, amount: 1912.5 })
  })

  it("falls back to the lower slab between 116 and 125 crates", () => {
    const q = quoteFreight(chotaHathi, { loadTypeName: "Regular", crop: "Banana", crates: 120, km: 150 })
    expect(q).toMatchObject({ ok: true, inGap: true, ratePerKm: 11.75 })
  })

  it("applies the short trip rate below 100 km", () => {
    const q = quoteFreight(chotaHathi, { loadTypeName: "Regular", crop: "Banana", crates: 100, km: 80 })
    expect(q).toMatchObject({ mode: "SHORT_TRIP", ratePerKm: 12.75, amount: 1020 })
  })

  it("charges 50 paise per plant for local market", () => {
    const q = quoteFreight(chotaHathi, { localMarket: true, plants: 10000 })
    expect(q).toMatchObject({ mode: "LOCAL_MARKET", ratePerPlant: 0.5, amount: 5000 })
  })

  it("reports no rate when the load is below every slab", () => {
    const q = quoteFreight(eicher, { loadTypeName: "Regular", crop: "Banana", crates: 300, km: 200 })
    expect(q.ok).toBe(false)
    expect(q.message).toMatch(/Above 500/)
  })
})
