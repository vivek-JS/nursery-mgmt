import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  ListSubheader,
  Chip,
  IconButton,
  Divider,
  useTheme,
  Stack,
  Checkbox,
  alpha,
  Alert,
} from "@mui/material";
import {
  TaskAlt as AcceptTabIcon,
  MoveToInbox as InwardIcon,
  LocalShipping as DispatchTabIcon,
  Refresh,
  NavigateNext,
  Today,
  Close as CloseIcon,
  CheckCircle,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useUserData, useUserRole } from "utils/roleUtils";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import moment from "moment";
import {
  normBatchKey,
  buildPlantReadyBatchIdMap,
  resolvePlantReady,
  hasPlantReadyUi,
  PlantReadyPanel,
  getMilestoneForBatch,
} from "../primary/plantReadyMobileUtils.jsx";

const tabSx = { minHeight: 56, "& .MuiBottomNavigationAction-label": { fontSize: "0.7rem" } };

const safeTrunc = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const availPlantsPrimaryOutward = (po) =>
  safeTrunc(po.availableQuantity ?? po.totalQuantity);

const availPlantsSecondaryInward = (si) =>
  safeTrunc(si.availableQuantity ?? si.totalQuantity);

const secInwardKey = (batchId, id) => `${batchId}:${id}`;
const outwardKey = (batchId, id) => `${batchId}:${id}`;

const SecondaryMobileOps = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const userData = useUserData();
  const userRole = useUserRole();
  const userJobTitle = useSelector((state) => state?.userData?.userData?.jobTitle);
  const isSecondaryEmployee = userJobTitle && userJobTitle.toUpperCase() === "SECONDARY";
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN";
  const hasAccess = isSecondaryEmployee || isSuperAdmin || isAdmin;
  /** Admins can jump to primary ops; secondary-only staff stay in this app */
  const showPrimaryOpsLink = isSuperAdmin || isAdmin;

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [batches, setBatches] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [selectedPrimaryOutKeys, setSelectedPrimaryOutKeys] = useState(new Set());
  const [secFromPrimaryOpen, setSecFromPrimaryOpen] = useState(false);
  const [secFromPrimaryShared, setSecFromPrimaryShared] = useState({
    secondaryInwardDate: moment().format("YYYY-MM-DD"),
    dateOfDispatch: moment().format("YYYY-MM-DD"),
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
  });
  const [secFromPrimaryPerRow, setSecFromPrimaryPerRow] = useState({});

  const [selectedSecInwardKeys, setSelectedSecInwardKeys] = useState(new Set());
  const [secOutDialogOpen, setSecOutDialogOpen] = useState(false);
  const [secOutShared, setSecOutShared] = useState({
    secondaryOutwardDate: moment().format("YYYY-MM-DD"),
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
  });
  const [secOutPerRow, setSecOutPerRow] = useState({});

  useEffect(() => {
    if (tab !== 1) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab]);

  useEffect(() => {
    if (userData !== undefined && userRole !== undefined && !hasAccess) {
      Toast.error("Access denied. SECONDARY, ADMIN, or SUPER_ADMIN only.");
      navigate("/u/dashboard", { replace: true });
    }
  }, [userData, userRole, hasAccess, navigate]);

  const loadLocationOptions = useCallback(async () => {
    const parsePaged = (res) => {
      const body = res.data;
      const nested = body?.data?.data;
      return Array.isArray(nested) ? nested : [];
    };
    try {
      const pollyInst = NetworkManager(API.POLLY_HOUSE.GET_HOUSES);
      const shadeInst = NetworkManager(API.SHADE.GET_SHADES);
      const [pollyRes, shadeRes] = await Promise.all([
        pollyInst.request({}, { page: 1, limit: 500, status: "true" }),
        shadeInst.request({}, { page: 1, limit: 500, status: "true" }),
      ]);
      const pollyList = parsePaged(pollyRes);
      const shadeList = parsePaged(shadeRes);
      const pollyOpts = pollyList
        .filter((p) => p?.isActive !== false)
        .map((p) => {
          const name = (p.name || p.title || "").trim();
          const loc = (p.location || "").trim();
          const label =
            name && loc && name !== loc
              ? `${name} — ${loc}`
              : name || loc || `Polly ${p._id}`;
          const value = name || loc || String(p._id);
          return { value, label, group: "pollyhouse" };
        });
      const shadeOpts = shadeList
        .filter((s) => s?.isActive !== false)
        .map((s) => {
          const name = (s.name || "").trim();
          const num = (s.number || "").trim();
          const label = name && num ? `${name} (${num})` : name || num || `Shade ${s._id}`;
          const value = name && num ? `${name} (${num})` : name || num || String(s._id);
          return { value, label, group: "shade" };
        });
      const seen = new Set();
      const merged = [...pollyOpts, ...shadeOpts].filter((o) => {
        if (seen.has(o.value)) return false;
        seen.add(o.value);
        return true;
      });
      setLocationOptions(merged);
    } catch (e) {
      console.error(e);
      setLocationOptions([]);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_MOBILE_DASHBOARD);
      const res = await inst.request({}, { upcomingDays: 7 });
      const body = res.data;
      const dash = body?.data && typeof body.data === "object" ? body.data : {};
      setDashboard(dash);
    } catch (e) {
      console.error(e);
      Toast.error(e?.message || "Failed to load secondary dashboard");
    }
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.GET_OUTWARDS);
      const res = await inst.request({}, {});
      const body = res.data;
      const list = body?.data;
      setBatches(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDashboard(), loadBatches(), loadLocationOptions()]);
    setLoading(false);
  }, [loadDashboard, loadBatches, loadLocationOptions]);

  useEffect(() => {
    if (hasAccess) refreshAll();
  }, [hasAccess, refreshAll]);

  useEffect(() => {
    setSelectedPrimaryOutKeys(new Set());
    setSelectedSecInwardKeys(new Set());
  }, [tab]);

  const incomingFromPrimary = dashboard?.incomingFromPrimary ?? [];
  const upcomingSecondaryMilestones = dashboard?.upcomingSecondaryMilestones ?? [];
  const upcomingSecIn = dashboard?.upcomingSecondaryInwardExpected ?? [];
  const upcomingSecOut = dashboard?.upcomingSecondaryOutwardExpected ?? [];
  const plantReadyByBatch = dashboard?.plantReadyByBatchNumber ?? {};

  const plantReadyByBatchIdMap = useMemo(
    () => buildPlantReadyBatchIdMap(plantReadyByBatch),
    [plantReadyByBatch]
  );

  const milestoneByBatch = useMemo(() => {
    const m = new Map();
    (upcomingSecondaryMilestones || []).forEach((row) => {
      const k = normBatchKey(row.batchNumber);
      if (k) m.set(k, row);
    });
    return m;
  }, [upcomingSecondaryMilestones]);

  const primaryOutwardRows = batches
    .flatMap((po) =>
      (po.primaryOutward || []).map((pi) => ({
        ...pi,
        _batchId: po.batchId?._id || po.batchId,
        batchNumber: po.batchId?.batchNumber,
      }))
    )
    .sort((a, b) => moment(b.primaryOutwardDate).valueOf() - moment(a.primaryOutwardDate).valueOf());

  const secondaryInwardRows = batches
    .flatMap((po) =>
      (po.secondaryInward || []).map((si) => ({
        ...si,
        _batchId: po.batchId?._id || po.batchId,
        batchNumber: po.batchId?.batchNumber,
      }))
    )
    .sort((a, b) => moment(b.secondaryInwardDate).valueOf() - moment(a.secondaryInwardDate).valueOf());

  const secondaryOutwardRows = batches
    .flatMap((po) =>
      (po.secondaryOutward || []).map((so) => ({
        ...so,
        _batchId: po.batchId?._id || po.batchId,
        batchNumber: po.batchId?.batchNumber,
      }))
    )
    .sort((a, b) => moment(b.secondaryOutwardDate).valueOf() - moment(a.secondaryOutwardDate).valueOf());

  const buildSecFromPrimaryPerRow = (rows) => {
    const per = {};
    rows.forEach((r) => {
      const maxP = availPlantsPrimaryOutward(r);
      const cav = Math.max(1, safeTrunc(r.cavity));
      const maxTr = Math.max(1, Math.floor(maxP / cav));
      const trays = Math.min(Math.max(1, safeTrunc(r.numberOfTrays) || 1), maxTr);
      per[r._id] = {
        numberOfBottles: Math.min(Math.max(1, safeTrunc(r.numberOfBottles) || 1), maxP),
        cavity: cav,
        numberOfTrays: trays,
      };
    });
    return per;
  };

  /** explicitRows: optional — from Accept on a card; otherwise uses checkbox selection */
  const openSecFromPrimaryDialog = (explicitRows) => {
    const ok = (r) =>
      availPlantsPrimaryOutward(r) > 0 && (r.transferStatus ?? "available") !== "fully_transferred";
    let chosen = [];
    if (explicitRows?.length) {
      chosen = explicitRows.filter(ok);
    } else {
      chosen = primaryOutwardRows.filter(
        (r) => selectedPrimaryOutKeys.has(outwardKey(String(r._batchId), String(r._id))) && ok(r)
      );
    }
    if (!chosen.length) {
      Toast.error(
        explicitRows?.length
          ? "Nothing available to receive on this line"
          : "Select primary outward lines with plants available"
      );
      return;
    }
    setSelectedPrimaryOutKeys(
      new Set(chosen.map((r) => outwardKey(String(r._batchId), String(r._id))))
    );
    setSecFromPrimaryPerRow(buildSecFromPrimaryPerRow(chosen));
    setSecFromPrimaryOpen(true);
  };

  const rowIncomingToPrimaryOutward = (row) =>
    primaryOutwardRows.find(
      (r) =>
        String(r._id) === String(row.primaryOutward?._id) &&
        String(r._batchId) === String(row.batchId)
    );

  const submitSecFromPrimaryMulti = async (e) => {
    e.preventDefault();
    const sel = primaryOutwardRows.filter((r) =>
      selectedPrimaryOutKeys.has(outwardKey(String(r._batchId), String(r._id)))
    );
    if (!secFromPrimaryShared.pollyhouse) {
      Toast.error("Pollyhouse / shade is required");
      return;
    }
    try {
      for (const r of sel) {
        const q = secFromPrimaryPerRow[r._id];
        if (!q) continue;
        const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_FROM_PRIMARY_OUTWARD);
        await inst.request(
          {
            primaryOutwardId: r._id,
            secondaryInwardDate: new Date(secFromPrimaryShared.secondaryInwardDate).toISOString(),
            numberOfBottles: Number(q.numberOfBottles),
            size: r.size,
            cavity: Number(q.cavity),
            numberOfTrays: Number(q.numberOfTrays),
            pollyhouse: secFromPrimaryShared.pollyhouse,
            laboursEngaged: Number(secFromPrimaryShared.laboursEngaged),
            remarks: secFromPrimaryShared.remarks || "To secondary",
            dateOfDispatch: new Date(secFromPrimaryShared.dateOfDispatch).toISOString(),
          },
          { pathParams: [String(r._batchId)] }
        );
      }
      Toast.success("Inward received from primary");
      setSecFromPrimaryOpen(false);
      setSelectedPrimaryOutKeys(new Set());
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Transfer failed");
    }
  };

  const buildSecOutPerRow = (rows) => {
    const per = {};
    rows.forEach((r) => {
      const maxP = availPlantsSecondaryInward(r);
      const cav = Math.max(1, safeTrunc(r.cavity));
      const maxTr = Math.max(1, Math.floor(maxP / cav));
      const trays = Math.min(Math.max(1, safeTrunc(r.numberOfTrays) || 1), maxTr);
      per[r._id] = {
        numberOfBottles: Math.min(Math.max(1, safeTrunc(r.numberOfBottles) || 1), maxP),
        cavity: cav,
        numberOfTrays: trays,
      };
    });
    return per;
  };

  /** explicitRows: optional — quick dispatch from one inward line */
  const openSecOutDialog = (explicitRows) => {
    const ok = (r) =>
      availPlantsSecondaryInward(r) > 0 && (r.transferStatus ?? "available") !== "fully_transferred";
    let chosen = [];
    if (explicitRows?.length) {
      chosen = explicitRows.filter(ok);
    } else {
      chosen = secondaryInwardRows.filter(
        (r) => selectedSecInwardKeys.has(secInwardKey(String(r._batchId), String(r._id))) && ok(r)
      );
    }
    if (!chosen.length) {
      Toast.error(
        explicitRows?.length
          ? "Nothing available to dispatch on this line"
          : "Select secondary inward lines with plants available"
      );
      return;
    }
    setSelectedSecInwardKeys(
      new Set(chosen.map((r) => secInwardKey(String(r._batchId), String(r._id))))
    );
    setSecOutPerRow(buildSecOutPerRow(chosen));
    setSecOutDialogOpen(true);
  };

  const submitSecOutMulti = async (e) => {
    e.preventDefault();
    const sel = secondaryInwardRows.filter((r) =>
      selectedSecInwardKeys.has(secInwardKey(String(r._batchId), String(r._id)))
    );
    if (!secOutShared.pollyhouse) {
      Toast.error("Pollyhouse / shade is required");
      return;
    }
    try {
      for (const r of sel) {
        const q = secOutPerRow[r._id];
        if (!q) continue;
        const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_TO_OUTWARD_NS);
        await inst.request(
          {
            secondaryInwardId: r._id,
            secondaryOutwardDate: new Date(secOutShared.secondaryOutwardDate).toISOString(),
            numberOfBottles: Number(q.numberOfBottles),
            size: r.size,
            cavity: Number(q.cavity),
            numberOfTrays: Number(q.numberOfTrays),
            pollyhouse: secOutShared.pollyhouse,
            laboursEngaged: Number(secOutShared.laboursEngaged),
            remarks: secOutShared.remarks || "",
          },
          { pathParams: [String(r._batchId)] }
        );
      }
      Toast.success("Dispatch recorded");
      setSecOutDialogOpen(false);
      setSelectedSecInwardKeys(new Set());
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Secondary outward failed");
    }
  };

  const togglePrimaryOutSel = (batchId, id) => {
    const k = outwardKey(String(batchId), String(id));
    setSelectedPrimaryOutKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleSecInSel = (batchId, id) => {
    const k = secInwardKey(String(batchId), String(id));
    setSelectedSecInwardKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  if (!hasAccess && userData !== undefined) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: (t) => alpha(t.palette.secondary.main, 0.06),
        pb: (t) => `calc(${t.spacing(12)} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: theme.palette.secondary.dark, pt: "env(safe-area-inset-top, 0px)" }}>
        <Toolbar sx={{ minHeight: 48, py: 0.5 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.3 }}>
            Secondary ops
          </Typography>
          {showPrimaryOpsLink && (
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate("/u/primary-mobile")}
              sx={{ textTransform: "none", mr: 0.5, fontWeight: 600 }}
            >
              Primary
            </Button>
          )}
          <IconButton color="inherit" onClick={refreshAll} disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : <Refresh />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: "auto", px: 1, pt: 1.5, pb: 1 }}>
        <Alert severity="info" icon={<AcceptTabIcon fontSize="inherit" />} sx={{ mb: 1.5, borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>Accept</strong> — receive from primary into secondary inward. <strong>Inward</strong> — stock on hand.{" "}
            <strong>Dispatch</strong> — outward (dispatch) shipment.
          </Typography>
        </Alert>

        {tab === 0 && (
          <>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, px: 0.5 }}>
              Accept from primary
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: "block", px: 0.5 }}>
              Queue from primary outward. Tap <strong>Accept</strong> on a line or select rows, then <strong>Receive
              inward</strong>.
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75, px: 0.5 }}>
              Waiting to receive
            </Typography>
            {incomingFromPrimary.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nothing in queue — no primary outward stock waiting for secondary.
              </Typography>
            )}
            {incomingFromPrimary.map((row) => {
              const po = rowIncomingToPrimaryOutward(row);
              const canAccept =
                po &&
                availPlantsPrimaryOutward(po) > 0 &&
                (po.transferStatus ?? "available") !== "fully_transferred";
              return (
                <Card key={`${row.batchId}-${row.primaryOutward?._id}`} sx={{ mb: 1.25, borderRadius: 2 }}>
                  <CardContent
                    sx={{
                      py: 1.25,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={700}>{row.batchNumber}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {row.primaryOutward?.size} · avail {availPlantsPrimaryOutward(row.primaryOutward)} plants
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      disabled={!canAccept}
                      startIcon={<CheckCircle />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (po) openSecFromPrimaryDialog([po]);
                      }}
                    >
                      Accept
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Next {dashboard?.windowDays ?? 7} days — plant-ready window
            </Typography>
            {upcomingSecondaryMilestones.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No secondary-stage milestones in this window.
              </Typography>
            )}
            {upcomingSecondaryMilestones.map((m) => (
              <Card key={String(m.batchId)} sx={{ mb: 1, borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography fontWeight={700}>{m.batchNumber}</Typography>
                  <Typography variant="caption" display="block">
                    Sowing {m.anchorSowingDate}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    <Chip size="small" label={`Secondary in ${m.daysToSecondary}d`} color="secondary" variant="outlined" />
                  </Stack>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Select lines below (or use Accept above), then <strong>Receive inward</strong> to record secondary inward —
              same plant-ready rules as primary.
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              All primary outward lines
            </Typography>
            {primaryOutwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No primary outward rows.
              </Typography>
            )}
            {primaryOutwardRows.map((po) => {
              const avail = availPlantsPrimaryOutward(po);
              const canSel =
                avail > 0 && (po.transferStatus ?? "available") !== "fully_transferred";
              const sel = selectedPrimaryOutKeys.has(outwardKey(String(po._batchId), String(po._id)));
              return (
                <Card
                  key={`${po._batchId}-${po._id}`}
                  onClick={() => canSel && togglePrimaryOutSel(po._batchId, po._id)}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: sel ? "secondary.main" : "divider",
                    cursor: canSel ? "pointer" : "default",
                  }}
                >
                  <CardContent sx={{ py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={sel}
                      disabled={!canSel}
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => canSel && togglePrimaryOutSel(po._batchId, po._id)}
                    />
                    <Box>
                      <Typography fontWeight={700}>{po.batchNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {po.size} · {avail} plants avail
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Expected secondary inward / outward (window)
            </Typography>
            {upcomingSecIn.slice(0, 5).map((u) => (
              <Typography key={u.secondaryInward?._id} variant="caption" display="block">
                {u.batchNumber} · in {moment(u.expectedDate).format("DD MMM")}
              </Typography>
            ))}
            {upcomingSecOut.slice(0, 5).map((u) => (
              <Typography key={u.secondaryOutward?._id} variant="caption" display="block">
                {u.batchNumber} · out {moment(u.expectedDate).format("DD MMM")}
              </Typography>
            ))}
          </>
        )}

        {tab === 1 && (
          <>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, px: 0.5 }}>
              Inward (stock at secondary)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: "block", px: 0.5 }}>
              Lines received from primary. Select and use <strong>Record dispatch</strong>, or tap <strong>Dispatch</strong>{" "}
              on a row for a quick outward.
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Secondary inward ({secondaryInwardRows.length})
            </Typography>
            {secondaryInwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No inward yet — use the <strong>Accept</strong> tab to receive from primary first.
              </Typography>
            )}
            {secondaryInwardRows.map((si) => {
              const ms = getMilestoneForBatch(
                milestoneByBatch,
                si.batchNumber ?? plantReadyByBatchIdMap.get(String(si._batchId))?.batchNumber
              );
              const pr = resolvePlantReady(
                plantReadyByBatch,
                plantReadyByBatchIdMap,
                si.batchNumber,
                si._batchId
              );
              const avail = availPlantsSecondaryInward(si);
              const sel = selectedSecInwardKeys.has(secInwardKey(String(si._batchId), String(si._id)));
              const canSel =
                avail > 0 && (si.transferStatus ?? "available") !== "fully_transferred";
              return (
                <Card
                  key={`${si._batchId}-${si._id}`}
                  onClick={() => canSel && toggleSecInSel(si._batchId, si._id)}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: sel ? "secondary.main" : "divider",
                    cursor: canSel ? "pointer" : "default",
                  }}
                >
                  <CardContent sx={{ py: 1.25 }}>
                    <Stack direction="row" spacing={1}>
                      <Checkbox
                        checked={sel}
                        disabled={!canSel}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => canSel && toggleSecInSel(si._batchId, si._id)}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          {normBatchKey(si.batchNumber) || pr?.batchNumber || String(si._batchId)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {si.size} · {avail}/{si.totalQuantity} plants avail
                        </Typography>
                        {hasPlantReadyUi(pr) && (
                          <Box sx={{ mt: 1 }}>
                            <PlantReadyPanel pr={pr} nowTick={nowTick} theme={theme} />
                          </Box>
                        )}
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }} alignItems="center">
                          <Chip
                            size="small"
                            icon={<Today sx={{ fontSize: 14 }} />}
                            label={moment(si.secondaryInwardDate).format("DD MMM YYYY")}
                            variant="outlined"
                          />
                          {ms && (
                            <Chip
                              size="small"
                              label={`Secondary stage ${ms.daysToSecondary}d`}
                              variant="outlined"
                              color="secondary"
                            />
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            disabled={!canSel}
                            startIcon={<DispatchTabIcon sx={{ fontSize: 18 }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canSel) openSecOutDialog([si]);
                            }}
                            sx={{ textTransform: "none" }}
                          >
                            Dispatch
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {tab === 2 && (
          <>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, px: 0.5 }}>
              Dispatch (outward)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: "block", px: 0.5 }}>
              Secondary <strong>outward</strong> = dispatch / shipment from secondary. Created from the Inward tab.
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Records ({secondaryOutwardRows.length})
            </Typography>
            {secondaryOutwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No dispatch yet — go to <strong>Inward</strong>, select stock, then <strong>Record dispatch</strong>.
              </Typography>
            )}
            {secondaryOutwardRows.map((so) => (
              <Card key={`${so._batchId}-${so._id}`} sx={{ mb: 1, borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography fontWeight={700}>{so.batchNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {moment(so.secondaryOutwardDate).format("DD MMM YYYY")} · {so.size} ·{" "}
                    {so.totalQuantity} plants
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </Box>

      {tab === 0 && (
        <Stack
          spacing={1.5}
          sx={{
            position: "fixed",
            right: 12,
            zIndex: 1050,
            alignItems: "flex-end",
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {selectedPrimaryOutKeys.size > 0 && (
            <Fab
              color="secondary"
              size="medium"
              variant="extended"
              onClick={() => openSecFromPrimaryDialog()}
              sx={{ px: 2 }}
            >
              <NavigateNext sx={{ mr: 0.5 }} />
              Receive inward ({selectedPrimaryOutKeys.size})
            </Fab>
          )}
        </Stack>
      )}

      {tab === 1 && (
        <Stack
          spacing={1.5}
          sx={{
            position: "fixed",
            right: 12,
            zIndex: 1050,
            alignItems: "flex-end",
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {selectedSecInwardKeys.size > 0 && (
            <Fab
              color="secondary"
              size="medium"
              variant="extended"
              onClick={() => openSecOutDialog()}
              sx={{ px: 2 }}
            >
              <DispatchTabIcon sx={{ mr: 0.5 }} />
              Record dispatch ({selectedSecInwardKeys.size})
            </Fab>
          )}
        </Stack>
      )}

      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          pb: "env(safe-area-inset-bottom, 0px)",
        }}
        elevation={8}
      >
        <BottomNavigation value={tab} onChange={(_, v) => setTab(v)} showLabels sx={{ borderTop: 1, borderColor: "divider" }}>
          <BottomNavigationAction label="Accept" icon={<AcceptTabIcon />} sx={tabSx} />
          <BottomNavigationAction label="Inward" icon={<InwardIcon />} sx={tabSx} />
          <BottomNavigationAction label="Dispatch" icon={<DispatchTabIcon />} sx={tabSx} />
        </BottomNavigation>
      </Paper>

      <Dialog open={secFromPrimaryOpen} onClose={() => setSecFromPrimaryOpen(false)} fullWidth maxWidth="sm" fullScreen PaperProps={{ sx: { borderRadius: 0 } }}>
        <form onSubmit={submitSecFromPrimaryMulti}>
          <DialogTitle sx={{ pr: 6 }}>
            Accept — receive inward from primary
            <IconButton aria-label="close" onClick={() => setSecFromPrimaryOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField type="date" label="Secondary inward date" InputLabelProps={{ shrink: true }} value={secFromPrimaryShared.secondaryInwardDate} onChange={(e) => setSecFromPrimaryShared((s) => ({ ...s, secondaryInwardDate: e.target.value }))} required />
            <TextField type="date" label="Date of dispatch" InputLabelProps={{ shrink: true }} value={secFromPrimaryShared.dateOfDispatch} onChange={(e) => setSecFromPrimaryShared((s) => ({ ...s, dateOfDispatch: e.target.value }))} required />
            {locationOptions.length > 0 ? (
              <TextField select required label="Polly house / shade" value={locationOptions.some((o) => o.value === secFromPrimaryShared.pollyhouse) ? secFromPrimaryShared.pollyhouse : ""} onChange={(e) => setSecFromPrimaryShared((s) => ({ ...s, pollyhouse: e.target.value }))}>
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                {locationOptions.some((o) => o.group === "pollyhouse") && <ListSubheader>Polly houses</ListSubheader>}
                {locationOptions.filter((o) => o.group === "pollyhouse").map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
                {locationOptions.some((o) => o.group === "shade") && <ListSubheader>Shades</ListSubheader>}
                {locationOptions.filter((o) => o.group === "shade").map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField required label="Polly house / shade" value={secFromPrimaryShared.pollyhouse} onChange={(e) => setSecFromPrimaryShared((s) => ({ ...s, pollyhouse: e.target.value }))} />
            )}
            <TextField label="Labours engaged" type="number" value={secFromPrimaryShared.laboursEngaged} onChange={(e) => setSecFromPrimaryShared((s) => ({ ...s, laboursEngaged: e.target.value }))} required />
            <TextField label="Remarks" multiline rows={2} value={secFromPrimaryShared.remarks} onChange={(e) => setSecFromPrimaryShared((s) => ({ ...s, remarks: e.target.value }))} />
            <Divider />
            {primaryOutwardRows
              .filter((r) => selectedPrimaryOutKeys.has(outwardKey(String(r._batchId), String(r._id))))
              .map((r) => {
                const q = secFromPrimaryPerRow[r._id] || {};
                const maxP = availPlantsPrimaryOutward(r);
                return (
                  <Card key={r._id} variant="outlined">
                    <CardContent>
                      <Typography fontWeight={700}>{r.batchNumber}</Typography>
                      <Typography variant="caption">max {maxP} plants</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        <TextField size="small" label="Bottles" type="number" value={q.numberOfBottles ?? ""} onChange={(e) => setSecFromPrimaryPerRow((p) => ({ ...p, [r._id]: { ...p[r._id], numberOfBottles: e.target.value } }))} />
                        <TextField size="small" label="Cavity" type="number" value={q.cavity ?? ""} onChange={(e) => setSecFromPrimaryPerRow((p) => ({ ...p, [r._id]: { ...p[r._id], cavity: e.target.value } }))} />
                        <TextField size="small" label="Trays" type="number" value={q.numberOfTrays ?? ""} onChange={(e) => setSecFromPrimaryPerRow((p) => ({ ...p, [r._id]: { ...p[r._id], numberOfTrays: e.target.value } }))} />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 2 }}>
            <Button onClick={() => setSecFromPrimaryOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={secOutDialogOpen} onClose={() => setSecOutDialogOpen(false)} fullWidth maxWidth="sm" fullScreen PaperProps={{ sx: { borderRadius: 0 } }}>
        <form onSubmit={submitSecOutMulti}>
          <DialogTitle sx={{ pr: 6 }}>
            Dispatch — secondary outward
            <IconButton aria-label="close" onClick={() => setSecOutDialogOpen(false)} sx={{ position: "absolute", right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField type="date" label="Secondary outward date" InputLabelProps={{ shrink: true }} value={secOutShared.secondaryOutwardDate} onChange={(e) => setSecOutShared((s) => ({ ...s, secondaryOutwardDate: e.target.value }))} required />
            {locationOptions.length > 0 ? (
              <TextField select required label="Polly house / shade" value={locationOptions.some((o) => o.value === secOutShared.pollyhouse) ? secOutShared.pollyhouse : ""} onChange={(e) => setSecOutShared((s) => ({ ...s, pollyhouse: e.target.value }))}>
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                {locationOptions.filter((o) => o.group === "pollyhouse").map((o) => (
                  <MenuItem key={`o-${o.value}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
                {locationOptions.filter((o) => o.group === "shade").map((o) => (
                  <MenuItem key={`s-${o.value}`} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField required label="Polly house / shade" value={secOutShared.pollyhouse} onChange={(e) => setSecOutShared((s) => ({ ...s, pollyhouse: e.target.value }))} />
            )}
            <TextField label="Labours engaged" type="number" value={secOutShared.laboursEngaged} onChange={(e) => setSecOutShared((s) => ({ ...s, laboursEngaged: e.target.value }))} required />
            <TextField label="Remarks" multiline rows={2} value={secOutShared.remarks} onChange={(e) => setSecOutShared((s) => ({ ...s, remarks: e.target.value }))} />
            <Divider />
            {secondaryInwardRows
              .filter((r) => selectedSecInwardKeys.has(secInwardKey(String(r._batchId), String(r._id))))
              .map((r) => {
                const q = secOutPerRow[r._id] || {};
                const maxP = availPlantsSecondaryInward(r);
                return (
                  <Card key={r._id} variant="outlined">
                    <CardContent>
                      <Typography fontWeight={700}>{r.batchNumber}</Typography>
                      <Typography variant="caption">max {maxP} plants</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        <TextField size="small" label="Bottles" type="number" value={q.numberOfBottles ?? ""} onChange={(e) => setSecOutPerRow((p) => ({ ...p, [r._id]: { ...p[r._id], numberOfBottles: e.target.value } }))} />
                        <TextField size="small" label="Cavity" type="number" value={q.cavity ?? ""} onChange={(e) => setSecOutPerRow((p) => ({ ...p, [r._id]: { ...p[r._id], cavity: e.target.value } }))} />
                        <TextField size="small" label="Trays" type="number" value={q.numberOfTrays ?? ""} onChange={(e) => setSecOutPerRow((p) => ({ ...p, [r._id]: { ...p[r._id], numberOfTrays: e.target.value } }))} />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 2 }}>
            <Button onClick={() => setSecOutDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default SecondaryMobileOps;
