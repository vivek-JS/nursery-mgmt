import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Paper,
  CircularProgress,
  IconButton,
  Divider,
  Chip,
  Stack,
  Collapse,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import {
  createDispatchBatch,
  fetchLagwadPlants,
  submitSecondaryDirectLagwad,
  apiErrText,
} from "../utils/pipelineApi";
import {
  DEFAULT_CAVITY,
  SECONDARY_LAGWAD_LAST_BATCH_KEY,
  activeSizeCount,
  autoTraysFromSplit,
  computeReadyDateYmd,
  expectedReadyLabel,
  filterBatchesForPlantSubtype,
  findDefaultBananaPlant,
  findDefaultBananaSubtype,
  isBananaPlantName,
  isMongoObjectId,
  parseSplitFromForm,
  pickDefaultBatchForPlantSubtype,
  plantsFromTrays,
  refId,
  secondaryReadyDaysForSize,
  totalPlantsFromSplit,
  validateLagwadStep0,
  validateLagwadStep1,
} from "../utils/lagwadWizardHelpers";

const STEPS = ["Batch & sowing", "Labour & save"];

const emptySplitForm = () => ({ R1: "", R2: "", R3: "" });

function LagwadTotalsBar({ plantsNum, traysNum, readyLabels }) {
  if (plantsNum < 1 && traysNum < 1) return null;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: "action.hover", borderRadius: 2 }}>
      <Typography variant="body2" fontWeight={600}>
        {plantsNum.toLocaleString("en-IN")} plants
        {traysNum > 0 ? ` · ${traysNum.toLocaleString("en-IN")} trays` : ""}
      </Typography>
      {readyLabels.length > 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Expected ready: {readyLabels.join(" · ")}
        </Typography>
      )}
    </Paper>
  );
}

function SizeSplitRow({ label, hint, readyHint, value, onChange, onBump, cavityNum }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
        {label}
        {hint ? ` · ${hint}` : ""}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton size="small" onClick={() => onBump(-1)} aria-label={`Decrease ${label}`}>
          <RemoveIcon fontSize="small" />
        </IconButton>
        <TextField
          fullWidth
          type="number"
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ min: 0, step: cavityNum }}
        />
        <IconButton size="small" onClick={() => onBump(1)} aria-label={`Increase ${label}`}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>
      {readyHint ? (
        <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: "block" }}>
          Ready: {readyHint}
        </Typography>
      ) : null}
    </Grid>
  );
}

function LagwadDatesSection({
  inwardDate,
  onInwardDateChange,
  secondaryReadyDays,
  readyDateYmd,
  readyLabels,
  pollyhouse,
  onPollyhouseChange,
  locations,
}) {
  const r1Days = secondaryReadyDaysForSize("R1", secondaryReadyDays);
  const r3Days = secondaryReadyDaysForSize("R3", secondaryReadyDays);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "action.hover" }}>
      <Typography variant="subtitle2" gutterBottom>
        Sowing date · ready calculation
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            type="date"
            label="Sowing date (lagwad)"
            InputLabelProps={{ shrink: true }}
            value={inwardDate}
            onChange={(e) => onInwardDateChange(e.target.value)}
            helperText="When plants were sown in secondary shed"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            select
            label="Polyhouse / shed"
            value={pollyhouse}
            onChange={(e) => onPollyhouseChange(e.target.value)}
          >
            {locations.map((loc) => (
              <MenuItem key={loc.value} value={loc.value}>
                {loc.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip size="small" label={`R1/R2 slot: ${r1Days} days`} variant="outlined" />
            <Chip size="small" label={`R3 slot: ${r3Days} days`} variant="outlined" />
          </Stack>
        </Grid>
        {readyDateYmd && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "success.50" }}>
              <Typography variant="body2" fontWeight={600} color="success.dark">
                Dispatch date (auto): {dayjs(readyDateYmd).format("DD MMM YYYY")}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Sowing {dayjs(inwardDate).format("DD MMM YYYY")} + ready days → latest slot date
              </Typography>
              {readyLabels.length > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {readyLabels.join(" · ")}
                </Typography>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
}

export default function SecondaryDirectLagwadWizard({
  open,
  onClose,
  onSuccess,
  locations = [],
  trays = [],
  dispatchBatches: dispatchBatchesProp = [],
  initialPlantId = "",
  initialSubtypeId = "",
  initialBatchId = "",
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [plants, setPlants] = useState([]);
  const [dispatchBatches, setDispatchBatches] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showR3, setShowR3] = useState(false);
  const defaultsAppliedRef = useRef(false);

  const [plantId, setPlantId] = useState("");
  const [subtypeId, setSubtypeId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [splitForm, setSplitForm] = useState(emptySplitForm);
  const [cavity, setCavity] = useState(DEFAULT_CAVITY);
  const [traysInput, setTraysInput] = useState("");
  const [traysDriven, setTraysDriven] = useState(true);
  const [pollyhouse, setPollyhouse] = useState("");
  const [inwardDate, setInwardDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [ladies, setLadies] = useState("");
  const [gents, setGents] = useState("");
  const [remarks, setRemarks] = useState("");

  const reset = useCallback(() => {
    setStep(0);
    setPlantId("");
    setSubtypeId("");
    setBatchId("");
    setBatchName("");
    setSplitForm(emptySplitForm());
    setCavity(DEFAULT_CAVITY);
    setTraysInput("");
    setTraysDriven(true);
    setPollyhouse("");
    setInwardDate(dayjs().format("YYYY-MM-DD"));
    setLadies("");
    setGents("");
    setRemarks("");
    setShowAdvanced(false);
    setShowR3(false);
    defaultsAppliedRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    setDispatchBatches(dispatchBatchesProp);
  }, [dispatchBatchesProp]);

  useEffect(() => {
    if (!open) return;
    setCatalogLoading(true);
    fetchLagwadPlants()
      .then(setPlants)
      .catch(() => setPlants([]))
      .finally(() => setCatalogLoading(false));
  }, [open]);

  const applyBatchSelection = useCallback((batch) => {
    if (!batch) return;
    const id = refId(batch._id ?? batch.id);
    setPlantId(refId(batch.plantCmsId));
    setSubtypeId(refId(batch.plantSubtypeId));
    setBatchId(id);
    setBatchName(String(batch.batchNumber ?? batch.batchNo ?? ""));
    try {
      localStorage.setItem(SECONDARY_LAGWAD_LAST_BATCH_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const applyInitialBatch = useCallback(
    (id) => {
      const batch = dispatchBatches.find((b) => refId(b._id ?? b.id) === id);
      if (batch) applyBatchSelection(batch);
    },
    [dispatchBatches, applyBatchSelection]
  );

  /** Page context batch — re-apply when dispatch batches load async. */
  useEffect(() => {
    if (!open || !initialBatchId || !dispatchBatches.length) return;
    applyInitialBatch(initialBatchId);
  }, [open, initialBatchId, dispatchBatches, applyInitialBatch]);

  /** Auto-select Banana · G-9 · latest batch (or last used) — like primary sowing mobile. */
  useEffect(() => {
    if (!open || catalogLoading || defaultsAppliedRef.current || !plants.length) return;
    if (initialBatchId) {
      defaultsAppliedRef.current = true;
      return;
    }
    if (initialPlantId) {
      setPlantId(initialPlantId);
      if (initialSubtypeId) setSubtypeId(initialSubtypeId);
      defaultsAppliedRef.current = true;
      return;
    }

    let lastId = "";
    try {
      lastId = localStorage.getItem(SECONDARY_LAGWAD_LAST_BATCH_KEY) || "";
    } catch {
      lastId = "";
    }

    if (lastId && dispatchBatches.length) {
      const lastBatch = dispatchBatches.find((b) => refId(b._id ?? b.id) === lastId);
      if (lastBatch) {
        applyBatchSelection(lastBatch);
        defaultsAppliedRef.current = true;
        return;
      }
    }

    const banana = findDefaultBananaPlant(plants);
    if (banana) {
      const pid = refId(banana.plantId ?? banana._id);
      setPlantId(pid);
      const subtypes = banana.subtypes ?? [];
      const defaultSub = findDefaultBananaSubtype(subtypes);
      const sid = defaultSub ? refId(defaultSub.subtypeId ?? defaultSub._id) : "";
      if (sid) setSubtypeId(sid);

      if (sid && dispatchBatches.length) {
        const batch = pickDefaultBatchForPlantSubtype(dispatchBatches, pid, sid);
        if (batch) applyBatchSelection(batch);
      }
    }

    defaultsAppliedRef.current = true;
  }, [
    open,
    catalogLoading,
    plants,
    dispatchBatches,
    initialBatchId,
    initialPlantId,
    initialSubtypeId,
    applyBatchSelection,
  ]);

  /** When plant/subtype prefilled from analysis but no batch — pick latest batch. */
  useEffect(() => {
    if (!open || batchId || !plantId || !subtypeId || !dispatchBatches.length) return;
    const batch = pickDefaultBatchForPlantSubtype(dispatchBatches, plantId, subtypeId);
    if (batch) applyBatchSelection(batch);
  }, [open, batchId, plantId, subtypeId, dispatchBatches, applyBatchSelection]);

  const selectedPlant = useMemo(
    () => plants.find((p) => refId(p.plantId ?? p._id) === plantId),
    [plants, plantId]
  );

  const isBananaCrop = isBananaPlantName(selectedPlant?.name);

  const subtypeOptions = useMemo(
    () =>
      (selectedPlant?.subtypes ?? []).map((st) => ({
        id: refId(st.subtypeId ?? st._id),
        name: st.name ?? "Subtype",
        plantReadyDays: Number(st.plantReadyDays) || 0,
      })),
    [selectedPlant]
  );

  const selectedSubtype = useMemo(
    () => subtypeOptions.find((s) => s.id === subtypeId) ?? null,
    [subtypeOptions, subtypeId]
  );

  const batchOptions = useMemo(
    () => filterBatchesForPlantSubtype(dispatchBatches, plantId, subtypeId),
    [dispatchBatches, plantId, subtypeId]
  );

  const selectedBatch = useMemo(
    () => batchOptions.find((b) => refId(b._id ?? b.id) === batchId) ?? null,
    [batchOptions, batchId]
  );

  const lockPlant = isBananaCrop && !initialPlantId;

  const secondaryReadyDays = Math.max(
    0,
    Number(selectedBatch?.secondaryPlantReadyDays) ||
      Number(selectedSubtype?.plantReadyDays) ||
      0
  );

  const splitNums = useMemo(() => parseSplitFromForm(splitForm), [splitForm]);
  const plantsNum = totalPlantsFromSplit(splitNums);
  const singleSizeLagwad = activeSizeCount(splitNums) === 1;
  const cavityNum = Math.max(1, Number(cavity) || Number(DEFAULT_CAVITY));
  const traysNum = Math.max(0, Number(traysInput) || 0);
  const ladiesNum = Math.max(0, Number(ladies) || 0);
  const gentsNum = Math.max(0, Number(gents) || 0);
  const labourTotal = ladiesNum + gentsNum;

  const readyDateYmd = useMemo(
    () => computeReadyDateYmd(inwardDate, splitNums, secondaryReadyDays),
    [inwardDate, splitNums, secondaryReadyDays]
  );

  const readyLabels = useMemo(() => {
    const labels = [];
    if (splitNums.R1 > 0) {
      const l = expectedReadyLabel(inwardDate, "R1", secondaryReadyDays);
      if (l) labels.push(`R1 → ${l}`);
    }
    if (splitNums.R2 > 0) {
      const l = expectedReadyLabel(inwardDate, "R2", secondaryReadyDays);
      if (l) labels.push(`R2 → ${l}`);
    }
    if (splitNums.R3 > 0) {
      const l = expectedReadyLabel(inwardDate, "R3", secondaryReadyDays);
      if (l) labels.push(`R3 → ${l}`);
    }
    return labels;
  }, [splitNums, inwardDate, secondaryReadyDays]);

  const r1ReadyHint =
    splitNums.R1 > 0 ? expectedReadyLabel(inwardDate, "R1", secondaryReadyDays) : null;
  const r2ReadyHint =
    splitNums.R2 > 0 ? expectedReadyLabel(inwardDate, "R2", secondaryReadyDays) : null;
  const r3ReadyHint =
    splitNums.R3 > 0 ? expectedReadyLabel(inwardDate, "R3", secondaryReadyDays) : null;

  const catalogReady = !catalogLoading && plants.length > 0;
  const batchReady = Boolean(batchId) || batchName.trim().length > 0;

  const syncPlantsFromTrays = useCallback(
    (traysVal, cav = cavityNum) => {
      const total = plantsFromTrays(traysVal, cav);
      if (total < 1) {
        setSplitForm(emptySplitForm());
        return;
      }
      setSplitForm((prev) => {
        const r2 = Math.max(0, Number(prev.R2) || 0);
        const r3 = showR3 ? Math.max(0, Number(prev.R3) || 0) : 0;
        const r1 = Math.max(0, total - r2 - r3);
        return {
          R1: String(r1),
          R2: r2 > 0 ? String(r2) : "",
          R3: r3 > 0 ? String(r3) : "",
        };
      });
    },
    [cavityNum, showR3]
  );

  useEffect(() => {
    if (!open || !traysDriven || !batchReady) return;
    if (traysNum > 0) syncPlantsFromTrays(traysNum, cavityNum);
  }, [open, traysDriven, batchReady, traysNum, cavityNum, syncPlantsFromTrays]);

  /** Trays-first: start with 1 tray once batch is picked (Banana R1/R2 flow). */
  useEffect(() => {
    if (!open || !batchReady || traysInput !== "" || !traysDriven) return;
    setTraysInput("1");
    syncPlantsFromTrays(1, cavityNum);
  }, [open, batchReady, traysInput, traysDriven, cavityNum, syncPlantsFromTrays]);

  useEffect(() => {
    if (!open || traysDriven || plantsNum < 1) return;
    setTraysInput(String(Math.max(1, autoTraysFromSplit(splitNums, cavityNum))));
  }, [open, traysDriven, plantsNum, splitNums, cavityNum]);

  const handleTraysChange = (v) => {
    setTraysInput(v);
    setTraysDriven(true);
    syncPlantsFromTrays(v, cavityNum);
  };

  const bumpSize = (key, delta) => {
    setTraysDriven(false);
    const step = cavityNum;
    setSplitForm((prev) => {
      const cur = Math.max(0, Number(prev[key]) || 0);
      return { ...prev, [key]: String(Math.max(0, cur + delta * step)) };
    });
  };

  const handlePlantChange = (id) => {
    setPlantId(id);
    setSubtypeId("");
    setBatchId("");
    setBatchName("");
    setSplitForm(emptySplitForm());
    setTraysInput("");
    setTraysDriven(true);
  };

  const handleSubtypeChange = (id) => {
    setSubtypeId(id);
    setBatchId("");
    setBatchName("");
    setSplitForm(emptySplitForm());
    setTraysInput("");
    setTraysDriven(true);

    const batch = pickDefaultBatchForPlantSubtype(dispatchBatches, plantId, id);
    if (batch) applyBatchSelection(batch);
  };

  const handleBatchNameChange = (v) => {
    setBatchName(v);
    const trimmed = v.trim().toLowerCase();
    if (!trimmed) {
      setBatchId("");
      return;
    }
    const match = batchOptions.find(
      (b) => String(b.batchNumber ?? b.batchNo ?? "").trim().toLowerCase() === trimmed
    );
    if (match) applyBatchSelection(match);
    else setBatchId("");
  };

  const handlePickBatch = (id) => {
    const b = batchOptions.find((x) => refId(x._id ?? x.id) === id);
    if (b) {
      applyBatchSelection(b);
      setSplitForm(emptySplitForm());
      setTraysInput("");
      setTraysDriven(true);
    }
  };

  const fillAllR1 = () => {
    const total = plantsFromTrays(traysInput, cavityNum) || plantsNum;
    if (total < 1) return;
    setTraysDriven(false);
    setSplitForm({ R1: String(total), R2: "", R3: "" });
    setTraysInput(String(Math.max(1, Math.ceil(total / cavityNum))));
  };

  const ensureBatchId = async () => {
    if (batchId && isMongoObjectId(batchId)) return batchId;
    const name = batchName.trim();
    if (!name || !plantId || !subtypeId) return null;

    const globalMatch = dispatchBatches.find(
      (b) => String(b.batchNumber ?? b.batchNo ?? "").trim().toLowerCase() === name.toLowerCase()
    );
    if (globalMatch) {
      const pid = refId(globalMatch.plantCmsId);
      const sid = refId(globalMatch.plantSubtypeId);
      if (pid !== plantId || sid !== subtypeId) {
        Toast.error("This batch number belongs to a different plant/subtype");
        return null;
      }
      const id = refId(globalMatch._id ?? globalMatch.id);
      setBatchId(id);
      return id;
    }

    const readyDays = Math.max(1, Number(selectedSubtype?.plantReadyDays) || 45);
    try {
      const created = await createDispatchBatch({
        batchNumber: name,
        plantCmsId: plantId,
        plantSubtypeId: subtypeId,
        primaryPlantReadyDays: readyDays,
        secondaryPlantReadyDays: readyDays,
        dateAdded: new Date().toISOString(),
      });
      const id = refId(created._id ?? created.id);
      if (!isMongoObjectId(id)) {
        Toast.error("Batch created but ID invalid — pick again");
        return null;
      }
      setDispatchBatches((prev) => [...prev, created]);
      setBatchId(id);
      try {
        localStorage.setItem(SECONDARY_LAGWAD_LAST_BATCH_KEY, id);
      } catch {
        /* ignore */
      }
      return id;
    } catch (e) {
      Toast.error(apiErrText(e) || "Failed to create batch");
      return null;
    }
  };

  const stepError = useMemo(() => {
    if (step === 0) {
      return validateLagwadStep0({
        catalogReady,
        plantId,
        subtypeId,
        batchId,
        batchName,
        plantsNum,
        traysNum,
        singleSizeLagwad,
        pollyhouse,
        inwardDate,
      });
    }
    return validateLagwadStep1(labourTotal);
  }, [
    step,
    catalogReady,
    plantId,
    subtypeId,
    batchId,
    batchName,
    plantsNum,
    traysNum,
    singleSizeLagwad,
    pollyhouse,
    inwardDate,
    labourTotal,
  ]);

  const handleSubmit = async () => {
    const err = validateLagwadStep1(labourTotal);
    if (err) {
      Toast.error(err);
      return;
    }
    if (!readyDateYmd) {
      Toast.error("Could not compute dispatch date — check sowing date");
      return;
    }
    const resolvedId = await ensureBatchId();
    if (!resolvedId) {
      Toast.error("Batch not found — check batch number");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitSecondaryDirectLagwad(resolvedId, {
        sizeSplit: splitNums,
        cavity: cavityNum,
        ...(singleSizeLagwad && traysNum >= 1 ? { numberOfTrays: traysNum } : {}),
        secondaryInwardDate: new Date(inwardDate).toISOString(),
        dateOfDispatch: new Date(readyDateYmd).toISOString(),
        pollyhouse,
        laboursLadies: ladiesNum,
        laboursGents: gentsNum,
        remarks: remarks.trim(),
      });
      try {
        localStorage.setItem(SECONDARY_LAGWAD_LAST_BATCH_KEY, resolvedId);
      } catch {
        /* ignore */
      }
      const readyMonth = dayjs(readyDateYmd).format("MMMM");
      const sellable90 = Math.floor((plantsNum * 9) / 10);
      Toast.success(
        `Lagwad recorded — ${sellable90.toLocaleString("en-IN")} sellable on ${readyMonth} slot (ready ${dayjs(readyDateYmd).format("D MMM YYYY")})`
      );
      onSuccess?.({
        expectedReadyDate: readyDateYmd,
        readyMonth,
        batchId: resolvedId,
        totalPlants: plantsNum,
        result,
      });
      onClose();
    } catch (e) {
      Toast.error(apiErrText(e) || "Lagwad failed");
    } finally {
      setSubmitting(false);
    }
  };

  const tryAdvanceOrSubmit = async () => {
    if (stepError) {
      Toast.error(stepError);
      return;
    }
    if (step === STEPS.length - 1) {
      await handleSubmit();
      return;
    }
    if (step === 0) {
      const id = await ensureBatchId();
      if (!id) {
        Toast.error("Batch not found — check batch number");
        return;
      }
      setStep(1);
    }
  };

  const trayOptions = useMemo(() => {
    const fromTrays = trays.map((t) => ({ value: String(t.cavity), label: t.label ?? t.cavity }));
    if (!fromTrays.some((o) => o.value === DEFAULT_CAVITY)) {
      return [{ value: DEFAULT_CAVITY, label: `Cavity ${DEFAULT_CAVITY}` }, ...fromTrays];
    }
    return fromTrays.length ? fromTrays : [{ value: DEFAULT_CAVITY, label: `Cavity ${DEFAULT_CAVITY}` }];
  }, [trays]);

  const batchLabel =
    selectedBatch?.batchNumber ??
    selectedBatch?.batchNo ??
    (batchName || "—");

  const batchSuggestions = batchOptions.slice(0, 6);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Secondary lagwad (direct)</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "72vh", overflowY: "auto" }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {catalogLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!catalogLoading && step === 0 && (
          <>
            {(plantId || batchReady) && (
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={selectedPlant?.name ?? "Plant"}
                />
                {selectedSubtype && (
                  <Chip size="small" variant="outlined" label={selectedSubtype.name} />
                )}
                <Chip size="small" variant="outlined" label={`Batch ${batchLabel}`} />
                {secondaryReadyDays > 0 && (
                  <Chip size="small" variant="outlined" label={`${secondaryReadyDays}d ready`} />
                )}
              </Stack>
            )}

            <LagwadTotalsBar plantsNum={plantsNum} traysNum={traysNum} readyLabels={readyLabels} />

            <Grid container spacing={2}>
              {!lockPlant && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      required
                      label="Plant"
                      value={plantId}
                      onChange={(e) => handlePlantChange(e.target.value)}
                    >
                      {plants.map((p) => (
                        <MenuItem key={refId(p.plantId ?? p._id)} value={refId(p.plantId ?? p._id)}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      required
                      label="Subtype"
                      value={subtypeId}
                      onChange={(e) => handleSubtypeChange(e.target.value)}
                      disabled={!plantId}
                    >
                      {subtypeOptions.map((st) => (
                        <MenuItem key={st.id} value={st.id}>
                          {st.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}

              {lockPlant && (
                <Grid item xs={12}>
                  <Button
                    size="small"
                    endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setShowAdvanced((v) => !v)}
                    sx={{ textTransform: "none" }}
                  >
                    Change plant / subtype
                  </Button>
                  <Collapse in={showAdvanced}>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          select
                          label="Plant"
                          value={plantId}
                          onChange={(e) => handlePlantChange(e.target.value)}
                        >
                          {plants.map((p) => (
                            <MenuItem
                              key={refId(p.plantId ?? p._id)}
                              value={refId(p.plantId ?? p._id)}
                            >
                              {p.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          select
                          label="Subtype"
                          value={subtypeId}
                          onChange={(e) => handleSubtypeChange(e.target.value)}
                          disabled={!plantId}
                        >
                          {subtypeOptions.map((st) => (
                            <MenuItem key={st.id} value={st.id}>
                              {st.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Collapse>
                </Grid>
              )}

              {subtypeId && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      label="Batch number"
                      value={batchName}
                      onChange={(e) => handleBatchNameChange(e.target.value)}
                      placeholder="Select below or type new batch"
                    />
                    {batchSuggestions.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                        {batchSuggestions.map((b) => {
                          const id = refId(b._id ?? b.id);
                          const num = b.batchNumber ?? b.batchNo;
                          return (
                            <Chip
                              key={id}
                              size="small"
                              label={num}
                              variant={batchId === id ? "filled" : "outlined"}
                              color={batchId === id ? "primary" : "default"}
                              onClick={() => handlePickBatch(id)}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  </Grid>
                </>
              )}

              {batchReady && (
                <>
                  <Grid item xs={12}>
                    <LagwadDatesSection
                      inwardDate={inwardDate}
                      onInwardDateChange={setInwardDate}
                      secondaryReadyDays={secondaryReadyDays}
                      readyDateYmd={readyDateYmd}
                      readyLabels={readyLabels}
                      pollyhouse={pollyhouse}
                      onPollyhouseChange={setPollyhouse}
                      locations={locations}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Trays sown (Banana R1/R2)
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <IconButton
                          onClick={() => handleTraysChange(String(Math.max(1, traysNum - 1)))}
                          disabled={traysNum <= 1}
                        >
                          <RemoveIcon />
                        </IconButton>
                        <TextField
                          type="number"
                          value={traysInput}
                          onChange={(e) => handleTraysChange(e.target.value)}
                          inputProps={{ min: 1 }}
                          sx={{ width: 100 }}
                          size="small"
                        />
                        <IconButton onClick={() => handleTraysChange(String(traysNum + 1))}>
                          <AddIcon />
                        </IconButton>
                        <TextField
                          select
                          size="small"
                          label="Cavity"
                          value={cavity}
                          onChange={(e) => setCavity(e.target.value)}
                          sx={{ minWidth: 120, ml: 1 }}
                        >
                          {trayOptions.map((t) => (
                            <MenuItem key={t.value} value={t.value}>
                              {t.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                      {traysNum > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {traysNum} × {cavityNum} ={" "}
                          <strong>{plantsFromTrays(traysNum, cavityNum).toLocaleString("en-IN")}</strong>{" "}
                          plants
                        </Typography>
                      )}
                      <Button size="small" onClick={fillAllR1} sx={{ mt: 1, textTransform: "none" }}>
                        Put all in R1
                      </Button>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      R1 / R2 split (30-day slot)
                    </Typography>
                  </Grid>
                  <SizeSplitRow
                    label="R1"
                    hint={`${secondaryReadyDaysForSize("R1", secondaryReadyDays)}d slot`}
                    readyHint={r1ReadyHint}
                    value={splitForm.R1}
                    cavityNum={cavityNum}
                    onChange={(v) => {
                      setTraysDriven(false);
                      setSplitForm((s) => ({ ...s, R1: v }));
                    }}
                    onBump={(d) => bumpSize("R1", d)}
                  />
                  <SizeSplitRow
                    label="R2"
                    hint={`${secondaryReadyDaysForSize("R2", secondaryReadyDays)}d · outward`}
                    readyHint={r2ReadyHint}
                    value={splitForm.R2}
                    cavityNum={cavityNum}
                    onChange={(v) => {
                      setTraysDriven(false);
                      setSplitForm((s) => ({ ...s, R2: v }));
                    }}
                    onBump={(d) => bumpSize("R2", d)}
                  />

                  {!showR3 ? (
                    <Grid item xs={12}>
                      <Button size="small" onClick={() => setShowR3(true)} sx={{ textTransform: "none" }}>
                        + Add R3 (40-day slot)
                      </Button>
                    </Grid>
                  ) : (
                    <SizeSplitRow
                      label="R3"
                      hint={`${secondaryReadyDaysForSize("R3", secondaryReadyDays)}d slot`}
                      readyHint={r3ReadyHint}
                      value={splitForm.R3}
                      cavityNum={cavityNum}
                      onChange={(v) => {
                        setTraysDriven(false);
                        setSplitForm((s) => ({ ...s, R3: v }));
                      }}
                      onBump={(d) => bumpSize("R3", d)}
                    />
                  )}

                </>
              )}
            </Grid>
          </>
        )}

        {step === 1 && (
          <>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Review
              </Typography>
              <Typography variant="body2">
                {selectedPlant?.name ?? "Plant"} · {selectedSubtype?.name ?? "—"} · Batch {batchLabel}
              </Typography>
              <Typography variant="body2">
                R1: {splitNums.R1.toLocaleString("en-IN")} · R2: {splitNums.R2.toLocaleString("en-IN")}
                {splitNums.R3 > 0 ? ` · R3: ${splitNums.R3.toLocaleString("en-IN")}` : ""}
              </Typography>
              <Typography variant="body2">
                Total: {plantsNum.toLocaleString("en-IN")} plants
                {traysNum > 0 ? ` · ${traysNum} trays` : ""}
              </Typography>
              <Typography variant="body2">Shed: {pollyhouse || "—"}</Typography>
              <Typography variant="body2">
                Sowing: {dayjs(inwardDate).format("DD-MM-YYYY")} → Dispatch:{" "}
                {readyDateYmd ? dayjs(readyDateYmd).format("DD-MM-YYYY") : "—"}
              </Typography>
            </Paper>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Labour (ladies)"
                  value={ladies}
                  onChange={(e) => setLadies(e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Labour (gents)"
                  value={gents}
                  onChange={(e) => setGents(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {step > 0 && (
          <Button onClick={() => setStep((s) => s - 1)} disabled={submitting}>
            Back
          </Button>
        )}
        <Button
          variant="contained"
          disabled={submitting || catalogLoading}
          onClick={() => void tryAdvanceOrSubmit()}
        >
          {submitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : step === STEPS.length - 1 ? (
            `Save (${plantsNum} plants)`
          ) : (
            "Next"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
