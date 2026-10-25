import test from "node:test"
import assert from "node:assert/strict"
import { packFromOrder } from "./packCratesFromOrder.js"

test("1500 @ 126 free=1 pack 1511", () => {
  const p = packFromOrder({
    orderQty: 1500,
    cavitySize: 126,
    numberPerCrate: 1,
    freePlantsPerCrate: 1,
  })
  assert.equal(p.bonus, 11)
  assert.equal(p.packQty, 1511)
  assert.deepEqual(p.crateDetails[1], { crateCount: 1, plantCount: 125 })
})

test("free=0 matches plain order crates", () => {
  const p = packFromOrder({
    orderQty: 1500,
    cavitySize: 126,
    numberPerCrate: 1,
    freePlantsPerCrate: 0,
  })
  assert.equal(p.packQty, 1500)
  assert.equal(p.bonus, 0)
})
