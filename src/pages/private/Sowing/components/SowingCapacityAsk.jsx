import React, { useEffect, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined"
import { NetworkManager, API } from "network/core"
import { fmt } from "../capacitySheetUtils"

const ACTION_STYLE = {
  book: { label: "Can book", color: "#047857", bg: "#ecfdf5" },
  wait: { label: "Hold", color: "#b45309", bg: "#fffbeb" },
  sow_first: { label: "Sow first", color: "#e11d48", bg: "#fff1f2" },
}

function ActionChip({ action }) {
  const style = ACTION_STYLE[action] || ACTION_STYLE.wait
  return (
    <Typography component="span" fontSize={12} fontWeight={800} color={style.color}>
      {style.label}
    </Typography>
  )
}

function NumbersLine({ row }) {
  return (
    <Typography fontSize={12} color="text.secondary">
      Can book {fmt(row.canBook)} · Gap {fmt(row.gap)} · Booked {fmt(row.booked)} · Sowed {fmt(row.sowed)}
    </Typography>
  )
}

function PlantList({ plants }) {
  if (!plants?.length) return null
  return (
    <Stack spacing={1} mt={1.25}>
      {plants.map((plant) => (
        <Box key={plant.plant} sx={{ border: "1px solid #e8edf3", borderRadius: 1.5, p: 1.25, bgcolor: "#fff" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.25}>
            <Typography fontWeight={800} fontSize={14}>
              {plant.plant}
            </Typography>
            <ActionChip action={plant.action} />
          </Stack>
          <NumbersLine row={plant} />
          <Typography fontSize={13} mt={0.5}>
            {plant.note}
          </Typography>
          {plant.subtypes?.length ? (
            <Stack spacing={0.75} mt={1} sx={{ pl: 1.25, borderLeft: "2px solid #e2e8f0" }}>
              {plant.subtypes.map((row) => (
                <Box key={row.name}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontSize={13} fontWeight={700}>
                      {row.name}
                    </Typography>
                    <ActionChip action={row.action} />
                  </Stack>
                  <NumbersLine row={row} />
                </Box>
              ))}
            </Stack>
          ) : null}
        </Box>
      ))}
    </Stack>
  )
}

export default function SowingCapacityAsk({ from, to }) {
  const [open, setOpen] = useState(false)
  const [districts, setDistricts] = useState([])
  const [district, setDistrict] = useState("")
  const [question, setQuestion] = useState("")
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [messages, setMessages] = useState([])
  const threadRef = useRef(null)

  useEffect(() => {
    if (!open || districts.length) return undefined
    let cancelled = false
    ;(async () => {
      setLoadingDistricts(true)
      try {
        const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
        const response = await instance.request({ state: "Maharashtra" })
        const rows = response?.data?.data?.districts
        if (!cancelled && response?.data?.status === "success" && Array.isArray(rows)) {
          setDistricts(rows.map((row) => row.name).filter(Boolean).sort((a, b) => a.localeCompare(b)))
        }
      } catch {
        if (!cancelled) setDistricts([])
      } finally {
        if (!cancelled) setLoadingDistricts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, districts.length])

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, loading])

  const ask = async () => {
    const text = question.trim() || "What should we book or sow on our sheet, plant by plant?"
    setLoading(true)
    setError("")
    setQuestion("")
    try {
      const instance = NetworkManager(API.sowing.ASK_CAPACITY)
      const response = await instance.request({
        district: district || undefined,
        from,
        to,
        question: text,
      })
      if (response?.data?.success) {
        setMessages((prev) => [...prev, { question: text, result: response.data }])
      } else {
        setError(response?.data?.message || "Could not get an answer")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not get an answer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Button
        variant="outlined"
        startIcon={<AutoAwesomeOutlinedIcon />}
        onClick={() => setOpen((value) => !value)}
        sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
      >
        Ask AI
      </Button>
      {open ? (
        <Box
          sx={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: { xs: "min(100vw - 32px, 520px)", sm: 520 },
            zIndex: 5,
            bgcolor: "#fff",
            border: "1px solid #e8edf3",
            borderRadius: 2.5,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
            display: "flex",
            flexDirection: "column",
            maxHeight: "min(72vh, 680px)",
          }}
        >
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography fontWeight={800}>Maharashtra analyst</Typography>
            <Typography variant="body2" color="text.secondary">
              Uses our can book, gap, booked, and sowed for every plant and subtype. A district only adds local weather.
            </Typography>
          </Box>
          <Box ref={threadRef} sx={{ px: 2, overflow: "auto", flex: 1 }}>
            {!messages.length ? (
              <Typography fontSize={13} color="text.secondary" mb={1}>
                Ask about this date range. The answer stays on our full sheet, not one district total.
              </Typography>
            ) : null}
            <Stack spacing={1.5} pb={1}>
              {messages.map((message, index) => {
                const advice = message.result?.advice
                const counts = advice?.counts
                return (
                  <Box key={`${message.question}-${index}`}>
                    <Box sx={{ bgcolor: "#f8fafc", borderRadius: 1.5, px: 1.25, py: 1, mb: 1 }}>
                      <Typography fontSize={13}>{message.question}</Typography>
                    </Box>
                    {advice ? (
                      <Box sx={{ border: "1px solid #e8edf3", borderRadius: 2, p: 1.5 }}>
                        {counts ? (
                          <Typography fontSize={12} fontWeight={800} color="#334155" mb={0.75}>
                            {counts.sow_first || 0} sow first · {counts.book || 0} can book · {counts.wait || 0} hold
                          </Typography>
                        ) : null}
                        <Typography fontSize={14} mb={0.75}>
                          {advice.summary}
                        </Typography>
                        <Typography fontSize={13} color="#9f1239">
                          Downside: {advice.downside}
                        </Typography>
                        <PlantList plants={advice.plants} />
                        <Typography fontSize={12} color="text.secondary" mt={1}>
                          {advice.weatherNote}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary" mt={0.5}>
                          {advice.mandiNote}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary" mt={1}>
                          {message.result.scope || "Maharashtra"}
                          {message.result.district ? ` · weather ${message.result.district}` : ""}
                          {message.result.source === "openrouter" ? ` · ${message.result.model}` : " · from our sheet"}
                        </Typography>
                      </Box>
                    ) : null}
                  </Box>
                )
              })}
            </Stack>
          </Box>
          <Stack spacing={1} sx={{ p: 2, pt: 1, borderTop: "1px solid #e8edf3" }}>
            <TextField
              select
              size="small"
              label="District"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              disabled={loadingDistricts}
              helperText="Optional. Leave this on all Maharashtra."
            >
              <MenuItem value="">All Maharashtra</MenuItem>
              {districts.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Ask"
              placeholder="Which subtypes can we book?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  if (!loading) ask()
                }
              }}
            />
            <Button
              variant="contained"
              onClick={ask}
              disabled={loading}
              sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#0f172a" }}
            >
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Ask"}
            </Button>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
}
