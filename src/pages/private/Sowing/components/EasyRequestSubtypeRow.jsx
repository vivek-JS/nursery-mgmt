import React, { useState } from "react"
import { Box, Typography, Button, CircularProgress, TableRow, TableCell, Stack } from "@mui/material"
import NorthEastIcon from "@mui/icons-material/NorthEast"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import { getEasyRequestRowMetrics } from "./easyRequestRowMetrics"
import SowUrgencyChip from "./SowUrgencyChip"

export default function EasyRequestSubtypeRow({
  card,
  onOrders,
  onWhatsApp,
  onRequest,
  onGapClick,
  onCancelRequest,
  onRowClick,
}) {
  const [cancelling, setCancelling] = useState(false)
  const m = getEasyRequestRowMetrics(card)

  const handleCancel = async (e) => {
    e?.stopPropagation?.()
    if (!m.canCancel || cancelling || !onCancelRequest) return
    setCancelling(true)
    try {
      await onCancelRequest(m.activeReq, card)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <TableRow
      hover
      onClick={() => onRowClick?.(card)}
      sx={{
        cursor: onRowClick ? "pointer" : "default",
        "& td": { borderColor: "#e8f5e9", py: 1.25 },
        bgcolor: m.inProgress ? "#f8fafc" : m.requestPending && m.openPacks.length === 0 ? "#fffbeb" : "#fff",
      }}
    >
      <TableCell sx={{ minWidth: 140 }}>
        <Typography fontWeight={800} fontSize="0.9rem" color="#14532d">
          {card.subtypeName}
        </Typography>
        {(m.inProgress || (m.requestPending && m.activeReq)) && (
          <Typography variant="caption" display="block" fontWeight={700} color="text.secondary">
            {m.activeReq?.requestNumber || "—"}
          </Typography>
        )}
      </TableCell>

      <TableCell>
        <Typography fontWeight={800} fontSize="0.85rem">
          {m.ageDays === "—" ? "—" : `${m.ageDays}d ready`}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {m.orderCount} orders
        </Typography>
      </TableCell>

      <TableCell
        onClick={(e) => {
          e.stopPropagation()
          onGapClick?.(card)
        }}
        sx={{
          cursor: onGapClick ? "pointer" : "default",
          minWidth: 120,
          "&:hover": onGapClick ? { bgcolor: "#f0fdf4" } : undefined,
        }}
      >
        <Typography fontWeight={800} fontSize="0.8rem" color="#b45309">
          Overdue {m.fmt(m.dueGap)}
        </Typography>
        <Typography fontWeight={700} fontSize="0.75rem" color="#0f766e">
          Today {m.fmt(m.todayGap)}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: "0.65rem" }}>
          Total to sow {m.fmt(m.plants)}
        </Typography>
      </TableCell>

      <TableCell>
        <Typography fontWeight={800} fontSize="0.85rem">
          {m.fmt(m.needPkt, 1)} need
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {m.fmt(m.stockPkt, 1)} pkt in store
        </Typography>
      </TableCell>

      <TableCell>
        <SowUrgencyChip urgency={m.urgency} />
      </TableCell>

      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <Stack direction="row" spacing={0.75} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onOrders?.(card)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "#a7f3d0",
              color: "#14532d",
              bgcolor: "#fff",
              "&:hover": { borderColor: "#6ee7b7", bgcolor: "#f0fdf4" },
            }}
          >
            Orders
          </Button>
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={<WhatsAppIcon sx={{ fontSize: "16px !important" }} />}
            onClick={() => onWhatsApp?.(card)}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              bgcolor: "#16a34a",
              "&:hover": { bgcolor: "#15803d" },
            }}
          >
            WhatsApp
          </Button>
          {m.requestPending && m.canCancel ? (
            <Button
              size="small"
              variant="contained"
              color="error"
              disableElevation
              disabled={cancelling}
              onClick={handleCancel}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {cancelling ? <CircularProgress size={14} color="inherit" /> : "Cancel"}
            </Button>
          ) : m.openPacks.length > 0 ? (
            <Button
              size="small"
              variant="contained"
              disableElevation
              endIcon={<NorthEastIcon sx={{ fontSize: "14px !important" }} />}
              onClick={() => onRequest?.(card, m.openPacks)}
              sx={{
                textTransform: "none",
                fontWeight: 800,
                bgcolor: "#166534",
                "&:hover": { bgcolor: "#14532d" },
              }}
            >
              Request
            </Button>
          ) : m.canCancel ? (
            <Button
              size="small"
              variant="contained"
              color="error"
              disableElevation
              disabled={cancelling}
              onClick={handleCancel}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              {cancelling ? <CircularProgress size={14} color="inherit" /> : "Cancel"}
            </Button>
          ) : (
            <Box
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: m.inProgress ? "#dbeafe" : "#fef3c7",
                fontSize: "0.68rem",
                fontWeight: 700,
                color: m.inProgress ? "#1d4ed8" : "#92400e",
              }}
            >
              —
            </Box>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  )
}
