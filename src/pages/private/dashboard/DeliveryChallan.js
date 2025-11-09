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
      <div className="challan-page relative bg-white p-8 break-after-page">
        {/* Header with decorative underline */}
        <div className="text-center border-b-2 border-gray-400 pb-3 mb-5">
          <h1 className="text-3xl font-bold text-gray-900 tracking-wide">डिलिव्हरी चलन</h1>
          <div className="flex justify-center gap-8 mt-2 text-sm text-gray-700">
            <p className="font-semibold">तारीख: <span className="font-normal">{today}</span></p>
            <p className="font-semibold">चलन क्रमांक: <span className="font-normal">{dispatchData.transportId}-{order.order}</span></p>
          </div>
        </div>

        {/* Compact Details Table with alternating rows */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-400">
            <tbody>
              <tr className="bg-gray-100">
                <td className="border border-gray-400 p-2 font-semibold" style={{width: '20%'}}>चालक</td>
                <td className="border border-gray-400 p-2" style={{width: '30%'}}>{dispatchData.driverName}</td>
                <td className="border border-gray-400 p-2 font-semibold" style={{width: '20%'}}>वाहन</td>
                <td className="border border-gray-400 p-2" style={{width: '30%'}}>{dispatchData.vehicleName}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-400 p-2 font-semibold">शेतकरीचे नाव</td>
                <td className="border border-gray-400 p-2">{order.details?.farmer?.name || "N/A"}</td>
                <td className="border border-gray-400 p-2 font-semibold">मोबाईल</td>
                <td className="border border-gray-400 p-2">{order.details?.farmer?.mobileNumber || "N/A"}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-400 p-2 font-semibold">गाव</td>
                <td className="border border-gray-400 p-2">{order.details?.farmer?.village || "N/A"}</td>
                <td className="border border-gray-400 p-2 font-semibold">वितरण स्थान</td>
                <td className="border border-gray-400 p-2">{order.Delivery || "निर्दिष्ट नाही"}</td>
              </tr>
              <tr className="bg-white">
                <td className="border border-gray-400 p-2 font-semibold">रोपांचे नाव</td>
                <td className="border border-gray-400 p-2">{plant?.name?.replace(/\s*-\s*>\s*/g, "-")}</td>
                <td className="border border-gray-400 p-2 font-semibold">प्रमाण</td>
                <td className="border border-gray-400 p-2">{order.quantity}</td>
              </tr>
              {plant?.crates[0] && (
                <tr className="bg-gray-100">
                  <td className="border border-gray-400 p-2 font-semibold">कॅव्हिटी</td>
                  <td className="border border-gray-400 p-2">{plant.crates[0].cavityName}</td>
                  <td className="border border-gray-400 p-2 font-semibold">एकूण खोकी</td>
                  <td className="border border-gray-400 p-2">{plant.crates[0].crateCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Order Details */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3 text-gray-800 border-b border-gray-300 pb-2">ऑर्डर सारांश</h3>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left font-semibold">वर्णन</th>
                <th className="border border-gray-400 p-2 text-right font-semibold">प्रमाण</th>
                <th className="border border-gray-400 p-2 text-right font-semibold">दर</th>
                <th className="border border-gray-400 p-2 text-right font-semibold">रक्कम</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="border border-gray-400 p-2">{plant?.name?.replace(/\s*-\s*>\s*/g, "-")}</td>
                <td className="border border-gray-400 p-2 text-right">{order.quantity}</td>
                <td className="border border-gray-400 p-2 text-right">₹{order.rate}</td>
                <td className="border border-gray-400 p-2 text-right">{order.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Details Table */}
        <div>
          <h3 className="text-xl font-bold mb-3 text-gray-800 border-b border-gray-300 pb-2">पेमेंट तपशील</h3>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 p-2 text-left font-semibold">तारीख</th>
                <th className="border border-gray-400 p-2 text-left font-semibold">पद्धत</th>
                <th className="border border-gray-400 p-2 text-right font-semibold">रक्कम</th>
              </tr>
            </thead>
            <tbody>
              {paymentEntries.map((payment, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 p-2">
                    {payment?.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="border border-gray-400 p-2">{payment?.modeOfPayment || "N/A"}</td>
                  <td className="border border-gray-400 p-2 text-right">₹{payment?.paidAmount || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan="2" className="border border-gray-400 p-2">एकूण भरलेली रक्कम</td>
                <td className="border border-gray-400 p-2 text-right">₹{totalPaid}</td>
              </tr>
              <tr className="bg-white font-semibold">
                <td colSpan="2" className="border border-gray-400 p-2">एकूण रक्कम</td>
                <td className="border border-gray-400 p-2 text-right">{order.total}</td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td colSpan="2" className="border border-gray-400 p-2">उर्वरित रक्कम</td>
                <td className="border border-gray-400 p-2 text-right">{order["remaining Amt"]}</td>
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

    const challans = dispatchData.orderIds
      ?.map((order, index) => {
        const challanContent = challanElements[index]?.innerHTML
        if (!challanContent) {
          console.warn("Missing challan content for order index:", index)
          return ""
        }

        return `
      <div class="challan-page" style="
        page-break-after: always;
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
      ">
        ${challanContent}
      </div>
    `
      })
      .filter(Boolean)
      .join("")

    if (!challans) {
      printWindow.close()
      console.warn("No delivery challan content available to print.")
      return
    }

    // Create print document with necessary styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Delivery Challans - ${dispatchData.transportId}</title>
          <style>
            @media print {
              html, body {
                margin: 0;
                padding: 0;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 11px;
                color: #333 !important;
                background: white !important;
              }
              .challan-page {
                page-break-after: always;
                box-sizing: border-box;
                padding: 1.5rem;
              }
              .challan-page:last-child {
                page-break-after: auto;
              }
              @page {
                margin: 1cm;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
              }
              table, th, td {
                border: 1px solid #ccc !important;
              }
              th, td {
                padding: 5px 7px;
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
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333 !important;
                border-bottom: 2px solid #ccc !important;
              }
              h3 {
                font-size: 13px;
                font-weight: bold;
                margin: 10px 0 6px;
                color: #333 !important;
                border-bottom: 1px solid #ddd !important;
              }
              .border-b-2 {
                border-bottom: 2px solid #ccc !important;
              }
              .border {
                border: 1px solid #ccc !important;
              }
              .mb-3 { margin-bottom: 12px; }
              .mb-5 { margin-bottom: 20px; }
              .mb-6 { margin-bottom: 24px; }
              .mt-2 { margin-top: 8px; }
              .pb-2 { padding-bottom: 8px; }
              .pb-3 { padding-bottom: 12px; }
              p, span, div, td, th {
                color: #333 !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          ${challans}
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

          <div className="p-6">
            {dispatchData.orderIds?.map((order, index) => (
              <DeliveryChallanPage
                key={index}
                order={order}
                plantDetails={dispatchData.plantsDetails}
              />
            ))}

            <div className="mt-6 flex justify-end sticky bottom-0 bg-white p-4 border-t">
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
