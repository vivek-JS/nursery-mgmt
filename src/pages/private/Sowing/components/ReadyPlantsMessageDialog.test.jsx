import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import ReadyPlantsMessageDialog from "./ReadyPlantsMessageDialog"

jest.mock("network/core", () => ({ API: { sowing: {} }, NetworkManager: () => ({ request: jest.fn() }) }))
jest.mock("helpers/toasts/toastHelper", () => ({ Toast: { success: jest.fn(), error: jest.fn() } }))

const rows = [
  {
    plantName: "Watermelon",
    subtypeName: "Impact",
    slotDays: 1,
    stock: { inShed: 0, readyNow: 0, batches: [] },
    current: { startDay: "16-10-2026", endDay: "16-10-2026", ready: 16000, net: 2000 },
    upcoming: [{ startDay: "26-10-2026", endDay: "26-10-2026", ready: 17600, net: 17600 }],
  },
  {
    plantName: "Papaya",
    subtypeName: "Vikrum-77",
    slotDays: 7,
    stock: { inShed: 4000, readyNow: 4000, batches: [] },
    current: { startDay: "12-10-2026", endDay: "18-10-2026", ready: 3300, net: 0 },
    upcoming: [],
  },
]

test("previews the message, filters crops and shares on WhatsApp", async () => {
  const open = jest.spyOn(window, "open").mockImplementation(() => null)
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } })
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true })

  render(<ReadyPlantsMessageDialog open onClose={() => {}} rows={rows} today="2026-10-16" />)

  expect(screen.getByText("टरबूज तयार होणारी रोपे")).toBeInTheDocument()
  expect(screen.getByText("१६/१० इम्पॅक्ट 16000")).toBeInTheDocument()
  expect(screen.getByText("विक्रम 77 पपई तयार होणारी रोपे")).toBeInTheDocument()
  expect(screen.getByText("रेडी मध्ये = 4000 रोपे")).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: "Free to sell" }))
  expect(screen.getByText("१६/१० इम्पॅक्ट 2000")).toBeInTheDocument()

  fireEvent.click(screen.getByRole("checkbox", { name: /Papaya/ }))
  expect(screen.queryByText("विक्रम 77 पपई तयार होणारी रोपे")).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: "Copy message" }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
  expect(navigator.clipboard.writeText.mock.calls[0][0]).toContain("*टरबूज तयार होणारी रोपे*")

  fireEvent.click(screen.getByRole("button", { name: "Share on WhatsApp" }))
  expect(open.mock.calls[0][0]).toMatch(/^https:\/\/wa\.me\/\?text=/)
  expect(decodeURIComponent(open.mock.calls[0][0].split("text=")[1])).not.toContain("पपई")
  open.mockRestore()
})
