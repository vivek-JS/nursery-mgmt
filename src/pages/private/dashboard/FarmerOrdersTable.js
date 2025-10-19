import React, { useState, useEffect, useRef } from "react"
import { Edit2Icon, CheckIcon, XIcon, RefreshCw, Search, ChevronDown, X } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader, ExcelExport } from "components"
import moment from "moment"
import debounce from "lodash.debounce"
import { MenuItem, Select } from "@mui/material"
import DownloadPDFButton from "./OrdereRecipt"
import DispatchForm from "./DispatchedForm"
import DispatchList from "./DispatchedList"
import { Toast } from "helpers/toasts/toastHelper"
import FarmReadyButton from "./FarmReadyButton"
import { faHourglassEmpty } from "@fortawesome/free-solid-svg-icons"
import { FaUser, FaCreditCard, FaEdit, FaFileAlt } from "react-icons/fa"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import {
  useCanAddPayment,
  useIsOfficeAdmin,
  useIsDealer,
  useDealerWallet,
  useDealerWalletById,
  useUserData
} from "utils/roleUtils"

// Custom CSS for blinking animation and enhanced dropdowns
const customStyles = `
  @keyframes paymentBlink {
    0%, 50% {
      background-color: #fef3c7;
      border-color: #f59e0b;
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    }
    25%, 75% {
      background-color: #fefce8;
      border-color: #fbbf24;
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
    }
    100% {
      background-color: #fef3c7;
      border-color: #f59e0b;
      box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    }
  }
  
  @keyframes paymentGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.3);
    }
  }
  
  .payment-blink {
    animation: paymentBlink 2s ease-in-out infinite, paymentGlow 1.5s ease-in-out infinite;
  }

  /* Enhanced Dropdown Styles */
  .enhanced-select {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    outline: none;
  }

  .enhanced-select:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  .enhanced-select:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .enhanced-select option {
    padding: 8px 12px;
    background: white;
    color: #374151;
    font-weight: 500;
  }

  .enhanced-select option:hover {
    background: #f3f4f6;
  }

  /* Material-UI Select Enhancement */
  .mui-select-enhanced .MuiOutlinedInput-root {
    border-radius: 12px;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    transition: all 0.3s ease;
  }

  .mui-select-enhanced .MuiOutlinedInput-root:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  .mui-select-enhanced .MuiOutlinedInput-root.Mui-focused {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .mui-select-enhanced .MuiSelect-select {
    padding: 12px 16px;
    font-weight: 500;
    color: #374151;
  }

  .mui-select-enhanced .MuiMenuItem-root {
    padding: 12px 16px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .mui-select-enhanced .MuiMenuItem-root:hover {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  }

  .mui-select-enhanced .MuiMenuItem-root.Mui-selected {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  /* Status Badge Enhancement */
  .status-badge-enhanced {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    transition: all 0.3s ease;
    cursor: pointer;
    outline: none;
    min-width: 120px;
    text-align: center;
  }

  .status-badge-enhanced:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .status-badge-enhanced:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Status-specific colors */
  .status-accepted {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    border-color: #22c55e;
    color: #166534;
  }

  .status-pending {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    color: #92400e;
  }

  .status-rejected {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #ef4444;
    color: #991b1b;
  }

  .status-dispatched {
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    border-color: #3b82f6;
    color: #1e40af;
  }

  .status-completed {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-color: #6b7280;
    color: #374151;
  }

  .status-farm-ready {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border-color: #10b981;
    color: #065f46;
  }

  .status-dispatch-process {
    background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
    border-color: #06b6d4;
    color: #0e7490;
  }

  /* Order For highlighting */
  .order-for-highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    animation: orderForGlow 2s ease-in-out infinite;
  }

  @keyframes orderForGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.3);
    }
  }

  /* Searchable Dropdown Styles */
  .searchable-dropdown {
    position: relative;
    width: 100%;
  }

  .searchable-dropdown-button {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    outline: none;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
  }

  .searchable-dropdown-button:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }

  .searchable-dropdown-button:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .searchable-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-height: 600px;
    overflow-y: auto;
    margin-top: 4px;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.2s ease-in-out;
  }

  .searchable-dropdown-menu.closing {
    opacity: 0;
    transform: translateY(-10px);
  }

  .searchable-dropdown-search {
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: white;
    border-radius: 12px 12px 0 0;
  }

  .searchable-dropdown-search input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
  }

  .searchable-dropdown-search input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .searchable-dropdown-options {
    max-height: 500px;
    overflow-y: auto;
  }

  .searchable-dropdown-option {
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .searchable-dropdown-option:hover {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  }

  .searchable-dropdown-option.selected {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .searchable-dropdown-option:last-child {
    border-bottom: none;
  }

  .searchable-dropdown-empty {
    padding: 16px;
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  .searchable-dropdown-clear {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(-50%);
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  }

  .searchable-dropdown-clear:hover {
    background: #dc2626;
    transform: translateY(-50%) scale(1.1);
  }

  .searchable-dropdown-count {
    background: #3b82f6;
    color: white;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    margin-left: 8px;
  }

  /* Compact status dropdown */
  .searchable-dropdown.status-dropdown {
    min-width: 120px;
  }

  .searchable-dropdown.status-dropdown .searchable-dropdown-button {
    padding: 6px 12px;
    min-height: 32px;
    font-size: 12px;
    font-weight: 600;
  }

  .searchable-dropdown.status-dropdown .searchable-dropdown-menu {
    min-width: 150px;
  }
`

// SearchableDropdown Component
const SearchableDropdown = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  showCount = false,
  maxHeight = "500px",
  isStatusDropdown = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      setSearchTerm("")
    }, 200)
  }

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Get selected option label
  const selectedOption = options.find((option) => option.value === value)
  const displayValue = selectedOption ? selectedOption.label : placeholder

  const handleOptionClick = (option) => {
    onChange(option.value)
    handleClose()
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange("")
    handleClose()
  }

  return (
    <div
      className={`searchable-dropdown ${isStatusDropdown ? "status-dropdown" : ""}`}
      ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {showCount && <span className="searchable-dropdown-count ml-2">{options.length}</span>}
        </label>
      )}

      <button
        type="button"
        className={`searchable-dropdown-button ${
          isStatusDropdown
            ? `status-badge-enhanced status-${value?.toLowerCase().replace("_", "-")}`
            : ""
        }`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!isOpen) {
            // Small delay when opening to prevent immediate closing
            setTimeout(() => {
              setIsOpen(true)
            }, 50)
          } else {
            handleClose()
          }
        }}
        onFocus={() => {
          if (!isOpen) {
            setTimeout(() => {
              setIsOpen(true)
            }, 50)
          }
        }}>
        <span className="truncate">{displayValue}</span>
        <div className="flex items-center gap-2">
          {value && !isStatusDropdown && (
            <button
              type="button"
              className="searchable-dropdown-clear"
              onClick={handleClear}
              title="Clear selection">
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className={`searchable-dropdown-menu ${isClosing ? "closing" : ""}`}>
          <div className="searchable-dropdown-search">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4"
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            </div>
          </div>

          <div className="searchable-dropdown-options" style={{ maxHeight }}>
            {filteredOptions.length === 0 ? (
              <div className="searchable-dropdown-empty">
                {searchTerm ? "No results found" : "No options available"}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`searchable-dropdown-option ${
                    option.value === value ? "selected" : ""
                  }`}
                  onClick={() => handleOptionClick(option)}>
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <CheckIcon size={16} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const FarmerOrdersTable = ({ slotId, monthName, startDay, endDay }) => {
  const today = new Date()
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [editingRows, setEditingRows] = useState(new Set())
  const [selectedDateRange, setSelectedDateRange] = useState([
    new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    today
  ])
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [patchLoading, setpatchLoading] = useState(false)
  const [startDate, endDate] = selectedDateRange
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [refresh, setRefresh] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)

  // Inject custom CSS for blinking animation and enhanced dropdowns
  useEffect(() => {
    const styleElement = document.createElement("style")
    styleElement.textContent = customStyles
    document.head.appendChild(styleElement)

    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  // Role-based access control
  const canAddPayment = useCanAddPayment() // Anyone can add payments
  const isOfficeAdmin = useIsOfficeAdmin()
  const isDealer = useIsDealer()
  const { walletData, loading: walletLoading } = useDealerWallet()
  const user = useUserData() // Get current user data

  // State to track dealer ID for wallet data
  const [dealerIdForWallet, setDealerIdForWallet] = useState(null)

  // Dealer wallet data for when sales person is a dealer
  const {
    walletData: dealerWalletData,
    loading: dealerWalletLoading,
    refetch: refetchDealerWallet
  } = useDealerWalletById(dealerIdForWallet)

  // Debug wallet data
  useEffect(() => {}, [dealerIdForWallet, dealerWalletData, dealerWalletLoading])

  // Status tabs state
  const [activeStatusTab, setActiveStatusTab] = useState("all")

  // Filter states
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("")
  const [selectedVillage, setSelectedVillage] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("")

  // Filter options
  const [salesPeople, setSalesPeople] = useState([])
  const [villages, setVillages] = useState([])
  const [districts, setDistricts] = useState([])

  const orderStatusOptions = [
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Pending", value: "PENDING" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Dispatched", value: "DISPATCHED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Partially Completed", value: "PARTIALLY_COMPLETED" },
    { label: "Ready For Dispatch", value: "FARM_READY" },
    { label: "Loading", value: "DISPATCH_PROCESS" }
  ]

  // Status tabs configuration
  const statusTabs = [
    { key: "all", label: "All Orders", status: null },
    { key: "pending", label: "Pending", status: "PENDING" },
    { key: "accepted", label: "Accepted", status: "ACCEPTED" },
    { key: "completed", label: "Completed", status: "COMPLETED" },
    { key: "dispatched", label: "Dispatched", status: "DISPATCHED" },
    { key: "farm_ready", label: "Farm Ready", status: "FARM_READY" },
    { key: "rejected", label: "Rejected", status: "REJECTED" }
  ]

  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [updatedObject, setUpdatedObject] = useState(null)
  const [viewMode, setViewMode] = useState("booking")
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isDispatchtab, setisDispatchtab] = useState(false)
  const [newRemark, setNewRemark] = useState("")
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [newPayment, setNewPayment] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    remark: "",
    receiptPhoto: [],
    paymentStatus: "PENDING", // Default to PENDING, will be updated based on payment type
    isWalletPayment: false
  })
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  })
  const handleFarmReady = (orderId) => {
    // Get current date
    const farmReadyDate = moment().format("DD-MM-YYYY")

    // Call pacthOrders with FARM_READY status
    pacthOrders(
      {
        id: orderId,
        orderStatus: "FARM_READY",
        farmReadyDate: farmReadyDate
      },
      null // No row data needed for this simple update
    )
  }
  // Add these handler functions
  const handleAddRemark = (orderId) => {
    if (!newRemark.trim()) return

    pacthOrders(
      {
        id: orderId,
        orderRemarks: newRemark
      },
      selectedRow
    ).then(async () => {
      // Refresh both modal data and main list
      await getOrders()
      setTimeout(() => {
        refreshModalData()
      }, 500)
    })

    setNewRemark("")
  }

  const handleAddPayment = async (orderId) => {
    if (!newPayment.paidAmount) {
      Toast.error("Please fill in payment amount")
      return
    }

    // Only require modeOfPayment if not using wallet payment
    if (!newPayment.isWalletPayment && !newPayment.modeOfPayment) {
      Toast.error("Please select payment mode")
      return
    }

    // Validate wallet payment for dealers
    if (isDealer && newPayment.isWalletPayment) {
      const availableAmount = walletData?.financial?.availableAmount || 0
      const paymentAmount = Number(newPayment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(`Insufficient wallet balance. Available: ₹${availableAmount.toLocaleString()}`)
        return
      }
    }

    // Validate dealer wallet payment for accountants (when sales person is dealer)
    if (
      !isDealer &&
      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
      newPayment.isWalletPayment
    ) {
      const availableAmount = dealerWalletData?.financial?.availableAmount || 0
      const paymentAmount = Number(newPayment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return
      }
    }

    // Validate dealer wallet payment for any user when dealer is present in order
    if (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" && newPayment.isWalletPayment) {
      const availableAmount = dealerWalletData?.financial?.availableAmount || 0
      const paymentAmount = Number(newPayment.paidAmount)

      if (paymentAmount > availableAmount) {
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return
      }
    }

    // Process dealer wallet payment if applicable
    if (
      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
      newPayment.isWalletPayment &&
      dealerWalletData
    ) {
      console.log("Processing dealer wallet payment")
      const paymentAmount = Number(newPayment.paidAmount)
      const isValid = await processDealerWalletPayment(orderId, paymentAmount)

      if (!isValid) {
        return
      }
    }

    setLoading(true)
    try {
      const instance = NetworkManager(API.ORDER.ADD_PAYMENT)

      // Ensure isWalletPayment is a boolean and construct payload explicitly
      const isWalletPayment = Boolean(newPayment.isWalletPayment)

      // Set payment status - use the status from newPayment, default to PENDING
      const paymentStatus = newPayment.paymentStatus || "PENDING"

      const payload = {
        paidAmount: newPayment.paidAmount,
        paymentDate: newPayment.paymentDate,
        modeOfPayment: newPayment.modeOfPayment,
        bankName: newPayment.bankName,
        remark: newPayment.remark,
        receiptPhoto: newPayment.receiptPhoto || [],
        isWalletPayment: isWalletPayment,
        paymentStatus: paymentStatus
      }

      console.log("Payment payload:", payload)
      console.log("isWalletPayment value:", isWalletPayment)
      console.log("newPayment.isWalletPayment:", newPayment.isWalletPayment)

      const response = await instance.request(payload, [orderId])

      if (response?.data) {
        // Log dealer wallet payment processing
        if (
          selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
          newPayment.isWalletPayment
        ) {
          console.log("Dealer wallet payment processed successfully")
          console.log("Payment response:", response?.data)
        }
        Toast.success(response?.data?.message || "Payment added successfully")
        setShowPaymentForm(false)
        resetPaymentForm(false)

        // Refresh wallet data if it was a wallet payment
        if (newPayment.isWalletPayment) {
          if (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER") {
            await refetchDealerWallet()
          }
        }

        // Set pending update and force refresh
        setPendingOrderUpdate(orderId)

        // Direct API call to refresh orders data
        try {
          const date = new Date(startDate)
          const formattedStartDate = moment(date).format("DD-MM-YYYY")
          const edate = new Date(endDate)
          const formattedEndtDate = moment(edate).format("DD-MM-YYYY")

          const instance = NetworkManager(API.ORDER.GET_ORDERS)
          const params = {
            search: debouncedSearchTerm,
            startDate: formattedStartDate,
            endDate: formattedEndtDate,
            dispatched: viewMode === "booking" ? false : true,
            limit: 10000,
            page: 1
          }

          // Add status filter if a specific status tab is selected
          if (activeStatusTab !== "all") {
            const selectedTab = statusTabs.find((tab) => tab.key === activeStatusTab)
            if (selectedTab && selectedTab.status) {
              params.status = selectedTab.status
            }
          }

          // Add new filter parameters
          if (selectedSalesPerson) {
            params.salesPerson = selectedSalesPerson
          }
          if (selectedVillage) {
            params.village = selectedVillage
          }
          if (selectedDistrict) {
            params.district = selectedDistrict
          }

          if (viewMode === "dispatched") {
            params.status = "ACCEPTED,FARM_READY"
          }

          if (viewMode === "farmready") {
            params.status = "FARM_READY"
          }
          if (viewMode === "ready_for_dispatch") {
            params.ready_for_dispatch = "true"
            // Remove status filter for ready for dispatch view since we want specific filtering
            delete params.status
          }
          if (
            viewMode === "farmready" ||
            viewMode === "ready_for_dispatch" ||
            viewMode === "dispatch_process"
          ) {
            params.startDate = null
          }

          if (
            viewMode === "farmready" ||
            viewMode === "ready_for_dispatch" ||
            viewMode === "dispatch_process"
          ) {
            params.endDate = null
          }
          if (viewMode === "farmready") {
            params.status = "FARM_READY"
          }
          if (viewMode === "ready_for_dispatch") {
            params.ready_for_dispatch = "true"
            // Remove status filter for ready for dispatch view since we want specific filtering
            delete params.status
          }
          if (viewMode === "dispatch_process") {
            params.status = "DISPATCH_PROCESS"
          }
          if (viewMode === "dispatch_process") {
            params.dispatched = false
          }

          const response = await instance.request({}, params)
          const ordersData = response?.data?.data?.data || []

          // Process the fresh orders data
          const freshOrders = (ordersData || [])
            .map((data) => {
              const {
                farmer,
                numberOfPlants,
                rate,
                salesPerson,
                createdAt,
                orderStatus,
                id,
                payment,
                bookingSlot,
                orderId,
                plantType,
                plantSubtype,
                remainingPlants,
                returnedPlants,
                statusChanges,
                orderRemarks,
                dealerOrder,
                farmReadyDate,
                orderBookingDate,
                deliveryDate,
                orderFor
              } = data || {}
              const { startDay, endDay } = bookingSlot?.[0] || {}
              const start = startDay ? moment(startDay, "DD-MM-YYYY").format("D") : "N/A"
              const end = endDay ? moment(endDay, "DD-MM-YYYY").format("D") : "N/A"
              const monthYear = startDay
                ? moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
                : "N/A"
              return {
                order: orderId,
                farmerName: orderFor
                  ? `Order for: ${orderFor.name}`
                  : dealerOrder
                  ? `via ${salesPerson?.name || "Unknown"}`
                  : farmer?.name || "Unknown",
                plantType: `${plantType?.name || "Unknown"} -> ${plantSubtype?.name || "Unknown"}`,
                quantity: numberOfPlants,
                orderDate: moment(orderBookingDate || createdAt).format("DD/MM/YYYY"),
                deliveryDate: deliveryDate ? moment(deliveryDate).format("DD/MM/YYYY") : "-", // Specific delivery date
                rate,
                total: `₹ ${Number(rate * numberOfPlants)}`,
                "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment))}`,
                "remaining Amt": `₹ ${
                  Number(rate * numberOfPlants) - Number(getTotalPaidAmount(payment))
                }`,
                "remaining Plants": remainingPlants || numberOfPlants,
                "returned Plants": returnedPlants || 0,
                orderStatus: orderStatus,
                Delivery: `${start} - ${end} ${monthYear}`,
                "Farm Ready":
                  farmReadyDate && farmReadyDate.length > 0
                    ? moment(farmReadyDate[0]).format("DD-MMM-YYYY")
                    : "-",
              details: {
                farmer,
                contact: farmer?.mobileNumber,
                orderNotes: "Premium quality seed potatoes",
                soilType: "Sandy loam",
                irrigationType: "Sprinkler system",
                lastDelivery: "2024-11-05",
                payment,
                orderid: id,
                salesPerson,
                plantID: plantType?.id,
                plantSubtypeID: plantSubtype?.id,
                bookingSlot: bookingSlot?.[0] || null,
                rate: rate,
                numberOfPlants,
                remainingPlants: remainingPlants || numberOfPlants,
                orderFor: orderFor || null,
                statusChanges: statusChanges || [],
                orderRemarks: orderRemarks || [],
                deliveryChanges: data.deliveryChanges || [],
                returnHistory: data?.returnHistory || [],
                dispatchHistory: data?.dispatchHistory || [],
              orderEditHistory: data?.orderEditHistory || [], // Include order edit history
              dealerOrder: dealerOrder || false,
              farmReadyDate: farmReadyDate,
              deliveryDate: deliveryDate || null // Include deliveryDate in details
              }
              }
            })
            .filter((order) => order && order.order)

          // Update the orders state with fresh data
          setOrders(freshOrders)

          // Find and update the selected order
          const updatedOrder = freshOrders.find((order) => order.details.orderid === orderId)
          if (updatedOrder) {
            setSelectedOrder(updatedOrder)
          }
        } catch (error) {
          console.error("Error refreshing orders after payment:", error)
          // Fallback to the original refresh method
          setRefresh(!refresh)
        }
      } else {
        Toast.error("Failed to add payment")
      }
    } catch (error) {
      console.error("Error adding payment:", error)
      Toast.error("Failed to add payment")
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => {
      const updatedPayment = {
        ...prev,
        [field]: value
      }

      // Update payment status when wallet payment is toggled
      if (field === "isWalletPayment") {
        // Ensure value is a boolean
        const isWalletPayment = Boolean(value)
        updatedPayment.isWalletPayment = isWalletPayment

        // For OFFICE_ADMIN, always keep payment status as PENDING
        // For other roles, keep as PENDING by default - only COLLECTED payments impact wallet
        if (user?.role === "OFFICE_ADMIN") {
          updatedPayment.paymentStatus = "PENDING"
          console.log("OFFICE_ADMIN wallet payment - status set to PENDING")
        } else {
          updatedPayment.paymentStatus = "PENDING" // Default to PENDING for all roles
          console.log(
            "Wallet payment toggled:",
            value,
            "Boolean value:",
            isWalletPayment,
            "Payment status set to:",
            updatedPayment.paymentStatus
          )
        }
      }

      return updatedPayment
    })
  }

  // Function to get dealer wallet balance for payment validation
  const getDealerWalletBalance = () => {
    if (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER") {
      return dealerWalletData?.financial?.availableAmount || 0
    }
    return walletData?.financial?.availableAmount || 0
  }

  // Function to check if dealer wallet payment is available
  const isDealerWalletPaymentAvailable = () => {
    return selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" && dealerWalletData
  }

  // Function to process dealer wallet payment
  const processDealerWalletPayment = async (orderId, paymentAmount) => {
    try {
      console.log("=== processDealerWalletPayment DEBUG ===")
      console.log("Processing dealer wallet payment for order:", orderId)
      console.log("Payment amount:", paymentAmount)
      console.log("Dealer wallet data:", dealerWalletData)

      if (!dealerWalletData?.financial) {
        console.error("No dealer wallet data available")
        return false
      }

      const availableAmount = dealerWalletData.financial.availableAmount || 0

      if (paymentAmount > availableAmount) {
        console.error("Insufficient dealer wallet balance")
        Toast.error(
          `Insufficient dealer wallet balance. Available: ₹${availableAmount.toLocaleString()}`
        )
        return false
      }

      console.log("Dealer wallet payment validation passed")
      return true
    } catch (error) {
      console.error("Error processing dealer wallet payment:", error)
      return false
    }
  }

  // Function to get payment status display text
  const getPaymentStatusDisplay = () => {
    const isWalletPayment = Boolean(newPayment.isWalletPayment)
    const paymentStatus = newPayment.paymentStatus || "PENDING"

    console.log("getPaymentStatusDisplay - newPayment.isWalletPayment:", newPayment.isWalletPayment)
    console.log("getPaymentStatusDisplay - isWalletPayment:", isWalletPayment)
    console.log("getPaymentStatusDisplay - paymentStatus:", paymentStatus)

    if (paymentStatus === "COLLECTED") {
      return {
        status: "COLLECTED",
        color: "text-green-700",
        bgColor: "bg-green-100",
        borderColor: "border-green-200",
        message: isWalletPayment ? "Wallet Payment (Collected)" : "Payment Collected"
      }
    } else {
      return {
        status: "PENDING",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-200",
        message: isWalletPayment
          ? "Wallet Payment (Pending)"
          : "Contact Accountant to change status"
      }
    }
  }

  // Function to reset payment form with correct status
  const resetPaymentForm = (isWalletPayment = false) => {
    // Always default to PENDING - only COLLECTED payments impact wallet
    const paymentStatus = "PENDING"

    console.log("Resetting payment form:")
    console.log("isWalletPayment parameter:", isWalletPayment)
    console.log("paymentStatus:", paymentStatus)

    setNewPayment({
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"),
      modeOfPayment: "",
      bankName: "",
      remark: "",
      receiptPhoto: [],
      paymentStatus: paymentStatus,
      isWalletPayment: Boolean(isWalletPayment)
    })
  }

  // Function to initialize payment form when opened
  const initializePaymentForm = () => {
    // Always default to false for wallet payment - user must explicitly choose
    const shouldUseWalletPayment = false

    console.log("Initializing payment form:")
    console.log("shouldUseWalletPayment:", shouldUseWalletPayment)

    resetPaymentForm(shouldUseWalletPayment)
  }

  const refreshModalData = async () => {
    if (selectedOrder) {
      try {
        // Refresh the orders to get updated data
        await getOrders()

        // Find the updated order data from the fresh orders array
        const updatedOrder = orders.find(
          (order) => order.details.orderid === selectedOrder.details.orderid
        )

        if (updatedOrder) {
          setSelectedOrder(updatedOrder)
        }
      } catch (error) {
        console.error("Error refreshing modal data:", error)
      }
    }
  }

  // Add function to handle row selection
  const toggleRowSelection = (orderId, rowData) => {
    setSelectedRows((prevSelectedRows) => {
      const newSelectedRows = new Map(prevSelectedRows)

      // If row is already selected, remove it
      if (newSelectedRows.has(orderId)) {
        newSelectedRows.delete(orderId)
      } else {
        // Add the full row data to the map
        newSelectedRows.set(orderId, {
          ...rowData,
          details: {
            ...rowData.details,
            orderid: orderId
          }
        })
      }

      return newSelectedRows
    })
  }
  // Add function to handle "Select All" functionality
  const toggleSelectAll = () => {
    if (!orders || orders.length === 0) return

    if (selectedRows.size === orders.length) {
      setSelectedRows(new Set())
    } else {
      const allOrderIds = orders.map((order) => order.details.orderid)
      setSelectedRows(new Set(allOrderIds))
    }
  }
  // Load initial data
  useEffect(() => {
    getOrders()
  }, [
    debouncedSearchTerm,
    refresh,
    startDate,
    endDate,
    viewMode,
    activeStatusTab,
    selectedSalesPerson,
    selectedVillage,
    selectedDistrict
  ])

  // Function to fetch sales person data

  // State to track if we need to update modal after payment
  const [pendingOrderUpdate, setPendingOrderUpdate] = useState(null)

  // Update dealer ID for wallet when selectedOrder changes
  useEffect(() => {
    const salesPerson = selectedOrder?.details?.salesPerson

    if (salesPerson?.jobTitle === "DEALER" && salesPerson?._id) {
      console.log("Setting dealer ID for wallet:", salesPerson._id)
      setDealerIdForWallet(salesPerson._id)
    } else {
      console.log("Clearing dealer ID for wallet")
      setDealerIdForWallet(null)
    }
  }, [selectedOrder])

  // Load dealer wallet data when dealer ID changes
  useEffect(() => {
    if (dealerIdForWallet) {
      console.log("Loading dealer wallet for dealer ID:", dealerIdForWallet)
      refetchDealerWallet()
    }
  }, [dealerIdForWallet, refetchDealerWallet])

  // Effect to update modal when orders change and we have a pending update
  useEffect(() => {
    if (pendingOrderUpdate && orders.length > 0) {
      const updatedOrder = orders.find((order) => order.details.orderid === pendingOrderUpdate)
      if (updatedOrder) {
        setSelectedOrder(updatedOrder)
        setPendingOrderUpdate(null) // Clear the pending update
      }
    }
  }, [orders, pendingOrderUpdate])

  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions()
  }, [])

  // Listen for dispatch creation events to refresh the list
  useEffect(() => {
    const handleDispatchCreated = () => {
      getOrders()
    }

    window.addEventListener("dispatchCreated", handleDispatchCreated)

    return () => {
      window.removeEventListener("dispatchCreated", handleDispatchCreated)
    }
  }, [])

  // Load slots when selectedOrder changes (for modal edit functionality)
  useEffect(() => {
    if (selectedOrder?.details?.plantID && selectedOrder?.details?.plantSubtypeID) {
      getSlots(selectedOrder?.details?.plantID, selectedOrder?.details?.plantSubtypeID)
    }
  }, [selectedOrder])

  // Load slots when selectedRow changes (for inline editing)
  useEffect(() => {
    if (selectedRow?.details?.plantID && selectedRow?.details?.plantSubtypeID) {
      getSlots(selectedRow?.details?.plantID, selectedRow?.details?.plantSubtypeID)
    }
  }, [selectedRow])

  // Initialize updatedObject when edit tab is active and selectedOrder changes
  useEffect(() => {
    if (activeTab === "edit" && selectedOrder) {
      setUpdatedObject({
        rate: selectedOrder.rate,
        quantity: selectedOrder.quantity,
        bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
        deliveryDate: selectedOrder?.details?.deliveryDate 
          ? new Date(selectedOrder.details.deliveryDate) 
          : null
      })
    }
  }, [activeTab, selectedOrder])

  const loadFilterOptions = async () => {
    try {
      // Load all salespeople and dealers in a single list
      const salesInstance = NetworkManager(API.USER.GET_USERS)
      const salesResponse = await salesInstance.request(null, { jobTitle: "SALES" })

      const dealersInstance = NetworkManager(API.USER.GET_DEALERS)
      const dealersResponse = await dealersInstance.request()

      // Combine salespeople and dealers
      const combinedData = []

      // Add salespeople
      if (salesResponse?.data?.data) {
        salesResponse.data.data.forEach((salesperson) => {
          combinedData.push({
            label: salesperson.name,
            value: salesperson._id,
            isDealer: false
          })
        })
      }

      // Add dealers with (Dealer) label
      if (dealersResponse?.data?.data) {
        dealersResponse.data.data.forEach((dealer) => {
          combinedData.push({
            label: `${dealer.name} (Dealer)`,
            value: dealer._id,
            isDealer: true
          })
        })
      }

      // Sort by name
      combinedData.sort((a, b) => a.label.localeCompare(b.label))

      setSalesPeople(combinedData || [])

      // Load villages
      const villagesInstance = NetworkManager(API.ORDER.GET_VILLAGES)
      const villagesResponse = await villagesInstance.request()
      if (villagesResponse?.data?.data) {
        setVillages(villagesResponse.data.data || [])
      }

      // Load districts
      const districtsInstance = NetworkManager(API.ORDER.GET_DISTRICTS)
      const districtsResponse = await districtsInstance.request()
      if (districtsResponse?.data?.data) {
        setDistricts(districtsResponse.data.data || [])
      }
    } catch (error) {
      console.error("Error loading filter options:", error)
    }
  }
  const debouncedSearch = React.useCallback(
    debounce((searchValue) => {
      setDebouncedSearchTerm(searchValue)
    }, 500), // 500ms delay
    [] // Empty dependency array to ensure the debounced function doesn't change
  )
  const handleSearchChange = (val) => {
    setSearchTerm(val)
    debouncedSearch(val)
  }
  const getTotalPaidAmount = (payments) => {
    if (!payments || !Array.isArray(payments)) return 0
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus == "COLLECTED" ? payment.paidAmount : 0),
      0
    )
  }

  // Helper function to get slot ID for a specific date
  const getSlotIdForDate = (selectedDate) => {
    if (!selectedDate || slots.length === 0) return null

    const selectedMoment = moment(selectedDate)

    for (const slot of slots) {
      if (!slot.startDay || !slot.endDay) continue

      const slotStart = moment(slot.startDay, "DD-MM-YYYY")
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY")

      // Check if the selected date falls within this slot's range
      if (
        selectedMoment.isSameOrAfter(slotStart, "day") &&
        selectedMoment.isSameOrBefore(slotEnd, "day")
      ) {
        return slot.value
      }
    }

    return null
  }

  // Helper function to check if a date should be disabled (not in any slot)
  const isDateDisabled = (date) => {
    if (!date || slots.length === 0) return true

    const dateMoment = moment(date)

    for (const slot of slots) {
      if (!slot.startDay || !slot.endDay) continue

      const slotStart = moment(slot.startDay, "DD-MM-YYYY")
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY")

      // If date is within any slot range, it's not disabled
      if (dateMoment.isSameOrAfter(slotStart, "day") && dateMoment.isSameOrBefore(slotEnd, "day")) {
        return false
      }
    }

    return true
  }

  // Helper function to get available quantity for a specific date
  const getAvailableQuantityForDate = (selectedDate) => {
    const slotId = getSlotIdForDate(selectedDate)
    if (!slotId) return null

    const slot = slots.find((s) => s.value === slotId)
    return slot?.available || null
  }

  // Helper function to get slot details for a specific date
  const getSlotDetailsForDate = (selectedDate) => {
    const slotId = getSlotIdForDate(selectedDate)
    if (!slotId) return null

    return slots.find((s) => s.value === slotId)
  }
  React.useEffect(() => {
    // Cleanup the debounced function when component unmounts
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const getSlots = async (plantId, subtypeId) => {
    setSlotsLoading(true)
    try {
      const instance = NetworkManager(API.ORDER.GET_SLOTS)
      const response = await instance.request(
        {},
        {
          plantId: plantId,
          subtypeId: subtypeId,
          year: new Date().getFullYear().toString()
        }
      )

      if (response?.data?.slots?.[0]?.slots) {
        const apiSlots = response.data.slots[0].slots

        const processedSlots = apiSlots
          .filter((slot) => {
            // Filter out inactive slots
            if (!slot?.status) return false

            // Validate date format
            const startDateValid = moment(slot.startDay, "DD-MM-YYYY", true).isValid()
            const endDateValid = moment(slot.endDay, "DD-MM-YYYY", true).isValid()

            if (!startDateValid || !endDateValid) {
              return false
            }

            return true
          })
          .map((slot) => {
            const {
              startDay,
              endDay,
              totalBookedPlants,
              totalPlants,
              status,
              _id,
              effectiveBuffer,
              availablePlants,
              bufferAdjustedCapacity
            } = slot || {}

            const start = moment(startDay, "DD-MM-YYYY").format("D")
            const end = moment(endDay, "DD-MM-YYYY").format("D")
            const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")

            // Calculate available plants considering buffer
            const effectiveBufferPercent = effectiveBuffer || 0
            const bufferAmount = Math.round((totalPlants * effectiveBufferPercent) / 100)
            const bufferAdjustedCapacityValue = bufferAdjustedCapacity || totalPlants - bufferAmount
            const availablePlantsValue =
              availablePlants || Math.max(0, bufferAdjustedCapacityValue - (totalBookedPlants || 0))

            return {
              label: `${start} - ${end} ${monthYear} (${availablePlantsValue} available)`,
              value: _id,
              available: availablePlantsValue,
              totalPlants: totalPlants,
              totalBookedPlants: totalBookedPlants || 0,
              effectiveBuffer: effectiveBufferPercent,
              bufferAdjustedCapacity: bufferAdjustedCapacityValue,
              startDay: startDay,
              endDay: endDay
            }
          })
          .filter((slot) => slot.available > 0) // Only show slots with available capacity

        setSlots(processedSlots)
      } else {
        setSlots([])
      }
    } catch (error) {
      console.error("Error loading slots:", error)
      Toast.error("Failed to load available slots")
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const getOrders = async () => {
    setLoading(true)

    // Use the new status-specific endpoint if a status tab is selected
    const instance =
      activeStatusTab !== "all"
        ? NetworkManager(API.ORDER.GET_ORDERS_BY_STATUS)
        : slotId
        ? NetworkManager(API.ORDER.GET_ORDERS_SLOTS)
        : NetworkManager(API.ORDER.GET_ORDERS)

    const params = {
      search: debouncedSearchTerm,
      dispatched: viewMode === "booking" ? false : true,
      limit: 10000, // Set a very high limit to get all orders
      page: 1
    }

    // Only add date range if both dates are selected
    if (startDate && endDate) {
      const date = new Date(startDate)
      const formattedStartDate = moment(date).format("DD-MM-YYYY")
      const edate = new Date(endDate)
      const formattedEndtDate = moment(edate).format("DD-MM-YYYY")

      params.startDate = formattedStartDate
      params.endDate = formattedEndtDate
    }

    // Add status filter if a specific status tab is selected
    if (activeStatusTab !== "all") {
      const selectedTab = statusTabs.find((tab) => tab.key === activeStatusTab)
      if (selectedTab && selectedTab.status) {
        params.status = selectedTab.status
      }
    }

    // Add new filter parameters
    if (selectedSalesPerson) {
      params.salesPerson = selectedSalesPerson
    }
    if (selectedVillage) {
      params.village = selectedVillage
    }
    if (selectedDistrict) {
      params.district = selectedDistrict
    }

    if (viewMode === "dispatched") {
      params.status = "ACCEPTED,FARM_READY"
    }

    if (viewMode === "farmready") {
      params.farmReady = "true"
      // Remove status filter for farm ready view since we want all orders with farm ready date
      delete params.status
      // Keep date range filtering for farm ready view - don't set to null
    }
    if (viewMode === "dispatch_process") {
      params.startDate = null
    }

    if (viewMode === "dispatch_process") {
      params.endDate = null
    }
    if (viewMode === "ready_for_dispatch") {
      params.ready_for_dispatch = "true"
      // Remove status filter for ready for dispatch view since we want specific filtering
      delete params.status
      console.log("=== Ready for Dispatch Debug ===")
      console.log("Params being sent:", params)
    }
    if (viewMode === "dispatch_process") {
      params.status = "DISPATCH_PROCESS"
    }
    if (viewMode === "dispatch_process") {
      params.dispatched = false
    }

    const emps = slotId
      ? await instance.request({}, { slotId, monthName, startDay, endDay, limit: 10000, page: 1 })
      : await instance.request({}, params)

    if (viewMode === "ready_for_dispatch") {
      console.log("API Response:", emps?.data)
      console.log("Orders data:", emps?.data?.data?.data || [])
    }

    // Handle different response structures for different endpoints
    const ordersData =
      activeStatusTab !== "all"
        ? emps?.data?.data || [] // Status-specific endpoint returns data directly
        : emps?.data?.data?.data || [] // Regular endpoint has nested data structure

    if (viewMode === "ready_for_dispatch") {
      console.log("Processing orders data:", ordersData?.length || 0, "orders")
    }

    setOrders(
      (ordersData || [])
        .map((data) => {
          const {
            farmer,
            //   typeOfPlants,
            numberOfPlants,
            rate,
            salesPerson,
            createdAt,
            orderStatus,
            id,
            payment,
            bookingSlot,
            orderId,
            plantType,
            plantSubtype,
            remainingPlants,
            returnedPlants,
            statusChanges,
            orderRemarks,
            dealerOrder,
            farmReadyDate,
                farmReadyDateChanges,
                orderBookingDate,
                deliveryDate,
                orderFor
              } = data || {}

              const { startDay, endDay } = bookingSlot?.[0] || {}
              const start = startDay ? moment(startDay, "DD-MM-YYYY").format("D") : "N/A"
              const end = endDay ? moment(endDay, "DD-MM-YYYY").format("D") : "N/A"
              const monthYear = startDay ? moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY") : "N/A"
              return {
                order: orderId,
                farmerName: orderFor
                  ? `${farmer?.name || "Unknown"} (Order for: ${orderFor.name})`
                  : dealerOrder
                  ? `via ${salesPerson?.name || "Unknown"}`
                  : farmer?.name || "Unknown",
                plantType: `${plantType?.name || "Unknown"} -> ${plantSubtype?.name || "Unknown"}`,
                quantity: numberOfPlants,
                orderDate: moment(orderBookingDate || createdAt).format("DD/MM/YYYY"),
                deliveryDate: deliveryDate ? moment(deliveryDate).format("DD/MM/YYYY") : "-", // Specific delivery date
            rate,
            total: `₹ ${Number(rate * numberOfPlants)}`,
            "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment))}`,
            "remaining Amt": `₹ ${
              Number(rate * numberOfPlants) - Number(getTotalPaidAmount(payment))
            }`,
            "remaining Plants": remainingPlants || numberOfPlants,
            "returned Plants": returnedPlants || 0,
            orderStatus: orderStatus,
            Delivery: `${start} - ${end} ${monthYear}`,
            "Farm Ready": farmReadyDate ? moment(farmReadyDate).format("DD-MMM-YYYY") : "-",
            details: {
              farmer,
              contact: farmer?.mobileNumber,
              orderNotes: "Premium quality seed potatoes",
              soilType: "Sandy loam",
              irrigationType: "Sprinkler system",
              lastDelivery: "2024-11-05",
              payment,
              orderid: id,
              salesPerson,
              plantID: plantType?.id,
              plantSubtypeID: plantSubtype?.id,
              bookingSlot: bookingSlot?.[0] || null,
              rate: rate,
              numberOfPlants,
              remainingPlants: remainingPlants || numberOfPlants,
              orderFor: orderFor || null,
              statusChanges: statusChanges || [],
              orderRemarks: orderRemarks || [],
              deliveryChanges: data.deliveryChanges || [],
              returnHistory: data?.returnHistory || [],
              dispatchHistory: data?.dispatchHistory || [],
              orderEditHistory: data?.orderEditHistory || [], // Include order edit history
              dealerOrder: dealerOrder || faHourglassEmpty,
              farmReadyDate: farmReadyDate,
              farmReadyDateChanges: farmReadyDateChanges || [],
              deliveryDate: deliveryDate || null // Include deliveryDate in details
            }
          }
        })
        .filter((order) => order && order.order) // Filter out any invalid orders
    ) || []
    setLoading(false)

    // setEmployees(emps?.data?.data)
  }
  const pacthOrders = async (patchObj, row) => {
    setpatchLoading(true)

    try {
      // Handle Date objects for farmReadyDate and deliveryDate
      const dataToSend = { ...patchObj }

      // Convert deliveryDate to ISO format if it's a Date object
      if (dataToSend.deliveryDate && dataToSend.deliveryDate instanceof Date) {
        dataToSend.deliveryDate = dataToSend.deliveryDate.toISOString()
        console.log("Converted deliveryDate to ISO:", dataToSend.deliveryDate)
      }

      console.log("=== PATCH ORDER PAYLOAD DEBUG ===")
      console.log("Full dataToSend:", dataToSend)
      console.log("deliveryDate in payload:", dataToSend.deliveryDate)
      console.log("bookingSlot in payload:", dataToSend.bookingSlot)

      // Validate slot capacity if booking slot is being changed
      if (dataToSend.bookingSlot && dataToSend.quantity) {
        const selectedSlot = slots.find((slot) => slot.value === dataToSend.bookingSlot)
        if (selectedSlot) {
          const requestedQuantity = Number(dataToSend.quantity)
          const availableCapacity = selectedSlot.available

          // If this is the same order, add back its current quantity to available capacity
          const currentOrderQuantity = row?.quantity || 0
          const adjustedAvailableCapacity = availableCapacity + currentOrderQuantity

          if (requestedQuantity > adjustedAvailableCapacity) {
            Toast.error(
              `Insufficient slot capacity. Available: ${adjustedAvailableCapacity}, Requested: ${requestedQuantity}`
            )
            setpatchLoading(false)
            return
          }
        }
      }

      // Validate quantity changes
      if (dataToSend.quantity) {
        const newQuantity = Number(dataToSend.quantity)
        const currentQuantity = Number(row?.quantity || 0)

        if (newQuantity <= 0) {
          Toast.error("Quantity must be greater than 0")
          setpatchLoading(false)
          return
        }

        // If quantity is being increased, check slot capacity
        if (newQuantity > currentQuantity) {
          const slotId = dataToSend.bookingSlot || row?.details?.bookingSlot?.slotId
          if (slotId) {
            const selectedSlot = slots.find((slot) => slot.value === slotId)
            if (selectedSlot) {
              const quantityIncrease = newQuantity - currentQuantity
              if (quantityIncrease > selectedSlot.available) {
                Toast.error(
                  `Cannot increase quantity. Available capacity: ${selectedSlot.available}`
                )
                setpatchLoading(false)
                return
              }
            }
          }
        }
      }

      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      const emps = await instance.request({
        ...dataToSend,
        numberOfPlants: dataToSend?.quantity
      })

      refreshComponent()

      if (emps?.error) {
        Toast.error(emps?.error)
        setpatchLoading(false)
        return
      }

      if (emps?.data?.status === "Success") {
        Toast.success("Order updated successfully")

        // Your existing code for handling success
        if (dataToSend?.orderStatus === "ACCEPTED") {
          // Your existing WATI template code
        }

        setEditingRows(new Set())
        setUpdatedObject(null)

        // Refresh the main list immediately
        await getOrders()

        // Also refresh modal data if modal is open
        if (selectedOrder) {
          setTimeout(() => {
            refreshModalData()
          }, 500)
        }

        // Refresh slots to get updated capacity
        if (dataToSend.bookingSlot || dataToSend.quantity) {
          const plantId = row?.details?.plantID || selectedOrder?.details?.plantID
          const subtypeId = row?.details?.plantSubtypeID || selectedOrder?.details?.plantSubtypeID
          if (plantId && subtypeId) {
            setTimeout(() => {
              getSlots(plantId, subtypeId)
            }, 1000) // Small delay to ensure backend has processed the update
          }
        }
      }
    } catch (error) {
      console.error("Error updating order:", error)
      Toast.error("Failed to update order")
    } finally {
      setpatchLoading(false)
    }
  }
  const saveEditedRow = (index, row) => {
    pacthOrders(
      {
        id: row?.details?.orderid,
        ...updatedObject
      },
      row
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-700"
      case "PENDING":
        return "bg-yellow-100 text-yellow-700"
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-100 text-red-700"
      case "DISPATCHED":
      case "PROCESSING":
        return "bg-blue-100 text-blue-700"
      case "COMPLETED":
        return "bg-gray-100 text-gray-700"
      case "PARTIALLY_COMPLETED":
        return "bg-indigo-100 text-indigo-700"
      case "FARM_READY":
        return "bg-green-100 text-green-700 border border-green-300"
      case "DISPATCH_PROCESS":
        return "bg-cyan-100 text-cyan-700"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }

  const toggleEditing = (index, row) => {
    // console.log(row)
    setSelectedRow(row)
    setUpdatedObject({
      rate: row?.rate,
      quantity: row?.quantity,
      bookingSlot: row?.details?.bookingSlot?.slotId,
      deliveryDate: row?.details?.deliveryDate ? new Date(row?.details?.deliveryDate) : null
    })
    // setSelectedRow(row)
    const newEditingRows = new Set(editingRows)
    if (newEditingRows.has(index)) {
      newEditingRows.delete(index)
    } else {
      newEditingRows.add(index)
    }
    setEditingRows(newEditingRows)
  }
  const handleInputChange = (index, key, value) => {
    //const newData = [...orders]
    // newData[index][key] = value
    //  setData(newData)
    setUpdatedObject({ ...updatedObject, [key]: value })
  }

  const refreshComponent = () => {
    setRefresh(!refresh)
  }
  const cancelEditing = (index) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(index)
    setEditingRows(newEditingRows)
    setUpdatedObject(null)
    setSelectedRow(null)
  }

  // Status change handler with confirmation
  const handleStatusChange = (row, newStatus) => {
    setConfirmDialog({
      open: true,
      title: "Confirm Status Change",
      description: `Change status of Order #${row.order} from ${row.orderStatus} to ${newStatus}?`,
      onConfirm: () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        pacthOrders(
          {
            id: row?.details?.orderid,
            orderStatus: newStatus
          },
          row
        )
      }
    })
  }

  // Payment add handler with confirmation
  const handleAddPaymentWithConfirm = (orderId) => {
    setConfirmDialog({
      open: true,
      title: "Confirm Add Payment",
      description: `Add payment of ₹${newPayment.paidAmount} (${
        newPayment.modeOfPayment
      }) to Order #${selectedOrder?.order || orderId}?`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        await handleAddPayment(orderId)
      }
    })
  }

  // Handle status tab change
  const handleStatusTabChange = (tabKey) => {
    setActiveStatusTab(tabKey)
  }

  // Get filtered orders count for each tab
  const getOrdersCountByStatus = (status) => {
    if (!orders || !Array.isArray(orders) || orders.length === 0) return 0
    if (status === null) return orders.length
    return orders.filter((order) => order.orderStatus === status).length
  }

  return (
    <div className="w-full p-4 bg-gray-50">
      {(loading || patchLoading) && <PageLoader />}

      {/* Header Controls */}
      <div className="mb-6 space-y-4">
        {/* Date range picker and search box */}
        <div className="flex flex-col lg:flex-row gap-4">
          {!slotId && (
            <div className="flex-1">
              <div className="flex gap-4 items-center">
                {/* Date Range Picker */}
                <div className="flex-1">
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => setSelectedDateRange(update)}
                    isClearable={true}
                    placeholderText="Select date range"
                    className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    calendarClassName="custom-datepicker"
                  />
                </div>

                {/* Date Shortcut Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date()
                      setSelectedDateRange([today, today])
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors whitespace-nowrap">
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      setSelectedDateRange([yesterday, yesterday])
                    }}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors whitespace-nowrap">
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date()
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      setSelectedDateRange([yesterday, today])
                    }}
                    className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors whitespace-nowrap">
                    Last 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date()
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      setSelectedDateRange([weekAgo, today])
                    }}
                    className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors whitespace-nowrap">
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDateRange([null, null])}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors whitespace-nowrap">
                    Clear
                  </button>
                </div>

                {/* Search Input */}
                <div className="w-80">
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full p-3 enhanced-select"
                  />
                </div>
              </div>

              {/* Status Indicators */}
              {viewMode === "farmready" && startDate && endDate && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📅 Filtering farm ready orders from{" "}
                    <span className="font-semibold">{moment(startDate).format("DD-MM-YYYY")}</span>{" "}
                    to <span className="font-semibold">{moment(endDate).format("DD-MM-YYYY")}</span>
                  </p>
                </div>
              )}
              {viewMode === "farmready" && (!startDate || !endDate) && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    📅 Showing all farm ready orders (no date filter applied)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sales Person/Dealer Filter */}
            <SearchableDropdown
              label="Sales Person / Dealer"
              value={selectedSalesPerson}
              onChange={setSelectedSalesPerson}
              options={[{ label: "All Sales People & Dealers", value: "" }, ...(salesPeople || [])]}
              placeholder="Select Sales Person / Dealer"
              showCount={true}
              maxHeight="500px"
            />

            {/* Village Filter */}
            <SearchableDropdown
              label="Village"
              value={selectedVillage}
              onChange={setSelectedVillage}
              options={[
                { label: "All Villages", value: "" },
                ...(villages || []).map((village) => ({ label: village, value: village }))
              ]}
              placeholder="Select Village"
              showCount={true}
              maxHeight="500px"
            />

            {/* District Filter */}
            <SearchableDropdown
              label="District"
              value={selectedDistrict}
              onChange={setSelectedDistrict}
              options={[
                { label: "All Districts", value: "" },
                ...(districts || []).map((district) => ({ label: district, value: district }))
              ]}
              placeholder="Select District"
              showCount={true}
              maxHeight="500px"
            />
          </div>

          {/* Clear Filters and Export Buttons */}
          <div className="mt-4 flex justify-between items-center">
            <ExcelExport
              title="Export Orders"
              filters={{
                orderStatus:
                  activeStatusTab !== "all"
                    ? statusTabs.find((tab) => tab.key === activeStatusTab)?.status
                    : "",
                startDate: startDate ? moment(startDate).format("YYYY-MM-DD") : "",
                endDate: endDate ? moment(endDate).format("YYYY-MM-DD") : ""
              }}
              onExportComplete={() => {
                Toast.success("Orders exported successfully!")
              }}
            />
            <button
              onClick={() => {
                setSelectedSalesPerson("")
                setSelectedVillage("")
                setSelectedDistrict("")
                setSelectedDateRange([null, null])
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 enhanced-select hover:bg-gray-50 focus:outline-none">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-wrap gap-3">
            {(statusTabs || []).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusTabChange(tab.key)}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeStatusTab === tab.key
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                    : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200"
                }`}>
                <div className="flex items-center gap-2">
                  <span>{tab.label}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activeStatusTab === tab.key
                        ? "bg-white bg-opacity-30 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                    {getOrdersCountByStatus(tab.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* View mode toggle buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setViewMode("booking")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
              viewMode === "booking"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200"
            }`}>
            📋 Booking Orders
          </button>
          <button
            onClick={() => setViewMode("dispatched")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
              viewMode === "dispatched"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200"
            }`}>
            🚚 Dispatched Orders
          </button>
          <button
            onClick={() => setViewMode("farmready")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
              viewMode === "farmready"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200"
            }`}>
            🌱 Farm Ready
          </button>
          <button
            onClick={() => setViewMode("ready_for_dispatch")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
              viewMode === "ready_for_dispatch"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200"
            }`}>
            ✅ Ready for Dispatch
          </button>
          <button
            onClick={() => setViewMode("dispatch_process")}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
              viewMode === "dispatch_process"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                : "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 border border-gray-200"
            }`}>
            ⏳ Loading
          </button>
        </div>
      </div>

      {/* Dispatch list component */}
      <DispatchList setisDispatchtab={setisDispatchtab} viewMode={viewMode} refresh={refresh} />

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {orders && orders.length > 0 ? (
          orders.map((row, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer ${
                row?.details?.payment.some((payment) => payment.paymentStatus === "PENDING")
                  ? "payment-blink"
                  : ""
              } ${row?.details?.dealerOrder ? "border-sky-200 bg-sky-50" : ""}`}
              onClick={() => {
                setSelectedOrder(row)
                setIsOrderModalOpen(true)
              }}>
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm">Order #{row.order}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{row.farmerName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {viewMode !== "booking" && (
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleRowSelection(row.details.orderid, row)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        checked={selectedRows.has(row.details.orderid)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                    <DownloadPDFButton order={row} />
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  {row.orderStatus !== "COMPLETED" ? (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <SearchableDropdown
                        label=""
                        value={row.orderStatus}
                        onChange={(newStatus) => handleStatusChange(row, newStatus)}
                        options={orderStatusOptions || []}
                        placeholder="Select Status"
                        maxHeight="200px"
                        isStatusDropdown={true}
                      />
                    </div>
                  ) : (
                    <span
                      className={`status-badge-enhanced status-${row.orderStatus
                        .toLowerCase()
                        .replace("_", "-")} flex items-center gap-1`}>
                      {row.orderStatus === "FARM_READY" && "🌱"}
                      {row.orderStatus === "DISPATCH_PROCESS" ? "Loading" : row.orderStatus}
                    </span>
                  )}

                  {/* Farm Ready Button - Shows for ACCEPTED orders or orders with existing farm ready date */}
                  {(row.orderStatus === "ACCEPTED" || row["Farm Ready"] !== "-") && (
                    <FarmReadyButton
                      orderId={row.details.orderid}
                      onUpdateOrder={pacthOrders}
                      refreshOrders={refreshComponent}
                      currentFarmReadyDate={row.details.farmReadyDate || null}
                    />
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Plant Info */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Plant Type</span>
                  <span className="text-sm font-medium text-gray-900">{row.plantType}</span>
                </div>

                {/* Quantity & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Quantity</span>
                    <div className="text-sm font-medium text-gray-900">{row.quantity}</div>
                    {row["remaining Plants"] < row.quantity && (
                      <div className="text-xs text-orange-600 mt-1">
                        Remaining: {row["remaining Plants"]}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Rate</span>
                    <div className="text-sm font-medium text-gray-900">₹{row.rate}</div>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="bg-gray-50 rounded-md p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-sm font-semibold text-gray-900">{row.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Paid</span>
                    <span className="text-sm text-green-600">{row["Paid Amt"]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Remaining</span>
                    <span className="text-sm text-amber-600">{row["remaining Amt"]}</span>
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Delivery Period</span>
                    <span className="text-sm font-medium text-blue-600">{row.Delivery}</span>
                  </div>
                  {row.deliveryDate && row.deliveryDate !== "-" && (
                    <div className="flex items-center justify-between bg-blue-50 rounded-md p-2 border border-blue-200">
                      <span className="text-xs text-blue-700 font-medium flex items-center">
                        📅 Delivery Date
                      </span>
                      <span className="text-sm font-semibold text-blue-800">
                        {row.deliveryDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Farm Ready Date Display - Shows when order has been marked as farm ready */}
                {row["Farm Ready"] !== "-" && (
                  <div className="flex items-center justify-between bg-green-50 rounded-md p-2 border border-green-200">
                    <span className="text-xs text-green-700 font-medium flex items-center">
                      🌱 Farm Ready Date
                    </span>
                    <span className="text-sm font-semibold text-green-800">
                      {row["Farm Ready"]}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {viewMode !== "dispatch_process" &&
                  row?.orderStatus !== "COMPLETED" &&
                  row?.orderStatus !== "DISPATCH_PROCESS" &&
                  row?.orderStatus !== "DISPATCHED" && (
                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                      {editingRows.has(index) ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              saveEditedRow(index, row)
                            }}
                            className="text-green-500 hover:text-green-700">
                            <CheckIcon size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelEditing(index)
                            }}
                            className="text-red-500 hover:text-red-700">
                            <XIcon size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleEditing(index, row)
                          }}
                          className="text-gray-500 hover:text-gray-700">
                          <Edit2Icon size={16} />
                        </button>
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-500">
                {loading ? "Loading orders..." : "No orders match your current filters."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom bar for batch actions */}
      {viewMode !== "booking" && selectedRows.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm py-4 border-t shadow-lg z-50">
          <div className="flex justify-between items-center max-w-7xl mx-auto px-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedRows.size} {selectedRows.size === 1 ? "order" : "orders"} selected
              </span>
            </div>
            <button
              onClick={() => setIsDispatchFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <span>Proceed to Dispatch</span>
            </button>
          </div>
        </div>
      )}

      {/* Dispatch form modal */}
      {isDispatchFormOpen && (
        <DispatchForm
          open={isDispatchFormOpen}
          onClose={() => {
            setIsDispatchFormOpen(false)
            setSelectedRows(new Set())
            getOrders()
          }}
          selectedOrders={selectedRows}
          orders={orders}
        />
      )}

      {/* Order Details Modal */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Order #{selectedOrder.order}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedOrder.farmerName} • {selectedOrder.plantType}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshModalData}
                    className="text-white hover:text-blue-100 transition-colors p-1 rounded hover:bg-white hover:bg-opacity-10">
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOrderModalOpen(false)
                      setSelectedOrder(null)
                      setShowPaymentForm(false)
                      setUpdatedObject(null)
                      setSlots([])
                      resetPaymentForm(false)
                    }}
                    className="text-white hover:text-blue-100 transition-colors">
                    <XIcon size={24} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-4">
                {/* Order Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="text-blue-600 text-xs font-medium">Total Value</div>
                    <div className="text-lg font-bold text-blue-900">
                      ₹{(selectedOrder.rate * selectedOrder.quantity).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-green-600 text-xs font-medium">Paid Amount</div>
                    <div className="text-lg font-bold text-green-900">
                      ₹{getTotalPaidAmount(selectedOrder?.details?.payment).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="text-amber-600 text-xs font-medium">Remaining</div>
                    <div className="text-lg font-bold text-amber-900">
                      ₹
                      {(
                        selectedOrder.rate * selectedOrder.quantity -
                        getTotalPaidAmount(selectedOrder?.details?.payment)
                      ).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <div className="text-purple-600 text-xs font-medium">Status</div>
                    <div className="text-sm font-bold text-purple-900">
                      {selectedOrder.orderStatus}
                    </div>
                  </div>
                </div>

                {/* Main Content Tabs */}
                <div className="bg-white rounded-lg border">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-6 px-4" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "overview"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaUser size={14} className="mr-1" />
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("payments")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "payments"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaCreditCard size={14} className="mr-1" />
                        Payments
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("edit")
                          // Always initialize updatedObject with current values when edit tab is opened
                          if (selectedOrder) {
                            setUpdatedObject({
                              rate: selectedOrder.rate,
                              quantity: selectedOrder.quantity,
                              bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
                              deliveryDate: selectedOrder?.details?.deliveryDate 
                                ? new Date(selectedOrder.details.deliveryDate) 
                                : null
                            })
                          }
                        }}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "edit"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaEdit size={14} className="mr-1" />
                        Edit Order
                      </button>
                      <button
                        onClick={() => setActiveTab("remarks")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "remarks"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaFileAlt size={14} className="mr-1" />
                        Remarks
                      </button>
                      <button
                        onClick={() => setActiveTab("dispatchTrail")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "dispatchTrail"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <span className="mr-1">🚚</span>
                        Dispatch Trail
                      </button>
                      <button
                        onClick={() => setActiveTab("editHistory")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "editHistory"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <span className="mr-1">📝</span>
                        Edit History
                      </button>
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-4">
                    {activeTab === "overview" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h3 className="font-medium text-gray-900 mb-3 text-sm">
                              {selectedOrder?.details?.orderFor ? "Order For Information" : "Farmer Information"}
                            </h3>
                            <div className="space-y-3">
                              {selectedOrder?.details?.orderFor ? (
                                <>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Customer Name</span>
                                    <span className="font-medium text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded">
                                      👤 {selectedOrder?.details?.orderFor?.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Mobile Number</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.orderFor?.mobileNumber}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Address</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.orderFor?.address}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Name</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.farmer?.name}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Village</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.farmer?.village}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h3 className="font-medium text-gray-900 mb-3 text-sm">Sales Person</h3>
                            <div className="space-y-3">
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Name</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.salesPerson?.name}
                                </span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Contact</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.salesPerson?.phoneNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Show farmer information if orderFor is present but farmer also exists */}
                        {selectedOrder?.details?.orderFor && selectedOrder?.details?.farmer && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <h3 className="font-medium text-gray-900 mb-3 text-sm flex items-center">
                              <span className="mr-2">🌾</span>
                              Farmer Information
                            </h3>
                            <div className="space-y-3">
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Farmer Name</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.farmer?.name}
                                </span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Mobile Number</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.farmer?.mobileNumber}
                                </span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">Village</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.farmer?.village}
                                </span>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <span className="text-xs text-gray-500 font-medium">District</span>
                                <span className="font-medium text-sm text-gray-900">
                                  {selectedOrder?.details?.farmer?.district}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h3 className="font-medium text-gray-900 mb-3 text-sm">Order Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Plant Type</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.plantType}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Total Quantity</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.quantity}
                              </span>
                            </div>
                            {selectedOrder["remaining Plants"] < selectedOrder.quantity && (
                              <div className="flex flex-col space-y-1 bg-orange-50 p-2 rounded border border-orange-200">
                                <span className="text-xs text-orange-700 font-medium">📦 Remaining to Dispatch</span>
                                <span className="font-bold text-sm text-orange-900">
                                  {selectedOrder["remaining Plants"]} plants
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">
                                Rate per Plant
                              </span>
                              <span className="font-medium text-sm text-gray-900">
                                ₹{selectedOrder.rate}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">
                                Delivery Period
                              </span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.Delivery}
                              </span>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Order Booking Date</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder.orderDate}
                              </span>
                            </div>
                            {selectedOrder.deliveryDate && selectedOrder.deliveryDate !== "-" && (
                              <div className="flex flex-col space-y-1 bg-blue-50 p-2 rounded border border-blue-200">
                                <span className="text-xs text-blue-700 font-medium">📅 Delivery Date</span>
                                <span className="font-bold text-sm text-blue-900">
                                  {selectedOrder.deliveryDate}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col space-y-1">
                              <span className="text-xs text-gray-500 font-medium">Farm Ready</span>
                              <span className="font-medium text-sm text-gray-900">
                                {selectedOrder["Farm Ready"]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Farm Ready Date History */}
                        {selectedOrder?.details?.farmReadyDateChanges &&
                          selectedOrder?.details?.farmReadyDateChanges.length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                              <h3 className="font-medium text-amber-900 mb-2 flex items-center text-sm">
                                <span className="mr-1">🌾</span>
                                Farm Ready Date History
                              </h3>
                              <div className="space-y-1">
                                {(selectedOrder.details.farmReadyDateChanges || []).map(
                                  (change, index) => (
                                    <div
                                      key={index}
                                      className={`flex items-center justify-between p-2 rounded text-sm ${
                                        index === 0 ? "bg-amber-100" : "bg-white"
                                      }`}>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-amber-900">
                                            {change.newDate
                                              ? moment(change.newDate).format("DD MMMM, YYYY")
                                              : "Not set"}
                                          </span>
                                          {index === 0 && (
                                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full ml-2">
                                              Latest
                                            </span>
                                          )}
                                        </div>
                                        {change.previousDate && (
                                          <div className="text-xs text-amber-700 mt-1">
                                            Changed from:{" "}
                                            {moment(change.previousDate).format("DD MMMM, YYYY")}
                                          </div>
                                        )}
                                        {change.reason && (
                                          <div className="text-xs text-amber-600 mt-1">
                                            Reason: {change.reason}
                                          </div>
                                        )}
                                        {change.notes && (
                                          <div className="text-xs text-amber-600 mt-1">
                                            Notes: {change.notes}
                                          </div>
                                        )}
                                        {change.changedBy && (
                                          <div className="text-xs text-amber-600 mt-1">
                                            Changed by: {change.changedBy?.name || "Unknown User"}
                                          </div>
                                        )}
                                        <div className="text-xs text-amber-500 mt-1">
                                          {change.createdAt
                                            ? moment(change.createdAt).format("DD/MM/YYYY HH:mm")
                                            : ""}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Status History */}
                        {selectedOrder?.details?.statusChanges &&
                          selectedOrder?.details?.statusChanges.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <h3 className="font-medium text-blue-900 mb-2 flex items-center text-sm">
                                <span className="mr-1">📊</span>
                                Status Change History
                              </h3>
                              <div className="space-y-1">
                                {(selectedOrder.details.statusChanges || []).map(
                                  (change, index) => (
                                    <div
                                      key={index}
                                      className="bg-white p-2 rounded border text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-900">
                                          {change.previousStatus} → {change.newStatus}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {moment(change.changedAt).format("DD/MM/YYYY HH:mm")}
                                        </span>
                                      </div>
                                      {change.changedBy && (
                                        <div className="text-xs text-gray-600">
                                          Changed by: {change.changedBy.name}
                                        </div>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Delivery Changes */}
                        {selectedOrder?.details?.deliveryChanges &&
                          selectedOrder?.details?.deliveryChanges.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <h3 className="font-medium text-green-900 mb-3 flex items-center">
                                <span className="mr-2">🚚</span>
                                Delivery Change History
                              </h3>
                              <div className="space-y-3">
                                {(selectedOrder.details.deliveryChanges || []).map(
                                  (change, index) => {
                                    const prevStartDay = change.previousDeliveryDate?.startDay
                                    const prevEndDay = change.previousDeliveryDate?.endDay
                                    const prevMonth = change.previousDeliveryDate?.month
                                    const prevYear = change.previousDeliveryDate?.year

                                    const newStartDay = change.newDeliveryDate?.startDay
                                    const newEndDay = change.newDeliveryDate?.endDay
                                    const newMonth = change.newDeliveryDate?.month
                                    const newYear = change.newDeliveryDate?.year

                                    return (
                                      <div key={index} className="bg-white p-3 rounded border">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-900">
                                            Delivery Changed
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {moment(change.changedAt).format("DD/MM/YYYY")}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                          <div className="bg-red-50 px-3 py-2 rounded-md">
                                            <span className="text-red-500 line-through text-sm">
                                              {prevStartDay} - {prevEndDay} {prevMonth} {prevYear}
                                            </span>
                                          </div>
                                          <div className="flex justify-center">
                                            <span className="text-gray-400">→</span>
                                          </div>
                                          <div className="bg-green-50 px-3 py-2 rounded-md">
                                            <span className="text-green-600 font-medium text-sm">
                                              {newStartDay} - {newEndDay} {newMonth} {newYear}
                                            </span>
                                          </div>
                                        </div>
                                        {change.reasonForChange && (
                                          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                                            <span className="font-medium">Reason:</span>{" "}
                                            {change.reasonForChange}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {/* Dispatch History */}
                        {selectedOrder?.details?.dispatchHistory &&
                          selectedOrder?.details?.dispatchHistory.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                                <span className="mr-2">🚚</span>
                                Dispatch History
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Total Plants</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {selectedOrder.quantity}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Dispatched Plants</div>
                                  <div className="text-xl font-bold text-blue-600">
                                    {selectedOrder.quantity - selectedOrder["remaining Plants"]}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Remaining to Dispatch</div>
                                  <div className="text-xl font-bold text-orange-600">
                                    {selectedOrder["remaining Plants"]}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {(selectedOrder.details.dispatchHistory || []).map(
                                  (dispatchItem, dispatchIndex) => (
                                    <div key={dispatchIndex} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-blue-600">
                                          {dispatchItem.quantity} plants dispatched
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {dispatchItem.date
                                            ? moment(dispatchItem.date).format("DD/MM/YYYY HH:mm")
                                            : "N/A"}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium">Remaining after dispatch:</span>{" "}
                                        {dispatchItem.remainingAfterDispatch} plants
                                      </div>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {dispatchItem.dispatchId && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Dispatch ID: {dispatchItem.dispatchId}
                                          </span>
                                        )}
                                        {dispatchItem.processedBy && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Processed by: {dispatchItem.processedBy.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Return History */}
                        {selectedOrder?.details?.returnHistory &&
                          selectedOrder?.details?.returnHistory.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              <h3 className="font-medium text-red-900 mb-3 flex items-center">
                                <span className="mr-2">🔄</span>
                                Plant Return History
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Total Plants</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {selectedOrder.quantity}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Returned Plants</div>
                                  <div className="text-xl font-bold text-red-600">
                                    {selectedOrder["returned Plants"]}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Remaining Plants</div>
                                  <div className="text-xl font-bold text-green-600">
                                    {selectedOrder["remaining Plants"]}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {(selectedOrder.details.returnHistory || []).map(
                                  (returnItem, returnIndex) => (
                                    <div key={returnIndex} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-red-600">
                                          {returnItem.quantity} plants returned
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {returnItem.date
                                            ? moment(returnItem.date).format("DD/MM/YYYY")
                                            : "N/A"}
                                        </span>
                                      </div>
                                      {returnItem.reason && (
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">Reason:</span>{" "}
                                          {returnItem.reason}
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {returnItem.dispatchId && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Dispatch ID: {returnItem.dispatchId}
                                          </span>
                                        )}
                                        {returnItem.processedBy && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Processed by: {returnItem.processedBy.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {activeTab === "payments" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-gray-900">
                            Payment Management
                          </h3>
                          {canAddPayment && (
                            <button
                              onClick={() => {
                                if (!showPaymentForm) {
                                  initializePaymentForm()
                                }
                                setShowPaymentForm(!showPaymentForm)
                              }}
                              className="bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors text-sm">
                              {showPaymentForm ? "Cancel" : "+ Add Payment"}
                              {isOfficeAdmin && (
                                <span className="ml-1 text-xs">(PENDING only)</span>
                              )}
                            </button>
                          )}
                        </div>

                        {showPaymentForm && (
                          <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="font-medium text-gray-900 mb-3 text-sm">
                              Add New Payment
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  value={newPayment.paidAmount}
                                  onChange={(e) =>
                                    handlePaymentInputChange("paidAmount", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                  placeholder="Enter amount"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Payment Date
                                </label>
                                <input
                                  type="date"
                                  value={newPayment.paymentDate}
                                  onChange={(e) =>
                                    handlePaymentInputChange("paymentDate", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Payment Mode
                                </label>
                                <select
                                  value={newPayment.modeOfPayment}
                                  onChange={(e) =>
                                    handlePaymentInputChange("modeOfPayment", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1">
                                  <option value="">Select Mode</option>
                                  <option value="Cash">Cash</option>
                                  <option value="Phone Pe">Phone Pe</option>
                                  <option value="Google Pay">Google Pay</option>
                                  <option value="Cheque">Cheque</option>
                                  <option value="NEFT">NEFT</option>
                                  <option value="JPCB">JPCB</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Payment Status
                                </label>
                                <div
                                  className={`w-full px-3 py-2 border rounded-lg mt-1 text-sm ${
                                    getPaymentStatusDisplay().bgColor
                                  } ${getPaymentStatusDisplay().color} ${
                                    getPaymentStatusDisplay().borderColor
                                  }`}>
                                  {getPaymentStatusDisplay().status} (
                                  {getPaymentStatusDisplay().message})
                                </div>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Bank Name
                                </label>
                                <input
                                  type="text"
                                  value={newPayment.bankName}
                                  onChange={(e) =>
                                    handlePaymentInputChange("bankName", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                  placeholder={
                                    newPayment.modeOfPayment === "Cheque" ||
                                    newPayment.modeOfPayment === "NEFT"
                                      ? "Enter bank name"
                                      : "N/A"
                                  }
                                  disabled={
                                    newPayment.modeOfPayment !== "Cheque" &&
                                    newPayment.modeOfPayment !== "NEFT"
                                  }
                                />
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="text-sm text-gray-500 font-medium">Remark</label>
                              <input
                                type="text"
                                value={newPayment.remark}
                                onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                placeholder="Optional remark"
                              />
                            </div>

                            {/* Wallet Payment Status Indicator */}
                            {newPayment.isWalletPayment && (
                              <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                                <div className="flex items-center">
                                  <div className="text-green-600 mr-2">✓</div>
                                  <div className="text-sm text-green-800">
                                    <div className="font-medium">Wallet Payment Ready</div>
                                    <div className="text-xs text-green-600 mt-1">
                                      Payment will be processed from wallet with status:{" "}
                                      {newPayment.paymentStatus || "PENDING"}
                                      {newPayment.paymentStatus === "PENDING" &&
                                        " (No wallet impact until collected)"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Dealer Wallet Payment Processing Info */}
                            {selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                              newPayment.isWalletPayment &&
                              dealerWalletData && (
                                <div className="mt-4 bg-green-50 p-4 rounded-lg border border-green-200">
                                  <div className="flex items-center">
                                    <div className="text-green-600 mr-2">✓</div>
                                    <div className="text-sm text-green-800">
                                      <div className="font-medium">Dealer Wallet Payment Ready</div>
                                      <div className="text-xs text-green-600 mt-1">
                                        Payment will be processed from dealer wallet:{" "}
                                        {selectedOrder?.details?.salesPerson?.name}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Wallet Payment Option - Show for Accountant, Super Admin, Office Admin, or when dealer is present */}
                            {(user?.role === "SUPER_ADMIN" ||
                              user?.role === "ACCOUNTANT" ||
                              user?.role === "OFFICE_ADMIN" ||
                              selectedOrder?.details?.salesPerson?.jobTitle === "DEALER") && (
                              <div className="mt-4">
                                {/* Dealer Wallet Information */}
                                {selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                                  dealerWalletData && (
                                    <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-sm font-medium text-blue-900">
                                          Dealer Wallet: {selectedOrder?.details?.salesPerson?.name}
                                        </h5>
                                        {dealerWalletLoading && (
                                          <div className="text-xs text-blue-600">Loading...</div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <div className="text-blue-600 font-medium">
                                            Available Balance
                                          </div>
                                          <div className="text-lg font-bold text-blue-900">
                                            ₹
                                            {(
                                              dealerWalletData?.financial?.availableAmount ?? 0
                                            )?.toLocaleString()}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-blue-600 font-medium">
                                            Total Orders
                                          </div>
                                          <div className="text-lg font-bold text-blue-900">
                                            ₹
                                            {(
                                              dealerWalletData?.financial?.totalOrderAmount ?? 0
                                            )?.toLocaleString()}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id="walletPayment"
                                      checked={newPayment.isWalletPayment}
                                      onChange={(e) =>
                                        handlePaymentInputChange(
                                          "isWalletPayment",
                                          e.target.checked
                                        )
                                      }
                                      className="mr-3 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                                    />
                                    <label
                                      htmlFor="walletPayment"
                                      className="text-gray-700 font-medium">
                                      Pay from Wallet
                                    </label>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">
                                      {selectedOrder?.details?.salesPerson?.jobTitle === "DEALER"
                                        ? "Dealer Wallet Balance"
                                        : "Wallet Balance"}
                                    </div>
                                    <div
                                      className={`text-base font-bold ${
                                        newPayment.isWalletPayment &&
                                        Number(newPayment.paidAmount) >
                                          (selectedOrder?.details?.salesPerson?.jobTitle ===
                                          "DEALER"
                                            ? dealerWalletData?.financial?.availableAmount ?? 0
                                            : walletData?.financial?.availableAmount ?? 0)
                                          ? "text-red-600"
                                          : "text-gray-800"
                                      }`}>
                                      ₹
                                      {(selectedOrder?.details?.salesPerson?.jobTitle === "DEALER"
                                        ? dealerWalletData?.financial?.availableAmount ?? 0
                                        : walletData?.financial?.availableAmount ?? 0
                                      )?.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                {/* Warning messages for wallet payment */}
                                {newPayment.isWalletPayment && (
                                  <div className="mt-2">
                                    {Number(newPayment.paidAmount) >
                                      (selectedOrder?.details?.salesPerson?.jobTitle === "DEALER"
                                        ? dealerWalletData?.financial?.availableAmount ?? 0
                                        : walletData?.financial?.availableAmount ?? 0) && (
                                      <div className="bg-red-50 p-3 rounded-lg">
                                        <div className="text-sm text-red-600 font-medium">
                                          Insufficient wallet balance! Available: ₹
                                          {(selectedOrder?.details?.salesPerson?.jobTitle ===
                                          "DEALER"
                                            ? dealerWalletData?.financial?.availableAmount ?? 0
                                            : walletData?.financial?.availableAmount ?? 0
                                          )?.toLocaleString()}
                                        </div>
                                      </div>
                                    )}

                                    {!newPayment.paidAmount && (
                                      <div className="bg-amber-50 p-3 rounded-lg">
                                        <div className="text-sm text-amber-600 font-medium">
                                          Please enter payment amount
                                        </div>
                                      </div>
                                    )}

                                    {Number(newPayment.paidAmount) <=
                                      (walletData?.financial?.availableAmount ?? 0) &&
                                      newPayment.paidAmount && (
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

                            {/* Dealer Wallet Payment Option for Accountants and Office Admins (when sales person is dealer) */}
                            {(user?.role === "SUPER_ADMIN" ||
                              user?.role === "ACCOUNTANT" ||
                              user?.role === "OFFICE_ADMIN") &&
                              !isDealer &&
                              selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" && (
                                <div className="mt-4">
                                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                          <FaCreditCard className="text-blue-600 text-sm" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-blue-900">
                                            Dealer Wallet Payment
                                          </div>
                                          <div className="text-xs text-blue-600">
                                            Sales Person:{" "}
                                            {selectedOrder?.details?.salesPerson?.name}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-blue-600">
                                          Available Balance
                                        </div>
                                        <div className="text-lg font-bold text-blue-900">
                                          ₹
                                          {(
                                            dealerWalletData?.financial?.availableAmount ?? 0
                                          )?.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id="dealerWalletPayment"
                                        checked={newPayment.isWalletPayment}
                                        onChange={(e) =>
                                          handlePaymentInputChange(
                                            "isWalletPayment",
                                            e.target.checked
                                          )
                                        }
                                        className="mr-3 w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500"
                                      />
                                      <label
                                        htmlFor="dealerWalletPayment"
                                        className="text-blue-800 font-medium">
                                        Pay from Dealer&apos;s Wallet
                                      </label>
                                    </div>

                                    {/* Warning messages for dealer wallet payment */}
                                    {newPayment.isWalletPayment && (
                                      <div className="mt-3 space-y-2">
                                        {Number(newPayment.paidAmount) >
                                          (dealerWalletData?.financial?.availableAmount ?? 0) && (
                                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                            <div className="text-sm text-red-600 font-medium">
                                              ⚠️ Insufficient dealer wallet balance! Available: ₹
                                              {(
                                                dealerWalletData?.financial?.availableAmount ?? 0
                                              )?.toLocaleString()}
                                            </div>
                                          </div>
                                        )}

                                        {!newPayment.paidAmount && (
                                          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                            <div className="text-sm text-amber-600 font-medium">
                                              ℹ️ Please enter payment amount
                                            </div>
                                          </div>
                                        )}

                                        {Number(newPayment.paidAmount) <=
                                          (dealerWalletData?.financial?.availableAmount ?? 0) &&
                                          newPayment.paidAmount && (
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
                            <div className="flex items-center justify-end space-x-2 mt-4">
                              <button
                                onClick={() => setShowPaymentForm(false)}
                                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                                Cancel
                              </button>
                              {canAddPayment && (
                                <button
                                  onClick={() =>
                                    handleAddPaymentWithConfirm(selectedOrder.details.orderid)
                                  }
                                  disabled={
                                    !newPayment.paidAmount ||
                                    (!newPayment.isWalletPayment && !newPayment.modeOfPayment) ||
                                    (isDealer &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (walletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount)) ||
                                    (!isDealer &&
                                      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (dealerWalletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount))
                                  }
                                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                    (isDealer &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (walletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount)) ||
                                    (!isDealer &&
                                      selectedOrder?.details?.salesPerson?.jobTitle === "DEALER" &&
                                      newPayment.isWalletPayment &&
                                      (Number(newPayment.paidAmount) >
                                        (dealerWalletData?.financial?.availableAmount ?? 0) ||
                                        !newPayment.paidAmount))
                                      ? "bg-gray-300 text-gray-500"
                                      : "bg-green-500 text-white hover:bg-green-600"
                                  }`}>
                                  Add Payment
                                  {isOfficeAdmin && (
                                    <span className="ml-1 text-xs">(PENDING only)</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedOrder?.details?.payment &&
                          selectedOrder?.details?.payment.length > 0 && (
                            <div className="bg-white rounded-lg border">
                              <div className="p-3 border-b">
                                <h4 className="font-medium text-gray-900 text-sm">
                                  Payment History
                                </h4>
                              </div>
                              <div className="divide-y">
                                {(selectedOrder.details.payment || []).map((payment, pIndex) => (
                                  <div key={pIndex} className="p-3 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="text-base font-semibold text-gray-900">
                                          ₹{payment.paidAmount}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {payment.modeOfPayment}
                                        </div>
                                        <span
                                          className={`px-2 py-1 text-xs rounded-full ${
                                            payment.paymentStatus === "COLLECTED"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-amber-100 text-amber-700"
                                          }`}>
                                          {payment.paymentStatus}
                                        </span>
                                        {payment.isWalletPayment && (
                                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                            Wallet
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {moment(payment.paymentDate).format("DD/MM/YYYY")}
                                      </div>
                                    </div>
                                    {payment.remark && (
                                      <div className="mt-1 text-xs text-gray-600">
                                        Remark: {payment.remark}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {activeTab === "edit" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Edit Order Details</h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                          {/* Current Order Information */}
                          {selectedOrder?.details?.bookingSlot && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <h4 className="text-sm font-medium text-blue-900 mb-2">
                                Current Order Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-blue-700">Current Delivery Period:</span>{" "}
                                  {selectedOrder.details.bookingSlot.startDay} -{" "}
                                  {selectedOrder.details.bookingSlot.endDay}
                                </div>
                                <div>
                                  <span className="text-blue-700">Current Delivery Date:</span>{" "}
                                  {selectedOrder.deliveryDate || "Not set"}
                                </div>
                                <div>
                                  <span className="text-blue-700">Current Quantity:</span>{" "}
                                  {selectedOrder.quantity}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Rate (₹)</label>
                              <input
                                type="number"
                                value={
                                  updatedObject?.rate !== undefined
                                    ? updatedObject.rate
                                    : selectedOrder?.rate
                                }
                                onChange={(e) => handleInputChange(0, "rate", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Quantity</label>
                              <input
                                type="number"
                                value={
                                  updatedObject?.quantity !== undefined
                                    ? updatedObject.quantity
                                    : selectedOrder?.quantity
                                }
                                onChange={(e) => handleInputChange(0, "quantity", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                              />
                              {updatedObject?.quantity && (
                                <div className="mt-1">
                                  {Number(updatedObject.quantity) >
                                    Number(selectedOrder?.quantity) && (
                                    <div className="text-xs text-amber-600">
                                      ⚠️ Increasing quantity may affect slot capacity
                                    </div>
                                  )}
                                  {Number(updatedObject.quantity) <
                                    Number(selectedOrder?.quantity) && (
                                    <div className="text-xs text-green-600">
                                      ✅ Reducing quantity will free up slot capacity
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">
                                Delivery Date *
                              </label>
                              {slotsLoading ? (
                                <div className="w-full px-3 py-2 border rounded-lg mt-1 bg-gray-50 text-gray-500 text-sm">
                                  Loading available slots...
                                </div>
                              ) : (
                                <DatePicker
                                  selected={updatedObject?.deliveryDate || null}
                                  onChange={(date) => {
                                    // Automatically determine slot from selected date
                                    const slotId = getSlotIdForDate(date)
                                    setUpdatedObject({
                                      ...updatedObject,
                                      deliveryDate: date,
                                      bookingSlot: slotId
                                    })
                                  }}
                                  filterDate={(date) => !isDateDisabled(date)}
                                  minDate={new Date()}
                                  placeholderText="Select delivery date"
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                  dateFormat="dd/MM/yyyy"
                                />
                              )}
                              {slots.length === 0 && !slotsLoading && (
                                <div className="text-xs text-red-500 mt-1">
                                  No available slots found for this plant/subtype combination
                                </div>
                              )}
                              {!slotsLoading && slots.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Select a delivery date (only dates within available slots are enabled)
                                </div>
                              )}

                              {/* Show selected date slot information */}
                              {updatedObject?.deliveryDate &&
                                (() => {
                                  const slotDetails = getSlotDetailsForDate(updatedObject.deliveryDate)
                                  if (slotDetails) {
                                    const requestedQuantity = Number(
                                      updatedObject.quantity || selectedOrder?.quantity || 0
                                    )
                                    const currentQuantity = Number(selectedOrder?.quantity || 0)
                                    const quantityChange = requestedQuantity - currentQuantity
                                    const adjustedAvailable =
                                      slotDetails.available + currentQuantity

                                    return (
                                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="text-xs text-gray-700 space-y-2">
                                          <div className="font-medium text-blue-900">
                                            📅 Delivery Period: {slotDetails.startDay} - {slotDetails.endDay}
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <span className="text-gray-600">Available Capacity:</span>
                                              <div className="font-semibold text-green-700">
                                                {adjustedAvailable}
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-600">Requested Quantity:</span>
                                              <div className="font-semibold text-gray-900">
                                                {requestedQuantity}
                                              </div>
                                            </div>
                                          </div>
                                          {quantityChange !== 0 && (
                                            <div className={quantityChange > 0 ? "text-amber-700" : "text-green-700"}>
                                              {quantityChange > 0 ? "⚠️" : "✅"} Quantity change: {quantityChange > 0 ? "+" : ""}{quantityChange}
                                            </div>
                                          )}
                                          {requestedQuantity > adjustedAvailable && (
                                            <div className="text-red-700 font-medium bg-red-50 p-2 rounded">
                                              ❌ Insufficient capacity! Only {adjustedAvailable} available.
                                            </div>
                                          )}
                                          {requestedQuantity <= adjustedAvailable && requestedQuantity > 0 && (
                                            <div className="text-green-700 font-medium">
                                              ✅ Sufficient capacity available
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  } else {
                                    return (
                                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                        <div className="text-xs text-red-600">
                                          ⚠️ Selected date does not fall within any available slot
                                        </div>
                                      </div>
                                    )
                                  }
                                })()}
                            </div>
                          </div>
                          <div className="flex items-center justify-end space-x-2 mt-6">
                            <button
                              onClick={() => {
                                setUpdatedObject(null)
                                setSelectedRow(null)
                              }}
                              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                // Validate form before saving
                                const hasChanges =
                                  updatedObject && Object.keys(updatedObject).length > 0
                                if (!hasChanges) {
                                  Toast.info("No changes to save")
                                  return
                                }

                                // Validate required fields
                                if (updatedObject.quantity && Number(updatedObject.quantity) <= 0) {
                                  Toast.error("Quantity must be greater than 0")
                                  return
                                }

                                if (updatedObject.rate && Number(updatedObject.rate) <= 0) {
                                  Toast.error("Rate must be greater than 0")
                                  return
                                }

                                // Show confirmation dialog with changes summary
                                const changes = []
                                if (updatedObject.rate !== selectedOrder.rate) {
                                  changes.push(
                                    `Rate: ₹${selectedOrder.rate} → ₹${updatedObject.rate}`
                                  )
                                }
                                if (updatedObject.quantity !== selectedOrder.quantity) {
                                  changes.push(
                                    `Quantity: ${selectedOrder.quantity} → ${updatedObject.quantity}`
                                  )
                                }
                                // Check if delivery date has changed
                                if (updatedObject.deliveryDate) {
                                  const currentDate = selectedOrder?.details?.deliveryDate 
                                    ? moment(selectedOrder.details.deliveryDate).format("DD/MM/YYYY")
                                    : "Not set"
                                  const newDate = moment(updatedObject.deliveryDate).format("DD/MM/YYYY")
                                  
                                  if (currentDate !== newDate) {
                                    const slotDetails = getSlotDetailsForDate(updatedObject.deliveryDate)
                                    const deliveryPeriod = slotDetails 
                                      ? `${slotDetails.startDay} - ${slotDetails.endDay}`
                                      : "Unknown"
                                    changes.push(
                                      `Delivery Date: ${currentDate} → ${newDate} (Period: ${deliveryPeriod})`
                                    )
                                  }
                                }

                                if (changes.length > 0) {
                                  setConfirmDialog({
                                    open: true,
                                    title: "Confirm Order Changes",
                                    description: `Are you sure you want to update this order?\n\nChanges:\n${changes.join(
                                      "\n"
                                    )}`,
                                    onConfirm: () => {
                                      setConfirmDialog((d) => ({ ...d, open: false }))
                                      
                                      // pacthOrders will handle deliveryDate conversion
                                      pacthOrders(
                                        {
                                          id: selectedOrder?.details?.orderid,
                                          ...updatedObject
                                        },
                                        selectedOrder
                                      ).then(() => {
                                        // Refresh modal data after successful edit
                                        setTimeout(() => {
                                          refreshModalData()
                                        }, 1000) // Small delay to ensure API call completes
                                      })
                                    }
                                  })
                                } else {
                                  // pacthOrders will handle deliveryDate conversion
                                  pacthOrders(
                                    {
                                      id: selectedOrder?.details?.orderid,
                                      ...updatedObject
                                    },
                                    selectedOrder
                                  ).then(() => {
                                    // Refresh modal data after successful edit
                                    setTimeout(() => {
                                      refreshModalData()
                                    }, 1000) // Small delay to ensure API call completes
                                  })
                                }
                              }}
                              disabled={!updatedObject || Object.keys(updatedObject).length === 0}
                              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "remarks" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Order Remarks</h3>

                        {selectedOrder?.details?.orderRemarks &&
                          selectedOrder?.details?.orderRemarks.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3">Existing Remarks</h4>
                              <div className="space-y-2">
                                {(selectedOrder.details.orderRemarks || []).map(
                                  (remark, remarkIndex) => (
                                    <div key={remarkIndex} className="bg-white p-3 rounded border">
                                      <div className="text-sm text-gray-700">{remark}</div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Add New Remark</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter a new remark..."
                              value={newRemark}
                              onChange={(e) => setNewRemark(e.target.value)}
                              className="flex-grow px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleAddRemark(selectedOrder.details.orderid)}
                              disabled={!newRemark.trim()}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                              Add Remark
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "dispatchTrail" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <span className="mr-2">🚚</span>
                          Dispatch Trail
                        </h3>

                        {selectedOrder?.details?.dispatchHistory &&
                        selectedOrder?.details?.dispatchHistory.length > 0 ? (
                          <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="text-sm text-gray-500 mb-1">Total Order Plants</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {selectedOrder.quantity?.toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <div className="text-sm text-blue-600 mb-1">Total Dispatched</div>
                                <div className="text-2xl font-bold text-blue-900">
                                  {(selectedOrder.quantity - selectedOrder["remaining Plants"])?.toLocaleString()}
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  in {selectedOrder.details.dispatchHistory.length} dispatch{selectedOrder.details.dispatchHistory.length > 1 ? 'es' : ''}
                                </div>
                              </div>
                              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                <div className="text-sm text-orange-600 mb-1">Remaining to Dispatch</div>
                                <div className="text-2xl font-bold text-orange-900">
                                  {selectedOrder["remaining Plants"]?.toLocaleString()}
                                </div>
                                <div className="text-xs text-orange-600 mt-1">
                                  {selectedOrder["remaining Plants"] > 0 ? "Pending dispatch" : "Fully dispatched"}
                                </div>
                              </div>
                            </div>

                            {/* Dispatch Timeline */}
                            <div className="bg-white rounded-lg border">
                              <div className="p-3 border-b bg-blue-50">
                                <h4 className="font-medium text-blue-900 text-sm">Dispatch Timeline</h4>
                              </div>
                              <div className="p-4 space-y-4">
                                {(selectedOrder.details.dispatchHistory || []).map(
                                  (dispatchItem, dispatchIndex) => (
                                    <div 
                                      key={dispatchIndex} 
                                      className="relative pl-8 pb-6 border-l-2 border-blue-300 last:border-l-0 last:pb-0">
                                      {/* Timeline dot */}
                                      <div className="absolute left-0 top-0 -ml-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white"></div>
                                      
                                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-blue-900">
                                              Dispatch #{dispatchIndex + 1}
                                            </span>
                                            <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                                              {dispatchItem.quantity?.toLocaleString()} plants
                                            </span>
                                          </div>
                                          <span className="text-xs text-gray-600">
                                            {dispatchItem.date
                                              ? moment(dispatchItem.date).format("DD MMM YYYY, HH:mm")
                                              : "N/A"}
                                          </span>
                                        </div>

                                        {/* Dispatch Details */}
                                        {dispatchItem.dispatch && (
                                          <div className="bg-white p-3 rounded border border-blue-100 mb-3">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                              <div>
                                                <span className="text-gray-500">Transport ID:</span>
                                                <div className="font-medium text-gray-900">
                                                  #{dispatchItem.dispatch.transportId}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Driver:</span>
                                                <div className="font-medium text-gray-900">
                                                  {dispatchItem.dispatch.driverName}
                                                </div>
                                              </div>
                                              <div>
                                                <span className="text-gray-500">Vehicle:</span>
                                                <div className="font-medium text-gray-900">
                                                  {dispatchItem.dispatch.vehicleName}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Quantity Details */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                          <div className="bg-white p-2 rounded border border-gray-200">
                                            <span className="text-gray-500">Dispatched Quantity:</span>
                                            <div className="font-bold text-blue-600">
                                              {dispatchItem.quantity?.toLocaleString()} plants
                                            </div>
                                          </div>
                                          <div className="bg-white p-2 rounded border border-gray-200">
                                            <span className="text-gray-500">Remaining After:</span>
                                            <div className="font-bold text-orange-600">
                                              {dispatchItem.remainingAfterDispatch?.toLocaleString()} plants
                                            </div>
                                          </div>
                                        </div>

                                        {/* Processed By */}
                                        {dispatchItem.processedBy && (
                                          <div className="mt-3 pt-3 border-t border-blue-100">
                                            <div className="text-xs text-gray-600">
                                              <span className="font-medium">Processed by:</span>{" "}
                                              {dispatchItem.processedBy.name}
                                              {dispatchItem.processedBy.phoneNumber && 
                                                ` • ${dispatchItem.processedBy.phoneNumber}`}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                            <div className="text-gray-400 text-4xl mb-3">📦</div>
                            <h4 className="text-lg font-medium text-gray-700 mb-2">No Dispatch History</h4>
                            <p className="text-gray-500 text-sm">
                              This order has not been dispatched yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "editHistory" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          <span className="mr-2">📝</span>
                          Order Edit History
                        </h3>

                        {selectedOrder?.details?.orderEditHistory &&
                        selectedOrder?.details?.orderEditHistory.length > 0 ? (
                          <>
                            {/* Summary Card */}
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                              <div className="text-sm text-purple-600 mb-1">Total Edits Made</div>
                              <div className="text-2xl font-bold text-purple-900">
                                {selectedOrder.details.orderEditHistory.length}
                              </div>
                              <div className="text-xs text-purple-600 mt-1">
                                Changes to rate, quantity, and delivery date
                              </div>
                            </div>

                            {/* Edit Timeline */}
                            <div className="bg-white rounded-lg border">
                              <div className="p-3 border-b bg-purple-50">
                                <h4 className="font-medium text-purple-900 text-sm">Edit Timeline</h4>
                              </div>
                              <div className="p-4 space-y-4">
                                {(selectedOrder.details.orderEditHistory || []).map(
                                  (edit, editIndex) => {
                                    // Format the field name for display
                                    const fieldDisplayName = {
                                      rate: "Rate per Plant",
                                      numberOfPlants: "Quantity",
                                      deliveryDate: "Delivery Date"
                                    }[edit.field] || edit.field;

                                    // Format values based on field type
                                    let previousValueDisplay = edit.previousValue;
                                    let newValueDisplay = edit.newValue;

                                    if (edit.field === "rate") {
                                      previousValueDisplay = `₹${edit.previousValue}`;
                                      newValueDisplay = `₹${edit.newValue}`;
                                    } else if (edit.field === "numberOfPlants") {
                                      previousValueDisplay = `${edit.previousValue} plants`;
                                      newValueDisplay = `${edit.newValue} plants`;
                                    } else if (edit.field === "deliveryDate") {
                                      previousValueDisplay = edit.previousValue 
                                        ? moment(edit.previousValue).format("DD MMM YYYY")
                                        : "Not set";
                                      newValueDisplay = moment(edit.newValue).format("DD MMM YYYY");
                                    }

                                    return (
                                      <div 
                                        key={editIndex} 
                                        className="relative pl-8 pb-6 border-l-2 border-purple-300 last:border-l-0 last:pb-0">
                                        {/* Timeline dot */}
                                        <div className="absolute left-0 top-0 -ml-2 w-4 h-4 bg-purple-600 rounded-full border-2 border-white"></div>
                                        
                                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-semibold text-purple-900">
                                                {fieldDisplayName} Changed
                                              </span>
                                              <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-medium">
                                                Edit #{editIndex + 1}
                                              </span>
                                            </div>
                                            <span className="text-xs text-gray-600">
                                              {edit.createdAt
                                                ? moment(edit.createdAt).format("DD MMM YYYY, HH:mm")
                                                : "N/A"}
                                            </span>
                                          </div>

                                          {/* Change Details */}
                                          <div className="bg-white p-3 rounded border border-purple-100 mb-3">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                              <div className="bg-red-50 px-3 py-2 rounded-md">
                                                <div className="text-xs text-red-600 mb-1">Previous Value</div>
                                                <span className="text-red-700 line-through text-sm font-medium">
                                                  {previousValueDisplay}
                                                </span>
                                              </div>
                                              <div className="flex justify-center">
                                                <span className="text-gray-400 text-xl">→</span>
                                              </div>
                                              <div className="bg-green-50 px-3 py-2 rounded-md">
                                                <div className="text-xs text-green-600 mb-1">New Value</div>
                                                <span className="text-green-700 font-bold text-sm">
                                                  {newValueDisplay}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Notes */}
                                          {edit.notes && (
                                            <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 mb-3">
                                              <span className="font-medium">Notes:</span> {edit.notes}
                                            </div>
                                          )}

                                          {/* Changed By */}
                                          {edit.changedBy && (
                                            <div className="pt-3 border-t border-purple-100">
                                              <div className="text-xs text-gray-600">
                                                <span className="font-medium">Changed by:</span>{" "}
                                                {edit.changedBy.name || "Unknown User"}
                                                {edit.changedBy.phoneNumber && 
                                                  ` • ${edit.changedBy.phoneNumber}`}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                            <div className="text-gray-400 text-4xl mb-3">📝</div>
                            <h4 className="text-lg font-medium text-gray-700 mb-2">No Edit History</h4>
                            <p className="text-gray-500 text-sm">
                              This order has not been edited yet.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  )
}

export default FarmerOrdersTable
