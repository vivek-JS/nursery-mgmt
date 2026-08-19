import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import LagwadCharts from "../LagwadCharts"

// Recharts measures its container, which jsdom reports as 0x0 and cannot observe.
beforeAll(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 800
  })
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 340
  })
})

const slots = [
  {
    _id: "a",
    label: "01-08-2026 – 10-08-2026",
    month: "August",
    windowState: "expired",
    actualPlants: 9000,
    expectedMortality: 1000,
    actualReadyPlants: 9000,
    remainingToDispatch: 4000,
    readyGap: 0
  },
  {
    _id: "b",
    label: "11-08-2026 – 20-08-2026",
    month: "August",
    windowState: "current",
    actualPlants: 18000,
    expectedMortality: 2000,
    actualReadyPlants: 5000,
    remainingToDispatch: 22000,
    readyGap: 17000
  },
  {
    _id: "c",
    label: "01-09-2026 – 10-09-2026",
    month: "September",
    windowState: "upcoming",
    actualPlants: 4500,
    expectedMortality: 500,
    actualReadyPlants: 0,
    remainingToDispatch: 3000,
    readyGap: 3000
  }
]

const totals = {
  sellablePool: 31500,
  expectedMortality: 3500,
  readyToDispatch: 14000,
  deliveryNeeded: 29000,
  readyGap: 15000,
  physicalGap: 0,
  readyCoveredByReady: 14000
}

describe("LagwadCharts", () => {
  it("renders the intersecting line chart and coverage charts", () => {
    render(<LagwadCharts slots={slots} totals={totals} />)

    expect(screen.getByText("Delivery · actual · ready · future need")).toBeInTheDocument()
    expect(screen.getByText("This month")).toBeInTheDocument()
    expect(screen.getByText("Running total")).toBeInTheDocument()
    expect(screen.getByText("Delivery coverage")).toBeInTheDocument()
    expect(screen.getByText("Lagwad split")).toBeInTheDocument()
  })

  it("names the month where delivery sits above ready", () => {
    render(<LagwadCharts slots={slots} totals={totals} />)
    // August: 26,000 owed against 14,000 ready.
    expect(screen.getByText("Ready crossed · Aug")).toBeInTheDocument()
  })

  it("reports full coverage when ready stays above delivery throughout", () => {
    const covered = slots.map((s) => ({ ...s, remainingToDispatch: 0, readyGap: 0 }))
    render(<LagwadCharts slots={covered} totals={{ ...totals, deliveryNeeded: 0 }} />)

    expect(screen.queryByText(/Ready crossed/)).not.toBeInTheDocument()
    expect(screen.getByText(/Ready covers delivery in every selected month/)).toBeInTheDocument()

    fireEvent.click(screen.getByText("Running total"))
    expect(
      screen.getByText(/Ready stays above delivery all the way through/)
    ).toBeInTheDocument()
  })

  it("shows the share of delivery that ready can cover", () => {
    render(<LagwadCharts slots={slots} totals={totals} />)
    // 14,000 loadable against 29,000 owed.
    expect(screen.getByText("48%")).toBeInTheDocument()
  })

  it("renders nothing when there are no slots", () => {
    const { container } = render(<LagwadCharts slots={[]} totals={totals} />)
    expect(container).toBeEmptyDOMElement()
  })
})
