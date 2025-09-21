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
  Paper,
  Checkbox,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
} from "@mui/material"
import {
  Send,
  X,
  Search,
  Filter,
  RotateCcw
} from "lucide-react"
import { sendTemplateMessages, sendTextMessage } from "network/core/wati"

const FarmerCampaignModal = ({ open, onClose, template }) => {
  // Early return if no template
  if (!template) {
    return null
  }

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

  // Get tenant ID
  const tenantId = localStorage.getItem("tenantId") || "default-tenant"

  useEffect(() => {
    if (open) {
      fetchFarmers()
    }
  }, [open])

  useEffect(() => {
    filterFarmers()
  }, [farmers, searchTerm, filters])

  // Initialize parameter values when template changes
  useEffect(() => {
    if (template && variables.length > 0) {
      const initialValues = {}
      variables.forEach((variable, index) => {
        // Try to get default value from customParams
        const customParam = template.customParams?.find(param => param.paramName === variable)
        if (customParam) {
          initialValues[index] = customParam.paramValue
        } else {
          // Set default values based on variable name
          switch(variable.toLowerCase()) {
            case "farmername": case "name":
              initialValues[index] = "राम किसान"
              break
            case "ordernumber": case "order": case "id":
              initialValues[index] = "ORD-2025-001"
              break
            case "amount": case "price": case "total":
              initialValues[index] = "₹1,500"
              break
            case "village": case "location":
              initialValues[index] = "पुणे"
              break
            case "number": case "mobile":
              initialValues[index] = "1234567890"
              break
            case "plant":
              initialValues[index] = "गुलाब"
              break
            case "subtype":
              initialValues[index] = "लाल गुलाब"
              break
            case "rate":
              initialValues[index] = "₹50"
              break
            case "advance": case "advacne":
              initialValues[index] = "₹500"
              break
            case "remaining": case "remaiing":
              initialValues[index] = "₹1,000"
              break
            case "delivery":
              initialValues[index] = "15/02/2025"
              break
            default:
              initialValues[index] = `Value ${index + 1}`
          }
        }
      })
      setParameterValues(initialValues)
    }
  }, [template])

  const fetchFarmers = async () => {
    setLoading(true)
    try {
      // Mock farmer data - replace with actual API call
      const mockFarmers = [
        {
          _id: "1",
          name: "Rajesh Kumar",
          mobileNumber: "917588686452",
          village: "Sample Village 1",
          taluka: "Sample Taluka 1",
          district: "Sample District 1"
        },
        {
          _id: "2", 
          name: "Priya Sharma",
          mobileNumber: "919876543210",
          village: "Sample Village 2",
          taluka: "Sample Taluka 2",
          district: "Sample District 2"
        },
        {
          _id: "3",
          name: "Amit Patel",
          mobileNumber: "919876543211",
          village: "Sample Village 1",
          taluka: "Sample Taluka 1",
          district: "Sample District 1"
        }
      ]
      setFarmers(mockFarmers)
    } catch (error) {
      console.error("Error fetching farmers:", error)
      setError("Failed to fetch farmers")
    } finally {
      setLoading(false)
    }
  }

  const filterFarmers = () => {
    let filtered = farmers.filter(farmer => {
      const matchesSearch = farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           farmer.mobileNumber.includes(searchTerm) ||
                           farmer.village.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDistrict = !filters.district || farmer.district === filters.district
      const matchesTaluka = !filters.taluka || farmer.taluka === filters.taluka
      const matchesVillage = !filters.village || farmer.village === filters.village
      
      return matchesSearch && matchesDistrict && matchesTaluka && matchesVillage
    })
    
    setFilteredFarmers(filtered)
  }

  const handleSelectFarmer = (farmerId) => {
    setSelectedFarmers(prev => 
      prev.includes(farmerId) 
        ? prev.filter(id => id !== farmerId)
        : [...prev, farmerId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([])
    } else {
      setSelectedFarmers(filteredFarmers.map(farmer => farmer._id))
    }
  }

  const getSelectedFarmersData = () => {
    return farmers.filter(farmer => selectedFarmers.includes(farmer._id))
  }

  const formatTemplateContent = (template) => {
    if (!template) return "No template available"
    return template?.body || template?.content || template?.message || ""
  }

  const extractVariables = (content) => {
    if (!content) return []
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map(match => match.replace(/\{\{|\}\}/g, "")) : []
  }

  const templateContent = formatTemplateContent(template)
  const variables = extractVariables(templateContent)

  // Get language code from template
  const getLanguageCode = (template) => {
    if (template?.language?.value) {
      return template.language.value
    }
    if (template?.language?.code) {
      return template.language.code
    }
    return "en" // default to English
  }

  const handleParameterChange = (index, value) => {
    setParameterValues(prev => ({
      ...prev,
      [index]: value
    }))
  }

  const handleSendCampaign = async () => {
    if (selectedFarmers.length === 0) {
      setError("Please select at least one farmer")
      return
    }

    // Check if all parameters have values
    const missingParams = variables.filter((_, index) => !parameterValues[index]?.trim())
    if (missingParams.length > 0) {
      setError("Please fill in all template parameters")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const selectedFarmersData = getSelectedFarmersData()
      
      // Create contacts array for WATI
      const contacts = selectedFarmersData.map(farmer => ({
        whatsappMsisdn: farmer.mobileNumber,
        name: farmer.name,
        village: farmer.village,
        taluka: farmer.taluka,
        district: farmer.district
      }))
      
      // Prepare template parameters for WATI (as objects with name and value)
      const parameters = variables.map((variable, index) => ({
        name: (index + 1).toString(),
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
      
      console.log("Sending WATI campaign:", messageData)
      
      // Call WATI API
      const response = await sendTemplateMessages(messageData)
      
      if (response.success) {
        alert(`Campaign sent successfully to ${selectedFarmers.length} farmers!`)
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

  // Early return after all hooks
  if (!template) {
    return null
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">
            Send Campaign - {template?.elementName || template?.name || "Template"}
          </Typography>
          <Button onClick={onClose} size="small">
            <X size={20} />
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Template Preview */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Template Preview
            </Typography>
            <Typography variant="body2" sx={{ 
              p: 2, 
              bgcolor: "grey.50", 
              borderRadius: 1,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap"
            }}>
              {templateContent}
            </Typography>
          </CardContent>
        </Card>

        {/* Template Parameters */}
        {variables.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Template Parameters
              </Typography>
              <Grid container spacing={2}>
                {variables.map((variable, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <TextField
                      fullWidth
                      label={`Parameter ${index + 1} (${variable})`}
                      placeholder={`Enter value for ${variable}`}
                      value={parameterValues[index] || ""}
                      onChange={(e) => handleParameterChange(index, e.target.value)}
                      helperText={`This will replace {{${variable}}} in the template`}
                      disabled={loading}
                      required
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search farmers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search size={20} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth>
              <InputLabel>District</InputLabel>
              <Select
                value={filters.district}
                onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                label="District"
              >
                <MenuItem value="">All Districts</MenuItem>
                {getUniqueValues("district").map(district => (
                  <MenuItem key={district} value={district}>{district}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth>
              <InputLabel>Taluka</InputLabel>
              <Select
                value={filters.taluka}
                onChange={(e) => setFilters(prev => ({ ...prev, taluka: e.target.value }))}
                label="Taluka"
              >
                <MenuItem value="">All Talukas</MenuItem>
                {getUniqueValues("taluka").map(taluka => (
                  <MenuItem key={taluka} value={taluka}>{taluka}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth>
              <InputLabel>Village</InputLabel>
              <Select
                value={filters.village}
                onChange={(e) => setFilters(prev => ({ ...prev, village: e.target.value }))}
                label="Village"
              >
                <MenuItem value="">All Villages</MenuItem>
                {getUniqueValues("village").map(village => (
                  <MenuItem key={village} value={village}>{village}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Farmers List */}
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedFarmers.length === filteredFarmers.length && filteredFarmers.length > 0}
                    indeterminate={selectedFarmers.length > 0 && selectedFarmers.length < filteredFarmers.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Village</TableCell>
                <TableCell>Taluka</TableCell>
                <TableCell>District</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFarmers.map((farmer) => (
                <TableRow key={farmer._id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedFarmers.includes(farmer._id)}
                      onChange={() => handleSelectFarmer(farmer._id)}
                    />
                  </TableCell>
                  <TableCell>{farmer.name}</TableCell>
                  <TableCell>{farmer.mobileNumber}</TableCell>
                  <TableCell>{farmer.village}</TableCell>
                  <TableCell>{farmer.taluka}</TableCell>
                  <TableCell>{farmer.district}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {selectedFarmers.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="primary">
              Selected: {selectedFarmers.length} farmers
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Send size={16} />}
          onClick={handleSendCampaign}
          disabled={loading || selectedFarmers.length === 0 || variables.some((_, index) => !parameterValues[index]?.trim())}
        >
          {loading ? "Sending..." : `Send to ${selectedFarmers.length} Farmers`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default FarmerCampaignModal
