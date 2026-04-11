import { Dialog } from "@mui/material"
import React, { useRef } from "react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

const CollectSlipPDF = ({ open, onClose, dispatchData }) => {
  const printRef = useRef()
  if (!dispatchData) return null

  const generatePDF = async () => {
    const element = printRef.current
    if (!element) return

    try {
      // Create canvas from HTML element - optimized for thermal printing
      const canvas = await html2canvas(element, {
        scale: 3, // Higher scale for better quality on thermal printers
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      })

      const imgData = canvas.toDataURL("image/png")

      // Thermal printer standard width: 80mm (most common) or 58mm
      // Using 80mm width for better readability
      const thermalWidth = 80 // mm
      const imgWidth = thermalWidth - 2 // Small margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Create PDF with custom dimensions for thermal printer
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [thermalWidth, imgHeight + 10] // Dynamic height based on content
      })

      // Add image to PDF (no centering needed, full width)
      pdf.addImage(imgData, "PNG", 1, 5, imgWidth, imgHeight)

      // Open PDF in new window
      window.open(pdf.output("bloburl"), "_blank")
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  const totalPlants = dispatchData?.plants?.reduce((sum, plant) => {
    return (
      sum +
      plant.crates?.reduce((plantSum, crate) => {
        if (crate.crateDetails && crate.crateDetails.length > 0) {
          return plantSum + crate.crateDetails.reduce((cdSum, cd) => cdSum + (cd.plantCount || 0), 0)
        }
        return plantSum + (crate.plantCount || crate.quantity || 0)
      }, 0)
    )
  }, 0) || 0

  const renderPlants = (scale) => {
    const fs = (n) => `${Math.round(n * scale)}px`
    return dispatchData?.plants?.map((plant, plantIndex) => {
      const cleanPlantName = plant.name?.replace(/&gt;/g, ">").replace(/\s*-\s*>\s*/g, "-")
      const cavityShades = new Map()
      plant.pickupDetails?.forEach((pickup) => {
        if (!cavityShades.has(pickup.cavityName)) cavityShades.set(pickup.cavityName, [])
        cavityShades.get(pickup.cavityName).push(pickup)
      })
      return (
        <div key={plantIndex} style={{ marginBottom: fs(8) }}>
          {/* Plant Name */}
          <div style={{ fontSize: fs(14), fontWeight: "900", border: "2px solid #000", padding: `${fs(3)} ${fs(6)}`, textAlign: "center", textTransform: "uppercase", marginBottom: fs(6), letterSpacing: "0.5px" }}>
            🌱 {cleanPlantName}
          </div>

          {plant.crates?.map((crate, crateIndex) => {
            const shades = cavityShades.get(crate.cavityName) || []
            let totalCrates = 0, totalPlantsCount = 0
            if (crate.crateDetails && crate.crateDetails.length > 0) {
              totalCrates = crate.crateDetails.reduce((s, cd) => s + (cd.crateCount || 0), 0)
              totalPlantsCount = crate.crateDetails.reduce((s, cd) => s + (cd.plantCount || 0), 0)
            } else {
              totalCrates = crate.crateCount || crate.numberOfCrates || 0
              totalPlantsCount = crate.plantCount || crate.quantity || 0
            }
            return (
              <div key={crateIndex} style={{ marginBottom: fs(8) }}>
                {/* Cavity — medium label */}
                <div style={{ fontSize: fs(11), fontWeight: "700", borderLeft: "3px solid #000", paddingLeft: fs(5), marginBottom: fs(4), color: "#000" }}>
                  कॅव्हिटी: {crate.cavityName}
                </div>

                {/* Shade rows — BIGGEST, most important */}
                {shades.length > 0 && (
                  <div style={{ marginBottom: fs(5), paddingLeft: fs(4) }}>
                    <div style={{ fontSize: fs(9), color: "#333", marginBottom: fs(2) }}>शेड माहिती:</div>
                    {shades.map((shade, si) => (
                      <div key={si} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: fs(16), fontWeight: "900", padding: `${fs(2)} 0`, borderBottom: si < shades.length - 1 ? "1px dotted #000" : "none" }}>
                        <span>{shade.shadeName || "-"}</span>
                        <span>{shade.quantity || 0} रोपे</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Crate rows — BIGGEST, most important */}
                <div style={{ paddingLeft: fs(4), marginBottom: fs(4) }}>
                  <div style={{ fontSize: fs(9), color: "#333", marginBottom: fs(2) }}>क्रेट माहिती:</div>
                  {crate.crateDetails && crate.crateDetails.length > 0 ? (
                    crate.crateDetails.map((cd, ci) => (
                      <div key={ci} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: fs(16), fontWeight: "900", padding: `${fs(2)} 0`, borderBottom: ci < crate.crateDetails.length - 1 ? "1px dotted #000" : "none" }}>
                        <span>क्रेट: {cd.crateCount || 0}</span>
                        <span>{cd.plantCount || 0} रोपे</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: fs(16), fontWeight: "900" }}>
                      <span>क्रेट: {totalCrates}</span>
                      <span>{totalPlantsCount} रोपे</span>
                    </div>
                  )}
                </div>

                {/* Cavity total — smaller summary line */}
                {crate.crateDetails && crate.crateDetails.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: fs(11), fontWeight: "700", borderTop: "1px solid #000", paddingTop: fs(3), paddingLeft: fs(4) }}>
                    <span>एकूण — क्रेट: {totalCrates}</span>
                    <span>रोपे: {totalPlantsCount}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* Modal Header */}
      <div style={{ background: "#1a1a1a", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg style={{ width: 20, height: 20 }} fill="none" stroke="#fff" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px", letterSpacing: "0.5px" }}>संग्रह पर्ची</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}>
          <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="#aaa">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Slip Preview */}
      <div style={{ background: "#e8e8e8", padding: "16px 12px", maxHeight: "72vh", overflowY: "auto" }}>
        <div style={{ background: "#fff", fontFamily: "'Courier New', Courier, monospace", color: "#000", padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", margin: "0 auto", maxWidth: "320px" }}>

          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "3px double #000", paddingBottom: "8px", marginBottom: "10px" }}>
            <div style={{ fontSize: "18px", fontWeight: "900", letterSpacing: "1px" }}>★ संग्रह पर्ची ★</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>RAM NURSERY</div>
            <div style={{ fontSize: "10px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
              <span>{new Date().toLocaleDateString("hi-IN")}</span>
              <span>{new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {/* Transport ID + Vehicle — compact, secondary info */}
          <div style={{ fontSize: "10px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px dashed #000", lineHeight: "1.6" }}>
            <div><b>वाहतूक ID:</b> {dispatchData?.transportId || "N/A"}</div>
            <div><b>चालक:</b> {dispatchData?.driverName || "N/A"}{dispatchData?.driverMobile ? ` (${dispatchData.driverMobile})` : ""}</div>
            <div><b>वाहन:</b> {dispatchData?.vehicleName || "N/A"}</div>
          </div>

          {/* Total Plants — small inline */}
          <div style={{ fontSize: "11px", fontWeight: "700", textAlign: "center", marginBottom: "8px", paddingBottom: "6px", borderBottom: "2px solid #000" }}>
            एकूण रोपे: <span style={{ fontSize: "13px" }}>{totalPlants}</span>
          </div>

          <div style={{ fontSize: "10px", textAlign: "center", marginBottom: "8px", fontWeight: "bold" }}>── रोपांचे तपशील ──</div>

          {renderPlants(1)}

          {/* Footer */}
          <div style={{ borderTop: "3px double #000", paddingTop: "6px", marginTop: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "13px", fontWeight: "900" }}>★ धन्यवाद! ★</div>
            <div style={{ fontSize: "9px", marginTop: "3px" }}>{new Date().toLocaleString("hi-IN")}</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ background: "#fff", padding: "12px 16px", borderTop: "1px solid #e5e5e5", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ background: "none", border: "1px solid #ccc", color: "#555", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
          बंद करा
        </button>
        <button onClick={generatePDF} style={{ background: "#1a1a1a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          पर्ची प्रिंट करा
        </button>
      </div>

      {/* Hidden printable content — thermal 78mm */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div ref={printRef} style={{ width: "78mm", maxWidth: "78mm", fontFamily: "'Courier New', Courier, monospace", fontSize: "13px", lineHeight: "1.5", color: "#000", backgroundColor: "#fff", padding: "4mm", boxSizing: "border-box" }}>

          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "3px double #000", paddingBottom: "6px", marginBottom: "8px" }}>
            <div style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "1px" }}>★ संग्रह पर्ची ★</div>
            <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>RAM NURSERY</div>
            <div style={{ fontSize: "10px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
              <span>{new Date().toLocaleDateString("hi-IN")}</span>
              <span>{new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {/* Transport + Vehicle — compact secondary */}
          <div style={{ fontSize: "10px", marginBottom: "6px", paddingBottom: "5px", borderBottom: "1px dashed #000", lineHeight: "1.7" }}>
            <div><b>वाहतूक ID:</b> {dispatchData?.transportId || "N/A"}</div>
            <div><b>चालक:</b> {dispatchData?.driverName || "N/A"}{dispatchData?.driverMobile ? ` (${dispatchData.driverMobile})` : ""}</div>
            <div><b>वाहन:</b> {dispatchData?.vehicleName || "N/A"}</div>
          </div>

          {/* Total Plants — small */}
          <div style={{ fontSize: "11px", fontWeight: "700", textAlign: "center", marginBottom: "8px", paddingBottom: "5px", borderBottom: "2px solid #000" }}>
            एकूण रोपे: {totalPlants}
          </div>

          <div style={{ fontSize: "10px", textAlign: "center", marginBottom: "8px", fontWeight: "bold" }}>── रोपांचे तपशील ──</div>

          {renderPlants(1.15)}

          {/* Footer */}
          <div style={{ borderTop: "3px double #000", paddingTop: "6px", marginTop: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: "900" }}>★ धन्यवाद! ★</div>
            <div style={{ fontSize: "9px", marginTop: "3px" }}>{new Date().toLocaleString("hi-IN")}</div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CollectSlipPDF
