import React from "react"
import { Alert, Box, Chip, Typography } from "@mui/material"
import { ADVANCE_OPTIONS } from "../deliveryReportConstants"

export default function StepAdvanceOnly({ advancePayment, onAdvanceChange }) {
  const toggle = (id) => {
    const set = new Set(advancePayment || [])
    if (set.has(id)) set.delete(id)
    else set.add(id)
    onAdvanceChange([...set])
  }

  const selectAll = () => onAdvanceChange(ADVANCE_OPTIONS.map((o) => o.id))

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Advance orders only
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        फक्त advance payment असलेले orders दाखवा — जमा झालेले, pending, किंवा दोन्ही.
      </Typography>

      {!advancePayment?.length ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          किमान एक advance filter निवडा.
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        {ADVANCE_OPTIONS.map((opt) => {
          const active = (advancePayment || []).includes(opt.id)
          return (
            <Chip
              key={opt.id}
              label={opt.label}
              onClick={() => toggle(opt.id)}
              color={active ? "primary" : "default"}
              variant={active ? "filled" : "outlined"}
              title={opt.hint}
            />
          )
        })}
      </Box>

      <Chip
        size="small"
        label="Both (all advance orders)"
        onClick={selectAll}
        variant="outlined"
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
        Report मध्ये फक्त निवडलेल्या advance स्थितीचे orders दिसतील.
      </Typography>
    </Box>
  )

}
