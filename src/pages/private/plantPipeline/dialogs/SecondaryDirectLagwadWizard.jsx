import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import LagwadEntryDialog, { LagwadEntryForm, LagwadReviewDialog } from "./LagwadWizardView";
import {
  createDispatchBatch,
  fetchDispatchBatches,
  fetchLagwadPlants,
  submitSecondaryDirectLagwad,
  apiErrText,
} from "../utils/pipelineApi";
import {
  DEFAULT_CAVITY,
  DEFAULT_SECONDARY_R1_READY_DAYS,
  DEFAULT_SECONDARY_R2_READY_DAYS,
  DEFAULT_SECONDARY_R3_READY_DAYS,
  G9_BATCH_READY_DAYS,
  autoTraysFromSplit,
  computeReadyDateYmd,
  filterBatchesForPlantSubtype,
  findDefaultBananaPlant,
  findDefaultBananaSubtype,
  isG9SubtypeName,
  isMongoObjectId,
  parseSplitFromForm,
  readyDaysBySizeFromSplit,
  refId,
  totalPlantsFromSplit,
  validateLagwadEntry,
} from "../utils/lagwadWizardHelpers";

const emptySplitForm = () => ({ R1: "", R2: "", R3: "" });

function subtypeIdOf(sub) {
  return sub ? refId(sub.subtypeId ?? sub._id ?? sub.id) : "";
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
  const [submitting, setSubmitting] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [plants, setPlants] = useState([]);
  const [dispatchBatches, setDispatchBatches] = useState([]);
  const [showR2, setShowR2] = useState(false);
  const [showR3, setShowR3] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const defaultsAppliedRef = useRef(false);

  const [plantId, setPlantId] = useState("");
  const [subtypeId, setSubtypeId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [batchName, setBatchName] = useState("");
  const [splitForm, setSplitForm] = useState(emptySplitForm);
  const [cavity, setCavity] = useState(DEFAULT_CAVITY);
  const [pollyhouse, setPollyhouse] = useState("");
  const [inwardDate, setInwardDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [ladies, setLadies] = useState("");
  const [gents, setGents] = useState("");

  const reset = useCallback(() => {
    setPlantId("");
    setSubtypeId("");
    setBatchId("");
    setBatchName("");
    setSplitForm(emptySplitForm());
    setCavity(DEFAULT_CAVITY);
    setPollyhouse("");
    setInwardDate(dayjs().format("YYYY-MM-DD"));
    setLadies("");
    setGents("");
    setShowR2(false);
    setShowR3(false);
    setReviewOpen(false);
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
    fetchDispatchBatches()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) setDispatchBatches(rows);
      })
      .catch(() => {});
  }, [open]);

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
  }, []);

  const pickSubtype = useCallback((plant, preferredId = "") => {
    const subs = plant?.subtypes ?? [];
    if (preferredId) {
      const hit = subs.find((s) => subtypeIdOf(s) === preferredId);
      if (hit) return subtypeIdOf(hit);
    }
    return subtypeIdOf(findDefaultBananaSubtype(subs));
  }, []);

  useEffect(() => {
    if (!open || catalogLoading || defaultsAppliedRef.current || !plants.length) return;

    if (initialBatchId) {
      const batch = dispatchBatches.find((b) => refId(b._id ?? b.id) === initialBatchId);
      if (batch) {
        applyBatchSelection(batch);
        defaultsAppliedRef.current = true;
        return;
      }
      if (!dispatchBatches.length) return;
    }

    if (initialPlantId) {
      const plant = plants.find((p) => refId(p.plantId ?? p._id) === initialPlantId);
      if (plant) {
        setPlantId(initialPlantId);
        const sid = pickSubtype(plant, initialSubtypeId);
        if (sid) setSubtypeId(sid);
        defaultsAppliedRef.current = true;
        return;
      }
    }

    const banana = findDefaultBananaPlant(plants);
    if (banana) {
      const pid = refId(banana.plantId ?? banana._id);
      setPlantId(pid);
      const sid = pickSubtype(banana);
      if (sid) setSubtypeId(sid);
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
    pickSubtype,
  ]);

  const selectedPlant = useMemo(
    () => plants.find((p) => refId(p.plantId ?? p._id) === plantId),
    [plants, plantId]
  );

  const subtypeOptions = useMemo(
    () =>
      (selectedPlant?.subtypes ?? []).map((st) => ({
        id: subtypeIdOf(st),
        name: st.name ?? "Subtype",
        plantReadyDays: Number(st.plantReadyDays) || 0,
      })),
    [selectedPlant]
  );

  const selectedSubtype = useMemo(
    () => subtypeOptions.find((s) => s.id === subtypeId) ?? null,
    [subtypeOptions, subtypeId]
  );

  const batchOptions = useMemo(() => {
    const list = filterBatchesForPlantSubtype(dispatchBatches, plantId, subtypeId);
    return [...list].sort((a, b) => {
      const da = new Date(a.updatedAt ?? a.createdAt ?? a.dateAdded ?? 0).getTime();
      const db = new Date(b.updatedAt ?? b.createdAt ?? b.dateAdded ?? 0).getTime();
      return db - da;
    });
  }, [dispatchBatches, plantId, subtypeId]);

  const selectedBatch = useMemo(
    () => batchOptions.find((b) => refId(b._id ?? b.id) === batchId) ?? null,
    [batchOptions, batchId]
  );

  const isG9 = isG9SubtypeName(selectedSubtype?.name);
  const readySource = useMemo(() => {
    const g9 = isG9 ? G9_BATCH_READY_DAYS : null;
    return {
      secondaryPlantReadyDays:
        Number(selectedBatch?.secondaryPlantReadyDays) ||
        g9?.r1 ||
        Number(selectedSubtype?.plantReadyDays) ||
        DEFAULT_SECONDARY_R1_READY_DAYS,
      secondaryR2PlantReadyDays:
        Number(selectedBatch?.secondaryR2PlantReadyDays) ||
        g9?.r2 ||
        DEFAULT_SECONDARY_R2_READY_DAYS,
      secondaryR3PlantReadyDays:
        Number(selectedBatch?.secondaryR3PlantReadyDays) ||
        g9?.r3 ||
        DEFAULT_SECONDARY_R3_READY_DAYS,
    };
  }, [selectedBatch, selectedSubtype, isG9]);

  const splitNums = useMemo(() => {
    const parsed = parseSplitFromForm(splitForm);
    return {
      R1: parsed.R1,
      R2: showR2 ? parsed.R2 : 0,
      R3: showR3 ? parsed.R3 : 0,
    };
  }, [splitForm, showR2, showR3]);

  const plantsNum = totalPlantsFromSplit(splitNums);
  const cavityNum = Math.max(1, Number(cavity) || Number(DEFAULT_CAVITY));
  const traysNum = plantsNum > 0 ? autoTraysFromSplit(splitNums, cavityNum) : 0;
  const ladiesNum = Math.max(0, Number(ladies) || 0);
  const gentsNum = Math.max(0, Number(gents) || 0);
  const labourTotal = ladiesNum + gentsNum;

  const readyDateYmd = useMemo(
    () => computeReadyDateYmd(inwardDate, splitNums, readySource),
    [inwardDate, splitNums, readySource]
  );

  const clearCounts = () => setSplitForm(emptySplitForm());

  const handlePlantChange = (id) => {
    const plant = plants.find((p) => refId(p.plantId ?? p._id) === id);
    setPlantId(id);
    setSubtypeId(pickSubtype(plant));
    setBatchId("");
    setBatchName("");
    clearCounts();
    setShowR2(false);
    setShowR3(false);
  };

  const handleSubtypeChange = (id) => {
    setSubtypeId(id);
    setBatchId("");
    setBatchName("");
    clearCounts();
  };

  const clearBatch = () => {
    setBatchId("");
    setBatchName("");
    clearCounts();
  };

  const handlePickBatch = (id) => {
    const batch = batchOptions.find((x) => refId(x._id ?? x.id) === id);
    if (batch) applyBatchSelection(batch);
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
        Toast.error("This batch number belongs to a different plant or variety");
        return null;
      }
      const id = refId(globalMatch._id ?? globalMatch.id);
      setBatchId(id);
      return id;
    }

    const r1Days = readySource.secondaryPlantReadyDays;
    try {
      const created = await createDispatchBatch({
        batchNumber: name,
        plantCmsId: plantId,
        plantSubtypeId: subtypeId,
        primaryPlantReadyDays: r1Days,
        secondaryPlantReadyDays: r1Days,
        secondaryR2PlantReadyDays: readySource.secondaryR2PlantReadyDays,
        secondaryR3PlantReadyDays: readySource.secondaryR3PlantReadyDays,
        dateAdded: new Date().toISOString(),
      });
      const id = refId(created._id ?? created.id);
      if (!isMongoObjectId(id)) {
        Toast.error("Batch created but ID invalid — pick again");
        return null;
      }
      setDispatchBatches((prev) => [...prev, created]);
      setBatchId(id);
      return id;
    } catch (e) {
      Toast.error(apiErrText(e) || "Failed to create batch");
      return null;
    }
  };

  const entryError = useMemo(
    () =>
      validateLagwadEntry({
        catalogReady: !catalogLoading,
        plantId,
        subtypeId,
        batchId,
        batchName,
        plantsNum,
        pollyhouse,
        inwardDate,
        labourTotal,
      }),
    [
      catalogLoading,
      plants.length,
      plantId,
      subtypeId,
      batchId,
      batchName,
      plantsNum,
      pollyhouse,
      inwardDate,
      labourTotal,
    ]
  );

  const handleSubmit = async () => {
    if (entryError) {
      Toast.error(entryError);
      return;
    }
    if (!readyDateYmd) {
      Toast.error("Could not compute ready date — check the date");
      return;
    }
    const resolvedId = await ensureBatchId();
    if (!resolvedId) {
      Toast.error("Batch not found — pick a batch");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitSecondaryDirectLagwad(resolvedId, {
        sizeSplit: splitNums,
        readyDaysBySize: readyDaysBySizeFromSplit(splitNums, readySource),
        cavity: cavityNum,
        numberOfTrays: traysNum,
        secondaryInwardDate: new Date(inwardDate).toISOString(),
        dateOfDispatch: new Date(readyDateYmd).toISOString(),
        pollyhouse,
        laboursLadies: ladiesNum,
        laboursGents: gentsNum,
      });
      const readyMonth = dayjs(readyDateYmd).format("MMMM");
      Toast.success(
        `Lagwad saved — ${plantsNum.toLocaleString("en-IN")} plants, ready ${dayjs(readyDateYmd).format("D MMM YYYY")}`
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

  const trayOptions = useMemo(() => {
    const fromTrays = trays.map((t) => ({
      value: String(t.cavity),
      label: String(t.cavity),
    }));
    const unique = [];
    const seen = new Set();
    for (const opt of fromTrays) {
      if (!opt.value || seen.has(opt.value)) continue;
      seen.add(opt.value);
      unique.push(opt);
    }
    if (!seen.has(DEFAULT_CAVITY)) {
      unique.unshift({ value: DEFAULT_CAVITY, label: DEFAULT_CAVITY });
    }
    unique.sort((a, b) => Number(a.value) - Number(b.value));
    return unique.length ? unique : [{ value: DEFAULT_CAVITY, label: DEFAULT_CAVITY }];
  }, [trays]);

  return (
    <LagwadEntryDialog
      open={open}
      onClose={onClose}
      submitting={submitting}
      catalogLoading={catalogLoading}
      plantName={selectedPlant?.name}
      subtypeName={selectedSubtype?.name}
      plantsNum={plantsNum}
      traysNum={traysNum}
      onSave={() => {
        if (entryError) {
          Toast.error(entryError);
          return;
        }
        setReviewOpen(true);
      }}
    >
      <LagwadEntryForm
        plants={plants}
        plantId={plantId}
        subtypeId={subtypeId}
        subtypeOptions={subtypeOptions}
        onPlant={handlePlantChange}
        onSubtype={handleSubtypeChange}
        batchOptions={batchOptions}
        selectedBatch={selectedBatch}
        onClearBatch={clearBatch}
        onPickBatch={handlePickBatch}
        inwardDate={inwardDate}
        onInwardDate={setInwardDate}
        pollyhouse={pollyhouse}
        onPollyhouse={setPollyhouse}
        locations={locations}
        cavity={String(cavity)}
        cavityNum={cavityNum}
        trayOptions={trayOptions}
        onCavity={setCavity}
        traysNum={traysNum}
        plantsNum={plantsNum}
        splitForm={splitForm}
        showR2={showR2}
        showR3={showR3}
        onShowR2={() => setShowR2(true)}
        onShowR3={() => setShowR3(true)}
        onHideR2={() => {
          setShowR2(false);
          setSplitForm((s) => ({ ...s, R2: "" }));
        }}
        onHideR3={() => {
          setShowR3(false);
          setSplitForm((s) => ({ ...s, R3: "" }));
        }}
        onSplit={(key, value) => setSplitForm((s) => ({ ...s, [key]: value }))}
        readySource={readySource}
        ladies={ladies}
        gents={gents}
        onLadies={setLadies}
        onGents={setGents}
      />
      <LagwadReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void handleSubmit()}
        submitting={submitting}
        plantName={selectedPlant?.name}
        subtypeName={selectedSubtype?.name}
        batchLabel={selectedBatch?.batchNumber ?? selectedBatch?.batchNo ?? (batchName || "—")}
        inwardDate={inwardDate}
        pollyhouse={pollyhouse}
        splitNums={splitNums}
        readySource={readySource}
        traysNum={traysNum}
        cavityNum={cavityNum}
        plantsNum={plantsNum}
        ladiesNum={ladiesNum}
        gentsNum={gentsNum}
      />
    </LagwadEntryDialog>
  );
}
