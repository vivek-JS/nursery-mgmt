import React from "react"
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"

const boxSx = {
  p: 1.5,
  borderRadius: 1.5,
  border: "1px solid #e5e7eb",
  bgcolor: "#fff",
}

export default function RequestPacketsExtras({
  fmt,
  maxExcess,
  firstPackingName,
  excess,
  excessPkts,
  onBump,
  onClamp,
  raisingPkts,
  onShowRaising,
  attachedIntakes,
  showExcess = true,
  showRaising = true,
}) {
  if (!showExcess && !showRaising) return null
  return (
    <>
      {showExcess ? (
      <Box sx={boxSx}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography fontWeight={600} fontSize="0.875rem">
              Excess sowing
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max {fmt(maxExcess, 2)} pkt on {firstPackingName || "first packing"}
              {maxExcess <= 0 ? " (no stock left)" : ""}
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <IconButton size="small" onClick={() => onBump(-1)} disabled={excess <= 0}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <TextField
              size="small"
              type="number"
              value={excessPkts}
              onChange={(e) => onClamp(e.target.value)}
              disabled={maxExcess <= 0}
              inputProps={{
                min: 0,
                max: maxExcess,
                step: 0.01,
                style: { textAlign: "center", width: 64 },
              }}
            />
            <IconButton size="small" onClick={() => onBump(1)} disabled={excess >= maxExcess}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
      ) : null}

      {showRaising ? (
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            label="Customer seed packets"
            type="number"
            size="small"
            fullWidth
            value={raisingPkts}
            disabled
            helperText="Calculated from collected customer-seed batches"
          />
          <Button
            variant="outlined"
            size="small"
            onClick={onShowRaising}
            sx={{ minWidth: 190, height: 40, textTransform: "none", fontWeight: 700 }}
          >
            Add customer seed
          </Button>
        </Stack>
        {attachedIntakes.length > 0 && (
          <Stack spacing={0.75} mt={1}>
            {attachedIntakes.map((intake) => {
              const batches =
                intake.batches?.length > 0
                  ? intake.batches
                  : [
                      {
                        batchNumber: intake.batchNumber,
                        packets: intake.packetsRemaining ?? intake.packetsReceived,
                        expiryDate: intake.expiryDate,
                      },
                    ]
              return batches.map((batch, index) => {
                const attached = Number(batch.packets ?? intake.packetsReceived) || 0
                const available =
                  Number(batch.packetsRemaining ?? intake.packetsRemaining ?? attached) || 0
                return (
                  <Box
                    key={`${intake._id || intake.intakeNumber}-${batch._id || index}`}
                    sx={{ px: 1.25, py: 0.75, border: "1px solid #e5e7eb", borderRadius: 1, bgcolor: "#f8fafc" }}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      {batch.batchNumber || "Customer seed batch"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {" "}
                      · attached {fmt(attached, 2)} pkt
                      {Math.abs(available - attached) > 0.01
                        ? ` · available ${fmt(available, 2)} pkt`
                        : ""}
                      {batch.expiryDate
                        ? ` · expiry ${new Date(batch.expiryDate).toLocaleDateString("en-IN")}`
                        : ""}
                    </Typography>
                  </Box>
                )
              })
            })}
          </Stack>
        )}
      </Box>
      ) : null}
    </>
  )
}
