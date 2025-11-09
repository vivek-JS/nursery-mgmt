import { Dialog } from "@mui/material"
import React, { useRef } from "react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

const CollectSlipPDF = ({ open, onClose, dispatchData }) => {
  const printRef = useRef()
console.log(dispatchData)
  if (!dispatchData) return null

  const generatePDF = async () => {
    const element = printRef.current
    if (!element) return

    try {
      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      })

      const imgData = canvas.toDataURL("image/png")

      // Create PDF for A4 format - 1 slip per page (A8 size, centered)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      // A8 dimensions (quarter of A4)
      const slipWidth = 105 // mm (half of A4 width 210mm)
      const imgWidth = slipWidth - 5 // Leave small margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Center the slip on A4 page
      const pageWidth = 210
      const pageHeight = 297
      const xOffset = (pageWidth - imgWidth) / 2
      const yOffset = (pageHeight - imgHeight) / 2

      // Add single slip centered on page
      pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight)

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

      {/* Hidden printable content - A8 black and white format */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={printRef}
          className="bg-white border border-black p-3"
          style={{
            width: "105mm",
            maxWidth: "105mm",
            fontFamily: "Arial, sans-serif",
            fontSize: "9px",
            lineHeight: "1.3",
            color: "#000000"
          }}>
          {/* Header */}
          <div className="text-center border-b border-black pb-1.5 mb-2">
            <h1 className="text-sm font-bold mb-1">संग्रह पर्ची</h1>
            <div className="flex justify-between text-xs">
              <span>{new Date().toLocaleDateString("hi-IN")}</span>
              <span>{new Date().toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {/* Driver Info */}
          <div className="mb-2 border border-black p-2">
            <div className="text-xs">
              <div className="font-bold mb-1">चालक: {dispatchData?.driverName || ""}</div>
              <div className="mb-1">मोबाइल: {dispatchData?.driverMobile || ""}</div>
              <div className="font-bold">वाहन: {dispatchData?.vehicleName || ""}</div>
            </div>
          </div>

          {/* Crates by Plant and Cavity */}
          {dispatchData?.plants?.map((plant, plantIndex) => {
            // Clean plant name to display properly
            const cleanPlantName = plant.name?.replace(/&gt;/g, ">").replace(/\s*-\s*>\s*/g, "-")
            
            return (
            <div key={plantIndex} className="mb-2">
              {/* Plant Name */}
              <div className="text-xs font-bold mb-1 border-b border-black pb-0.5">
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
                    <div key={crateIndex} className="mb-1.5 border border-black p-1.5">
                      <div className="text-xs font-bold mb-1 border-b border-black pb-0.5">
                        कॅव्हिटी: {crate.cavityName}
                      </div>
                      
                      {/* Shade Section */}
                      {shades.length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-semibold mb-1" style={{ fontSize: "7px" }}>
                            शेड माहिती:
                          </div>
                          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th className="border border-black p-0.5 text-left bg-gray-100" style={{ fontSize: "7px" }}>शेड</th>
                                <th className="border border-black p-0.5 text-center bg-gray-100" style={{ fontSize: "7px" }}>रोपे</th>
                              </tr>
                            </thead>
                            <tbody>
                              {shades.map((shade, shadeIdx) => (
                                <tr key={shadeIdx}>
                                  <td className="border border-black p-0.5" style={{ fontSize: "7px" }}>
                                    {shade.shadeName || "-"}
                                  </td>
                                  <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                    {shade.quantity || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {/* Crate Section */}
                      <div>
                        <div className="text-xs font-semibold mb-1" style={{ fontSize: "7px" }}>
                          क्रेट माहिती:
                        </div>
                        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th className="border border-black p-0.5 text-center bg-gray-100" style={{ fontSize: "7px" }}>क्रेट</th>
                              <th className="border border-black p-0.5 text-center bg-gray-100" style={{ fontSize: "7px" }}>रोपे</th>
                            </tr>
                          </thead>
                          <tbody>
                            {crate.crateDetails && crate.crateDetails.length > 0 ? (
                              crate.crateDetails.map((crateDetail, cdIdx) => (
                                <tr key={cdIdx}>
                                  <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                    {crateDetail.crateCount || 0}
                                  </td>
                                  <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                    {crateDetail.plantCount || 0}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                  {totalCrates}
                                </td>
                                <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                  {totalPlants}
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="font-bold">
                              <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                {totalCrates}
                              </td>
                              <td className="border border-black p-0.5 text-center" style={{ fontSize: "7px" }}>
                                {totalPlants}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )
          })}
        </div>
      </div>
    </Dialog>
  )
}

export default CollectSlipPDF
