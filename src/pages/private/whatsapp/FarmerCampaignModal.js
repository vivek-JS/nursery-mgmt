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
  ToggleButton,
  ToggleButtonGroup
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
  Link as LinkIcon
} from "lucide-react"
import { sendTemplateMessages } from "network/core/wati"
import { API, NetworkManager } from "network/core"
import ExcelSendModal from "pages/private/whatsapp/ExcelSendModal"

const FarmerCampaignModal = ({ open, onClose, template, farmerLists = [], onListUpdate, initialListId }) => {
  if (!template) return null

  const [farmers, setFarmers] = useState([])
  const [filteredFarmers, setFilteredFarmers] = useState([])
  const [selectedFarmers, setSelectedFarmers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    district: "",
    taluka: "",
    village: ""
  })
  const [parameterValues, setParameterValues] = useState({})
  const [selectedListId, setSelectedListId] = useState("")
  const [useListMode, setUseListMode] = useState(false)
  const [selectedListIds, setSelectedListIds] = useState([])
  const [showExcelModal, setShowExcelModal] = useState(false)
  
  // New state for data source selection
  const [dataSource, setDataSource] = useState("oldFarmers") // "oldFarmers" or "publicLeads"
  const [publicLinks, setPublicLinks] = useState([])
  const [selectedPublicLinkId, setSelectedPublicLinkId] = useState("")
  const [publicLeads, setPublicLeads] = useState([])
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false)
  const [loadingPublicLeads, setLoadingPublicLeads] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedListIds(initialListId ? [initialListId] : [])
      setUseListMode(!!initialListId)
      setSelectedFarmers([])
      setDataSource("oldFarmers")
      setSelectedPublicLinkId("")
      setPublicLeads([])
      setSearchTerm("")
      setFilters({ district: "", taluka: "", village: "" })
      fetchPublicLinks()
      fetchFarmers()
    }
  }, [open, initialListId])

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

  // Fetch leads for selected public link
  const fetchPublicLeads = async (linkId) => {
    if (!linkId) {
      setPublicLeads([])
      setFarmers([])
      setFilteredFarmers([])
      return
    }

    setLoadingPublicLeads(true)
    try {
      const instance = NetworkManager(API.PUBLIC_LINKS.GET_LEADS)
      const response = await instance.request(null, [linkId])
      const leads = response?.data?.data?.leads || []
      
      // Normalize lead data to match farmer structure
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
        originalLead: lead
      }))
      
      setPublicLeads(normalizedLeads)
      setFarmers(normalizedLeads)
      setFilteredFarmers(normalizedLeads)
    } catch (error) {
      console.error("Error fetching public leads:", error)
      setError("Failed to fetch public link leads")
    } finally {
      setLoadingPublicLeads(false)
    }
  }

  // Handle data source change
  useEffect(() => {
    if (!open) return
    
    if (dataSource === "oldFarmers") {
      fetchFarmers()
      setSelectedPublicLinkId("")
      setPublicLeads([])
      setSelectedListId("")
      setUseListMode(false)
    } else if (dataSource === "publicLeads") {
      setFarmers([])
      setFilteredFarmers([])
      setSelectedFarmers([])
      setSelectedListId("")
      setUseListMode(false)
      if (selectedPublicLinkId) {
        fetchPublicLeads(selectedPublicLinkId)
      }
    }
  }, [dataSource, open])

  // Handle public link selection change
  useEffect(() => {
    if (dataSource === "publicLeads" && selectedPublicLinkId) {
      fetchPublicLeads(selectedPublicLinkId)
    }
  }, [selectedPublicLinkId])

  useEffect(() => {
    if (useListMode && selectedListIds && selectedListIds.length > 0) {
      loadFarmersFromLists(selectedListIds)
    }
  }, [selectedListId, useListMode])

  const loadFarmersFromList = async (listId) => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.FARMER_LIST.GET_LIST_BY_ID)
      const endpoint = {
        ...API.FARMER_LIST.GET_LIST_BY_ID,
        endpoint: `farmer-list/${listId}`
      }
      const listInstance = NetworkManager(endpoint)
      const response = await listInstance.request()
      
      if (response.data?.data?.farmers) {
        const listFarmers = response.data.data.farmers
        setFarmers(listFarmers)
        setFilteredFarmers(listFarmers)
        // Auto-select all farmers from the list
        setSelectedFarmers(listFarmers.map((f) => f._id || f.id))
      }
    } catch (error) {
      console.error("Error loading farmers from list:", error)
      setError("Failed to load farmers from list")
    } finally {
      setLoading(false)
    }
  }

  const loadFarmersFromLists = async (listIds = []) => {
    setLoading(true)
    try {
      const allFarmers = []
      for (const listId of listIds) {
        try {
          const endpoint = {
            ...API.FARMER_LIST.GET_LIST_BY_ID,
            endpoint: `farmer-list/${listId}`
          }
          const listInstance = NetworkManager(endpoint)
          const response = await listInstance.request()
          const listFarmers = response.data?.data?.farmers || []
          allFarmers.push(...listFarmers)
        } catch (e) {
          console.error("Failed to load list", listId, e)
        }
      }
      // Deduplicate by mobileNumber (normalized) or id
      const seen = new Set()
      const unique = []
      for (const f of allFarmers) {
        const key = (f.mobileNumber || f._id || "").toString()
        if (!seen.has(key)) {
          seen.add(key)
          unique.push(f)
        }
      }
      setFarmers(unique)
      setFilteredFarmers(unique)
      setSelectedFarmers(unique.map((f) => f._id || f.id))
    } catch (error) {
      console.error("Error loading farmers from lists:", error)
      setError("Failed to load farmers from lists")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    filterFarmers()
  }, [farmers, searchTerm, filters])

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

  const fetchFarmers = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMERS)
      const response = await instance.request()
      
      if (response.data?.data) {
        const farmersData = Array.isArray(response.data.data) 
          ? response.data.data 
          : response.data.data.farmers || []
        
        // Normalize farmer data
        const normalizedFarmers = farmersData.map(farmer => ({
          ...farmer,
          _id: farmer._id || farmer.id,
          id: farmer._id || farmer.id,
          source: "oldFarmer"
        }))
        
        setFarmers(normalizedFarmers)
        console.log(`✅ Loaded ${normalizedFarmers.length} old farmers`)
      } else {
        setFarmers([])
      }
    } catch (error) {
      console.error("Error fetching farmers:", error)
      setError("Failed to fetch farmers. Please try again.")
      setFarmers([])
    } finally {
      setLoading(false)
    }
  }

  const filterFarmers = () => {
    let filtered = farmers.filter(farmer => {
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
    
    setFilteredFarmers(filtered)
  }

  const handleSelectFarmer = (farmerId) => {
    if (useListMode) return // Don't allow individual selection in list mode
    setSelectedFarmers(prev => 
      prev.includes(farmerId) 
        ? prev.filter(id => id !== farmerId)
        : [...prev, farmerId]
    )
  }

  const handleSelectAll = () => {
    if (useListMode) return // Don't allow select all in list mode
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([])
    } else {
      setSelectedFarmers(filteredFarmers.map(farmer => farmer._id || farmer.id))
    }
  }

  const getSelectedFarmersData = () => {
    return farmers.filter(farmer => selectedFarmers.includes(farmer._id || farmer.id))
  }

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

  const templateContent = formatTemplateContent(template)
  const variables = extractVariables(template)

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

  const handleSendCampaign = async () => {
    if (selectedFarmers.length === 0) {
      setError("कृपया किमान एक शेतकरी निवडा (Please select at least one farmer)")
      return
    }

    // Warning for empty params but don't block sending
    const missingParams = variables.filter((_, index) => !parameterValues[index]?.trim())
    if (missingParams.length > 0) {
      const proceed = window.confirm(
        `⚠️ ${missingParams.length} parameters are empty:\n${missingParams.join(', ')}\n\nSend to ${selectedFarmers.length} farmers anyway?`
      )
      if (!proceed) return
    }

    setLoading(true)
    setError(null)

    try {
      const selectedFarmersData = getSelectedFarmersData()
      
      const contacts = selectedFarmersData.map(farmer => ({
        whatsappMsisdn: farmer.mobileNumber,
        name: farmer.name,
        village: farmer.village,
        taluka: farmer.taluka,
        district: farmer.district
      }))
      
      const parameters = variables.map((variable, index) => ({
        name: variable,
        value: parameterValues[index] || ""
      }))
      
      const messageData = {
        templateName: template.elementName || template.name || template.templateName,
        broadcastName: `Campaign_${Date.now()}`,
        languageCode: getLanguageCode(template),
        channelNumber: "917276386452",
        parameters: parameters,
        contacts: contacts
      }
      
      console.log("📤 Sending campaign to", contacts.length, "farmers")
      
      const response = await sendTemplateMessages(messageData)
      
      if (response.success) {
        // Record history for these farmers
        try {
          const historyInstance = NetworkManager(API.FARMER.CREATE_WHATSAPP_HISTORY)
          await historyInstance.request({
            farmerIds: selectedFarmers,
            campaignId: null,
            message: templateContent,
            status: "sent",
            timestamp: new Date().toISOString()
          })
        } catch (e) {
          console.error("Failed to record whatsapp history:", e)
        }
        alert(`✅ Campaign sent successfully to ${selectedFarmers.length} farmers!`)
        onClose()
      } else {
        setError(response.error || "Failed to send campaign")
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      setError("Failed to send campaign. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getUniqueValues = (key) => {
    return [...new Set(farmers.map(farmer => farmer[key]).filter(Boolean))]
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, maxHeight: '90vh' }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Users size={24} color="#10b981" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Send Campaign
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {template?.elementName || "Template"}
              </Typography>
            </Box>
          </Stack>
          <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
            <X size={20} />
          </Button>
        </Stack>
      </DialogTitle>
      
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert 
            severity="error" 
            icon={<AlertCircle size={20} />}
            sx={{ mb: 2, borderRadius: 2 }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Data Source Selection */}
        <Card sx={{ mb: 3, bgcolor: 'primary.50', boxShadow: 0, border: 1, borderColor: 'primary.main' }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                📊 Select Data Source
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <ToggleButtonGroup
                value={dataSource}
                exclusive
                onChange={(e, newValue) => {
                  if (newValue !== null) {
                    setDataSource(newValue)
                    setSelectedListId("")
                    setUseListMode(false)
                    setSelectedFarmers([])
                  }
                }}
                size="small"
                sx={{ borderRadius: 2 }}
              >
                <ToggleButton value="oldFarmers" sx={{ borderRadius: 2 }}>
                  <Database size={16} style={{ marginRight: 8 }} />
                  Old Farmers Data
                </ToggleButton>
                <ToggleButton value="publicLeads" sx={{ borderRadius: 2 }}>
                  <LinkIcon size={16} style={{ marginRight: 8 }} />
                  Public Link Leads
                </ToggleButton>
              </ToggleButtonGroup>
              
              {dataSource === "publicLeads" && (
                <FormControl size="small" sx={{ minWidth: 300 }}>
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
              )}
              
              {dataSource === "publicLeads" && selectedPublicLinkId && (
                <Chip
                  label={`Link: ${publicLinks.find(l => l._id === selectedPublicLinkId)?.name}`}
                  color="primary"
                  onDelete={() => {
                    setSelectedPublicLinkId("")
                    setPublicLeads([])
                    setFarmers([])
                    setFilteredFarmers([])
                  }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* List Selection - Only show for old farmers */}
        {dataSource === "oldFarmers" && farmerLists.length > 0 && (
          <Card sx={{ mb: 3, bgcolor: 'info.50', boxShadow: 0, border: 1, borderColor: 'info.main' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" color="info.main">
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
                    {farmerLists.map((list) => (
                      <MenuItem key={list._id} value={list._id}>
                        <Checkbox checked={selectedListIds.indexOf(list._id) > -1} />
                        <ListItemText primary={`${list.name} (${list.farmers?.length || 0})`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" onClick={() => setShowExcelModal(true)}>
                  Upload Excel
                </Button>
                {selectedListId && (
                  <Chip
                    label={`Using list: ${farmerLists.find(l => l._id === selectedListId)?.name}`}
                    color="info"
                    onDelete={() => {
                      setSelectedListId("")
                      setUseListMode(false)
                      fetchFarmers()
                    }}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Template Preview */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50', boxShadow: 0, border: 1, borderColor: 'grey.200' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <MessageSquare size={18} color="#6366f1" />
              <Typography variant="subtitle2" fontWeight="bold" color="primary">
                Message Preview
              </Typography>
            </Stack>
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'text.secondary'
              }}
            >
              {templateContent}
            </Typography>
          </CardContent>
        </Card>

        {/* Template Parameters */}
        {variables.length > 0 && (
          <Card sx={{ mb: 3, boxShadow: 0, border: 1, borderColor: 'grey.200' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
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
              <Grid container spacing={2}>
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
        {!useListMode && (dataSource === "oldFarmers" || (dataSource === "publicLeads" && selectedPublicLinkId)) && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
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
        )}

        {/* Farmers List */}
        <Card sx={{ boxShadow: 0, border: 1, borderColor: 'grey.200' }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            {loadingPublicLeads ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                  Loading leads...
                </Typography>
              </Box>
            ) : (
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      {!useListMode && (
                        <Checkbox
                          checked={selectedFarmers.length === filteredFarmers.length && filteredFarmers.length > 0}
                          indeterminate={selectedFarmers.length > 0 && selectedFarmers.length < filteredFarmers.length}
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
                        <Typography variant="body2" color="text.secondary">
                          {useListMode 
                            ? "No farmers in selected list" 
                            : dataSource === "publicLeads" && !selectedPublicLinkId
                            ? "Please select a public link to view leads"
                            : "No farmers found"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFarmers.map((farmer) => (
                      <TableRow key={farmer._id || farmer.id} hover>
                        <TableCell padding="checkbox">
                          {!useListMode && (
                            <Checkbox
                              checked={selectedFarmers.includes(farmer._id || farmer.id)}
                              onChange={() => handleSelectFarmer(farmer._id || farmer.id)}
                            />
                          )}
                          {useListMode && (
                            <CheckCircle size={16} style={{ color: '#10b981', marginLeft: '8px' }} />
                          )}
                        </TableCell>
                        <TableCell>{farmer.name}</TableCell>
                        <TableCell>{farmer.mobileNumber}</TableCell>
                        <TableCell>{farmer.village}</TableCell>
                        <TableCell>{farmer.taluka}</TableCell>
                        <TableCell>{farmer.district}</TableCell>
                        <TableCell>
                          <Chip 
                            label={farmer.source === "publicLead" ? "Public Lead" : "Old Data"}
                            size="small"
                            color={farmer.source === "publicLead" ? "primary" : "default"}
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

        {selectedFarmers.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Chip 
                icon={<CheckCircle size={16} />}
                label={`${selectedFarmers.length} farmers selected`}
                color="primary"
                variant="outlined"
              />
              {dataSource === "oldFarmers" && (
                <Chip 
                  label="Source: Old Farmers Data"
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
              {dataSource === "publicLeads" && selectedPublicLinkId && (
                <Chip 
                  label={`Source: ${publicLinks.find(l => l._id === selectedPublicLinkId)?.name || 'Public Link'}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2 }}>
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
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' }
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
