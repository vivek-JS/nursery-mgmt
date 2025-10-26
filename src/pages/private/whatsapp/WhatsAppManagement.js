import React, { useState, useEffect } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Stack,
  Tooltip,
  Badge
} from "@mui/material"
import {
  Send,
  MessageSquare,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Shield
} from "lucide-react"
import { getMessageTemplates, testWatiConnection } from "network/core/wati"
import FarmerCampaignModal from "./FarmerCampaignModal"
import SingleSendModal from "./SingleSendModal"
import { useHasWhatsAppAccess } from "utils/roleUtils"

const WhatsAppManagement = () => {
  const hasWhatsAppAccess = useHasWhatsAppAccess()
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showFarmerCampaign, setShowFarmerCampaign] = useState(false)
  const [showSingleSend, setShowSingleSend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null)

  // Access control check
  if (!hasWhatsAppAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Shield size={64} color="#f44336" style={{ marginBottom: 16 }} />
            <Typography variant="h5" gutterBottom color="error">
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              You don&apos;t have permission to access WhatsApp Management.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This feature is only available to Super Admin users.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await getMessageTemplates({
        pageSize: 100,
        pageNumber: 1,
        channelPhoneNumber: ""
      })

      if (response.success) {
        const templatesData = response.data?.messageTemplates || response.data?.data || []
        setTemplates(templatesData)
        console.log(`✅ Loaded ${templatesData.length} WhatsApp templates`)
      } else {
        setError(response.error || "Failed to fetch templates")
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      setError("Failed to connect to WATI. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setConnectionStatus('testing')
    try {
      const response = await testWatiConnection()
      if (response.success) {
        setConnectionStatus('success')
        setTimeout(() => setConnectionStatus(null), 3000)
      } else {
        setConnectionStatus('error')
        setTimeout(() => setConnectionStatus(null), 3000)
      }
    } catch (error) {
      setConnectionStatus('error')
      setTimeout(() => setConnectionStatus(null), 3000)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const filteredTemplates = (templates || []).filter(template => {
    const matchesSearch = 
      template?.elementName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template?.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template?.category?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const approvedTemplates = filteredTemplates.filter(t => t.status === "APPROVED")
  const pendingTemplates = filteredTemplates.filter(t => t.status === "PENDING")
  const rejectedTemplates = filteredTemplates.filter(t => t.status === "REJECTED")

  const getStatusIcon = (status) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />
      case "PENDING":
        return <Clock size={16} style={{ color: '#f59e0b' }} />
      case "REJECTED":
        return <XCircle size={16} style={{ color: '#ef4444' }} />
      default:
        return <Clock size={16} style={{ color: '#6b7280' }} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "APPROVED":
        return "success"
      case "PENDING":
        return "warning"
      case "REJECTED":
        return "error"
      default:
        return "default"
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <MessageSquare size={32} color="#10b981" />
          <Typography variant="h4" fontWeight="bold">
            WhatsApp Management
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary">
          Send WhatsApp messages to farmers using approved templates
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h3" fontWeight="bold">{templates.length}</Typography>
            <Typography variant="body2">Total Templates</Typography>
          </CardContent>
        </Card>
        <Card sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h3" fontWeight="bold">{approvedTemplates.length}</Typography>
            <Typography variant="body2">Approved & Ready</Typography>
          </CardContent>
        </Card>
        <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h3" fontWeight="bold">{pendingTemplates.length}</Typography>
            <Typography variant="body2">Pending Approval</Typography>
          </CardContent>
        </Card>
        <Card sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h3" fontWeight="bold">
              {connectionStatus === 'testing' ? '...' : connectionStatus === 'success' ? '✓' : '●'}
            </Typography>
            <Typography variant="body2">WATI Connection</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Action Bar */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
            <TextField
              size="small"
              placeholder="Search templates by name or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: { xs: '100%', sm: 350 } }}
            />
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<RotateCcw size={18} />}
                onClick={fetchTemplates}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant={connectionStatus === 'success' ? 'contained' : 'outlined'}
                color={connectionStatus === 'success' ? 'success' : connectionStatus === 'error' ? 'error' : 'primary'}
                startIcon={connectionStatus === 'testing' ? <CircularProgress size={18} color="inherit" /> : <MessageSquare size={18} />}
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
                sx={{ borderRadius: 2 }}
              >
                {connectionStatus === 'success' ? 'Connected' : connectionStatus === 'error' ? 'Failed' : 'Test API'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 8 }}>
              <CircularProgress size={60} />
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                Loading WhatsApp templates...
              </Typography>
            </Box>
          ) : filteredTemplates.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <MessageSquare size={64} color="#cbd5e1" />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                {searchTerm ? 'No templates match your search' : 'No templates available'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Try a different search term' : 'Create templates in WATI dashboard'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Template</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Preview</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Language</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {template.elementName || "Unnamed"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {template.id?.substring(0, 8)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 300, 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: 'text.secondary'
                          }}
                        >
                          {template.body || template.content || "No content"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={template.category || "UTILITY"} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getStatusIcon(template.status)}
                          <Chip 
                            label={template.status || "Unknown"} 
                            color={getStatusColor(template.status)}
                            size="small"
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {template.language?.text || template.language?.value || "en"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {template.status === "APPROVED" ? (
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="Send to Multiple Farmers">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedTemplate(template)
                                  setShowFarmerCampaign(true)
                                }}
                                sx={{ 
                                  bgcolor: 'primary.main', 
                                  color: 'white',
                                  '&:hover': { bgcolor: 'primary.dark' }
                                }}
                              >
                                <Send size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Send to Single Number">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedTemplate(template)
                                  setShowSingleSend(true)
                                }}
                                sx={{ 
                                  bgcolor: 'success.main', 
                                  color: 'white',
                                  '&:hover': { bgcolor: 'success.dark' }
                                }}
                              >
                                <Phone size={16} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Chip 
                            label="Not Available" 
                            size="small" 
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card sx={{ mt: 3, bgcolor: 'info.50', borderLeft: 4, borderColor: 'info.main' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight="bold" color="info.main" gutterBottom>
            💡 Quick Guide
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • <strong>Approved templates</strong> can be sent to farmers immediately<br />
            • <strong>Send Campaign:</strong> Send to multiple farmers from your database<br />
            • <strong>Send Single:</strong> Send to a specific phone number<br />
            • Create new templates in <a href="https://app.wati.io" target="_blank" rel="noopener noreferrer">WATI Dashboard</a><br />
            • WhatsApp must approve templates before they can be used
          </Typography>
        </CardContent>
      </Card>

      {/* Farmer Campaign Modal */}
      <FarmerCampaignModal
        open={showFarmerCampaign && selectedTemplate}
        onClose={() => {
          setShowFarmerCampaign(false)
          setSelectedTemplate(null)
        }}
        template={selectedTemplate}
      />

      {/* Single Send Modal */}
      <SingleSendModal
        open={showSingleSend && selectedTemplate}
        onClose={() => {
          setShowSingleSend(false)
          setSelectedTemplate(null)
        }}
        template={selectedTemplate}
      />
    </Box>
  )
}

export default WhatsAppManagement
