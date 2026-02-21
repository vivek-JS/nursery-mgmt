import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material"
import { Send, X } from "lucide-react"
import { sendTemplateMessages } from "network/core/wati"
import { API, NetworkManager } from "network/core"

const SendToListModal = ({ open, onClose, listId, listName, templates = [], onSent }) => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [parameterValues, setParameterValues] = useState({})

  useEffect(() => {
    if (!open || !listId) return
    setError(null)
    setContacts([])
    setSelectedTemplate(null)
    setParameterValues({})
    const fetchList = async () => {
      setLoading(true)
      try {
        const endpoint = { ...API.WHATSAPP_CONTACT_LIST.GET_BY_ID, endpoint: `whatsapp-contact-list/${listId}` }
        const instance = NetworkManager(endpoint)
        const response = await instance.request()
        const list = response?.data?.data
        if (list?.contacts) setContacts(list.contacts)
        else setError("List not found")
      } catch (err) {
        setError(err?.message || "Failed to load list")
      } finally {
        setLoading(false)
      }
    }
    fetchList()
  }, [open, listId])

  const getLanguageCode = (t) => (t?.language?.value || t?.language?.code || "en")
  const extractVariables = (t) => {
    if (!t) return []
    if (t?.customParams?.length) return t.customParams.map((p) => p.paramName)
    const content = t?.bodyOriginal || t?.body || t?.content || ""
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map((m) => m.replace(/\{\{|\}\}/g, "")) : []
  }

  const handleSend = async () => {
    if (!selectedTemplate || contacts.length === 0) {
      setError("Select a template and ensure list has contacts.")
      return
    }
    const vars = extractVariables(selectedTemplate)
    const parameters = vars.map((variable, index) => ({
      name: variable,
      value: parameterValues[index] ?? ""
    }))
    const watiContacts = contacts.map((c) => ({
      whatsappMsisdn: String(c.phone).replace(/\D/g, "").replace(/^0+/, "").replace(/^(\d{10})$/, "91$1"),
      name: c.name || ""
    }))
    setSending(true)
    setError(null)
    try {
      const response = await sendTemplateMessages({
        templateName: selectedTemplate.elementName || selectedTemplate.name,
        broadcastName: `List_${listName}_${Date.now()}`,
        languageCode: getLanguageCode(selectedTemplate),
        channelNumber: "917276386452",
        parameters,
        contacts: watiContacts
      })
      if (response.success) {
        alert(`Message sent to ${contacts.length} contacts.`)
        onSent?.()
        onClose()
      } else {
        setError(response.error || "Failed to send")
      }
    } catch (err) {
      setError(err?.message || "Failed to send messages")
    } finally {
      setSending(false)
    }
  }

  const approvedTemplates = (templates || []).filter((t) => t.status === "APPROVED")

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Send to list: {listName}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading contacts...
            </Typography>
          </Stack>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {contacts.length} contacts. Choose a template and fill parameters.
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
                    setParameterValues(Object.fromEntries(vars.map((v, i) => [i, ""])))
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
            {selectedTemplate &&
              extractVariables(selectedTemplate).map((variable, index) => (
                <TextField
                  key={variable}
                  label={variable}
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                  value={parameterValues[index] ?? ""}
                  onChange={(e) =>
                    setParameterValues((p) => ({ ...p, [index]: e.target.value }))
                  }
                />
              ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<X size={18} />} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
          onClick={handleSend}
          disabled={loading || sending || !selectedTemplate || contacts.length === 0}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SendToListModal
