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
  FormControlLabel,
  alpha,
} from "@mui/material";
import {
  Home as HomeIcon,
  MoveToInbox as InwardIcon,
  TrendingFlat as OutwardIcon,
  Inventory2 as AcceptedIcon,
  Add,
  Refresh,
  CheckCircle,
  Cancel as CancelIcon,
  NavigateNext,
  Park as SecondaryIcon,
  Today,
  Spa as PlantReadyIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useUserData, useUserRole } from "utils/roleUtils";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import moment from "moment";
import {
  calendarDaysRemaining,
  formatCountdownTo,
  normBatchKey,
  getPlantReadyFromMap,
  getMilestoneForBatch,
  buildPlantReadyBatchIdMap,
  resolvePlantReady,
  hasPlantReadyUi,
  PlantReadyPanel,
} from "./plantReadyMobileUtils.jsx";

const tabSx = { minHeight: 56, "& .MuiBottomNavigationAction-label": { fontSize: "0.7rem" } };

const safeTrunc = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** Mirrors backend accepted-lab-line stock from full outward documents (GET /outwards). */
const computeLabLineStockClient = (lab) => {
  const th = lab.transferHistory || [];
  const bottlesTotal = safeTrunc(lab.bottles);
  const plantsTotal = safeTrunc(lab.plants);
  const bottlesTransferred = th.reduce((s, t) => s + safeTrunc(t?.bottlesTransferred), 0);
  const plantsTransferred = th.reduce((s, t) => s + safeTrunc(t?.plantsTransferred), 0);
  return {
    bottlesTotal,
    plantsTotal,
    bottlesTransferred,
    plantsTransferred,
    bottlesRemaining: Math.max(0, bottlesTotal - bottlesTransferred),
    plantsRemaining: Math.max(0, plantsTotal - plantsTransferred),
  };
};

const isLabAcceptedForUi = (l) =>
  (l.primaryReviewStatus ?? "accepted") === "accepted";

const availPlantsPrimaryInward = (pi) =>
  safeTrunc(pi.availableQuantity ?? pi.totalQuantity);

const availPlantsPrimaryOutward = (po) =>
  safeTrunc(po.availableQuantity ?? po.totalQuantity);

const inwardKey = (batchId, id) => `${batchId}:${id}`;
const outwardKey = (batchId, id) => `${batchId}:${id}`;

const PrimaryMobileOps = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const userData = useUserData();
  const userRole = useUserRole();
  const userJobTitle = useSelector((state) => state?.userData?.userData?.jobTitle);
  const isPrimaryEmployee = userJobTitle && userJobTitle.toUpperCase() === "PRIMARY";
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN";
  const hasAccess = isPrimaryEmployee || isSuperAdmin || isAdmin;
  const showSecondaryOpsLink = isSuperAdmin || isAdmin;

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [batches, setBatches] = useState([]);
  /** CMS polly houses + shades; { value, label, group } for select */
  const [locationOptions, setLocationOptions] = useState([]);
  const [inwardOpen, setInwardOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [inwardForm, setInwardForm] = useState({
    batchId: "",
    labEntryId: "",
    primaryInwardDate: moment().format("YYYY-MM-DD"),
    numberOfBottles: "",
    size: "R1",
    cavity: "",
    numberOfTrays: "",
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
  });

  const [selectedInwardKeys, setSelectedInwardKeys] = useState(() => new Set());
  const [selectedOutwardKeys, setSelectedOutwardKeys] = useState(() => new Set());

  const [primaryOutDialogOpen, setPrimaryOutDialogOpen] = useState(false);
  const [primaryOutShared, setPrimaryOutShared] = useState({
    primaryOutwardDate: moment().format("YYYY-MM-DD"),
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
    qualityOfDispatch: "Good",
    isReceived: "yes",
    dateOfPlantation: moment().format("YYYY-MM-DD"),
    numberOfDaysTaken: "0",
  });
  const [primaryOutPerRow, setPrimaryOutPerRow] = useState({});

  const [secondaryDialogOpen, setSecondaryDialogOpen] = useState(false);
  const [secondaryShared, setSecondaryShared] = useState({
    secondaryInwardDate: moment().format("YYYY-MM-DD"),
    dateOfDispatch: moment().format("YYYY-MM-DD"),
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
  });
  const [secondaryPerRow, setSecondaryPerRow] = useState({});

  /** Ticks every second on Inward tab for live plant-ready countdowns */
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (tab !== 1) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab]);

  useEffect(() => {
    if (userData !== undefined && userRole !== undefined && !hasAccess) {
      Toast.error("Access denied. PRIMARY, ADMIN, or SUPER_ADMIN only.");
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
      const inst = NetworkManager(API.PLANT_OUTWARD.PRIMARY_MOBILE_DASHBOARD);
      const res = await inst.request({}, { upcomingDays: 7 });
      const body = res.data;
      const dash = body?.data && typeof body.data === "object" ? body.data : {};
      setDashboard(dash);
      if (
        typeof localStorage !== "undefined" &&
        localStorage.getItem("DEBUG_PRIMARY_MOBILE") === "1"
      ) {
        const pr = dash?.plantReadyByBatchNumber;
        console.debug("[PrimaryMobileOps] dashboard plantReadyByBatchNumber keys", pr ? Object.keys(pr) : []);
      }
    } catch (e) {
      console.error(e);
      Toast.error(e?.message || "Failed to load dashboard");
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
    setSelectedInwardKeys(new Set());
    setSelectedOutwardKeys(new Set());
  }, [tab]);

  const acceptLab = async (batchId, labId) => {
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.LAB_REVIEW);
      await inst.request(
        { action: "accept" },
        { pathParams: [batchId, labId] }
      );
      Toast.success("Accepted");
      refreshAll();
    } catch (e) {
      Toast.error(e?.message || "Accept failed");
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.LAB_REVIEW);
      await inst.request(
        { action: "reject", rejectionReason: rejectReason || "Rejected" },
        { pathParams: [rejectTarget.batchId, rejectTarget.labId] }
      );
      Toast.success("Rejected");
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason("");
      refreshAll();
    } catch (e) {
      Toast.error(e?.message || "Reject failed");
    }
  };

  const submitInward = async (e) => {
    e.preventDefault();
    const {
      batchId,
      labEntryId,
      primaryInwardDate,
      numberOfBottles,
      size,
      cavity,
      numberOfTrays,
      pollyhouse,
      laboursEngaged,
      remarks,
    } = inwardForm;
    if (!batchId || !labEntryId || !pollyhouse) {
      Toast.error("Batch, lab line, and pollyhouse are required");
      return;
    }
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.LAB_TO_PRIMARY_INWARD);
      const res = await inst.request(
        {
          labEntryId,
          primaryInwardDate: new Date(primaryInwardDate).toISOString(),
          numberOfBottles: Number(numberOfBottles),
          size,
          cavity: Number(cavity),
          numberOfTrays: Number(numberOfTrays),
          pollyhouse,
          laboursEngaged: Number(laboursEngaged),
          remarks: remarks || undefined,
        },
        { pathParams: [batchId] }
      );
      const payload = res?.data?.data;
      const pr = payload?.plantReadyCountdown;
      if (pr?.hasAnchor) {
        Toast.success(
          `Primary inward saved · ${pr.daysRemainingToPrimary}d to primary · ${pr.daysRemainingToSecondary}d to secondary (sowing ${pr.anchorSowingDate})`
        );
      } else {
        const pd = pr?.primaryPlantReadyDays ?? 0;
        const sd = pr?.secondaryPlantReadyDays ?? 0;
        Toast.success(
          pd || sd
            ? `Primary inward recorded · batch plant-ready: ${pd}d primary · ${sd}d secondary`
            : "Primary inward recorded"
        );
      }
      setInwardOpen(false);
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Failed to record inward");
    }
  };

  const openInwardDialog = () => {
    setInwardForm((f) => ({
      ...f,
      batchId: "",
      labEntryId: "",
      primaryInwardDate: moment().format("YYYY-MM-DD"),
    }));
    setInwardOpen(true);
  };

  const toggleInwardSel = (batchId, id) => {
    const k = inwardKey(String(batchId), String(id));
    setSelectedInwardKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleOutwardSel = (batchId, id) => {
    const k = outwardKey(String(batchId), String(id));
    setSelectedOutwardKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const openPrimaryOutDialog = () => {
    const sel = primaryInwardRows.filter(
      (r) =>
        selectedInwardKeys.has(inwardKey(String(r._batchId), String(r._id))) &&
        availPlantsPrimaryInward(r) > 0 &&
        (r.transferStatus ?? "available") !== "fully_transferred"
    );
    if (!sel.length) {
      Toast.error("Select inward lines that still have plants available");
      return;
    }
    const per = {};
    sel.forEach((r) => {
      const maxP = availPlantsPrimaryInward(r);
      const cav = Math.max(1, safeTrunc(r.cavity));
      const maxTr = Math.max(1, Math.floor(maxP / cav));
      const trays = Math.min(Math.max(1, safeTrunc(r.numberOfTrays) || 1), maxTr);
      per[r._id] = {
        numberOfBottles: Math.min(Math.max(1, safeTrunc(r.numberOfBottles) || 1), maxP),
        cavity: cav,
        numberOfTrays: trays,
      };
    });
    setPrimaryOutPerRow(per);
    setPrimaryOutDialogOpen(true);
  };

  const submitPrimaryOutMulti = async (e) => {
    e.preventDefault();
    const sel = primaryInwardRows.filter((r) =>
      selectedInwardKeys.has(inwardKey(String(r._batchId), String(r._id)))
    );
    if (!primaryOutShared.pollyhouse) {
      Toast.error("Pollyhouse / shade is required");
      return;
    }
    try {
      for (const r of sel) {
        const q = primaryOutPerRow[r._id];
        if (!q) continue;
        const inst = NetworkManager(API.PLANT_OUTWARD.PRIMARY_INWARD_TO_OUTWARD);
        await inst.request(
          {
            primaryInwardId: r._id,
            primaryOutwardDate: new Date(primaryOutShared.primaryOutwardDate).toISOString(),
            numberOfBottles: Number(q.numberOfBottles),
            size: r.size,
            cavity: Number(q.cavity),
            numberOfTrays: Number(q.numberOfTrays),
            pollyhouse: primaryOutShared.pollyhouse,
            laboursEngaged: Number(primaryOutShared.laboursEngaged),
            remarks: primaryOutShared.remarks || "Primary outward",
            qualityOfDispatch: primaryOutShared.qualityOfDispatch,
            isReceived: primaryOutShared.isReceived === "yes",
            dateOfPlantation: new Date(primaryOutShared.dateOfPlantation).toISOString(),
            numberOfDaysTaken: Number(primaryOutShared.numberOfDaysTaken),
          },
          { pathParams: [String(r._batchId)] }
        );
      }
      Toast.success("Primary outward saved");
      setPrimaryOutDialogOpen(false);
      setSelectedInwardKeys(new Set());
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Primary outward failed");
    }
  };

  const openSecondaryDialog = () => {
    const sel = primaryOutwardRows.filter(
      (r) =>
        selectedOutwardKeys.has(outwardKey(String(r._batchId), String(r._id))) &&
        availPlantsPrimaryOutward(r) > 0 &&
        (r.transferStatus ?? "available") !== "fully_transferred"
    );
    if (!sel.length) {
      Toast.error("Select outward lines that still have plants available");
      return;
    }
    const per = {};
    sel.forEach((r) => {
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
    setSecondaryPerRow(per);
    setSecondaryDialogOpen(true);
  };

  const submitSecondaryMulti = async (e) => {
    e.preventDefault();
    const sel = primaryOutwardRows.filter((r) =>
      selectedOutwardKeys.has(outwardKey(String(r._batchId), String(r._id)))
    );
    if (!secondaryShared.pollyhouse) {
      Toast.error("Pollyhouse / shade is required");
      return;
    }
    try {
      for (const r of sel) {
        const q = secondaryPerRow[r._id];
        if (!q) continue;
        const inst = NetworkManager(API.PLANT_OUTWARD.PRIMARY_TO_SECONDARY);
        await inst.request(
          {
            primaryOutwardId: r._id,
            secondaryInwardDate: new Date(secondaryShared.secondaryInwardDate).toISOString(),
            numberOfBottles: Number(q.numberOfBottles),
            size: r.size,
            cavity: Number(q.cavity),
            numberOfTrays: Number(q.numberOfTrays),
            pollyhouse: secondaryShared.pollyhouse,
            laboursEngaged: Number(secondaryShared.laboursEngaged),
            remarks: secondaryShared.remarks || "To secondary",
            dateOfDispatch: new Date(secondaryShared.dateOfDispatch).toISOString(),
          },
          { pathParams: [String(r._batchId)] }
        );
      }
      Toast.success("Secondary inward saved");
      setSecondaryDialogOpen(false);
      setSelectedOutwardKeys(new Set());
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Secondary transfer failed");
    }
  };

  const pendingList = dashboard?.pendingIncoming ?? [];
  const milestones = dashboard?.upcomingMilestones ?? [];
  const upcomingPo = dashboard?.upcomingPrimaryOutward ?? [];

  const milestoneByBatch = useMemo(() => {
    const m = new Map();
    (milestones || []).forEach((row) => {
      const k = normBatchKey(row.batchNumber);
      if (k) m.set(k, row);
    });
    return m;
  }, [milestones]);

  const plantReadyByBatch = dashboard?.plantReadyByBatchNumber ?? {};

  const plantReadyByBatchIdMap = useMemo(
    () => buildPlantReadyBatchIdMap(plantReadyByBatch),
    [plantReadyByBatch]
  );

  /** Same data as GET /laboutward/accepted-lab-lines; derived from batches so it always matches GET /outwards. */
  const acceptedLabLines = useMemo(
    () =>
      batches.flatMap((po) => {
        const bid = po.batchId?._id || po.batchId;
        const bn = po.batchId?.batchNumber ?? "—";
        return (po.outward || [])
          .filter(isLabAcceptedForUi)
          .map((l) => ({
            plantOutwardId: po._id,
            batchId: bid,
            batchNumber: bn,
            labEntryId: l._id,
            labEntry: l,
            ...computeLabLineStockClient(l),
          }));
      }),
    [batches]
  );

  const primaryInwardRows = batches
    .flatMap((po) =>
      (po.primaryInward || []).map((pi) => ({
        ...pi,
        _batchId: po.batchId?._id || po.batchId,
        batchNumber: po.batchId?.batchNumber,
      }))
    )
    .sort((a, b) => moment(b.primaryInwardDate).valueOf() - moment(a.primaryInwardDate).valueOf());

  const primaryOutwardRows = batches
    .flatMap((po) =>
      (po.primaryOutward || []).map((pi) => ({
        ...pi,
        _batchId: po.batchId?._id || po.batchId,
        batchNumber: po.batchId?.batchNumber,
      }))
    )
    .sort((a, b) => moment(b.primaryOutwardDate).valueOf() - moment(a.primaryOutwardDate).valueOf());

  const acceptedLabOptions = batches.flatMap((po) => {
    const bid = po.batchId?._id || po.batchId;
    const bn = po.batchId?.batchNumber;
    return (po.outward || [])
      .filter(isLabAcceptedForUi)
      .filter((l) => (l.transferStatus ?? "available") !== "fully_transferred")
      .map((l) => {
        const stock = computeLabLineStockClient(l);
        return {
          batchId: String(bid),
          batchNumber: bn,
          lab: l,
          stock,
        };
      })
      .filter(
        (o) => o.stock.bottlesRemaining > 0 && o.stock.plantsRemaining > 0
      );
  });

  const inwardDialogPlantReady = useMemo(() => {
    if (!inwardForm.batchId || !inwardForm.labEntryId) return null;
    const opt = acceptedLabOptions.find(
      (o) =>
        String(o.batchId) === String(inwardForm.batchId) &&
        String(o.lab._id) === String(inwardForm.labEntryId)
    );
    const bn = opt?.batchNumber;
    return resolvePlantReady(plantReadyByBatch, plantReadyByBatchIdMap, bn, inwardForm.batchId);
  }, [
    inwardForm.batchId,
    inwardForm.labEntryId,
    acceptedLabOptions,
    plantReadyByBatch,
    plantReadyByBatchIdMap,
  ]);

  useEffect(() => {
    if (typeof localStorage === "undefined" || localStorage.getItem("DEBUG_PRIMARY_MOBILE") !== "1") {
      return;
    }
    const rows = primaryInwardRows.slice(0, 12).map((pi) => {
      const pr = resolvePlantReady(
        plantReadyByBatch,
        plantReadyByBatchIdMap,
        pi.batchNumber,
        pi._batchId
      );
      return {
        batchNumber: pi.batchNumber,
        _batchId: String(pi._batchId),
        resolved: !!pr,
        hasAnchor: pr?.hasAnchor,
        primaryPlantReadyDays: pr?.primaryPlantReadyDays,
        secondaryPlantReadyDays: pr?.secondaryPlantReadyDays,
        prBatchId: pr?.batchId,
      };
    });
    console.debug("[PrimaryMobileOps] plantReady inward debug", {
      plantReadyKeyCount: Object.keys(plantReadyByBatch).length,
      plantReadyByBatchIdMapSize: plantReadyByBatchIdMap.size,
      sampleRows: rows,
    });
  }, [
    tab,
    primaryInwardRows,
    plantReadyByBatch,
    plantReadyByBatchIdMap,
  ]);

  if (!hasAccess && userData !== undefined) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
        pb: (t) => `calc(${t.spacing(12)} + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: theme.palette.primary.dark, pt: "env(safe-area-inset-top, 0px)" }}>
        <Toolbar sx={{ minHeight: 48, py: 0.5 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.3 }}>
            Primary ops
          </Typography>
          {showSecondaryOpsLink && (
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate("/u/secondary-sowing-entry")}
              sx={{ textTransform: "none", mr: 0.5, fontWeight: 600 }}
            >
              Secondary
            </Button>
          )}
          <IconButton color="inherit" onClick={refreshAll} disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : <Refresh />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: "auto", px: 1, pt: 1.5, pb: 1 }}>
        {tab === 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, px: 0.5 }}>
              Incoming — accept lab lines
            </Typography>
            {pendingList.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
                No pending lab entries.
              </Typography>
            )}
            {pendingList.map((row) => (
              <Card
                key={`${row.batchId}-${row.labEntry?._id}`}
                sx={{ mb: 1.5, borderRadius: 2 }}
              >
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {row.batchNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.labEntry.size} · {row.labEntry.bottles} bottles · {row.labEntry.plants}{" "}
                    plants
                  </Typography>
                  <Typography variant="caption" display="block">
                    Out: {moment(row.labEntry.outwardDate).format("DD MMM YYYY")}
                  </Typography>
                  <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={() => acceptLab(row.batchId, row.labEntry?._id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setRejectTarget({ batchId: row.batchId, labId: row.labEntry?._id });
                        setRejectOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, px: 0.5 }}>
              Accepted lab lines — stock (bottles / plants remaining)
            </Typography>
            {acceptedLabLines.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
                No accepted lab lines yet (accept pending entries above).
              </Typography>
            )}
            {acceptedLabLines.map((row) => (
              <Card
                key={`${String(row.batchId)}-${String(row.labEntryId)}`}
                sx={{ mb: 1.5, borderRadius: 2 }}
              >
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {row.batchNumber}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.labEntry?.size} · total {row.bottlesTotal} bt / {row.plantsTotal} plants
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Sowed (transferred): {row.bottlesTransferred} bt · {row.plantsTransferred}{" "}
                    plants
                  </Typography>
                  <Chip
                    size="small"
                    color={
                      row.bottlesRemaining === 0 && row.plantsRemaining === 0
                        ? "default"
                        : "primary"
                    }
                    label={`Remaining: ${row.bottlesRemaining} bt · ${row.plantsRemaining} plants`}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, px: 0.5, display: "block" }}>
              Sowing-based plant-ready targets and days remaining are on the <strong>Inward</strong> tab (each
              primary inward line and in <strong>Lab → primary inward</strong> when you pick a lab line).
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Upcoming primary outward (expected)
            </Typography>
            {upcomingPo.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                None in window.
              </Typography>
            )}
            {upcomingPo.map((u) => (
              <Card key={u.primaryInward._id} sx={{ mb: 1, borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {u.batchNumber}
                  </Typography>
                  <Typography variant="caption">
                    {moment(u.expectedDate).format("DD MMM YYYY")} · Qty{" "}
                    {u.primaryInward?.totalQuantity}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {tab === 1 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", px: 0.5 }}>
              Tap lines to select · then → to record <strong>primary outward</strong>
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Primary inward ({primaryInwardRows.length})
            </Typography>
            {primaryInwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No primary inward entries yet.
              </Typography>
            )}
            {primaryInwardRows.map((pi) => {
              const ms = getMilestoneForBatch(
                milestoneByBatch,
                pi.batchNumber ?? plantReadyByBatchIdMap.get(String(pi._batchId))?.batchNumber
              );
              const pr = resolvePlantReady(
                plantReadyByBatch,
                plantReadyByBatchIdMap,
                pi.batchNumber,
                pi._batchId
              );
              const avail = availPlantsPrimaryInward(pi);
              const isToday = moment(pi.primaryInwardDate).isSame(moment(), "day");
              const expSoon =
                pi.primaryOutwardExpectedDate &&
                moment(pi.primaryOutwardExpectedDate).diff(moment(), "days") <= 3 &&
                moment(pi.primaryOutwardExpectedDate).diff(moment(), "days") >= 0;
              const sel = selectedInwardKeys.has(inwardKey(String(pi._batchId), String(pi._id)));
              const canSel =
                avail > 0 && (pi.transferStatus ?? "available") !== "fully_transferred";
              return (
                <Card
                  key={`${pi._batchId}-${pi._id}`}
                  onClick={() => canSel && toggleInwardSel(pi._batchId, pi._id)}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: sel ? "primary.main" : "divider",
                    bgcolor: sel ? alpha(theme.palette.primary.main, 0.06) : "background.paper",
                    boxShadow: "none",
                    cursor: canSel ? "pointer" : "default",
                  }}
                >
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Checkbox
                        checked={sel}
                        disabled={!canSel}
                        size="small"
                        sx={{ p: 0, mt: -0.25 }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => canSel && toggleInwardSel(pi._batchId, pi._id)}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          {normBatchKey(pi.batchNumber) ||
                            pr?.batchNumber ||
                            String(pi._batchId)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {pi.size} · {pi.numberOfBottles} bt · {avail}/{pi.totalQuantity} plants avail
                        </Typography>
                        {hasPlantReadyUi(pr) && (
                          <Box sx={{ mt: 1 }}>
                            <PlantReadyPanel pr={pr} nowTick={nowTick} theme={theme} />
                          </Box>
                        )}
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            icon={<Today sx={{ fontSize: 14 }} />}
                            label={moment(pi.primaryInwardDate).format("DD MMM YYYY")}
                            color={isToday ? "warning" : "default"}
                            variant={isToday ? "filled" : "outlined"}
                          />
                          {pi.primaryOutwardExpectedDate && (
                            <Chip
                              size="small"
                              label={`Out ${moment(pi.primaryOutwardExpectedDate).format("DD MMM")}`}
                              color={expSoon ? "secondary" : "default"}
                              variant="outlined"
                            />
                          )}
                          {!pr?.hasAnchor && ms && (
                            <Chip
                              size="small"
                              icon={<PlantReadyIcon sx={{ fontSize: 14 }} />}
                              label={`P${ms.daysToPrimary}d S${ms.daysToSecondary}d`}
                              variant="outlined"
                              color="primary"
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                          {pi.pollyhouse}
                        </Typography>
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
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", px: 0.5 }}>
              Select lines · FAB sends to <strong>secondary</strong> (inward)
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Primary outward ({primaryOutwardRows.length})
            </Typography>
            {primaryOutwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No primary outward yet — use Inward tab → → to create.
              </Typography>
            )}
            {primaryOutwardRows.map((po) => {
              const ms = getMilestoneForBatch(milestoneByBatch, po.batchNumber);
              const avail = availPlantsPrimaryOutward(po);
              const isToday = moment(po.primaryOutwardDate).isSame(moment(), "day");
              const sel = selectedOutwardKeys.has(outwardKey(String(po._batchId), String(po._id)));
              const canSel =
                avail > 0 && (po.transferStatus ?? "available") !== "fully_transferred";
              return (
                <Card
                  key={`${po._batchId}-${po._id}`}
                  onClick={() => canSel && toggleOutwardSel(po._batchId, po._id)}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: sel ? "secondary.main" : "divider",
                    bgcolor: sel ? alpha(theme.palette.secondary.main, 0.06) : "background.paper",
                    boxShadow: "none",
                    cursor: canSel ? "pointer" : "default",
                  }}
                >
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Checkbox
                        checked={sel}
                        disabled={!canSel}
                        size="small"
                        sx={{ p: 0, mt: -0.25 }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => canSel && toggleOutwardSel(po._batchId, po._id)}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={700}>{po.batchNumber}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {po.size} · {po.numberOfBottles} bt · {avail}/{po.totalQuantity} plants avail
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            icon={<Today sx={{ fontSize: 14 }} />}
                            label={moment(po.primaryOutwardDate).format("DD MMM YYYY")}
                            color={isToday ? "warning" : "default"}
                            variant={isToday ? "filled" : "outlined"}
                          />
                          {ms && (
                            <Chip
                              size="small"
                              icon={<PlantReadyIcon sx={{ fontSize: 14 }} />}
                              label={`P${ms.daysToPrimary}d S${ms.daysToSecondary}d`}
                              variant="outlined"
                              color="primary"
                            />
                          )}
                          {po.transferStatus && (
                            <Chip
                              size="small"
                              label={String(po.transferStatus).replace(/_/g, " ")}
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                          {po.pollyhouse}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {tab === 3 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Accepted lab lines ({acceptedLabLines.length})
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
              Stock after transfers toward primary inward
            </Typography>
            {acceptedLabLines.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                Accept lab lines on Home first.
              </Typography>
            )}
            {acceptedLabLines.map((row) => {
              const pctB =
                row.bottlesTotal > 0
                  ? Math.round((row.bottlesTransferred / row.bottlesTotal) * 100)
                  : 0;
              return (
                <Card
                  key={`acc-${String(row.batchId)}-${String(row.labEntryId)}`}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "none",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      background: `linear-gradient(90deg, ${alpha(theme.palette.success.main, 0.12)} 0%, transparent 100%)`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={800}>{row.batchNumber}</Typography>
                      <Chip size="small" label={row.labEntry?.size} color="success" variant="outlined" />
                    </Stack>
                  </Box>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Lab out ${row.labEntry?.outwardDate ? moment(row.labEntry.outwardDate).format("DD MMM") : "—"}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Root ${row.labEntry?.rootingDate ? moment(row.labEntry.rootingDate).format("DD MMM") : "—"}`}
                      />
                    </Stack>
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Bottles
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {row.bottlesRemaining}/{row.bottlesTotal} left
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Plants
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {row.plantsRemaining}/{row.plantsTotal} left
                        </Typography>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="success.main" sx={{ mt: 1, display: "block" }}>
                      Sowed: {row.bottlesTransferred} bt · {row.plantsTransferred} plants ({pctB}% bt)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                      {row.labEntry?.transferStatus && (
                        <Chip
                          size="small"
                          label={String(row.labEntry.transferStatus).replace(/_/g, " ")}
                          variant="outlined"
                        />
                      )}
                      <Chip size="small" color="success" label="accepted" variant="outlined" />
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </Box>

      {tab === 1 && (
        <Stack
          spacing={1.5}
          sx={{
            position: "fixed",
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
            right: 12,
            zIndex: 1050,
            alignItems: "flex-end",
          }}
        >
          {selectedInwardKeys.size > 0 && (
            <Fab
              color="secondary"
              size="medium"
              aria-label="primary outward"
              variant="extended"
              onClick={openPrimaryOutDialog}
              sx={{ px: 2 }}
            >
              <NavigateNext sx={{ mr: 0.5 }} />
              Outward ({selectedInwardKeys.size})
            </Fab>
          )}
          <Fab color="primary" aria-label="add inward" onClick={openInwardDialog}>
            <Add />
          </Fab>
        </Stack>
      )}

      {tab === 2 && (
        <Stack
          spacing={1.5}
          sx={{
            position: "fixed",
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
            right: 12,
            zIndex: 1050,
            alignItems: "flex-end",
          }}
        >
          {selectedOutwardKeys.size > 0 && (
            <Fab
              color="secondary"
              size="medium"
              aria-label="to secondary"
              variant="extended"
              onClick={openSecondaryDialog}
              sx={{ px: 2 }}
            >
              <SecondaryIcon sx={{ mr: 0.5 }} />
              Secondary ({selectedOutwardKeys.size})
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
        <BottomNavigation
          value={tab}
          onChange={(_, v) => setTab(v)}
          showLabels
          sx={{ borderTop: 1, borderColor: "divider" }}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} sx={tabSx} />
          <BottomNavigationAction label="Inward" icon={<InwardIcon />} sx={tabSx} />
          <BottomNavigationAction label="Outward" icon={<OutwardIcon />} sx={tabSx} />
          <BottomNavigationAction label="Accepted" icon={<AcceptedIcon />} sx={tabSx} />
        </BottomNavigation>
      </Paper>

      <Dialog open={inwardOpen} onClose={() => setInwardOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={submitInward}>
          <DialogTitle>Lab → primary inward</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              select
              required
              label="Lab line (accepted)"
              value={
                inwardForm.labEntryId && inwardForm.batchId
                  ? `${inwardForm.batchId}:${inwardForm.labEntryId}`
                  : ""
              }
              onChange={(e) => {
                const [bid, lid] = e.target.value.split(":");
                setInwardForm((f) => ({ ...f, batchId: bid, labEntryId: lid }));
              }}
              SelectProps={{ native: false }}
            >
              <MenuItem value="">
                <em>Select batch / lab line</em>
              </MenuItem>
              {acceptedLabOptions.map((o) => (
                <MenuItem
                  key={`${o.batchId}-${o.lab._id}`}
                  value={`${o.batchId}:${o.lab._id}`}
                >
                  {o.batchNumber} — {o.lab.size} · {o.stock.bottlesRemaining}/
                  {o.stock.bottlesTotal} bt · {o.stock.plantsRemaining}/
                  {o.stock.plantsTotal} plants left
                </MenuItem>
              ))}
            {acceptedLabOptions.length === 0 && (
              <MenuItem disabled>No accepted lab lines with stock (accept on Home first)</MenuItem>
            )}
            </TextField>
            {inwardForm.batchId &&
              inwardForm.labEntryId &&
              hasPlantReadyUi(inwardDialogPlantReady) && (
                <PlantReadyPanel pr={inwardDialogPlantReady} nowTick={nowTick} theme={theme} />
              )}
            <TextField
              type="date"
              label="Primary inward date"
              InputLabelProps={{ shrink: true }}
              value={inwardForm.primaryInwardDate}
              onChange={(e) => setInwardForm((f) => ({ ...f, primaryInwardDate: e.target.value }))}
              required
            />
            <TextField
              select
              label="Size"
              value={inwardForm.size}
              onChange={(e) => setInwardForm((f) => ({ ...f, size: e.target.value }))}
            >
              {["R1", "R2", "R3"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Number of bottles"
              type="number"
              required
              value={inwardForm.numberOfBottles}
              onChange={(e) => setInwardForm((f) => ({ ...f, numberOfBottles: e.target.value }))}
            />
            <TextField
              label="Cavity"
              type="number"
              required
              value={inwardForm.cavity}
              onChange={(e) => setInwardForm((f) => ({ ...f, cavity: e.target.value }))}
            />
            <TextField
              label="Number of trays"
              type="number"
              required
              value={inwardForm.numberOfTrays}
              onChange={(e) => setInwardForm((f) => ({ ...f, numberOfTrays: e.target.value }))}
            />
            {locationOptions.length > 0 ? (
              <TextField
                select
                required
                label="Polly house / shade (CMS)"
                helperText="Polly houses and shades from CMS (name, location, shade number)."
                value={
                  locationOptions.some((o) => o.value === inwardForm.pollyhouse)
                    ? inwardForm.pollyhouse
                    : ""
                }
                onChange={(e) =>
                  setInwardForm((f) => ({ ...f, pollyhouse: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                {locationOptions.some((o) => o.group === "pollyhouse") && (
                  <ListSubheader sx={{ lineHeight: 2 }}>Polly houses</ListSubheader>
                )}
                {locationOptions
                  .filter((o) => o.group === "pollyhouse")
                  .map((o) => (
                    <MenuItem key={`p-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                {locationOptions.some((o) => o.group === "shade") && (
                  <ListSubheader sx={{ lineHeight: 2 }}>Shades</ListSubheader>
                )}
                {locationOptions
                  .filter((o) => o.group === "shade")
                  .map((o) => (
                    <MenuItem key={`s-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
              </TextField>
            ) : (
              <TextField
                required
                label="Polly house / shade"
                placeholder="Type name as in CMS (polly or shade)"
                value={inwardForm.pollyhouse}
                onChange={(e) =>
                  setInwardForm((f) => ({ ...f, pollyhouse: e.target.value }))
                }
                helperText="CMS list not loaded — enter the location name manually."
              />
            )}
            <TextField
              label="Labours engaged"
              type="number"
              required
              value={inwardForm.laboursEngaged}
              onChange={(e) => setInwardForm((f) => ({ ...f, laboursEngaged: e.target.value }))}
            />
            <TextField
              label="Remarks"
              multiline
              rows={2}
              value={inwardForm.remarks}
              onChange={(e) => setInwardForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInwardOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={primaryOutDialogOpen}
        onClose={() => setPrimaryOutDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <form onSubmit={submitPrimaryOutMulti}>
          <DialogTitle sx={{ pr: 6, pb: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              Primary outward
            </Typography>
            <Typography variant="caption" color="text.secondary">
              One save per selected line · trays × cavity ≤ plants available
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setPrimaryOutDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              type="date"
              label="Primary outward date"
              InputLabelProps={{ shrink: true }}
              value={primaryOutShared.primaryOutwardDate}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, primaryOutwardDate: e.target.value }))
              }
              required
            />
            <TextField
              label="Quality of dispatch"
              value={primaryOutShared.qualityOfDispatch}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, qualityOfDispatch: e.target.value }))
              }
              required
            />
            <TextField
              select
              label="Received at dispatch"
              value={primaryOutShared.isReceived}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, isReceived: e.target.value }))
              }
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField
              type="date"
              label="Date of plantation"
              InputLabelProps={{ shrink: true }}
              value={primaryOutShared.dateOfPlantation}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, dateOfPlantation: e.target.value }))
              }
              required
            />
            <TextField
              label="Days taken"
              type="number"
              value={primaryOutShared.numberOfDaysTaken}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, numberOfDaysTaken: e.target.value }))
              }
              required
            />
            {locationOptions.length > 0 ? (
              <TextField
                select
                required
                label="Polly house / shade"
                value={
                  locationOptions.some((o) => o.value === primaryOutShared.pollyhouse)
                    ? primaryOutShared.pollyhouse
                    : ""
                }
                onChange={(e) =>
                  setPrimaryOutShared((s) => ({ ...s, pollyhouse: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                {locationOptions.some((o) => o.group === "pollyhouse") && (
                  <ListSubheader>Polly houses</ListSubheader>
                )}
                {locationOptions
                  .filter((o) => o.group === "pollyhouse")
                  .map((o) => (
                    <MenuItem key={`po-p-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                {locationOptions.some((o) => o.group === "shade") && (
                  <ListSubheader>Shades</ListSubheader>
                )}
                {locationOptions
                  .filter((o) => o.group === "shade")
                  .map((o) => (
                    <MenuItem key={`po-s-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
              </TextField>
            ) : (
              <TextField
                required
                label="Polly house / shade"
                value={primaryOutShared.pollyhouse}
                onChange={(e) =>
                  setPrimaryOutShared((s) => ({ ...s, pollyhouse: e.target.value }))
                }
              />
            )}
            <TextField
              label="Labours engaged"
              type="number"
              value={primaryOutShared.laboursEngaged}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, laboursEngaged: e.target.value }))
              }
              required
            />
            <TextField
              label="Remarks"
              multiline
              rows={2}
              value={primaryOutShared.remarks}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, remarks: e.target.value }))
              }
            />
            <Divider />
            {primaryInwardRows
              .filter((r) =>
                selectedInwardKeys.has(inwardKey(String(r._batchId), String(r._id)))
              )
              .map((r) => {
                const q = primaryOutPerRow[r._id] || {};
                const maxP = availPlantsPrimaryInward(r);
                return (
                  <Card key={r._id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography fontWeight={700}>{r.batchNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.size} · max {maxP} plants
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          size="small"
                          label="Bottles"
                          type="number"
                          value={q.numberOfBottles ?? ""}
                          onChange={(e) =>
                            setPrimaryOutPerRow((p) => ({
                              ...p,
                              [r._id]: {
                                ...p[r._id],
                                numberOfBottles: e.target.value,
                              },
                            }))
                          }
                        />
                        <TextField
                          size="small"
                          label="Cavity"
                          type="number"
                          value={q.cavity ?? ""}
                          onChange={(e) =>
                            setPrimaryOutPerRow((p) => ({
                              ...p,
                              [r._id]: { ...p[r._id], cavity: e.target.value },
                            }))
                          }
                        />
                        <TextField
                          size="small"
                          label="Trays"
                          type="number"
                          value={q.numberOfTrays ?? ""}
                          onChange={(e) =>
                            setPrimaryOutPerRow((p) => ({
                              ...p,
                              [r._id]: { ...p[r._id], numberOfTrays: e.target.value },
                            }))
                          }
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 2 }}>
            <Button onClick={() => setPrimaryOutDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" size="large">
              Save all
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={secondaryDialogOpen}
        onClose={() => setSecondaryDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <form onSubmit={submitSecondaryMulti}>
          <DialogTitle sx={{ pr: 6, pb: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              Secondary inward
            </Typography>
            <Typography variant="caption" color="text.secondary">
              From primary outward → secondary stage
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setSecondaryDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              type="date"
              label="Secondary inward date"
              InputLabelProps={{ shrink: true }}
              value={secondaryShared.secondaryInwardDate}
              onChange={(e) =>
                setSecondaryShared((s) => ({ ...s, secondaryInwardDate: e.target.value }))
              }
              required
            />
            <TextField
              type="date"
              label="Date of dispatch"
              InputLabelProps={{ shrink: true }}
              value={secondaryShared.dateOfDispatch}
              onChange={(e) =>
                setSecondaryShared((s) => ({ ...s, dateOfDispatch: e.target.value }))
              }
              required
            />
            {locationOptions.length > 0 ? (
              <TextField
                select
                required
                label="Polly house / shade"
                value={
                  locationOptions.some((o) => o.value === secondaryShared.pollyhouse)
                    ? secondaryShared.pollyhouse
                    : ""
                }
                onChange={(e) =>
                  setSecondaryShared((s) => ({ ...s, pollyhouse: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>Select</em>
                </MenuItem>
                {locationOptions.some((o) => o.group === "pollyhouse") && (
                  <ListSubheader>Polly houses</ListSubheader>
                )}
                {locationOptions
                  .filter((o) => o.group === "pollyhouse")
                  .map((o) => (
                    <MenuItem key={`sec-p-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                {locationOptions.some((o) => o.group === "shade") && (
                  <ListSubheader>Shades</ListSubheader>
                )}
                {locationOptions
                  .filter((o) => o.group === "shade")
                  .map((o) => (
                    <MenuItem key={`sec-s-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
              </TextField>
            ) : (
              <TextField
                required
                label="Polly house / shade"
                value={secondaryShared.pollyhouse}
                onChange={(e) =>
                  setSecondaryShared((s) => ({ ...s, pollyhouse: e.target.value }))
                }
              />
            )}
            <TextField
              label="Labours engaged"
              type="number"
              value={secondaryShared.laboursEngaged}
              onChange={(e) =>
                setSecondaryShared((s) => ({ ...s, laboursEngaged: e.target.value }))
              }
              required
            />
            <TextField
              label="Remarks"
              multiline
              rows={2}
              value={secondaryShared.remarks}
              onChange={(e) =>
                setSecondaryShared((s) => ({ ...s, remarks: e.target.value }))
              }
            />
            <Divider />
            {primaryOutwardRows
              .filter((r) =>
                selectedOutwardKeys.has(outwardKey(String(r._batchId), String(r._id)))
              )
              .map((r) => {
                const q = secondaryPerRow[r._id] || {};
                const maxP = availPlantsPrimaryOutward(r);
                return (
                  <Card key={r._id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography fontWeight={700}>{r.batchNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.size} · max {maxP} plants
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        <TextField
                          size="small"
                          label="Bottles"
                          type="number"
                          value={q.numberOfBottles ?? ""}
                          onChange={(e) =>
                            setSecondaryPerRow((p) => ({
                              ...p,
                              [r._id]: {
                                ...p[r._id],
                                numberOfBottles: e.target.value,
                              },
                            }))
                          }
                        />
                        <TextField
                          size="small"
                          label="Cavity"
                          type="number"
                          value={q.cavity ?? ""}
                          onChange={(e) =>
                            setSecondaryPerRow((p) => ({
                              ...p,
                              [r._id]: { ...p[r._id], cavity: e.target.value },
                            }))
                          }
                        />
                        <TextField
                          size="small"
                          label="Trays"
                          type="number"
                          value={q.numberOfTrays ?? ""}
                          onChange={(e) =>
                            setSecondaryPerRow((p) => ({
                              ...p,
                              [r._id]: { ...p[r._id], numberOfTrays: e.target.value },
                            }))
                          }
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 2 }}>
            <Button onClick={() => setSecondaryDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary" size="large">
              Save all
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <DialogTitle>Reject lab line</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={submitReject}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrimaryMobileOps;
