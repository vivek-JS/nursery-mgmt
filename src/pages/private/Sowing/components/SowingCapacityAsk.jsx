import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Box,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined"
import CloseRoundedIcon from "@mui/icons-material/CloseRounded"
import SendRoundedIcon from "@mui/icons-material/SendRounded"
import { NetworkManager, API } from "network/core"
import { fmt } from "../capacitySheetUtils"

const ACTION_STYLE = {
  book: { label: "Can book", color: "#6ee7b7", bg: "rgba(16, 185, 129, 0.16)" },
  wait: { label: "Hold", color: "#fcd34d", bg: "rgba(245, 158, 11, 0.16)" },
  sow_first: { label: "Sow first", color: "#fda4af", bg: "rgba(244, 63, 94, 0.16)" },
}

const PROMPTS = ["Which plants can we book?", "What should we sow first?", "Break it down by subtype"]

function ActionChip({ action }) {
  const style = ACTION_STYLE[action] || ACTION_STYLE.wait
  return (
    <Box
      component="span"
      sx={{
        px: 0.9,
        py: 0.15,
        borderRadius: 999,
        bgcolor: style.bg,
        color: style.color,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </Box>
  )
}

function NumbersLine({ row }) {
  return (
    <Typography fontSize={12} color="#94a3b8">
      Can book {fmt(row.canBook)} · Gap {fmt(row.gap)} · Booked {fmt(row.booked)} · Sowed {fmt(row.sowed)}
    </Typography>
  )
}

function PlantList({ plants }) {
  if (!plants?.length) return null
  return (
    <Stack spacing={0.75} mt={1.25}>
      {plants.map((plant) => (
        <Box
          key={plant.plant}
          sx={{
            borderRadius: 2,
            p: 1.1,
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(148,163,184,0.14)",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={0.25}>
            <Typography fontWeight={800} fontSize={13.5} color="#f8fafc">
              {plant.plant}
            </Typography>
            <ActionChip action={plant.action} />
          </Stack>
          <NumbersLine row={plant} />
          <Typography fontSize={12.5} color="#cbd5e1" mt={0.4} lineHeight={1.45}>
            {plant.note}
          </Typography>
          {plant.subtypes?.length ? (
            <Stack spacing={0.7} mt={1} sx={{ pl: 1.1, borderLeft: "2px solid rgba(56,189,248,0.35)" }}>
              {plant.subtypes.map((row) => (
                <Box key={row.name}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography fontSize={12.5} fontWeight={700} color="#e2e8f0">
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

function TypingDots() {
  return (
    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ py: 0.4, px: 0.2 }}>
      {[0, 1, 2].map((dot) => (
        <Box
          key={dot}
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: "#67e8f9",
            animation: "capacityAskPulse 1.1s ease-in-out infinite",
            animationDelay: `${dot * 0.16}s`,
            "@keyframes capacityAskPulse": {
              "0%, 80%, 100%": { opacity: 0.25, transform: "translateY(0)" },
              "40%": { opacity: 1, transform: "translateY(-3px)" },
            },
          }}
        />
      ))}
    </Stack>
  )
}

export default function SowingCapacityAsk({ from, to }) {
  const [open, setOpen] = useState(false)
  const [districts, setDistricts] = useState([])
  const [district, setDistrict] = useState("")
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([])
  const threadRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open || districts.length) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
        const response = await instance.request({ state: "Maharashtra" })
        const rows = response?.data?.data?.districts
        if (!cancelled && response?.data?.status === "success" && Array.isArray(rows)) {
          setDistricts(rows.map((row) => row.name).filter(Boolean).sort((a, b) => a.localeCompare(b)))
        }
      } catch {
        if (!cancelled) setDistricts([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, districts.length])

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, loading, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const ask = async (raw) => {
    const text = String(raw ?? question).trim() || "What should we book or sow on our sheet, plant by plant?"
    if (loading) return
    const id = `${Date.now()}`
    setQuestion("")
    setLoading(true)
    setMessages((prev) => [...prev, { id, question: text, result: null, error: "", pending: true }])
    try {
      const instance = NetworkManager(API.sowing.ASK_CAPACITY)
      const response = await instance.request({
        district: district || undefined,
        from,
        to,
        question: text,
      })
      if (response?.data?.success) {
        setMessages((prev) => prev.map((row) => (row.id === id ? { ...row, result: response.data, pending: false } : row)))
      } else {
        setMessages((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, pending: false, error: response?.data?.message || "Could not get an answer" } : row
          )
        )
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, pending: false, error: err?.response?.data?.message || err?.message || "Could not get an answer" }
            : row
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const chat = open
    ? createPortal(
        <Box
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 24 },
            bottom: { xs: 12, sm: 24 },
            width: { xs: "min(100vw - 24px, 440px)", sm: 440 },
            height: "min(720px, calc(100vh - 32px))",
            zIndex: 1400,
            display: "flex",
            flexDirection: "column",
            borderRadius: "28px",
            overflow: "hidden",
            color: "#e2e8f0",
            background:
              "radial-gradient(120% 80% at 100% 0%, rgba(34,211,238,0.18), transparent 42%), linear-gradient(180deg, #0b1220 0%, #0f172a 42%, #111827 100%)",
            border: "1px solid rgba(125, 211, 252, 0.28)",
            boxShadow: "0 30px 80px rgba(2, 6, 23, 0.55), 0 0 0 1px rgba(15, 23, 42, 0.4)",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 1.75,
              py: 1.35,
              borderBottom: "1px solid rgba(148,163,184,0.14)",
              background: "linear-gradient(90deg, rgba(15,23,42,0.2), rgba(8,47,73,0.35))",
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #22d3ee, #6366f1)",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography fontWeight={800} fontSize={15} color="#f8fafc" lineHeight={1.2}>
                Ask AI
              </Typography>
              <Typography fontSize={11} color="#94a3b8">
                Our Maharashtra sheet · plant and subtype
              </Typography>
            </Box>
            <TextField
              select
              size="small"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 280 } } } }}
              sx={{
                width: 148,
                "& .MuiOutlinedInput-root": {
                  color: "#e2e8f0",
                  borderRadius: 999,
                  height: 32,
                  fontSize: 12,
                  bgcolor: "rgba(255,255,255,0.06)",
                },
                "& .MuiSelect-icon": { color: "#94a3b8" },
                "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
                "&:hover fieldset": { borderColor: "rgba(125,211,252,0.45)" },
              }}
            >
              <MenuItem value="">Maharashtra</MenuItem>
              {districts.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <IconButton onClick={() => setOpen(false)} size="small" sx={{ color: "#cbd5e1" }} aria-label="Close chat">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box
            ref={threadRef}
            sx={{
              flex: 1,
              overflow: "auto",
              px: 1.75,
              py: 1.75,
              "&::-webkit-scrollbar": { width: 8 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(148,163,184,0.35)", borderRadius: 99 },
            }}
          >
            {!messages.length ? (
              <Stack spacing={1.25} alignItems="flex-start" sx={{ mt: 2 }}>
                <Box
                  sx={{
                    maxWidth: "92%",
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "6px 18px 18px 18px",
                    bgcolor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  <Typography fontSize={13.5} color="#e2e8f0" lineHeight={1.5}>
                    Ask about this date range. I answer from our can book, gap, booked, and sowed, plant by plant and subtype by subtype.
                  </Typography>
                </Box>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
                  {PROMPTS.map((prompt) => (
                    <Box
                      key={prompt}
                      component="button"
                      type="button"
                      onClick={() => ask(prompt)}
                      sx={{
                        border: "1px solid rgba(125,211,252,0.35)",
                        bgcolor: "rgba(34,211,238,0.08)",
                        color: "#a5f3fc",
                        borderRadius: 999,
                        px: 1.25,
                        py: 0.55,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        "&:hover": { bgcolor: "rgba(34,211,238,0.16)" },
                      }}
                    >
                      {prompt}
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ) : null}

            <Stack spacing={1.35}>
              {messages.map((message) => {
                const advice = message.result?.advice
                const counts = advice?.counts
                return (
                  <Box key={message.id}>
                    <Stack direction="row" justifyContent="flex-end">
                      <Box
                        sx={{
                          maxWidth: "86%",
                          px: 1.4,
                          py: 1,
                          borderRadius: "18px 18px 6px 18px",
                          background: "linear-gradient(135deg, #0891b2, #4f46e5)",
                          color: "#fff",
                        }}
                      >
                        <Typography fontSize={13.5} lineHeight={1.45}>
                          {message.question}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" justifyContent="flex-start" mt={1.1}>
                      <Box
                        sx={{
                          maxWidth: "100%",
                          width: "100%",
                          px: 1.35,
                          py: 1.15,
                          borderRadius: "6px 18px 18px 18px",
                          bgcolor: "rgba(255,255,255,0.045)",
                          border: "1px solid rgba(148,163,184,0.16)",
                        }}
                      >
                        {message.pending ? <TypingDots /> : null}
                        {message.error ? (
                          <Typography fontSize={13} color="#fda4af">
                            {message.error}
                          </Typography>
                        ) : null}
                        {advice ? (
                          <>
                            {counts ? (
                              <Typography fontSize={11.5} fontWeight={800} color="#67e8f9" mb={0.6}>
                                {counts.sow_first || 0} sow first · {counts.book || 0} can book · {counts.wait || 0} hold
                              </Typography>
                            ) : null}
                            <Typography fontSize={13.5} color="#f1f5f9" lineHeight={1.5}>
                              {advice.summary}
                            </Typography>
                            <Typography fontSize={12.5} color="#fda4af" mt={0.7} lineHeight={1.45}>
                              {advice.downside}
                            </Typography>
                            <PlantList plants={advice.plants} />
                            {advice.weatherNote ? (
                              <Typography fontSize={11.5} color="#94a3b8" mt={1.1}>
                                {advice.weatherNote}
                              </Typography>
                            ) : null}
                            {advice.mandiNote ? (
                              <Typography fontSize={11.5} color="#94a3b8" mt={0.4}>
                                {advice.mandiNote}
                              </Typography>
                            ) : null}
                          </>
                        ) : null}
                      </Box>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </Box>

          <Box sx={{ p: 1.25, pt: 0.75, borderTop: "1px solid rgba(148,163,184,0.12)" }}>
            <Stack
              direction="row"
              alignItems="flex-end"
              spacing={0.75}
              sx={{
                px: 1.25,
                py: 0.6,
                borderRadius: "22px",
                bgcolor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(125,211,252,0.22)",
              }}
            >
              <TextField
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={4}
                placeholder="Ask about plants or subtypes"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    ask()
                  }
                }}
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={{
                  "& .MuiInputBase-input": {
                    color: "#f8fafc",
                    fontSize: 14,
                    py: 0.8,
                    "&::placeholder": { color: "#64748b", opacity: 1 },
                  },
                }}
              />
              <IconButton
                onClick={() => ask()}
                disabled={loading}
                aria-label="Send"
                sx={{
                  mb: 0.25,
                  width: 36,
                  height: 36,
                  color: "#fff",
                  background: loading ? "rgba(148,163,184,0.3)" : "linear-gradient(135deg, #22d3ee, #6366f1)",
                  "&:hover": { background: "linear-gradient(135deg, #06b6d4, #4f46e5)" },
                }}
              >
                {loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <SendRoundedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Stack>
          </Box>
        </Box>,
        document.body
      )
    : null

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          border: "1px solid rgba(14, 165, 233, 0.35)",
          bgcolor: "#0f172a",
          color: "#e0f2fe",
          borderRadius: 999,
          px: 1.5,
          height: 40,
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "inherit",
          boxShadow: "0 8px 24px rgba(14, 165, 233, 0.18)",
          "&:hover": { bgcolor: "#111827" },
        }}
      >
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: "#67e8f9" }} />
        Ask AI
      </Box>
      {chat}
    </>
  )
}
