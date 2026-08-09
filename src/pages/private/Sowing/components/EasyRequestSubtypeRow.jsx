import React, { useState } from "react"
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  TableRow,
  TableCell,
  Stack,
} from "@mui/material"
import SpaIcon from "@mui/icons-material/Spa"
import NorthEastIcon from "@mui/icons-material/NorthEast"
import { getEasyRequestRowMetrics } from "./easyRequestRowMetrics"

const STATUS_SX = {
  ok: { bgcolor: "#dcfce7", color: "#166534" },
  progress: { bgcolor: "#dbeafe", color: "#1d4ed8" },
  pending: { bgcolor: "#fef3c7", color: "#92400e" },
  raising: { bgcolor: "#ffedd5", color: "#9a3412" },
  raisingOk: { bgcolor: "#d1fae5", color: "#065f46" },
  gap: { bgcolor: "#ffedd5", color: "#c2410c" },
}

export default function EasyRequestSubtypeRow({
  card,
  onOrders,
  onRaisingOrders,
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
        bgcolor: m.inProgress
          ? "#f8fafc"
          : m.requestPending && m.openPacks.length === 0
            ? "#fffbeb"
            : "#fff",
      }}
    >
      <TableCell sx={{ minWidth: 140 }}>
        <Typography fontWeight={800} fontSize="0.9rem" color="#14532d">
          {card.subtypeName}
        </Typography>
        {m.sku ? (
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {m.sku}
          </Typography>
        ) : null}
        {(m.inProgress || (m.requestPending && m.activeReq)) && (
          <Typography variant="caption" display="block" fontWeight={700} color="text.secondary">
            {m.activeReq?.requestNumber || "—"}
            {m.activeReq?.packetsRequested != null
              ? ` · ${m.fmt(m.activeReq.packetsRequested, 2)} pkt`
              : ""}
          </Typography>
        )}
      </TableCell>

      <TableCell>
        <Typography fontWeight={800} fontSize="0.85rem">
          {m.ageDays === "—" ? "—" : `${m.ageDays} days`}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {m.orderCount} orders
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: "0.62rem" }}>
          until delivery-ready
        </Typography>
      </TableCell>

      <TableCell sx={{ minWidth: 130 }}>
        <Typography
          fontSize="0.75rem"
          fontWeight={800}
          color={m.stockOk ? "#15803d" : "#ea580c"}
          mb={0.25}
        >
          {m.stockOk ? "Enough seed" : `Seed covers ${m.coverPct}%`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={m.coverPct}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: "#e8f5e9",
            mb: 0.35,
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              bgcolor: m.stockOk ? "#166534" : "#ea580c",
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: "0.65rem" }}>
          {m.fmt(m.availPlants)} seed-plants / {m.fmt(m.plants)} need
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
        <Typography fontWeight={800} fontSize="0.9rem" color="#0e7490">
          {m.fmt(m.coStock, 2)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          packets in store
        </Typography>
      </TableCell>

      <TableCell
        onClick={(e) => {
          e.stopPropagation()
          onRaisingOrders?.(card)
        }}
        sx={{
          cursor: "pointer",
          "&:hover": { bgcolor: "#ecfdf5" },
        }}
      >
        <Typography
          fontWeight={800}
          fontSize="0.9rem"
          color={
            m.raisingAvailable ? "#047857" : m.raisingOrders > 0 ? "#b45309" : "text.secondary"
          }
        >
          {m.raisingAvailable
            ? m.fmt(m.raising, 2)
            : m.raisingOrders > 0
              ? "0"
              : "—"}{" "}
          <Typography component="span" variant="caption" color="text.secondary">
            pkt
          </Typography>
        </Typography>
        {m.raisingOrders > 0 ? (
          <Typography variant="caption" fontWeight={700} color="#065f46" sx={{ textDecoration: "underline" }}>
            {m.raisingOrders} orders · click
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.62rem" }}>
            farmer seed
          </Typography>
        )}
      </TableCell>

      <TableCell sx={{ maxWidth: 140 }}>
        <Typography fontSize="0.78rem" fontWeight={600} color="text.secondary" noWrap>
          {m.packingLabel}
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
        <Chip
          size="small"
          icon={m.statusKind === "ok" || m.statusKind === "raisingOk" ? <SpaIcon /> : undefined}
          label={m.statusLabel}
          sx={{
            height: 26,
            fontWeight: 800,
            fontSize: "0.68rem",
            ...STATUS_SX[m.statusKind],
            "& .MuiChip-icon": { color: "inherit", fontSize: 14 },
          }}
        />
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
          {m.openPacks.length > 0 ? (
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
              {m.multi ? "Combine" : "Request"}
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
