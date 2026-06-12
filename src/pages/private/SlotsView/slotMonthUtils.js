import moment from "moment"

export const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** Default month tab: current calendar month, else month containing today, else 0. */
export function getDefaultMonthTabIndex(availableMonths, slotsByMonth = {}, asOf = moment()) {
  if (!Array.isArray(availableMonths) || availableMonths.length === 0) return 0

  const currentMonth = asOf.format("MMMM")
  const byName = availableMonths.indexOf(currentMonth)
  if (byName >= 0) return byName

  const today = asOf.clone().startOf("day")
  for (let i = 0; i < availableMonths.length; i++) {
    const monthName = availableMonths[i]
    const slots = slotsByMonth[monthName] || []
    const containsToday = slots.some((slot) => {
      const start = moment(slot.startDay, "DD-MM-YYYY", true)
      const end = moment(slot.endDay, "DD-MM-YYYY", true)
      return start.isValid() && end.isValid() && today.isBetween(start, end, "day", "[]")
    })
    if (containsToday) return i
  }

  return 0
}
