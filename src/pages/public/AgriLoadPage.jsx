import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  Alert,
  Divider,
} from "@mui/material"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import LocalShippingIcon from "@mui/icons-material/LocalShipping"
import axiosInstance from "services/axiosConfig"

const AgriLoadPage = () => {
  const [searchParams] = useSearchParams()
  const orderRef = searchParams.get("orderRef") || searchParams.get("orderNumber") || ""
  const actorPhone = searchParams.get("actorPhone") || ""
  const agriOrders = searchParams.get("agriOrders") || ""

  const [status, setStatus] = useState("preview") // preview | confirming | success | declined | error | already_loaded
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  const loadPreview = useCallback(async () => {
    if (!orderRef || !actorPhone) {
      setStatus("error")
      setMessage("Invalid link — missing order or phone.")
      setPreviewLoading(false)
      return
    }
    try {
      setPreviewLoading(true)
      const res = await axiosInstance.get("/api/v1/agri-load-link/preview", {
        params: { orderRef, actorPhone, agriOrders: agriOrders || undefined },
      })
      const data = res?.data?.data || res?.data
      setPreview(data)
      if (!data?.found) {
        setStatus("error")
        setMessage(`No linked agri order found for #${orderRef}.`)
      } else if (data?.allLoaded) {
        setStatus("already_loaded")
        setMessage("All linked agri items are already marked LOADED.")
      } else {
        setStatus("preview")
      }
    } catch (err) {
      setStatus("error")
      setMessage(
        err?.response?.data?.message || err?.message || "Could not load order details."
      )
    } finally {
      setPreviewLoading(false)
    }
  }, [orderRef, actorPhone, agriOrders])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  const handleConfirm = async (confirmed) => {
    if (!confirmed) {
      setStatus("declined")
      setMessage("Load not confirmed. Agri items remain pending.")
      return
    }
    setStatus("confirming")
    try {
      const res = await axiosInstance.post("/api/v1/agri-load-link/confirm", {
        orderRef,
        actorPhone,
        agriOrders: agriOrders || undefined,
      })
      const data = res?.data?.data || res?.data
      const marked = data?.marked || []
      const already = data?.alreadyLoaded || []
      if (marked.length) {
        setStatus("success")
        setMessage(`Marked LOADED: ${marked.join(", ")}. Nursery dispatch / DC will proceed after shed load.`)
      } else if (already.length) {
        setStatus("already_loaded")
        setMessage(`Already LOADED: ${already.join(", ")}`)
      } else {
        setStatus("success")
        setMessage("Confirmed.")
      }
    } catch (err) {
      setStatus("error")
      if (err?.response?.status === 403) {
        setMessage("You are not authorized to confirm this load.")
      } else {
        setMessage(err?.response?.data?.message || err?.message || "Confirm failed.")
      }
    }
  }

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
      <Card sx={{ maxWidth: 440, width: "100%", borderRadius: 3, boxShadow: 4 }}>
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
              Agri Load Confirm
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
              राम एग्री इनपुट — वाहन पर लोड हुआ?
            </Typography>
          </Box>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {previewLoading && (
            <Stack alignItems="center" spacing={2} py={3}>
              <CircularProgress color="success" />
              <Typography variant="body2" color="text.secondary">
                Loading order details…
              </Typography>
            </Stack>
          )}

          {!previewLoading && status === "preview" && preview?.found && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Nursery order #{preview.nurseryOrderCode || orderRef}
              </Typography>
              <Divider />
              {(preview.items || []).map((item) => (
                <Box key={item.agriOrderNumber || item.agriOrderId} sx={{ py: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {item.productName || "Agri Input"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Agri {item.agriOrderNumber} · Qty {item.quantity} ·{" "}
                    {item.isLoaded ? "LOADED" : "PENDING"}
                  </Typography>
                </Box>
              ))}
              <Typography variant="body2" fontWeight={600} textAlign="center" pt={1}>
                Agri products loaded on vehicle?
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="center">
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={() => handleConfirm(true)}
                  sx={{ minWidth: 120, fontWeight: 700 }}
                >
                  YES — Loaded
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  onClick={() => handleConfirm(false)}
                  sx={{ minWidth: 100 }}
                >
                  NO
                </Button>
              </Stack>
            </Stack>
          )}

          {status === "confirming" && (
            <Stack alignItems="center" spacing={2} py={3}>
              <CircularProgress color="success" />
              <Typography variant="body2" color="text.secondary">
                Confirming load…
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
                Admin team notified on WhatsApp. You can close this page.
              </Typography>
            </Stack>
          )}

          {status === "already_loaded" && (
            <Stack alignItems="center" spacing={2} py={2}>
              <CheckCircleOutlineIcon sx={{ fontSize: iconSize, color: "info.main" }} />
              <Alert severity="info" sx={{ width: "100%" }}>
                {message}
              </Alert>
            </Stack>
          )}

          {status === "declined" && (
            <Stack alignItems="center" spacing={2} py={2}>
              <CancelOutlinedIcon sx={{ fontSize: iconSize, color: "warning.main" }} />
              <Alert severity="warning" sx={{ width: "100%" }}>
                {message}
              </Alert>
            </Stack>
          )}

          {status === "error" && (
            <Stack alignItems="center" spacing={2} py={2}>
              <CancelOutlinedIcon sx={{ fontSize: iconSize, color: "error.main" }} />
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
