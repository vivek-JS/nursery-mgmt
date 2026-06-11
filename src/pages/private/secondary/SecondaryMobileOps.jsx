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
  Alert,
  Tooltip,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  TaskAlt as AcceptTabIcon,
  MoveToInbox as InwardIcon,
  LocalShipping as DispatchTabIcon,
  PersonOutline,
  DirectionsCar,
  Refresh,
  Today,
  Close as CloseIcon,
  CheckCircle,
  Add,
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
  ReportProblem as MortalityIcon,
  DoneAll as SowingDoneIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useUserData, useUserRole } from "utils/roleUtils";
import { NetworkManager, API } from "network/core";
import axiosInstance from "services/axiosConfig";
import { Toast } from "helpers/toasts/toastHelper";
import moment from "moment";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import {
  batchPlantSubtypeLabelFromList,
  dispatchBatchFromOutwardList,
} from "utils/batchPlantDisplay";
import {
  normBatchKey,
  buildPlantReadyBatchIdMap,
  resolvePlantReady,
  BatchAvailReadyStrip,
} from "../primary/plantReadyMobileUtils.jsx";
import {
  safeTrunc,
  availPlantsPrimaryOutward,
  fullTraysAvailablePrimaryOutward,
  resolveSourcePrimaryInwardForOutward,
  labLineSummary,
  formatStageDate,
  allocateLagwadFifoFullTrays,
  maxLagwadPlantsFullTrays,
  lagawdRowCompatibleWithSelection,
  secondaryMortalityRecordedTotal,
} from "./secondaryMobileUtils.js";
import {
  loadFleetOwners,
  loadFleetForOwner,
  formatFleetDriverLabel,
  getFleetDriverId,
} from "components/fleet/fleetPickersUtils";
import FleetAssignmentPanel from "components/fleet/FleetAssignmentPanel";

const tabSx = { minHeight: 56, "& .MuiBottomNavigationAction-label": { fontSize: "0.65rem" } };

/** Accent stripes for compact dispatch-ready batch cards */
const BATCH_CARD_ACCENTS = ["#7c3aed", "#059669", "#ea580c", "#0284c7", "#db2777", "#65a30d"];
/** Plant-ready / milestone window — must match `upcomingDays` on secondary-mobile-dashboard. */
const SECONDARY_PLANT_READY_WINDOW_DAYS = 7;

/** Two equal full-width buttons (Marathi confirm / dialogs) */
const dialogActions5050Sx = {
  px: 2,
  py: 1.5,
  gap: 1,
  display: "flex",
  flexDirection: "row",
  "& .MuiButton-root": {
    flex: 1,
    minHeight: 48,
    fontSize: "1rem",
    fontWeight: 700,
  },
};

const availPlantsSecondaryInward = (si) =>
  safeTrunc(si.availableQuantity ?? si.totalQuantity);

const secInwardKey = (batchId, id) => `${batchId}:${id}`;
const outwardKey = (batchId, id) => `${batchId}:${id}`;

/** Expected dispatch date: secondary inward (planting) + batch secondary plant–ready days */
const dateOfDispatchFromInwardAndReadyDays = (inwardYmd, secondaryReadyDays) => {
  if (!inwardYmd) return "";
  if (!moment(inwardYmd, "YYYY-MM-DD", true).isValid()) return inwardYmd;
  const d = Math.max(0, Number(secondaryReadyDays) || 0);
  if (d <= 0) return inwardYmd;
  return moment(inwardYmd, "YYYY-MM-DD").add(d, "days").format("YYYY-MM-DD");
};

/** Normalize IDs from populated or raw Mongo refs */
const refId = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return String(v._id ?? v.id ?? "").trim();
  return String(v).trim();
};

/** Sum crateDetails + legacy top-level crateCount/plantCount on one plant row */
const summarizePlantCratesArray = (cratesArr) => {
  const parts = [];
  for (const crate of cratesArr || []) {
    const nested = crate.crateDetails || [];
    if (nested.length > 0) {
      for (const cd of nested) {
        const c = Number(cd.crateCount) || 0;
        const p = Number(cd.plantCount) || 0;
        if (c >= 1 && p >= 1) parts.push(`${c} crate${c === 1 ? "" : "s"} · ${p} plants`);
      }
    } else {
      const c = Number(crate.crateCount) || 0;
      const p = Number(crate.plantCount) || 0;
      if (c >= 1 && p >= 1) parts.push(`${c} crate${c === 1 ? "" : "s"} · ${p} plants`);
    }
  }
  return parts;
};

const summarizeOrderDispatchCrates = (orderDispatchDetails) => {
  const parts = [];
  for (const row of orderDispatchDetails || []) {
    for (const c of row.crates || []) {
      const nested = c.crateDetails || [];
      if (nested.length > 0) {
        for (const cd of nested) {
          const n = Number(cd.crateCount) || 0;
          const q = Number(cd.plantCount) || 0;
          if (n >= 1 && q >= 1) parts.push(`${n}×${q} plants`);
        }
      } else {
        const n = Number(c.crateCount) || 0;
        const q = Number(c.plantCount) || 0;
        if (n >= 1 && q >= 1) parts.push(`${n}×${q} plants`);
      }
    }
  }
  return parts.slice(0, 10).join(" · ");
};

/**
 * Crate lines from `GET /dispatched` for a nursery batch.
 * Matches pickup batchId/batchNumber when present; otherwise plant row plantId+subTypeId vs DispatchBatch.
 */
const collectCrateHintsForBatch = (dispatches, batchIdStr, batchNumberStr, plantMatch) => {
  const hints = [];
  const bn = normBatchKey(batchNumberStr || "");
  const bidTarget = batchIdStr != null ? String(batchIdStr).trim() : "";
  const pidM = plantMatch?.plantId != null ? refId(plantMatch.plantId) : "";
  const sidM = plantMatch?.subTypeId != null ? refId(plantMatch.subTypeId) : "";

  const pickupMatchesBatch = (pu) => {
    const pid = pu.batchId != null ? refId(pu.batchId) : "";
    const pnum = normBatchKey(pu.batchNumber || "");
    const matchById = Boolean(bidTarget && pid && pid === bidTarget);
    const matchByNum = Boolean(bn && pnum && pnum === bn);
    return matchById || matchByNum;
  };

  const plantRowMatchesBatch = (plant) => {
    if (!pidM || !sidM) return false;
    const pp = refId(plant.plantId);
    const ps = refId(plant.subTypeId ?? plant.subType);
    return Boolean(pp && ps && pp === pidM && ps === sidM);
  };

  for (const d of dispatches || []) {
    const tid = d.transportId != null ? String(d.transportId) : "";
    const st = d.transportStatus ? String(d.transportStatus) : "";
    let matchedThisDispatch = false;

    for (const plant of d.plantsDetails || []) {
      const pickups = plant.pickupDetails || [];
      const cratesArr = plant.crates || [];
      const anyPickupMatch = pickups.some(pickupMatchesBatch);
      const rowMatch = plantRowMatchesBatch(plant);
      if (!anyPickupMatch && !rowMatch) continue;

      matchedThisDispatch = true;

      if (anyPickupMatch) {
        for (const pu of pickups) {
          if (!pickupMatchesBatch(pu)) continue;
          const cav = pu.cavity != null ? String(pu.cavity) : "";
          const crateGroup = cratesArr.find((c) => c.cavity != null && String(c.cavity) === cav);
          let parts = [];
          if (crateGroup) {
            const nested = crateGroup.crateDetails || [];
            if (nested.length > 0) {
              parts = nested
                .map((cd) => {
                  const c = Number(cd.crateCount) || 0;
                  const p = Number(cd.plantCount) || 0;
                  if (c < 1 || p < 1) return null;
                  return `${c} crate${c === 1 ? "" : "s"} · ${p} plants`;
                })
                .filter(Boolean);
            } else {
              const c = Number(crateGroup.crateCount) || 0;
              const p = Number(crateGroup.plantCount) || 0;
              if (c >= 1 && p >= 1) parts.push(`${c} crate${c === 1 ? "" : "s"} · ${p} plants`);
            }
          }
          if (!parts.length && rowMatch) {
            parts = summarizePlantCratesArray(cratesArr);
          }
          if (!parts.length) {
            parts = summarizePlantCratesArray(cratesArr);
          }
          if (parts.length) {
            hints.push({
              key: `${String(d._id)}-${cav}-${hints.length}`,
              transportId: tid,
              transportStatus: st,
              cavityName: String(pu.cavityName || crateGroup?.cavityName || "").trim(),
              summary: parts.join(" · "),
            });
          }
        }
      }

      if (!anyPickupMatch && rowMatch) {
        const parts = summarizePlantCratesArray(cratesArr);
        if (parts.length) {
          hints.push({
            key: `${String(d._id)}-row-${refId(plant.plantId)}-${hints.length}`,
            transportId: tid,
            transportStatus: st,
            cavityName: "All cavities",
            summary: parts.join(" · "),
          });
        }
      }
    }

    if (matchedThisDispatch) {
      const oddSum = summarizeOrderDispatchCrates(d.orderDispatchDetails);
      if (oddSum) {
        hints.push({
          key: `${String(d._id)}-odd`,
          transportId: tid,
          transportStatus: st,
          cavityName: "Per-order (challan)",
          summary: oddSum,
        });
      }
    }
  }

  return hints.slice(0, 10);
};

/** Vehicle allocation GET wraps payload in `data` on APIResponse (`res.data` = full server JSON). */
const unwrapAllocationApiPayload = (res) => {
  const body = res?.data;
  if (!body || typeof body !== "object") return null;
  const nested = body.data;
  if (nested != null && typeof nested === "object") {
    return nested;
  }
  if ("suggestions" in body || "batches" in body || "matchingOrders" in body) return body;
  return null;
};

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

  const [secFromPrimaryShared, setSecFromPrimaryShared] = useState({
    secondaryInwardDate: moment().format("YYYY-MM-DD"),
    dateOfDispatch: moment().format("YYYY-MM-DD"),
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
  });

  /** Accept tab — English confirm, POST acknowledge only */
  const [acceptEnglishOpen, setAcceptEnglishOpen] = useState(false);
  const [acceptTargetPo, setAcceptTargetPo] = useState(null);

  const [mortalityOpen, setMortalityOpen] = useState(false);
  const [mortalityTarget, setMortalityTarget] = useState(null);
  const [mortalityQty, setMortalityQty] = useState("");
  const [mortalityRemarks, setMortalityRemarks] = useState("");
  const [mortalitySubmitting, setMortalitySubmitting] = useState(false);

  const [sowingDoneConfirmOpen, setSowingDoneConfirmOpen] = useState(false);
  const [sowingDoneTargetPo, setSowingDoneTargetPo] = useState(null);

  /** Lagawd — multi-line FIFO planting into secondary */
  const [lagwadOpen, setLagwadOpen] = useState(false);
  const [lagwadSelectedKeys, setLagwadSelectedKeys] = useState(() => new Set());
  const [lagwadTotalPlants, setLagwadTotalPlants] = useState("");

  const [selectedSecInwardKeys, setSelectedSecInwardKeys] = useState(new Set());
  const [secOutDialogOpen, setSecOutDialogOpen] = useState(false);
  const [secOutShared, setSecOutShared] = useState({
    secondaryOutwardDate: moment().format("YYYY-MM-DD"),
    pollyhouse: "",
    laboursEngaged: "1",
    remarks: "",
  });
  const [secOutPerRow, setSecOutPerRow] = useState({});
  const [secOutLinkedOrder, setSecOutLinkedOrder] = useState(null);
  const [secOutOrdersList, setSecOutOrdersList] = useState([]);
  const [secOutOrdersLoading, setSecOutOrdersLoading] = useState(false);
  const [dispatchTabBatch, setDispatchTabBatch] = useState(null);
  const [dispatchTabOrders, setDispatchTabOrders] = useState([]);
  const [dispatchTabOrdersLoading, setDispatchTabOrdersLoading] = useState(false);
  const [dispatchTabOrderPick, setDispatchTabOrderPick] = useState(null);

  const [bypassOpen, setBypassOpen] = useState(false);
  const [bypassTarget, setBypassTarget] = useState(null);
  const [bypassReason, setBypassReason] = useState("");
  const [bypassSubmitting, setBypassSubmitting] = useState(false);
  const [selectedDispatchDay, setSelectedDispatchDay] = useState(null);

  const [vehicleDispatches, setVehicleDispatches] = useState([]);
  const [vehicleDispatchesPage, setVehicleDispatchesPage] = useState(1);
  const [vehicleDispatchesTotalPages, setVehicleDispatchesTotalPages] = useState(1);
  const [vehicleDispatchesLoading, setVehicleDispatchesLoading] = useState(false);
  const [vehicleDispatchSearch, setVehicleDispatchSearch] = useState("");
  /** Vehicle dispatches from `GET /dispatched` (planner) — used for crate lines on batch cards */
  const [dispatchedBoardDispatches, setDispatchedBoardDispatches] = useState([]);
  const [vehicleFulfillmentOpen, setVehicleFulfillmentOpen] = useState(false);
  const [vehicleFulfillmentDispatch, setVehicleFulfillmentDispatch] = useState(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationPayload, setAllocationPayload] = useState(null);
  const [plantRowIndex, setPlantRowIndex] = useState(0);
  /** Empty string = all batches (FIFO). When set, allocation API is called with batchId. */
  const [vehicleFulfillmentBatchId, setVehicleFulfillmentBatchId] = useState("");
  const [vehicleFulfillmentQtyByLineId, setVehicleFulfillmentQtyByLineId] = useState({});
  const [vehicleFulfillmentPhotos, setVehicleFulfillmentPhotos] = useState([]);
  /** Ignore stale allocation responses when plant row / batch filter changes quickly */
  const allocationRequestSeq = useRef(0);
  const [vehicleDriverEditOpen, setVehicleDriverEditOpen] = useState(false);
  const [vehicleDriverEditId, setVehicleDriverEditId] = useState(null);
  const [fleetOwners, setFleetOwners] = useState([]);
  const [fleetSelectedOwnerId, setFleetSelectedOwnerId] = useState("");
  const [fleetDrivers, setFleetDrivers] = useState([]);
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [fleetDriverId, setFleetDriverId] = useState("");
  const [fleetVehicleId, setFleetVehicleId] = useState("");
  const [fleetListsLoading, setFleetListsLoading] = useState(false);
  const [vehicleDriverSaving, setVehicleDriverSaving] = useState(false);

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
      const res = await inst.request({}, { upcomingDays: SECONDARY_PLANT_READY_WINDOW_DAYS });
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

  const fetchOrdersReadyForBatch = useCallback(async (batchId) => {
    if (!batchId) return [];
    const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_ORDERS_READY_FOR_DISPATCH);
    const res = await inst.request({}, { pathParams: [String(batchId)] });
    const body = res?.data;
    const payload = body?.data;
    return Array.isArray(payload?.orders) ? payload.orders : [];
  }, []);

  const loadVehicleDispatches = useCallback(
    async (page = 1) => {
      setVehicleDispatchesLoading(true);
      try {
        const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_VEHICLE_DISPATCHES);
        const res = await inst.request(
          {},
          {
            page,
            limit: 15,
            ...(vehicleDispatchSearch.trim() ? { search: vehicleDispatchSearch.trim() } : {}),
          }
        );
        const payload = res?.data?.data ?? res?.data;
        const items = payload?.items ?? [];
        if (page > 1) {
          setVehicleDispatches((prev) => [...prev, ...items]);
        } else {
          setVehicleDispatches(items);
        }
        setVehicleDispatchesPage(payload?.page ?? 1);
        setVehicleDispatchesTotalPages(payload?.totalPages ?? 1);
      } catch (e) {
        Toast.error(e?.message || "Failed to load vehicle dispatches");
        setVehicleDispatches([]);
      } finally {
        setVehicleDispatchesLoading(false);
      }
    },
    [vehicleDispatchSearch]
  );

  const loadDispatchedForCrates = useCallback(async () => {
    try {
      const inst = NetworkManager(API.DISPATCHED.GET_TRAYS);
      const res = await inst.request({}, { paged: 1, page: 1, limit: 100 });
      const body = res?.data;
      let raw = body?.data;
      if (raw == null && Array.isArray(body)) {
        raw = body;
      }
      if (raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.items)) {
        raw = raw.items;
      }
      const list = Array.isArray(raw) ? raw : [];
      setDispatchedBoardDispatches(list);
    } catch (e) {
      console.error(e);
      setDispatchedBoardDispatches([]);
    }
  }, []);

  const loadAllocationForDispatch = useCallback(async (dispatchMongoId, rowIdx, batchId = "") => {
    if (!dispatchMongoId) return;
    const seq = ++allocationRequestSeq.current;
    setAllocationLoading(true);
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_VEHICLE_DISPATCH_ALLOCATION);
      const params = { pathParams: [String(dispatchMongoId)], plantRowIndex: rowIdx };
      const b = batchId != null ? String(batchId).trim() : "";
      if (b) params.batchId = b;
      const res = await inst.request({}, params);
      const payload = unwrapAllocationApiPayload(res);
      if (seq !== allocationRequestSeq.current) return;
      setAllocationPayload(payload && typeof payload === "object" ? payload : null);
    } catch (e) {
      if (seq !== allocationRequestSeq.current) return;
      Toast.error(e?.message || "Could not load allocation suggestions");
      setAllocationPayload(null);
    } finally {
      if (seq === allocationRequestSeq.current) {
        setAllocationLoading(false);
      }
    }
  }, []);

  const uploadEvidenceFiles = async (files) => {
    const urls = [];
    const list = Array.from(files || []);
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axiosInstance.post("/user/media/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const d = res.data?.data ?? res.data;
      const u =
        d?.url ||
        d?.secure_url ||
        (typeof d === "string" ? d : null) ||
        res.data?.secure_url;
      if (u) urls.push(u);
    }
    return urls;
  };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadDashboard(),
      loadBatches(),
      loadLocationOptions(),
      loadVehicleDispatches(1),
      loadDispatchedForCrates(),
    ]);
    setLoading(false);
  }, [loadDashboard, loadBatches, loadLocationOptions, loadVehicleDispatches, loadDispatchedForCrates]);

  useEffect(() => {
    if (hasAccess) refreshAll();
  }, [hasAccess, refreshAll]);

  useEffect(() => {
    if (hasAccess && tab === 2) {
      loadDispatchedForCrates();
    }
  }, [hasAccess, tab, loadDispatchedForCrates]);

  const prevTabRef = useRef(tab);
  const vehiclePhotoInputRef = useRef(null);
  useEffect(() => {
    if (!hasAccess) return;
    if (prevTabRef.current === tab) return;
    prevTabRef.current = tab;
    (async () => {
      await Promise.all([loadDashboard(), loadBatches(), loadVehicleDispatches(1)]);
    })();
  }, [hasAccess, tab, loadDashboard, loadBatches, loadVehicleDispatches]);

  useEffect(() => {
    setSelectedSecInwardKeys(new Set());
    setLagwadSelectedKeys(new Set());
  }, [tab]);

  useEffect(() => {
    if (tab !== 2 || !dispatchTabBatch?.batchId) return undefined;
    let cancelled = false;
    (async () => {
      setDispatchTabOrdersLoading(true);
      try {
        const orders = await fetchOrdersReadyForBatch(dispatchTabBatch.batchId);
        if (!cancelled) setDispatchTabOrders(orders);
      } catch (e) {
        if (!cancelled) {
          Toast.error(e?.message || "Failed to load orders for batch");
          setDispatchTabOrders([]);
        }
      } finally {
        if (!cancelled) setDispatchTabOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, dispatchTabBatch, fetchOrdersReadyForBatch]);

  const formatFarmerOrderOption = useCallback((o) => {
    if (!o?._id) return "";
    const oid = o.orderId != null ? `#${o.orderId}` : "";
    const code = o.publicOrderCode ? `· ${o.publicOrderCode}` : "";
    const rem = o.remainingPlants != null ? `· ${o.remainingPlants} left` : "";
    const f = o.farmer;
    const name = (
      f?.name ||
      [f?.firstName, f?.lastName].filter(Boolean).join(" ") ||
      ""
    ).trim();
    return `${oid} ${code} ${name} ${rem}`.replace(/\s+/g, " ").trim();
  }, []);

  const incomingFromPrimary = dashboard?.incomingFromPrimary ?? [];
  const upcomingSecondaryMilestones = dashboard?.upcomingSecondaryMilestones ?? [];
  const upcomingSecIn = dashboard?.upcomingSecondaryInwardExpected ?? [];
  const upcomingSecOut = dashboard?.upcomingSecondaryOutwardExpected ?? [];
  const plantReadyByBatch = dashboard?.plantReadyByBatchNumber ?? {};

  const plantReadyByBatchIdMap = useMemo(
    () => buildPlantReadyBatchIdMap(plantReadyByBatch),
    [plantReadyByBatch]
  );

  const dashboardAvailLinesByKey = useMemo(() => {
    const m = new Map();
    for (const row of dashboard?.availableSecondaryInwardLines ?? []) {
      const sid = row.secondaryInward?._id;
      if (!sid) continue;
      m.set(secInwardKey(String(row.batchId), String(sid)), row);
    }
    return m;
  }, [dashboard?.availableSecondaryInwardLines]);

  const dispatchReadyByBatch = dashboard?.dispatchReadyByBatch ?? [];

  const dispatchReadyPlantTotal = useMemo(
    () =>
      dispatchReadyByBatch.reduce((s, r) => s + (Number(r.totalAvailPlants) || 0), 0),
    [dispatchReadyByBatch]
  );

  /** Planted / waiting vs eligible totals per batch (all inward lines with stock). */
  const dispatchBatchLineMetricsById = useMemo(() => {
    const m = new Map();
    for (const row of dashboard?.availableSecondaryInwardLines ?? []) {
      const bid = String(row.batchId);
      const si = row.secondaryInward;
      const avail = safeTrunc(si?.availableQuantity ?? 0);
      if (avail < 1) continue;
      if (!m.has(bid)) {
        m.set(bid, {
          earliestPlanted: null,
          eligibleAvail: 0,
          waitingAvail: 0,
          minDaysToCalendar: null,
        });
      }
      const x = m.get(bid);
      const planted = si?.secondaryInwardDate;
      if (planted) {
        const pm = moment(planted);
        if (!x.earliestPlanted || pm.isBefore(x.earliestPlanted)) x.earliestPlanted = pm;
      }
      if (row.dispatchEligible) {
        x.eligibleAvail += avail;
      } else {
        x.waitingAvail += avail;
        const exp = row.expectedReadyByCalendar;
        if (exp && moment(exp).isValid()) {
          const days = Math.max(
            0,
            moment(exp).startOf("day").diff(moment().startOf("day"), "days")
          );
          if (x.minDaysToCalendar == null || days < x.minDaysToCalendar) x.minDaysToCalendar = days;
        }
      }
    }
    return m;
  }, [dashboard?.availableSecondaryInwardLines]);

  const resolveSecondaryDispatchMeta = useCallback(
    (si, batchDocFromList) => {
      const k = secInwardKey(String(si._batchId), String(si._id));
      const fromDash = dashboardAvailLinesByKey.get(k);
      if (fromDash && typeof fromDash.dispatchEligible === "boolean") {
        const bypass = !!(fromDash.readinessBypassAt ?? si.readinessBypassAt);
        let readyState = "Upcoming";
        if (bypass) readyState = "Ready (bypass)";
        else if (fromDash.dispatchEligible) readyState = "Ready";
        return {
          dispatchEligible: fromDash.dispatchEligible,
          expectedReadyByCalendar: fromDash.expectedReadyByCalendar,
          readinessBypassAt: fromDash.readinessBypassAt ?? si.readinessBypassAt,
          readyState,
        };
      }
      const secDays = Number(batchDocFromList?.batchId?.secondaryPlantReadyDays) || 0;
      const inwardYmd = moment(si.secondaryInwardDate).format("YYYY-MM-DD");
      const expectedYmd = dateOfDispatchFromInwardAndReadyDays(inwardYmd, secDays);
      const calendarEligible = Boolean(
        expectedYmd &&
          moment().startOf("day").isSameOrAfter(moment(expectedYmd), "day")
      );
      const bypass = si.readinessBypassAt != null;
      const dispatchEligible = calendarEligible || bypass;
      let readyState = "Upcoming";
      if (bypass) readyState = "Ready (bypass)";
      else if (dispatchEligible) readyState = "Ready";
      return {
        dispatchEligible,
        expectedReadyByCalendar: expectedYmd
          ? moment(expectedYmd).startOf("day").toISOString()
          : null,
        readinessBypassAt: si.readinessBypassAt,
        readyState,
      };
    },
    [dashboardAvailLinesByKey]
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

  const calendarOutwardDaySet = useMemo(() => {
    const s = new Set();
    secondaryOutwardRows.forEach((so) => {
      s.add(moment(so.secondaryOutwardDate).format("YYYY-MM-DD"));
    });
    return s;
  }, [secondaryOutwardRows]);

  /** Dispatch tab — calendar rule only (automatic ready date), excludes Mark-ready bypass lines */
  const calendarAutoReadyDaySet = useMemo(() => {
    const s = new Set();
    (dashboard?.availableSecondaryInwardLines ?? []).forEach((row) => {
      if (!row.dispatchEligible || !row.expectedReadyByCalendar) return;
      const bypassAt = row.readinessBypassAt ?? row.secondaryInward?.readinessBypassAt;
      if (bypassAt != null) return;
      s.add(moment(row.expectedReadyByCalendar).format("YYYY-MM-DD"));
    });
    return s;
  }, [dashboard?.availableSecondaryInwardLines]);

  /** Days when “Mark ready” (bypass) was recorded */
  const markReadyDaySet = useMemo(() => {
    const s = new Set();
    (dashboard?.availableSecondaryInwardLines ?? []).forEach((row) => {
      if (!row.dispatchEligible) return;
      const bypassAt = row.readinessBypassAt ?? row.secondaryInward?.readinessBypassAt;
      if (bypassAt == null) return;
      const m = moment(bypassAt);
      if (m.isValid()) s.add(m.format("YYYY-MM-DD"));
    });
    return s;
  }, [dashboard?.availableSecondaryInwardLines]);

  /**
   * First calendar/bypass day each eligible line counts toward — used for per-day plant totals on the calendar.
   */
  const dispatchReadySummaryByDay = useMemo(() => {
    const days = new Map();
    for (const row of dashboard?.availableSecondaryInwardLines ?? []) {
      if (!row.dispatchEligible) continue;
      const avail = safeTrunc(row.secondaryInward?.availableQuantity ?? 0);
      if (avail < 1) continue;
      const bypassAt = row.readinessBypassAt ?? row.secondaryInward?.readinessBypassAt;
      let dk;
      if (bypassAt != null && moment(bypassAt).isValid()) {
        dk = moment(bypassAt).format("YYYY-MM-DD");
      } else if (row.expectedReadyByCalendar) {
        dk = moment(row.expectedReadyByCalendar).format("YYYY-MM-DD");
      } else {
        continue;
      }
      if (!days.has(dk)) {
        days.set(dk, { total: 0, byPlant: new Map() });
      }
      const entry = days.get(dk);
      entry.total += avail;
      const pk = row.plantLabel || "—";
      entry.byPlant.set(pk, (entry.byPlant.get(pk) || 0) + avail);
    }
    return days;
  }, [dashboard?.availableSecondaryInwardLines]);

  /** Batches (aggregated) whose dispatch-ready date matches the selected calendar day */
  const selectedDayReadyBatches = useMemo(() => {
    if (!selectedDispatchDay?.isValid?.()) return [];
    const key = selectedDispatchDay.format("YYYY-MM-DD");
    const byBatch = new Map();
    for (const row of dashboard?.availableSecondaryInwardLines ?? []) {
      if (!row.dispatchEligible) continue;
      const avail = safeTrunc(row.secondaryInward?.availableQuantity ?? 0);
      if (avail < 1) continue;
      const bypassAt = row.readinessBypassAt ?? row.secondaryInward?.readinessBypassAt;
      let dk;
      if (bypassAt != null && moment(bypassAt).isValid()) {
        dk = moment(bypassAt).format("YYYY-MM-DD");
      } else if (row.expectedReadyByCalendar) {
        dk = moment(row.expectedReadyByCalendar).format("YYYY-MM-DD");
      } else {
        continue;
      }
      if (dk !== key) continue;
      const bid = String(row.batchId);
      if (!byBatch.has(bid)) {
        byBatch.set(bid, {
          batchId: bid,
          batchNumber: row.batchNumber,
          plantLabel: row.plantLabel,
          subtypeLabel: row.subtypeLabel,
          plants: 0,
        });
      }
      const g = byBatch.get(bid);
      g.plants += avail;
    }
    return [...byBatch.values()].sort((a, b) =>
      String(a.batchNumber || "").localeCompare(String(b.batchNumber || ""), undefined, {
        numeric: true,
      })
    );
  }, [selectedDispatchDay, dashboard?.availableSecondaryInwardLines]);

  const filteredDispatchOutwardRows = useMemo(() => {
    if (!selectedDispatchDay?.isValid?.()) return secondaryOutwardRows;
    const d = selectedDispatchDay.format("YYYY-MM-DD");
    return secondaryOutwardRows.filter(
      (so) => moment(so.secondaryOutwardDate).format("YYYY-MM-DD") === d
    );
  }, [secondaryOutwardRows, selectedDispatchDay]);

  const rowIncomingToPrimaryOutward = (row) =>
    primaryOutwardRows.find(
      (r) =>
        String(r._id) === String(row.primaryOutward?._id) &&
        String(r._batchId) === String(row.batchId)
    );

  const lagwadSelectableRows = useMemo(
    () =>
      primaryOutwardRows.filter(
        (r) =>
          availPlantsPrimaryOutward(r) > 0 &&
          (r.transferStatus ?? "available") !== "fully_transferred" &&
          r.secondaryAcknowledgedAt != null &&
          r.secondarySowingCompletedAt == null
      ),
    [primaryOutwardRows]
  );

  /** Lines waiting for secondary Accept (before Inward / planting) */
  const acceptQueueRows = useMemo(() => {
    const list = incomingFromPrimary || [];
    return list.filter((row) => {
      if (typeof row.needsSecondaryAccept === "boolean") return row.needsSecondaryAccept;
      const ack = row.secondaryAcknowledgedAt ?? row.primaryOutward?.secondaryAcknowledgedAt;
      return ack == null;
    });
  }, [incomingFromPrimary]);

  const lagwadPreview = useMemo(() => {
    const selected = lagwadSelectableRows.filter((r) =>
      lagwadSelectedKeys.has(outwardKey(String(r._batchId), String(r._id)))
    );
    const maxTotal = maxLagwadPlantsFullTrays(selected);
    const req = Math.max(0, safeTrunc(lagwadTotalPlants));
    const clamped = Math.min(req, maxTotal);
    if (selected.length === 0 || clamped < 1) {
      return { allocations: [], maxTotal, requested: req, applied: 0, clamped: 0, budgetRemaining: 0 };
    }
    const { allocations, budgetRemaining } = allocateLagwadFifoFullTrays(selected, clamped);
    const applied = allocations.reduce((s, a) => s + a.plants, 0);
    return { allocations, maxTotal, requested: req, applied, clamped, budgetRemaining };
  }, [lagwadSelectableRows, lagwadSelectedKeys, lagwadTotalPlants]);

  /** FIFO-first batch among selected lines (or first eligible line if none selected): drives dispatch default */
  const lagawdSecondaryPlantReadyDays = useMemo(() => {
    const selected = lagwadSelectableRows.filter((r) =>
      lagwadSelectedKeys.has(outwardKey(String(r._batchId), String(r._id)))
    );
    const rowsForRule = selected.length > 0 ? selected : lagwadSelectableRows;
    if (!rowsForRule.length) return 0;
    const sorted = [...rowsForRule].sort(
      (a, b) => moment(a.primaryOutwardDate).valueOf() - moment(b.primaryOutwardDate).valueOf()
    );
    const bid = sorted[0]._batchId;
    const doc = batches.find((b) => String(b.batchId?._id ?? b.batchId) === String(bid));
    const n = Number(doc?.batchId?.secondaryPlantReadyDays);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [lagwadSelectableRows, lagwadSelectedKeys, batches]);

  useEffect(() => {
    if (!lagwadOpen) return;
    setSecFromPrimaryShared((s) => {
      const inward = s.secondaryInwardDate;
      if (!inward) return s;
      const next = dateOfDispatchFromInwardAndReadyDays(inward, lagawdSecondaryPlantReadyDays);
      if (next === s.dateOfDispatch) return s;
      return { ...s, dateOfDispatch: next };
    });
  }, [lagwadOpen, lagawdSecondaryPlantReadyDays]);

  const runSecondaryInwardPosts = useCallback(async (rows, perRowMap, shared) => {
    if (!shared.pollyhouse) {
      Toast.error("पॉली हाऊस / शेड आवश्यक आहे");
      return false;
    }
    try {
      for (const r of rows) {
        const q = perRowMap[r._id];
        if (!q) continue;
        const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_FROM_PRIMARY_OUTWARD);
        await inst.request(
          {
            primaryOutwardId: r._id,
            secondaryInwardDate: new Date(shared.secondaryInwardDate).toISOString(),
            numberOfBottles: Number(q.numberOfBottles),
            size: r.size,
            cavity: Number(q.cavity),
            numberOfTrays: Number(q.numberOfTrays),
            pollyhouse: shared.pollyhouse,
            laboursEngaged: Number(shared.laboursEngaged),
            remarks: shared.remarks || "To secondary",
            dateOfDispatch: new Date(shared.dateOfDispatch).toISOString(),
          },
          { pathParams: [String(r._batchId)] }
        );
      }
      Toast.success("प्राथमिकाकडून आत झाले · Inward saved");
      await refreshAll();
      return true;
    } catch (err) {
      const msg = String(
        err?.response?.data?.message || err?.message || err?.data?.message || ""
      );
      if (msg.includes("secondary_accept_required")) {
        Toast.error("आधी Accept टॅबवरून दुय्यम स्वीकार करा");
      } else {
        Toast.error(msg || "हस्तांतरण अयशस्वी");
      }
      return false;
    }
  }, [refreshAll]);

  const apiErrText = (e) =>
    String(e?.response?.data?.message || e?.message || e?.data?.message || "");

  const submitReadinessBypass = useCallback(async () => {
    if (!bypassTarget?._id) return;
    setBypassSubmitting(true);
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_READINESS_BYPASS);
      await inst.request(
        { reason: bypassReason },
        { pathParams: [String(bypassTarget._batchId), String(bypassTarget._id)] }
      );
      Toast.success("Marked ready for dispatch");
      setBypassOpen(false);
      setBypassTarget(null);
      setBypassReason("");
      await refreshAll();
    } catch (e) {
      Toast.error(apiErrText(e));
    } finally {
      setBypassSubmitting(false);
    }
  }, [bypassTarget, bypassReason, refreshAll]);

  const confirmSecondaryAccept = useCallback(async () => {
    const po = acceptTargetPo;
    if (!po?._id || !po._batchId) return;
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_ACKNOWLEDGE_PRIMARY_OUTWARD);
      await inst.request({}, { pathParams: [String(po._batchId), String(po._id)] });
      Toast.success("दुय्यम स्वीकार नोंदला · Ready for Inward");
      setAcceptEnglishOpen(false);
      setAcceptTargetPo(null);
      await refreshAll();
    } catch (e) {
      Toast.error(apiErrText(e) || "स्वीकार अयशस्वी");
    }
  }, [acceptTargetPo, refreshAll]);

  const openMortalityForPo = useCallback((po) => {
    setMortalityTarget(po);
    const max = availPlantsPrimaryOutward(po);
    setMortalityQty(max > 0 ? String(max) : "");
    setMortalityRemarks("");
    setMortalityOpen(true);
  }, []);

  const resolvePoBatchId = (po) => {
    if (!po) return "";
    const raw = po._batchId ?? po.batchId;
    if (raw && typeof raw === "object" && raw._id) return String(raw._id);
    return raw != null ? String(raw) : "";
  };

  const submitSecondaryMortality = useCallback(async () => {
    const po = mortalityTarget;
    const qty = safeTrunc(mortalityQty);
    const max = po ? availPlantsPrimaryOutward(po) : 0;
    if (!po?._id || qty < 1) {
      Toast.error("Enter a valid quantity");
      return;
    }
    if (qty > max) {
      Toast.error(`Cannot exceed remaining plants (${max.toLocaleString("en-IN")})`);
      return;
    }
    const batchIdStr = resolvePoBatchId(po);
    if (!batchIdStr) {
      Toast.error("Batch id missing — refresh and try again");
      return;
    }
    setMortalitySubmitting(true);
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_PRIMARY_OUTWARD_MORTALITY);
      await inst.request(
        { quantity: qty, remarks: mortalityRemarks },
        { pathParams: [batchIdStr, String(po._id)] }
      );
      Toast.success("Mortality recorded");
      setMortalityOpen(false);
      setMortalityTarget(null);
      setMortalityQty("");
      setMortalityRemarks("");
      await refreshAll();
    } catch (e) {
      Toast.error(apiErrText(e));
    } finally {
      setMortalitySubmitting(false);
    }
  }, [mortalityTarget, mortalityQty, mortalityRemarks, refreshAll]);

  const markSecondarySowingDone = useCallback(
    async (po) => {
      if (!po?._id) return;
      const batchIdStr = resolvePoBatchId(po);
      if (!batchIdStr) {
        Toast.error("Batch id missing — refresh and try again");
        return;
      }
      try {
        const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_PRIMARY_OUTWARD_SOWING_COMPLETE);
        await inst.request({}, { pathParams: [batchIdStr, String(po._id)] });
        Toast.success("लागवड पूर्ण नोंदली · Sowing marked complete");
        setSowingDoneConfirmOpen(false);
        setSowingDoneTargetPo(null);
        await refreshAll();
      } catch (e) {
        Toast.error(apiErrText(e));
      }
    },
    [refreshAll]
  );

  const submitLagwadMulti = async (e) => {
    e.preventDefault();
    const { allocations, requested } = lagwadPreview;
    if (!lagwadSelectedKeys.size) {
      Toast.error("एक किंवा अधिक ओळी निवडा · Select one or more lines");
      return;
    }
    if (requested < 1) {
      Toast.error("लागवड रोपांची संख्या टाका · Enter plants to plant");
      return;
    }
    if (!allocations.length) {
      Toast.error("वाटप शून्य · Nothing to allocate (check cavities / availability)");
      return;
    }
    const perRowMap = {};
    for (const a of allocations) {
      const r = a.row;
      const plants = a.plants;
      perRowMap[r._id] = {
        numberOfBottles: Math.min(Math.max(1, safeTrunc(r.numberOfBottles) || 1), plants),
        cavity: a.cavity,
        numberOfTrays: a.trays,
      };
    }
    const rows = allocations.map((a) => a.row);
    const ok = await runSecondaryInwardPosts(rows, perRowMap, secFromPrimaryShared);
    if (ok) {
      setLagwadOpen(false);
      setLagwadSelectedKeys(new Set());
      setLagwadTotalPlants("");
    }
  };

  const toggleLagwadSel = useCallback(
    (batchId, id) => {
      const k = outwardKey(String(batchId), String(id));
      const row = lagwadSelectableRows.find(
        (r) => outwardKey(String(r._batchId), String(r._id)) === k
      );
      if (!row) return;

      setLagwadSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(k)) {
          next.delete(k);
          return next;
        }
        const selectedRows = lagwadSelectableRows.filter((r) =>
          next.has(outwardKey(String(r._batchId), String(r._id)))
        );
        if (!lagawdRowCompatibleWithSelection(row, selectedRows)) {
          Toast.error(
            "Same batch only. R1+R2 can plant together; R3 only with R3 — not mixed."
          );
          return prev;
        }
        next.add(k);
        return next;
      });
    },
    [lagwadSelectableRows]
  );

  const openLagwadDialog = () => {
    const pendingAck = primaryOutwardRows.filter(
      (r) =>
        availPlantsPrimaryOutward(r) > 0 &&
        (r.transferStatus ?? "available") !== "fully_transferred" &&
        r.secondaryAcknowledgedAt == null
    );
    if (pendingAck.length > 0 && !lagwadSelectableRows.length) {
      Toast.error("आधी Accept टॅबवरून ओळी स्वीकारा · Accept lines on Accept tab first");
      return;
    }
    if (!lagwadSelectableRows.length) {
      Toast.error("प्राथमिक बाहेर कोणतीही ओळ उपलब्ध नाही");
      return;
    }
    setLagwadOpen(true);
  };

  /** Primary-style: from Accept tab, open New planting with one acknowledged line + plants prefilled */
  const openLagwadPrefilledFromAcceptedLine = useCallback((po) => {
    if (!po?._id || !po._batchId) return;
    const avail = availPlantsPrimaryOutward(po);
    if (avail < 1) {
      Toast.error("No plants left on this line.");
      return;
    }
    if (po.secondaryAcknowledgedAt == null) {
      Toast.error("आधी Accept करा · Accept this line on incoming first");
      return;
    }
    const k = outwardKey(String(po._batchId), String(po._id));
    setLagwadSelectedKeys(new Set([k]));
    const maxFullTrayPlants = maxLagwadPlantsFullTrays([po]);
    setLagwadTotalPlants(maxFullTrayPlants > 0 ? String(maxFullTrayPlants) : "");
    setTab(1);
    setLagwadOpen(true);
  }, []);

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
    const batchIds = [...new Set(chosen.map((r) => String(r._batchId)))];
    if (batchIds.length !== 1) {
      Toast.error("Select secondary inward lines from one batch only — each dispatch needs one farmer order per batch.");
      return;
    }
    const batchDocFor = (r) =>
      batches.find((b) => String(b.batchId?._id ?? b.batchId) === String(r._batchId));
    for (const r of chosen) {
      const meta = resolveSecondaryDispatchMeta(r, batchDocFor(r));
      if (!meta.dispatchEligible) {
        Toast.error(
          "One or more lines are not ready for dispatch yet. Use Mark ready (override) or wait until the expected date."
        );
        return;
      }
    }
    setSelectedSecInwardKeys(
      new Set(chosen.map((r) => secInwardKey(String(r._batchId), String(r._id))))
    );
    setSecOutPerRow(buildSecOutPerRow(chosen));
    setSecOutLinkedOrder(null);
    setSecOutOrdersList([]);
    setSecOutDialogOpen(true);

    const bid = batchIds[0];
    (async () => {
      setSecOutOrdersLoading(true);
      try {
        const orders = await fetchOrdersReadyForBatch(bid);
        setSecOutOrdersList(orders);
        if (
          dispatchTabOrderPick &&
          dispatchTabBatch &&
          String(dispatchTabBatch.batchId) === String(bid) &&
          orders.some((o) => String(o._id) === String(dispatchTabOrderPick._id))
        ) {
          setSecOutLinkedOrder(orders.find((o) => String(o._id) === String(dispatchTabOrderPick._id)));
        }
      } catch (e) {
        Toast.error(e?.message || "Failed to load orders for this batch");
        setSecOutOrdersList([]);
      } finally {
        setSecOutOrdersLoading(false);
      }
    })();
  };

  const submitSecOutMulti = async (e) => {
    e.preventDefault();
    const sel = secondaryInwardRows.filter((r) =>
      selectedSecInwardKeys.has(secInwardKey(String(r._batchId), String(r._id)))
    );
    const batchDocFor = (r) =>
      batches.find((b) => String(b.batchId?._id ?? b.batchId) === String(r._batchId));
    for (const r of sel) {
      const meta = resolveSecondaryDispatchMeta(r, batchDocFor(r));
      if (!meta.dispatchEligible) {
        Toast.error(
          "One or more lines are not ready for dispatch yet. Use Mark ready (override) or wait until the expected date."
        );
        return;
      }
    }
    if (!secOutShared.pollyhouse) {
      Toast.error("Pollyhouse / shade is required");
      return;
    }
    if (!secOutLinkedOrder?._id) {
      Toast.error("Select a farmer order (READY_FOR_DISPATCH) for this batch");
      return;
    }
    const totalQty = sel.reduce((sum, r) => {
      const q = secOutPerRow[r._id];
      if (!q) return sum;
      const cav = Math.max(1, safeTrunc(q.cavity));
      const tr = Math.max(1, safeTrunc(q.numberOfTrays));
      return sum + cav * tr;
    }, 0);
    if (totalQty > Number(secOutLinkedOrder.remainingPlants)) {
      Toast.error(
        `Total plants (${totalQty}) exceeds order remaining (${secOutLinkedOrder.remainingPlants})`
      );
      return;
    }
    try {
      let orderRemaining = Number(secOutLinkedOrder.remainingPlants);
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_TO_OUTWARD_NS);
      for (const r of sel) {
        const q = secOutPerRow[r._id];
        if (!q) continue;
        const cav = Math.max(1, safeTrunc(q.cavity));
        const tr = Math.max(1, safeTrunc(q.numberOfTrays));
        const lineQty = cav * tr;
        if (lineQty > orderRemaining) {
          Toast.error(
            `Line quantity (${lineQty}) exceeds order remaining (${orderRemaining}) after earlier lines`
          );
          return;
        }
        await inst.request(
          {
            secondaryInwardId: r._id,
            secondaryOutwardDate: new Date(secOutShared.secondaryOutwardDate).toISOString(),
            numberOfBottles: Number(q.numberOfBottles),
            size: r.size,
            cavity: cav,
            numberOfTrays: tr,
            pollyhouse: secOutShared.pollyhouse,
            laboursEngaged: Number(secOutShared.laboursEngaged),
            remarks: secOutShared.remarks || "",
            linkedOrderId: secOutLinkedOrder._id,
          },
          { pathParams: [String(r._batchId)] }
        );
        orderRemaining -= lineQty;
      }
      Toast.success("Dispatch recorded");
      setSecOutDialogOpen(false);
      setSelectedSecInwardKeys(new Set());
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Secondary outward failed");
    }
  };

  const openVehicleFulfillment = (item) => {
    setAllocationPayload(null);
    setVehicleFulfillmentDispatch(item);
    setPlantRowIndex(0);
    setVehicleFulfillmentBatchId("");
    setVehicleFulfillmentQtyByLineId({});
    setVehicleFulfillmentPhotos([]);
    setVehicleFulfillmentOpen(true);
  };

  useEffect(() => {
    if (!vehicleFulfillmentOpen || !vehicleFulfillmentDispatch?._id) return undefined;
    loadAllocationForDispatch(vehicleFulfillmentDispatch._id, plantRowIndex, vehicleFulfillmentBatchId);
    return undefined;
  }, [
    vehicleFulfillmentOpen,
    vehicleFulfillmentDispatch?._id,
    plantRowIndex,
    vehicleFulfillmentBatchId,
    loadAllocationForDispatch,
  ]);

  useEffect(() => {
    if (!vehicleFulfillmentOpen) return;
    setVehicleFulfillmentQtyByLineId({});
  }, [plantRowIndex, vehicleFulfillmentOpen, vehicleFulfillmentBatchId]);

  /** Full FIFO list from the server for this vehicle plant row (no client-side filtering). */
  const vehicleFulfillmentAllocationLines = useMemo(
    () => allocationPayload?.suggestions ?? [],
    [allocationPayload]
  );

  /** Prefer API `batches`; else dedupe from `suggestions` so the picker works if `batches` is missing. */
  const vehicleFulfillmentBatchOptions = useMemo(() => {
    const raw = allocationPayload?.batches;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((b) => ({
        batchId: String(b.batchId),
        batchNumber: b.batchNumber != null ? String(b.batchNumber) : "",
      }));
    }
    const sug = allocationPayload?.suggestions ?? [];
    const byId = new Map();
    for (const s of sug) {
      if (s.batchId == null) continue;
      const id = String(s.batchId);
      if (!byId.has(id)) {
        byId.set(id, {
          batchId: id,
          batchNumber: s.batchNumber != null ? String(s.batchNumber) : "",
        });
      }
    }
    return Array.from(byId.values());
  }, [allocationPayload]);

  const submitVehicleFulfillment = async (e) => {
    e?.preventDefault?.();
    if (!vehicleFulfillmentDispatch?._id) return;
    const lines = vehicleFulfillmentAllocationLines;
    const picked = lines.filter((ln) => {
      const q = Number(vehicleFulfillmentQtyByLineId[String(ln.secondaryInwardId)] || 0);
      return q >= 1;
    });
    if (!picked.length) {
      Toast.error("Enter plants to pull on at least one plantation line");
      return;
    }
    const orderIdx = new Map(lines.map((ln, idx) => [String(ln.secondaryInwardId), idx]));
    picked.sort(
      (a, b) =>
        (orderIdx.get(String(a.secondaryInwardId)) ?? 0) -
        (orderIdx.get(String(b.secondaryInwardId)) ?? 0)
    );
    let evidenceUrls = [];
    if (vehicleFulfillmentPhotos.length > 0) {
      try {
        evidenceUrls = await uploadEvidenceFiles(vehicleFulfillmentPhotos);
      } catch (err) {
        Toast.error(err?.message || "Photo upload failed");
        return;
      }
    }
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_TO_OUTWARD_NS);
      let fulfillmentSeq = 1;
      const outDate = moment().format("YYYY-MM-DD");
      for (const ln of picked) {
        const want = Number(vehicleFulfillmentQtyByLineId[String(ln.secondaryInwardId)] || 0);
        const cav = Math.max(1, safeTrunc(ln.cavity));
        const cap = Math.min(want, ln.availableQuantity);
        const trays = Math.floor(cap / cav);
        if (trays < 1) {
          Toast.error(`Need at least ${cav} plants per tray for batch ${ln.batchNumber}`);
          return;
        }
        const actualQty = cav * trays;
        const linePolly = String(ln.pollyhouse || "").trim();
        await inst.request(
          {
            secondaryInwardId: ln.secondaryInwardId,
            secondaryOutwardDate: new Date(outDate).toISOString(),
            numberOfBottles: Math.min(Number(ln.numberOfBottles) || 1, actualQty),
            size: ln.size,
            cavity: cav,
            numberOfTrays: trays,
            pollyhouse: linePolly,
            laboursEngaged: 1,
            remarks: "",
            linkedDispatchId: vehicleFulfillmentDispatch._id,
            linkedDispatchPlantRowIndex: plantRowIndex,
            dispatchFulfillmentSequence: fulfillmentSeq,
            evidencePhotoUrls: evidenceUrls,
          },
          { pathParams: [String(ln.batchId)] }
        );
        fulfillmentSeq += 1;
      }
      Toast.success("Vehicle dispatch pickup recorded");
      setVehicleFulfillmentOpen(false);
      setVehicleFulfillmentDispatch(null);
      setVehicleFulfillmentBatchId("");
      setAllocationPayload(null);
      refreshAll();
    } catch (err) {
      Toast.error(err?.message || "Failed to record outward");
    }
  };

  const openVehicleDriverEdit = async (item) => {
    setVehicleDriverEditId(item._id);
    setFleetSelectedOwnerId("");
    setFleetDriverId("");
    setFleetVehicleId("");
    setFleetDrivers([]);
    setFleetVehicles([]);
    setFleetListsLoading(true);
    try {
      const owners = await loadFleetOwners();
      setFleetOwners(owners);
      const inst = NetworkManager(API.DISPATCHED.GET_BY_ID);
      const res = await inst.request({}, { pathParams: [String(item._id)] });
      const raw = res?.data?.data ?? res?.data;
      const disp = raw?.data ?? raw;

      const bootstrapFleet = async (ownerId) => {
        const { drivers, vehicles } = await loadFleetForOwner(ownerId);
        setFleetDrivers(drivers);
        setFleetVehicles(vehicles);
        const dName = String(disp?.driverName || "").trim();
        const vName = String(disp?.vehicleName || "").trim();
        const matchDriver =
          drivers.find((d) => formatFleetDriverLabel(d) === dName) ||
          drivers.find((d) => dName.startsWith(String(d.name || "").trim()));
        const matchVehicle =
          vehicles.find((v) => String(v.name || "").trim() === vName) ||
          vehicles.find(
            (v) =>
              String(v.number || v.vehicleNumber || "").trim() ===
              String(disp?.vehicleNumber || "").trim()
          );
        if (matchDriver) setFleetDriverId(getFleetDriverId(matchDriver));
        if (matchVehicle) setFleetVehicleId(getFleetDriverId(matchVehicle));
      };

      if (owners.length === 1) {
        const oid = getFleetDriverId(owners[0]);
        setFleetSelectedOwnerId(oid);
        await bootstrapFleet(oid);
      } else {
        for (const o of owners) {
          const oid = getFleetDriverId(o);
          const { drivers, vehicles } = await loadFleetForOwner(oid);
          const dName = String(disp?.driverName || "").trim();
          const hit =
            drivers.some((d) => formatFleetDriverLabel(d) === dName) ||
            drivers.some((d) => dName.includes(String(d.name || "").trim()));
          if (hit) {
            setFleetSelectedOwnerId(oid);
            setFleetDrivers(drivers);
            setFleetVehicles(vehicles);
            const matchDriver =
              drivers.find((dd) => formatFleetDriverLabel(dd) === dName) ||
              drivers.find((dd) => dName.startsWith(String(dd.name || "").trim()));
            const vName = String(disp?.vehicleName || "").trim();
            const matchVehicle =
              vehicles.find((v) => String(v.name || "").trim() === vName) ||
              vehicles.find(
                (v) =>
                  String(v.number || v.vehicleNumber || "").trim() ===
                  String(disp?.vehicleNumber || "").trim()
              );
            if (matchDriver) setFleetDriverId(getFleetDriverId(matchDriver));
            if (matchVehicle) setFleetVehicleId(getFleetDriverId(matchVehicle));
            break;
          }
        }
      }
      setVehicleDriverEditOpen(true);
    } catch (e) {
      Toast.error(e?.message || "Could not load dispatch / fleet");
    } finally {
      setFleetListsLoading(false);
    }
  };

  const onFleetOwnerChange = async (ownerId) => {
    setFleetSelectedOwnerId(ownerId);
    setFleetDriverId("");
    setFleetVehicleId("");
    if (!ownerId) {
      setFleetDrivers([]);
      setFleetVehicles([]);
      return;
    }
    setFleetListsLoading(true);
    try {
      const { drivers, vehicles } = await loadFleetForOwner(ownerId);
      setFleetDrivers(drivers);
      setFleetVehicles(vehicles);
      if (drivers.length === 1) setFleetDriverId(getFleetDriverId(drivers[0]));
      if (vehicles.length === 1) setFleetVehicleId(getFleetDriverId(vehicles[0]));
    } finally {
      setFleetListsLoading(false);
    }
  };

  const saveVehicleDriverEdit = async (e) => {
    e.preventDefault();
    if (!vehicleDriverEditId) return;
    const driver = fleetDrivers.find((d) => getFleetDriverId(d) === fleetDriverId);
    const vehicle = fleetVehicles.find((v) => getFleetDriverId(v) === fleetVehicleId);
    if (!driver || !vehicle) {
      Toast.error("Select owner, driver, and vehicle");
      return;
    }
    setVehicleDriverSaving(true);
    try {
      const inst = NetworkManager(API.DISPATCHED.UPDATE_DISPATCH);
      await inst.request(
        {
          driverName: formatFleetDriverLabel(driver),
          driverMobile:
            driver?.mobile?.toString?.() || driver?.phoneNumber?.toString?.() || "",
          vehicleName: vehicle?.name || "",
          vehicleNumber: String(vehicle?.number ?? vehicle?.vehicleNumber ?? "").trim(),
          vehicleId: fleetVehicleId || null,
          driverId: fleetDriverId || null,
          ownerId: fleetSelectedOwnerId || null,
        },
        { pathParams: [String(vehicleDriverEditId)] }
      );
      Toast.success("Dispatch updated");
      setVehicleDriverEditOpen(false);
      loadVehicleDispatches(vehicleDispatchesPage);
    } catch (e) {
      Toast.error(e?.message || "Update failed");
    } finally {
      setVehicleDriverSaving(false);
    }
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

  const acceptTargetPlantMeta = acceptTargetPo
    ? batchPlantSubtypeLabelFromList(batches, acceptTargetPo._batchId)
    : { plant: "—", subtype: "—" };

  const renderDispatchCalendarDay = useCallback(
    (props) => {
      const { day, outsideCurrentMonth, ...other } = props;
      if (outsideCurrentMonth) {
        return (
          <PickersDay day={day} outsideCurrentMonth {...other} />
        );
      }
      const key = day.format("YYYY-MM-DD");
      const hasOut = calendarOutwardDaySet.has(key);
      const hasAuto = calendarAutoReadyDaySet.has(key);
      const hasMark = markReadyDaySet.has(key);
      const daySummary = dispatchReadySummaryByDay.get(key);
      const readyTotal = daySummary?.total ?? 0;
      const plantLines =
        daySummary?.byPlant && daySummary.byPlant.size > 0
          ? [...daySummary.byPlant.entries()]
              .map(([plant, n]) => `${plant}: ${n.toLocaleString("en-IN")}`)
              .join("\n")
          : "";
      const tip =
        readyTotal > 0
          ? `Ready for dispatch: ${readyTotal.toLocaleString("en-IN")} plants\n${plantLines || ""}`.trim()
          : hasOut
            ? "Outward recorded this day"
            : hasAuto
              ? "Calendar-ready (auto)"
              : hasMark
                ? "Mark ready (override)"
                : "";

      const inner = (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            width: "100%",
            minHeight: 56,
            py: 0.25,
          }}
        >
          <PickersDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            sx={{
              m: 0,
              ...(hasOut && {
                borderBottom: "3px solid",
                borderColor: "secondary.main",
              }),
              ...(!hasOut &&
                hasAuto && {
                  borderBottom: "3px solid",
                  borderColor: "success.main",
                }),
              ...(!hasOut &&
                !hasAuto &&
                hasMark && {
                  borderBottom: "3px solid",
                  borderColor: "warning.main",
                }),
            }}
          />
          {readyTotal > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                lineHeight: 1.1,
                color: "success.dark",
                maxWidth: "100%",
                textAlign: "center",
                px: 0.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {readyTotal.toLocaleString("en-IN")}
            </Typography>
          )}
        </Box>
      );

      return tip ? (
        <Tooltip title={<Box sx={{ whiteSpace: "pre-line", typography: "caption" }}>{tip}</Box>} enterTouchDelay={0}>
          {inner}
        </Tooltip>
      ) : (
        inner
      );
    },
    [
      calendarOutwardDaySet,
      calendarAutoReadyDaySet,
      markReadyDaySet,
      dispatchReadySummaryByDay,
    ]
  );

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
        {tab === 0 && (
          <>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, px: 0.5 }}>
              Accept from primary
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: "block", px: 0.5 }}>
              Acknowledge incoming lines above. Acknowledged stock appears below — tap <strong>Sow</strong> to open
              planting prefilled, or use <strong>Inward</strong> → New planting.
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75, px: 0.5 }}>
              Waiting for accept ({acceptQueueRows.length})
            </Typography>
            {acceptQueueRows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nothing waiting — accept each primary outward line here before Inward, or all lines are already acknowledged.
              </Typography>
            )}
            {acceptQueueRows.map((row) => {
              const po = rowIncomingToPrimaryOutward(row);
              const p = po || row.primaryOutward;
              const batchDoc = batches.find(
                (b) => String(b.batchId?._id ?? b.batchId) === String(row.batchId)
              );
              const listLabels = batchPlantSubtypeLabelFromList(batches, row.batchId);
              const inPlant = row.plantLabel ?? listLabels.plant;
              const inSubtype = row.subtypeLabel ?? listLabels.subtype;
              const sourcePi =
                po && batchDoc ? resolveSourcePrimaryInwardForOutward(batchDoc, po) : null;
              const lab =
                sourcePi?.sourceLabId && batchDoc
                  ? labLineSummary(batchDoc, sourcePi.sourceLabId)
                  : null;
              const canAccept =
                po &&
                availPlantsPrimaryOutward(po) > 0 &&
                (po.transferStatus ?? "available") !== "fully_transferred";
              const acceptTrays = po ? fullTraysAvailablePrimaryOutward(po) : 0;
              const acceptPlants = po ? availPlantsPrimaryOutward(po) : 0;
              return (
                <Card
                  key={`${row.batchId}-${row.primaryOutward?._id}`}
                  sx={{
                    mb: 1.35,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
                      px: 1.15,
                      py: 1,
                      background: (t) =>
                        `linear-gradient(135deg, ${alpha(t.palette.secondary.main, 0.2)} 0%, ${alpha(t.palette.secondary.light, 0.08)} 100%)`,
                      borderBottom: "2px solid",
                      borderColor: (t) => alpha(t.palette.secondary.main, 0.35),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                          Batch
                        </Typography>
                        <Typography fontWeight={800} sx={{ fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
                          {row.batchNumber}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                          <Chip size="small" variant="outlined" label={inPlant} sx={{ fontWeight: 700 }} />
                          <Chip size="small" variant="outlined" color="secondary" label={inSubtype} />
                        </Stack>
                      </Box>
                      <Chip
                        size="small"
                        label={p?.size ?? "—"}
                        color="secondary"
                        variant="filled"
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>
                    <Box
                      sx={{
                        mt: 1,
                        px: 1,
                        py: 0.75,
                        borderRadius: 2,
                        bgcolor: (t) => alpha(t.palette.common.white, 0.85),
                        border: "1px solid",
                        borderColor: (t) => alpha(t.palette.secondary.dark, 0.25),
                        boxShadow: (t) => `0 2px 10px ${alpha(t.palette.secondary.main, 0.12)}`,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                        alignItems: "stretch",
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                          Trays
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "1.65rem",
                            fontWeight: 900,
                            lineHeight: 1.1,
                            fontVariantNumeric: "tabular-nums",
                            color: "secondary.dark",
                          }}
                        >
                          {acceptTrays.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                          Plants
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "1.65rem",
                            fontWeight: 900,
                            lineHeight: 1.1,
                            fontVariantNumeric: "tabular-nums",
                            color: "secondary.dark",
                          }}
                        >
                          {acceptPlants.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1", mt: -0.25 }}>
                        cavity {safeTrunc(p?.cavity ?? 0)}
                      </Typography>
                    </Box>
                  </Box>
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Typography variant="overline" sx={{ fontSize: "0.58rem", fontWeight: 800, color: "text.secondary" }}>
                      Timeline
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.75, mb: 1.25 }}>
                      <Typography variant="caption" sx={{ lineHeight: 1.45 }}>
                        <strong>Lab out</strong> · {formatStageDate(lab?.outwardDate)} · {lab ? `${lab.bottles} bt · ${lab.plants} pl` : "—"}
                      </Typography>
                      <Typography variant="caption" sx={{ lineHeight: 1.45 }}>
                        <strong>Primary inward</strong> · {formatStageDate(sourcePi?.primaryInwardDate)}
                      </Typography>
                      <Typography variant="caption" sx={{ lineHeight: 1.45 }}>
                        <strong>Primary outward</strong> · {formatStageDate(po?.primaryOutwardDate)}
                      </Typography>
                    </Stack>
                    <Button
                      fullWidth
                      size="medium"
                      variant="contained"
                      color="secondary"
                      disabled={!canAccept}
                      startIcon={<CheckCircle />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (po) {
                          setAcceptTargetPo(po);
                          setAcceptEnglishOpen(true);
                        }
                      }}
                    >
                      Accept
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.75, px: 0.5 }}>
              Acknowledged — ready to sow ({lagwadSelectableRows.length})
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: "block", px: 0.5 }}>
              Tap <strong>Sow</strong> for planting (prefilled). <strong>Sowing done</strong> when nothing remains.
              <strong> Mortality</strong> records loss (updates remaining). Multi-select in New planting:{" "}
              <strong>same batch</strong> only — <strong>R1+R2</strong> together, <strong>R3</strong> separate from R1/R2.
            </Typography>
            {lagwadSelectableRows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
                Nothing here yet — after you <strong>Accept</strong> an incoming line, it shows here for sowing.
              </Typography>
            )}
            {lagwadSelectableRows.map((po) => {
              const sowLabels = batchPlantSubtypeLabelFromList(batches, po._batchId);
              const sowTrays = fullTraysAvailablePrimaryOutward(po);
              const sowPlants = availPlantsPrimaryOutward(po);
              const mortSum = secondaryMortalityRecordedTotal(po);
              return (
                <Card
                  key={`sow-${po._batchId}-${po._id}`}
                  sx={{
                    mb: 1.25,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: (t) => alpha(t.palette.success.main, 0.45),
                    bgcolor: (t) => alpha(t.palette.success.main, 0.06),
                  }}
                >
                  <Box sx={{ px: 1.15, py: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          Batch
                        </Typography>
                        <Typography fontWeight={800} sx={{ fontSize: "1.12rem" }}>
                          {po.batchNumber}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                          <Chip size="small" variant="outlined" label={sowLabels.plant} sx={{ fontWeight: 700 }} />
                          <Chip size="small" variant="outlined" color="secondary" label={sowLabels.subtype} />
                        </Stack>
                      </Box>
                      <Chip size="small" label={po.size ?? "—"} color="success" variant="filled" sx={{ fontWeight: 800 }} />
                    </Stack>
                    <Stack spacing={0.35} sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                        <strong>Accepted (secondary)</strong> · {formatStageDate(po.secondaryAcknowledgedAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                        <strong>Primary outward</strong> · {formatStageDate(po.primaryOutwardDate)}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        mt: 1,
                        px: 1,
                        py: 0.75,
                        borderRadius: 2,
                        bgcolor: (t) => alpha(t.palette.common.white, 0.9),
                        border: "1px solid",
                        borderColor: "divider",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                          Remaining · trays
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "1.35rem",
                            fontWeight: 900,
                            fontVariantNumeric: "tabular-nums",
                            color: "success.dark",
                          }}
                        >
                          {sowTrays.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                          Remaining · plants
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "1.35rem",
                            fontWeight: 900,
                            fontVariantNumeric: "tabular-nums",
                            color: "success.dark",
                          }}
                        >
                          {sowPlants.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
                        cavity {safeTrunc(po.cavity ?? 0)}
                        {mortSum > 0 ? ` · mortality logged ${mortSum.toLocaleString("en-IN")}` : ""}
                      </Typography>
                    </Box>
                    <Button
                      fullWidth
                      sx={{ mt: 1.25 }}
                      size="medium"
                      variant="contained"
                      color="success"
                      startIcon={<InwardIcon />}
                      onClick={() => openLagwadPrefilledFromAcceptedLine(po)}
                    >
                      Sow
                    </Button>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<SowingDoneIcon />}
                        disabled={sowPlants > 0}
                        onClick={() => {
                          setSowingDoneTargetPo(po);
                          setSowingDoneConfirmOpen(true);
                        }}
                      >
                        Sowing done
                      </Button>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<MortalityIcon />}
                        disabled={sowPlants < 1}
                        onClick={() => openMortalityForPo(po)}
                      >
                        Mortality
                      </Button>
                    </Stack>
                    {sowPlants > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", lineHeight: 1.45 }}>
                        शिल्लक शून्य होईपर्यंत लागवड किंवा <strong>Mortality</strong> ने नुकसान नोंदवा.{" "}
                        <strong>Sowing done</strong> हे केवळ टप्पा पूर्ण करते — उर्वरित रोपांना आपोआप मृत्यू म्हणून कापत नाही.
                      </Typography>
                    )}
                  </Box>
                </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Next {Number(dashboard?.windowDays) || SECONDARY_PLANT_READY_WINDOW_DAYS} days — plant-ready window
            </Typography>
            {upcomingSecondaryMilestones.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No secondary-stage milestones in this window.
              </Typography>
            )}
            {upcomingSecondaryMilestones.map((m) => {
              const mList = batchPlantSubtypeLabelFromList(batches, m.batchId);
              const umPlant = m.plantLabel ?? mList.plant;
              const umSubtype = m.subtypeLabel ?? mList.subtype;
              return (
              <Card key={String(m.batchId)} sx={{ mb: 1, borderRadius: 2 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography fontWeight={700}>{m.batchNumber}</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                    <Chip size="small" variant="outlined" label={umPlant} />
                    <Chip size="small" variant="outlined" color="secondary" label={umSubtype} />
                  </Stack>
                  <Typography variant="caption" display="block">
                    Sowing {m.anchorSowingDate}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    <Chip size="small" label={`Secondary in ${m.daysToSecondary}d`} color="secondary" variant="outlined" />
                  </Stack>
                </CardContent>
              </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Expected secondary inward / outward (window)
            </Typography>
            {upcomingSecIn.slice(0, 5).map((u) => {
              const uList = batchPlantSubtypeLabelFromList(batches, u.batchId);
              const usiP = u.plantLabel ?? uList.plant;
              const usiS = u.subtypeLabel ?? uList.subtype;
              return (
              <Typography key={u.secondaryInward?._id} variant="caption" display="block">
                {u.batchNumber} · {usiP} · {usiS} · in {moment(u.expectedDate).format("DD MMM")}
              </Typography>
              );
            })}
            {upcomingSecOut.slice(0, 5).map((u) => {
              const uList = batchPlantSubtypeLabelFromList(batches, u.batchId);
              const usoP = u.plantLabel ?? uList.plant;
              const usoS = u.subtypeLabel ?? uList.subtype;
              return (
              <Typography key={u.secondaryOutward?._id} variant="caption" display="block">
                {u.batchNumber} · {usoP} · {usoS} · out {moment(u.expectedDate).format("DD MMM")}
              </Typography>
              );
            })}
          </>
        )}

        {tab === 1 && (
          <>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5, px: 0.5 }}>
              Inward (secondary shed)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, display: "block", px: 0.5 }}>
              Tap <strong>+ New planting</strong> to record receive-from-primary (FIFO full trays). Select secondary inward lines below, then{" "}
              <strong>Record dispatch</strong>.
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Secondary inward ({secondaryInwardRows.length})
            </Typography>
            {secondaryInwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No inward yet — acknowledge lines on <strong>Accept</strong>, then use <strong>+ New planting</strong>.
              </Typography>
            )}
            {secondaryInwardRows.map((si) => {
              const { plant: siPlant, subtype: siSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                si._batchId
              );
              const batchDoc = batches.find(
                (b) => String(b.batchId?._id ?? b.batchId) === String(si._batchId)
              );
              const pr = resolvePlantReady(
                plantReadyByBatch,
                plantReadyByBatchIdMap,
                si.batchNumber,
                si._batchId
              );
              const meta = resolveSecondaryDispatchMeta(si, batchDoc);
              const expectedLabel = meta.expectedReadyByCalendar
                ? moment(meta.expectedReadyByCalendar).format("DD MMM YYYY")
                : "—";
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
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                          <Chip size="small" variant="outlined" label={siPlant} sx={{ fontWeight: 700 }} />
                          <Chip size="small" variant="outlined" color="secondary" label={siSubtype} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {si.size} · {avail}/{si.totalQuantity} plants avail
                        </Typography>
                        <BatchAvailReadyStrip
                          avail={avail}
                          total={si.totalQuantity}
                          readyState={meta.readyState}
                          expectedReadyLabel={expectedLabel}
                          plantedOnLabel={moment(si.secondaryInwardDate).format("DD MMM YYYY")}
                          pr={pr}
                          theme={theme}
                        />
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }} alignItems="center">
                          <Chip
                            size="small"
                            icon={<Today sx={{ fontSize: 14 }} />}
                            label={moment(si.secondaryInwardDate).format("DD MMM YYYY")}
                            variant="outlined"
                          />
                          <Tooltip
                            title={
                              !canSel
                                ? "No stock on this line"
                                : !meta.dispatchEligible
                                  ? `Not ready until ${expectedLabel} (or use Mark ready)`
                                  : "Open dispatch for this line"
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                variant="contained"
                                color="secondary"
                                disabled={!canSel || !meta.dispatchEligible}
                                startIcon={<DispatchTabIcon sx={{ fontSize: 18 }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canSel) openSecOutDialog([si]);
                                }}
                                sx={{ textTransform: "none" }}
                              >
                                Dispatch
                              </Button>
                            </span>
                          </Tooltip>
                          {canSel && !meta.dispatchEligible && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBypassTarget(si);
                                setBypassReason("");
                                setBypassOpen(true);
                              }}
                              sx={{ textTransform: "none" }}
                            >
                              Mark ready
                            </Button>
                          )}
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
              Dispatch (secondary outward)
            </Typography>

            <Paper
              elevation={0}
              sx={{
                px: 1.5,
                py: 1.25,
                mb: 1.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.15),
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(
                  theme.palette.secondary.main,
                  0.04
                )} 100%)`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <DispatchTabIcon color="primary" sx={{ fontSize: 28 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Vehicle dispatches
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending & in-transit · FIFO pickup from shed
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search transport id, driver, vehicle…"
                  value={vehicleDispatchSearch}
                  onChange={(e) => setVehicleDispatchSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadVehicleDispatches(1);
                  }}
                />
                <Button size="small" variant="contained" onClick={() => loadVehicleDispatches(1)} sx={{ flexShrink: 0 }}>
                  Search
                </Button>
              </Stack>
            </Paper>
            {vehicleDispatchesLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                <CircularProgress size={22} />
              </Box>
            )}
            {!vehicleDispatchesLoading && vehicleDispatches.length === 0 && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 2,
                  borderStyle: "dashed",
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No active vehicle dispatches right now. Create one from the dashboard dispatch form — it will show
                  here when status is pending or in transit.
                </Typography>
              </Paper>
            )}
            {vehicleDispatches.map((vd) => {
              const st = String(vd.transportStatus || "").toUpperCase();
              const statusColor =
                st === "IN_TRANSIT" ? "info" : st === "PENDING" ? "warning" : "default";
              return (
                <Card
                  key={String(vd._id)}
                  elevation={0}
                  sx={{
                    mb: 1.5,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: alpha(theme.palette.divider, 0.9),
                    background: theme.palette.background.paper,
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
                        theme.palette.background.paper,
                        1
                      )} 70%)`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2, letterSpacing: 0.5 }}>
                          Transport
                        </Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }} noWrap title={vd.transportId}>
                          {vd.transportId}
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                          <Chip size="small" color={statusColor} label={st || "—"} variant={statusColor === "default" ? "outlined" : "filled"} />
                          <Typography variant="caption" color="text.secondary">
                            {Number(vd.totalPlantQty || 0).toLocaleString("en-IN")} plants · {vd.orderCount ?? 0} order(s)
                          </Typography>
                        </Stack>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => openVehicleDriverEdit(vd)}
                        aria-label="Edit driver and vehicle"
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "background.paper",
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <PersonOutline sx={{ fontSize: 20, color: "text.secondary", mt: 0.15 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Driver
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {[vd.driverName, vd.driverMobile].filter(Boolean).join(" · ") || "—"}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <DirectionsCar sx={{ fontSize: 20, color: "text.secondary", mt: 0.15 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Vehicle
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {[vd.vehicleName, vd.vehicleNumber].filter(Boolean).join(" · ") || "—"}
                          </Typography>
                        </Box>
                      </Stack>
                      {vd.plantRowsSummary?.length > 0 && (
                        <Box sx={{ pt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Plants on vehicle
                          </Typography>
                          <Stack direction="row" flexWrap="wrap" gap={0.5}>
                            {vd.plantRowsSummary.map((p, idx) => (
                              <Chip
                                key={`${vd._id}-pr-${idx}`}
                                size="small"
                                variant="outlined"
                                label={`${p.name || "Plant"} · ${Number(p.quantity || 0).toLocaleString("en-IN")}`}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}
                      <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                        <Button
                          size="medium"
                          variant="outlined"
                          fullWidth
                          startIcon={<EditIcon />}
                          sx={{ textTransform: "none", flex: 1 }}
                          onClick={() => openVehicleDriverEdit(vd)}
                        >
                          Driver / vehicle
                        </Button>
                        <Button
                          size="medium"
                          variant="contained"
                          color="secondary"
                          fullWidth
                          startIcon={<DispatchTabIcon />}
                          sx={{ textTransform: "none", flex: 1.2 }}
                          onClick={() => openVehicleFulfillment(vd)}
                        >
                          Shed pickup
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
            {vehicleDispatchesPage < vehicleDispatchesTotalPages && (
              <Button
                fullWidth
                sx={{ mb: 2, textTransform: "none" }}
                onClick={() => loadVehicleDispatches(vehicleDispatchesPage + 1)}
              >
                Load more
              </Button>
            )}

            <Autocomplete
              sx={{ mb: 1.5, px: 0.5 }}
              options={dispatchReadyByBatch}
              value={dispatchTabBatch}
              onChange={(_, v) => {
                setDispatchTabBatch(v);
                setDispatchTabOrderPick(null);
              }}
              getOptionLabel={(agg) =>
                agg?.batchNumber
                  ? `${agg.batchNumber} · ${agg.plantLabel ?? ""} · ${agg.subtypeLabel ?? ""}`
                  : ""
              }
              isOptionEqualToValue={(a, b) => String(a?.batchId) === String(b?.batchId)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Batch (dispatch-ready stock)"
                  placeholder="Search by batch #"
                />
              )}
            />
            {dispatchTabBatch && (
              <Stack spacing={1.25} sx={{ mb: 2, px: 0.5 }}>
                <Typography variant="body2">
                  Dispatch-eligible plants on this batch:{" "}
                  <strong>
                    {Number(dispatchTabBatch.totalAvailPlants || 0).toLocaleString("en-IN")}
                  </strong>
                </Typography>
                <Autocomplete
                  options={dispatchTabOrders}
                  loading={dispatchTabOrdersLoading}
                  value={dispatchTabOrderPick}
                  onChange={(_, v) => setDispatchTabOrderPick(v)}
                  getOptionLabel={(o) => formatFarmerOrderOption(o)}
                  isOptionEqualToValue={(a, b) => String(a?._id) === String(b?._id)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Farmer order (ready for dispatch)"
                      helperText={
                        dispatchTabOrdersLoading
                          ? "Loading orders…"
                          : `${dispatchTabOrders.length} matching order(s) — optional prefill for Record dispatch`
                      }
                    />
                  )}
                />
              </Stack>
            )}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75, mt: 0.5, px: 0.5 }}>
              Ready stock by batch
            </Typography>
            {dispatchReadyByBatch.length === 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2, px: 0.5 }}>
                Nothing ready to dispatch yet.
              </Typography>
            )}
            {dispatchReadyByBatch.map((agg, idx) => {
              const bid = String(agg.batchId);
              const dbatch = dispatchBatchFromOutwardList(batches, agg.batchId);
              const plantMatch = dbatch
                ? {
                    plantId: dbatch.plantCmsId?._id ?? dbatch.plantCmsId,
                    subTypeId: dbatch.plantSubtypeId?._id ?? dbatch.plantSubtypeId,
                  }
                : null;
              const metrics = dispatchBatchLineMetricsById.get(bid);
              const plantedLabel = metrics?.earliestPlanted?.format?.("DD MMM YY") ?? null;
              const crateHints = collectCrateHintsForBatch(
                dispatchedBoardDispatches,
                bid,
                agg.batchNumber,
                plantMatch
              );
              const accent = BATCH_CARD_ACCENTS[idx % BATCH_CARD_ACCENTS.length];
              const calReady = Number(agg.plantsCalendarReady || 0);
              const mrReady = Number(agg.plantsMarkReady || 0);
              const waiting = metrics?.waitingAvail ?? 0;
              const waitDays = metrics?.minDaysToCalendar;

              return (
                <Card
                  key={bid}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    borderLeft: `5px solid ${accent}`,
                    background: `linear-gradient(125deg, ${alpha(accent, 0.14)} 0%, ${theme.palette.background.paper} 48%)`,
                    boxShadow: 1,
                  }}
                >
                  <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={900} fontSize="0.95rem" lineHeight={1.2}>
                          {agg.batchNumber}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.35} sx={{ mt: 0.35 }}>
                          <Chip
                            size="small"
                            sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700 }}
                            label={agg.plantLabel}
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            sx={{ height: 22, fontSize: "0.65rem", fontWeight: 700 }}
                            label={agg.subtypeLabel}
                            color="secondary"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                      <Chip
                        size="small"
                        sx={{ fontWeight: 800, flexShrink: 0, height: 24 }}
                        label={`${Number(agg.totalAvailPlants || 0).toLocaleString("en-IN")} ready`}
                        color="success"
                      />
                    </Stack>

                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.65 }}>
                      {plantedLabel ? (
                        <Chip
                          size="small"
                          sx={{ height: 22, fontSize: "0.62rem" }}
                          variant="outlined"
                          label={`Earliest plant · ${plantedLabel}`}
                        />
                      ) : null}
                      {calReady > 0 ? (
                        <Chip
                          size="small"
                          sx={{ height: 22, fontSize: "0.62rem" }}
                          color="success"
                          label={`${calReady.toLocaleString("en-IN")} cal. rule`}
                        />
                      ) : null}
                      {mrReady > 0 ? (
                        <Chip
                          size="small"
                          sx={{ height: 22, fontSize: "0.62rem" }}
                          color="warning"
                          label={`${mrReady.toLocaleString("en-IN")} mark ready`}
                        />
                      ) : null}
                      {waiting > 0 ? (
                        <Chip
                          size="small"
                          sx={{ height: 22, fontSize: "0.62rem" }}
                          color="info"
                          label={
                            waitDays != null
                              ? `${waiting.toLocaleString("en-IN")} waiting · ~${waitDays}d to dispatch`
                              : `${waiting.toLocaleString("en-IN")} waiting`
                          }
                        />
                      ) : null}
                    </Stack>

                    {crateHints.length > 0 ? (
                      <Box sx={{ mt: 0.75, pt: 0.65, borderTop: 1, borderColor: "divider" }}>
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          color="text.secondary"
                          display="block"
                          sx={{ mb: 0.35, letterSpacing: 0.02 }}
                        >
                          Crates (dispatched vehicles)
                        </Typography>
                        {crateHints.map((h) => (
                          <Typography
                            key={h.key}
                            variant="caption"
                            display="block"
                            sx={{ lineHeight: 1.4, fontSize: "0.68rem" }}
                          >
                            <strong>T{h.transportId || "?"}</strong>
                            {h.transportStatus ? ` · ${h.transportStatus}` : ""}
                            {h.cavityName ? ` · ${h.cavityName}` : ""} — {h.summary}
                          </Typography>
                        ))}
                      </Box>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Calendar — plants ready (plant-wise in tooltip)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Number under each day = total dispatch-ready plants becoming eligible that day. Tap for breakdown by plant.
              Colors: green calendar · orange Mark ready · purple outward.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  value={selectedDispatchDay && selectedDispatchDay.isValid() ? selectedDispatchDay : dayjs()}
                  onChange={(v) => setSelectedDispatchDay(v)}
                  slots={{ day: renderDispatchCalendarDay }}
                />
              </LocalizationProvider>
            </Box>
            {selectedDispatchDay && selectedDispatchDay.isValid() && (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedDispatchDay.format("DD MMM YYYY")}
                  </Typography>
                  <Button size="small" onClick={() => setSelectedDispatchDay(null)} sx={{ textTransform: "none" }}>
                    Show all
                  </Button>
                </Stack>
                {selectedDayReadyBatches.length > 0 ? (
                  <Stack spacing={1} sx={{ mb: 2, px: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      Batches ready this day
                    </Typography>
                    {selectedDayReadyBatches.map((b, idx) => {
                      const bid = String(b.batchId);
                      const dbatch = dispatchBatchFromOutwardList(batches, b.batchId);
                      const plantMatch = dbatch
                        ? {
                            plantId: dbatch.plantCmsId?._id ?? dbatch.plantCmsId,
                            subTypeId: dbatch.plantSubtypeId?._id ?? dbatch.plantSubtypeId,
                          }
                        : null;
                      const metrics = dispatchBatchLineMetricsById.get(bid);
                      const plantedLabel = metrics?.earliestPlanted?.format?.("DD MMM YY") ?? null;
                      const crateHints = collectCrateHintsForBatch(
                        dispatchedBoardDispatches,
                        bid,
                        b.batchNumber,
                        plantMatch
                      );
                      const accent = BATCH_CARD_ACCENTS[idx % BATCH_CARD_ACCENTS.length];
                      const waiting = metrics?.waitingAvail ?? 0;
                      const waitDays = metrics?.minDaysToCalendar;
                      return (
                        <Card
                          key={bid}
                          sx={{
                            borderRadius: 2,
                            borderLeft: `5px solid ${accent}`,
                            background: `linear-gradient(125deg, ${alpha(accent, 0.12)} 0%, ${theme.palette.background.paper} 50%)`,
                            boxShadow: 1,
                          }}
                        >
                          <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography fontWeight={900} fontSize="0.92rem">
                                  {b.batchNumber}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {b.plantLabel} · {b.subtypeLabel}
                                </Typography>
                              </Box>
                              <Chip
                                size="small"
                                color="success"
                                sx={{ fontWeight: 800, height: 22 }}
                                label={`${b.plants.toLocaleString("en-IN")} ready`}
                              />
                            </Stack>
                            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                              {plantedLabel ? (
                                <Chip
                                  size="small"
                                  sx={{ height: 21, fontSize: "0.62rem" }}
                                  variant="outlined"
                                  label={`Planted · ${plantedLabel}`}
                                />
                              ) : null}
                              {waiting > 0 ? (
                                <Chip
                                  size="small"
                                  sx={{ height: 21, fontSize: "0.62rem" }}
                                  color="info"
                                  label={
                                    waitDays != null
                                      ? `${waiting.toLocaleString("en-IN")} waiting · ~${waitDays}d`
                                      : `${waiting.toLocaleString("en-IN")} waiting`
                                  }
                                />
                              ) : null}
                            </Stack>
                            {crateHints.length > 0 ? (
                              <Box sx={{ mt: 0.65, pt: 0.5, borderTop: 1, borderColor: "divider" }}>
                                {crateHints.map((h) => (
                                  <Typography
                                    key={h.key}
                                    variant="caption"
                                    display="block"
                                    sx={{ fontSize: "0.65rem", lineHeight: 1.35 }}
                                  >
                                    <strong>T{h.transportId || "?"}</strong>
                                    {h.cavityName ? ` · ${h.cavityName}` : ""} — {h.summary}
                                  </Typography>
                                ))}
                              </Box>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block", px: 0.5 }}>
                    No new dispatch-ready stock attributed to this date (use calendar tooltip for nearby days).
                  </Typography>
                )}
              </>
            )}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, mt: 0.5 }}>
              Dispatch history (outward records)
              {selectedDispatchDay && selectedDispatchDay.isValid()
                ? ` · ${filteredDispatchOutwardRows.length} on this day`
                : ` · ${secondaryOutwardRows.length} total`}
            </Typography>
            {secondaryOutwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No dispatch yet — go to <strong>Inward</strong>, select stock, then <strong>Record dispatch</strong>.
              </Typography>
            )}
            {secondaryOutwardRows.length > 0 && filteredDispatchOutwardRows.length === 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                No outward rows on the selected day — pick another day or Show all.
              </Typography>
            )}
            {filteredDispatchOutwardRows.map((so) => {
              const { plant: soPlant, subtype: soSubtype } = batchPlantSubtypeLabelFromList(
                batches,
                so._batchId
              );
              return (
                <Card key={`${so._batchId}-${so._id}`} sx={{ mb: 1, borderRadius: 2 }}>
                  <CardContent sx={{ py: 1 }}>
                    <Typography fontWeight={700}>{so.batchNumber}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                      <Chip size="small" variant="outlined" label={soPlant} />
                      <Chip size="small" variant="outlined" color="secondary" label={soSubtype} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {moment(so.secondaryOutwardDate).format("DD MMM YYYY")} · {so.size} ·{" "}
                      {so.totalQuantity} plants
                    </Typography>
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
            right: 12,
            zIndex: 1050,
            alignItems: "flex-end",
            bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <Fab color="secondary" aria-label="New planting" onClick={openLagwadDialog}>
            <Add />
          </Fab>
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
          <BottomNavigationAction
            label={
              dispatchReadyPlantTotal > 0
                ? `Dispatch (${dispatchReadyPlantTotal})`
                : "Dispatch"
            }
            icon={<DispatchTabIcon />}
            sx={tabSx}
          />
        </BottomNavigation>
      </Paper>

      <Dialog
        open={acceptEnglishOpen}
        onClose={() => {
          setAcceptEnglishOpen(false);
          setAcceptTargetPo(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: "1.05rem", pb: 0.5 }}>Confirm accept</DialogTitle>
        <DialogContent>
          {acceptTargetPo && (
            <>
              <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
                Batch: <strong>{acceptTargetPo.batchNumber}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                {acceptTargetPlantMeta.plant} · {acceptTargetPlantMeta.subtype}
              </Typography>
              <Box
                sx={{
                  mb: 1,
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: (t) => alpha(t.palette.secondary.main, 0.12),
                  border: "1px solid",
                  borderColor: (t) => alpha(t.palette.secondary.main, 0.35),
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.5,
                  alignItems: "start",
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                    Trays
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.75rem",
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                      color: "secondary.dark",
                      lineHeight: 1.15,
                    }}
                  >
                    {fullTraysAvailablePrimaryOutward(acceptTargetPo).toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>
                    Plants
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1.75rem",
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                      color: "secondary.dark",
                      lineHeight: 1.15,
                    }}
                  >
                    {availPlantsPrimaryOutward(acceptTargetPo).toLocaleString("en-IN")}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ gridColumn: "1 / -1" }}>
                  Size <strong>{acceptTargetPo.size}</strong> · cavity {safeTrunc(acceptTargetPo.cavity ?? 0)}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={dialogActions5050Sx}>
          <Button
            variant="outlined"
            onClick={() => {
              setAcceptEnglishOpen(false);
              setAcceptTargetPo(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="secondary" onClick={confirmSecondaryAccept}>
            Accept
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={lagwadOpen}
        onClose={() => {
          setLagwadOpen(false);
          setLagwadTotalPlants("");
        }}
        fullWidth
        maxWidth="sm"
        fullScreen
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <form onSubmit={submitLagwadMulti}>
          <DialogTitle sx={{ pr: 6 }}>
            New planting (FIFO)
            <IconButton
              aria-label="close"
              onClick={() => {
                setLagwadOpen(false);
                setLagwadTotalPlants("");
              }}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
              <strong>FIFO</strong> = <strong>oldest primary-outward line first</strong> (by date), then the next, until your
              plant target is used up. <strong>Full trays only</strong>: each tray holds exactly{" "}
              <strong>cavity</strong> plants (e.g. 126). Your total is rounded{" "}
              <strong>down</strong> to whole trays — so 4000 with cavity 126 becomes 31×126 ={" "}
              <strong>3906</strong>, not 4000.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              <strong>Selection</strong>: only <strong>one batch</strong> at a time. <strong>R1 and R2</strong> lines can
              be selected together; <strong>R3</strong> only with other <strong>R3</strong> lines (never with R1/R2).
            </Typography>
            <Divider />
            <Typography variant="subtitle2" fontWeight={800}>
              Select lines
            </Typography>
            {lagwadSelectableRows.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No lines available.
              </Typography>
            ) : (
              lagwadSelectableRows.map((po) => {
                const k = outwardKey(String(po._batchId), String(po._id));
                const sel = lagwadSelectedKeys.has(k);
                const avail = availPlantsPrimaryOutward(po);
                const cav = Math.max(1, safeTrunc(po.cavity));
                const maxFull = Math.floor(avail / cav) * cav;
                const { plant: lagPlant, subtype: lagSubtype } = batchPlantSubtypeLabelFromList(
                  batches,
                  po._batchId
                );
                return (
                  <Card
                    key={k}
                    variant="outlined"
                    sx={{
                      borderColor: sel ? "secondary.main" : "divider",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleLagwadSel(po._batchId, po._id)}
                  >
                    <CardContent sx={{ py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                      <Checkbox
                        checked={sel}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleLagwadSel(po._batchId, po._id)}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={800}>{po.batchNumber}</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.35 }}>
                          <Chip size="small" variant="outlined" label={lagPlant} />
                          <Chip size="small" variant="outlined" color="secondary" label={lagSubtype} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {po.size} · cav {cav} · remaining {avail.toLocaleString("en-IN")} · max full-tray{" "}
                          {maxFull.toLocaleString("en-IN")}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })
            )}
            <TextField
              label="Total plants to plant"
              type="number"
              required
              inputProps={{ min: 1 }}
              value={lagwadTotalPlants}
              onChange={(e) => setLagwadTotalPlants(e.target.value)}
              helperText={
                lagwadPreview.maxTotal > 0
                  ? `Max full-tray total for selection: ${lagwadPreview.maxTotal.toLocaleString("en-IN")}`
                  : "Select lines"
              }
            />
            {lagwadPreview.requested > lagwadPreview.maxTotal && lagwadPreview.maxTotal > 0 && (
              <Alert severity="warning">
                Request exceeds capacity — only up to {lagwadPreview.maxTotal.toLocaleString("en-IN")} plants in full trays
                possible. Save will clamp to this limit.
              </Alert>
            )}
            <Typography variant="subtitle2" fontWeight={800}>
              FIFO preview (full trays)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: -0.75, mb: 0.5 }}>
              Shows how many plants actually allocate after full-tray rounding. “Plants” column is always trays × cavity.
            </Typography>
            {lagwadPreview.allocations.length === 0 ? (
              <Typography variant="caption" color="text.secondary">
                Enter total and select lines
              </Typography>
            ) : (
              <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Batch</TableCell>
                      <TableCell>Sz</TableCell>
                      <TableCell align="right">Plants</TableCell>
                      <TableCell align="right">Trays</TableCell>
                      <TableCell align="right">Left primary</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lagwadPreview.allocations.map((a) => {
                      const availBefore = availPlantsPrimaryOutward(a.row);
                      const leftPrimary = availBefore - a.plants;
                      return (
                        <TableRow key={a.row._id}>
                          <TableCell>{a.row.batchNumber}</TableCell>
                          <TableCell>{a.row.size}</TableCell>
                          <TableCell align="right">{a.plants.toLocaleString("en-IN")}</TableCell>
                          <TableCell align="right">{a.trays}</TableCell>
                          <TableCell align="right">{leftPrimary.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {lagwadPreview.allocations.length > 0 &&
              lagwadPreview.budgetRemaining > 0 &&
              lagwadPreview.applied > 0 &&
              lagwadPreview.clamped >= lagwadPreview.applied && (
              <Alert severity="info" sx={{ py: 1 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                  <strong>Why not {lagwadPreview.clamped.toLocaleString("en-IN")}?</strong> Only whole trays count.
                  {lagwadPreview.allocations.length === 1 && lagwadPreview.allocations[0].cavity ? (
                    <>
                      {" "}
                      floor({lagwadPreview.clamped.toLocaleString("en-IN")} ÷ {lagwadPreview.allocations[0].cavity}) ={" "}
                      {lagwadPreview.allocations[0].trays} trays × {lagwadPreview.allocations[0].cavity} ={" "}
                      <strong>{lagwadPreview.applied.toLocaleString("en-IN")}</strong> plants. The other{" "}
                      <strong>{lagwadPreview.budgetRemaining.toLocaleString("en-IN")}</strong> do not fill another full
                      tray.
                    </>
                  ) : (
                    <>
                      {" "}
                      Allocated <strong>{lagwadPreview.applied.toLocaleString("en-IN")}</strong> of{" "}
                      <strong>{lagwadPreview.clamped.toLocaleString("en-IN")}</strong> requested — the remainder (
                      {lagwadPreview.budgetRemaining.toLocaleString("en-IN")}) does not complete another full tray on the
                      FIFO path.
                    </>
                  )}
                </Typography>
              </Alert>
            )}
            {lagwadPreview.applied > 0 && (
              <Typography variant="caption" color="text.secondary">
                Applied total: {lagwadPreview.applied.toLocaleString("en-IN")} plants
              </Typography>
            )}
            <Divider />
            <TextField
              type="date"
              label="Secondary inward date"
              InputLabelProps={{ shrink: true }}
              value={secFromPrimaryShared.secondaryInwardDate}
              onChange={(e) => {
                const inward = e.target.value;
                setSecFromPrimaryShared((s) => ({
                  ...s,
                  secondaryInwardDate: inward,
                  dateOfDispatch: dateOfDispatchFromInwardAndReadyDays(
                    inward,
                    lagawdSecondaryPlantReadyDays
                  ),
                }));
              }}
              required
            />
            <TextField
              type="date"
              label="Date of dispatch"
              InputLabelProps={{ shrink: true }}
              value={secFromPrimaryShared.dateOfDispatch}
              helperText={
                lagawdSecondaryPlantReadyDays > 0
                  ? `Default = inward date + ${lagawdSecondaryPlantReadyDays} secondary plant-ready days (batch). You can edit.`
                  : "Set batch secondary plant-ready days in CMS for auto offset from inward date."
              }
              onChange={(e) =>
                setSecFromPrimaryShared((s) => ({ ...s, dateOfDispatch: e.target.value }))
              }
              required
            />
            {locationOptions.length > 0 ? (
              <TextField
                select
                required
                label="Polly house / shade"
                value={
                  locationOptions.some((o) => o.value === secFromPrimaryShared.pollyhouse)
                    ? secFromPrimaryShared.pollyhouse
                    : ""
                }
                onChange={(e) =>
                  setSecFromPrimaryShared((s) => ({ ...s, pollyhouse: e.target.value }))
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
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                {locationOptions.some((o) => o.group === "shade") && <ListSubheader>Shades</ListSubheader>}
                {locationOptions
                  .filter((o) => o.group === "shade")
                  .map((o) => (
                    <MenuItem key={`sh-${o.value}`} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
              </TextField>
            ) : (
              <TextField
                required
                label="Polly house / shade"
                value={secFromPrimaryShared.pollyhouse}
                onChange={(e) =>
                  setSecFromPrimaryShared((s) => ({ ...s, pollyhouse: e.target.value }))
                }
              />
            )}
            <TextField
              label="Labours engaged"
              type="number"
              value={secFromPrimaryShared.laboursEngaged}
              onChange={(e) =>
                setSecFromPrimaryShared((s) => ({ ...s, laboursEngaged: e.target.value }))
              }
              required
            />
            <TextField
              label="Remarks"
              multiline
              rows={2}
              value={secFromPrimaryShared.remarks}
              onChange={(e) =>
                setSecFromPrimaryShared((s) => ({ ...s, remarks: e.target.value }))
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 2 }}>
            <Button
              onClick={() => {
                setLagwadOpen(false);
                setLagwadTotalPlants("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="secondary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={bypassOpen}
        onClose={() => {
          if (bypassSubmitting) return;
          setBypassOpen(false);
          setBypassTarget(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Mark ready for dispatch</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            This bypasses the calendar rule (planting + secondary-ready days). Use only when you are sure stock is
            fit to ship.
          </Alert>
          {bypassTarget && (
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              Batch <strong>{normBatchKey(bypassTarget.batchNumber) || String(bypassTarget._batchId)}</strong> · line{" "}
              {bypassTarget.size}
            </Typography>
          )}
          <TextField
            fullWidth
            label="Reason (optional)"
            multiline
            minRows={2}
            value={bypassReason}
            onChange={(e) => setBypassReason(e.target.value)}
            placeholder="e.g. quality check done early"
          />
        </DialogContent>
        <DialogActions sx={dialogActions5050Sx}>
          <Button
            onClick={() => {
              if (bypassSubmitting) return;
              setBypassOpen(false);
              setBypassTarget(null);
            }}
            disabled={bypassSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitReadinessBypass}
            disabled={bypassSubmitting}
          >
            {bypassSubmitting ? "Saving…" : "Confirm override"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={secOutDialogOpen}
        onClose={() => {
          setSecOutDialogOpen(false);
          setSecOutLinkedOrder(null);
          setSecOutOrdersList([]);
        }}
        fullWidth
        maxWidth="sm"
        fullScreen
        PaperProps={{ sx: { borderRadius: 0 } }}
      >
        <form onSubmit={submitSecOutMulti}>
          <DialogTitle sx={{ pr: 6 }}>
            Dispatch — secondary outward
            <IconButton
              aria-label="close"
              onClick={() => {
                setSecOutDialogOpen(false);
                setSecOutLinkedOrder(null);
                setSecOutOrdersList([]);
              }}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Autocomplete
              options={secOutOrdersList}
              loading={secOutOrdersLoading}
              value={secOutLinkedOrder}
              onChange={(_, v) => setSecOutLinkedOrder(v)}
              getOptionLabel={(o) => formatFarmerOrderOption(o)}
              isOptionEqualToValue={(a, b) => String(a?._id) === String(b?._id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Farmer order (READY_FOR_DISPATCH)"
                  helperText={
                    secOutOrdersLoading
                      ? "Loading orders…"
                      : `${secOutOrdersList.length} order(s) for this batch · plant/subtype must match`
                  }
                />
              )}
            />
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
            <Button
              onClick={() => {
                setSecOutDialogOpen(false);
                setSecOutLinkedOrder(null);
                setSecOutOrdersList([]);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="secondary">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={vehicleFulfillmentOpen}
        onClose={() => {
          setVehicleFulfillmentOpen(false);
          setVehicleFulfillmentDispatch(null);
          setVehicleFulfillmentBatchId("");
          setAllocationPayload(null);
        }}
        fullWidth
        maxWidth="sm"
        fullScreen
        PaperProps={{
          sx: {
            borderRadius: 0,
            height: "100%",
            maxHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ pr: 6, pb: 1, flexShrink: 0 }}>
          Shed pickup · {vehicleFulfillmentDispatch?.transportId || ""}
          <IconButton
            aria-label="close"
            onClick={() => {
              setVehicleFulfillmentOpen(false);
              setVehicleFulfillmentDispatch(null);
              setVehicleFulfillmentBatchId("");
              setAllocationPayload(null);
            }}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pb: 2,
            flex: 1,
            minHeight: 0,
            overflowX: "hidden",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {vehicleFulfillmentDispatch && (
            <>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={String(vehicleFulfillmentDispatch.transportStatus || "—").toUpperCase()}
                  color={
                    String(vehicleFulfillmentDispatch.transportStatus || "").toUpperCase() ===
                    "IN_TRANSIT"
                      ? "info"
                      : "warning"
                  }
                />
                <Typography variant="body2" color="text.secondary">
                  {Number(vehicleFulfillmentDispatch.totalPlantQty || 0).toLocaleString("en-IN")} plants ·{" "}
                  {vehicleFulfillmentDispatch.orderCount ?? 0} orders
                </Typography>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => openVehicleDriverEdit(vehicleFulfillmentDispatch)}
                sx={{ alignSelf: "flex-start", textTransform: "none" }}
              >
                Change driver / vehicle (fleet)
              </Button>

              <Accordion
                defaultExpanded={false}
                disableGutters
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: alpha(theme.palette.primary.main, 0.22),
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
                  sx={{
                    px: 1.25,
                    minHeight: 48,
                    "& .MuiAccordionSummary-content": { my: 1, alignItems: "center", gap: 1 },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800}>
                    Dispatch record · crates & dates
                  </Typography>
                  <Chip size="small" label="Reference · tap to expand" variant="outlined" sx={{ fontSize: "0.65rem" }} />
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 1.25, pb: 1.25 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Planner paperwork from dispatch. FIFO pulls and plant quantities are under{" "}
                  <strong>Pull from nursery</strong> below.
                </Typography>
                <Stack spacing={0.35} sx={{ mb: 1.25 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Created:</strong>{" "}
                    {vehicleFulfillmentDispatch.createdAt
                      ? moment(vehicleFulfillmentDispatch.createdAt).format("DD MMM YYYY · HH:mm")
                      : "—"}
                    {vehicleFulfillmentDispatch.updatedAt ? (
                      <>
                        {" "}
                        · <strong>Updated:</strong>{" "}
                        {moment(vehicleFulfillmentDispatch.updatedAt).format("DD MMM YYYY · HH:mm")}
                      </>
                    ) : null}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Contact:</strong>{" "}
                    {[vehicleFulfillmentDispatch.driverName, vehicleFulfillmentDispatch.driverMobile]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                    {" · "}
                    <strong>Vehicle:</strong>{" "}
                    {[vehicleFulfillmentDispatch.vehicleName, vehicleFulfillmentDispatch.vehicleNumber]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </Typography>
                </Stack>

                {(vehicleFulfillmentDispatch.plantsDetailPreview || []).length > 0 ? (
                  <Box sx={{ mb: 1.25 }}>
                    <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 0.5 }}>
                      Plant rows (crate & shade split)
                    </Typography>
                    {(vehicleFulfillmentDispatch.plantsDetailPreview || []).map((row, ri) => (
                      <Box
                        key={`vd-pl-${ri}`}
                        sx={{
                          mb: 1,
                          pb: 1,
                          borderBottom:
                            ri < (vehicleFulfillmentDispatch.plantsDetailPreview || []).length - 1
                              ? 1
                              : 0,
                          borderColor: "divider",
                        }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {row.name || `Row ${ri + 1}`} ·{" "}
                          {Number(row.quantity || 0).toLocaleString("en-IN")} plants
                        </Typography>
                        {(row.pickupByShade || []).length > 0 ? (
                          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                            {(row.pickupByShade || []).map((sh, si) => (
                              <Chip
                                key={`vd-sh-${ri}-${si}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 22, fontSize: "0.68rem" }}
                                label={`${sh.shadeName || "—"} · ${Number(sh.quantity || 0).toLocaleString("en-IN")}`}
                              />
                            ))}
                          </Stack>
                        ) : null}
                        {(row.crates || []).length > 0 ? (
                          <TableContainer sx={{ mt: 0.75, border: 1, borderColor: "divider", borderRadius: 1 }}>
                            <Table size="small" sx={{ "& td, & th": { py: 0.35, px: 0.75, fontSize: "0.72rem" } }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Cavity</TableCell>
                                  <TableCell align="right">Crates</TableCell>
                                  <TableCell align="right">Plants</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(row.crates || []).map((c, ci) => (
                                  <TableRow key={`vd-c-${ri}-${ci}`}>
                                    <TableCell>{c.cavityName || "—"}</TableCell>
                                    <TableCell align="right">{Number(c.crateCount || 0)}</TableCell>
                                    <TableCell align="right">
                                      {Number(c.plantCount || 0).toLocaleString("en-IN")}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.35 }} display="block">
                            No crate lines on this plant row in the dispatch record.
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : null}

                {(vehicleFulfillmentDispatch.orderDispatchPreview || []).length > 0 ? (
                  <Box>
                    <Typography variant="caption" fontWeight={800} display="block" sx={{ mb: 0.5 }}>
                      Collection slip (per order)
                    </Typography>
                    {(vehicleFulfillmentDispatch.orderDispatchPreview || []).map((ord, oi) => (
                      <Box key={`vd-od-${oi}`} sx={{ mb: 1.25 }}>
                        <Typography variant="body2" fontWeight={600}>
                          Order{" "}
                          {ord.orderIdNumeric != null ? `#${ord.orderIdNumeric}` : ""}{" "}
                          {ord.publicOrderCode ? `· ${ord.publicOrderCode}` : ""}
                          {" · "}
                          {Number(ord.dispatchQuantity || 0).toLocaleString("en-IN")} plants
                        </Typography>
                        {(ord.crates || []).length > 0 ? (
                          <TableContainer sx={{ mt: 0.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
                            <Table size="small" sx={{ "& td, & th": { py: 0.35, px: 0.75, fontSize: "0.72rem" } }}>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Cavity</TableCell>
                                  <TableCell align="right">Crates</TableCell>
                                  <TableCell align="right">Plants</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(ord.crates || []).map((c, oci) => (
                                  <TableRow key={`vd-oc-${oi}-${oci}`}>
                                    <TableCell>{c.cavityName || "—"}</TableCell>
                                    <TableCell align="right">{Number(c.crateCount || 0)}</TableCell>
                                    <TableCell align="right">
                                      {Number(c.plantCount || 0).toLocaleString("en-IN")}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No per-order crate breakdown.
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : null}

                {(vehicleFulfillmentDispatch.plantsDetailPreview || []).length === 0 &&
                (vehicleFulfillmentDispatch.orderDispatchPreview || []).length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No crate/shade paperwork on this dispatch — FIFO pulls are in <strong>Secondary inward lines</strong>{" "}
                    below.
                  </Typography>
                ) : null}
                </AccordionDetails>
              </Accordion>

              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>
                Pull from nursery
              </Typography>
              {(vehicleFulfillmentDispatch?.plantRowsSummary?.length ?? 0) > 1 && (
                <TextField
                  select
                  fullWidth
                  label="Plant row on vehicle"
                  value={plantRowIndex}
                  onChange={(e) => {
                    setPlantRowIndex(Number(e.target.value));
                    setVehicleFulfillmentBatchId("");
                  }}
                >
                  {(vehicleFulfillmentDispatch?.plantRowsSummary || []).map((pr, idx) => (
                    <MenuItem key={`vd-pr-${idx}`} value={idx}>
                      {pr.name || `Row ${idx + 1}`} · {Number(pr.quantity || 0).toLocaleString("en-IN")} plants
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {allocationLoading && !allocationPayload ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Secondary inward lines
                    </Typography>
                    {vehicleFulfillmentBatchOptions.length > 0 ? (
                      <TextField
                        select
                        size="small"
                        label="Batch"
                        sx={{ minWidth: { xs: "100%", sm: 220 } }}
                        value={vehicleFulfillmentBatchId}
                        onChange={(e) => setVehicleFulfillmentBatchId(String(e.target.value))}
                        disabled={allocationLoading}
                        helperText="All batches = FIFO across batches; one batch = only that nursery batch."
                      >
                        <MenuItem value="">All batches (FIFO)</MenuItem>
                        {vehicleFulfillmentBatchOptions.map((b) => (
                          <MenuItem key={b.batchId} value={b.batchId}>
                            {b.batchNumber ? b.batchNumber : `Batch ${b.batchId.slice(-6)}`}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    FIFO lines for this vehicle plant row (plant + subtype). Full trays only; multiple lines save in
                    order.
                  </Typography>
                  {!allocationPayload ? (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Could not load nursery allocation — check network, then close and open Shed pickup again. Batch
                      filter is not applied until lines load.
                    </Alert>
                  ) : allocationLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                  {vehicleFulfillmentAllocationLines.map((ln, lineIdx) => {
                    const cav = Math.max(1, safeTrunc(ln.cavity));
                    const want = Number(vehicleFulfillmentQtyByLineId[String(ln.secondaryInwardId)] || 0);
                    const avail = Number(ln.availableQuantity) || 0;
                    const capOrd = Math.min(want, avail);
                    const trays = capOrd >= cav ? Math.floor(capOrd / cav) : 0;
                    const actualQty = trays * cav;
                    const lineAccent = BATCH_CARD_ACCENTS[lineIdx % BATCH_CARD_ACCENTS.length];
                    const pullFieldId = `shed-pickup-qty-${ln.secondaryInwardId}`;
                    return (
                      <Card
                        key={String(ln.secondaryInwardId)}
                        elevation={0}
                        sx={{
                          mb: 1.75,
                          borderRadius: 2,
                          overflow: "visible",
                          border: "1px solid",
                          borderColor: alpha(lineAccent, 0.5),
                          borderLeftWidth: 5,
                          borderLeftColor: lineAccent,
                          bgcolor: alpha(lineAccent, 0.07),
                          boxShadow: `0 6px 20px ${alpha(theme.palette.common.black, 0.07)}`,
                          maxWidth: "100%",
                          minWidth: 0,
                        }}
                      >
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1.25,
                            bgcolor: alpha(lineAccent, 0.16),
                            borderBottom: "1px solid",
                            borderColor: alpha(lineAccent, 0.25),
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="h6" fontWeight={800} sx={{ fontSize: "1.15rem", lineHeight: 1.2 }}>
                                {ln.batchNumber}
                              </Typography>
                              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.35 }} color="text.primary">
                                {ln.plantLabel} · {ln.subtypeLabel}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={ln.pollyhouse || "—"}
                              sx={{
                                fontWeight: 700,
                                bgcolor: alpha(theme.palette.common.white, 0.55),
                                border: "1px solid",
                                borderColor: alpha(lineAccent, 0.45),
                              }}
                            />
                          </Stack>
                        </Box>
                        <CardContent sx={{ py: 1.5, px: 1.5, overflow: "visible", "&:last-child": { pb: 1.5 } }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Planted:</strong>{" "}
                            {ln.secondaryInwardDate
                              ? moment(ln.secondaryInwardDate).format("DD MMM YY")
                              : "—"}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: ln.dispatchEligible ? 1 : 0.75 }}>
                            <strong>Days until ready:</strong>{" "}
                            {ln.daysUntilReady != null ? (
                              <>
                                {ln.daysUntilReady} calendar day{ln.daysUntilReady === 1 ? "" : "s"}
                                {ln.expectedReadyByCalendar
                                  ? ` (ready ~ ${moment(ln.expectedReadyByCalendar).format("DD MMM YY")})`
                                  : ""}
                                {ln.secondaryPlantReadyDays != null
                                  ? ` · ${Number(ln.secondaryPlantReadyDays)}d rule`
                                  : ""}
                              </>
                            ) : (
                              "—"
                            )}
                          </Typography>
                          {!ln.dispatchEligible && (
                            <Chip
                              size="small"
                              color="warning"
                              label="Bypass OK (vehicle)"
                              sx={{ mb: 1 }}
                            />
                          )}
                          <Box
                            sx={{
                              p: 1.25,
                              borderRadius: 1.5,
                              bgcolor: alpha(theme.palette.common.black, 0.03),
                              border: "1px dashed",
                              borderColor: alpha(theme.palette.divider, 0.9),
                              maxWidth: "100%",
                              overflow: "visible",
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="text.secondary"
                              display="block"
                              sx={{ mb: 1, wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto" }}
                            >
                              Tray · cavity {ln.cavity} · max {Number(ln.availableQuantity).toLocaleString("en-IN")}{" "}
                              plants
                            </Typography>
                            <TextField
                              id={pullFieldId}
                              size="small"
                              type="number"
                              fullWidth
                              variant="outlined"
                              label="Plants to pull"
                              placeholder="0"
                              InputLabelProps={{ shrink: true }}
                              inputProps={{
                                min: 0,
                                max: ln.availableQuantity,
                                "aria-describedby": `${pullFieldId}-hint`,
                              }}
                              value={vehicleFulfillmentQtyByLineId[String(ln.secondaryInwardId)] ?? ""}
                              onChange={(e) =>
                                setVehicleFulfillmentQtyByLineId((prev) => ({
                                  ...prev,
                                  [String(ln.secondaryInwardId)]: e.target.value,
                                }))
                              }
                              sx={{
                                width: "100%",
                                maxWidth: "100%",
                                "& .MuiOutlinedInput-root": {
                                  bgcolor: theme.palette.background.paper,
                                  width: "100%",
                                },
                              }}
                            />
                            {want >= 1 ? (
                              <Typography
                                id={`${pullFieldId}-hint`}
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mt: 1 }}
                              >
                                {trays < 1 || actualQty < 1 ? (
                                  <>Need at least {cav} plants for one full tray (cavity).</>
                                ) : (
                                  <>
                                    Saves <strong>{actualQty}</strong> plants = <strong>{trays}</strong> full tray
                                    {trays === 1 ? "" : "s"} @ {cav} plants/tray (dispatch-style rounding).
                                  </>
                                )}
                              </Typography>
                            ) : (
                              <Typography
                                id={`${pullFieldId}-hint`}
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mt: 0.75 }}
                              >
                                Enter quantity up to {Number(ln.availableQuantity).toLocaleString("en-IN")}.
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {vehicleFulfillmentAllocationLines.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No stock lines from the server for this vehicle plant row — pick a different plant row on the
                      vehicle (if more than one), try another batch filter, or confirm allocation loaded.
                    </Typography>
                  )}
                    </>
                  )}
                </>
              )}

              <Divider />
              <Typography variant="subtitle2" fontWeight={700}>
                Dispatch evidence (optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Add photos of loading or handover if you have them. Date, shade, and labour use defaults on save.
              </Typography>
              <input
                ref={vehiclePhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setVehicleFulfillmentPhotos(files);
                }}
              />
              <Button
                startIcon={<PhotoCameraIcon />}
                variant="outlined"
                onClick={() => vehiclePhotoInputRef.current?.click()}
              >
                Evidence photos ({vehicleFulfillmentPhotos.length})
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 2,
            py: 2,
            pb: "max(16px, env(safe-area-inset-bottom, 0px))",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Button
            onClick={() => {
              setVehicleFulfillmentOpen(false);
              setVehicleFulfillmentDispatch(null);
              setVehicleFulfillmentBatchId("");
              setAllocationPayload(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={allocationLoading}
            onClick={submitVehicleFulfillment}
          >
            Save pickup
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={vehicleDriverEditOpen} onClose={() => setVehicleDriverEditOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={saveVehicleDriverEdit}>
          <DialogTitle>Driver / vehicle</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            {fleetListsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <FleetAssignmentPanel
                value={{
                  ownerId: fleetSelectedOwnerId,
                  driverId: fleetDriverId,
                  vehicleId: fleetVehicleId,
                  routeNotes: "",
                  driverRemark: "",
                  vehicleRemark: "",
                }}
                onChange={(next) => {
                  if (next.ownerId !== fleetSelectedOwnerId) {
                    void onFleetOwnerChange(next.ownerId);
                  } else {
                    setFleetDriverId(next.driverId);
                    setFleetVehicleId(next.vehicleId);
                  }
                }}
                disabled={vehicleDriverSaving}
                showRemarks={false}
                autoSelectSingle={false}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 2 }}>
            <Button onClick={() => setVehicleDriverEditOpen(false)} disabled={vehicleDriverSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={vehicleDriverSaving || fleetListsLoading}>
              {vehicleDriverSaving ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={mortalityOpen}
        onClose={() => {
          if (mortalitySubmitting) return;
          setMortalityOpen(false);
          setMortalityTarget(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Record mortality</DialogTitle>
        <DialogContent>
          {mortalityTarget && (
            <>
              <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.5 }}>
                Batch <strong>{mortalityTarget.batchNumber}</strong> · {mortalityTarget.size} · up to{" "}
                <strong>
                  {availPlantsPrimaryOutward(mortalityTarget).toLocaleString("en-IN")}
                </strong>{" "}
                plants remaining
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Plants lost"
                value={mortalityQty}
                onChange={(e) => setMortalityQty(e.target.value)}
                inputProps={{
                  min: 1,
                  max: availPlantsPrimaryOutward(mortalityTarget),
                }}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Remarks (optional)"
                value={mortalityRemarks}
                onChange={(e) => setMortalityRemarks(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setMortalityOpen(false);
              setMortalityTarget(null);
            }}
            disabled={mortalitySubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={mortalitySubmitting}
            onClick={submitSecondaryMortality}
          >
            Save to batch
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={sowingDoneConfirmOpen}
        onClose={() => {
          setSowingDoneConfirmOpen(false);
          setSowingDoneTargetPo(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontSize: "1.05rem" }}>लागवड पूर्ण — पुष्टी</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1 }}>
            हे बटण फक्त &quot;लागवड पूर्ण झाली&quot; ही टप्प्याची नोंद करते.{" "}
            <strong>Mortality</strong> स्वतंत्र आहे — उर्वरित रोपांचे नुकसान नोंदवायचे असल्यास आधी{" "}
            <strong>Mortality</strong> वापरा; ते येथून आपोआप होत नाही.
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
            शिल्लक शून्य असल्यावरच खालील &quot;नोंद करा&quot; दाबा. उर्वरित असेल तर आधी लागवड किंवा mortality
            ने शिल्लक कमी करा.
          </Typography>
        </DialogContent>
        <DialogActions sx={dialogActions5050Sx}>
          <Button
            onClick={() => {
              setSowingDoneConfirmOpen(false);
              setSowingDoneTargetPo(null);
            }}
          >
            रद्द
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => sowingDoneTargetPo && markSecondarySowingDone(sowingDoneTargetPo)}
            disabled={!sowingDoneTargetPo}
          >
            नोंद करा (पुष्टी)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecondaryMobileOps;
