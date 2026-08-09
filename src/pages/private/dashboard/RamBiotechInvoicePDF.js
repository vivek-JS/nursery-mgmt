import { Dialog } from "@mui/material"
import React, { useMemo } from "react"
import {
  mapDispatchToRamInvoicePages,
  renderRamBiotechInvoiceBody,
} from "shared/dispatch-documents"

const BORDER = "#000000"
const ACCENT = "#16a34a"

const RamBiotechInvoicePDF = ({ open, onClose, dispatchData, aadharByOrderId = {} }) => {
  if (!dispatchData) return null

  const pages = useMemo(
    () => mapDispatchToRamInvoicePages(dispatchData, undefined, { aadharByOrderId }),
    [dispatchData, aadharByOrderId]
  )

  const invoiceHtml = useMemo(() => renderRamBiotechInvoiceBody(pages), [pages])

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice — ${dispatchData.transportId}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { margin: 0; padding: 0; background: white; }
            .invoice-page { page-break-after: always; }
            .invoice-page:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>${invoiceHtml}</body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 800)
  }

  const orderCount = pages.length || dispatchData.orderIds?.length || 0

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
          <span style={{ fontWeight: "600", fontSize: "15px", color: ACCENT }}>
            Invoice — {dispatchData.transportId}
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
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "#f3f4f6",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
              borderRadius: "4px",
              overflow: "hidden",
              transform: "scale(0.78)",
              transformOrigin: "top center",
              marginBottom: "-48px",
              maxWidth: "780px",
              width: "100%",
            }}
            dangerouslySetInnerHTML={{ __html: invoiceHtml }}
          />
          <div style={{ height: "10px" }} />
        </div>

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
            {orderCount} invoice{orderCount !== 1 ? "s" : ""} · A4
          </span>
          <button
            type="button"
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
            }}
          >
            Print Invoice
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default RamBiotechInvoicePDF
