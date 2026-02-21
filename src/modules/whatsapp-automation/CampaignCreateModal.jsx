import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Typography,
  Autocomplete,
  Chip,
  Checkbox,
  Box
} from "@mui/material"
import { createCampaign } from "network/whatsappAutomation"
import { API, NetworkManager } from "network/core"
import * as XLSX from "xlsx"
import SendIcon from "@mui/icons-material/Send"
import CloudUploadIcon from "@mui/icons-material/CloudUpload"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"

const CampaignCreateModal = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState("")
  const [message, setMessage] = useState("")
  const [videoFile, setVideoFile] = useState(null)
  const [status, setStatus] = useState({ loading: false, error: null, success: null })

  const handleFile = (e) => {
    setVideoFile(e.target.files?.[0] || null)
  }
  const [excelFile, setExcelFile] = useState(null)
  const handleExcel = (e) => {
    setExcelFile(e.target.files?.[0] || null)
  }
  const [parsedContacts, setParsedContacts] = useState([])
  const [savedLists, setSavedLists] = useState([])
  const [selectedListIds, setSelectedListIds] = useState([])
  const [importedFarmers, setImportedFarmers] = useState([]) // { farmerId, phone, name }
  const [selectedImportedIds, setSelectedImportedIds] = useState([])

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

  function normalizePhone(phone) {
    if (phone == null) return ""
    const s = String(phone).replace(/\D/g, "")
    if (s.length === 10 && !s.startsWith("0")) return "91" + s
    if (s.length === 12 && s.startsWith("91")) return s
    return s
  }

  async function parseExcelFile(file) {
    if (!file) return []
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target.result
          const wb = file.name.endsWith(".csv")
            ? XLSX.read(data, { type: "string" })
            : XLSX.read(data, { type: "binary" })
          const firstSheet = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" })
          const PHONE_COLUMN_NAMES = ["phone", "mobile", "number", "contact", "whatsapp", "फोन"]
          const NAME_COLUMN_NAMES = ["name", "नाव", "farmer name", "customer name"]
          const first = rows[0] || {}
          const phoneCol = findColumn(first, PHONE_COLUMN_NAMES) || Object.keys(first)[0]
          const nameCol = findColumn(first, NAME_COLUMN_NAMES)
          const contacts = rows
            .map((row) => {
              const phone = normalizePhone(row[phoneCol] ?? row["Phone"] ?? row["phone"] ?? row["Mobile"] ?? row["mobile"])
              const name = (nameCol ? row[nameCol] : row["Name"] ?? row["name"] ?? "") || ""
              return { phone: phone.trim(), name: String(name).trim() }
            })
            .filter((c) => c.phone.length >= 10)
          resolve(contacts)
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

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setStatus({ loading: true, error: null, success: null })
    try {
      let res
      if (excelFile) {
        const form = new FormData()
        form.append("file", excelFile)
        form.append("name", name.trim() || `Campaign ${Date.now()}`)
        form.append("message", message.trim())
        const instance = NetworkManager(API.WHATSAPP_AUTOMATION.UPLOAD_AND_CREATE, true)
        res = await instance.request(form)
      } else {
        // If user has imported farmers, send their IDs to createCampaign
        const payload = { name: name.trim(), message: message.trim(), video: videoFile }
        if (selectedImportedIds && selectedImportedIds.length > 0) {
          payload.farmerIds = selectedImportedIds
        }
        res = await createCampaign(payload)
      }
      const ok = (res && res.success) || (res && (res.data?.campaignId || res.campaignId))
      if (ok) {
        setStatus({ loading: false, error: null, success: "Created" })
        setName(""); setMessage(""); setVideoFile(null); setExcelFile(null)
        onCreated && onCreated()
        onClose && onClose()
      } else {
        throw new Error(res?.message || "Create failed")
      }
    } catch (err) {
      setStatus({ loading: false, error: err?.message || "Request failed", success: null })
    }
  }

  // Fetch saved whatsapp contact lists
  const fetchSavedLists = async () => {
    try {
      const instance = NetworkManager(API.WHATSAPP_CONTACT_LIST.GET_ALL)
      const resp = await instance.request()
      const data = resp?.data?.data || resp?.data || []
      setSavedLists(data)
    } catch (e) {
      console.error("Failed to fetch saved contact lists", e)
      setSavedLists([])
    }
  }

  // Import farmers from selected saved lists (calls backend extract endpoint)
  const importFarmersFromLists = async () => {
    if (!selectedListIds || selectedListIds.length === 0) return
    const aggregated = []
    for (const id of selectedListIds) {
      try {
        const endpoint = { ...API.WHATSAPP_CONTACT_LIST.GET_ALL, endpoint: `whatsapp-contact-list/${id}/extract-farmers`, method: "POST" }
        const instance = NetworkManager(endpoint)
        const resp = await instance.request()
        const payload = resp?.data || resp
        const body = payload?.data || payload
        const created = body?.created || []
        const existing = body?.existing || []
        // created: [{ farmerId, phone }], existing: [{ farmerId, phone }]
        for (const c of [...created, ...existing]) {
          const key = String(c.farmerId || c._id || c.id || c.farmerId)
          if (!aggregated.find(x => String(x.farmerId) === key)) {
            aggregated.push({ farmerId: c.farmerId || c._id || c.id, phone: c.phone, name: c.name || "" })
          }
        }
      } catch (e) {
        console.error("Import failed for list", id, e)
      }
    }
    setImportedFarmers(aggregated)
    setSelectedImportedIds(aggregated.map(a => a.farmerId))
  }

  // Toggle selection of imported farmer
  const toggleImportedSelection = (farmerId) => {
    setSelectedImportedIds(prev => prev.includes(farmerId) ? prev.filter(id => id !== farmerId) : [...prev, farmerId])
  }

  // Load saved lists on open
  React.useEffect(() => {
    if (open) fetchSavedLists()
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create WhatsApp Campaign</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {status.error && <Alert severity="error">{status.error}</Alert>}
          <TextField label="Campaign Name" value={name} onChange={(e)=>setName(e.target.value)} fullWidth required />
          <TextField label="Message" value={message} onChange={(e)=>setMessage(e.target.value)} fullWidth multiline minRows={4} required />
          <input accept="video/*" type="file" onChange={handleFile} />
          <div>
            <label style={{ display: "block", marginTop: 8 }}>
              Upload Excel (optional — will create campaign targets)
              <input
                accept=".xlsx,.xls,.csv"
                type="file"
                onChange={(e) => {
                  handleExcel(e)
                  const f = e.target.files?.[0]
                  if (f) {
                    parseExcelFile(f).then(setParsedContacts).catch(() => setParsedContacts([]))
                  } else {
                    setParsedContacts([])
                  }
                }}
                style={{ display: "block", marginTop: 6 }}
              />
            </label>
          </div>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Or import from saved contact lists</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Autocomplete
                multiple
                fullWidth
                options={savedLists}
                getOptionLabel={(option) => `${option.name} (${option.contacts?.length || 0})`}
                value={savedLists.filter(l => selectedListIds.includes(l._id))}
                onChange={(e, newValue) => setSelectedListIds(newValue.map(v => v._id))}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox checked={selected} sx={{ mr: 1 }} />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{option.contacts?.length || 0} contacts</Typography>
                    </Box>
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip size="small" color="success" variant="outlined" label={option.name} {...getTagProps({ index })} key={option._id} />
                  ))
                }
                renderInput={(params) => <TextField {...params} size="small" label="Choose saved lists" placeholder="Search lists..." />}
              />
              <Button variant="contained" color="success" size="small" onClick={importFarmersFromLists} startIcon={<CloudUploadIcon />}>Import Farmers</Button>
            </Box>
          </Box>

          {importedFarmers && importedFarmers.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="subtitle2">Imported Farmers ({importedFarmers.length})</Typography>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Include</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importedFarmers.map((f, i) => (
                      <TableRow key={f.farmerId || i} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>{i+1}</TableCell>
                        <TableCell>{f.name || "—"}</TableCell>
                        <TableCell>{f.phone}</TableCell>
                        <TableCell>
                          <Checkbox checked={selectedImportedIds.includes(f.farmerId)} onChange={() => toggleImportedSelection(f.farmerId)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
          {parsedContacts && parsedContacts.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
              <Typography variant="subtitle2">Parsed contacts ({parsedContacts.length})</Typography>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Phone</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsedContacts.slice(0, 20).map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{c.name || "—"}</TableCell>
                        <TableCell>{c.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {parsedContacts.length > 20 && (
                <Typography variant="caption" color="text.secondary">
                  Showing first 20
                </Typography>
              )}
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success" onClick={handleSubmit} disabled={status.loading} startIcon={<SendIcon />}>
          {status.loading ? "Creating..." : "Create Campaign"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CampaignCreateModal

