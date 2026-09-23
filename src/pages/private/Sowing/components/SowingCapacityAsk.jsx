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

const PROMPTS = ["What can we book?", "What should we sow first?"]

const SHOW = 4

function advicePoints(plants, action) {
  const points = []
  ;(plants || []).forEach((plant) => {
    const subtypes = (plant.subtypes || []).filter((row) => row.action === action)
    if (subtypes.length) {
      subtypes.forEach((row) => {
        points.push({
          key: `${plant.plant}-${row.name}`,
          name: row.name && row.name !== plant.plant ? `${plant.plant} · ${row.name}` : plant.plant,
          canBook: Number(row.canBook) || 0,
        })
      })
      return
    }
    if (plant.action === action) {
      points.push({
        key: plant.plant,
        name: plant.plant,
        canBook: Number(plant.canBook) || 0,
      })
    }
  })
  points.sort((a, b) => (action === "sow_first" ? a.canBook - b.canBook : b.canBook - a.canBook))
  return points
}

function PointCard({ point, tone, line }) {
  return (
    <Box sx={{ mt: 0.85, pl: 1.25, borderLeft: `3px solid ${tone}` }}>
      <Typography fontWeight={800} fontSize={14.5} color="#f8fafc" lineHeight={1.3}>
        {point.name}
      </Typography>
      <Typography fontSize={13} color="#cbd5e1" lineHeight={1.45} mt={0.2}>
        {line}
      </Typography>
    </Box>
  )
}

function PointLane({ kicker, title, points, tone, wash, lineFor }) {
  if (!points.length) return null
  const shown = points.slice(0, SHOW)
  const rest = points.length - shown.length
  return (
    <Box sx={{ mt: 1.35, borderRadius: 3, px: 1.5, py: 1.35, background: wash }}>
      <Typography fontSize={11} fontWeight={800} letterSpacing={1.1} color={tone}>
        {kicker}
      </Typography>
      <Typography fontSize={15} fontWeight={800} color="#f8fafc" mt={0.35} lineHeight={1.3}>
        {title}
      </Typography>
      {shown.map((point) => (
        <PointCard key={point.key} point={point} tone={tone} line={lineFor(point)} />
      ))}
      {rest > 0 ? (
        <Typography fontSize={12} color="#94a3b8" mt={1}>
          + {rest} more on the sheet
        </Typography>
      ) : null}
    </Box>
  )
}

function StoryCard({ kicker, title, line, extra, tone, wash }) {
  if (!title && !line) return null
  return (
    <Box sx={{ mt: 1.15, borderRadius: 3, px: 1.5, py: 1.25, background: wash }}>
      <Typography fontSize={11} fontWeight={800} letterSpacing={1.1} color={tone}>
        {kicker}
      </Typography>
      <Typography fontSize={15} fontWeight={800} color="#f8fafc" mt={0.3} lineHeight={1.3}>
        {title}
      </Typography>
      <Typography fontSize={13} color="#e2e8f0" mt={0.45} lineHeight={1.45}>
        {line}
      </Typography>
      {extra ? (
        <Typography fontSize={13} color="#cbd5e1" mt={0.45} lineHeight={1.45}>
          {extra}
        </Typography>
      ) : null}
    </Box>
  )
}

function SheetBrief({ advice, context, focus = "all" }) {
  const plants = advice?.plants || []
  const good = focus === "sow" ? [] : advicePoints(plants, "book")
  const bad = focus === "book" ? [] : advicePoints(plants, "sow_first")
  const hold = focus === "all" ? advicePoints(plants, "wait") : []
  const empty =
    !good.length && !bad.length && !hold.length ? (
      <Typography fontSize={15} fontWeight={700} color="#f8fafc" mt={focus === "all" ? 1.2 : 0}>
        {focus === "book"
          ? "Nothing is free to book in this date range."
          : focus === "sow"
            ? "Nothing needs sowing before you book."
            : "Nothing to book or sow in this date range."}
      </Typography>
    ) : null
  return (
    <Box>
      {focus === "all" && context?.booking ? (
        <>
          <StoryCard
            kicker="BOOKING FLOW"
            title={context.booking.title}
            line={context.booking.line}
            extra={context.booking.why}
            tone="#67e8f9"
            wash="linear-gradient(180deg, rgba(34,211,238,0.18), rgba(34,211,238,0.05))"
          />
          <StoryCard
            kicker="WEATHER"
            title={context.weather?.title || "Weather"}
            line={context.weather?.line}
            tone="#93c5fd"
            wash="linear-gradient(180deg, rgba(59,130,246,0.18), rgba(59,130,246,0.05))"
          />
          <StoryCard
            kicker="MANDI"
            title={context.mandi?.title || "Mandi"}
            line={context.mandi?.line}
            tone="#fcd34d"
            wash="linear-gradient(180deg, rgba(245,158,11,0.16), rgba(245,158,11,0.05))"
          />
        </>
      ) : null}
      {empty}
      {empty ? null : (
      <Typography fontSize={13} color="#94a3b8" mt={1.6}>
        From our sheet, in plain words
      </Typography>
      )}
      <PointLane
        kicker="GOOD"
        title={good.length === 1 ? "Book this one" : `Book these ${good.length}`}
        points={good}
        tone="#6ee7b7"
        wash="linear-gradient(180deg, rgba(16,185,129,0.2), rgba(16,185,129,0.06))"
        lineFor={(point) => `You can take about ${fmt(point.canBook)} more. They are already sown and still free.`}
      />
      <PointLane
        kicker="DO THIS FIRST"
        title={bad.length === 1 ? "Sow this before the next order" : `Sow these ${bad.length} before you book`}
        points={bad}
        tone="#fda4af"
        wash="linear-gradient(180deg, rgba(244,63,94,0.2), rgba(244,63,94,0.06))"
        lineFor={(point) => `You are short by about ${fmt(Math.abs(point.canBook))}. Sow first, then take the order.`}
      />
      {empty ? null : hold.length ? (
        <Typography fontSize={13} color="#cbd5e1" mt={1.4} lineHeight={1.45}>
          Leave the rest. {hold.length === 1 ? "One variety has" : `${hold.length} varieties have`} nothing extra right now.
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
                      {advice ? (
                        <SheetBrief
                          advice={advice}
                          context={message.result?.context}
                          focus={
                            message.intro
                              ? "all"
                              : /sow/i.test(message.question)
                                ? "sow"
                                : /book/i.test(message.question)
                                  ? "book"
                                  : "all"
                          }
                        />
                      ) : null}
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
