import { NetworkManager } from "network/core"
import {
  autoFillPicks,
  fetchExcessWithFallback,
  groupExcessEntries,
  picksMapToList,
  summarizePicks,
} from "./ExcessBatchCoverDialog"

jest.mock("network/core", () => ({ NetworkManager: jest.fn(), API: { sowing: {} } }))

function mockWindows(freeByWindow) {
  const request = jest.fn(async (_body, params) => ({
    data: {
      success: true,
      data: { windowDays: params.windowDays, totalFree: freeByWindow[params.windowDays] ?? 0, entries: [] },
    },
  }))
  NetworkManager.mockReturnValue({ request })
  return request
}

test("fallback stays at ±5 days when that covers the order", async () => {
  const request = mockWindows({ 5: 12000, 15: 40000 })
  const res = await fetchExcessWithFallback({ plantId: "p", subtypeId: "s", deliveryDate: "2026-11-10", need: 10000 })
  expect(res).toMatchObject({ windowDays: 5, widened: false, nearFree: 12000 })
  expect(request).toHaveBeenCalledTimes(1)
})

test("fallback widens to ±15 days when ±5 is not enough", async () => {
  mockWindows({ 5: 3000, 15: 40000 })
  const res = await fetchExcessWithFallback({ plantId: "p", subtypeId: "s", deliveryDate: "2026-11-10", need: 10000 })
  expect(res).toMatchObject({ windowDays: 15, widened: true, nearFree: 3000 })
  expect(res.preview.totalFree).toBe(40000)
})

const base = {
  slotId: "slot1",
  sowingDate: "16-10-2026",
  plantReadyDate: "15-11-2026",
  offsetDays: -3,
  shedName: "Kondhana (23)",
  requestNumber: "SR202610160003",
}
const entries = [
  { ...base, batchId: "small", freePlants: 15000 },
  { ...base, batchId: "big", freePlants: 100000 },
  { ...base, batchId: "other", sowingDate: "18-10-2026", plantReadyDate: "17-11-2026", offsetDays: -1, freePlants: 2000 },
]

test("batches with the same sowing date become one row", () => {
  const rows = groupExcessEntries(entries)
  expect(rows).toHaveLength(2)
  expect(rows[0]).toMatchObject({ sowingDate: "16-10-2026", freePlants: 115000 })
  expect(rows[0].batches.map((b) => b.batchId)).toEqual(["small", "big"])
  expect(rows[1]).toMatchObject({ sowingDate: "18-10-2026", freePlants: 2000 })
})

test("a row pick is split across its batches in order", () => {
  const rows = groupExcessEntries(entries)
  const picks = autoFillPicks(rows, 50000)
  expect(picks).toEqual({ [rows[0].key]: 50000 })
  const list = picksMapToList(picks, rows)
  expect(list.map(({ batchId, slotId, plants }) => ({ batchId, slotId, plants }))).toEqual([
    { batchId: "small", slotId: "slot1", plants: 15000 },
    { batchId: "big", slotId: "slot1", plants: 35000 },
  ])
  expect(summarizePicks(list)).toEqual([
    expect.objectContaining({ sowingDate: "16-10-2026", plants: 50000 }),
  ])
})

test("auto fill spills into the next row when one row is not enough", () => {
  const rows = groupExcessEntries(entries)
  const list = picksMapToList(autoFillPicks(rows, 116000), rows)
  expect(list.reduce((s, p) => s + p.plants, 0)).toBe(116000)
  expect(list.find((p) => p.batchId === "other").plants).toBe(1000)
})
