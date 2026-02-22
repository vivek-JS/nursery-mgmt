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
  Checkbox,
  ImageList,
  ImageListItem,
  ImageListItemBar
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
  FlashOn as FlashIcon,
  PhotoCamera as CameraIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon
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
    },
    "&.fullScreenDialog .MuiDialog-paper": {
      maxWidth: "100%",
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      borderRadius: 0
    }
  },
  dialogTitle: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "10px 16px",
    position: "relative",
    "& .MuiTypography-root": {
      fontSize: "1.1rem",
      fontWeight: 600
    }
  },
  closeButton: {
    position: "absolute",
    right: 8,
    top: 8,
    color: "white",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.1)"
    }
  },
  formContainer: {
    padding: "8px 12px",
    maxWidth: 520,
    margin: "0 auto",
    background: "#fafafa",
    "& .MuiFormHelperText-root": {
      marginLeft: 0,
      paddingLeft: "14px",
      marginTop: 2
    },
    "& .MuiOutlinedInput-root .MuiOutlinedInput-input": {
      padding: "10px 12px",
      fontSize: "0.875rem",
      boxSizing: "border-box"
    }
  },
  formCard: {
    marginBottom: 8,
    borderRadius: 6,
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    border: "1px solid #e8e8e8",
    transition: "all 0.2s ease",
    "&:hover": {
      boxShadow: "0 2px 12px rgba(0,0,0,0.1)"
    }
  },
  cardHeader: {
    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
    padding: "6px 10px",
    borderBottom: "1px solid #e0e0e0",
    borderRadius: "6px 6px 0 0"
  },
  sectionTitle: {
    color: "#2c3e50",
    fontWeight: 600,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  orderTypeContainer: {
    marginBottom: 10
  },
  quotaTypeContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    border: "1px solid #e9ecef"
  },
  quotaInfo: {
    marginTop: 6,
    padding: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
    border: "1px solid #2196f3",
    display: "flex",
    alignItems: "center",
    gap: 6
  },
  submitButton: {
    marginTop: 8,
    padding: "8px 24px",
    fontSize: "0.9rem",
    borderRadius: 6,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "&:hover": {
      background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
    }
  },
  stepper: {
    padding: "4px 0",
    background: "transparent",
    width: "100%"
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
    padding: "8px 12px",
    "& .MuiGrid-item": {
      marginBottom: 2
    }
  },
  infoChip: {
    margin: "2px 0",
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
    gap: 6,
    padding: 6,
    backgroundColor: "#f0f8ff",
    borderRadius: 6,
    border: "1px solid #2196f3",
    marginBottom: 6
  },
  avatar: {
    backgroundColor: "#2196f3",
    width: 28,
    height: 28
  },
  slotInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    marginTop: 6
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
  },
  compactForm: {
    "& .MuiCardContent-root": { padding: "8px 12px", "&:last-child": { paddingBottom: 8 } },
    "& .MuiCard-root": { marginBottom: 8 },
    "& .MuiFormControlLabel-root": { marginLeft: 0, marginRight: 0 },
    "& .MuiAlert-root": { padding: "6px 12px", "& .MuiAlert-message": { fontSize: "0.8rem" } },
    "& .MuiTypography-body2": { fontSize: "0.8rem" },
    "& .MuiTypography-subtitle1": { fontSize: "0.85rem" },
    "& .MuiTypography-subtitle2": { fontSize: "0.8rem" },
    "& .MuiInputBase-input": { fontSize: "0.875rem" },
    "& .MuiInputLabel-root": { fontSize: "0.875rem" },
    "& .MuiFormLabel-root": { fontSize: "0.875rem" },
    "& .MuiOutlinedInput-input": {
      fontSize: "0.875rem",
      padding: "10px 12px",
      boxSizing: "border-box"
    },
    "& .MuiFormHelperText-root": { paddingLeft: "12px" }
  }
}))

const AddOrderForm = ({ open, onClose, onSuccess, fullScreen = false }) => {
  const { classes } = useStyles()
  
  // ============================================================================
  // REDUX & USER DATA
  // ============================================================================
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const token = useSelector((state) => state?.app?.token)
  const user = userData || appUser || {}

  // ============================================================================
  // FORM STATE
  // ============================================================================
  const [formData, setFormData] = useState(() => ({
    date: new Date(),
    name: "",
    village: "",
    taluka: "",
    district: "",
    state: "Maharashtra", // Default state
    stateName: "Maharashtra",
    districtName: "",
    talukaName: "",
    mobileNumber: "",
    noOfPlants: "",
    typeOfPlant: "",
    rate: "",
    plant: "",
    subtype: "",
    orderDate: null, // Changed from selectedSlot to orderDate
    transferredSlotId: null, // Slot ID if booking is transferred to nearby slot
    cavity: "",
    sales: null,
    dealer: null,
    // Order For fields
    orderForEnabled: false,
    orderForName: "",
    orderForAddress: "",
    orderForMobileNumber: "",
    // Screenshot fields
    screenshots: []
  }))

  // ============================================================================
  // UI STATE
  // ============================================================================
  const [loading, setLoading] = useState(false)
  const [mobileLoading, setMobileLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [mappingsLoading, setMappingsLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationData, setConfirmationData] = useState({})

  // ============================================================================
  // ORDER TYPE STATE
  // ============================================================================
  const [isInstantOrder, setIsInstantOrder] = useState(false)
  const [bulkOrder, setBulkOrder] = useState(false)
  const [quotaType, setQuotaType] = useState(null) // "dealer" or "company"

  // ============================================================================
  // FARMER DATA STATE
  // ============================================================================
  const [farmerData, setFarmerData] = useState({})

  // ============================================================================
  // DROPDOWN DATA STATE
  // ============================================================================
  const [plants, setPlants] = useState([])
  const [subTypes, setSubTypes] = useState([])
  const [slots, setSlots] = useState([])
  const [sales, setSales] = useState([])
  const [dealers, setDealers] = useState([])
  const [cavities, setCavities] = useState([])

  // ============================================================================
  // SLOT & PRODUCT STATE
  // ============================================================================
  const [allSlots, setAllSlots] = useState([])
  const [filteredSlotsByProduct, setFilteredSlotsByProduct] = useState([])
  const [plantProductMappings, setPlantProductMappings] = useState([])
  const [plantDetails, setPlantDetails] = useState(new Map())
  const [available, setAvailable] = useState(null)

  // ============================================================================
  // DEALER & RATE STATE
  // ============================================================================
  const [dealerWallet, setDealerWallet] = useState({})
  const [rate, setRate] = useState(null)
  const [rateManuallySet, setRateManuallySet] = useState(false)

  // ============================================================================
  // PAYMENT STATE
  // ============================================================================
  const [newPayment, setNewPayment] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    remark: "",
    receiptPhoto: [], // Array of image URLs (uploaded to media endpoint)
    paymentStatus: "PENDING", // Default to PENDING, will be updated based on payment type
    isWalletPayment: false
  })

  // ============================================================================
  // CONSTANTS
  // ============================================================================
  const steps = [
    "Order Type",
    "Farmer Details",
    "Plant & Slot",
    "Payment Management",
    "Review & Submit"
  ]

  // ============================================================================
  // EFFECTS - INITIALIZATION
  // ============================================================================
  
  // Initialize form with user defaults
  useEffect(() => {
    if (user && Object.keys(user).length > 0) {
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
    }
    // Note: Default state is already set in initial state, so no need to set it again
  }, [user])


  // Load initial data on mount
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
  const debouncedMobileNumber = useDebounce(formData?.mobileNumber || "", 500)

  // Auto-fill farmer data when mobile number is entered
  useEffect(() => {
    if (debouncedMobileNumber?.length === 10) {
      setMobileLoading(true)
      getFarmerByMobile(debouncedMobileNumber)
    } else if (farmerData && debouncedMobileNumber?.length < 10) {
      resetFarmerData()
    }
  }, [debouncedMobileNumber])

  // Load subtypes and product mappings when plant changes
  useEffect(() => {
    if (formData?.plant) {
      loadSubTypes(formData?.plant)
      loadAllPlantProductMappings(formData?.plant)
    }
  }, [formData?.plant])

  // Load slots when subtype changes
  useEffect(() => {
    if (formData?.subtype) {
      loadSlots(formData?.plant, formData?.subtype)
    }
  }, [formData?.subtype, quotaType, dealerWallet, formData?.dealer])

  // Ensure wallet payment is unchecked for dealer orders
  useEffect(() => {
    if (bulkOrder && newPayment.isWalletPayment) {
      setNewPayment((prev) => ({ ...prev, isWalletPayment: false }))
    }
  }, [bulkOrder])

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================
  
  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadPlants(), loadSales(), loadDealers(), loadCavities()])
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
        const plantsData = response.data.map((plant) => ({
          label: plant.name,
          value: plant.plantId,
          sowingAllowed: plant.sowingAllowed || false // Track if sowing is allowed
        }))
        setPlants(plantsData)
        // Store full plant data for subtype name lookup
        const plantsMap = new Map()
        response.data.forEach(plant => {
          plantsMap.set(plant.plantId, plant)
        })
        setPlantDetails(plantsMap)
      }
    } catch (error) {
      console.error("Error loading plants:", error)
    }
  }
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  // Calculate form completion percentage
  const getFormCompletionPercentage = () => {
    const requiredFields = [
      'name', 'mobileNumber', 'village', 'taluka', 'district', 'state',
      'noOfPlants', 'plant', 'subtype', 'orderDate', 'cavity'
    ]
    const filledFields = requiredFields.filter(field => {
      const value = formData?.[field]
      return value !== null && value !== undefined && value !== ''
    })
    return Math.round((filledFields.length / requiredFields.length) * 100)
  }

  // Get form completion status
  const getFormCompletionStatus = () => {
    const percentage = getFormCompletionPercentage()
    if (percentage === 100) return { text: 'Ready to Submit', color: 'success' }
    if (percentage >= 75) return { text: 'Almost Complete', color: 'warning' }
    if (percentage >= 50) return { text: 'In Progress', color: 'info' }
    return { text: 'Getting Started', color: 'default' }
  }

  // Get missing required fields
  const getMissingFields = () => {
    const requiredFields = {
      name: 'Farmer Name',
      mobileNumber: 'Mobile Number',
      village: 'Village',
      taluka: 'Taluka',
      district: 'District',
      state: 'State',
      noOfPlants: 'Number of Plants',
      plant: 'Plant',
      subtype: 'Subtype',
      orderDate: 'Order Date',
      cavity: 'Cavity'
    }
    
    const missing = []
    Object.entries(requiredFields).forEach(([key, label]) => {
      const value = formData?.[key]
      if (!value || value === '' || (key === 'mobileNumber' && value.length !== 10)) {
        missing.push(label)
      }
    })
    
    return missing
  }

  // Get subtype name from subtypeId
  const getSubtypeName = (subtypeId, plantId) => {
    if (!subtypeId || !plantId) return ""
    
    // First try from subTypes list (if subtype is selected)
    const subtype = subTypes.find(s => 
      s.value === subtypeId || 
      s.value?.toString() === subtypeId?.toString()
    )
    if (subtype) return subtype.label
    
    // Then try from plant details Map
    const plant = plantDetails.get(plantId)
    if (plant && plant.subtypes) {
      const subtypeObj = plant.subtypes.find(st => 
        st._id?.toString() === subtypeId?.toString() ||
        st.subtypeId?.toString() === subtypeId?.toString()
      )
      if (subtypeObj) return subtypeObj.name || subtypeObj.subtypeName || ""
    }
    
    return ""
  }

  const loadCavities = async () => {
    try {
      const instance = NetworkManager(API.TRAY.GET_TRAYS)
      const response = await instance.request({}, { page: 1, limit: 100, status: "true" })
      const trayData = response?.data?.data?.data || []

      const formattedCavities = trayData
        .filter((tray) => tray?.isActive !== false)
        .map((tray) => ({
          value: tray._id,
          label: tray.name ? `${tray.name} (${tray.cavity} cavity)` : `${tray.cavity} cavity`,
          cavity: tray.cavity,
          numberPerCrate: tray.numberPerCrate,
          name: tray.name
        }))

      setCavities(formattedCavities)
    } catch (error) {
      console.error("Error loading cavities:", error)
      setCavities([])
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

  // Load all plant product mappings for a plant (all subtypes)
  const loadAllPlantProductMappings = async (plantId) => {
    if (!plantId) {
      setPlantProductMappings([])
      setMappingsLoading(false)
      return
    }

    setMappingsLoading(true)
    try {
      // Use the endpoint: /api/v1/plant-product-mappings?plantId=xxx&isActive=true
      const instance = NetworkManager(API.INVENTORY.GET_ALL_PLANT_PRODUCT_MAPPINGS)
      const response = await instance.request({}, { plantId, isActive: true })
      
      if (response?.data) {
        const apiResponse = response.data
        const mappings = apiResponse?.data || apiResponse || []
        // Filter to only active mappings and ensure they're arrays
        const activeMappings = Array.isArray(mappings) 
          ? mappings.filter(m => m.isActive !== false)
          : []
        setPlantProductMappings(activeMappings)
      } else {
        setPlantProductMappings([])
      }
    } catch (error) {
      console.error("Error loading all plant product mappings:", error)
      setPlantProductMappings([])
    } finally {
      setMappingsLoading(false)
    }
  }

  // Load plant product mappings for ready plants products (kept for backward compatibility)
  const loadPlantProductMappings = async (plantId, subtypeId) => {
    if (!plantId || !subtypeId) {
      setPlantProductMappings([])
      setMappingsLoading(false)
      return
    }

    setMappingsLoading(true)
    try {
      // Use the endpoint: /api/v1/plant-product-mappings/plant/:plantId/subtype/:subtypeId
      const instance = NetworkManager(API.INVENTORY.GET_MAPPINGS_BY_PLANT_SUBTYPE)
      // The endpoint expects plantId and subtypeId as path parameters (array)
      const response = await instance.request({}, [plantId, subtypeId])
      
      if (response?.data) {
        const apiResponse = response.data
        const mappings = apiResponse?.data || apiResponse || []
        // Filter to only active mappings
        const activeMappings = Array.isArray(mappings) 
          ? mappings.filter(m => m.isActive !== false)
          : []
        setPlantProductMappings(activeMappings)
      } else {
        setPlantProductMappings([])
      }
    } catch (error) {
      console.error("Error loading plant product mappings:", error)
      setPlantProductMappings([])
    } finally {
      setMappingsLoading(false)
    }
  }

  // Check if a date is within a product's date range
  const isDateInProductRange = (selectedDate, dateRange) => {
    if (!selectedDate || !dateRange || !dateRange.startDate || !dateRange.endDate) {
      return false
    }
    
    const selected = moment(selectedDate)
    const start = moment(dateRange.startDate, "DD-MM-YYYY", true)
    const end = moment(dateRange.endDate, "DD-MM-YYYY", true)
    
    if (!start.isValid() || !end.isValid()) {
      return false
    }
    
    return selected.isSameOrAfter(start, "day") && selected.isSameOrBefore(end, "day")
  }

  const loadSlots = async (plantId, subtypeId) => {
    setSlotsLoading(true)
    try {
      // Check if dealer quota should be used
      const shouldUseDealerQuota =
        formData?.dealer && quotaType === "dealer" && dealerWallet?.entries

      if (shouldUseDealerQuota) {
        // Filter dealer wallet entries for the selected plant and subtype
        const relevantEntries = dealerWallet.entries.filter(
          (entry) => entry.plantTypeId === plantId && entry.subTypeId === subtypeId
        )

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

        setAllSlots(dealerQuotaSlots)
        setSlots(dealerQuotaSlots)
        setFilteredSlotsByProduct([])
        return
      }

      // Use fast simple slots endpoint for non-dealer quota
      // Fetch slots for both 2025 and 2026
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS)
      const years = [2025, 2026]
      
      // Fetch slots for both years in parallel
      const responses = await Promise.all(
        years.map(year => instance.request({}, { plantId, subtypeId, year }))
      )

      // Combine slots from both years
      let allSlotsData = []
      
      responses.forEach((response, index) => {
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
        const isSowingAllowedPlant = selectedPlant?.sowingAllowed

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

            // Include productStock if available
            const productStock = slot.productStock || []
            
            return {
              label: `${start} - ${end} ${monthYear} (${available} available)`,
              value: _id,
              availableQuantity: available,
              startDay,
              endDay,
              totalPlants,
              totalBookedPlants,
              productStock: productStock // Include productStock for product selection
            }
          })
          .filter((slot) => {
            // For sowing-allowed plants, show all slots (even with negative availability)
            // For regular plants, only show slots with positive availability
            return slot !== null && (isSowingAllowedPlant || slot.availableQuantity > 0)
          })

        setAllSlots(processedSlots) // Store all slots
        // Apply product date range filter if a product is selected
        if (formData?.productMappingId) {
          const selectedMapping = plantProductMappings.find(m => m._id === formData.productMappingId)
          if (selectedMapping) {
            const filtered = processedSlots.filter(slot => {
              if (!slot.startDay || !slot.endDay) return false
              const slotStart = moment(slot.startDay, "DD-MM-YYYY")
              const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
              const productStart = moment(selectedMapping.dateRange.startDate, "DD-MM-YYYY")
              const productEnd = moment(selectedMapping.dateRange.endDate, "DD-MM-YYYY")
              // Check if slot overlaps with product date range
              return (slotStart.isSameOrAfter(productStart, "day") && slotStart.isSameOrBefore(productEnd, "day")) ||
                     (slotEnd.isSameOrAfter(productStart, "day") && slotEnd.isSameOrBefore(productEnd, "day")) ||
                     (slotStart.isBefore(productStart, "day") && slotEnd.isAfter(productEnd, "day"))
            })
            setSlots(filtered)
            setFilteredSlotsByProduct(filtered)
          } else {
            setSlots(processedSlots)
            setFilteredSlotsByProduct([])
          }
        } else {
          setSlots(processedSlots)
          setFilteredSlotsByProduct([])
        }
      } else {
        setSlots([])
        setAllSlots([])
        setFilteredSlotsByProduct([])
      }
    } catch (error) {
      console.error("Error loading slots:", error)
      setSlots([])
      setAllSlots([])
      setFilteredSlotsByProduct([])
    } finally {
      setSlotsLoading(false)
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
      const instance = NetworkManager(API.USER.GET_DEALER_WALLET_DETAILS)
      const response = await instance.request(null, [dealerId])

      // Transform the API response to match expected structure
      // Check both possible structures
      const plantDetails = response.data?.plantDetails || response.data?.data?.plantDetails
      const financial = response.data?.financial || response.data?.data?.financial

      if (plantDetails) {
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
        setDealerWallet(walletData)

        // Create slot details from wallet data instead of calling separate API
        await createSlotDetailsFromWallet(entries)
      } else {
        setDealerWallet({})
      }
    } catch (error) {
      console.error("Error loading dealer wallet:", error)
      setDealerWallet({})
    }
  }

  // Create slot details from dealer wallet entries (using dates from wallet data)
  const createSlotDetailsFromWallet = async (entries) => {
    try {
      // Get unique slot IDs from entries
      const slotIds = [...new Set(entries.map((entry) => entry.bookingSlotId))]

      // Check which slots are already loaded
      const existingSlotIds = slots.map((slot) => slot.value)
      const missingSlotIds = slotIds.filter((id) => !existingSlotIds.includes(id))

      if (missingSlotIds.length === 0) {
        return
      }

      // Create slot details from wallet data
      for (const slotId of missingSlotIds) {
        try {
          // Find the entry with this slot ID
          const entry = entries.find((entry) => entry.bookingSlotId === slotId)

          if (entry && entry.startDay && entry.endDay && entry.month) {

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
            }
          } else {
            // Fallback to placeholder
            const slotDetail = {
              value: slotId,
              label: `Slot ${slotId} (Date TBD)`,
              availableQuantity: entry?.remainingQuantity || 0
            }

            if (!slots.find((slot) => slot.value === slotId)) {
              setSlots((prev) => [...prev, slotDetail])
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
          }
        }
      }
    } catch (error) {
      console.error("Error in createSlotDetailsFromWallet:", error)
    }
  }

  const getFarmerByMobile = async (mobileNumber) => {
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE)
      const response = await instance.request(null, [mobileNumber])

      if (response?.data?.data) {
        const farmer = response.data.data
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

          return newFormData
        })
      } else {
        // No farmer found - reset farmer data but keep Maharashtra as default state
        resetFarmerData()
      }
    } catch (error) {
      console.error("Error fetching farmer:", error)
      // On error, reset farmer data but keep Maharashtra as default state
      resetFarmerData()
    } finally {
      setMobileLoading(false)
    }
  }

  const resetFarmerData = () => {
    setFarmerData({})
    setMobileLoading(false)
    
    // Only reset farmer-specific fields, keep user defaults for location
    if (user && Object.keys(user).length > 0) {
      const { defaultState, defaultDistrict, defaultTaluka, defaultVillage } = user
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
    } else {
      // If no user data, just reset farmer name and keep default state
      setFormData((prev) => ({
        ...prev,
        name: "",
        // Keep existing location values or defaults
        state: prev.state || "Maharashtra",
        stateName: prev.stateName || "Maharashtra"
      }))
    }
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

  // Helper function to check if a date should be disabled (not in any slot or outside product date range)
  const isDateDisabled = (date) => {
    if (!date || slots.length === 0) return true

    const dateMoment = moment(date)

    // If a product is selected, also check if date is within product's date range
    if (formData?.productMappingId) {
      const mapping = plantProductMappings.find(m => m._id === formData.productMappingId)
      if (mapping) {
        const productStart = moment(mapping.dateRange.startDate, "DD-MM-YYYY")
        const productEnd = moment(mapping.dateRange.endDate, "DD-MM-YYYY")
        // If date is outside product range, disable it
        if (dateMoment.isBefore(productStart, "day") || dateMoment.isAfter(productEnd, "day")) {
          return true
        }
      }
    }

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
  // If productMappingId is selected, use productStock availability; otherwise use general slot availability
  const getAvailableQuantityForDate = (selectedDate, productMappingId = null, productName = null) => {
    const slotId = getSlotIdForDate(selectedDate)
    if (!slotId) return null

    const slot = slots.find((s) => s.value === slotId)
    if (!slot) return null

    // If productMappingId is selected, check productStock availability
    if (productMappingId && slot.productStock && slot.productStock.length > 0) {
      const product = slot.productStock.find(p => 
        p.productMappingId && p.productMappingId.toString() === productMappingId.toString()
      )
      if (product) {
        // Priority: available (received) first, then poQuantity (pending from PO)
        const receivedAvailable = (product.available || 0) - (product.booked || 0)
        const pendingAvailable = product.poQuantity || 0
        const totalAvailable = receivedAvailable + pendingAvailable
        return totalAvailable
      }
    }

    // Fallback: If productName is provided, check by productName
    if (productName && slot.productStock && slot.productStock.length > 0) {
      const product = slot.productStock.find(p => p.productName === productName)
      if (product) {
        const receivedAvailable = (product.available || 0) - (product.booked || 0)
        const pendingAvailable = product.poQuantity || 0
        const totalAvailable = receivedAvailable + pendingAvailable
        return totalAvailable
      }
    }

    // Default: use general slot availability
    return slot?.availableQuantity || null
  }

  // Helper function to get available quantity for a product mapping
  const getAvailableQuantityForProduct = (mapping) => {
    if (!mapping) return 0
    
    // Priority 1: Use mapping's totalQuantity minus allocatedQuantity (source of truth)
    if (mapping.totalQuantity !== undefined && mapping.allocatedQuantity !== undefined) {
      const mappingAvailable = Math.max(0, (mapping.totalQuantity || 0) - (mapping.allocatedQuantity || 0))
      return mappingAvailable
    }
    
    // Priority 2: Use stockInfo from API response if available
    if (mapping.stockInfo) {
      if (mapping.stockInfo.mappingAvailableQuantity !== undefined) {
        return mapping.stockInfo.mappingAvailableQuantity
      }
      if (mapping.stockInfo.totalAvailable !== undefined) {
        return mapping.stockInfo.totalAvailable
      }
    }
    
    // Fallback: Calculate from slots if stockInfo not available
    if (!allSlots.length) return 0
    
    let totalAvailable = 0
    allSlots.forEach(slot => {
      if (!slot.startDay || !slot.endDay) return
      
      // Check if slot is within product date range
      const slotStart = moment(slot.startDay, "DD-MM-YYYY")
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
      const productStart = moment(mapping.dateRange.startDate, "DD-MM-YYYY")
      const productEnd = moment(mapping.dateRange.endDate, "DD-MM-YYYY")
      
      const isInRange = (slotStart.isSameOrAfter(productStart, "day") && slotStart.isSameOrBefore(productEnd, "day")) ||
                        (slotEnd.isSameOrAfter(productStart, "day") && slotEnd.isSameOrBefore(productEnd, "day")) ||
                        (slotStart.isBefore(productStart, "day") && slotEnd.isAfter(productEnd, "day"))
      
      if (isInRange && slot.productStock && slot.productStock.length > 0) {
        const product = slot.productStock.find(p => 
          p.productMappingId && p.productMappingId.toString() === mapping._id.toString()
        )
        if (product) {
          const receivedAvailable = (product.available || 0) - (product.booked || 0)
          const pendingAvailable = product.poQuantity || 0
          totalAvailable += receivedAvailable + pendingAvailable
        }
      }
    })
    
    return totalAvailable
  }

  // Helper function to find nearby slots (±5 days) with availability
  const findNearbyAvailableSlots = (selectedDate, productMappingId = null, productName = null) => {
    if (!selectedDate || slots.length === 0) return []

    const selectedMoment = moment(selectedDate)
    const nearbySlots = []

    slots.forEach((slot) => {
      if (!slot.startDay || !slot.endDay) return

      const slotStart = moment(slot.startDay, "DD-MM-YYYY")
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
      
      // Calculate days difference from selected date to slot
      const daysDiffStart = Math.abs(selectedMoment.diff(slotStart, "days"))
      const daysDiffEnd = Math.abs(selectedMoment.diff(slotEnd, "days"))
      const minDaysDiff = Math.min(daysDiffStart, daysDiffEnd)

      // Check if slot is within ±5 days
      if (minDaysDiff <= 5) {
        // Calculate availability for this slot
        let availableQty = slot.availableQuantity || 0

        // If productMappingId is selected, check productStock availability
        if (productMappingId && slot.productStock && slot.productStock.length > 0) {
          const product = slot.productStock.find(p => 
            p.productMappingId && p.productMappingId.toString() === productMappingId.toString()
          )
          if (product) {
            const receivedAvailable = (product.available || 0) - (product.booked || 0)
            const pendingAvailable = product.poQuantity || 0
            availableQty = receivedAvailable + pendingAvailable
          }
        } else if (productName && slot.productStock && slot.productStock.length > 0) {
          // Fallback: check by productName
          const product = slot.productStock.find(p => p.productName === productName)
          if (product) {
            const receivedAvailable = (product.available || 0) - (product.booked || 0)
            const pendingAvailable = product.poQuantity || 0
            availableQty = receivedAvailable + pendingAvailable
          }
        }

        // Only include slots with positive availability
        if (availableQty > 0) {
          const isBefore = slotStart.isBefore(selectedMoment, "day")
          const isAfter = slotEnd.isAfter(selectedMoment, "day")
          
          nearbySlots.push({
            ...slot,
            daysDifference: minDaysDiff,
            direction: isBefore ? "before" : isAfter ? "after" : "overlap",
            calculatedAvailability: availableQty
          })
        }
      }
    })

    // Sort by days difference (closest first)
    return nearbySlots.sort((a, b) => a.daysDifference - b.daysDifference)
  }

  const getRemainingQuantity = () => {
    if (!dealerWallet?.entries || !formData?.plant || !formData?.subtype || !formData?.orderDate) {
      return null
    }

    // Get slot ID for the selected order date
    const slotId = getSlotIdForDate(formData?.orderDate)
    if (!slotId) return null

    // Find the entry that matches plant, subtype, and slot
    const entry = dealerWallet.entries.find(
      (entry) =>
        entry.plantTypeId === formData?.plant &&
        entry.subTypeId === formData?.subtype &&
        entry.bookingSlotId === slotId
    )

    if (!entry) return null

    return entry.remainingQuantity || 0
  }

  // Get available plants for all slots when dealer quota is selected
  const getAvailablePlantsForSlots = () => {
    if (!dealerWallet?.entries || quotaType !== "dealer") {
      return []
    }

    const result = slots.map((slot) => {
      let entry = null

      // If plant and subtype are selected, find specific entry
      if (formData?.plant && formData?.subtype) {
        entry = dealerWallet.entries.find(
          (entry) =>
            entry.plantTypeId === formData?.plant &&
            entry.subTypeId === formData?.subtype &&
            entry.bookingSlotId === slot.value
        )
      } else {
        // If no plant/subtype selected, show all entries for this slot
        const slotEntries = dealerWallet.entries.filter(
          (entry) => entry.bookingSlotId === slot.value
        )
        if (slotEntries.length > 0) {
          // Sum up all available quantities for this slot
          const totalAvailable = slotEntries.reduce(
            (sum, entry) => sum + (entry.remainingQuantity || 0),
            0
          )
          entry = { remainingQuantity: totalAvailable }
        }
      }

      const slotInfo = {
        slotId: slot.value,
        slotLabel: slot.label,
        availableInWallet: entry ? entry.remainingQuantity : 0,
        totalInSlot: slot.availableQuantity,
        hasQuota: !!entry,
        showAllPlants: !formData?.plant || !formData?.subtype
      }

      return slotInfo
    })

    // Filter out slots with no available plants
    const filteredResult = result.filter((slotInfo) => {
      const hasAvailablePlants = slotInfo.availableInWallet > 0
      return hasAvailablePlants
    })

    return filteredResult
  }

  // Get total available plants in dealer quota for selected plant/subtype
  const getTotalAvailableInDealerQuota = () => {
    if (!dealerWallet?.entries || !formData?.plant || !formData?.subtype || quotaType !== "dealer") {
      return 0
    }

    return dealerWallet.entries
      .filter(
        (entry) => entry.plantTypeId === formData?.plant && entry.subTypeId === formData?.subtype
      )
      .reduce((total, entry) => total + (entry.remainingQuantity || 0), 0)
  }

  // ============================================================================
  // PAYMENT FUNCTIONS
  // ============================================================================
  
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
    const quantity = parseInt(formData?.noOfPlants) || 0
    const rate = parseFloat(formData?.rate) || 0
    return quantity * rate
  }

  const getBalanceAmount = () => {
    return getTotalOrderAmount() - getTotalPaidAmount()
  }

  // Screenshot handling functions
  const handleScreenshotUpload = (event) => {
    const files = Array.from(event.target.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      Toast.error('Please select valid image files')
      return
    }

    if (imageFiles.length > 5) {
      Toast.error('Maximum 5 images allowed')
      return
    }

    imageFiles.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { // 8MB limit
        Toast.error(`File ${file.name} is too large. Maximum size is 8MB`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const newScreenshot = {
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size
        }
        
        setFormData(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, newScreenshot]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const removeScreenshot = (screenshotId) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter(s => s.id !== screenshotId)
    }))
  }

  // Payment image upload functions - matching FarmerOrdersTable pattern
  const handlePaymentImageUpload = async (event) => {
    const files = Array.from(event.target.files)
    
    if (files.length === 0) return

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        Toast.error('Please select valid image files only')
        return
      }

      if (file.size > 8 * 1024 * 1024) { // 8MB limit
        Toast.error('File is too large. Maximum size is 8MB per file')
        return
      }
    }

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
      
      // Add new URLs to existing receiptPhoto array
      setNewPayment(prev => ({
        ...prev,
        receiptPhoto: [...(prev.receiptPhoto || []), ...uploadedUrls]
      }))
      
      Toast.success("Images uploaded successfully")
    } catch (error) {
      console.error("Error uploading images:", error)
      Toast.error("Failed to upload images")
    } finally {
      setLoading(false)
    }
  }

  const removePaymentImage = (index) => {
    setNewPayment(prev => ({
      ...prev,
      receiptPhoto: prev.receiptPhoto.filter((_, i) => i !== index)
    }))
  }


  // ============================================================================
  // FORM HANDLER FUNCTIONS
  // ============================================================================
  
  const handleInputChange = (field, value) => {

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
      const selectedSubtype = subTypes.find((st) => st.value === value)

      // Check if user is admin (can always edit rate)
      const isAdminUser =
        user?.jobTitle === "SUPERADMIN" ||
        user?.jobTitle === "OFFICE_ADMIN" ||
        user?.jobTitle === "ACCOUNTANT"

      // Only auto-set rate if current rate is empty or hasn't been manually set
      // For admin users, always allow rate editing regardless of manual setting
      const shouldAutoSetRate =
        (!formData?.rate || formData?.rate === "" || formData?.rate === "0") &&
        (!rateManuallySet || isAdminUser)

      if (
        selectedSubtype &&
        selectedSubtype.rate !== undefined &&
        selectedSubtype.rate !== null &&
        shouldAutoSetRate
      ) {
        // Ensure rate is a number and convert to string for the form
        const rateValue =
          typeof selectedSubtype.rate === "number"
            ? selectedSubtype.rate
            : parseFloat(selectedSubtype.rate) || 0
        setFormData((prev) => ({
          ...prev,
          rate: rateValue.toString(),
          orderDate: null // Reset order date when subtype changes (affects available slots)
        }))
        setRate(rateValue)
      } else if (!selectedSubtype || !selectedSubtype.rate) {
        setFormData((prev) => ({
          ...prev,
          rate: "",
          orderDate: null // Reset order date when subtype changes (affects available slots)
        }))
        setRate(null)
      } else {
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
      setRate(isAdminUser ? parseFloat(formData?.rate) || null : null)
      setRateManuallySet(isAdminUser ? rateManuallySet : false) // Keep manual flag for admin users
      setSubTypes([]) // Clear subtypes when plant changes
    }

    // Set available quantity when order date is selected
    if (field === "orderDate") {
      const availableQty = getAvailableQuantityForDate(value, formData?.productMappingId, formData?.productName)
      setAvailable(availableQty)
      // Reload plant product mappings with date filter (filtering happens in UI)
      if (formData?.plant && formData?.subtype) {
        loadPlantProductMappings(formData.plant, formData.subtype)
      }
    }

    // Update available quantity when productMappingId changes
    if (field === "productMappingId") {
      const mapping = plantProductMappings.find(m => m._id === value)
      if (mapping) {
        handleInputChange("productName", mapping.displayTitle || mapping.productName)
        // Filter slots by product date range
        const filtered = allSlots.filter(slot => {
          if (!slot.startDay || !slot.endDay) return false
          const slotStart = moment(slot.startDay, "DD-MM-YYYY")
          const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
          const productStart = moment(mapping.dateRange.startDate, "DD-MM-YYYY")
          const productEnd = moment(mapping.dateRange.endDate, "DD-MM-YYYY")
          // Check if slot overlaps with product date range
          return (slotStart.isSameOrAfter(productStart, "day") && slotStart.isSameOrBefore(productEnd, "day")) ||
                 (slotEnd.isSameOrAfter(productStart, "day") && slotEnd.isSameOrBefore(productEnd, "day")) ||
                 (slotStart.isBefore(productStart, "day") && slotEnd.isAfter(productEnd, "day"))
        })
        setSlots(filtered)
        setFilteredSlotsByProduct(filtered)
        // Reset order date when product changes
        handleInputChange("orderDate", null)
        Toast.success(`Showing slots for ${mapping.displayTitle || mapping.productName} (${mapping.dateRange.startDate} to ${mapping.dateRange.endDate})`)
      } else {
        // Clear product selection - show all slots
        handleInputChange("productName", "")
        setSlots(allSlots)
        setFilteredSlotsByProduct([])
        handleInputChange("orderDate", null)
      }
    }

    // Update available quantity when productName changes
    if (field === "productName" && formData?.orderDate) {
      const availableQty = getAvailableQuantityForDate(formData.orderDate, formData?.productMappingId, value)
      setAvailable(availableQty)
    }

    // Reset quota type when dealer changes and load dealer wallet
    if (field === "dealer") {
      setQuotaType(null)
      if (value) {
        loadDealerWallet(value)
      } else {
        setDealerWallet({})
      }
    }
  }

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================
  
  const validateForm = () => {
    const requiredFields = ["noOfPlants", "plant", "subtype", "orderDate", "cavity"]

    // For bulk orders, don't require farmer details
    if (!bulkOrder) {
      requiredFields.push("name", "mobileNumber", "village", "taluka", "district", "state")
    }

    for (const field of requiredFields) {
      if (!formData?.[field]) {
        Toast.error(`Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`)
        return false
      }
    }

    // Only validate mobile number if it's provided and not a bulk order
    if (!bulkOrder && formData?.mobileNumber && formData?.mobileNumber.length !== 10) {
      Toast.error("Mobile number must be 10 digits")
      return false
    }

    // Only validate quota type for dealer non-bulk orders or when dealer is selected
    if (
      (user?.jobTitle === "DEALER" && !bulkOrder && !quotaType) ||
      (formData?.dealer && !bulkOrder && !quotaType)
    ) {
      Toast.error("Please select quota type")
      return false
    }

    // Validate that exactly one of dealer or sales person is selected
    if (!formData?.dealer && !formData?.sales) {
      Toast.error("Please select either a dealer or sales person")
      return false
    }
    
    // Ensure only one is selected (this should not happen due to UI constraints, but double-check)
    if (formData?.dealer && formData?.sales) {
      Toast.error("Please select either a dealer OR a sales person, not both")
      return false
    }

    // Validate Order For fields if enabled
    if (formData?.orderForEnabled) {
      if (!formData?.orderForName || formData?.orderForName.trim() === '') {
        Toast.error("Please enter name for the person the order is for")
        return false
      }
      if (!formData?.orderForAddress || formData?.orderForAddress.trim() === '') {
        Toast.error("Please enter address for the person the order is for")
        return false
      }
      if (!formData?.orderForMobileNumber || 
          formData?.orderForMobileNumber.length !== 10 || 
          !/^\d{10}$/.test(formData?.orderForMobileNumber)) {
        Toast.error("Please enter a valid 10-digit mobile number for the person the order is for")
        return false
      }
    }

    // Validate dealer quota availability
    if (quotaType === "dealer" && formData?.plant && formData?.subtype && formData?.orderDate) {
      const requestedQuantity = parseInt(formData?.noOfPlants) || 0
      const availableQuantity = getRemainingQuantity()

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

    // Validate ready plants product quantity first (if product is selected)
    if (formData?.productMappingId && formData?.noOfPlants) {
      const mapping = plantProductMappings.find(m => m._id === formData.productMappingId)
      if (mapping) {
        const availableQty = mapping.mappingAvailableQuantity !== undefined 
          ? mapping.mappingAvailableQuantity 
          : getAvailableQuantityForProduct(mapping)
        const requestedQty = parseInt(formData?.noOfPlants) || 0
        
        if (requestedQty > availableQty) {
          Toast.error(
            `⚠️ Product Stock Exceeded!\n\nOnly ${availableQty} plants available for ${mapping.displayTitle || mapping.productName}.\n\nPlease reduce the order quantity or select a different product.`,
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
      }
    }

    // Validate slot capacity availability
    // Skip validation if plant has sowingAllowed (can grow on demand) AND no ready plants product is selected
    const selectedPlant = plants.find((p) => p.value === formData?.plant)
    const isSowingAllowedPlant = selectedPlant?.sowingAllowed

    if (formData?.orderDate && formData?.noOfPlants && !isSowingAllowedPlant && !formData?.productMappingId) {
      const requestedQuantity = parseInt(formData?.noOfPlants) || 0

      // Get slot ID for the selected order date
      const slotId = getSlotIdForDate(formData?.orderDate)
      if (!slotId) {
        Toast.error("Selected date does not fall within any available slot. Please select a valid date.")
        return false
      }

      // Check if using dealer quota
      const selectedSlot = slots.find((s) => s.value === slotId)
      const isDealerQuotaSlot = selectedSlot?.isDealerQuota

      // Update available quantity based on selected product
      const currentAvailable = getAvailableQuantityForDate(formData?.orderDate, formData?.productMappingId, formData?.productName)
      let availableQuantity = currentAvailable !== null ? currentAvailable : available
      let slotPeriod = ""
      let productInfo = ""

      // If productMappingId is selected, use productStock availability
      if (formData?.productMappingId && selectedSlot?.productStock && selectedSlot.productStock.length > 0) {
        const product = selectedSlot.productStock.find(p => 
          p.productMappingId && p.productMappingId.toString() === formData.productMappingId.toString()
        )
        if (product) {
          const receivedAvailable = (product.available || 0) - (product.booked || 0)
          const pendingAvailable = product.poQuantity || 0
          availableQuantity = receivedAvailable + pendingAvailable
          productInfo = ` (Product: ${formData.productName || product.productName})`
          
          // Show detailed availability info
          if (requestedQuantity > availableQuantity) {
            const receivedText = receivedAvailable > 0 ? `${receivedAvailable} received` : "0 received"
            const pendingText = pendingAvailable > 0 ? `${pendingAvailable} pending from PO` : "0 pending"
            Toast.error(
              `⚠️ Product Stock Exceeded!\n\nOnly ${availableQuantity} plants available for ${formData.productName || product.productName} on ${moment(formData?.orderDate).format("DD/MM/YYYY")}\n(${receivedText}, ${pendingText})\n\nPlease reduce the order quantity or select a different product.`,
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
        }
      } else if (formData?.productName && selectedSlot?.productStock && selectedSlot.productStock.length > 0) {
        // Fallback: check by productName
        const product = selectedSlot.productStock.find(p => p.productName === formData.productName)
        if (product) {
          const receivedAvailable = (product.available || 0) - (product.booked || 0)
          const pendingAvailable = product.poQuantity || 0
          availableQuantity = receivedAvailable + pendingAvailable
          productInfo = ` (Product: ${formData.productName})`
        }
      } else if (isDealerQuotaSlot) {
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
          `⚠️ Slot Capacity Exceeded!\n\nOnly ${availableQuantity} plants available for ${moment(formData?.orderDate).format("DD/MM/YYYY")} (slot: ${slotPeriod})${productInfo}\n\nPlease select a different date or reduce the order quantity.`,
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

    // Validate image requirement for non-Cash payments (except NEFT/RTGS)
    if (newPayment.paidAmount && newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS") {
      if (!newPayment.receiptPhoto || newPayment.receiptPhoto.length === 0) {
        Toast.error(`Payment image is mandatory for ${newPayment.modeOfPayment} payments`)
        return false
      }
    }

    // Wallet payment validation - only when dealer is selected in order
    if (
      formData?.dealer &&
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

  // ============================================================================
  // SUBMISSION FUNCTIONS
  // ============================================================================
  
  const handleSubmit = async () => {
    if (!validateForm()) return

    // Show confirmation popup with farmer name and dates in bold
    const selectedPlant = plants.find((p) => p.value === formData?.plant)
    const selectedSubtype = subTypes.find((s) => s.value === formData?.subtype)
    // Get slot ID from order date
    const slotId = getSlotIdForDate(formData?.orderDate)
    const selectedSlot = slots.find((s) => s.value === slotId)
    const selectedSales = sales.find((s) => s.value === formData?.sales)
    const selectedDealer = dealers.find((d) => d.value === formData?.dealer)

    setConfirmationData({
      farmerName: formData?.name || "",
      mobileNumber: formData?.mobileNumber || "",
      orderDate: formData?.date || new Date(),
      deliveryDate: formData?.orderDate, // The specific delivery date selected by user
      plantName: selectedPlant?.label || "",
      plantSubtype: selectedSubtype?.label || "",
      numberOfPlants: formData?.noOfPlants || "",
      rate: formData?.rate || "",
      slotPeriod: selectedSlot ? `${selectedSlot.startDay} - ${selectedSlot.endDay}` : "",
      salesPerson: selectedDealer?.label || selectedSales?.label || "",
      location: `${formData?.village || ""}, ${formData?.taluka || ""}, ${formData?.district || ""}`,
      orderType: isInstantOrder ? "Instant Order" : bulkOrder ? "Bulk Order" : "Normal Order"
    })

    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false)
    setLoading(true)
    const formDataForUpload = new FormData()

    try {
      // Get slot ID - use transferred slot if available, otherwise use date-based slot
      let slotId = formData?.transferredSlotId || getSlotIdForDate(formData?.orderDate)

      if (!slotId) {
        throw new Error("Could not determine slot for the selected date")
      }

        // If using transferred slot, log it
        if (formData?.transferredSlotId) {
          const transferredSlot = slots.find(s => s.value === formData.transferredSlotId)
          console.log(`🔄 Booking transferred to nearby slot: ${transferredSlot?.startDay} - ${transferredSlot?.endDay}`)
        }

        // Log product mapping info if selected
        if (formData?.productMappingId) {
          const mapping = plantProductMappings.find(m => m._id === formData.productMappingId)
          console.log(`📦 Ready Plants Product Selected:`, {
            productMappingId: formData.productMappingId,
            productName: formData.productName,
            displayTitle: mapping?.displayTitle,
            dateRange: mapping?.dateRange
          })
        }

      const selectedSlotDetails = slots.find((s) => s.value === slotId)

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
      const orderForData = formData?.orderForEnabled ? {
        name: formData?.orderForName?.trim() || "",
        address: formData?.orderForAddress?.trim() || "",
        mobileNumber: parseInt(formData?.orderForMobileNumber) || 0
      } : undefined

      // Product order snapshot - for future reference (not linked, just saved)
      const productOrderSnapshot = formData?.productMappingId ? (() => {
        const mapping = plantProductMappings.find(m => m._id === formData.productMappingId)
        if (!mapping) return undefined
        return {
          productName: formData?.productName || mapping?.displayTitle || mapping?.productName,
          productMappingId: formData?.productMappingId,
          displayTitle: mapping?.displayTitle,
          productId: mapping?.productId,
          dateRange: mapping?.dateRange ? {
            startDate: mapping.dateRange?.startDate,
            endDate: mapping.dateRange?.endDate
          } : undefined
        }
      })() : undefined

      let payload
      let endpoint

      if (bulkOrder) {
        // Bulk order payload - includes all fields but with dealer-specific logic
        payload = {
          name: formData?.name || "",
          village: formData?.village || "",
          taluka: formData?.taluka || "",
          state: formData?.state || "",
          district: formData?.district || "",
          stateName: formData?.stateName || "",
          districtName: formData?.districtName || "",
          talukaName: formData?.talukaName || "",
          mobileNumber: formData?.mobileNumber || "",
          typeOfPlants: formData?.typeOfPlant || "",
          numberOfPlants: parseInt(formData?.noOfPlants) || 0,
          rate: parseFloat(formData?.rate) || 0,
          paymentStatus: "not paid",
          orderStatus: isInstantOrder ? "DISPATCHED" : "ACCEPTED",
          plantName: formData?.plant || "",
          plantSubtype: formData?.subtype || "",
          bookingSlot: slotId, // Auto-detected slot ID from order date
          orderDate: formData?.orderDate instanceof Date ? formData?.orderDate.toISOString() : formData?.orderDate,
          deliveryDate: formData?.orderDate instanceof Date ? formData?.orderDate.toISOString() : formData?.orderDate,
          orderPaymentStatus: "PENDING",
          cavity: formData?.cavity || "",
          orderBookingDate:
            formData?.date instanceof Date ? formData?.date.toISOString() : formData?.date,
          dealerOrder: true,
          productName: formData?.productName || undefined, // Product name reference for plant products
          productMappingId: formData?.productMappingId || undefined, // PlantProductMapping ID for ready plants products
          productOrderSnapshot, // Snapshot for future reference (not linked)
          dealer: formData?.dealer || formData?.sales,
          // If dealer is selected, send dealer ID as salesPerson, otherwise send sales person ID
          salesPerson: formData?.dealer || formData?.sales,
          // Screenshots will be handled separately in FormData
          screenshots: formData?.screenshots?.map(s => s.file) || []
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
          name: formData?.name || "",
          village: formData?.village || "",
          taluka: formData?.taluka || "",
          state: formData?.state || "",
          district: formData?.district || "",
          stateName: formData?.stateName || "",
          districtName: formData?.districtName || "",
          talukaName: formData?.talukaName || "",
          mobileNumber: formData?.mobileNumber || "",
          typeOfPlants: formData?.typeOfPlant || "",
          numberOfPlants: parseInt(formData?.noOfPlants) || 0,
          rate: parseFloat(formData?.rate) || 0,
          paymentStatus: "not paid",
          // If dealer is selected, send dealer ID as salesPerson, otherwise send sales person ID
          salesPerson: formData?.dealer || formData?.sales,
          orderStatus: isInstantOrder ? "DISPATCHED" : "ACCEPTED",
          plantName: formData?.plant || "",
          plantSubtype: formData?.subtype || "",
          bookingSlot: slotId, // Auto-detected slot ID from order date
          orderDate: formData?.orderDate instanceof Date ? formData?.orderDate.toISOString() : formData?.orderDate,
          deliveryDate: formData?.orderDate instanceof Date ? formData?.orderDate.toISOString() : formData?.orderDate,
          orderPaymentStatus: "PENDING",
          cavity: formData?.cavity || "",
          orderBookingDate:
            formData?.date instanceof Date ? formData?.date.toISOString() : formData?.date,
          // Screenshots will be handled separately in FormData
          screenshots: formData?.screenshots?.map(s => s.file) || [],
          productName: formData?.productName || undefined, // Product name reference for plant products
          productMappingId: formData?.productMappingId || undefined, // PlantProductMapping ID for ready plants products
          productOrderSnapshot, // Snapshot for future reference (not linked)
        }

        // Add dealer field if dealer is selected for normal orders
        if (formData?.dealer) {
          payload.dealer = formData?.dealer
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


      // Check if payment data exists (using same validation as FarmerOrdersTable)
      // Payment exists if there's an amount AND either a payment mode OR wallet payment
      const hasPaymentData = newPayment.paidAmount && (newPayment.modeOfPayment || newPayment.isWalletPayment)

      // Don't include payment in order creation payload - we'll add it separately after order creation
      // This is consistent with how payments are handled elsewhere in the app


      // Create FormData for file uploads

      const { screenshots: screenshotFiles = [] } = payload
      const payloadWithoutScreenshots = { ...payload }
      delete payloadWithoutScreenshots.screenshots

      // Append screenshot files individually
      screenshotFiles.forEach((file) => {
        if (file) {
          formDataForUpload.append("screenshots", file)
        }
      })

      const isFileLike = (value) => {
        if (typeof File !== "undefined" && value instanceof File) return true
        if (typeof Blob !== "undefined" && value instanceof Blob) return true
        return false
      }

      // Add all payload data to FormData with proper serialization
      Object.entries(payloadWithoutScreenshots).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return
        }

        if (value instanceof Date) {
          formDataForUpload.append(key, value.toISOString())
          return
        }

        if (isFileLike(value)) {
          formDataForUpload.append(key, value)
          return
        }

        if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
          formDataForUpload.append(key, JSON.stringify(value))
          return
        }

        if (typeof value === "boolean") {
          formDataForUpload.append(key, value ? "true" : "false")
          return
        }

        formDataForUpload.append(key, value)
      })

      const instance = NetworkManager(endpoint)
      const response = await instance.request(formDataForUpload)

      if (response?.data) {
        let successMessage = "Order added successfully"
        
        // Get order ID from response - try multiple possible locations
        const orderId = response?.data?.data?._id || 
                       response?.data?._id || 
                       response?.data?.orderId ||
                       response?.data?.data?.orderId ||
                       response?._id

        console.log("Order creation response:", response?.data)
        console.log("Extracted orderId:", orderId)
        console.log("Has payment data:", hasPaymentData)

        // Add payment separately if payment data exists
        if (hasPaymentData) {
          if (!orderId) {
            console.error("Order ID not found in response. Cannot add payment.")
            console.error("Full response:", response)
            Toast.error("Order created but payment could not be added - Order ID missing")
            onSuccess?.()
            handleClose()
            return
          }

          try {
            // Ensure isWalletPayment is a boolean and construct payload explicitly (matching FarmerOrdersTable)
            const isWalletPayment = Boolean(newPayment.isWalletPayment)
            const paymentStatus = newPayment.paymentStatus || "PENDING"

            // Set modeOfPayment for wallet payments
            let modeOfPayment = newPayment.modeOfPayment
            if (newPayment.isWalletPayment && !modeOfPayment) {
              modeOfPayment = "Wallet"
            }

            // Prepare payment payload (matching FarmerOrdersTable pattern exactly)
            const paymentPayload = {
              paidAmount: newPayment.paidAmount,
              paymentDate: newPayment.paymentDate,
              modeOfPayment: modeOfPayment,
              bankName: newPayment.bankName || "",
              remark: newPayment.remark || "",
              receiptPhoto: newPayment.receiptPhoto || [],
              isWalletPayment: isWalletPayment,
              paymentStatus: paymentStatus
            }

            console.log("Payment payload:", paymentPayload)
            console.log("isWalletPayment value:", isWalletPayment)
            console.log("Order ID for payment:", orderId)

            // Use plain object (matching FarmerOrdersTable - images are already uploaded as URLs)
            const paymentRequestPayload = paymentPayload

            // Call ADD_PAYMENT API
            const paymentInstance = NetworkManager(API.ORDER.ADD_PAYMENT)
            const paymentResponse = await paymentInstance.request(paymentRequestPayload, [orderId])

            console.log("Payment API response:", paymentResponse?.data)

            if (paymentResponse?.data) {
              successMessage += " with payment"
              Toast.success(successMessage)
            } else {
              console.warn("Payment API returned no data:", paymentResponse)
              Toast.warning("Order added successfully, but payment response was empty")
            }
          } catch (paymentError) {
            console.error("Error adding payment:", paymentError)
            console.error("Payment error response:", paymentError?.response?.data)
            console.error("Payment error status:", paymentError?.response?.status)
            const errorMsg = paymentError?.response?.data?.message || paymentError?.message || "Unknown error"
            Toast.error(`Order added successfully, but payment failed: ${errorMsg}`)
          }
        } else {
          Toast.success(successMessage)
        }

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
      transferredSlotId: null, // Reset transferred slot
      cavity: "",
      sales: null,
      dealer: null,
      productName: "", // Reset product name
      productMappingId: "", // Reset product mapping ID for ready plants products
      // Reset Order For fields
      orderForEnabled: false,
      orderForName: "",
      orderForAddress: "",
      orderForMobileNumber: "",
      // Reset screenshots
      screenshots: []
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
    // Reset product-related state
    setAllSlots([])
    setFilteredSlotsByProduct([])
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

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
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
                  // Clear sales person selection for bulk orders
                  handleInputChange("sales", "")
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
                  // Clear sales person selection for bulk orders
                  handleInputChange("sales", "")
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

            {quotaType === "dealer" && formData?.orderDate && (
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

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!loading) handleSubmit()
      }
      // Esc to close
      if (e.key === 'Escape' && !showConfirmation) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, showConfirmation])

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={fullScreen ? false : "sm"}
      fullWidth={!fullScreen}
      fullScreen={fullScreen}
      className={`${classes.dialog} ${fullScreen ? 'fullScreenDialog' : ''}`.trim()}
      PaperProps={{
        style: fullScreen
          ? { maxWidth: '100%', width: '100%', height: '100%', maxHeight: '100%', borderRadius: 0 }
          : { maxHeight: '75vh', minHeight: '50vh', maxWidth: 540 },
        sx: fullScreen ? { m: 0, maxWidth: '100vw', maxHeight: '100vh' } : undefined,
      }}
    >
      <DialogTitle className={classes.dialogTitle} sx={{ pb: 0.5, ...(fullScreen && { py: 1, px: 1.5 }) }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={0.5}>
            <AddIcon fontSize="small" sx={fullScreen ? { fontSize: '1.2rem' } : undefined} />
            <Typography variant="h6" sx={fullScreen ? { fontSize: '1rem' } : undefined}>Add New Order</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {!fullScreen && (
              <Tooltip title="Keyboard Shortcuts: Ctrl+S to submit, Esc to close">
                <IconButton
                  className={classes.closeButton}
                  size="small"
                  sx={{ mr: 0.5 }}
                >
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton className={classes.closeButton} onClick={handleClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: fullScreen ? 0 : 0.5,
          overflowX: 'hidden',
          ...(fullScreen && {
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
          }),
        }}
      >
        <Box
          className={`${classes.formContainer} ${fullScreen ? classes.compactForm : ''}`.trim()}
          sx={{
            ...(fullScreen && {
              padding: '8px 12px',
              maxWidth: '100%',
              width: '100%',
              boxSizing: 'border-box',
              flex: 1,
              minWidth: 0,
            }),
          }}
        >
          {loading && (
            <Box className={classes.loadingOverlay}>
              <CircularProgress size={60} />
            </Box>
          )}

          {/* Stepper - compact, full width */}
          <Paper
            elevation={0}
            sx={{
              mb: fullScreen ? 0.25 : 0.5,
              px: 0,
              py: 0,
              background: 'transparent',
              width: '100%',
              ...(fullScreen && { overflowX: 'auto', overflowY: 'hidden', minWidth: 0, WebkitOverflowScrolling: 'touch' }),
            }}
          >
            <Stepper activeStep={activeStep} className={classes.stepper} size="small">
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel sx={{ fontSize: fullScreen ? '0.6rem' : '0.7rem' }}>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Quick Actions Bar - hidden on mobile fullScreen */}
          {!fullScreen && (user?.jobTitle === "SUPERADMIN" || user?.jobTitle === "OFFICE_ADMIN") ? (
            <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Quick Actions:
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  if (plants.length > 0 && subTypes.length > 0 && slots.length > 0) {
                    handleInputChange('plant', plants[0].value)
                    setTimeout(() => {
                      if (subTypes.length > 0) {
                        handleInputChange('subtype', subTypes[0].value)
                        setTimeout(() => {
                          if (slots.length > 0) {
                            handleInputChange('orderDate', moment(slots[0].startDay, 'DD-MM-YYYY').toDate())
                            handleInputChange('noOfPlants', '100')
                            handleInputChange('rate', subTypes[0]?.rate?.toString() || '10')
                          }
                        }, 500)
                      }
                    }, 500)
                    Toast.info('Quick fill applied - please review and adjust')
                  }
                }}
                sx={{ fontSize: '0.7rem', height: 24 }}
                disabled={!plants.length || loading}
              >
                Quick Fill Test Data
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    mobileNumber: '9876543210',
                    name: 'Test Farmer',
                    village: 'Test Village',
                    taluka: 'Test Taluka',
                    district: 'Test District'
                  }))
                  Toast.info('Test farmer data filled')
                }}
                sx={{ fontSize: '0.7rem', height: 24 }}
                disabled={loading}
              >
                Fill Test Farmer
              </Button>
            </Box>
          ) : null}

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

                <Grid container spacing={1}>
                  <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Order Date"
                        value={formData?.date}
                        onChange={(date) => handleInputChange("date", date)}
                        renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                      />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Mobile Number"
                      value={formData?.mobileNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                        handleInputChange("mobileNumber", value)
                      }}
                      inputProps={{ maxLength: 10, pattern: "[0-9]*" }}
                      InputProps={{
                        endAdornment: mobileLoading && (
                          <CircularProgress size={18} color="primary" />
                        ),
                        startAdornment: formData?.mobileNumber && (
                          <Box sx={{ mr: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                            +91
                          </Box>
                        )
                      }}
                      error={formData?.mobileNumber?.length > 0 && formData?.mobileNumber?.length !== 10}
                      helperText={
                        formData?.mobileNumber?.length > 0 && formData?.mobileNumber?.length !== 10
                          ? `Enter ${10 - formData.mobileNumber.length} more digits`
                          : farmerData?.name
                          ? "✓ Farmer found - location auto-filled"
                          : mobileLoading
                          ? "🔍 Searching..."
                          : "10 digits to auto-fill"
                      }
                      placeholder="10-digit mobile"
                    />
                  </Grid>

                  <Grid item xs={12} sm={7}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Farmer Name"
                      value={formData?.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      disabled={!!farmerData?.name}
                    />
                  </Grid>

                  {/* Order For Toggle - Beside Farmer Name */}
                  <Grid item xs={12} sm={5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', pt: 0.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={formData?.orderForEnabled}
                            onChange={(e) => handleInputChange("orderForEnabled", e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Place order for someone else?
                          </Typography>
                        }
                      />
                    </Box>
                  </Grid>

                  {/* Order For Fields - Show when enabled */}
                  {formData?.orderForEnabled && (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 0.5 }}>
                          <Chip label="Order For Details" size="small" color="primary" />
                        </Divider>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Name *"
                          value={formData?.orderForName}
                          onChange={(e) => handleInputChange("orderForName", e.target.value)}
                          placeholder="Name of person order is for"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Mobile Number *"
                          value={formData?.orderForMobileNumber}
                          onChange={(e) => handleInputChange("orderForMobileNumber", e.target.value)}
                          placeholder="10-digit mobile"
                          inputProps={{ maxLength: 10 }}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Address *"
                          value={formData?.orderForAddress}
                          onChange={(e) => handleInputChange("orderForAddress", e.target.value)}
                          placeholder="Complete address"
                          multiline
                          rows={2}
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ py: 0.5, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
                          Stored for delivery & communication.
                        </Alert>
                      </Grid>
                    </>
                  )}

                  <Grid item xs={12}>

                    {farmerData?.name ? (
                      // Show location as read-only when farmer is found
                      <Box sx={{ mt: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ mb: 1, fontWeight: 600, color: "#2c3e50", fontSize: "0.8rem" }}>
                          Location (Auto-filled)
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              fullWidth
                              label="State"
                              value={formData?.state || ""}
                              disabled
                              variant="outlined"
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="District"
                              value={formData?.district || ""}
                              disabled
                              variant="outlined"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Taluka"
                              value={formData?.taluka || ""}
                              disabled
                              variant="outlined"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <TextField
                              fullWidth
                              label="Village"
                              value={formData?.village || ""}
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
                        selectedState={formData?.state}
                        selectedDistrict={formData?.district}
                        selectedTaluka={formData?.taluka}
                        selectedVillage={formData?.village}
                        onStateChange={(value) => handleInputChange("state", value)}
                        onDistrictChange={(value) => handleInputChange("district", value)}
                        onTalukaChange={(value) => handleInputChange("taluka", value)}
                        onVillageChange={(value) => handleInputChange("village", value)}
                        required={true}
                        showLabels={false}
                        compact={true}
                        className="mt-2"
                        disabled={false}
                        autoFill={true}
                      />
                    )}
                    {farmerData?.name ? (
                      <Alert severity="success" sx={{ mt: 1, py: 0.5, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
                        Location auto-filled. Clear mobile to modify.
                      </Alert>
                    ) : (
                      <Alert severity="info" sx={{ mt: 1, py: 0.5, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>
                        {user?.defaultState ? "Using your saved location. Modify if needed." : "Maharashtra pre-selected. Select district, taluka & village."}
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Sales Person Selection - hidden for DEALER and SALES */}
          {user?.jobTitle !== "DEALER" && user?.jobTitle !== "SALES" && (
          <Card className={classes.formCard}>
            <div className={classes.cardHeader}>
              <Typography variant="h6" className={classes.sectionTitle}>
                <PersonIcon /> Sales Assignment
              </Typography>
            </div>
            <CardContent className={classes.formSection}>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <SearchableSelect
                        label="Select Sales Person"
                        items={[{ label: "Select a sales person", value: "" }, ...sales]}
                        value={formData?.sales || ""}
                        onChange={(e) => {
                          const selectedSales = e.target.value
                          handleInputChange("sales", selectedSales)
                          // Clear dealer selection when sales person is selected
                          if (selectedSales) {
                            handleInputChange("dealer", "")
                            setQuotaType(null)
                            setDealerWallet({})
                          }
                        }}
                        placeholder="Search sales person..."
                        disabled={!!formData?.dealer || bulkOrder}
                      />
                    </Box>
                    {formData?.sales && !bulkOrder && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => {
                          handleInputChange("sales", "")
                        }}
                        sx={{ 
                          minWidth: 'auto',
                          px: 1,
                          height: '40px',
                          borderColor: '#f44336',
                          color: '#f44336',
                          '&:hover': {
                            borderColor: '#d32f2f',
                            backgroundColor: '#ffebee'
                          }
                        }}
                        title="Clear Sales Person Selection"
                      >
                        <CloseIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <SearchableSelect
                        label="Select Dealer"
                        items={[{ label: "Select a dealer", value: "" }, ...dealers]}
                        value={formData?.dealer || ""}
                        onChange={(e) => {
                          const selectedDealer = e.target.value
                          handleInputChange("dealer", selectedDealer)
                          // Clear sales person selection when dealer is selected
                          if (selectedDealer) {
                            handleInputChange("sales", "")
                          }
                        }}
                        placeholder="Search dealer..."
                        disabled={!!formData?.sales}
                      />
                    </Box>
                    {formData?.dealer && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => {
                          handleInputChange("dealer", "")
                          setQuotaType(null)
                          setDealerWallet({})
                        }}
                        sx={{ 
                          minWidth: 'auto',
                          px: 1,
                          height: '40px',
                          borderColor: '#f44336',
                          color: '#f44336',
                          '&:hover': {
                            borderColor: '#d32f2f',
                            backgroundColor: '#ffebee'
                          }
                        }}
                        title="Clear Dealer Selection"
                      >
                        <CloseIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>

              {/* Show quota type selection when dealer is selected for normal orders only */}
              {formData?.dealer && !bulkOrder && (
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

                  {quotaType === "dealer" && formData?.orderDate && (
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
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                        {formData?.plant && formData?.subtype
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
                          const availableSlots = getAvailablePlantsForSlots()

                          // Show dealer wallet data when available, otherwise show dummy data
                          if (availableSlots.length === 0 && quotaType === "dealer") {
                            // If we have dealer wallet data, show it directly
                            if (dealerWallet?.entries && dealerWallet.entries.length > 0) {
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
                                slotInfo.slotId === getSlotIdForDate(formData?.orderDate)
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
                        {formData?.plant && formData?.subtype
                          ? "Green chips show available plants in dealer quota, red shows no availability"
                          : "Green chips show total available plants across all plant types in dealer quota, red shows no availability"}
                      </Typography>
                    </Box>
                  )}

                  {/* Summary of total available in dealer quota */}
                  {quotaType === "dealer" && formData?.plant && formData?.subtype && (
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
                          {formData?.plant && plants.find((p) => p.value === formData?.plant)?.label}{" "}
                          -{" "}
                          {formData?.subtype &&
                            subTypes.find((s) => s.value === formData?.subtype)?.label}
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
                <Typography variant="body2">
                  <strong>Note:</strong> {bulkOrder 
                    ? "For bulk orders, only dealer selection is available. Sales person selection is disabled."
                    : "You can select either a sales person OR a dealer, not both. Selecting one will automatically clear the other selection."
                  }
                </Typography>
              </Alert>
            </CardContent>
          </Card>
          )}

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
                      value={formData?.plant || ""}
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
                      value={formData?.subtype || ""}
                      onChange={(e) => handleInputChange("subtype", e.target.value)}
                      label="Select Subtype"
                      disabled={!formData?.plant}>
                      {subTypes.map((subtype) => (
                        <MenuItem key={subtype.value} value={subtype.value}>
                          {subtype.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Ready Plants Product Selection - Show as compact cards */}
                {formData?.plant && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: "#2c3e50", fontSize: "0.8rem" }}>
                        Ready Plants Products (From Other Nursery)
                      </Typography>
                      {plants.find((p) => p.value === formData?.plant)?.sowingAllowed && (
                        <Typography variant="caption" sx={{ display: "block", mb: 0.5, color: "#2e7d32", fontWeight: 500 }}>
                          Unlimited booking available for this plant.
                        </Typography>
                      )}
                      {mappingsLoading ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
                          <CircularProgress size={16} />
                          <Typography variant="caption" color="text.secondary">
                            Loading products...
                          </Typography>
                        </Box>
                      ) : plantProductMappings.length > 0 ? (
                        <>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {/* Compact product cards */}
                        {plantProductMappings.map((mapping) => {
                          const availableQty = mapping.mappingAvailableQuantity !== undefined 
                            ? mapping.mappingAvailableQuantity 
                            : getAvailableQuantityForProduct(mapping)
                          const isSelected = formData?.productMappingId === mapping._id
                          
                          // Get subtype name using helper function
                          const plantIdForSubtype = mapping.plantId?._id || mapping.plantId || formData?.plant
                          const subtypeName = getSubtypeName(mapping.subtypeId, plantIdForSubtype)
                          
                          return (
                            <Box
                              key={mapping._id}
                              onClick={() => {
                                handleInputChange("productMappingId", mapping._id)
                                handleInputChange("productName", mapping.displayTitle || mapping.productName)
                                // Auto-select subtype if not selected
                                if (mapping.subtypeId && !formData?.subtype) {
                                  handleInputChange("subtype", mapping.subtypeId)
                                }
                                // Filter slots based on this mapping's date range
                                if (formData?.subtype) {
                                  const filtered = allSlots.filter(slot => {
                                    if (!slot.startDay || !slot.endDay) return false
                                    const slotStart = moment(slot.startDay, "DD-MM-YYYY")
                                    const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
                                    const productStart = moment(mapping.dateRange.startDate, "DD-MM-YYYY")
                                    const productEnd = moment(mapping.dateRange.endDate, "DD-MM-YYYY")
                                    // Check if slot overlaps with product date range
                                    return (slotStart.isSameOrAfter(productStart, "day") && slotStart.isSameOrBefore(productEnd, "day")) ||
                                           (slotEnd.isSameOrAfter(productStart, "day") && slotEnd.isSameOrBefore(productEnd, "day")) ||
                                           (slotStart.isBefore(productStart, "day") && slotEnd.isAfter(productEnd, "day"))
                                  })
                                  setFilteredSlotsByProduct(filtered)
                                  setSlots(filtered)
                                }
                                handleInputChange("orderDate", null)
                              }}
                              sx={{
                                p: 1,
                                borderRadius: 1,
                                border: isSelected 
                                  ? "2px solid #2196f3" 
                                  : availableQty > 0 
                                  ? "1.5px solid #4caf50" 
                                  : "1px solid #e0e0e0",
                                backgroundColor: isSelected 
                                  ? "#e3f2fd" 
                                  : availableQty > 0 
                                  ? "#f1f8e9" 
                                  : "#ffffff",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                position: "relative",
                                "&:hover": {
                                  backgroundColor: isSelected 
                                    ? "#bbdefb" 
                                    : availableQty > 0 
                                    ? "#e8f5e9" 
                                    : "#f5f5f5",
                                  transform: "translateY(-1px)",
                                  boxShadow: 2
                                },
                                minWidth: 130,
                                maxWidth: 165,
                                flex: "0 1 auto"
                              }}
                            >
                              {/* Product Name */}
                              <Typography 
                                variant="body2" 
                                fontWeight={600} 
                                color="#2c3e50"
                                sx={{ 
                                  mb: 0.25,
                                  fontSize: "0.8rem",
                                  lineHeight: 1.2,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical"
                                }}
                              >
                                {mapping.displayTitle || mapping.productName}
                              </Typography>
                              
                              {/* Subtype */}
                              {subtypeName && (
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.25, fontSize: "0.65rem" }}>
                                  {subtypeName}
                                </Typography>
                              )}
                              
                              {/* Date Range */}
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5, fontSize: "0.65rem" }}>
                                {mapping.dateRange.startDate} to {mapping.dateRange.endDate}
                              </Typography>
                              
                              {/* Available Quantity */}
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5, borderTop: "1px solid #e0e0e0" }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", fontWeight: 500 }}>Available:</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {availableQty > 0 && (
                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#4caf50', animation: availableQty > 0 ? 'pulse 2s infinite' : 'none', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } } }} />
                                  )}
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: availableQty > 0 ? "#2e7d32" : "#757575", fontSize: "0.8rem" }}>
                                    {availableQty}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              {isSelected && (
                                <Box sx={{ position: "absolute", top: 2, right: 2 }}>
                                  <CheckIcon color="primary" sx={{ fontSize: "14px", backgroundColor: "white", borderRadius: "50%", p: 0.2 }} />
                                </Box>
                              )}
                            </Box>
                          )
                        })}
                      </Box>

                      {/* Show selected product info */}
                      {formData?.productMappingId && (() => {
                        const mapping = plantProductMappings.find(m => m._id === formData.productMappingId)
                        if (mapping) {
                          const plantIdForSubtype = mapping.plantId?._id || mapping.plantId || formData?.plant
                          const subtypeName = getSubtypeName(mapping.subtypeId, plantIdForSubtype)
                          return (
                            <Box sx={{ mt: 1, p: 1, bgcolor: "#e3f2fd", borderRadius: 1, border: "2px solid #2196f3" }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                <CheckIcon color="primary" sx={{ fontSize: "14px" }} />
                                <Typography variant="body2" fontWeight={600} color="#1976d2" sx={{ fontSize: "0.8rem" }}>
                                  Selected: {mapping.displayTitle || mapping.productName}
                                </Typography>
                                {subtypeName && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                    • {subtypeName}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                                  • {mapping.dateRange.startDate}–{mapping.dateRange.endDate} • Avail: {mapping.mappingAvailableQuantity !== undefined ? mapping.mappingAvailableQuantity : getAvailableQuantityForProduct(mapping)}
                                </Typography>
                              </Box>
                            </Box>
                          )
                        }
                        return null
                      })()}
                        </>
                      ) : (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            No ready plants products available for {plants.find(p => p.value === formData?.plant)?.label || "selected plant"}.
                          </Typography>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            You can still place orders using our own stock by selecting a slot below.
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Cavity</InputLabel>
                    <Select
                      value={formData?.cavity || ""}
                      onChange={(e) => handleInputChange("cavity", e.target.value)}
                      label="Select Cavity"
                      disabled={cavities.length === 0}>
                      {cavities.length === 0 && (
                        <MenuItem value="" disabled>
                          {loading ? "Loading cavities..." : "No cavities available"}
                        </MenuItem>
                      )}
                      {cavities.map((cavity) => (
                        <MenuItem key={cavity.value} value={cavity.value}>
                          {cavity.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Dealer Quota Summary - Show for selected plant only */}
                {formData?.dealer && !bulkOrder && formData?.plant && dealerWallet && dealerWallet.plantDetails && dealerWallet.plantDetails.length > 0 && (
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
                              const selectedPlantData = plants.find(p => p.value === formData?.plant);
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
                      value={formData?.orderDate}
                      onChange={(date) => {
                        handleInputChange("orderDate", date)
                        // Clear transferred slot when order date changes
                        handleInputChange("transferredSlotId", null)
                        // Update available quantity based on selected product
                        const availableQty = getAvailableQuantityForDate(date, formData?.productMappingId, formData?.productName)
                        setAvailable(availableQty)
                      }}
                      disabled={!formData?.subtype}
                      shouldDisableDate={isDateDisabled}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth 
                          helperText={
                            formData?.subtype 
                              ? "Select delivery date (only dates within available slots are enabled)" 
                              : "Select plant and subtype first"
                          }
                        />
                      )}
                      minDate={new Date()}
                    />
                  </LocalizationProvider>
                </Grid>

                {/* Nearby Slots Suggestion - Show only if slots have availability */}
                {formData?.orderDate && (() => {
                  const selectedDate = formData.orderDate
                  const slotId = getSlotIdForDate(selectedDate)
                  const currentAvailability = getAvailableQuantityForDate(selectedDate, formData?.productMappingId, formData?.productName)
                  
                  // Check if current slot has insufficient availability
                  const requestedQty = parseInt(formData?.noOfPlants) || 0
                  const hasInsufficientAvailability = currentAvailability !== null && currentAvailability < requestedQty
                  
                  // Find nearby available slots
                  const nearbySlots = findNearbyAvailableSlots(selectedDate, formData?.productMappingId, formData?.productName)
                  
                  // Only show if there are slots with actual availability (> 0)
                  const hasAvailableSlots = nearbySlots.length > 0 && nearbySlots.some(slot => slot.calculatedAvailability > 0)
                  
                  // Show loading state or available slots
                  if (slotsLoading) {
                    return (
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            border: "1px solid #ff9800",
                            backgroundColor: "#fff3e0",
                            mt: 1
                          }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                            <CircularProgress size={14} sx={{ color: "#ff9800" }} />
                            <Typography variant="caption" fontWeight={600} color="#e65100">
                              Loading available slots...
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )
                  }
                  
                  if (hasAvailableSlots) {
                    return (
                      <Grid item xs={12}>
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            border: "1px solid #ff9800",
                            backgroundColor: "#fff3e0",
                            mt: 1
                          }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                            <InfoIcon sx={{ color: "#ff9800", fontSize: "18px" }} />
                            <Typography variant="caption" fontWeight={600} color="#e65100">
                              Other Available Slots
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                            {nearbySlots.slice(0, 5).map((slot) => {
                              const slotStart = moment(slot.startDay, "DD-MM-YYYY")
                              const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
                              const selectedMoment = moment(selectedDate)
                              const isBefore = slotStart.isBefore(selectedMoment, "day")
                              const directionText = isBefore 
                                ? `-${slot.daysDifference}d` 
                                : `+${slot.daysDifference}d`
                              
                              const isSelected = formData?.transferredSlotId === slot.value
                              const hasEnoughAvailability = slot.calculatedAvailability >= requestedQty
                              
                              return (
                                <Chip
                                  key={slot.value}
                                  label={`${slot.startDay.split('-')[0]}-${slot.endDay.split('-')[0]} ${directionText} (${slot.calculatedAvailability})`}
                                  onClick={() => {
                                    handleInputChange("transferredSlotId", slot.value)
                                    const availableQty = getAvailableQuantityForDate(
                                      slotStart.toDate(), 
                                      formData?.productMappingId,
                                      formData?.productName
                                    )
                                    setAvailable(availableQty)
                                    Toast.success(`Booking transferred to: ${slot.startDay} - ${slot.endDay}`)
                                  }}
                                  sx={{
                                    cursor: "pointer",
                                    border: isSelected 
                                      ? "2px solid #ff9800" 
                                      : hasEnoughAvailability 
                                      ? "1px solid #4caf50" 
                                      : "1px solid #ff9800",
                                    backgroundColor: isSelected 
                                      ? "#ffe0b2" 
                                      : hasEnoughAvailability 
                                      ? "#e8f5e9" 
                                      : "#fff3e0",
                                    color: isSelected 
                                      ? "#e65100" 
                                      : hasEnoughAvailability 
                                      ? "#2e7d32" 
                                      : "#f57c00",
                                    fontWeight: isSelected ? 700 : 600,
                                    "&:hover": {
                                      backgroundColor: isSelected 
                                        ? "#ffcc80" 
                                        : hasEnoughAvailability 
                                        ? "#c8e6c9" 
                                        : "#ffe0b2",
                                      transform: "translateY(-1px)",
                                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                    },
                                    fontSize: "0.75rem",
                                    height: "28px",
                                    transition: "all 0.2s ease"
                                  }}
                                  size="small"
                                  icon={isSelected ? <CheckIcon fontSize="small" sx={{ color: "#e65100" }} /> : undefined}
                                />
                              )
                            })}
                          </Box>
                          
                          {formData?.transferredSlotId && (
                            <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "#e65100", fontWeight: 600 }}>
                              ✓ Booking will be transferred to selected slot
                            </Typography>
                          )}
                        </Box>
                      </Grid>
                    )
                  }
                  return null
                })()}


                {/* Product Name Selection - Show when slot is selected and has productStock */}
                {formData?.orderDate && (() => {
                  const slotId = getSlotIdForDate(formData.orderDate)
                  const selectedSlot = slots.find(s => s.value === slotId)
                  const hasProductStock = selectedSlot?.productStock && selectedSlot.productStock.length > 0
                  
                  if (hasProductStock) {
                    return (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Select Product (From Other Nursery)</InputLabel>
                          <Select
                            value={formData?.productName || ""}
                            onChange={(e) => handleInputChange("productName", e.target.value)}
                            label="Select Product (From Other Nursery)"
                          >
                            <MenuItem value="">
                              <em>None - Use Our Stock</em>
                            </MenuItem>
                            {selectedSlot.productStock.map((product) => {
                              const receivedAvailable = (product.available || 0) - (product.booked || 0)
                              const pendingAvailable = product.poQuantity || 0
                              const totalAvailable = receivedAvailable + pendingAvailable
                              const statusText = product.received 
                                ? `${receivedAvailable} available (received)` 
                                : `${pendingAvailable} pending (GRN not approved)`
                              
                              return (
                                <MenuItem key={product.productName} value={product.productName}>
                                  {product.productName} - {totalAvailable} available ({statusText})
                                </MenuItem>
                              )
                            })}
                          </Select>
                          {formData?.productName && (() => {
                            const product = selectedSlot.productStock.find(p => p.productName === formData.productName)
                            if (product) {
                              const receivedAvailable = (product.available || 0) - (product.booked || 0)
                              const pendingAvailable = product.poQuantity || 0
                              const totalAvailable = receivedAvailable + pendingAvailable
                              
                              return (
                                <Box sx={{ mt: 1, p: 1, bgcolor: "#e3f2fd", borderRadius: 1 }}>
                                  <Typography variant="caption" display="block">
                                    <strong>{product.productName}:</strong>
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Available: {totalAvailable} ({receivedAvailable} received, {pendingAvailable} pending)
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Booked: {product.booked || 0}
                                  </Typography>
                                </Box>
                              )
                            }
                            return null
                          })()}
                        </FormControl>
                      </Grid>
                    )
                  }
                  return null
                })()}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Number of Plants"
                    type="number"
                    value={formData?.noOfPlants}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      handleInputChange("noOfPlants", value)
                    }}
                    inputProps={{ min: 1, step: 1 }}
                    error={
                      quotaType === "dealer" &&
                      formData?.plant &&
                      formData?.subtype &&
                      formData?.orderDate &&
                      formData?.noOfPlants &&
                      parseInt(formData?.noOfPlants) > (getRemainingQuantity() || 0)
                    }
                    helperText={
                      quotaType === "dealer" &&
                      formData?.plant &&
                      formData?.subtype &&
                      formData?.orderDate &&
                      formData?.noOfPlants
                        ? parseInt(formData?.noOfPlants) > (getRemainingQuantity() || 0)
                          ? `⚠️ Exceeds available dealer quota (${getRemainingQuantity() || 0})`
                          : `✓ Available dealer quota: ${getRemainingQuantity() || 0}`
                        : formData?.noOfPlants && formData?.rate
                        ? `Estimated Total: ₹${(parseInt(formData.noOfPlants) || 0) * (parseFloat(formData.rate) || 0)}`
                        : ""
                    }
                    placeholder="Enter quantity"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ position: "relative" }}>
                    <TextField
                      fullWidth
                      label="Rate per Plant"
                      type="number"
                      value={formData?.rate}
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
                          ? formData?.subtype
                            ? "Rate auto-filled from selected subtype. You can edit it as you have admin privileges."
                            : "Select a subtype to auto-fill rate. You can edit it as you have admin privileges."
                          : formData?.subtype
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
                  formData?.noOfPlants &&
                  parseInt(formData?.noOfPlants) > available &&
                  !plants.find((p) => p.value === formData?.plant)?.sowingAllowed && (
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
                            You&apos;re trying to book {formData?.noOfPlants} plants, but only{" "}
                            {available} are available in this slot.
                          </Typography>
                          <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.5 }}>
                            Please select a different slot or reduce the order quantity.
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                
                {/* Ready Plants Product Quantity Validation - Show if product is selected */}
                {formData?.productMappingId && formData?.noOfPlants && (() => {
                  const mapping = plantProductMappings.find(m => m._id === formData.productMappingId)
                  if (mapping) {
                    const availableQty = mapping.mappingAvailableQuantity !== undefined 
                      ? mapping.mappingAvailableQuantity 
                      : getAvailableQuantityForProduct(mapping)
                    const requestedQty = parseInt(formData?.noOfPlants) || 0
                    
                    if (requestedQty > availableQty) {
                      return (
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
                                Product Stock Exceeded!
                              </Typography>
                              <Typography variant="body2" color="#7f1d1d">
                                You&apos;re trying to book {requestedQty} plants, but only {availableQty} are available for {mapping.displayTitle || mapping.productName}.
                              </Typography>
                              <Typography variant="body2" color="#7f1d1d" sx={{ mt: 0.5 }}>
                                Please reduce the order quantity or select a different product.
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      )
                    }
                  }
                  return null
                })()}

                {/* Sowing-Allowed Plant Info - Only show if NO ready plants product is selected */}
                {plants.find((p) => p.value === formData?.plant)?.sowingAllowed && 
                 formData?.noOfPlants && 
                 !formData?.productMappingId && (
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
                  formData?.plant &&
                  formData?.subtype &&
                  formData?.orderDate && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          p: 0.5,
                          borderRadius: 1,
                          border: "1px solid",
                          backgroundColor: "#f8f9fa",
                          borderColor:
                            parseInt(formData?.noOfPlants || 0) > (getRemainingQuantity() || 0)
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
                            {formData?.plant && formData?.subtype
                              ? `${plants.find((p) => p.value === formData?.plant)?.label} - ${
                                  subTypes.find((s) => s.value === formData?.subtype)?.label
                                }`
                              : "Select plant and subtype"}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" fontWeight={600} color="#2c3e50">
                            Available: {getRemainingQuantity() || 0}
                          </Typography>
                          {formData?.noOfPlants && (
                            <Typography
                              variant="caption"
                              color={
                                parseInt(formData?.noOfPlants) > (getRemainingQuantity() || 0)
                                  ? "#f44336"
                                  : "#4caf50"
                              }
                              fontWeight={500}>
                              {parseInt(formData?.noOfPlants) > (getRemainingQuantity() || 0)
                                ? `Exceeds by ${
                                    parseInt(formData?.noOfPlants) - (getRemainingQuantity() || 0)
                                  }`
                                : `${
                                    (getRemainingQuantity() || 0) - parseInt(formData?.noOfPlants)
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

          {/* Screenshots Section */}
          <Card className={classes.formCard}>
            <div className={classes.cardHeader}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                <CameraIcon fontSize="small" /> Order Screenshots (Required for Non-Cash Payments)
              </Typography>
            </div>
            <CardContent className={classes.formSection}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add screenshots or photos related to this order. <strong>Payment images are mandatory for UPI, Cheque, 1341, and 434 payments.</strong>
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    size="small"
                  >
                    Take Picture
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                    />
                  </Button>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    Max 5 images, 8MB each
                  </Typography>
                </Box>

                {formData?.screenshots?.length > 0 && (
                  <ImageList sx={{ width: '100%', height: 200 }} cols={3} rowHeight={164}>
                    {formData?.screenshots?.map((screenshot) => (
                      <ImageListItem key={screenshot.id}>
                        <img
                          src={screenshot.preview}
                          alt={screenshot.name}
                          loading="lazy"
                          style={{ objectFit: 'cover' }}
                        />
                        <ImageListItemBar
                          title={screenshot.name}
                          subtitle={`${(screenshot.size / 1024 / 1024).toFixed(2)} MB`}
                          actionIcon={
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                              onClick={() => removeScreenshot(screenshot.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                )}
              </Box>
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
              {/* Payment Summary - one line: Total | Paid | Balance (and Wallet when dealer) */}
              <Box sx={{ mb: 2, p: 1.5, bgcolor: "#f8f9fa", borderRadius: 1, border: "1px solid #e9ecef" }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, rowGap: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Total:</Typography>
                    <Typography variant="body1" fontWeight={600} color="#2c3e50">₹{getTotalOrderAmount().toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Paid:</Typography>
                    <Typography variant="body1" fontWeight={600} color="#4caf50">₹{getTotalPaidAmount().toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Balance:</Typography>
                    <Typography variant="body1" fontWeight={600} color={getBalanceAmount() >= 0 ? "#2c3e50" : "#f44336"}>₹{getBalanceAmount().toLocaleString()}</Typography>
                  </Box>
                  {formData?.dealer && dealerWallet && (
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Wallet:</Typography>
                      <Typography variant="body1" fontWeight={600} color="#ff9800">₹{dealerWallet.availableAmount?.toLocaleString() || 0}</Typography>
                    </Box>
                  )}
                </Box>
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

                {/* Wallet Payment Option - Only when dealer is selected in order */}
                {formData?.dealer && (
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

                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Amount (₹)"
                      type="number"
                      value={newPayment.paidAmount}
                      onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)}
                      placeholder="Enter amount"
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
                        <MenuItem value="UPI">UPI</MenuItem>
                        <MenuItem value="Cheque">Cheque</MenuItem>
                        <MenuItem value="NEFT/RTGS">NEFT/RTGS</MenuItem>
                        <MenuItem value="1341">1341</MenuItem>
                        <MenuItem value="434">434</MenuItem>
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
                        newPayment.modeOfPayment === "Cheque" || newPayment.modeOfPayment === "NEFT/RTGS"
                          ? "Enter bank name"
                          : "N/A"
                      }
                      disabled={
                        newPayment.isWalletPayment ||
                        (newPayment.modeOfPayment !== "Cheque" &&
                          newPayment.modeOfPayment !== "NEFT/RTGS")
                      }
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

                  {/* Payment Image Upload - Multiple images support */}
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: "#2c3e50" }}>
                        Payment Receipt Photo {newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS" ? "(Required)" : "(Optional)"}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          size="small"
                          disabled={loading}
                        >
                          {loading ? "Uploading..." : "Upload Images"}
                          <input
                            type="file"
                            hidden
                            accept="image/*"
                            multiple
                            onChange={handlePaymentImageUpload}
                          />
                        </Button>
                        {newPayment.modeOfPayment && newPayment.modeOfPayment !== "Cash" && newPayment.modeOfPayment !== "NEFT/RTGS" && (
                          <Typography variant="caption" color="error" sx={{ ml: 2, display: 'inline-block' }}>
                            Payment image is mandatory for {newPayment.modeOfPayment} payments
                          </Typography>
                        )}
                      </Box>

                      {/* Show preview of uploaded images */}
                      {newPayment.receiptPhoto && newPayment.receiptPhoto.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                          {newPayment.receiptPhoto.map((photo, index) => (
                            <Box
                              key={index}
                              sx={{
                                position: 'relative',
                                display: 'inline-block',
                                border: '2px solid #e0e0e0',
                                borderRadius: 2,
                                overflow: 'hidden'
                              }}
                            >
                              <img
                                src={photo}
                                alt={`Receipt ${index + 1}`}
                                style={{
                                  width: 120,
                                  height: 120,
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                              <IconButton
                                onClick={() => removePaymentImage(index)}
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(244, 67, 54, 0.8)',
                                  color: 'white',
                                  width: 24,
                                  height: 24,
                                  '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 1)'
                                  }
                                }}
                                size="small"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Upload payment confirmation screenshots or photos. You can upload multiple images.
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: fullScreen ? 1 : 0.75,
          background: '#fafafa',
          borderTop: '1px solid #e0e0e0',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          {formData?.noOfPlants && formData?.rate && (
            <Chip
              label={`Total: ₹${((parseInt(formData.noOfPlants) || 0) * (parseFloat(formData.rate) || 0)).toLocaleString()}`}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button
            onClick={handleClose}
            color="secondary"
            variant="outlined"
            size="small"
            disabled={loading}
          >
            {fullScreen ? 'Cancel' : 'Cancel (Esc)'}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
            className={classes.submitButton}
            size="small"
            startIcon={loading ? <CircularProgress size={14} /> : <AddIcon fontSize="small" />}
            title="Press Ctrl+S to submit"
          >
            {loading ? 'Adding Order...' : 'Add Order'}
          </Button>
        </Box>
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
                {/* Show product info if explicitly selected */}
                {confirmationData.isReadyPlantsProduct && confirmationData.productName && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#e3f2fd", borderRadius: 1, border: "1px solid #2196f3" }}>
                    <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 600, color: "#1976d2" }}>
                      📦 Ready Plants Product (Explicitly Selected)
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      <strong>Product:</strong> {confirmationData.productName}
                    </Typography>
                    {confirmationData.productDateRange && (
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Date Range:</strong> {confirmationData.productDateRange}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                      This order will be booked against the selected ready plants product from other nursery
                    </Typography>
                  </Box>
                )}
                {!confirmationData.isReadyPlantsProduct && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#e8f5e9", borderRadius: 1, border: "1px solid #4caf50" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                      🌱 Using Our Own Stock
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Order will be fulfilled from our nursery&apos;s stock
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Order For Details */}
              {formData?.orderForEnabled && (
                <Box sx={{ p: 2, bgcolor: "#e8f5e8", borderRadius: 1, border: "1px solid #4caf50" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#2e7d32", mb: 1 }}>
                    Order For Details
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Name:</strong> {formData?.orderForName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Mobile:</strong> {formData?.orderForMobileNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Address:</strong> {formData?.orderForAddress}
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
