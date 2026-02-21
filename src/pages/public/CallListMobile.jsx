import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  alpha,
  LinearProgress,
} from "@mui/material"
import { Phone, CheckCircle, MapPin, Smartphone } from "lucide-react"
import { Stack } from "@mui/material"
import axiosInstance from "services/axiosConfig"

const STORAGE_KEY = (id, token) => `call-list-auth-${id}-${token}`

const CallListMobile = () => {
  const { id, token } = useParams()
  const [verifiedPhone, setVerifiedPhone] = useState(null)
  const [phoneInput, setPhoneInput] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logEntryIndex, setLogEntryIndex] = useState(null)
  const [remark, setRemark] = useState("")
  const [result, setResult] = useState("done")
  const [followUpScheduledAt, setFollowUpScheduledAt] = useState("")
  const [followUpAssignTo, setFollowUpAssignTo] = useState("")
  const [followUpNotes, setFollowUpNotes] = useState("")
  const [employeesList, setEmployeesList] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showFollowupsFor, setShowFollowupsFor] = useState(null)
  const [manageFollowup, setManageFollowup] = useState(null)

  const fetchList = async (phone) => {
    if (!phone) return
    setLoading(true)
    setError(null)
    try {
      const res = await axiosInstance.get(`call-list/${id}/${token}`, {
        params: { phone: String(phone).replace(/\D/g, "").slice(-10) },
      })
      const d = res?.data?.data ?? res?.data
      if (d?.list) {
        setList(d.list)
        setVerifiedPhone(phone)
        setEmployeesList(d.list.employees || [])
        try {
          localStorage.setItem(STORAGE_KEY(id, token), String(phone).replace(/\D/g, "").slice(-10))
        } catch { /* localStorage may be unavailable */ }
      } else setError("List not found")
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to load list"
      const code = e?.response?.data?.error?.code
      if (code === "LINK_EXPIRED") {
        setList(null)
        setVerifiedPhone(null)
        setError("This link has expired (valid for 18 hours). Please request a new link.")
        try {
          localStorage.removeItem(STORAGE_KEY(id, token))
        } catch { /* localStorage may be unavailable */ }
      } else if (code === "PHONE_REQUIRED" || e?.response?.status === 403) {
        setError(null)
        setPhoneError("Mobile number does not match. Enter the assigned employee's number.")
        try {
          localStorage.removeItem(STORAGE_KEY(id, token))
        } catch { /* localStorage may be unavailable */ }
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id || !token) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY(id, token))
      if (saved && saved.length >= 10) {
        setVerifiedPhone(saved)
        fetchList(saved)
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }, [id, token])

  const handlePhoneSubmit = (e) => {
    e?.preventDefault()
    const cleaned = String(phoneInput || "").replace(/\D/g, "")
    if (cleaned.length < 10) {
      setPhoneError("Enter a valid 10-digit mobile number")
      return
    }
    setPhoneError("")
    setVerifying(true)
    fetchList(cleaned).finally(() => setVerifying(false))
  }

  const handleUseDifferentNumber = () => {
    try {
      localStorage.removeItem(STORAGE_KEY(id, token))
    } catch { /* ignore */ }
    setVerifiedPhone(null)
    setList(null)
    setPhoneInput("")
    setPhoneError("")
  }

  const openLog = (idx) => {
    setLogEntryIndex(idx)
    setRemark("")
    setResult("done")
    setFollowUpScheduledAt("")
    setFollowUpAssignTo("")
    setFollowUpNotes("")
    setLogOpen(true)
  }

  const submitLog = async () => {
    if (logEntryIndex == null || !verifiedPhone) return
    setSubmitting(true)
    try {
      const payload = {
        entryIndex: logEntryIndex,
        remark,
        result,
        phone: String(verifiedPhone).replace(/\D/g, "").slice(-10),
      }
      if (result === "followup") {
        payload.followUpScheduledAt = followUpScheduledAt
        payload.followUpAssignTo = followUpAssignTo
        payload.followUpNotes = followUpNotes
      }
      await axiosInstance.post(`call-list/${id}/${token}/call-log`, payload)
      setLogOpen(false)
      fetchList(verifiedPhone)
    } catch (e) {
      const code = e?.response?.data?.error?.code
      if (code === "LINK_EXPIRED") {
        setList(null)
        setError("This link has expired (valid for 18 hours). Please request a new link.")
        try {
          localStorage.removeItem(STORAGE_KEY(id, token))
        } catch { /* localStorage may be unavailable */ }
        setLogOpen(false)
      } else if (e?.response?.status === 403) {
        handleUseDifferentNumber()
      }
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const tel = (phone) => {
    const p = String(phone || "").replace(/\D/g, "")
    return p.length >= 10 ? `tel:+91${p}` : "#"
  }

  if (loading && !list) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3 }}>
        <LinearProgress sx={{ width: "100%", maxWidth: 200, borderRadius: 1 }} />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading...
        </Typography>
      </Box>
    )
  }

  if (!verifiedPhone && !list) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          background: "linear-gradient(180deg, rgba(25, 118, 210, 0.06) 0%, transparent 200px)",
        }}
      >
        <Card sx={{ maxWidth: 360, width: "100%", borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha("#1976d2", 0.1) }}>
                <Smartphone size={32} style={{ color: "#1976d2" }} />
              </Box>
            </Box>
            <Typography variant="h6" fontWeight={700} align="center" sx={{ mb: 0.5 }}>
              Enter your mobile number
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Must match the assigned employee&apos;s number to access this list
            </Typography>
            <form onSubmit={handlePhoneSubmit}>
              <TextField
                fullWidth
                type="tel"
                placeholder="10-digit mobile number"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))
                  setPhoneError("")
                }}
                error={!!phoneError}
                helperText={phoneError}
                inputProps={{ maxLength: 10, inputMode: "numeric", pattern: "[0-9]*" }}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handlePhoneSubmit}
                disabled={verifying || String(phoneInput).replace(/\D/g, "").length < 10}
                sx={{ borderRadius: 2, py: 1.5, fontWeight: 600 }}
              >
                {verifying ? "Verifying..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (error && !list) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Box>
    )
  }

  const entries = list?.entries || []
  const done = list?.done || 0
  const total = list?.total || entries.length
  const progress = total > 0 ? (done / total) * 100 : 0

  const LocationLine = ({ village, taluka, district, stateName }) => {
    const parts = [village, taluka, district, stateName].filter(Boolean)
    if (parts.length === 0) return null
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
        <MapPin size={14} style={{ color: "inherit", opacity: 0.7 }} />
        <Typography variant="caption" color="text.secondary">
          {parts.join(" • ")}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: "max(16px, env(safe-area-inset-bottom))",
        maxWidth: 480,
        mx: "auto",
        bgcolor: "background.default",
        background: "linear-gradient(180deg, rgba(25, 118, 210, 0.04) 0%, transparent 120px)",
      }}
    >
      <Box sx={{ p: 2, pt: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
              {list?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="button" onClick={handleUseDifferentNumber} sx={{ border: 0, background: "none", cursor: "pointer", textDecoration: "underline" }}>
              Use different number
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2, mt: 1 }}>
          <Chip
            size="small"
            label={`${done} done`}
            sx={{ bgcolor: alpha("#2e7d32", 0.12), color: "#1b5e20", fontWeight: 600 }}
            icon={<CheckCircle size={14} />}
          />
          <Chip size="small" label={`${list?.pending || 0} pending`} variant="outlined" />
        </Box>
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 3, bgcolor: alpha("#1976d2", 0.1), "& .MuiLinearProgress-bar": { borderRadius: 3 } }}
          />
        </Box>
      </Box>

      <Box sx={{ px: 2 }}>
        {entries.map((e, idx) => (
          <Card
            key={idx}
            sx={{
              mb: 1.5,
              borderRadius: 2,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              overflow: "hidden",
              border: "1px solid",
              borderColor: e.status === "done" ? alpha("#2e7d32", 0.3) : "divider",
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>{e.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.9rem" }}>
                    {e.phone}
                  </Typography>
                  <LocationLine village={e.village} taluka={e.taluka} district={e.district} stateName={e.stateName} />
                </Box>
                {e.status === "done" ? (
                  <Chip
                    size="small"
                    label="Done"
                    sx={{ bgcolor: alpha("#2e7d32", 0.12), color: "#1b5e20", fontWeight: 600 }}
                    icon={<CheckCircle size={14} />}
                  />
                ) : (
                  <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
                    <Button
                      component="a"
                      href={tel(e.phone)}
                      size="small"
                      variant="contained"
                      startIcon={<Phone size={18} />}
                      sx={{
                        minWidth: 100,
                        textTransform: "none",
                        fontWeight: 600,
                        borderRadius: 2,
                        py: 1,
                        boxShadow: "0 2px 8px rgba(25, 118, 210, 0.35)",
                      }}
                    >
                      Call
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openLog(idx)}
                      sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, py: 1 }}
                    >
                      Done
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        // open quick follow-up dialog pre-filled
                        openLog(idx)
                        setResult("followup")
                        // default follow-up schedule: next day 10:00
                        const d = new Date()
                        d.setDate(d.getDate() + 1)
                        d.setHours(10, 0, 0, 0)
                        setFollowUpScheduledAt(d.toISOString().slice(0,16))
                      }}
                      sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, py: 1 }}
                    >
                      Follow-up
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
        {/* Inline follow-ups panel */}
        {typeof showFollowupsFor === "number" && list?.entries?.[showFollowupsFor] && (
          <Box sx={{ px: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Follow-ups for {list.entries[showFollowupsFor].name}
            </Typography>
            { (list.followUpsByFarmer && list.followUpsByFarmer[list.entries[showFollowupsFor].sourceId]) ? (
              list.followUpsByFarmer[list.entries[showFollowupsFor].sourceId].map((fu) => (
                <Card key={fu._id} sx={{ mb: 1, p: 1 }}>
                  <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>{new Date(fu.scheduledAt).toLocaleString()}</Typography>
                        <Typography variant="body2" color="text.secondary">{fu.notes}</Typography>
                        <Typography variant="caption" color="text.secondary">Status: {fu.status}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {fu.status !== "completed" && (
                          <>
                            <Button size="small" onClick={() => setManageFollowup({ action: "reschedule", followUp: fu })}>Reschedule</Button>
                            <Button size="small" onClick={() => setManageFollowup({ action: "complete", followUp: fu })}>Mark Complete</Button>
                          </>
                        )}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary">No follow-ups</Typography>
            )}
            <Button size="small" onClick={() => setShowFollowupsFor(null)} sx={{ mt: 1 }}>Close</Button>
          </Box>
        )}
      </Box>

      <Dialog open={logOpen} onClose={() => setLogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2, m: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Call done</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Result</InputLabel>
            <Select value={result} onChange={(e) => setResult(e.target.value)} label="Result">
              <MenuItem value="done">Done</MenuItem>
              <MenuItem value="connected">Connected</MenuItem>
              <MenuItem value="no_answer">No answer</MenuItem>
              <MenuItem value="not_interested">Not interested</MenuItem>
              <MenuItem value="callback">Callback</MenuItem>
              <MenuItem value="followup">Schedule follow-up</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="Remark" multiline rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add notes..." sx={{ mb: 2 }} />
          {result === "followup" && (
            <>
              <TextField
                fullWidth
                label="Follow-up date & time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={followUpScheduledAt}
                onChange={(e) => setFollowUpScheduledAt(e.target.value)}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Assign to</InputLabel>
                <Select value={followUpAssignTo} onChange={(e) => setFollowUpAssignTo(e.target.value)} label="Assign to">
                  <MenuItem value="">{list.assignedTo?._id || ""} (default)</MenuItem>
                  {employeesList.map((emp) => (
                    <MenuItem value={emp._id} key={emp._id}>
                      {emp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth label="Follow-up notes (optional)" multiline rows={2} value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitLog} disabled={submitting} sx={{ borderRadius: 2, px: 2 }}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Manage follow-up dialog */}
      <Dialog open={!!manageFollowup} onClose={() => setManageFollowup(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2, m: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{manageFollowup?.action === "reschedule" ? "Reschedule Follow-up" : "Manage Follow-up"}</DialogTitle>
        <DialogContent>
          {manageFollowup?.followUp && (
            <>
              <Typography sx={{ mb: 1 }}>{manageFollowup.followUp.notes}</Typography>
              {manageFollowup.action === "reschedule" && (
                <TextField
                  fullWidth
                  label="New date & time"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                  value={manageFollowup.newScheduledAt || new Date(manageFollowup.followUp.scheduledAt).toISOString().slice(0,16)}
                  onChange={(e) => setManageFollowup((m) => ({ ...m, newScheduledAt: e.target.value }))}
                />
              )}
              {manageFollowup.action === "complete" && (
                <Typography>Mark follow-up completed?</Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setManageFollowup(null)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            if (!manageFollowup?.followUp) return;
            const payload = { phone: String(verifiedPhone).replace(/\D/g, "").slice(-10) };
            if (manageFollowup.action === "reschedule") {
              payload.followUpAction = "reschedule";
              payload.followUpId = manageFollowup.followUp._id;
              payload.followUpNewScheduledAt = manageFollowup.newScheduledAt || new Date(manageFollowup.followUp.scheduledAt).toISOString();
            } else if (manageFollowup.action === "complete") {
              payload.followUpAction = "complete";
              payload.followUpId = manageFollowup.followUp._id;
            }
            try {
              setSubmitting(true);
              await axiosInstance.post(`call-list/${id}/${token}/call-log`, payload);
              setManageFollowup(null);
              fetchList(verifiedPhone);
            } catch (e) {
              console.error(e);
            } finally {
              setSubmitting(false);
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CallListMobile
