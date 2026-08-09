import React, { memo, useState } from "react"
import { Box, TextField, Button, Tooltip } from "@mui/material"
import SaveIcon from "@mui/icons-material/Save"

function DirectSowMonthToolbar({ defaultReadyDays = "", onApply }) {
  const [val, setVal] = useState(defaultReadyDays ? String(defaultReadyDays) : "")

  return (
    <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
      <TextField
        size="small"
        placeholder={defaultReadyDays ? `Avg ${defaultReadyDays}` : "Ready days"}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        sx={{ width: 100, bgcolor: "#fff" }}
        inputProps={{ min: 0 }}
      />
      <Tooltip title="Apply ready days to all cards in this month">
        <Button
          size="small"
          variant="outlined"
          color="success"
          startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
          onClick={() => onApply?.(val)}
          sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.72rem", py: 0.25 }}
        >
          Apply
        </Button>
      </Tooltip>
    </Box>
  )
}

export default memo(DirectSowMonthToolbar)
