import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import CompletedDeliveryViewDialog from "./CompletedDeliveryViewDialog"

const mockRequest = jest.fn()

jest.mock("network/core", () => ({
  API: { DISPATCHED: { GET_BY_ID: "get-by-id" } },
  NetworkManager: () => ({ request: mockRequest }),
}))

const dispatch = {
  _id: "d1",
  transportId: "T-77",
  driverName: "Ramesh",
  vehicleName: "Pickup",
  orderDispatchDetails: [{ orderId: "o1", dispatchQuantity: 1500 }],
  trip: { tripNumber: "TR-9", kmRun: 120, rent: 3000, otherCharges: 200, tripRemark: "Late unload" },
  orderIds: [
    {
      _id: "o1",
      orderId: 4148,
      orderStatus: "COMPLETED",
      farmer: { name: "Kiran", village: "Shirpur", mobileNumber: "9000000000" },
      plantType: { name: "Sow test" },
      plantSubtype: { name: "augest1" },
      numberOfPlants: 1500,
      additionalPlants: 0,
      returnedPlants: 100,
      damagedPlants: 20,
      returnReason: "Farmer refused 100",
      rate: 25,
      expectedNursery: "RB",
      freight: { totalAmount: 500, farmerShareAmount: 500, paidBy: "FARMER", remark: "Paid cash" },
      freightCharges: 500,
      deliveryCompleteBatch: { batchNumber: "B-12", pollyhouse: "Shed 3", source: "vehicle_load" },
      payment: [
        {
          _id: "p1",
          paidAmount: 30000,
          paymentStatus: "COLLECTED",
          modeOfPayment: "UPI",
          utrNumber: "UTR123",
          paymentDate: "2026-10-16T05:00:00.000Z",
          remark: "Advance",
        },
      ],
    },
  ],
}

describe("CompletedDeliveryViewDialog", () => {
  beforeEach(() => {
    mockRequest.mockReset()
    mockRequest.mockResolvedValue({ data: { data: dispatch } })
  })

  it("shows saved complete-form values as disabled fields", async () => {
    render(<CompletedDeliveryViewDialog open onClose={() => {}} dispatch={{ _id: "d1" }} />)

    expect(await screen.findByDisplayValue("Farmer refused 100")).toBeDisabled()
    expect(screen.getByDisplayValue("1,380")).toBeDisabled()
    expect(screen.getByDisplayValue("B-12")).toBeDisabled()
    expect(screen.getByDisplayValue("Shed 3")).toBeDisabled()
    expect(screen.getByDisplayValue("Late unload")).toBeDisabled()
    expect(screen.getByText("UTR123")).toBeInTheDocument()
    expect(mockRequest).toHaveBeenCalledWith({}, ["d1"])
  })

  it("prints with the trip remark prefilled and order remarks on the page", async () => {
    render(<CompletedDeliveryViewDialog open onClose={() => {}} dispatch={{ _id: "d1" }} />)
    await screen.findByDisplayValue("Farmer refused 100")

    fireEvent.click(screen.getByRole("button", { name: /print/i }))

    const remarkBox = await screen.findByPlaceholderText("Optional remark for this print")
    expect(remarkBox).toHaveValue("Late unload")
    expect(screen.getByText("परत कारण")).toBeInTheDocument()
    expect(screen.getByText("Paid cash")).toBeInTheDocument()

    fireEvent.change(remarkBox, { target: { value: "Checked by office" } })
    const printed = screen
      .getAllByText("Checked by office")
      .filter((el) => el.closest(".complete-invoice-page"))
    expect(printed).toHaveLength(1)
  })
})
