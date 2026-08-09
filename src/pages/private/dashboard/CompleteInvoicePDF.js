import { Dialog } from "@mui/material"
import React from "react"
import {
  getPlantLineItemsFromOrder,
  plantLineItemsTotalAmount,
} from "./plantLineItemsDisplay"

const NAVY = "#000000"
const ACCENT = "#111111"
const BORDER = "#000000"

function resolveChallanInvoiceLabel(order, dispatchMongoId) {
  const official =
    order?.officialDeliveryChallanNumber ||
    order?.details?.officialDeliveryChallanNumber
  if (official) return String(official).trim()
  const edited = order?.deliveryChallanInvoiceNumber || order?.details?.deliveryChallanInvoiceNumber
  if (edited) return String(edited).trim()
  const history = order?.dispatchHistory || order?.details?.dispatchHistory || []
  const entry = history.find((h) => String(h?.dispatchId || "") === String(dispatchMongoId || ""))
  if (entry?.invoiceNumber) return String(entry.invoiceNumber).trim()
  return ""
}

function optionalManualDcSeparateFromOfficial(order) {
  const official = String(
    order?.officialDeliveryChallanNumber ?? order?.details?.officialDeliveryChallanNumber ?? ""
  ).trim()
  const manual = String(
    order?.deliveryChallanInvoiceNumber ?? order?.details?.deliveryChallanInvoiceNumber ?? ""
  ).trim()
  if (!official || !manual || manual === official) return ""
  return manual
}

function resolveOrderFreightCharges(order) {
  return Math.max(
    0,
    Number(order?.freightCharges ?? order?.details?.freightCharges ?? 0) || 0
  )
}

function getCollectedPayments(order) {
  const rows = Array.isArray(order?.payment) ? order.payment : Array.isArray(order?.details?.payment) ? order.details.payment : []
  return rows.filter((p) => p?.paymentStatus === "COLLECTED")
}

const CompleteInvoicePDF = ({ open, onClose, dispatchData }) => {
  if (!dispatchData) return null
  const orders = Array.isArray(dispatchData.orderIds) ? dispatchData.orderIds : []
  const today = new Date().toLocaleDateString("mr-IN")

  const pageCell = (extra = {}) => ({
    border: `1px solid ${BORDER}`,
    padding: "1.8mm 2.5mm",
    fontSize: "7.5pt",
    lineHeight: 1.3,
    ...extra,
  })

  const sectionHeader = {
    background: "#fff",
    color: "#000",
    padding: "1.8mm 3mm",
    fontSize: "7.5pt",
    fontWeight: "700",
    letterSpacing: "0.3px",
    borderBottom: `1px solid ${BORDER}`,
  }

  const CompleteInvoicePage = ({ order }) => {
    const orderDispatchDetails = Array.isArray(dispatchData?.orderDispatchDetails)
      ? dispatchData.orderDispatchDetails
      : []
    const dispatchDetail = orderDispatchDetails.find(
      (d) => String(d.orderId) === String(order._id)
    )
    const dispatchedQty = Number(dispatchDetail?.dispatchQuantity || 0)
    const rate = Number(order?.rate || order?.details?.rate || 0)
    const freight = resolveOrderFreightCharges(order)
    const plantLines = getPlantLineItemsFromOrder(order)
    const multiAmount = plantLineItemsTotalAmount(order)
    const plantAmount =
      multiAmount != null
        ? multiAmount
        : dispatchedQty * rate
    const gross = plantAmount + freight

    const returned = Number(order?.returnedPlants ?? order?.details?.returnedPlants ?? 0)
    const damaged = Number(order?.damagedPlants ?? order?.details?.damagedPlants ?? 0)
    const returnedAmount = returned * rate
    const damagedAmount = damaged * rate

    const collectedPayments = getCollectedPayments(order)
    const totalPaid = collectedPayments.reduce((sum, p) => sum + Number(p?.paidAmount || 0), 0)
    const netDue = Math.max(0, gross - returnedAmount - damagedAmount - totalPaid)

    const rawPlantName = order?.plantType?.name || order?.plantName?.name || "—"
    const plantSubtypeName = order?.plantSubtype?.name || ""
    const plantName =
      plantLines.length > 0
        ? plantLines.map((l) => l.label).join(", ")
        : plantSubtypeName
          ? `${rawPlantName} · ${plantSubtypeName}`
          : rawPlantName
    const dcNo = resolveChallanInvoiceLabel(order, dispatchData?._id)
    const optionalManualDc = optionalManualDcSeparateFromOfficial(order)
    const orderNum = order?.orderId != null ? String(order.orderId) : ""
    const legacyRef = [dispatchData?.transportId, orderNum && `Order #${orderNum}`]
      .filter(Boolean)
      .join(" · ")

    const totalQty =
      plantLines.length > 0
        ? plantLines.reduce((s, l) => s + l.qty, 0)
        : dispatchedQty || 0

    const infoRows = [
      ["चालक", dispatchData.driverName, "वाहन", dispatchData.vehicleName],
      [
        "शेतकरी",
        order?.farmer?.name || "N/A",
        "मोबाईल",
        order?.farmer?.mobileNumber || "N/A",
      ],
      [
        "गाव",
        order?.farmer?.village || "N/A",
        "ऑर्डर",
        orderNum || "—",
      ],
      ["रोप", plantName, "डिस्पॅच", totalQty],
    ]

    return (
      <div
        className="complete-invoice-page"
        style={{
          width: "148mm",
          minHeight: "210mm",
          boxSizing: "border-box",
          background: "#fff",
          fontFamily: "system-ui, -apple-system, Arial, sans-serif",
          pageBreakAfter: "always",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "3.5mm 5mm 3mm",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div>
            <div
              style={{
                color: "#000",
                fontSize: "12.5pt",
                fontWeight: "800",
                letterSpacing: "0.4px",
              }}
            >
              कंप्लीट इन्व्हॉईस
            </div>
            <div style={{ color: "#000", fontSize: "6.5pt", marginTop: "0.5mm" }}>
              COMPLETE INVOICE
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                background: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: "1.5mm",
                padding: "1mm 2.5mm",
                color: "#000",
                fontSize: "7.5pt",
                fontWeight: "700",
              }}
            >
              {dcNo || legacyRef || "—"}
            </div>
            {optionalManualDc ? (
              <div style={{ color: "#000", fontSize: "6.5pt", marginTop: "0.8mm", fontWeight: 600 }}>
                मॅन्युअल DC: {optionalManualDc}
              </div>
            ) : null}
            <div style={{ color: "#000", fontSize: "6.5pt", marginTop: "1mm" }}>
              तारीख: {today}
            </div>
          </div>
        </div>

        <div style={{ padding: "3.5mm 4.5mm", flex: 1, display: "flex", flexDirection: "column", gap: "3mm" }}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: "1.5mm", overflow: "hidden" }}>
            {infoRows.map(([l1, v1, l2, v2], i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22mm 1fr 22mm 1fr",
                  background: "#fff",
                  borderBottom: i < 3 ? `1px solid ${BORDER}` : "none",
                }}
              >
                {[l1, v1, l2, v2].map((txt, j) => (
                  <div
                    key={j}
                    style={{
                      ...pageCell(),
                      fontWeight: j % 2 === 0 ? "700" : "400",
                      color: j % 2 === 0 ? NAVY : "#1f2937",
                      background: "transparent",
                      border: "none",
                      borderLeft: j > 0 ? `1px solid ${BORDER}` : "none",
                    }}
                  >
                    {txt}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderRadius: "1.5mm", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <div style={sectionHeader}>रक्कम तपशील</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {plantLines.length > 0
                  ? plantLines.map((ln) => (
                      <tr key={ln.key} style={{ background: "#fff" }}>
                        <td
                          style={{
                            ...pageCell({ fontWeight: "700", color: "#000" }),
                            border: "none",
                            borderBottom: `1px solid ${BORDER}`,
                            width: "58%",
                          }}
                        >
                          {ln.label}
                        </td>
                        <td
                          style={{
                            ...pageCell({ textAlign: "right", fontWeight: "700", color: "#000" }),
                            border: "none",
                            borderLeft: `1px solid ${BORDER}`,
                            borderBottom: `1px solid ${BORDER}`,
                          }}
                        >
                          {ln.qty.toLocaleString()} × ₹{ln.rate.toLocaleString()} = ₹
                          {ln.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  : null}
                {[
                  ...(plantLines.length > 0
                    ? [
                        ["प्रमाण", `${totalQty} रोपे`],
                        ["रोप रक्कम", `₹${plantAmount.toLocaleString()}`],
                      ]
                    : [
                        ["डिस्पॅच प्रमाण", `${dispatchedQty} रोपे`],
                        ["दर", `₹${rate.toLocaleString()} / रोप`],
                        ["रोप रक्कम", `₹${plantAmount.toLocaleString()}`],
                      ]),
                  ...(freight > 0
                    ? [["वाहतूक / Freight", `₹${freight.toLocaleString()}`]]
                    : []),
                  ["ग्रॉस", `₹${gross.toLocaleString()}`],
                  ["परत (रक्कम)", `-${returned} / -₹${returnedAmount.toLocaleString()}`],
                  ["डॅमेज (रक्कम)", `-${damaged} / -₹${damagedAmount.toLocaleString()}`],
                  ["एकूण भरलेले", `₹${totalPaid.toLocaleString()}`],
                ].map(([label, value]) => (
                  <tr key={label} style={{ background: "#fff" }}>
                    <td
                      style={{
                        ...pageCell({ fontWeight: "700", color: "#000" }),
                        border: "none",
                        borderBottom: `1px solid ${BORDER}`,
                        width: "58%",
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        ...pageCell({ textAlign: "right", fontWeight: "700", color: "#000" }),
                        border: "none",
                        borderLeft: `1px solid ${BORDER}`,
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#fff" }}>
                  <td
                    style={{
                      ...pageCell({ fontWeight: "700", color: "#000" }),
                      border: "none",
                    }}
                  >
                    उर्वरित रक्कम
                  </td>
                  <td
                    style={{
                      ...pageCell({ textAlign: "right", fontWeight: "700", color: "#000" }),
                      border: "none",
                      borderLeft: `1px solid ${BORDER}`,
                    }}
                  >
                    ₹{netDue.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ borderRadius: "1.5mm", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <div style={sectionHeader}>पेमेंट (Collected)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff" }}>
                  {["तारीख", "पद्धत", "रक्कम"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        ...pageCell({ fontWeight: "700", color: "#000" }),
                        textAlign: i === 2 ? "right" : "left",
                        border: "none",
                        borderLeft: i > 0 ? `1px solid ${BORDER}` : "none",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collectedPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        ...pageCell({ textAlign: "center", color: "#9ca3af" }),
                        border: "none",
                      }}
                    >
                      कोणतेही collected पेमेंट नाही
                    </td>
                  </tr>
                ) : (
                  collectedPayments.map((p, idx) => (
                    <tr key={idx} style={{ background: "#fff" }}>
                      {[
                        p?.paymentDate ? new Date(p.paymentDate).toLocaleDateString("mr-IN") : "N/A",
                        p?.modeOfPayment || "N/A",
                        `₹${Number(p?.paidAmount || 0).toLocaleString()}`,
                      ].map((value, i) => (
                        <td
                          key={i}
                          style={{
                            ...pageCell(),
                            textAlign: i === 2 ? "right" : "left",
                            border: "none",
                            borderLeft: i > 0 ? `1px solid ${BORDER}` : "none",
                            borderBottom:
                              idx < collectedPayments.length - 1 ? `1px solid ${BORDER}` : "none",
                          }}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    const pages = Array.from(document?.querySelectorAll?.(".complete-invoice-page") || [])
    const html = pages.map((page) => page.outerHTML).join("")
    if (!html) {
      printWindow.close()
      return
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Complete Invoice - ${dispatchData.transportId || ""}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; font-family: Arial, sans-serif; background: #fff; }
            .complete-invoice-page { page-break-after: always; }
            .complete-invoice-page:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 600)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <div className="bg-white max-h-[92vh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">Complete Invoice</div>
            <div className="text-xs text-gray-500">
              Transport {dispatchData.transportId || "—"} • includes damaged + payment details
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto bg-gray-100 p-4 space-y-4">
          {orders.map((order, idx) => (
            <div
              key={String(order?._id || idx)}
              style={{
                boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
                borderRadius: "2mm",
                overflow: "hidden",
                transform: "scale(0.82)",
                transformOrigin: "top center",
                marginBottom: "-36px",
              }}
            >
              <CompleteInvoicePage order={order} />
            </div>
          ))}
        </div>

        <div className="border-t bg-white px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Close
          </button>
          <button
            onClick={handlePrint}
            style={{
              background: ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            Print Complete Invoice
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default CompleteInvoicePDF
