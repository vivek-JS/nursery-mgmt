import React, { useState, useEffect, useRef } from "react"
import { Edit2Icon, CheckIcon, XIcon, RefreshCw, Search, ChevronDown, X } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader, ExcelExport } from "components"
import moment from "moment"
import debounce from "lodash.debounce"
import {
  MenuItem,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import DownloadPDFButton from "./OrdereRecipt"
import DispatchForm from "./DispatchedForm"
import DispatchList from "./DispatchedList"
import AddAgriSalesOrderForm from "../inventory/AddAgriSalesOrderForm"
import { Toast } from "helpers/toasts/toastHelper"
import { faHourglassEmpty } from "@fortawesome/free-solid-svg-icons"
import { FaUser, FaCreditCard, FaEdit, FaFileAlt } from "react-icons/fa"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import {
  useCanAddPayment,
  useIsOfficeAdmin,
  useIsDealer,
  useDealerWallet,
  useDealerWalletById,
  useUserData,
  useIsDispatchManager
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
    border-color: #0f766e;
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
    transform: translateY(-1px);
  }

  .enhanced-select:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
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
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
    transform: translateY(-1px);
  }

  .mui-select-enhanced .MuiOutlinedInput-root.Mui-focused {
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
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
    background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
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
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
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

  .status-assigned {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
    border-color: #a855f7;
    color: #6b21a8;
  }

  .status-rejected {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border-color: #ef4444;
    color: #991b1b;
  }

  .status-dispatched {
    background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
    border-color: #0f766e;
    color: #0f766e;
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

  .status-temporary-cancelled {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border-color: #f97316;
    color: #9a3412;
  }

  /* Order For highlighting */
  .order-for-highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    animation: orderForGlow 2s ease-in-out infinite;
    padding: 2px 8px;
  }

  @keyframes orderForGlow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
    }
    50% {
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.6), 0 0 25px rgba(245, 158, 11, 0.3);
    }
  }

  /* Farmer Name highlighting */
  .farmer-name-highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
    animation: farmerNameGlow 2s ease-in-out infinite;
    padding: 2px 8px;
  }

  @keyframes farmerNameGlow {
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
    padding: 4px 10px;
    min-height: 28px;
    font-size: 11px;
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
  options = [],
  placeholder = "Select an option",
  showCount = false,
  maxHeight = "500px",
  isStatusDropdown = false,
  disabled = false
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
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return
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
          if (disabled) return
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
  const [showAgriSalesOrders, setShowAgriSalesOrders] = useState(true) // Ram Agri Inputs only (no regular orders)
  const [showAddAgriSalesOrderForm, setShowAddAgriSalesOrderForm] = useState(false) // Dialog for adding Agri Sales order
  const [agriSalesPendingCount, setAgriSalesPendingCount] = useState(0) // Pending payments count for badge
  const [agriStatusCounts, setAgriStatusCounts] = useState({
    ALL: 0,
    PENDING: 0,
    ACCEPTED: 0,
    ASSIGNED: 0,
    DISPATCHED: 0,
    COMPLETED: 0,
    OUTSTANDING: 0
  }) // Counts for each status tab (consistent with API)
  
  // Ram Agri Inputs Dispatch State
  const [selectedAgriSalesOrders, setSelectedAgriSalesOrders] = useState([]) // Selected orders for dispatch
  const [showAgriDispatchModal, setShowAgriDispatchModal] = useState(false) // Dispatch modal
  const [agriDispatchForm, setAgriDispatchForm] = useState({
    dispatchMode: "VEHICLE", // VEHICLE or COURIER
    vehicleId: "",
    vehicleNumber: "",
    driverName: "",
    driverMobile: "",
    // Courier fields
    courierName: "",
    courierTrackingId: "",
    courierContact: "",
    dispatchNotes: "",
  })
  const [agriDispatchLoading, setAgriDispatchLoading] = useState(false)
  const [agriVehicles, setAgriVehicles] = useState([])
  const [ramAgriSalesUsers, setRamAgriSalesUsers] = useState([]) // Ram Agri Inputs users for "Dispatched By" filter
  const [selectedDispatchedBy, setSelectedDispatchedBy] = useState("") // Filter by who dispatched
  const [hidePaymentDetails, setHidePaymentDetails] = useState(false) // Toggle to hide payment details
  const [agriDispatchStatusFilter, setAgriDispatchStatusFilter] = useState("ALL") // Filter by order status: ALL, PENDING, ACCEPTED, ASSIGNED, DISPATCHED, COMPLETED, OUTSTANDING
  // Outstanding orders pagination
  const [outstandingPage, setOutstandingPage] = useState(1)
  const [outstandingTotal, setOutstandingTotal] = useState(0)
  const outstandingPerPage = 20
  // Complete order state (for marking dispatched orders as delivered)
  const [selectedAgriOrdersForComplete, setSelectedAgriOrdersForComplete] = useState([])
  const [showAgriCompleteModal, setShowAgriCompleteModal] = useState(false)
  const [agriCompleteForm, setAgriCompleteForm] = useState({
    returnQuantities: {}, // { orderId: returnQty }
    returnReason: "",
    returnNotes: "",
  })
  const [agriCompleteLoading, setAgriCompleteLoading] = useState(false)
  // Assignment state (Admin assigns to sales person)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignToUser, setAssignToUser] = useState("")
  const [assignmentNotes, setAssignmentNotes] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)

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
  const isDispatchManager = useIsDispatchManager()
  const { walletData, loading: walletLoading } = useDealerWallet()
  const user = useUserData() // Get current user data

  const resolvePlantCounts = React.useCallback((order) => {
    if (!order) {
      return { base: 0, additional: 0, total: 0 }
    }

    const base =
      order.basePlants ??
      order?.details?.numberOfPlants ??
      order.quantity ??
      order?.details?.totalPlants ??
      0

    const additional =
      order.additionalPlants ?? order?.details?.additionalPlants ?? 0

    const total =
      order.totalPlants ??
      order?.details?.totalPlants ??
      base + additional

    return { base, additional, total }
  }, [])

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


  // Filter states
  const [selectedSalesPerson, setSelectedSalesPerson] = useState("")
  const [selectedVillage, setSelectedVillage] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("")
const [selectedPlant, setSelectedPlant] = useState("")
const [selectedSubtype, setSelectedSubtype] = useState("")
const [plants, setPlants] = useState([])
const [subtypes, setSubtypes] = useState([])
const [subtypesLoading, setSubtypesLoading] = useState(false)

  // Filter options
  const [salesPeople, setSalesPeople] = useState([])
  const [villages, setVillages] = useState([])
  const [districts, setDistricts] = useState([])

  const orderStatusOptions = [
    { label: "Pending", value: "PENDING" },
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Dispatched", value: "DISPATCHED" },
    { label: "Completed", value: "COMPLETED" }
  ]


  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [updatedObject, setUpdatedObject] = useState(null)
  const [viewMode, setViewMode] = useState("booking")
  const [viewType, setViewType] = useState("table") // "table" or "grid"
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isDispatchtab, setisDispatchtab] = useState(false)
  const [newRemark, setNewRemark] = useState("")
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [expandedAddPaymentAccordion, setExpandedAddPaymentAccordion] = useState(false)
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false)
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

  const selectedOrderCounts = React.useMemo(
    () => resolvePlantCounts(selectedOrder),
    [resolvePlantCounts, selectedOrder]
  )
  const [activeTab, setActiveTab] = useState("overview")
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  })
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

    // Check if this is an Agri Sales order
    const isAgriSalesOrder = selectedOrder?.isAgriSalesOrder || orders.find(o => o.details?.orderid === orderId)?.isAgriSalesOrder

    // For Agri Sales orders, wallet payment is not available (simpler flow)
    if (isAgriSalesOrder && newPayment.isWalletPayment) {
      Toast.error("Wallet payment is not available for Agri Sales orders")
      return
    }

    // Only require modeOfPayment if not using wallet payment
    if (!newPayment.isWalletPayment && !newPayment.modeOfPayment) {
      Toast.error("Please select payment mode")
      return
    }

    // Validate image requirement for non-Cash payments (except NEFT/RTGS)
    if (newPayment.paidAmount && newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS") {
      if (!newPayment.receiptPhoto || newPayment.receiptPhoto.length === 0) {
        Toast.error(`Payment image is mandatory for ${newPayment.modeOfPayment} payments`)
        return
      }
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
      // Handle Agri Sales orders differently
      if (isAgriSalesOrder) {
        const instance = NetworkManager(API.INVENTORY.ADD_AGRI_SALES_ORDER_PAYMENT)
        const payload = {
          paidAmount: newPayment.paidAmount,
          paymentDate: newPayment.paymentDate,
          modeOfPayment: newPayment.isWalletPayment ? "Wallet" : newPayment.modeOfPayment,
          bankName: newPayment.bankName || "",
          receiptPhoto: newPayment.receiptPhoto || [],
          remark: newPayment.remark || "",
          isWalletPayment: false, // Agri Sales orders don't support wallet payments
          paymentStatus: "PENDING",
        }

        const response = await instance.request(payload, [`${orderId}/payment`])
        
        if (response?.data) {
          Toast.success("Payment added successfully")
          setShowPaymentForm(false)
          setExpandedAddPaymentAccordion(false)
          resetPaymentForm(false)
          
          // Refresh orders
          await getOrders()
          refreshComponent()
          
          // Update selected order if modal is open
          if (selectedOrder) {
            setTimeout(() => {
              refreshModalData()
            }, 500)
          }
        } else {
          Toast.error("Failed to add payment")
        }
        setLoading(false)
        return
      }

      // Handle regular orders (existing flow)
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
        setExpandedAddPaymentAccordion(false)
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

          // When dealer or sales is logged in, filter by their id
          const isDealerOrSalesRefresh = user?.jobTitle === "DEALER" || user?.jobTitle === "SALES"
          if (isDealerOrSalesRefresh && (user?._id || user?.id)) {
            params.salesPerson = user._id || user.id
          } else if (selectedSalesPerson) {
            params.salesPerson = selectedSalesPerson
          }
          if (selectedVillage) {
            params.village = selectedVillage
          }
          if (selectedDistrict) {
            params.district = selectedDistrict
          }
  if (selectedPlant) {
    params.plantId = selectedPlant
  }
  if (selectedSubtype) {
    params.subtypeId = selectedSubtype
  }
          if (selectedPlant) {
            params.plantId = selectedPlant
          }
          if (selectedSubtype) {
            params.subtypeId = selectedSubtype
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
                additionalPlants = 0,
                totalPlants,
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
              const basePlants = numberOfPlants || 0
              const extraPlants = additionalPlants || 0
              const totalPlantCount =
                typeof totalPlants === "number" ? totalPlants : basePlants + extraPlants
              const remainingPlantCount =
                typeof remainingPlants === "number" ? remainingPlants : totalPlantCount
              const totalOrderAmount = Number(rate * totalPlantCount)
              const latestSlot = mapSlotForUi(bookingSlot)
              const { startDay, endDay } = latestSlot || {}
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
                quantity: basePlants,
                totalPlants: totalPlantCount,
                additionalPlants: extraPlants,
                basePlants,
                orderDate: moment(orderBookingDate || createdAt).format("DD MMM YYYY"),
                deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YYYY") : "-", // Specific delivery date
                rate,
                total: `₹ ${Number(totalOrderAmount).toFixed(2)}`,
                "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment)).toFixed(2)}`,
                "remaining Amt": `₹ ${(totalOrderAmount - Number(getTotalPaidAmount(payment))).toFixed(2)}`,
                "remaining Plants": remainingPlantCount,
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
                bookingSlot: latestSlot,
                slotHistory: Array.isArray(bookingSlot)
                  ? bookingSlot.filter(Boolean)
                  : bookingSlot
                  ? [bookingSlot]
                  : [],
                rate: rate,
                numberOfPlants: basePlants,
                additionalPlants: extraPlants,
                totalPlants: totalPlantCount,
                remainingPlants: remainingPlantCount,
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
    if (showAgriSalesOrders) {
      fetchAgriStatusCounts()
    }
  }, [
    debouncedSearchTerm,
    refresh,
    startDate,
    endDate,
    viewMode,
    selectedSalesPerson,
    selectedVillage,
    selectedDistrict,
    selectedPlant,
    selectedSubtype,
    showAgriSalesOrders, // Reload when switching between regular and Agri Sales orders
    selectedDispatchedBy, // Filter by who dispatched (Ram Agri Inputs)
    agriDispatchStatusFilter, // Reload when status filter tab changes (Ram Agri Inputs)
    outstandingPage // Reload when outstanding page changes
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

useEffect(() => {
  if (!selectedPlant) {
    setSubtypes([])
    setSelectedSubtype("")
    return
  }
  loadSubtypeOptions(selectedPlant)
}, [selectedPlant])

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
      const { base } = resolvePlantCounts(selectedOrder)
      setUpdatedObject({
        rate: selectedOrder.rate,
        quantity: base,
        bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
        deliveryDate: selectedOrder?.details?.deliveryDate 
          ? new Date(selectedOrder.details.deliveryDate) 
          : null
      })
    }
  }, [activeTab, selectedOrder, resolvePlantCounts])

const loadPlantOptions = async () => {
  try {
    const instance = NetworkManager(API.slots.GET_PLANTS)
    const response = await instance.request()
    const rawPlants = response?.data || response?.data?.data || []

    const formattedPlants = (rawPlants || [])
      .map((plant) => {
        const id = plant.plantId || plant._id || plant.id || ""
        return {
          label: plant.name,
          value: id ? String(id) : "",
          sowingAllowed: plant.sowingAllowed || false // Track if sowing is allowed (same as AddOrderForm)
        }
      })
      .filter((plant) => plant.value)

    setPlants(formattedPlants)
  } catch (error) {
    console.error("Error loading plants:", error)
    setPlants([])
  }
}

const loadSubtypeOptions = async (plantId) => {
  if (!plantId) {
    setSubtypes([])
    return
  }

  setSubtypesLoading(true)
  try {
    const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
    const response = await instance.request(null, {
      plantId,
      year: currentYear
    })

    const rawSubtypes = response?.data?.subtypes || []
    const formattedSubtypes = rawSubtypes
      .map((subtype) => {
        const id = subtype.subtypeId || subtype._id || ""
        return {
          label: subtype.subtypeName || subtype.name,
          value: id ? String(id) : ""
        }
      })
      .filter((subtype) => subtype.value)

    setSubtypes(formattedSubtypes)
  } catch (error) {
    console.error("Error loading subtypes:", error)
    setSubtypes([])
  } finally {
    setSubtypesLoading(false)
  }
}

const loadFilterOptions = async () => {
    try {
    await loadPlantOptions()
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

  // Load Ram Agri Inputs users for "Dispatched By" filter
  const loadRamAgriSalesUsers = async () => {
    try {
      const instance = NetworkManager(API.USER.GET_USERS)
      const response = await instance.request(null, { jobTitle: "RAM_AGRI_SALES" })
      if (response?.data?.data) {
        const users = response.data.data.map((user) => ({
          label: user.name,
          value: user._id,
          phoneNumber: user.phoneNumber,
        }))
        setRamAgriSalesUsers(users)
      }
    } catch (error) {
      console.error("Error loading Ram Agri Inputs users:", error)
    }
  }

  // Fetch vehicles for dispatch
  const fetchAgriVehicles = async () => {
    try {
      const instance = NetworkManager(API.VEHICLE.GET_ACTIVE_VEHICLES)
      const response = await instance.request()
      // Ensure we always set an array
      const vehiclesData = response?.data?.data || response?.data || []
      setAgriVehicles(Array.isArray(vehiclesData) ? vehiclesData : [])
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      setAgriVehicles([]) // Reset to empty array on error
    }
  }

  // Handle vehicle selection for dispatch
  const handleAgriVehicleSelect = (vehicleId) => {
    const vehiclesArray = Array.isArray(agriVehicles) ? agriVehicles : []
    const vehicle = vehiclesArray.find((v) => v._id === vehicleId || v.id === vehicleId)
    if (vehicle) {
      setAgriDispatchForm((prev) => ({
        ...prev,
        vehicleId: vehicleId,
        vehicleNumber: vehicle.number || "",
        driverName: vehicle.driverName || prev.driverName,
        driverMobile: vehicle.driverMobile || prev.driverMobile,
      }))
    } else {
      setAgriDispatchForm((prev) => ({
        ...prev,
        vehicleId: vehicleId,
      }))
    }
  }

  // Toggle order selection for dispatch
  const toggleAgriOrderSelection = (orderId) => {
    setSelectedAgriSalesOrders((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId)
      } else {
        return [...prev, orderId]
      }
    })
  }

  // Select all dispatchable orders (ACCEPTED orders that can be dispatched or assigned)
  const selectAllAgriOrders = () => {
    const dispatchableOrders = orders.filter(
      (order) =>
        order.isAgriSalesOrder &&
        order.orderStatus === "ACCEPTED" // Only ACCEPTED orders can be dispatched/assigned
    )
    setSelectedAgriSalesOrders(dispatchableOrders.map((o) => o.details.orderid))
  }

  // Clear all selections
  const clearAgriOrderSelections = () => {
    setSelectedAgriSalesOrders([])
  }

  // Open dispatch modal
  const openAgriDispatchModal = () => {
    if (selectedAgriSalesOrders.length === 0) {
      Toast.error("Please select at least one order to dispatch")
      return
    }
    fetchAgriVehicles()
    setShowAgriDispatchModal(true)
  }

  // Handle dispatch submission
  const handleAgriDispatch = async () => {
    // Validate based on dispatch mode
    if (agriDispatchForm.dispatchMode === "VEHICLE") {
      if (!agriDispatchForm.driverName || !agriDispatchForm.driverMobile) {
        Toast.error("Driver name and mobile are required")
        return
      }
      if (!agriDispatchForm.vehicleNumber && !agriDispatchForm.vehicleId) {
        Toast.error("Please select a vehicle or enter vehicle number")
        return
      }
      if (agriDispatchForm.driverMobile.length !== 10) {
        Toast.error("Driver mobile must be 10 digits")
        return
      }
    } else if (agriDispatchForm.dispatchMode === "COURIER") {
      if (!agriDispatchForm.courierName) {
        Toast.error("Courier service name is required")
        return
      }
    }

    try {
      setAgriDispatchLoading(true)
      const instance = NetworkManager(API.INVENTORY.DISPATCH_AGRI_SALES_ORDERS)
      
      const payload = {
        orderIds: selectedAgriSalesOrders,
        dispatchMode: agriDispatchForm.dispatchMode,
        dispatchNotes: agriDispatchForm.dispatchNotes || "",
      }

      // Add mode-specific fields
      if (agriDispatchForm.dispatchMode === "VEHICLE") {
        payload.vehicleId = agriDispatchForm.vehicleId || null
        payload.vehicleNumber = agriDispatchForm.vehicleNumber
        payload.driverName = agriDispatchForm.driverName
        payload.driverMobile = agriDispatchForm.driverMobile
      } else if (agriDispatchForm.dispatchMode === "COURIER") {
        payload.courierName = agriDispatchForm.courierName
        payload.courierTrackingId = agriDispatchForm.courierTrackingId || ""
        payload.courierContact = agriDispatchForm.courierContact || ""
      }

      const response = await instance.request(payload)

      if (response?.data) {
        Toast.success(`${selectedAgriSalesOrders.length} order(s) dispatched successfully via ${agriDispatchForm.dispatchMode === "VEHICLE" ? "vehicle" : "courier"}`)
        setShowAgriDispatchModal(false)
        setSelectedAgriSalesOrders([])
        setAgriDispatchForm({
          dispatchMode: "VEHICLE",
          vehicleId: "",
          vehicleNumber: "",
          driverName: "",
          driverMobile: "",
          courierName: "",
          courierTrackingId: "",
          courierContact: "",
          dispatchNotes: "",
        })
        getOrders()
        fetchAgriStatusCounts() // Refresh counts after dispatch
      } else {
        Toast.error("Failed to dispatch orders")
      }
    } catch (error) {
      console.error("Error dispatching orders:", error)
      Toast.error(error?.response?.data?.message || "Failed to dispatch orders")
    } finally {
      setAgriDispatchLoading(false)
    }
  }

  // ==================== COMPLETE ORDER HANDLERS ====================
  
  // Toggle order selection for complete
  const toggleAgriCompleteOrderSelection = (orderId) => {
    setSelectedAgriOrdersForComplete((prev) => {
      if (prev.includes(orderId)) {
        // Remove from selection and clear return quantity
        const newReturnQuantities = { ...agriCompleteForm.returnQuantities }
        delete newReturnQuantities[orderId]
        setAgriCompleteForm((f) => ({ ...f, returnQuantities: newReturnQuantities }))
        return prev.filter((id) => id !== orderId)
      } else {
        return [...prev, orderId]
      }
    })
  }

  // Select all dispatched orders for complete
  const selectAllDispatchedOrders = () => {
    const dispatchedOrders = orders.filter(
      (o) => o.orderStatus === "DISPATCHED" || o.details?.dispatchStatus === "DISPATCHED"
    )
    setSelectedAgriOrdersForComplete(dispatchedOrders.map((o) => o.details?.orderid || o.id || o._id))
  }

  // Clear complete selections
  const clearAgriCompleteSelections = () => {
    setSelectedAgriOrdersForComplete([])
    setAgriCompleteForm({
      returnQuantities: {},
      returnReason: "",
      returnNotes: "",
    })
  }

  // Open complete modal
  const openAgriCompleteModal = () => {
    if (selectedAgriOrdersForComplete.length === 0) {
      Toast.error("Please select at least one dispatched order to complete")
      return
    }
    // Initialize return quantities to 0 for all selected orders
    const initialReturnQty = {}
    selectedAgriOrdersForComplete.forEach((id) => {
      initialReturnQty[id] = 0
    })
    setAgriCompleteForm({
      returnQuantities: initialReturnQty,
      returnReason: "",
      returnNotes: "",
    })
    setShowAgriCompleteModal(true)
  }

  // Handle complete order submission
  const handleAgriCompleteOrders = async () => {
    try {
      setAgriCompleteLoading(true)
      const instance = NetworkManager(API.INVENTORY.COMPLETE_AGRI_SALES_ORDERS)
      const payload = {
        orderIds: selectedAgriOrdersForComplete,
        returnQuantities: agriCompleteForm.returnQuantities,
        returnReason: agriCompleteForm.returnReason || "",
        returnNotes: agriCompleteForm.returnNotes || "",
      }

      const response = await instance.request(payload)

      if (response?.data) {
        const totalReturns = Object.values(agriCompleteForm.returnQuantities).filter((q) => q > 0).length
        Toast.success(
          `${selectedAgriOrdersForComplete.length} order(s) completed${totalReturns > 0 ? ` (${totalReturns} with returns)` : ""}`
        )
        setShowAgriCompleteModal(false)
        setSelectedAgriOrdersForComplete([])
        setAgriCompleteForm({
          returnQuantities: {},
          returnReason: "",
          returnNotes: "",
        })
        getOrders()
        fetchAgriStatusCounts() // Refresh counts after complete
      } else {
        Toast.error("Failed to complete orders")
      }
    } catch (error) {
      console.error("Error completing orders:", error)
      Toast.error(error?.response?.data?.message || "Failed to complete orders")
    } finally {
      setAgriCompleteLoading(false)
    }
  }

  // ==================== ASSIGNMENT HANDLERS ====================
  
  // Open assign modal
  const openAssignModal = () => {
    if (selectedAgriSalesOrders.length === 0) {
      Toast.error("Please select at least one order to assign")
      return
    }
    setShowAssignModal(true)
  }

  // Handle assign to sales person
  const handleAssignToSalesPerson = async () => {
    if (!assignToUser) {
      Toast.error("Please select a sales person")
      return
    }

    try {
      setAssignLoading(true)
      const instance = NetworkManager(API.INVENTORY.ASSIGN_AGRI_SALES_ORDERS)
      const payload = {
        orderIds: selectedAgriSalesOrders,
        assignToUserId: assignToUser,
        assignmentNotes: assignmentNotes || "",
      }

      const response = await instance.request(payload)

      if (response?.data) {
        Toast.success(response.message || `${selectedAgriSalesOrders.length} order(s) assigned successfully`)
        setShowAssignModal(false)
        setSelectedAgriSalesOrders([])
        setAssignToUser("")
        setAssignmentNotes("")
        getOrders()
        fetchAgriStatusCounts() // Refresh counts after assign
      } else {
        Toast.error("Failed to assign orders")
      }
    } catch (error) {
      console.error("Error assigning orders:", error)
      Toast.error(error?.response?.data?.message || "Failed to assign orders")
    } finally {
      setAssignLoading(false)
    }
  }

  // Load Ram Agri Inputs users when component mounts or when showing Agri Sales orders
  useEffect(() => {
    if (showAgriSalesOrders) {
      loadRamAgriSalesUsers()
    }
  }, [showAgriSalesOrders])

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
  const paymentSummary = React.useMemo(() => {
    if (!selectedOrder) return { total: 0, paid: 0, balance: 0 }
    const total = (selectedOrder?.rate || 0) * (selectedOrderCounts?.total || 0)
    const paid = getTotalPaidAmount(selectedOrder?.details?.payment || [])
    return { total, paid, balance: Math.max(0, total - paid) }
  }, [selectedOrder, selectedOrderCounts])

const currentYear = new Date().getFullYear()

const getLatestSlot = (slotData) => {
  if (!slotData) return null
  if (Array.isArray(slotData)) {
    const filtered = slotData.filter(Boolean)
    if (!filtered.length) return null
    return filtered[filtered.length - 1]
  }
  return slotData
}

const mapSlotForUi = (slotData) => {
  const latestSlot = getLatestSlot(slotData)
  if (!latestSlot) return null
  const slotId =
    latestSlot.slotId ||
    latestSlot.id ||
    latestSlot._id ||
    latestSlot.value ||
    latestSlot.slot_id ||
    latestSlot.slotID
  return { ...latestSlot, slotId }
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
      // Use fast simple slots endpoint (same as AddOrderForm)
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS)
      const years = [2025, 2026]
      
      // Fetch slots for both years in parallel
      const responses = await Promise.all(
        years.map(year => instance.request({}, { plantId, subtypeId, year }))
      )

      // Combine slots from both years
      let allSlotsData = []
      
      responses.forEach((response) => {
        const rawSlots =
          response?.data?.data?.slots ||
          response?.data?.slots ||
          response?.data?.data ||
          []

        const slotsData = Array.isArray(rawSlots)
          ? rawSlots
          : Array.isArray(rawSlots?.slots)
          ? rawSlots.slots
          : []

        allSlotsData = [...allSlotsData, ...slotsData]
      })

      if (allSlotsData.length > 0) {
        // Check if this plant has sowing allowed
        const selectedPlant = plants.find((p) => p.value === plantId)
        const isSowingAllowedPlant = selectedPlant?.sowingAllowed || false

        const processedSlots = allSlotsData
          .map((slot) => {
            const {
              startDay,
              endDay,
              month,
              totalBookedPlants,
              totalPlants,
              status,
              _id,
              availablePlants
            } = slot || {}

            if (!startDay || !endDay) return null

            // Validate date format
            const startDateValid = moment(startDay, "DD-MM-YYYY", true).isValid()
            const endDateValid = moment(endDay, "DD-MM-YYYY", true).isValid()

            if (!startDateValid || !endDateValid) return null

            const start = moment(startDay, "DD-MM-YYYY").format("D")
            const end = moment(endDay, "DD-MM-YYYY").format("D")
            const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")

            // Calculate available plants (can be negative for sowing-allowed plants)
            const available = availablePlants !== undefined ? availablePlants : totalPlants - (totalBookedPlants || 0)

            return {
              label: `${start} - ${end} ${monthYear} (${available} available)`,
              value: _id,
              available: available,
              availableQuantity: available, // Keep for compatibility
              totalPlants: totalPlants,
              totalBookedPlants: totalBookedPlants || 0,
              startDay: startDay,
              endDay: endDay
            }
          })
          .filter((slot) => {
            // For sowing-allowed plants, show all slots (even with negative availability)
            // For regular plants, only show slots with positive availability
            return slot !== null && (isSowingAllowedPlant || slot.available > 0)
          })

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

  // Function to fetch counts for all statuses (without status filter)
  const fetchAgriStatusCounts = async () => {
    if (!showAgriSalesOrders) return
    
    try {
      // Fetch all orders for status counts (except outstanding)
      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)
      const params = {
        search: debouncedSearchTerm,
        limit: 10000,
        page: 1,
      }

      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD")
        params.endDate = moment(endDate).format("YYYY-MM-DD")
      }

      // Don't apply status filter - fetch all orders to calculate counts
      if (selectedSalesPerson) {
        params.createdBy = selectedSalesPerson
      }

      const response = await instance.request({}, params)
      const ordersData = response?.data?.data?.data || response?.data?.data || []

      // Fetch outstanding count from outstanding API (backend filters for COMPLETED + outstanding)
      let outstandingCount = 0
      try {
        const outstandingInstance = NetworkManager(API.INVENTORY.GET_OUTSTANDING_AGRI_SALES_ORDERS)
        const outstandingParams = {
          search: debouncedSearchTerm,
          limit: 1, // Just need the total count
          page: 1,
        }
        if (selectedSalesPerson) {
          outstandingParams.createdBy = selectedSalesPerson
        }
        const outstandingResponse = await outstandingInstance.request({}, outstandingParams)
        outstandingCount = outstandingResponse?.data?.data?.total || outstandingResponse?.data?.data?.pagination?.total || 0
      } catch (error) {
        console.error("Error fetching outstanding count:", error)
      }

      // Calculate counts for each status
      const counts = {
        ALL: ordersData.length,
        PENDING: ordersData.filter(o => o.orderStatus === "PENDING").length,
        ACCEPTED: ordersData.filter(o => o.orderStatus === "ACCEPTED").length,
        ASSIGNED: ordersData.filter(o => o.orderStatus === "ASSIGNED").length,
        DISPATCHED: ordersData.filter(o => o.orderStatus === "DISPATCHED" || o.dispatchStatus === "DISPATCHED").length,
        COMPLETED: ordersData.filter(o => o.orderStatus === "COMPLETED" || o.dispatchStatus === "DELIVERED").length,
        OUTSTANDING: outstandingCount // Use backend-filtered count
      }

      setAgriStatusCounts(counts)
    } catch (error) {
      console.error("Error fetching status counts:", error)
    }
  }

  const getOrders = async () => {
    setLoading(true)

    // If showing Agri Sales orders, use different endpoint
    if (showAgriSalesOrders) {
      try {
        const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)
        
        // Handle outstanding separately - use new outstanding API endpoint
        let params = {}
        
        if (agriDispatchStatusFilter === "OUTSTANDING") {
          // Use new outstanding endpoint
          const instance = NetworkManager(API.INVENTORY.GET_OUTSTANDING_AGRI_SALES_ORDERS)
          params = {
            search: debouncedSearchTerm || "",
            page: outstandingPage,
            limit: outstandingPerPage,
            sortBy: "balanceAmount",
            sortOrder: "desc"
          }
          
          if (selectedSalesPerson) {
            params.createdBy = selectedSalesPerson
          }

          const response = await instance.request({}, params)
          // Handle response structure: { status: "Success", data: { data: [...], total: X, pagination: {...} } }
          // NetworkManager wraps response in response.data, so: response.data = { status: "Success", message: "...", data: { data: [...], total: X } }
          // So: response.data.data = { data: [...], total: 173, pagination: {...} }
          // And: response.data.data.data = array of orders
          const responseData = response?.data?.data || {}
          const ordersData = Array.isArray(responseData?.data) ? responseData.data : []
          const totalCount = responseData?.total || responseData?.pagination?.total || 0
          
          console.log("Outstanding API Response Debug:", {
            fullResponse: response,
            responseData,
            ordersDataLength: ordersData.length,
            totalCount,
            firstOrder: ordersData[0]
          })
          
          if (!ordersData || ordersData.length === 0) {
            console.warn("No orders found in outstanding API response")
            setOrders([])
            setOutstandingTotal(0)
            setLoading(false)
            return
          }
          
          setOutstandingTotal(totalCount)
          
          // Transform Agri Sales orders to match the expected format
          const transformedOrders = ordersData.map((order) => {
            const {
              orderNumber,
              customerName,
              customerMobile,
              customerVillage,
              customerTaluka,
              customerDistrict,
              productName,
              quantity,
              unit,
              rate,
              totalAmount,
              orderStatus,
              payment,
              totalPaidAmount,
              balanceAmount,
              orderDate,
              deliveryDate,
              createdAt,
              notes,
              createdBy,
              productId,
              _id,
              dispatchStatus,
              dispatchMode,
              vehicleNumber,
              driverName,
              driverMobile,
              dispatchedAt,
              dispatchedBy,
              dispatchNotes,
              courierName,
              courierTrackingId,
              courierContact,
              assignedTo,
              assignedAt,
              assignedBy,
              assignmentNotes,
              returnQuantity,
              deliveredQuantity,
              returnReason,
              returnNotes,
            } = order

            // Handle productId as object (populated) or string
            const productIdValue = productId?._id || productId || null
            const productNameValue = productName || productId?.name || ""
            
            // Handle createdBy as object (populated) or string
            const createdByValue = createdBy?._id || createdBy || null
            const createdByName = createdBy?.name || ""
            
            // Handle assignedTo as object (populated) or string
            const assignedToValue = assignedTo?._id || assignedTo || null
            const assignedToName = assignedTo?.name || ""

            const displayQuantity = (orderStatus === "COMPLETED" && deliveredQuantity > 0) ? deliveredQuantity : quantity

            return {
              order: orderNumber,
              farmerName: customerName,
              plantType: productNameValue,
              quantity: quantity,
              deliveredQuantity: deliveredQuantity || quantity,
              totalPlants: displayQuantity,
              additionalPlants: 0,
              basePlants: quantity,
              orderDate: moment(orderDate || createdAt).format("DD MMM YYYY"),
              deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YYYY") : "-",
              rate: rate,
              total: `₹ ${Number(totalAmount || 0).toFixed(2)}`,
              "Paid Amt": `₹ ${Number(totalPaidAmount || 0).toFixed(2)}`,
              "remaining Amt": `₹ ${Number(balanceAmount || totalAmount - (totalPaidAmount || 0)).toFixed(2)}`,
              "remaining Plants": displayQuantity,
              "returned Plants": returnQuantity || 0,
              orderStatus: orderStatus,
              dispatchStatus: dispatchStatus || "NOT_DISPATCHED",
              Delivery: "-",
              "Farm Ready": "-",
              isAgriSalesOrder: true,
              details: {
                customerName,
                customerMobile,
                customerVillage,
                customerTaluka,
                customerDistrict,
                productName: productNameValue,
                productId: productIdValue,
                quantity,
                deliveredQuantity: deliveredQuantity || quantity,
                returnQuantity: returnQuantity || 0,
                unit,
                rate,
                totalAmount,
                orderStatus,
                payment: payment || [],
                totalPaidAmount: totalPaidAmount || 0,
                balanceAmount: balanceAmount || totalAmount,
                orderDate,
                deliveryDate,
                notes,
                createdBy: createdByValue,
                createdByName: createdByName,
                orderid: _id,
                orderNumber,
                dispatchStatus: dispatchStatus || "NOT_DISPATCHED",
                dispatchMode: dispatchMode || "VEHICLE",
                vehicleNumber,
                driverName,
                driverMobile,
                dispatchedAt,
                dispatchedBy,
                dispatchNotes,
                courierName,
                courierTrackingId,
                courierContact,
                assignedTo: assignedToValue,
                assignedToName: assignedToName,
                assignedAt,
                assignedBy,
                assignmentNotes,
              },
            }
          })

          console.log("Outstanding transformed orders:", transformedOrders.length, transformedOrders)
          
          if (transformedOrders.length === 0) {
            console.warn("No outstanding orders found after transformation")
          }
          
          setOrders(transformedOrders)
          setLoading(false)
          return
        } else {
          // For other statuses, use default pagination and date filters
          params = {
            search: debouncedSearchTerm || "",
            limit: 10000,
            page: 1
          }
          
          if (startDate && endDate) {
            params.startDate = moment(startDate).format("YYYY-MM-DD")
            params.endDate = moment(endDate).format("YYYY-MM-DD")
          }

          // Filter by order status based on agriDispatchStatusFilter
          if (agriDispatchStatusFilter && agriDispatchStatusFilter !== "ALL") {
            if (agriDispatchStatusFilter === "PENDING") {
              params.orderStatus = "PENDING"
            } else if (agriDispatchStatusFilter === "ACCEPTED") {
              params.orderStatus = "ACCEPTED"
            } else if (agriDispatchStatusFilter === "ASSIGNED") {
              params.orderStatus = "ASSIGNED"
            } else if (agriDispatchStatusFilter === "DISPATCHED") {
              params.orderStatus = "DISPATCHED"
              params.dispatchStatus = "DISPATCHED"
            } else if (agriDispatchStatusFilter === "COMPLETED") {
              params.orderStatus = "COMPLETED"
            }
          }
        }
        // When "ALL": no status filter — fetch all orders

        if (selectedSalesPerson) {
          // For Agri Sales, filter by createdBy if salesPerson is selected
          params.createdBy = selectedSalesPerson
        }

        const response = await instance.request({}, params)
        let ordersData = response?.data?.data?.data || response?.data?.data || []
        
        // Fetch counts in parallel (without blocking)
        fetchAgriStatusCounts()

        // Transform Agri Sales orders to match the expected format
        const transformedOrders = ordersData.map((order) => {
          const {
            orderNumber,
            customerName,
            customerMobile,
            customerVillage,
            customerTaluka,
            customerDistrict,
            productName,
            quantity,
            unit,
            rate,
            totalAmount,
            orderStatus,
            payment,
            totalPaidAmount,
            balanceAmount,
            orderDate,
            deliveryDate,
            createdAt,
            notes,
            createdBy,
            productId,
            _id,
            // Dispatch fields
            dispatchStatus,
            dispatchMode,
            vehicleNumber,
            driverName,
            driverMobile,
            dispatchedAt,
            dispatchedBy,
            dispatchNotes,
            // Courier fields
            courierName,
            courierTrackingId,
            courierContact,
            // Assignment fields
            assignedTo,
            assignedAt,
            assignedBy,
            assignmentNotes,
            // Return and delivery fields
            returnQuantity,
            deliveredQuantity,
            returnReason,
            returnNotes,
          } = order

          // Handle populated fields (productId, createdBy, assignedTo can be objects)
          const productIdValue = productId?._id || productId || null
          const productNameValue = productName || productId?.name || ""
          const createdByValue = createdBy?._id || createdBy || null
          const createdByName = createdBy?.name || ""
          const assignedToValue = assignedTo?._id || assignedTo || null
          const assignedToName = assignedTo?.name || ""

          // For completed orders, use deliveredQuantity for display; otherwise use quantity
          const displayQuantity = (orderStatus === "COMPLETED" && deliveredQuantity > 0) ? deliveredQuantity : quantity

          return {
            order: orderNumber,
            farmerName: customerName,
            plantType: productNameValue,
            quantity: quantity, // Original quantity
            deliveredQuantity: deliveredQuantity || quantity, // Final delivered quantity
            totalPlants: displayQuantity, // Display quantity (final for completed orders)
            additionalPlants: 0,
            basePlants: quantity,
            orderDate: moment(orderDate || createdAt).format("DD MMM YYYY"),
            deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YYYY") : "-",
            rate: rate,
            total: `₹ ${Number(totalAmount || 0).toFixed(2)}`,
            "Paid Amt": `₹ ${Number(totalPaidAmount || 0).toFixed(2)}`,
            "remaining Amt": `₹ ${Number(balanceAmount || totalAmount - (totalPaidAmount || 0)).toFixed(2)}`,
            "remaining Plants": displayQuantity, // For Agri Sales, remaining is same as quantity until accepted
            "returned Plants": returnQuantity || 0,
            orderStatus: orderStatus,
            dispatchStatus: dispatchStatus || "NOT_DISPATCHED",
            Delivery: "-", // Agri Sales orders don't have slots
            "Farm Ready": "-",
            isAgriSalesOrder: true, // Flag to identify Agri Sales orders
            details: {
              customerName,
              customerMobile,
              customerVillage,
                customerTaluka,
                customerDistrict,
                productName: productNameValue,
                productId: productIdValue,
              quantity,
              deliveredQuantity: deliveredQuantity || quantity,
              returnQuantity: returnQuantity || 0,
              unit,
              rate,
              totalAmount,
              orderStatus,
              payment: payment || [],
              totalPaidAmount: totalPaidAmount || 0,
              balanceAmount: balanceAmount || totalAmount,
              orderDate,
              deliveryDate,
                notes,
                createdBy: createdByValue,
                createdByName: createdByName,
                orderid: _id,
              orderNumber,
              // Dispatch details
              dispatchStatus: dispatchStatus || "NOT_DISPATCHED",
              dispatchMode: dispatchMode || "VEHICLE",
              vehicleNumber,
              driverName,
              driverMobile,
              dispatchedAt,
              dispatchedBy,
              dispatchNotes,
              // Courier details
              courierName,
              courierTrackingId,
              courierContact,
              // Assignment details
              assignedTo: assignedToValue,
              assignedToName: assignedToName,
              assignedAt,
              assignedBy,
              assignmentNotes,
              // Return details
              returnReason,
              returnNotes,
            },
          }
        })

        // Apply additional filters
        let filteredOrders = transformedOrders
        if (selectedVillage) {
          filteredOrders = filteredOrders.filter((o) => o.details.customerVillage === selectedVillage)
        }
        if (selectedDistrict) {
          filteredOrders = filteredOrders.filter((o) => o.details.customerDistrict === selectedDistrict)
        }
        // Filter by dispatchedBy (Ram Agri Inputs user who dispatched)
        if (selectedDispatchedBy) {
          filteredOrders = filteredOrders.filter((o) => {
            const dispatchedById = o.details.dispatchedBy?._id || o.details.dispatchedBy
            return dispatchedById === selectedDispatchedBy
          })
        }

        setOrders(filteredOrders)
        setLoading(false)
        return
      } catch (error) {
        console.error("Error fetching Agri Sales orders:", error)
        Toast.error("Failed to load Agri Sales orders")
        setLoading(false)
        setOrders([])
        return
      }
    }

    // Use appropriate endpoint based on slotId for regular orders
    const instance = slotId
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


    // When dealer or sales is logged in, filter orders by their id (same as getOrders API expectation)
    const isDealerOrSales = user?.jobTitle === "DEALER" || user?.jobTitle === "SALES"
    if (isDealerOrSales && (user?._id || user?.id)) {
      params.salesPerson = user._id || user.id
    }
    // Add new filter parameters (only apply selectedSalesPerson when not dealer/sales)
    else if (selectedSalesPerson) {
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
      params.startDate = null
      params.endDate = null
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

    // Handle response structure
    const ordersData = emps?.data?.data?.data || []

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
            additionalPlants = 0,
            totalPlants,
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
                orderFor,
                cavity
              } = data || {}
          const basePlants = numberOfPlants || 0
          const extraPlants = additionalPlants || 0
          const totalPlantCount =
            typeof totalPlants === "number" ? totalPlants : basePlants + extraPlants
          const remainingPlantCount =
            typeof remainingPlants === "number" ? remainingPlants : totalPlantCount
          const totalOrderAmount = Number(rate * totalPlantCount)

          const latestSlot = mapSlotForUi(bookingSlot)
          const { startDay, endDay } = latestSlot || {}
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
            quantity: basePlants,
            totalPlants: totalPlantCount,
            additionalPlants: extraPlants,
            basePlants,
            orderDate: moment(orderBookingDate || createdAt).format("DD MMM YYYY"),
            deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YYYY") : "-", // Specific delivery date
            rate,
            total: `₹ ${Number(totalOrderAmount).toFixed(2)}`,
            "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment)).toFixed(2)}`,
            "remaining Amt": `₹ ${(totalOrderAmount - Number(getTotalPaidAmount(payment))).toFixed(2)}`,
            "remaining Plants": remainingPlantCount,
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
              bookingSlot: latestSlot,
              rate: rate,
              numberOfPlants: basePlants,
              additionalPlants: extraPlants,
              totalPlants: totalPlantCount,
              remainingPlants: remainingPlantCount,
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
              deliveryDate: deliveryDate || null, // Include deliveryDate in details
              cavity: cavity || null, // Include cavity information
              cavityName: cavity?.name || null,
              cavityId: cavity?.id || cavity?._id || null,
              slotHistory: Array.isArray(bookingSlot)
                ? bookingSlot.filter(Boolean)
                : bookingSlot
                ? [bookingSlot]
                : []
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
      // Check if this is an agri sales order
      const isAgriSalesOrder = row?.isAgriSalesOrder || row?.details?.isRamAgriProduct || false
      
      // Handle Date objects for farmReadyDate and deliveryDate
      const dataToSend = { ...patchObj }

      // Convert deliveryDate to ISO format if it's a Date object
      if (dataToSend.deliveryDate && dataToSend.deliveryDate instanceof Date) {
        dataToSend.deliveryDate = dataToSend.deliveryDate.toISOString()
        console.log("Converted deliveryDate to ISO:", dataToSend.deliveryDate)
      }

      console.log("=== PATCH ORDER PAYLOAD DEBUG ===")
      console.log("Is Agri Sales Order:", isAgriSalesOrder)
      console.log("Full dataToSend:", dataToSend)
      console.log("deliveryDate in payload:", dataToSend.deliveryDate)
      console.log("bookingSlot in payload:", dataToSend.bookingSlot)

      // For agri sales orders, skip slot validation (they don't use slots)
      if (!isAgriSalesOrder) {
        // Validate slot capacity if booking slot is being changed (only for regular orders)
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

        // Validate quantity changes (only for regular orders)
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
      } else {
        // For agri sales orders, validate quantity
        if (dataToSend.quantity) {
          const newQuantity = Number(dataToSend.quantity)
          if (newQuantity <= 0) {
            Toast.error("Quantity must be greater than 0")
            setpatchLoading(false)
            return
          }
        }
      }

      // Use appropriate endpoint based on order type
      let instance
      let payload
      let urlParams = null
      
      if (isAgriSalesOrder) {
        // Agri Sales Order update - use PATCH /inventory/agri-sales-orders/:id
        instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER)
        // Remove fields that don't apply to agri sales orders
        const { numberOfPlants, bookingSlot, id, ...agriPayload } = dataToSend
        // For agri sales orders, id goes in URL params as array
        urlParams = [dataToSend.id]
        payload = agriPayload
      } else {
        // Regular Order update
        instance = NetworkManager(API.ORDER.UPDATE_ORDER)
        payload = {
          ...dataToSend,
          numberOfPlants: dataToSend?.quantity
        }
      }

      const emps = urlParams 
        ? await instance.request(payload, urlParams)
        : await instance.request(payload)

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

        // Refresh slots to get updated capacity (only for regular orders, not agri sales orders)
        if (!isAgriSalesOrder && (dataToSend.bookingSlot || dataToSend.quantity)) {
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
      case "ASSIGNED":
        return "bg-purple-100 text-purple-700"
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-100 text-red-700"
      case "TEMPORARY_CANCELLED":
        return "bg-orange-100 text-orange-700"
      case "DISPATCHED":
      case "PROCESSING":
        return "bg-brand-100 text-brand-700"
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
  const handleStatusChange = async (row, newStatus) => {
    // Handle Agri Sales orders differently
    if (row.isAgriSalesOrder) {
      // Don't allow status change for COMPLETED orders
      if (row.orderStatus === "COMPLETED") {
        Toast.error("Cannot change status of completed orders")
        return
      }

      setConfirmDialog({
        open: true,
        title: newStatus === "ACCEPTED" ? "Accept Order & Deduct Stock" : `Change Status to ${newStatus}`,
        description: newStatus === "ACCEPTED" 
          ? `Accept Order #${row.order}? This will deduct ${row.quantity} ${row.details?.unit || "units"} from inventory stock.`
          : `Change status of Order #${row.order} from ${row.orderStatus} to ${newStatus}?`,
        onConfirm: async () => {
          setConfirmDialog((d) => ({ ...d, open: false }))
          setpatchLoading(true)
          try {
            const orderId = row?.details?.orderid || row?.details?._id
            if (newStatus === "ACCEPTED") {
              const instance = NetworkManager(API.INVENTORY.ACCEPT_AGRI_SALES_ORDER)
              const response = await instance.request({}, [orderId])
              if (response?.data) {
                Toast.success("Order accepted and stock deducted successfully")
                await getOrders()
                fetchAgriStatusCounts() // Refresh counts after accept
                refreshComponent()
              }
            } else if (newStatus === "REJECTED") {
              const instance = NetworkManager(API.INVENTORY.REJECT_AGRI_SALES_ORDER)
              const response = await instance.request({ reason: "Rejected by user" }, [orderId])
              if (response?.data) {
                Toast.success("Order rejected successfully")
                await getOrders()
                fetchAgriStatusCounts() // Refresh counts after reject
                refreshComponent()
              }
            } else {
              // Handle other status changes (PENDING, ASSIGNED, DISPATCHED, etc.)
              const instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER)
              const response = await instance.request({ orderStatus: newStatus }, [orderId])
              if (response?.data) {
                Toast.success(`Order status changed to ${newStatus} successfully`)
                await getOrders()
                fetchAgriStatusCounts() // Refresh counts after status change
                refreshComponent()
              }
            }
          } catch (error) {
            console.error("Error changing Agri Sales order status:", error)
            const errorMessage = error.response?.data?.message || error.message || "Failed to change order status"
            Toast.error(errorMessage)
          } finally {
            setpatchLoading(false)
          }
        }
      })
      return
    }

    // Handle regular orders (existing flow)
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
                    className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    className="px-3 py-1 text-sm bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors whitespace-nowrap">
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = new Date()
                      yesterday.setDate(yesterday.getDate() - 1)
                      setSelectedDateRange([yesterday, yesterday])
                    }}
                    className="px-3 py-1 text-sm bg-brand-400 text-white rounded hover:bg-brand-500 transition-colors whitespace-nowrap">
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
                    className="px-3 py-1 text-sm bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors whitespace-nowrap">
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
                    className="px-3 py-1 text-sm bg-brand-700 text-white rounded hover:bg-brand-800 transition-colors whitespace-nowrap">
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
                <div className="mt-2 p-2 bg-brand-50 border border-brand-200 rounded-lg">
                  <p className="text-sm text-brand-800">
                    📅 Filtering farm ready orders from{" "}
                    <span className="font-semibold">{moment(startDate).format("DD MMM YYYY")}</span>{" "}
                    to <span className="font-semibold">{moment(endDate).format("DD MMM YYYY")}</span>
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
        <div className="bg-white rounded-lg shadow-sm border p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Plant Filter - Hide for Agri Sales orders */}
            {!showAgriSalesOrders && (
              <>
                <SearchableDropdown
                  label="Plant"
                  value={selectedPlant}
                  onChange={(val) => {
                    setSelectedPlant(val)
                    if (val === "") {
                      setSelectedSubtype("")
                    }
                  }}
                  options={[{ label: "All Plants", value: "" }, ...(plants || [])]}
                  placeholder="Select Plant"
                  showCount={true}
                  maxHeight="500px"
                />

                {/* Plant Subtype Filter */}
                <SearchableDropdown
                  label="Subtype"
                  value={selectedSubtype}
                  onChange={setSelectedSubtype}
                  options={
                    !selectedPlant
                      ? []
                      : [{ label: "All Subtypes", value: "" }, ...(subtypes || [])]
                  }
                  placeholder={
                    !selectedPlant
                      ? "Select a plant first"
                      : subtypesLoading
                      ? "Loading subtypes..."
                      : "Select Subtype"
                  }
                  showCount={Boolean(selectedPlant && !subtypesLoading)}
                  maxHeight="500px"
                  disabled={!selectedPlant || subtypesLoading}
                />
              </>
            )}

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
          <div className="mt-3 flex justify-between items-center">
            <ExcelExport
              title="Export Orders"
              filters={{
                startDate: startDate ? moment(startDate).format("YYYY-MM-DD") : "",
                endDate: endDate ? moment(endDate).format("YYYY-MM-DD") : "",
                plantId: selectedPlant || "",
                subtypeId: selectedSubtype || "",
                salesPerson: selectedSalesPerson || "",
                village: selectedVillage || "",
                district: selectedDistrict || ""
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
                setSelectedPlant("")
                setSelectedSubtype("")
                setSubtypes([])
                setSelectedDateRange([null, null])
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 enhanced-select hover:bg-gray-50 focus:outline-none">
              Clear Filters
            </button>
          </div>
        </div>


        {/* Ram Agri Inputs Action Bar - Only show when orders are selected */}
        {showAgriSalesOrders && (selectedAgriSalesOrders.length > 0 || selectedAgriOrdersForComplete.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border mb-4 overflow-hidden">
            {/* Action Bar Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 lg:pb-0">
                  {/* Dispatch Button - Only show when orders are selected */}
                  {selectedAgriSalesOrders.length > 0 && (
                    <button
                      onClick={openAgriDispatchModal}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-orange-100 text-orange-700 hover:bg-orange-200 shadow-sm border border-orange-300">
                      🚚 Dispatch
                      <span className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriSalesOrders.length}
                      </span>
                    </button>
                  )}

                  {/* Assign to Sales Person Button */}
                  {selectedAgriSalesOrders.length > 0 && (
                    <button
                      onClick={openAssignModal}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-sm border border-purple-300">
                      👤 Assign
                      <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriSalesOrders.length}
                      </span>
                    </button>
                  )}

                  {/* Complete Button */}
                  {selectedAgriOrdersForComplete.length > 0 && (
                    <button
                      onClick={openAgriCompleteModal}
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center gap-1 md:gap-2 whitespace-nowrap bg-green-100 text-green-700 hover:bg-green-200 shadow-sm border border-green-300">
                      ✅ Complete
                      <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedAgriOrdersForComplete.length}
                      </span>
                    </button>
                  )}

                  {/* Dispatched By Filter */}
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-white text-xs md:text-sm font-medium hidden sm:inline">👤 Dispatched By:</span>
                    <select
                      value={selectedDispatchedBy}
                      onChange={(e) => setSelectedDispatchedBy(e.target.value)}
                      className="px-2 md:px-3 py-2 text-xs md:text-sm border-0 rounded-lg bg-white/90 text-gray-700 focus:ring-2 focus:ring-white min-w-[120px] md:min-w-[180px]">
                      <option value="">All Employees</option>
                      {ramAgriSalesUsers.map((user) => (
                        <option key={user.value} value={user.value}>
                          {user.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  {/* Dispatch Selection */}
                  {selectedAgriSalesOrders.length > 0 && (
                    <>
                      <span className="text-white text-xs md:text-sm">
                        <span className="font-bold">{selectedAgriSalesOrders.length}</span> for dispatch
                      </span>
                      <button
                        onClick={clearAgriOrderSelections}
                        className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors">
                        Clear
                      </button>
                    </>
                  )}
                  {/* Complete Selection */}
                  {selectedAgriOrdersForComplete.length > 0 && (
                    <>
                      <span className="text-green-100 text-xs md:text-sm">
                        <span className="font-bold">{selectedAgriOrdersForComplete.length}</span> for complete
                      </span>
                      <button
                        onClick={clearAgriCompleteSelections}
                        className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors">
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
        {viewMode === "farmready" && !showAgriSalesOrders && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800">
              <span className="font-semibold">🌱 Farm Ready View:</span> Shows orders marked as farm ready with date filtering applied.
            </p>
          </div>
        )}
        {viewMode === "ready_for_dispatch" && !showAgriSalesOrders && (
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-brand-800">
              <span className="font-semibold">✅ Ready for Dispatch View:</span> Shows all orders with &ldquo;Ready for Dispatch&rdquo; status, irrespective of date. 
              {isDispatchManager && <span className="ml-1 font-medium">You can change status and delivery date.</span>}
            </p>
          </div>
        )}
      </div>

      {/* Dispatch list component */}
      <DispatchList setisDispatchtab={setisDispatchtab} viewMode={viewMode} refresh={refresh} />

      {/* Plant/Subtype Summary Cards for Ready for Dispatch */}
      {viewMode === "ready_for_dispatch" && orders && orders.length > 0 && (() => {
        // Group orders by plant type and subtype
        const plantSummary = new Map();
        
        orders.forEach(order => {
          const plantType = order.plantType || "Unknown";
          const key = plantType;
          
          if (!plantSummary.has(key)) {
            plantSummary.set(key, {
              plantType: plantType,
              totalQuantity: 0,
              orderCount: 0
            });
          }
          
          const summary = plantSummary.get(key);
          summary.totalQuantity += order.totalPlants ?? order.quantity ?? 0;
          summary.orderCount += 1;
        });
        
        const summaryArray = Array.from(plantSummary.values()).sort((a, b) => 
          b.totalQuantity - a.totalQuantity
        );
        
        return (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 Delivery Summary by Plant Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {summaryArray.map((summary, index) => (
                <div key={index} className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-lg shadow-sm border border-brand-200 p-3 hover:shadow-md transition-shadow">
                  <div className="text-xs text-gray-600 mb-1 truncate" title={summary.plantType}>
                    {summary.plantType}
                  </div>
                  <div className="text-lg font-bold text-brand-700">
                    {summary.totalQuantity.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {summary.orderCount} {summary.orderCount === 1 ? 'order' : 'orders'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* View Toggle and Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header with View Toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <button
              onClick={() => setViewType("table")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === "table"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
              }`}>
              📊 Table
            </button>
            <button
              onClick={() => setViewType("grid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewType === "grid"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
              }`}>
              🎴 Grid
            </button>
            
            {/* Order Type: Toggle between Regular Orders and Ram Agri Inputs */}
            <div className="ml-4 pl-4 border-l border-gray-300 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Order Type:</span>
              <button
                onClick={() => setShowAgriSalesOrders(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                  !showAgriSalesOrders
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                }`}>
                📋 Regular Orders
              </button>
              <button
                onClick={() => setShowAgriSalesOrders(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 relative ${
                  showAgriSalesOrders
                    ? "bg-orange-600 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-300"
                }`}>
                📦 Ram Agri Inputs
                {showAgriSalesOrders && agriSalesPendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    {agriSalesPendingCount > 99 ? "99+" : agriSalesPendingCount}
                  </span>
                )}
              </button>
              {showAgriSalesOrders && (
                <>
                  <button
                    onClick={() => setShowAddAgriSalesOrderForm(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white shadow-sm hover:bg-green-700 transition-colors flex items-center gap-1">
                    <span>+</span> Add Order
                  </button>
                  <div className="ml-2 flex items-center gap-1">
                    <input
                      type="checkbox"
                      id="hidePayment"
                      checked={hidePaymentDetails}
                      onChange={(e) => setHidePaymentDetails(e.target.checked)}
                      className="w-3 h-3 text-brand-600 rounded border-gray-300"
                    />
                    <label htmlFor="hidePayment" className="text-xs text-gray-600 cursor-pointer">
                      Hide Payment
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Status filter (Ram Agri Inputs) - Tab Style */}
            {showAgriSalesOrders && (
              <div className="ml-4 pl-4 border-l border-gray-300">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => {
                      setAgriDispatchStatusFilter("PENDING")
                      setOutstandingPage(1) // Reset pagination when switching away from outstanding
                    }}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "PENDING"
                        ? "border-yellow-600 text-yellow-600 bg-yellow-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    ⏳ Pending <span className="ml-1 text-xs font-semibold">({agriStatusCounts.PENDING})</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgriDispatchStatusFilter("ACCEPTED")
                      setOutstandingPage(1) // Reset pagination when switching away from outstanding
                    }}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "ACCEPTED"
                        ? "border-gray-600 text-gray-600 bg-gray-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    ✓ Accepted <span className="ml-1 text-xs font-semibold">({agriStatusCounts.ACCEPTED})</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgriDispatchStatusFilter("ASSIGNED")
                      setOutstandingPage(1) // Reset pagination when switching away from outstanding
                    }}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "ASSIGNED"
                        ? "border-purple-600 text-purple-600 bg-purple-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    👤 Assigned <span className="ml-1 text-xs font-semibold">({agriStatusCounts.ASSIGNED})</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgriDispatchStatusFilter("DISPATCHED")
                      setOutstandingPage(1) // Reset pagination when switching away from outstanding
                    }}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "DISPATCHED"
                        ? "border-brand-600 text-brand-600 bg-brand-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    🚚 Dispatched <span className="ml-1 text-xs font-semibold">({agriStatusCounts.DISPATCHED})</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgriDispatchStatusFilter("COMPLETED")
                      setOutstandingPage(1) // Reset pagination when switching away from outstanding
                    }}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "COMPLETED"
                        ? "border-green-600 text-green-600 bg-green-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    ✅ Completed <span className="ml-1 text-xs font-semibold">({agriStatusCounts.COMPLETED})</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgriDispatchStatusFilter("OUTSTANDING")
                      setOutstandingPage(1) // Reset to first page when switching to outstanding
                    }}
                    className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                      agriDispatchStatusFilter === "OUTSTANDING"
                        ? "border-orange-600 text-orange-600 bg-orange-50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}>
                    💰 Outstanding <span className="ml-1 text-xs font-semibold">({agriStatusCounts.OUTSTANDING})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </div>
        </div>

        {/* Tab Navigation - Hide or simplify for Agri Sales orders */}
        {!showAgriSalesOrders && (
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setViewMode("booking")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "booking"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">📋 </span>Booking {orders.length > 0 && <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">({orders.length})</span>}
              </button>
              <button
                onClick={() => setViewMode("dispatched")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "dispatched"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">🚚 </span>Dispatched {orders.length > 0 && <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">({orders.length})</span>}
              </button>
              <button
                onClick={() => setViewMode("farmready")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "farmready"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">🌱 </span>Farm Ready {orders.length > 0 && <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">({orders.length})</span>}
              </button>
              <button
                onClick={() => setViewMode("ready_for_dispatch")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "ready_for_dispatch"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">✅ </span>Ready {orders.length > 0 && <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">({orders.length})</span>}
              </button>
              <button
                onClick={() => setViewMode("dispatch_process")}
                className={`px-4 md:px-6 py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  viewMode === "dispatch_process"
                    ? "border-brand-500 text-brand-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <span className="hidden sm:inline">⏳ </span>Loading {orders.length > 0 && <span className="ml-1 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">({orders.length})</span>}
              </button>
            </div>
          </div>
        )}

        {/* Filter orders based on order status for Agri Sales */}
        {(() => {
          // For outstanding, orders are already filtered by API, so don't filter again
          // Just use orders directly as filteredOrders
          const filteredOrders = showAgriSalesOrders && agriDispatchStatusFilter === "OUTSTANDING"
            ? orders // Already filtered by API
            : showAgriSalesOrders && agriDispatchStatusFilter !== "ALL"
            ? orders.filter(o => {
                const orderStatus = o.orderStatus || "PENDING"
                const dispatchStatus = o.details?.dispatchStatus || "NOT_DISPATCHED"
                
                if (agriDispatchStatusFilter === "PENDING") {
                  return orderStatus === "PENDING"
                } else if (agriDispatchStatusFilter === "ACCEPTED") {
                  return orderStatus === "ACCEPTED"
                } else if (agriDispatchStatusFilter === "ASSIGNED") {
                  return orderStatus === "ASSIGNED"
                } else if (agriDispatchStatusFilter === "DISPATCHED") {
                  return orderStatus === "DISPATCHED" || dispatchStatus === "DISPATCHED"
                } else if (agriDispatchStatusFilter === "COMPLETED") {
                  return orderStatus === "COMPLETED" || dispatchStatus === "DELIVERED"
                }
                return true
              })
            : orders

          return (
            <>
        {/* Table View */}
        {viewType === "table" && (
          <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
            {filteredOrders && filteredOrders.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 sticky top-0 z-10">
                  <tr>
                    {/* Dispatch Selection Checkbox for Agri Sales */}
                    {showAgriSalesOrders && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-10 bg-gray-50">
                        <input
                          type="checkbox"
                          onChange={() => {
                            if (selectedAgriSalesOrders.length > 0) {
                              clearAgriOrderSelections()
                            } else {
                              selectAllAgriOrders()
                            }
                          }}
                          checked={selectedAgriSalesOrders.length > 0 && selectedAgriSalesOrders.length === orders.filter(o => 
                            o.isAgriSalesOrder && 
                            o.orderStatus === "ACCEPTED" // Only ACCEPTED orders can be dispatched/assigned
                          ).length}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          title="Select all accepted orders"
                        />
                      </th>
                    )}
                    {viewMode !== "booking" && !showAgriSalesOrders && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-10 bg-gray-50">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={selectedRows.size === orders.length && orders.length > 0}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[100px] bg-gray-50">
                      Order #
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[160px] bg-gray-50">
                      Farmer / Customer
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[140px] bg-gray-50">
                      Plant Type
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[90px] bg-gray-50">
                      Qty
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[70px] bg-gray-50">
                      Rate
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px] bg-gray-50">
                      Amount
                    </th>
                    {!(showAgriSalesOrders && hidePaymentDetails) && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px] bg-gray-50">
                        Payment
                      </th>
                    )}
                    {/* Dispatch Info Column for Agri Sales */}
                    {showAgriSalesOrders && (
                      <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Dispatch
                      </th>
                    )}
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[110px] bg-gray-50">
                      Status
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[80px] bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((row, index) => {
                  const farmerDetails = row?.details?.farmer
                  // For Ram Agri sales orders, use customerTaluka and customerVillage
                  const farmerLocation = row.isAgriSalesOrder || row.details?.isRamAgriProduct
                    ? (row.details?.customerTaluka && row.details?.customerVillage
                        ? `${row.details.customerTaluka} → ${row.details.customerVillage}`
                        : row.details?.customerTaluka || row.details?.customerVillage || null)
                    : (farmerDetails
                        ? [farmerDetails.district, farmerDetails.village].filter(Boolean).join(" → ")
                        : null)
                  const hasPendingPayment = row?.details?.payment?.some((payment) => payment.paymentStatus === "PENDING")

                  // Determine row styling based on dispatch status for Agri Sales
                  const getAgriRowStyle = () => {
                    if (!showAgriSalesOrders) return ""
                    const dispatchStatus = row.details?.dispatchStatus
                    if (dispatchStatus === "DISPATCHED") return "bg-brand-50 border-l-brand-500"
                    if (dispatchStatus === "DELIVERED") return "bg-green-50 border-l-green-500"
                    if (selectedAgriSalesOrders.includes(row.details?.orderid)) return "bg-amber-50 border-l-amber-500"
                    return ""
                  }

                  return (
                    <tr
                      key={index}
                      className={`hover:bg-brand-50 transition-all duration-150 cursor-pointer border-l-4 ${
                        hasPendingPayment && !showAgriSalesOrders ? "payment-blink border-l-amber-400" : "border-l-transparent"
                      } ${row?.details?.dealerOrder ? "bg-sky-50" : ""} ${
                        selectedRows.has(row.details.orderid) && !showAgriSalesOrders ? "bg-brand-100 border-l-brand-500" : ""
                      } ${getAgriRowStyle()}`}
                      onClick={() => {
                        setSelectedOrder(row)
                        setIsOrderModalOpen(true)
                      }}>
                      {/* Dispatch Selection Checkbox for Agri Sales */}
                      {showAgriSalesOrders && (
                        <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {/* ACCEPTED orders - can be dispatched or assigned */}
                          {row.isAgriSalesOrder && row.orderStatus === "ACCEPTED" ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleAgriOrderSelection(row.details.orderid)
                                }}
                                checked={selectedAgriSalesOrders.includes(row.details.orderid)}
                                className="w-4 h-4 rounded border-2 border-orange-400 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                title="Select for dispatch/assign"
                              />
                            </div>
                          ) : row.orderStatus === "ASSIGNED" ? (
                            /* ASSIGNED orders - show purple icon */
                            <div className="flex items-center justify-center">
                              <span className="text-lg" title="Assigned to sales person">👤</span>
                            </div>
                          ) : row.orderStatus === "DISPATCHED" || row.details?.dispatchStatus === "DISPATCHED" ? (
                            /* DISPATCHED orders - can be completed */
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  e.stopPropagation()
                                  toggleAgriCompleteOrderSelection(row.details.orderid)
                                }}
                                checked={selectedAgriOrdersForComplete.includes(row.details.orderid)}
                                className="w-4 h-4 rounded border-2 border-green-400 text-green-600 focus:ring-green-500 cursor-pointer"
                                title="Select for complete"
                              />
                              <span className="text-sm">
                                {row.details.dispatchMode === "COURIER" ? "📦" : "🚚"}
                              </span>
                            </div>
                          ) : row.orderStatus === "COMPLETED" || row.details?.dispatchStatus === "DELIVERED" ? (
                            /* COMPLETED orders */
                            <div className="flex items-center justify-center">
                              <span className="text-lg">✅</span>
                            </div>
                          ) : row.orderStatus === "PENDING" ? (
                            /* PENDING orders - show yellow icon */
                            <div className="flex items-center justify-center">
                              <span className="text-yellow-500 text-lg" title="Pending acceptance">⏳</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <span className="text-gray-300 text-lg">○</span>
                            </div>
                          )}
                        </td>
                      )}
                      {viewMode !== "booking" && !showAgriSalesOrders && (
                        <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleRowSelection(row.details.orderid, row)
                            }}
                            checked={selectedRows.has(row.details.orderid)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">#{(row.isAgriSalesOrder || row.details?.isRamAgriProduct) ? String(row.order).padStart(5, '0') : row.order}</span>
                          {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && (
                            <DownloadPDFButton order={row} />
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{row.orderDate}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-medium text-gray-900 leading-tight">
                          {row.details?.orderFor ? (
                            <div className="space-y-0.5">
                              <div className="farmer-name-highlight inline-block px-1.5 py-0.5 rounded text-[10px]">
                                {row.details.farmer?.name || "Unknown"}
                              </div>
                              <div className="order-for-highlight inline-block px-1.5 py-0.5 rounded text-[10px] ml-1">
                                For: {row.details.orderFor.name}
                              </div>
                            </div>
                          ) : (
                            <span className="farmer-name-highlight inline-block px-1.5 py-0.5 rounded text-[10px]">
                              {row.farmerName}
                            </span>
                          )}
                        </div>
                        {row.details?.salesPerson && (
                          <div className="text-[10px] text-brand-600 mt-0.5">
                            By: {row.details.salesPerson.name}
                            {row.details.salesPerson.jobTitle === "DEALER" && " (D)"}
                          </div>
                        )}
                        {farmerLocation && (
                          <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[150px]">{farmerLocation}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs text-gray-900 font-medium leading-tight">{row.plantType}</div>
                      </td>
                      <td className="px-2 py-2">
                        {/* Show final quantity for completed Agri Sales orders */}
                        {row.isAgriSalesOrder && row.orderStatus === "COMPLETED" && row.details?.deliveredQuantity > 0 ? (
                          <>
                            <div className="text-xs font-bold text-green-700">
                              Final: {row.details.deliveredQuantity?.toLocaleString()}
                            </div>
                            {row.details.returnQuantity > 0 && (
                              <div className="text-[10px] text-red-600 mt-0.5">
                                Returned: {row.details.returnQuantity?.toLocaleString()}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              Original: {row.quantity?.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-bold text-gray-900">
                              {(row.totalPlants ?? row.quantity)?.toLocaleString()}
                            </div>
                            {row.additionalPlants > 0 && (
                              <div className="text-[10px] text-brand-600 mt-0.5">
                                B:{row.basePlants?.toLocaleString()} +{row.additionalPlants?.toLocaleString()}
                              </div>
                            )}
                            {row["remaining Plants"] < (row.totalPlants ?? row.quantity) && (
                              <div className="text-[10px] text-orange-600 mt-0.5 font-medium">
                                Rem: {row["remaining Plants"]?.toLocaleString()}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900">₹{Number(row.rate).toFixed(2)}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-bold text-gray-900">{row.total}</div>
                        <div className="text-[10px] text-green-600 mt-0.5 font-medium">{row["Paid Amt"]}</div>
                        <div className="text-[10px] text-amber-600 mt-0.5 font-medium">{row["remaining Amt"]}</div>
                      </td>
                      {!(showAgriSalesOrders && hidePaymentDetails) && (
                        <td className="px-2 py-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs font-semibold text-green-600">{row["Paid Amt"]}</div>
                            <div className="text-[10px] text-amber-600 font-medium">{row["remaining Amt"]}</div>
                            {hasPendingPayment && (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full inline-block w-fit font-medium">
                                Pending
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {/* Dispatch Info Cell for Agri Sales */}
                      {showAgriSalesOrders && (
                        <td className="px-2 py-1">
                          {row.details?.dispatchStatus && row.details?.dispatchStatus !== "NOT_DISPATCHED" ? (
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium inline-block w-fit ${
                                row.details.dispatchStatus === "DISPATCHED" 
                                  ? row.details.dispatchMode === "COURIER" ? "bg-purple-100 text-purple-700" : "bg-brand-100 text-brand-700"
                                  : row.details.dispatchStatus === "DELIVERED" ? "bg-green-100 text-green-700" 
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {row.details.dispatchMode === "COURIER" ? "📦 " : "🚚 "}
                                {row.details.dispatchStatus}
                              </span>
                              {(row.details?.vehicleNumber || row.details?.courierName) && (
                                <div className="text-[9px] text-gray-600 truncate">
                                  {row.details.dispatchMode === "COURIER" 
                                    ? row.details.courierName || row.details.courierTrackingId || ""
                                    : row.details.vehicleNumber || ""
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        {/* Show dropdown for non-COMPLETED Agri Sales orders, static badge for COMPLETED */}
                        {showAgriSalesOrders ? (
                          row.orderStatus === "COMPLETED" ? (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`status-badge-enhanced status-${row.orderStatus
                                  .toLowerCase()
                                  .replace("_", "-")} inline-flex items-center gap-1 text-[10px] px-2 py-0.5`}>
                                {row.orderStatus === "FARM_READY" && "🌱"}
                                {row.orderStatus === "DISPATCH_PROCESS" ? "Loading" : row.orderStatus}
                              </span>
                              {/* Show outstanding indicator for COMPLETED orders with balance */}
                              {agriDispatchStatusFilter === "OUTSTANDING" && (
                                <span className="text-[9px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded">
                                  💰 Outstanding
                                </span>
                              )}
                            </div>
                          ) : (
                            <SearchableDropdown
                              label=""
                              value={row.orderStatus}
                              onChange={(newStatus) => handleStatusChange(row, newStatus)}
                              options={orderStatusOptions || []}
                              placeholder="Select Status"
                              maxHeight="200px"
                              isStatusDropdown={true}
                            />
                          )
                        ) : row.orderStatus !== "COMPLETED" && row.orderStatus !== "DISPATCHED" ? (
                          <SearchableDropdown
                            label=""
                            value={row.orderStatus}
                            onChange={(newStatus) => handleStatusChange(row, newStatus)}
                            options={orderStatusOptions || []}
                            placeholder="Select Status"
                            maxHeight="200px"
                            isStatusDropdown={true}
                          />
                        ) : (
                          <span
                            className={`status-badge-enhanced status-${row.orderStatus
                              .toLowerCase()
                              .replace("_", "-")} inline-flex items-center gap-1 text-[10px] px-2 py-0.5`}>
                            {row.orderStatus === "FARM_READY" && "🌱"}
                            {row.orderStatus === "DISPATCH_PROCESS" ? "Loading" : row.orderStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {viewMode !== "dispatch_process" &&
                          row?.orderStatus !== "COMPLETED" &&
                          row?.orderStatus !== "DISPATCH_PROCESS" &&
                          row?.orderStatus !== "DISPATCHED" && (
                            <div className="flex items-center space-x-2">
                              {editingRows.has(index) ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      saveEditedRow(index, row)
                                    }}
                                    className="text-green-500 hover:text-green-700 p-1 rounded hover:bg-green-50"
                                    title="Save">
                                    <CheckIcon size={18} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      cancelEditing(index)
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                    title="Cancel">
                                    <XIcon size={18} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleEditing(index, row)
                                  }}
                                  className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                                  title="Edit">
                                  <Edit2Icon size={18} />
                                </button>
                              )}
                            </div>
                          )}
                        {(row.orderStatus === "DISPATCHED" || row.orderStatus === "DISPATCH_PROCESS") && 
                         row.details?.dispatchHistory && 
                         row.details.dispatchHistory.length > 0 && (() => {
                          const latestDispatch = row.details.dispatchHistory[row.details.dispatchHistory.length - 1];
                          const driverName = latestDispatch?.dispatch?.driverName || latestDispatch?.driverName || 'N/A';
                          const vehicleName = latestDispatch?.dispatch?.vehicleName || latestDispatch?.vehicleName || 'N/A';
                          
                          if (driverName === 'N/A' && vehicleName === 'N/A') return null;
                          
                          return (
                            <div className="text-xs text-brand-600">
                              <div>🚚 {driverName}</div>
                              <div>🚗 {vehicleName}</div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center py-12">
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
        )}

        {/* Table Footer with Summary */}
        {viewType === "table" && filteredOrders && filteredOrders.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
            <div className="flex items-center justify-between text-xs">
              <div className="text-gray-600">
                {agriDispatchStatusFilter === "OUTSTANDING" ? (
                  <>
                    Showing <span className="font-semibold">{((outstandingPage - 1) * outstandingPerPage) + 1}</span> to{' '}
                    <span className="font-semibold">{Math.min(outstandingPage * outstandingPerPage, outstandingTotal)}</span> of{' '}
                    <span className="font-semibold">{outstandingTotal}</span> outstanding orders
                  </>
                ) : (
                  <>
                    Showing <span className="font-semibold">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? 's' : ''}
                    {showAgriSalesOrders && agriDispatchStatusFilter !== "ALL" && (
                      <span className="text-gray-400 ml-1">(filtered from {orders.length} total)</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <div>
                  Total: <span className="font-semibold text-gray-900">
                    ₹{filteredOrders.reduce((sum, o) => {
                      const total = parseFloat(o.total.replace(/[₹,\s]/g, '')) || 0
                      return sum + total
                    }, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  Paid: <span className="font-semibold text-green-600">
                    ₹{filteredOrders.reduce((sum, o) => {
                      const paid = parseFloat(o["Paid Amt"].replace(/[₹,\s]/g, '')) || 0
                      return sum + paid
                    }, 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  Remaining: <span className="font-semibold text-amber-600">
                    ₹{filteredOrders.reduce((sum, o) => {
                      const remaining = parseFloat(o["remaining Amt"].replace(/[₹,\s]/g, '')) || 0
                      return sum + remaining
                    }, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            {/* Pagination for Outstanding Orders */}
            {agriDispatchStatusFilter === "OUTSTANDING" && outstandingTotal > outstandingPerPage && (
              <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-300">
                <button
                  onClick={() => setOutstandingPage(prev => Math.max(1, prev - 1))}
                  disabled={outstandingPage === 1}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    outstandingPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}>
                  Previous
                </button>
                <span className="text-xs text-gray-600 px-3">
                  Page {outstandingPage} of {Math.ceil(outstandingTotal / outstandingPerPage)}
                </span>
                <button
                  onClick={() => setOutstandingPage(prev => prev + 1)}
                  disabled={outstandingPage * outstandingPerPage >= outstandingTotal}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    outstandingPage * outstandingPerPage >= outstandingTotal
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grid View */}
        {viewType === "grid" && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filteredOrders && filteredOrders.length > 0 ? (
                filteredOrders.map((row, index) => {
                  const farmerDetails = row?.details?.farmer
                  // For Ram Agri sales orders, use customerTaluka and customerVillage
                  const farmerLocation = row.isAgriSalesOrder || row.details?.isRamAgriProduct
                    ? (row.details?.customerTaluka && row.details?.customerVillage
                        ? `${row.details.customerTaluka} → ${row.details.customerVillage}`
                        : row.details?.customerTaluka || row.details?.customerVillage || null)
                    : (farmerDetails
                        ? [farmerDetails.district, farmerDetails.village].filter(Boolean).join(" → ")
                        : null)

                  return (
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
                      <div className="p-3 border-b border-gray-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-sm">Order #{(row.isAgriSalesOrder || row.details?.isRamAgriProduct) ? String(row.order).padStart(5, '0') : row.order}</h3>
                            </div>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {row.details?.orderFor ? (
                                <>
                                  <span className="text-xs text-gray-500">Farmer:</span>
                                  <span className={`text-xs font-medium farmer-name-highlight`}>
                                    {row.details.farmer?.name || "Unknown"}
                                  </span>
                                  <span className="text-xs text-gray-500">| Order For:</span>
                                  <span className={`text-xs font-medium order-for-highlight`}>
                                    {row.details.orderFor.name}
                                  </span>
                                </>
                              ) : (
                                <span className={`text-xs font-medium farmer-name-highlight`}>
                                  {row.farmerName}
                                </span>
                              )}
                            </div>
                            {row.details?.salesPerson && (
                              <p className="text-xs text-brand-600 mt-1 font-medium">
                                Booked by: {row.details.salesPerson.name}
                                {row.details.salesPerson.jobTitle === "DEALER" && " (Dealer)"}
                              </p>
                            )}
                            {farmerLocation && (
                              <p className="text-xs text-gray-500 mt-1 font-medium truncate">{farmerLocation}</p>
                            )}
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
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                              />
                            )}
                            {!(row.isAgriSalesOrder || row.details?.isRamAgriProduct) && (
                              <DownloadPDFButton order={row} />
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center justify-between mt-2">
                          {/* Show dropdown for non-COMPLETED Agri Sales orders, static badge for COMPLETED */}
                          {showAgriSalesOrders ? (
                            row.orderStatus === "COMPLETED" ? (
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`status-badge-enhanced status-${row.orderStatus
                                    .toLowerCase()
                                    .replace("_", "-")} flex items-center gap-1`}>
                                  {row.orderStatus === "FARM_READY" && "🌱"}
                                  {row.orderStatus === "DISPATCH_PROCESS" ? "Loading" : row.orderStatus}
                                </span>
                                {/* Show outstanding indicator for COMPLETED orders with balance */}
                                {agriDispatchStatusFilter === "OUTSTANDING" && (
                                  <span className="text-[9px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded inline-block w-fit">
                                    💰 Outstanding
                                  </span>
                                )}
                              </div>
                            ) : (
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
                            )
                          ) : row.orderStatus !== "COMPLETED" && row.orderStatus !== "DISPATCHED" ? (
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
                            <div className="flex flex-col gap-1">
                              <span
                                className={`status-badge-enhanced status-${row.orderStatus
                                  .toLowerCase()
                                  .replace("_", "-")} flex items-center gap-1`}>
                                {row.orderStatus === "FARM_READY" && "🌱"}
                                {row.orderStatus === "DISPATCH_PROCESS" ? "Loading" : row.orderStatus}
                              </span>
                              {/* Show outstanding indicator for COMPLETED orders with balance */}
                              {row.orderStatus === "COMPLETED" && agriDispatchStatusFilter === "OUTSTANDING" && (
                                <span className="text-[9px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded inline-block w-fit">
                                  💰 Outstanding
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-3 space-y-2">
                        {/* Plant Info */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Plant Type</span>
                          <span className="text-xs font-medium text-gray-900 truncate ml-2">{row.plantType}</span>
                        </div>

                        {/* Quantity & Rate */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-gray-500">Total Plants</span>
                            {/* Show final quantity for completed Agri Sales orders */}
                            {row.isAgriSalesOrder && row.orderStatus === "COMPLETED" && row.details?.deliveredQuantity > 0 ? (
                              <>
                                <div className="text-sm font-medium text-green-700">
                                  Final: {row.details.deliveredQuantity?.toLocaleString()}
                                </div>
                                {row.details.returnQuantity > 0 && (
                                  <div className="text-xs text-red-600 mt-0.5">
                                    Returned: {row.details.returnQuantity?.toLocaleString()}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Original: {row.quantity?.toLocaleString()}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm font-medium text-gray-900">
                                  {(row.totalPlants ?? row.quantity)?.toLocaleString()}
                                </div>
                                {row.additionalPlants > 0 && (
                                  <div className="text-xs text-brand-600 mt-0.5">
                                    Base: {row.basePlants?.toLocaleString()} &middot; Extra: +
                                    {row.additionalPlants?.toLocaleString()}
                                  </div>
                                )}
                                {row["remaining Plants"] < (row.totalPlants ?? row.quantity) && (
                                  <div className="text-xs text-orange-600 mt-0.5">
                                    Remaining: {row["remaining Plants"]?.toLocaleString()}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Rate</span>
                            <div className="text-sm font-medium text-gray-900">₹{row.rate}</div>
                          </div>
                        </div>

                        {/* Financial Info */}
                        <div className="bg-gray-50 rounded-md p-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Total</span>
                            <span className="text-xs font-semibold text-gray-900">{row.total}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Paid</span>
                            <span className="text-xs text-green-600">{row["Paid Amt"]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-500">Remaining</span>
                            <span className="text-xs text-amber-600">{row["remaining Amt"]}</span>
                          </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Delivery Period</span>
                            <span className="text-xs font-medium text-brand-600">{row.Delivery}</span>
                          </div>
                          {row.deliveryDate && row.deliveryDate !== "-" && (
                            <div className="bg-brand-50 rounded-md p-1.5 border border-brand-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-brand-700 font-medium flex items-center">
                                  📅 Delivery Date
                                </span>
                                <span className="text-xs font-semibold text-brand-800">
                                  {row.deliveryDate}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Farm Ready Date Display */}
                        {row["Farm Ready"] !== "-" && (
                          <div className="flex items-center justify-between bg-green-50 rounded-md p-1.5 border border-green-200">
                            <span className="text-xs text-green-700 font-medium flex items-center">
                              🌱 Farm Ready Date
                            </span>
                            <span className="text-xs font-semibold text-green-800">
                              {row["Farm Ready"]}
                            </span>
                          </div>
                        )}

                        {/* Dispatch Details */}
                        {(row.orderStatus === "DISPATCHED" || row.orderStatus === "DISPATCH_PROCESS") && row.details?.dispatchHistory && row.details.dispatchHistory.length > 0 && (() => {
                          const latestDispatch = row.details.dispatchHistory[row.details.dispatchHistory.length - 1];
                          const driverName = latestDispatch?.dispatch?.driverName || latestDispatch?.driverName || 'N/A';
                          const vehicleName = latestDispatch?.dispatch?.vehicleName || latestDispatch?.vehicleName || 'N/A';
                          const transportId = latestDispatch?.dispatch?.transportId || latestDispatch?.transportId;
                          const driverPhone = latestDispatch?.dispatch?.driverPhone || latestDispatch?.driverPhone;
                          
                          if (driverName === 'N/A' && vehicleName === 'N/A') return null;
                          
                          return (
                            <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-lg p-2 border-l-4 border-brand-500 shadow-sm">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-sm">🚚</span>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-bold text-brand-900">{driverName}</span>
                                  {driverPhone && <span className="text-gray-600">({driverPhone})</span>}
                                  <span className="text-brand-600 font-bold">→</span>
                                  <span className="font-semibold text-gray-800">🚗 {vehicleName}</span>
                                  {transportId && (
                                    <>
                                      <span className="text-brand-600 font-bold">→</span>
                                      <span className="text-[10px] font-mono font-bold text-white bg-brand-600 px-1.5 py-0.5 rounded">
                                        #{transportId}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action Buttons */}
                        {viewMode !== "dispatch_process" &&
                          row?.orderStatus !== "COMPLETED" &&
                          row?.orderStatus !== "DISPATCH_PROCESS" &&
                          row?.orderStatus !== "DISPATCHED" && (
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              {isDispatchManager && (
                                <span className="text-xs text-brand-600 font-medium">🚚 DM Access</span>
                              )}
                              <div className="flex items-center space-x-2 ml-auto">
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
                            </div>
                          )}
                      </div>
                    </div>
                  )
                })
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
          </div>
        )}
            </>
          )
        })()}
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
              className="bg-brand-600 text-white px-4 py-2 rounded-md shadow hover:bg-brand-700 transition-colors flex items-center space-x-2">
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
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Order #{selectedOrder.order}</h2>
                  <p className="text-brand-100 text-sm mt-1">
                    {selectedOrder.farmerName} • {selectedOrder.plantType}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshModalData}
                    className="text-white hover:text-brand-100 transition-colors p-1 rounded hover:bg-white hover:bg-opacity-10">
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOrderModalOpen(false)
                      setSelectedOrder(null)
                      setShowPaymentForm(false)
                      setExpandedAddPaymentAccordion(false)
                      setUpdatedObject(null)
                      setSlots([])
                      resetPaymentForm(false)
                    }}
                    className="text-white hover:text-brand-100 transition-colors">
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
                  <div className="bg-brand-50 rounded-lg p-3 border border-brand-200">
                    <div className="text-brand-600 text-xs font-medium">Total Value</div>
                    <div className="text-lg font-bold text-brand-900">
                      ₹{(selectedOrder.rate * selectedOrderCounts.total).toLocaleString()}
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
                        selectedOrder.rate * selectedOrderCounts.total -
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
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaUser size={14} className="mr-1" />
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("payments")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "payments"
                            ? "border-brand-500 text-brand-600"
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
                                quantity: selectedOrderCounts.base,
                              bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
                              deliveryDate: selectedOrder?.details?.deliveryDate 
                                ? new Date(selectedOrder.details.deliveryDate) 
                                : null
                            })
                          }
                        }}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "edit"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaEdit size={14} className="mr-1" />
                        Edit Order
                      </button>
                      <button
                        onClick={() => setActiveTab("remarks")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "remarks"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaFileAlt size={14} className="mr-1" />
                        Remarks
                      </button>
                      <button
                        onClick={() => setActiveTab("dispatchTrail")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "dispatchTrail"
                            ? "border-brand-500 text-brand-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <span className="mr-1">🚚</span>
                        Dispatch Trail
                      </button>
                      <button
                        onClick={() => setActiveTab("editHistory")}
                        className={`inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "editHistory"
                            ? "border-brand-500 text-brand-600"
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
                              {selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct
                                ? "Customer Information"
                                : selectedOrder?.details?.orderFor 
                                ? "Order For Information" 
                                : "Farmer Information"}
                            </h3>
                            <div className="space-y-3">
                              {selectedOrder?.isAgriSalesOrder || selectedOrder?.details?.isRamAgriProduct ? (
                                <>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Customer Name</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.customerName || selectedOrder?.farmerName}
                                    </span>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-medium">Mobile Number</span>
                                    <span className="font-medium text-sm text-gray-900">
                                      {selectedOrder?.details?.customerMobile || "-"}
                                    </span>
                                  </div>
                                  {(selectedOrder?.details?.customerTaluka || selectedOrder?.details?.customerVillage) && (
                                    <div className="flex flex-col space-y-1">
                                      <span className="text-xs text-gray-500 font-medium">Location</span>
                                      <span className="font-medium text-sm text-gray-900">
                                        {selectedOrder?.details?.customerTaluka && selectedOrder?.details?.customerVillage
                                          ? `${selectedOrder.details.customerTaluka} → ${selectedOrder.details.customerVillage}`
                                          : selectedOrder?.details?.customerTaluka || selectedOrder?.details?.customerVillage || "-"}
                                      </span>
                                    </div>
                                  )}
                                  {selectedOrder?.details?.customerDistrict && (
                                    <div className="flex flex-col space-y-1">
                                      <span className="text-xs text-gray-500 font-medium">District</span>
                                      <span className="font-medium text-sm text-gray-900">
                                        {selectedOrder?.details?.customerDistrict}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : selectedOrder?.details?.orderFor ? (
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
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-gray-200">
                              <h3 className="font-semibold text-gray-900 text-sm flex items-center">
                                <span className="mr-2 text-green-600">🌾</span>
                                Farmer Details
                              </h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <tbody className="divide-y divide-gray-200">
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3 bg-gray-50">
                                      Farmer Name
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {selectedOrder?.details?.farmer?.name || "-"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                      Booking Date | Mobile Number | Placed For
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className="text-gray-500 text-xs">📅</span>
                                          <span>{selectedOrder?.orderDate || (selectedOrder?.details?.orderBookingDate ? moment(selectedOrder.details.orderBookingDate).format("DD MMM YYYY") : (selectedOrder?.details?.createdAt ? moment(selectedOrder.details.createdAt).format("DD MMM YYYY") : "-"))}</span>
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="inline-flex items-center gap-1.5">
                                          <span className="text-gray-500 text-xs">📱</span>
                                          <span>{selectedOrder?.details?.farmer?.mobileNumber || "-"}</span>
                                        </span>
                                        {selectedOrder?.details?.orderFor && (
                                          <>
                                            <span className="text-gray-300">|</span>
                                            <span className="inline-flex items-center gap-1.5">
                                              <span className="text-gray-500 text-xs">👤</span>
                                              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
                                                {selectedOrder?.details?.orderFor?.name}
                                              </span>
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {selectedOrder?.details?.farmer?.taluka && (
                                    <tr className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                        Taluka
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {selectedOrder?.details?.farmer?.taluka}
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                      Village
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {selectedOrder?.details?.farmer?.village || "-"}
                                    </td>
                                  </tr>
                                  <tr className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                      District
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {selectedOrder?.details?.farmer?.district || "-"}
                                    </td>
                                  </tr>
                                  {selectedOrder?.details?.farmer?.state && (
                                    <tr className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                                        State
                                      </td>
                                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {selectedOrder?.details?.farmer?.state}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
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
                                {selectedOrderCounts.total?.toLocaleString()}
                              </span>
                            </div>
                            {selectedOrder["remaining Plants"] < selectedOrderCounts.total && (
                              <div className="flex flex-col space-y-1 bg-orange-50 p-2 rounded border border-orange-200">
                                <span className="text-xs text-orange-700 font-medium">📦 Remaining to Dispatch</span>
                                <span className="font-bold text-sm text-orange-900">
                                  {selectedOrder["remaining Plants"]?.toLocaleString()} plants
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
                              <div className="flex flex-col space-y-1 bg-brand-50 p-2 rounded border border-brand-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-brand-700 font-medium">📅 Delivery Date</span>
                                  <button
                                    onClick={() => {
                                      setActiveTab("edit")
                                      const { base } = resolvePlantCounts(selectedOrder)
                                      setUpdatedObject({
                                        rate: selectedOrder.rate,
                                        quantity: base,
                                        bookingSlot: selectedOrder?.details?.bookingSlot?.slotId,
                                        deliveryDate: selectedOrder?.details?.deliveryDate 
                                          ? new Date(selectedOrder.details.deliveryDate) 
                                          : null
                                      })
                                    }}
                                    className="text-xs text-brand-600 hover:text-brand-800 underline">
                                    Change
                                  </button>
                                </div>
                                <span className="font-bold text-sm text-brand-900">
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
                                            ? moment(change.createdAt).format("DD MMM YYYY HH:mm")
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
                            <div className="bg-brand-50 rounded-lg p-3 border border-brand-200">
                              <h3 className="font-medium text-brand-900 mb-2 flex items-center text-sm">
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
                                          {moment(change.changedAt).format("DD MMM YYYY HH:mm")}
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
                                            {moment(change.changedAt).format("DD MMM YYYY")}
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
                            <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                              <h3 className="font-medium text-brand-900 mb-3 flex items-center">
                                <span className="mr-2">🚚</span>
                                Dispatch History
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Total Plants</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {selectedOrderCounts.total?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Dispatched Plants</div>
                                  <div className="text-xl font-bold text-brand-600">
                                    {(selectedOrderCounts.total - (selectedOrder["remaining Plants"] || 0))?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Remaining to Dispatch</div>
                                  <div className="text-xl font-bold text-orange-600">
                                    {selectedOrder["remaining Plants"]?.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {(selectedOrder.details.dispatchHistory || []).map(
                                  (dispatchItem, dispatchIndex) => (
                                    <div key={dispatchIndex} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-brand-600">
                                          {dispatchItem.quantity} plants dispatched
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {dispatchItem.date
                                            ? moment(dispatchItem.date).format("DD MMM YYYY HH:mm")
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
                                    {selectedOrderCounts.total?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Returned Plants</div>
                                  <div className="text-xl font-bold text-red-600">
                                    {selectedOrder["returned Plants"]?.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Remaining Plants</div>
                                  <div className="text-xl font-bold text-green-600">
                                    {selectedOrder["remaining Plants"]?.toLocaleString()}
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
                                            ? moment(returnItem.date).format("DD MMM YYYY")
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
                      <div className="space-y-2">
                        <Accordion defaultExpanded sx={{ boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: 1, "&:before": { display: "none" } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f9fafb", minHeight: 48 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                              <Typography variant="subtitle2" fontWeight={600} color="text.primary">Payment Status</Typography>
                              <Typography variant="body2" color="text.secondary">Total: ₹{paymentSummary?.total?.toLocaleString()} · Paid: ₹{paymentSummary?.paid?.toLocaleString()} · Balance: ₹{paymentSummary?.balance?.toLocaleString()}</Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ py: 1 }}>
                            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                              <Box><Typography variant="caption" color="text.secondary">Total</Typography><Typography fontWeight={600}>₹{paymentSummary?.total?.toLocaleString()}</Typography></Box>
                              <Box><Typography variant="caption" color="text.secondary">Paid</Typography><Typography fontWeight={600} color="success.main">₹{paymentSummary?.paid?.toLocaleString()}</Typography></Box>
                              <Box><Typography variant="caption" color="text.secondary">Balance</Typography><Typography fontWeight={600} color={paymentSummary?.balance > 0 ? "warning.main" : "text.primary"}>₹{paymentSummary?.balance?.toLocaleString()}</Typography></Box>
                            </Box>
                          </AccordionDetails>
                        </Accordion>

                        <Accordion
                          expanded={expandedAddPaymentAccordion}
                          onChange={(_, expanded) => {
                            setExpandedAddPaymentAccordion(expanded)
                            if (expanded) {
                              if (!showPaymentForm) initializePaymentForm()
                              setShowPaymentForm(true)
                            } else {
                              setShowPaymentForm(false)
                            }
                          }}
                          sx={{ boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: 1, "&:before": { display: "none" } }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#f0fdf4", minHeight: 48 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} color="success.dark">Add Payment</Typography>
                              {canAddPayment && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (!expandedAddPaymentAccordion) { if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); } }}
                                  className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
                                >
                                  + Add Payment
                                  {isOfficeAdmin && <span className="ml-1 text-xs">(PENDING only)</span>}
                                </button>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ bgcolor: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
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
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
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
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
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
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1">
                                  <option value="">Select Mode</option>
                                  <option value="Cash">Cash</option>
                                  <option value="UPI">UPI</option>
                                  <option value="Cheque">Cheque</option>
                                  <option value="NEFT/RTGS">NEFT/RTGS</option>
                                  <option value="1341">1341</option>
                                  <option value="434">434</option>
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
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                  placeholder={
                                    newPayment.modeOfPayment === "Cheque" ||
                                    newPayment.modeOfPayment === "NEFT/RTGS"
                                      ? "Enter bank name"
                                      : "N/A"
                                  }
                                  disabled={
                                    newPayment.modeOfPayment !== "Cheque" &&
                                    newPayment.modeOfPayment !== "NEFT/RTGS"
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
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                                placeholder="Optional remark"
                              />
                            </div>

                            {/* Payment Receipt Photo Upload */}
                            <div className="mt-4">
                              <label className="text-sm text-gray-500 font-medium">
                                Payment Receipt Photo {newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS" ? "*" : "(Optional)"}
                              </label>
                              <div className="mt-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files)
                                    if (files.length > 0) {
                                      try {
                                        setLoading(true)
                                        // Upload each file to the media endpoint and get URLs
                                        const uploadedUrls = await Promise.all(
                                          files.map(async (file) => {
                                            const formData = new FormData()
                                            formData.append("media_key", file)
                                            formData.append("media_type", "IMAGE")
                                            formData.append("content_type", "multipart/form-data")
                                            
                                            const instance = NetworkManager(API.MEDIA.UPLOAD)
                                            const response = await instance.request(formData)
                                            return response.data.media_url
                                          })
                                        )
                                        handlePaymentInputChange("receiptPhoto", uploadedUrls)
                                        Toast.success("Images uploaded successfully")
                                      } catch (error) {
                                        console.error("Error uploading images:", error)
                                        Toast.error("Failed to upload images")
                                      } finally {
                                        setLoading(false)
                                      }
                                    }
                                  }}
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                                />
                                {newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS" && (
                                  <p className="text-xs text-red-600 mt-1">
                                    Payment image is mandatory for {newPayment.modeOfPayment} payments
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  Upload payment confirmation screenshots or photos
                                </p>
                                {/* Show preview of uploaded images */}
                                {newPayment.receiptPhoto && newPayment.receiptPhoto.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {newPayment.receiptPhoto.map((photo, index) => (
                                      <div key={index} className="relative">
                                        <img
                                          src={photo}
                                          alt={`Receipt ${index + 1}`}
                                          className="w-16 h-16 object-cover rounded border"
                                        />
                                        <button
                                          onClick={() => {
                                            const updatedPhotos = newPayment.receiptPhoto.filter((_, i) => i !== index)
                                            handlePaymentInputChange("receiptPhoto", updatedPhotos)
                                          }}
                                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
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
                                    <div className="mb-4 bg-brand-50 p-4 rounded-lg border border-brand-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-sm font-medium text-brand-900">
                                          Dealer Wallet: {selectedOrder?.details?.salesPerson?.name}
                                        </h5>
                                        {dealerWalletLoading && (
                                          <div className="text-xs text-brand-600">Loading...</div>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <div className="text-brand-600 font-medium">
                                            Available Balance
                                          </div>
                                          <div className="text-lg font-bold text-brand-900">
                                            ₹
                                            {(
                                              dealerWalletData?.financial?.availableAmount ?? 0
                                            )?.toLocaleString()}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-brand-600 font-medium">
                                            Total Orders
                                          </div>
                                          <div className="text-lg font-bold text-brand-900">
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
                                  <div className="bg-brand-50 p-4 rounded-xl border border-brand-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center mr-3">
                                          <FaCreditCard className="text-brand-600 text-sm" />
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-brand-900">
                                            Dealer Wallet Payment
                                          </div>
                                          <div className="text-xs text-brand-600">
                                            Sales Person:{" "}
                                            {selectedOrder?.details?.salesPerson?.name}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-brand-600">
                                          Available Balance
                                        </div>
                                        <div className="text-lg font-bold text-brand-900">
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
                                        className="mr-3 w-4 h-4 text-brand-600 bg-brand-100 border-brand-300 rounded focus:ring-brand-500"
                                      />
                                      <label
                                        htmlFor="dealerWalletPayment"
                                        className="text-brand-800 font-medium">
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
                                onClick={() => { setShowPaymentForm(false); setExpandedAddPaymentAccordion(false); }}
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
                          </AccordionDetails>
                        </Accordion>

                        <Accordion defaultExpanded sx={{ boxShadow: "none", border: "1px solid #e5e7eb", borderRadius: 1, "&:before": { display: "none" } }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "#fafafa", minHeight: 48 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", pr: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                Payment History {(selectedOrder?.details?.payment || []).length > 0 && `(${(selectedOrder.details.payment || []).length})`}
                              </Typography>
                              {canAddPayment && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); }}
                                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                  + Add Payment
                                </button>
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0 }}>
                            {selectedOrder?.details?.payment && selectedOrder.details.payment.length > 0 ? (
                              <div className="divide-y">
                                {(selectedOrder.details.payment || []).map((payment, pIndex) => (
                                  <div key={pIndex} className="p-3 hover:bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="text-base font-semibold text-gray-900">₹{payment.paidAmount}</span>
                                      <span className="text-xs text-gray-500">{payment.modeOfPayment}</span>
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${payment.paymentStatus === "COLLECTED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                        {payment.paymentStatus}
                                      </span>
                                      {payment.isWalletPayment && <span className="px-2 py-0.5 text-xs rounded-full bg-brand-100 text-brand-700">Wallet</span>}
                                      <span className="text-xs text-gray-500">{moment(payment.paymentDate).format("DD MMM YYYY")}</span>
                                    </div>
                                    {canAddPayment && (
                                      <button
                                        type="button"
                                        onClick={() => { if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); }}
                                        className="text-xs text-green-600 hover:text-green-700 font-medium"
                                      >
                                        + Add payment
                                      </button>
                                    )}
                                    {payment.remark && <div className="w-full text-xs text-gray-600 mt-1">Remark: {payment.remark}</div>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <Box sx={{ p: 2, textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary">No payments yet.</Typography>
                                {canAddPayment && (
                                  <button
                                    type="button"
                                    onClick={() => { if (!showPaymentForm) initializePaymentForm(); setShowPaymentForm(true); setExpandedAddPaymentAccordion(true); }}
                                    className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
                                  >
                                    + Add Payment
                                  </button>
                                )}
                              </Box>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      </div>
                    )}

                    {activeTab === "edit" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">Edit Order Details</h3>
                          {isDispatchManager && (
                            <span className="text-sm bg-brand-100 text-brand-800 px-3 py-1 rounded-full font-medium">
                              🚚 Dispatch Manager Access
                            </span>
                          )}
                        </div>
                        {isDispatchManager && (
                          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
                            <p className="text-sm text-brand-800">
                              <span className="font-semibold">🔑 Dispatch Manager Permissions:</span> You can change order status, delivery date, rate, and quantity for dispatch management.
                            </p>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-lg p-6">
                          {/* Current Order Information */}
                          {selectedOrder?.details?.bookingSlot && (
                            <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-200">
                              <h4 className="text-sm font-medium text-brand-900 mb-2">
                                Current Order Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-brand-700">Current Delivery Period:</span>{" "}
                                  {selectedOrder.details.bookingSlot.startDay} -{" "}
                                  {selectedOrder.details.bookingSlot.endDay}
                                </div>
                                <div>
                                  <span className="text-brand-700">Current Delivery Date:</span>{" "}
                                  {selectedOrder.deliveryDate || "Not set"}
                                </div>
                                <div>
                                  <span className="text-brand-700">Current Quantity:</span>{" "}
                                  {selectedOrderCounts.base?.toLocaleString()}
                                  {selectedOrderCounts.additional > 0 && (
                                    <span className="ml-2 text-sm text-brand-600">
                                      (+{selectedOrderCounts.additional?.toLocaleString()} extra, total{" "}
                                      {selectedOrderCounts.total?.toLocaleString()})
                                    </span>
                                  )}
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
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Quantity</label>
                              <input
                                type="number"
                                value={
                                  updatedObject?.quantity !== undefined
                                    ? updatedObject.quantity
                                    : selectedOrderCounts.base
                                }
                                onChange={(e) => handleInputChange(0, "quantity", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 mt-1"
                              />
                              {updatedObject?.quantity && (
                                <div className="mt-1">
                                  {Number(updatedObject.quantity) >
                                    Number(selectedOrderCounts.base) && (
                                    <div className="text-xs text-amber-600">
                                      ⚠️ Increasing quantity may affect slot capacity
                                    </div>
                                  )}
                                  {Number(updatedObject.quantity) <
                                    Number(selectedOrderCounts.base) && (
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (slots.length > 0) {
                                      setShowDeliveryDateModal(true)
                                    } else {
                                      Toast.info('No available slots found. Please select a different plant/subtype.')
                                    }
                                  }}
                                  className="w-full px-3 py-2 border rounded-lg mt-1 text-left hover:border-brand-500 focus:ring-2 focus:ring-brand-500 transition-colors bg-white"
                                  disabled={slots.length === 0}>
                                  <span className={updatedObject?.deliveryDate ? "text-gray-900" : "text-gray-400"}>
                                    {updatedObject?.deliveryDate 
                                      ? moment(updatedObject.deliveryDate).format("DD MMM YYYY")
                                      : "Click to select delivery date"}
                                  </span>
                                </button>
                              )}
                              {slots.length === 0 && !slotsLoading && (
                                <div className="text-xs text-red-500 mt-1">
                                  No available slots found for this plant/subtype combination
                                </div>
                              )}
                              {!slotsLoading && slots.length > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Click to select a delivery date from available slots
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
                                      <div className="mt-2 p-3 bg-brand-50 rounded-lg border border-brand-200">
                                        <div className="text-xs text-gray-700 space-y-2">
                                          <div className="font-medium text-brand-900">
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
                                if (updatedObject.quantity !== selectedOrderCounts.base) {
                                  changes.push(
                                    `Quantity: ${selectedOrderCounts.base} → ${updatedObject.quantity}`
                                  )
                                }
                                // Check if delivery date has changed
                                if (updatedObject.deliveryDate) {
                                  const currentDate = selectedOrder?.details?.deliveryDate 
                                    ? moment(selectedOrder.details.deliveryDate).format("DD MMM YYYY")
                                    : "Not set"
                                  const newDate = moment(updatedObject.deliveryDate).format("DD MMM YYYY")
                                  
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
                              className="px-4 py-2 text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
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
                              className="flex-grow px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                            />
                            <button
                              onClick={() => handleAddRemark(selectedOrder.details.orderid)}
                              disabled={!newRemark.trim()}
                              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
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
                                  {selectedOrderCounts.total?.toLocaleString()}
                                </div>
                              </div>
                              <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                                <div className="text-sm text-brand-600 mb-1">Total Dispatched</div>
                                <div className="text-2xl font-bold text-brand-900">
                                  {(selectedOrderCounts.total - (selectedOrder["remaining Plants"] || 0))?.toLocaleString()}
                                </div>
                                <div className="text-xs text-brand-600 mt-1">
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
                              <div className="p-3 border-b bg-brand-50">
                                <h4 className="font-medium text-brand-900 text-sm">Dispatch Timeline</h4>
                              </div>
                              <div className="p-4 space-y-4">
                                {(selectedOrder.details.dispatchHistory || []).map(
                                  (dispatchItem, dispatchIndex) => (
                                    <div 
                                      key={dispatchIndex} 
                                      className="relative pl-8 pb-6 border-l-2 border-brand-300 last:border-l-0 last:pb-0">
                                      {/* Timeline dot */}
                                      <div className="absolute left-0 top-0 -ml-2 w-4 h-4 bg-brand-600 rounded-full border-2 border-white"></div>
                                      
                                      <div className="bg-brand-50 p-4 rounded-lg border border-brand-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-brand-900">
                                              Dispatch #{dispatchIndex + 1}
                                            </span>
                                            <span className="px-2 py-1 bg-brand-200 text-brand-800 rounded text-xs font-medium">
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
                                          <div className="bg-white p-3 rounded border border-brand-100 mb-3">
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
                                            <div className="font-bold text-brand-600">
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
                                          <div className="mt-3 pt-3 border-t border-brand-100">
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

      {/* Delivery Date Picker Modal */}
      {showDeliveryDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📅</span>
                <h2 className="text-xl font-bold">Select Delivery Date</h2>
              </div>
              <button
                onClick={() => setShowDeliveryDateModal(false)}
                className="text-white hover:text-brand-100 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20">
                <XIcon size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
              {slots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Available Slots</h3>
                  <p className="text-gray-500">Please select a different plant/subtype combination</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {slots.map((slot) => {
                    if (!slot.startDay || !slot.endDay) return null

                    const slotStart = moment(slot.startDay, "DD-MM-YYYY")
                    const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
                    const dates = []
                    let currentDate = slotStart.clone()
                    const today = moment().startOf('day')

                    // Generate all dates in the slot
                    while (currentDate.isSameOrBefore(slotEnd, 'day')) {
                      if (currentDate.isSameOrAfter(today, 'day')) {
                        dates.push(currentDate.clone())
                      }
                      currentDate.add(1, 'day')
                    }

                    if (dates.length === 0) return null

                    return (
                      <div key={slot.value} className="border-b border-gray-200 pb-6 last:border-b-0">
                        {/* Slot Header */}
                        <div className="flex items-center mb-4 pb-3 border-b-2 border-brand-100">
                          <div className="w-2 h-2 rounded-full bg-brand-600 mr-3"></div>
                          <div className="flex-1">
                            <h3 className="text-base font-bold text-brand-600">
                              {slot.label}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Available: {slot.available} plants
                            </p>
                          </div>
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
                          {dates.map((date) => {
                            const isSelected = updatedObject?.deliveryDate && 
                              moment(updatedObject.deliveryDate).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
                            const isToday = date.isSame(today, 'day')

                            return (
                              <button
                                key={date.format('YYYY-MM-DD')}
                                type="button"
                                onClick={() => {
                                  setUpdatedObject({
                                    ...updatedObject,
                                    deliveryDate: date.toDate(),
                                    bookingSlot: slot.value
                                  })
                                  setShowDeliveryDateModal(false)
                                  Toast.success(`Delivery date set to ${date.format('DD MMM YYYY')}`)
                                }}
                                className={`
                                  relative p-3 rounded-2xl border-2 transition-all duration-200
                                  ${isSelected 
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-lg scale-105' 
                                    : isToday
                                      ? 'border-amber-400 bg-amber-50 text-gray-900 hover:bg-amber-100'
                                      : 'border-gray-200 bg-white text-gray-900 hover:border-brand-400 hover:bg-brand-50'
                                  }
                                `}>
                                <div className="flex flex-col items-center">
                                  <span className={`text-xs font-semibold uppercase ${isSelected ? 'text-brand-100' : 'text-gray-500'}`}>
                                    {date.format('ddd')}
                                  </span>
                                  <span className={`text-xl font-bold my-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                    {date.format('DD')}
                                  </span>
                                  <span className={`text-xs font-semibold uppercase ${isSelected ? 'text-brand-100' : 'text-gray-600'}`}>
                                    {date.format('MMM')}
                                  </span>
                                </div>
                                {isToday && !isSelected && (
                                  <div className="absolute top-1 right-1 bg-amber-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                    TODAY
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-white text-brand-600 rounded-full w-5 h-5 flex items-center justify-center">
                                    <CheckIcon size={12} />
                                  </div>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Helper Text */}
                  <div className="bg-brand-50 border-l-4 border-brand-600 p-4 rounded-r-lg">
                    <p className="text-sm text-brand-800">
                      💡 <span className="font-semibold">Tip:</span> Click on any date to select it as the delivery date. Only dates within available slots are shown.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Agri Sales Order Dialog */}
      <AddAgriSalesOrderForm
        open={showAddAgriSalesOrderForm}
        onClose={() => setShowAddAgriSalesOrderForm(false)}
        onSuccess={() => {
          setShowAddAgriSalesOrderForm(false)
          getOrders() // Refresh orders after creating
        }}
      />

      {/* Agri Sales Dispatch Modal */}
      {showAgriDispatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{agriDispatchForm.dispatchMode === "VEHICLE" ? "🚚" : "📦"}</span>
                <div>
                  <h2 className="text-lg font-bold">Dispatch Orders</h2>
                  <p className="text-sm text-brand-100">{selectedAgriSalesOrders.length} order(s) selected</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAgriDispatchModal(false)
                  setAgriDispatchForm({
                    dispatchMode: "VEHICLE",
                    vehicleId: "",
                    vehicleNumber: "",
                    driverName: "",
                    driverMobile: "",
                    courierName: "",
                    courierTrackingId: "",
                    courierContact: "",
                    dispatchNotes: "",
                  })
                }}
                className="text-white hover:text-brand-100 transition-colors p-2 rounded-full hover:bg-white hover:bg-opacity-20">
                <XIcon size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-6">
              {/* Selected Orders Summary */}
              <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-200">
                <h4 className="text-sm font-semibold text-brand-800 mb-2">Selected Orders</h4>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {orders
                    .filter((o) => selectedAgriSalesOrders.includes(o.details?.orderid))
                    .map((order) => (
                      <div key={order.details?.orderid} className="text-xs text-brand-700 flex justify-between">
                        <span className="font-medium">{order.order}</span>
                        <span>
                          {order.farmerName || order.details?.customerName}
                          {(order.details?.customerTaluka || order.details?.customerVillage) && (
                            <> • {order.details?.customerTaluka && order.details?.customerVillage
                              ? `${order.details.customerTaluka} → ${order.details.customerVillage}`
                              : order.details?.customerTaluka || order.details?.customerVillage}
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Dispatch Mode Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dispatch Mode *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAgriDispatchForm((prev) => ({ ...prev, dispatchMode: "VEHICLE" }))}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      agriDispatchForm.dispatchMode === "VEHICLE"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}>
                    <span className="text-xl">🚚</span>
                    <span className="font-medium">By Vehicle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgriDispatchForm((prev) => ({ ...prev, dispatchMode: "COURIER" }))}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                      agriDispatchForm.dispatchMode === "COURIER"
                        ? "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}>
                    <span className="text-xl">📦</span>
                    <span className="font-medium">By Courier</span>
                  </button>
                </div>
              </div>

              {/* Vehicle Mode Fields */}
              {agriDispatchForm.dispatchMode === "VEHICLE" && (
                <>
                  {/* Vehicle Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle</label>
                    <select
                      value={agriDispatchForm.vehicleId}
                      onChange={(e) => handleAgriVehicleSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500">
                      <option value="">-- Select or enter manually --</option>
                      {Array.isArray(agriVehicles) && agriVehicles.map((vehicle) => (
                        <option key={vehicle._id || vehicle.id} value={vehicle._id || vehicle.id}>
                          {vehicle.number} - {vehicle.name}
                          {vehicle.driverName && ` (${vehicle.driverName})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vehicle Number */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.vehicleNumber}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, vehicleNumber: e.target.value.toUpperCase() }))}
                      placeholder="e.g., MH12AB1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Driver Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.driverName}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, driverName: e.target.value }))}
                      placeholder="Enter driver name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>

                  {/* Driver Mobile */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Mobile *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.driverMobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setAgriDispatchForm((prev) => ({ ...prev, driverMobile: value }))
                      }}
                      placeholder="10 digit mobile number"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </>
              )}

              {/* Courier Mode Fields */}
              {agriDispatchForm.dispatchMode === "COURIER" && (
                <>
                  {/* Courier Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Courier Service Name *</label>
                    <input
                      type="text"
                      value={agriDispatchForm.courierName}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, courierName: e.target.value }))}
                      placeholder="e.g., DTDC, Blue Dart, Delhivery"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Tracking ID */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID / AWB Number</label>
                    <input
                      type="text"
                      value={agriDispatchForm.courierTrackingId}
                      onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, courierTrackingId: e.target.value.toUpperCase() }))}
                      placeholder="Enter tracking ID (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>

                  {/* Courier Contact */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Courier Contact Number</label>
                    <input
                      type="text"
                      value={agriDispatchForm.courierContact}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setAgriDispatchForm((prev) => ({ ...prev, courierContact: value }))
                      }}
                      placeholder="10 digit contact number (optional)"
                      maxLength={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </>
              )}

              {/* Dispatch Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes (Optional)</label>
                <textarea
                  value={agriDispatchForm.dispatchNotes}
                  onChange={(e) => setAgriDispatchForm((prev) => ({ ...prev, dispatchNotes: e.target.value }))}
                  placeholder="Any special instructions, delivery notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAgriDispatchModal(false)
                  setAgriDispatchForm({
                    dispatchMode: "VEHICLE",
                    vehicleId: "",
                    vehicleNumber: "",
                    driverName: "",
                    driverMobile: "",
                    courierName: "",
                    courierTrackingId: "",
                    courierContact: "",
                    dispatchNotes: "",
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAgriDispatch}
                disabled={
                  (agriDispatchForm.dispatchMode === "VEHICLE" && (
                    !agriDispatchForm.vehicleNumber ||
                    !agriDispatchForm.driverName ||
                    agriDispatchForm.driverMobile.length !== 10
                  )) ||
                  (agriDispatchForm.dispatchMode === "COURIER" && !agriDispatchForm.courierName) ||
                  agriDispatchLoading
                }
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 ${
                  agriDispatchForm.dispatchMode === "VEHICLE" 
                    ? "bg-brand-600 hover:bg-brand-700" 
                    : "bg-purple-600 hover:bg-purple-700"
                }`}>
                {agriDispatchLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    {agriDispatchForm.dispatchMode === "VEHICLE" ? "🚚" : "📦"} Dispatch {selectedAgriSalesOrders.length} Order(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agri Sales Complete Order Modal */}
      {showAgriCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Complete Orders</h3>
                  <p className="text-green-100 text-sm">{selectedAgriOrdersForComplete.length} order(s) • Mark as Delivered</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAgriCompleteModal(false)
                  setAgriCompleteForm({
                    returnQuantities: {},
                    returnReason: "",
                    returnNotes: "",
                  })
                }}
                className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Selected Orders with Return Quantity Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-green-700 mb-2">
                  ORDERS TO COMPLETE (Enter return quantity if any)
                </label>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {orders
                    .filter((o) => selectedAgriOrdersForComplete.includes(o.id || o._id || o.details?.orderid))
                    .map((order) => {
                      const orderId = order.id || order._id || order.details?.orderid
                      const orderQty = order.details?.quantity || order.quantity || 0
                      const returnQty = agriCompleteForm.returnQuantities[orderId] || 0
                      // For completed orders, show final quantity
                      const displayQty = (order.orderStatus === "COMPLETED" && order.details?.deliveredQuantity > 0) 
                        ? order.details.deliveredQuantity 
                        : orderQty
                      return (
                        <div
                          key={orderId}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-sm font-bold text-gray-900">{order.order || order.orderNumber}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {order.details?.farmer?.name || order.customerName || order.farmerName}
                                {(order.isAgriSalesOrder || order.details?.isRamAgriProduct)
                                  ? (order.details?.customerTaluka && order.details?.customerVillage
                                      ? ` • ${order.details.customerTaluka} → ${order.details.customerVillage}`
                                      : order.details?.customerTaluka || order.details?.customerVillage
                                        ? ` • ${order.details.customerTaluka || order.details.customerVillage}`
                                        : '')
                                  : (order.details?.farmer?.village ? ` • ${order.details.farmer.village}` : '')}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              order.orderStatus === "COMPLETED" && order.details?.deliveredQuantity > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-brand-100 text-brand-700"
                            }`}>
                              {order.orderStatus === "COMPLETED" && order.details?.deliveredQuantity > 0 
                                ? `Final Qty: ${displayQty}${order.details?.returnQuantity > 0 ? ` (Ret: ${order.details.returnQuantity})` : ""}`
                                : `Qty: ${orderQty}`
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 min-w-[80px]">Return Qty:</span>
                            <input
                              type="number"
                              min="0"
                              max={orderQty}
                              value={returnQty}
                              onChange={(e) => {
                                const value = Math.max(0, Math.min(orderQty, parseInt(e.target.value) || 0))
                                setAgriCompleteForm((prev) => ({
                                  ...prev,
                                  returnQuantities: {
                                    ...prev.returnQuantities,
                                    [orderId]: value,
                                  },
                                }))
                              }}
                              className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
                            />
                            <span className="text-xs text-gray-500">/ {orderQty}</span>
                            {returnQty > 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                Delivering: {orderQty - returnQty}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Return Reason (shown if any returns) */}
              {Object.values(agriCompleteForm.returnQuantities).some((q) => q > 0) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={agriCompleteForm.returnReason}
                    onChange={(e) => setAgriCompleteForm((prev) => ({ ...prev, returnReason: e.target.value }))}
                    placeholder="e.g., Damaged, Wrong product, Customer refused"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={agriCompleteForm.returnNotes}
                  onChange={(e) => setAgriCompleteForm((prev) => ({ ...prev, returnNotes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-xs font-medium text-green-700 block mb-1">SUMMARY</span>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Total Orders: {selectedAgriOrdersForComplete.length}</span>
                  <span>With Returns: {Object.values(agriCompleteForm.returnQuantities).filter((q) => q > 0).length}</span>
                </div>
                {Object.values(agriCompleteForm.returnQuantities).some((q) => q > 0) && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Returned stock will be added back to inventory
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  💰 Payment will be adjusted based on final delivered quantity (original - returns).
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAgriCompleteModal(false)
                  setAgriCompleteForm({
                    returnQuantities: {},
                    returnReason: "",
                    returnNotes: "",
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAgriCompleteOrders}
                disabled={agriCompleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                {agriCompleteLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    ✅ Complete {selectedAgriOrdersForComplete.length} Order(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Sales Person Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Assign to Sales Person</h3>
                  <p className="text-purple-100 text-sm">{selectedAgriSalesOrders.length} order(s) selected</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setAssignToUser("")
                  setAssignmentNotes("")
                }}
                className="text-white/80 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Info Banner */}
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700">
                  <strong>Note:</strong> Assigned orders will appear in the sales person&apos;s dispatch queue. 
                  Stock will be deducted when they dispatch the order.
                </p>
              </div>

              {/* Selected Orders Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xs font-medium text-gray-600 block mb-2">SELECTED ORDERS</span>
                <div className="max-h-[120px] overflow-y-auto space-y-1">
                  {orders
                    .filter((o) => selectedAgriSalesOrders.includes(o.id || o._id || o.details?.orderid))
                    .map((order) => (
                      <div key={order.id || order._id || order.details?.orderid} className="flex justify-between text-xs">
                        <span className="font-medium">{order.order || order.orderNumber}</span>
                        <span className="text-gray-500">
                          {order.details?.farmer?.name || order.customerName || order.farmerName} • ₹{(order.details?.totalAmount || order.totalAmount)?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Select Sales Person */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Sales Person <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignToUser}
                  onChange={(e) => setAssignToUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500">
                  <option value="">-- Select Sales Person --</option>
                  {ramAgriSalesUsers.map((user) => (
                    <option key={user.value} value={user.value}>
                      {user.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Any instructions for the sales person..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setAssignToUser("")
                  setAssignmentNotes("")
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAssignToSalesPerson}
                disabled={!assignToUser || assignLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2">
                {assignLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    👤 Assign {selectedAgriSalesOrders.length} Order(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmerOrdersTable
