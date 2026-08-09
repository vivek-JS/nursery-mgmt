import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Chip,
  Divider,
} from "@mui/material"
import GrassIcon from "@mui/icons-material/Grass"
import { NetworkManager, API } from "network/core"
import { useIsSuperAdmin, useIsOfficeAdmin } from "utils/roleUtils"
import { todayYmd, fmtNum } from "./directSowUtils"
import PlantSubtypeSowList from "./PlantSubtypeSowList"
import SubtypeDirectSowPanel from "./SubtypeDirectSowPanel"
import IssuedSowCompletePanel from "./IssuedSowCompletePanel"

export default function AdminDirectSowPortal() {
  const isSuperAdmin = useIsSuperAdmin()
  const isOfficeAdmin = useIsOfficeAdmin()
  const allowed = isSuperAdmin || isOfficeAdmin

  const [sowDate, setSowDate] = useState(todayYmd())
  const [plants, setPlants] = useState([])
  const [plantsLoading, setPlantsLoading] = useState(false)
  const [plantId, setPlantId] = useState("")
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState([])
  const [error, setError] = useState("")
  const [selectedGroup, setSelectedGroup] = useState(null)

  const loadPlants = useCallback(async () => {
    setPlantsLoading(true)
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS)
      const res = await instance.request()
      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      setPlants(
        list
          .filter((p) => p?.sowingAllowed)
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
      )
    } catch (e) {
      setPlants([])
      setError(e?.response?.data?.message || e?.message || "Failed to load plants")
    } finally {
      setPlantsLoading(false)
    }
  }, [])

  const loadGroups = useCallback(async () => {
    if (!plantId) {
      setGroups([])
      setSelectedGroup(null)
      return
    }
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_ADMIN_DIRECT_SOW_ORDERS)
      const res = await instance.request({}, { date: sowDate || todayYmd(), plantId })
      const body = res?.data
      if (body?.success) {
        const next = body.groups || []
        setGroups(next)
        setSelectedGroup((prev) => {
          if (!prev) return null
          return (
            next.find(
              (g) =>
                String(g.subtypeId) === String(prev.subtypeId) &&
                String(g.plantId) === String(prev.plantId)
            ) || null
          )
        })
      } else {
        setGroups([])
        setSelectedGroup(null)
        setError(body?.message || "Failed to load")
      }
    } catch (e) {
      setGroups([])
      setSelectedGroup(null)
      setError(e?.response?.data?.message || e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [sowDate, plantId])

  useEffect(() => {
    if (allowed) loadPlants()
  }, [allowed, loadPlants])

  useEffect(() => {
    if (allowed && plantId) loadGroups()
  }, [allowed, plantId, loadGroups])

  if (!allowed) {
    return (
      <Box p={3}>
        <Alert severity="warning">Only Office Admin or Super Admin can use Direct Sow.</Alert>
      </Box>
    )
  }

  const orderTotal = groups.reduce((s, g) => s + (Number(g.orderCount) || 0), 0)
  const needTotal = groups.reduce((s, g) => s + (Number(g.totalPlants) || 0), 0)

  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", pb: 4 }}>
      <Box
        sx={{
          bgcolor: "#fff",
          borderBottom: "1px solid #e2e8f0",
          px: { xs: 2, md: 3 },
          py: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
          <GrassIcon sx={{ color: "#16a34a", fontSize: 28 }} />
          <Typography variant="h5" fontWeight={900}>
            Direct sow
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Sow cards · fixed sow date · change ready days → ready/delivery date moves · slot on Sow
        </Typography>
      </Box>

      <Box px={{ xs: 2, md: 3 }} pt={2} maxWidth={1440} mx="auto">
        <Stack spacing={2}>
          <Paper elevation={0} sx={{ p: 2, border: "1px solid #e2e8f0", borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ md: "flex-end" }}
              flexWrap="wrap"
              useFlexGap
            >
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="ads-plant-label">Plant</InputLabel>
                <Select
                  labelId="ads-plant-label"
                  label="Plant"
                  value={plantId}
                  disabled={plantsLoading}
                  onChange={(e) => {
                    setPlantId(e.target.value)
                    setSelectedGroup(null)
                  }}
                >
                  {plants.map((p) => (
                    <MenuItem key={String(p._id)} value={String(p._id)}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Default sow date"
                type="date"
                value={sowDate}
                onChange={(e) => setSowDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <Button
                variant="contained"
                onClick={loadGroups}
                disabled={loading || !plantId}
                sx={{ textTransform: "none", fontWeight: 800, px: 3 }}
              >
                {loading ? <CircularProgress size={18} color="inherit" /> : "Refresh"}
              </Button>
              {plantId && !loading && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${orderTotal} orders`} size="small" color="primary" variant="outlined" />
                  <Chip
                    label={`Need ${fmtNum(needTotal)}`}
                    size="small"
                    sx={{ fontWeight: 800, bgcolor: "#ffedd5", color: "#9a3412" }}
                  />
                </Stack>
              )}
            </Stack>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {!plantId ? (
            <Alert severity="info">Select a plant to load subtypes and day cards.</Alert>
          ) : loading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="flex-start">
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  width: { xs: "100%", lg: 280 },
                  flexShrink: 0,
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  position: { lg: "sticky" },
                  top: 16,
                }}
              >
                <Typography fontWeight={900} fontSize="0.9rem" mb={1}>
                  Subtypes
                </Typography>
                <PlantSubtypeSowList
                  groups={groups}
                  selectedSubtypeId={selectedGroup?.subtypeId}
                  onSelect={setSelectedGroup}
                />
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  p: { xs: 1.5, md: 2 },
                  minWidth: 0,
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  minHeight: 320,
                }}
              >
                {selectedGroup ? (
                  <SubtypeDirectSowPanel
                    group={selectedGroup}
                    sowDate={sowDate}
                    onSowed={loadGroups}
                  />
                ) : (
                  <Stack spacing={1.5} sx={{ py: 6, textAlign: "center" }}>
                    <Typography fontWeight={800}>Choose a subtype</Typography>
                    <Typography variant="body2" color="text.secondary" maxWidth={360} mx="auto">
                      Tap <strong>Sow</strong> on the left. Use <strong>month tabs</strong> above
                      the cards — only one month loads at a time (fast, no hang).
                    </Typography>
                  </Stack>
                )}
              </Paper>
            </Stack>
          )}

          <Divider />
          <IssuedSowCompletePanel />
        </Stack>
      </Box>
    </Box>
  )
}
