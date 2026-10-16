import { LAYOUT_TABLE, buildReadyMessage, messageGroups, readyLines } from "./readyPlantsMessage"

const day = (d, ready, net = ready) => ({ startDay: d, endDay: d, ready, net, booked: ready - net })

const row = (plantName, subtypeName, slotDays, { current = null, upcoming = [], readyNow = 0 } = {}) => ({
  plantName,
  subtypeName,
  slotDays,
  stock: { inShed: readyNow, readyNow, batches: [] },
  current: current || { startDay: null, endDay: null, ready: 0, net: 0, booked: 0 },
  upcoming,
})

const rows = [
  row("Watermelon", "Impact", 1, { current: day("15-10-2026", 16000), upcoming: [day("26-10-2026", 17600)] }),
  row("Watermelon", "Navkiran", 1, { current: day("15-10-2026", 12800), upcoming: [day("21-10-2026", 39500)] }),
  row("Watermelon", "Prachand", 1, { upcoming: [day("01-11-2026", 25700)] }),
  row("Papaya", "15 no", 7, { upcoming: [{ startDay: "16-11-2026", endDay: "22-11-2026", ready: 35000, net: 35000 }] }),
  row("Papaya", "Vikrum-77", 7, {
    current: { startDay: "15-10-2026", endDay: "21-10-2026", ready: 3300, net: 3300 },
    readyNow: 4000,
  }),
  row("Papaya", "W-46", 7, { readyNow: 5000 }),
]

test("builds the Marathi message in the shared WhatsApp format", () => {
  const text = buildReadyMessage(rows, { today: "2026-10-15", days: 45, lang: "mr", count: "ready" })
  expect(text).toBe(
    [
      "*15 नं पपई तयार होणारी रोपे*",
      "१६/११ = 35000 रोपे",
      "",
      "*विक्रम 77 पपई तयार होणारी रोपे*",
      "रेडी मध्ये = 4000 रोपे",
      "१५/१० = 3300 रोपे",
      "",
      "*W-46 पपई तयार होणारी रोपे*",
      "रेडी मध्ये = 5000 रोपे",
      "",
      "*टरबूज तयार होणारी रोपे*",
      "तारीख  वाण  संख्या",
      "१५/१० इम्पॅक्ट 16000",
      "१५/१० नवकिरण 12800",
      "२१/१० नवकिरण 39500",
      "२६/१० इम्पॅक्ट 17600",
      "०१/११ प्रचंड 25700",
    ].join("\n")
  )
})

test("defaults: one-day crops as a table, longer slots per variety; overrides and crop filter apply", () => {
  const groups = messageGroups(rows, { today: "2026-10-15" })
  expect(groups.map((g) => [g.plantName, g.layout])).toEqual([
    ["Papaya", "variety"],
    ["Watermelon", "table"],
  ])
  const text = buildReadyMessage(rows, {
    today: "2026-10-15",
    days: 45,
    lang: "en",
    crops: ["Papaya"],
    layouts: { Papaya: LAYOUT_TABLE },
    title: "Ram Biotech",
  })
  expect(text.startsWith("*Ram Biotech*\nAs on 15/10/2026\n\n*Papaya ready plants*")).toBe(true)
  expect(text).toContain("Ready now Vikrum-77 = 4000 plants")
  expect(text).toContain("16/11 15 no 35000")
  expect(text).not.toContain("Watermelon")
})

test("lines respect days ahead, free-to-sell counts, and date slots that started earlier as today", () => {
  const r = row("Papaya", "Taiwan", 7, {
    current: { startDay: "12-10-2026", endDay: "18-10-2026", ready: 1000, net: -200 },
    upcoming: [
      { startDay: "19-10-2026", endDay: "25-10-2026", ready: 900, net: 400 },
      { startDay: "30-11-2026", endDay: "06-12-2026", ready: 500, net: 500 },
    ],
  })
  expect(readyLines(r, { today: "2026-10-16", days: 30, count: "ready" })).toEqual([
    { date: "2026-10-16", qty: 1000 },
    { date: "2026-10-19", qty: 900 },
  ])
  expect(readyLines(r, { today: "2026-10-16", days: 0, count: "free" })).toEqual([
    { date: "2026-10-19", qty: 400 },
    { date: "2026-11-30", qty: 500 },
  ])
})
