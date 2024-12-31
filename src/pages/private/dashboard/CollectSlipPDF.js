import jsPDF from "jspdf"
import "jspdf-autotable"

const CollectSlipPDF = ({ dispatchData }) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: [80, 210] })
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPos = 15
  console.log(dispatchData)
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
  dispatchData?.plants?.forEach((plant, index) => {
    yPos += 8
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(plant.name.replace(" -&gt; ", " → "), 5, yPos)

    // Cavity Details
    yPos += 5
    doc.setFontSize(8)
    doc.text(`Cavity: ${plant.cavityDetails?.cavityName || "N/A"}`, 5, yPos)

    // Pickup details table
    const tableData = plant.pickupDetails?.map((pickup) => [
      pickup.shadeName,
      pickup.quantity.toString()
    ])

    doc.autoTable({
      startY: yPos + 4,
      head: [["Shade", "Qty"]],
      body: tableData,
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

    yPos = doc.lastAutoTable.finalY + 6

    // Crates table
    const cratesData = plant.crates?.map((crate) => [
      crate.numberOfCrates?.toString() || "0",
      crate.quantity?.toString() || "0"
    ])

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

    yPos = doc.lastAutoTable.finalY + 8

    // Summary
    const totalCrates = plant.crates?.reduce((sum, crate) => sum + (crate.numberOfCrates || 0), 0)
    const totalPlants = plant.crates?.reduce((sum, crate) => sum + (crate.quantity || 0), 0)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(`Total Crates: ${totalCrates}`, 5, yPos)
    doc.text(`Total Plants: ${totalPlants}`, pageWidth - 5, yPos, { align: "right" })

    if (index < dispatchData.plants.length - 1) {
      yPos += 4
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

  return null
}

export default CollectSlipPDF
