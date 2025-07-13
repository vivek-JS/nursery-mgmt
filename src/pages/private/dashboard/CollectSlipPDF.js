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

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Open PDF in new window
      window.open(pdf.output("bloburl"), "_blank")
    } catch (error) {
      console.error("Error generating PDF:", error)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold">Collection Slip / संग्रह पर्ची</h2>
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

          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Dispatch Information / वाहतूक माहिती</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Transport ID / वाहतूक आयडी</p>
                  <p className="font-medium">{dispatchData.transportId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Driver / चालक</p>
                  <p className="font-medium">{dispatchData.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle / वाहन</p>
                  <p className="font-medium">{dispatchData.vehicleName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Plants / एकूण रोपे</p>
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

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Plant Details / रोपांचे तपशील</h3>
              <div className="space-y-4">
                {dispatchData.plants?.map((plant, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{plant.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {plant.crates?.map((crate, crateIndex) => (
                        <div key={crateIndex}>
                          <p className="text-gray-600">Cavity / कॅव्हिटी: {crate.cavityName}</p>
                          <p>Crates / खोकी: {crate.numberOfCrates}</p>
                          <p>Plants / रोपे: {crate.quantity}</p>
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
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generate Collection Slip / संग्रह पर्ची तयार करा
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden printable content */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={printRef}
          className="bg-white p-8"
          style={{ width: "210mm", minHeight: "297mm", fontFamily: "Arial, sans-serif" }}>
          {/* Header */}
          <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              COLLECTION SLIP / संग्रह पर्ची
            </h1>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Date / तारीख: {new Date().toLocaleDateString()}</span>
              <span>Time / वेळ: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Driver and Vehicle Info */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-gray-600">Driver / चालक: </span>
                <span className="font-semibold">{dispatchData?.driverName || ""}</span>
              </div>
              <div>
                <span className="text-gray-600">Vehicle / वाहन: </span>
                <span className="font-semibold">{dispatchData?.vehicleName || ""}</span>
              </div>
            </div>
            <div className="border-b border-gray-200 mb-4"></div>
          </div>

          {/* Plants Details */}
          {dispatchData?.plants?.map((plant, plantIndex) => (
            <div key={plantIndex} className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">{plant.name}</h3>

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
                  <div key={cavityIndex} className="mb-4">
                    <h4 className="font-semibold mb-2">
                      Cavity / कॅव्हिटी: {cavityGroup.cavityName || "N/A"}
                    </h4>

                    {/* Pickup Details Table */}
                    {cavityGroup.pickupDetails && cavityGroup.pickupDetails.length > 0 && (
                      <div className="mb-3">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 p-2 text-left">
                                Shade / सावली
                              </th>
                              <th className="border border-gray-300 p-2 text-center">
                                Qty / प्रमाण
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {cavityGroup.pickupDetails.map((pickup, idx) => (
                              <tr key={idx}>
                                <td className="border border-gray-300 p-2">{pickup.shadeName}</td>
                                <td className="border border-gray-300 p-2 text-center">
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
                      <div className="mb-3">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 p-2 text-center">
                                Crates / खोकी
                              </th>
                              <th className="border border-gray-300 p-2 text-center">
                                Plants / रोपे
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {cavityGroup.crates.map((crate, idx) => (
                              <tr key={idx}>
                                <td className="border border-gray-300 p-2 text-center">
                                  {crate.numberOfCrates || 0}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  {crate.quantity || 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="flex justify-between text-sm font-semibold">
                      <span>
                        Total Crates / एकूण खोकी:{" "}
                        {cavityGroup.crates?.reduce(
                          (sum, crate) => sum + (crate.numberOfCrates || 0),
                          0
                        ) || 0}
                      </span>
                      <span>
                        Total Plants / एकूण रोपे:{" "}
                        {cavityGroup.crates?.reduce(
                          (sum, crate) => sum + (crate.quantity || 0),
                          0
                        ) || 0}
                      </span>
                    </div>

                    {cavityIndex < cavityGroups.length - 1 && (
                      <div className="border-b border-gray-200 mt-3 mb-3"></div>
                    )}
                  </div>
                ))
              })()}

              {plantIndex < dispatchData.plants.length - 1 && (
                <div className="border-b-2 border-gray-300 mt-4 mb-4"></div>
              )}
            </div>
          ))}

          {/* Signature Section */}
          <div className="mt-12 pt-6 border-t-2 border-gray-300">
            <div className="flex justify-between">
              <div className="text-center">
                <div className="border-b-2 border-black w-40 h-16 mb-2"></div>
                <p className="text-sm text-gray-600">Supervisor Signature / पर्यवेक्षक स्वाक्षरी</p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-black w-40 h-16 mb-2"></div>
                <p className="text-sm text-gray-600">Driver Signature / चालक स्वाक्षरी</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Thank you for your service / आपल्या सेवेबद्दल धन्यवाद
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CollectSlipPDF
