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
  Paper
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
  UserMinus
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
  
  // List name
  const [listName, setListName] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Public links state
  const [publicLinks, setPublicLinks] = useState([])
  const [selectedPublicLinkId, setSelectedPublicLinkId] = useState("")
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false)
  // Manual number entry (3 fields)
  const [manualNumbers, setManualNumbers] = useState(["", "", ""])
  // Pagination state for farmers / old sales
  const [oldFarmersPage, setOldFarmersPage] = useState(1)
  const [oldFarmersHasMore, setOldFarmersHasMore] = useState(true)
  const [oldSalesPage, setOldSalesPage] = useState(1)
  const [oldSalesHasMore, setOldSalesHasMore] = useState(true)
  const searchDebounceRef = useRef(null)

  useEffect(() => {
    if (open) {
      resetForm()
      fetchPublicLinks()
      // Load first page for tabs when modal opens
      fetchOldFarmers({ page: 1 }, "")
      fetchOldSalesData({ page: 1 }, "")
    }
  }, [open])

  const resetForm = () => {
    setOldFarmersData([])
    setOldSalesData([])
    setPublicLeadsData([])
    setSelectedFarmers([])
    setSearchTerm("")
    setFilters({ district: "", taluka: "", village: "" })
    setListName("")
    setSelectedPublicLinkId("")
    setManualNumbers(["", "", ""])
    setActiveTab(0)
    setError(null)
    setOldFarmersPage(1)
    setOldFarmersHasMore(true)
    setOldSalesPage(1)
    setOldSalesHasMore(true)
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

  // Fetch old farmers (search triggers API call)
  const fetchOldFarmers = async ({ page = 1, limit = 100 } = {}, search = "") => {
    setLoadingOldFarmers(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMERS)
      const params = { page, limit }
      if (search && search.trim()) params.q = search.trim()
      const response = await instance.request({}, params)

      let farmersData = []
      if (response.data?.data) {
        farmersData = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data.farmers || []
      }

      const normalizedFarmers = farmersData.map(farmer => ({
        ...farmer,
        _id: farmer._id || farmer.id,
        id: farmer._id || farmer.id,
        opt_in: farmer.opt_in ?? null,
        source: "oldFarmer",
        sourceLabel: "Old Farmer"
      }))

      setOldFarmersData(prev => (page === 1 ? normalizedFarmers : [...prev, ...normalizedFarmers]))
      setOldFarmersPage(page)
      setOldFarmersHasMore(farmersData.length === limit)
    } catch (error) {
      console.error("Error fetching old farmers:", error)
      setError("Failed to fetch old farmers")
    } finally {
      setLoadingOldFarmers(false)
    }
  }

  // Fetch old sales data (unique farmers/customers from old sales, search triggers API call)
  const fetchOldSalesData = async ({ page = 1, limit = 200 } = {}, search = "") => {
    setLoadingOldSales(true)
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_UNIQUE_CUSTOMERS)
      const params = { page, limit }
      if (search && search.trim()) params.q = search.trim()
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

      setOldSalesData(prev => (page === 1 ? normalizedFarmers : [...prev, ...normalizedFarmers]))
      setOldSalesPage(page)
      setOldSalesHasMore(customers.length === limit)
    } catch (error) {
      console.error("Error fetching old sales data:", error)
      setError("Failed to fetch old sales data")
    } finally {
      setLoadingOldSales(false)
    }
  }

  // -- bulk opt-in is expected from backend in the customers/farmers payload.
  // Removed per-phone lookup; frontend now relies on `opt_in` present on returned records.

  const handleLoadMoreOldFarmers = () => {
    if (loadingOldFarmers || !oldFarmersHasMore) return
    fetchOldFarmers({ page: oldFarmersPage + 1 }, searchTerm)
  }

  const handleLoadMoreOldSales = () => {
    if (loadingOldSales || !oldSalesHasMore) return
    fetchOldSalesData({ page: oldSalesPage + 1 }, searchTerm)
  }

  // Fetch public link leads (single link or all links, search triggers API call)
  const fetchPublicLeads = async (linkId, search = "") => {
    setLoadingPublicLeads(true)
    setError(null)
    try {
      let leads = []
      const queryParams = search && search.trim() ? { q: search.trim() } : {}
      if (linkId && linkId !== "all") {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
        const response = await instance.request(null, { pathParams: [linkId], ...queryParams })
        leads = response?.data?.data?.leads || []
      } else {
        const instance = NetworkManager(API.PUBLIC_LINKS.GET_ALL_LEADS)
        const response = await instance.request(null, queryParams)
        leads = response?.data?.data?.leads || []
      }

      const normalizedLeads = leads.map(lead => ({
        _id: lead._id,
        id: lead._id,
        name: lead.name,
        mobileNumber: lead.mobileNumber,
        village: lead.villageName || "",
        taluka: lead.talukaName || "",
        district: lead.districtName || "",
        state: lead.stateName || "",
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
      fetchPublicLeads(selectedPublicLinkId || "all", searchTerm)
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
      setOldFarmersHasMore(true)
      setOldSalesHasMore(true)
      if (activeTab === 0) {
        setOldFarmersData([])
        fetchOldFarmers({ page: 1 }, searchTerm)
      } else if (activeTab === 1) {
        setOldSalesData([])
        fetchOldSalesData({ page: 1 }, searchTerm)
      } else if (activeTab === 2) {
        fetchPublicLeads(selectedPublicLinkId || "all", searchTerm)
      }
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchTerm, activeTab, open])

  // Get current source data based on active tab
  const getCurrentSourceData = () => {
    if (activeTab === 0) return oldFarmersData
    if (activeTab === 1) return oldSalesData
    if (activeTab === 2) return publicLeadsData
    return []
  }

  // Filter farmers data (search is server-side; district/taluka/village remain client-side)
  const getFilteredFarmers = (data) => {
    return data.filter(farmer => {
      const matchesDistrict = !filters.district || (farmer.district || "") === filters.district
      const matchesTaluka = !filters.taluka || (farmer.taluka || "") === filters.taluka
      const matchesVillage = !filters.village || (farmer.village || "") === filters.village
      return matchesDistrict && matchesTaluka && matchesVillage
    })
  }

  const filteredFarmers = getFilteredFarmers(getCurrentSourceData())

  // Get unique values for filters from all sources combined
  const getAllFarmers = () => {
    return [...oldFarmersData, ...oldSalesData, ...publicLeadsData]
  }

  const getUniqueValues = (key) => {
    return [...new Set(getAllFarmers().map(farmer => farmer[key]).filter(Boolean))]
  }

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
                if (newValue === 2) {
                  fetchPublicLeads(selectedPublicLinkId || "all", "")
                }
              }}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab 
                icon={<Database size={16} />} 
                iconPosition="start"
                label={`Old Farmers (${oldFarmersData.length})`}
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<FileText size={16} />} 
                iconPosition="start"
                label={`Old Sales (${oldSalesData.length})`}
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<LinkIcon size={16} />} 
                iconPosition="start"
                label={`Public Leads (${publicLeadsData.length})`}
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

            {/* Search and Filters */}
            {(activeTab !== 2 || true) && (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Grid container spacing={2}>
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
                        onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                        label="District"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">All Districts</MenuItem>
                        {getUniqueValues("district").map(district => (
                          <MenuItem key={district} value={district}>{district}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Taluka</InputLabel>
                      <Select
                        value={filters.taluka}
                        onChange={(e) => setFilters(prev => ({ ...prev, taluka: e.target.value }))}
                        label="Taluka"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">All Talukas</MenuItem>
                        {getUniqueValues("taluka").map(taluka => (
                          <MenuItem key={taluka} value={taluka}>{taluka}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Village</InputLabel>
                      <Select
                        value={filters.village}
                        onChange={(e) => setFilters(prev => ({ ...prev, village: e.target.value }))}
                        label="Village"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">All Villages</MenuItem>
                        {getUniqueValues("village").map(village => (
                          <MenuItem key={village} value={village}>{village}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Farmers List */}
            <TableContainer sx={{ maxHeight: 350 }}>
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
            {/* Load more for paginated sources */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              {activeTab === 0 && oldFarmersHasMore && (
                <Button size="small" onClick={handleLoadMoreOldFarmers} disabled={loadingOldFarmers}>
                  {loadingOldFarmers ? "Loading..." : "Load more"}
                </Button>
              )}
              {activeTab === 1 && oldSalesHasMore && (
                <Button size="small" onClick={handleLoadMoreOldSales} disabled={loadingOldSales}>
                  {loadingOldSales ? "Loading..." : "Load more"}
                </Button>
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
