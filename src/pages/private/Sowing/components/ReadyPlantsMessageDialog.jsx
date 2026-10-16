import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import RestartAltIcon from "@mui/icons-material/RestartAlt"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { LAYOUT_TABLE, LAYOUT_VARIETY, buildReadyMessage, cropName, messageGroups } from "../readyPlantsMessage"

const DAY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 15, label: "15 days" },
  { value: 30, label: "30 days" },
  { value: 0, label: "All" },
]

const toggleSx = {
  "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, fontSize: 12.5, px: 1.25, py: 0.4 },
  "& .Mui-selected": { bgcolor: "#0f172a !important", color: "#fff !important" },
}

function Label({ children }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: 0.4, textTransform: "uppercase", mb: 0.75 }}>
      {children}
    </Typography>
  )
}

/** WhatsApp renders *text* as bold. */
function WhatsAppLine({ text }) {
  const parts = text.split(/(\*[^*\n]+\*)/g)
  return (
    <div>
      {parts.map((part, i) =>
        /^\*[^*]+\*$/.test(part) ? <strong key={i}>{part.slice(1, -1)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
      )}
      {text ? null : "\u00a0"}
    </div>
  )
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement("textarea")
  area.value = text
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.appendChild(area)
  area.select()
  document.execCommand("copy")
  document.body.removeChild(area)
}

export default function ReadyPlantsMessageDialog({ open, onClose, rows: givenRows, today: givenToday }) {
  const [loaded, setLoaded] = useState({ rows: [], today: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [count, setCount] = useState("ready")
  const [days, setDays] = useState(0)
  const [lang, setLang] = useState("mr")
  const [includeShed, setIncludeShed] = useState(true)
  const [title, setTitle] = useState("")
  const [excluded, setExcluded] = useState(() => new Set())
  const [layouts, setLayouts] = useState({})
  const [edited, setEdited] = useState(null)
  const [editing, setEditing] = useState(false)

  const ownData = givenRows === undefined
  const rows = ownData ? loaded.rows : givenRows
  const today = ownData ? loaded.today : givenToday

  useEffect(() => {
    if (!open || !ownData) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const res = await NetworkManager(API.sowing.GET_CAPACITY_BOARD).request({})
        if (cancelled) return
        if (res?.data?.success) setLoaded({ rows: res.data.rows || [], today: res.data.today })
        else setError(res?.data?.message || "Could not load ready plants")
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || "Could not load ready plants")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, ownData])

  const options = { today, days, count, includeShed }
  const groups = useMemo(
    () => (today ? messageGroups(rows, { today, days, count, includeShed }) : []),
    [rows, today, days, count, includeShed]
  )
  const crops = groups.map((g) => g.plantName).filter((name) => !excluded.has(name))
  const generated = today ? buildReadyMessage(rows, { ...options, lang, crops, layouts, title: title.trim() }) : ""
  const text = edited ?? generated
  const lineCount = groups
    .filter((g) => !excluded.has(g.plantName))
    .reduce((acc, g) => acc + g.varieties.reduce((n, v) => n + v.lines.length + (v.readyNow ? 1 : 0), 0), 0)

  const changeOption = (setter) => (value) => {
    setter(value)
    setEdited(null)
  }

  const toggleCrop = (name) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
    setEdited(null)
  }

  const onCopy = async () => {
    try {
      await copyText(text)
      Toast.success("Message copied — paste it in WhatsApp")
    } catch {
      Toast.error("Could not copy. Select the text and copy it.")
    }
  }

  const onShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid #e2e8f0" }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "#dcfce7", display: "grid", placeItems: "center" }}>
            <WhatsAppIcon sx={{ color: "#16a34a" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Ready plants message</Typography>
            <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>
              तयार होणारी रोपे — built from today&apos;s sowing and shed stock. Copy or share on WhatsApp.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : (
          <Stack direction={{ xs: "column", md: "row" }} sx={{ minHeight: 520 }}>
            <Box sx={{ width: { md: 360 }, flexShrink: 0, p: 2, borderRight: { md: "1px solid #e2e8f0" }, bgcolor: "#f8fafc" }}>
              <Stack spacing={2}>
                <Box>
                  <Label>Plants to show</Label>
                  <ToggleButtonGroup exclusive size="small" value={count} onChange={(_, v) => v && changeOption(setCount)(v)} sx={toggleSx}>
                    <ToggleButton value="ready">All ready</ToggleButton>
                    <ToggleButton value="free">Free to sell</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography sx={{ fontSize: 11.5, color: "#64748b", mt: 0.5 }}>
                    {count === "ready" ? "Every plant sowed for that date, booked or not." : "Only plants not yet booked."}
                  </Typography>
                </Box>
                <Box>
                  <Label>Days ahead</Label>
                  <ToggleButtonGroup exclusive size="small" value={days} onChange={(_, v) => v !== null && changeOption(setDays)(v)} sx={toggleSx}>
                    {DAY_OPTIONS.map((o) => (
                      <ToggleButton key={o.value} value={o.value}>
                        {o.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
                <Box>
                  <Label>Language</Label>
                  <ToggleButtonGroup exclusive size="small" value={lang} onChange={(_, v) => v && changeOption(setLang)(v)} sx={toggleSx}>
                    <ToggleButton value="mr">मराठी</ToggleButton>
                    <ToggleButton value="en">English</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <FormControlLabel
                  control={<Switch checked={includeShed} onChange={(e) => changeOption(setIncludeShed)(e.target.checked)} color="success" />}
                  label={<Typography sx={{ fontSize: 13, fontWeight: 700 }}>Add &quot;रेडी मध्ये&quot; shed stock</Typography>}
                />
                <TextField
                  size="small"
                  label="Heading (optional)"
                  placeholder="e.g. राम बायोटेक"
                  value={title}
                  onChange={(e) => changeOption(setTitle)(e.target.value)}
                  sx={{ bgcolor: "#fff" }}
                />
                <Box>
                  <Label>Crops</Label>
                  {groups.length === 0 ? (
                    <Typography sx={{ fontSize: 12.5, color: "#64748b" }}>No ready plants in this range.</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {groups.map((g) => {
                        const on = !excluded.has(g.plantName)
                        const layout = layouts[g.plantName] || g.layout
                        return (
                          <Stack
                            key={g.plantName}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 1.5, pl: 0.5, pr: 1, py: 0.25 }}
                          >
                            <FormControlLabel
                              sx={{ m: 0 }}
                              control={<Checkbox size="small" checked={on} onChange={() => toggleCrop(g.plantName)} color="success" />}
                              label={
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                                  {g.plantName}
                                  {lang === "mr" && cropName(g.plantName, "mr") !== g.plantName ? ` · ${cropName(g.plantName, "mr")}` : ""}
                                </Typography>
                              }
                            />
                            <ToggleButtonGroup
                              exclusive
                              size="small"
                              disabled={!on}
                              value={layout}
                              onChange={(_, v) => v && changeOption(setLayouts)({ ...layouts, [g.plantName]: v })}
                              sx={{ ...toggleSx, "& .MuiToggleButton-root": { ...toggleSx["& .MuiToggleButton-root"], fontSize: 11, py: 0.2, px: 0.9 } }}
                            >
                              <ToggleButton value={LAYOUT_TABLE}>Date table</ToggleButton>
                              <ToggleButton value={LAYOUT_VARIETY}>Per variety</ToggleButton>
                            </ToggleButtonGroup>
                          </Stack>
                        )
                      })}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>

            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e2e8f0" }}>
                <Typography sx={{ fontSize: 12.5, color: "#475569", fontWeight: 700 }}>
                  {crops.length} crop{crops.length === 1 ? "" : "s"} · {lineCount} line{lineCount === 1 ? "" : "s"} · {text.length} characters
                  {edited !== null ? " · edited" : ""}
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {edited !== null ? (
                    <Button size="small" startIcon={<RestartAltIcon />} onClick={() => setEdited(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
                      Reset
                    </Button>
                  ) : null}
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => setEditing((v) => !v)}
                    sx={{ textTransform: "none", fontWeight: 700, color: editing ? "#16a34a" : "#334155" }}
                  >
                    {editing ? "Done" : "Edit text"}
                  </Button>
                </Stack>
              </Stack>

              <Box sx={{ flex: 1, bgcolor: "#efeae2", p: { xs: 1.5, md: 3 }, overflow: "auto", maxHeight: 520 }}>
                {editing ? (
                  <TextField
                    multiline
                    fullWidth
                    minRows={14}
                    value={text}
                    onChange={(e) => setEdited(e.target.value)}
                    sx={{ bgcolor: "#fff", borderRadius: 2, "& textarea": { fontSize: 14, lineHeight: 1.55 } }}
                  />
                ) : text ? (
                  <Box
                    sx={{
                      maxWidth: 440,
                      ml: "auto",
                      bgcolor: "#d9fdd3",
                      borderRadius: "10px 0 10px 10px",
                      px: 1.5,
                      py: 1,
                      boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
                      fontSize: 14.5,
                      lineHeight: 1.5,
                      color: "#111b21",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "'Segoe UI', Helvetica, Arial, 'Noto Sans Devanagari', sans-serif",
                    }}
                  >
                    {text.split("\n").map((line, i) => (
                      <WhatsAppLine key={i} text={line} />
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ textAlign: "center", color: "#64748b", mt: 8 }}>Nothing to share for this selection.</Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2, py: 1.5, borderTop: "1px solid #e2e8f0" }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={onCopy}
                  disabled={!text}
                  sx={{ textTransform: "none", fontWeight: 800, borderColor: "#cbd5e1", color: "#0f172a" }}
                >
                  Copy message
                </Button>
                <Button
                  variant="contained"
                  startIcon={<WhatsAppIcon />}
                  onClick={onShare}
                  disabled={!text}
                  sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#25d366", "&:hover": { bgcolor: "#1ebe5a" } }}
                >
                  Share on WhatsApp
                </Button>
              </Stack>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
