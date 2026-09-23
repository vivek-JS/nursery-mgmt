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

const PROMPTS = ["Only what we can book", "Only what to sow", "Hold list"]

function lanePlants(plants, action) {
  return (plants || [])
    .map((plant) => {
      const subtypes = (plant.subtypes || []).filter((row) => row.action === action)
      if (plant.action !== action && !subtypes.length) return null
      const canBook =
        plant.action === action
          ? plant.canBook
          : subtypes.reduce((sum, row) => sum + (Number(row.canBook) || 0), 0)
      return { ...plant, canBook, subtypes }
    })
    .filter(Boolean)
}

function PlantRow({ plant, tone }) {
  return (
    <Box sx={{ py: 0.85, "& + &": { borderTop: "1px solid rgba(255,255,255,0.06)" } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography fontWeight={800} fontSize={14} color="#f8fafc">
          {plant.plant}
        </Typography>
        <Typography fontWeight={800} fontSize={14} color={tone}>
          {fmt(plant.canBook)}
        </Typography>
      </Stack>
      <Typography fontSize={11} color="#94a3b8">
        Gap {fmt(plant.gap)} · Booked {fmt(plant.booked)} · Sowed {fmt(plant.sowed)}
      </Typography>
      {plant.subtypes?.length ? (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} mt={0.7}>
          {plant.subtypes.map((row) => (
            <Box
              key={row.name}
              sx={{
                px: 0.85,
                py: 0.28,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Typography fontSize={11} color="#e2e8f0">
                {row.name} · {fmt(row.canBook)}
              </Typography>
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

function Lane({ title, hint, plants, accent, wash }) {
  if (!plants.length) return null
  return (
    <Box sx={{ mt: 1.15, borderRadius: 2.5, px: 1.25, py: 1, background: wash, border: `1px solid ${accent}33` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontSize={11} fontWeight={800} letterSpacing={1.2} color={accent}>
          {title}
        </Typography>
        <Typography fontSize={11} fontWeight={800} color={accent}>
          {plants.length}
        </Typography>
      </Stack>
      <Typography fontSize={12} color="#cbd5e1" mt={0.25}>
        {hint}
      </Typography>
      {plants.map((plant) => (
        <PlantRow key={plant.plant} plant={plant} tone={accent} />
      ))}
    </Box>
  )
}

function SheetBrief({ advice }) {
  const plants = advice?.plants || []
  const good = lanePlants(plants, "book")
  const bad = lanePlants(plants, "sow_first")
  const hold = lanePlants(plants, "wait")
  const total = Math.max(good.length + bad.length + hold.length, 1)
  const headline =
    good.length && bad.length
      ? `${good.length} good to book. ${bad.length} need sowing first.`
      : good.length
        ? `${good.length} good to book in this window.`
        : bad.length
          ? `${bad.length} need sowing before more bookings.`
          : advice?.summary
  return (
    <Box>
      <Typography fontSize={16} fontWeight={800} color="#f8fafc" lineHeight={1.35}>
        {headline}
      </Typography>
      <Box sx={{ display: "flex", height: 7, borderRadius: 99, overflow: "hidden", mt: 1.15, bgcolor: "rgba(255,255,255,0.06)" }}>
        <Box sx={{ width: `${(good.length / total) * 100}%`, bgcolor: "#34d399" }} />
        <Box sx={{ width: `${(hold.length / total) * 100}%`, bgcolor: "#fbbf24" }} />
        <Box sx={{ width: `${(bad.length / total) * 100}%`, bgcolor: "#fb7185" }} />
      </Box>
      <Lane
        title="GOOD"
        hint="Spare sowed plants. These can be booked."
        plants={good}
        accent="#6ee7b7"
        wash="linear-gradient(180deg, rgba(16,185,129,0.18), rgba(16,185,129,0.05))"
      />
      <Lane
        title="NEEDS SOWING"
        hint="Gap is ahead of excess. Sow these before booking."
        plants={bad}
        accent="#fda4af"
        wash="linear-gradient(180deg, rgba(244,63,94,0.18), rgba(244,63,94,0.05))"
      />
      <Lane
        title="HOLD"
        hint="Nothing spare yet, or it is safer to wait."
        plants={hold}
        accent="#fcd34d"
        wash="linear-gradient(180deg, rgba(245,158,11,0.14), rgba(245,158,11,0.04))"
      />
      {advice?.downside ? (
        <Typography fontSize={12.5} color="#fecdd3" mt={1.25} lineHeight={1.45}>
          {advice.downside}
        </Typography>
      ) : null}
      {advice?.weatherNote ? (
        <Typography fontSize={11.5} color="#94a3b8" mt={0.8} lineHeight={1.45}>
          {advice.weatherNote}
        </Typography>
      ) : null}
    </Box>
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
  const introKey = useRef("")
  const messagesRef = useRef(messages)
  messagesRef.current = messages

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
    if (!threadRef.current) return
    const onlyIntro = messages.length === 1 && messages[0]?.intro
    threadRef.current.scrollTop = onlyIntro ? 0 : threadRef.current.scrollHeight
  }, [messages, loading, open])

  useEffect(() => {
    if (!open) return undefined
    const key = `${from}|${to}|${district}`
    if (introKey.current === key) return undefined
    const hasChat = messagesRef.current.some((row) => !row.intro)
    if (hasChat && introKey.current) return undefined
    let cancelled = false
    const id = `intro-${key}`
    setMessages([{ id, intro: true, question: "", result: null, error: "", pending: true }])
    setLoading(true)
    ;(async () => {
      try {
        const instance = NetworkManager(API.sowing.ASK_CAPACITY)
        const response = await instance.request({
          district: district || undefined,
          from,
          to,
          question: "Open with our full Maharashtra sheet. What is good to book, and what needs sowing, plant by plant and subtype by subtype?",
        })
        if (cancelled) return
        if (response?.data?.success) {
          introKey.current = key
          setMessages([{ id, intro: true, question: "", result: response.data, error: "", pending: false }])
        } else {
          setMessages([
            {
              id,
              intro: true,
              question: "",
              result: null,
              error: response?.data?.message || "Could not read the sheet",
              pending: false,
            },
          ])
        }
      } catch (err) {
        if (!cancelled) {
          setMessages([
            {
              id,
              intro: true,
              question: "",
              result: null,
              error: err?.response?.data?.message || err?.message || "Could not read the sheet",
              pending: false,
            },
          ])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      setLoading(false)
    }
  }, [open, from, to, district])

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
            <Stack spacing={1.35}>
              {messages.map((message) => {
                const advice = message.result?.advice
                return (
                  <Box key={message.id}>
                    {message.intro ? null : (
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
                    )}
                    <Box
                      sx={{
                        mt: message.intro ? 0 : 1.1,
                        px: message.intro ? 0.2 : 1.35,
                        py: message.intro ? 0.2 : 1.15,
                        borderRadius: message.intro ? 0 : "6px 18px 18px 18px",
                        bgcolor: message.intro ? "transparent" : "rgba(255,255,255,0.045)",
                        border: message.intro ? "none" : "1px solid rgba(148,163,184,0.16)",
                      }}
                    >
                      {message.pending ? (
                        <Box
                          sx={{
                            px: 1.4,
                            py: 1.2,
                            borderRadius: "6px 18px 18px 18px",
                            bgcolor: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(148,163,184,0.16)",
                          }}
                        >
                          <Typography fontSize={12} color="#94a3b8" mb={0.8}>
                            Reading our sheet
                          </Typography>
                          <TypingDots />
                        </Box>
                      ) : null}
                      {message.error ? (
                        <Typography fontSize={13} color="#fda4af">
                          {message.error}
                        </Typography>
                      ) : null}
                      {advice ? <SheetBrief advice={advice} /> : null}
                    </Box>
                  </Box>
                )
              })}
            </Stack>
            {messages.some((row) => row.intro && row.result) && !loading ? (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} mt={1.5}>
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
            ) : null}
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
