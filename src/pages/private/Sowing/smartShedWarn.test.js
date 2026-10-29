import test from "node:test"
import assert from "node:assert/strict"
import { cropPool, findSmartShed, fitAfter, shedWouldOverflow } from "./smartShedWarn.js"

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

test("fit check: half papaya leaves half papaya or half watermelon", () => {
  const empty = { ...panhalgad, papayaOccupied: 0 }
  const fit = fitAfter(empty, "papaya", 910000)
  assert.equal(fit.before, 0)
  assert.equal(fit.used, 0.5)
  assert.equal(fit.over, false)
  assert.equal(fit.papayaRoom, 910000)
  assert.equal(fit.melonRoom, 2022750)
  assert.equal(fit.maxAdd, 1820000)
})

test("fit check: watermelon and muskmelon spend the same melon share", () => {
  const half = { ...panhalgad, papayaOccupied: 910000 }
  const fit = fitAfter(half, "melon", 2022750)
  assert.equal(fit.used, 1)
  assert.equal(fit.over, false)
  assert.equal(fit.papayaRoom, 0)
  assert.equal(fit.melonRoom, 0)
  assert.equal(fitAfter(half, "melon", 0).maxAdd, 2022750)
})

test("fit check: overfull shed has zero room and flags over", () => {
  const fit = fitAfter(panhalgad, "melon", 1000)
  assert.equal(fit.over, true)
  assert.equal(fit.papayaRoom, 0)
  assert.equal(fit.melonRoom, 0)
  assert.equal(fit.maxAdd, 0)
  assert.equal(fitAfter({ papayaMax: 0, melonMax: 0 }, "papaya", 5), null)
})
