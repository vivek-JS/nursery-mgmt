import jsPDF from "jspdf"
import "jspdf-autotable"

const CollectSlipPDF = ({ dispatchData }) => {
  console.log(dispatchData)
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: [80, 210] })
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPos = 15

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("संग्रह पर्ची", pageWidth / 2, yPos, { align: "center" })
  yPos += 4
  doc.setFontSize(12)
  doc.text("COLLECTION SLIP", pageWidth / 2, yPos, { align: "center" })

  yPos += 5
  doc.setLineWidth(0.5)
  doc.line(5, yPos, pageWidth - 5, yPos)

  // Date and Time
  yPos += 8
  doc.setFontSize(8)
  const currentDate = new Date().toLocaleDateString()
  const currentTime = new Date().toLocaleTimeString()
  doc.text(`दिनांक / Date: ${currentDate}`, 5, yPos)
  doc.text(`वेळ / Time: ${currentTime}`, pageWidth - 5, yPos, { align: "right" })

  // Driver and Vehicle Info
  yPos += 8
  doc.setFont("helvetica", "normal")
  doc.text("चालक / Driver:", 5, yPos)
  doc.setFont("helvetica", "bold")
  doc.text(dispatchData?.driverName || "", 25, yPos)

  yPos += 5
  doc.setFont("helvetica", "normal")
  doc.text("वाहन / Vehicle:", 5, yPos)
  doc.setFont("helvetica", "bold")
  doc.text(dispatchData?.vehicleName || "", 25, yPos)

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
          head: [["छाया / Shade", "प्रमाण / Qty"]],
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
          head: [["क्रेट्स / Crates", "रोपे / Plants"]],
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
      doc.text(`एकूण क्रेट्स / Total Crates: ${totalCrates}`, 5, yPos)
      doc.text(`एकूण रोपे / Total Plants: ${totalPlants}`, pageWidth - 5, yPos, { align: "right" })

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
  doc.text("पर्यवेक्षक स्वाक्षरी / Supervisor Signature", 5, yPos)

  doc.line(45, yPos - 4, 75, yPos - 4)
  doc.text("चालक स्वाक्षरी / Driver Signature", 45, yPos)

  // Footer
  yPos += 8
  doc.setFontSize(6)
  doc.text("आपल्या सेवेबद्दल धन्यवाद / Thank you for your service", pageWidth / 2, yPos, {
    align: "center"
  })

  doc.autoPrint()
  window.open(doc.output("bloburl"), "_blank")

  return null
}

export default CollectSlipPDF
