import React, { useEffect, useState } from "react"
import {
  FaEdit,
  FaUser,
  FaCreditCard,
  FaHistory,
  FaFileAlt,
  FaPhone,
  FaMapMarkerAlt
} from "react-icons/fa"
import { CheckIcon, XIcon, PlusIcon, EyeIcon } from "lucide-react"
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import { Toast } from "helpers/toasts/toastHelper"

const RenderExpandedContent = ({
  details,
  farmer,
  orderId,
  refreshComponent,
  salesPerson,
  orderDetaisl
}) => {
  const [editablePaymentId, setEditablePaymentId] = useState(null)
  const [updatedPayments, setUpdatedPayments] = useState(details.payment)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("payments")

  useEffect(() => {
    setUpdatedPayments(details.payment)
  }, [details.payment])

  const handleInputChange = (paymentId, key, value) => {
    if (editablePaymentId === paymentId) {
      const updatedPayment = updatedPayments.map((payment) =>
        payment._id === paymentId
          ? {
              ...payment,
              [key]: key === "paymentDate" && !value ? moment().format("YYYY-MM-DD") : value
            }
          : payment
      )
      setUpdatedPayments(updatedPayment)
    }
  }

  const handleCancelEdit = () => {
    setEditablePaymentId(null)
    setUpdatedPayments(details.payment)
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
      paymentDate: moment().format("YYYY-MM-DD"),
      bankName: "",
      modeOfPayment: "",
      paymentStatus: false,
      receiptPhoto: []
    }
    setUpdatedPayments([newPayment, ...updatedPayments])
    setEditablePaymentId(newPayment._id)
  }

  const handleFileUpload = (paymentId, files) => {
    if (files && files.length > 0) {
      const uploadedFiles = Array.from(files).map((file) => {
        return URL.createObjectURL(file)
      })

      const payments = updatedPayments.map((payment) =>
        payment._id === paymentId
          ? { ...payment, receiptPhoto: [...payment.receiptPhoto, ...uploadedFiles] }
          : payment
      )
      setUpdatedPayments(payments)
    }
  }

  const handleRemoveReceipt = (paymentId) => {
    const payments = updatedPayments.map((payment) =>
      payment._id === paymentId ? { ...payment, receiptPhoto: [] } : payment
    )
    setUpdatedPayments(payments)
  }

  const getTotalPaidAmount = (payments) => {
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus == "COLLECTED" ? payment.paidAmount : 0),
      0
    )
  }
  const totalPaidAmount = getTotalPaidAmount(updatedPayments)

  const tabs = [
    { id: "payments", label: "Payments", icon: FaCreditCard },
    { id: "farmer", label: "Farmer Details", icon: FaUser },
    { id: "sales", label: "Sales Person", icon: FaPhone },
    { id: "history", label: "Order History", icon: FaHistory },
    { id: "documents", label: "Documents", icon: FaFileAlt }
  ]

  const renderPaymentRow = (payment) => {
    const isEditing = editablePaymentId === payment._id

    return (
      <div
        key={payment._id}
        className="bg-white rounded-lg border p-4 mb-3 hover:shadow-md transition-shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Amount */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Amount</label>
            {isEditing ? (
              <div className="flex items-center mt-1">
                <span className="text-lg mr-1">₹</span>
                <input
                  type="number"
                  value={payment.paidAmount || ""}
                  onChange={(e) => handleInputChange(payment._id, "paidAmount", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-900 mt-1">₹{payment.paidAmount}</div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Date</label>
            {isEditing ? (
              <input
                type="date"
                value={moment(payment.paymentDate).format("YYYY-MM-DD")}
                onChange={(e) => handleInputChange(payment._id, "paymentDate", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              />
            ) : (
              <div className="text-sm text-gray-700 mt-1">
                {moment(payment.paymentDate).format("MMM D, YYYY")}
              </div>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Payment Mode</label>
            {isEditing ? (
              <select
                value={payment.modeOfPayment || ""}
                onChange={(e) => handleInputChange(payment._id, "modeOfPayment", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1">
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Phone Pe">Phone Pe</option>
                <option value="Google Pay">Google Pay</option>
                <option value="Cheque">Cheque</option>
                <option value="JPCB">JPCB</option>
              </select>
            ) : (
              <div className="text-sm text-gray-700 mt-1">{payment.modeOfPayment}</div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Status</label>
            <div className="mt-1">
              {payment.paymentStatus === "COLLECTED" ? (
                <span className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded-full">
                  COLLECTED
                </span>
              ) : payment.paymentStatus === "REJECTED" ? (
                <span className="px-3 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                  REJECTED
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-medium text-gray-700 bg-yellow-400 rounded-full">
                  PENDING
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Additional Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Bank Name */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Bank Name</label>
            {isEditing ? (
              payment.modeOfPayment === "Cheque" ? (
                <input
                  type="text"
                  value={payment.bankName || ""}
                  onChange={(e) => handleInputChange(payment._id, "bankName", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                />
              ) : (
                <div className="text-sm text-gray-400 italic mt-1">N/A</div>
              )
            ) : (
              <div className="text-sm text-gray-700 mt-1">
                {payment.modeOfPayment === "Cheque" ? payment.bankName : "N/A"}
              </div>
            )}
          </div>

          {/* Remark */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Remark</label>
            {isEditing ? (
              <input
                type="text"
                value={payment.remark || ""}
                onChange={(e) => handleInputChange(payment._id, "remark", e.target.value)}
                placeholder="Enter remark"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
              />
            ) : (
              <div className="text-sm text-gray-700 mt-1">{payment.remark || "No remark"}</div>
            )}
          </div>
        </div>

        {/* Receipt Section */}
        <div className="mt-4">
          <label className="text-xs text-gray-500 font-medium">Receipt</label>
          {isEditing ? (
            <div className="mt-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) => handleFileUpload(payment._id, e.target.files)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {payment.receiptPhoto?.length > 0 && (
                <div className="mt-2 flex items-center space-x-2">
                  <img
                    src={payment.receiptPhoto[0]}
                    alt="Receipt Preview"
                    className="w-12 h-12 object-cover rounded border"
                  />
                  <button
                    onClick={() => handleRemoveReceipt(payment._id)}
                    className="text-red-500 hover:text-red-700 text-sm">
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : payment.receiptPhoto?.length > 0 ? (
            <div className="mt-2">
              <a
                href={payment.receiptPhoto[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-500 hover:text-blue-700 text-sm">
                <EyeIcon size={16} className="mr-1" />
                View Receipt
              </a>
            </div>
          ) : (
            <div className="text-sm text-gray-400 mt-2">No receipt</div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={() => handleAddPaymentToDb(payment._id)}
                className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600">
                <CheckIcon size={16} className="mr-1" />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
                <XIcon size={16} className="mr-1" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleEditPayment(payment._id)}
                className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800">
                <FaEdit size={14} className="mr-1" />
                Edit
              </button>
              {payment?.paymentStatus === "COLLECTED" ? (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "PENDING")}
                  className="px-3 py-1.5 text-sm text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200">
                  Mark Pending
                </button>
              ) : (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "COLLECTED")}
                  className="px-3 py-1.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600">
                  Confirm
                </button>
              )}
              {payment.paymentStatus !== "REJECTED" && (
                <button
                  onClick={() => handleConfirmPayment(payment._id, "REJECTED")}
                  className="px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600">
                  Reject
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "payments":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <button
                onClick={handleAddPayment}
                className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600">
                <PlusIcon size={16} className="mr-2" />
                Add Payment
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₹{totalPaidAmount}</div>
                  <div className="text-sm text-gray-500">Total Paid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    ₹{Number(orderDetaisl?.rate * orderDetaisl?.numberOfPlants) - totalPaidAmount}
                  </div>
                  <div className="text-sm text-gray-500">Remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{Number(orderDetaisl?.rate * orderDetaisl?.numberOfPlants)}
                  </div>
                  <div className="text-sm text-gray-500">Total Order Value</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">{updatedPayments.map(renderPaymentRow)}</div>
          </div>
        )

      case "farmer":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Farmer Information</h3>

            <div className="bg-white rounded-lg border p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Name</div>
                      <div className="font-medium text-gray-900">{farmer.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <FaPhone className="text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Contact</div>
                      <div className="font-medium text-gray-900">{farmer.contact}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <FaMapMarkerAlt className="text-purple-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Address</div>
                      <div className="font-medium text-gray-900">{farmer.address}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "sales":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Person Details</h3>

            <div className="bg-white rounded-lg border p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaUser className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium text-gray-900">{salesPerson.name}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <FaPhone className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Contact</div>
                    <div className="font-medium text-gray-900">{salesPerson.contact}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "history":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Order History</h3>

            <div className="bg-white rounded-lg border p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Order ID</div>
                    <div className="font-medium text-gray-900">#{orderId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Order Date</div>
                    <div className="font-medium text-gray-900">
                      {moment(orderDetaisl?.createdAt).format("MMM D, YYYY")}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Plant Type</div>
                    <div className="font-medium text-gray-900">{orderDetaisl?.plantType?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Plant Subtype</div>
                    <div className="font-medium text-gray-900">
                      {orderDetaisl?.plantSubtype?.name}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Quantity</div>
                    <div className="font-medium text-gray-900">{orderDetaisl?.numberOfPlants}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Rate per Plant</div>
                    <div className="font-medium text-gray-900">₹{orderDetaisl?.rate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Value</div>
                    <div className="font-medium text-gray-900">
                      ₹{orderDetaisl?.rate * orderDetaisl?.numberOfPlants}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "documents":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Documents & Receipts</h3>

            <div className="bg-white rounded-lg border p-6">
              <div className="text-center text-gray-500 py-8">
                <FaFileAlt size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No documents uploaded yet</p>
                <p className="text-sm">Receipts will appear here when payments are made</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg border">
      {loading && <PageLoader />}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <Icon size={16} className="mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">{renderTabContent()}</div>
    </div>
  )
}

export default RenderExpandedContent
