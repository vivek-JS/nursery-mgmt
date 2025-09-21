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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Pagination,
  InputAdornment
} from "@mui/material"
import {
  Plus,
  Edit,
  Delete,
  Send,
  Users,
  MessageSquare,
  Filter,
  Search,
  RotateCcw
} from "lucide-react"
import { API, NetworkManager } from "network/core"
import { getMessageTemplates, testWatiConnection } from "network/core/wati"
import FarmerCampaignModal from "./FarmerCampaignModal"
import SingleSendModal from "./SingleSendModal"

const WhatsAppManagement = () => {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showFarmerCampaign, setShowFarmerCampaign] = useState(false)
  const [showSingleSend, setShowSingleSend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  })
  const [error, setError] = useState(null)

  // Get tenant ID from user context or localStorage
  const tenantId = localStorage.getItem("tenantId") || "default-tenant"

  const fetchTemplates = async (page = 1, pageSize = 10, channelPhoneNumber = "") => {
    setLoading(true)
    setError(null)
    
    try {
      // Use WATI API directly
      const response = await getMessageTemplates({
        pageSize,
        pageNumber: page,
        channelPhoneNumber
      })

      if (response.success) {
        const templatesData = response.data?.messageTemplates || response.data?.data || response.data?.templates || []
        setTemplates(templatesData)
        
        // Update pagination info
        setPagination(prev => ({
          ...prev,
          page,
          pageSize,
          total: response.data?.link?.total || response.data?.total || templatesData.length,
          totalPages: response.data?.totalPages || Math.ceil((response.data?.total || templatesData.length) / pageSize)
        }))
      } else {
        setError(response.error || "Failed to fetch templates")
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      setError(error.message || "Failed to fetch templates")
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    try {
      const response = await testWatiConnection()
      if (response.success) {
        alert("✅ WATI API connection successful!")
      } else {
        alert(`❌ WATI API connection failed: ${response.error}`)
      }
    } catch (error) {
      alert(`❌ WATI API connection failed: ${error.message}`)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const filteredTemplates = (templates || []).filter(template => {
    const matchesSearch = template?.elementName?.toLowerCase().includes(searchTerm.toLowerCase()) || template?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template?.body?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || template?.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    setShowFarmerCampaign(true)
  }

  const handleCreateTemplate = () => {
    setSelectedTemplate(null)
    setShowTemplateDialog(true)
  }

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template)
    setShowTemplateDialog(true)
  }

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      // Implement delete functionality
      console.log("Delete template:", templateId)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved": case "APPROVED":
      case "active": 
        return "success"
      case "pending": case "PENDING":
      case "draft": 
        return "warning"
      case "rejected": case "REJECTED":
      case "inactive": case "DELETED": 
        return "error"
      default: 
        return "default"
    }
  }

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case "order": 
        return "primary"
      case "payment": 
        return "error"
      case "information": 
        return "info"
      case "promotion": 
        return "secondary"
      case "marketing":
        return "secondary"
      default: 
        return "default"
    }
  }

  const formatTemplateContent = (template) => {
    if (!template) return "No template available"
    // Handle different possible content fields
    return template?.body || template?.content || template?.message || "No content available"
  }

  const extractVariables = (content) => {
    if (!content) return []
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map(match => match.replace(/\{\{|\}\}/g, "")) : []
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          WhatsApp Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage WhatsApp templates and send campaigns to farmers
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Action Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                size="small"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} color="#666" />
                    </InputAdornment>
                  )
                }}
                sx={{ minWidth: 250 }}
      />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<RotateCcw size={16} />}
                onClick={() => fetchTemplates()}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<MessageSquare size={16} />}
                onClick={testConnection}
                color="success"
              >
                Test Connection
              </Button>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={handleCreateTemplate}
            >
              Create Template
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Template Name</TableCell>
                      <TableCell>Content Preview</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Language</TableCell>
                      <TableCell>Variables</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTemplates.map((template) => {
                      const content = formatTemplateContent(template)
                      const variables = extractVariables(content)
                      
                      return (
                        <TableRow key={template.id || template.templateId} hover>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {template.elementName || template.elementName || template.name || template.templateName || "Unnamed Template"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                maxWidth: 300, 
                                overflow: "hidden", 
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {content}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={template.category || template.type || "General"} 
                              color={getCategoryColor(template.category || template.type)}
                              size="small"
      />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={template.status || "Unknown"} 
                              color={getStatusColor(template.status)}
                              size="small"
      />
                          </TableCell>
                          <TableCell>
                            {template.language?.text || template.language?.value || template.language || "en"}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {variables.length > 0 ? variables.join(", ") : "None"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {template.lastModified ?
                              new Date(template.createdAt).toLocaleDateString() :
                              "Unknown"
                            }
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                              <IconButton
                                size="small"
                                onClick={() => handleSelectTemplate(template)}
                                color="primary"
                                title="Send Campaign"
                              >
                                <Send size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedTemplate(template)
                                  setShowSingleSend(true)
                                }}
                                color="success"
                                title="Send to Single Number"
                              >
                                <MessageSquare size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleEditTemplate(template)}
                                color="secondary"
                                title="Edit Template"
                              >
                                <Edit size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedTemplate(template)
                                  setShowSingleSend(true)
                                }}
                                color="success"
                                title="Send to Single Number"
                              >
                                <MessageSquare size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteTemplate(template.id || template.templateId)}
                                color="error"
                                title="Delete Template"
                              >
                                <Delete size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedTemplate(template)
                                  setShowSingleSend(true)
                                }}
                                color="success"
                                title="Send to Single Number"
                              >
                                <MessageSquare size={16} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Empty State */}
              {filteredTemplates.length === 0 && !loading && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <MessageSquare size={48} color="#ccc" />
                  <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                    No templates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm || filterStatus !== "all" 
                      ? "Try adjusting your search or filter criteria"
                      : "Create your first WhatsApp template to get started"
                    }
                  </Typography>
                </Box>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={(event, page) => fetchTemplates(page, pagination.pageSize)}
                    color="primary"
      />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Template Dialog */}
      <Dialog 
        open={showTemplateDialog} 
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate ? "Edit Template" : "Create New Template"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Name"
                placeholder="Enter template name"
                defaultValue={selectedTemplate?.name || selectedTemplate?.templateName || ""}
      />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Template Content"
                multiline
                rows={6}
                placeholder="Enter your message template. Use {{variableName}} for dynamic content."
                defaultValue={selectedTemplate ? formatTemplateContent(selectedTemplate) : ""}
                helperText="Use {{variableName}} syntax for dynamic variables"
      />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Variables (comma separated)"
                placeholder="farmerName, orderNumber, amount"
                defaultValue={selectedTemplate ? extractVariables(formatTemplateContent(selectedTemplate)).join(", ") : ""}
                helperText="List all variables used in the template"
      />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  defaultValue={selectedTemplate?.category || selectedTemplate?.type || "general"}
                  label="Category"
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="order">Order</MenuItem>
                  <MenuItem value="payment">Payment</MenuItem>
                  <MenuItem value="information">Information</MenuItem>
                  <MenuItem value="promotion">Promotion</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  defaultValue={selectedTemplate?.status || "draft"}
                  label="Status"
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => setShowTemplateDialog(false)}>
            {selectedTemplate ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Farmer Campaign Modal */}
      <FarmerCampaignModal
        open={showFarmerCampaign && selectedTemplate}
        onClose={() => setShowFarmerCampaign(false)}
        template={selectedTemplate}
      />

      {/* Single Send Modal */}
      <SingleSendModal
        open={showSingleSend && selectedTemplate}
        onClose={() => setShowSingleSend(false)}
        template={selectedTemplate}
      />
    </Box>
  )
}

export default WhatsAppManagement
