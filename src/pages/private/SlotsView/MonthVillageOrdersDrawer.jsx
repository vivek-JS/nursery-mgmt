import React from "react"
import { Drawer, IconButton, Typography, Box, Chip, Divider } from "@mui/material"
import { X } from "lucide-react"
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"

const MonthVillageOrdersDrawer = ({
  open,
  onClose,
  village,
  salesPersonName,
  monthName,
  year,
  plantId,
  subtypeId,
  orderIds = [],
  plantsTotal = 0,
  orderCount = 0,
  mode = "remaining",
}) => {
  const orderIdsFilter = Array.isArray(orderIds) ? orderIds.filter(Boolean) : []
  const isDispatched = mode === "dispatched"
  const isSales = Boolean(salesPersonName)
  const subject = salesPersonName || village || "—"
  const accent = isSales ? "#0891b2" : "#7c3aed"
  const drawerBg = isSales
    ? "linear-gradient(180deg, #0891b214 0%, #f8fafc 140px, #f1f5f9 100%)"
    : "linear-gradient(180deg, #7c3aed14 0%, #f8fafc 140px, #f1f5f9 100%)"

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1500 }}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: "min(960px, 94vw)" },
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          background: drawerBg,
          boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
        },
      }}>
      <Box
        sx={{
          flexShrink: 0,
          px: 2,
          pt: 2,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
        }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: accent, lineHeight: 1.2 }}>
              {isSales ? "Sales orders" : "Village orders"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
              {subject} — {isDispatched ? "dispatched" : "to dispatch"}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
              {monthName ? (
                <Chip size="small" label={monthName} sx={{ height: 24, fontSize: 11, fontWeight: 600 }} />
              ) : null}
              {year ? (
                <Chip size="small" label={String(year)} variant="outlined" sx={{ height: 24, fontSize: 11 }} />
              ) : null}
              <Chip
                size="small"
                label={`${Number(orderCount || 0).toLocaleString()} orders`}
                sx={{ fontWeight: 700, bgcolor: `${accent}22` }}
              />
              <Chip
                size="small"
                label={`${Number(plantsTotal || 0).toLocaleString()} plants`}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {isDispatched
                ? "Dispatched & completed orders in this month\u2019s slot windows"
                : "Orders still to dispatch in this month\u2019s slot windows"}
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} size="small" sx={{ mt: 0.5 }}>
            <X className="w-5 h-5" />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <Box
          sx={{
            p: { xs: 1, sm: 1.5 },
            "& .farmer-orders-slot-embed": { minHeight: "min(70vh, 720px)" },
          }}>
          <div className="farmer-orders-slot-embed rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {orderIdsFilter.length ? (
              <FarmerOrdersTable
                key={`${subject}-${orderIdsFilter.join(",")}`}
                orderIdsFilter={orderIdsFilter}
                slotPlantId={plantId}
                subtypeId={subtypeId}
                expectedPlantsTotal={plantsTotal}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
                {isSales ? "No orders for this sales person." : "No orders for this village."}
              </Typography>
            )}
          </div>
        </Box>
      </Box>
    </Drawer>
  )
}

export default MonthVillageOrdersDrawer
