import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CalendarMonth,
  Inventory2,
  Save,
  Tune,
  Refresh,
  ArrowBack,
  Category,
  History,
  Close,
  Search,
} from "@mui/icons-material";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useSelector } from "react-redux";

const defaultEditRow = () => ({
  packetsQty: "",
  sowedPlants: "",
  batchNumber: "",
  notes: "",
  sowingDate: moment().format("YYYY-MM-DD"),
});

const isDateInSlotWindow = (dateStr, slot) => {
  const date = moment(dateStr, "DD-MM-YYYY", true);
  const start = moment(slot.slotStartDay, "DD-MM-YYYY", true);
  const end = moment(slot.slotEndDay, "DD-MM-YYYY", true);
  if (!date.isValid() || !start.isValid() || !end.isValid()) return false;
  return date.isBetween(start, end, null, "[]");
};

const SowingAdminCardsPortal = () => {
  const userData = useSelector((state) => state?.userData?.userData);
  const appUser = useSelector((state) => state?.app?.user);
  const currentUser = userData || appUser;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyingReadyDays, setApplyingReadyDays] = useState(new Set());
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [windowParams, setWindowParams] = useState({
    startDate: moment().format("DD-MM-YYYY"),
    days: 30,
  });
  const [daysInput, setDaysInput] = useState("30");
  const [editRows, setEditRows] = useState({});
  const [readyDaysInputs, setReadyDaysInputs] = useState({});
  const [readyDaysReason, setReadyDaysReason] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [selectedSubtypeId, setSelectedSubtypeId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsRecords, setInsightsRecords] = useState([]);
  const [insightsSearch, setInsightsSearch] = useState("");

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const instance = NetworkManager(API.sowing.GET_SOWING_INSIGHTS_RECORDS);
      const response = await instance.request(
        {},
        {
          limit: 80,
          _t: Date.now(),
        }
      );
      if (response?.data?.success) {
        setInsightsRecords(response?.data?.data || []);
      } else {
        Toast.error(response?.data?.message || "Failed to load insights records");
      }
    } catch (error) {
      console.error("Error loading insights records:", error);
      Toast.error("Failed to load insights records");
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchCards = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.sowing.GET_EASY_30_DAYS);
      const response = await instance.request(
        {},
        {
          startDate: windowParams.startDate,
          days: windowParams.days,
          _t: Date.now(),
        }
      );
      if (response?.data?.success) {
        setData(response.data.data || []);
        setSummary(response.data.summary || null);
      } else {
        Toast.error(response?.data?.message || "Failed to fetch easy sowing cards");
      }
    } catch (error) {
      console.error("Error fetching easy sowing cards:", error);
      Toast.error("Error loading sowing cards");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCards();
  }, []);

  React.useEffect(() => {
    fetchCards();
  }, [windowParams.startDate, windowParams.days]);

  const editedCount = useMemo(
    () =>
      Object.values(editRows).filter((r) => {
        const p = Number(r.packetsQty) || 0;
        const s = Number(r.sowedPlants) || 0;
        return p > 0 || s > 0;
      }).length,
    [editRows]
  );

  const plantStats = useMemo(() => {
    const map = new Map();
    for (const group of data) {
      const plantId = String(group.plantId);
      if (!map.has(plantId)) {
        map.set(plantId, {
          plantId: group.plantId,
          plantName: group.plantName,
          totalGap: 0,
          totalSlots: 0,
          subtypeCount: 0,
        });
      }
      const current = map.get(plantId);
      current.totalGap += Number(group.totalGap) || 0;
      current.totalSlots += Number(group.totalSlots) || 0;
      current.subtypeCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => (b.totalGap || 0) - (a.totalGap || 0));
  }, [data]);

  const selectedPlant = useMemo(
    () => plantStats.find((p) => String(p.plantId) === String(selectedPlantId)) || null,
    [plantStats, selectedPlantId]
  );

  const subtypeCards = useMemo(() => {
    if (!selectedPlantId) return [];
    return data
      .filter((g) => String(g.plantId) === String(selectedPlantId))
      .sort((a, b) => (b.totalGap || 0) - (a.totalGap || 0));
  }, [data, selectedPlantId]);

  const activeSubtype = useMemo(() => {
    if (!selectedSubtypeId) return null;
    return subtypeCards.find((s) => String(s.subtypeId) === String(selectedSubtypeId)) || null;
  }, [subtypeCards, selectedSubtypeId]);

  const buildSubmitRows = () => {
    const rows = [];
    for (const group of data) {
      for (const month of group.months || []) {
        for (const slot of month.slots || []) {
          const row = editRows[slot.slotId];
          if (!row) continue;
          const packetsQty = Number(row.packetsQty) || 0;
          const sowedPlants = Number(row.sowedPlants) || 0;
          if (packetsQty <= 0 && sowedPlants <= 0) continue;
          rows.push({ group, slot, row, packetsQty, sowedPlants });
        }
      }
    }
    return rows;
  };

  const submitPreview = useMemo(() => {
    const rows = buildSubmitRows();
    const plants = new Set();
    const subtypes = new Set();
    let totalPackets = 0;
    let totalSowedPlants = 0;
    rows.forEach((r) => {
      plants.add(String(r.group.plantId));
      subtypes.add(`${r.group.plantId}-${r.group.subtypeId}`);
      totalPackets += r.packetsQty;
      totalSowedPlants += r.sowedPlants;
    });
    const remappedRows = rows.filter((r) => {
      const sowingDate = moment(r.row.sowingDate || new Date()).format("DD-MM-YYYY");
      const readyDays = Number(r.slot.plantReadyDaysEffective || r.group.plantReadyDaysDefault || 0);
      const expectedReadyDate = moment(sowingDate, "DD-MM-YYYY", true)
        .add(readyDays, "days")
        .format("DD-MM-YYYY");
      return !isDateInSlotWindow(expectedReadyDate, r.slot);
    }).length;
    const readyDaysQueued = Object.values(readyDaysInputs).filter((v) => `${v || ""}`.trim() !== "").length;
    return {
      rows,
      totalCards: rows.length,
      totalPackets,
      totalSowedPlants,
      plantCount: plants.size,
      subtypeCount: subtypes.size,
      readyDaysQueued,
      remappedRows,
    };
  }, [data, editRows, readyDaysInputs]);

  const updateRow = (slotId, key, value) => {
    setEditRows((prev) => ({
      ...prev,
      [slotId]: {
        ...(prev[slotId] || defaultEditRow()),
        [key]: value,
      },
    }));
  };

  const handleApplyReadyDays = async (group, month) => {
    const monthKey = `${group.plantId}-${group.subtypeId}-${month.monthKey}`;
    const input = Number(readyDaysInputs[monthKey]);
    if (!Number.isFinite(input) || input < 0) {
      Toast.error("Enter a valid non-negative ready days value");
      return;
    }
    const slotIds = (month.slots || []).map((s) => s.slotId).filter(Boolean);
    if (!slotIds.length) {
      Toast.error("No slots in this month");
      return;
    }

    setApplyingReadyDays((prev) => new Set([...prev, monthKey]));
    try {
      const instance = NetworkManager(API.sowing.BULK_UPDATE_FUTURE_READY_DAYS);
      const response = await instance.request({
        slotIds,
        plantReadyDays: input,
        reason: readyDaysReason || "Updated from admin cards portal",
      });
      if (response?.data?.success) {
        Toast.success(response?.data?.message || "Ready days updated");
        fetchCards();
      } else {
        Toast.error(response?.data?.message || "Failed to update ready days");
      }
    } catch (error) {
      console.error("Error updating ready days:", error);
      Toast.error(error?.response?.data?.message || "Failed to update ready days");
    } finally {
      setApplyingReadyDays((prev) => {
        const next = new Set(prev);
        next.delete(monthKey);
        return next;
      });
    }
  };

  const handleBulkSubmit = async () => {
    if (!submitPreview.rows.length) {
      Toast.error("No edited cards to submit");
      return;
    }

    const sowings = [];
    for (const { group, slot, row, packetsQty, sowedPlants } of submitPreview.rows) {
      if (!row.batchNumber) {
        Toast.error(`Batch number required for slot ${slot.slotStartDay} - ${slot.slotEndDay}`);
        return;
      }
      sowings.push({
        plantId: group.plantId,
        subtypeId: group.subtypeId,
        slotId: slot.slotId,
        entrySlotId: slot.slotId,
        sowingDate: moment(row.sowingDate || new Date()).format("DD-MM-YYYY"),
        totalQuantityRequired: packetsQty,
        sowedPlant: sowedPlants,
        sowingLocation: "OFFICE",
        reminderBeforeDays: 5,
        notes: row.notes || "",
        batchNumber: row.batchNumber,
        plantReadyDays: slot.plantReadyDaysEffective || group.plantReadyDaysDefault || 0,
        completeSowing: true,
        packetsUsed: packetsQty > 0 ? packetsQty : undefined,
        packetsToReturn: 0,
        createdBy: currentUser?._id,
        sourceType: "admin_daywise",
      });
    }

    setSubmitting(true);
    try {
      const instance = NetworkManager(API.sowing.CREATE_MULTIPLE_SOWINGS);
      const response = await instance.request({ sowings });
      if (response?.data) {
        Toast.success(response.data.message || "Sowing entries saved");
        const firstMapped = (response?.data?.results || []).find(
          (r) => r?.success && r?.data?.entrySlotId && r?.data?.targetSlotId
        )?.data;
        if (firstMapped) {
          const mappedRows = (response?.data?.results || []).filter(
            (r) => r?.success && r?.data?.entrySlotId && r?.data?.targetSlotId
          ).length;
          const mapText = `Mapped ${mappedRows} row(s): ${firstMapped.entrySlotId} -> ${firstMapped.targetSlotId} (Ready ${firstMapped.expectedReadyDate || "-"})`;
          Toast.info(mapText);
        }
        setEditRows({});
        fetchCards();
      }
    } catch (error) {
      console.error("Error saving sowings:", error);
      Toast.error(error?.response?.data?.message || "Failed to save sowings");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlotCard = (slot, group) => {
    const row = editRows[slot.slotId] || defaultEditRow();
    const selectedSowingDate = moment(row.sowingDate || new Date()).format("DD-MM-YYYY");
    const readyDays = Number(slot.plantReadyDaysEffective || group.plantReadyDaysDefault || 0);
    const expectedReadyDate = moment(selectedSowingDate, "DD-MM-YYYY", true)
      .add(readyDays, "days")
      .format("DD-MM-YYYY");
    const slotSizeDays = Math.max(
      1,
      moment(slot.slotEndDay, "DD-MM-YYYY", true).diff(
        moment(slot.slotStartDay, "DD-MM-YYYY", true),
        "days"
      ) + 1
    );
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={slot.slotId}>
        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid #dfe7f7",
            height: "100%",
            background: "linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)",
            boxShadow: "0 8px 20px rgba(45, 89, 255, 0.08)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 14px 26px rgba(45, 89, 255, 0.14)",
            },
          }}
        >
          <CardContent sx={{ p: 1.75 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  bgcolor: "#e7f0ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Inventory2 fontSize="small" sx={{ color: "#2f5bea" }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {slot.slotStartDay}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                to {slot.slotEndDay}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.7} sx={{ mb: 1.2, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={`Gap ${slot.bookingGap || 0}`}
                color={(slot.bookingGap || 0) > 0 ? "warning" : "default"}
                sx={{ fontWeight: 700 }}
              />
              <Chip size="small" label={`Booked ${slot.totalBookedPlants || 0}`} sx={{ bgcolor: "#eef3ff" }} />
              <Chip
                size="small"
                label={`Ready ${slot.plantReadyDaysEffective || 0}d`}
                color={slot.isReadyDaysOverride ? "secondary" : "default"}
              />
              <Chip size="small" label={`Slot ${slotSizeDays}d`} icon={<CalendarMonth />} sx={{ bgcolor: "#f1f8ff" }} />
              <Chip size="small" color="success" variant="outlined" label={`Expected ${expectedReadyDate}`} sx={{ fontWeight: 700 }} />
            </Stack>
            <Grid container spacing={1.1}>
              <Grid item xs={6}>
                <TextField
                  label="Packets"
                  type="number"
                  size="small"
                  fullWidth
                  value={row.packetsQty}
                  onChange={(e) => updateRow(slot.slotId, "packetsQty", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Sowed"
                  type="number"
                  size="small"
                  fullWidth
                  value={row.sowedPlants}
                  onChange={(e) => updateRow(slot.slotId, "sowedPlants", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Batch Number"
                  size="small"
                  fullWidth
                  value={row.batchNumber}
                  onChange={(e) => updateRow(slot.slotId, "batchNumber", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={row.sowingDate}
                  onChange={(e) => updateRow(slot.slotId, "sowingDate", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  size="small"
                  fullWidth
                  value={row.notes}
                  onChange={(e) => updateRow(slot.slotId, "notes", e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const filteredInsights = useMemo(() => {
    const q = insightsSearch.trim().toLowerCase();
    if (!q) return insightsRecords;
    return insightsRecords.filter((r) => {
      const text = [
        r.eventType,
        r.plantName,
        r.subtypeName,
        r.batchNumber,
        r.reason,
        r.performedByName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [insightsRecords, insightsSearch]);

  return (
    <Box sx={{ p: 2, bgcolor: "#f6f8fb", minHeight: "100vh" }}>
      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Sowing Admin Cards Portal
            </Typography>
            <Chip color="info" label={`Edited Cards: ${editedCount}`} />
            <TextField
              label="Start Date"
              value={windowParams.startDate}
              onChange={(e) => setWindowParams((p) => ({ ...p, startDate: e.target.value }))}
              size="small"
            />
            <TextField
              label="Days"
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              size="small"
              sx={{ width: 120 }}
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                setWindowParams((p) => ({
                  ...p,
                  days: Math.max(1, Math.min(90, Number(daysInput) || 30)),
                }));
              }}
            >
              Apply Window
            </Button>
            <Button variant="contained" startIcon={<Refresh />} onClick={fetchCards} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={() => setConfirmOpen(true)}
              disabled={submitting || loading}
            >
              Save All Edited Cards
            </Button>
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={() => {
                setInsightsOpen(true);
                fetchInsights();
              }}
            >
              All Activity
            </Button>
          </Stack>
          {summary && (
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
              <Chip label={`Plants: ${summary.totalPlants || 0}`} />
              <Chip label={`Subtypes: ${summary.totalSubtypes || 0}`} />
              <Chip label={`Slots: ${summary.totalSlots || 0}`} />
              <Chip label={`Gap: ${summary.totalGap || 0}`} color="warning" />
            </Stack>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Plant ready days updates are applied only to future slots (past slots are skipped and preserved).
          </Alert>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Ready Days Update Reason (optional)"
              value={readyDaysReason}
              onChange={(e) => setReadyDaysReason(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item xs={12} md={6} key={i}>
              <Card sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {!selectedPlantId && (
            <Grid container spacing={2}>
              {plantStats.map((plant) => (
                <Grid item xs={12} md={6} lg={4} key={plant.plantId}>
                  <Card sx={{ borderRadius: 3, cursor: "pointer", border: "1px solid #e8ecff" }} onClick={() => setSelectedPlantId(String(plant.plantId))}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{plant.plantName}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={`Remaining Gap ${plant.totalGap || 0}`} color="warning" />
                        <Chip label={`Subtypes ${plant.subtypeCount || 0}`} icon={<Category />} />
                        <Chip label={`Slots ${plant.totalSlots || 0}`} />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {selectedPlantId && !selectedSubtypeId && (
            <Box>
              <Button startIcon={<ArrowBack />} onClick={() => setSelectedPlantId(null)} sx={{ mb: 2 }}>
                Back to Plants
              </Button>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                {selectedPlant?.plantName} - Subtypes
              </Typography>
              <Grid container spacing={2}>
                {subtypeCards.map((sub) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={`${sub.plantId}-${sub.subtypeId}`}>
                    <Card sx={{ borderRadius: 3, cursor: "pointer", border: "1px solid #e8ecff" }} onClick={() => setSelectedSubtypeId(String(sub.subtypeId))}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{sub.subtypeName}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Chip size="small" label={`Gap ${sub.totalGap || 0}`} color="warning" />
                          <Chip size="small" label={`Slots ${sub.totalSlots || 0}`} />
                          <Chip size="small" label={`Default ${sub.plantReadyDaysDefault || 0}d`} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {selectedPlantId && selectedSubtypeId && activeSubtype && (
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button startIcon={<ArrowBack />} onClick={() => setSelectedSubtypeId(null)}>
                  Back to Subtypes
                </Button>
                <Chip label={activeSubtype.plantName} />
                <Chip label={activeSubtype.subtypeName} color="primary" variant="outlined" />
              </Stack>

              {(activeSubtype.months || []).map((month) => {
                const monthKey = `${activeSubtype.plantId}-${activeSubtype.subtypeId}-${month.monthKey}`;
                const applying = applyingReadyDays.has(monthKey);
                const sortedSlots = [...(month.slots || [])].sort(
                  (a, b) =>
                    moment(a.slotStartDay, "DD-MM-YYYY", true).valueOf() -
                    moment(b.slotStartDay, "DD-MM-YYYY", true).valueOf()
                );

                return (
                  <Card
                    key={monthKey}
                    sx={{
                      mb: 2,
                      borderRadius: 3,
                      border: "1px solid #e3e9f8",
                      background: "linear-gradient(180deg, #ffffff 0%, #fbfcff 100%)",
                      boxShadow: "0 8px 18px rgba(31, 80, 174, 0.06)",
                    }}
                  >
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ md: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 1 }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <CalendarMonth fontSize="small" />
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {month.monthKey}
                          </Typography>
                          <Chip size="small" label={`Slots ${month.totalSlots}`} />
                          <Chip size="small" color="warning" label={`Month Gap ${month.totalGap || 0}`} />
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            size="small"
                            label="Set Ready Days"
                            value={readyDaysInputs[monthKey] || ""}
                            onChange={(e) =>
                              setReadyDaysInputs((prev) => ({ ...prev, [monthKey]: e.target.value }))
                            }
                            sx={{ width: 140 }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleApplyReadyDays(activeSubtype, month)}
                            disabled={applying}
                            startIcon={applying ? <CircularProgress size={14} /> : <Tune />}
                          >
                            Apply Future Slots
                          </Button>
                        </Stack>
                      </Stack>

                      <Box sx={{ mt: 1.5, p: 1.2, bgcolor: "#f5f8ff", borderRadius: 2.5, border: "1px solid #e6ecff" }}>
                        <Grid container spacing={1.5}>
                          {sortedSlots.map((slot) => renderSlotCard(slot, activeSubtype))}
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            background: "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1.2,
            borderBottom: "1px solid #e6edff",
            background: "linear-gradient(90deg, #eef4ff 0%, #f8fbff 100%)",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Save color="primary" fontSize="small" />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Confirm Sowing Submit
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.3} sx={{ mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Review this quick summary before final submit.
            </Typography>
            <Grid container spacing={1.2}>
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 2, border: "1px solid #deebff", bgcolor: "#f4f9ff" }}>
                  <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="caption" color="text.secondary">Edited Cards</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{submitPreview.totalCards}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 2, border: "1px solid #deebff", bgcolor: "#f4f9ff" }}>
                  <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="caption" color="text.secondary">Total Packets</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{submitPreview.totalPackets}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 2, border: "1px solid #e3e9ff", bgcolor: "#f8faff" }}>
                  <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="caption" color="text.secondary">Sowed Plants</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{submitPreview.totalSowedPlants}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card sx={{ borderRadius: 2, border: "1px solid #e3e9ff", bgcolor: "#f8faff" }}>
                  <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
                    <Typography variant="caption" color="text.secondary">Ready-Date Remaps</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{submitPreview.remappedRows}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Stack direction="row" spacing={0.8} flexWrap="wrap">
              <Chip size="small" label={`Plants ${submitPreview.plantCount}`} />
              <Chip size="small" label={`Subtypes ${submitPreview.subtypeCount}`} />
              <Chip size="small" label={`Ready-days queued ${submitPreview.readyDaysQueued}`} color="secondary" variant="outlined" />
            </Stack>
            {submitPreview.totalCards === 0 && (
              <Alert severity="warning">No edited cards found.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: "1px solid #e6edff", px: 2, py: 1.4 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting} variant="text">Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              await handleBulkSubmit();
              setConfirmOpen(false);
            }}
            disabled={submitting || submitPreview.totalCards === 0}
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <Save />}
          >
            Confirm Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520 },
            background: "linear-gradient(180deg, #ffffff 0%, #f6f9ff 100%)",
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #e4ebfb" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <History color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Sowing Activity
              </Typography>
            </Stack>
            <IconButton onClick={() => setInsightsOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
          <TextField
            size="small"
            fullWidth
            sx={{ mt: 1.5 }}
            placeholder="Search activity..."
            value={insightsSearch}
            onChange={(e) => setInsightsSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ p: 1.5, overflowY: "auto", flex: 1 }}>
          {insightsLoading ? (
            <Stack spacing={1.2}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
              ))}
            </Stack>
          ) : filteredInsights.length === 0 ? (
            <Alert severity="info">No activity records found.</Alert>
          ) : (
            <Stack spacing={1.2}>
              {filteredInsights.map((rec) => (
                <Card
                  key={rec.recordId}
                  sx={{
                    borderRadius: 2.5,
                    border: "1px solid #e1e9ff",
                    background: "#fff",
                    boxShadow: "0 6px 14px rgba(33, 96, 255, 0.06)",
                  }}
                >
                  <CardContent sx={{ p: 1.4, "&:last-child": { pb: 1.4 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {rec.eventType || "EVENT"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rec.timestamp ? moment(rec.timestamp).format("DD-MM-YYYY hh:mm A") : "-"}
                        </Typography>
                      </Box>
                      <Chip size="small" label={rec.plantName || "Plant"} color="primary" variant="outlined" />
                    </Stack>
                    <Stack direction="row" spacing={0.7} sx={{ mt: 1, flexWrap: "wrap" }}>
                      {rec.subtypeName && <Chip size="small" label={rec.subtypeName} />}
                      {rec.batchNumber && <Chip size="small" label={`Batch ${rec.batchNumber}`} />}
                      {rec.expectedReadyDate && <Chip size="small" color="success" label={`Expected ${rec.expectedReadyDate}`} />}
                    </Stack>
                    {(rec.reason || rec.performedByName) && (
                      <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                        {rec.reason || "No reason"} {rec.performedByName ? `• by ${rec.performedByName}` : ""}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default SowingAdminCardsPortal;
