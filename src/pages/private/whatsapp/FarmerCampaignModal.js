import React, { useState, useEffect, useRef } from "react"
import { alpha } from "@mui/material/styles"
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
  Collapse,
  Pagination
} from "@mui/material"
import ListItemText from "@mui/material/ListItemText"
import {
  Send,
  X,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Database,
  Link as LinkIcon,
  FileText,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { sendTemplateMessages } from "network/core/wati"
import { API, NetworkManager } from "network/core"
import ExcelSendModal from "pages/private/whatsapp/ExcelSendModal"

const theme = {
  primary: "#25D366",
  primaryDark: "#128C7E",
  primaryLight: "#dcfce7",
  accent: "#075e54",
  surface: "#ffffff",
  surfaceSubtle: "#f8fafc",
  border: "rgba(18, 140, 126, 0.12)",
  shadow: "0 4px 24px -4px rgba(0,0,0,0.08), 0 8px 16px -8px rgba(0,0,0,0.04)",
  shadowHover: "0 12px 40px -8px rgba(37,211,102,0.2)",
}

const FarmerCampaignModal = ({ open, onClose, template: initialTemplate, templates = [], farmerLists = [], excelContactLists = [], onListUpdate, initialListId, onSuccess }) => {
  const approvedTemplates = (templates || []).filter((t) => t.status === "APPROVED")
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const template = selectedTemplate || initialTemplate || approvedTemplates[0] || null

  const [oldFarmersData, setOldFarmersData] = useState([])
  const [oldSalesData, setOldSalesData] = useState([])
  const [publicLeadsData, setPublicLeadsData] = useState([])
  const [activeTab, setActiveTab] = useState(0) // 0: Old Farmers, 1: Old Sales, 2: Public Leads
  const [selectedFarmers, setSelectedFarmers] = useState([]) // objects with full data
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({ district: "", taluka: "", village: "" })
  const [oldSalesFilters, setOldSalesFilters] = useState({
    plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "",
    billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: ""
  })
  const [moreFiltersExpanded, setMoreFiltersExpanded] = useState(false)
  const [parameterValues, setParameterValues] = useState({})
  const [selectedListId, setSelectedListId] = useState("")
  const [useListMode, setUseListMode] = useState(false)
  const [selectedListIds, setSelectedListIds] = useState([])
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [manualNumberInput, setManualNumberInput] = useState("")
  const [manualAddExpanded, setManualAddExpanded] = useState(false)
  const [campaignName, setCampaignName] = useState("")

  const [publicLinks, setPublicLinks] = useState([])
  const [selectedPublicLinkId, setSelectedPublicLinkId] = useState("")
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false)
  const [loadingOldFarmers, setLoadingOldFarmers] = useState(false)
  const [loadingOldSales, setLoadingOldSales] = useState(false)
  const [loadingPublicLeads, setLoadingPublicLeads] = useState(false)
  const [oldFarmersPage, setOldFarmersPage] = useState(1)
  const [oldFarmersPagination, setOldFarmersPagination] = useState({ total: 0, totalPages: 1 })
  const [oldSalesPage, setOldSalesPage] = useState(1)
  const [oldSalesPagination, setOldSalesPagination] = useState({ total: 0, totalPages: 1 })
  const [publicLeadsPage, setPublicLeadsPage] = useState(1)
  const [publicLeadsPagination, setPublicLeadsPagination] = useState({ total: 0, totalPages: 1 })
  const [filterOptions, setFilterOptions] = useState({
    districts: [], talukas: [], villages: [],
    plant: [], variety: [], media: [], batch: [], paymentMode: [], reference: [], marketingReference: [],
    billGivenOrNot: [], verifiedOrNot: [], shadeNo: [], vehicleNo: [], driverName: []
  })
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false)
  const searchDebounceRef = useRef(null)
  const PAGE_LIMIT = 50

  useEffect(() => {
    if (open) {
      const approved = (templates || []).filter((t) => t.status === "APPROVED")
      setSelectedTemplate(initialTemplate || approved[0] || null)
    }
  }, [open, initialTemplate, templates])

  useEffect(() => {
    if (open) {
      setSelectedListIds(initialListId ? [initialListId] : [])
      setUseListMode(!!initialListId)
      setSelectedFarmers([])
      setActiveTab(0)
      setSelectedPublicLinkId("")
      setManualNumberInput("")
      setManualAddExpanded(false)
      setCampaignName("")
      setSearchTerm("")
      setFilters({ district: "", taluka: "", village: "" })
      setOldSalesFilters({ plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
      setMoreFiltersExpanded(false)
      fetchPublicLinks()
      fetchFilterOptions(0)
      if (initialListId) {
        loadFarmersFromLists([initialListId])
      } else {
        fetchOldFarmers({ page: 1, limit: 50 }, "", { district: "", taluka: "", village: "" })
      }
      fetchOldSalesData({ page: 1, limit: 50 }, "", { district: "", taluka: "", village: "" })
    }
  }, [open, initialListId])

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
        setFilterOptions(prev => ({ ...prev, districts: Array.isArray(d.districts) ? d.districts : [], talukas: Array.isArray(d.talukas) ? d.talukas : [], villages: Array.isArray(d.villages) ? d.villages : [] }))
      } else if (tab === 1) {
        const instance = NetworkManager(API.OLD_SALES.GET_FILTER_OPTIONS)
        const params = {}
        if (district) params.district = district
        if (taluka) params.taluka = taluka
        const res = await instance.request({}, params)
        const d = res?.data?.data || res?.data || {}
        setFilterOptions(prev => ({
          ...prev,
          districts: Array.isArray(d.district) ? d.district : [], talukas: Array.isArray(d.taluka) ? d.taluka : [], villages: Array.isArray(d.village) ? d.village : [],
          plant: Array.isArray(d.plant) ? d.plant : [], variety: Array.isArray(d.variety) ? d.variety : [], media: Array.isArray(d.media) ? d.media : [], batch: Array.isArray(d.batch) ? d.batch : [],
          paymentMode: Array.isArray(d.paymentMode) ? d.paymentMode : [], reference: Array.isArray(d.reference) ? d.reference : [], marketingReference: Array.isArray(d.marketingReference) ? d.marketingReference : [],
          billGivenOrNot: Array.isArray(d.billGivenOrNot) ? d.billGivenOrNot : [], verifiedOrNot: Array.isArray(d.verifiedOrNot) ? d.verifiedOrNot : [],
          shadeNo: Array.isArray(d.shadeNo) ? d.shadeNo : [], vehicleNo: Array.isArray(d.vehicleNo) ? d.vehicleNo : [], driverName: Array.isArray(d.driverName) ? d.driverName : []
        }))
      } else if (tab === 2) {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_FILTER_OPTIONS)
        const params = {}
        if (district) params.district = district
        if (taluka) params.taluka = taluka
        const res = await instance.request({}, params)
        const d = res?.data?.data || {}
        setFilterOptions(prev => ({ ...prev, districts: Array.isArray(d.districts) ? d.districts : [], talukas: Array.isArray(d.talukas) ? d.talukas : [], villages: Array.isArray(d.villages) ? d.villages : [] }))
      }
    } catch (e) {
      console.error("Error fetching filter options:", e)
    } finally {
      setLoadingFilterOptions(false)
    }
  }

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
      const normalized = farmersData.map(farmer => ({
        ...farmer, _id: farmer._id || farmer.id, id: farmer._id || farmer.id, source: "oldFarmer"
      }))
      setOldFarmersData(normalized)
      setOldFarmersPage(page)
      setOldFarmersPagination({ total: pagination.total ?? 0, totalPages: pagination.totalPages ?? 1 })
    } catch (error) {
      console.error("Error fetching old farmers:", error)
      setError("Failed to fetch old farmers")
    } finally {
      setLoadingOldFarmers(false)
    }
  }

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
      const normalized = customers.map((c, index) => ({
        _id: c._id || `old-sales-${c.mobileNumber}-${(page - 1) * limit + index}`,
        id: c._id || `old-sales-${c.mobileNumber}-${(page - 1) * limit + index}`,
        name: c.name || c.customerName || "",
        mobileNumber: c.mobileNumber || c.mobileNo || "",
        village: c.village || "", taluka: c.taluka || "", district: c.district || "", state: c.state || "",
        source: "oldSales", originalData: c
      })).filter(f => f.name && f.mobileNumber)
      const pagination = response?.data?.data?.pagination || {}
      setOldSalesData(normalized)
      setOldSalesPage(page)
      setOldSalesPagination({ total: pagination.total ?? 0, totalPages: pagination.totalPages ?? 1 })
    } catch (error) {
      console.error("Error fetching old sales data:", error)
      setError("Failed to fetch old sales data")
    } finally {
      setLoadingOldSales(false)
    }
  }

  const fetchPublicLeads = async (linkId, search = "", page = 1, filterOverrides = null) => {
    setLoadingPublicLeads(true)
    setError(null)
    try {
      const f = filterOverrides ?? filters
      const queryParams = { page, limit: PAGE_LIMIT }
      if (search && search.trim()) queryParams.q = search.trim()
      if (f.district) queryParams.district = f.district
      if (f.taluka) queryParams.taluka = f.taluka
      if (f.village) queryParams.village = f.village
      let leads = []
      if (linkId && linkId !== "all") {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
        const response = await instance.request(null, { pathParams: [linkId], ...queryParams })
        const data = response?.data?.data || {}
        leads = data.leads || []
        setPublicLeadsPagination({ total: data.total ?? 0, totalPages: data.totalPages ?? 1 })
      } else {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_ALL_LEADS)
        const response = await instance.request(null, queryParams)
        const data = response?.data?.data || {}
        leads = data.leads || []
        setPublicLeadsPagination({ total: data.total ?? 0, totalPages: data.totalPages ?? 1 })
      }
      const normalized = leads.map(lead => ({
        _id: lead._id, id: lead._id, name: lead.name, mobileNumber: lead.mobileNumber,
        village: lead.villageName || lead.village || "", taluka: lead.talukaName || lead.taluka || "",
        district: lead.districtName || lead.district || "", state: lead.stateName || lead.state || "",
        source: "publicLead", originalLead: lead
      }))
      setPublicLeadsData(normalized)
      setPublicLeadsPage(page)
    } catch (error) {
      console.error("Error fetching public leads:", error)
      setError("Failed to fetch public link leads")
      setPublicLeadsData([])
    } finally {
      setLoadingPublicLeads(false)
    }
  }

  useEffect(() => {
    if (activeTab === 2) {
      setPublicLeadsData([])
      setPublicLeadsPage(1)
      fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, 1)
    }
  }, [selectedPublicLinkId, activeTab])

  useEffect(() => {
    if (useListMode && selectedListIds && selectedListIds.length > 0 && activeTab === 0) {
      loadFarmersFromLists(selectedListIds)
    }
  }, [selectedListIds, useListMode, activeTab])

  const loadFarmersFromLists = async (listIds = []) => {
    setLoading(true)
    try {
      const allFarmers = []
      for (const listId of listIds) {
        try {
          const isFarmerList = (farmerLists || []).some(l => (l._id || l.id) === listId)
          const isContactList = (excelContactLists || []).some(l => (l._id || l.id) === listId)

          if (isFarmerList) {
            const endpoint = { ...API.FARMER_LIST.GET_LIST_BY_ID, endpoint: `farmer-list/${listId}` }
            const listInstance = NetworkManager(endpoint)
            const response = await listInstance.request()
            const listFarmers = response.data?.data?.farmers || []
            allFarmers.push(...listFarmers.map(f => ({ ...f, _id: f._id || f.id, id: f._id || f.id, source: "oldFarmer" })))
          } else if (isContactList) {
            const endpoint = { ...API.WHATSAPP_CONTACT_LIST.GET_BY_ID, endpoint: `whatsapp-contact-list/${listId}` }
            const listInstance = NetworkManager(endpoint)
            const response = await listInstance.request()
            const list = response?.data?.data
            const contacts = list?.contacts || []
            const normalized = contacts.map((c, idx) => {
              const phone = String(c.phone || "").replace(/\D/g, "").replace(/^91/, "").replace(/^0+/, "") || ""
              const id = c._id || `contact-${listId}-${idx}-${phone || idx}`
              return {
                _id: id,
                id,
                name: c.name || "",
                mobileNumber: phone || c.phone || "",
                village: c.village || "",
                taluka: c.taluka || "",
                district: c.district || "",
                state: c.state || "",
                source: "contact"
              }
            }).filter(c => c.mobileNumber)
            allFarmers.push(...normalized)
          }
        } catch (e) {
          console.error("Failed to load list", listId, e)
        }
      }
      const seen = new Set()
      const unique = []
      for (const f of allFarmers) {
        const key = (f.mobileNumber || f._id || "").toString()
        if (!seen.has(key)) {
          seen.add(key)
          unique.push({ ...f, _id: f._id || f.id, id: f._id || f.id, source: f.source || "oldFarmer" })
        }
      }
      setOldFarmersData(unique)
      setOldFarmersPagination({ total: unique.length, totalPages: 1 })
      setSelectedFarmers(unique)
    } catch (error) {
      console.error("Error loading farmers from lists:", error)
      setError("Failed to load farmers from lists")
    } finally {
      setLoading(false)
    }
  }

  const getCurrentSourceData = () => {
    if (useListMode && activeTab === 0) return oldFarmersData
    if (activeTab === 0) return oldFarmersData
    if (activeTab === 1) return oldSalesData
    if (activeTab === 2) return publicLeadsData
    return []
  }

  const filteredFarmers = getCurrentSourceData()

  const isFarmerSelected = (farmerId) => selectedFarmers.some(f => (f._id || f.id) === farmerId)

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

  const searchInitializedRef = useRef(false)
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  useEffect(() => {
    if (!open) { searchInitializedRef.current = false; return }
    if (!searchInitializedRef.current) { searchInitializedRef.current = true; return }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      const tab = activeTabRef.current
      setOldFarmersPage(1)
      setOldSalesPage(1)
      setPublicLeadsPage(1)
      if (tab === 0 && !useListMode) {
        setOldFarmersData([])
        fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, searchTerm)
      } else if (tab === 1) {
        setOldSalesData([])
        fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, searchTerm)
      } else if (tab === 2) {
        setPublicLeadsData([])
        fetchPublicLeads(selectedPublicLinkId || "all", searchTerm, 1)
      }
    }, 400)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [searchTerm, open])

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

  // Initialize parameter values
  useEffect(() => {
    const vars = extractVariables(template)
    if (template && vars.length > 0) {
      const initialValues = {}
      vars.forEach((variable, index) => {
        const customParam = template.customParams?.find(param => param.paramName === variable)
        if (customParam) {
          initialValues[index] = customParam.paramValue
        } else {
          switch(variable.toLowerCase()) {
            case "name":
              initialValues[index] = "[Farmer Name]"
              break
            case "id":
              initialValues[index] = "123"
              break
            case "village":
              initialValues[index] = "[Village]"
              break
            case "number":
              initialValues[index] = "[Mobile]"
              break
            case "plant":
              initialValues[index] = "केळी"
              break
            case "subtype":
              initialValues[index] = "G-916"
              break
            case "total_booked":
              initialValues[index] = "1000"
              break
            case "rate":
              initialValues[index] = "12"
              break
            case "total":
              initialValues[index] = "12000"
              break
            case "advacne":
              initialValues[index] = "5000"
              break
            case "remaiing":
              initialValues[index] = "7000"
              break
            case "delivery":
              initialValues[index] = "25/10/2025"
              break
            default:
              initialValues[index] = ""
          }
        }
      })
      setParameterValues(initialValues)
    }
  }, [template])

  const handleSelectFarmer = (farmer) => {
    if (useListMode) return
    if (isFarmerSelected(farmer._id || farmer.id)) {
      setSelectedFarmers(prev => prev.filter(f => (f._id || f.id) !== (farmer._id || farmer.id)))
    } else {
      setSelectedFarmers(prev => [...prev, farmer])
    }
  }

  const handleAddManualNumber = () => {
    const digits = String(manualNumberInput || "").replace(/\D/g, "")
    const phone = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null
    const allFarmers = [...oldFarmersData, ...oldSalesData, ...publicLeadsData, ...selectedFarmers]
    if (phone) {
      const normalized = String(phone).slice(-10)
      const alreadyExists = allFarmers.some(f => String(f.mobileNumber || "").replace(/\D/g, "").slice(-10) === normalized)
      if (!alreadyExists) {
        const id = `manual-${phone}-${Date.now()}`
        setSelectedFarmers(prev => [...prev, { _id: id, id, name: "", mobileNumber: phone, village: "", taluka: "", district: "", source: "manual" }])
        setManualNumberInput("")
        setError(null)
      }
    } else if (manualNumberInput.trim()) {
      setError("Enter valid 10-digit phone number")
    }
  }

  const handleSelectAll = () => {
    if (useListMode) return
    const currentData = filteredFarmers
    const allSelected = currentData.every(f => isFarmerSelected(f._id || f.id))
    if (allSelected) {
      const idsToRemove = currentData.map(f => f._id || f.id)
      setSelectedFarmers(prev => prev.filter(f => !idsToRemove.includes(f._id || f.id)))
    } else {
      const toAdd = currentData.filter(f => !isFarmerSelected(f._id || f.id))
      setSelectedFarmers(prev => [...prev, ...toAdd])
    }
  }

  const getSelectedFarmersData = () => selectedFarmers

  const formatTemplateContent = (template) => {
    if (!template) return "No template available"
    return template?.bodyOriginal || template?.body || template?.content || template?.message || ""
  }

  const extractVariables = (template) => {
    // Use customParams if available (this has the actual parameter names)
    if (template?.customParams && template.customParams.length > 0) {
      return template.customParams.map(param => param.paramName)
    }
    // Fallback: extract from content
    const content = formatTemplateContent(template)
    if (!content) return []
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map(match => match.replace(/\{\{|\}\}/g, "")) : []
  }

  const templateContent = template ? formatTemplateContent(template) : ""
  const variables = template ? extractVariables(template) : []

  const getLanguageCode = (template) => {
    if (template?.language?.value) return template.language.value
    if (template?.language?.code) return template.language.code
    return "mr"
  }

  const handleParameterChange = (index, value) => {
    setParameterValues(prev => ({
      ...prev,
      [index]: value
    }))
  }

  const resolveParamValue = (variable, index, farmer) => {
    const raw = parameterValues[index] || ""
    const v = String(variable).toLowerCase()
    if (raw === "[Farmer Name]" || v === "name") return farmer.name || ""
    if (raw === "[Village]" || v === "village") return farmer.village || farmer.villageName || ""
    if (raw === "[Mobile]" || v === "number") return String(farmer.mobileNumber || "")
    if (raw === "[Taluka]" || v === "taluka") return farmer.taluka || farmer.talukaName || ""
    if (raw === "[District]" || v === "district") return farmer.district || farmer.districtName || ""
    return raw
  }

  const handleSendCampaign = async () => {
    if (selectedFarmers.length === 0) {
      setError("कृपया किमान एक शेतकरी निवडा (Please select at least one farmer)")
      return
    }

    const missingParams = variables.filter((_, index) => !parameterValues[index]?.trim())
    if (missingParams.length > 0) {
      const proceed = window.confirm(
        `⚠️ ${missingParams.length} parameters are empty:\n${missingParams.join(", ")}\n\nSend to ${selectedFarmers.length} farmers anyway?`
      )
      if (!proceed) return
    }

    setLoading(true)
    setError(null)

    try {
      const selectedFarmersData = getSelectedFarmersData()
      const broadcastName = (campaignName || "").trim() || `Campaign_${Date.now()}`

      // Build contacts with per-farmer customParams for dynamic personalization
      const contacts = selectedFarmersData.map((farmer) => {
        const customParams = variables.map((variable, index) => ({
          name: variable,
          value: resolveParamValue(variable, index, farmer)
        }))
        const phone = String(farmer.mobileNumber || "")
          .replace(/\D/g, "")
          .replace(/^0+/, "")
          .replace(/^(\d{10})$/, "91$1")
        return {
          whatsappMsisdn: phone,
          name: farmer.name || "",
          farmerId: farmer._id || farmer.id,
          leadId: farmer.source === "publicLead" ? farmer._id : null,
          customParams
        }
      })

      const messageData = {
        templateName: template.elementName || template.name || template.templateName,
        broadcastName,
        languageCode: getLanguageCode(template),
        channelNumber: "917276386452",
        contacts
      }

      console.log("[CAMPAIGN] Sending via WATI:", {
        templateName: messageData.templateName,
        contactsCount: contacts.length,
        sampleContact: contacts[0]
      })

      const response = await sendTemplateMessages(messageData)

      if (response.success) {
        // Record WhatsApp history for tracking (best-effort) - only for real Farmer IDs (exclude manual entries)
        const validFarmerIds = selectedFarmersData
          .map((f) => f._id || f.id)
          .filter((id) => id && /^[a-f0-9]{24}$/i.test(String(id)))
        try {
          if (validFarmerIds.length > 0) {
            await NetworkManager(API.FARMER.CREATE_WHATSAPP_HISTORY).request({
              farmerIds: validFarmerIds,
              campaignId: null,
              message: templateContent,
              status: "pending",
              templateName: messageData.templateName,
              broadcastName
            })
          }
        } catch (e) {
          console.warn("[CAMPAIGN] Could not record history:", e?.message)
        }
        alert(`✅ Messages sent to ${contacts.length} farmers via WATI`)
        onSuccess?.()
        onClose()
      } else {
        setError(response.error || "Failed to send messages")
      }
    } catch (error) {
      console.error("[CAMPAIGN] Send error:", error)
      setError(error?.response?.data?.message || error?.message || "Failed to send campaign. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleNewCampaign = () => {
    setSelectedFarmers([])
    setSelectedListIds(initialListId ? [initialListId] : [])
    setUseListMode(!!initialListId)
    setActiveTab(0)
    setSelectedPublicLinkId("")
    setManualNumberInput("")
    setManualAddExpanded(false)
    setCampaignName("")
    setSearchTerm("")
    setFilters({ district: "", taluka: "", village: "" })
    setOldSalesFilters({ plant: "", variety: "", media: "", batch: "", paymentMode: "", reference: "", marketingReference: "", billGivenOrNot: "", verifiedOrNot: "", shadeNo: "", vehicleNo: "", driverName: "" })
    setMoreFiltersExpanded(false)
    setError(null)
    setSelectedTemplate(initialTemplate || approvedTemplates[0] || null)
    fetchFilterOptions(0)
    if (initialListId) {
      loadFarmersFromLists([initialListId])
    } else {
      fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" })
    }
    fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" })
  }

  const getCurrentLoading = () => {
    if (useListMode && activeTab === 0) return loading
    if (activeTab === 0) return loadingOldFarmers
    if (activeTab === 1) return loadingOldSales
    if (activeTab === 2) return loadingPublicLeads
    return false
  }

  if (!open) return null
  if (approvedTemplates.length === 0) {
    return (
      <Dialog
        open
        onClose={onClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: theme.shadowHover,
            overflow: "hidden",
            border: `1px solid ${theme.border}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 50%, ${theme.accent} 100%)`,
            color: "white",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            py: 2,
          }}
        >
          Send Campaign
        </DialogTitle>
        <DialogContent sx={{ py: 4, bgcolor: theme.surfaceSubtle }}>
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              boxShadow: theme.shadow,
              "& .MuiAlert-message": { fontWeight: 500 },
            }}
          >
            No approved templates. Please add and approve templates in the Templates tab first.
          </Alert>
        </DialogContent>
        <DialogActions
          sx={{
            bgcolor: alpha(theme.primary, 0.04),
            borderTop: `1px solid ${theme.border}`,
            py: 2,
          }}
        >
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 3,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: `0 4px 14px ${alpha(theme.primary, 0.4)}`,
              bgcolor: theme.primary,
              "&:hover": { bgcolor: theme.primaryDark, boxShadow: `0 6px 20px ${alpha(theme.primary, 0.5)}` },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    )
  }
  if (!template) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "85vh",
          boxShadow: theme.shadowHover,
          overflow: "hidden",
          border: `1px solid ${theme.border}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          py: 2,
          px: 2.5,
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 50%, ${theme.accent} 100%)`,
          color: "white",
          boxShadow: `0 4px 20px ${alpha("#000", 0.15)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={22} strokeWidth={2.5} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} letterSpacing="-0.02em">
                Send Campaign
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.92, display: "block", lineHeight: 1.3, fontWeight: 500 }}>
                {template?.elementName || "Template"}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<RotateCcw size={16} />}
              onClick={handleNewCampaign}
              disabled={loading}
              sx={{
                borderRadius: 2,
                color: "white",
                borderColor: "rgba(255,255,255,0.6)",
                textTransform: "none",
                fontWeight: 600,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              New Campaign
            </Button>
            <Button
              onClick={onClose}
              size="small"
              sx={{
                minWidth: "auto",
                p: 1,
                color: "white",
                borderRadius: 1.5,
                "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
              }}
            >
              <X size={20} />
            </Button>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, px: 2.5, bgcolor: theme.surfaceSubtle }}>
        {approvedTemplates.length > 1 && (
          <FormControl
            fullWidth
            size="small"
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "white",
                boxShadow: theme.shadow,
                "&:hover": { "& fieldset": { borderColor: theme.primary } },
              },
            }}
          >
            <InputLabel>Select Template</InputLabel>
            <Select
              value={template?.elementName || template?.name || template?.templateName || template?.id || ""}
              label="Select Template"
              onChange={(e) => {
                const val = e.target.value
                const t = approvedTemplates.find(
                  (x) => (x.elementName || x.name || x.templateName || x.id) === val
                )
                setSelectedTemplate(t || null)
              }}
              sx={{ borderRadius: 2 }}
            >
              {approvedTemplates.map((t) => {
                const val = t.elementName || t.name || t.templateName || t.id
                return (
                  <MenuItem key={t.id || val} value={val}>
                    {t.elementName || t.name || t.templateName || "Template"}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        )}
        {error && (
          <Alert
            severity="error"
            icon={<AlertCircle size={18} />}
            sx={{
              mb: 1.5,
              borderRadius: 2,
              py: 0.75,
              boxShadow: "0 2px 12px rgba(239,68,68,0.15)",
              "& .MuiAlert-message": { fontWeight: 500 },
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Campaign Name + Add Manual */}
        <Card
          sx={{
            mb: 1.5,
            borderRadius: 2.5,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            bgcolor: "white",
            transition: "box-shadow 0.2s",
            "&:hover": { boxShadow: theme.shadowHover },
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <TextField
                fullWidth
                label="Campaign Name"
                placeholder="e.g. Summer Sale 2025"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    fontSize: "0.9rem",
                    bgcolor: theme.surfaceSubtle,
                    "&:hover fieldset": { borderColor: theme.primary },
                  },
                }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<Plus size={14} />}
                onClick={() => setManualAddExpanded(!manualAddExpanded)}
                sx={{
                  minWidth: "auto",
                  px: 2,
                  borderRadius: 2,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderColor: theme.primary,
                  color: theme.primaryDark,
                  "&:hover": {
                    borderColor: theme.primaryDark,
                    bgcolor: alpha(theme.primary, 0.08),
                  },
                }}
              >
                Add number
              </Button>
            </Stack>
            <Collapse in={manualAddExpanded}>
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}
              >
                <TextField
                  placeholder="10-digit phone"
                  value={manualNumberInput}
                  onChange={(e) => setManualNumberInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  size="small"
                  inputProps={{ maxLength: 12 }}
                  sx={{
                    width: 160,
                    "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.85rem" },
                  }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAddManualNumber}
                  sx={{
                    borderRadius: 2,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textTransform: "none",
                    boxShadow: `0 2px 8px ${alpha(theme.primary, 0.35)}`,
                    bgcolor: theme.primary,
                    "&:hover": {
                      bgcolor: theme.primaryDark,
                      boxShadow: `0 4px 12px ${alpha(theme.primary, 0.45)}`,
                    },
                  }}
                >
                  Add more
                </Button>
              </Stack>
            </Collapse>
          </CardContent>
        </Card>

        {/* Data Source Tabs */}
        <Card
          sx={{
            mb: 1.5,
            borderRadius: 2.5,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            bgcolor: "white",
            overflow: "hidden",
          }}
        >
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
                  if (useListMode && selectedListIds.length > 0) {
                    loadFarmersFromLists(selectedListIds)
                  } else {
                    fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" })
                  }
                } else if (newValue === 1) {
                  setOldSalesPage(1)
                  fetchOldSalesData({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" })
                } else if (newValue === 2) {
                  setPublicLeadsPage(1)
                  setPublicLeadsData([])
                }
              }}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                px: 1,
                minHeight: 44,
                "& .MuiTab-root": {
                  textTransform: "none",
                  minHeight: 44,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                },
                "& .Mui-selected": { color: theme.primaryDark },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  bgcolor: theme.primary,
                },
              }}
            >
              <Tab icon={<Database size={16} />} iconPosition="start" label={`Farmers (${oldFarmersPagination.total || oldFarmersData.length})`} />
              <Tab icon={<FileText size={16} />} iconPosition="start" label={`Sales (${oldSalesPagination.total || oldSalesData.length})`} />
              <Tab icon={<LinkIcon size={16} />} iconPosition="start" label={`Leads (${publicLeadsPagination.total || publicLeadsData.length})`} />
            </Tabs>
            {activeTab === 2 && (
              <Box sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Public Link</InputLabel>
                  <Select
                    value={selectedPublicLinkId || "all"}
                    onChange={(e) => setSelectedPublicLinkId(e.target.value === "all" ? "" : e.target.value)}
                    label="Public Link"
                    disabled={loadingPublicLinks}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="all"><em>All links</em></MenuItem>
                    {publicLinks.map((link) => (
                      <MenuItem key={link._id} value={link._id}>
                        {link.name} ({(link.leadCount ?? link.leads?.length ?? 0)} · {link.slug})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* List Selection - Only show for Old Farmers tab when we have farmer and/or contact lists */}
        {activeTab === 0 && (farmerLists.length > 0 || excelContactLists.length > 0) && (
          <Card
            sx={{
              mb: 1.5,
              borderRadius: 2.5,
              boxShadow: theme.shadow,
              border: `1px solid ${alpha("#2563eb", 0.2)}`,
              bgcolor: alpha("#2563eb", 0.02),
            }}
          >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#2563eb" }}>
                  📋 Select from Saved Lists
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 300 }}>
                  <InputLabel>Choose Lists (multi-select)</InputLabel>
              <Select
                multiple
                value={selectedListIds}
                onChange={(e) => {
                  const v = e.target.value
                  setSelectedListIds(v)
                  setUseListMode(v && v.length > 0)
                }}
                label="Choose Lists"
                renderValue={(v) => `${v.length} selected`}
                sx={{ borderRadius: 2 }}>
                {([
                  ...(farmerLists || []).map((list) => ({ ...list, __type: "farmer" })),
                  ...(excelContactLists || []).map((list) => ({ ...list, __type: "contact" }))
                ]).map((list) => (
                  <MenuItem key={list._id} value={list._id}>
                    <Checkbox checked={selectedListIds.indexOf(list._id) > -1} />
                    <ListItemText primary={`${list.name} (${(list.farmers?.length || list.contacts?.length) || 0})`} secondary={list.__type === "farmer" ? "Farmer list" : "Contact list"} />
                  </MenuItem>
                ))}
              </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowExcelModal(true)}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: "none",
                    borderColor: "#2563eb",
                    color: "#2563eb",
                    "&:hover": { borderColor: "#1d4ed8", bgcolor: alpha("#2563eb", 0.06) },
                  }}
                >
                  Upload Excel
                </Button>
                {selectedListIds.length > 0 && (
                  <Chip
                    label={`Using ${selectedListIds.length} list(s)`}
                    color="info"
                    onDelete={() => {
                      setSelectedListIds([])
                      setUseListMode(false)
                      fetchOldFarmers({ page: 1, limit: PAGE_LIMIT }, "", { district: "", taluka: "", village: "" })
                    }}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Template Preview */}
        <Card
          sx={{
            mb: 1.5,
            borderRadius: 2.5,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            bgcolor: "white",
          }}
        >
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  bgcolor: alpha("#6366f1", 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MessageSquare size={18} color="#6366f1" />
              </Box>
              <Typography variant="subtitle2" fontWeight={700} color="primary">
                Message Preview
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: "13px",
                lineHeight: 1.7,
                color: "text.secondary",
                bgcolor: theme.surfaceSubtle,
                p: 1.5,
                borderRadius: 2,
              }}
            >
              {templateContent}
            </Typography>
          </CardContent>
        </Card>

        {/* Template Parameters */}
        {variables.length > 0 && (
          <Card
            sx={{
              mb: 1.5,
              borderRadius: 2.5,
              boxShadow: theme.shadow,
              border: `1px solid ${theme.border}`,
              bgcolor: "white",
            }}
          >
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Template Parameters ({variables.length})
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setParameterValues({})}
                  disabled={loading}
                >
                  Clear All
                </Button>
              </Stack>
              <Grid container spacing={1.5}>
                {variables.map((variable, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <TextField
                      fullWidth
                      label={`${variable}`}
                      placeholder={`Enter ${variable}`}
                      value={parameterValues[index] || ""}
                      onChange={(e) => handleParameterChange(index, e.target.value)}
                      disabled={loading}
                      size="small"
                      helperText={`Parameter ${index + 1} of ${variables.length}`}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters - Hide when using list mode */}
        {!useListMode && (
          <Box
            sx={{
              mb: 1.5,
              p: 1.5,
              border: `1px solid ${theme.border}`,
              borderRadius: 2.5,
              bgcolor: "white",
              boxShadow: theme.shadow,
            }}
          >

            <Grid container spacing={1} alignItems="center">
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
                        <Search size={20} color={theme.primary} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: theme.surfaceSubtle,
                      "&:hover fieldset": { borderColor: theme.primary },
                    },
                  }}
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
                    {(filterOptions.districts || []).map(d => (
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
                    {(filterOptions.talukas || []).map(t => (
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
                    {(filterOptions.villages || []).map(v => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md="auto">
                <Button size="small" variant="outlined" onClick={handleClearFilters} disabled={!hasActiveFilters || loadingFilterOptions} sx={{ borderRadius: 2 }}>
                  Clear filters
                </Button>
              </Grid>
              {activeTab === 1 && (
                <Grid item xs={12}>
                  <Button size="small" startIcon={moreFiltersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} onClick={() => setMoreFiltersExpanded(!moreFiltersExpanded)} sx={{ textTransform: 'none' }}>
                    {moreFiltersExpanded ? "Hide more filters" : "More filters (plant, variety, media, batch…)"}
                  </Button>
                </Grid>
              )}
            </Grid>
            {activeTab === 1 && moreFiltersExpanded && (
              <Collapse in={moreFiltersExpanded}>
                <Grid container spacing={1.5} sx={{ mt: 1, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
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
                        <Select value={oldSalesFilters[key] || ""} onChange={(e) => handleOldSalesFilterChange(key, e.target.value)} label={label} sx={{ borderRadius: 2 }} disabled={loadingFilterOptions}>
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
        )}

        {/* Pagination */}
        {!useListMode && (
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
            {activeTab === 0 && (
              <>
                <Typography variant="caption" color="text.secondary">{oldFarmersPagination.total || 0} · {oldFarmersPage}/{oldFarmersPagination.totalPages || 1}</Typography>
                <Pagination count={Math.max(1, oldFarmersPagination.totalPages || 1)} page={oldFarmersPage} onChange={handleFarmersPageChange} color="primary" size="small" showFirstButton showLastButton disabled={loadingOldFarmers} />
              </>
            )}
            {activeTab === 1 && (
              <>
                <Typography variant="caption" color="text.secondary">{oldSalesPagination.total || 0} · {oldSalesPage}/{oldSalesPagination.totalPages || 1}</Typography>
                <Pagination count={Math.max(1, oldSalesPagination.totalPages || 1)} page={oldSalesPage} onChange={handleOldSalesPageChange} color="primary" size="small" showFirstButton showLastButton disabled={loadingOldSales} />
              </>
            )}
            {activeTab === 2 && (
              <>
                <Typography variant="caption" color="text.secondary">{publicLeadsPagination.total || 0} · {publicLeadsPage}/{publicLeadsPagination.totalPages || 1}</Typography>
                <Pagination count={Math.max(1, publicLeadsPagination.totalPages || 1)} page={publicLeadsPage} onChange={handlePublicLeadsPageChange} color="primary" size="small" showFirstButton showLastButton disabled={loadingPublicLeads} />
              </>
            )}
          </Box>
        )}

        {/* Farmers List */}
        <Card
          sx={{
            borderRadius: 2.5,
            boxShadow: theme.shadow,
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
            bgcolor: "white",
          }}
        >
          <TableContainer sx={{ maxHeight: 260, minHeight: 140 }}>
            {getCurrentLoading() ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 4,
                  gap: 1.5,
                }}
              >
                <CircularProgress size={44} sx={{ color: theme.primary }} />
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Loading...
                </Typography>
              </Box>
            ) : (
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      "& th": {
                        py: 1,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        bgcolor: theme.surfaceSubtle,
                        color: "text.secondary",
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      {!useListMode && (
                        <Checkbox
                          checked={filteredFarmers.length > 0 && filteredFarmers.every(f => isFarmerSelected(f._id || f.id))}
                          indeterminate={selectedFarmers.some(s => filteredFarmers.some(f => (f._id || f.id) === (s._id || s.id))) && !filteredFarmers.every(f => isFarmerSelected(f._id || f.id))}
                          onChange={handleSelectAll}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Mobile</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Village</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Taluka</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>District</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredFarmers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          {useListMode
                            ? "No farmers in selected list"
                            : activeTab === 2 && !selectedPublicLinkId && publicLinks.length > 0
                            ? "Select 'All links' or a specific link to view leads"
                            : "No farmers found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFarmers.map((farmer, idx) => (
                      <TableRow
                        key={farmer._id || farmer.id}
                        hover
                        sx={{
                          "& td": { py: 0.75, fontSize: "0.8rem" },
                          bgcolor: idx % 2 === 0 ? "transparent" : alpha(theme.primary, 0.02),
                          "&:hover": { bgcolor: alpha(theme.primary, 0.06) },
                        }}
                      >
                        <TableCell padding="checkbox">
                          {!useListMode && (
                            <Checkbox
                              checked={isFarmerSelected(farmer._id || farmer.id)}
                              onChange={() => handleSelectFarmer(farmer)}
                            />
                          )}
                          {useListMode && (
                            <CheckCircle size={16} style={{ color: '#10b981', marginLeft: '8px' }} />
                          )}
                        </TableCell>
                        <TableCell>{farmer.name}</TableCell>
                        <TableCell>{farmer.mobileNumber}</TableCell>
                        <TableCell>{farmer.village || farmer.villageName}</TableCell>
                        <TableCell>{farmer.taluka || farmer.talukaName}</TableCell>
                        <TableCell>{farmer.district || farmer.districtName}</TableCell>
                        <TableCell>
                          <Chip
                            label={farmer.source === "publicLead" ? "Lead" : farmer.source === "manual" ? "Manual" : farmer.source === "oldSales" ? "Sales" : "Farmer"}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              borderRadius: 1.5,
                            }}
                            color={farmer.source === "publicLead" ? "primary" : farmer.source === "manual" ? "secondary" : farmer.source === "contact" ? "secondary" : "default"}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Card>

        {/* Manually added numbers - show below list with Manual tag */}
        {selectedFarmers.filter((f) => f.source === "manual").length > 0 && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              border: `1px solid ${theme.border}`,
              borderRadius: 2.5,
              bgcolor: alpha(theme.primary, 0.04),
              boxShadow: theme.shadow,
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ mb: 1, color: theme.primaryDark }}>
              Manually added numbers ({selectedFarmers.filter((f) => f.source === "manual").length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selectedFarmers.filter(f => f.source === "manual").map((farmer) => (
                <Chip
                  key={farmer._id || farmer.id}
                  label={
                    <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                      <span style={{ fontFamily: 'monospace' }}>{farmer.mobileNumber || ""}</span>
                      <Typography component="span" variant="caption" sx={{ color: '#128C7E', fontWeight: 600, ml: 0.5 }}>
                        Manual
                      </Typography>
                    </Stack>
                  }
                  onDelete={() => setSelectedFarmers((prev) => prev.filter((s) => (s._id || s.id) !== (farmer._id || farmer.id)))}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    borderRadius: 1.5,
                    borderColor: theme.primary,
                    color: theme.primaryDark,
                  }}
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {selectedFarmers.length > 0 && (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.primary, 0.06),
              border: `1px solid ${theme.border}`,
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Chip
                icon={<CheckCircle size={16} />}
                label={`${selectedFarmers.length} farmers selected`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              {activeTab === 0 && (
                <Chip label="Source: Old Farmers" size="small" color="default" variant="outlined" />
              )}
              {activeTab === 1 && (
                <Chip label="Source: Old Sales" size="small" color="default" variant="outlined" />
              )}
              {activeTab === 2 && (
                <Chip label={`Source: ${selectedPublicLinkId ? (publicLinks.find(l => l._id === selectedPublicLinkId)?.name || 'Public Link') : 'All Public Leads'}`} size="small" color="primary" variant="outlined" />
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: alpha(theme.primary, 0.04),
          borderTop: `1px solid ${theme.border}`,
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            textTransform: "none",
            borderColor: theme.border,
            "&:hover": { borderColor: theme.primaryDark, bgcolor: alpha(theme.primary, 0.06) },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
          onClick={handleSendCampaign}
          disabled={loading || selectedFarmers.length === 0}
          sx={{
            borderRadius: 2,
            px: 3,
            fontWeight: 600,
            textTransform: "none",
            boxShadow: `0 4px 14px ${alpha(theme.primary, 0.4)}`,
            bgcolor: theme.primary,
            "&:hover": {
              bgcolor: theme.primaryDark,
              boxShadow: `0 6px 20px ${alpha(theme.primary, 0.5)}`,
              transform: "translateY(-1px)",
            },
            "&:disabled": { bgcolor: alpha(theme.primary, 0.5) },
          }}
        >
          {loading ? "Sending..." : `Send to ${selectedFarmers.length} Farmers`}
        </Button>
      </DialogActions>
      <ExcelSendModal
        open={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        templates={[]}
        onListCreated={(id) => {
          // after saving list, extract farmers from it and add to selection
          if (id) {
            const newIds = [...selectedListIds, id]
            setSelectedListIds(newIds)
            setUseListMode(true)
            loadFarmersFromLists(newIds)
          }
          setShowExcelModal(false)
        }}
      />
    </Dialog>
  )
}

export default FarmerCampaignModal
