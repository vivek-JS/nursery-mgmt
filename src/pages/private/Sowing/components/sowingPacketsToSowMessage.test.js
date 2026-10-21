import {
  buildPacketsToSowMessage,
  buildSowNeededMessage,
} from "./sowingPacketsToSowMessage"

const card = {
  plantName: "Watermelon",
  subtypeName: "Prachand",
  totalPlantsToSowRaw: 6200,
}

test("Marathi WhatsApp lists crop, variety qty, order id, delay and excess", () => {
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
  expect(text).toContain("एकूण")
  expect(text).toContain("*प्रचंड*")
  expect(text).toContain("Delivery window:")
  expect(text).toContain("ऑर्डर #3567")
  expect(text).toContain("5,000")
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
  expect(text).toContain("*Watermelon*")
  expect(text).toContain("Shed: 12")
  expect(text).toContain("Excess (no order linked)")
  expect(text).toContain("800")
})

test("crop-wise message groups varieties under chilli then watermelon", () => {
  const text = buildSowNeededMessage({
    lang: "mr",
    bundles: [
      {
        card: { plantName: "Chilli", subtypeName: "Impact", plantId: "c1" },
        rows: [
          {
            orderNumber: "10",
            numberOfPlants: 3000,
            slotStartDay: "01-11-2026",
            slotEndDay: "06-11-2026",
          },
        ],
      },
      {
        card: { plantName: "Chilli", subtypeName: "Simbha", plantId: "c1" },
        rows: [
          {
            orderNumber: "11",
            numberOfPlants: 2000,
            slotStartDay: "01-11-2026",
            slotEndDay: "06-11-2026",
          },
        ],
      },
      {
        card: { plantName: "Watermelon", subtypeName: "Prachand", plantId: "w1" },
        rows: [{ orderNumber: "20", numberOfPlants: 4000, slotStartDay: "03-11-2026" }],
      },
    ],
  })

  expect(text.indexOf("*मिरची*")).toBeLessThan(text.indexOf("*टरबूज*"))
  expect(text).toContain("*इम्पॅक्ट*")
  expect(text).toContain("*सिंबा*")
  expect(text).toContain("01 Nov → 06 Nov")
  expect(text).toContain("────────")
  expect(text).toContain("ऑर्डर #10")
  expect(text).toContain("ऑर्डर #20")
})
