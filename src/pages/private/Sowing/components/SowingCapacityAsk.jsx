import React, { useEffect, useState } from "react"
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
  book: { label: "Book", color: "#047857", bg: "#ecfdf5" },
  wait: { label: "Wait", color: "#b45309", bg: "#fffbeb" },
  sow_first: { label: "Sow first", color: "#e11d48", bg: "#fff1f2" },
}

export default function SowingCapacityAsk({ from, to }) {
  const [open, setOpen] = useState(false)
  const [districts, setDistricts] = useState([])
  const [district, setDistrict] = useState("")
  const [question, setQuestion] = useState("")
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState(null)

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
        if (!cancelled) setError("Could not load districts")
      } finally {
        if (!cancelled) setLoadingDistricts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, districts.length])

  const ask = async () => {
    if (!district) {
      setError("Select a district")
      return
    }
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.ASK_CAPACITY)
      const response = await instance.request({ district, from, to, question })
      if (response?.data?.success) setResult(response.data)
      else setError(response?.data?.message || "Could not get an answer")
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not get an answer")
    } finally {
      setLoading(false)
    }
  }

  const advice = result?.advice
  const action = ACTION_STYLE[advice?.action] || ACTION_STYLE.wait

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
            width: { xs: "min(100vw - 32px, 420px)", sm: 420 },
            zIndex: 5,
            bgcolor: "#fff",
            border: "1px solid #e8edf3",
            borderRadius: 2.5,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
            p: 2,
          }}
        >
          <Typography fontWeight={800} mb={0.5}>
            Booking analyst
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Uses this date range, live can-book and gap, district weather, and mandi prices when a key is set.
          </Typography>
          <Stack spacing={1.25}>
            <TextField
              select
              size="small"
              label="District"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              disabled={loadingDistricts}
              helperText={loadingDistricts ? "Loading Maharashtra districts" : "Maharashtra"}
            >
              {districts.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Question"
              placeholder="Can we book watermelon this window?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <Button
              variant="contained"
              onClick={ask}
              disabled={loading || !district}
              sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#0f172a" }}
            >
              {loading ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Ask"}
            </Button>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {advice ? (
              <Box sx={{ border: "1px solid #e8edf3", borderRadius: 2, p: 1.5, bgcolor: action.bg }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography fontWeight={800} color={action.color}>
                    {action.label}
                  </Typography>
                  <Typography fontWeight={800} color={action.color}>
                    {advice.confidence}% sure
                  </Typography>
                </Stack>
                <Typography fontSize={14} mb={1}>
                  {advice.summary}
                </Typography>
                <Typography fontSize={13} color="#9f1239" mb={1}>
                  Downside: {advice.downside}
                </Typography>
                <Typography fontSize={13} color="text.secondary">
                  {advice.weatherNote}
                </Typography>
                <Typography fontSize={13} color="text.secondary" mt={0.5}>
                  {advice.mandiNote}
                </Typography>
                {result?.weather?.available ? (
                  <Typography fontSize={12} color="text.secondary" mt={1}>
                    {result.weather.place}: {result.weather.tempMin}–{result.weather.tempMax}°C, {result.weather.rainTotalMm} mm rain
                  </Typography>
                ) : null}
                {result?.mandi?.prices?.length ? (
                  <Stack spacing={0.25} mt={1}>
                    {result.mandi.prices.slice(0, 4).map((price) => (
                      <Typography key={`${price.commodity}-${price.market}-${price.date}`} fontSize={12} color="text.secondary">
                        {price.commodity} · {price.market} · modal {fmt(price.modalPrice)}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}
                <Typography fontSize={11} color="text.secondary" mt={1}>
                  {result.source === "openrouter" ? `Model ${result.model}` : "Rules fallback. The free model did not return a usable answer."}
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
}
