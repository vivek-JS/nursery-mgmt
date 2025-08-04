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

// Marathi text helper - keeps Marathi characters
const sanitizeMarathiText = (text) => {
  if (text === null || text === undefined) return "N/A"
  return String(text).trim()
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

// Generate Marathi Receipt PDF
const generateMarathiReceiptPDF = (order) => {
  // Create new document with A5 format
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5"
  })

  // Try to add Marathi font support
  const addMarathiFont = () => {
    try {
      // Set font to helvetica for now
      doc.setFont("helvetica")
      return true
    } catch (error) {
      doc.setFont("helvetica")
      return false
    }
  }

  addMarathiFont()

  // Helper function to handle Marathi text
  const handleMarathiText = (text, fallbackText = null) => {
    if (!text || text === "N/A") return fallbackText || text
    return text // Use actual Marathi text
  }

  // Helper function to extract numeric value from string like "₹ 1000"
  const extractNumericValue = (value) => {
    if (typeof value === "number") return value
    if (typeof value === "string") {
      // Remove currency symbols, spaces, and extract number
      const numericValue = value.replace(/[₹\s,]/g, "")
      return parseInt(numericValue) || 0
    }
    return 0
  }

  // A5 dimensions and margins
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const leftMargin = 15
  const rightMargin = 15
  const contentWidth = pageWidth - leftMargin - rightMargin

  // Set colors for printer-friendly design
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  doc.setFillColor(255, 255, 255)

  // Header - Receipt title and date
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(handleMarathiText("रसीद", "RASID (Receipt)"), pageWidth / 2, 12, { align: "center" })

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const orderDate = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-IN")
    : new Date().toLocaleDateString("en-IN")
  doc.text(`${handleMarathiText("दिनांक", "Dinank")}: ${orderDate}`, pageWidth / 2, 18, {
    align: "center"
  })

  // Customer information section
  const customerY = 28
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")

  // Receipt number
  doc.text(
    `${handleMarathiText("क्र", "Kr")}. ${sanitizeMarathiText(order.order || "N/A")}`,
    leftMargin,
    customerY
  )

  // Customer details - using Marathi text
  doc.setFont("helvetica", "bold")
  doc.text(
    `${handleMarathiText("श्री", "Shri")}: ${handleMarathiText(order.farmerName || "N/A")}`,
    leftMargin,
    customerY + 8
  )

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  const village = handleMarathiText(order.details?.farmer?.village || "N/A")
  const taluka = handleMarathiText(order.details?.farmer?.taluka || "N/A")
  doc.text(
    `${handleMarathiText("गाव", "Gaav")}: ${village} ${handleMarathiText(
      "तालुका",
      "Taluka"
    )}: ${taluka}`,
    leftMargin,
    customerY + 14
  )

  const district = handleMarathiText(order.details?.farmer?.district || "N/A")
  const mobile = sanitizeMarathiText(order.details?.farmer?.mobileNumber || "N/A")
  doc.text(
    `${handleMarathiText("जिल्हा", "Jilha")}: ${district} ${handleMarathiText(
      "मो नंबर",
      "Mo Number"
    )}: ${mobile}`,
    leftMargin,
    customerY + 20
  )

  // Main table with plant details
  const tableY = customerY + 32
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")

  // Table headers in Marathi
  const headers = [
    handleMarathiText("रोप संख्या", "Rop Sankhya"),
    handleMarathiText("प्रकार", "Prakar"),
    handleMarathiText("दर", "Dar"),
    handleMarathiText("एकूण", "Ekun")
  ]
  const headerY = tableY
  const colWidths = [25, 75, 25, 30]
  let currentX = leftMargin

  // Draw header row
  headers.forEach((header, index) => {
    doc.text(header, currentX, headerY)
    currentX += colWidths[index]
  })

  // Draw header line
  doc.line(leftMargin, headerY + 2, pageWidth - rightMargin, headerY + 2)

  // Draw items
  let itemY = headerY + 8
  doc.setFont("helvetica", "normal")

  // Create plant details - Fix numeric calculations
  const plantType = sanitizeMarathiText(order.plantType || "N/A")
  const plantVariety = sanitizeMarathiText(order.plantVariety || "")
  const quantity = parseInt(order.quantity) || 0
  const rate = parseInt(order.rate) || 0
  const total = extractNumericValue(order.total) || quantity * rate

  currentX = leftMargin

  // Quantity
  doc.text(String(quantity), currentX, itemY)
  currentX += colWidths[0]

  // Plant type with variety - use Marathi text
  const plantText = handleMarathiText(plantType)
  doc.text(plantText, currentX, itemY)
  if (plantVariety && plantVariety.trim() && plantVariety !== "N/A") {
    doc.setFontSize(8)
    const subtypeText = handleMarathiText(plantVariety)
    doc.text(subtypeText, currentX, itemY + 4)
    doc.setFontSize(9)
  }
  currentX += colWidths[1]

  // Rate
  doc.text(String(rate), currentX, itemY)
  currentX += colWidths[2]

  // Total
  doc.text(String(total), currentX, itemY)

  itemY += plantVariety && plantVariety.trim() && plantVariety !== "N/A" ? 10 : 6

  // Total row
  doc.setFont("helvetica", "bold")
  doc.text(
    handleMarathiText("जमा रक्कम", "Jama Rakkam"),
    leftMargin + colWidths[0] + colWidths[1],
    itemY + 3
  )
  doc.text(String(total), leftMargin + colWidths[0] + colWidths[1] + colWidths[2], itemY + 3)

  // Draw table border
  const tableHeight = itemY + 8 - headerY
  doc.rect(leftMargin, headerY - 3, contentWidth, tableHeight)

  // Draw column separators
  currentX = leftMargin
  for (let i = 0; i < colWidths.length - 1; i++) {
    currentX += colWidths[i]
    doc.line(currentX, headerY - 3, currentX, headerY + tableHeight - 3)
  }

  // Total amount section
  const totalY = itemY + 15
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`${handleMarathiText("एकूण", "Ekun")}:`, leftMargin, totalY)
  doc.text(`${total} ${handleMarathiText("रुपये", "Rupaye")}`, leftMargin + 25, totalY)

  // Payment summary - Fix balance calculation
  const paymentY = totalY + 10
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const paidAmount = extractNumericValue(order["Paid Amt"])
  const remainingAmount = extractNumericValue(order["remaining Amt"])

  doc.text(
    `${handleMarathiText("पेमेंट", "Payment")}: ${paidAmount} ${handleMarathiText(
      "रुपये",
      "Rupaye"
    )}`,
    leftMargin,
    paymentY
  )
  doc.text(
    `${handleMarathiText("बाकी", "Baki")}: ${remainingAmount} ${handleMarathiText(
      "रुपये",
      "Rupaye"
    )}`,
    leftMargin + 60,
    paymentY
  )

  // Signature section - Remove unnecessary transliterations
  const signatureY = paymentY + 15
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")

  // Payment and owner signature lines
  doc.text(`${handleMarathiText("पेमेंट", "Payment")}:`, leftMargin, signatureY)
  doc.line(leftMargin + 25, signatureY - 2, leftMargin + 65, signatureY - 2)

  doc.text(`${handleMarathiText("मालक", "Malak")}:`, leftMargin + 85, signatureY)
  doc.line(leftMargin + 110, signatureY - 2, pageWidth - rightMargin, signatureY - 2)

  // Customer details section
  const customerDetailsY = signatureY + 8
  doc.text(
    `${handleMarathiText("ग्राहकाचे नाव", "Grahakache Naav")}:`,
    leftMargin,
    customerDetailsY
  )
  doc.line(leftMargin + 45, customerDetailsY - 2, pageWidth - rightMargin, customerDetailsY - 2)

  doc.text(
    `${handleMarathiText("पत्ता नंबर", "Patta Number")}: ${mobile}`,
    leftMargin,
    customerDetailsY + 6
  )

  return doc
}

// Generate Marathi Receipt for Print - 2 A5 receipts on A4 page
const generateMarathiReceiptHTMLForPrint = (order) => {
  const orderDate = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-IN")
    : new Date().toLocaleDateString("en-IN")

  // Helper function to extract numeric value from string like "₹ 1000"
  const extractNumericValue = (value) => {
    if (typeof value === "number") return value
    if (typeof value === "string") {
      // Remove currency symbols, spaces, and extract number
      const numericValue = value.replace(/[₹\s,]/g, "")
      return parseInt(numericValue) || 0
    }
    return 0
  }

  const plantType = sanitizeMarathiText(order.plantType || "N/A")
  const plantVariety = sanitizeMarathiText(order.plantVariety || "")
  const quantity = parseInt(order.quantity) || 0
  const rate = parseInt(order.rate) || 0
  const total = extractNumericValue(order.total) || quantity * rate
  const paidAmount = extractNumericValue(order["Paid Amt"])
  const remainingAmount = extractNumericValue(order["remaining Amt"])

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
        
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .page-break {
            page-break-after: always;
          }
          .receipt-container {
            page-break-inside: avoid;
          }
        }
        
        body {
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
          margin: 0;
          padding: 0;
          background: white;
          font-size: 12px;
          line-height: 1.3;
        }
        
        .page {
          width: 210mm; /* A4 portrait width */
          height: 297mm; /* A4 portrait height */
          margin: 0 auto;
          background: white;
          position: relative;
        }
        
        .receipt-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
        }
        
        .receipt {
          width: 148.5mm; /* A5 width */
          height: 105mm; /* A5 height */
          margin: 5mm;
          padding: 8mm;
          border: 1px solid #333;
          background: white;
          box-sizing: border-box;
          font-size: 10px;
        }
        
        .receipt-left {
          width: 95mm;
          height: 140mm;
          margin: 3mm;
          padding: 5mm;
          border: 1px solid #333;
          background: white;
          box-sizing: border-box;
          font-size: 9px;
        }
        
        .receipt-right {
          width: 95mm;
          height: 140mm;
          margin: 3mm;
          padding: 5mm;
          border: 1px solid #333;
          background: white;
          box-sizing: border-box;
          font-size: 9px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 1px solid #333;
          padding-bottom: 5px;
        }
        
        .title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        
        .date {
          font-size: 11px;
        }
        
        .customer-info {
          margin-bottom: 15px;
        }
        
        .info-row {
          margin-bottom: 4px;
          font-size: 9px;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 8px;
        }
        
        .table th, .table td {
          border: 1px solid #333;
          padding: 3px;
          text-align: left;
        }
        
        .table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        
        .total-row {
          font-weight: bold;
          background: #f9f9f9;
        }
        
        .signature-section {
          margin-top: 15px;
          font-size: 8px;
        }
        
        .signature-line {
          border-bottom: 1px solid #333;
          margin: 5px 0;
          height: 15px;
        }
        
        .payment-info {
          margin-top: 15px;
          font-size: 8px;
        }
      </style>
    </head>
    <body>
              <div class="page">
          <div class="receipt-container">
            <!-- Left Receipt -->
            <div class="receipt-left">
            <div class="header">
              <div class="title">रसीद</div>
              <div class="date">दिनांक: ${orderDate}</div>
            </div>
            
            <div class="customer-info">
              <div class="info-row"><strong>क्र:</strong> ${sanitizeMarathiText(
                order.order || "N/A"
              )}</div>
              <div class="info-row"><strong>श्री:</strong> ${sanitizeMarathiText(
                order.farmerName || "N/A"
              )}</div>
              <div class="info-row"><strong>गाव:</strong> ${sanitizeMarathiText(
                order.details?.farmer?.village || "N/A"
              )}</div>
              <div class="info-row"><strong>जिल्हा:</strong> ${sanitizeMarathiText(
                order.details?.farmer?.district || "N/A"
              )}</div>
              <div class="info-row"><strong>मोबाईल:</strong> ${sanitizeMarathiText(
                order.details?.farmer?.mobileNumber || "N/A"
              )}</div>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>रोप संख्या</th>
                  <th>प्रकार</th>
                  <th>दर</th>
                  <th>एकूण</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${quantity}</td>
                  <td>${plantType} ${plantVariety}</td>
                  <td>₹${rate}</td>
                  <td>₹${total}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="payment-info">
              <div class="info-row"><strong>जमा रक्कम:</strong> ₹${paidAmount}</div>
              <div class="info-row"><strong>एकूण:</strong> ₹${total} रुपये</div>
              <div class="info-row"><strong>बाकी:</strong> ₹${remainingAmount} रुपये</div>
            </div>
            
            <div class="signature-section">
              <div class="signature-line"></div>
              <div style="text-align: center; font-size: 8px;">ग्राहकाचे नाव</div>
            </div>
                      </div>
            
            <!-- Right Receipt -->
            <div class="receipt-right">
            <div class="header">
              <div class="title">रसीद</div>
              <div class="date">दिनांक: ${orderDate}</div>
            </div>
            
            <div class="customer-info">
              <div class="info-row"><strong>क्र:</strong> ${sanitizeMarathiText(
                order.order || "N/A"
              )}</div>
              <div class="info-row"><strong>श्री:</strong> ${sanitizeMarathiText(
                order.farmerName || "N/A"
              )}</div>
              <div class="info-row"><strong>गाव:</strong> ${sanitizeMarathiText(
                order.details?.farmer?.village || "N/A"
              )}</div>
              <div class="info-row"><strong>जिल्हा:</strong> ${sanitizeMarathiText(
                order.details?.farmer?.district || "N/A"
              )}</div>
              <div class="info-row"><strong>मोबाईल:</strong> ${sanitizeMarathiText(
                order.details?.farmer?.mobileNumber || "N/A"
              )}</div>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>रोप संख्या</th>
                  <th>प्रकार</th>
                  <th>दर</th>
                  <th>एकूण</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${quantity}</td>
                  <td>${plantType} ${plantVariety}</td>
                  <td>₹${rate}</td>
                  <td>₹${total}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="payment-info">
              <div class="info-row"><strong>जमा रक्कम:</strong> ₹${paidAmount}</div>
              <div class="info-row"><strong>एकूण:</strong> ₹${total} रुपये</div>
              <div class="info-row"><strong>बाकी:</strong> ₹${remainingAmount} रुपये</div>
            </div>
            
            <div class="signature-section">
              <div class="signature-line"></div>
              <div style="text-align: center; font-size: 8px;">ग्राहकाचे नाव</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return htmlContent
}

// Generate Marathi Receipt using HTML to PDF approach
const generateMarathiReceiptHTML = (order) => {
  const orderDate = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-IN")
    : new Date().toLocaleDateString("en-IN")

  // Helper function to extract numeric value from string like "₹ 1000"
  const extractNumericValue = (value) => {
    if (typeof value === "number") return value
    if (typeof value === "string") {
      // Remove currency symbols, spaces, and extract number
      const numericValue = value.replace(/[₹\s,]/g, "")
      return parseInt(numericValue) || 0
    }
    return 0
  }

  const plantType = sanitizeMarathiText(order.plantType || "N/A")
  const plantVariety = sanitizeMarathiText(order.plantVariety || "")
  const quantity = parseInt(order.quantity) || 0
  const rate = parseInt(order.rate) || 0
  const total = extractNumericValue(order.total) || quantity * rate
  const paidAmount = extractNumericValue(order["Paid Amt"])
  const remainingAmount = extractNumericValue(order["remaining Amt"])

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Noto Sans Devanagari', Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          font-size: 14px;
          line-height: 1.4;
        }
        .receipt {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 20px;
          border: 2px solid #333;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .date {
          font-size: 16px;
        }
        .customer-info {
          margin-bottom: 20px;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .table th, .table td {
          border: 1px solid #333;
          padding: 8px;
          text-align: left;
        }
        .table th {
          background: #f0f0f0;
          font-weight: bold;
        }
        .total-row {
          font-weight: bold;
          background: #f9f9f9;
        }
        .signature-section {
          margin-top: 30px;
        }
        .signature-line {
          border-bottom: 1px solid #333;
          margin: 10px 0;
          height: 20px;
        }
        .payment-info {
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="title">रसीद</div>
          <div class="date">दिनांक: ${orderDate}</div>
        </div>
        
        <div class="customer-info">
          <div class="info-row"><strong>क्र.</strong> ${order.order || "N/A"}</div>
          <div class="info-row"><strong>श्री:</strong> ${order.farmerName || "N/A"}</div>
          <div class="info-row">
            <strong>गाव:</strong> ${order.details?.farmer?.village || "N/A"} 
            <strong>तालुका:</strong> ${order.details?.farmer?.taluka || "N/A"}
          </div>
          <div class="info-row">
            <strong>जिल्हा:</strong> ${order.details?.farmer?.district || "N/A"} 
            <strong>मो नंबर:</strong> ${order.details?.farmer?.mobileNumber || "N/A"}
          </div>
        </div>
        
        <table class="table">
          <thead>
            <tr>
              <th>रोप संख्या</th>
              <th>प्रकार</th>
              <th>दर</th>
              <th>एकूण</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${quantity}</td>
              <td>${plantType}${plantVariety ? "<br>" + plantVariety : ""}</td>
              <td>${rate}</td>
              <td>${total}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3">जमा रक्कम</td>
              <td>${total}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="payment-info">
          <div class="info-row"><strong>एकूण:</strong> ${total} रुपये</div>
          <div class="info-row"><strong>पेमेंट:</strong> ${paidAmount} रुपये</div>
          <div class="info-row"><strong>बाकी:</strong> ${remainingAmount} रुपये</div>
        </div>
        
        <div class="signature-section">
          <div class="info-row">
            <strong>पेमेंट:</strong>
            <div class="signature-line"></div>
          </div>
          <div class="info-row">
            <strong>मालक:</strong>
            <div class="signature-line"></div>
          </div>
          <div class="info-row">
            <strong>ग्राहकाचे नाव:</strong>
            <div class="signature-line"></div>
          </div>
          <div class="info-row">
            <strong>पत्ता नंबर:</strong> ${order.details?.farmer?.mobileNumber || "N/A"}
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return htmlContent
}

const DownloadPDFButton = ({ order }) => {
  const handleClick = () => {
    // Create a modal with options
    const modal = document.createElement("div")
    modal.style.position = "fixed"
    modal.style.top = "0"
    modal.style.left = "0"
    modal.style.width = "100%"
    modal.style.height = "100%"
    modal.style.backgroundColor = "rgba(0,0,0,0.8)"
    modal.style.zIndex = "9999"
    modal.style.display = "flex"
    modal.style.justifyContent = "center"
    modal.style.alignItems = "center"

    const modalContent = document.createElement("div")
    modalContent.style.backgroundColor = "white"
    modalContent.style.padding = "30px"
    modalContent.style.borderRadius = "12px"
    modalContent.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)"
    modalContent.style.maxWidth = "400px"
    modalContent.style.width = "90%"
    modalContent.style.textAlign = "center"

    modalContent.innerHTML = `
      <h3 style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold; color: #333;">Select Receipt Type</h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button id="english-receipt" style="
          padding: 12px 20px; 
          background: linear-gradient(135deg, #3b82f6, #2563eb); 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500;
          transition: all 0.2s ease;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          📄 English Receipt (A4)
        </button>
        <button id="marathi-html-receipt" style="
          padding: 12px 20px; 
          background: linear-gradient(135deg, #10b981, #059669); 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500;
          transition: all 0.2s ease;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          📄 Marathi Receipt (A5) - True Marathi Text
        </button>
        <button id="marathi-print-direct" style="
          padding: 12px 20px; 
          background: linear-gradient(135deg, #f59e0b, #d97706); 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500;
          transition: all 0.2s ease;
        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          🖨️ Print Marathi Receipt (A4 Portrait - 2 Receipts)
        </button>
        <button id="close-modal" style="
          padding: 10px 20px; 
          background: #6b7280; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 14px; 
          margin-top: 10px;
        ">
          Cancel
        </button>
      </div>
    `

    modal.appendChild(modalContent)
    document.body.appendChild(modal)

    // Event handlers
    document.getElementById("english-receipt").onclick = () => {
      document.body.removeChild(modal)
      showPDFPreview(generateOrderPDF(order), "English")
    }

    document.getElementById("marathi-html-receipt").onclick = () => {
      document.body.removeChild(modal)
      showHTMLReceipt(generateMarathiReceiptHTML(order), "Marathi")
    }

    document.getElementById("marathi-print-direct").onclick = () => {
      document.body.removeChild(modal)
      printMarathiReceiptDirectly(order)
    }

    document.getElementById("close-modal").onclick = () => {
      document.body.removeChild(modal)
    }

    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
      }
    }
  }

  // Function to print Marathi receipt directly with 2 A5 receipts on A4 page
  const printMarathiReceiptDirectly = (order) => {
    const htmlContent = generateMarathiReceiptHTMLForPrint(order)

    // Create a new window for printing
    const printWindow = window.open("", "_blank", "width=800,height=600")
    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus()
      // Small delay to ensure content is fully loaded
      setTimeout(() => {
        printWindow.print()
        // Close window after printing (optional)
        // printWindow.close()
      }, 500)
    }
  }

  const showHTMLReceipt = (htmlContent, type) => {
    // Create a new window for the HTML receipt
    const newWindow = window.open("", "_blank", "width=800,height=600,scrollbars=yes,resizable=yes")
    newWindow.document.write(htmlContent)
    newWindow.document.close()

    // Add print functionality
    newWindow.onload = () => {
      newWindow.focus()
    }
  }

  const showPDFPreview = (doc, type) => {
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
      const pdfName = `${type}_Receipt_${order.order || "Order"}_${new Date()
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
    <div className="flex gap-1">
      <button
        onClick={handleClick}
        className="text-gray-700 hover:text-gray-900 focus:outline-none inline-flex items-center gap-1 p-2 rounded-md hover:bg-gray-100 transition-colors">
        <DownloadIcon size={16} />
        <span className="text-sm font-medium">Receipt</span>
      </button>
      <button
        onClick={() => {
          const htmlContent = generateMarathiReceiptHTML(order)
          showHTMLReceipt(htmlContent, "Marathi")
        }}
        className="text-green-700 hover:text-green-900 focus:outline-none inline-flex items-center gap-1 p-2 rounded-md hover:bg-green-100 transition-colors"
        title="Download Marathi Receipt (A5) - HTML">
        <DownloadIcon size={16} />
        <span className="text-sm font-medium">मराठी</span>
      </button>
      <button
        onClick={() => printMarathiReceiptDirectly(order)}
        className="text-orange-700 hover:text-orange-900 focus:outline-none inline-flex items-center gap-1 p-2 rounded-md hover:bg-orange-100 transition-colors"
        title="Print Marathi Receipt Directly (A5)">
        <DownloadIcon size={16} />
        <span className="text-sm font-medium">🖨️</span>
      </button>
    </div>
  )
}

export default DownloadPDFButton
