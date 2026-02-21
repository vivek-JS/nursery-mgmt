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
  Link as LinkIcon,
  Plus,
  RotateCcw
} from "lucide-react"
import { sendTemplateMessages } from "network/core/wati"
import { API, NetworkManager } from "network/core"
import ExcelSendModal from "pages/private/whatsapp/ExcelSendModal"

const FarmerCampaignModal = ({ open, onClose, template: initialTemplate, templates = [], farmerLists = [], onListUpdate, initialListId, onSuccess }) => {
  const approvedTemplates = (templates || []).filter((t) => t.status === "APPROVED")
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const template = selectedTemplate || initialTemplate || approvedTemplates[0] || null

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
  const [manualNumbers, setManualNumbers] = useState(["", "", ""])
  const [campaignName, setCampaignName] = useState("")

  // New state for data source selection
  const [dataSource, setDataSource] = useState("oldFarmers") // "oldFarmers" or "publicLeads"
  const [publicLinks, setPublicLinks] = useState([])
  const [selectedPublicLinkId, setSelectedPublicLinkId] = useState("")
  const [publicLeads, setPublicLeads] = useState([])
  const [loadingPublicLinks, setLoadingPublicLinks] = useState(false)
  const [loadingPublicLeads, setLoadingPublicLeads] = useState(false)

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
      setDataSource("oldFarmers")
      setSelectedPublicLinkId("")
      setPublicLeads([])
      setManualNumbers(["", "", ""])
      setCampaignName("")
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

  const handleAddManualNumbers = () => {
    const toAdd = []
    const allFarmers = [...farmers]
    manualNumbers.forEach((val, idx) => {
      const digits = String(val || "").replace(/\D/g, "")
      const phone = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null
      if (phone) {
        const normalized = String(phone).slice(-10)
        const alreadyExists = allFarmers.some(f => String(f.mobileNumber || "").replace(/\D/g, "").slice(-10) === normalized)
        if (!alreadyExists) {
          const id = `manual-${phone}-${idx}-${Date.now()}`
          toAdd.push({
            _id: id,
            id,
            name: "",
            mobileNumber: phone,
            village: "",
            taluka: "",
            district: "",
            source: "manual"
          })
          allFarmers.push(toAdd[toAdd.length - 1])
        }
      }
    })
    if (toAdd.length > 0) {
      setFarmers(prev => [...prev, ...toAdd])
      setSelectedFarmers(prev => [...prev, ...toAdd.map(f => f._id)])
      setManualNumbers(["", "", ""])
      setError(null)
    } else if (manualNumbers.some(m => m.trim())) {
      setError("Enter valid 10-digit phone numbers")
    }
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
    if (raw === "[Village]" || v === "village") return farmer.village || ""
    if (raw === "[Mobile]" || v === "number") return String(farmer.mobileNumber || "")
    if (raw === "[Taluka]" || v === "taluka") return farmer.taluka || ""
    if (raw === "[District]" || v === "district") return farmer.district || ""
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

  const getUniqueValues = (key) => {
    return [...new Set(farmers.map(farmer => farmer[key]).filter(Boolean))]
  }

  const handleNewCampaign = () => {
    setSelectedFarmers([])
    setSelectedListIds(initialListId ? [initialListId] : [])
    setUseListMode(!!initialListId)
    setDataSource("oldFarmers")
    setSelectedPublicLinkId("")
    setPublicLeads([])
    setManualNumbers(["", "", ""])
    setCampaignName("")
    setSearchTerm("")
    setFilters({ district: "", taluka: "", village: "" })
    setError(null)
    setSelectedTemplate(initialTemplate || approvedTemplates[0] || null)
    if (initialListId) {
      loadFarmersFromLists([initialListId])
    } else {
      fetchFarmers()
    }
  }

  if (!open) return null
  if (approvedTemplates.length === 0) {
    return (
      <Dialog 
        open 
        onClose={onClose}
        PaperProps={{ sx: { borderRadius: 3, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" } }}
      >
        <DialogTitle sx={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", color: "white" }}>
          Send Campaign
        </DialogTitle>
        <DialogContent sx={{ py: 4 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No approved templates. Please add and approve templates in the Templates tab first.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#f1f5f9" }}>
          <Button onClick={onClose} variant="contained" sx={{ bgcolor: "#25D366", "&:hover": { bgcolor: "#128C7E" } }}>
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
          maxHeight: '90vh',
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          pb: 0,
          py: 2,
          px: 3,
          background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
          color: "white"
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Users size={28} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Send Campaign
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
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
                borderColor: "rgba(255,255,255,0.5)",
                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
              }}
            >
              New Campaign
            </Button>
            <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1, color: "white" }}>
              <X size={20} />
            </Button>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, bgcolor: "#f8fafc" }}>
        {approvedTemplates.length > 1 && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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
            icon={<AlertCircle size={20} />}
            sx={{ mb: 2, borderRadius: 2 }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Campaign Name */}
        <TextField
          fullWidth
          label="Campaign Name"
          placeholder="e.g. Summer Sale 2025, Diwali Greetings"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          size="small"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          helperText="Optional. Leave blank for auto-generated name."
        />

        {/* Data Source Selection */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(37,211,102,0.15)", border: 1, borderColor: "rgba(37,211,102,0.3)" }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#128C7E" }}>
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

        {/* Manual Number Entry */}
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(37,211,102,0.12)", border: 1, borderColor: "rgba(37,211,102,0.25)" }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Plus size={18} color="#25D366" />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: "#128C7E" }}>
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

        {/* List Selection - Only show for old farmers */}
        {dataSource === "oldFarmers" && farmerLists.length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 2px 8px rgba(59,130,246,0.12)", border: 1, borderColor: "rgba(59,130,246,0.3)" }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
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
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", bgcolor: '#fafafa' }}>
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
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
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
        <Card sx={{ borderRadius: 2, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
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
                            label={farmer.source === "publicLead" ? "Public Lead" : farmer.source === "manual" ? "Manual" : "Old Data"}
                            size="small"
                            color={farmer.source === "publicLead" ? "primary" : farmer.source === "manual" ? "secondary" : "default"}
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

      <DialogActions sx={{ p: 2.5, bgcolor: "#f1f5f9", gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined" sx={{ borderRadius: 2 }}>
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
            bgcolor: '#25D366',
            '&:hover': { bgcolor: '#128C7E' }
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
