import React, { useCallback, useEffect, useState } from "react"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { CheckCircleOutline, Close, HighlightOff, Refresh } from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  EXPIRED: "default",
}

function StatusChip({ status }) {
  const label = { PENDING: "⏳ Pending", APPROVED: "✅ Approved", REJECTED: "❌ Rejected", EXPIRED: "⌛ Expired" }
  return <Chip size="small" color={STATUS_COLORS[status] || "default"} label={label[status] || status} />
}

// ---------------------------------------------------------------------------
// Single request card
// ---------------------------------------------------------------------------

function RequestCard({ req, onApprove, onReject, loading }) {
  const snap = req.orderSnapshot || {}
  const isPending = req.status === "PENDING"
  const expired = isPending && req.tokenExpiresAt && new Date() > new Date(req.tokenExpiresAt)

  return (
    <div
      className={`rounded-xl border shadow-sm p-4 transition-all ${
        isPending && !expired
          ? "border-amber-300 bg-amber-50"
          : req.status === "APPROVED"
          ? "border-green-200 bg-green-50/40"
          : req.status === "REJECTED"
          ? "border-red-200 bg-red-50/40"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Order</span>
            <span className="text-sm font-bold text-gray-900">#{snap.orderId || "—"}</span>
            <StatusChip status={expired ? "EXPIRED" : req.status} />
          </div>
          <div className="mt-1 text-sm font-semibold text-gray-800 truncate">
            {snap.farmerName || "Unknown Farmer"}
            {snap.village ? <span className="text-gray-500 font-normal">, {snap.village}</span> : null}
          </div>
          {snap.plantName && (
            <div className="text-xs text-gray-500 mt-0.5">
              {snap.plantName}
              {snap.numberOfPlants ? <span className="ml-1 font-medium">× {snap.numberOfPlants}</span> : null}
            </div>
          )}
        </div>

        {/* Rate comparison */}
        <div className="flex items-center gap-2 shrink-0 bg-white rounded-lg border border-gray-200 px-3 py-2">
          <div className="text-center">
            <div className="text-[10px] text-gray-400 font-medium">Current</div>
            <div className="text-base font-semibold text-gray-400 line-through">₹{req.previousRate}</div>
          </div>
          <span className="text-gray-400 text-lg">→</span>
          <div className="text-center">
            <div className="text-[10px] text-amber-600 font-medium">Requested</div>
            <div className="text-xl font-bold text-amber-700">₹{req.requestedRate}</div>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        {req.requestedBy?.name && (
          <span>
            Requested by: <strong className="text-gray-700">{req.requestedBy.name}</strong>
            {req.requestedBy.jobTitle ? <span className="ml-1 text-gray-400">({req.requestedBy.jobTitle})</span> : null}
          </span>
        )}
        <span>{moment(req.createdAt).format("DD MMM YYYY, HH:mm")}</span>
        {isPending && req.tokenExpiresAt && (
          <span className={expired ? "text-red-600 font-semibold" : "text-amber-600"}>
            {expired ? "Link expired" : `Expires ${moment(req.tokenExpiresAt).fromNow()}`}
          </span>
        )}
        {req.status === "APPROVED" && req.approvedBy?.name && (
          <span>
            Approved by: <strong className="text-green-700">{req.approvedBy.name}</strong>
            {req.approvedAt ? <span className="ml-1">· {moment(req.approvedAt).format("DD MMM, HH:mm")}</span> : null}
          </span>
        )}
        {req.status === "REJECTED" && (
          <>
            {req.rejectedBy?.name && (
              <span>
                Rejected by: <strong className="text-red-700">{req.rejectedBy.name}</strong>
                {req.rejectedAt ? <span className="ml-1">· {moment(req.rejectedAt).format("DD MMM, HH:mm")}</span> : null}
              </span>
            )}
            {req.rejectionReason && (
              <span className="text-red-600">Reason: {req.rejectionReason}</span>
            )}
          </>
        )}
      </div>

      {/* Action buttons — only for PENDING & not expired */}
      {isPending && !expired && (
        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-amber-200">
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={loading === `approve-${req._id}` ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutline />}
            disabled={!!loading}
            onClick={() => onApprove(req)}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={loading === `reject-${req._id}` ? <CircularProgress size={14} color="inherit" /> : <HighlightOff />}
            disabled={!!loading}
            onClick={() => onReject(req)}
            sx={{ textTransform: "none" }}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RateApprovalsPage() {
  const [tab, setTab] = useState(0) // 0=Pending, 1=History
  const [requests, setRequests] = useState([])
  const [fetching, setFetching] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  const fetchAll = useCallback(async () => {
    setFetching(true)
    try {
      const instance = NetworkManager(API.RATE_CHANGE_REQUEST.GET_ALL)
      const res = await instance.request({})
      setRequests(Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [])
    } catch (err) {
      Toast.error(err?.message || "Failed to load rate change requests")
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const pending = requests.filter((r) => r.status === "PENDING" && new Date() <= new Date(r.tokenExpiresAt))
  const expired = requests.filter((r) => r.status === "PENDING" && new Date() > new Date(r.tokenExpiresAt))
  const history = requests.filter((r) => r.status !== "PENDING" || new Date() > new Date(r.tokenExpiresAt))

  // ---------------------------------------------------------------------------
  // Approve
  // ---------------------------------------------------------------------------

  const handleApprove = async (req) => {
    setActionLoading(`approve-${req._id}`)
    try {
      const instance = NetworkManager(API.RATE_CHANGE_REQUEST.APPROVE_VIA_UI)
      const res = await instance.request({}, [req._id])
      if (res?.success || res?.data?.status === "Success" || res?.data?.status === "success") {
        Toast.success(`Rate change approved — order rate updated to ₹${req.requestedRate}`)
        fetchAll()
      } else {
        Toast.error(res?.error || "Failed to approve")
      }
    } catch (err) {
      Toast.error(err?.message || "Failed to approve")
    } finally {
      setActionLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Reject (with optional reason)
  // ---------------------------------------------------------------------------

  const openRejectDialog = (req) => {
    setRejectTarget(req)
    setRejectReason("")
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    setActionLoading(`reject-${rejectTarget._id}`)
    try {
      const instance = NetworkManager(API.RATE_CHANGE_REQUEST.REJECT_VIA_UI)
      const res = await instance.request({ rejectionReason: rejectReason }, [rejectTarget._id])
      if (res?.success || res?.data?.status === "Success" || res?.data?.status === "success") {
        Toast.success("Rate change request rejected")
        setRejectTarget(null)
        fetchAll()
      } else {
        Toast.error(res?.error || "Failed to reject")
      }
    } catch (err) {
      Toast.error(err?.message || "Failed to reject")
    } finally {
      setActionLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabRequests = tab === 0 ? [...pending, ...expired] : history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Typography variant="h5" fontWeight={700}>
            Rate Change Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review and approve rate change requests from office admins
          </Typography>
        </div>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchAll} disabled={fetching}>
            {fetching ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </div>

      {/* Summary chips */}
      {!fetching && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Chip
            color="warning"
            label={`${pending.length} Pending`}
            size="small"
            sx={{ fontWeight: 700 }}
          />
          <Chip
            color="success"
            label={`${requests.filter((r) => r.status === "APPROVED").length} Approved`}
            size="small"
            variant="outlined"
          />
          <Chip
            color="error"
            label={`${requests.filter((r) => r.status === "REJECTED").length} Rejected`}
            size="small"
            variant="outlined"
          />
          {expired.length > 0 && (
            <Chip
              color="default"
              label={`${expired.length} Expired`}
              size="small"
              variant="outlined"
            />
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        <Tab
          label={
            <span className="flex items-center gap-1.5">
              Pending
              {pending.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </span>
          }
        />
        <Tab label="History" />
      </Tabs>

      {/* Content */}
      {fetching ? (
        <div className="flex items-center justify-center py-16">
          <CircularProgress />
        </div>
      ) : tabRequests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">{tab === 0 ? "✅" : "📋"}</div>
          <div className="text-sm font-medium">
            {tab === 0 ? "No pending rate change requests" : "No history yet"}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tabRequests.map((req) => (
            <RequestCard
              key={req._id}
              req={req}
              onApprove={handleApprove}
              onReject={openRejectDialog}
              loading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Reject Rate Change
          <IconButton size="small" onClick={() => setRejectTarget(null)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {rejectTarget && (
            <>
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm">
                <span className="text-gray-500">Order</span>{" "}
                <strong>#{rejectTarget.orderSnapshot?.orderId}</strong> ·{" "}
                <span className="text-gray-500">Rate change</span>{" "}
                <strong>₹{rejectTarget.previousRate}</strong> → <strong>₹{rejectTarget.requestedRate}</strong>
              </div>
              <TextField
                label="Reason (optional)"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Rate not approved by management"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectTarget(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!!actionLoading}
            startIcon={actionLoading ? <CircularProgress size={14} color="inherit" /> : null}
            onClick={handleRejectConfirm}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
