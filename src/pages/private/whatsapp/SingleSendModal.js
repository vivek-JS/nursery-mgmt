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
  Divider,
  Chip,
  Stack
} from "@mui/material"
import {
  Send,
  X,
  Phone,
  CheckCircle,
  AlertCircle,
  MessageSquare
} from "lucide-react"
import { sendTemplateMessage } from "network/core/wati"

const SingleSendModal = ({ open, onClose, template }) => {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
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
        const customParam = template.customParams?.find(param => param.paramName === variable)
        if (customParam) {
          initialValues[index] = customParam.paramValue
        } else {
          // Set default values
          switch(variable.toLowerCase()) {
            case "name":
              initialValues[index] = "विवेक चौधरी"
              break
            case "id":
              initialValues[index] = "123"
              break
            case "village":
              initialValues[index] = "जळगाव"
              break
            case "number":
              initialValues[index] = phoneNumber || "9876543210"
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
  }, [template, variables, phoneNumber])

  const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return cleaned
    }
    if (cleaned.length === 10) {
      return "91" + cleaned
    }
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      return "91" + cleaned.substring(1)
    }
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
      setError("कृपया मोबाइल नंबर टाका (Please enter a phone number)")
      return
    }

    const phoneRegex = /^[+]?[0-9]{10,15}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ""))) {
      setError("कृपया योग्य मोबाइल नंबर टाका (Please enter a valid 10-digit number)")
      return
    }

    // Warning for empty params but don't block sending
    const missingParams = variables.filter((_, index) => !parameterValues[index]?.trim())
    if (missingParams.length > 0) {
      const proceed = window.confirm(
        `⚠️ ${missingParams.length} parameters are empty:\n${missingParams.join(', ')}\n\nDo you want to continue anyway?`
      )
      if (!proceed) return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber)
      
      const parameters = variables.map((variable, index) => ({
        name: variable,
        value: parameterValues[index] || ""
      }))

      const messageData = {
        templateName: template.elementName || template.name || template.templateName,
        whatsappNumber: formattedPhone,
        languageCode: template.language?.value || "mr",
        broadcastName: `Single_${Date.now()}`,
        channelNumber: "917276386452",
        parameters: parameters
      }

      console.log("📤 Sending WhatsApp message:", messageData)

      const response = await sendTemplateMessage(messageData)

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
          setPhoneNumber("")
          setSuccess(false)
          setParameterValues({})
        }, 2500)
      } else {
        setError(response.error || "संदेश पाठवणे अयशस्वी (Failed to send message)")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setError("संदेश पाठवणे अयशस्वी. पुन्हा प्रयत्न करा (Failed to send. Please try again)")
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

  if (!template) return null

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Phone size={24} color="#10b981" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Send WhatsApp Message
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {template?.elementName || "Template"}
              </Typography>
            </Box>
          </Stack>
          <Button onClick={handleClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
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

        {success && (
          <Alert 
            severity="success" 
            icon={<CheckCircle size={20} />}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            ✅ संदेश यशस्वीरित्या पाठवला गेला! (Message sent successfully to +91 {phoneNumber})
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

        <Grid container spacing={2}>
          {/* Phone Number Input */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="📞 Mobile Number (मोबाइल नंबर)"
              placeholder="9876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              helperText="Enter 10-digit mobile number with WhatsApp"
              disabled={loading}
              required
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2 
                } 
              }}
            />
          </Grid>

          {/* Template Parameters */}
          {variables.length > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Chip label="Template Parameters" color="primary" size="small" />
                </Divider>
              </Grid>
              
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
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2 
                      } 
                    }}
                  />
                </Grid>
              ))}
            </>
          )}
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
          onClick={handleSend}
          disabled={loading || !phoneNumber.trim()}
          sx={{ 
            borderRadius: 2,
            px: 3,
            bgcolor: '#10b981',
            '&:hover': {
              bgcolor: '#059669'
            }
          }}
        >
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SingleSendModal
