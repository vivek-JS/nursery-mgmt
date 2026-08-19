/**
 * @deprecated Prefer EasyRequestPlantGroup + EasyRequestSubtypeRow (Inventory Requests table).
 * Kept as a thin wrapper over shared metrics for any legacy callers.
 */
import React, { useState } from "react"
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  LinearProgress,
  CircularProgress,
} from "@mui/material"
import { colorForIndex } from "./sowingPackingUtils"
import { getEasyRequestRowMetrics } from "./easyRequestRowMetrics"

export default function EasyRequestCard({
  card,
  onOrders,
  onRaisingOrders,
  onRequest,
  onCardClick,
  onCancelRequest,
  onGapClick,
}) {
  const [cancelling, setCancelling] = useState(false)
  const m = getEasyRequestRowMetrics(card)
  const {
    plants,
    packs,
    multi,
    openPacks,
    coStock,
    raising,
    raisingOrders,
    raisingOrdersPlanned,
    raisingAvailable,
    raisingPendingCollect,
    isRaisingPlan,
    coverPct,
    stockOk,
    activeReq,
    inProgress,
    requestPending,
    statusLocked,
    fmt,
  } = m
  const canCancel =
    typeof onCancelRequest === "function" && m.canCancel

  const handleCancel = async (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    if (!canCancel || cancelling) return
    setCancelling(true)
    try {
      await onCancelRequest(activeReq, card)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onCardClick?.(card)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onCardClick?.(card)
        }
      }}
      sx={{
        p: 1.5,
        height: "100%",
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: inProgress
          ? "#93c5fd"
          : requestPending && openPacks.length === 0
            ? "#fcd34d"
            : raisingPendingCollect
              ? "#fbbf24"
              : isRaisingPlan
                ? "#6ee7b7"
                : "#d7e5dc",
        bgcolor: inProgress
          ? "#eff6ff"
          : requestPending && openPacks.length === 0
            ? "#fffbeb"
            : raisingPendingCollect
              ? "#fffbeb"
              : isRaisingPlan
                ? "#f0fdf4"
                : "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        boxShadow: "0 4px 14px rgba(26,90,60,0.06)",
        cursor: onCardClick ? "pointer" : "default",
        transition: "transform 0.15s",
        "&:hover": onCardClick ? { transform: "translateY(-2px)" } : undefined,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.75}>
        <Box minWidth={0}>
          <Typography fontWeight={800} fontSize="0.95rem" noWrap>
            {card.plantName}
            <Typography component="span" color="text.secondary" fontWeight={600} fontSize="0.85rem">
              {" "}
              · {card.subtypeName}
            </Typography>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {card.plantReadyDays || "—"}d · {card.orderCount || 0} orders
            {card.sowingBuffer ? ` · +${card.sowingBuffer}%` : ""}
          </Typography>
        </Box>
        {inProgress ? (
          <Chip size="small" label="Sowing in progress" sx={{ height: 22, fontSize: "0.62rem", fontWeight: 800, bgcolor: "#2563eb", color: "#fff" }} />
        ) : requestPending && openPacks.length === 0 ? (
          <Chip size="small" label="Request pending" sx={{ height: 22, fontSize: "0.62rem", fontWeight: 800, bgcolor: "#f59e0b", color: "#fff" }} />
        ) : isRaisingPlan ? (
          <Chip
            size="small"
            label={raisingAvailable ? `${raisingOrders} raising · in hand` : `${raisingOrdersPlanned} raising · not collected`}
            sx={{ height: 22, fontSize: "0.62rem", fontWeight: 800, bgcolor: raisingAvailable ? "#10b981" : "#f59e0b", color: "#fff", maxWidth: 160 }}
          />
        ) : null}
      </Stack>

      {(inProgress || (requestPending && activeReq)) && (
        <Box
          sx={{
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: inProgress ? "#dbeafe" : "#fef3c7",
            border: "1px solid",
            borderColor: inProgress ? "#93c5fd" : "#fcd34d",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={0.75}>
            <Box minWidth={0} flex={1}>
              <Typography fontSize="0.78rem" fontWeight={800} color={inProgress ? "#1d4ed8" : "#92400e"}>
                {inProgress ? "Sowing in Progress" : "Request awaiting issue"}
              </Typography>
              <Typography fontSize="0.7rem" fontWeight={600} color="text.secondary">
                {activeReq?.requestNumber || "—"}
                {activeReq?.packetsRequested != null ? ` · ${fmt(activeReq.packetsRequested, 2)} pkt` : ""}
              </Typography>
            </Box>
            {canCancel && (
              <Button
                size="small"
                variant="contained"
                color="error"
                disableElevation
                disabled={cancelling}
                onClick={handleCancel}
                sx={{ textTransform: "none", fontWeight: 900, fontSize: "0.72rem", minWidth: 72, bgcolor: "#dc2626", "&:hover": { bgcolor: "#b91c1c" } }}
              >
                {cancelling ? <CircularProgress size={14} color="inherit" /> : "Cancel"}
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {isRaisingPlan && !statusLocked && (
        <Box
          role={raisingOrders > 0 ? "button" : undefined}
          tabIndex={raisingOrders > 0 ? 0 : undefined}
          onClick={(e) => {
            e.stopPropagation()
            if (raisingOrders > 0) onRaisingOrders?.()
          }}
          onKeyDown={(e) => {
            if (raisingOrders <= 0) return
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              onRaisingOrders?.()
            }
          }}
          sx={{
            px: 1,
            py: 0.65,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: raisingAvailable ? "#6ee7b7" : "#fcd34d",
            bgcolor: raisingAvailable ? "#d1fae5" : "#fef3c7",
            cursor: raisingOrders > 0 ? "pointer" : "default",
          }}
        >
          <Typography fontSize="0.75rem" fontWeight={700} color={raisingAvailable ? "#065f46" : "#92400e"}>
            {raisingAvailable
              ? `Raising collected: ${raisingOrders} · ${fmt(raising, 2)} pkt`
              : `Farmer seed planned: ${raisingOrdersPlanned} · not collected`}
            {raisingOrders > 0 ? (
              <Typography component="span" fontSize="0.68rem" fontWeight={800} sx={{ ml: 0.75, textDecoration: "underline" }}>
                View
              </Typography>
            ) : null}
          </Typography>
        </Box>
      )}

      <Stack direction="row" spacing={1} alignItems="stretch">
        <Box
          role={onGapClick ? "button" : undefined}
          tabIndex={onGapClick ? 0 : undefined}
          onClick={(e) => {
            if (!onGapClick) return
            e.stopPropagation()
            onGapClick(card)
          }}
          onKeyDown={(e) => {
            if (!onGapClick) return
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              onGapClick(card)
            }
          }}
          sx={{
            flex: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: stockOk ? "#dcfce7" : "#ffedd5",
            minWidth: 0,
            cursor: onGapClick ? "pointer" : "default",
            "&:hover": onGapClick ? { filter: "brightness(0.97)" } : undefined,
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
            GAP
            {onGapClick ? (
              <Typography component="span" fontSize="0.62rem" fontWeight={800} sx={{ ml: 0.5 }}>
                · dates
              </Typography>
            ) : null}
          </Typography>
          <Typography fontWeight={900} fontSize="1.15rem" lineHeight={1.15}>
            {fmt(plants)}
          </Typography>
          {(Number(card.dueGap) > 0 || Number(card.todayGap) > 0) && (
            <Typography fontSize="0.62rem" fontWeight={700} color="text.secondary" noWrap>
              {Number(card.dueGap) > 0 ? `${fmt(card.dueGap)} overdue` : ""}
              {Number(card.dueGap) > 0 && Number(card.todayGap) > 0 ? " · " : ""}
              {Number(card.todayGap) > 0 ? `${fmt(card.todayGap)} today` : ""}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, px: 1, py: 0.75, borderRadius: 1.5, bgcolor: "#ecfeff", minWidth: 0 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
            CO. STOCK
          </Typography>
          <Typography fontWeight={800} fontSize="1.05rem" lineHeight={1.15} color="#0e7490">
            {fmt(coStock, 2)}
            <Typography component="span" variant="caption" color="text.secondary"> pkt</Typography>
          </Typography>
        </Box>
        <Box
          role={raisingOrders > 0 ? "button" : undefined}
          tabIndex={raisingOrders > 0 ? 0 : undefined}
          onClick={(e) => {
            e.stopPropagation()
            if (raisingOrders > 0) onRaisingOrders?.()
          }}
          onKeyDown={(e) => {
            if (raisingOrders <= 0) return
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              e.stopPropagation()
              onRaisingOrders?.()
            }
          }}
          sx={{
            flex: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1.5,
            bgcolor: raisingAvailable ? "#d1fae5" : raisingPendingCollect ? "#fef3c7" : "#f8fafc",
            minWidth: 0,
            cursor: raisingOrders > 0 ? "pointer" : "default",
            "&:hover": raisingOrders > 0 ? { filter: "brightness(0.97)" } : undefined,
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
            RAISING
          </Typography>
          <Typography
            fontWeight={800}
            fontSize="1.05rem"
            lineHeight={1.15}
            color={raisingAvailable ? "#047857" : raisingPendingCollect ? "#b45309" : "text.secondary"}
          >
            {raisingAvailable ? fmt(raising, 2) : raisingPendingCollect ? "0" : "—"}
            <Typography component="span" variant="caption" color="text.secondary"> pkt</Typography>
          </Typography>
          {raisingPendingCollect ? (
            <Typography variant="caption" fontWeight={700} color="#b45309">
              not collected
            </Typography>
          ) : null}
        </Box>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={coverPct}
        sx={{
          height: 5,
          borderRadius: 3,
          bgcolor: "#eef2f6",
          "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: stockOk ? "#16a34a" : "#ea580c" },
        }}
      />

      <Stack spacing={0.4}>
        {packs.slice(0, multi ? 3 : 1).map((p, i) => {
          const c = colorForIndex(i)
          const req = p.activeRequest || p.pendingRequest
          const packInProgress =
            req?.displayStatus === "sowing_in_progress" || req?.status === "issued"
          return (
            <Stack
              key={String(p.productId || p.code || p.name)}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 0.75, py: 0.35, borderRadius: 1, bgcolor: packInProgress ? "#dbeafe" : req ? "#fffbeb" : c.bg }}
            >
              <Typography fontSize="0.75rem" fontWeight={600} color={c.text} noWrap sx={{ maxWidth: "55%" }}>
                {p.name || p.code || "Seed"} · ≈{p.conversionFactor}
              </Typography>
              <Typography fontSize="0.72rem" fontWeight={700} color="text.secondary">
                {packInProgress ? "in progress" : req ? "requested" : `need ${fmt(p.packetsNeeded, 1)} · stock ${fmt(p.availablePackets, 1)}`}
              </Typography>
            </Stack>
          )
        })}
      </Stack>

      <Stack direction="row" spacing={0.75} mt="auto" onClick={(e) => e.stopPropagation()}>
        <Button size="small" onClick={onOrders} sx={{ textTransform: "none", minWidth: 0, px: 1 }}>
          Orders
        </Button>
        {openPacks.length > 0 ? (
          <Button
            size="small"
            variant="contained"
            disableElevation
            onClick={() => onRequest(openPacks)}
            sx={{ flex: 1, textTransform: "none", fontWeight: 800, bgcolor: "#0f766e", "&:hover": { bgcolor: "#0d9488" } }}
          >
            {multi ? "Combine" : "Request"}
          </Button>
        ) : canCancel ? (
          <Button
            size="small"
            variant="contained"
            color="error"
            disableElevation
            disabled={cancelling}
            onClick={handleCancel}
            sx={{ flex: 1, textTransform: "none", fontWeight: 900, bgcolor: "#dc2626", "&:hover": { bgcolor: "#b91c1c" } }}
          >
            {cancelling ? <CircularProgress size={16} color="inherit" /> : `Cancel ${activeReq?.requestNumber || "request"}`}
          </Button>
        ) : (
          <Chip
            size="small"
            label={inProgress ? "No action — sowing in progress" : "No action — request pending"}
            sx={{ flex: 1, height: 30, fontWeight: 700, bgcolor: inProgress ? "#dbeafe" : "#fef3c7", color: inProgress ? "#1d4ed8" : "#92400e" }}
          />
        )}
      </Stack>
    </Box>
  )
}
