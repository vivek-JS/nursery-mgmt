import React, { useEffect, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from "@mui/material"
import { getCampaigns } from "network/whatsappAutomation"
import { API, NetworkManager } from "network/core"
import { APIConfig } from "network/config/serverConfig"
import CampaignCreateModal from "./CampaignCreateModal"
import ContactListImporter from "./ContactListImporter"
import ExcelSendModal from "pages/private/whatsapp/ExcelSendModal"
import CampaignDetailModal from "./CampaignDetailModal"
import CampaignEditModal from "./CampaignEditModal"

const CampaignList = () => {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [showImporter, setShowImporter] = useState(false)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [viewCampaign, setViewCampaign] = useState(null)
  const [editCampaign, setEditCampaign] = useState(null)
  const [sendAllCampaign, setSendAllCampaign] = useState(null)
  const [delaySeconds, setDelaySeconds] = useState(10)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [resumeMode, setResumeMode] = useState(false)

  const fetch = async (p = page) => {
    setLoading(true)
    try {
      const res = await getCampaigns({ page: p, limit })
      if (res && res.success && res.data) {
        setCampaigns(res.data.campaigns || [])
        setTotal(res.data.total || 0)
      } else if (res && res.page !== undefined) {
        // custom response
        setCampaigns(res.campaigns || [])
        setTotal(res.total || 0)
      } else {
        setCampaigns([])
        setTotal(0)
      }
    } catch (err) {
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch(page) }, [page])

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">WhatsApp Campaigns</Typography>
            <Button variant="contained" onClick={() => setShowCreate(true)}>Create Campaign</Button>
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : campaigns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No campaigns yet.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Video</TableCell>
                  <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c._id || c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.message}</TableCell>
                      <TableCell>{c.videoFilename || c.video || "-"}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                        <Button size="small" onClick={() => setViewCampaign(c)}>View</Button>
                        <Button size="small" onClick={() => setEditCampaign(c)}>Edit</Button>
                        <Button size="small" color="success" onClick={() => {
                          setSendAllCampaign(c)
                          setDelaySeconds(10)
                          setSendError(null)
                          setResumeMode(false)
                        }}>Send All</Button>
                        <Button size="small" color="error" onClick={async () => {
                          try {
                            const instance = NetworkManager(API.CAMPAIGN.STOP)
                            const res = await instance.request({}, [c._id])
                            if (res && res.success !== false) fetch()
                          } catch (e) {
                            console.error("Stop failed:", e)
                          }
                        }}>Stop</Button>
                        <Button size="small" color="info" onClick={() => {
                          setSendAllCampaign(c)
                          setDelaySeconds(10)
                          setSendError(null)
                          setResumeMode(true)
                        }}>Resume</Button>
                        <Button size="small" color="warning" onClick={async () => {
                          try {
                            const instance = NetworkManager(API.CAMPAIGN.RESET_TARGETS)
                            const res = await instance.request({}, [c._id])
                            if (res && res.success !== false) fetch()
                          } catch (e) {
                            console.error("Reset failed:", e)
                          }
                        }}>Reset</Button>
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

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => setShowImporter(true)}>Import Farmers</Button>
        <Button variant="outlined" onClick={() => setShowExcelModal(true)}>Upload Excel</Button>
        <Button variant="contained" onClick={() => setShowCreate(true)}>Create Campaign</Button>
      </Stack>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Pagination count={Math.ceil(total / limit) || 1} page={page} onChange={(_,v)=>setPage(v)} />
      </Box>

      <CampaignCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetch}
      />

      <ContactListImporter
        open={showImporter}
        onClose={() => setShowImporter(false)}
        onExtracted={() => { fetch(); setShowImporter(false) }}
      />

      <ExcelSendModal
        open={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        templates={[]}
        onListCreated={() => { fetch(); setShowExcelModal(false) }}
      />
      <CampaignDetailModal
        open={!!viewCampaign}
        onClose={() => setViewCampaign(null)}
        campaign={viewCampaign}
        onStart={() => fetch()}
      />
      <CampaignEditModal
        open={!!editCampaign}
        onClose={() => setEditCampaign(null)}
        campaign={editCampaign}
        onSaved={() => { fetch(); setEditCampaign(null) }}
      />

      <Dialog open={!!sendAllCampaign} onClose={() => !sending && (setSendAllCampaign(null), setResumeMode(false))} maxWidth="xs" fullWidth>
        <DialogTitle>{resumeMode ? "Resume Campaign" : "Send All via WhatsApp Web"}</DialogTitle>
        <DialogContent>
          {sendError && <Alert severity="error" sx={{ mb: 2 }}>{sendError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {resumeMode ? "Resets failed + skipped to pending, then sends. Closes any running campaign first." : "Uses Selenium to automate WhatsApp Web. Chrome will open; ensure WhatsApp Web is logged in."}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Production? Download Campaign Runner, run on a computer with Chrome, keep it open.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            href={`${APIConfig.BASE_URL.replace(/\/+$/, "")}/campaign-worker/download`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 2 }}
          >
            Download Campaign Runner
          </Button>
          <TextField
            label="Seconds between messages"
            type="number"
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Math.max(1, Math.min(300, Number(e.target.value) || 10)))}
            inputProps={{ min: 1, max: 300 }}
            helperText="e.g. 10 = send one message every 10 seconds"
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => !sending && setSendAllCampaign(null)} disabled={sending}>Cancel</Button>
          {sendError && (sendError.includes("No pending targets") || sendError.includes("already been sent") || sendError.includes("No targets to resume")) && (
            <Button
              variant="outlined"
              color="warning"
              onClick={async () => {
                if (!sendAllCampaign) return
                setSending(true)
                setSendError(null)
                try {
                  const resetInstance = NetworkManager(API.CAMPAIGN.RESET_TARGETS)
                  const resetRes = await resetInstance.request({}, [sendAllCampaign._id])
                  if (resetRes && resetRes.success !== false) {
                    const runInstance = NetworkManager(resumeMode ? API.CAMPAIGN.RESUME_WEB : API.CAMPAIGN.RUN_NOW)
                    const runRes = await runInstance.request({ delaySeconds }, [sendAllCampaign._id])
                    if (runRes && runRes.success !== false) {
                      setSendAllCampaign(null)
                      fetch()
                    } else {
                      setSendError(runRes?.message || "Failed to start campaign")
                    }
                  } else {
                    setSendError(resetRes?.message || "Failed to reset targets")
                  }
                } catch (e) {
                  setSendError(e?.message || "Failed")
                } finally {
                  setSending(false)
                }
              }}
              disabled={sending}
            >
              {sending ? "Resetting…" : "Reset & Send All"}
            </Button>
          )}
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              if (!sendAllCampaign) return
              setSending(true)
              setSendError(null)
              try {
                const instance = NetworkManager(resumeMode ? API.CAMPAIGN.RESUME_WEB : API.CAMPAIGN.RUN_NOW)
                const res = await instance.request({ delaySeconds }, [sendAllCampaign._id])
                if (res && res.success !== false) {
                  setSendAllCampaign(null)
                  fetch()
                } else {
                  setSendError(res?.message || "Failed to start campaign")
                }
              } catch (e) {
                setSendError(e?.message || "Failed to start campaign")
              } finally {
                setSending(false)
              }
            }}
            disabled={sending}
          >
            {sending ? "Starting…" : resumeMode ? "Resume & Send" : "Send All"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CampaignList

