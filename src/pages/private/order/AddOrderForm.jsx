import React, { useState, useEffect, useCallback } from "react"
import {
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Checkbox
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useSelector } from "react-redux"
import { makeStyles } from "tss-react/mui"
import useDebounce from "hooks/useDebounce"
import {
  Close as CloseIcon,
  Add as AddIcon,
  Person as PersonIcon,
  LocalShipping as ShippingIcon,
  Agriculture as PlantIcon,
  Assignment,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  FlashOn as FlashIcon
} from "@mui/icons-material"
import moment from "moment"
import LocationSelector from "components/LocationSelector"
import SearchableSelect from "components/FormField/SearchableSelect"

const useStyles = makeStyles()((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 12,
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
      maxHeight: "90vh",
      maxWidth: "95vw",
      width: "100%"
    }
  },
  dialogTitle: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "16px 24px",
    position: "relative",
    "& .MuiTypography-root": {
      fontSize: "1.25rem",
      fontWeight: 600
    }
  },
  closeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    color: "white",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.1)"
    }
  },
  formContainer: {
    padding: "20px 24px",
    maxWidth: 1000,
    margin: "0 auto",
    background: "#fafafa"
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 8,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #e8e8e8",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
    }
  },
  cardHeader: {
    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
    padding: "12px 16px",
    borderBottom: "1px solid #e0e0e0",
    borderRadius: "8px 8px 0 0"
  },
  sectionTitle: {
    color: "#2c3e50",
    fontWeight: 600,
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  orderTypeContainer: {
    marginBottom: 16
  },
  quotaTypeContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    border: "1px solid #e9ecef"
  },
  quotaInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
    border: "1px solid #2196f3",
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  submitButton: {
    marginTop: 16,
    padding: "12px 32px",
    fontSize: "1rem",
    borderRadius: 6,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "&:hover": {
      background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
    }
  },
  stepper: {
    padding: "16px 0",
    background: "transparent"
  },
  stepIcon: {
    backgroundColor: "#e0e0e0",
    "&.Mui-completed": {
      backgroundColor: "#4caf50"
    },
    "&.Mui-active": {
      backgroundColor: "#667eea"
    }
  },
  formSection: {
    padding: "8px",
    "& .MuiGrid-item": {
      marginBottom: 6
    }
  },
  infoChip: {
    margin: "4px 0",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    fontWeight: 500
  },
  successChip: {
    backgroundColor: "#e8f5e8",
    color: "#2e7d32",
    fontWeight: 500
  },
  warningChip: {
    backgroundColor: "#fff3e0",
    color: "#f57c00",
    fontWeight: 500
  },
  farmerInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#f0f8ff",
    borderRadius: 6,
    border: "1px solid #2196f3",
    marginBottom: 12
  },
  avatar: {
    backgroundColor: "#2196f3",
    width: 32,
    height: 32
  },
  slotInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    marginTop: 8
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    borderRadius: 12
  }
}))

const AddOrderForm = ({ open, onClose, onSuccess }) => {
  const { classes } = useStyles()
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const token = useSelector((state) => state?.app?.token)

  // Try to get user data from multiple sources
  const user = userData || appUser || {}

  // Form state
  const [formData, setFormData] = useState({
    date: new Date(),
    name: "",
    village: "",
    taluka: "",
    district: "",
    state: "",
    stateName: "",
    districtName: "",
    talukaName: "",
    mobileNumber: "",
    noOfPlants: "",
    typeOfPlant: "",
    rate: "",
    plant: "",
    subtype: "",
    orderDate: null, // Changed from selectedSlot to orderDate
    cavity: "",
    sales: null,
    dealer: null,
    // Order For fields
    orderForEnabled: false,
    orderForName: "",
    orderForAddress: "",
    orderForMobileNumber: ""
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [mobileLoading, setMobileLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [isInstantOrder, setIsInstantOrder] = useState(false) // Default to Normal Order
  const [bulkOrder, setBulkOrder] = useState(false)
  const [quotaType, setQuotaType] = useState(null) // "dealer" or "company"
  const [farmerData, setFarmerData] = useState({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState({})

  // Data state
  const [plants, setPlants] = useState([])
  const [subTypes, setSubTypes] = useState([])
  const [slots, setSlots] = useState([])
  const [sales, setSales] = useState([])
  const [dealers, setDealers] = useState([])

  const [cavities] = useState([
    { label: "10 Cavity", value: 10 },
    { label: "8 Cavity", value: 8 }
  ])
  const [dealerWallet, setDealerWallet] = useState({})
  const [rate, setRate] = useState(null)
  const [available, setAvailable] = useState(null)
  const [rateManuallySet, setRateManuallySet] = useState(false)

  // Payment Management State - Using same structure as FarmerOrdersTable
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

  const steps = [
    "Order Type",
    "Farmer Details",
    "Plant & Slot",
    "Payment Management",
    "Review & Submit"
  ]

  // Initialize form with user defaults
  useEffect(() => {
    if (user) {
      const { defaultState, defaultDistrict, defaultTaluka, defaultVillage } = user
      setFormData((prev) => ({
        ...prev,
        village: defaultVillage || "",
        state: defaultState || "Maharashtra",
        district: defaultDistrict || "",
        taluka: defaultTaluka || "",
        stateName: defaultState || "Maharashtra",
        districtName: defaultDistrict || "",
        talukaName: defaultTaluka || ""
      }))
    } else {
      // Set default state to Maharashtra even if no user
      setFormData((prev) => ({
        ...prev,
        state: "Maharashtra",
        stateName: "Maharashtra"
      }))
    }
  }, [user])

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  // Load dealer wallet if user is dealer
  useEffect(() => {
    if (user?.jobTitle === "DEALER" && user?._id) {
      loadDealerWallet(user._id)
    }
  }, [user])

  // Debounced mobile number for farmer lookup
  const debouncedMobileNumber = useDebounce(formData.mobileNumber, 500)

  // Auto-fill farmer data when mobile number is entered (with debouncing)
  useEffect(() => {
    if (debouncedMobileNumber?.length === 10) {
      setMobileLoading(true)
      getFarmerByMobile(debouncedMobileNumber)
    } else if (farmerData && debouncedMobileNumber?.length < 10) {
      resetFarmerData()
    }
  }, [debouncedMobileNumber])

  useEffect(() => {
    if (formData.plant) {
      loadSubTypes(formData.plant)
    }
  }, [formData.plant])

  useEffect(() => {
    if (formData.subtype) {
      loadSlots(formData.plant, formData.subtype)
    }
  }, [formData.subtype, quotaType, dealerWallet, formData.dealer])

  // Ensure wallet payment is unchecked for dealer orders
  useEffect(() => {
    if (bulkOrder && newPayment.isWalletPayment) {
      setNewPayment((prev) => ({ ...prev, isWalletPayment: false }))
    }
  }, [bulkOrder])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadPlants(), loadSales(), loadDealers()])
    } catch (error) {
      console.error("Error loading initial data:", error)
      Toast.error("Failed to load initial data")
    } finally {
      setLoading(false)
    }
  }

  const loadPlants = async () => {
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request()
      if (response?.data) {
        setPlants(
          response.data.map((plant) => ({
            label: plant.name,
            value: plant.plantId,
            sowingAllowed: plant.sowingAllowed || false // Track if sowing is allowed
          }))
        )
      }
    } catch (error) {
      console.error("Error loading plants:", error)
    }
  }

  const loadSubTypes = async (plantId) => {
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request(null, { plantId, year: 2025 })
      if (response?.data?.subtypes) {
        const subtypes = response.data.subtypes.map((subtype) => {
          // Handle rate as array - pick 0th element
          let rate = 0

          // Check multiple possible rate properties
          if (subtype.rates) {
            if (Array.isArray(subtype.rates)) {
              rate = subtype.rates.length > 0 ? subtype.rates[0] : 0
            } else {
              rate = subtype.rates
            }
          } else if (subtype.rate) {
            // Fallback to single rate property
            rate = subtype.rate
          }

          return {
            label: subtype.subtypeName,
            value: subtype.subtypeId,
            rate: rate
          }
        })
        setSubTypes(subtypes)
      } else {
        setSubTypes([])
      }
    } catch (error) {
      console.error("Error loading subtypes:", error)
      setSubTypes([])
    }
  }

  const loadSlots = async (plantId, subtypeId) => {
    try {
      console.log("Loading slots for plant:", plantId, "subtype:", subtypeId)

      // Check if dealer quota should be used
      const shouldUseDealerQuota =
        formData.dealer && quotaType === "dealer" && dealerWallet?.entries

      if (shouldUseDealerQuota) {
        console.log("Using dealer quota data for slots")

        // Filter dealer wallet entries for the selected plant and subtype
        const relevantEntries = dealerWallet.entries.filter(
          (entry) => entry.plantTypeId === plantId && entry.subTypeId === subtypeId
        )

        console.log("Relevant dealer quota entries:", relevantEntries)

        // Create slots from dealer quota data
        const dealerQuotaSlots = relevantEntries
          .map((entry) => {
            if (!entry.startDay || !entry.endDay) {
              return null
            }

            // Validate date format
            const startDateValid = moment(entry.startDay, "DD-MM-YYYY", true).isValid()
            const endDateValid = moment(entry.endDay, "DD-MM-YYYY", true).isValid()

            if (!startDateValid || !endDateValid) {
              return null
            }

            const start = moment(entry.startDay, "DD-MM-YYYY").format("D")
            const end = moment(entry.endDay, "DD-MM-YYYY").format("D")
            const monthYear = moment(entry.startDay, "DD-MM-YYYY").format("MMMM, YYYY")

            // Use dealer quota remaining quantity
            const available = entry.remainingQuantity || 0

            return {
              label: `${start} - ${end} ${monthYear} (${available} available - DEALER QUOTA)`,
              value: entry.bookingSlotId,
              availableQuantity: available,
              startDay: entry.startDay,
              endDay: entry.endDay,
              totalPlants: entry.quantity || 0,
              totalBookedPlants: entry.bookedQuantity || 0,
              isDealerQuota: true,
              dealerQuotaData: entry
            }
          })
          .filter((slot) => slot !== null && slot.availableQuantity > 0)

        console.log("Processed dealer quota slots:", dealerQuotaSlots)
        setSlots(dealerQuotaSlots)
        return
      }

      // Use regular slot loading for non-dealer quota
      console.log("Using regular slot loading")
      const instance = NetworkManager(API.slots.GET_PLANTS_SLOTS)
      const response = await instance.request(null, { plantId, subtypeId, year: 2025 })
      console.log("Slots API response:", response)

      // Handle both response structures: {slots: [{slots: [...]}]} and {slots: [...]}
      let slotsData = null
      if (response?.data?.slots) {
        if (Array.isArray(response.data.slots[0]?.slots)) {
          // Nested structure
          slotsData = response.data.slots[0].slots
        } else if (Array.isArray(response.data.slots)) {
          // Direct structure
          slotsData = response.data.slots
        }
      }

      if (slotsData) {
        console.log("Raw slots data:", slotsData.length, "slots")

        // Check if this plant has sowing allowed
        const selectedPlant = plants.find((p) => p.value === plantId)
        const isSowingAllowedPlant = selectedPlant?.sowingAllowed

        const processedSlots = slotsData
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
              availableQuantity: available,
              startDay,
              endDay,
              totalPlants,
              totalBookedPlants
            }
          })
          .filter((slot) => {
            // For sowing-allowed plants, show all slots (even with negative availability)
            // For regular plants, only show slots with positive availability
            return slot !== null && (isSowingAllowedPlant || slot.availableQuantity > 0)
          })

        console.log(`Processed ${processedSlots.length} slots (sowing-allowed: ${isSowingAllowedPlant})`)
        setSlots(processedSlots)
      } else {
        setSlots([])
      }
    } catch (error) {
      console.error("Error loading slots:", error)
      setSlots([])
    }
  }

  const loadSales = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const response = await instance.request(null, { jobTitle: "SALES" })
      if (response?.data?.data) {
        const salespeople = response.data.data.map((salesperson) => ({
          label: salesperson.name,
          value: salesperson._id
        }))
        setSales(salespeople)
      }
    } catch (error) {
      console.error("Error loading salespeople:", error)
    }
  }

  const loadDealers = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const response = await instance.request(null, { jobTitle: "DEALER" })

      if (response?.data?.data) {
        const dealersList = response.data.data.map((dealer) => ({
          label: dealer.name,
          value: dealer._id
        }))
        setDealers(dealersList)
      } else {
        setDealers([])
      }
    } catch (error) {
      console.error("Error loading dealers:", error)
      setDealers([])
    }
  }

  const loadDealerWallet = async (dealerId) => {
    try {
      console.log("=== loadDealerWallet DEBUG ===")
      console.log("Loading dealer wallet for dealer:", dealerId)
      console.log("API endpoint:", API.USER.GET_DEALER_WALLET_DETAILS)
      console.log("Current dealerWallet before API call:", dealerWallet)

      const instance = NetworkManager(API.USER.GET_DEALER_WALLET_DETAILS)
      const response = await instance.request(null, [dealerId])

      console.log("Full dealer wallet response:", response)
      console.log("Response data:", response?.data)
      console.log("Response data.plantDetails:", response?.data?.plantDetails)

      // Transform the API response to match expected structure
      // Check both possible structures
      const plantDetails = response.data?.plantDetails || response.data?.data?.plantDetails
      const financial = response.data?.financial || response.data?.data?.financial

      if (plantDetails) {
        console.log("Processing plantDetails from API response")

        // Transform plantDetails to wallet entries format with slot dates
        const entries = []
        plantDetails.forEach((plant) => {
          plant.slotDetails.forEach((slot) => {
            entries.push({
              plantTypeId: plant.plantType,
              subTypeId: plant.subType,
              bookingSlotId: slot.slotId,
              remainingQuantity: slot.remainingQuantity,
              quantity: slot.quantity,
              bookedQuantity: slot.bookedQuantity,
              // Include slot dates from the API response
              startDay: slot.dates?.startDay,
              endDay: slot.dates?.endDay,
              month: slot.dates?.month
            })
          })
        })

        const walletData = {
          entries,
          // Include financial data for wallet balance display
          availableAmount: financial?.availableAmount || 0,
          totalOrderAmount: financial?.totalOrderAmount || 0,
          totalPaidAmount: financial?.totalPaidAmount || 0,
          remainingAmount: financial?.remainingAmount || 0
        }
        console.log("Transformed wallet data with dates and financial:", walletData)
        setDealerWallet(walletData)
        console.log("Dealer wallet data set successfully")
        console.log("Wallet data after setDealerWallet:", walletData)

        // Create slot details from wallet data instead of calling separate API
        await createSlotDetailsFromWallet(entries)
      } else {
        console.log("No plantDetails found in response")
        setDealerWallet({})
      }
    } catch (error) {
      console.error("Error loading dealer wallet:", error)
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      setDealerWallet({})
    }
  }

  // Create slot details from dealer wallet entries (using dates from wallet data)
  const createSlotDetailsFromWallet = async (entries) => {
    try {
      console.log("=== createSlotDetailsFromWallet DEBUG ===")
      console.log("Creating slot details from wallet entries:", entries)

      // Get unique slot IDs from entries
      const slotIds = [...new Set(entries.map((entry) => entry.bookingSlotId))]
      console.log("Unique slot IDs to process:", slotIds)

      // Check which slots are already loaded
      const existingSlotIds = slots.map((slot) => slot.value)
      const missingSlotIds = slotIds.filter((id) => !existingSlotIds.includes(id))
      console.log("Missing slot IDs:", missingSlotIds)

      if (missingSlotIds.length === 0) {
        console.log("All slot details already loaded")
        return
      }

      // Create slot details from wallet data
      for (const slotId of missingSlotIds) {
        try {
          console.log("Processing slot details for slot ID:", slotId)

          // Find the entry with this slot ID
          const entry = entries.find((entry) => entry.bookingSlotId === slotId)

          if (entry && entry.startDay && entry.endDay && entry.month) {
            console.log("Found entry with dates:", entry)

            // Format the slot label with dates
            const startDate = moment(entry.startDay, "DD-MM-YYYY").format("D")
            const endDate = moment(entry.endDay, "DD-MM-YYYY").format("D")
            const monthYear = moment(entry.startDay, "DD-MM-YYYY").format("MMMM, YYYY")

            const slotDetail = {
              value: slotId,
              label: `${startDate} - ${endDate} ${monthYear} (${
                entry.remainingQuantity || 0
              } available)`,
              availableQuantity: entry.remainingQuantity || 0,
              startDay: entry.startDay,
              endDay: entry.endDay,
              totalPlants: entry.quantity || 0,
              totalBookedPlants: entry.bookedQuantity || 0
            }

            // Add to slots array if not already present
            if (!slots.find((slot) => slot.value === slotId)) {
              setSlots((prev) => [...prev, slotDetail])
              console.log("Added slot detail from wallet:", slotDetail)
            }
          } else {
            console.log("No date information found for slot ID:", slotId)
            // Fallback to placeholder
            const slotDetail = {
              value: slotId,
              label: `Slot ${slotId} (Date TBD)`,
              availableQuantity: entry?.remainingQuantity || 0
            }

            if (!slots.find((slot) => slot.value === slotId)) {
              setSlots((prev) => [...prev, slotDetail])
              console.log("Added fallback slot detail:", slotDetail)
            }
          }
        } catch (error) {
          console.error("Error processing slot details for slot ID:", slotId, error)
          // Fallback to placeholder on error
          const slotDetail = {
            value: slotId,
            label: `Slot ${slotId} (Error processing)`,
            availableQuantity: 0
          }

          if (!slots.find((slot) => slot.value === slotId)) {
            setSlots((prev) => [...prev, slotDetail])
            console.log("Added error fallback slot detail:", slotDetail)
          }
        }
      }
    } catch (error) {
      console.error("Error in createSlotDetailsFromWallet:", error)
    }
  }

  const getFarmerByMobile = async (mobileNumber) => {
    try {
      console.log("Fetching farmer by mobile:", mobileNumber)
      console.log("API endpoint:", API.FARMER.GET_FARMER_BY_MOBILE)
      const instance = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE)
      console.log("NetworkManager instance created")
      const response = await instance.request(null, [mobileNumber])
      console.log("Farmer API response:", response)

      if (response?.data?.data) {
        const farmer = response.data.data
        console.log("Farmer found:", farmer)
        setFarmerData(farmer)

        // Auto-fill taluka and village regardless of selection values
        const farmerTaluka = farmer.talukaName || farmer.taluka || ""
        const farmerVillage = farmer.village || ""
        const farmerDistrict = farmer.districtName || farmer.district || ""
        const farmerState = farmer.stateName || farmer.state || "Maharashtra"

        // Prefill all location fields when farmer is found
        setFormData((prev) => {
          const newFormData = {
            ...prev,
            name: farmer.name,
            village: farmerVillage,
            state: farmerState,
            district: farmerDistrict,
            taluka: farmerTaluka,
            stateName: farmerState,
            districtName: farmerDistrict,
            talukaName: farmerTaluka
          }

          console.log("Farmer data prefilled successfully")
          console.log("New form data:", newFormData)
          console.log("Prefilled location data:", {
            name: farmer.name,
            village: farmerVillage,
            state: farmerState,
            district: farmerDistrict,
            taluka: farmerTaluka
          })

          return newFormData
        })
      } else {
        console.log("No farmer found for mobile:", mobileNumber)
        // No farmer found - reset farmer data but keep Maharashtra as default state
        resetFarmerData()
      }
    } catch (error) {
      console.error("Error fetching farmer:", error)
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      // On error, reset farmer data but keep Maharashtra as default state
      resetFarmerData()
    } finally {
      setMobileLoading(false)
    }
  }

  const resetFarmerData = () => {
    setFarmerData({})
    setMobileLoading(false)
    const { defaultState, defaultDistrict, defaultTaluka, defaultVillage } = user || {}
    setFormData((prev) => ({
      ...prev,
      name: "",
      village: defaultVillage || "",
      state: defaultState || "Maharashtra",
      district: defaultDistrict || "",
      taluka: defaultTaluka || "",
      stateName: defaultState || "Maharashtra",
      districtName: defaultDistrict || "",
      talukaName: defaultTaluka || ""
    }))

    console.log("Farmer data reset, keeping default location data")
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
    return slot?.availableQuantity || null
  }

  const getRemainingQuantity = () => {
    if (!dealerWallet?.entries || !formData.plant || !formData.subtype || !formData.orderDate) {
      return null
    }

    // Get slot ID for the selected order date
    const slotId = getSlotIdForDate(formData.orderDate)
    if (!slotId) return null

    // Find the entry that matches plant, subtype, and slot
    const entry = dealerWallet.entries.find(
      (entry) =>
        entry.plantTypeId === formData.plant &&
        entry.subTypeId === formData.subtype &&
        entry.bookingSlotId === slotId
    )

    if (!entry) return null

    return entry.remainingQuantity || 0
  }

  // Get available plants for all slots when dealer quota is selected
  const getAvailablePlantsForSlots = () => {
    console.log("=== getAvailablePlantsForSlots DEBUG ===")
    console.log("quotaType:", quotaType)
    console.log("dealerWallet:", dealerWallet)
    console.log("dealerWallet?.entries:", dealerWallet?.entries)
    console.log("slots:", slots)
    console.log("formData.plant:", formData.plant)
    console.log("formData.subtype:", formData.subtype)

    if (!dealerWallet?.entries || quotaType !== "dealer") {
      console.log("Early return - no entries or wrong quota type")
      return []
    }

    const result = slots.map((slot) => {
      console.log(`Processing slot: ${slot.value} - ${slot.label}`)
      let entry = null

      // If plant and subtype are selected, find specific entry
      if (formData.plant && formData.subtype) {
        console.log("Looking for specific plant/subtype entry")
        entry = dealerWallet.entries.find(
          (entry) =>
            entry.plantTypeId === formData.plant &&
            entry.subTypeId === formData.subtype &&
            entry.bookingSlotId === slot.value
        )
        console.log("Specific entry found:", entry)
      } else {
        // If no plant/subtype selected, show all entries for this slot
        console.log("Looking for all entries in this slot")
        const slotEntries = dealerWallet.entries.filter(
          (entry) => entry.bookingSlotId === slot.value
        )
        console.log("Slot entries found:", slotEntries)
        if (slotEntries.length > 0) {
          // Sum up all available quantities for this slot
          const totalAvailable = slotEntries.reduce(
            (sum, entry) => sum + (entry.remainingQuantity || 0),
            0
          )
          entry = { remainingQuantity: totalAvailable }
          console.log("Total available for slot:", totalAvailable)
        }
      }

      const slotInfo = {
        slotId: slot.value,
        slotLabel: slot.label,
        availableInWallet: entry ? entry.remainingQuantity : 0,
        totalInSlot: slot.availableQuantity,
        hasQuota: !!entry,
        showAllPlants: !formData.plant || !formData.subtype
      }

      console.log("Slot info result:", slotInfo)
      return slotInfo
    })

    // Filter out slots with no available plants
    const filteredResult = result.filter((slotInfo) => {
      const hasAvailablePlants = slotInfo.availableInWallet > 0
      console.log(
        `Slot ${slotInfo.slotId}: ${slotInfo.availableInWallet} available - ${
          hasAvailablePlants ? "SHOWING" : "HIDING"
        }`
      )
      return hasAvailablePlants
    })

    console.log("Final filtered result:", filteredResult)
    return filteredResult
  }

  // Get total available plants in dealer quota for selected plant/subtype
  const getTotalAvailableInDealerQuota = () => {
    if (!dealerWallet?.entries || !formData.plant || !formData.subtype || quotaType !== "dealer") {
      return 0
    }

    return dealerWallet.entries
      .filter(
        (entry) => entry.plantTypeId === formData.plant && entry.subTypeId === formData.subtype
      )
      .reduce((total, entry) => total + (entry.remainingQuantity || 0), 0)
  }

  // Payment Management Functions - Using same flow as FarmerOrdersTable
  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => {
      const updatedPayment = { ...prev, [field]: value }

      // Update payment status when wallet payment is toggled
      if (field === "isWalletPayment") {
        const isWalletPayment = Boolean(value)
        updatedPayment.isWalletPayment = isWalletPayment

        // For OFFICE_ADMIN, always keep payment status as PENDING
        // For other roles (SUPER_ADMIN, ACCOUNTANT), keep as PENDING by default
        if (user?.role === "OFFICE_ADMIN") {
          updatedPayment.paymentStatus = "PENDING"
          console.log("OFFICE_ADMIN wallet payment - status set to PENDING")
        } else {
          updatedPayment.paymentStatus = "PENDING" // Default to PENDING for all roles
          console.log("Wallet payment toggled - status set to PENDING")
        }
      }

      return updatedPayment
    })
  }

  const getTotalPaidAmount = () => {
    return parseFloat(newPayment.paidAmount) || 0
  }

  const getTotalOrderAmount = () => {
    const quantity = parseInt(formData.noOfPlants) || 0
    const rate = parseFloat(formData.rate) || 0
    return quantity * rate
  }

  const getBalanceAmount = () => {
    return getTotalOrderAmount() - getTotalPaidAmount()
  }

  // Test function to debug payment API
  const testPaymentAPI = async (orderId) => {
    try {
      console.log("=== TESTING PAYMENT API ===")
      const testPayment = {
        paidAmount: 100,
        paymentDate: new Date().toISOString(),
        modeOfPayment: "Cash",
        bankName: "",
        remark: "Test payment",
        receiptPhoto: [],
        paymentStatus: "PENDING",
        isWalletPayment: false
      }

      const paymentInstance = NetworkManager(API.ORDER.ADD_PAYMENT)
      console.log("Test payment payload:", testPayment)
      console.log("Test order ID:", orderId)

      const response = await paymentInstance.request(testPayment, [orderId])
      console.log("Test payment response:", response)

      if (response?.data) {
        console.log("Test payment successful!")
        return true
      } else {
        console.error("Test payment failed:", response)
        return false
      }
    } catch (error) {
      console.error("Test payment error:", error)
      return false
    }
  }

  const handleInputChange = (field, value) => {
    console.log("=== handleInputChange DEBUG ===")
    console.log("Field:", field)
    console.log("Value:", value)

    // Handle Order For mobile number validation before setting form data
    let processedValue = value
    if (field === "orderForMobileNumber") {
      // Only allow numeric input and limit to 10 digits
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 10)
    }

    setFormData((prev) => ({
      ...prev,
      [field]: processedValue
    }))

    // Track if rate is manually set by user
    if (field === "rate") {
      setRateManuallySet(true)
      console.log("Rate manually set by user:", value)
    }

    // Handle location name fields for backend compatibility
    if (field === "state") {
      setFormData((prev) => ({
        ...prev,
        stateName: value
      }))
    } else if (field === "district") {
      setFormData((prev) => ({
        ...prev,
        districtName: value
      }))

      // Auto-fill taluka and village when district is selected (if farmer is not present)
      if (!farmerData?.name && value) {
        // We'll handle auto-filling in the LocationSelector component
        // by passing autoFill prop
      }
    } else if (field === "taluka") {
      setFormData((prev) => ({
        ...prev,
        talukaName: value
      }))

      // Auto-fill village when taluka is selected (if farmer is not present)
      if (!farmerData?.name && value) {
        // We'll handle auto-filling in the LocationSelector component
        // by passing autoFill prop
      }
    }

    // Auto-set rate when subtype is selected (only if rate is empty or hasn't been manually set)
    if (field === "subtype") {
      console.log("Subtype selected:", value)
      console.log("Available subtypes:", subTypes)
      console.log("Current rate in form:", formData.rate)
      const selectedSubtype = subTypes.find((st) => st.value === value)
      console.log("Selected subtype:", selectedSubtype)
      console.log("Selected subtype rate:", selectedSubtype?.rate)
      console.log("Selected subtype rate type:", typeof selectedSubtype?.rate)

      // Check if user is admin (can always edit rate)
      const isAdminUser =
        user?.jobTitle === "SUPERADMIN" ||
        user?.jobTitle === "OFFICE_ADMIN" ||
        user?.jobTitle === "ACCOUNTANT"

      // Only auto-set rate if current rate is empty or hasn't been manually set
      // For admin users, always allow rate editing regardless of manual setting
      const shouldAutoSetRate =
        (!formData.rate || formData.rate === "" || formData.rate === "0") &&
        (!rateManuallySet || isAdminUser)

      if (
        selectedSubtype &&
        selectedSubtype.rate !== undefined &&
        selectedSubtype.rate !== null &&
        shouldAutoSetRate
      ) {
        console.log("Auto-setting rate to:", selectedSubtype.rate)
        // Ensure rate is a number and convert to string for the form
        const rateValue =
          typeof selectedSubtype.rate === "number"
            ? selectedSubtype.rate
            : parseFloat(selectedSubtype.rate) || 0
        console.log("Processed rate value:", rateValue)
        setFormData((prev) => {
          const newFormData = {
            ...prev,
            rate: rateValue.toString(),
            orderDate: null // Reset order date when subtype changes (affects available slots)
          }
          console.log("Updated form data with rate:", newFormData)
          return newFormData
        })
        setRate(rateValue)
      } else if (!selectedSubtype || !selectedSubtype.rate) {
        console.log("No valid rate found for selected subtype")
        setFormData((prev) => ({
          ...prev,
          rate: "",
          orderDate: null // Reset order date when subtype changes (affects available slots)
        }))
        setRate(null)
      } else {
        console.log("Rate already set manually, not auto-setting from subtype")
        // Only reset order date, keep the current rate
        setFormData((prev) => ({
          ...prev,
          orderDate: null // Reset order date when subtype changes (affects available slots)
        }))
      }
    }

    // Reset rate when plant changes (only if rate was auto-set from subtype)
    if (field === "plant") {
      // Check if user is admin (can always edit rate)
      const isAdminUser =
        user?.jobTitle === "SUPERADMIN" ||
        user?.jobTitle === "OFFICE_ADMIN" ||
        user?.jobTitle === "ACCOUNTANT"

      setFormData((prev) => ({
        ...prev,
        rate: isAdminUser ? prev.rate : "", // Keep rate for admin users, reset for others
        subtype: "", // Also reset subtype when plant changes
        orderDate: null // Reset order date when plant changes (affects available slots)
      }))
      setRate(isAdminUser ? parseFloat(formData.rate) || null : null)
      setRateManuallySet(isAdminUser ? rateManuallySet : false) // Keep manual flag for admin users
      setSubTypes([]) // Clear subtypes when plant changes
    }

    // Set available quantity when order date is selected
    if (field === "orderDate") {
      const availableQty = getAvailableQuantityForDate(value)
      setAvailable(availableQty)
    }

    // Reset quota type when dealer changes and load dealer wallet
    if (field === "dealer") {
      console.log("=== Dealer Selection DEBUG ===")
      console.log("Dealer field changed, value:", value)
      console.log("Previous dealerWallet:", dealerWallet)
      setQuotaType(null)
      if (value) {
        console.log("Calling loadDealerWallet with dealer ID:", value)
        loadDealerWallet(value)
      } else {
        console.log("Clearing dealer wallet")
        setDealerWallet({})
      }
    }
  }

  const validateForm = () => {
    const requiredFields = ["noOfPlants", "plant", "subtype", "orderDate", "cavity"]

    // For bulk orders, don't require farmer details
    if (!bulkOrder) {
      requiredFields.push("name", "mobileNumber", "village", "taluka", "district", "state")
    }

    for (const field of requiredFields) {
      if (!formData[field]) {
        Toast.error(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`)
        return false
      }
    }

    // Only validate mobile number if it's provided and not a bulk order
    if (!bulkOrder && formData.mobileNumber && formData.mobileNumber.length !== 10) {
      Toast.error("Mobile number must be 10 digits")
      return false
    }

    // Only validate quota type for dealer non-bulk orders or when dealer is selected
    if (
      (user?.jobTitle === "DEALER" && !bulkOrder && !quotaType) ||
      (formData.dealer && !bulkOrder && !quotaType)
    ) {
      Toast.error("Please select quota type")
      return false
    }

    // Validate that a dealer or sales person is selected
    if (!formData.dealer && !formData.sales) {
      Toast.error("Please select either a dealer or sales person")
      return false
    }

    // Validate Order For fields if enabled
    if (formData.orderForEnabled) {
      if (!formData.orderForName || formData.orderForName.trim() === '') {
        Toast.error("Please enter name for the person the order is for")
        return false
      }
      if (!formData.orderForAddress || formData.orderForAddress.trim() === '') {
        Toast.error("Please enter address for the person the order is for")
        return false
      }
      if (!formData.orderForMobileNumber || 
          formData.orderForMobileNumber.length !== 10 || 
          !/^\d{10}$/.test(formData.orderForMobileNumber)) {
        Toast.error("Please enter a valid 10-digit mobile number for the person the order is for")
        return false
      }
    }

    // Validate dealer quota availability
    if (quotaType === "dealer" && formData.plant && formData.subtype && formData.orderDate) {
      const requestedQuantity = parseInt(formData.noOfPlants) || 0
      const availableQuantity = getRemainingQuantity()

      console.log("=== DEALER QUOTA VALIDATION ===")
      console.log("Requested quantity:", requestedQuantity)
      console.log("Available quantity:", availableQuantity)
      console.log("Quota type:", quotaType)
      console.log("Plant:", formData.plant)
      console.log("Subtype:", formData.subtype)
      console.log("Order date:", formData.orderDate)

      if (availableQuantity === null) {
        Toast.error("Unable to check dealer quota availability. Please try again.")
        return false
      }

      if (requestedQuantity > availableQuantity) {
        Toast.error(
          `Requested quantity (${requestedQuantity}) exceeds available dealer quota (${availableQuantity})`
        )
        return false
      }
    }

    // Validate slot capacity availability
    // Skip validation if plant has sowingAllowed (can grow on demand)
    const selectedPlant = plants.find((p) => p.value === formData.plant)
    const isSowingAllowedPlant = selectedPlant?.sowingAllowed

    if (formData.orderDate && formData.noOfPlants && !isSowingAllowedPlant) {
      const requestedQuantity = parseInt(formData.noOfPlants) || 0

      // Get slot ID for the selected order date
      const slotId = getSlotIdForDate(formData.orderDate)
      if (!slotId) {
        Toast.error("Selected date does not fall within any available slot. Please select a valid date.")
        return false
      }

      // Check if using dealer quota
      const selectedSlot = slots.find((s) => s.value === slotId)
      const isDealerQuotaSlot = selectedSlot?.isDealerQuota

      let availableQuantity = available
      let slotPeriod = ""

      if (isDealerQuotaSlot) {
        // Use dealer quota data
        availableQuantity = selectedSlot.availableQuantity
        slotPeriod = `${selectedSlot.startDay} - ${selectedSlot.endDay} (DEALER QUOTA)`
      } else if (available !== null) {
        // Use regular slot data
        availableQuantity = available
        slotPeriod = selectedSlot ? `${selectedSlot.startDay} - ${selectedSlot.endDay}` : ""
      }

      if (availableQuantity !== null && requestedQuantity > availableQuantity) {
        Toast.error(
          `⚠️ Slot Capacity Exceeded!\n\nOnly ${availableQuantity} plants available for ${moment(formData.orderDate).format("DD/MM/YYYY")} (slot: ${slotPeriod})\n\nPlease select a different date or reduce the order quantity.`,
          {
            duration: 8000,
            style: {
              background: "#fef2f2",
              color: "#dc2626",
              border: "2px solid #fecaca",
              borderRadius: "8px",
              fontSize: "14px",
              lineHeight: "1.5",
              whiteSpace: "pre-line"
            }
          }
        )
        return false
      }
    } else if (isSowingAllowedPlant) {
      console.log("🌱 Sowing-allowed plant - skipping availability validation (can grow on demand)")
    }

    // Payment validation (single payment object)
    if (newPayment.paidAmount && !newPayment.isWalletPayment && !newPayment.modeOfPayment) {
      Toast.error("Please select payment mode for the payment amount entered")
      return false
    }
    if (
      newPayment.modeOfPayment &&
      (!newPayment.paidAmount || parseFloat(newPayment.paidAmount) <= 0)
    ) {
      Toast.error("Please enter amount for the selected payment mode")
      return false
    }

    // Wallet payment validation for dealers
    if (
      (user?.jobTitle === "DEALER" ||
        user?.role === "SUPER_ADMIN" ||
        user?.role === "OFFICE_ADMIN" ||
        user?.role === "ACCOUNTANT") &&
      newPayment.isWalletPayment &&
      newPayment.paidAmount
    ) {
      const paymentAmount = parseFloat(newPayment.paidAmount)
      const walletBalance = dealerWallet?.availableAmount || 0

      if (paymentAmount > walletBalance) {
        Toast.error(
          `Payment amount (₹${paymentAmount.toLocaleString()}) exceeds wallet balance (₹${walletBalance.toLocaleString()})`
        )
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    // Show confirmation popup with farmer name and dates in bold
    const selectedPlant = plants.find((p) => p.value === formData.plant)
    const selectedSubtype = subTypes.find((s) => s.value === formData.subtype)
    // Get slot ID from order date
    const slotId = getSlotIdForDate(formData.orderDate)
    const selectedSlot = slots.find((s) => s.value === slotId)
    const selectedSales = sales.find((s) => s.value === formData.sales)
    const selectedDealer = dealers.find((d) => d.value === formData.dealer)

    setConfirmationData({
      farmerName: formData.name,
      mobileNumber: formData.mobileNumber,
      orderDate: formData.date,
      deliveryDate: formData.orderDate, // The specific delivery date selected by user
      plantName: selectedPlant?.label || "",
      plantSubtype: selectedSubtype?.label || "",
      numberOfPlants: formData.noOfPlants,
      rate: formData.rate,
      slotPeriod: selectedSlot ? `${selectedSlot.startDay} - ${selectedSlot.endDay}` : "",
      salesPerson: selectedDealer?.label || selectedSales?.label || "",
      location: `${formData.village}, ${formData.taluka}, ${formData.district}`,
      orderType: isInstantOrder ? "Instant Order" : bulkOrder ? "Bulk Order" : "Normal Order"
    })

    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false)
    setLoading(true)

    try {
      // Get slot ID from the selected order date
      const slotId = getSlotIdForDate(formData.orderDate)
      console.log("Creating order payload with bookingSlot:", slotId)
      console.log("Order date:", formData.orderDate)

      if (!slotId) {
        throw new Error("Could not determine slot for the selected date")
      }

      const selectedSlotDetails = slots.find((s) => s.value === slotId)
      console.log("Selected slot details:", selectedSlotDetails)

      if (!selectedSlotDetails) {
        throw new Error("Selected slot not found in available slots")
      }

      // Validate that the slot has valid dates
      if (!selectedSlotDetails.startDay || !selectedSlotDetails.endDay) {
        throw new Error("Selected slot has invalid date format")
      }

      // Validate that the slot ID is a valid ObjectId format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/
      if (!objectIdRegex.test(slotId)) {
        throw new Error("Selected slot ID is not in valid ObjectId format")
      }

      // Prepare Order For data if enabled
      const orderForData = formData.orderForEnabled ? {
        name: formData.orderForName.trim(),
        address: formData.orderForAddress.trim(),
        mobileNumber: parseInt(formData.orderForMobileNumber) || 0
      } : undefined

      let payload
      let endpoint

      if (bulkOrder) {
        // Bulk order payload - includes all fields but with dealer-specific logic
        payload = {
          name: formData.name,
          village: formData.village,
          taluka: formData.taluka,
          state: formData.state,
          district: formData.district,
          stateName: formData.stateName,
          districtName: formData.districtName,
          talukaName: formData.talukaName,
          mobileNumber: formData.mobileNumber,
          typeOfPlants: formData.typeOfPlant,
          numberOfPlants: parseInt(formData.noOfPlants),
          rate: parseFloat(formData.rate),
          paymentStatus: "not paid",
          orderStatus: isInstantOrder ? "DISPATCHED" : "ACCEPTED",
          plantName: formData.plant,
          plantSubtype: formData.subtype,
          bookingSlot: slotId, // Auto-detected slot ID from order date
          orderDate: formData.orderDate instanceof Date ? formData.orderDate.toISOString() : formData.orderDate,
          deliveryDate: formData.orderDate instanceof Date ? formData.orderDate.toISOString() : formData.orderDate,
          orderPaymentStatus: "PENDING",
          cavity: formData.cavity,
          orderBookingDate:
            formData.date instanceof Date ? formData.date.toISOString() : formData.date,
          dealerOrder: true,
          dealer: formData.dealer || formData.sales,
          // If dealer is selected, send dealer ID as salesPerson, otherwise send sales person ID
          salesPerson: formData.dealer || formData.sales
        }

        // Add company quota flag based on quota type selection
        if (quotaType) {
          payload.componyQuota = quotaType === "company"
        }

        // Add orderFor data if provided
        if (orderForData) {
          payload.orderFor = orderForData
        }

        endpoint = API.ORDER.CREATE_DEALER_ORDER
      } else {
        // Regular order payload
        payload = {
          name: formData.name,
          village: formData.village,
          taluka: formData.taluka,
          state: formData.state,
          district: formData.district,
          stateName: formData.stateName,
          districtName: formData.districtName,
          talukaName: formData.talukaName,
          mobileNumber: formData.mobileNumber,
          typeOfPlants: formData.typeOfPlant,
          numberOfPlants: parseInt(formData.noOfPlants),
          rate: parseFloat(formData.rate),
          paymentStatus: "not paid",
          // If dealer is selected, send dealer ID as salesPerson, otherwise send sales person ID
          salesPerson: formData.dealer || formData.sales,
          orderStatus: isInstantOrder ? "DISPATCHED" : "ACCEPTED",
          plantName: formData.plant,
          plantSubtype: formData.subtype,
          bookingSlot: slotId, // Auto-detected slot ID from order date
          orderDate: formData.orderDate instanceof Date ? formData.orderDate.toISOString() : formData.orderDate,
          deliveryDate: formData.orderDate instanceof Date ? formData.orderDate.toISOString() : formData.orderDate,
          orderPaymentStatus: "PENDING",
          cavity: formData.cavity,
          orderBookingDate:
            formData.date instanceof Date ? formData.date.toISOString() : formData.date
        }

        // Add dealer field if dealer is selected for normal orders
        if (formData.dealer) {
          payload.dealer = formData.dealer
        }

        // Add company quota flag for dealer regular orders
        if (quotaType) {
          payload.componyQuota = quotaType === "company"
        }

        // Add orderFor data if provided
        if (orderForData) {
          payload.orderFor = orderForData
        }
        
        endpoint = API.FARMER.CREATE_FARMER
      }

      // Debug: Log the final payload and rate information
      console.log("=== ORDER CREATION DEBUG ===")
      console.log("Form data rate:", formData.rate)
      console.log("Form data rate type:", typeof formData.rate)
      console.log("Parsed rate:", parseFloat(formData.rate))
      console.log("Rate manually set:", rateManuallySet)
      console.log("Final payload rate:", payload.rate)
      console.log("Final payload rate type:", typeof payload.rate)
      console.log("Form data dealer:", formData.dealer)
      console.log("Form data sales:", formData.sales)
      console.log("Final payload salesPerson:", payload.salesPerson)
      console.log("Complete payload:", payload)
      console.log("=== END ORDER CREATION DEBUG ===")

      // Check if payment data exists (using same validation as FarmerOrdersTable)
      const hasPaymentData = newPayment.paidAmount && newPayment.modeOfPayment

      // Prepare payment data for order creation
      if (hasPaymentData) {
        // Ensure payment date is in ISO format
        let paymentDate = newPayment.paymentDate
        if (typeof paymentDate === "string") {
          try {
            const date = new Date(paymentDate)
            paymentDate = date.toISOString()
          } catch (e) {
            console.error("Invalid payment date format:", paymentDate)
            paymentDate = new Date().toISOString() // Fallback to current date
          }
        } else {
          paymentDate = new Date().toISOString() // Fallback to current date
        }

        // Add payment data to payload
        payload.payment = [
          {
            ...newPayment,
            paymentDate: paymentDate,
            paymentStatus: newPayment.paymentStatus || "PENDING"
          }
        ]

        // Update order payment status based on total paid amount and user role
        const totalPaid = getTotalPaidAmount()
        const totalOrder = getTotalOrderAmount()

        // For OFFICE_ADMIN, always keep payment status as PENDING
        if (user?.role === "OFFICE_ADMIN") {
          payload.paymentStatus = "partial"
          payload.orderPaymentStatus = "PENDING"
          console.log("OFFICE_ADMIN payment - status set to PENDING")
        } else if (newPayment.paymentStatus === "COLLECTED") {
          // For collected payments from other roles, set status to paid
          payload.paymentStatus = "paid"
          payload.orderPaymentStatus = "COMPLETED"
        } else if (totalPaid >= totalOrder) {
          payload.paymentStatus = "paid"
          payload.orderPaymentStatus = "COMPLETED"
        } else if (totalPaid > 0) {
          payload.paymentStatus = "partial"
          payload.orderPaymentStatus = "PENDING"
        }
      }

      console.log("Final payload:", payload)
      console.log("Using endpoint:", endpoint)
      console.log("Quota type selected:", quotaType)
      console.log("Company quota flag:", quotaType ? quotaType === "company" : "No quota type")
      console.log("Dealer selected:", formData.dealer)
      console.log("Sales person selected:", formData.sales)
      console.log("Final dealer field in payload:", payload.dealer)
      console.log("Final salesPerson field in payload:", payload.salesPerson)
      console.log("Payment data included:", hasPaymentData ? "Yes" : "No")

      const instance = NetworkManager(endpoint)
      const response = await instance.request(payload)

      if (response?.data) {
        console.log("Order created successfully with payment:", response.data)

        let successMessage = "Order added successfully"
        if (hasPaymentData) {
          successMessage += " with payment"
        }

        Toast.success(successMessage)
        onSuccess?.()
        handleClose()
      }
    } catch (error) {
      console.error("Error creating order:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      let errorMessage = "An error occurred while creating the order"
      let isSlotError = false

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // Check for specific slot availability errors
      if (
        errorMessage.includes("Not enough plants available") ||
        errorMessage.includes("No plants available") ||
        errorMessage.includes("Please book in other slots")
      ) {
        console.error("Slot availability error detected:", errorMessage)
        isSlotError = true

        // Extract slot period from error message
        const slotPeriodMatch = errorMessage.match(/Slot period: (.+?)(?:\s*$|\.)/)
        const slotPeriod = slotPeriodMatch ? slotPeriodMatch[1] : ""

        // Create a more user-friendly error message
        const availableMatch = errorMessage.match(/Only (\d+) plants available/)
        const availableCount = availableMatch ? availableMatch[1] : ""

        if (availableCount) {
          errorMessage = `⚠️ Slot Capacity Exceeded!\n\nOnly ${availableCount} plants available in slot: ${slotPeriod}\n\nPlease select a different slot or reduce the order quantity.`
        } else {
          errorMessage = `⚠️ Slot Unavailable!\n\nNo plants available in slot: ${slotPeriod}\n\nPlease select a different slot.`
        }
      } else if (
        errorMessage.includes("delivery") ||
        errorMessage.includes("slot") ||
        errorMessage.includes("date")
      ) {
        console.error("Slot-related error detected:", errorMessage)
        isSlotError = true
        errorMessage = `⚠️ Slot Error: ${errorMessage}\n\nPlease try selecting a different slot.`
      }

      // Show error with different styling based on type
      if (isSlotError) {
        // For slot errors, show a more prominent error
        Toast.error(errorMessage, {
          duration: 8000, // Show for 8 seconds
          style: {
            background: "#fef2f2",
            color: "#dc2626",
            border: "2px solid #fecaca",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.5",
            whiteSpace: "pre-line"
          }
        })
      } else {
        Toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      date: new Date(),
      name: "",
      village: "",
      taluka: "",
      district: "",
      state: "",
      stateName: "",
      districtName: "",
      talukaName: "",
      mobileNumber: "",
      noOfPlants: "",
      typeOfPlant: "",
      rate: "",
      plant: "",
      subtype: "",
      orderDate: null, // Reset order date instead of selectedSlot
      cavity: "",
      sales: null,
      dealer: null,
      // Reset Order For fields
      orderForEnabled: false,
      orderForName: "",
      orderForAddress: "",
      orderForMobileNumber: ""
    })
    setFarmerData({})
    // Always default to Normal Order (not Instant Order)
    setIsInstantOrder(false)
    setBulkOrder(false)
    setQuotaType(null)
    setActiveStep(0)
    setShowConfirmation(false)
    setConfirmationData({})
    setRateManuallySet(false)
    // Reset payment to initial state
    setNewPayment({
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"),
      modeOfPayment: "",
      bankName: "",
      remark: "",
      receiptPhoto: [],
      paymentStatus: "PENDING", // Default to PENDING, will be updated based on payment type
      isWalletPayment: false
    })
    onClose()
  }

  const renderOrderTypeSelector = () => {
    if (user?.jobTitle === "DEALER") {
      return (
        <Card className={classes.formCard}>
          <div className={classes.cardHeader}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              <Assignment fontSize="small" /> Order Type
            </Typography>
          </div>
          <CardContent className={classes.formSection}>
            <RadioGroup
              row
              value={bulkOrder ? "bulk" : "farmer"}
              onChange={(e) => {
                const isBulkOrder = e.target.value === "bulk"
                setBulkOrder(isBulkOrder)
                // Uncheck wallet payment for dealer orders
                if (isBulkOrder) {
                  setNewPayment((prev) => ({ ...prev, isWalletPayment: false }))
                }
              }}>
              <FormControlLabel
                value="farmer"
                control={<Radio color="primary" />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography>Farmer Order</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="bulk"
                control={<Radio color="primary" />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ShippingIcon color="primary" />
                    <Typography>Dealer Order</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </CardContent>
        </Card>
      )
    }

    if (
      user?.jobTitle === "OFFICE_STAFF" ||
      user?.jobTitle === "OFFICE_ADMIN" ||
      user?.jobTitle === "SUPERADMIN"
    ) {
      return (
        <Card className={classes.formCard}>
          <div className={classes.cardHeader}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              <Assignment fontSize="small" /> Order Type
            </Typography>
          </div>
          <CardContent className={classes.formSection}>
            <RadioGroup
              row
              value={isInstantOrder ? "instant" : bulkOrder ? "bulk" : "normal"}
              onChange={(e) => {
                const value = e.target.value
                setIsInstantOrder(value === "instant")
                setBulkOrder(value === "bulk")
                // Uncheck wallet payment for dealer/bulk orders
                if (value === "bulk") {
                  setNewPayment((prev) => ({ ...prev, isWalletPayment: false }))
                }
              }}>
              <FormControlLabel
                value="normal"
                control={<Radio color="primary" />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon color="primary" />
                    <Typography>Normal Order</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="instant"
                control={<Radio color="primary" />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <FlashIcon color="primary" />
                    <Typography>Instant Order</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="bulk"
                control={<Radio color="primary" />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ShippingIcon color="primary" />
                    <Typography>Bulk Order</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </CardContent>
        </Card>
      )
    }

    return null
  }

  const renderQuotaTypeSelector = () => {
    if (user?.jobTitle === "DEALER" && !bulkOrder) {
      return (
        <Card className={classes.formCard}>
          <div className={classes.cardHeader}>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              <InfoIcon fontSize="small" /> Quota Type
            </Typography>
          </div>
          <CardContent className={classes.formSection}>
            <RadioGroup row value={quotaType || ""} onChange={(e) => setQuotaType(e.target.value)}>
              <FormControlLabel
                value="dealer"
                control={<Radio color="primary" />}
                label="From Dealer Quota"
              />
              <FormControlLabel
                value="company"
                control={<Radio color="primary" />}
                label="From Company Quota"
              />
            </RadioGroup>

            {quotaType === "dealer" && formData.orderDate && (
              <Box className={classes.quotaInfo}>
                <InfoIcon color="primary" />
                <Typography variant="body2">
                  Your quota for selected date:{" "}
                  {getRemainingQuantity() !== null ? getRemainingQuantity() : "Loading..."}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )
    }
    return null
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className={classes.dialog}
      PaperProps={{
        style: { maxHeight: "75vh", minHeight: "50vh" }
      }}>
      <DialogTitle className={classes.dialogTitle} sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AddIcon fontSize="small" />
          <Typography variant="h6">Add New Order</Typography>
        </Box>
        <IconButton className={classes.closeButton} onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 1 }}>
        <Box className={classes.formContainer}>
          {loading && (
            <Box className={classes.loadingOverlay}>
              <CircularProgress size={60} />
            </Box>
          )}

          {/* Stepper */}
          <Paper elevation={0} sx={{ mb: 0.5, p: 0.25, background: "transparent" }}>
            <Stepper activeStep={activeStep} className={classes.stepper} size="small">
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel sx={{ fontSize: "0.7rem" }}>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {renderOrderTypeSelector()}
          {renderQuotaTypeSelector()}


          {/* Farmer Details Section */}
          {!bulkOrder && (
            <Card className={classes.formCard}>
              <div className={classes.cardHeader}>
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  <PersonIcon fontSize="small" /> Farmer Details
                </Typography>
              </div>
              <CardContent className={classes.formSection}>
                {farmerData?.name && (
                  <Box className={classes.farmerInfo}>
                    <Avatar className={classes.avatar}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {farmerData.name}
                      </Typography>
                      <Chip
                        label="Existing Farmer"
                        size="small"
                        className={classes.successChip}
                        icon={<CheckIcon />}
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Location: {farmerData.village}, {farmerData.talukaName || farmerData.taluka}
                        , {farmerData.districtName || farmerData.district}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Order Date"
                        value={formData.date}
                        onChange={(date) => handleInputChange("date", date)}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Mobile Number"
                      value={formData.mobileNumber}
                      onChange={(e) => handleInputChange("mobileNumber", e.target.value)}
                      inputProps={{ maxLength: 10 }}
                      InputProps={{
                        endAdornment: mobileLoading && (
                          <CircularProgress size={20} color="primary" />
                        )
                      }}
                      helperText={
                        farmerData?.name
                          ? "Farmer found in database - location auto-filled"
                          : mobileLoading
                          ? "Searching for farmer..."
                          : "Enter 10-digit mobile number to auto-fill farmer details (500ms delay)"
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Farmer Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={!!farmerData?.name}
                    />
                  </Grid>

                  {/* Order For Toggle - Beside Farmer Name */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mt: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.orderForEnabled}
                            onChange={(e) => handleInputChange("orderForEnabled", e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2" fontWeight={600}>
                            Place order for someone else?
                          </Typography>
                        }
                      />
                    </Box>
                  </Grid>

                  {/* Order For Fields - Show when enabled */}
                  {formData.orderForEnabled && (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }}>
                          <Chip label="Order For Details" size="small" color="primary" />
                        </Divider>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Name *"
                          value={formData.orderForName}
                          onChange={(e) => handleInputChange("orderForName", e.target.value)}
                          placeholder="Enter name of person order is for"
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Mobile Number *"
                          value={formData.orderForMobileNumber}
                          onChange={(e) => handleInputChange("orderForMobileNumber", e.target.value)}
                          placeholder="Enter 10-digit mobile number"
                          inputProps={{ maxLength: 10 }}
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Address *"
                          value={formData.orderForAddress}
                          onChange={(e) => handleInputChange("orderForAddress", e.target.value)}
                          placeholder="Enter complete address"
                          multiline
                          rows={2}
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            This information will be stored with the order and can be used for delivery and communication purposes.
                          </Typography>
                        </Alert>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>
                    {console.log("LocationSelector props:", {
                      selectedState: formData.state,
                      selectedDistrict: formData.district,
                      selectedTaluka: formData.taluka,
                      selectedVillage: formData.village,
                      disabled: !!farmerData?.name,
                      farmerData: farmerData
                    })}

                    {farmerData?.name ? (
                      // Show location as read-only when farmer is found
                      <Box sx={{ mt: 2 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                          Location (Auto-filled from farmer data)
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="State"
                              value={formData.state || ""}
                              disabled
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="District"
                              value={formData.district || ""}
                              disabled
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Taluka"
                              value={formData.taluka || ""}
                              disabled
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Village"
                              value={formData.village || ""}
                              disabled
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ) : (
                      // Show normal LocationSelector when no farmer is found
                      <LocationSelector
                        selectedState={formData.state}
                        selectedDistrict={formData.district}
                        selectedTaluka={formData.taluka}
                        selectedVillage={formData.village}
                        onStateChange={(value) => handleInputChange("state", value)}
                        onDistrictChange={(value) => handleInputChange("district", value)}
                        onTalukaChange={(value) => handleInputChange("taluka", value)}
                        onVillageChange={(value) => handleInputChange("village", value)}
                        required={true}
                        showLabels={false}
                        className="mt-4"
                        disabled={false}
                        autoFill={true}
                      />
                    )}
                    {farmerData?.name ? (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Farmer Found:</strong> Location fields are auto-filled and
                          disabled. You can modify them if needed by clearing the mobile number
                          first.
                        </Typography>
                      </Alert>
                    ) : (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          {user?.defaultState ? (
                            <>
                              <strong>User Default Location:</strong> Using your saved location
                              preferences. You can modify if needed.
                            </>
                          ) : (
                            <>
                              <strong>Default Location:</strong> Maharashtra state is pre-selected.
                              Please select your district, taluka, and village.
                            </>
                          )}
                        </Typography>
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Sales Person Selection */}
          <Card className={classes.formCard}>
            <div className={classes.cardHeader}>
              <Typography variant="h6" className={classes.sectionTitle}>
                <PersonIcon /> Sales Assignment
              </Typography>
            </div>
            <CardContent className={classes.formSection}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <SearchableSelect
                    label="Select Sales Person"
                    items={[{ label: "Select a sales person", value: "" }, ...sales]}
                    value={formData.sales || ""}
                    onChange={(e) => handleInputChange("sales", e.target.value)}
                    placeholder="Search sales person..."
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <SearchableSelect
                    label="Select Dealer"
                    items={[{ label: "Select a dealer", value: "" }, ...dealers]}
                    value={formData.dealer || ""}
                    onChange={(e) => {
                      console.log("=== SearchableSelect onChange DEBUG ===")
                      console.log("Event:", e)
                      console.log("Target value:", e.target.value)
                      console.log("Current formData.dealer:", formData.dealer)
                      handleInputChange("dealer", e.target.value)
                    }}
                    placeholder="Search dealer..."
                  />
                </Grid>
              </Grid>

              {/* Show quota type selection when dealer is selected for normal orders only */}
              {formData.dealer && !bulkOrder && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                    Quota Type for Selected Dealer
                  </Typography>
                  <RadioGroup
                    row
                    value={quotaType || ""}
                    onChange={(e) => setQuotaType(e.target.value)}>
                    <FormControlLabel
                      value="dealer"
                      control={<Radio color="primary" />}
                      label="From Dealer Quota"
                    />
                    <FormControlLabel
                      value="company"
                      control={<Radio color="primary" />}
                      label="From Company Quota"
                    />
                  </RadioGroup>

                  {quotaType === "dealer" && formData.orderDate && (
                    <Box className={classes.quotaInfo} sx={{ mt: 2 }}>
                      <InfoIcon color="primary" />
                      <Typography variant="body2">
                        Dealer quota for selected date:{" "}
                        {getRemainingQuantity() !== null ? getRemainingQuantity() : "Loading..."}
                      </Typography>
                    </Box>
                  )}

                  {/* Show available plants for all slots when dealer quota is selected */}
                  {quotaType === "dealer" && (
                    <Box sx={{ mt: 3 }}>
                      {(() => {
                        console.log("=== Quota Display Condition DEBUG ===")
                        console.log("quotaType:", quotaType)
                        console.log("quotaType === 'dealer':", quotaType === "dealer")
                        console.log("dealerWallet:", dealerWallet)
                        console.log("dealerWallet?.entries:", dealerWallet?.entries)
                        console.log("slots:", slots)
                        console.log("slots.length:", slots?.length)
                        return null
                      })()}
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                        {formData.plant && formData.subtype
                          ? "Available Plants in Dealer Quota by Slot"
                          : "Total Available Plants in Dealer Quota by Slot (Select plant/subtype for specific details)"}
                      </Typography>
                      <Box
                        sx={{
                          maxHeight: 200,
                          overflowY: "auto",
                          border: "1px solid #e0e0e0",
                          borderRadius: 1
                        }}>
                        {(() => {
                          console.log("=== Slot Display DEBUG ===")
                          const availableSlots = getAvailablePlantsForSlots()
                          console.log(
                            "Available slots from getAvailablePlantsForSlots:",
                            availableSlots
                          )
                          console.log("Available slots length:", availableSlots.length)

                          // Show dealer wallet data when available, otherwise show dummy data
                          if (availableSlots.length === 0 && quotaType === "dealer") {
                            // If we have dealer wallet data, show it directly
                            if (dealerWallet?.entries && dealerWallet.entries.length > 0) {
                              console.log("Showing dealer wallet data directly")
                              return dealerWallet.entries
                                .filter((entry) => (entry.remainingQuantity || 0) > 0) // Only show entries with available plants
                                .map((entry, index) => {
                                  // Try to find slot details from existing slots array first
                                  const slotDetails = slots.find(
                                    (slot) => slot.value === entry.bookingSlotId
                                  )

                                  let slotLabel
                                  if (slotDetails) {
                                    // Use slot details from slots array (with formatted dates)
                                    slotLabel = `${slotDetails.label} (${
                                      entry.remainingQuantity || 0
                                    } available)`
                                  } else if (entry.startDay && entry.endDay && entry.month) {
                                    // Use dates from wallet data
                                    const startDate = moment(entry.startDay, "DD-MM-YYYY").format(
                                      "D"
                                    )
                                    const endDate = moment(entry.endDay, "DD-MM-YYYY").format("D")
                                    const monthYear = moment(entry.startDay, "DD-MM-YYYY").format(
                                      "MMMM, YYYY"
                                    )
                                    slotLabel = `${startDate} - ${endDate} ${monthYear} (${
                                      entry.remainingQuantity || 0
                                    } available)`
                                  } else {
                                    // Fallback to slot ID
                                    slotLabel = `Slot ${entry.bookingSlotId} (${
                                      entry.remainingQuantity || 0
                                    } available)`
                                  }

                                  return {
                                    slotId: entry.bookingSlotId || `entry-${index}`,
                                    slotLabel: slotLabel,
                                    availableInWallet: entry.remainingQuantity || 0,
                                    totalInSlot: entry.quantity || 0,
                                    hasQuota: true,
                                    showAllPlants: true
                                  }
                                })
                                .map((slotInfo, index) => (
                                  <Box
                                    key={slotInfo.slotId}
                                    sx={{
                                      p: 2,
                                      borderBottom:
                                        index < dealerWallet.entries.length - 1
                                          ? "1px solid #f0f0f0"
                                          : "none",
                                      backgroundColor: "#e3f2fd",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 500, color: "#2c3e50" }}>
                                        {slotInfo.slotLabel} (DEALER QUOTA)
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Total in slot: {slotInfo.totalInSlot}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: "right" }}>
                                      <Chip
                                        label={`${slotInfo.availableInWallet} available`}
                                        color={slotInfo.availableInWallet > 0 ? "success" : "error"}
                                        size="small"
                                        variant="outlined"
                                      />
                                    </Box>
                                  </Box>
                                ))
                            } else {
                              console.log("Showing dummy data for testing")
                              return [
                                {
                                  slotId: "test-slot-1",
                                  slotLabel: "01-07-2025 to 07-07-2025 July, 2025 (1000 available)",
                                  availableInWallet: 500,
                                  totalInSlot: 1000,
                                  hasQuota: true,
                                  showAllPlants: true
                                },
                                {
                                  slotId: "test-slot-2",
                                  slotLabel: "08-07-2025 to 14-07-2025 July, 2025 (800 available)",
                                  availableInWallet: 300,
                                  totalInSlot: 800,
                                  hasQuota: true,
                                  showAllPlants: true
                                }
                              ].map((slotInfo, index) => (
                                <Box
                                  key={slotInfo.slotId}
                                  sx={{
                                    p: 2,
                                    borderBottom: index < 1 ? "1px solid #f0f0f0" : "none",
                                    backgroundColor: "#e3f2fd",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                  }}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 500, color: "#2c3e50" }}>
                                      {slotInfo.slotLabel} (TEST DATA)
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Total in slot: {slotInfo.totalInSlot}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ textAlign: "right" }}>
                                    <Chip
                                      label={`${slotInfo.availableInWallet} available (TEST)`}
                                      color={slotInfo.availableInWallet > 0 ? "success" : "error"}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Box>
                                </Box>
                              ))
                            }
                          }
                          return null
                        })()}
                        {getAvailablePlantsForSlots().map((slotInfo, index) => (
                          <Box
                            key={slotInfo.slotId}
                            sx={{
                              p: 2,
                              borderBottom:
                                index < getAvailablePlantsForSlots().length - 1
                                  ? "1px solid #f0f0f0"
                                  : "none",
                              backgroundColor:
                                slotInfo.slotId === getSlotIdForDate(formData.orderDate)
                                  ? "#e3f2fd"
                                  : "transparent",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 500, color: "#2c3e50" }}>
                                {slotInfo.slotLabel}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Total in slot: {slotInfo.totalInSlot}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              {slotInfo.hasQuota ? (
                                <Chip
                                  label={
                                    slotInfo.showAllPlants
                                      ? `${slotInfo.availableInWallet} total`
                                      : `${slotInfo.availableInWallet} available`
                                  }
                                  color={slotInfo.availableInWallet > 0 ? "success" : "error"}
                                  size="small"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  label="No quota"
                                  color="default"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}>
                        {formData.plant && formData.subtype
                          ? "Green chips show available plants in dealer quota, red shows no availability"
                          : "Green chips show total available plants across all plant types in dealer quota, red shows no availability"}
                      </Typography>
                    </Box>
                  )}

                  {/* Summary of total available in dealer quota */}
                  {quotaType === "dealer" && formData.plant && formData.subtype && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        backgroundColor: "#f8f9fa",
                        borderRadius: 1,
                        border: "1px solid #e9ecef"
                      }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 600, color: "#2c3e50", mb: 1 }}>
                        Dealer Quota Summary
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                        <Typography variant="body2" color="text.secondary">
                          Total available in dealer quota for{" "}
                          {formData.plant && plants.find((p) => p.value === formData.plant)?.label}{" "}
                          -{" "}
                          {formData.subtype &&
                            subTypes.find((s) => s.value === formData.subtype)?.label}
                          :
                        </Typography>
                        <Chip
                          label={`${getTotalAvailableInDealerQuota()} plants`}
                          color={getTotalAvailableInDealerQuota() > 0 ? "success" : "error"}
                          size="small"
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                The selected sales person or dealer will be assigned to this order.
              </Alert>
            </CardContent>
          </Card>

          {/* Plant Details */}
          <Card className={classes.formCard}>
            <div className={classes.cardHeader}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                <PlantIcon fontSize="small" /> Plant & Slot Details
              </Typography>
            </div>
            <CardContent className={classes.formSection}>
              <Grid container spacing={1}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Plant</InputLabel>
                    <Select
                      value={formData.plant || ""}
                      onChange={(e) => handleInputChange("plant", e.target.value)}
                      label="Select Plant">
                      {plants.map((plant) => (
                        <MenuItem key={plant.value} value={plant.value}>
                          {plant.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Subtype</InputLabel>
                    <Select
                      value={formData.subtype || ""}
                      onChange={(e) => handleInputChange("subtype", e.target.value)}
                      label="Select Subtype"
                      disabled={!formData.plant}>
                      {subTypes.map((subtype) => (
                        <MenuItem key={subtype.value} value={subtype.value}>
                          {subtype.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Cavity</InputLabel>
                    <Select
                      value={formData.cavity || ""}
                      onChange={(e) => handleInputChange("cavity", e.target.value)}
                      label="Select Cavity">
                      {cavities.map((cavity) => (
                        <MenuItem key={cavity.value} value={cavity.value}>
                          {cavity.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Dealer Quota Summary - Show for selected plant only */}
                {formData.dealer && !bulkOrder && formData.plant && dealerWallet && dealerWallet.plantDetails && dealerWallet.plantDetails.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ p: 3, bgcolor: "#f8f9fa", borderRadius: 3, border: "2px solid #e3f2fd", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
                      <Box sx={{ p: 3, bgcolor: "white", borderRadius: 2, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#1976d2", mb: 2, display: "flex", alignItems: "center", gap: 1, textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                          🌱 Advance Booking Quota
                        </Typography>
                        <Box sx={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                          {dealerWallet.plantDetails
                            .filter(plant => {
                              // Get selected plant name
                              const selectedPlantData = plants.find(p => p.value === formData.plant);
                              return plant.plantName === selectedPlantData?.label;
                            })
                            .map((plant, idx) => (
                              <Box key={idx} sx={{ p: 2.5, bgcolor: "#ffffff", borderRadius: 2, border: "2px solid #e3f2fd", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 700, color: "#1a237e", fontSize: "1rem", textShadow: "0 1px 1px rgba(0,0,0,0.1)" }}>
                                    {plant.plantName} - {plant.subtypeName}
                                  </Typography>
                                  <Chip 
                                    label={`${plant.totalRemainingQuantity?.toLocaleString() || 0} plants`} 
                                    size="medium" 
                                    sx={{ 
                                      bgcolor: plant.totalRemainingQuantity > 0 ? "#4caf50" : "#f44336", 
                                      color: "white", 
                                      fontWeight: 800,
                                      fontSize: "0.85rem",
                                      height: 28,
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                      textShadow: "0 1px 1px rgba(0,0,0,0.3)"
                                    }} 
                                  />
                                </Box>
                                {plant.slotDetails && plant.slotDetails.length > 0 && (
                                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                                    {plant.slotDetails.map((slot, sIdx) => (
                                      <Chip
                                        key={sIdx}
                                        label={`${slot.dates?.startDay || ''} to ${slot.dates?.endDay || ''} • ${slot.remainingQuantity || 0}`}
                                        size="medium"
                                        variant="outlined"
                                        sx={{ 
                                          fontSize: "0.8rem", 
                                          height: 28,
                                          fontWeight: 600,
                                          borderWidth: 2,
                                          borderColor: slot.remainingQuantity > 0 ? "#4caf50" : "#bdbdbd",
                                          color: slot.remainingQuantity > 0 ? "#2e7d32" : "#757575",
                                          backgroundColor: slot.remainingQuantity > 0 ? "#f1f8e9" : "#f5f5f5",
                                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                          textShadow: "0 1px 1px rgba(0,0,0,0.1)"
                                        }}
                                      />
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            ))}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Order Date *"
                      value={formData.orderDate}
                      onChange={(date) => handleInputChange("orderDate", date)}
                      disabled={!formData.subtype}
                      shouldDisableDate={isDateDisabled}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth 
                          helperText={
                            formData.subtype 
                              ? "Select delivery date (only dates within available slots are enabled)" 
                              : "Select plant and subtype first"
                          }
                        />
                      )}
                      minDate={new Date()}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Number of Plants"
                    type="number"
                    value={formData.noOfPlants}
                    onChange={(e) => handleInputChange("noOfPlants", e.target.value)}
                    error={
                      quotaType === "dealer" &&
                      formData.plant &&
                      formData.subtype &&
                      formData.orderDate &&
                      formData.noOfPlants &&
                      parseInt(formData.noOfPlants) > (getRemainingQuantity() || 0)
                    }
                    helperText={
                      quotaType === "dealer" &&
                      formData.plant &&
                      formData.subtype &&
                      formData.orderDate &&
                      formData.noOfPlants
                        ? parseInt(formData.noOfPlants) > (getRemainingQuantity() || 0)
                          ? `Exceeds available dealer quota (${getRemainingQuantity() || 0})`
                          : `Available dealer quota: ${getRemainingQuantity() || 0}`
                        : ""
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      fullWidth
                      label="Rate per Plant"
                      type="number"
                      value={formData.rate}
                      onChange={(e) => handleInputChange("rate", e.target.value)}
                      disabled={
                        !(
                          user?.jobTitle === "SUPERADMIN" ||
                          user?.jobTitle === "OFFICE_ADMIN" ||
                          user?.jobTitle === "ACCOUNTANT"
                        )
                      }
                      helperText={
                        user?.jobTitle === "SUPERADMIN" ||
                        user?.jobTitle === "OFFICE_ADMIN" ||
                        user?.jobTitle === "ACCOUNTANT"
                          ? formData.subtype
                            ? "Rate auto-filled from selected subtype. You can edit it as you have admin privileges."
                            : "Select a subtype to auto-fill rate. You can edit it as you have admin privileges."
                          : formData.subtype
                          ? "Rate auto-filled from selected subtype, but you can edit it."
                          : "Select a subtype to auto-fill rate"
                      }
                    />
                    {(user?.jobTitle === "SUPERADMIN" ||
                      user?.jobTitle === "OFFICE_ADMIN" ||
                      user?.jobTitle === "ACCOUNTANT") && (
                      <Chip
                        label="Admin Edit"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{
                          position: "absolute",
                          top: -8,
                          right: 8,
                          fontSize: "0.7rem",
                          height: 20
                        }}
                      />
                    )}
                  </Box>
                </Grid>

                {/* Slot Capacity Warning - Only show if NOT a sowing-allowed plant */}
                {available !== null &&
                  formData.noOfPlants &&
                  parseInt(formData.noOfPlants) > available &&
                  !plants.find((p) => p.value === formData.plant)?.sowingAllowed && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: "2px solid #fecaca",
                          backgroundColor: "#fef2f2",
                          display: "flex",
                          alignItems: "center",
                          gap: 2
                        }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: "#dc2626",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: "bold"
                          }}>
                          ⚠️
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color="#dc2626"
                            sx={{ mb: 0.5 }}>
                            Slot Capacity Exceeded!
                          </Typography>
                          <Typography variant="body2" color="#7f1d1d">
                            You&apos;re trying to book {formData.noOfPlants} plants, but only{" "}
                            {available} are available in this slot.
                          </Typography>
                          <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.5 }}>
                            Please select a different slot or reduce the order quantity.
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                
                {/* Sowing-Allowed Plant Info */}
                {plants.find((p) => p.value === formData.plant)?.sowingAllowed && formData.noOfPlants && (
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: "2px solid #4caf50",
                        backgroundColor: "#e8f5e9",
                        display: "flex",
                        alignItems: "center",
                        gap: 2
                      }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          backgroundColor: "#4caf50",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "14px",
                          fontWeight: "bold"
                        }}>
                        🌱
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="#2e7d32"
                          sx={{ mb: 0.5 }}>
                          Unlimited Booking Available!
                        </Typography>
                        <Typography variant="body2" color="#1b5e20">
                          This plant type supports sowing on demand. You can book any quantity regardless of current availability.
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}

                {/* Dealer Quota Validation Display */}
                {quotaType === "dealer" &&
                  formData.plant &&
                  formData.subtype &&
                  formData.orderDate && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 0.5,
                          borderRadius: 1,
                          border: "1px solid",
                          backgroundColor: "#f8f9fa",
                          borderColor:
                            parseInt(formData.noOfPlants || 0) > (getRemainingQuantity() || 0)
                              ? "#f44336"
                              : "#4caf50",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="#2c3e50">
                            Dealer Quota Status
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formData.plant && formData.subtype
                              ? `${plants.find((p) => p.value === formData.plant)?.label} - ${
                                  subTypes.find((s) => s.value === formData.subtype)?.label
                                }`
                              : "Select plant and subtype"}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" fontWeight={600} color="#2c3e50">
                            Available: {getRemainingQuantity() || 0}
                          </Typography>
                          {formData.noOfPlants && (
                            <Typography
                              variant="caption"
                              color={
                                parseInt(formData.noOfPlants) > (getRemainingQuantity() || 0)
                                  ? "#f44336"
                                  : "#4caf50"
                              }
                              fontWeight={500}>
                              {parseInt(formData.noOfPlants) > (getRemainingQuantity() || 0)
                                ? `Exceeds by ${
                                    parseInt(formData.noOfPlants) - (getRemainingQuantity() || 0)
                                  }`
                                : `${
                                    (getRemainingQuantity() || 0) - parseInt(formData.noOfPlants)
                                  } remaining`}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  )}
              </Grid>
            </CardContent>
          </Card>

          {/* Payment Management */}
          <Card className={classes.formCard}>
            <div className={classes.cardHeader}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                <CheckIcon fontSize="small" /> Payment Management
              </Typography>
            </div>
            <CardContent className={classes.formSection}>
              {/* Payment Summary */}
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: "#f8f9fa",
                  borderRadius: 1,
                  border: "1px solid #e9ecef"
                }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Order Amount:
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="#2c3e50">
                      ₹{getTotalOrderAmount().toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Paid:
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="#4caf50">
                      ₹{getTotalPaidAmount().toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Balance:
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color={getBalanceAmount() >= 0 ? "#2c3e50" : "#f44336"}>
                      ₹{getBalanceAmount().toLocaleString()}
                    </Typography>
                  </Grid>
                  {(user?.jobTitle === "DEALER" ||
                    user?.role === "SUPER_ADMIN" ||
                    user?.role === "OFFICE_ADMIN" ||
                    user?.role === "ACCOUNTANT") &&
                    dealerWallet && (
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                          Wallet Balance:
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color="#ff9800">
                          ₹{dealerWallet.availableAmount?.toLocaleString() || 0}
                        </Typography>
                      </Grid>
                    )}
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => {
                        setNewPayment({
                          paidAmount: "",
                          paymentDate: moment().format("YYYY-MM-DD"),
                          modeOfPayment: "",
                          bankName: "",
                          remark: "",
                          receiptPhoto: [],
                          paymentStatus: "PENDING", // Default to PENDING, will be updated based on payment type
                          isWalletPayment: false
                        })
                      }}
                      startIcon={<AddIcon />}
                      size="small">
                      Reset Payment
                    </Button>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => {
                        // Payment state test - removed for cleaner console
                      }}
                      size="small">
                      Test Payment Data
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Payment Entry */}
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                  bgcolor: "#fafafa"
                }}>
                <Typography variant="subtitle2" fontWeight={600} color="#2c3e50" sx={{ mb: 2 }}>
                  Payment Details
                </Typography>

                {/* Wallet Payment Option - Only for Accountant, Super Admin, and Office Admin */}
                {(user?.role === "SUPER_ADMIN" ||
                  user?.role === "ACCOUNTANT" ||
                  user?.role === "OFFICE_ADMIN") && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: "#fff3e0",
                      borderRadius: 1,
                      border: "1px solid #ff9800"
                    }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={newPayment.isWalletPayment}
                          onChange={(e) =>
                            handlePaymentInputChange("isWalletPayment", e.target.checked)
                          }
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Pay from Wallet
                          </Typography>
                          {dealerWallet && (
                            <Typography variant="caption" color="text.secondary">
                              Available Balance: ₹
                              {dealerWallet.availableAmount?.toLocaleString() || 0}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    {newPayment.isWalletPayment && dealerWallet && (
                      <Typography
                        variant="caption"
                        color="success.main"
                        sx={{ display: "block", mt: 1 }}>
                        ✓ Payment will be deducted from your wallet balance
                      </Typography>
                    )}
                  </Box>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Amount (₹)"
                      type="number"
                      value={newPayment.paidAmount}
                      onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)}
                      placeholder="Enter amount"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Payment Date"
                      type="date"
                      value={newPayment.paymentDate}
                      onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)}
                      size="small"
                      InputLabelProps={{
                        shrink: true
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Mode</InputLabel>
                      <Select
                        value={newPayment.modeOfPayment}
                        onChange={(e) => handlePaymentInputChange("modeOfPayment", e.target.value)}
                        label="Payment Mode"
                        disabled={newPayment.isWalletPayment}>
                        <MenuItem value="">Select Mode</MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                        <MenuItem value="Phone Pe">Phone Pe</MenuItem>
                        <MenuItem value="Google Pay">Google Pay</MenuItem>
                        <MenuItem value="Cheque">Cheque</MenuItem>
                        <MenuItem value="NEFT">NEFT</MenuItem>
                        <MenuItem value="JPCB">JPCB</MenuItem>
                      </Select>
                      {newPayment.isWalletPayment && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: "block" }}>
                          Payment mode not required for wallet payments
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      value={newPayment.bankName}
                      onChange={(e) => handlePaymentInputChange("bankName", e.target.value)}
                      placeholder={
                        newPayment.modeOfPayment === "Cheque" || newPayment.modeOfPayment === "NEFT"
                          ? "Enter bank name"
                          : "N/A"
                      }
                      disabled={
                        newPayment.isWalletPayment ||
                        (newPayment.modeOfPayment !== "Cheque" &&
                          newPayment.modeOfPayment !== "NEFT")
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Remark"
                      value={newPayment.remark}
                      onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
                      placeholder="Optional remark"
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Payment Status Summary */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "#e3f2fd",
                  borderRadius: 1,
                  border: "1px solid #2196f3"
                }}>
                <Typography variant="body2" fontWeight={600} color="#1976d2" sx={{ mb: 1 }}>
                  Payment Status Summary
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Chip
                    label={`Total: ₹${getTotalOrderAmount().toLocaleString()}`}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Paid: ₹${getTotalPaidAmount().toLocaleString()}`}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                  <Chip
                    label={`Balance: ₹${getBalanceAmount().toLocaleString()}`}
                    color={getBalanceAmount() >= 0 ? "default" : "error"}
                    variant="outlined"
                    size="small"
                  />
                  {getBalanceAmount() < 0 && <Chip label="Overpaid" color="warning" size="small" />}
                  {getBalanceAmount() === 0 && (
                    <Chip label="Fully Paid" color="success" size="small" />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 0.5, background: "#fafafa", borderTop: "1px solid #e0e0e0" }}>
        <Button onClick={handleClose} color="secondary" variant="outlined" size="small">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          className={classes.submitButton}
          size="small"
          startIcon={loading ? <CircularProgress size={14} /> : <AddIcon fontSize="small" />}>
          {loading ? "Adding Order..." : "Add Order"}
        </Button>
      </DialogActions>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        maxWidth="sm"
        fullWidth
        className={classes.dialog}>
        <DialogTitle className={classes.dialogTitle}>
          <Box display="flex" alignItems="center" gap={2}>
            <CheckIcon />
            Confirm Order Details
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#2c3e50" }}>
              Please confirm the following order details:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {/* Farmer Details */}
              <Box sx={{ p: 2, bgcolor: "#f8f9fa", borderRadius: 1, border: "1px solid #e9ecef" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2c3e50", mb: 1 }}>
                  Farmer Information
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, color: "#e74c3c", fontSize: "1.1rem" }}>
                  {confirmationData.farmerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mobile: {confirmationData.mobileNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Location: {confirmationData.location}
                </Typography>
              </Box>

              {/* Order Details */}
              <Box sx={{ p: 2, bgcolor: "#f8f9fa", borderRadius: 1, border: "1px solid #e9ecef" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2c3e50", mb: 1 }}>
                  Order Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Order Type:</strong> {confirmationData.orderType}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Plant:</strong> {confirmationData.plantName} -{" "}
                  {confirmationData.plantSubtype}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Quantity:</strong> {confirmationData.numberOfPlants} plants
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Rate:</strong> ₹{confirmationData.rate} per plant
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Sales Person:</strong> {confirmationData.salesPerson}
                </Typography>
              </Box>

              {/* Order For Details */}
              {formData.orderForEnabled && (
                <Box sx={{ p: 2, bgcolor: "#e8f5e8", borderRadius: 1, border: "1px solid #4caf50" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2e7d32", mb: 1 }}>
                    Order For Details
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Name:</strong> {formData.orderForName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Mobile:</strong> {formData.orderForMobileNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Address:</strong> {formData.orderForAddress}
                  </Typography>
                </Box>
              )}

              {/* Dates */}
              <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 1, border: "1px solid #2196f3" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1976d2", mb: 1 }}>
                  Important Dates
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Order Booking Date:</strong>{" "}
                  {moment(confirmationData.orderDate).format("DD/MM/YYYY")}
                </Typography>
                {confirmationData.deliveryDate && (
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#e74c3c", mb: 0.5 }}>
                    <strong>Delivery Date:</strong>{" "}
                    {moment(confirmationData.deliveryDate).format("DD/MM/YYYY")}
                  </Typography>
                )}
                {confirmationData.slotPeriod && (
                  <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#1976d2" }}>
                    <strong>Slot Period:</strong> {confirmationData.slotPeriod}
                  </Typography>
                )}
              </Box>

              {/* Payment Details */}
              {getTotalPaidAmount() > 0 && (
                <Box
                  sx={{ p: 2, bgcolor: "#f0f8ff", borderRadius: 1, border: "1px solid #2196f3" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1976d2", mb: 1 }}>
                    Payment Details
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Total Order Amount:</strong> ₹{getTotalOrderAmount().toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Total Paid:</strong> ₹{getTotalPaidAmount().toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Balance:</strong> ₹{getBalanceAmount().toLocaleString()}
                  </Typography>
                  {newPayment.paidAmount && newPayment.modeOfPayment && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: "white", borderRadius: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#2c3e50" }}>
                        Payment: ₹{parseFloat(newPayment.paidAmount).toLocaleString()} (
                        {newPayment.modeOfPayment})
                      </Typography>
                      {newPayment.bankName && (
                        <Typography variant="caption" color="text.secondary">
                          Bank: {newPayment.bankName}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block" }}>
                        Status: PENDING
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, background: "#fafafa" }}>
          <Button
            onClick={() => setShowConfirmation(false)}
            color="secondary"
            variant="outlined"
            size="large">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
            className={classes.submitButton}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}>
            {loading ? "Creating Order..." : "Confirm & Create Order"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default AddOrderForm
