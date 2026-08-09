import React, { useCallback, useEffect, useState } from "react"
import {
  Box,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import RaisingCollectForm from "../inventory/RaisingCollectForm"

function isRaisingOrder(sowingPlan) {
  const src = String(sowingPlan?.seedSource || "").toUpperCase()
  return src === "RAISING" || src === "MIXED" || Number(sowingPlan?.raisingSeedPackets) > 0
}

/**
 * Show / collect / edit raising intake on farmer order detail modal.
 */
export default function OrderRaisingIntakePanel({
  orderMongoId,
  sowingPlan,
  plantId,
  subtypeId,
  plantName,
  subtypeName,
  farmerName,
  farmerMobile,
  village,
  orderNumber,
  numberOfPlants,
  bookingSlot,
  onUpdated,
}) {
  const [intake, setIntake] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!orderMongoId) return
    try {
      setLoading(true)
      setError("")
      const instance = NetworkManager(API.sowing.GET_RAISING_BY_ORDER)
      const res = await instance.request({}, [orderMongoId])
      if (res?.data?.success) {
        setIntake(res.data.data || null)
      } else {
        setIntake(null)
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load raising intake")
      setIntake(null)
    } finally {
      setLoading(false)
    }
  }, [orderMongoId])

  useEffect(() => {
    load()
  }, [load])

  // Snapshot from order if intake API empty but plan says collected
  const snap = sowingPlan?.raisingIntake
  const collected =
    Boolean(intake) ||
    Boolean(sowingPlan?.raisingIntakeCollected) ||
    Boolean(sowingPlan?.raisingIntakeId)

  if (!isRaisingOrder(sowingPlan) && !collected) {
    return null
  }

  const formOrder = {
    orderId: orderMongoId,
    orderNumber: orderNumber || "—",
    farmerName: farmerName || "",
    farmerMobile: farmerMobile || "",
    village: village || "",
    plantId,
    subtypeId,
    plantName: plantName || "",
    subtypeName: subtypeName || "",
    numberOfPlants: numberOfPlants || 0,
    seedSource: sowingPlan?.seedSource || "RAISING",
    bookingSlot,
    packetsInHand: intake?.packetsRemaining || snap?.packetsRemaining || 0,
  }

  if (editing) {
    return (
      <Box className="mb-4">
        <RaisingCollectForm
          order={formOrder}
          intake={intake}
          onCancel={() => setEditing(false)}
          onSuccess={(data) => {
            setIntake(data)
            setEditing(false)
            onUpdated?.(data)
            load()
          }}
        />
      </Box>
    )
  }

  return (
    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 mb-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="font-medium text-emerald-900 text-sm">Raising seed (farmer packets)</h3>
        <div className="flex items-center gap-2">
          <Chip
            size="small"
            label={collected ? "Collected" : "Not collected"}
            sx={{
              height: 22,
              fontWeight: 700,
              bgcolor: collected ? "#a7f3d0" : "#fef3c7",
              color: collected ? "#065f46" : "#92400e",
            }}
          />
          <Button
            size="small"
            variant="contained"
            disableElevation
            onClick={() => setEditing(true)}
            disabled={loading || !plantId || !subtypeId}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              bgcolor: "#059669",
              "&:hover": { bgcolor: "#047857" },
              fontSize: "0.75rem",
            }}
          >
            {collected ? "Edit" : "Collect"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Box py={1} display="flex" justifyContent="center">
          <CircularProgress size={22} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : collected && (intake || snap) ? (
        <Stack spacing={0.75}>
          <Typography variant="body2" fontWeight={700} color="#065f46">
            {(intake || snap).intakeNumber || "Intake"} · batch{" "}
            {(intake || snap).batchNumber || "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Packets: {(intake || snap).packetsReceived ?? "—"}
            {intake?.packetsRemaining != null
              ? ` · remaining ${intake.packetsRemaining}`
              : snap?.packetsRemaining != null
                ? ` · remaining ${snap.packetsRemaining}`
                : ""}
            {(intake || snap).expiryDate
              ? ` · exp ${new Date((intake || snap).expiryDate).toLocaleDateString()}`
              : ""}
          </Typography>
          {(intake || snap).farmerName ? (
            <Typography variant="caption" color="text.secondary" display="block">
              From: {(intake || snap).farmerName}
            </Typography>
          ) : null}
          {(intake || snap).notes ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Notes: {(intake || snap).notes}
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            One collect per order — edit from here or Collect Raising Seeds page.
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Farmer seed not collected yet. Click Collect when packets arrive at office.
        </Typography>
      )}
    </div>
  )
}
