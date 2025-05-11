import React from "react"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Button, Stack } from "@mui/material"
import { PictureAsPdf as PdfIcon, Download as DownloadIcon } from "@mui/icons-material"

/**
 * Enhanced Component for generating dealer-related PDF documents
 * This provides aesthetically pleasing and highly readable numerical formatting
 */
const DealerPDFExport = ({ dealer, dealerFinancial, dealerInventory, transactions }) => {
  /**
   * Format numbers according to Indian numbering system without using locale formatting
   * This avoids any issues with apostrophes or special characters
   */
  const formatIndianNumber = (num) => {
    // Convert to number first to handle string inputs
    const value = Number(num || 0)
    const numStr = value.toString()

    // For numbers less than 1000, no special formatting
    if (value < 1000) {
      return numStr
    }

    // Extract the last 3 digits
    const lastThree = numStr.substring(numStr.length - 3)
    // Get remaining digits
    const remaining = numStr.substring(0, numStr.length - 3)

    // Add commas for remaining digits (in groups of 2)
    if (remaining) {
      // Add commas every 2 digits from right to left
      let formattedRemaining = ""
      for (let i = remaining.length - 1, count = 0; i >= 0; i--, count++) {
        if (count > 0 && count % 2 === 0) {
          formattedRemaining = "," + formattedRemaining
        }
        formattedRemaining = remaining[i] + formattedRemaining
      }
      return formattedRemaining + "," + lastThree
    } else {
      return lastThree
    }
  }

  /**
   * Clean currency format using Rs. instead of ₹ to avoid any character issues
   */
  const formatCurrency = (amount) => {
    return "Rs. " + formatIndianNumber(amount)
  }

  /**
   * Helper function for color-coded utilization percentages
   */
  const getUtilizationColorCode = (percentage) => {
    if (percentage >= 85) return [230, 126, 34] // Amber/Orange for high utilization
    if (percentage >= 50) return [52, 152, 219] // Blue for medium utilization
    return [46, 204, 113] // Green for low utilization
  }

  /**
   * Helper function for compact currency format
   */
  const formatCompactCurrency = (amount) => {
    const value = Number(amount || 0)
    if (value >= 10000000) {
      return "Rs. " + (value / 10000000).toFixed(1) + " Cr"
    } else if (value >= 100000) {
      return "Rs. " + (value / 100000).toFixed(1) + " Lakh"
    } else if (value >= 1000) {
      return "Rs. " + (value / 1000).toFixed(1) + " K"
    } else {
      return "Rs. " + value
    }
  }

  /**
   * Generates a PDF of dealer transactions with enhanced numerical formatting
   */

  const generateTransactionsPDF = () => {
    if (!dealer || !transactions || transactions.length === 0) {
      console.error("Dealer data or transactions not available for PDF export")
      return
    }

    const doc = new jsPDF({
      orientation: "landscape", // Change to landscape for better table readability
      unit: "mm",
      format: "a4"
    })

    // Get page dimensions to use for full width tables
    const pageWidth = doc.internal.pageSize.width
    const pageMargin = 10
    const contentWidth = pageWidth - 2 * pageMargin

    // Add logo or branded header
    doc.setDrawColor(63, 81, 181) // Primary color
    doc.setLineWidth(0.5)
    doc.line(pageMargin, 15, pageWidth - pageMargin, 15)

    // Add title with better styling
    doc.setFontSize(22)
    doc.setTextColor(63, 81, 181) // Primary color for heading
    doc.text(`Transactions Report`, pageWidth / 2, 22, { align: "center" })

    doc.setFontSize(16)
    doc.text(`${dealer.name}`, pageWidth / 2, 30, { align: "center" })

    // Add dealer info in a more organized layout
    doc.setTextColor(0, 0, 0) // Reset to black
    doc.setFontSize(11)

    // Left aligned info
    doc.text(`Dealer ID: ${dealer._id}`, pageMargin + 5, 42)
    doc.text(`Phone: ${dealer.phoneNumber}`, pageMargin + 5, 48)

    // Right aligned info
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, pageWidth - pageMargin - 5, 42, {
      align: "right"
    })
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, pageWidth - pageMargin - 5, 48, {
      align: "right"
    })

    // Add a separator line
    doc.setDrawColor(200, 200, 200) // Light gray
    doc.setLineWidth(0.2)
    doc.line(pageMargin + 5, 52, pageWidth - pageMargin - 5, 52)

    // Format transactions for the table with enhanced formatting
    const tableData = transactions.map((transaction) => [
      new Date(transaction.createdAt).toLocaleDateString(),
      transaction.type.replace(/_/g, " "), // More readable format
      transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD"
        ? `+ ${formatCurrency(transaction.amount)}`
        : `- ${formatCurrency(transaction.amount)}`,
      formatCurrency(transaction.balanceBefore),
      formatCurrency(transaction.balanceAfter),
      transaction.description.substring(0, 40) + (transaction.description.length > 40 ? "..." : ""),
      transaction.status
    ])

    // Determine optimal column widths for full width table
    const columnWidths = {
      0: { cellWidth: contentWidth * 0.1 }, // Date - 10%
      1: { cellWidth: contentWidth * 0.12 }, // Type - 12%
      2: { cellWidth: contentWidth * 0.13, halign: "right" }, // Amount - 13%
      3: { cellWidth: contentWidth * 0.13, halign: "right" }, // Before - 13%
      4: { cellWidth: contentWidth * 0.13, halign: "right" }, // After - 13%
      5: { cellWidth: contentWidth * 0.29 }, // Description - 29%
      6: { cellWidth: contentWidth * 0.1, halign: "center" } // Status - 10%
    }

    // Create the table with enhanced styling
    doc.autoTable({
      startY: 58,
      head: [
        ["Date", "Type", "Amount", "Balance Before", "Balance After", "Description", "Status"]
      ],
      body: tableData,
      theme: "grid", // Changed from striped to grid for better readability
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center"
      },
      alternateRowStyles: {
        fillColor: [240, 240, 255] // Light blue alternate rows
      },
      styles: {
        overflow: "linebreak",
        fontSize: 10,
        cellPadding: 3
      },
      margin: { left: pageMargin, right: pageMargin },
      columnStyles: columnWidths,
      // Add conditional formatting for amounts
      didDrawCell: (data) => {
        // Only modify cells we're drawing text for
        if (data.section === "body" && data.column.index === 2 && data.cell.raw) {
          // Color code amounts based on transaction type
          const isCredit = data.cell.raw.startsWith("+ ")
          if (isCredit) {
            doc.setTextColor(0, 128, 0) // Green for credit
          } else {
            doc.setTextColor(192, 0, 0) // Red for debit
          }
        }
      },
      didParseCell: function (data) {
        // Reset text color after cell rendering
        if (data.section === "body") {
          doc.setTextColor(0, 0, 0)
        }
      }
    })

    // Add a summary section
    const lastY = doc.lastAutoTable.finalY || 58

    // Add a separator line
    doc.setDrawColor(200, 200, 200) // Light gray
    doc.setLineWidth(0.2)
    doc.line(pageMargin + 5, lastY + 8, pageWidth - pageMargin - 5, lastY + 8)

    // Add transaction statistics
    doc.setFontSize(14)
    doc.setTextColor(63, 81, 181) // Primary color for heading
    doc.text("Transaction Summary", pageMargin + 5, lastY + 16)

    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0) // Reset to black

    // Count transaction types
    const creditCount = transactions.filter((t) => t.type === "CREDIT").length
    const debitCount = transactions.filter((t) => t.type === "DEBIT").length
    const inventoryCount = transactions.filter(
      (t) =>
        t.type === "INVENTORY_ADD" || t.type === "INVENTORY_BOOK" || t.type === "INVENTORY_RELEASE"
    ).length

    // Calculate transaction totals
    const creditTotal = transactions
      .filter((t) => t.type === "CREDIT")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const debitTotal = transactions
      .filter((t) => t.type === "DEBIT")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const inventoryTotal = transactions
      .filter(
        (t) =>
          t.type === "INVENTORY_ADD" ||
          t.type === "INVENTORY_BOOK" ||
          t.type === "INVENTORY_RELEASE"
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    // Create a summary table with full width
    const summaryData = [
      ["Total Transactions", transactions.length.toString(), "", ""],
      ["Credit Transactions", creditCount.toString(), formatCurrency(creditTotal), ""],
      ["Debit Transactions", debitCount.toString(), formatCurrency(debitTotal), ""],
      ["Inventory Transactions", inventoryCount.toString(), formatCurrency(inventoryTotal), ""],
      [
        "Total Transaction Volume",
        "",
        formatCurrency(creditTotal + debitTotal + inventoryTotal),
        formatCompactCurrency(creditTotal + debitTotal + inventoryTotal)
      ]
    ]

    // Summary table column widths for full width
    const summaryColumnWidths = {
      0: { cellWidth: contentWidth * 0.3, fontStyle: "bold" }, // Category
      1: { cellWidth: contentWidth * 0.2, halign: "center" }, // Count
      2: { cellWidth: contentWidth * 0.25, halign: "right" }, // Amount
      3: { cellWidth: contentWidth * 0.25, halign: "right" } // Compact Amount
    }

    doc.autoTable({
      startY: lastY + 20,
      body: summaryData,
      theme: "plain",
      styles: { fontSize: 10 },
      margin: { left: pageMargin, right: pageMargin },
      columnStyles: summaryColumnWidths
    })

    // Add footer with decorative elements
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Add footer line
      doc.setDrawColor(63, 81, 181) // Primary color
      doc.setLineWidth(0.5)
      doc.line(
        pageMargin,
        doc.internal.pageSize.height - 18,
        pageWidth - pageMargin,
        doc.internal.pageSize.height - 18
      )

      // Add page number
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100) // Dark gray for footer
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 12, {
        align: "center"
      })

      // Add timestamp
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 7,
        { align: "center" }
      )
    }

    // Save the PDF with a clean filename
    doc.save(
      `${dealer?.name?.replace(/\s+/g, "_")}_Transactions_${
        new Date().toISOString().split("T")[0]
      }.pdf`
    )
  }

  /**
   * Generates a PDF with dealer profile, financial and inventory information
   * with aesthetically pleasing numerical formatting
   */
  const generateDealerProfilePDF = () => {
    if (!dealer) {
      console.error("Dealer data not available for PDF export")
      return
    }

    const doc = new jsPDF()

    // Add decorative header
    doc.setDrawColor(63, 81, 181) // Primary color
    doc.setLineWidth(0.5)
    doc.line(10, 15, doc.internal.pageSize.width - 10, 15)

    // Add title with better styling
    doc.setFontSize(20)
    doc.setTextColor(63, 81, 181) // Primary color for heading
    doc.text(`Dealer Profile`, doc.internal.pageSize.width / 2, 22, { align: "center" })

    doc.setFontSize(16)
    doc.text(`${dealer.name}`, doc.internal.pageSize.width / 2, 30, { align: "center" })

    // Add dealer info in a more organized layout
    doc.setTextColor(0, 0, 0) // Reset to black
    doc.setFontSize(11)

    // Create a visual info box
    doc.setDrawColor(220, 220, 220) // Light gray
    doc.setFillColor(245, 245, 250) // Very light blue/gray
    doc.roundedRect(20, 35, 170, 30, 3, 3, "FD")

    // Left column
    doc.setFontSize(11)
    doc.text(`Dealer ID: ${dealer._id}`, 25, 45)
    doc.text(`Phone: ${dealer.phoneNumber}`, 25, 52)

    // Right column
    const locationStr = [
      dealer.location?.village,
      dealer.location?.taluka,
      dealer.location?.district,
      dealer.location?.state
    ]
      .filter(Boolean)
      .join(", ")

    doc.text(`Location: ${locationStr}`, 120, 45)
    doc.text(`Status: ${dealer.isOnboarded ? "Onboarded" : "Not Onboarded"}`, 120, 52)

    if (dealer.birthDate) {
      doc.text(`Birth Date: ${new Date(dealer.birthDate).toLocaleDateString()}`, 25, 59)
    }

    // Financial summary with enhanced visual presentation
    let yPosition = 75

    // Section header with background
    doc.setFillColor(63, 81, 181) // Primary color
    doc.rect(14, yPosition - 6, 182, 8, "F")
    doc.setTextColor(255, 255, 255) // White text
    doc.setFontSize(12)
    doc.text("Financial Summary", doc.internal.pageSize.width / 2, yPosition - 1, {
      align: "center"
    })

    // Reset text color
    doc.setTextColor(0, 0, 0)

    if (dealerFinancial) {
      // Create a clean table for financial data
      const financialData = [
        ["Available Amount", formatCurrency(dealerFinancial.availableAmount || 0)],
        ["Total Order Amount", formatCurrency(dealerFinancial.totalOrderAmount || 0)],
        ["Total Paid Amount", formatCurrency(dealerFinancial.totalPaidAmount || 0)]
      ]

      // Add remaining amount with status indicator
      const remainingAmount = dealerFinancial.remainingAmount || 0
      const remainingStatus = remainingAmount < 0 ? "(in advance)" : "(due)"
      financialData.push([
        "Remaining Amount",
        `${formatCurrency(Math.abs(remainingAmount))} ${remainingStatus}`
      ])

      doc.autoTable({
        startY: yPosition + 2,
        body: financialData,
        theme: "grid",
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: "bold" }, // Label
          1: { cellWidth: 90, halign: "right" } // Amount (right-aligned)
        },
        didDrawCell: (data) => {
          // Color the remaining amount row based on advance/due status
          if (data.row.index === 3 && data.column.index === 1) {
            const isAdvance = data.cell.raw.includes("(in advance)")
            doc.setTextColor(isAdvance ? 0 : 192, isAdvance ? 128 : 0, 0)
          }
        }
      })

      // Get the last Y position after the table
      yPosition = doc.lastAutoTable.finalY + 10
    } else {
      doc.setFontSize(11)
      doc.text("Financial data not available", 20, yPosition + 10)
      yPosition += 20
    }

    // Inventory summary with improved visual presentation
    // Section header with background
    doc.setFillColor(63, 81, 181) // Primary color
    doc.rect(14, yPosition, 182, 8, "F")
    doc.setTextColor(255, 255, 255) // White text
    doc.setFontSize(12)
    doc.text("Inventory Summary", doc.internal.pageSize.width / 2, yPosition + 5, {
      align: "center"
    })

    // Reset text color
    doc.setTextColor(0, 0, 0)

    // Create inventory table with enhanced formatting
    if (dealerInventory && dealerInventory.length > 0) {
      const inventoryData = dealerInventory.map((plant) => {
        const utilizationPercentage = Math.round(
          (plant.totalBookedQuantity / plant.totalQuantity) * 100
        )
        return [
          `${plant.plantName} - ${plant.subtypeName}`,
          formatIndianNumber(plant.totalQuantity),
          formatIndianNumber(plant.totalBookedQuantity),
          formatIndianNumber(plant.totalRemainingQuantity),
          `${utilizationPercentage}%`
        ]
      })

      doc.autoTable({
        startY: yPosition + 10,
        head: [["Plant Type", "Total Qty", "Booked Qty", "Available Qty", "Utilization"]],
        body: inventoryData,
        theme: "grid", // Changed for better readability
        headStyles: {
          fillColor: [100, 120, 200],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center"
        },
        alternateRowStyles: {
          fillColor: [240, 240, 255] // Light blue alternate rows
        },
        columnStyles: {
          0: { cellWidth: 60 }, // Plant Type - left aligned
          1: { cellWidth: 30, halign: "right" }, // Total Qty - right aligned
          2: { cellWidth: 30, halign: "right" }, // Booked Qty - right aligned
          3: { cellWidth: 30, halign: "right" }, // Available Qty - right aligned
          4: { cellWidth: 30, halign: "center" } // Utilization - centered
        },
        // Color code utilization percentages
        didDrawCell: (data) => {
          // Color code utilization column (index 4)
          if (
            data.section === "body" &&
            data.column.index === 4 &&
            data.cell.raw &&
            typeof data.cell.raw === "string"
          ) {
            const percentage = parseInt(data.cell.raw.replace("%", ""), 10)
            if (!isNaN(percentage)) {
              const color = getUtilizationColorCode(percentage)
              doc.setTextColor(color[0], color[1], color[2])
            }
          } else if (data.section === "body") {
            doc.setTextColor(0, 0, 0) // Reset to black for other cells
          }
        }
      })

      // Get the last Y position after the inventory table
      yPosition = doc.lastAutoTable.finalY + 15

      // Check if we need to add a new page for slot details
      if (yPosition > 230) {
        doc.addPage()
        yPosition = 20
      }

      // Slot details section with improved visual separation
      // Section header with background
      doc.setFillColor(63, 81, 181) // Primary color
      doc.rect(14, yPosition, 182, 8, "F")
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(12)
      doc.text("Delivery Slot Details", doc.internal.pageSize.width / 2, yPosition + 5, {
        align: "center"
      })

      // Reset text color
      doc.setTextColor(0, 0, 0)

      yPosition += 15

      dealerInventory.forEach((plant, index) => {
        if (plant.slotDetails && plant.slotDetails.length > 0) {
          // Add plant name as subheading with background
          doc.setFillColor(230, 230, 250) // Light lavender
          doc.rect(20, yPosition - 5, 170, 7, "F")
          doc.setFontSize(11)
          doc.setTextColor(60, 60, 110) // Dark blue/purple
          doc.text(`${plant.plantName} - ${plant.subtypeName}`, 25, yPosition)
          doc.setTextColor(0, 0, 0) // Reset color

          // Create slot details table with enhanced formatting
          const slotData = plant.slotDetails.map((slot) => {
            const utilizationPercentage = Math.round((slot.bookedQuantity / slot.quantity) * 100)
            return [
              `${slot.dates.startDay} to ${slot.dates.endDay}, ${slot.dates.month}`,
              formatIndianNumber(slot.quantity),
              formatIndianNumber(slot.bookedQuantity),
              formatIndianNumber(slot.remainingQuantity),
              `${utilizationPercentage}%`
            ]
          })

          doc.autoTable({
            startY: yPosition + 2,
            head: [["Delivery Period", "Total", "Booked", "Available", "Utilization"]],
            body: slotData,
            theme: "grid",
            headStyles: {
              fillColor: [180, 190, 230],
              textColor: [60, 60, 110],
              fontStyle: "bold"
            },
            styles: { fontSize: 10 },
            margin: { left: 25, right: 25 },
            columnStyles: {
              0: { cellWidth: 40 }, // Delivery Period
              1: { cellWidth: 25, halign: "right" }, // Total - right aligned
              2: { cellWidth: 25, halign: "right" }, // Booked - right aligned
              3: { cellWidth: 25, halign: "right" }, // Available - right aligned
              4: { cellWidth: 25, halign: "center" } // Utilization - centered
            },
            // Color code utilization percentages
            didDrawCell: (data) => {
              // Color code utilization column (index 4)
              if (
                data.section === "body" &&
                data.column.index === 4 &&
                data.cell.raw &&
                typeof data.cell.raw === "string"
              ) {
                const percentage = parseInt(data.cell.raw.replace("%", ""), 10)
                if (!isNaN(percentage)) {
                  const color = getUtilizationColorCode(percentage)
                  doc.setTextColor(color[0], color[1], color[2])
                }
              } else if (data.section === "body") {
                doc.setTextColor(0, 0, 0) // Reset to black for other cells
              }
            }
          })

          // Update Y position after this table
          yPosition = doc.lastAutoTable.finalY + 10

          // Add a page if we're near the bottom and have more plants to show
          if (yPosition > 250 && index < dealerInventory.length - 1) {
            doc.addPage()
            yPosition = 20
          }
        }
      })

      // Check if we need to add a new page for summary
      if (yPosition > 230) {
        doc.addPage()
        yPosition = 20
      }

      // Add inventory summary with clean formatting
      // Section header with background
      doc.setFillColor(63, 81, 181) // Primary color
      doc.rect(14, yPosition, 182, 8, "F")
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(12)
      doc.text("Inventory Utilization Summary", doc.internal.pageSize.width / 2, yPosition + 5, {
        align: "center"
      })

      // Reset text color
      doc.setTextColor(0, 0, 0)

      // Calculate total inventory
      const totalInventory = dealerInventory.reduce(
        (sum, plant) => sum + (plant.totalQuantity || 0),
        0
      )
      const totalBooked = dealerInventory.reduce(
        (sum, plant) => sum + (plant.totalBookedQuantity || 0),
        0
      )
      const totalRemaining = dealerInventory.reduce(
        (sum, plant) => sum + (plant.totalRemainingQuantity || 0),
        0
      )
      const overallUtilization =
        totalInventory > 0 ? Math.round((totalBooked / totalInventory) * 100) : 0

      // Create summary table
      const summaryData = [
        ["Total Plants", formatIndianNumber(totalInventory)],
        ["Total Booked", formatIndianNumber(totalBooked)],
        ["Total Available", formatIndianNumber(totalRemaining)],
        ["Overall Utilization", `${overallUtilization}%`]
      ]

      doc.autoTable({
        startY: yPosition + 10,
        body: summaryData,
        theme: "grid",
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: "bold" }, // Label
          1: { cellWidth: 90, halign: "right" } // Value (right-aligned)
        },
        didDrawCell: (data) => {
          // Color code utilization percentage
          if (data.row.index === 3 && data.column.index === 1) {
            const percentage = parseInt(data.cell.raw, 10)
            if (!isNaN(percentage)) {
              const color = getUtilizationColorCode(percentage)
              doc.setTextColor(color[0], color[1], color[2])
            }
          }
        }
      })
    } else {
      doc.setFontSize(11)
      doc.text("No inventory data available", 20, yPosition + 10)
      yPosition += 20
    }

    // Add footer with decorative elements
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Add footer line
      doc.setDrawColor(63, 81, 181) // Primary color
      doc.setLineWidth(0.5)
      doc.line(
        10,
        doc.internal.pageSize.height - 18,
        doc.internal.pageSize.width - 10,
        doc.internal.pageSize.height - 18
      )

      // Add page number and company name
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100) // Dark gray for footer
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 12,
        { align: "center" }
      )

      // Add timestamp
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 7,
        { align: "center" }
      )
    }

    // Save the PDF with a clean filename
    doc.save(
      `${dealer?.name?.replace(/\s+/g, "_")}_Profile_${new Date().toISOString().split("T")[0]}.pdf`
    )
  }

  return (
    <Stack direction="row" spacing={2}>
      <Button
        variant="outlined"
        startIcon={<PdfIcon />}
        onClick={generateDealerProfilePDF}
        disabled={!dealer}
        sx={{
          borderColor: "primary.main",
          color: "primary.main",
          "&:hover": { borderColor: "primary.dark", bgcolor: "primary.50" },
          padding: "10px 20px",
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: "bold"
        }}>
        Export Dealer Profile
      </Button>
      <Button
        variant="contained"
        startIcon={<DownloadIcon />}
        onClick={generateTransactionsPDF}
        disabled={!dealer || !transactions || transactions.length === 0}
        sx={{
          bgcolor: "primary.main",
          "&:hover": { bgcolor: "primary.dark" },
          padding: "10px 20px",
          borderRadius: "8px",
          textTransform: "none",
          fontWeight: "bold"
        }}>
        Download Transactions
      </Button>
    </Stack>
  )
}

export default DealerPDFExport

// Example usage:
// <DealerPDFExport
//   dealer={dealer}
//   dealerFinancial={dealerFinancial}
//   dealerInventory={dealerInventory}
//   transactions={transactions}
// />
