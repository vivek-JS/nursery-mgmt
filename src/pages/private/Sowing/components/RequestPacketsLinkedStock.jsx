import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import LinkIcon from "@mui/icons-material/Link"
import { NetworkManager, API } from "network/core"
import SubtypeSeedLinkDialog from "../../inventory/components/SubtypeSeedLinkDialog"
import RequestPacketsStockUpdateDialog from "./RequestPacketsStockUpdateDialog"
import {
  fmt,
  packKey,
  packingIsIssued,
  plantsPerPacket,
} from "./sowingPackingUtils"

const rowSx = (checked, blocked) => ({
  p: 1.5,
  borderRadius: 1.5,
  bgcolor: "#fff",
  border: "1px solid #e5e7eb",
  borderColor: checked && !blocked ? "teal" : "#e5e7eb",
  opacity: blocked ? 0.55 : 1,
})

function linkToPacking(link) {
  const product = link.productId && typeof link.productId === "object" ? link.productId : null
  const productId = product?._id || link.productId || null
  const tpp = Number(product?.tentativePlantsPerPacket) || Number(link.tentativePlantsPerPacket)
  return {
    productId,
    name: link.displayName || product?.name || (link.source === "RAM_AGRI" ? "Input seed" : "Biotech seed"),
    code: product?.code || "",
    source: link.source === "RAM_AGRI" ? "Input" : "Biotech",
    conversionFactor: Number.isFinite(tpp) && tpp > 0 ? tpp : 1,
    tentativePlantsPerPacket: Number.isFinite(tpp) && tpp > 0 ? tpp : null,
    availablePackets: Number(link.availableStock) || Number(product?.currentStock) || 0,
    pendingRequest: null,
    fromLink: true,
  }
}

export default function RequestPacketsLinkedStock({
  card,
  packings,
  selectedKeys,
  alloc,
  showOtherPackings,
  multi,
  onToggle,
  onAlloc,
  onShowOthers,
  onPackingsRefresh,
  fmt: fmtFn = fmt,
}) {
  const [links, setLinks] = useState([])
  const [linkOpen, setLinkOpen] = useState(false)
  const [stockTarget, setStockTarget] = useState(null)

  const loadLinks = async () => {
    if (!card?.plantId || !card?.subtypeId) return
    try {
      const res = await NetworkManager(API.INVENTORY.GET_SUBTYPE_INVENTORY_LINKS).request(
        {},
        { plantId: card.plantId, subtypeId: card.subtypeId }
      )
      const body = res?.data?.data ?? res?.data
      const rows = Array.isArray(body) ? body : body?.links || body?.inventoryLinks || []
      setLinks(Array.isArray(rows) ? rows : [])
    } catch {
      setLinks([])
    }
  }

  useEffect(() => {
    loadLinks()
  }, [card?.plantId, card?.subtypeId])

  const extraFromLinks = useMemo(() => {
    const known = new Set(packings.map((p) => String(p.productId || "")))
    return links
      .map(linkToPacking)
      .filter((p) => !p.productId || !known.has(String(p.productId)))
  }, [links, packings])

  useEffect(() => {
    const merge = extraFromLinks.filter((p) => p.productId)
    if (merge.length) onPackingsRefresh?.({ merge })
  }, [extraFromLinks])

  const visible = showOtherPackings
    ? [...packings, ...extraFromLinks]
    : packings.filter((p) => p.pendingRequest || selectedKeys.includes(packKey(p)))
  const hiddenCount = packings.length + extraFromLinks.length - visible.length

  const onUpdatedStock = (productId, nextStock) => {
    onPackingsRefresh?.({ productId, availablePackets: nextStock })
    loadLinks()
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75} gap={1}>
        <Typography variant="subtitle2" fontWeight={600}>
          Linked products
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
          onClick={() => setLinkOpen(true)}
          sx={{ textTransform: "none", fontWeight: 700, borderColor: "teal", color: "teal" }}
        >
          Link products
        </Button>
      </Stack>

      {packings.length === 0 && extraFromLinks.length === 0 ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
          No seed linked. Use Link products to attach a Biotech SKU or Input variety.
        </Alert>
      ) : (
        <Stack spacing={1}>
          {visible.map((p) => {
            const key = packKey(p)
            const blocked = packingIsIssued(p)
            const checked = selectedKeys.includes(key)
            const pkts = alloc[key] ?? ""
            const need = Number(pkts) || 0
            const stock = Number(p.availablePackets) || 0
            const short = Math.max(0, need - stock)
            const plants = need * plantsPerPacket(p)
            const pending = p.pendingRequest
            return (
              <Box key={key} sx={rowSx(checked, blocked)}>
                <Stack direction="row" alignItems="flex-start" gap={0.5}>
                  {multi && (
                    <Checkbox
                      size="small"
                      checked={checked}
                      disabled={blocked || !p.productId}
                      onChange={() => onToggle(key)}
                      sx={{ p: 0.5, mt: -0.25 }}
                    />
                  )}
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
                      <Typography fontWeight={600} fontSize="0.875rem">
                        {p.name || p.code || "Seed"}
                        {p.code ? (
                          <Typography component="span" color="text.secondary" fontWeight={400}>
                            {" "}
                            ({p.code})
                          </Typography>
                        ) : null}
                      </Typography>
                      <Chip
                        size="small"
                        label={p.source || "Biotech"}
                        sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      1 pkt ≈ {plantsPerPacket(p)} plants · stock {fmtFn(stock, 2)}
                      {pending
                        ? ` · ${pending.status} ${pending.requestNumber} (will replace)`
                        : ""}
                    </Typography>
                    {checked && !blocked && (
                      <Stack direction="row" spacing={1} alignItems="center" mt={1.25} flexWrap="wrap">
                        <TextField
                          size="small"
                          type="number"
                          label="Company packets"
                          value={pkts}
                          onChange={(e) => onAlloc(key, e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 140 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          ≈ {fmtFn(plants)} plants
                        </Typography>
                        {short > 0 && p.productId ? (
                          <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            onClick={() => setStockTarget({ packing: p, shortfall: short })}
                            sx={{
                              textTransform: "none",
                              fontWeight: 700,
                              bgcolor: "#0f766e",
                              "&:hover": { bgcolor: "#115e59" },
                            }}
                          >
                            Update stock (+{fmtFn(short, 2)})
                          </Button>
                        ) : null}
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Box>
            )
          })}
        </Stack>
      )}

      {hiddenCount > 0 && (
        <Button size="small" onClick={onShowOthers} sx={{ mt: 1, textTransform: "none" }}>
          Other packings ({hiddenCount})
        </Button>
      )}

      <SubtypeSeedLinkDialog
        open={linkOpen}
        accent="sowing"
        context={{
          plantId: card?.plantId,
          plantName: card?.plantName,
          subtypeId: card?.subtypeId,
          subtypeName: card?.subtypeName,
        }}
        onClose={() => setLinkOpen(false)}
        onSaved={() => {
          loadLinks()
          onPackingsRefresh?.()
        }}
      />

      <RequestPacketsStockUpdateDialog
        open={Boolean(stockTarget)}
        packing={stockTarget?.packing}
        shortfall={stockTarget?.shortfall}
        onClose={() => setStockTarget(null)}
        onUpdated={(next) => onUpdatedStock(stockTarget?.packing?.productId, next)}
      />
    </Box>
  )
}
