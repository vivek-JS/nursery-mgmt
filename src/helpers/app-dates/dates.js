import { addDays, addHours, addMinutes } from "date-fns"

export function Dates() {
  function addInCurrent(amount, unit = "minutes") {
    const now = new Date()
    if (unit === "minutes") return addMinutes(now, amount)
    if (unit === "hours") return addHours(now, amount)
    if (unit === "days") return addDays(now, amount)
    throw new Error(`Dates.addInCurrent: unsupported unit "${unit}"`)
  }

  return {
    addInCurrent
  }
}
