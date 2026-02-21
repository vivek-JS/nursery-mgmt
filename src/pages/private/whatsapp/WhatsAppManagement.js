import React, { useState, useEffect, useMemo } from "react"
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
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
  Shield,
  Users,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  Pencil,
  Trash2,
  Eye
} from "lucide-react"
import { getMessageTemplates, testWatiConnection } from "network/core/wati"
import FarmerCampaignModal from "./FarmerCampaignModal"
import SingleSendModal from "./SingleSendModal"
import SowingReminderModal from "./SowingReminderModal"
import BroadcastListModal from "./BroadcastListModal"
import ExcelSendModal from "./ExcelSendModal"
import SendToListModal from "./SendToListModal"
import EditBroadcastListModal from "./EditBroadcastListModal"
import ViewBroadcastListModal from "./ViewBroadcastListModal"
import SendSmsModal from "./SendSmsModal"
import { useHasWhatsAppAccess } from "utils/roleUtils"
import { API, NetworkManager } from "network/core"
import CampaignListTab from "./CampaignListTab"
import { Tabs, Tab } from "@mui/material"
import CampaignDetailModal from "./CampaignDetailModal"

const WhatsAppManagement = () => {
  const hasWhatsAppAccess = useHasWhatsAppAccess()
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showFarmerCampaign, setShowFarmerCampaign] = useState(false)
  const [showSingleSend, setShowSingleSend] = useState(false)
  const [showSowingReminder, setShowSowingReminder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(null) // 'testing' | 'success' | 'error'
  const [watiConnected, setWatiConnected] = useState(false)
  const [farmerLists, setFarmerLists] = useState([])
  const [listsLoading, setListsLoading] = useState(false)
  const [showBroadcastListModal, setShowBroadcastListModal] = useState(false)
  const [excelContactLists, setExcelContactLists] = useState([])
  const [excelListsLoading, setExcelListsLoading] = useState(false)
  const [showExcelSendModal, setShowExcelSendModal] = useState(false)
  const [sendToListModal, setSendToListModal] = useState({ open: false, listId: null, listName: "" })
  const [editList, setEditList] = useState(null)
  const [viewList, setViewList] = useState(null)
  const [deleteList, setDeleteList] = useState(null)
  const [farmerCampaignInitialListId, setFarmerCampaignInitialListId] = useState(null)
  const [showSendSmsModal, setShowSendSmsModal] = useState(false)
  const [activeTab, setActiveTab] = useState(0) // 0: Templates, 1: Campaigns
  const [openCampaignDetail, setOpenCampaignDetail] = useState(false)
  const [viewBroadcastId, setViewBroadcastId] = useState(null)
  const [campaignRefreshTrigger, setCampaignRefreshTrigger] = useState(0)

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
    setConnectionStatus("testing")
    try {
      const response = await testWatiConnection()
      if (response.success) {
        setConnectionStatus("success")
        setWatiConnected(true)
      } else {
        setConnectionStatus("error")
        setWatiConnected(false)
      }
    } catch (err) {
      setConnectionStatus("error")
      setWatiConnected(false)
    }
    setTimeout(() => setConnectionStatus(null), 4000)
  }

  const fetchExcelContactLists = async () => {
    setExcelListsLoading(true)
    try {
      const instance = NetworkManager(API.WHATSAPP_CONTACT_LIST.GET_ALL)
      const response = await instance.request()
      if (response.data?.data) setExcelContactLists(response.data.data)
      else setExcelContactLists([])
    } catch (err) {
      console.error("Error fetching Excel contact lists:", err)
      setExcelContactLists([])
    } finally {
      setExcelListsLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    fetchFarmerLists()
    fetchExcelContactLists()
  }, [])

  useEffect(() => {
    if (!hasWhatsAppAccess) return
    testConnection()
  }, [hasWhatsAppAccess])

  const fetchFarmerLists = async () => {
    setListsLoading(true)
    try {
      const instance = NetworkManager(API.FARMER_LIST.GET_ALL_LISTS)
      const response = await instance.request()
      if (response.data?.data) setFarmerLists(response.data.data)
    } catch (err) {
      console.error("Error fetching farmer lists:", err)
    } finally {
      setListsLoading(false)
    }
  }

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

  const allBroadcastLists = useMemo(() => {
    const farmer = (farmerLists || []).map((l) => ({
      id: l._id,
      name: l.name,
      description: l.description || "",
      type: "farmer",
      count: l.farmers?.length || 0,
      optInCount: (l.farmers || []).filter(f => f.opt_in === true).length
    }))
    const contact = (excelContactLists || []).map((l) => ({
      id: l._id,
      name: l.name,
      description: l.description || "",
      type: "contact",
      count: l.contacts?.length || 0
    }))
    return [...farmer, ...contact].sort((a, b) => (b.name || "").localeCompare(a.name || ""))
  }, [farmerLists, excelContactLists])

  const handleDeleteList = async () => {
    if (!deleteList) return
    try {
      if (deleteList.type === "farmer") {
        const endpoint = { ...API.FARMER_LIST.DELETE_LIST, endpoint: `farmer-list/${deleteList.id}` }
        await NetworkManager(endpoint).request()
        fetchFarmerLists()
      } else {
        const endpoint = { ...API.WHATSAPP_CONTACT_LIST.DELETE, endpoint: `whatsapp-contact-list/${deleteList.id}` }
        await NetworkManager(endpoint).request()
        fetchExcelContactLists()
      }
      setDeleteList(null)
    } catch (err) {
      console.error("Delete list failed:", err)
      setError(err?.response?.data?.message || "Failed to delete list")
    }
  }

  const refreshAllLists = () => {
    fetchFarmerLists()
    fetchExcelContactLists()
  }

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
    <>
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{
          mb: 2,
          "& .MuiTab-root": { fontWeight: 600 },
          "& .Mui-selected": { color: "#25D366" },
          "& .MuiTabs-indicator": { bgcolor: "#25D366", height: 3, borderRadius: "3px 3px 0 0" }
        }}
      >
        <Tab label="Templates" />
        <Tab label="Campaigns" />
      </Tabs>
      {activeTab === 0 ? (
        <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <MessageSquare size={32} color="#25D366" />
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
        <Card
          sx={{
            background:
              connectionStatus === "testing"
                ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                : watiConnected
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "white"
          }}
        >
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1}>
              {connectionStatus === "testing" ? (
                <CircularProgress size={28} sx={{ color: "white" }} />
              ) : watiConnected ? (
                <Wifi size={28} />
              ) : (
                <WifiOff size={28} />
              )}
              <Typography variant="h3" fontWeight="bold">
                {connectionStatus === "testing"
                  ? "..."
                  : watiConnected
                    ? "Connected"
                    : "Not connected"}
              </Typography>
            </Stack>
            <Typography variant="body2">WATI</Typography>
            <Button
              size="small"
              sx={{ mt: 1, color: "white", borderColor: "rgba(255,255,255,0.8)" }}
              variant="outlined"
              onClick={testConnection}
              disabled={connectionStatus === "testing"}
            >
              {connectionStatus === "testing" ? "Testing..." : "Test again"}
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Send from Excel */}
      <Card sx={{ mb: 3, boxShadow: 3, borderLeft: 4, borderColor: "primary.main" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileSpreadsheet size={24} />
                Send from Excel
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload .xlsx / .csv with Phone and optional Name column. Save to DB and send WhatsApp to all numbers.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FileSpreadsheet size={18} />}
              onClick={() => setShowExcelSendModal(true)}
              sx={{ borderRadius: 2 }}
            >
              Upload Excel & Send
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Send SMS via Exotel */}
      <Card sx={{ mb: 3, boxShadow: 3, borderLeft: 4, borderColor: "#6366f1" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MessageSquare size={24} style={{ color: "#6366f1" }} />
                Send SMS (Exotel)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send an SMS to any mobile number via Exotel. Configure EXOTEL_* env vars on the server.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<MessageSquare size={18} />}
              onClick={() => setShowSendSmsModal(true)}
              sx={{ borderRadius: 2, bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
            >
              Send SMS
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* All Broadcast Lists – Farmer lists + Contact lists with Edit / Delete / View / Send */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              📋 All Broadcast Lists ({allBroadcastLists.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Users size={18} />}
              onClick={() => setShowBroadcastListModal(true)}
              sx={{ borderRadius: 2 }}
            >
              Create Broadcast List
            </Button>
          </Stack>
          {listsLoading || excelListsLoading ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary">Loading lists...</Typography>
            </Stack>
          ) : allBroadcastLists.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No broadcast lists yet. Create one from &quot;Create Broadcast List&quot; or upload Excel above.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>Count</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allBroadcastLists.map((list) => (
                    <TableRow key={`${list.type}-${list.id}`} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{list.name}</Typography>
                        {list.description && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 280 }}>
                            {list.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={list.type === "farmer" ? "Farmer list" : "Contact list"}
                          size="small"
                          color={list.type === "farmer" ? "primary" : "secondary"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {list.count}
                        {typeof list.optInCount === "number" ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {list.optInCount} opted
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                          <Tooltip title="Send message">
                            <IconButton
                              size="small"
                              onClick={() => {
                                if (list.type === "farmer") {
                                  setSelectedTemplate(approvedTemplates[0] || null)
                                  setFarmerCampaignInitialListId(list.id)
                                  setShowFarmerCampaign(true)
                                } else {
                                  setSendToListModal({ open: true, listId: list.id, listName: list.name })
                                }
                              }}
                              disabled={list.type === "farmer" && approvedTemplates.length === 0}
                              sx={{ color: "success.main" }}
                            >
                              <Send size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => setViewList(list)} sx={{ color: "info.main" }}>
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setEditList(list)}>
                              <Pencil size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteList(list)} sx={{ color: "error.main" }}>
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                color="success"
                startIcon={<Send size={18} />}
                onClick={() => {
                  setSelectedTemplate(approvedTemplates[0] || null)
                  setFarmerCampaignInitialListId(null)
                  setShowFarmerCampaign(true)
                }}
                disabled={approvedTemplates.length === 0}
                sx={{ borderRadius: 2 }}
              >
                New Campaign
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send size={18} />}
                onClick={() => setShowSowingReminder(true)}
                sx={{ borderRadius: 2 }}
              >
                Sowing Reminders
              </Button>
              <Button
                variant="outlined"
                startIcon={<RotateCcw size={18} />}
                onClick={() => {
                  fetchTemplates()
                  fetchFarmerLists()
                  fetchExcelContactLists()
                }}
                disabled={loading || listsLoading || excelListsLoading}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant={watiConnected ? "contained" : "outlined"}
                color={watiConnected ? "success" : "primary"}
                startIcon={connectionStatus === "testing" ? <CircularProgress size={18} color="inherit" /> : <MessageSquare size={18} />}
                onClick={testConnection}
                disabled={connectionStatus === "testing"}
                sx={{ borderRadius: 2 }}
              >
                {connectionStatus === "testing" ? "Testing..." : watiConnected ? "WATI OK" : "Test WATI"}
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
            • <strong>WATI</strong> status is tested on load; use &quot;Test again&quot; if needed<br />
            • <strong>Send from Excel:</strong> Upload .xlsx/.csv with Phone (and optional Name), save to DB, then send<br />
            • <strong>Send Campaign:</strong> Send to multiple farmers from your database<br />
            • <strong>Send Single:</strong> Send to a specific phone number<br />
            • Create new templates in <a href="https://app.wati.io" target="_blank" rel="noopener noreferrer">WATI Dashboard</a><br />
            • WhatsApp must approve templates before they can be used
          </Typography>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteList} onClose={() => setDeleteList(null)}>
        <DialogTitle>Delete list?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete &quot;{deleteList?.name}&quot;? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteList(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteList}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
      ) : (
        <CampaignListTab
          onCreateCampaign={() => { setShowFarmerCampaign(true); }}
          onView={(id) => { setViewBroadcastId(id); setOpenCampaignDetail(true); }}
          refreshTrigger={campaignRefreshTrigger}
        />
      )}
    {/* Modals (mounted regardless of current tab) */}
    <FarmerCampaignModal
      open={showFarmerCampaign}
      onClose={() => {
        setShowFarmerCampaign(false)
        setSelectedTemplate(null)
        setFarmerCampaignInitialListId(null)
      }}
      template={selectedTemplate}
      templates={templates}
      farmerLists={farmerLists}
      onListUpdate={fetchFarmerLists}
      initialListId={farmerCampaignInitialListId}
      onSuccess={() => setCampaignRefreshTrigger((t) => t + 1)}
    />

    <SingleSendModal
      open={showSingleSend && selectedTemplate}
      onClose={() => {
        setShowSingleSend(false)
        setSelectedTemplate(null)
      }}
      template={selectedTemplate}
    />

    <SowingReminderModal
      open={showSowingReminder}
      onClose={() => setShowSowingReminder(false)}
    />

    <BroadcastListModal
      open={showBroadcastListModal}
      onClose={() => setShowBroadcastListModal(false)}
      onListCreated={() => {
        refreshAllLists()
        setShowBroadcastListModal(false)
      }}
    />

    <ExcelSendModal
      open={showExcelSendModal}
      onClose={() => setShowExcelSendModal(false)}
      templates={templates}
      onListCreated={fetchExcelContactLists}
    />

    <SendSmsModal
      open={showSendSmsModal}
      onClose={() => setShowSendSmsModal(false)}
    />

    <SendToListModal
      open={sendToListModal.open}
      onClose={() => setSendToListModal({ open: false, listId: null, listName: "" })}
      listId={sendToListModal.listId}
      listName={sendToListModal.listName}
      templates={templates}
      onSent={fetchExcelContactLists}
    />

    <EditBroadcastListModal
      open={!!editList}
      onClose={() => setEditList(null)}
      list={editList}
      onSaved={refreshAllLists}
    />

    <ViewBroadcastListModal
      open={!!viewList}
      onClose={() => setViewList(null)}
      list={viewList}
      templates={templates}
      onSendMessage={(list) => {
        setViewList(null)
        if (list.type === "farmer") {
          setSelectedTemplate(approvedTemplates[0] || null)
          setFarmerCampaignInitialListId(list.id)
          setShowFarmerCampaign(true)
        } else {
          setSendToListModal({ open: true, listId: list.id, listName: list.name })
        }
      }}
    />
    <CampaignDetailModal
      open={openCampaignDetail}
      onClose={() => setOpenCampaignDetail(false)}
      broadcastId={viewBroadcastId}
    />
  </>
  )
}

export default WhatsAppManagement
