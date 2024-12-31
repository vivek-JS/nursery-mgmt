import React from "react"
import { DownloadIcon } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"

const generateOrderPDF = (order) => {
  const doc = new jsPDF()

  // Order Info Box - Even more compact
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("ORDER ID:", 15, 10)
  doc.setFont("helvetica", "normal")
  doc.text(String(order.order || ""), 40, 10)
  doc.setFont("helvetica", "bold")
  doc.text("DATE:", 110, 10)
  doc.setFont("helvetica", "normal")
  doc.text(String(order.orderDate || ""), 130, 10)

  // Farmer Details Table - More compact
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("FARMER DETAILS", 15, 18)

  doc.autoTable({
    startY: 20,
    theme: "plain",
    body: [
      ["Name", order.farmerName || ""],
      ["Village", order.details.farmer.village || "N/A"],
      ["Contact", order.details.farmer.mobileNumber || "N/A"]
    ],
    styles: {
      fontSize: 9,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 140 }
    },
    margin: { left: 15, right: 15 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1
  })

  // Order Details Table - More compact
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("ORDER DETAILS", 15, doc.lastAutoTable.finalY + 5)

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 7,
    theme: "plain",
    body: [
      ["Plant Type", order.plantType || ""],
      ["Quantity", `${String(order.quantity || "")} units`],
      ["Rate", `₹${String(order.rate || "")} per unit`],
      ["Total Amount", String(order.total || "")],
      ["Delivery", String(order.Delivery || "")]
    ],
    styles: {
      fontSize: 9,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: 140 }
    },
    margin: { left: 15, right: 15 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1
  })

  // Payment History Table - More compact
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("PAYMENT HISTORY", 15, doc.lastAutoTable.finalY + 5)

  const paymentData = order.details.payment.map((payment) => [
    payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : "-",
    payment.paymentType || "-",
    payment.paymentStatus || "-",
    `₹${String(payment.paidAmount?.toLocaleString() || "0")}`
  ])

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 7,
    head: [["Date", "Type", "Status", "Amount"]],
    body: paymentData,
    theme: "plain",
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 0,
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: 1
    },
    styles: {
      fontSize: 9,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "left" },
      1: { cellWidth: 50, halign: "left" },
      2: { cellWidth: 35, halign: "center" },
      3: { cellWidth: 35, halign: "right" }
    },
    margin: { left: 15, right: 15 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1
  })

  // Final Summary - More compact
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 3,
    theme: "plain",
    body: [
      ["Total Amount:", String(order.total || "")],
      ["Paid Amount:", String(order["Paid Amt"] || "")],
      ["Balance:", String(order["remaining Amt"] || "")]
    ],
    styles: {
      fontSize: 9,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: "bold" },
      1: { cellWidth: 35, halign: "right" }
    },
    margin: { left: 110 },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.1
  })

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
    wrapper.style.backgroundColor = "rgba(0,0,0,0.5)"
    wrapper.style.zIndex = "9999"
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
    closeButton.onclick = () => {
      document.body.removeChild(wrapper)
      URL.revokeObjectURL(url)
    }
    wrapper.appendChild(closeButton)

    // Add to body
    document.body.appendChild(wrapper)

    // Print after a short delay
    setTimeout(() => {
      window.print()
    }, 1000)
  }

  return (
    <button
      onClick={handleClick}
      className="text-blue-600 hover:text-blue-800 focus:outline-none inline-flex items-center gap-1">
      <DownloadIcon size={16} />
    </button>
  )
}

export default DownloadPDFButton
