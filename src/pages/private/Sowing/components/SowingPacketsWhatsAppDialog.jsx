import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import { Toast } from "helpers/toasts/toastHelper"
import SowingPacketsWhatsAppSelect from "./SowingPacketsWhatsAppSelect"
import {
  buildSowNeededMessage,
  plantKeyOf,
  varietyKeyOf,
} from "./sowingPacketsToSowMessage"

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

function normalizeBundles(bundles, card, orders) {
  if (Array.isArray(bundles) && bundles.length) return bundles
  if (card) return [{ card, orders: orders || [] }]
  return []
}

export default function SowingPacketsWhatsAppDialog({
  open,
  onClose,
  card,
  orders = [],
  bundles: givenBundles,
  loading = false,
}) {
  const [lang, setLang] = useState("mr")
  const [plants, setPlants] = useState(() => new Set())
  const [varieties, setVarieties] = useState(() => new Set())
  const [pickedOrders, setPickedOrders] = useState(() => new Set())

  const allBundles = useMemo(
    () => normalizeBundles(givenBundles, card, orders),
    [givenBundles, card, orders]
  )

  useEffect(() => {
    if (!open) return
    setPlants(new Set(allBundles.map((b) => plantKeyOf(b.card))))
    setVarieties(new Set(allBundles.map((b) => varietyKeyOf(b.card))))
    setPickedOrders(
      new Set(
        allBundles.flatMap((b) =>
          (b.orders || []).map((o) => String(o.orderId || o.orderNumber))
        )
      )
    )
  }, [open, allBundles])

  const selectedBundles = useMemo(
    () =>
      allBundles
        .filter(
          (b) =>
            plants.has(plantKeyOf(b.card)) && varieties.has(varietyKeyOf(b.card))
        )
        .map((b) => ({
          card: b.card,
          rows: (b.orders || []).filter((o) =>
            pickedOrders.has(String(o.orderId || o.orderNumber))
          ),
        })),
    [allBundles, plants, varieties, pickedOrders]
  )

  const text = useMemo(
    () => buildSowNeededMessage({ bundles: selectedBundles, lang }),
    [selectedBundles, lang]
  )

  const cropCount = new Set(selectedBundles.map((b) => plantKeyOf(b.card))).size
  const orderCount = selectedBundles.reduce((s, b) => s + (b.rows?.length || 0), 0)

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1 }}>
        <WhatsAppIcon sx={{ color: "#16a34a", mr: 1 }} />
        <Box flex={1}>
          <Typography fontWeight={800}>लागवड झाली पाहिजे</Typography>
          <Typography variant="caption" color="text.secondary">
            Crop-wise · then variety · then orders · {cropCount} crop
            {cropCount === 1 ? "" : "s"} · {orderCount} selected
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
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
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
              <Box flex={1} minWidth={0}>
                <SowingPacketsWhatsAppSelect
                  bundles={allBundles}
                  lang={lang}
                  plants={plants}
                  varieties={varieties}
                  orders={pickedOrders}
                  onPlants={setPlants}
                  onVarieties={setVarieties}
                  onOrders={setPickedOrders}
                />
              </Box>
              <Box
                flex={1}
                minWidth={0}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.45,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {String(text || "")
                  .split("\n")
                  .map((line, i) => (
                    <WhatsAppLine key={i} text={line} />
                  ))}
              </Box>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onCopy} disabled={!text || loading}>
          Copy
        </Button>
        <Button
          variant="contained"
          startIcon={<WhatsAppIcon />}
          disabled={!text || loading}
          onClick={onShare}
          sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" } }}
        >
          WhatsApp
        </Button>
      </DialogActions>
    </Dialog>
  )
}
