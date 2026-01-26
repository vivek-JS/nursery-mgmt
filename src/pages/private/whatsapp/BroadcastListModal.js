import React, { useState, useEffect } from "react"
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

  useEffect(() => {
    if (open) {
      resetForm()
      fetchPublicLinks()
      // Load all sources when modal opens
      fetchOldFarmers()
      fetchOldSalesData()
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
    setActiveTab(0)
    setError(null)
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

  // Fetch old farmers
  const fetchOldFarmers = async () => {
    setLoadingOldFarmers(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMERS)
      const response = await instance.request()
      
      if (response.data?.data) {
        const farmersData = Array.isArray(response.data.data) 
          ? response.data.data 
          : response.data.data.farmers || []
        
        const normalizedFarmers = farmersData.map(farmer => ({
          ...farmer,
          _id: farmer._id || farmer.id,
          id: farmer._id || farmer.id,
          source: "oldFarmer",
          sourceLabel: "Old Farmer"
        }))
        
        setOldFarmersData(normalizedFarmers)
      }
    } catch (error) {
      console.error("Error fetching old farmers:", error)
      setError("Failed to fetch old farmers")
    } finally {
      setLoadingOldFarmers(false)
    }
  }

  // Fetch old sales data
  const fetchOldSalesData = async () => {
    setLoadingOldSales(true)
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_GEO_SUMMARY)
      const queryParams = {
        limit: 1000,
        sortBy: "totalInvoiceAmount",
        sortOrder: "desc"
      }
      const response = await instance.request({}, queryParams)
      
      if (response.data?.data) {
        const salesData = Array.isArray(response.data.data) 
          ? response.data.data 
          : response.data.data.summary || []
        
        const normalizedFarmers = salesData.map((item, index) => {
          const farmer = item.farmer || item
          return {
            _id: farmer._id || `old-sales-${index}`,
            id: farmer._id || `old-sales-${index}`,
            name: farmer.name || "",
            mobileNumber: farmer.mobileNumber || "",
            village: farmer.village || farmer.villageName || "",
            taluka: farmer.taluka || farmer.talukaName || "",
            district: farmer.district || farmer.districtName || "",
            state: farmer.state || farmer.stateName || "",
            source: "oldSales",
            sourceLabel: "Old Sales",
            originalData: item
          }
        }).filter(f => f.name && f.mobileNumber)
        
        setOldSalesData(normalizedFarmers)
      }
    } catch (error) {
      console.error("Error fetching old sales data:", error)
      setError("Failed to fetch old sales data")
    } finally {
      setLoadingOldSales(false)
    }
  }

  // Fetch public link leads
  const fetchPublicLeads = async (linkId) => {
    if (!linkId) {
      setPublicLeadsData([])
      return
    }

    setLoadingPublicLeads(true)
    try {
      const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
      const response = await instance.request(null, [linkId])
      const leads = response?.data?.data?.leads || []
      
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
        sourceLabel: "Public Lead",
        originalLead: lead
      }))
      
      setPublicLeadsData(normalizedLeads)
    } catch (error) {
      console.error("Error fetching public leads:", error)
      setError("Failed to fetch public link leads")
    } finally {
      setLoadingPublicLeads(false)
    }
  }

  // Handle public link selection change
  useEffect(() => {
    if (activeTab === 2 && selectedPublicLinkId) {
      fetchPublicLeads(selectedPublicLinkId)
    }
  }, [selectedPublicLinkId, activeTab])

  // Get current source data based on active tab
  const getCurrentSourceData = () => {
    if (activeTab === 0) return oldFarmersData
    if (activeTab === 1) return oldSalesData
    if (activeTab === 2) return publicLeadsData
    return []
  }

  // Filter farmers data
  const getFilteredFarmers = (data) => {
    return data.filter(farmer => {
      const name = (farmer.name || "").toLowerCase()
      const mobile = (farmer.mobileNumber || "").toString()
      const village = (farmer.village || "").toLowerCase()
      
      const matchesSearch = !searchTerm || 
                           name.includes(searchTerm.toLowerCase()) ||
                           mobile.includes(searchTerm) ||
                           village.includes(searchTerm.toLowerCase())
      
      const matchesDistrict = !filters.district || (farmer.district || "") === filters.district
      const matchesTaluka = !filters.taluka || (farmer.taluka || "") === filters.taluka
      const matchesVillage = !filters.village || (farmer.village || "") === filters.village
      
      return matchesSearch && matchesDistrict && matchesTaluka && matchesVillage
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

    try {
      // Extract farmer IDs (use _id or id field)
      const farmerIds = selectedFarmers.map(f => f._id || f.id).filter(Boolean)

      const instance = NetworkManager(API.FARMER_LIST.CREATE_LIST)
      await instance.request({
        name: listName.trim(),
        farmerIds: farmerIds
      })

      alert(`✅ Broadcast list "${listName}" created successfully with ${farmerIds.length} farmers!`)
      
      if (onListCreated) {
        onListCreated()
      }
      
      onClose()
    } catch (error) {
      console.error("Error creating broadcast list:", error)
      setError(error.response?.data?.message || "Failed to create broadcast list")
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
                    label={`${farmer.name} (${farmer.mobileNumber})`}
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
                if (newValue === 2 && selectedPublicLinkId) {
                  fetchPublicLeads(selectedPublicLinkId)
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
                  <InputLabel>Select Public Link</InputLabel>
                  <Select
                    value={selectedPublicLinkId}
                    onChange={(e) => setSelectedPublicLinkId(e.target.value)}
                    label="Select Public Link"
                    disabled={loadingPublicLinks}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">
                      <em>Select a Public Link</em>
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
            {(activeTab !== 2 || selectedPublicLinkId) && (
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
                      <TableCell sx={{ fontWeight: 'bold' }}>Village</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Taluka</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>District</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFarmers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {activeTab === 2 && !selectedPublicLinkId
                              ? "Please select a public link to view leads"
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
