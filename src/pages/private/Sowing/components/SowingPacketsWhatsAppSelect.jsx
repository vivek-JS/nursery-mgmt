import React from "react"
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material"
import { remainingPlantsOf } from "./sowingPackingUtils"
import { cropName, varietyName } from "../readyPlantsMessage"
import { plantKeyOf, urgencyOf, varietyKeyOf } from "./sowingPacketsToSowMessage"

function plantGroupsOf(bundles) {
  const map = new Map()
  for (const b of bundles || []) {
    if (!b?.card) continue
    const key = plantKeyOf(b.card)
    if (!map.has(key)) {
      map.set(key, {
        key,
        plantName: b.card.plantName || "Plant",
        bundles: [],
      })
    }
    map.get(key).bundles.push(b)
  }
  return [...map.values()]
}

export default function SowingPacketsWhatsAppSelect({
  bundles = [],
  lang,
  plants,
  varieties,
  orders,
  onPlants,
  onVarieties,
  onOrders,
}) {
  const groups = plantGroupsOf(bundles)

  const setPlant = (key, on) => {
    const nextP = new Set(plants)
    const nextV = new Set(varieties)
    const nextO = new Set(orders)
    const group = groups.find((g) => g.key === key)
    if (on) nextP.add(key)
    else nextP.delete(key)
    for (const b of group?.bundles || []) {
      const vk = varietyKeyOf(b.card)
      if (on) nextV.add(vk)
      else nextV.delete(vk)
      for (const row of b.orders || []) {
        const id = String(row.orderId || row.orderNumber)
        if (on) nextO.add(id)
        else nextO.delete(id)
      }
    }
    onPlants(nextP)
    onVarieties(nextV)
    onOrders(nextO)
  }

  const setVariety = (bundle, on) => {
    const vk = varietyKeyOf(bundle.card)
    const pk = plantKeyOf(bundle.card)
    const nextV = new Set(varieties)
    const nextO = new Set(orders)
    const nextP = new Set(plants)
    if (on) nextV.add(vk)
    else nextV.delete(vk)
    for (const row of bundle.orders || []) {
      const id = String(row.orderId || row.orderNumber)
      if (on) nextO.add(id)
      else nextO.delete(id)
    }
    const siblings = groups.find((g) => g.key === pk)?.bundles || []
    const anyOn = siblings.some((b) => nextV.has(varietyKeyOf(b.card)))
    if (anyOn) nextP.add(pk)
    else nextP.delete(pk)
    onPlants(nextP)
    onVarieties(nextV)
    onOrders(nextO)
  }

  const toggleOrder = (id) => {
    const next = new Set(orders)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onOrders(next)
  }

  const allOn = groups.length > 0 && groups.every((g) => plants.has(g.key))
  const selectAll = (on) => {
    if (!on) {
      onPlants(new Set())
      onVarieties(new Set())
      onOrders(new Set())
      return
    }
    onPlants(new Set(groups.map((g) => g.key)))
    onVarieties(
      new Set(groups.flatMap((g) => g.bundles.map((b) => varietyKeyOf(b.card))))
    )
    onOrders(
      new Set(
        groups.flatMap((g) =>
          g.bundles.flatMap((b) =>
            (b.orders || []).map((o) => String(o.orderId || o.orderNumber))
          )
        )
      )
    )
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          {lang === "mr" ? "पीक निवडा" : "Select crops"}
        </Typography>
        <Button
          size="small"
          onClick={() => selectAll(!allOn)}
          sx={{ textTransform: "none", fontWeight: 700, minWidth: 0 }}
        >
          {allOn ? (lang === "mr" ? "सर्व काढा" : "Clear all") : lang === "mr" ? "सर्व निवडा" : "Select all"}
        </Button>
      </Stack>
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} mb={1.25}>
        {groups.map((g) => (
          <Chip
            key={g.key}
            clickable
            color={plants.has(g.key) ? "success" : "default"}
            variant={plants.has(g.key) ? "filled" : "outlined"}
            label={`${cropName(g.plantName, lang)} · ${g.bundles.length}`}
            onClick={() => setPlant(g.key, !plants.has(g.key))}
            sx={{ fontWeight: 800 }}
          />
        ))}
      </Stack>
      <Box sx={{ maxHeight: 280, overflowY: "auto", pr: 0.5 }}>
        {groups
          .filter((g) => plants.has(g.key))
          .map((g) => (
            <Box key={g.key} sx={{ mb: 1.25 }}>
              <Typography fontWeight={800} fontSize="0.9rem" color="#14532d" mb={0.25}>
                {cropName(g.plantName, lang)}
              </Typography>
              {g.bundles.map((b) => {
                const vk = varietyKeyOf(b.card)
                const on = varieties.has(vk)
                return (
                  <Box key={vk} sx={{ pl: 0.5, mb: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox size="small" checked={on} onChange={() => setVariety(b, !on)} />
                      }
                      label={
                        <Typography variant="body2" fontWeight={700}>
                          {varietyName(b.card.subtypeName, lang)}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {` · ${(b.orders || []).length} orders`}
                          </Typography>
                        </Typography>
                      }
                    />
                    {on
                      ? (b.orders || []).map((o) => {
                          const id = String(o.orderId || o.orderNumber)
                          const u = urgencyOf(o.daysUntilSow)
                          return (
                            <FormControlLabel
                              key={id}
                              sx={{ ml: 2.5, display: "flex" }}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={orders.has(id)}
                                  onChange={() => toggleOrder(id)}
                                />
                              }
                              label={
                                <Typography variant="body2">
                                  #{o.orderNumber} · {remainingPlantsOf(o).toLocaleString("en-IN")}
                                  {u[lang] ? ` · ${u[lang]}` : ""}
                                </Typography>
                              }
                            />
                          )
                        })
                      : null}
                  </Box>
                )
              })}
            </Box>
          ))}
      </Box>
    </Box>
  )
}
