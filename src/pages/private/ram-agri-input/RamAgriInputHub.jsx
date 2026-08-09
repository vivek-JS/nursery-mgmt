import React, { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { Box, CircularProgress, Stack, Typography, Chip } from "@mui/material"
import { useNavigate, useSearchParams } from "react-router-dom"
import { API, NetworkManager } from "network/core"
import { useUserData } from "utils/roleUtils"
import { useWorkspace } from "workspace/WorkspaceContext"
import WorkspaceSwitcher from "workspace/WorkspaceSwitcher"
import {
  TAB_META,
  tabsForUser,
  WORKSPACE_AGRI,
  AGRI_HOME_PATH,
} from "workspace/agriAccess"

const RamAgriSalesDashboard = lazy(() =>
  import("pages/private/inventory/RamAgriSalesDashboard")
)
const AgriPendingPaymentsTab = lazy(() => import("./AgriPendingPaymentsTab"))

function TabButton({ active, label, badge, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 2,
        py: 1.25,
        border: 0,
        borderBottom: active ? "2px solid #b45309" : "2px solid transparent",
        bgcolor: "transparent",
        color: active ? "#92400e" : "text.secondary",
        fontWeight: active ? 800 : 600,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 160ms ease, border-color 160ms ease",
        "&:hover": { color: "#92400e" },
      }}
    >
      {label}
      {badge > 0 && (
        <Chip
          size="small"
          label={badge > 99 ? "99+" : badge}
          sx={{
            height: 20,
            fontWeight: 800,
            fontSize: 11,
            bgcolor: "#ffedd5",
            color: "#9a3412",
          }}
        />
      )}
    </Box>
  )
}

/**
 * Ram Agri Input hub — accounting-dashboard style tabs, never includes normal accounting.
 */
export default function RamAgriInputHub() {
  const user = useUserData()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAgriMode, setMode } = useWorkspace()
  const allowed = useMemo(() => new Set(tabsForUser(user)), [user])
  const tabs = useMemo(
    () => TAB_META.filter((t) => allowed.has(t.id)),
    [allowed]
  )
  const tabFromUrl = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(
    () => (tabFromUrl && allowed.has(tabFromUrl) ? tabFromUrl : tabs[0]?.id) || "overview"
  )
  const [sowingCount, setSowingCount] = useState(0)

  useEffect(() => {
    if (tabFromUrl && allowed.has(tabFromUrl)) setActiveTab(tabFromUrl)
  }, [tabFromUrl, allowed])

  useEffect(() => {
    if (!isAgriMode) setMode(WORKSPACE_AGRI)
  }, [isAgriMode, setMode])

  useEffect(() => {
    if (!allowed.has(activeTab) && tabs[0]) setActiveTab(tabs[0].id)
  }, [allowed, activeTab, tabs])

  useEffect(() => {
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
  }, [])

  const onTab = (tab) => {
    setActiveTab(tab.id)
    if (tab.id === "agri-order") {
      navigate(AGRI_HOME_PATH)
      return
    }
    if (tab.path) {
      navigate(tab.path)
      return
    }
    setSearchParams(tab.id === "overview" ? {} : { tab: tab.id })
  }

  const showEmbedded =
    activeTab === "overview" || activeTab === "agri-payments"

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "#faf7f2" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          bgcolor: "#fff",
          borderBottom: "1px solid #e7e5e4",
          boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          px={2.5}
          py={1.5}
        >
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: "#78350f" }}>
              Ram Agri Inputs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ops hub — use Accounting Dashboard for Ram Agri payments (no Biotech
              org here)
            </Typography>
          </Box>
          <WorkspaceSwitcher />
        </Stack>
        <Box
          sx={{
            px: 1.5,
            display: "flex",
            overflowX: "auto",
            borderTop: "1px solid #f5f5f4",
          }}
        >
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              label={
                tab.id === "sowing-requests"
                  ? `Sowing requests${sowingCount ? ` (${sowingCount})` : ""}`
                  : tab.label
              }
              badge={tab.id === "sowing-requests" ? sowingCount : 0}
              onClick={() => onTab(tab)}
            />
          ))}
        </Box>
      </Box>

      <Box px={{ xs: 1, sm: 2 }} py={2}>
        {showEmbedded ? (
          <Suspense
            fallback={
              <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress />
              </Box>
            }
          >
            {activeTab === "overview" && <RamAgriSalesDashboard />}
            {activeTab === "agri-payments" && <AgriPendingPaymentsTab />}
          </Suspense>
        ) : (
          <PaperHint tabId={activeTab} />
        )}
      </Box>
    </Box>
  )
}

function PaperHint({ tabId }) {
  const meta = TAB_META.find((t) => t.id === tabId)
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: "#fff",
        border: "1px dashed #d6d3d1",
        textAlign: "center",
      }}
    >
      <Typography fontWeight={800} mb={0.5}>
        Opened {meta?.label || "section"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Use the browser back button or hub tabs to return. Deep link stays under
        inventory for full forms and lists.
      </Typography>
    </Box>
  )
}
