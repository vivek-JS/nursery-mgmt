import React, { memo, useState } from "react"
import { Box, Typography, Collapse, IconButton } from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { fmtNum } from "./directSowUtils"

function DirectSowOrderPeek({ orders = [] }) {
  const [open, setOpen] = useState(false)
  if (!orders.length) return null

  const total = orders.reduce((s, o) => s + (Number(o.plants) || 0), 0)

  return (
    <Box sx={{ mb: 0.75 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          bgcolor: "#f8fafc",
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          border: "1px solid #e2e8f0",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <Typography variant="caption" fontWeight={700} fontSize="0.62rem">
          {orders.length} ord · {fmtNum(total)}
        </Typography>
        <IconButton size="small" sx={{ p: 0.2 }}>
          <ExpandMoreIcon
            sx={{ fontSize: 16, transform: open ? "rotate(180deg)" : "none", transition: "0.15s" }}
          />
        </IconButton>
      </Box>
      <Collapse in={open} unmountOnExit timeout={120}>
        <Box sx={{ pt: 0.4, maxHeight: 88, overflow: "auto" }}>
          {orders.map((o) => (
            <Typography
              key={String(o.orderId)}
              variant="caption"
              display="block"
              fontSize="0.6rem"
              color="text.secondary"
              lineHeight={1.4}
            >
              #{o.orderNumber} · {fmtNum(o.plants)}
            </Typography>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

export default memo(DirectSowOrderPeek)
