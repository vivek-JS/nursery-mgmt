import React from "react"
import { DownloadIcon } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"

// Helper function to sanitize text and remove unwanted characters
const sanitizeText = (text) => {
  if (text === null || text === undefined) return "N/A"

  // Convert to string and remove any potential superscript characters
  return String(text)
    .replace(/[^\x20-\x7E]/g, "") // Remove non-printable or special characters
    .trim()
}

const generateOrderPDF = (order) => {
  // Create new document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  })

  // Add some styling constants
  const pageWidth = doc.internal.pageSize.width
  const leftMargin = 20
  const rightMargin = 20
  const contentWidth = pageWidth - leftMargin - rightMargin

  // Add a header border
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(leftMargin, 18, pageWidth - rightMargin, 18)

  // Title - "ORDER RECEIPT"
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("ORDER RECEIPT", pageWidth / 2, 15, { align: "center" })

  // Order Info Box
  doc.setFontSize(9)
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.1)

  // Order basic details box - Only showing date, no order ID
  const boxY = 25
  doc.roundedRect(leftMargin, boxY, contentWidth, 10, 2, 2)

  // Date - centered in the box
  doc.setFont("helvetica", "bold")
  doc.text("DATE:", leftMargin + 5, boxY + 6)
  doc.setFont("helvetica", "normal")
  doc.text(sanitizeText(order.orderDate || "N/A"), leftMargin + 25, boxY + 6)

  // Add a section divider
  const dividerY = boxY + 16 // Reduced space since we removed order ID
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(leftMargin, dividerY, pageWidth - rightMargin, dividerY)

  // Farmer Details Section
  const farmerY = dividerY + 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("CUSTOMER INFORMATION", leftMargin, farmerY)

  // Farmer Details Table
  doc.autoTable({
    startY: farmerY + 3,
    theme: "plain",
    body: [
      ["Name", sanitizeText(order.farmerName || "N/A")],
      ["Village", sanitizeText(order.details?.farmer?.village || "N/A")],
      ["Contact", sanitizeText(order.details?.farmer?.mobileNumber || "N/A")]
    ],
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 140 }
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1
  })

  // Add a section divider
  const farmerEndY = doc.lastAutoTable.finalY + 5
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(leftMargin, farmerEndY, pageWidth - rightMargin, farmerEndY)

  // Order Details Section
  const orderY = farmerEndY + 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("ORDER DETAILS", leftMargin, orderY)

  // Order Details Table
  doc.autoTable({
    startY: orderY + 3,
    theme: "plain",
    body: [
      ["Plant Type", sanitizeText(order.plantType || "N/A")],
      ["Variety", sanitizeText(order.plantVariety || "N/A")],
      ["Quantity", sanitizeText(order.quantity || "0") + " units"],
      ["Rate", "Rs. " + sanitizeText(order.rate || "0") + " per unit"],
      ["Total Amount", "Rs. " + sanitizeText(order.total || "0")],
      ["Delivery Date", sanitizeText(order.Delivery || "N/A")]
    ],
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 140 }
    },
    margin: { left: leftMargin, right: rightMargin },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1
  })

  // Add a section divider
  const orderEndY = doc.lastAutoTable.finalY + 5
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(leftMargin, orderEndY, pageWidth - rightMargin, orderEndY)

  // Payment Section
  const paymentY = orderEndY + 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT HISTORY", leftMargin, paymentY)

  // Process payment data
  const payments = order.details?.payment || []
  const paymentData =
    payments.length > 0
      ? payments.map((payment) => [
          payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : "-",
          sanitizeText(payment.modeOfPayment || "-"),
          sanitizeText(payment.paymentStatus || "-"),
          "Rs. " + sanitizeText((payment.paidAmount || 0).toString())
        ])
      : [["No payment records found", "", "", ""]]

  // Payment History Table
  doc.autoTable({
    startY: paymentY + 3,
    head: [["Date", "Payment Mode", "Status", "Amount"]],
    body: paymentData,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: 3,
      halign: "center",
      valign: "middle"
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "left" },
      1: { cellWidth: 50, halign: "left" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 35, halign: "right" }
    },
    margin: { left: leftMargin, right: rightMargin },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    }
  })

  // Add a section divider
  const paymentEndY = doc.lastAutoTable.finalY + 5
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(leftMargin, paymentEndY, pageWidth - rightMargin, paymentEndY)

  // Summary section
  const summaryY = paymentEndY + 8
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT SUMMARY", leftMargin, summaryY)

  // Summary table
  doc.autoTable({
    startY: summaryY + 3,
    theme: "plain",
    body: [
      ["Total Amount:", "Rs. " + sanitizeText(order.total || "0")],
      ["Paid Amount:", "Rs. " + sanitizeText(order["Paid Amt"] || "0")],
      ["Balance Due:", "Rs. " + sanitizeText(order["remaining Amt"] || "0")]
    ],
    styles: {
      fontSize: 10,
      cellPadding: 2,
      fontStyle: "bold"
    },
    columnStyles: {
      0: { cellWidth: 40, halign: "right" },
      1: { cellWidth: 40, halign: "right" }
    },
    margin: { left: pageWidth - rightMargin - 80 },
    tableLineColor: [255, 255, 255],
    tableLineWidth: 0
  })

  // Footer with signature space
  const footerY = doc.lastAutoTable.finalY + 15
  doc.setFontSize(9)

  // Signature line
  doc.setDrawColor(100, 100, 100)
  doc.setLineWidth(0.2)
  doc.line(leftMargin, footerY, leftMargin + 50, footerY)

  doc.setFont("helvetica", "normal")
  doc.text("Authorized Signature", leftMargin + 10, footerY + 5)

  // Disclaimer text
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(
    "This is a computer generated receipt. No signature required.",
    pageWidth / 2,
    doc.internal.pageSize.height - 10,
    { align: "center" }
  )

  // Reset text color
  doc.setTextColor(0, 0, 0)

  return doc
}

const DownloadPDFButton = ({ order }) => {
  const handleClick = () => {
    const doc = generateOrderPDF(order)

    // Create an embedded object
    const embedElement = document.createElement("embed")
    embedElement.setAttribute("width", "100%")
    embedElement.setAttribute("height", "100%")
    embedElement.setAttribute("type", "application/pdf")

    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    embedElement.setAttribute("src", url)

    // Create a wrapper div
    const wrapper = document.createElement("div")
    wrapper.style.position = "fixed"
    wrapper.style.top = "0"
    wrapper.style.left = "0"
    wrapper.style.width = "100%"
    wrapper.style.height = "100%"
    wrapper.style.backgroundColor = "rgba(0,0,0,0.8)"
    wrapper.style.zIndex = "9999"
    wrapper.style.padding = "20px"
    wrapper.appendChild(embedElement)

    // Add close button
    const closeButton = document.createElement("button")
    closeButton.innerHTML = "×"
    closeButton.style.position = "fixed"
    closeButton.style.right = "20px"
    closeButton.style.top = "20px"
    closeButton.style.fontSize = "24px"
    closeButton.style.backgroundColor = "white"
    closeButton.style.border = "none"
    closeButton.style.borderRadius = "50%"
    closeButton.style.width = "40px"
    closeButton.style.height = "40px"
    closeButton.style.cursor = "pointer"
    closeButton.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)"
    closeButton.style.display = "flex"
    closeButton.style.justifyContent = "center"
    closeButton.style.alignItems = "center"
    closeButton.style.fontFamily = "Arial, sans-serif"
    closeButton.style.lineHeight = "0"
    closeButton.onmouseover = () => {
      closeButton.style.backgroundColor = "#f0f0f0"
    }
    closeButton.onmouseout = () => {
      closeButton.style.backgroundColor = "white"
    }
    closeButton.onclick = () => {
      document.body.removeChild(wrapper)
      URL.revokeObjectURL(url)
    }
    wrapper.appendChild(closeButton)

    // Add download button
    const downloadButton = document.createElement("button")
    downloadButton.innerHTML = "Download PDF"
    downloadButton.style.position = "fixed"
    downloadButton.style.right = "80px"
    downloadButton.style.top = "20px"
    downloadButton.style.padding = "8px 16px"
    downloadButton.style.backgroundColor = "white"
    downloadButton.style.color = "black"
    downloadButton.style.border = "1px solid #ddd"
    downloadButton.style.borderRadius = "4px"
    downloadButton.style.cursor = "pointer"
    downloadButton.style.fontFamily = "Arial, sans-serif"
    downloadButton.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)"
    downloadButton.onmouseover = () => {
      downloadButton.style.backgroundColor = "#f0f0f0"
    }
    downloadButton.onmouseout = () => {
      downloadButton.style.backgroundColor = "white"
    }
    downloadButton.onclick = () => {
      const pdfName = `Plant_Order_Receipt_${new Date()
        .toLocaleDateString()
        .replace(/\//g, "-")}.pdf`
      doc.save(pdfName)
    }
    wrapper.appendChild(downloadButton)

    // Add print button
    const printButton = document.createElement("button")
    printButton.innerHTML = "Print"
    printButton.style.position = "fixed"
    printButton.style.right = "200px"
    printButton.style.top = "20px"
    printButton.style.padding = "8px 16px"
    printButton.style.backgroundColor = "white"
    printButton.style.color = "black"
    printButton.style.border = "1px solid #ddd"
    printButton.style.borderRadius = "4px"
    printButton.style.cursor = "pointer"
    printButton.style.fontFamily = "Arial, sans-serif"
    printButton.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)"
    printButton.onmouseover = () => {
      printButton.style.backgroundColor = "#f0f0f0"
    }
    printButton.onmouseout = () => {
      printButton.style.backgroundColor = "white"
    }
    printButton.onclick = () => {
      window.print()
    }
    wrapper.appendChild(printButton)

    // Add to body
    document.body.appendChild(wrapper)
  }

  return (
    <button
      onClick={handleClick}
      className="text-gray-700 hover:text-gray-900 focus:outline-none inline-flex items-center gap-1 p-2 rounded-md hover:bg-gray-100 transition-colors">
      <DownloadIcon size={16} />
      <span className="text-sm font-medium">Receipt</span>
    </button>
  )
}

export default DownloadPDFButton
