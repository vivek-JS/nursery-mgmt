import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import MonthOverviewPanel from "./MonthOverviewPanel"
import SlotLagwadMetrics from "./SlotLagwadMetrics"

jest.mock("network/core", () => ({
  API: {
    slots: {
      GET_SLOT_SECONDARY_SHED_BREAKDOWN: {},
      GET_SLOT_ORDER_DISPATCH_BY_BATCH: {},
      TRANSFER_EXPECTED_MORTALITY: {},
    },
  },
  NetworkManager: () => ({
    request: () => Promise.resolve({ data: { batches: [] } }),
  }),
}))

const summary = {
  totalAvailablePlants: 312285,
  totalExpectedInSlots: 434715,
  totalDeliveryThisMonth: 191614,
  totalDeliveryNative: 189114,
  totalDeliveryRolled: 196402,
  totalRemainingToDispatch: 88499,
  totalRemainingNative: 88499,
  totalRemainingRolled: 193902,
  totalAllDispatchedPlants: 103115,
  totalDispatchedNative: 100615,
  totalDispatchedRolled: 2500,
  totalDispatchedOther: 2500,
}

describe("slot metric Marathi definitions", () => {
  it("shows a Marathi definition on each month overview tile", () => {
    render(<MonthOverviewPanel summary={summary} sowingAllowed={false} />)

    fireEvent.click(screen.getByRole("button", { name: "Available for booking definition" }))
    expect(
      screen.getByText(/नवीन बुकिंगसाठी मोकळी असलेली एकूण रोपे/)
    ).toBeInTheDocument()
  })

  it("uses Actual, not Sow 90%, when the plant is not sowing-allowed", () => {
    render(
      <SlotLagwadMetrics
        slot={{ _id: "s1", sowingAllowed: true, actualPlants: 100, startDay: "01-09-2026", endDay: "07-09-2026" }}
        sowingAllowed={false}
        compact
      />
    )

    expect(screen.getByText("प्रत्यक्ष")).toBeInTheDocument()
    expect(screen.getByText("स्लॉटवर, पेरणी % नाही")).toBeInTheDocument()
    expect(screen.queryByText("Sow")).not.toBeInTheDocument()
    expect(screen.queryByText("90% sellable")).not.toBeInTheDocument()
    expect(screen.queryByText("९०% विक्रीयोग्य")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Actual definition" }))
    expect(
      screen.getByText(/९० टक्के विक्रीयोग्य आणि १० टक्के मृत्यू असा वेगळा हिशोब येथे नाही/)
    ).toBeInTheDocument()
  })
})
