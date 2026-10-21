import { buildPacketsToSowMessage } from "./sowingPacketsToSowMessage"

const card = {
  plantName: "Watermelon",
  subtypeName: "Prachand",
  totalPlantsToSowRaw: 6200,
}

test("Marathi WhatsApp lists variety qty, order id, delay and excess", () => {
  const text = buildPacketsToSowMessage({
    card,
    lang: "mr",
    rows: [
      {
        orderNumber: "3567",
        numberOfPlants: 5000,
        daysUntilSow: -3,
        slotStartDay: "01-11-2026",
        slotEndDay: "07-11-2026",
        subtypeName: "Prachand",
      },
    ],
  })

  expect(text).toContain("*लागवड झाली पाहिजे*")
  expect(text).toContain("*टरबूज*")
  expect(text).toContain("*प्रचंड*")
  expect(text).toContain("Delivery window:")
  expect(text).toContain("1. *प्रचंड* 5,000")
  expect(text).toContain("ऑर्डर #3567")
  expect(text).toContain("3 दिवस उशीर झाला आहे")
  expect(text).toContain("एक्सेस (ऑर्डर लिंक नाही)")
  expect(text).toContain("1,200")
})

test("English lists excess when no order is linked", () => {
  const text = buildPacketsToSowMessage({
    card: { ...card, excessPlants: 800, shedName: "12" },
    lang: "en",
    rows: [],
  })
  expect(text).toContain("*Sowing needed*")
  expect(text).toContain("Shed: 12")
  expect(text).toContain("Excess (no order linked)")
  expect(text).toContain("800")
})
