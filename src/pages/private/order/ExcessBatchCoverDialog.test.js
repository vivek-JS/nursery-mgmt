import React from "react"
import { render, screen } from "@testing-library/react"
import { NetworkManager } from "network/core"
import ExcessBatchCoverDialog, {
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

test("own sowing within tolerance skips the ±15 call and sends releaseOrderId", async () => {
  const request = jest.fn(async () => ({
    data: { success: true, data: { totalFree: 0, entries: [], ownSow: { withinTolerance: true } } },
  }))
  NetworkManager.mockReturnValue({ request })
  const res = await fetchExcessWithFallback({
    plantId: "p",
    subtypeId: "s",
    deliveryDate: "2026-11-10",
    need: 1500,
    releaseOrderId: "o1",
  })
  expect(request).toHaveBeenCalledTimes(1)
  expect(request.mock.calls[0][1]).toMatchObject({ releaseOrderId: "o1", windowDays: 5 })
  expect(res.preview.ownSow.withinTolerance).toBe(true)
})

test("no excess: new sowing message when there is time, else not-enough-time note", () => {
  const preview = { windowDays: 15, totalFree: 0, entries: [] }
  const { rerender } = render(
    <ExcessBatchCoverDialog
      open
      preview={{ ...preview, newSowingPossible: true }}
      need={1500}
      sowLabel="Change date only"
    />
  )
  expect(screen.getByText(/New sowing needs to be created/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Change date only" })).toBeInTheDocument()
  rerender(
    <ExcessBatchCoverDialog
      open
      preview={{ ...preview, newSowingPossible: false, plantReadyDays: 45, newSowingReadyBy: "30-11-2026" }}
      need={1500}
    />
  )
  expect(
    screen.getByText(/Not enough time for a new sowing — it needs 45 days \(earliest ready 30-11-2026\)/)
  ).toBeInTheDocument()
  expect(screen.queryByText(/cannot be changed to this date/)).not.toBeInTheDocument()
})

test("delivery change is blocked when excess is short and a new sowing is not possible", () => {
  render(
    <ExcessBatchCoverDialog
      open
      preview={{ windowDays: 15, totalFree: 400, entries: [], newSowingPossible: false, plantReadyDays: 45 }}
      need={1500}
      sowLabel="Change date only"
      blockWhenNoSowing
    />
  )
  expect(screen.getByText("Delivery date cannot be changed")).toBeInTheDocument()
  expect(screen.getByText(/cannot be changed to this date/)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Change date only" })).not.toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Pick another date" })).toBeInTheDocument()
})

test("suggested days: Use picks the day, days without a slot are disabled", () => {
  const onPickDate = jest.fn()
  render(
    <ExcessBatchCoverDialog
      open
      preview={{
        windowDays: 15,
        totalFree: 0,
        entries: [],
        newSowingPossible: false,
        suggestedDays: [
          { date: "2026-12-09", offsetDays: 19, freePlants: 1800, entryCount: 2 },
          { date: "2026-12-25", offsetDays: 35, freePlants: 2700, entryCount: 1 },
        ],
      }}
      need={1500}
      blockWhenNoSowing
      onPickDate={onPickDate}
      isDatePickable={(ymd) => ymd !== "2026-12-25"}
    />
  )
  expect(screen.getByText("Other days with enough excess")).toBeInTheDocument()
  const [first, second] = screen.getAllByRole("button", { name: "Use" })
  expect(second).toBeDisabled()
  first.click()
  expect(onPickDate).toHaveBeenCalledWith("2026-12-09")
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
