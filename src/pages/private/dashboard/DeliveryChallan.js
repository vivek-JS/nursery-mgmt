import { Dialog } from "@mui/material"
import React, { useMemo } from "react"
import {
  mapDispatchToChallanPages,
  renderDeliveryChallanBody,
} from "shared/dispatch-documents"

const BORDER = "#000000"
const ACCENT = "#111111"

const DeliveryChallanPDF = ({ open, onClose, dispatchData }) => {
  if (!dispatchData) return null
  const agriLoadBlocked = Boolean(dispatchData?.agriLoadBlocked)

  const pages = useMemo(
    () => mapDispatchToChallanPages(dispatchData),
    [dispatchData]
  )

  const challanHtml = useMemo(() => renderDeliveryChallanBody(pages), [pages])

  const handlePrint = () => {
    if (agriLoadBlocked) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

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
        <body>${challanHtml}</body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 800)
  }

  const orderCount = dispatchData.orderIds?.length || pages.length || 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ background: "#fff", display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
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
          <span style={{ fontWeight: "600", fontSize: "15px", color: "#000" }}>
            डिलिव्हरी चलन — {dispatchData.transportId}
          </span>
          <button
            type="button"
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

        {agriLoadBlocked ? (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              background: "#fff8e6",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <p style={{ fontSize: "15px", color: "#b45309", fontWeight: 700, margin: 0, textAlign: "center" }}>
              Linked Agri inputs must be marked loaded before this challan can print.
            </p>
          </div>
        ) : (
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
            <div
              style={{
                boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
                borderRadius: "2mm",
                overflow: "hidden",
                transform: "scale(0.82)",
                transformOrigin: "top center",
                marginBottom: "-36px",
                width: "148mm",
              }}
              dangerouslySetInnerHTML={{ __html: challanHtml }}
            />
            <div style={{ height: "10px" }} />
          </div>
        )}

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
          {agriLoadBlocked ? (
            <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 600 }}>
              Printing disabled until Agri load is cleared.
            </span>
          ) : (
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              {orderCount} चलन · A5 Portrait
            </span>
          )}
          <span style={{ flex: 1, minWidth: 8 }} />
          <button
            type="button"
            onClick={handlePrint}
            disabled={agriLoadBlocked}
            style={{
              background: agriLoadBlocked ? "#9ca3af" : ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: agriLoadBlocked ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            सर्व चलन प्रिंट करा
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default DeliveryChallanPDF
