import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from "@mui/material"
import {
  Send,
  X,
  MessageSquare
} from "lucide-react"
import { sendTemplateMessage } from "network/core/wati"

const SingleSendModal = ({ open, onClose, template }) => {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [languageCode, setLanguageCode] = useState("en")
  const [parameterValues, setParameterValues] = useState({})

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
              initialValues[index] = phoneNumber
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
  }, [template, variables, phoneNumber])

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

  const formatPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, "")
    
    // If it starts with 91 and is 12 digits, it's already formatted
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return cleaned
    }
    
    // If it's 10 digits, add 91 prefix
    if (cleaned.length === 10) {
      return "91" + cleaned
    }
    
    // If it's 11 digits and starts with 0, remove 0 and add 91
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      return "91" + cleaned.substring(1)
    }
    
    // Return as is if it doesn't match expected patterns
    return cleaned
  }

  const handleParameterChange = (index, value) => {
    setParameterValues(prev => ({
      ...prev,
      [index]: value
    }))
  }

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number")
      return
    }

    // Basic phone number validation
    const phoneRegex = /^[+]?[0-9]{10,15}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ""))) {
      setError("Please enter a valid phone number (10-15 digits)")
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
    setSuccess(false)

    try {
      // Format phone number to E.164 format
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      // Get language code from template
      const templateLanguageCode = getLanguageCode(template)
      
      // Prepare template parameters for WATI (as objects with name and value)
      const parameters = variables.map((variable, index) => ({
        name: (index + 1).toString(),
        value: parameterValues[index] || ""
      }))

      const messageData = {
        templateName: template.elementName || template.name || template.templateName,
        whatsappNumber: formattedPhone,
        languageCode: templateLanguageCode,
        broadcastName: `Single_Send_${new Date().toISOString().split('T')[0]}_${Date.now()}`,
        channelNumber: "917276386452",
        parameters: parameters
      }

      console.log("Sending single WATI message:", messageData)

      // Call WATI API
      const response = await sendTemplateMessage(messageData)

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
          setPhoneNumber("")
          setSuccess(false)
          setParameterValues({})
        }, 2000)
      } else {
        setError(response.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending single message:", error)
      setError("Failed to send message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPhoneNumber("")
    setError(null)
    setSuccess(false)
    setParameterValues({})
    onClose()
  }

  // Early return after all hooks
  if (!template) {
    return null
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">
            Send to Single Number - {template?.elementName || template?.name || "Template"}
          </Typography>
          <Button onClick={handleClose} size="small">
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

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Message sent successfully to {phoneNumber}!
          </Alert>
        )}

        {/* Template Preview */}
        {template && (
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
        )}

        <Grid container spacing={3}>
          {/* Phone Number Input */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone Number"
              placeholder="Enter phone number (e.g., +919876543210 or 9876543210)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              helperText="Enter phone number with country code (e.g., +91 for India). Make sure the number has WhatsApp."
              disabled={loading}
            />
          </Grid>

          {/* Language Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Language</InputLabel>
              <Select
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                label="Language"
                disabled={loading}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="mr">Marathi</MenuItem>
                <MenuItem value="hi">Hindi</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Template Parameters */}
          {variables.length > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6" color="primary">
                    Template Parameters
                  </Typography>
                </Divider>
              </Grid>
              
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
            </>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<Send size={16} />}
          onClick={handleSend}
          disabled={loading || !phoneNumber.trim() || variables.some((_, index) => !parameterValues[index]?.trim())}
        >
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SingleSendModal
