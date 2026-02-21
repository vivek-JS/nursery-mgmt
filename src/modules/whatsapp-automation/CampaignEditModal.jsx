import React, { useState, useEffect } from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, Checkbox } from "@mui/material"
import { NetworkManager, API } from "network/core"

const CampaignEditModal = ({ open, onClose, campaign, onSaved }) => {
  const [name, setName] = useState(campaign?.name || "")
  const [message, setMessage] = useState(campaign?.message || "")
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState(campaign?.targets || [])
  const [selectedTargets, setSelectedTargets] = useState([])

  useEffect(() => {
    setTargets(campaign?.targets || [])
    setSelectedTargets([])
  }, [campaign])

  React.useEffect(() => {
    setName(campaign?.name || "")
    setMessage(campaign?.message || "")
  }, [campaign])

  const handleSave = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.CAMPAIGN.UPDATE)
      await instance.request({ name, message }, [campaign._id])
      onSaved && onSaved()
      onClose && onClose()
    } catch (e) {
      alert("Failed to save: " + (e?.message || "error"))
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectTarget = (tId) => {
    setSelectedTargets(prev => prev.includes(tId) ? prev.filter(x => x !== tId) : [...prev, tId])
  }

  const markSelectedAs = async (status) => {
    if (!campaign || !selectedTargets.length) return
    setLoading(true)
    try {
      const instance = NetworkManager(API.CAMPAIGN.UPDATE_TARGETS)
      await instance.request({ targetIds: selectedTargets, status }, [campaign._id])
      // update UI
      setTargets(prev => prev.map(t => selectedTargets.includes(String(t._id || t.id)) ? { ...t, status } : t))
      setSelectedTargets([])
    } catch (e) {
      alert("Failed to update targets: " + (e?.message || "error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Campaign</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Campaign Name" value={name} onChange={(e)=>setName(e.target.value)} fullWidth />
          <TextField label="Message" value={message} onChange={(e)=>setMessage(e.target.value)} fullWidth multiline minRows={4} />
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Targets ({targets.length})</Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 240 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Include</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {targets.map((t, i) => (
                  <TableRow key={t._id || t.id || i} hover>
                    <TableCell>{i+1}</TableCell>
                    <TableCell>{t.name || "-"}</TableCell>
                    <TableCell>{t.phone || t.phoneNumber || "-"}</TableCell>
                    <TableCell>{t.status || "-"}</TableCell>
                    <TableCell>
                      <Checkbox checked={selectedTargets.includes(String(t._id || t.id))} onChange={() => toggleSelectTarget(String(t._id || t.id))} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => markSelectedAs("sent")} disabled={!selectedTargets.length}>Mark Sent</Button>
            <Button size="small" onClick={() => markSelectedAs("failed")} disabled={!selectedTargets.length}>Mark Failed</Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={loading} onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

export default CampaignEditModal

