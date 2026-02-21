import React, { useState, useCallback } from "react"
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from "@mui/material"
import {
  Upload,
  FileSpreadsheet,
  Save,
  Send,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import * as XLSX from "xlsx"
import { sendTemplateMessages } from "network/core/wati"
import { API, NetworkManager } from "network/core"

const PHONE_COLUMN_NAMES = ["phone", "mobile", "number", "contact", "whatsapp", "फोन"]
const NAME_COLUMN_NAMES = ["name", "नाव", "farmer name", "customer name"]

function findColumn(row, names) {
  const keys = Object.keys(row || {}).map((k) => k.trim().toLowerCase())
  for (const n of names) {
    const key = keys.find((k) => k === n.toLowerCase() || k.includes(n.toLowerCase()))
    if (key) {
      const orig = Object.keys(row).find((k) => k.trim().toLowerCase() === key)
      return orig
    }
  }
  return null
}

function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: "binary", cellDates: true })
        const firstSheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" })
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file, "UTF-8")
    } else {
      reader.readAsBinaryString(file)
    }
  })
}

function normalizePhone(phone) {
  if (phone == null) return ""
  const s = String(phone).replace(/\D/g, "")
  if (s.length === 10 && !s.startsWith("0")) return "91" + s
  if (s.length === 12 && s.startsWith("91")) return s
  return s
}

function extractContacts(rows) {
  if (!rows || rows.length === 0) return []
  const first = rows[0]
  const phoneCol = findColumn(first, PHONE_COLUMN_NAMES) || Object.keys(first)[0]
  const nameCol = findColumn(first, NAME_COLUMN_NAMES)
  return rows
    .map((row) => {
      const phone = normalizePhone(row[phoneCol] ?? row["Phone"] ?? row["phone"] ?? row["Mobile"] ?? row["mobile"])
      const name = (nameCol ? row[nameCol] : row["Name"] ?? row["name"] ?? "") || ""
      return { phone: phone.trim(), name: String(name).trim() }
    })
    .filter((c) => c.phone.length >= 10)
}

const ExcelSendModal = ({ open, onClose, templates = [], onListCreated }) => {
  const [activeStep, setActiveStep] = useState(0)
  const [file, setFile] = useState(null)
  const [contacts, setContacts] = useState([])
  const [listName, setListName] = useState("")
  const [savedListId, setSavedListId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [parameterValues, setParameterValues] = useState({})

  const reset = useCallback(() => {
    setActiveStep(0)
    setFile(null)
    setContacts([])
    setListName("")
    setSavedListId(null)
    setError(null)
    setSelectedTemplate(null)
    setParameterValues({})
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileChange = async (e) => {
    const f = e.target?.files?.[0]
    if (!f) return
    setError(null)
    setLoading(true)
    try {
      let rows
      if (f.name.endsWith(".csv")) {
        const text = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result)
          r.onerror = rej
          r.readAsText(f, "UTF-8")
        })
        const wb = XLSX.read(text, { type: "string", raw: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json(ws, { defval: "" })
      } else {
        rows = await parseFile(f)
      }
      const extracted = extractContacts(rows)
      if (extracted.length === 0) {
        setError("No valid phone numbers found. Use columns: Phone / Mobile / Number (10 digits). Optional: Name")
        setContacts([])
        setFile(null)
      } else {
        setContacts(extracted)
        setFile(f)
        setListName(f.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "_").slice(0, 50))
      }
    } catch (err) {
      setError(err?.message || "Failed to parse file. Use .xlsx, .xls or .csv with Phone/Mobile column.")
      setContacts([])
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToList = async () => {
    if (!listName.trim()) {
      setError("Enter a list name")
      return
    }
    if (contacts.length === 0) {
      setError("No contacts to save")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.WHATSAPP_CONTACT_LIST.CREATE)
      const response = await instance.request({
        name: listName.trim(),
        description: `Uploaded from ${file?.name || "file"}`,
        contacts: contacts.map((c) => ({ phone: c.phone, name: c.name })),
        source: "excel"
      })
      const listId = response?.data?.data?._id || response?.data?.data?.id
      if (listId) {
        setSavedListId(listId)
        setActiveStep(1)
        onListCreated?.()
      } else {
        setError(response?.data?.message || "Failed to save list")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to save list")
    } finally {
      setLoading(false)
    }
  }

  const getLanguageCode = (template) => {
    if (template?.language?.value) return template.language.value
    if (template?.language?.code) return template.language.code
    return "en"
  }

  const extractVariables = (template) => {
    if (!template) return []
    if (template?.customParams?.length) return template.customParams.map((p) => p.paramName)
    const content = template?.bodyOriginal || template?.body || template?.content || ""
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map((m) => m.replace(/\{\{|\}\}/g, "")) : []
  }

  const handleSendMessage = async () => {
    if (!selectedTemplate) {
      setError("Select a template")
      return
    }
    const vars = extractVariables(selectedTemplate)
    const parameters = vars.map((variable, index) => ({
      name: variable,
      value: parameterValues[index] ?? ""
    }))
    const watiContacts = contacts.map((c) => ({
      whatsappMsisdn: c.phone.startsWith("+") ? c.phone.slice(1).replace(/\D/g, "") : c.phone,
      name: c.name || ""
    }))
    setSending(true)
    setError(null)
    try {
      const response = await sendTemplateMessages({
        templateName: selectedTemplate.elementName || selectedTemplate.name,
        broadcastName: `Excel_${listName}_${Date.now()}`,
        languageCode: getLanguageCode(selectedTemplate),
        channelNumber: "917276386452",
        parameters,
        contacts: watiContacts
      })
      if (response.success) {
        setError(null)
        alert(`Message sent to ${contacts.length} contacts.`)
        handleClose()
      } else {
        setError(response.error || "Failed to send")
      }
    } catch (err) {
      setError(err?.message || "Failed to send messages")
    } finally {
      setSending(false)
    }
  }

  const steps = ["Upload Excel", "Save to DB", "Send Message"]
  const approvedTemplates = (templates || []).filter((t) => t.status === "APPROVED")

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FileSpreadsheet size={24} />
        Send from Excel
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ my: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload .xlsx, .xls or .csv with a <strong>Phone</strong> / <strong>Mobile</strong> / <strong>Number</strong> column (10 digits). Optional: <strong>Name</strong> column.
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={loading ? <CircularProgress size={18} /> : <Upload size={18} />}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              {file ? file.name : "Choose file"}
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </Button>
            {contacts.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>{contacts.length}</strong> valid contacts found.
                </Typography>
                <TextField
                  fullWidth
                  label="List name (save to database)"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Name</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {contacts.slice(0, 10).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{c.phone}</TableCell>
                          <TableCell>{c.name || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {contacts.length > 10 && (
                  <Typography variant="caption" color="text.secondary">
                    Showing first 10 of {contacts.length}
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              List &quot;{listName}&quot; saved. Choose a template and send to <strong>{contacts.length}</strong> contacts.
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Template</InputLabel>
              <Select
                value={selectedTemplate?.id ?? ""}
                label="Template"
                onChange={(e) => {
                  const t = approvedTemplates.find((x) => (x.id || x.elementName) === e.target.value)
                  setSelectedTemplate(t || null)
                  if (t) {
                    const vars = extractVariables(t)
                    const init = {}
                    vars.forEach((v, i) => { init[i] = "" })
                    setParameterValues(init)
                  }
                }}
              >
                {approvedTemplates.map((t) => (
                  <MenuItem key={t.id || t.elementName} value={t.id || t.elementName}>
                    {t.elementName || t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedTemplate && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {extractVariables(selectedTemplate).map((variable, index) => (
                  <TextField
                    key={variable}
                    label={variable}
                    size="small"
                    fullWidth
                    value={parameterValues[index] ?? ""}
                    onChange={(e) => setParameterValues((p) => ({ ...p, [index]: e.target.value }))}
                  />
                ))}
              </Stack>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button startIcon={<X size={18} />} onClick={handleClose}>
          Cancel
        </Button>
        {activeStep === 0 && (
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
            onClick={handleSaveToList}
            disabled={contacts.length === 0 || !listName.trim() || loading}
          >
            Save to database
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
            onClick={handleSendMessage}
            disabled={!selectedTemplate || sending}
          >
            Send message
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default ExcelSendModal
