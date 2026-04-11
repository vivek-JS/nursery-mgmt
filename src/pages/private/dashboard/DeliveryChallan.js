import { Dialog } from "@mui/material"
import React from "react"

const NAVY = "#000000"
const ACCENT = "#111111"
const BORDER = "#000000"

const cell = (extra = {}) => ({
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

const DeliveryChallanPDF = ({ open, onClose, dispatchData }) => {
  if (!dispatchData) return null
  const today = new Date().toLocaleDateString("mr-IN")

  const DeliveryChallanPage = ({ order }) => {
    const plantDetailsList = Array.isArray(dispatchData?.plantsDetails)
      ? dispatchData.plantsDetails
      : []
    const orderPlantName = order?.plantDetails?.name?.toLowerCase()

    const plant = (() => {
      if (!plantDetailsList.length) return null
      if (!orderPlantName) return plantDetailsList[0]
      return (
        plantDetailsList.find((p) =>
          p?.name?.toLowerCase().includes(orderPlantName)
        ) || plantDetailsList[0]
      )
    })()

    const orderDispatchDetails = Array.isArray(dispatchData?.orderDispatchDetails)
      ? dispatchData.orderDispatchDetails
      : []
    const dispatchDetail = orderDispatchDetails.find(
      (d) => String(d.orderId) === String(order._id)
    )
    const dispatchQty = dispatchDetail?.dispatchQuantity ?? order.quantity
    const orderCrates =
      Array.isArray(dispatchDetail?.crates) && dispatchDetail.crates.length > 0
        ? dispatchDetail.crates
        : Array.isArray(plant?.crates)
        ? plant.crates
        : []

    const paymentEntries = Array.isArray(order?.details?.payment)
      ? order.details.payment
      : []
    const totalPaid = paymentEntries.reduce((s, p) => s + (p?.paidAmount || 0), 0)
    const dispatchTotal = dispatchQty * (order.rate || 0)
    const remaining = Math.max(0, dispatchTotal - totalPaid)
    const plantName = plant?.name?.replace(/\s*-\s*>\s*/g, " ").trim() || "—"

    const infoRows = [
      ["चालक", dispatchData.driverName, "वाहन", dispatchData.vehicleName],
      [
        "शेतकरी",
        order.details?.farmer?.name || "N/A",
        "मोबाईल",
        order.details?.farmer?.mobileNumber || "N/A",
      ],
      [
        "गाव",
        order.details?.farmer?.village || "N/A",
        "वितरण",
        order.Delivery || "निर्दिष्ट नाही",
      ],
      ["रोप", plantName, "प्रमाण", dispatchQty],
    ]

    return (
      <div
        className="challan-page"
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
        {/* ── Header bar ─────────────────────────────── */}
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
                fontSize: "13pt",
                fontWeight: "800",
                letterSpacing: "0.5px",
              }}
            >
              डिलिव्हरी चलन
            </div>
            <div style={{ color: "#000", fontSize: "6.5pt", marginTop: "0.5mm" }}>
              DELIVERY CHALLAN
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
              #{dispatchData.transportId}-{order.order}
            </div>
            <div style={{ color: "#000", fontSize: "6.5pt", marginTop: "1mm" }}>
              तारीख: {today}
            </div>
          </div>
        </div>

        {/* ── Body padding ───────────────────────────── */}
        <div style={{ padding: "3.5mm 4.5mm", flex: 1, display: "flex", flexDirection: "column", gap: "3mm" }}>

          {/* ── Info grid ──────────────────────────── */}
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
                      ...cell(),
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

          {/* ── Crate details + Order summary (50/50) ───────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: orderCrates.length > 0 ? "1fr 1fr" : "1fr",
              gap: "2mm",
            }}
          >
            {orderCrates.length > 0 && (
              <div style={{ borderRadius: "1.5mm", overflow: "hidden", border: `1px solid ${BORDER}` }}>
                <div style={sectionHeader}>कॅव्हिटी व क्रेट तपशील</div>
                <div
                  style={{
                    padding: "2mm",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2mm",
                    background: "#fff",
                  }}
                >
                  {orderCrates.map((crate, ci) => {
                    const hasDetails =
                      Array.isArray(crate.crateDetails) && crate.crateDetails.length > 0
                    const totalCrates = hasDetails
                      ? crate.crateDetails.reduce((s, cd) => s + (cd.crateCount || 0), 0)
                      : crate.crateCount || 0
                    const totalPlants = hasDetails
                      ? crate.crateDetails.reduce((s, cd) => s + (cd.plantCount || 0), 0)
                      : crate.plantCount || 0
                    return (
                      <div
                        key={ci}
                        style={{
                          border: `1px solid ${BORDER}`,
                          borderRadius: "1mm",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            background: "#fff",
                            color: "#000",
                            fontSize: "8pt",
                            fontWeight: "700",
                            textAlign: "center",
                            padding: "1mm 2mm",
                            borderBottom: `1px solid ${BORDER}`,
                          }}
                        >
                          {crate.cavityName}
                        </div>
                        {hasDetails &&
                          crate.crateDetails.map((cd, di) => (
                            <div
                              key={di}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "0.8mm 2mm",
                                fontSize: "8.5pt",
                                fontWeight: "700",
                                background: "#fff",
                                borderBottom:
                                  di < crate.crateDetails.length - 1
                                    ? `1px dotted ${BORDER}`
                                    : "none",
                              }}
                            >
                              <span>{cd.crateCount || 0} क्रेट</span>
                              <span>{cd.plantCount || 0} रोपे</span>
                            </div>
                          ))}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "1mm 2mm",
                            background: "#fff",
                            color: "#000",
                            fontSize: "9pt",
                            fontWeight: "700",
                            borderTop: `1px solid ${BORDER}`,
                          }}
                        >
                          <span>{totalCrates} क्रेट</span>
                          <span>{totalPlants} रोपे</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ borderRadius: "1.5mm", overflow: "hidden", border: `1px solid ${BORDER}` }}>
              <div style={sectionHeader}>ऑर्डर सारांश</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff" }}>
                {[
                  ["वर्णन", plantName],
                  ["प्रमाण", dispatchQty],
                  ["दर", `₹${order.rate}`],
                  ["रक्कम", `₹${dispatchTotal.toLocaleString()}`],
                ].map(([label, value]) => (
                  <React.Fragment key={label}>
                    <div
                      style={{
                        ...cell({ fontWeight: "700", color: "#000", background: "#fff" }),
                        border: "none",
                        borderRight: `1px solid ${BORDER}`,
                        borderBottom: `1px solid ${BORDER}`,
                        textAlign: "left",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        ...cell({ fontWeight: "700", color: "#000", background: "#fff" }),
                        border: "none",
                        borderBottom: `1px solid ${BORDER}`,
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* ── Payment details ────────────────────── */}
          <div style={{ borderRadius: "1.5mm", overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <div style={sectionHeader}>पेमेंट तपशील</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fff" }}>
                  {["तारीख", "पद्धत", "रक्कम"].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        ...cell({ fontWeight: "700", color: "#000" }),
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
                {paymentEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        ...cell({ textAlign: "center", color: "#9ca3af" }),
                        border: "none",
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      कोणतेही पेमेंट नाही
                    </td>
                  </tr>
                )}
                {paymentEntries.map((p, idx) => (
                  <tr key={idx} style={{ background: "#fff" }}>
                    {[
                      {
                        v: p?.paymentDate
                          ? new Date(p.paymentDate).toLocaleDateString("mr-IN")
                          : "N/A",
                        align: "left",
                      },
                      { v: p?.modeOfPayment || "N/A", align: "left" },
                      { v: `₹${(p?.paidAmount || 0).toLocaleString()}`, align: "right" },
                    ].map(({ v, align }, i) => (
                      <td
                        key={i}
                        style={{
                          ...cell(),
                          textAlign: align,
                          border: "none",
                          borderLeft: i > 0 ? `1px solid ${BORDER}` : "none",
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {[
                  { label: "एकूण भरलेली रक्कम", value: totalPaid, bg: "#fff", bold: false },
                  { label: "एकूण रक्कम", value: dispatchTotal, bg: "#fff", bold: false },
                  {
                    label: "उर्वरित रक्कम",
                    value: remaining,
                    bg: "#fff",
                    bold: true,
                  },
                ].map(({ label, value, bg, bold }, i) => (
                  <tr key={i} style={{ background: bg }}>
                    <td
                      colSpan={2}
                      style={{
                        ...cell({ fontWeight: bold ? "700" : "600", color: "#000" }),
                        border: "none",
                        borderTop: `1px solid ${BORDER}`,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        ...cell({
                          textAlign: "right",
                          fontWeight: bold ? "700" : "600",
                          color: "#000",
                        }),
                        border: "none",
                        borderTop: `1px solid ${BORDER}`,
                        borderLeft: `1px solid ${BORDER}`,
                      }}
                    >
                      ₹{value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: "auto" }} />
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const challanElements = Array.from(
      document?.querySelectorAll?.(".challan-page") ?? []
    )
    const orderIds = dispatchData.orderIds || []

    const challanContents = orderIds
      .map((_, index) => {
        const html = challanElements[index]?.outerHTML
        return html || null
      })
      .filter(Boolean)
      .join("")

    if (!challanContents) {
      printWindow.close()
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challans — ${dispatchData.transportId}</title>
          <style>
            @page { size: A5 portrait; margin: 0; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { margin: 0; padding: 0; background: white; }
            .challan-page { width: 148mm; min-height: 210mm; page-break-after: always; }
            .challan-page:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>${challanContents}</body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 800)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ background: "#fff", display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
        {/* Dialog header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            borderBottom: `1px solid ${BORDER}`,
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
          <span style={{ fontWeight: "600", fontSize: "15px", color: NAVY }}>
            डिलिव्हरी चलन — {dispatchData.transportId}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              padding: "4px",
              lineHeight: 1,
            }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#e9edf2",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {dispatchData.orderIds?.map((order, index) => (
            <div
              key={index}
              style={{
                boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
                borderRadius: "2mm",
                overflow: "hidden",
                transform: "scale(0.82)",
                transformOrigin: "top center",
                marginBottom: "-36px",
              }}
            >
              <DeliveryChallanPage order={order} />
            </div>
          ))}
          <div style={{ height: "10px" }} />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 18px",
            borderTop: `1px solid ${BORDER}`,
            background: "#fff",
          }}
        >
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            {dispatchData.orderIds?.length || 0} चलन · A5 Portrait
          </span>
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
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            सर्व चलन प्रिंट करा
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default DeliveryChallanPDF
