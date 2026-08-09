import React, { useEffect, useMemo, useState } from "react"
import { Box, Chip, Stack, Typography } from "@mui/material"
import { useLocation, useNavigate } from "react-router-dom"
import { API, NetworkManager } from "network/core"
import { useUserData } from "utils/roleUtils"
import WorkspaceSwitcher from "./WorkspaceSwitcher"
import { useWorkspace } from "./WorkspaceContext"
import {
  AGRI_HUB_PATH,
  AGRI_HOME_PATH,
  TAB_META,
  tabsForUser,
} from "./agriAccess"

function pathToTab(pathname) {
  if (pathname.startsWith(AGRI_HUB_PATH)) return "overview"
  if (pathname.includes("/ram-agri-inputs-master")) return "inputs-master"
  if (pathname.includes("/ram-agri-input-order")) return "agri-order"
  if (pathname === AGRI_HOME_PATH || pathname.startsWith(`${AGRI_HOME_PATH}/`)) {
    return "agri-order"
  }
  if (pathname.includes("/purchase-orders")) return "purchase-orders"
  if (pathname.includes("/raising-seeds")) return "raising-seeds"
  if (pathname.includes("/sowing-requests")) return "sowing-requests"
  if (pathname === "/u/inventory" || pathname.startsWith("/u/inventory/products")) {
    return "inventory"
  }
  if (pathname.includes("/ram-agri-sales-dashboard")) return "overview"
  if (pathname.includes("/biotech-seed-master")) return "biotech-seed-master"
  return null
}

/**
 * Sticky agri tab chrome for deep inventory routes while in agri workspace.
 */
export default function AgriModeChrome() {
  const { isAgriMode } = useWorkspace()
  const user = useUserData()
  const location = useLocation()
  const navigate = useNavigate()
  const allowed = useMemo(() => new Set(tabsForUser(user)), [user])
  const tabs = useMemo(
    () => TAB_META.filter((t) => allowed.has(t.id)),
    [allowed]
  )
  const [sowingCount, setSowingCount] = useState(0)
  const active = pathToTab(location.pathname)

  useEffect(() => {
    if (!isAgriMode) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const instance = NetworkManager(API.sowing.GET_PENDING_SOWING_REQUESTS)
        const res = await instance.request()
        const list = res?.data?.data || []
        if (!cancelled) setSowingCount(Array.isArray(list) ? list.length : 0)
      } catch {
        if (!cancelled) setSowingCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isAgriMode])

  // Always show chrome in agri mode (hub keeps its own full header; chrome helps deep links)
  if (!isAgriMode) return null
  if (location.pathname.startsWith(AGRI_HUB_PATH)) return null

  return (
    <Box
      sx={{
        mb: 1.5,
        mx: { xs: 1, sm: 2 },
        borderRadius: 2,
        bgcolor: "#fffbeb",
        border: "1px solid #fde68a",
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        px={2}
        py={1}
      >
        <Typography sx={{ fontWeight: 900, color: "#92400e", fontSize: 14 }}>
          Ram Agri Inputs workspace
        </Typography>
        <WorkspaceSwitcher />
      </Stack>
      <Box sx={{ display: "flex", overflowX: "auto", px: 1, borderTop: "1px solid #fde68a" }}>
        {tabs.map((tab) => {
          const isActive = active === tab.id
          const label =
            tab.id === "sowing-requests"
              ? `Sowing requests${sowingCount ? ` (${sowingCount})` : ""}`
              : tab.label
          return (
            <Box
              key={tab.id}
              component="button"
              type="button"
              onClick={() => {
                if (tab.id === "overview") {
                  navigate(AGRI_HUB_PATH)
                  return
                }
                if (tab.id === "agri-payments") {
                  navigate(`${AGRI_HUB_PATH}?tab=agri-payments`)
                  return
                }
                if (tab.id === "agri-order") {
                  navigate(AGRI_HOME_PATH)
                  return
                }
                if (tab.path) navigate(tab.path)
              }}
              sx={{
                border: 0,
                bgcolor: "transparent",
                px: 1.75,
                py: 1,
                fontSize: 12,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "#92400e" : "#78716c",
                borderBottom: isActive ? "2px solid #b45309" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {label}
              {tab.id === "sowing-requests" && sowingCount > 0 && (
                <Chip size="small" label={sowingCount} sx={{ height: 18, fontSize: 10, fontWeight: 800 }} />
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
