import { Dialog } from "@mui/material"
import React from "react"

const DeliveryChallanPDF = ({ open, onClose, dispatchData }) => {
  if (!dispatchData) return null
  const today = new Date().toLocaleDateString()

  const DeliveryChallanPage = ({ order }) => {
    const findPlantDetails = () => {
      return dispatchData.plantsDetails.find((p) =>
        p.name.toLowerCase().includes(order.plantDetails.name.toLowerCase())
      )
    }

    const plant = findPlantDetails(order.plantDetails.name)
    const totalPaid = order.details.payment.reduce((sum, p) => sum + p.paidAmount, 0)

    return (
      <div className="challan-page relative bg-white p-8 break-after-page">
        {/* Header */}
        <div className="text-center border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900">DELIVERY CHALLAN</h1>
          <p className="text-gray-600 mt-2">Date: {today}</p>
          <p className="text-gray-600">
            Challan No: {dispatchData.transportId}-{order.order}
          </p>
        </div>

        {/* Transport & Farmer Details */}
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Transport Details</h3>
              <div className="space-y-1">
                <p>
                  <span className="text-gray-600">Driver:</span> {dispatchData.driverName}
                </p>
                <p>
                  <span className="text-gray-600">Vehicle:</span> {dispatchData.vehicleName}
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Plant Details</h3>
              <div className="space-y-1">
                <p>
                  <span className="text-gray-600">Plant Name:</span> {plant?.name}
                </p>
                <p>
                  <span className="text-gray-600">Quantity:</span> {order.quantity}
                </p>
                {plant?.crates[0] && (
                  <>
                    <p>
                      <span className="text-gray-600">Cavity Type:</span>{" "}
                      {plant.crates[0].cavityName}
                    </p>
                    <p>
                      <span className="text-gray-600">Total Crates:</span>{" "}
                      {plant.crates[0].crateCount}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Farmer Details</h3>
            <div className="space-y-1">
              <p>
                <span className="text-gray-600">Name:</span> {order.details.farmer.name}
              </p>
              <p>
                <span className="text-gray-600">Mobile:</span> {order.details.farmer.mobileNumber}
              </p>
              <p>
                <span className="text-gray-600">Village:</span> {order.details.farmer.village}
              </p>
              <p>
                <span className="text-gray-600">Delivery Location:</span>{" "}
                {order.Delivery || "Not specified"}
              </p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-right">Quantity</th>
                <th className="border p-2 text-right">Rate</th>
                <th className="border p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">{plant?.name}</td>
                <td className="border p-2 text-right">{order.quantity}</td>
                <td className="border p-2 text-right">₹{order.rate}</td>
                <td className="border p-2 text-right">{order.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Details */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
          <div className="space-y-2">
            <p>
              <span className="text-gray-600">Total Amount:</span> {order.total}
            </p>
            <p>
              <span className="text-gray-600">Paid Amount:</span> ₹{totalPaid}
            </p>
            <p>
              <span className="text-gray-600">Remaining Amount:</span> {order["remaining Amt"]}
            </p>
          </div>

          {order.details.payment.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Payment History</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Mode</th>
                    <th className="border p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.details.payment?.map((payment, idx) => (
                    <tr key={idx}>
                      <td className="border p-2">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="border p-2">{payment.modeOfPayment}</td>
                      <td className="border p-2 text-right">₹{payment.paidAmount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t">
          <div className="flex justify-between">
            <div className="text-center">
              <div className="border-b border-black w-40 h-16"></div>
              <p className="text-sm text-gray-600 mt-2">Customer Signature</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black w-40 h-16"></div>
              <p className="text-sm text-gray-600 mt-2">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")

    // Get all challans HTML
    const challans = dispatchData.orderIds
      ?.map(
        (order, index) => `
      <div class="challan-page" style="
        page-break-after: always;
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
      ">
        ${document.querySelectorAll(".challan-page")[index].innerHTML}
      </div>
    `
      )
      .join("")

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
              }
              .challan-page {
                page-break-after: always;
                height: 100vh;
                box-sizing: border-box;
                padding: 2rem;
              }
              .challan-page:last-child {
                page-break-after: auto;
              }
              @page {
                size: A4;
                margin: 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                padding: 8px;
                border: 1px solid #ddd;
              }
              th {
                background-color: #f8f9fa;
                text-align: left;
              }
              h1 {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 16px;
              }
              h3 {
                font-size: 18px;
                font-weight: 600;
                margin: 16px 0 8px;
              }
              .border-b {
                border-bottom: 1px solid #e5e7eb;
              }
              .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
              }
              .space-y-1 > * + * {
                margin-top: 0.25rem;
              }
              .space-y-2 > * + * {
                margin-top: 0.5rem;
              }
              .space-y-4 > * + * {
                margin-top: 1rem;
              }
              .text-gray-600 {
                color: #4b5563;
              }
              .mt-2 { margin-top: 0.5rem; }
              .mt-4 { margin-top: 1rem; }
              .mt-6 { margin-top: 1.5rem; }
              .mt-8 { margin-top: 2rem; }
              .mt-12 { margin-top: 3rem; }
              .pb-6 { padding-bottom: 1.5rem; }
              .pt-6 { padding-top: 1.5rem; }
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
            <h2 className="text-xl font-semibold">Delivery Challans</h2>
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
                Print All Challans
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

export default DeliveryChallanPDF
