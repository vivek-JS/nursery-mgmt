import React, { useState } from "react"
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SpaIcon from "@mui/icons-material/Spa"
import EasyRequestSubtypeRow from "./EasyRequestSubtypeRow"

const HEAD = [
  "Variety",
  "Ready days",
  "Seed cover",
  "To sow",
  "Company seed",
  "Raising seed",
  "Packing",
  "Need / seed pkt",
  "Status",
  "Actions",
]

export default function EasyRequestPlantGroup({
  group,
  defaultOpen = true,
  onOrders,
  onRaisingOrders,
  onRequest,
  onGapClick,
  onCancelRequest,
  onRowClick,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const count = group.cards?.length || 0

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid #c8e6c9",
        overflow: "hidden",
        bgcolor: "#fff",
        boxShadow: "0 4px 18px rgba(22, 101, 52, 0.06)",
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 2,
          py: 1.35,
          cursor: "pointer",
          background: "linear-gradient(90deg, #e8f5e9 0%, #f1f8e9 55%, #fff 100%)",
          borderBottom: open ? "1px solid #c8e6c9" : "none",
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            bgcolor: "#dcfce7",
            color: "#166534",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SpaIcon sx={{ fontSize: 16 }} />
        </Box>
        <Typography fontWeight={900} fontSize="1.05rem" color="#14532d" flex={1}>
          {group.plantName}
        </Typography>
        <Typography variant="caption" fontWeight={700} color="text.secondary" mr={0.5}>
          {count} subtype{count === 1 ? "" : "s"}
        </Typography>
        <IconButton
          size="small"
          sx={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            color: "#166534",
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {HEAD.map((h) => (
                  <TableCell
                    key={h}
                    align={h === "Actions" ? "right" : "left"}
                    sx={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "#64748b",
                      bgcolor: "#fafafa",
                      borderColor: "#e8f5e9",
                      whiteSpace: "nowrap",
                      py: 1,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(group.cards || []).map((card) => (
                <EasyRequestSubtypeRow
                  key={`${card.plantId}-${card.subtypeId}`}
                  card={card}
                  onOrders={onOrders}
                  onRaisingOrders={onRaisingOrders}
                  onRequest={onRequest}
                  onGapClick={onGapClick}
                  onCancelRequest={onCancelRequest}
                  onRowClick={onRowClick}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  )
}
