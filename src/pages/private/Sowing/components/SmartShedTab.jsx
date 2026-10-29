import React, { useCallback, useEffect, useRef, useState } from "react"
import { Alert, Box, Button, IconButton, Skeleton, Stack, Tooltip, Typography } from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import { NetworkManager, API } from "network/core"
import ShedSummaryStrip from "./smart-shed/ShedSummaryStrip"
import ShedCard from "./smart-shed/ShedCard"
import ShedBatchDrawer from "./smart-shed/ShedBatchDrawer"
import FitCheck from "./smart-shed/FitCheck"
import UnmatchedSection from "./smart-shed/UnmatchedSection"
import { INK, LINE, MUTED, timeLabel } from "./smart-shed/smartShedFormat"

const STALE_MS = 30_000

export default function SmartShedTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [drawerKey, setDrawerKey] = useState(null)
  const loadedAt = useRef(0)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError("")
    try {
      const res = await NetworkManager(API.sowing.GET_SMART_SHED).request()
      if (res?.data?.success) {
        setData(res.data)
        loadedAt.current = Date.now()
      } else {
        setError(res?.data?.message || "Could not load smart shed")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load smart shed")
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_MS) load()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load])

  const sheds = data?.sheds || []
  const drawerShed = sheds.find((s) => s.key === drawerKey) || null

  const scrollTo = useCallback((key) => {
    document.getElementById(`smart-shed-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  return (
    <Box sx={{ pb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ mb: 1.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 20, color: INK, lineHeight: 1.2 }}>Smart shed</Typography>
          <Typography sx={{ fontSize: 13, color: MUTED, fontWeight: 600, mt: 0.35, maxWidth: 760 }}>
            Papaya and watermelon share one floor in each fort. Only sown plants take space; when an order goes out, its plants free up.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1} flexShrink={0}>
          {data?.generatedAt ? (
            <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 700, display: { xs: "none", sm: "block" } }}>
              Updated {timeLabel(data.generatedAt)}
            </Typography>
          ) : null}
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} disabled={loading} sx={{ bgcolor: "#fff", border: `1px solid ${LINE}` }}>
                <RefreshIcon
                  fontSize="small"
                  sx={{ animation: loading ? "smartShedSpin 0.9s linear infinite" : "none", "@keyframes smartShedSpin": { to: { transform: "rotate(360deg)" } } }}
                />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={load} sx={{ fontWeight: 800 }}>
              Retry
            </Button>
          }
        >
          {error}
          {data ? " Showing the last numbers that loaded." : ""}
        </Alert>
      ) : null}

      {!data && loading ? (
        <LoadingSkeleton />
      ) : sheds.length ? (
        <Stack spacing={1.75}>
          <ShedSummaryStrip sheds={sheds} onSelect={scrollTo} />
          <FitCheck sheds={sheds} />
          {sheds.map((shed) => (
            <ShedCard key={shed.key} shed={shed} onOpenBatches={(s) => setDrawerKey(s.key)} />
          ))}
          <UnmatchedSection unmatched={data?.unmatched} />
        </Stack>
      ) : null}

      <ShedBatchDrawer shed={drawerShed} onClose={() => setDrawerKey(null)} />
    </Box>
  )
}

function LoadingSkeleton() {
  return (
    <Stack spacing={1.75}>
      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={128} sx={{ borderRadius: 2.5 }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
      {[0, 1].map((i) => (
        <Skeleton key={i} variant="rounded" height={300} sx={{ borderRadius: 3 }} />
      ))}
    </Stack>
  )
}
