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
import {
  useHasPaymentAccess,
  useCanAddPayment,
  useIsOfficeAdmin,
  useIsDealer,
  useDealerWallet,
  useDealerWalletById
} from "utils/roleUtils"

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

  // Role-based access control
  const hasPaymentAccess = useHasPaymentAccess() // For changing payment status (Accountant/Super Admin only)
  const canAddPayment = useCanAddPayment() // Anyone can add payments
  const isOfficeAdmin = useIsOfficeAdmin()
  const isDealer = useIsDealer()
  const { walletData, loading: walletLoading } = useDealerWallet()

  // Dealer wallet data for when sales person is a dealer
  const { walletData: dealerWalletData, loading: dealerWalletLoading } = useDealerWalletById(
    details?.salesPerson?.jobTitle === "DEALER" ? details?.salesPerson?._id : null
  )

  useEffect(() => {
    setUpdatedPayments(details.payment)
  }, [details.payment])

  const handleInputChange = (paymentId, field, value) => {
    const payments = updatedPayments.map((payment) =>
      payment._id === paymentId ? { ...payment, [field]: value } : payment
    )
    setUpdatedPayments(payments)
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

  const handleAddPayment = () => {
    const newPayment = {
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"),
      bankName: "",
      modeOfPayment: "",
      paymentStatus: "PENDING", // Always PENDING for new payments
      receiptPhoto: [],
      isWalletPayment: false
    }
    setUpdatedPayments([newPayment, ...updatedPayments])
    setEditablePaymentId(newPayment._id)
  }

  const handleAddPaymentToDb = async () => {
    const payment = updatedPayments[0]

    // Validate wallet payment for dealers
    if (isDealer && payment.isWalletPayment) {
      const availableAmount = walletData?.financial?.availableAmount || 0
      const paymentAmount = Number(payment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(`Insufficient wallet balance. Available: ₹${availableAmount.toLocaleString()}`)
        return
      }
    }

    // Validate dealer wallet payment for accountants (when sales person is dealer)
    if (!isDealer && details?.salesPerson?.jobTitle === "DEALER" && payment.isWalletPayment) {
      const availableAmount = dealerWalletData?.financial?.availableAmount || 0
      const paymentAmount = Number(payment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return
      }
    }

    setLoading(true)
    const instance = NetworkManager(API.ORDER.ADD_PAYMENT)
    const payload = { ...payment }

    // Always set payment status to PENDING for new payments
    payload.paymentStatus = "PENDING"

    const emps = await instance.request(payload, [orderId])
    if (emps?.data) {
      Toast.success(emps?.data?.message)
      refreshComponent()
    } else {
      Toast.error("Something went wrong")
    }
    setLoading(false)
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
                <option value="NEFT">NEFT</option>
                <option value="JPCB">JPCB</option>
              </select>
            ) : (
              <div className="text-sm text-gray-700 mt-1">{payment.modeOfPayment}</div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Status</label>
            {isEditing ? (
              hasPaymentAccess ? (
                <select
                  value={payment.paymentStatus || ""}
                  onChange={(e) => handleInputChange(payment._id, "paymentStatus", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1">
                  <option value="PENDING">PENDING</option>
                  <option value="COLLECTED">COLLECTED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              ) : (
                <div className="text-sm text-gray-400 italic mt-1">
                  Contact Accountant to change status
                </div>
              )
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
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
                {payment.isWalletPayment && (
                  <span className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">
                    WALLET
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Additional Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Bank Name */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Bank Name</label>
            {isEditing ? (
              payment.modeOfPayment === "Cheque" || payment.modeOfPayment === "NEFT" ? (
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
                {payment.modeOfPayment === "Cheque" || payment.modeOfPayment === "NEFT"
                  ? payment.bankName
                  : "N/A"}
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

        {/* Wallet Payment Option for Dealers */}
        {isDealer && (
          <div className="mt-4">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
              <div className="flex items-center">
                {isEditing ? (
                  <input
                    type="checkbox"
                    id="walletPayment"
                    checked={payment.isWalletPayment || false}
                    onChange={(e) =>
                      handleInputChange(payment._id, "isWalletPayment", e.target.checked)
                    }
                    className="mr-3 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  />
                ) : (
                  <div className="mr-3 w-4 h-4 flex items-center justify-center">
                    {payment.isWalletPayment ? (
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    ) : (
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    )}
                  </div>
                )}
                <label htmlFor="walletPayment" className="text-gray-700 font-medium">
                  Pay from Wallet
                </label>
              </div>
              <div>
                <div className="text-xs text-gray-500">Wallet Balance</div>
                <div
                  className={`text-base font-bold ${
                    isEditing &&
                    payment.isWalletPayment &&
                    Number(payment.paidAmount) > (walletData?.financial?.availableAmount ?? 0)
                      ? "text-red-600"
                      : "text-gray-800"
                  }`}>
                  ₹{(walletData?.financial?.availableAmount ?? 0)?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Warning messages for wallet payment */}
            {isEditing && payment.isWalletPayment && (
              <div className="mt-2">
                {Number(payment.paidAmount) > (walletData?.financial?.availableAmount ?? 0) && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-sm text-red-600 font-medium">
                      Insufficient wallet balance! Available: ₹
                      {(walletData?.financial?.availableAmount ?? 0)?.toLocaleString()}
                    </div>
                  </div>
                )}

                {!payment.paidAmount && (
                  <div className="bg-amber-50 p-3 rounded-lg">
                    <div className="text-sm text-amber-600 font-medium">
                      Please enter payment amount
                    </div>
                  </div>
                )}

                {Number(payment.paidAmount) <= (walletData?.financial?.availableAmount ?? 0) &&
                  payment.paidAmount && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">
                        Sufficient balance available
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Dealer Wallet Payment Option for Accountants (when sales person is dealer) */}
        {!isDealer && details?.salesPerson?.jobTitle === "DEALER" && (
          <div className="mt-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <FaCreditCard className="text-blue-600 text-sm" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-900">Dealer Wallet Payment</div>
                    <div className="text-xs text-blue-600">
                      Sales Person: {details?.salesPerson?.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-600">Available Balance</div>
                  <div className="text-lg font-bold text-blue-900">
                    ₹{(dealerWalletData?.financial?.availableAmount ?? 0)?.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                {isEditing ? (
                  <input
                    type="checkbox"
                    id="dealerWalletPayment"
                    checked={payment.isWalletPayment || false}
                    onChange={(e) =>
                      handleInputChange(payment._id, "isWalletPayment", e.target.checked)
                    }
                    className="mr-3 w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500"
                  />
                ) : (
                  <div className="mr-3 w-4 h-4 flex items-center justify-center">
                    {payment.isWalletPayment ? (
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    ) : (
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    )}
                  </div>
                )}
                <label htmlFor="dealerWalletPayment" className="text-blue-800 font-medium">
                  Pay from Dealer&apos;s Wallet
                </label>
              </div>

              {/* Warning messages for dealer wallet payment */}
              {isEditing && payment.isWalletPayment && (
                <div className="mt-3 space-y-2">
                  {Number(payment.paidAmount) >
                    (dealerWalletData?.financial?.availableAmount ?? 0) && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="text-sm text-red-600 font-medium">
                        ⚠️ Insufficient dealer wallet balance! Available: ₹
                        {(dealerWalletData?.financial?.availableAmount ?? 0)?.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {!payment.paidAmount && (
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                      <div className="text-sm text-amber-600 font-medium">
                        ℹ️ Please enter payment amount
                      </div>
                    </div>
                  )}

                  {Number(payment.paidAmount) <=
                    (dealerWalletData?.financial?.availableAmount ?? 0) &&
                    payment.paidAmount && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-sm text-green-600 font-medium">
                          ✅ Sufficient dealer balance available
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}

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
              {hasPaymentAccess && (
                <button
                  onClick={() => handleAddPaymentToDb(payment._id)}
                  disabled={
                    (isDealer &&
                      payment.isWalletPayment &&
                      (Number(payment.paidAmount) > (walletData?.financial?.availableAmount ?? 0) ||
                        !payment.paidAmount)) ||
                    (!isDealer &&
                      details?.salesPerson?.jobTitle === "DEALER" &&
                      payment.isWalletPayment &&
                      (Number(payment.paidAmount) >
                        (dealerWalletData?.financial?.availableAmount ?? 0) ||
                        !payment.paidAmount))
                  }
                  className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg ${
                    (isDealer &&
                      payment.isWalletPayment &&
                      (Number(payment.paidAmount) > (walletData?.financial?.availableAmount ?? 0) ||
                        !payment.paidAmount)) ||
                    (!isDealer &&
                      details?.salesPerson?.jobTitle === "DEALER" &&
                      payment.isWalletPayment &&
                      (Number(payment.paidAmount) >
                        (dealerWalletData?.financial?.availableAmount ?? 0) ||
                        !payment.paidAmount))
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "text-white bg-green-500 hover:bg-green-600"
                  }`}>
                  <CheckIcon size={16} className="mr-1" />
                  Save
                </button>
              )}
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">
                <XIcon size={16} className="mr-1" />
                Cancel
              </button>
            </>
          ) : (
            <>
              {canAddPayment && (
                <button
                  onClick={handleAddPayment}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800">
                  <PlusIcon size={16} className="mr-1" />
                  Add Payment
                </button>
              )}
              {hasPaymentAccess && (
                <button
                  onClick={() => handleEditPayment(payment._id)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800">
                  <FaEdit size={14} className="mr-1" />
                  Edit
                </button>
              )}
              {hasPaymentAccess && (
                <>
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
              {isOfficeAdmin && payment.paymentStatus === "PENDING" && (
                <span className="px-3 py-1.5 text-sm text-gray-500 bg-gray-100 rounded-lg">
                  Contact Accountant to change status
                </span>
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
              {canAddPayment && (
                <button
                  onClick={handleAddPayment}
                  className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600">
                  <PlusIcon size={16} className="mr-2" />
                  Add Payment
                  <span className="ml-1 text-xs">(PENDING only)</span>
                </button>
              )}
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
                      {moment(orderDetaisl?.orderBookingDate || orderDetaisl?.createdAt).format(
                        "MMM D, YYYY"
                      )}
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
