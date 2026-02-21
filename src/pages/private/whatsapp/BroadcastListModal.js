import React, { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Stack,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Paper,
  Pagination,
  Collapse
} from "@mui/material"
import {
  X,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
  Database,
  Link as LinkIcon,
  FileText,
  Save,
  Trash2,
  Plus,
  UserMinus,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { API, NetworkManager } from "network/core"

const BroadcastListModal = ({ open, onClose, onListCreated }) => {
  // Data sources state - store all sources separately
  const [oldFarmersData, setOldFarmersData] = useState([])
  const [oldSalesData, setOldSalesData] = useState([])
  const [publicLeadsData, setPublicLeadsData] = useState([])
  
  // Current active tab
  const [activeTab, setActiveTab] = useState(0) // 0: Old Farmers, 1: Old Sales, 2: Public Leads
  
  // Selected farmers - stored as objects with full data
  const [selectedFarmers, setSelectedFarmers] = useState([])
  
  // Loading states
  const [loadingOldFarmers, setLoadingOldFarmers] = useState(false)
  const [loadingOldSales, setLoadingOldSales] = useState(false)
  const [loadingPublicLeads, setLoadingPublicLeads] = useState(false)
  
  // Error state
  const [error, setError] = useState(null)
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    district: "",
    taluka: "",
    village: ""
  })
  // Extended filters for Old Sales tab (plant, variety, media, batch, etc.)
  const [oldSalesFilters, setOldSalesFilters] = useState({
    plant: "",
    variety: "",
    media: "",
    batch: "",
    paymentMode: "",
    reference: "",
    marketingReference: "",
    billGivenOrNot: "",
    verifiedOrNot: "",
    shadeNo: "",
    vehicleNo: "",
    driverName: ""
  })
  const [moreFiltersExpanded, setMoreFiltersExpanded] = useState(false)
  
  // List name
  const [listName, setListName] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Public links state
  const [publicLinks, setPublicLinks] = useState([])
  const [selectedPublicLinkId, setSelectedPublicLinkId] = useState("")
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false)
  // Manual number entry (3 fields)
  const [manualNumbers, setManualNumbers] = useState(["", "", ""])
  // Pagination state for farmers / old sales / public leads
  const [oldFarmersPage, setOldFarmersPage] = useState(1)
  const [oldFarmersHasMore, setOldFarmersHasMore] = useState(true)
  const [oldFarmersPagination, setOldFarmersPagination] = useState({ total: 0, totalPages: 1 })
  const [oldSalesPage, setOldSalesPage] = useState(1)
  const [oldSalesHasMore, setOldSalesHasMore] = useState(true)
  const [oldSalesPagination, setOldSalesPagination] = useState({ total: 0, totalPages: 1 })
  const [publicLeadsPage, setPublicLeadsPage] = useState(1)
  const [publicLeadsHasMore, setPublicLeadsHasMore] = useState(true)
  const [publicLeadsPagination, setPublicLeadsPagination] = useState({ total: 0, totalPages: 1 })
  const [filterOptions, setFilterOptions] = useState({
    districts: [],
    talukas: [],
    villages: [],
    plant: [],
    variety: [],
    media: [],
    batch: [],
    paymentMode: [],
    reference: [],
    marketingReference: [],
    billGivenOrNot: [],
    verifiedOrNot: [],
    shadeNo: [],
    vehicleNo: [],
    driverName: []
  })
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false)
  const searchDebounceRef = useRef(null)

  const PAGE_LIMIT = 50

  const fetchFilterOptions = async (tab, district = "", taluka = "") => {
    setLoadingFilterOptions(true)
    try {
      if (tab === 0) {
        const instance = NetworkManager(API.FARMER.GET_FILTER_OPTIONS)
        const params = {}
        if (district) params.district = district
        if (taluka) params.taluka = taluka
        const res = await instance.request({}, params)
        const d = res?.data?.data || {}
        setFilterOptions(prev => ({
          ...prev,
          districts: Array.isArray(d.districts) ? d.districts : [],
          talukas: Array.isArray(d.talukas) ? d.talukas : [],
          villages: Array.isArray(d.villages) ? d.villages : [],
        }))
      } else if (tab === 1) {
        const instance = NetworkManager(API.OLD_SALES.GET_FILTER_OPTIONS)
        const params = {}
        if (district) params.district = district
        if (taluka) params.taluka = taluka
        const res = await instance.request({}, params)
        const d = res?.data?.data || res?.data || {}
        setFilterOptions(prev => ({
          ...prev,
          districts: Array.isArray(d.district) ? d.district : [],
          talukas: Array.isArray(d.taluka) ? d.taluka : [],
          villages: Array.isArray(d.village) ? d.village : [],
          plant: Array.isArray(d.plant) ? d.plant : [],
          variety: Array.isArray(d.variety) ? d.variety : [],
          media: Array.isArray(d.media) ? d.media : [],
          batch: Array.isArray(d.batch) ? d.batch : [],
          paymentMode: Array.isArray(d.paymentMode) ? d.paymentMode : [],
          reference: Array.isArray(d.reference) ? d.reference : [],
          marketingReference: Array.isArray(d.marketingReference) ? d.marketingReference : [],
          billGivenOrNot: Array.isArray(d.billGivenOrNot) ? d.billGivenOrNot : [],
          verifiedOrNot: Array.isArray(d.verifiedOrNot) ? d.verifiedOrNot : [],
          shadeNo: Array.isArray(d.shadeNo) ? d.shadeNo : [],
          vehicleNo: Array.isArray(d.vehicleNo) ? d.vehicleNo : [],
          driverName: Array.isArray(d.driverName) ? d.driverName : [],
        }))
      } else if (tab === 2) {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_FILTER_OPTIONS)
        const params = {}
        if (district) params.district = district
        if (taluka) params.taluka = taluka
        const res = await instance.request({}, params)
        const d = res?.data?.data || {}
        setFilterOptions(prev => ({
          ...prev,
          districts: Array.isArray(d.districts) ? d.districts : [],
          talukas: Array.isArray(d.talukas) ? d.talukas : [],
          villages: Array.isArray(d.villages) ? d.villages : [],
        }))
      }
    } catch (e) {
      console.error("Error fetching filter options:", e)
    } finally {
      setLoadingFilterOptions(false)
    }
  }

  useEffect(() => {
    if (open) {
      resetForm()
      fetchPublicLinks()
      fetchFilterOptions(0)
      fetchOldFarmers({ page: 1, limit: 50 }, "", { district: "", taluka: "", village: "" })
      fetchOldSalesData({ page: 1, limit: 50 }, "", { district: "", taluka: "", village: "" })
    }
  }, [open])

  const resetForm = () => {
    setOldFarmersData([])
    setOldSalesData([])
    setPublicLeadsData([])
    setSelectedFarmers([])
    setSearchTerm("")
    setFilters({ district: "", taluka: "", village: "" })
    setOldSalesFilters({ plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
    setMoreFiltersExpanded(false)
    setFilterOptions({ districts: [], talukas: [], villages: [], plant: [], variety: [], media: [], batch: [], paymentMode: [], reference: [], marketingReference: [], billGivenOrNot: [], verifiedOrNot: [], shadeNo: [], vehicleNo: [], driverName: [] })
    setListName("")
    setSelectedPublicLinkId("")
    setManualNumbers(["", "", ""])
    setActiveTab(0)
    setError(null)
    setOldFarmersPage(1)
    setOldFarmersHasMore(true)
    setOldFarmersPagination({ total: 0, totalPages: 1 })
    setOldSalesPage(1)
    setOldSalesHasMore(true)
    setOldSalesPagination({ total: 0, totalPages: 1 })
    setPublicLeadsPage(1)
    setPublicLeadsHasMore(true)
    setPublicLeadsPagination({ total: 0, totalPages: 1 })
  }

  // Fetch public links
  const fetchPublicLinks = async () => {
    setLoadingPublicLinks(true)
    try {
      const instance = NetworkManager(API.PUBLIC_LINKS.GET_LINKS)
      const response = await instance.request()
      const links = response?.data?.data?.links || []
      setPublicLinks(links)
    } catch (error) {
      console.error("Error fetching public links:", error)
    } finally {
      setLoadingPublicLinks(false)
    }
  }

  // Fetch old farmers (search + filters trigger API call)
  const fetchOldFarmers = async ({ page = 1, limit = 50 } = {}, search = "", filterOverrides = null) => {
    setLoadingOldFarmers(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMERS)
      const params = { page, limit }
      if (search && search.trim()) params.q = search.trim()
      const f = filterOverrides ?? filters
      if (f.district) params.district = f.district
      if (f.taluka) params.taluka = f.taluka
      if (f.village) params.village = f.village
      const response = await instance.request({}, params)

      const data = response.data?.data || {}
      const farmersData = Array.isArray(data) ? data : data.farmers || []
      const pagination = data.pagination || {}

      const normalizedFarmers = farmersData.map(farmer => ({
        ...farmer,
        _id: farmer._id || farmer.id,
        id: farmer._id || farmer.id,
        opt_in: farmer.opt_in ?? null,
        source: "oldFarmer",
        sourceLabel: "Old Farmer"
      }))

      setOldFarmersData(normalizedFarmers)
      setOldFarmersPage(page)
      setOldFarmersHasMore(pagination.hasNextPage ?? farmersData.length === limit)
      setOldFarmersPagination({
        total: pagination.total ?? 0,
        totalPages: pagination.totalPages ?? 1,
      })
    } catch (error) {
      console.error("Error fetching old farmers:", error)
      setError("Failed to fetch old farmers")
    } finally {
      setLoadingOldFarmers(false)
    }
  }

  // Fetch old sales data (unique farmers/customers from old sales, search + filters)
  const fetchOldSalesData = async ({ page = 1, limit = 50 } = {}, search = "", filterOverrides = null, oldSalesFilterOverrides = null) => {
    setLoadingOldSales(true)
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_UNIQUE_CUSTOMERS)
      const params = { page, limit }
      if (search && search.trim()) params.q = search.trim()
      const f = filterOverrides ?? filters
      const osf = oldSalesFilterOverrides ?? oldSalesFilters
      if (f.district) params.district = f.district
      if (f.taluka) params.taluka = f.taluka
      if (f.village) params.village = f.village
      if (osf.plant) params.plant = osf.plant
      if (osf.variety) params.variety = osf.variety
      if (osf.media) params.media = osf.media
      if (osf.batch) params.batch = osf.batch
      if (osf.paymentMode) params.paymentMode = osf.paymentMode
      if (osf.reference) params.reference = osf.reference
      if (osf.marketingReference) params.marketingReference = osf.marketingReference
      if (osf.billGivenOrNot) params.billGivenOrNot = osf.billGivenOrNot
      if (osf.verifiedOrNot) params.verifiedOrNot = osf.verifiedOrNot
      if (osf.shadeNo) params.shadeNo = osf.shadeNo
      if (osf.vehicleNo) params.vehicleNo = osf.vehicleNo
      if (osf.driverName) params.driverName = osf.driverName
      const response = await instance.request({}, params)
      const customers = response?.data?.data?.customers || []

      const normalizedFarmers = customers.map((c, index) => ({
        _id: c._id || `old-sales-${c.mobileNumber}-${(page - 1) * limit + index}`,
        id: c._id || `old-sales-${c.mobileNumber}-${(page - 1) * limit + index}`,
        name: c.name || c.customerName || "",
        mobileNumber: c.mobileNumber || c.mobileNo || "",
        // Expect backend to include opt_in on customer/farmer object
        opt_in: c.opt_in ?? c.optIn ?? null,
        village: c.village || "",
        taluka: c.taluka || "",
        district: c.district || "",
        state: c.state || "",
        source: "oldSales",
        sourceLabel: "Old Sales (Farmer)",
        originalData: c
      })).filter(f => f.name && f.mobileNumber)

      const pagination = response?.data?.data?.pagination || {}
      setOldSalesData(normalizedFarmers)
      setOldSalesPage(page)
      setOldSalesHasMore(pagination.hasNextPage ?? (pagination.totalPages != null ? page < pagination.totalPages : customers.length === limit))
      setOldSalesPagination({
        total: pagination.total ?? 0,
        totalPages: pagination.totalPages ?? 1,
      })
    } catch (error) {
      console.error("Error fetching old sales data:", error)
      setError("Failed to fetch old sales data")
    } finally {
      setLoadingOldSales(false)
    }
  }

  // -- bulk opt-in is expected from backend in the customers/farmers payload.
  // Removed per-phone lookup; frontend now relies on `opt_in` present on returned records.

  const handleFarmersPageChange = (_, page) => {
    setOldFarmersPage(page)
    fetchOldFarmers({ page, limit: PAGE_LIMIT }, searchTerm)
  }

  const handleOldSalesPageChange = (_, page) => {
    setOldSalesPage(page)
    fetchOldSalesData({ page, limit: PAGE_LIMIT }, searchTerm)
  }

  const handlePublicLeadsPageChange = (_, page) => {
    setPublicLeadsPage(page)
    fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, page)
  }

  // Fetch public link leads (single link or all links, search + filters)
  const fetchPublicLeads = async (linkId, search = "", page = 1, filterOverrides = null) => {
    setLoadingPublicLeads(true)
    setError(null)
    try {
      let leads = []
      const f = filterOverrides ?? filters
      const queryParams = { page, limit: PAGE_LIMIT }
      if (search && search.trim()) queryParams.q = search.trim()
      if (f.district) queryParams.district = f.district
      if (f.taluka) queryParams.taluka = f.taluka
      if (f.village) queryParams.village = f.village
      if (linkId && linkId !== "all") {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
        const response = await instance.request(null, { pathParams: [linkId], ...queryParams })
        const data = response?.data?.data || {}
        leads = data.leads || []
        const pagination = { total: data.total ?? 0, totalPages: data.totalPages ?? 1, hasNextPage: data.hasNextPage ?? false, nextPage: data.nextPage }
        setPublicLeadsPage(page)
        setPublicLeadsHasMore(pagination.hasNextPage)
        setPublicLeadsPagination({ total: pagination.total, totalPages: pagination.totalPages })
      } else {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_ALL_LEADS)
        const response = await instance.request(null, queryParams)
        const data = response?.data?.data || {}
        leads = data.leads || []
        const pagination = { total: data.total ?? 0, totalPages: data.totalPages ?? 1, hasNextPage: data.hasNextPage ?? false, nextPage: data.nextPage }
        setPublicLeadsPage(page)
        setPublicLeadsHasMore(pagination.hasNextPage)
        setPublicLeadsPagination({ total: pagination.total, totalPages: pagination.totalPages })
      }

      const normalizedLeads = leads.map(lead => ({
        _id: lead._id,
        id: lead._id,
        name: lead.name,
        mobileNumber: lead.mobileNumber,
        village: lead.villageName || lead.village || "",
        taluka: lead.talukaName || lead.taluka || "",
        district: lead.districtName || lead.district || "",
        state: lead.stateName || lead.state || "",
        source: "publicLead",
        sourceLabel: lead.linkName ? `Lead (${lead.linkName})` : "Public Lead",
        originalLead: lead
      }))

      setPublicLeadsData(normalizedLeads)
    } catch (error) {
      console.error("Error fetching public leads:", error)
      setError("Failed to fetch public link leads")
      setPublicLeadsData([])
    } finally {
      setLoadingPublicLeads(false)
    }
  }


  // Handle public link selection change (tab 2) - fetch when link or tab changes
  useEffect(() => {
    if (activeTab === 2) {
      setPublicLeadsData([])
      setPublicLeadsPage(1)
      setPublicLeadsHasMore(true)
      fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, 1)
    }
  }, [selectedPublicLinkId, activeTab])

  // Debounced search: trigger API refetch when searchTerm changes (skip initial mount to avoid double fetch)
  const searchInitializedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      searchInitializedRef.current = false
      return
    }
    if (!searchInitializedRef.current) {
      searchInitializedRef.current = true
      return
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setOldFarmersPage(1)
      setOldSalesPage(1)
      setPublicLeadsPage(1)
      if (activeTab === 0) {
        setOldFarmersData([])
        fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, searchTerm)
      } else if (activeTab === 1) {
        setOldSalesData([])
        fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, searchTerm)
      } else if (activeTab === 2) {
        setPublicLeadsData([])
        fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, 1)
      }
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchTerm, activeTab, open])

  // Get current source data (server-side filtering - no client filter)
  const getCurrentSourceData = () => {
    if (activeTab === 0) return oldFarmersData
    if (activeTab === 1) return oldSalesData
    if (activeTab === 2) return publicLeadsData
    return []
  }

  const filteredFarmers = getCurrentSourceData()

  const handleFilterChange = (key, value) => {
    let newFilters = { ...filters, [key]: value }
    if (key === "district") {
      newFilters = { ...newFilters, taluka: "", village: "" }
      if (activeTab === 0) fetchFilterOptions(0, value, "")
      else if (activeTab === 1) fetchFilterOptions(1, value, "")
      else if (activeTab === 2) fetchFilterOptions(2, value, "")
    } else if (key === "taluka") {
      newFilters = { ...newFilters, village: "" }
      if (activeTab === 0) fetchFilterOptions(0, filters.district, value)
      else if (activeTab === 1) fetchFilterOptions(1, filters.district, value)
      else if (activeTab === 2) fetchFilterOptions(2, filters.district, value)
    }
    setFilters(newFilters)
    setOldFarmersPage(1)
    setOldSalesPage(1)
    setPublicLeadsPage(1)
    if (activeTab === 0) {
      setOldFarmersData([])
      fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, searchTerm, newFilters)
    } else if (activeTab === 1) {
      setOldSalesData([])
      fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, searchTerm, newFilters)
    } else if (activeTab === 2) {
      setPublicLeadsData([])
      fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, 1, newFilters)
    }
  }

  const handleOldSalesFilterChange = (key, value) => {
    const newOldSalesFilters = { ...oldSalesFilters, [key]: value }
    setOldSalesFilters(newOldSalesFilters)
    setOldSalesPage(1)
    setOldSalesData([])
    fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, searchTerm, filters, newOldSalesFilters)
  }

  const handleClearFilters = () => {
    const emptyFilters = { district: "", taluka: "", village: "" }
    const emptyOldSalesFilters = { plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" }
    setFilters(emptyFilters)
    if (activeTab === 0) fetchFilterOptions(0, "", "")
    else if (activeTab === 1) {
      setOldSalesFilters(emptyOldSalesFilters)
      fetchFilterOptions(1, "", "")
    } else if (activeTab === 2) fetchFilterOptions(2, "", "")
    setOldFarmersPage(1)
    setOldSalesPage(1)
    setPublicLeadsPage(1)
    if (activeTab === 0) {
      setOldFarmersData([])
      fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, searchTerm, emptyFilters)
    } else if (activeTab === 1) {
      setOldSalesData([])
      fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, searchTerm, emptyFilters, emptyOldSalesFilters)
    } else if (activeTab === 2) {
      setPublicLeadsData([])
      fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, 1, emptyFilters)
    }
  }

  const hasActiveFilters = filters.district || filters.taluka || filters.village ||
    (activeTab === 1 && (oldSalesFilters.plant || oldSalesFilters.variety || oldSalesFilters.media || oldSalesFilters.batch || oldSalesFilters.paymentMode || oldSalesFilters.reference || oldSalesFilters.marketingReference || oldSalesFilters.billGivenOrNot || oldSalesFilters.verifiedOrNot || oldSalesFilters.shadeNo || oldSalesFilters.vehicleNo || oldSalesFilters.driverName))

  // Check if farmer is already selected
  const isFarmerSelected = (farmerId) => {
    return selectedFarmers.some(f => (f._id || f.id) === farmerId)
  }

  // Add farmer to selected list
  const handleAddFarmer = (farmer) => {
    if (!isFarmerSelected(farmer._id || farmer.id)) {
      setSelectedFarmers(prev => [...prev, farmer])
    }
  }

  // Remove farmer from selected list
  const handleRemoveFarmer = (farmerId) => {
    setSelectedFarmers(prev => prev.filter(f => (f._id || f.id) !== farmerId))
  }

  // Add manual numbers to selected list
  const handleAddManualNumbers = () => {
    const toAdd = []
    manualNumbers.forEach((val, idx) => {
      const digits = String(val || "").replace(/\D/g, "")
      const phone = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null
      if (phone) {
        const mobileNumber = phone
        const id = `manual-${mobileNumber}-${idx}-${Date.now()}`
        if (!selectedFarmers.some(f => String(f.mobileNumber || "").replace(/\D/g, "").slice(-10) === mobileNumber)) {
          toAdd.push({
            _id: id,
            id,
            name: "",
            mobileNumber,
            village: "",
            taluka: "",
            district: "",
            source: "manual",
            sourceLabel: "Manual"
          })
        }
      }
    })
    if (toAdd.length > 0) {
      setSelectedFarmers(prev => [...prev, ...toAdd])
      setManualNumbers(["", "", ""])
    } else if (manualNumbers.some(m => m.trim())) {
      setError("Enter valid 10-digit phone numbers")
    }
  }

  // Handle select all from current filtered list
  const handleSelectAll = () => {
    const currentData = filteredFarmers
    const allSelected = currentData.every(f => isFarmerSelected(f._id || f.id))
    
    if (allSelected) {
      // Remove all current filtered farmers
      const idsToRemove = currentData.map(f => f._id || f.id)
      setSelectedFarmers(prev => prev.filter(f => !idsToRemove.includes(f._id || f.id)))
    } else {
      // Add all current filtered farmers that aren't already selected
      const toAdd = currentData.filter(f => !isFarmerSelected(f._id || f.id))
      setSelectedFarmers(prev => [...prev, ...toAdd])
    }
  }

  const handleSaveList = async () => {
    if (!listName.trim()) {
      setError("Please enter a list name")
      return
    }

    if (selectedFarmers.length === 0) {
      setError("Please select at least one farmer")
      return
    }

    setSaving(true)
    setError(null)

    const hasOnlyOldFarmers = selectedFarmers.every(
      (f) => f.source === "oldFarmer" && (f._id?.toString?.()?.length === 24 || f.id?.toString?.()?.length === 24)
    )

    try {
      if (hasOnlyOldFarmers) {
        const farmerIds = selectedFarmers.map((f) => f._id || f.id).filter(Boolean)
        const instance = NetworkManager(API.FARMER_LIST.CREATE_LIST)
        await instance.request({
          name: listName.trim(),
          farmerIds,
        })
        alert(`✅ Broadcast list "${listName}" created with ${farmerIds.length} farmers!`)
      } else {
        const contacts = selectedFarmers.map((f) => ({
          phone: (f.mobileNumber || "").toString().replace(/\D/g, "").replace(/^(\d{10})$/, "91$1"),
          name: (f.name || "").trim(),
        })).filter((c) => c.phone.length >= 10)
        if (!contacts.length) {
          setError("No valid phone numbers to save")
          setSaving(false)
          return
        }
        const instance = NetworkManager(API.WHATSAPP_CONTACT_LIST.CREATE)
        await instance.request({
          name: listName.trim(),
          description: "From Broadcast List (Old Sales / Public Leads)",
          contacts,
          source: "manual", 
        })
        alert(`✅ Contact list "${listName}" created with ${contacts.length} contacts. Use WhatsApp Management to send messages.`)
      }

      if (onListCreated) onListCreated()
      onClose()
    } catch (error) {
      console.error("Error creating list:", error)
      setError(error.response?.data?.message || "Failed to create list")
    } finally {
      setSaving(false)
    }
  }

  const getCurrentLoading = () => {
    if (activeTab === 0) return loadingOldFarmers
    if (activeTab === 1) return loadingOldSales
    if (activeTab === 2) return loadingPublicLeads
    return false
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '95vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Users size={24} color="#10b981" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Create Broadcast List
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Select farmers from all sources and manage your list
              </Typography>
            </Box>
          </Stack>
          <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
            <X size={20} />
          </Button>
        </Stack>
      </DialogTitle>
      
      <Divider />

      <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert 
            severity="error" 
            icon={<AlertCircle size={20} />}
            sx={{ borderRadius: 2 }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* List Name Input */}
        <Card sx={{ boxShadow: 0, border: 1, borderColor: 'grey.200' }}>
          <CardContent>
            <TextField
              fullWidth
              label="Broadcast List Name"
              placeholder="Enter a name for this broadcast list"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </CardContent>
        </Card>

        {/* Manual Number Entry */}
        <Card sx={{ boxShadow: 0, border: 1, borderColor: 'primary.main', bgcolor: 'primary.50' }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Plus size={18} color="#1976d2" />
              <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                Add numbers manually
              </Typography>
            </Stack>
            <Grid container spacing={2} alignItems="center">
              {[0, 1, 2].map((idx) => (
                <Grid item xs={12} sm={4} key={idx}>
                  <TextField
                    fullWidth
                    placeholder={`Phone ${idx + 1} (10 digits)`}
                    value={manualNumbers[idx]}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 12)
                      setManualNumbers(prev => {
                        const next = [...prev]
                        next[idx] = v
                        return next
                      })
                    }}
                    size="small"
                    inputProps={{ maxLength: 12 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              ))}
              <Grid item xs={12} sm="auto">
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<Plus size={16} />}
                  onClick={handleAddManualNumbers}
                  sx={{ borderRadius: 2 }}
                >
                  Add to list
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Selected Farmers Section */}
        {selectedFarmers.length > 0 && (
          <Card sx={{ boxShadow: 0, border: 1, borderColor: 'success.main', bgcolor: 'success.50' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircle size={18} color="#10b981" />
                  <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                    Selected Farmers ({selectedFarmers.length})
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Trash2 size={14} />}
                  onClick={() => setSelectedFarmers([])}
                  sx={{ borderRadius: 2 }}
                >
                  Clear All
                </Button>
              </Stack>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                maxHeight: 120,
                overflowY: 'auto',
                p: 1,
                bgcolor: 'white',
                borderRadius: 1
              }}>
                {selectedFarmers.map((farmer) => (
                  <Chip
                    key={farmer._id || farmer.id}
                    label={farmer.name ? `${farmer.name} (${farmer.mobileNumber})` : farmer.mobileNumber}
                    onDelete={() => handleRemoveFarmer(farmer._id || farmer.id)}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ 
                      '& .MuiChip-deleteIcon': { 
                        fontSize: '16px',
                        '&:hover': { color: 'error.main' }
                      }
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Source Tabs */}
        <Card sx={{ boxShadow: 0, border: 1, borderColor: 'grey.200' }}>
          <CardContent sx={{ p: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => {
                setActiveTab(newValue)
                setSearchTerm("")
                setFilters({ district: "", taluka: "", village: "" })
                if (newValue === 1) setOldSalesFilters({ plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
                fetchFilterOptions(newValue)
                if (newValue === 0) {
                  setOldFarmersPage(1)
                  fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" })
                } else if (newValue === 1) {
                  setOldSalesPage(1)
                  fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" }, { plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
                } else if (newValue === 2) {
                  setPublicLeadsPage(1)
                  fetchPublicLeads(selectedPublicLinkId || "all", "", 1, { district: "", taluka: "", village: "" })
                }
              }}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab 
                icon={<Database size={16} />} 
                iconPosition="start"
                label={`Old Farmers (${oldFarmersPagination.total || oldFarmersData.length})`}
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<FileText size={16} />} 
                iconPosition="start"
                label={`Old Sales (${oldSalesPagination.total || oldSalesData.length})`}
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<LinkIcon size={16} />} 
                iconPosition="start"
                label={`Public Leads (${publicLeadsPagination.total || publicLeadsData.length})`}
                sx={{ textTransform: 'none' }}
              />
            </Tabs>

            {/* Public Link Selector for Public Leads Tab */}
            {activeTab === 2 && (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Public Link</InputLabel>
                  <Select
                    value={selectedPublicLinkId || "all"}
                    onChange={(e) => setSelectedPublicLinkId(e.target.value === "all" ? "" : e.target.value)}
                    label="Public Link"
                    disabled={loadingPublicLinks}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="all">
                      <em>All links (all farmers registered on any link)</em>
                    </MenuItem>
                    {publicLinks.map((link) => (
                      <MenuItem key={link._id} value={link._id}>
                        {link.name} ({link.slug})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Search and Filters - all tabs */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder="Search farmers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={20} />
                          </InputAdornment>
                        )
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>District</InputLabel>
                      <Select
                        value={filters.district}
                        onChange={(e) => handleFilterChange("district", e.target.value)}
                        label="District"
                        sx={{ borderRadius: 2 }}
                        disabled={loadingFilterOptions}
                      >
                        <MenuItem value="">All Districts</MenuItem>
                        {filterOptions.districts.map(d => (
                          <MenuItem key={d} value={d}>{d}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Taluka</InputLabel>
                      <Select
                        value={filters.taluka}
                        onChange={(e) => handleFilterChange("taluka", e.target.value)}
                        label="Taluka"
                        sx={{ borderRadius: 2 }}
                        disabled={loadingFilterOptions}
                      >
                        <MenuItem value="">All Talukas</MenuItem>
                        {filterOptions.talukas.map(t => (
                          <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Village</InputLabel>
                      <Select
                        value={filters.village}
                        onChange={(e) => handleFilterChange("village", e.target.value)}
                        label="Village"
                        sx={{ borderRadius: 2 }}
                        disabled={loadingFilterOptions}
                      >
                        <MenuItem value="">All Villages</MenuItem>
                        {filterOptions.villages.map(v => (
                          <MenuItem key={v} value={v}>{v}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md="auto">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleClearFilters}
                      disabled={!hasActiveFilters || loadingFilterOptions}
                      sx={{ borderRadius: 2 }}
                    >
                      Clear filters
                    </Button>
                  </Grid>
                  {activeTab === 1 && (
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        startIcon={moreFiltersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        onClick={() => setMoreFiltersExpanded(!moreFiltersExpanded)}
                        sx={{ textTransform: 'none' }}
                      >
                        {moreFiltersExpanded ? "Hide more filters" : "More filters (plant, variety, media, batch…)"}
                      </Button>
                    </Grid>
                  )}
                </Grid>
                {activeTab === 1 && moreFiltersExpanded && (
                  <Collapse in={moreFiltersExpanded}>
                    <Grid container spacing={2} sx={{ mt: 1, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                      {[
                        { key: "plant", label: "Plant", options: filterOptions.plant },
                        { key: "variety", label: "Variety", options: filterOptions.variety },
                        { key: "media", label: "Media", options: filterOptions.media },
                        { key: "batch", label: "Batch", options: filterOptions.batch },
                        { key: "paymentMode", label: "Payment Mode", options: filterOptions.paymentMode },
                        { key: "reference", label: "Reference", options: filterOptions.reference },
                        { key: "marketingReference", label: "Marketing Reference", options: filterOptions.marketingReference },
                        { key: "billGivenOrNot", label: "Bill Given", options: filterOptions.billGivenOrNot },
                        { key: "verifiedOrNot", label: "Verified", options: filterOptions.verifiedOrNot },
                        { key: "shadeNo", label: "Shade No", options: filterOptions.shadeNo },
                        { key: "vehicleNo", label: "Vehicle No", options: filterOptions.vehicleNo },
                        { key: "driverName", label: "Driver Name", options: filterOptions.driverName },
                      ].map(({ key, label, options }) => (
                        <Grid item xs={12} sm={6} md={4} key={key}>
                          <FormControl fullWidth size="small">
                            <InputLabel>{label}</InputLabel>
                            <Select
                              value={oldSalesFilters[key] || ""}
                              onChange={(e) => handleOldSalesFilterChange(key, e.target.value)}
                              label={label}
                              sx={{ borderRadius: 2 }}
                              disabled={loadingFilterOptions}
                            >
                              <MenuItem value="">All</MenuItem>
                              {(options || []).map((o) => (
                                <MenuItem key={o} value={o}>{o}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      ))}
                    </Grid>
                  </Collapse>
                )}
            </Box>

            {/* Pagination - above table for visibility */}
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
              {activeTab === 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {oldFarmersPagination.total || 0} total · Page {oldFarmersPage} of {oldFarmersPagination.totalPages || 1}
                  </Typography>
                  <Pagination
                    count={Math.max(1, oldFarmersPagination.totalPages || 1)}
                    page={oldFarmersPage}
                    onChange={handleFarmersPageChange}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                    disabled={loadingOldFarmers}
                  />
                </>
              )}
              {activeTab === 1 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {oldSalesPagination.total || 0} total · Page {oldSalesPage} of {oldSalesPagination.totalPages || 1}
                  </Typography>
                  <Pagination
                    count={Math.max(1, oldSalesPagination.totalPages || 1)}
                    page={oldSalesPage}
                    onChange={handleOldSalesPageChange}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                    disabled={loadingOldSales}
                  />
                </>
              )}
              {activeTab === 2 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {publicLeadsPagination.total || 0} total · Page {publicLeadsPage} of {publicLeadsPagination.totalPages || 1}
                  </Typography>
                  <Pagination
                    count={Math.max(1, publicLeadsPagination.totalPages || 1)}
                    page={publicLeadsPage}
                    onChange={handlePublicLeadsPageChange}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                    disabled={loadingPublicLeads}
                  />
                </>
              )}
            </Box>

            {/* Farmers List */}
            <TableContainer sx={{ maxHeight: 320 }}>
              {getCurrentLoading() ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    Loading...
                  </Typography>
                </Box>
              ) : (
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ width: 50 }}>
                        <Checkbox
                          checked={filteredFarmers.length > 0 && filteredFarmers.every(f => isFarmerSelected(f._id || f.id))}
                          indeterminate={filteredFarmers.some(f => isFarmerSelected(f._id || f.id)) && !filteredFarmers.every(f => isFarmerSelected(f._id || f.id))}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 50 }}>Add</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Mobile</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Opt-in</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Village</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Taluka</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>District</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFarmers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {activeTab === 2
                              ? "No farmers registered on public links yet"
                              : "No farmers found"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFarmers.map((farmer) => {
                        const isSelected = isFarmerSelected(farmer._id || farmer.id)
                        return (
                          <TableRow key={farmer._id || farmer.id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    handleRemoveFarmer(farmer._id || farmer.id)
                                  } else {
                                    handleAddFarmer(farmer)
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {!isSelected ? (
                                <IconButton
                                  size="small"
                                  onClick={() => handleAddFarmer(farmer)}
                                  color="primary"
                                  sx={{ 
                                    '&:hover': { bgcolor: 'primary.50' }
                                  }}
                                >
                                  <Plus size={16} />
                                </IconButton>
                              ) : (
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveFarmer(farmer._id || farmer.id)}
                                  color="error"
                                  sx={{ 
                                    '&:hover': { bgcolor: 'error.50' }
                                  }}
                                >
                                  <UserMinus size={16} />
                                </IconButton>
                              )}
                            </TableCell>
                            <TableCell>{farmer.name}</TableCell>
                            <TableCell>{farmer.mobileNumber}</TableCell>
                            <TableCell>
                              {farmer.opt_in === true ? (
                                <Chip label="Opted-in" size="small" color="success" variant="outlined" />
                              ) : farmer.opt_in === false ? (
                                <Chip label="Opted-out" size="small" color="error" variant="outlined" />
                              ) : (
                                <Chip label="Unknown" size="small" color="default" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>{farmer.village}</TableCell>
                            <TableCell>{farmer.taluka}</TableCell>
                            <TableCell>{farmer.district}</TableCell>
                            <TableCell>
                              <Chip 
                                label={farmer.sourceLabel || farmer.source}
                                size="small"
                                color={
                                  farmer.source === "publicLead" ? "primary" :
                                  farmer.source === "oldSales" ? "warning" :
                                  "default"
                                }
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
            {/* Pagination - below table */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, borderTop: 1, borderColor: 'divider' }}>
              {activeTab === 0 && (
                <Pagination
                  count={Math.max(1, oldFarmersPagination.totalPages || 1)}
                  page={oldFarmersPage}
                  onChange={handleFarmersPageChange}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  disabled={loadingOldFarmers}
                />
              )}
              {activeTab === 1 && (
                <Pagination
                  count={Math.max(1, oldSalesPagination.totalPages || 1)}
                  page={oldSalesPage}
                  onChange={handleOldSalesPageChange}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  disabled={loadingOldSales}
                />
              )}
              {activeTab === 2 && (
                <Pagination
                  count={Math.max(1, publicLeadsPagination.totalPages || 1)}
                  page={publicLeadsPage}
                  onChange={handlePublicLeadsPageChange}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  disabled={loadingPublicLeads}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
          onClick={handleSaveList}
          disabled={saving || selectedFarmers.length === 0 || !listName.trim()}
          sx={{ 
            borderRadius: 2,
            px: 3,
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' }
          }}
        >
          {saving ? "Saving..." : `Save List (${selectedFarmers.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default BroadcastListModal
