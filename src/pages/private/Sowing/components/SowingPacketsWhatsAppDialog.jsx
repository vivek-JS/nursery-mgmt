import React, { useEffect, useMemo, useState } from "react"

function WhatsAppLine({ text }) {
  const parts = String(text || "").split(/(\*[^*\n]+\*)/g)
  return (
    <div>
      {parts.map((part, i) =>
        /^\*[^*]+\*$/.test(part) ? (
          <strong key={i}>{part.slice(1, -1)}</strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
      {text ? null : "\u00a0"}
    </div>
  )
}
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import { Toast } from "helpers/toasts/toastHelper"
import { remainingPlantsOf } from "./sowingPackingUtils"
import {
  buildPacketsToSowMessage,
  packetsToSowOf,
  urgencyOf,
} from "./sowingPacketsToSowMessage"

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement("textarea")
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand("copy")
  document.body.removeChild(el)
}

export default function SowingPacketsWhatsAppDialog({
  open,
  onClose,
  card,
  orders = [],
}) {
  const [lang, setLang] = useState("mr")
  const [picked, setPicked] = useState([])

  useEffect(() => {
    if (!open) return
    setPicked(orders.map((o) => String(o.orderId)))
  }, [open, orders])

  const selected = useMemo(
    () => orders.filter((o) => picked.includes(String(o.orderId))),
    [orders, picked]
  )
  const text = useMemo(
    () => buildPacketsToSowMessage({ card, rows: selected, lang }),
    [card, selected, lang]
  )
  const { remaining, packets } = packetsToSowOf(card, selected)

  const toggle = (id) => {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const onCopy = async () => {
    try {
      await copyText(text)
      Toast.success("Message copied — paste it in WhatsApp")
    } catch {
      Toast.error("Could not copy. Select the text and copy it.")
    }
  }

  const onShare = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <WhatsAppIcon sx={{ color: "#16a34a", mr: 1 }} />
        <Box flex={1}>
          <Typography fontWeight={800}>लागवड झाली पाहिजे</Typography>
          <Typography variant="caption" color="text.secondary">
            {card?.plantName} · {card?.subtypeName} · ~{packets.toFixed(1)} pkt ·{" "}
            {remaining.toLocaleString("en-IN")} plants
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={lang}
          onChange={(_, v) => v && setLang(v)}
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="mr">मराठी</ToggleButton>
          <ToggleButton value="en">English</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" fontWeight={800} display="block" mb={0.5}>
          Orders
        </Typography>
        <Stack spacing={0}>
          {orders.map((o) => {
            const id = String(o.orderId)
            const u = urgencyOf(o.daysUntilSow)
            return (
              <FormControlLabel
                key={id}
                control={
                  <Checkbox
                    size="small"
                    checked={picked.includes(id)}
                    onChange={() => toggle(id)}
                  />
                }
                label={
                  <Typography variant="body2">
                    #{o.orderNumber} · {remainingPlantsOf(o).toLocaleString("en-IN")}{" "}
                    leftover
                    {u.en ? ` · ${u.en}` : ""}
                  </Typography>
                }
              />
            )
          })}
        </Stack>
        {orders.length > 0 && !selected.length && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Select at least one order.
          </Alert>
        )}
        <Box
          sx={{
            mt: 1.5,
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            whiteSpace: "pre-wrap",
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.45,
          }}
        >
          {String(text || "")
            .split("\n")
            .map((line, i) => (
              <WhatsAppLine key={i} text={line} />
            ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onCopy} disabled={!text}>
          Copy
        </Button>
        <Button
          variant="contained"
          startIcon={<WhatsAppIcon />}
          disabled={!text}
          onClick={onShare}
          sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}
        >
          WhatsApp
        </Button>
      </DialogActions>
    </Dialog>
  )
}
