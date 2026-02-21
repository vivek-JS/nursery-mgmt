import React from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, Box, Pagination, TextField } from "@mui/material"
import { NetworkManager, API } from "network/core"
import { getCampaignTargets } from "network/whatsappAutomation"

const CampaignDetailModal = ({ open, onClose, campaign, onStart }) => {
  const [targets, setTargets] = React.useState([])
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(50)
  const [total, setTotal] = React.useState(0)
  const [ratePer2Min, setRatePer2Min] = React.useState(1)
  const [sending, setSending] = React.useState(false)

  React.useEffect(() => {
    if (!campaign) return
    const fetchTargets = async () => {
      const res = await getCampaignTargets(campaign._id, page, limit)
      if (res && res.success && res.data) {
        setTargets(res.data.targets || [])
        setTotal(res.data.total || 0)
      } else if (res && res.targets) {
        setTargets(res.targets || [])
        setTotal(res.total || 0)
      } else {
        setTargets([])
        setTotal(0)
      }
    }
    fetchTargets()
  }, [campaign, page])

  if (!campaign) return null
  const handleStart = async () => {
    setSending(true)
    try {
      const instance = NetworkManager(API.CAMPAIGN.START)
      await instance.request({ ratePer2Min }, [campaign._id])
      onStart && onStart()
      onClose && onClose()
    } catch (e) {
      alert("Failed to start campaign: " + (e?.message || "error"))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Campaign: {campaign.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{campaign.message}</Typography>
        <Typography variant="subtitle2">Recipients ({total || (campaign.recipientsCount || (campaign.targets||[]).length)})</Typography>
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(targets || []).map((t, i) => (
                <TableRow key={t.farmerId || t.phone || i}>
                  <TableCell>{(page-1)*limit + i + 1}</TableCell>
                  <TableCell>{t.name || "-"}</TableCell>
                  <TableCell>{t.phone}</TableCell>
                  <TableCell>{t.status || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination count={Math.ceil((total || 0) / limit) || 1} page={page} onChange={(_,v)=>setPage(v)} />
        </Box>
        <TextField
          label="Messages per 2 minutes"
          type="number"
          value={ratePer2Min}
          onChange={(e) => setRatePer2Min(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
          inputProps={{ min: 1, max: 30 }}
          helperText="1 = 1 message every 2 min (WhatsApp Web Selenium)"
          fullWidth
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" color="success" onClick={handleStart} disabled={sending}>
          {sending ? "Starting…" : "Send to all farmers"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CampaignDetailModal

