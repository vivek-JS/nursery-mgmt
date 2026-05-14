import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  Alert,
} from "@mui/material"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import LocalShippingIcon from "@mui/icons-material/LocalShipping"
import axiosInstance from "services/axiosConfig"

const AgriLoadPage = () => {
  const [searchParams] = useSearchParams()
  const orderNumber = searchParams.get("orderNumber")
  const actorPhone = searchParams.get("actorPhone")

  const [status, setStatus] = useState("loading") // loading | success | error | already_loaded
  const [message, setMessage] = useState("")
  const [orderRef, setOrderRef] = useState(orderNumber || "")

  const markLoaded = useCallback(async () => {
    if (!orderNumber || !actorPhone) {
      setStatus("error")
      setMessage("Invalid link — missing order number or phone.")
      return
    }
    try {
      const res = await axiosInstance.get("/api/v1/agri-load-link/mark-loaded", {
        params: { orderNumber, actorPhone },
      })
      // Backend returns HTML on success; axios still resolves with 200
      // Check response data for already-loaded signal
      const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data)
      if (text.toLowerCase().includes("already")) {
        setStatus("already_loaded")
        setMessage(`ऑर्डर ${orderNumber} पहले ही LOADED मार्क हो चुका है।`)
      } else {
        setStatus("success")
        setMessage(`ऑर्डर ${orderNumber} सफलतापूर्वक LOADED मार्क किया गया!`)
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.statusText ||
        err?.message ||
        "Something went wrong."
      if (err?.response?.status === 403) {
        setStatus("error")
        setMessage("आप इस लिंक का उपयोग करने के लिए अधिकृत नहीं हैं।")
      } else if (err?.response?.status === 404) {
        setStatus("error")
        setMessage(`ऑर्डर ${orderNumber} नहीं मिला।`)
      } else {
        setStatus("error")
        setMessage(msg)
      }
    }
  }, [orderNumber, actorPhone])

  useEffect(() => {
    markLoaded()
  }, [markLoaded])

  const iconSize = 64

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f0f4f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: "100%", borderRadius: 3, boxShadow: 4 }}>
        {/* Header */}
        <Box
          sx={{
            bgcolor: "success.main",
            px: 3,
            py: 2.5,
            borderRadius: "12px 12px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <LocalShippingIcon sx={{ color: "white", fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700} color="white">
              Agri Load — Mark Loaded
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
              राम एग्री इनपुट — वाहन लोडिंग
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {status === "loading" && (
            <Stack alignItems="center" spacing={2} py={3}>
              <CircularProgress color="success" />
              <Typography variant="body2" color="text.secondary">
                ऑर्डर {orderRef} मार्क हो रहा है…
              </Typography>
            </Stack>
          )}

          {status === "success" && (
            <Stack alignItems="center" spacing={2} py={2}>
              <CheckCircleOutlineIcon sx={{ fontSize: iconSize, color: "success.main" }} />
              <Typography variant="h6" fontWeight={700} color="success.main" textAlign="center">
                LOADED ✓
              </Typography>
              <Alert severity="success" sx={{ width: "100%" }}>
                {message}
              </Alert>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                अब आप यह विंडो बंद कर सकते हैं।
              </Typography>
            </Stack>
          )}

          {status === "already_loaded" && (
            <Stack alignItems="center" spacing={2} py={2}>
              <CheckCircleOutlineIcon sx={{ fontSize: iconSize, color: "info.main" }} />
              <Typography variant="h6" fontWeight={700} color="info.main" textAlign="center">
                Already Loaded
              </Typography>
              <Alert severity="info" sx={{ width: "100%" }}>
                {message}
              </Alert>
            </Stack>
          )}

          {status === "error" && (
            <Stack alignItems="center" spacing={2} py={2}>
              <CancelOutlinedIcon sx={{ fontSize: iconSize, color: "error.main" }} />
              <Typography variant="h6" fontWeight={700} color="error.main" textAlign="center">
                Error
              </Typography>
              <Alert severity="error" sx={{ width: "100%" }}>
                {message}
              </Alert>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default AgriLoadPage
