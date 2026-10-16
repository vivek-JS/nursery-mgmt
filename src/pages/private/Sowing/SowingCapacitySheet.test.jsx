import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import SowingCapacitySheet from "./SowingCapacitySheet"

const mockRequest = jest.fn()

jest.mock("network/core", () => ({
  API: { sowing: { GET_CAPACITY_BOARD: "board" } },
  NetworkManager: () => ({ request: mockRequest }),
}))
jest.mock("./components/SowingShedStockTab", () => function ShedTab() {
  return <div>shed tab</div>
})
jest.mock("./components/SowingCapacityAsk", () => function Ask() {
  return null
})
jest.mock("./components/SowingCapacityDrawer", () => function Drawer({ detail }) {
  return detail ? <div data-testid="drawer">{detail.slotIds.join(",")}</div> : null
})

const slot = (slotId, startDay, endDay, ready, booked, gap = 0) => ({
  slotId,
  startDay,
  endDay,
  ready,
  booked,
  net: ready - booked,
  gap,
})

const rows = [
  {
    plantId: "p1",
    plantName: "Papaya",
    subtypeId: "s1",
    subtypeName: "Taiwan 786",
    slotDays: 7,
    stock: {
      inShed: 8200,
      readyNow: 5200,
      batches: [{ shed: "Shed A-1", batchNumber: "B1", inShed: 5200, readyNow: 5200, lagwadDate: null, readyDate: null }],
    },
    current: {
      ...slot("cur", "12-10-2026", "18-10-2026", 11100, 12300, 2000),
      own: {},
      overdue: { booked: 5100, ready: 4000, net: -1100, gap: 1100, unsold: 0, slotIds: ["old"] },
      slotIds: ["cur", "old"],
    },
    upcoming: [slot("n1", "19-10-2026", "25-10-2026", 6500, 5000)],
    cells: [{ key: "2026-10-19", ...slot("n1", "19-10-2026", "25-10-2026", 6500, 5000), slotIds: ["n1"] }],
    totals: { ready: 17600 },
  },
  {
    plantId: "p2",
    plantName: "Chilli",
    subtypeId: "s2",
    subtypeName: "Teja 4",
    slotDays: 1,
    stock: { inShed: 0, readyNow: 0, batches: [] },
    current: {
      ...slot("d0", "16-10-2026", "16-10-2026", 300, 200),
      own: {},
      overdue: { booked: 0, ready: 0, net: 0, gap: 0, unsold: 0, slotIds: [] },
      slotIds: ["d0"],
    },
    upcoming: [slot("d1", "17-10-2026", "17-10-2026", 900, 0), slot("d4", "20-10-2026", "20-10-2026", 400, 0)],
    cells: [
      { key: "2026-10-17", ...slot("d1", "17-10-2026", "17-10-2026", 900, 0), slotIds: ["d1"] },
      { key: "2026-10-20", ...slot("d4", "20-10-2026", "20-10-2026", 400, 0), slotIds: ["d4"] },
    ],
    totals: { ready: 1600 },
  },
  {
    plantId: "p3",
    plantName: "Banana",
    subtypeId: "s3",
    subtypeName: "G9",
    slotDays: 0,
    sowingAllowed: false,
    stock: {
      inShed: 1729,
      readyNow: 1500,
      batches: [
        { shed: "Shed 2", batchNumber: "B7", inShed: 1729, readyNow: 1500, notReady: 229, lagwadDate: null, readyDate: null, nextReadyDate: null },
      ],
    },
    current: {},
    upcoming: [],
    totals: { ready: 0 },
  },
]

beforeEach(() => {
  mockRequest.mockResolvedValue({
    data: { success: true, today: "2026-10-16", overdueLookbackDays: 30, generatedAt: "2026-10-16T10:00:00Z", rows },
  })
})

test("shows one tab per slot length and the 1-day board first", async () => {
  render(
    <MemoryRouter initialEntries={["/u/sowing-capacity"]}>
      <SowingCapacitySheet />
    </MemoryRouter>
  )
  expect(await screen.findByText("Teja 4")).toBeInTheDocument()
  expect(screen.getByText("Chilli")).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /1-Day slots \(1\)/ })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /7-Day slots \(1\)/ })).toBeInTheDocument()
  expect(screen.queryByText("Taiwan 786")).not.toBeInTheDocument()
  const cards = screen.getAllByTestId("date-card").map((card) => card.textContent)
  expect(cards).toEqual([
    "Now · 16 Oct100free300 ready · 200 booked",
    "17 OctSat900free900 ready · 0 booked",
    "20 OctTue400free400 ready · 0 booked",
  ])
  expect(screen.getByRole("columnheader", { name: /Total free/ })).toBeInTheDocument()
  expect(mockRequest).toHaveBeenCalledWith({}, { group: 1 })
})

test("3 / 6 day groups and custom days ask the API with group=N", async () => {
  render(
    <MemoryRouter initialEntries={["/u/sowing-capacity"]}>
      <SowingCapacitySheet />
    </MemoryRouter>
  )
  fireEvent.click(await screen.findByRole("button", { name: "3 days" }))
  await waitFor(() => expect(mockRequest).toHaveBeenLastCalledWith({}, { group: 3 }))
  fireEvent.click(await screen.findByRole("button", { name: "6 days" }))
  await waitFor(() => expect(mockRequest).toHaveBeenLastCalledWith({}, { group: 6 }))

  fireEvent.click(await screen.findByRole("button", { name: "Custom" }))
  const input = await screen.findByRole("spinbutton", { name: "Custom days" })
  fireEvent.change(input, { target: { value: "10" } })
  fireEvent.keyDown(input, { key: "Enter" })
  await waitFor(() => expect(mockRequest).toHaveBeenLastCalledWith({}, { group: 10 }))
  expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true")
})

test("custom days from the URL open the custom input", async () => {
  render(
    <MemoryRouter initialEntries={["/u/sowing-capacity?group=12"]}>
      <SowingCapacitySheet />
    </MemoryRouter>
  )
  expect(await screen.findByRole("spinbutton", { name: "Custom days" })).toHaveValue(12)
  expect(mockRequest).toHaveBeenCalledWith({}, { group: 12 })
})

test("crops without sowing get a batch-wise shed stock tab", async () => {
  render(
    <MemoryRouter initialEntries={["/u/sowing-capacity?tab=0d"]}>
      <SowingCapacitySheet />
    </MemoryRouter>
  )
  expect(await screen.findByText("Banana – G9")).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: /Shed stock only \(1\)/ })).toBeInTheDocument()
  expect(screen.getByText("Sowing not required")).toBeInTheDocument()
  expect(screen.getByText("Shed 2")).toBeInTheDocument()
  expect(screen.getAllByText("229")).toHaveLength(3)
  expect(screen.queryByText("Taiwan 786")).not.toBeInTheDocument()
})

test("excess shows only free dates; gap toggle shows only short ones", async () => {
  render(
    <MemoryRouter initialEntries={["/u/sowing-capacity?tab=7d"]}>
      <SowingCapacitySheet />
    </MemoryRouter>
  )
  await screen.findByText("Taiwan 786")
  expect(screen.getAllByTestId("date-card").map((card) => card.textContent)).toEqual([
    "19–25 Oct7 days1,500free6,500 ready · 5,000 booked",
  ])
  fireEvent.click(screen.getByRole("button", { name: "Gap (short)" }))
  expect(screen.getAllByTestId("date-card").map((card) => card.textContent)).toEqual([
    "Now · 12–18 Oct1,200short11,100 ready · 12,300 bookedincl. 5,100 overdue",
  ])
  expect(screen.getByRole("columnheader", { name: /Total short/ })).toBeInTheDocument()
})

test("7-day gap board folds overdue into now, expands sheds and opens orders", async () => {
  render(
    <MemoryRouter initialEntries={["/u/sowing-capacity?tab=7d&show=gap"]}>
      <SowingCapacitySheet />
    </MemoryRouter>
  )
  const name = await screen.findByText("Taiwan 786")
  expect(screen.getByText("Papaya")).toBeInTheDocument()
  expect(screen.getByText("incl. 5,100 overdue")).toBeInTheDocument()
  expect(screen.getByText("Now · 12–18 Oct")).toBeInTheDocument()
  expect(screen.getByText("5,200 ready now")).toBeInTheDocument()

  fireEvent.click(name)
  expect(screen.getByText("Shed A-1")).toBeInTheDocument()

  fireEvent.click(screen.getByText("incl. 5,100 overdue"))
  expect(within(screen.getByTestId("drawer")).getByText("cur,old")).toBeInTheDocument()
})
