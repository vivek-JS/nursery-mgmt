import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import AdminSowEntryDialog from "../components/AdminSowEntryDialog"
import { fmt } from "../components/sowingPackingUtils"

function toSowEntryCard(row) {
  if (!row) return null
  return {
    plantName: row.plantName,
    subtypeName: row.subtypeName,
    conversionFactor: row.conversionFactor,
    plantReadyDays: row.plantReadyDays,
    totalPlantsInProgress: row.remainingPlants || row.expectedPlants,
    activeRequest: row,
  }
}

/**
 * Issued sowing requests awaiting primary/shed completion — Office Admin fallback.
 */
export default function IssuedSowCompletePanel() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState("")
  const [entryRow, setEntryRow] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_ISSUED_SOWING_QUEUE)
      const res = await instance.request()
      const body = res?.data
      if (body?.success) {
        setRows(Array.isArray(body.data) ? body.data : [])
      } else {
        setRows([])
        setError(body?.message || "Failed to load issued queue")
      }
    } catch (e) {
      setRows([])
      setError(e?.response?.data?.message || e?.message || "Failed to load issued queue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const entryCard = toSowEntryCard(entryRow)

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
          <Box>
            <Typography fontWeight={900}>Complete issued sowing</Typography>
            <Typography variant="body2" color="text.secondary">
              Stock already issued — finish sowing here when the primary team is unavailable.
            </Typography>
          </Box>
          <Button size="small" onClick={load} disabled={loading} sx={{ textTransform: "none", fontWeight: 700 }}>
            Refresh
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <Alert severity="info" sx={{ py: 0.75 }}>
            No issued requests waiting for sow completion.
          </Alert>
        ) : (
          <Stack spacing={1}>
            {rows.map((row) => {
              const cf = Number(row.conversionFactor) || 1
              const pkts = Number(row.packetsIssued) || Number(row.packetsRequested) || 0
              const plants = Number(row.remainingPlants) || Number(row.expectedPlants) || Math.round(pkts * cf)
              const issued = row.issuedDate
                ? new Date(row.issuedDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })
                : "—"
              return (
                <Box
                  key={String(row._id)}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    border: "1px solid #bfdbfe",
                    bgcolor: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Box minWidth={0}>
                    <Typography fontWeight={800} fontSize="0.95rem">
                      {row.plantName} · {row.subtypeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {row.requestNumber} · issued {issued} · {fmt(pkts, 2)} pkt · ~{fmt(plants)} plants left
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                      {row.seedSource && (
                        <Chip size="small" label={row.seedSource} sx={{ height: 20, fontSize: "0.65rem" }} />
                      )}
                      {row.isExcess && (
                        <Chip
                          size="small"
                          label="Excess"
                          sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#fef3c7" }}
                        />
                      )}
                      {row.linkedOrderCount > 0 && (
                        <Chip
                          size="small"
                          label={`${row.linkedOrderCount} orders`}
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                      )}
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setEntryRow(row)}
                    sx={{ textTransform: "none", fontWeight: 800, flexShrink: 0 }}
                  >
                    Complete sow
                  </Button>
                </Box>
              )
            })}
          </Stack>
        )}
      </Paper>

      <AdminSowEntryDialog
        open={Boolean(entryRow)}
        card={entryCard}
        request={entryRow}
        onClose={() => setEntryRow(null)}
        onSuccess={() => {
          Toast.success("Sowing completed")
          setEntryRow(null)
          load()
        }}
      />
    </>
  )
}
