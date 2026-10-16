import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import SowingCapacityAsk, { replyFocus } from "./SowingCapacityAsk"

const mockRequest = jest.fn()

jest.mock("network/core", () => ({
  API: { sowing: { ASK_CAPACITY: "ask" }, LOCATION: { GET_CASCADING_LOCATION: "loc" } },
  NetworkManager: (route) => ({ request: (body) => mockRequest(route, body) }),
}))

const taiwan = {
  crop: "Papaya",
  variety: "Taiwan",
  slotDays: 7,
  sowingRequired: true,
  urgent: true,
  stock: { inShed: 8200, readyNow: 5200, batches: 2 },
  now: { slot: "12-10-2026 to 18-10-2026", ready: 11100, booked: 12300, net: -1200, overdueBooked: 5100, unsoldFromPast: 0 },
  next: [{ slot: "19-10-2026 to 25-10-2026", ready: 6500, booked: 5000, net: 1500 }],
}

const reply = (advice) => ({
  data: {
    success: true,
    model: "test-model",
    context: null,
    advice: { plants: [{ plant: "Papaya", action: "sow_first", canBook: -1200, subtypes: [] }], ...advice },
  },
})

beforeEach(() => {
  mockRequest.mockReset()
  mockRequest.mockImplementation((route, body) => {
    if (route === "loc") return Promise.resolve({ data: { status: "success", data: { districts: [] } } })
    if (/overdue/.test(body.question)) {
      return Promise.resolve(
        reply({ answer: "Papaya – Taiwan: 1,200 short, incl. 5,100 overdue", answerSource: "ai", answerRows: [taiwan] })
      )
    }
    if (/Shed stock/.test(body.question)) {
      return Promise.resolve(
        reply({
          answer: "Papaya – Taiwan: 8,200 in shed",
          answerSource: "sheet",
          answerTitle: "8,200 plants in sheds",
          answerRows: [taiwan],
          answerStockOnly: true,
          answerMore: 2,
        })
      )
    }
    return Promise.resolve(reply({ answer: "" }))
  })
})

test("focus picks lanes for sow/book questions and the answer alone otherwise", () => {
  expect(replyFocus("anything", { intro: true, hasAnswer: true })).toBe("all")
  expect(replyFocus("What should we sow first?", { hasAnswer: true })).toBe("sow")
  expect(replyFocus("कोणते बुक करू?", { hasAnswer: true })).toBe("book")
  expect(replyFocus("Banana stock?", { hasAnswer: true })).toBe("none")
  expect(replyFocus("Banana stock?", { hasAnswer: false })).toBe("all")
})

test("a suggested question shows the AI answer with the variety in bold", async () => {
  render(<SowingCapacityAsk from="2026-10-16" to="2026-11-15" />)
  fireEvent.click(screen.getByRole("button", { name: /Ask AI/ }))
  fireEvent.click(await screen.findByRole("button", { name: "What is overdue or short now?" }))

  expect(await screen.findByText("Papaya – Taiwan:")).toBeInTheDocument()
  expect(screen.getByText(/1,200 short, incl\. 5,100 overdue/)).toBeInTheDocument()
  expect(screen.getByText("AI · from our board")).toBeInTheDocument()
  expect(screen.getAllByText(/Sow this before the next order/)).toHaveLength(1)
  expect(mockRequest).toHaveBeenLastCalledWith("ask", expect.objectContaining({ question: "What is overdue or short now?" }))

  expect(screen.getByText("Papaya – Taiwan")).toBeInTheDocument()
  expect(screen.getByText("NOW · 12–18 Oct")).toBeInTheDocument()
  expect(screen.getByText("1,200 short")).toBeInTheDocument()
  expect(screen.getByText("5,100 overdue")).toBeInTheDocument()
  expect(screen.getByText("19–25 Oct")).toBeInTheDocument()
  expect(screen.getByText("1,500 free")).toBeInTheDocument()
})

test("a board answer shows its title and stock-only cards", async () => {
  render(<SowingCapacityAsk from="2026-10-16" to="2026-11-15" />)
  fireEvent.click(screen.getByRole("button", { name: /Ask AI/ }))
  fireEvent.click(await screen.findByRole("button", { name: "Shed stock and banana" }))

  expect(await screen.findByText("8,200 plants in sheds")).toBeInTheDocument()
  expect(screen.getByText("From our board")).toBeInTheDocument()
  expect(screen.getByText("5,200 ready now")).toBeInTheDocument()
  expect(screen.queryByText(/NOW ·/)).not.toBeInTheDocument()
  expect(screen.queryByText("Papaya – Taiwan: 8,200 in shed")).not.toBeInTheDocument()
  expect(screen.getByText("+ 2 more on the board")).toBeInTheDocument()
})
