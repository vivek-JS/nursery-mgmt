import React, { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  Chip,
  Alert,
} from "@mui/material"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty"
import axiosInstance from "services/axiosConfig"

const STATUS_COLORS = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  EXPIRED: "default",
}

const RateApprovalPage = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const phone = searchParams.get("phone")

  const [requestData, setRequestData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [actionResult, setActionResult] = useState(null) // { success, message }
  const [timeLeft, setTimeLeft] = useState(null)

  const fetchRequest = useCallback(async () => {
    if (!token) {
      setFetchError("No token provided in the link.")
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await axiosInstance.get(`/api/v1/rate-change-requests/by-token/${token}`)
      setRequestData(res.data?.data || null)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load approval request."
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchRequest()
  }, [fetchRequest])

  // Countdown timer
  useEffect(() => {
    if (!requestData?.tokenExpiresAt || requestData.status !== "PENDING") return

    const tick = () => {
      const diff = new Date(requestData.tokenExpiresAt) - Date.now()
      if (diff <= 0) {
        setTimeLeft("Expired")
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h}h ${m}m ${s}s remaining`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [requestData])

  const handleApprove = async () => {
    if (!token || !phone) {
      setActionResult({ success: false, message: "Missing token or phone in the link." })
      return
    }
    setApproving(true)
    try {
      const res = await axiosInstance.post("/api/v1/rate-change-requests/approve-via-link", {
        token,
        phone,
      })
      setActionResult({
        success: true,
        message: res.data?.message || "Rate change approved successfully!",
      })
      // Refresh to show updated status
      fetchRequest()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to approve. Please try again."
      setActionResult({ success: false, message: msg })
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (fetchError) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 480, width: "100%", borderRadius: 3, boxShadow: 4 }}>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <CancelOutlinedIcon sx={{ fontSize: 56, color: "error.main", mb: 2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Unable to load request
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fetchError}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (!requestData) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 480, width: "100%", borderRadius: 3, boxShadow: 4 }}>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              Request not found.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const { status, previousRate, requestedRate, orderSnapshot, requestedBy, tokenExpiresAt } =
    requestData

  const isExpiredOrDone = status !== "PENDING"

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
      <Card
        sx={{
          maxWidth: 500,
          width: "100%",
          borderRadius: 3,
          boxShadow: 4,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: "primary.main",
            px: 3,
            py: 2.5,
            borderRadius: "12px 12px 0 0",
          }}
        >
          <Typography variant="h6" fontWeight={700} color="white">
            Rate Change Approval
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5 }}>
            Review and approve the requested rate change
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* Status chip */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Chip
              label={status}
              color={STATUS_COLORS[status] || "default"}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            {status === "PENDING" && timeLeft && (
              <Typography variant="caption" color="text.secondary">
                ⏱ {timeLeft}
              </Typography>
            )}
          </Stack>

          {/* Order details */}
          <Stack spacing={1.5} mb={2.5}>
            <DetailRow
              label="Order #"
              value={orderSnapshot?.orderId ?? "—"}
            />
            <DetailRow
              label="Farmer"
              value={orderSnapshot?.farmerName || "—"}
            />
            <DetailRow
              label="Village"
              value={orderSnapshot?.village || "—"}
            />
            <DetailRow
              label="Plant"
              value={
                orderSnapshot?.plantName
                  ? `${orderSnapshot.plantName}${
                      orderSnapshot?.numberOfPlants
                        ? ` × ${orderSnapshot.numberOfPlants}`
                        : ""
                    }`
                  : "—"
              }
            />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {/* Rate change */}
          <Box
            sx={{
              bgcolor: "#fff8e1",
              borderRadius: 2,
              p: 2,
              mb: 2.5,
              border: "1px solid #ffe082",
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Rate Change
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Typography
                variant="h5"
                fontWeight={700}
                color="text.secondary"
                sx={{ textDecoration: "line-through" }}
              >
                ₹{previousRate}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                →
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                ₹{requestedRate}
              </Typography>
            </Stack>
          </Box>

          {requestedBy?.name && (
            <Typography variant="body2" color="text.secondary" mb={2.5}>
              Requested by:{" "}
              <strong>
                {requestedBy.name}
                {requestedBy.jobTitle ? ` (${requestedBy.jobTitle})` : ""}
              </strong>
            </Typography>
          )}

          {/* Action feedback */}
          {actionResult && (
            <Alert
              severity={actionResult.success ? "success" : "error"}
              sx={{ mb: 2 }}
              onClose={() => setActionResult(null)}
            >
              {actionResult.message}
            </Alert>
          )}

          {/* Status-specific messages */}
          {status === "APPROVED" && (
            <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
              This rate change has already been approved.
            </Alert>
          )}
          {status === "REJECTED" && (
            <Alert severity="error" icon={<CancelOutlinedIcon />} sx={{ mb: 2 }}>
              This rate change was rejected.
              {requestData.rejectionReason ? ` Reason: ${requestData.rejectionReason}` : ""}
            </Alert>
          )}
          {status === "EXPIRED" && (
            <Alert severity="warning" icon={<HourglassEmptyIcon />} sx={{ mb: 2 }}>
              This approval link has expired (24-hour window).
            </Alert>
          )}

          {/* Approve button */}
          {!isExpiredOrDone && (
            <Button
              variant="contained"
              color="success"
              size="large"
              fullWidth
              disabled={approving}
              onClick={handleApprove}
              startIcon={
                approving ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <CheckCircleOutlineIcon />
                )
              }
              sx={{ fontWeight: 600, py: 1.5 }}
            >
              {approving ? "Approving…" : "Approve Rate Change"}
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

const DetailRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500} textAlign="right">
      {value}
    </Typography>
  </Stack>
)

export default RateApprovalPage
