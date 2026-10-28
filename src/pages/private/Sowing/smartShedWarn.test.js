import test from "node:test"
import assert from "node:assert/strict"
import { cropPool, findSmartShed, shedWouldOverflow } from "./smartShedWarn.js"

const panhalgad = {
  key: "panhalgad",
  shadeName: "Panhalgad (पन्हाळगड) (12)",
  matchLabels: ["Panhalgad", "पन्हाळगड", "Panhalgad (पन्हाळगड) (12)"],
  papayaMax: 1820000,
  melonMax: 4045500,
  papayaOccupied: 1820000,
  melonOccupied: 0,
}

test("papaya and watermelon share a pool, banana does not", () => {
  assert.equal(cropPool("Papaya"), "papaya")
  assert.equal(cropPool("Watermelon"), "melon")
  assert.equal(cropPool("Muskmelon"), "melon")
  assert.equal(cropPool("Banana"), null)
})

test("shed picker matches the fort name and warns only when the add overflows", () => {
  assert.equal(findSmartShed([panhalgad], panhalgad.shadeName).key, "panhalgad")
  assert.equal(findSmartShed([panhalgad], "Kondhana"), null)
  assert.equal(shedWouldOverflow(panhalgad, "melon", 1), true)
  assert.equal(shedWouldOverflow({ ...panhalgad, papayaOccupied: 0 }, "papaya", 100), false)
})
