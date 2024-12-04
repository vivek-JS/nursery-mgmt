import React, { useState } from "react"
import { FaEdit } from "react-icons/fa" // Pencil Icon for Edit
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"

const RenderExpandedContent = ({ details, farmer, orderId }) => {
  console.log(orderId)
  const [editablePaymentId, setEditablePaymentId] = useState(null)
  const [updatedPayments, setUpdatedPayments] = useState(details.payment)
  const [loading, setLoading] = useState(false)
  console.log(details)
  const handleInputChange = (paymentId, key, value) => {
    if (editablePaymentId === paymentId) {
      const updatedPayment = updatedPayments.map((payment) =>
        payment._id === paymentId ? { ...payment, [key]: value } : payment
      )
      setUpdatedPayments(updatedPayment)
    }
  }

  const handleSaveEdit = (paymentId) => {
    console.log(`Changes saved for Payment ID: ${paymentId}`, updatedPayments)
    setEditablePaymentId(null)
  }

  const handleCancelEdit = () => {
    setEditablePaymentId(null)
    setUpdatedPayments(details.payment) // Reset to initial state
  }

  const handleEditPayment = (paymentId) => {
    setEditablePaymentId(paymentId)
  }

  const handleConfirmPayment = async (paymentId, paymentStatus) => {
    setLoading(true)

    const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
    const emps = await instance.request({ paymentId, orderId, paymentStatus })
    // if (emps?.data?.status === "Success") {
    //   getOrders()
    // }

    setLoading(false)
  }

  const handleRejectPayment = (paymentId) => {
    console.log(`Payment rejected for ID: ${paymentId}`)
    // Add reject logic
  }

  const handleAddPayment = () => {
    const newPayment = {
      _id: `temp-${Date.now()}`, // Temporary ID
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"), // Default to today's date
      bankName: "",
      modeOfPayment: "",
      paymentStatus: false,
      receiptPhoto: []
    }
    setUpdatedPayments([newPayment, ...updatedPayments])
    setEditablePaymentId(newPayment._id)
  }

  const renderRow = (payment) => {
    const isEditing = editablePaymentId === payment._id
    console.log(payment)
    return (
      <tr key={payment._id} className="hover:bg-gray-50 transition">
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <input
              type="number"
              value={payment.paidAmount}
              onChange={(e) => handleInputChange(payment._id, "paidAmount", e.target.value)}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            payment.paidAmount
          )}
        </td>
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <input
              type="date"
              value={moment(payment.paymentDate).format("YYYY-MM-DD")}
              onChange={(e) => handleInputChange(payment._id, "paymentDate", e.target.value)}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            moment(payment.paymentDate).format("MMM D, YYYY")
          )}
        </td>
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <input
              type="text"
              value={payment.bankName}
              onChange={(e) => handleInputChange(payment._id, "bankName", e.target.value)}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            payment.bankName
          )}
        </td>
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <input
              type="text"
              value={payment.modeOfPayment}
              onChange={(e) => handleInputChange(payment._id, "modeOfPayment", e.target.value)}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            payment.modeOfPayment
          )}
        </td>
        <td className="px-4 py-2 border-b text-center">
          {payment.paymentStatus === "COLLECTED" ? (
            <span className="px-3 py-1 text-sm font-medium text-white bg-green-500 rounded-full">
              COLLECTED
            </span>
          ) : payment.paymentStatus === "REJECTED" ? (
            <span className="px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-full">
              REJECTED
            </span>
          ) : (
            <span className="px-3 py-1 text-sm font-medium text-gray-700 bg-yellow-400 rounded-full">
              PENDING
            </span>
          )}
        </td>
        <td className="px-4 py-2 border-b text-center">
          {payment.receiptPhoto?.length > 0 ? (
            <a
              href={payment.receiptPhoto[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline hover:text-blue-700">
              View Receipts
            </a>
          ) : (
            "No Receipts"
          )}
        </td>
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <>
              <button
                onClick={() => handleSaveEdit(payment._id)}
                className="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600 focus:ring-2 focus:ring-green-400">
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="ml-2 px-3 py-1 text-sm text-gray-600 border rounded hover:bg-gray-100 focus:ring-2 focus:ring-gray-300">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleEditPayment(payment._id)}
                className="px-3 py-1 text-blue-600 hover:text-blue-800"
                title="Edit Payment">
                <FaEdit />
              </button>
              {payment?.paymentStatus === "COLLECTED" ? (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "PENDING")}
                  className="ml-2 px-3 py-1 text-sm text-yellow-700 bg-yellow-200 rounded hover:bg-yellow-100-600 focus:ring-2 focus:ring-yellow-400">
                  Pending
                </button>
              ) : (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "COLLECTED")}
                  className="ml-2 px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600 focus:ring-2 focus:ring-green-400">
                  Confirm
                </button>
              )}
              <button
                onClick={() => handleRejectPayment(payment._id)}
                className="ml-2 px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 focus:ring-2 focus:ring-red-400">
                Reject
              </button>
            </>
          )}
        </td>
      </tr>
    )
  }

  const totalPaidAmount = updatedPayments?.reduce(
    (sum, payment) => sum + Number(payment.paidAmount || 0),
    0
  )
  const totalRemainingAmount = 1000 - totalPaidAmount // Adjusted to dynamically calculate remaining amount

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-gray-100">
      {loading && <PageLoader />}

      <div className="bg-white p-6 shadow-md rounded-lg w-full lg:w-2/3">
        <h4 className="text-lg font-semibold text-gray-700 mb-4">Payment History</h4>
        <button
          onClick={handleAddPayment}
          className="mb-4 px-4 py-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 focus:ring-2 focus:ring-blue-400">
          Add Payment
        </button>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-4 py-2 border text-left">Paid Amount</th>
              <th className="px-4 py-2 border text-left">Payment Date</th>
              <th className="px-4 py-2 border text-left">Bank Name</th>
              <th className="px-4 py-2 border text-left">Mode of Payment</th>
              <th className="px-4 py-2 border text-left">Status</th>
              <th className="px-4 py-2 border text-center">Receipts</th>
              <th className="px-4 py-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>{updatedPayments.map(renderRow)}</tbody>
        </table>
        <div className="mt-4">
          <p className="text-gray-700 text-lg font-semibold">
            Total Paid Amount: <span className="text-green-600">₹{totalPaidAmount}</span>
          </p>
          <p className="text-gray-700 text-lg font-semibold mt-2">
            Total Remaining Amount: <span className="text-red-600">₹{totalRemainingAmount}</span>
          </p>
        </div>
      </div>
      <div className="bg-white p-6 shadow-md rounded-lg w-full lg:w-1/3">
        <h4 className="text-lg font-semibold text-gray-700 mb-4">Farmer Details</h4>
        <p className="text-gray-600 mb-2">
          <strong>Name:</strong> {farmer.name}
        </p>
        <p className="text-gray-600 mb-2">
          <strong>Address:</strong> {farmer.address}
        </p>
        <p className="text-gray-600 mb-2">
          <strong>Contact:</strong> {farmer.contact}
        </p>
        <h4 className="text-lg font-semibold text-gray-700 mb-4">Sales Person Details</h4>
        <p className="text-gray-600 mb-2">
          <strong>Name:</strong> {farmer.name}
        </p>

        <p className="text-gray-600 mb-2">
          <strong>Contact:</strong> {farmer.contact}
        </p>
      </div>
    </div>
  )
}

export default RenderExpandedContent
