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
  InputAdornment
} from "@mui/material"
import {
  Send,
  X,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
  MessageSquare
} from "lucide-react"
import { sendTemplateMessages } from "network/core/wati"

const FarmerCampaignModal = ({ open, onClose, template }) => {
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

  useEffect(() => {
    if (open) {
      fetchFarmers()
    }
  }, [open])

  useEffect(() => {
    filterFarmers()
  }, [farmers, searchTerm, filters])

  // Initialize parameter values
  useEffect(() => {
    if (template && variables.length > 0) {
      const initialValues = {}
      variables.forEach((variable, index) => {
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
      const response = await fetch('/api/v1/farmer/getFarmers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const farmersData = data.data?.farmers || data.data || []
        setFarmers(farmersData)
        console.log(`✅ Loaded ${farmersData.length} farmers`)
      } else {
        setFarmers([
          {
            _id: "demo1",
            name: "Sample Farmer",
            mobileNumber: "9876543210",
            village: "Sample Village",
            taluka: "Sample Taluka",
            district: "Sample District"
          }
        ])
      }
    } catch (error) {
      console.error("Error fetching farmers:", error)
      setFarmers([
        {
          _id: "demo1",
          name: "Sample Farmer",
          mobileNumber: "9876543210",
          village: "Sample Village",
          taluka: "Sample Taluka",
          district: "Sample District"
        }
      ])
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

    const missingParams = variables.filter((_, index) => !parameterValues[index]?.trim())
    if (missingParams.length > 0) {
      setError("कृपया सर्व माहिती भरा (Please fill in all parameters)")
      return
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
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Template Parameters
              </Typography>
              <Grid container spacing={2}>
                {variables.map((variable, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <TextField
                      fullWidth
                      label={`${variable} (${index + 1})`}
                      placeholder={`Enter ${variable}`}
                      value={parameterValues[index] || ""}
                      onChange={(e) => handleParameterChange(index, e.target.value)}
                      disabled={loading}
                      required
                      size="small"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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

        {/* Farmers List */}
        <Card sx={{ boxShadow: 0, border: 1, borderColor: 'grey.200' }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedFarmers.length === filteredFarmers.length && filteredFarmers.length > 0}
                      indeterminate={selectedFarmers.length > 0 && selectedFarmers.length < filteredFarmers.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Mobile</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Village</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Taluka</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>District</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFarmers.map((farmer) => (
                  <TableRow key={farmer._id} hover>
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
        </Card>

        {selectedFarmers.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Chip 
              icon={<CheckCircle size={16} />}
              label={`${selectedFarmers.length} farmers selected`}
              color="primary"
              variant="outlined"
            />
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
          disabled={loading || selectedFarmers.length === 0 || variables.some((_, index) => !parameterValues[index]?.trim())}
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
    </Dialog>
  )
}

export default FarmerCampaignModal
