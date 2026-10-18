import { NetworkManager, API } from "network/core"
import { renderFreightSlipDocument } from "shared/dispatch-documents"

/**
 * Prints the 80mm freight slip through a hidden iframe (no popup, so it also works
 * right after an async save). `stage` = "tentative" | "final" (default: latest).
 */
export function printFreightSlip(slip, stage) {
  if (!slip || typeof document === "undefined") return false
  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" })
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(renderFreightSlipDocument(slip, { stage }))
  doc.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(() => iframe.remove(), 1000)
  }, 250)
  return true
}

/** Loads the slip for a dispatch; returns null when none exists yet. */
export async function fetchFreightSlip(dispatchId) {
  const res = await NetworkManager(API.FREIGHT_SLIP.GET_BY_DISPATCH).request({}, { pathParams: [String(dispatchId)] })
  return res?.data?.data?.slip || null
}
