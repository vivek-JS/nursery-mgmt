/**
 * Pack crates from original order qty with free plants on FULL crates only.
 * DC / invoices must keep using orderQty — never packQty.
 * Mirrors FINAL_NURSERY_BE/utility/packCratesFromOrder.js
 */

export function breakdownCrates(qty, traySize, traysPerCrate) {
  const quantity = Math.max(0, Number(qty) || 0)
  const cavity = Math.max(0, Number(traySize) || 0)
  const perCrate = Math.max(0, Number(traysPerCrate) || 0)
  if (quantity < 1 || cavity < 1 || perCrate < 1) {
    return {
      fullCrates: 0,
      plantsInFullCrates: 0,
      remainingPlants: 0,
      plantsPerCrate: 0,
      crateDetails: [],
    }
  }
  const plantsPerCrate = cavity * perCrate
  const numberOfTrays = Math.floor(quantity / cavity)
  const fullCrates = Math.floor(numberOfTrays / perCrate)
  const plantsInFullCrates = fullCrates * plantsPerCrate
  const remainingPlants = Math.max(0, quantity - plantsInFullCrates)
  const crateDetails = []
  if (fullCrates > 0) {
    crateDetails.push({
      crateCount: fullCrates,
      plantCount: plantsInFullCrates,
    })
  }
  if (remainingPlants > 0) {
    crateDetails.push({
      crateCount: 1,
      plantCount: remainingPlants,
    })
  }
  return {
    fullCrates,
    plantsInFullCrates,
    remainingPlants,
    plantsPerCrate,
    crateDetails,
  }
}

export function packFromOrder({
  orderQty,
  cavitySize,
  numberPerCrate,
  freePlantsPerCrate = 0,
}) {
  const qty = Math.max(0, Number(orderQty) || 0)
  const free = Math.max(0, Number(freePlantsPerCrate) || 0)
  const traySize = Number(cavitySize) || 0
  const traysPerCrate = Number(numberPerCrate) || 0

  const pass1 = breakdownCrates(qty, traySize, traysPerCrate)
  const bonus = pass1.fullCrates * free
  const packQty = qty + bonus
  const pass2 = breakdownCrates(packQty, traySize, traysPerCrate)
  const crateDetails = pass2.crateDetails
  const crateCount = crateDetails.reduce(
    (s, r) => s + Number(r.crateCount || 0),
    0
  )
  const plantCount = crateDetails.reduce(
    (s, r) => s + Number(r.plantCount || 0),
    0
  )

  return {
    orderQty: qty,
    bonus,
    packQty,
    fullCratesPass1: pass1.fullCrates,
    crateDetails,
    crateCount,
    plantCount,
  }
}

export default packFromOrder
