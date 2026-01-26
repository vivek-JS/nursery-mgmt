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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg font-semibold">Collection Slip</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-3">वाहतूक माहिती</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">वाहतूक आयडी</p>
                  <p className="font-medium">{dispatchData.transportId}</p>
                </div>
                <div>
                  <p className="text-gray-600">चालक</p>
                  <p className="font-medium">{dispatchData.driverName}</p>
                </div>
                <div>
                  <p className="text-gray-600">वाहन</p>
                  <p className="font-medium">{dispatchData.vehicleName}</p>
                </div>
                <div>
                  <p className="text-gray-600">एकूण रोपे</p>
                  <p className="font-medium">
                    {dispatchData.plants?.reduce((sum, plant) => {
                      return (
                        sum +
                        plant.crates?.reduce(
                          (plantSum, crate) => plantSum + (crate.quantity || 0),
                          0
                        )
                      )
                    }, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-md font-semibold mb-3">रोपांचे तपशील</h3>
              <div className="space-y-3">
                {dispatchData.plants?.map((plant, index) => (
                  <div key={index} className="border rounded p-3">
                    <h4 className="font-medium mb-2 text-sm">{plant.name}</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {plant.crates?.map((crate, crateIndex) => (
                        <div key={crateIndex}>
                          <p className="text-gray-600">कॅव्हिटी: {crate.cavityName}</p>
                          <p>क्रेट: {crate.numberOfCrates}</p>
                          <p>रोपे: {crate.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={generatePDF}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                संग्रह पर्ची तयार करा
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable content - Thermal printer format (80mm width) */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={printRef}
          style={{
            width: "78mm", // 80mm - 2mm margin
            maxWidth: "78mm",
            fontFamily: "'Courier New', monospace", // Monospace for thermal printers
            fontSize: "10px",
            lineHeight: "1.4",
            color: "#000000",
            backgroundColor: "#ffffff",
            padding: "4mm",
            boxSizing: "border-box"
          }}>
          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "1px solid #000", paddingBottom: "3px", marginBottom: "5px" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "3px" }}>संग्रह पर्ची</div>
            <div style={{ fontSize: "8px", display: "flex", justifyContent: "space-between" }}>
              <span>तारीख: {new Date().toLocaleDateString("hi-IN")}</span>
              <span>वेळ: {new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {/* Transport ID */}
          <div style={{ marginBottom: "5px", padding: "3px 0", borderBottom: "1px dashed #000" }}>
            <div style={{ fontSize: "9px", fontWeight: "bold" }}>
              वाहतूक ID: {dispatchData?.transportId || "N/A"}
            </div>
          </div>

          {/* Driver Info */}
          <div style={{ marginBottom: "5px", padding: "3px 0", borderBottom: "1px dashed #000" }}>
            <div style={{ fontSize: "9px" }}>
              <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                चालक: {dispatchData?.driverName || "N/A"}
              </div>
              <div style={{ marginBottom: "2px", fontSize: "8px" }}>
                मोबाइल: {dispatchData?.driverMobile || "N/A"}
              </div>
              <div style={{ fontWeight: "bold", fontSize: "9px" }}>
                वाहन: {dispatchData?.vehicleName || "N/A"}
              </div>
            </div>
          </div>

          {/* Summary - Total Plants */}
          {(() => {
            const totalPlants = dispatchData?.plants?.reduce((sum, plant) => {
              return (
                sum +
                plant.crates?.reduce(
                  (plantSum, crate) => {
                    if (crate.crateDetails && crate.crateDetails.length > 0) {
                      return plantSum + crate.crateDetails.reduce((cdSum, cd) => cdSum + (cd.plantCount || 0), 0)
                    }
                    return plantSum + (crate.plantCount || crate.quantity || 0)
                  },
                  0
                )
              )
            }, 0) || 0

            return (
              <div style={{ marginBottom: "5px", padding: "3px 0", borderBottom: "1px solid #000" }}>
                <div style={{ fontSize: "10px", fontWeight: "bold", textAlign: "center" }}>
                  एकूण रोपे: {totalPlants}
                </div>
              </div>
            )
          })()}

          {/* Crates by Plant and Cavity */}
          {dispatchData?.plants?.map((plant, plantIndex) => {
            // Clean plant name to display properly
            const cleanPlantName = plant.name?.replace(/&gt;/g, ">").replace(/\s*-\s*>\s*/g, "-")
            
            return (
            <div key={plantIndex} style={{ marginBottom: "5px" }}>
              {/* Plant Name */}
              <div style={{ 
                fontSize: "10px", 
                fontWeight: "bold", 
                marginBottom: "3px", 
                borderBottom: "1px solid #000", 
                paddingBottom: "2px",
                textAlign: "center"
              }}>
                {cleanPlantName}
              </div>

              {/* Group by cavity and show shade-wise */}
              {(() => {
                // Group pickupDetails by cavity for shade information
                const cavityShades = new Map()
                
                plant.pickupDetails?.forEach((pickup) => {
                  if (!cavityShades.has(pickup.cavityName)) {
                    cavityShades.set(pickup.cavityName, [])
                  }
                  cavityShades.get(pickup.cavityName).push(pickup)
                })

                return plant.crates?.map((crate, crateIndex) => {
                  const shades = cavityShades.get(crate.cavityName) || []
                  
                  // Calculate totals
                  let totalCrates = 0
                  let totalPlants = 0
                  if (crate.crateDetails && crate.crateDetails.length > 0) {
                    totalCrates = crate.crateDetails.reduce((sum, cd) => sum + (cd.crateCount || 0), 0)
                    totalPlants = crate.crateDetails.reduce((sum, cd) => sum + (cd.plantCount || 0), 0)
                  } else {
                    totalCrates = crate.crateCount || crate.numberOfCrates || 0
                    totalPlants = crate.plantCount || crate.quantity || 0
                  }

                  return (
                    <div key={crateIndex} style={{ marginBottom: "5px", padding: "3px 0" }}>
                      {/* Cavity Header */}
                      <div style={{ 
                        fontSize: "9px", 
                        fontWeight: "bold", 
                        marginBottom: "3px",
                        textAlign: "center",
                        padding: "2px 0",
                        borderTop: "1px solid #000",
                        borderBottom: "1px solid #000"
                      }}>
                        कॅव्हिटी: {crate.cavityName}
                      </div>
                      
                      {/* Shade Section - Highlighted */}
                      {shades.length > 0 && (
                        <div style={{ 
                          marginBottom: "4px", 
                          padding: "3px",
                          border: "1px solid #000",
                          backgroundColor: "#f5f5f5"
                        }}>
                          <div style={{ 
                            fontSize: "9px", 
                            fontWeight: "bold", 
                            marginBottom: "3px",
                            textAlign: "center",
                            borderBottom: "1px dashed #000",
                            paddingBottom: "2px"
                          }}>
                            === शेड माहिती ===
                          </div>
                          <div style={{ fontSize: "8px", lineHeight: "1.5" }}>
                            {shades.map((shade, shadeIdx) => (
                              <div 
                                key={shadeIdx} 
                                style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  marginBottom: "2px",
                                  padding: "1px 2px",
                                  borderBottom: shadeIdx < shades.length - 1 ? "1px dotted #666" : "none"
                                }}
                              >
                                <span style={{ fontWeight: "normal" }}>• {shade.shadeName || "-"}</span>
                                <span style={{ fontWeight: "bold", fontSize: "9px" }}>{shade.quantity || 0} रोपे</span>
                              </div>
                            ))}
                            {/* Shade Total */}
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              marginTop: "3px", 
                              paddingTop: "2px",
                              borderTop: "1px solid #000",
                              fontWeight: "bold",
                              fontSize: "9px"
                            }}>
                              <span>एकूण शेड रोपे:</span>
                              <span>{shades.reduce((sum, s) => sum + (s.quantity || 0), 0)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Crate Section - Highlighted */}
                      <div style={{ 
                        padding: "3px",
                        border: "1px solid #000",
                        backgroundColor: "#f9f9f9"
                      }}>
                        <div style={{ 
                          fontSize: "9px", 
                          fontWeight: "bold", 
                          marginBottom: "3px",
                          textAlign: "center",
                          borderBottom: "1px dashed #000",
                          paddingBottom: "2px"
                        }}>
                          === क्रेट माहिती ===
                        </div>
                        {crate.crateDetails && crate.crateDetails.length > 0 ? (
                          <div style={{ fontSize: "8px", lineHeight: "1.5" }}>
                            {crate.crateDetails.map((crateDetail, cdIdx) => (
                              <div 
                                key={cdIdx} 
                                style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  marginBottom: "2px",
                                  padding: "1px 2px",
                                  borderBottom: cdIdx < crate.crateDetails.length - 1 ? "1px dotted #666" : "none"
                                }}
                              >
                                <span style={{ fontWeight: "normal" }}>• क्रेट: {crateDetail.crateCount || 0}</span>
                                <span style={{ fontWeight: "bold", fontSize: "9px" }}>{crateDetail.plantCount || 0} रोपे</span>
                              </div>
                            ))}
                            {/* Crate Total - Prominent */}
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              marginTop: "4px", 
                              paddingTop: "3px",
                              paddingBottom: "2px",
                              borderTop: "2px solid #000",
                              borderBottom: "1px solid #000",
                              fontWeight: "bold",
                              fontSize: "10px",
                              backgroundColor: "#e8e8e8"
                            }}>
                              <span>=== एकूण ===</span>
                            </div>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              marginTop: "2px",
                              fontWeight: "bold",
                              fontSize: "9px"
                            }}>
                              <span>क्रेट: {totalCrates}</span>
                              <span>रोपे: {totalPlants}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ 
                            fontSize: "9px", 
                            display: "flex", 
                            justifyContent: "space-between",
                            padding: "2px",
                            fontWeight: "bold"
                          }}>
                            <span>क्रेट: {totalCrates}</span>
                            <span>रोपे: {totalPlants}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )
          })}

          {/* Footer */}
          <div style={{ 
            marginTop: "8px", 
            paddingTop: "5px", 
            borderTop: "2px solid #000",
            textAlign: "center",
            fontSize: "8px"
          }}>
            <div style={{ marginBottom: "2px" }}>--------------------------------</div>
            <div style={{ fontWeight: "bold" }}>धन्यवाद!</div>
            <div style={{ marginTop: "3px", fontSize: "7px" }}>
              {new Date().toLocaleString("hi-IN")}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CollectSlipPDF
