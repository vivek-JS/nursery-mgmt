import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  CircularProgress,
  Box,
  Typography,
  Stack,
  Alert
} from "@mui/material"
import { NetworkManager, API } from "network/core"

const ContactListImporter = ({ open, onClose, onExtracted }) => {
  const [lists, setLists] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      fetchLists()
      setSelected([])
      setResult(null)
      setError(null)
    }
  }, [open])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.WHATSAPP_CONTACT_LIST.GET_ALL)
      const res = await instance.request()
      const data = res?.data?.data || res?.data || []
      setLists(data)
    } catch (e) {
      console.error("Failed to fetch contact lists", e)
      setLists([])
      setError("Failed to fetch contact lists")
    } finally {
      setLoading(false)
    }
  }

  const handleExtract = async () => {
    if (!selected.length) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const aggregated = { created: [], existing: [], errors: [] }
      for (const id of selected) {
        try {
          const instance = NetworkManager({ ...API.WHATSAPP_CONTACT_LIST.GET_ALL, endpoint: `whatsapp-contact-list/${id}/extract-farmers` })
          // our route is POST /api/v1/whatsapp-contact-list/:id/extract-farmers but NetworkManager urlBuilder will append param
          const resp = await instance.request(null, [id])
          const data = resp?.data || resp
          // Normalize response structure
          const payload = data?.data || data
          if (payload) {
            aggregated.created.push(...(payload.created || []))
            aggregated.existing.push(...(payload.existing || []))
            aggregated.errors.push(...(payload.errors || []))
          }
        } catch (e) {
          console.error("Extract failed for list", id, e)
          aggregated.errors.push({ listId: id, reason: e?.message || "failed" })
        }
      }
      setResult(aggregated)
      onExtracted && onExtracted()
    } catch (e) {
      setError("Extraction failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import Farmers from Contact Lists</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && !lists.length ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select Contact Lists</InputLabel>
              <Select
                multiple
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                renderValue={(v) => `${v.length} selected`}
              >
                {lists.map((l) => (
                  <MenuItem key={l._id} value={l._id}>
                    <Checkbox checked={selected.indexOf(l._id) > -1} />
                    <ListItemText primary={`${l.name} (${l.contacts?.length || 0})`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selecting lists will create or find Farmers for each contact (by phone). Duplicates are skipped.
            </Typography>
            {result && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Result</Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Typography>Created: {result.created.length}</Typography>
                  <Typography>Existing: {result.existing.length}</Typography>
                  <Typography>Errors: {result.errors.length}</Typography>
                </Stack>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleExtract} disabled={loading || selected.length === 0}>
          {loading ? "Processing..." : "Extract Farmers"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ContactListImporter

