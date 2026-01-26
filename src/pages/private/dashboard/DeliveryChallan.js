import { Dialog } from "@mui/material"
import React from "react"

const DeliveryChallanPDF = ({ open, onClose, dispatchData }) => {
  if (!dispatchData) return null
  const today = new Date().toLocaleDateString()

  const DeliveryChallanPage = ({ order }) => {
    const plantDetailsList = Array.isArray(dispatchData?.plantsDetails)
      ? dispatchData.plantsDetails
      : []
    const orderPlantName = order?.plantDetails?.name?.toLowerCase()

    const findPlantDetails = () => {
      if (!plantDetailsList.length) return null
      if (!orderPlantName) return plantDetailsList[0]

      return (
        plantDetailsList.find((p) => p?.name?.toLowerCase().includes(orderPlantName)) ||
        plantDetailsList[0]
      )
    }

    const plant = findPlantDetails()
    const paymentEntries = Array.isArray(order?.details?.payment) ? order.details.payment : []
    const totalPaid = paymentEntries.reduce((sum, p) => sum + (p?.paidAmount || 0), 0)

    return (
      <div className="challan-page relative bg-white p-4 break-after-page">
        {/* Header with decorative underline */}
        <div className="text-center border-b-2 border-gray-400 pb-2 mb-3">
          <h1 className="text-2xl font-bold text-gray-900 tracking-wide">डिलिव्हरी चलन</h1>
          <div className="flex justify-center gap-6 mt-1 text-xs text-gray-700">
            <p className="font-semibold">तारीख: <span className="font-normal">{today}</span></p>
            <p className="font-semibold">चलन क्रमांक: <span className="font-normal">{dispatchData.transportId}-{order.order}</span></p>
          </div>
        </div>

        {/* Compact Details Table with alternating rows */}
        <div className="mb-3">
          <table className="w-full border-collapse border border-gray-400">
            <tbody>
              <tr className="bg-gray-100">
                <td className="border border-gray-400 p-1.5 font-semibold text-xs" style={{width: '20%'}}>चालक</td>
                <td className="border border-gray-400 p-1.5 text-xs" style={{width: '30%'}}>{dispatchData.driverName}</td>
                <td className="border border-gray-400 p-1.5 font-semibold text-xs" style={{width: '20%'}}>वाहन</td>
                <td className="border border-gray-400 p-1.5 text-xs" style={{width: '30%'}}>{dispatchData.vehicleName}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-400 p-1.5 font-semibold text-xs">शेतकरीचे नाव</td>
                <td className="border border-gray-400 p-1.5 text-xs">{order.details?.farmer?.name || "N/A"}</td>
                <td className="border border-gray-400 p-1.5 font-semibold text-xs">मोबाईल</td>
                <td className="border border-gray-400 p-1.5 text-xs">{order.details?.farmer?.mobileNumber || "N/A"}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-400 p-1.5 font-semibold text-xs">गाव</td>
                <td className="border border-gray-400 p-1.5 text-xs">{order.details?.farmer?.village || "N/A"}</td>
                <td className="border border-gray-400 p-1.5 font-semibold text-xs">वितरण स्थान</td>
                <td className="border border-gray-400 p-1.5 text-xs">{order.Delivery || "निर्दिष्ट नाही"}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-400 p-1.5 font-semibold text-xs">रोपांचे नाव</td>
                <td className="border border-gray-400 p-1.5 text-xs">{plant?.name?.replace(/\s*-\s*>\s*/g, "-")}</td>
                <td className="border border-gray-400 p-1.5 font-semibold text-xs">प्रमाण</td>
                <td className="border border-gray-400 p-1.5 text-xs">{order.quantity}</td>
              </tr>
              {plant?.crates[0] && (
                <tr className="bg-gray-100">
                  <td className="border border-gray-400 p-1.5 font-semibold text-xs">कॅव्हिटी</td>
                  <td className="border border-gray-400 p-1.5 text-xs">{plant.crates[0].cavityName}</td>
                  <td className="border border-gray-400 p-1.5 font-semibold text-xs">एकूण खोकी</td>
                  <td className="border border-gray-400 p-1.5 text-xs">{plant.crates[0].crateCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Order Details */}
        <div className="mb-3">
          <h3 className="text-base font-bold mb-1.5 text-gray-800 border-b border-gray-300 pb-1">ऑर्डर सारांश</h3>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-1.5 text-left font-semibold text-xs">वर्णन</th>
                <th className="border border-gray-400 p-1.5 text-right font-semibold text-xs">प्रमाण</th>
                <th className="border border-gray-400 p-1.5 text-right font-semibold text-xs">दर</th>
                <th className="border border-gray-400 p-1.5 text-right font-semibold text-xs">रक्कम</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-400 p-1.5 text-xs">{plant?.name?.replace(/\s*-\s*>\s*/g, "-")}</td>
                <td className="border border-gray-400 p-1.5 text-right text-xs">{order.quantity}</td>
                <td className="border border-gray-400 p-1.5 text-right text-xs">₹{order.rate}</td>
                <td className="border border-gray-400 p-1.5 text-right text-xs">{order.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Details Table */}
        <div>
          <h3 className="text-base font-bold mb-1.5 text-gray-800 border-b border-gray-300 pb-1">पेमेंट तपशील</h3>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-1.5 text-left font-semibold text-xs">तारीख</th>
                <th className="border border-gray-400 p-1.5 text-left font-semibold text-xs">पद्धत</th>
                <th className="border border-gray-400 p-1.5 text-right font-semibold text-xs">रक्कम</th>
              </tr>
            </thead>
            <tbody>
              {paymentEntries.map((payment, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 p-1.5 text-xs">
                    {payment?.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="border border-gray-400 p-1.5 text-xs">{payment?.modeOfPayment || "N/A"}</td>
                  <td className="border border-gray-400 p-1.5 text-right text-xs">₹{payment?.paidAmount || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan="2" className="border border-gray-400 p-1.5 text-xs">एकूण भरलेली रक्कम</td>
                <td className="border border-gray-400 p-1.5 text-right text-xs">₹{totalPaid}</td>
              </tr>
              <tr className="bg-white font-semibold">
                <td colSpan="2" className="border border-gray-400 p-1.5 text-xs">एकूण रक्कम</td>
                <td className="border border-gray-400 p-1.5 text-right text-xs">{order.total}</td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td colSpan="2" className="border border-gray-400 p-1.5 text-xs">उर्वरित रक्कम</td>
                <td className="border border-gray-400 p-1.5 text-right text-xs">{order["remaining Amt"]}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")

    if (!printWindow) {
      console.error("Unable to open print window for delivery challan")
      return
    }

    // Get all challans HTML
    const challanElements = Array.from(
      document?.querySelectorAll?.(".challan-page") ?? []
    )

    const orderIds = dispatchData.orderIds || []
    const challanContents = orderIds
      .map((order, index) => {
        const challanContent = challanElements[index]?.innerHTML
        if (!challanContent) {
          console.warn("Missing challan content for order index:", index)
          return null
        }
        return challanContent
      })
      .filter(Boolean)

    if (!challanContents.length) {
      printWindow.close()
      console.warn("No delivery challan content available to print.")
      return
    }

    // Group challans in pairs for 2 per page in landscape
    const pairedChallans = []
    for (let i = 0; i < challanContents.length; i += 2) {
      const pair = [
        challanContents[i],
        challanContents[i + 1] || null
      ]
      pairedChallans.push(pair)
    }

    const pages = pairedChallans.map((pair, pageIndex) => {
      const isLastPage = pageIndex === pairedChallans.length - 1
      const hasSecondOrder = pair[1] !== null && pair[1] !== undefined
      return `
        <div class="landscape-page" style="
          page-break-after: ${isLastPage ? 'auto' : 'always'};
          display: flex;
          gap: 8px;
          padding: 6px;
          width: 100%;
          min-height: 100%;
        ">
          <div class="challan-column" style="
            width: ${hasSecondOrder ? '48%' : '100%'};
            flex: ${hasSecondOrder ? '1' : 'none'};
            border: 1px solid #ddd;
            padding: 6px;
            box-sizing: border-box;
          ">
            ${pair[0]}
          </div>
          ${hasSecondOrder ? `
          <div class="challan-column" style="
            width: 48%;
            flex: 1;
            border: 1px solid #ddd;
            padding: 6px;
            box-sizing: border-box;
          ">
            ${pair[1]}
          </div>
          ` : ''}
        </div>
      `
    }).join("")

    // Create print document with necessary styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challans - ${dispatchData.transportId}</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 0.5cm;
              }
              html, body {
                margin: 0;
                padding: 0;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 9px;
                color: #333 !important;
                background: white !important;
              }
              .landscape-page {
                display: flex;
                flex-direction: row;
                gap: 8px;
                padding: 6px;
                box-sizing: border-box;
                width: 100%;
                height: 100%;
                page-break-after: always;
              }
              .landscape-page:last-child {
                page-break-after: auto;
              }
              .challan-column {
                width: 48%;
                flex: 1 1 48%;
                border: 1px solid #ddd;
                padding: 6px;
                box-sizing: border-box;
                page-break-inside: avoid;
                overflow: hidden;
              }
              .challan-page {
                box-sizing: border-box;
                padding: 4px;
                width: 100%;
                height: 100%;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 8px;
                margin-bottom: 4px;
              }
              table, th, td {
                border: 1px solid #ccc !important;
              }
              th, td {
                padding: 3px 4px;
              }
              .bg-gray-100 {
                background-color: #f5f5f5 !important;
              }
              .bg-gray-50 {
                background-color: #fafafa !important;
              }
              .bg-white {
                background-color: white !important;
              }
              h1 {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 4px;
                margin-top: 0;
                color: #333 !important;
                border-bottom: 2px solid #ccc !important;
                padding-bottom: 4px;
              }
              h3 {
                font-size: 10px;
                font-weight: bold;
                margin: 4px 0 2px;
                color: #333 !important;
                border-bottom: 1px solid #ddd !important;
                padding-bottom: 2px;
              }
              .border-b-2 {
                border-bottom: 2px solid #ccc !important;
              }
              .border {
                border: 1px solid #ccc !important;
              }
              .mb-1 { margin-bottom: 4px; }
              [class*="mb-1.5"] { margin-bottom: 6px; }
              .mb-3 { margin-bottom: 8px; }
              .mb-5 { margin-bottom: 12px; }
              .mb-6 { margin-bottom: 16px; }
              .mt-1 { margin-top: 4px; }
              .mt-2 { margin-top: 6px; }
              .pb-1 { padding-bottom: 4px; }
              .pb-2 { padding-bottom: 6px; }
              .pb-3 { padding-bottom: 8px; }
              [class*="p-1.5"] { padding: 6px; }
              .p-4 { padding: 8px; }
              .text-xs { font-size: 8px; }
              .text-base { font-size: 10px; }
              .text-2xl { font-size: 14px; }
              p, span, div, td, th {
                color: #333 !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
            @media screen {
              .landscape-page {
                display: flex;
                flex-direction: row;
                gap: 10px;
                padding: 10px;
                width: 100%;
              }
              .challan-column {
                width: 48%;
                flex: 1 1 48%;
                border: 1px solid #ddd;
                padding: 10px;
                box-sizing: border-box;
              }
              .print-instruction {
                display: block;
                background: #fff3cd;
                border: 2px solid #ffc107;
                padding: 12px;
                margin: 10px;
                border-radius: 4px;
                text-align: center;
                font-weight: bold;
                color: #856404;
              }
            }
            @media print {
              .print-instruction {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-instruction">
            ⚠️ कृपया Print Settings मध्ये Orientation: <strong>Landscape (Horizontal)</strong> निवडा / Please select Landscape (Horizontal) orientation in Print Settings
          </div>
          ${pages}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // Wait for content and styles to load
    setTimeout(() => {
      printWindow.print()
      // Close window after printing is done or cancelled
      printWindow.onafterprint = () => {
        printWindow.close()
      }
    }, 1000)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold">डिलिव्हरी चलन</h2>
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
            {dispatchData.orderIds?.map((order, index) => (
              <DeliveryChallanPage
                key={index}
                order={order}
                plantDetails={dispatchData.plantsDetails}
              />
            ))}

            <div className="mt-4 flex justify-end sticky bottom-0 bg-white p-3 border-t">
              <button
                onClick={handlePrint}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
सर्व चलन प्रिंट करा
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default DeliveryChallanPDF
