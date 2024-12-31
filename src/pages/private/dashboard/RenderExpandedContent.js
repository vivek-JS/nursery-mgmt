import React, { useEffect, useState } from "react"
import { FaEdit } from "react-icons/fa" // Pencil Icon for Edit
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import { Toast } from "helpers/toasts/toastHelper"

const RenderExpandedContent = ({ details, farmer, orderId, refreshComponent, salesPerson }) => {
  const [editablePaymentId, setEditablePaymentId] = useState(null)
  const [updatedPayments, setUpdatedPayments] = useState(details.payment)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setUpdatedPayments(details.payment)
  }, [details.payment])
  const handleInputChange = (paymentId, key, value) => {
    if (editablePaymentId === paymentId) {
      const updatedPayment = updatedPayments.map((payment) =>
        payment._id === paymentId
          ? {
              ...payment,
              [key]: key === "paymentDate" && !value ? moment().format("YYYY-MM-DD") : value // Default to today's date if paymentDate is empty
            }
          : payment
      )
      setUpdatedPayments(updatedPayment)
    }
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
    const instance = NetworkManager(API.ORDER.UPDATE_PAYMENT_STATUS)
    const emps = await instance.request({ paymentId, orderId, paymentStatus })
    if (emps?.data?.order) {
      Toast.success(emps?.data?.message)
      refreshComponent()
    } else {
      Toast.error("Something went wrong")
    }

    setLoading(false)
  }
  const handleAddPaymentToDb = async () => {
    setLoading(true)
    const instance = NetworkManager(API.ORDER.ADD_PAYMENT)
    console.log(updatedPayments)
    const payload = { ...updatedPayments[0] }
    payload.paymentStatus = "COLLECTED"
    const emps = await instance.request(payload, [orderId])
    if (emps?.data) {
      Toast.success(emps?.data?.message)
      refreshComponent()
    } else {
      Toast.error("Something went wrong")
    }

    setLoading(false)
  }

  const handleAddPayment = () => {
    const newPayment = {
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

  // Handles file upload
  const handleFileUpload = (paymentId, files) => {
    if (files && files.length > 0) {
      const uploadedFiles = Array.from(files).map((file) => {
        return URL.createObjectURL(file) // Temporary preview URLs for client-side
      })

      const payments = updatedPayments.map((payment) =>
        payment._id === paymentId
          ? { ...payment, receiptPhoto: [...payment.receiptPhoto, ...uploadedFiles] }
          : payment
      )
      setUpdatedPayments(payments)
    }
  }

  // Handles removing receipt
  const handleRemoveReceipt = (paymentId) => {
    const payments = updatedPayments.map((payment) =>
      payment._id === paymentId ? { ...payment, receiptPhoto: [] } : payment
    )
    setUpdatedPayments(payments)
  }

  const renderRow = (payment) => {
    const isEditing = editablePaymentId === payment._id

    return (
      <tr key={payment._id} className="hover:bg-gray-50 transition">
        {/* Paid Amount */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">₹</span>
              <input
                type="number"
                value={payment.paidAmount || ""}
                onChange={(e) => handleInputChange(payment._id, "paidAmount", e.target.value)}
                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">₹</span>
              {payment.paidAmount}
            </div>
          )}
        </td>

        {/* Payment Date */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <input
              type="date"
              value={moment(payment.paymentDate).format("YYYY-MM-DD")} // Ensure proper format
              onChange={(e) => handleInputChange(payment._id, "paymentDate", e.target.value)}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            moment(payment.paymentDate).format("MMM D, YYYY")
          )}
        </td>

        {/* Mode of Payment Dropdown */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <select
              value={payment.modeOfPayment || ""}
              onChange={(e) => handleInputChange(payment._id, "modeOfPayment", e.target.value)}
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500">
              <option value="">Select Mode of Payment</option>
              <option value="Cash">Cash</option>
              <option value="Phone Pe">Phone Pe</option>
              <option value="Google Pay">Google Pay</option>
              <option value="Cheque">Cheque</option>
              <option value="JPCB">JPCB</option>
            </select>
          ) : (
            payment.modeOfPayment
          )}
        </td>
        {/* Bank Name (enabled only for Cheque) */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            payment.modeOfPayment === "Cheque" ? (
              <input
                type="text"
                value={payment.bankName || ""}
                onChange={(e) => handleInputChange(payment._id, "bankName", e.target.value)}
                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <span className="text-gray-400 italic">N/A</span>
            )
          ) : payment.modeOfPayment === "Cheque" ? (
            payment.bankName
          ) : (
            "N/A"
          )}
        </td>
        {/* Remark Field */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <input
              type="text"
              value={payment.remark || ""}
              onChange={(e) => handleInputChange(payment._id, "remark", e.target.value)}
              placeholder="Enter remark"
              className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            payment.remark || "No Remark"
          )}
        </td>

        {/* Payment Status */}
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

        {/* Receipt Photo */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <div>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) => handleFileUpload(payment._id, e.target.files)}
              />

              {payment.receiptPhoto?.length > 0 && (
                <div className="mt-2">
                  <img
                    src={payment.receiptPhoto[0]}
                    alt="Receipt Preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <button
                    onClick={() => handleRemoveReceipt(payment._id)}
                    className="ml-2 text-red-500 underline text-xs hover:text-red-700">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : payment.receiptPhoto?.length > 0 ? (
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

        {/* Action Buttons */}
        <td className="px-4 py-2 border-b text-center">
          {isEditing ? (
            <>
              <button
                onClick={() => handleAddPaymentToDb(payment._id)}
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
                  className="ml-2 px-3 py-1 text-sm text-yellow-700 bg-yellow-200 rounded hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-400">
                  Pending
                </button>
              ) : (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "COLLECTED")}
                  className="ml-2 px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600 focus:ring-2 focus:ring-green-400">
                  Confirm
                </button>
              )}
              {payment.paymentStatus !== "REJECTED" && (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "REJECTED")}
                  className="ml-2 px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 focus:ring-2 focus:ring-red-400">
                  Reject
                </button>
              )}
            </>
          )}
        </td>
      </tr>
    )
  }

  const getTotalPaidAmount = (payments) => {
    console.log(payments)
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus == "COLLECTED" ? payment.paidAmount : 0),
      0
    )
  }
  const totalPaidAmount = getTotalPaidAmount(updatedPayments)
  const totalRemainingAmount = 1000 - totalPaidAmount // Adjusted to dynamically calculate remaining amount

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-gray-100">
      {loading && <PageLoader />}

      <div className="bg-white p-6 shadow-md rounded-lg w-full lg:w-3/4">
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
              <th className="px-4 py-2 border text-left">Mode of Payment</th>
              <th className="px-4 py-2 border text-left">Bank Name</th>
              <th className="px-4 py-2 border text-left">Remark</th>
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
      <div className="bg-white p-6 shadow-md rounded-lg w-full lg:w-1/4">
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
          <strong>Name:</strong> {salesPerson.name}
        </p>

        <p className="text-gray-600 mb-2">
          <strong>Contact:</strong> {salesPerson.contact}
        </p>
      </div>
    </div>
  )
}

export default RenderExpandedContent
