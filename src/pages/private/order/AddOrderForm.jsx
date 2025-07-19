import React, { useState, useEffect } from "react"
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
  Tooltip
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useSelector } from "react-redux"
import { makeStyles } from "tss-react/mui"
import {
  Close as CloseIcon,
  Add as AddIcon,
  Person as PersonIcon,
  LocalShipping as ShippingIcon,
  Agriculture as PlantIcon,
  Assignment,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from "@mui/icons-material"
import moment from "moment"
import LocationSelector from "components/LocationSelector"

const useStyles = makeStyles()((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      maxHeight: "95vh"
    }
  },
  dialogTitle: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "24px 32px",
    position: "relative",
    "& .MuiTypography-root": {
      fontSize: "1.5rem",
      fontWeight: 600
    }
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 16,
    color: "white",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.1)"
    }
  },
  formContainer: {
    padding: 32,
    maxWidth: 1200,
    margin: "0 auto",
    background: "#fafafa"
  },
  formCard: {
    marginBottom: 24,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    border: "1px solid #e0e0e0",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      transform: "translateY(-2px)"
    }
  },
  cardHeader: {
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    padding: "16px 24px",
    borderBottom: "1px solid #e0e0e0",
    borderRadius: "12px 12px 0 0"
  },
  sectionTitle: {
    color: "#2c3e50",
    fontWeight: 600,
    fontSize: "1.1rem",
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  orderTypeContainer: {
    marginBottom: 24
  },
  quotaTypeContainer: {
    marginTop: 16,
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    border: "1px solid #e9ecef"
  },
  quotaInfo: {
    marginTop: 12,
    padding: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    border: "1px solid #2196f3",
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  submitButton: {
    marginTop: 24,
    padding: "14px 40px",
    fontSize: "1.1rem",
    borderRadius: 8,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "&:hover": {
      background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
    }
  },
  stepper: {
    padding: "24px 0",
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
    padding: "24px",
    "& .MuiGrid-item": {
      marginBottom: 16
    }
  },
  infoChip: {
    margin: "8px 0",
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
    gap: 12,
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    border: "1px solid #2196f3",
    marginBottom: 16
  },
  avatar: {
    backgroundColor: "#2196f3",
    width: 40,
    height: 40
  },
  slotInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
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

  console.log("AddOrderForm - User data (userData):", userData)
  console.log("AddOrderForm - User data (app):", appUser)
  console.log("AddOrderForm - Final user object:", user)
  console.log("AddOrderForm - User jobTitle:", user?.jobTitle)
  console.log("AddOrderForm - Token:", token)

  // Debug: Check localStorage for persisted user data
  try {
    const persistedState = localStorage.getItem("persist:root")
    if (persistedState) {
      const parsedState = JSON.parse(persistedState)
      console.log(
        "AddOrderForm - Persisted userData:",
        parsedState.userData ? JSON.parse(parsedState.userData) : null
      )
    }
  } catch (error) {
    console.log("AddOrderForm - Error reading persisted state:", error)
  }

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
    selectedSlot: "",
    cavity: "",
    sales: null,
    dealer: null
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [isInstantOrder, setIsInstantOrder] = useState(
    user?.jobTitle === "OFFICE_STAFF" ||
      user?.jobTitle === "OFFICE_ADMIN" ||
      user?.jobTitle === "SUPERADMIN"
  )
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

  console.log("AddOrderForm - Sales array:", sales)
  console.log("AddOrderForm - Dealers array:", dealers)
  const [cavities] = useState([
    { label: "10 Cavity", value: 10 },
    { label: "8 Cavity", value: 8 }
  ])
  const [dealerWallet, setDealerWallet] = useState({})
  const [rate, setRate] = useState(null)
  const [available, setAvailable] = useState(null)

  const steps = ["Order Type", "Farmer Details", "Plant & Slot", "Review & Submit"]

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

  // Auto-fill farmer data when mobile number is entered
  useEffect(() => {
    console.log(
      "Mobile number changed:",
      formData.mobileNumber,
      "Length:",
      formData.mobileNumber?.length
    )
    if (formData.mobileNumber?.length === 10) {
      console.log("Mobile number is 10 digits, calling getFarmerByMobile")
      getFarmerByMobile(formData.mobileNumber)
    } else if (farmerData && formData.mobileNumber?.length < 10) {
      console.log("Mobile number is less than 10 digits, resetting farmer data")
      resetFarmerData()
    }
  }, [formData.mobileNumber])

  useEffect(() => {
    if (formData.plant) {
      loadSubTypes(formData.plant)
    }
  }, [formData.plant])

  useEffect(() => {
    if (formData.subtype) {
      loadSlots(formData.plant, formData.subtype)
    }
  }, [formData.subtype])

  const loadInitialData = async () => {
    console.log("loadInitialData called")
    setLoading(true)
    try {
      console.log("Starting to load initial data...")
      await Promise.all([loadPlants(), loadSales(), loadDealers()])
      console.log("Initial data loaded successfully")
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
            value: plant.plantId
          }))
        )
      }
    } catch (error) {
      console.error("Error loading plants:", error)
    }
  }

  const loadSubTypes = async (plantId) => {
    try {
      console.log("Loading subtypes for plant:", plantId)
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request(null, { plantId, year: 2025 })
      console.log("Subtypes API response:", response)
      if (response?.data?.subtypes) {
        const subtypes = response.data.subtypes.map((subtype) => ({
          label: subtype.subtypeName,
          value: subtype.subtypeId,
          rate: subtype.rates && subtype.rates.length > 0 ? subtype.rates[0] : 0
        }))
        console.log("Processed subtypes:", subtypes)
        setSubTypes(subtypes)
      } else {
        console.log("No subtypes data in response")
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
      const instance = NetworkManager(API.slots.GET_PLANTS_SLOTS)
      const response = await instance.request(null, { plantId, subtypeId, year: 2025 })
      console.log("Slots API response:", response)

      if (response?.data?.slots?.[0]?.slots) {
        const data = response.data.slots[0].slots
        console.log("Raw slots data:", data)

        const processedSlots = data
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

            if (!startDay || !endDay) {
              console.log("Skipping slot with missing dates:", slot)
              return null
            }

            // Validate date format
            const startDateValid = moment(startDay, "DD-MM-YYYY", true).isValid()
            const endDateValid = moment(endDay, "DD-MM-YYYY", true).isValid()

            console.log("Validating slot dates:", {
              slotId: _id,
              startDay,
              endDay,
              startDateValid,
              endDateValid
            })

            if (!startDateValid || !endDateValid) {
              console.log("Skipping slot with invalid date format:", {
                startDay,
                endDay,
                startDateValid,
                endDateValid
              })
              return null
            }

            const start = moment(startDay, "DD-MM-YYYY").format("D")
            const end = moment(endDay, "DD-MM-YYYY").format("D")
            const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")

            // Calculate available plants
            const available = availablePlants || totalPlants - (totalBookedPlants || 0)

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
          .filter((slot) => slot !== null && slot.availableQuantity > 0)

        console.log("Processed slots:", processedSlots)
        setSlots(processedSlots)
      } else {
        console.log("No slots data in response")
        setSlots([])
      }
    } catch (error) {
      console.error("Error loading slots:", error)
      setSlots([])
    }
  }

  const loadSales = async () => {
    try {
      console.log("Loading salespeople...")
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const response = await instance.request(null, { jobTitle: "SALES" })
      console.log("Salespeople API response:", response)
      if (response?.data?.data) {
        const salespeople = response.data.data.map((salesperson) => ({
          label: salesperson.name,
          value: salesperson._id
        }))
        console.log("Processed salespeople:", salespeople)
        setSales(salespeople)
      } else {
        console.log("No salespeople data in response")
      }
    } catch (error) {
      console.error("Error loading salespeople:", error)
    }
  }

  const loadDealers = async () => {
    try {
      console.log("Loading dealers...")
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE)
      const response = await instance.request(null, { jobTitle: "DEALER" })
      console.log("Dealers API response:", response)
      if (response?.data?.data) {
        const dealersList = response.data.data.map((dealer) => ({
          label: dealer.name,
          value: dealer._id
        }))
        console.log("Processed dealers:", dealersList)
        setDealers(dealersList)
      } else {
        console.log("No dealers data in response")
      }
    } catch (error) {
      console.error("Error loading dealers:", error)
    }
  }

  const loadDealerWallet = async (dealerId) => {
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_STATS)
      const response = await instance.request(null, [dealerId])
      if (response?.data) {
        setDealerWallet(response.data)
      }
    } catch (error) {
      console.error("Error loading dealer wallet:", error)
    }
  }

  const getFarmerByMobile = async (mobileNumber) => {
    try {
      console.log("Fetching farmer by mobile:", mobileNumber)
      const instance = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE)
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
      // On error, reset farmer data but keep Maharashtra as default state
      resetFarmerData()
    }
  }

  const resetFarmerData = () => {
    setFarmerData({})
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

  const getRemainingQuantity = () => {
    if (
      !dealerWallet?.plantDetails ||
      !formData.plant ||
      !formData.subtype ||
      !formData.selectedSlot
    ) {
      return null
    }

    const plantDetail = dealerWallet.plantDetails.find(
      (plant) => plant.plantType === formData.plant && plant.subType === formData.subtype
    )

    if (!plantDetail) return null

    const slot = plantDetail.slotDetails.find((slot) => slot.slotId === formData.selectedSlot)
    return slot ? slot.remainingQuantity : null
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))

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

    // Auto-set rate when subtype is selected
    if (field === "subtype") {
      console.log("Subtype selected:", value)
      console.log("Available subtypes:", subTypes)
      const selectedSubtype = subTypes.find((st) => st.value === value)
      console.log("Selected subtype:", selectedSubtype)
      if (selectedSubtype) {
        console.log("Setting rate to:", selectedSubtype.rate)
        setFormData((prev) => ({
          ...prev,
          rate: selectedSubtype.rate
        }))
        setRate(selectedSubtype.rate)
      }
    }

    // Set available quantity when slot is selected
    if (field === "selectedSlot") {
      const selectedSlot = slots.find((slot) => slot.value === value)
      if (selectedSlot) {
        setAvailable(selectedSlot.availableQuantity)
      }
    }
  }

  const validateForm = () => {
    const requiredFields = [
      "name",
      "mobileNumber",
      "noOfPlants",
      "plant",
      "subtype",
      "selectedSlot",
      "cavity"
    ]

    if (!bulkOrder) {
      requiredFields.push("village", "taluka", "district", "state")
    }

    for (const field of requiredFields) {
      if (!formData[field]) {
        Toast.error(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`)
        return false
      }
    }

    if (formData.mobileNumber && formData.mobileNumber.length !== 10) {
      Toast.error("Mobile number must be 10 digits")
      return false
    }

    if (user?.jobTitle === "DEALER" && !quotaType) {
      Toast.error("Please select quota type")
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    // Show confirmation popup with farmer name and dates in bold
    const selectedPlant = plants.find((p) => p.value === formData.plant)
    const selectedSubtype = subTypes.find((s) => s.value === formData.subtype)
    const selectedSlot = slots.find((s) => s.value === formData.selectedSlot)
    const selectedSales = sales.find((s) => s.value === formData.sales)

    setConfirmationData({
      farmerName: formData.name,
      mobileNumber: formData.mobileNumber,
      orderDate: formData.date,
      plantName: selectedPlant?.label || "",
      plantSubtype: selectedSubtype?.label || "",
      numberOfPlants: formData.noOfPlants,
      rate: formData.rate,
      slotPeriod: selectedSlot ? `${selectedSlot.startDay} - ${selectedSlot.endDay}` : "",
      salesPerson: selectedSales?.label || "",
      location: `${formData.village}, ${formData.taluka}, ${formData.district}`,
      orderType: isInstantOrder ? "Instant Order" : bulkOrder ? "Bulk Order" : "Normal Order"
    })

    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false)
    setLoading(true)

    try {
      console.log("Creating order payload with bookingSlot:", formData.selectedSlot)
      const selectedSlotDetails = slots.find((s) => s.value === formData.selectedSlot)
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
      if (!objectIdRegex.test(formData.selectedSlot)) {
        throw new Error("Selected slot ID is not in valid ObjectId format")
      }

      const payload = {
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
        salesPerson: formData.sales || user?._id,
        orderStatus: isInstantOrder ? "DISPATCHED" : "PENDING",
        plantName: formData.plant,
        plantSubtype: formData.subtype,
        bookingSlot: formData.selectedSlot, // This should be a valid ObjectId string
        orderPaymentStatus: "PENDING",
        cavity: formData.cavity,
        componyQuota: quotaType === "company",
        orderBookingDate:
          formData.date instanceof Date ? formData.date.toISOString() : formData.date
      }

      console.log("Final payload:", payload)

      let endpoint
      if (user?.jobTitle === "DEALER" && bulkOrder) {
        endpoint = API.ORDER.CREATE_DEALER_ORDER
        payload.dealerOrder = true
        payload.dealer = formData.sales || user?._id
        payload.salesPerson = user?._id
      } else {
        endpoint = API.FARMER.CREATE_FARMER
      }

      const instance = NetworkManager(endpoint)
      const response = await instance.request(payload)

      if (response?.data) {
        Toast.success("Order added successfully")
        onSuccess?.()
        handleClose()
      }
    } catch (error) {
      console.error("Error creating order:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      let errorMessage = "An error occurred while creating the order"

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      // Check for specific slot-related errors
      if (
        errorMessage.includes("delivery") ||
        errorMessage.includes("slot") ||
        errorMessage.includes("date")
      ) {
        console.error("Slot-related error detected:", errorMessage)
        errorMessage = `Slot Error: ${errorMessage}. Please try selecting a different slot.`
      }

      Toast.error(errorMessage)
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
      selectedSlot: "",
      cavity: "",
      sales: null,
      dealer: null
    })
    setFarmerData({})
    setIsInstantOrder(
      user?.jobTitle === "OFFICE_STAFF" ||
        user?.jobTitle === "OFFICE_ADMIN" ||
        user?.jobTitle === "SUPERADMIN"
    )
    setBulkOrder(false)
    setQuotaType(null)
    setActiveStep(0)
    setShowConfirmation(false)
    setConfirmationData({})
    onClose()
  }

  const renderOrderTypeSelector = () => {
    if (user?.jobTitle === "DEALER") {
      return (
        <Card className={classes.formCard}>
          <div className={classes.cardHeader}>
            <Typography variant="h6" className={classes.sectionTitle}>
              <Assignment /> Order Type
            </Typography>
          </div>
          <CardContent className={classes.formSection}>
            <RadioGroup
              row
              value={bulkOrder ? "bulk" : "farmer"}
              onChange={(e) => setBulkOrder(e.target.value === "bulk")}>
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
            <Typography variant="h6" className={classes.sectionTitle}>
              <Assignment /> Order Type
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
                    <CheckIcon color="primary" />
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
            <Typography variant="h6" className={classes.sectionTitle}>
              <InfoIcon /> Quota Type
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

            {quotaType === "dealer" && formData.selectedSlot && (
              <Box className={classes.quotaInfo}>
                <InfoIcon color="primary" />
                <Typography variant="body2">
                  Your quota for this slot:{" "}
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
      maxWidth="lg"
      fullWidth
      className={classes.dialog}
      PaperProps={{
        style: { maxHeight: "95vh" }
      }}>
      <DialogTitle className={classes.dialogTitle}>
        <Box display="flex" alignItems="center" gap={2}>
          <AddIcon />
          Add New Order
        </Box>
        <IconButton className={classes.closeButton} onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box className={classes.formContainer}>
          {loading && (
            <Box className={classes.loadingOverlay}>
              <CircularProgress size={60} />
            </Box>
          )}

          {/* Stepper */}
          <Paper elevation={0} sx={{ mb: 3, p: 2 }}>
            <Stepper activeStep={activeStep} className={classes.stepper}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
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
                <Typography variant="h6" className={classes.sectionTitle}>
                  <PersonIcon /> Farmer Details
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

                <Grid container spacing={3}>
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
                      helperText={
                        farmerData?.name
                          ? "Farmer found in database - location auto-filled"
                          : "Enter 10-digit mobile number to auto-fill farmer details"
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
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Sales Person</InputLabel>
                    <Select
                      value={formData.sales || ""}
                      onChange={(e) => handleInputChange("sales", e.target.value)}
                      label="Select Sales Person">
                      <MenuItem value="">Select a sales person</MenuItem>
                      {sales.map((salesman) => (
                        <MenuItem key={salesman.value} value={salesman.value}>
                          {salesman.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Dealer</InputLabel>
                    <Select
                      value={formData.dealer || ""}
                      onChange={(e) => handleInputChange("dealer", e.target.value)}
                      label="Select Dealer">
                      <MenuItem value="">Select a dealer</MenuItem>
                      {dealers.map((dealer) => (
                        <MenuItem key={dealer.value} value={dealer.value}>
                          {dealer.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mt: 2 }}>
                The selected sales person or dealer will be assigned to this order.
              </Alert>
            </CardContent>
          </Card>

          {/* Plant Details */}
          <Card className={classes.formCard}>
            <div className={classes.cardHeader}>
              <Typography variant="h6" className={classes.sectionTitle}>
                <PlantIcon /> Plant & Slot Details
              </Typography>
            </div>
            <CardContent className={classes.formSection}>
              <Grid container spacing={3}>
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
                          {subtype.label} - ₹{subtype.rate}
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

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Slot</InputLabel>
                    <Select
                      value={formData.selectedSlot || ""}
                      onChange={(e) => handleInputChange("selectedSlot", e.target.value)}
                      label="Select Slot"
                      disabled={!formData.subtype}>
                      {slots.map((slot) => (
                        <MenuItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Number of Plants"
                    type="number"
                    value={formData.noOfPlants}
                    onChange={(e) => handleInputChange("noOfPlants", e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Rate per Plant"
                    type="number"
                    value={formData.rate}
                    onChange={(e) => handleInputChange("rate", e.target.value)}
                    helperText="Rate will auto-fill when subtype is selected, but can be modified"
                  />
                </Grid>

                {available !== null && (
                  <Grid item xs={12}>
                    <Box className={classes.slotInfo}>
                      <Typography variant="body2" fontWeight={500}>
                        Available quantity in selected slot:
                      </Typography>
                      <Chip label={available} color="primary" variant="outlined" size="small" />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, background: "#fafafa" }}>
        <Button onClick={handleClose} color="secondary" variant="outlined" size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
          className={classes.submitButton}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}>
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
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#2c3e50" }}>
              Please confirm the following order details:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

              {/* Dates */}
              <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 1, border: "1px solid #2196f3" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1976d2", mb: 1 }}>
                  Important Dates
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Order Date:</strong>{" "}
                  {moment(confirmationData.orderDate).format("DD/MM/YYYY")}
                </Typography>
                {confirmationData.slotPeriod && (
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#e74c3c" }}>
                    <strong>Delivery Period:</strong> {confirmationData.slotPeriod}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, background: "#fafafa" }}>
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
