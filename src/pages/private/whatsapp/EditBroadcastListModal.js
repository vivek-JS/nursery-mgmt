import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack
} from "@mui/material"
import { Save, X } from "lucide-react"
import { API, NetworkManager } from "network/core"

const EditBroadcastListModal = ({ open, onClose, list, onSaved }) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && list) {
      setName(list.name || "")
      setDescription(list.description ?? "")
      setError(null)
    }
  }, [open, list])

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("List name is required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (list.type === "farmer") {
        const endpoint = { ...API.FARMER_LIST.UPDATE_LIST, endpoint: `farmer-list/${list.id}` }
        const instance = NetworkManager(endpoint)
        await instance.request({ name: trimmedName, description: description.trim() })
      } else {
        const endpoint = { ...API.WHATSAPP_CONTACT_LIST.UPDATE, endpoint: `whatsapp-contact-list/${list.id}` }
        const instance = NetworkManager(endpoint)
        await instance.request({ name: trimmedName, description: description.trim() })
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to update list")
    } finally {
      setSaving(false)
    }
  }

  if (!list) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit list: {list.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<X size={18} />} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
          onClick={handleSave}
          disabled={saving}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EditBroadcastListModal
