import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Tooltip,
  Tabs,
  Tab,
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
  Schedule as ScheduleIcon,
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
  normBatchKey,
  getMilestoneForBatch,
  buildPlantReadyBatchIdMap,
  resolvePlantReady,
  hasPlantReadyUi,
  PlantReadyPanel,
} from "./plantReadyMobileUtils.jsx";
import { batchPlantSubtypeLabelFromList } from "utils/batchPlantDisplay";

/** Shorten long batch-filter labels for small screens */
const truncateMiddle = (s, max = 52) => {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.floor(max / 2) - 1)}…${t.slice(-Math.floor(max / 2))}`;
};

const tabSx = { minHeight: 56, "& .MuiBottomNavigationAction-label": { fontSize: "0.7rem" } };

/** Two equal full-width buttons for mobile (Cancel | Save) */
const dialogActions5050Sx = {
  px: 2,
  py: 1.5,
  gap: 1,
  display: "flex",
  flexDirection: "row",
  "& .MuiButton-root": {
    flex: 1,
    minHeight: 52,
    fontSize: "1.05rem",
    fontWeight: 700,
  },
};

/** Shed-style dispatch quality (primary outward) */
const QUALITY_OF_DISPATCH_OPTIONS = ["Best", "Very Good", "Good", "Fair"];

const TRAY_CUSTOM = "__custom__";

/** Stable fallback so hooks depending on plantReady map do not re-run every render */
const EMPTY_PLANT_READY_MAP = Object.freeze({});

/** Default cavity for Lab → primary inward (matches common CMS tray) */
const DEFAULT_INWARD_CAVITY = 126;

const safeTrunc = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const syncInwardTraysFromLab = (cavityStr, plantsRemaining) => {
  const cav = safeTrunc(cavityStr);
  const pr = Number(plantsRemaining);
  if (!Number.isFinite(pr) || pr < 1 || cav < 1) return "";
  return String(Math.max(1, Math.floor(pr / cav)));
};

/**
 * Best-effort expected primary plant-ready instant for an inward line (fills gaps when
 * primaryOutwardExpectedDate / sowing map are missing).
 */
const resolveInwardPlantReadyMoment = (pi, pr, ms, batchPrimaryDays) => {
  if (pi?.primaryOutwardExpectedDate) {
    const m = moment(pi.primaryOutwardExpectedDate);
    if (m.isValid()) return m;
  }
  if (pr?.primaryStageReadyAt) {
    const m = moment(pr.primaryStageReadyAt);
    if (m.isValid()) return m;
  }
  if (ms?.primaryStageReadyAt) {
    const m = moment(ms.primaryStageReadyAt);
    if (m.isValid()) return m;
  }
  const pd = Number(pr?.primaryPlantReadyDays ?? batchPrimaryDays ?? 0);
  if (pi?.primaryInwardDate && pd > 0) {
    const m = moment(pi.primaryInwardDate).startOf("day").add(pd, "days");
    if (m.isValid()) return m;
  }
  if (pr?.hasAnchor && pr.anchorSowingDate && Number(pr.primaryPlantReadyDays ?? 0) >= 0) {
    const a = moment(pr.anchorSowingDate, "DD-MM-YYYY", true);
    if (a.isValid()) {
      const m = a.clone().add(Number(pr.primaryPlantReadyDays) || 0, "days");
      if (m.isValid()) return m;
    }
  }
  return null;
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

/** Tray equivalents from plants moved vs left (same cavity as inward line). */
const inwardTraysTransferredAndRemaining = (pi) => {
  const c = safeTrunc(pi.cavity);
  const totalTrays = safeTrunc(pi.numberOfTrays);
  if (c < 1) {
    return { transferredTrays: 0, remainingTrays: totalTrays, totalTrays };
  }
  const totalP = safeTrunc(pi.totalQuantity);
  const availP = safeTrunc(pi.availableQuantity ?? pi.totalQuantity);
  const goneP = Math.max(0, totalP - availP);
  return {
    transferredTrays: Math.floor(goneP / c),
    remainingTrays: Math.floor(availP / c),
    totalTrays,
  };
};

const availPlantsPrimaryOutward = (po) =>
  safeTrunc(po.availableQuantity ?? po.totalQuantity);

const inwardKey = (batchId, id) => `${batchId}:${id}`;
const outwardKey = (batchId, id) => `${batchId}:${id}`;
const homeLabKey = (batchId, labEntryId) => `${String(batchId)}:${String(labEntryId)}`;

/** Match primary inward → outward via transfer history (same day + quantity). */
const resolveSourcePrimaryInwardForOutward = (batchDoc, outward) => {
  if (!batchDoc || !outward) return null;
  const inwardList = batchDoc.primaryInward || [];
  const outDay = moment(outward.primaryOutwardDate).startOf("day");
  const qty = safeTrunc(outward.totalQuantity);
  for (const pi of inwardList) {
    for (const t of pi.transferHistory || []) {
      if (!t?.transferDate) continue;
      if (!moment(t.transferDate).startOf("day").isSame(outDay)) continue;
      if (safeTrunc(t.quantityTransferred) === qty) return pi;
    }
  }
  return null;
};

/** Secondary inward row linked to this primary outward (when API persists sourcePrimaryOutwardId). */
const findSecondaryInwardForPrimaryOutward = (batchDoc, outwardId) => {
  if (!batchDoc?.secondaryInward?.length) return null;
  const id = String(outwardId);
  const hit = batchDoc.secondaryInward.find(
    (si) => si.sourcePrimaryOutwardId && String(si.sourcePrimaryOutwardId) === id
  );
  return hit || null;
};

/** Accepted lab stock → tray count: allow up to +10% plant-equivalent vs nominal plants÷cavity */
const INWARD_TRAY_STOCK_TOLERANCE = 0.1;

/** Home cards: R1 / R2 / R3 chip accent */
const homeLabSizeChipColor = (size) => {
  const s = String(size ?? "").trim().toUpperCase();
  if (s === "R1") return "secondary";
  if (s === "R2") return "warning";
  if (s === "R3") return "info";
  return "primary";
};

const formatLabOutDateShort = (raw) =>
  raw && moment(raw).isValid() ? moment(raw).format("DD MMM YYYY") : "—";

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

  /** Tray confirm dialog — first name + भाऊ (live from profile) */
  const trayConfirmUserBhau = useMemo(() => {
    const u = userData;
    if (!u) return "";
    const raw =
      (typeof u.name === "string" && u.name.trim()) ||
      (typeof u.firstName === "string" && u.firstName.trim()) ||
      "";
    if (!raw) return "";
    const first = raw.split(/\s+/)[0];
    return first || raw;
  }, [userData]);

  const [tab, setTab] = useState(0);
  /** Empty string = all batches (Home list filter + Inward API filter) */
  const [batchFilterId, setBatchFilterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [batches, setBatches] = useState([]);
  /** CMS polly houses + shades; { value, label, group } for select */
  const [locationOptions, setLocationOptions] = useState([]);
  /** CMS trays (cavity) from GET /tray/all */
  const [trayOptions, setTrayOptions] = useState([]);
  const [inwardOpen, setInwardOpen] = useState(false);
  /** Selected accepted lab line on Home / Accepted tab → opens pre-filled inward */
  const [selectedHomeLabKey, setSelectedHomeLabKey] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  /** Confirm accept pending lab line — Marathi summary + bottles/plants */
  const [acceptConfirmOpen, setAcceptConfirmOpen] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState(null);
  /** Lab → inward save — Marathi tray check before POST */
  const [inwardSaveConfirmOpen, setInwardSaveConfirmOpen] = useState(false);

  const [inwardForm, setInwardForm] = useState({
    batchId: "",
    labEntryId: "",
    primaryInwardDate: moment().format("YYYY-MM-DD"),
    numberOfBottles: "",
    size: "R1",
    cavity: "",
    numberOfTrays: "",
    selectedTrayId: "",
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
    qualityOfDispatch: "Very Good",
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

  /** Inward tab: paginated primary inward lines + transfer-stage filter */
  const INWARD_LINE_FILTERS = ["all", "remaining", "partial", "complete"];
  const [inwardListFilter, setInwardListFilter] = useState("all");
  const [inwardLines, setInwardLines] = useState([]);
  const [inwardPage, setInwardPage] = useState(1);
  const inwardPageRef = useRef(1);
  const [inwardHasMore, setInwardHasMore] = useState(false);
  const [inwardTotal, setInwardTotal] = useState(0);
  const [inwardListLoading, setInwardListLoading] = useState(false);
  const [inwardMoreLoading, setInwardMoreLoading] = useState(false);
  const inwardScrollSentinelRef = useRef(null);
  const inwardLoadLockRef = useRef(false);

  /** Same shape as old flatMap from batches — now loaded page-by-page */
  const primaryInwardRows = inwardLines;

  useEffect(() => {
    inwardPageRef.current = inwardPage;
  }, [inwardPage]);

  /** Ticks every second on Inward tab + Lab→inward dialog for live plant-ready / blink */
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (tab !== 1 && !inwardOpen) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab, inwardOpen]);

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
    const parseTrayList = (res) => {
      const body = res.data;
      const inner = body?.data;
      const list = inner?.data;
      return Array.isArray(list) ? list : [];
    };
    try {
      const pollyInst = NetworkManager(API.POLLY_HOUSE.GET_HOUSES);
      const shadeInst = NetworkManager(API.SHADE.GET_SHADES);
      const trayInst = NetworkManager(API.TRAY.GET_TRAYS);
      const [pollyRes, shadeRes, trayRes] = await Promise.all([
        pollyInst.request({}, { page: 1, limit: 500, status: "true" }),
        shadeInst.request({}, { page: 1, limit: 500, status: "true" }),
        trayInst.request({}, { page: 1, limit: 500, status: "true", sortKey: "name", sortOrder: "asc" }),
      ]);
      const pollyList = parsePaged(pollyRes);
      const shadeList = parsePaged(shadeRes);
      const traysRaw = parseTrayList(trayRes).filter((t) => t?.isActive !== false);
      setTrayOptions(traysRaw);

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
      setTrayOptions([]);
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

  const loadPrimaryInwardLines = useCallback(
    async ({ page, reset }) => {
      const f = INWARD_LINE_FILTERS.includes(inwardListFilter) ? inwardListFilter : "all";
      if (reset) {
        setInwardListLoading(true);
        inwardLoadLockRef.current = true;
      } else {
        setInwardMoreLoading(true);
        inwardLoadLockRef.current = true;
      }
      try {
        const inst = NetworkManager(API.PLANT_OUTWARD.PRIMARY_INWARD_LINES);
        const res = await inst.request(
          {},
          {
            filter: f,
            page,
            limit: 20,
            ...(batchFilterId ? { batchId: batchFilterId } : {}),
          }
        );
        const body = res.data;
        const bundle = body?.data;
        const rows = Array.isArray(bundle?.rows) ? bundle.rows : [];
        const hasMore = Boolean(bundle?.hasMore);
        const total = Number(bundle?.total) || 0;
        if (reset) {
          setInwardLines(rows);
        } else {
          setInwardLines((prev) => [...prev, ...rows]);
        }
        setInwardPage(page);
        inwardPageRef.current = page;
        setInwardHasMore(hasMore);
        setInwardTotal(total);
      } catch (e) {
        console.error(e);
        Toast.error(e?.message || "Failed to load primary inward lines");
      } finally {
        setInwardListLoading(false);
        setInwardMoreLoading(false);
        inwardLoadLockRef.current = false;
      }
    },
    [inwardListFilter, batchFilterId]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadDashboard(), loadBatches(), loadLocationOptions()]);
    setLoading(false);
    if (tab === 1) {
      setInwardPage(1);
      inwardPageRef.current = 1;
      loadPrimaryInwardLines({ page: 1, reset: true });
    }
  }, [loadDashboard, loadBatches, loadLocationOptions, tab, loadPrimaryInwardLines]);

  useEffect(() => {
    if (tab !== 1 || !hasAccess) return undefined;
    setInwardPage(1);
    inwardPageRef.current = 1;
    loadPrimaryInwardLines({ page: 1, reset: true });
    return undefined;
  }, [tab, inwardListFilter, batchFilterId, hasAccess, loadPrimaryInwardLines]);

  useEffect(() => {
    setSelectedInwardKeys(new Set());
  }, [inwardListFilter]);

  useEffect(() => {
    setSelectedInwardKeys(new Set());
    setSelectedHomeLabKey("");
  }, [batchFilterId]);

  useEffect(() => {
    if (tab !== 1) return undefined;
    const el = inwardScrollSentinelRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (inwardLoadLockRef.current || !inwardHasMore) return;
        const next = inwardPageRef.current + 1;
        loadPrimaryInwardLines({ page: next, reset: false });
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tab, inwardHasMore, loadPrimaryInwardLines]);

  useEffect(() => {
    if (hasAccess) refreshAll();
  }, [hasAccess, refreshAll]);

  useEffect(() => {
    setSelectedInwardKeys(new Set());
    setSelectedOutwardKeys(new Set());
  }, [tab]);

  const openAcceptConfirm = (row) => {
    const lab = row.labEntry;
    if (!lab?._id || !row.batchId) return;
    setAcceptTarget({
      batchId: row.batchId,
      labId: lab._id,
      batchNumber: row.batchNumber ?? "—",
      bottles: safeTrunc(lab.bottles),
      plants: safeTrunc(lab.plants),
      size: lab.size ?? "—",
    });
    setAcceptConfirmOpen(true);
  };

  const confirmAcceptLab = async () => {
    if (!acceptTarget?.batchId || !acceptTarget?.labId) return;
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.LAB_REVIEW);
      await inst.request(
        { action: "accept" },
        { pathParams: [acceptTarget.batchId, acceptTarget.labId] }
      );
      Toast.success("Accepted");
      setAcceptConfirmOpen(false);
      setAcceptTarget(null);
      refreshAll();
    } catch (e) {
      const detail = e?.message || "";
      Toast.error(detail ? `Accept failed: ${detail}` : "Accept failed — try again.");
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = String(rejectReason ?? "").trim();
    if (!reason) {
      Toast.error("Remark is required.");
      return;
    }
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.LAB_REVIEW);
      await inst.request(
        { action: "reject", rejectionReason: reason },
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

  const validateInwardForm = () => {
    const {
      batchId,
      labEntryId,
      cavity,
      numberOfTrays,
      pollyhouse,
    } = inwardForm;
    if (!batchId || !labEntryId || !pollyhouse) {
      return "Batch, lab line, and pollyhouse are required";
    }
    const poIn = batches.find(
      (b) => String(b.batchId?._id ?? b.batchId) === String(batchId)
    );
    const labIn = poIn?.outward?.find((l) => String(l._id) === String(labEntryId));
    const stockIn = labIn ? computeLabLineStockClient(labIn) : null;
    const cavN = Number(cavity);
    const maxTraysFromStock =
      stockIn && cavN >= 1
        ? Math.floor(
            (stockIn.plantsRemaining * (1 + INWARD_TRAY_STOCK_TOLERANCE)) / cavN
          )
        : null;
    if (
      maxTraysFromStock != null &&
      safeTrunc(numberOfTrays) > maxTraysFromStock
    ) {
      return `Trays exceed allowed limit at this cavity (max ${maxTraysFromStock} with ±${Math.round(INWARD_TRAY_STOCK_TOLERANCE * 100)}% plant tolerance).`;
    }
    return null;
  };

  const submitInwardIntent = (e) => {
    e.preventDefault();
    const err = validateInwardForm();
    if (err) {
      Toast.error(err);
      return;
    }
    setInwardSaveConfirmOpen(true);
  };

  const executeInwardSave = async () => {
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

  const confirmInwardSave = async () => {
    setInwardSaveConfirmOpen(false);
    await executeInwardSave();
  };

  const prefillInwardFromAcceptedLabRow = useCallback(
    (row) => {
      const plantsLeft = safeTrunc(row.plantsRemaining);
      const bottlesLeft = safeTrunc(row.bottlesRemaining);
      if (plantsLeft < 1 || bottlesLeft < 1) {
        Toast.error("No plants or bottles left on this lab line.");
        return false;
      }
      const cavityStr = String(DEFAULT_INWARD_CAVITY);
      const tray126 = trayOptions.find((t) => Number(t.cavity) === DEFAULT_INWARD_CAVITY);
      const traysAuto = syncInwardTraysFromLab(cavityStr, plantsLeft);
      const bid = String(row.batchId);
      const lid = String(row.labEntryId ?? row.labEntry?._id ?? "");
      if (!lid) {
        Toast.error("Missing lab line id.");
        return false;
      }
      setInwardForm((f) => ({
        ...f,
        batchId: bid,
        labEntryId: lid,
        size: row.labEntry?.size ?? f.size,
        primaryInwardDate: moment().format("YYYY-MM-DD"),
        selectedTrayId: tray126 ? String(tray126._id || tray126.id) : TRAY_CUSTOM,
        cavity: cavityStr,
        numberOfTrays: traysAuto || "1",
        numberOfBottles: String(bottlesLeft),
        pollyhouse: f.pollyhouse,
        laboursEngaged: f.laboursEngaged || "1",
        remarks: "",
      }));
      return true;
    },
    [trayOptions]
  );

  const openInwardFromHomeLab = useCallback(
    (row) => {
      const k = homeLabKey(row.batchId, row.labEntryId);
      setSelectedHomeLabKey(k);
      if (prefillInwardFromAcceptedLabRow(row)) {
        setTab(1);
        setInwardOpen(true);
      } else {
        setSelectedHomeLabKey("");
      }
    },
    [prefillInwardFromAcceptedLabRow]
  );

  const openInwardDialog = () => {
    setSelectedHomeLabKey("");
    setInwardForm((f) => ({
      ...f,
      batchId: "",
      labEntryId: "",
      primaryInwardDate: moment().format("YYYY-MM-DD"),
      selectedTrayId: "",
      cavity: "",
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
    setPrimaryOutShared((s) => ({
      ...s,
      qualityOfDispatch: QUALITY_OF_DISPATCH_OPTIONS.includes(s.qualityOfDispatch)
        ? s.qualityOfDispatch
        : "Very Good",
    }));
    const per = {};
    sel.forEach((r) => {
      const maxP = availPlantsPrimaryInward(r);
      const cav = Math.max(1, safeTrunc(r.cavity));
      const maxTr = Math.max(1, Math.floor(maxP / cav));
      const trays = Math.min(Math.max(1, safeTrunc(r.numberOfTrays) || 1), maxTr);
      const plantQty = Math.min(cav * trays, maxP);
      per[r._id] = {
        numberOfBottles: plantQty,
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
      const plantQty = Math.min(cav * trays, maxP);
      per[r._id] = {
        numberOfBottles: plantQty,
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

  const batchFilterOptions = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const po of batches) {
      const raw = po.batchId?._id ?? po.batchId;
      const id = raw != null ? String(raw) : "";
      if (!id || id === "undefined" || seen.has(id)) continue;
      seen.add(id);
      const bn =
        po.batchId && typeof po.batchId === "object" && po.batchId.batchNumber != null
          ? String(po.batchId.batchNumber).trim()
          : id.slice(-6);
      const { plant, subtype } = batchPlantSubtypeLabelFromList(batches, id);
      const variety = `${plant} · ${subtype}`;
      const label = truncateMiddle(`${bn || id} — ${variety}`, 56);
      out.push({ id, label });
    }
    out.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" })
    );
    return out;
  }, [batches]);

  const batchFilterMatch = useCallback(
    (batchId) => {
      if (!batchFilterId) return true;
      return String(batchId ?? "") === String(batchFilterId);
    },
    [batchFilterId]
  );

  const pendingListFiltered = useMemo(
    () => pendingList.filter((row) => batchFilterMatch(row.batchId)),
    [pendingList, batchFilterMatch]
  );

  const upcomingPoFiltered = useMemo(
    () => upcomingPo.filter((u) => batchFilterMatch(u.batchId)),
    [upcomingPo, batchFilterMatch]
  );

  const milestoneByBatch = useMemo(() => {
    const m = new Map();
    (milestones || []).forEach((row) => {
      const k = normBatchKey(row.batchNumber);
      if (k) m.set(k, row);
    });
    return m;
  }, [milestones]);

  const plantReadyByBatch = useMemo(
    () => dashboard?.plantReadyByBatchNumber ?? EMPTY_PLANT_READY_MAP,
    [dashboard?.plantReadyByBatchNumber]
  );

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

  const acceptedLabLinesFiltered = useMemo(
    () => acceptedLabLines.filter((row) => batchFilterMatch(row.batchId)),
    [acceptedLabLines, batchFilterMatch]
  );

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

  const selectedInwardLabOption = useMemo(() => {
    if (!inwardForm.batchId || !inwardForm.labEntryId) return null;
    return acceptedLabOptions.find(
      (o) =>
        String(o.batchId) === String(inwardForm.batchId) &&
        String(o.lab._id) === String(inwardForm.labEntryId)
    );
  }, [acceptedLabOptions, inwardForm.batchId, inwardForm.labEntryId]);

  const inwardSelectedVariety = useMemo(
    () =>
      inwardForm.batchId
        ? batchPlantSubtypeLabelFromList(batches, inwardForm.batchId)
        : { plant: "—", subtype: "—" },
    [batches, inwardForm.batchId]
  );

  const inwardConfirmBatchNumber = useMemo(() => {
    if (!inwardForm.batchId) return "—";
    const po = batches.find(
      (b) => String(b.batchId?._id ?? b.batchId) === String(inwardForm.batchId)
    );
    return po?.batchId?.batchNumber != null
      ? String(po.batchId.batchNumber).trim()
      : "—";
  }, [batches, inwardForm.batchId]);

  const rejectTargetVariety = useMemo(
    () =>
      rejectTarget?.batchId != null
        ? batchPlantSubtypeLabelFromList(batches, rejectTarget.batchId)
        : { plant: "—", subtype: "—" },
    [batches, rejectTarget]
  );

  const inwardPlantsPreview = useMemo(() => {
    const c = safeTrunc(inwardForm.cavity);
    const t = safeTrunc(inwardForm.numberOfTrays);
    if (c < 1 || t < 1) return null;
    return c * t;
  }, [inwardForm.cavity, inwardForm.numberOfTrays]);

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

  const inwardBatchPrimaryDays = useMemo(() => {
    if (!inwardForm.batchId) return 0;
    const po = batches.find(
      (b) => String(b.batchId?._id ?? b.batchId) === String(inwardForm.batchId)
    );
    if (po?.batchId && typeof po.batchId === "object") {
      return Number(po.batchId.primaryPlantReadyDays) || 0;
    }
    return 0;
  }, [batches, inwardForm.batchId]);

  /** Expected primary plant-ready for preview (uses inward date + batch/sowing map). */
  const inwardFormExpectedReadyMoment = useMemo(() => {
    if (!inwardForm.batchId || !inwardForm.primaryInwardDate) return null;
    const pr = inwardDialogPlantReady;
    const inwardDay = moment(inwardForm.primaryInwardDate, "YYYY-MM-DD", true);
    if (!inwardDay.isValid()) return null;
    if (pr?.primaryStageReadyAt) {
      const m = moment(pr.primaryStageReadyAt);
      if (m.isValid()) return m;
    }
    const pd = Number(pr?.primaryPlantReadyDays ?? inwardBatchPrimaryDays ?? 0);
    if (pd > 0) return inwardDay.clone().startOf("day").add(pd, "days");
    return null;
  }, [
    inwardForm.batchId,
    inwardForm.primaryInwardDate,
    inwardDialogPlantReady,
    inwardBatchPrimaryDays,
  ]);

  const inwardFormReadyDayDiff =
    inwardFormExpectedReadyMoment?.isValid()
      ? inwardFormExpectedReadyMoment
          .clone()
          .startOf("day")
          .diff(moment(nowTick).startOf("day"), "days")
      : null;
  const inwardFormReadyIsDue =
    inwardFormReadyDayDiff !== null && inwardFormReadyDayDiff <= 0;

  /** Nominal max trays = floor(plants ÷ cavity) — typical full trays */
  const inwardNominalMaxTraysFromLab = useMemo(() => {
    if (!selectedInwardLabOption) return null;
    const cav = safeTrunc(inwardForm.cavity);
    const plantsLeft = selectedInwardLabOption.stock.plantsRemaining;
    if (cav < 1 || plantsLeft < 1) return null;
    return Math.floor(plantsLeft / cav);
  }, [selectedInwardLabOption, inwardForm.cavity]);

  /** Max trays allowed including ±10% plant headroom on stock */
  const inwardMaxTraysFromLab = useMemo(() => {
    if (!selectedInwardLabOption) return null;
    const cav = safeTrunc(inwardForm.cavity);
    const plantsLeft = selectedInwardLabOption.stock.plantsRemaining;
    if (cav < 1 || plantsLeft < 1) return null;
    return Math.floor(
      (plantsLeft * (1 + INWARD_TRAY_STOCK_TOLERANCE)) / cav
    );
  }, [selectedInwardLabOption, inwardForm.cavity]);

  /** Trays still “available” on the lab line after this entry (nominal max − entered). */
  const inwardRemainingTraysAfterEntry = useMemo(() => {
    if (inwardNominalMaxTraysFromLab == null) return null;
    const entered = safeTrunc(inwardForm.numberOfTrays);
    if (entered < 1) return inwardNominalMaxTraysFromLab;
    return inwardNominalMaxTraysFromLab - entered;
  }, [inwardNominalMaxTraysFromLab, inwardForm.numberOfTrays]);

  const inwardTraysOverBooked =
    inwardMaxTraysFromLab != null &&
    safeTrunc(inwardForm.numberOfTrays) > inwardMaxTraysFromLab;

  const compactField = { size: "small", margin: "dense", fullWidth: true };

  /** Primary outward: days taken = calendar days from sowing (anchor) → primary outward date; else inward→outward */
  useEffect(() => {
    if (!primaryOutDialogOpen) return;
    const sel = primaryInwardRows.filter((r) =>
      selectedInwardKeys.has(inwardKey(String(r._batchId), String(r._id)))
    );
    if (sel.length === 0) return;
    const outM = moment(primaryOutShared.primaryOutwardDate, "YYYY-MM-DD", true);
    if (!outM.isValid()) return;
    const outDay = outM.clone().startOf("day");

    let anchorDay = null;
    sel.forEach((r) => {
      const pr = resolvePlantReady(
        plantReadyByBatch,
        plantReadyByBatchIdMap,
        r.batchNumber,
        r._batchId
      );
      if (pr?.hasAnchor && pr.anchorSowingDate) {
        const m = moment(pr.anchorSowingDate, "DD-MM-YYYY", true);
        if (m.isValid()) {
          const d0 = m.clone().startOf("day");
          if (anchorDay == null || d0.isBefore(anchorDay)) anchorDay = d0;
        }
      }
    });

    let startDay = anchorDay;
    if (startDay == null) {
      sel.forEach((r) => {
        const m = moment(r.primaryInwardDate).startOf("day");
        if (!m.isValid()) return;
        if (startDay == null || m.isBefore(startDay)) startDay = m;
      });
    }
    if (startDay == null) return;

    const d = outDay.diff(startDay, "days");
    const val = String(Math.max(0, d));
    setPrimaryOutShared((s) =>
      s.numberOfDaysTaken === val ? s : { ...s, numberOfDaysTaken: val }
    );
  }, [
    primaryOutDialogOpen,
    primaryOutShared.primaryOutwardDate,
    selectedInwardKeys,
    primaryInwardRows,
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

  const acceptTargetPlantMeta = acceptTarget
    ? batchPlantSubtypeLabelFromList(batches, acceptTarget.batchId)
    : { plant: "—", subtype: "—" };

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
        {(tab === 0 || tab === 1 || tab === 3) && (
          <TextField
            select
            size="small"
            fullWidth
            label="Batch filter"
            value={batchFilterId}
            onChange={(e) => setBatchFilterId(e.target.value)}
            sx={{ mb: 1.5 }}
          >
            <MenuItem value="">
              <em>All batches</em>
            </MenuItem>
            {batchFilterOptions.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {tab === 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, px: 0.5 }}>
              Incoming — accept lab lines
            </Typography>
            {pendingListFiltered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
                {batchFilterId
                  ? "No pending lab lines for this batch."
                  : "No pending lab entries."}
              </Typography>
            )}
            {pendingListFiltered.map((row) => {
              const { plant: rowPlant, subtype: rowSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                row.batchId
              );
              return (
              <Card
                key={`${row.batchId}-${row.labEntry?._id}`}
                sx={{
                  mb: 1,
                  borderRadius: 1.5,
                  overflow: "hidden",
                  border: 1,
                  borderColor: "divider",
                  boxShadow: (t) => `0 1px 8px ${alpha(t.palette.primary.main, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.85,
                    background: (t) =>
                      `linear-gradient(115deg, ${alpha(t.palette.primary.main, 0.16)} 0%, ${alpha(t.palette.secondary.main, 0.06)} 48%, ${alpha(t.palette.primary.light, 0.04)} 100%)`,
                    borderBottom: "2px solid",
                    borderColor: (t) => alpha(t.palette.primary.main, 0.22),
                    boxShadow: (t) => `inset 0 -1px 0 ${alpha(t.palette.common.black, 0.04)}`,
                  }}
                >
                  <Stack spacing={0.65}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "1.08rem",
                            fontWeight: 900,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.15,
                            color: "primary.dark",
                          }}
                        >
                          {row.batchNumber}
                        </Typography>
                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ mt: 0.45 }}>
                          <Chip
                            size="small"
                            label={String(row.labEntry?.size ?? "—").trim() || "—"}
                            color={homeLabSizeChipColor(row.labEntry?.size)}
                            sx={{ fontWeight: 800, letterSpacing: "0.04em" }}
                          />
                          <Chip size="small" variant="outlined" label="Awaiting review" color="warning" />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={rowPlant}
                            sx={{ fontWeight: 700, maxWidth: 140, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            color="primary"
                            label={rowSubtype}
                            sx={{ fontWeight: 600, maxWidth: 140, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                          />
                        </Stack>
                      </Box>
                      <Box
                        sx={{
                          textAlign: "right",
                          flexShrink: 0,
                          px: 0.85,
                          py: 0.4,
                          borderRadius: 1.25,
                          border: "1px solid",
                          borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                          boxShadow: (t) => `0 2px 8px ${alpha(t.palette.primary.main, 0.12)}`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            color: "text.secondary",
                            letterSpacing: 0.04,
                          }}
                        >
                          लॅब आउट
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.92rem",
                            fontWeight: 900,
                            color: "primary.dark",
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1.2,
                          }}
                        >
                          {formatLabOutDateShort(row.labEntry?.outwardDate)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
                <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                  <Box
                    sx={{
                      mb: 0.75,
                      borderRadius: 1.5,
                      overflow: "hidden",
                      border: 1,
                      borderColor: (t) => alpha(t.palette.primary.main, 0.18),
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? alpha(t.palette.grey[900], 0.4)
                          : alpha(t.palette.grey[50], 0.95),
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        borderBottom: 1,
                        borderColor: "divider",
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                      }}
                    >
                      {["Size", "बॉटल्स", "रोपे"].map((lab, i) => (
                        <Typography
                          key={lab}
                          variant="caption"
                          sx={{
                            py: 0.35,
                            px: 0.35,
                            textAlign: "center",
                            fontWeight: 700,
                            letterSpacing: 0.2,
                            textTransform: "none",
                            fontSize: "0.68rem",
                            color: "text.secondary",
                            borderLeft: i > 0 ? 1 : 0,
                            borderColor: "divider",
                          }}
                        >
                          {lab}
                        </Typography>
                      ))}
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        alignItems: "center",
                        minHeight: 42,
                      }}
                    >
                      <Typography
                        sx={{
                          py: 0.5,
                          px: 0.35,
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "1.15rem",
                          color: "primary.main",
                          fontVariantNumeric: "tabular-nums",
                          borderRight: 1,
                          borderColor: "divider",
                          borderStyle: "solid",
                        }}
                      >
                        {row.labEntry?.size ?? "—"}
                      </Typography>
                      <Typography
                        sx={{
                          py: 0.5,
                          px: 0.35,
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "1.15rem",
                          color: "primary.dark",
                          fontVariantNumeric: "tabular-nums",
                          borderRight: 1,
                          borderColor: "divider",
                          borderStyle: "solid",
                        }}
                      >
                        {safeTrunc(row.labEntry?.bottles).toLocaleString("en-IN")}
                      </Typography>
                      <Typography
                        sx={{
                          py: 0.5,
                          px: 0.35,
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: "1.15rem",
                          color: "success.dark",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {safeTrunc(row.labEntry?.plants).toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.75,
                      width: "100%",
                      mt: 0.25,
                    }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CheckCircle />}
                      onClick={() => openAcceptConfirm(row)}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setRejectReason("");
                        setRejectTarget({
                          batchId: row.batchId,
                          labId: row.labEntry?._id,
                          batchNumber: row.batchNumber,
                        });
                        setRejectOpen(true);
                      }}
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      Reject
                    </Button>
                  </Box>
                </CardContent>
              </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, px: 0.5 }}>
              Accepted lab lines — शिल्लक (remaining only)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, px: 0.5, display: "block" }}>
              Tap a line to select → opens <strong>Inward</strong> with <strong>Lab → primary inward</strong> prefilled.
            </Typography>
            {acceptedLabLinesFiltered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
                {batchFilterId
                  ? "No accepted lab lines for this batch."
                  : "No accepted lab lines yet (accept pending entries above)."}
              </Typography>
            )}
            {acceptedLabLinesFiltered.map((row) => {
              const rowKey = homeLabKey(row.batchId, row.labEntryId);
              const hasStock = safeTrunc(row.bottlesRemaining) > 0 && safeTrunc(row.plantsRemaining) > 0;
              const sel = selectedHomeLabKey === rowKey;
              const { plant: accPlant, subtype: accSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                row.batchId
              );
              return (
                <Card
                  key={rowKey}
                  role="button"
                  tabIndex={hasStock ? 0 : -1}
                  onClick={() => hasStock && openInwardFromHomeLab(row)}
                  onKeyDown={(e) => {
                    if (!hasStock) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openInwardFromHomeLab(row);
                    }
                  }}
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    cursor: hasStock ? "pointer" : "default",
                    border: "2px solid",
                    borderColor: sel ? "primary.main" : "divider",
                    bgcolor: sel ? alpha(theme.palette.primary.main, 0.06) : "background.paper",
                    boxShadow: sel
                      ? (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.18)}`
                      : "none",
                    opacity: hasStock ? 1 : 0.72,
                    transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
                    ...(hasStock && {
                      "&:hover": {
                        borderColor: "primary.light",
                        boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.12)}`,
                      },
                    }),
                  }}
                >
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.85,
                      background: (t) =>
                        `linear-gradient(115deg, ${alpha(t.palette.success.main, 0.14)} 0%, ${alpha(t.palette.primary.main, 0.11)} 52%, ${alpha(t.palette.info.main, 0.08)} 100%)`,
                      borderBottom: "2px solid",
                      borderColor: (t) =>
                        sel ? alpha(t.palette.primary.main, 0.42) : alpha(t.palette.primary.main, 0.2),
                      boxShadow: (t) => `inset 0 1px 0 ${alpha(t.palette.common.white, 0.35)}`,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: "1.06rem",
                            fontWeight: 900,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.15,
                            color: "primary.dark",
                          }}
                        >
                          {row.batchNumber}
                        </Typography>
                        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ mt: 0.45 }}>
                          <Chip
                            size="small"
                            label={String(row.labEntry?.size ?? "—").trim() || "—"}
                            color={homeLabSizeChipColor(row.labEntry?.size)}
                            sx={{ fontWeight: 800, letterSpacing: "0.04em" }}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={hasStock ? "शिल्लक उपलब्ध" : "शिल्लक संपले"}
                            color={hasStock ? "success" : "default"}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={accPlant}
                            sx={{ fontWeight: 700, maxWidth: 140, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            color="primary"
                            label={accSubtype}
                            sx={{ fontWeight: 600, maxWidth: 140, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                          />
                        </Stack>
                      </Box>
                      <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                        <Box
                          sx={{
                            textAlign: "right",
                            flexShrink: 0,
                            px: 0.85,
                            py: 0.4,
                            borderRadius: 1.25,
                            border: "1px solid",
                            borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                            boxShadow: (t) => `0 2px 8px ${alpha(t.palette.primary.main, 0.1)}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontSize: "0.62rem",
                              fontWeight: 800,
                              color: "text.secondary",
                              letterSpacing: 0.04,
                            }}
                          >
                            लॅब आउट
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.92rem",
                              fontWeight: 900,
                              color: "primary.dark",
                              fontVariantNumeric: "tabular-nums",
                              lineHeight: 1.2,
                            }}
                          >
                            {formatLabOutDateShort(row.labEntry?.outwardDate)}
                          </Typography>
                        </Box>
                        {sel && (
                          <Chip size="small" color="primary" label="Selected" sx={{ flexShrink: 0, mt: 0.15 }} />
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                  <CardContent sx={{ py: 1.35, px: 1.15, "&:last-child": { pb: 1.35 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.65,
                        alignItems: "stretch",
                        mb: 0,
                      }}
                    >
                      <Box
                        sx={{
                          flex: "1 1 156px",
                          minWidth: 0,
                          px: 1,
                          py: 0.75,
                          borderRadius: 1.25,
                          bgcolor: (t) =>
                            row.bottlesRemaining > 0
                              ? alpha(t.palette.success.main, 0.2)
                              : alpha(t.palette.grey[500], 0.1),
                          border: "2px solid",
                          borderColor: (t) =>
                            row.bottlesRemaining > 0
                              ? alpha(t.palette.success.main, 0.55)
                              : "divider",
                          boxShadow: (t) =>
                            row.bottlesRemaining > 0
                              ? `0 0 0 4px ${alpha(t.palette.success.main, 0.1)}`
                              : "none",
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={0.75}
                          sx={{ mb: 0.5 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.75rem",
                              letterSpacing: 0.02,
                              color: "text.secondary",
                            }}
                          >
                            बॉटल · शिल्लक
                          </Typography>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 36,
                              px: 0.75,
                              py: 0.3,
                              borderRadius: 999,
                              bgcolor: (t) =>
                                row.bottlesRemaining > 0
                                  ? t.palette.success.main
                                  : alpha(t.palette.grey[500], 0.25),
                              color: (t) =>
                                row.bottlesRemaining > 0
                                  ? t.palette.success.contrastText
                                  : "text.secondary",
                              boxShadow: (t) =>
                                row.bottlesRemaining > 0
                                  ? `0 1px 0 ${alpha(t.palette.common.black, 0.12)}`
                                  : "none",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.78rem",
                                fontWeight: 900,
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1,
                              }}
                            >
                              {safeTrunc(row.bottlesRemaining).toLocaleString("en-IN")}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                      <Box
                        sx={{
                          flex: "1 1 156px",
                          minWidth: 0,
                          px: 1,
                          py: 0.75,
                          borderRadius: 1.25,
                          bgcolor: (t) =>
                            row.plantsRemaining > 0
                              ? alpha(t.palette.info.main, 0.16)
                              : alpha(t.palette.grey[500], 0.1),
                          border: "2px solid",
                          borderColor: (t) =>
                            row.plantsRemaining > 0
                              ? alpha(t.palette.info.main, 0.5)
                              : "divider",
                          boxShadow: (t) =>
                            row.plantsRemaining > 0
                              ? `0 0 0 4px ${alpha(t.palette.info.main, 0.12)}`
                              : "none",
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={0.75}
                          sx={{ mb: 0.5 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.75rem",
                              letterSpacing: 0.02,
                              color: "text.secondary",
                            }}
                          >
                            रोपे · शिल्लक
                          </Typography>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 36,
                              px: 0.75,
                              py: 0.3,
                              borderRadius: 999,
                              bgcolor: (t) =>
                                row.plantsRemaining > 0
                                  ? t.palette.info.main
                                  : alpha(t.palette.grey[500], 0.25),
                              color: (t) =>
                                row.plantsRemaining > 0
                                  ? t.palette.info.contrastText
                                  : "text.secondary",
                              boxShadow: (t) =>
                                row.plantsRemaining > 0
                                  ? `0 1px 0 ${alpha(t.palette.common.black, 0.12)}`
                                  : "none",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.78rem",
                                fontWeight: 900,
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1,
                              }}
                            >
                              {safeTrunc(row.plantsRemaining).toLocaleString("en-IN")}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, px: 0.5, display: "block" }}>
              Sowing-based plant-ready targets and days remaining are on the <strong>Inward</strong> tab (each
              primary inward line and in <strong>Lab → primary inward</strong> when you pick a lab line).
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Upcoming primary outward (expected)
            </Typography>
            {upcomingPoFiltered.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {batchFilterId ? "None in window for this batch." : "None in window."}
              </Typography>
            )}
            {upcomingPoFiltered.map((u) => {
              const uPi = u.primaryInward;
              const poBatch = batches.find(
                (b) => String(b.batchId?._id ?? b.batchId) === String(u.batchId)
              );
              const { plant: upPlant, subtype: upSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                u.batchId
              );
              const srcLabUp =
                uPi?.sourceLabId && poBatch?.outward?.length
                  ? poBatch.outward.find((l) => String(l._id) === String(uPi.sourceLabId))
                  : null;
              const labStockUp = srcLabUp ? computeLabLineStockClient(srcLabUp) : null;
              return (
                <Card key={u.primaryInward._id} sx={{ mb: 1, borderRadius: 2 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {u.batchNumber}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                      <Chip size="small" variant="outlined" label={upPlant} sx={{ fontWeight: 700 }} />
                      <Chip size="small" variant="outlined" color="primary" label={upSubtype} />
                    </Stack>
                    <Typography variant="caption" display="block">
                      {moment(u.expectedDate).format("DD MMM YYYY")} · Qty{" "}
                      {u.primaryInward?.totalQuantity}
                    </Typography>
                    {labStockUp != null && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Lab bottles left · {labStockUp.bottlesRemaining}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {tab === 1 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", px: 0.5 }}>
              Tap lines to select · then → to record <strong>primary outward</strong>
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, px: 0.5 }}>
              Primary inward (
              {inwardTotal > 0
                ? primaryInwardRows.length >= inwardTotal
                  ? inwardTotal.toLocaleString("en-IN")
                  : `${primaryInwardRows.length.toLocaleString("en-IN")} / ${inwardTotal.toLocaleString("en-IN")}`
                : inwardListLoading
                  ? "…"
                  : primaryInwardRows.length.toLocaleString("en-IN")}
              )
            </Typography>
            <Tabs
              value={inwardListFilter}
              onChange={(_, v) => setInwardListFilter(v)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 40,
                mb: 1,
                px: 0.25,
                "& .MuiTab-root": {
                  minHeight: 40,
                  py: 0.5,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  textTransform: "none",
                },
              }}
            >
              <Tab label="All" value="all" />
              <Tab label="Remaining" value="remaining" />
              <Tab label="Partial" value="partial" />
              <Tab label="Done" value="complete" />
            </Tabs>
            {inwardListLoading && primaryInwardRows.length === 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={36} />
              </Box>
            )}
            {!inwardListLoading && primaryInwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ px: 0.5 }}>
                {batchFilterId
                  ? "No primary inward lines for this batch (try All batches or another filter)."
                  : "No lines for this filter."}
              </Typography>
            )}
            {primaryInwardRows.map((pi, idx) => {
              const pr = resolvePlantReady(
                plantReadyByBatch,
                plantReadyByBatchIdMap,
                pi.batchNumber,
                pi._batchId
              );
              const batchDoc = batches.find(
                (b) => String(b.batchId?._id ?? b.batchId) === String(pi._batchId)
              );
              const { plant: piPlant, subtype: piSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                pi._batchId
              );
              const batchPrimaryDays =
                batchDoc?.batchId != null && typeof batchDoc.batchId === "object"
                  ? Number(batchDoc.batchId.primaryPlantReadyDays) || 0
                  : 0;
              const ms = getMilestoneForBatch(milestoneByBatch, pi.batchNumber);
              const plantReadyMoment = resolveInwardPlantReadyMoment(
                pi,
                pr,
                ms,
                batchPrimaryDays
              );
              const readyDayDiff =
                plantReadyMoment?.isValid()
                  ? plantReadyMoment
                      .clone()
                      .startOf("day")
                      .diff(moment(nowTick).startOf("day"), "days")
                  : null;
              const avail = availPlantsPrimaryInward(pi);
              const traySplit = inwardTraysTransferredAndRemaining(pi);
              const sel = selectedInwardKeys.has(inwardKey(String(pi._batchId), String(pi._id)));
              const canSel =
                avail > 0 && (pi.transferStatus ?? "available") !== "fully_transferred";
              const bn =
                normBatchKey(pi.batchNumber) || pr?.batchNumber || String(pi._batchId);
              const transferTag = String(pi.transferStatus ?? "available").replace(/_/g, " ");
              const isDueOrPassed = readyDayDiff != null && readyDayDiff <= 0;
              const isSoon = readyDayDiff != null && readyDayDiff > 0 && readyDayDiff <= 5;
              const remarkShort =
                pi.remarks && String(pi.remarks).trim()
                  ? String(pi.remarks).trim().slice(0, 80) +
                    (String(pi.remarks).trim().length > 80 ? "…" : "")
                  : "";
              const enterDelay = `${Math.min(idx, 18) * 0.045}s`;
              /** Inward 3-col metric tiles: shared rhythm — label · hero number · footnote */
              const statCellSx = {
                p: 1,
                borderRadius: 2,
                minWidth: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 0.5,
                transition: "box-shadow 0.2s ease",
                boxShadow: (t) => `0 1px 3px ${alpha(t.palette.common.black, 0.06)}`,
              };
              return (
                <Card
                  key={`${pi._batchId}-${pi._id}`}
                  onClick={() => canSel && toggleInwardSel(pi._batchId, pi._id)}
                  sx={{
                    mb: 1.25,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "2px solid",
                    borderColor: sel
                      ? "primary.main"
                      : isDueOrPassed
                        ? alpha(theme.palette.error.main, 0.45)
                        : isSoon
                          ? alpha(theme.palette.warning.main, 0.5)
                          : "divider",
                    bgcolor: sel ? alpha(theme.palette.primary.main, 0.08) : "background.paper",
                    backgroundImage: (t) =>
                      sel
                        ? `linear-gradient(145deg, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 55%)`
                        : "none",
                    boxShadow: sel
                      ? `0 10px 28px ${alpha(theme.palette.primary.main, 0.2)}`
                      : `0 4px 16px ${alpha(theme.palette.common.black, 0.07)}`,
                    cursor: canSel ? "pointer" : "default",
                    opacity: 0,
                    transform: "translateY(12px)",
                    animation: `inwardCardEnter 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${enterDelay} forwards`,
                    "@keyframes inwardCardEnter": {
                      to: { opacity: 1, transform: "translateY(0)" },
                    },
                    transition:
                      "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.2s ease",
                    ...(canSel && {
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: `0 14px 32px ${alpha(theme.palette.primary.main, 0.16)}`,
                      },
                    }),
                  }}
                >
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.85,
                      background: (t) =>
                        `linear-gradient(108deg, ${alpha(t.palette.primary.main, 0.18)} 0%, ${alpha(t.palette.primary.light, 0.08)} 45%, ${alpha(t.palette.secondary.main, 0.05)} 100%)`,
                      borderBottom: "2px solid",
                      borderColor: (t) => alpha(t.palette.primary.main, 0.2),
                    }}
                  >
                    <Stack spacing={0.9}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        columnGap={1}
                        rowGap={0.5}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            fontWeight={900}
                            sx={{
                              fontSize: "1.12rem",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.15,
                              color: "primary.dark",
                            }}
                          >
                            {bn}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={moment(pi.primaryInwardDate).format("DD MMM ’YY")}
                          color="primary"
                          variant="filled"
                          sx={{ fontWeight: 800, flexShrink: 0, boxShadow: 1, borderRadius: 2 }}
                        />
                      </Stack>
                      <Stack direction="row" flexWrap="wrap" gap={0.65} alignItems="center">
                        <Chip
                          size="small"
                          label={`Size ${pi.size}`}
                          variant="outlined"
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={piPlant}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            maxWidth: 130,
                            "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                          }}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          color="primary"
                          label={piSubtype}
                          sx={{
                            borderRadius: 2,
                            maxWidth: 130,
                            "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                          }}
                        />
                        <Chip
                          size="small"
                          label={`बॉटल्स ${safeTrunc(pi.numberOfBottles).toLocaleString("en-IN")}`}
                          variant="outlined"
                          color="default"
                          sx={{ borderRadius: 2 }}
                        />
                        <Chip
                          size="small"
                          label={transferTag}
                          color={
                            (pi.transferStatus ?? "") === "fully_transferred"
                              ? "default"
                              : (pi.transferStatus ?? "") === "partially_transferred"
                                ? "warning"
                                : "success"
                          }
                          variant="filled"
                          sx={{ fontWeight: 700, textTransform: "capitalize", borderRadius: 2 }}
                        />
                        <Chip
                          size="small"
                          icon={<PlantReadyIcon sx={{ fontSize: "14px !important" }} />}
                          label={pi.pollyhouse || "—"}
                          variant="outlined"
                          color="primary"
                          sx={{
                            borderRadius: 2,
                            maxWidth: "100%",
                            "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                          }}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                  <CardContent sx={{ py: 1.1, px: 1.15, "&:last-child": { pb: 1.1 } }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                      <Checkbox
                        checked={sel}
                        disabled={!canSel}
                        size="small"
                        sx={{ p: 0, mt: 0.15 }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => canSel && toggleInwardSel(pi._batchId, pi._id)}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="overline"
                          sx={{
                            display: "block",
                            fontSize: "0.72rem",
                            fontWeight: 900,
                            letterSpacing: "0.06em",
                            color: "primary.dark",
                            mb: 0.55,
                          }}
                        >
                          तयार दिवस · ट्रे · रोपे
                        </Typography>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
                            gap: 1.1,
                            alignItems: "stretch",
                            mb: 0,
                            width: "100%",
                          }}
                        >
                          {/* 1 · Plant-ready */}
                          <Box
                            sx={{
                              ...statCellSx,
                              background:
                                plantReadyMoment?.isValid() && readyDayDiff != null
                                  ? readyDayDiff > 0
                                    ? (t) =>
                                        `linear-gradient(165deg, ${alpha(t.palette.success.main, 0.18)} 0%, ${alpha(t.palette.success.light, 0.05)} 55%, ${alpha(t.palette.background.paper, 0.4)} 100%)`
                                    : readyDayDiff === 0
                                      ? (t) =>
                                          `linear-gradient(165deg, ${alpha(t.palette.warning.main, 0.22)} 0%, ${alpha(t.palette.warning.light, 0.06)} 100%)`
                                      : (t) =>
                                          `linear-gradient(165deg, ${alpha(t.palette.grey[600], 0.12)} 0%, ${alpha(t.palette.grey[400], 0.04)} 100%)`
                                  : (t) => alpha(t.palette.grey[400], 0.1),
                              border: "1px solid",
                              borderColor: (t) =>
                                plantReadyMoment?.isValid() && readyDayDiff != null
                                  ? readyDayDiff > 0
                                    ? alpha(t.palette.success.main, 0.28)
                                    : readyDayDiff === 0
                                      ? alpha(t.palette.warning.main, 0.4)
                                      : alpha(t.palette.grey[500], 0.3)
                                  : "divider",
                              ...(isDueOrPassed && plantReadyMoment?.isValid()
                                ? {
                                    animation: "inwardReadyPulse 2.4s ease-in-out infinite",
                                    "@keyframes inwardReadyPulse": {
                                      "0%, 100%": {
                                        boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0)}`,
                                      },
                                      "50%": {
                                        boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.32)}`,
                                      },
                                    },
                                  }
                                : {}),
                            }}
                          >
                            <Stack spacing={0.25}>
                              <Typography
                                variant="overline"
                                sx={{
                                  fontSize: "0.62rem",
                                  fontWeight: 800,
                                  letterSpacing: "0.08em",
                                  lineHeight: 1.2,
                                  color:
                                    plantReadyMoment?.isValid() && readyDayDiff != null
                                      ? readyDayDiff > 0
                                        ? "success.dark"
                                        : readyDayDiff === 0
                                          ? "warning.dark"
                                          : "error.dark"
                                      : "text.secondary",
                                }}
                              >
                                तयार दिवस
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.65rem",
                                  fontWeight: 700,
                                  color: "text.secondary",
                                  display: "block",
                                }}
                              >
                                उर्वरित · remaining
                              </Typography>
                            </Stack>
                            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 52 }}>
                              {plantReadyMoment?.isValid() && readyDayDiff != null && (
                                <>
                                  {readyDayDiff > 0 && (
                                    <Typography
                                      component="div"
                                      fontWeight={900}
                                      sx={{
                                        fontSize: { xs: "1.65rem", sm: "1.75rem" },
                                        lineHeight: 1.05,
                                        fontVariantNumeric: "tabular-nums",
                                        color: (t) => t.palette.success.dark,
                                        textShadow: (t) =>
                                          `0 1px 0 ${alpha(t.palette.common.white, t.palette.mode === "dark" ? 0 : 0.85)}`,
                                      }}
                                    >
                                      {readyDayDiff}
                                      <Box
                                        component="span"
                                        sx={{
                                          fontSize: "1rem",
                                          fontWeight: 800,
                                          ml: 0.4,
                                          color: "success.dark",
                                        }}
                                      >
                                        दिवस
                                      </Box>
                                    </Typography>
                                  )}
                                  {readyDayDiff === 0 && (
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                      <PlantReadyIcon sx={{ fontSize: 26, color: "warning.dark" }} />
                                      <Typography fontWeight={900} color="warning.dark" sx={{ fontSize: "1rem" }}>
                                        आज · Today
                                      </Typography>
                                    </Stack>
                                  )}
                                  {readyDayDiff < 0 && (
                                    <Typography fontWeight={900} color="error.dark" sx={{ fontSize: "1rem", lineHeight: 1.25 }}>
                                      मागे · {Math.abs(readyDayDiff)} दिवस
                                    </Typography>
                                  )}
                                </>
                              )}
                              {!plantReadyMoment?.isValid() && (
                                <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                                  —
                                </Typography>
                              )}
                            </Box>
                            {plantReadyMoment?.isValid() && (
                              <Box
                                sx={{
                                  pt: 0.75,
                                  mt: "auto",
                                  borderTop: "1px solid",
                                  borderColor: (t) =>
                                    plantReadyMoment?.isValid() && readyDayDiff != null && readyDayDiff > 0
                                      ? alpha(t.palette.success.main, 0.22)
                                      : "divider",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{ fontSize: "0.58rem", fontWeight: 700, color: "text.secondary", display: "block" }}
                                >
                                  Out date
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: "0.8rem",
                                    fontWeight: 900,
                                    fontVariantNumeric: "tabular-nums",
                                    color: "primary.dark",
                                  }}
                                >
                                  {plantReadyMoment.format("DD MMM YYYY")}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          {/* 2 · Trays */}
                          <Box
                            sx={{
                              ...statCellSx,
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                              border: "1px solid",
                              borderColor: (t) => alpha(t.palette.primary.main, 0.22),
                            }}
                          >
                            <Typography
                              variant="overline"
                              sx={{
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                color: "primary.dark",
                              }}
                            >
                              ट्रे
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700, color: "text.secondary" }}>
                              शिल्लक · left
                            </Typography>
                            <Typography
                              fontWeight={900}
                              sx={{
                                fontSize: { xs: "1.45rem", sm: "1.55rem" },
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1.05,
                                color:
                                  traySplit.remainingTrays > 0 ? "success.dark" : "text.disabled",
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                minHeight: 44,
                              }}
                            >
                              {traySplit.remainingTrays.toLocaleString("en-IN")}
                            </Typography>
                            <Box
                              sx={{
                                pt: 0.65,
                                mt: "auto",
                                borderTop: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.58rem", fontWeight: 700, color: "text.secondary", display: "block" }}
                              >
                                एकूण ट्रे · total
                              </Typography>
                              <Typography
                                fontWeight={800}
                                fontSize="0.82rem"
                                color="primary.dark"
                                sx={{ fontVariantNumeric: "tabular-nums", opacity: 0.92 }}
                              >
                                {safeTrunc(pi.numberOfTrays).toLocaleString("en-IN")}
                              </Typography>
                            </Box>
                          </Box>
                          {/* 3 · शिल्लक plants (remaining in primary) */}
                          <Box
                            sx={{
                              ...statCellSx,
                              bgcolor: (t) => alpha(t.palette.info.main, 0.08),
                              border: "1px solid",
                              borderColor: (t) => alpha(t.palette.info.main, 0.22),
                            }}
                          >
                            <Typography
                              variant="overline"
                              sx={{
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                color: "info.dark",
                              }}
                            >
                              रोपे
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700, color: "text.secondary" }}>
                              शिल्लक · left
                            </Typography>
                            <Typography
                              fontWeight={900}
                              sx={{
                                fontSize: { xs: "1.25rem", sm: "1.35rem" },
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1.1,
                                color: avail > 0 ? "info.dark" : "text.disabled",
                                wordBreak: "break-all",
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                minHeight: 44,
                              }}
                            >
                              {avail.toLocaleString("en-IN")}
                            </Typography>
                            <Box
                              sx={{
                                pt: 0.65,
                                mt: "auto",
                                borderTop: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.58rem", fontWeight: 700, color: "text.secondary", display: "block" }}
                              >
                                एकूण रोपे · total
                              </Typography>
                              <Typography
                                fontWeight={800}
                                fontSize="0.82rem"
                                color="info.dark"
                                sx={{ fontVariantNumeric: "tabular-nums", opacity: 0.92 }}
                              >
                                {safeTrunc(pi.totalQuantity).toLocaleString("en-IN")}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        {remarkShort && (
                          <Tooltip title={String(pi.remarks).trim()} placement="top" enterTouchDelay={400}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                mt: 0.5,
                                fontStyle: "italic",
                                lineHeight: 1.35,
                              }}
                            >
                              <Box component="span" fontWeight={700} color="text.primary">
                                Note:{" "}
                              </Box>
                              {remarkShort}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
            <Box ref={inwardScrollSentinelRef} sx={{ height: 8, width: "100%" }} aria-hidden />
            {inwardMoreLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            )}
          </>
        )}

        {tab === 2 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block", px: 0.5 }}>
              Primary outward entries · read-only
            </Typography>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>
              Primary outward ({primaryOutwardRows.length})
            </Typography>
            {primaryOutwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No primary outward yet — use Inward tab → → to create.
              </Typography>
            )}
            {primaryOutwardRows.map((po, idx) => {
              const batchDoc = batches.find(
                (b) => String(b.batchId?._id ?? b.batchId) === String(po._batchId)
              );
              const { plant: poPlant, subtype: poSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                po._batchId
              );
              const sourcePi = resolveSourcePrimaryInwardForOutward(batchDoc, po);
              const inwardDateStr = sourcePi?.primaryInwardDate
                ? moment(sourcePi.primaryInwardDate).format("DD MMM YYYY")
                : "—";
              const secIn = findSecondaryInwardForPrimaryOutward(batchDoc, po._id);
              const avail = availPlantsPrimaryOutward(po);
              const transferLabel = String(po.transferStatus ?? "available").replace(/_/g, " ");
              const secondaryLabel = secIn
                ? moment(secIn.secondaryInwardDate).format("DD MMM YYYY")
                : null;
              const secondaryAccepted =
                !!secIn ||
                (po.transferStatus ?? "available") === "partially_transferred" ||
                (po.transferStatus ?? "available") === "fully_transferred";
              const enterDelay = `${Math.min(idx, 18) * 0.045}s`;
              return (
                <Card
                  key={`${po._batchId}-${po._id}`}
                  sx={{
                    mb: 1.35,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: (t) => `0 4px 18px ${alpha(t.palette.common.black, 0.07)}`,
                    opacity: 0,
                    transform: "translateY(10px)",
                    animation: `outwardCardEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${enterDelay} forwards`,
                    "@keyframes outwardCardEnter": {
                      to: { opacity: 1, transform: "translateY(0)" },
                    },
                  }}
                >
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.9,
                      background: (t) =>
                        `linear-gradient(110deg, ${alpha(t.palette.secondary.main, 0.2)} 0%, ${alpha(t.palette.secondary.light, 0.06)} 55%, transparent 100%)`,
                      borderBottom: "1px solid",
                      borderColor: (t) => alpha(t.palette.secondary.main, 0.22),
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={900} sx={{ fontSize: "1.05rem", color: "secondary.dark" }}>
                          {po.batchNumber}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.6 }}>
                          <Chip size="small" label={po.size} color="secondary" variant="outlined" sx={{ fontWeight: 800 }} />
                          <Chip
                            size="small"
                            variant="outlined"
                            label={poPlant}
                            sx={{ fontWeight: 700, maxWidth: 120, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                          />
                          <Chip
                            size="small"
                            variant="outlined"
                            color="primary"
                            label={poSubtype}
                            sx={{ fontWeight: 600, maxWidth: 120, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                          />
                          <Chip
                            size="small"
                            label={po.qualityOfDispatch || "—"}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </Stack>
                      </Box>
                      <Chip
                        size="small"
                        icon={<Today sx={{ fontSize: "14px !important" }} />}
                        label={moment(po.primaryOutwardDate).format("DD MMM ’YY")}
                        color="secondary"
                        sx={{ fontWeight: 800, flexShrink: 0 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                      {po.pollyhouse}
                    </Typography>
                  </Box>
                  <CardContent sx={{ py: 1.35, px: 1.15, "&:last-child": { pb: 1.35 } }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                        mb: 1.15,
                      }}
                    >
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
                          border: "1px solid",
                          borderColor: (t) => alpha(t.palette.primary.main, 0.18),
                        }}
                      >
                        <Typography variant="overline" sx={{ fontSize: "0.58rem", fontWeight: 800, color: "text.secondary" }}>
                          Inward date
                        </Typography>
                        <Typography
                          fontWeight={900}
                          sx={{ fontSize: "0.92rem", mt: 0.35, fontVariantNumeric: "tabular-nums" }}
                        >
                          {inwardDateStr}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: (t) => alpha(t.palette.secondary.main, 0.08),
                          border: "1px solid",
                          borderColor: (t) => alpha(t.palette.secondary.main, 0.22),
                        }}
                      >
                        <Typography variant="overline" sx={{ fontSize: "0.58rem", fontWeight: 800, color: "text.secondary" }}>
                          Out date
                        </Typography>
                        <Typography
                          fontWeight={900}
                          sx={{ fontSize: "0.92rem", mt: 0.35, fontVariantNumeric: "tabular-nums" }}
                        >
                          {moment(po.primaryOutwardDate).format("DD MMM YYYY")}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
                          border: "1px solid",
                          borderColor: (t) => alpha(t.palette.warning.main, 0.25),
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <ScheduleIcon sx={{ fontSize: 18, color: "warning.dark" }} />
                          <Typography variant="overline" sx={{ fontSize: "0.58rem", fontWeight: 800, color: "warning.dark" }}>
                            Days in primary
                          </Typography>
                        </Stack>
                        <Typography
                          fontWeight={900}
                          sx={{
                            fontSize: "1.35rem",
                            mt: 0.35,
                            color: "warning.dark",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {safeTrunc(po.numberOfDaysTaken)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: (t) =>
                            secondaryAccepted
                              ? alpha(t.palette.success.main, 0.08)
                              : alpha(t.palette.grey[500], 0.06),
                          border: "1px solid",
                          borderColor: (t) =>
                            secondaryAccepted
                              ? alpha(t.palette.success.main, 0.28)
                              : "divider",
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <SecondaryIcon sx={{ fontSize: 18, color: secondaryAccepted ? "success.dark" : "text.secondary" }} />
                          <Typography variant="overline" sx={{ fontSize: "0.58rem", fontWeight: 800, color: "text.secondary" }}>
                            Secondary
                          </Typography>
                        </Stack>
                        {secIn ? (
                          <>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.35 }}>
                              <CheckCircle sx={{ fontSize: 18, color: "success.main" }} />
                              <Typography fontWeight={900} sx={{ fontSize: "0.88rem", color: "success.dark" }}>
                                Accepted
                              </Typography>
                            </Stack>
                            <Typography
                              variant="body2"
                              fontWeight={800}
                              sx={{ mt: 0.25, fontVariantNumeric: "tabular-nums" }}
                            >
                              {secondaryLabel}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography fontWeight={800} sx={{ fontSize: "0.85rem", mt: 0.35 }}>
                              {secondaryAccepted ? "Transferred · " + transferLabel : "Pending"}
                            </Typography>
                            {!secIn && secondaryAccepted && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                                No secondary inward record linked (link may be unavailable)
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                    <Divider sx={{ my: 0.75 }} />
                    <Stack spacing={0.65}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          Plants
                        </Typography>
                        <Typography variant="body2" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {avail.toLocaleString("en-IN")} left · {safeTrunc(po.totalQuantity).toLocaleString("en-IN")} total
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          Trays × cavity
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {safeTrunc(po.numberOfTrays)} × {safeTrunc(po.cavity)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          Labour
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {safeTrunc(po.laboursEngaged)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          Plantation
                        </Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {po.dateOfPlantation ? moment(po.dateOfPlantation).format("DD MMM YYYY") : "—"}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          Received
                        </Typography>
                        <Chip
                          size="small"
                          label={po.isReceived ? "Yes" : "No"}
                          color={po.isReceived ? "success" : "default"}
                          variant={po.isReceived ? "filled" : "outlined"}
                          sx={{ fontWeight: 800 }}
                        />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          Transfer
                        </Typography>
                        <Chip size="small" label={transferLabel} variant="outlined" sx={{ fontWeight: 700 }} />
                      </Stack>
                    </Stack>
                    {po.remarks && String(po.remarks).trim() && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
                        {String(po.remarks).trim()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}

        {tab === 3 && (
          <>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Accepted lab lines ({acceptedLabLinesFiltered.length}
              {batchFilterId ? " · filtered" : ""})
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
              Stock after transfers toward primary inward · tap a card to prefill primary inward.
            </Typography>
            {acceptedLabLinesFiltered.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                {batchFilterId
                  ? "No accepted lines for this batch."
                  : "Accept lab lines on Home first."}
              </Typography>
            )}
            {acceptedLabLinesFiltered.map((row) => {
              const pctB =
                row.bottlesTotal > 0
                  ? Math.round((row.bottlesTransferred / row.bottlesTotal) * 100)
                  : 0;
              const rowKeyAcc = homeLabKey(row.batchId, row.labEntryId);
              const hasStockAcc =
                safeTrunc(row.bottlesRemaining) > 0 && safeTrunc(row.plantsRemaining) > 0;
              const selAcc = selectedHomeLabKey === rowKeyAcc;
              const { plant: tab3Plant, subtype: tab3Subtype } = batchPlantSubtypeLabelFromList(
                batches,
                row.batchId
              );
              return (
                <Card
                  key={`acc-${String(row.batchId)}-${String(row.labEntryId)}`}
                  role="button"
                  tabIndex={hasStockAcc ? 0 : -1}
                  onClick={() => hasStockAcc && openInwardFromHomeLab(row)}
                  onKeyDown={(e) => {
                    if (!hasStockAcc) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openInwardFromHomeLab(row);
                    }
                  }}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2,
                    border: "2px solid",
                    borderColor: selAcc ? "primary.main" : "divider",
                    bgcolor: selAcc ? alpha(theme.palette.primary.main, 0.05) : "background.paper",
                    boxShadow: selAcc
                      ? (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.14)}`
                      : "none",
                    overflow: "hidden",
                    cursor: hasStockAcc ? "pointer" : "default",
                    opacity: hasStockAcc ? 1 : 0.72,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    ...(hasStockAcc && {
                      "&:hover": {
                        borderColor: "primary.light",
                        boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.1)}`,
                      },
                    }),
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
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        {selAcc && (
                          <Chip size="small" color="primary" label="Selected" variant="filled" />
                        )}
                        <Chip size="small" label={row.labEntry?.size} color="success" variant="outlined" />
                        <Chip size="small" variant="outlined" label={tab3Plant} sx={{ fontWeight: 700 }} />
                        <Chip size="small" variant="outlined" color="primary" label={tab3Subtype} />
                      </Stack>
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
          onChange={(_, v) => {
            setTab(v);
            refreshAll();
          }}
          showLabels
          sx={{ borderTop: 1, borderColor: "divider" }}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} sx={tabSx} />
          <BottomNavigationAction label="Inward" icon={<InwardIcon />} sx={tabSx} />
          <BottomNavigationAction label="Outward" icon={<OutwardIcon />} sx={tabSx} />
          <BottomNavigationAction label="Accepted" icon={<AcceptedIcon />} sx={tabSx} />
        </BottomNavigation>
      </Paper>

      <Dialog
        open={inwardOpen}
        onClose={() => {
          setInwardOpen(false);
          setInwardSaveConfirmOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitInwardIntent}>
          <DialogTitle sx={{ pb: 0.5 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              Lab → primary inward
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              Compact entry · all fields stored on plant outward
            </Typography>
          </DialogTitle>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 1.15, pt: 1, px: 2, pb: 1 }}
          >
            <TextField
              {...compactField}
              select
              required
              label="Lab line (accepted)"
              value={
                inwardForm.labEntryId && inwardForm.batchId
                  ? `${inwardForm.batchId}:${inwardForm.labEntryId}`
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  setInwardForm((f) => ({
                    ...f,
                    batchId: "",
                    labEntryId: "",
                    selectedTrayId: "",
                    cavity: "",
                    numberOfTrays: "",
                  }));
                  return;
                }
                const [bid, lid] = v.split(":");
                const opt = acceptedLabOptions.find(
                  (o) => String(o.batchId) === bid && String(o.lab._id) === lid
                );
                const cavityStr = String(DEFAULT_INWARD_CAVITY);
                const tray126 = trayOptions.find(
                  (t) => Number(t.cavity) === DEFAULT_INWARD_CAVITY
                );
                const plantsLeft = opt?.stock?.plantsRemaining ?? 0;
                const traysAuto = syncInwardTraysFromLab(cavityStr, plantsLeft);
                setInwardForm((f) => ({
                  ...f,
                  batchId: bid,
                  labEntryId: lid,
                  size: opt?.lab?.size ?? f.size,
                  selectedTrayId: tray126 ? String(tray126._id || tray126.id) : TRAY_CUSTOM,
                  cavity: cavityStr,
                  numberOfTrays: traysAuto || "1",
                }));
              }}
              SelectProps={{ native: false }}
            >
              <MenuItem value="">
                <em>Select batch / lab line</em>
              </MenuItem>
              {acceptedLabOptions.map((o) => {
                const { plant: labOptPlant, subtype: labOptSubtype } =
                  batchPlantSubtypeLabelFromList(batches, o.batchId);
                return (
                  <MenuItem
                    key={`${o.batchId}-${o.lab._id}`}
                    value={`${o.batchId}:${o.lab._id}`}
                  >
                    {o.batchNumber} — {labOptPlant} · {labOptSubtype} · {o.lab.size} ·{" "}
                    {o.stock.bottlesRemaining}/{o.stock.bottlesTotal} bt ·{" "}
                    {o.stock.plantsRemaining}/{o.stock.plantsTotal} plants left
                  </MenuItem>
                );
              })}
            {acceptedLabOptions.length === 0 && (
              <MenuItem disabled>No accepted lab lines with stock (accept on Home first)</MenuItem>
            )}
            </TextField>
            {inwardForm.batchId && inwardForm.labEntryId && (
              <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.75}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Variety
                </Typography>
                <Chip size="small" variant="outlined" label={inwardSelectedVariety.plant} sx={{ fontWeight: 700 }} />
                <Chip
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={inwardSelectedVariety.subtype}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            )}
            {inwardForm.batchId &&
              inwardForm.labEntryId &&
              hasPlantReadyUi(inwardDialogPlantReady) && (
                <PlantReadyPanel pr={inwardDialogPlantReady} nowTick={nowTick} theme={theme} />
              )}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              <TextField
                {...compactField}
                type="date"
                label="Primary inward date"
                InputLabelProps={{ shrink: true }}
                value={inwardForm.primaryInwardDate}
                onChange={(e) => setInwardForm((f) => ({ ...f, primaryInwardDate: e.target.value }))}
                required
              />
              <TextField
                {...compactField}
                select
                label="Size (from lab line)"
                value={inwardForm.size}
                disabled={Boolean(inwardForm.labEntryId)}
                onChange={(e) => setInwardForm((f) => ({ ...f, size: e.target.value }))}
                helperText={
                  inwardForm.labEntryId
                    ? "Locked to the selected lab line"
                    : "Select a lab line to set size"
                }
              >
              {["R1", "R2", "R3"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            </Box>
            <TextField
              {...compactField}
              label="Bottles from lab line"
              type="number"
              required
              value={inwardForm.numberOfBottles}
              onChange={(e) => setInwardForm((f) => ({ ...f, numberOfBottles: e.target.value }))}
              helperText={
                selectedInwardLabOption
                  ? `This lab line has up to ${selectedInwardLabOption.stock.bottlesRemaining} bottle(s) and ${selectedInwardLabOption.stock.plantsRemaining} plant(s) left.`
                  : "Bottles you are moving from the lab to primary for this entry."
              }
            />
            {trayOptions.length > 0 && (
              <TextField
                {...compactField}
                select
                label="Tray (CMS) — sets cavity"
                value={
                  inwardForm.selectedTrayId === TRAY_CUSTOM
                    ? TRAY_CUSTOM
                    : trayOptions.some(
                        (t) => String(t._id || t.id) === String(inwardForm.selectedTrayId)
                      )
                    ? inwardForm.selectedTrayId
                    : ""
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === TRAY_CUSTOM) {
                    const cavityStr = String(DEFAULT_INWARD_CAVITY);
                    setInwardForm((f) => {
                      const opt = acceptedLabOptions.find(
                        (o) =>
                          String(o.batchId) === String(f.batchId) &&
                          String(o.lab._id) === String(f.labEntryId)
                      );
                      const plantsLeft = opt?.stock?.plantsRemaining ?? 0;
                      const traysAuto = syncInwardTraysFromLab(cavityStr, plantsLeft);
                      return {
                        ...f,
                        selectedTrayId: TRAY_CUSTOM,
                        cavity: cavityStr,
                        numberOfTrays: traysAuto || f.numberOfTrays || "1",
                      };
                    });
                    return;
                  }
                  if (!v) {
                    setInwardForm((f) => ({ ...f, selectedTrayId: "", cavity: "", numberOfTrays: "" }));
                    return;
                  }
                  const t = trayOptions.find(
                    (x) => String(x._id || x.id) === String(v)
                  );
                  setInwardForm((f) => {
                    const opt = acceptedLabOptions.find(
                      (o) =>
                        String(o.batchId) === String(f.batchId) &&
                        String(o.lab._id) === String(f.labEntryId)
                    );
                    const plantsLeft = opt?.stock?.plantsRemaining ?? 0;
                    const cavityNext =
                      t != null && t.cavity != null ? String(t.cavity) : f.cavity;
                    const traysAuto = syncInwardTraysFromLab(cavityNext, plantsLeft);
                    return {
                      ...f,
                      selectedTrayId: v,
                      cavity: cavityNext,
                      numberOfTrays: traysAuto || f.numberOfTrays || "1",
                    };
                  });
                }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  <em>Choose tray or custom cavity</em>
                </MenuItem>
                <MenuItem value={TRAY_CUSTOM}>Custom cavity (enter below)</MenuItem>
                {trayOptions.map((t) => {
                  const id = String(t._id || t.id);
                  return (
                    <MenuItem key={id} value={id}>
                      {(t.name || "Tray") + " — " + t.cavity + " plants / cavity"}
                    </MenuItem>
                  );
                })}
              </TextField>
            )}
            <TextField
              {...compactField}
              label="Cavity (plants per tray)"
              type="number"
              required
              value={inwardForm.cavity}
              onChange={(e) => {
                const cavityVal = e.target.value;
                setInwardForm((f) => {
                  const opt = acceptedLabOptions.find(
                    (o) =>
                      String(o.batchId) === String(f.batchId) &&
                      String(o.lab._id) === String(f.labEntryId)
                  );
                  const plantsLeft = opt?.stock?.plantsRemaining ?? 0;
                  const cavNum = safeTrunc(cavityVal);
                  const traysAuto =
                    cavNum >= 1 && plantsLeft > 0
                      ? syncInwardTraysFromLab(cavityVal, plantsLeft)
                      : null;
                  return {
                    ...f,
                    cavity: cavityVal,
                    numberOfTrays:
                      traysAuto != null && traysAuto !== ""
                        ? traysAuto
                        : f.numberOfTrays,
                  };
                });
              }}
              disabled={
                Boolean(
                  inwardForm.selectedTrayId &&
                    inwardForm.selectedTrayId !== TRAY_CUSTOM
                )
              }
              helperText={
                trayOptions.length === 0
                  ? "No tray list from CMS — enter cavity manually."
                : inwardForm.selectedTrayId &&
                    inwardForm.selectedTrayId !== TRAY_CUSTOM
                  ? "Set by the selected CMS tray. Choose “Custom cavity” to override."
                  : "Plants per tray; total plants = cavity × number of trays."
              }
            />
            <TextField
              {...compactField}
              label="Number of trays"
              type="number"
              required
              value={inwardForm.numberOfTrays}
              onChange={(e) => setInwardForm((f) => ({ ...f, numberOfTrays: e.target.value }))}
              error={inwardTraysOverBooked}
              helperText={
                inwardTraysOverBooked && inwardMaxTraysFromLab != null
                  ? `Above allowed max at this cavity (${inwardMaxTraysFromLab} trays, incl. ±${Math.round(INWARD_TRAY_STOCK_TOLERANCE * 100)}% on plants).`
                  : selectedInwardLabOption &&
                      inwardNominalMaxTraysFromLab != null &&
                      inwardMaxTraysFromLab != null
                    ? `Nominal max ${inwardNominalMaxTraysFromLab} trays · Allowed ${inwardMaxTraysFromLab} (±${Math.round(INWARD_TRAY_STOCK_TOLERANCE * 100)}% plant tolerance).`
                    : "Editable — defaults from lab plants ÷ cavity."
              }
            />
            {selectedInwardLabOption &&
              inwardNominalMaxTraysFromLab != null &&
              inwardMaxTraysFromLab != null && (
              <Box
                sx={{
                  px: 1.15,
                  py: 0.9,
                  borderRadius: 1.25,
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.07),
                  border: "1px solid",
                  borderColor: inwardTraysOverBooked ? "error.main" : alpha(theme.palette.primary.main, 0.22),
                  boxShadow: (t) =>
                    inwardTraysOverBooked ? "none" : `0 2px 12px ${alpha(t.palette.primary.main, 0.08)}`,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.45, fontWeight: 700 }}>
                  ट्रे · Lab stock (±{Math.round(INWARD_TRAY_STOCK_TOLERANCE * 100)}%)
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.45 }}>
                  Nominal max:{" "}
                  <Box component="span" color="primary.dark" fontWeight={900}>
                    {inwardNominalMaxTraysFromLab}
                  </Box>
                  {" · "}
                  Allowed max:{" "}
                  <Box component="span" color="success.dark" fontWeight={900}>
                    {inwardMaxTraysFromLab}
                  </Box>
                  {" · "}
                  This entry:{" "}
                  <Box component="span" color="text.primary">
                    {safeTrunc(inwardForm.numberOfTrays) || "—"}
                  </Box>
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>
                  Nominal trays left on lab line after this:{" "}
                  <Box
                    component="span"
                    fontWeight={900}
                    color={
                      inwardRemainingTraysAfterEntry != null && inwardRemainingTraysAfterEntry < 0
                        ? "warning.dark"
                        : "text.primary"
                    }
                  >
                    {inwardRemainingTraysAfterEntry == null
                      ? "—"
                      : inwardRemainingTraysAfterEntry}
                  </Box>
                </Typography>
                {inwardRemainingTraysAfterEntry != null && inwardRemainingTraysAfterEntry < 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.45 }}>
                    Over nominal count — allowed if total trays ≤ {inwardMaxTraysFromLab} (±
                    {Math.round(INWARD_TRAY_STOCK_TOLERANCE * 100)}% cap).
                  </Typography>
                )}
              </Box>
            )}
            {inwardFormReadyIsDue && inwardFormExpectedReadyMoment?.isValid() && (
              <Box
                role="alert"
                sx={{
                  px: 1.25,
                  py: 0.9,
                  borderRadius: 1,
                  border: "2px solid",
                  borderColor: "error.main",
                  bgcolor: (t) => alpha(t.palette.error.main, 0.14),
                  animation: "inwardFormDueBlink 1.1s ease-in-out infinite",
                  "@keyframes inwardFormDueBlink": {
                    "0%, 100%": {
                      opacity: 1,
                      boxShadow: (t) => `0 0 0 0 ${alpha(t.palette.error.main, 0.25)}`,
                    },
                    "50%": {
                      opacity: 0.88,
                      boxShadow: (t) => `0 0 16px 4px ${alpha(t.palette.error.main, 0.42)}`,
                    },
                  },
                }}
              >
                <Typography variant="body2" fontWeight={900} color="error.dark">
                  Plant-ready target is due or passed — {inwardFormExpectedReadyMoment.format("DD MMM YYYY")}
                  {inwardFormReadyDayDiff === 0
                    ? " (today)"
                    : inwardFormReadyDayDiff != null && inwardFormReadyDayDiff < 0
                      ? ` (${Math.abs(inwardFormReadyDayDiff)}d ago)`
                      : ""}
                </Typography>
                <Typography variant="caption" color="error.dark" display="block" sx={{ mt: 0.35 }}>
                  Record inward only if appropriate for operations.
                </Typography>
              </Box>
            )}
            {inwardPlantsPreview != null && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                <strong>Plants for this entry:</strong> {inwardPlantsPreview} (cavity × trays; must
                be ≤ plants left on the lab line)
              </Typography>
            )}
            {locationOptions.length > 0 ? (
              <TextField
                {...compactField}
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
                {...compactField}
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
              {...compactField}
              label="Labours engaged"
              type="number"
              required
              value={inwardForm.laboursEngaged}
              onChange={(e) => setInwardForm((f) => ({ ...f, laboursEngaged: e.target.value }))}
            />
            <TextField
              {...compactField}
              label="Remarks"
              multiline
              rows={2}
              value={inwardForm.remarks}
              onChange={(e) => setInwardForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </DialogContent>
          <DialogActions sx={dialogActions5050Sx}>
            <Button
              variant="outlined"
              onClick={() => {
                setInwardOpen(false);
                setInwardSaveConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={inwardSaveConfirmOpen}
        onClose={() => setInwardSaveConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: "1.1rem", fontWeight: 800, pb: 0.5 }}>
          ट्रे व रोप तपासा
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ pt: 0.5, mb: 1 }}>
            Batch: <strong>{inwardConfirmBatchNumber}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {inwardSelectedVariety.plant} · {inwardSelectedVariety.subtype}
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.65 }}>
            {trayConfirmUserBhau ? (
              <>
                <Box component="span" fontWeight={800}>
                  {trayConfirmUserBhau} भाऊ
                </Box>
                {inwardPlantsPreview != null
                  ? ", इतके ट्रे घेत आहात व इतके रोपे लागवड करत आहात."
                  : ", फक्त इतके ट्रे घेत आहात."}
              </>
            ) : inwardPlantsPreview != null ? (
              <>इतके ट्रे घेत आहात व इतके रोपे लागवड करत आहात.</>
            ) : (
              <>फक्त इतके ट्रे घेत आहात.</>
            )}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <Box
              sx={{
                flex: "1 1 120px",
                minWidth: 0,
                px: 1.25,
                py: 1,
                borderRadius: 1,
                bgcolor: (t) => alpha(t.palette.success.main, 0.14),
                border: "2px solid",
                borderColor: (t) => alpha(t.palette.success.main, 0.45),
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                ट्रे
              </Typography>
              <Typography variant="h5" fontWeight={800} color="success.dark">
                {safeTrunc(inwardForm.numberOfTrays) || 0}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: "1 1 120px",
                minWidth: 0,
                px: 1.25,
                py: 1,
                borderRadius: 1,
                bgcolor: (t) =>
                  inwardPlantsPreview != null
                    ? alpha(t.palette.info.main, 0.12)
                    : alpha(t.palette.grey[500], 0.1),
                border: "2px solid",
                borderColor: (t) =>
                  inwardPlantsPreview != null
                    ? alpha(t.palette.info.main, 0.42)
                    : alpha(t.palette.divider, 0.9),
              }}
            >
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                रोपे (cavity × ट्रे)
              </Typography>
              <Typography
                variant="h5"
                fontWeight={800}
                color={inwardPlantsPreview != null ? "info.dark" : "text.secondary"}
              >
                {inwardPlantsPreview != null
                  ? inwardPlantsPreview.toLocaleString("en-IN")
                  : "—"}
              </Typography>
            </Box>
          </Stack>
          {inwardPlantsPreview == null && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
              रोपे गणना साठी cavity व ट्रे दोन्ही भरा (किंवा तपासा).
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
            जतन करायचे?
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActions5050Sx}>
          <Button variant="outlined" onClick={() => setInwardSaveConfirmOpen(false)}>
            रद्द
          </Button>
          <Button variant="contained" onClick={confirmInwardSave}>
            जतन करा
          </Button>
        </DialogActions>
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
              One save per selected line · outward quantity is plants (trays × cavity), capped by
              plants available on each inward line
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setPrimaryOutDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{ display: "flex", flexDirection: "column", gap: 1.15, pt: 1, px: 2, pb: 1 }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: -0.25 }}>
              Shared across selected inward lines · matches DB primary outward fields
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1,
              }}
            >
              <TextField
                {...compactField}
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
                {...compactField}
                select
                label="Quality of dispatch"
                value={
                  QUALITY_OF_DISPATCH_OPTIONS.includes(primaryOutShared.qualityOfDispatch)
                    ? primaryOutShared.qualityOfDispatch
                    : "Very Good"
                }
                onChange={(e) =>
                  setPrimaryOutShared((s) => ({ ...s, qualityOfDispatch: e.target.value }))
                }
                required
              >
                {QUALITY_OF_DISPATCH_OPTIONS.map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                {...compactField}
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
                {...compactField}
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
                {...compactField}
                label="Days taken"
                type="number"
                inputProps={{ min: 0 }}
                value={primaryOutShared.numberOfDaysTaken}
                onChange={(e) =>
                  setPrimaryOutShared((s) => ({ ...s, numberOfDaysTaken: e.target.value }))
                }
                required
              />
            </Box>
            {locationOptions.length > 0 ? (
              <TextField
                {...compactField}
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
                {...compactField}
                required
                label="Polly house / shade"
                value={primaryOutShared.pollyhouse}
                onChange={(e) =>
                  setPrimaryOutShared((s) => ({ ...s, pollyhouse: e.target.value }))
                }
              />
            )}
            <TextField
              {...compactField}
              label="Labours engaged"
              type="number"
              value={primaryOutShared.laboursEngaged}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, laboursEngaged: e.target.value }))
              }
              required
            />
            <TextField
              {...compactField}
              label="Remarks"
              multiline
              rows={2}
              value={primaryOutShared.remarks}
              onChange={(e) =>
                setPrimaryOutShared((s) => ({ ...s, remarks: e.target.value }))
              }
            />
            <Divider sx={{ my: 0.5 }} />
            {primaryInwardRows
              .filter((r) =>
                selectedInwardKeys.has(inwardKey(String(r._batchId), String(r._id)))
              )
              .map((r) => {
                const q = primaryOutPerRow[r._id] || {};
                const maxP = availPlantsPrimaryInward(r);
                const cavQ = safeTrunc(q.cavity);
                const trQ = safeTrunc(q.numberOfTrays);
                const plantsThisOut =
                  cavQ > 0 && trQ > 0 ? Math.min(cavQ * trQ, maxP) : safeTrunc(q.numberOfBottles);
                const cavityLocked = Math.max(1, safeTrunc(r.cavity));
                const patchRow = (patch) => {
                  setPrimaryOutPerRow((p) => {
                    const prev = p[r._id] || {};
                    const cur = {
                      ...prev,
                      ...patch,
                      cavity: String(cavityLocked),
                    };
                    const c = cavityLocked;
                    const t = safeTrunc(cur.numberOfTrays);
                    let nb = cur.numberOfBottles;
                    if (c > 0 && t > 0) {
                      nb = String(Math.min(c * t, maxP));
                    }
                    return { ...p, [r._id]: { ...cur, numberOfBottles: nb } };
                  });
                };
                const { plant: pOutDlgPlant, subtype: pOutDlgSubtype } = batchPlantSubtypeLabelFromList(
                  batches,
                  r._batchId
                );
                return (
                  <Card key={r._id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                      <Typography fontWeight={700} variant="subtitle2">
                        {r.batchNumber}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        <Chip size="small" variant="outlined" label={pOutDlgPlant} />
                        <Chip size="small" variant="outlined" color="primary" label={pOutDlgSubtype} />
                      </Stack>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          px: 0.75,
                          py: 0.35,
                          mt: 0.5,
                          borderRadius: 1,
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                          border: "1px solid",
                          borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                        }}
                      >
                        <Typography variant="body2" fontWeight={900} color="primary.dark" sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {plantsThisOut.toLocaleString("en-IN")} plants outward
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 0.75,
                          mt: 0.85,
                          width: "100%",
                          alignItems: "flex-start",
                        }}
                      >
                        <TextField
                          size="small"
                          fullWidth
                          margin="none"
                          label="Cavity"
                          type="number"
                          disabled
                          helperText="From inward"
                          inputProps={{ style: { fontVariantNumeric: "tabular-nums" } }}
                          value={cavityLocked}
                        />
                        <TextField
                          size="small"
                          fullWidth
                          margin="none"
                          label="Trays"
                          type="number"
                          inputProps={{ style: { fontVariantNumeric: "tabular-nums" } }}
                          value={q.numberOfTrays ?? ""}
                          onChange={(e) => patchRow({ numberOfTrays: e.target.value })}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </DialogContent>
          <DialogActions sx={dialogActions5050Sx}>
            <Button variant="outlined" onClick={() => setPrimaryOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
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
                const cavQ = safeTrunc(q.cavity);
                const trQ = safeTrunc(q.numberOfTrays);
                const plantsThis =
                  cavQ > 0 && trQ > 0 ? Math.min(cavQ * trQ, maxP) : safeTrunc(q.numberOfBottles);
                const cavityLockedSec = Math.max(1, safeTrunc(r.cavity));
                const patchSec = (patch) => {
                  setSecondaryPerRow((p) => {
                    const prev = p[r._id] || {};
                    const cur = {
                      ...prev,
                      ...patch,
                      cavity: String(cavityLockedSec),
                    };
                    const c = cavityLockedSec;
                    const t = safeTrunc(cur.numberOfTrays);
                    let nb = cur.numberOfBottles;
                    if (c > 0 && t > 0) {
                      nb = String(Math.min(c * t, maxP));
                    }
                    return { ...p, [r._id]: { ...cur, numberOfBottles: nb } };
                  });
                };
                const { plant: secDlgPlant, subtype: secDlgSubtype } = batchPlantSubtypeLabelFromList(
                  batches,
                  r._batchId
                );
                return (
                  <Card key={r._id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography fontWeight={700}>{r.batchNumber}</Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        <Chip size="small" variant="outlined" label={secDlgPlant} />
                        <Chip size="small" variant="outlined" color="secondary" label={secDlgSubtype} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {r.size} · up to {maxP} plants
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }} color="secondary.main">
                        Plants to secondary: {plantsThis}
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 1,
                          mt: 1,
                          width: "100%",
                          alignItems: "flex-start",
                        }}
                      >
                        <TextField
                          size="small"
                          fullWidth
                          margin="none"
                          label="Cavity"
                          type="number"
                          disabled
                          helperText="From primary outward"
                          inputProps={{ style: { fontVariantNumeric: "tabular-nums" } }}
                          value={cavityLockedSec}
                        />
                        <TextField
                          size="small"
                          fullWidth
                          margin="none"
                          label="Trays"
                          type="number"
                          inputProps={{ style: { fontVariantNumeric: "tabular-nums" } }}
                          value={q.numberOfTrays ?? ""}
                          onChange={(e) => patchSec({ numberOfTrays: e.target.value })}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </DialogContent>
          <DialogActions sx={dialogActions5050Sx}>
            <Button variant="outlined" onClick={() => setSecondaryDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="secondary">
              Save all
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={acceptConfirmOpen}
        onClose={() => {
          setAcceptConfirmOpen(false);
          setAcceptTarget(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: "1rem", pb: 0 }}>
          Accept lab line
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {acceptTarget && (
            <>
              <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
                Batch: <strong>{acceptTarget.batchNumber}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                {acceptTargetPlantMeta.plant} · {acceptTargetPlantMeta.subtype}
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                This line has <strong>{acceptTarget.bottles}</strong> bottle(s) and{" "}
                <strong>{acceptTarget.plants}</strong> plants from the lab (size{" "}
                <strong>{acceptTarget.size}</strong>). Confirm accept?
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={dialogActions5050Sx}>
          <Button
            variant="outlined"
            onClick={() => {
              setAcceptConfirmOpen(false);
              setAcceptTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="success" onClick={confirmAcceptLab}>
            Accept
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectTarget(null);
          setRejectReason("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          Reject lab line
          {rejectTarget?.batchNumber != null && (
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>
              Batch: {rejectTarget.batchNumber}
            </Typography>
          )}
          {rejectTarget?.batchId != null && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: "block" }}>
              {rejectTargetVariety.plant} · {rejectTargetVariety.subtype}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            A remark is required to reject.
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="Remark"
            placeholder="e.g. quality, quantity, other…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            helperText={
              rejectReason.trim()
                ? `${rejectReason.trim().length} characters`
                : "Required — enter a reason."
            }
          />
        </DialogContent>
        <DialogActions sx={dialogActions5050Sx}>
          <Button
            variant="outlined"
            onClick={() => {
              setRejectOpen(false);
              setRejectTarget(null);
              setRejectReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={submitReject}
            disabled={!String(rejectReason ?? "").trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrimaryMobileOps;
