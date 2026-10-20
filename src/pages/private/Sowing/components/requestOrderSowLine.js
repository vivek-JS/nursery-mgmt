export function leftoverRemaining(o) {
  const booked = Number(o?.plants ?? o?.bookedPlants ?? o?.numberOfPlants) || 0
  const sown = Number(o?.coveredPlants) || 0
  return Math.max(0, booked - sown)
}

/** Completed-request order line: booked / sown / remaining. */
export function requestOrderSowLine(o) {
  const booked = Number(o?.plants) || 0
  const sown = Number(o?.coveredPlants) || 0
  const remaining = leftoverRemaining(o)
  if (o?.sowingDone) return `${booked} plants · Sown`
  if (o?.partiallyCovered || sown > 0) {
    return `Booked ${booked} · Sown ${sown} · Remaining ${remaining} · Partial sow`
  }
  return `${booked} plants · Need sow`
}
