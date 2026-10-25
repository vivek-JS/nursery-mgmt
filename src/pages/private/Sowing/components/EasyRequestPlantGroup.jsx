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
  Stack,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SpaIcon from "@mui/icons-material/Spa"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import EasyRequestSubtypeRow from "./EasyRequestSubtypeRow"
import SowUrgencyChip from "./SowUrgencyChip"
import { groupSowUrgency } from "./sowUrgency"
import { fmt } from "./sowingPackingUtils"

const HEAD = ["Variety", "Ready", "To sow", "Need / seed pkt", "Status", "Actions"]

export default function EasyRequestPlantGroup({
  group,
  defaultOpen = false,
  onOrders,
  onWhatsApp,
  onCropWhatsApp,
  onRequest,
  onGapClick,
  onCancelRequest,
  onRowClick,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const count = group.cards?.length || 0
  const urgency = groupSowUrgency(group.cards)

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
            flexShrink: 0,
          }}
        >
          <SpaIcon sx={{ fontSize: 16 }} />
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={900} fontSize="1.05rem" color="#14532d" noWrap>
            {group.plantName}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {count} subtype{count === 1 ? "" : "s"}
            </Typography>
            {urgency.due > 0 ? (
              <Typography variant="caption" fontWeight={800} color="#b91c1c">
                Overdue {fmt(urgency.due)}
              </Typography>
            ) : urgency.today > 0 ? (
              <Typography variant="caption" fontWeight={800} color="#c2410c">
                Today {fmt(urgency.today)}
              </Typography>
            ) : null}
          </Stack>
        </Box>
        <SowUrgencyChip urgency={urgency} />
        <IconButton
          size="small"
          title="WhatsApp this crop"
          onClick={(e) => {
            e.stopPropagation()
            onCropWhatsApp?.(group)
          }}
          sx={{ color: "#16a34a" }}
        >
          <WhatsAppIcon fontSize="small" />
        </IconButton>
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
                  onWhatsApp={onWhatsApp}
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
