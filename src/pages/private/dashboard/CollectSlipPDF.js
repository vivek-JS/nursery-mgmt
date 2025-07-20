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
      // Create canvas from HTML element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      })

      const imgData = canvas.toDataURL("image/png")

      // Create PDF for small printer - one slip per page
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      const pageWidth = 210
      const pageHeight = 297

      // Calculate dimensions to fit nicely on A4 for small printer
      const imgWidth = 180 // Leave margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add single slip centered on page
      const xOffset = (pageWidth - imgWidth) / 2
      const yOffset = (pageHeight - imgHeight) / 2

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

      {/* Hidden printable content - Compact black and white format */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={printRef}
          className="bg-white p-4 border border-black"
          style={{
            width: "160mm",
            height: "200mm",
            fontFamily: "Arial, sans-serif",
            fontSize: "10px"
          }}>
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            <h1 className="text-lg font-bold mb-1">Collection Slip</h1>
            <div className="flex justify-between text-xs">
              <span>तारीख: {new Date().toLocaleDateString()}</span>
              <span>वेळ: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Driver and Vehicle Info */}
          <div className="mb-3 border border-gray-300 p-2">
            <h3 className="font-semibold mb-2 text-xs border-b border-gray-300 pb-1">
              वाहतूक माहिती
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">चालक:</span>
                <p className="font-semibold">{dispatchData?.driverName || ""}</p>
              </div>
              <div>
                <span className="text-gray-600">वाहन:</span>
                <p className="font-semibold">{dispatchData?.vehicleName || ""}</p>
              </div>
            </div>
          </div>

          {/* Plants Details */}
          {dispatchData?.plants?.map((plant, plantIndex) => (
            <div key={plantIndex} className="mb-3">
              <h3 className="text-xs font-semibold mb-2 border-b border-gray-300 pb-1">
                {plant.name}
              </h3>

              {/* Process crates by cavity */}
              {(() => {
                const cavityGroups = []

                if (plant.cavityGroups && Array.isArray(plant.cavityGroups)) {
                  cavityGroups.push(...plant.cavityGroups)
                } else {
                  const cavityMap = new Map()

                  plant.pickupDetails?.forEach((pickup) => {
                    if (!cavityMap.has(pickup.cavityName)) {
                      cavityMap.set(pickup.cavityName, {
                        cavityName: pickup.cavityName,
                        pickupDetails: [],
                        crates: []
                      })
                    }
                    cavityMap.get(pickup.cavityName).pickupDetails.push(pickup)
                  })

                  plant.crates?.forEach((crate) => {
                    if (cavityMap.has(crate.cavityName)) {
                      cavityMap.get(crate.cavityName).crates.push(crate)
                    } else {
                      cavityMap.set(crate.cavityName, {
                        cavityName: crate.cavityName,
                        pickupDetails: [],
                        crates: [crate]
                      })
                    }
                  })

                  cavityGroups.push(...cavityMap.values())
                }

                return cavityGroups.map((cavityGroup, cavityIndex) => (
                  <div key={cavityIndex} className="mb-2 border border-gray-300 p-2">
                    <h4 className="font-semibold mb-1 text-xs border-b border-gray-200 pb-1">
                      कॅव्हिटी: {cavityGroup.cavityName || "N/A"}
                    </h4>

                    {/* Pickup Details Table */}
                    {cavityGroup.pickupDetails && cavityGroup.pickupDetails.length > 0 && (
                      <div className="mb-2">
                        <table className="w-full border-collapse border border-gray-400 text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-400 p-1 text-left">शेड</th>
                              <th className="border border-gray-400 p-1 text-center">प्रमाण</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cavityGroup.pickupDetails.map((pickup, idx) => (
                              <tr key={idx}>
                                <td className="border border-gray-400 p-1">{pickup.shadeName}</td>
                                <td className="border border-gray-400 p-1 text-center font-medium">
                                  {pickup.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Crates Table */}
                    {cavityGroup.crates && cavityGroup.crates.length > 0 && (
                      <div className="mb-2">
                        <table className="w-full border-collapse border border-gray-400 text-xs">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-400 p-1 text-center">क्रेट</th>
                              <th className="border border-gray-400 p-1 text-center">रोपे</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cavityGroup.crates.map((crate, idx) => (
                              <tr key={idx}>
                                <td className="border border-gray-400 p-1 text-center font-medium">
                                  {crate.numberOfCrates || 0}
                                </td>
                                <td className="border border-gray-400 p-1 text-center font-medium">
                                  {crate.quantity || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="flex justify-between text-xs font-semibold bg-gray-50 p-1 border border-gray-300">
                      <span>
                        एकूण क्रेट:{" "}
                        <span className="font-bold">
                          {cavityGroup.crates?.reduce(
                            (sum, crate) => sum + (crate.numberOfCrates || 0),
                            0
                          ) || 0}
                        </span>
                      </span>
                      <span>
                        एकूण रोपे:{" "}
                        <span className="font-bold">
                          {cavityGroup.crates?.reduce(
                            (sum, crate) => sum + (crate.quantity || 0),
                            0
                          ) || 0}
                        </span>
                      </span>
                    </div>

                    {cavityIndex < cavityGroups.length - 1 && (
                      <div className="border-b border-gray-200 mt-2 mb-2"></div>
                    )}
                  </div>
                ))
              })()}

              {plantIndex < dispatchData.plants.length - 1 && (
                <div className="border-b border-gray-300 mt-2 mb-2"></div>
              )}
            </div>
          ))}

          {/* Signature Section */}
          <div className="mt-4 pt-3 border-t border-gray-400">
            <div className="flex justify-between">
              <div className="text-center">
                <div className="border-b border-black w-20 h-10 mb-1 bg-gray-50"></div>
                <p className="text-xs text-gray-600">पर्यवेक्षक स्वाक्षरी</p>
              </div>
              <div className="text-center">
                <div className="border-b border-black w-20 h-10 mb-1 bg-gray-50"></div>
                <p className="text-xs text-gray-600">चालक स्वाक्षरी</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 text-center border-t border-gray-300 pt-2">
            <p className="text-xs text-gray-600">आपल्या सेवेबद्दल धन्यवाद</p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CollectSlipPDF
