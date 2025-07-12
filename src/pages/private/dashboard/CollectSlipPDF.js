import { Dialog } from "@mui/material"
import React from "react"
import jsPDF from "jspdf"
import "jspdf-autotable"

const CollectSlipPDF = ({ open, onClose, dispatchData }) => {
  if (!dispatchData) return null

  const generatePDF = () => {
    console.log(dispatchData)
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: [80, 210] })
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 15

    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("COLLECTION SLIP", pageWidth / 2, yPos, { align: "center" })

    yPos += 5
    doc.setLineWidth(0.5)
    doc.line(5, yPos, pageWidth - 5, yPos)

    // Date and Time
    yPos += 8
    doc.setFontSize(8)
    const currentDate = new Date().toLocaleDateString()
    const currentTime = new Date().toLocaleTimeString()
    doc.text(`Date: ${currentDate}`, 5, yPos)
    doc.text(`Time: ${currentTime}`, pageWidth - 5, yPos, { align: "right" })

    // Driver and Vehicle Info
    yPos += 8
    doc.setFont("helvetica", "normal")
    doc.text("Driver:", 5, yPos)
    doc.setFont("helvetica", "bold")
    doc.text(dispatchData?.driverName || "", 20, yPos)

    yPos += 5
    doc.setFont("helvetica", "normal")
    doc.text("Vehicle:", 5, yPos)
    doc.setFont("helvetica", "bold")
    doc.text(dispatchData?.vehicleName || "", 20, yPos)

    yPos += 5
    doc.setLineDashPattern([1, 1], 0)
    doc.line(5, yPos, pageWidth - 5, yPos)
    doc.setLineDashPattern([], 0)

    // Plants Details
    dispatchData?.plants?.forEach((plant, plantIndex) => {
      yPos += 8
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text(plant.name.replace(" -&gt; ", " → "), 5, yPos)

      // Reorganize by cavity
      const cavityGroups = []

      // Check if we have cavityGroups already formed in the new structure
      if (plant.cavityGroups && Array.isArray(plant.cavityGroups)) {
        // New structure - already grouped by cavity
        cavityGroups.push(...plant.cavityGroups)
      } else {
        // Old structure - we need to group by cavity name
        const cavityMap = new Map()

        // Group pickup details by cavity name
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

        // Match crates with the same cavity name
        plant.crates?.forEach((crate) => {
          if (cavityMap.has(crate.cavityName)) {
            cavityMap.get(crate.cavityName).crates.push(crate)
          } else {
            // If no pickup details for this cavity, create a new entry
            cavityMap.set(crate.cavityName, {
              cavityName: crate.cavityName,
              pickupDetails: [],
              crates: [crate]
            })
          }
        })

        // Convert map to array
        cavityGroups.push(...cavityMap.values())
      }

      // Process each cavity group
      cavityGroups.forEach((cavityGroup, cavityIndex) => {
        yPos += 6
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.text(`Cavity: ${cavityGroup.cavityName || "N/A"}`, 5, yPos)

        // Pickup details table for this cavity
        const pickupTableData =
          cavityGroup.pickupDetails?.map((pickup) => [
            pickup.shadeName,
            pickup.quantity.toString()
          ]) || []

        if (pickupTableData.length > 0) {
          doc.autoTable({
            startY: yPos + 4,
            head: [["Shade", "Qty"]],
            body: pickupTableData,
            theme: "grid",
            styles: {
              fontSize: 8,
              cellPadding: 2,
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: "bold",
              lineWidth: 0.1
            },
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 25, halign: "center" }
            },
            margin: { left: 5, right: 5 }
          })

          yPos = doc.lastAutoTable.finalY + 4
        } else {
          yPos += 4
        }

        // Crates table for this cavity
        const cratesData =
          cavityGroup.crates?.map((crate) => [
            crate.numberOfCrates?.toString() || "0",
            crate.quantity?.toString() || "0"
          ]) || []

        if (cratesData.length > 0) {
          doc.autoTable({
            startY: yPos + 2,
            head: [["Crates", "Plants"]],
            body: cratesData,
            theme: "grid",
            styles: {
              fontSize: 8,
              cellPadding: 2,
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: "bold",
              lineWidth: 0.1
            },
            columnStyles: {
              0: { cellWidth: 32, halign: "center" },
              1: { cellWidth: 33, halign: "center" }
            },
            margin: { left: 5, right: 5, bottom: 5 }
          })

          yPos = doc.lastAutoTable.finalY + 4
        }

        // Summary for this cavity
        const totalCrates =
          cavityGroup.crates?.reduce((sum, crate) => sum + (crate.numberOfCrates || 0), 0) || 0

        const totalPlants =
          cavityGroup.crates?.reduce((sum, crate) => sum + (crate.quantity || 0), 0) || 0

        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.text(`Total Crates: ${totalCrates}`, 5, yPos)
        doc.text(`Total Plants: ${totalPlants}`, pageWidth - 5, yPos, { align: "right" })

        // Add divider between cavity groups (if not the last one)
        if (cavityIndex < cavityGroups.length - 1) {
          yPos += 4
          doc.setLineDashPattern([0.5, 0.5], 0)
          doc.line(10, yPos, pageWidth - 10, yPos)
          doc.setLineDashPattern([], 0)
        }
      })

      // Add divider between plants (if not the last one)
      if (plantIndex < dispatchData.plants.length - 1) {
        yPos += 6
        doc.setLineDashPattern([1, 1], 0)
        doc.line(5, yPos, pageWidth - 5, yPos)
        doc.setLineDashPattern([], 0)
      }
    })

    // Signature section
    yPos += 15
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")

    doc.line(5, yPos, 35, yPos)
    yPos += 4
    doc.text("Supervisor Signature", 5, yPos)

    doc.line(45, yPos - 4, 75, yPos - 4)
    doc.text("Driver Signature", 45, yPos)

    // Footer
    yPos += 8
    doc.setFontSize(6)
    doc.text("Thank you for your service", pageWidth / 2, yPos, { align: "center" })

    doc.autoPrint()
    window.open(doc.output("bloburl"), "_blank")
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold">Collection Slip</h2>
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
              <h3 className="text-lg font-semibold mb-4">Dispatch Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Transport ID</p>
                  <p className="font-medium">{dispatchData.transportId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Driver</p>
                  <p className="font-medium">{dispatchData.driverName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle</p>
                  <p className="font-medium">{dispatchData.vehicleName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Plants</p>
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
              <h3 className="text-lg font-semibold mb-4">Plant Details</h3>
              <div className="space-y-4">
                {dispatchData.plants?.map((plant, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">{plant.name}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {plant.crates?.map((crate, crateIndex) => (
                        <div key={crateIndex}>
                          <p className="text-gray-600">Cavity: {crate.cavityName}</p>
                          <p>Crates: {crate.numberOfCrates}</p>
                          <p>Plants: {crate.quantity}</p>
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
                Generate Collection Slip
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default CollectSlipPDF
