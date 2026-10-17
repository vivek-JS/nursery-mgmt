import moment from "moment"
import { formatIstYmd } from "utils/istCalendar"
import { pickSubtypeChangeSlot } from "./orderEditUtils"

const day = (offset) => moment().utcOffset(330).startOf("day").add(offset, "days")
const slot = (id, from, to, available) => ({
  value: id,
  startDay: day(from).format("DD-MM-YYYY"),
  endDay: day(to).format("DD-MM-YYYY"),
  available
})
const delivery = day(20).format("YYYY-MM-DD")

describe("pickSubtypeChangeSlot", () => {
  it("keeps the delivery date and uses the slot covering it", () => {
    const pick = pickSubtypeChangeSlot({
      slots: [slot("before", 10, 17, 5000), slot("a", 18, 24, 5000)],
      deliveryDate: delivery,
      need: 1500,
      sowingAllowed: false
    })
    expect(pick.slot.value).toBe("a")
    expect(pick.outsideSlot).toBe(false)
    expect(pick.short).toBe(false)
    expect(formatIstYmd(pick.date)).toBe(delivery)
  })

  it("never moves the date — falls back to the nearest slot", () => {
    const pick = pickSubtypeChangeSlot({
      slots: [slot("far", 40, 45, 5000), slot("near", 23, 27, 5000)],
      deliveryDate: delivery,
      need: 10,
      sowingAllowed: true
    })
    expect(pick.slot.value).toBe("near")
    expect(pick.outsideSlot).toBe(true)
    expect(pick.distanceDays).toBe(3)
    expect(formatIstYmd(pick.date)).toBe(delivery)
  })

  it("flags a short slot for plants without sowing", () => {
    const pick = pickSubtypeChangeSlot({
      slots: [slot("a", 18, 24, 100)],
      deliveryDate: delivery,
      need: 1500,
      sowingAllowed: false
    })
    expect(pick.slot.value).toBe("a")
    expect(pick.short).toBe(true)
  })

  it("ignores capacity for sowing plants", () => {
    const pick = pickSubtypeChangeSlot({
      slots: [slot("neg", 18, 24, -300)],
      deliveryDate: delivery,
      need: 1500,
      sowingAllowed: true
    })
    expect(pick.short).toBe(false)
  })

  it("keeps a past delivery date as saved", () => {
    const past = day(-3).format("YYYY-MM-DD")
    const pick = pickSubtypeChangeSlot({
      slots: [slot("past", -5, -1, 5000)],
      deliveryDate: past,
      need: 10,
      sowingAllowed: false
    })
    expect(pick.slot.value).toBe("past")
    expect(formatIstYmd(pick.date)).toBe(past)
  })

  it("returns null without slots", () => {
    expect(
      pickSubtypeChangeSlot({ slots: [], deliveryDate: delivery, need: 1, sowingAllowed: true })
    ).toBeNull()
  })
})
