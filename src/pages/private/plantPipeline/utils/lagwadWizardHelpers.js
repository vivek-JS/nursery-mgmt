import dayjs from "dayjs";

export const DEFAULT_CAVITY = "8";
export const DEFAULT_SECONDARY_R1_READY_DAYS = 30;
export const DEFAULT_SECONDARY_R2_READY_DAYS = 40;
export const DEFAULT_SECONDARY_R3_READY_DAYS = 40;

/** G9 batch defaults: R1 30, R2 40, R3 stored on the batch (starts at the R3 default). */
export const G9_BATCH_READY_DAYS = {
  r1: DEFAULT_SECONDARY_R1_READY_DAYS,
  r2: DEFAULT_SECONDARY_R2_READY_DAYS,
  r3: DEFAULT_SECONDARY_R3_READY_DAYS,
};

export const EMPTY_SIZE_SPLIT = { R1: 0, R2: 0, R3: 0 };

export function refId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
}

export function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim());
}

export function parseSplitFromForm(form) {
  return {
    R1: Math.max(0, Number(form.R1) || 0),
    R2: Math.max(0, Number(form.R2) || 0),
    R3: Math.max(0, Number(form.R3) || 0),
  };
}

export function totalPlantsFromSplit(split) {
  return (split.R1 ?? 0) + (split.R2 ?? 0) + (split.R3 ?? 0);
}

export function activeSizeCount(split) {
  return [split.R1, split.R2, split.R3].filter((n) => n > 0).length;
}

function readySource(source) {
  if (source && typeof source === "object") return source;
  return { secondaryPlantReadyDays: Number(source) || 0 };
}

/** R1 uses secondary days. R2 and R3 use their own CMS fields, else 40. */
export function secondaryReadyDaysForSize(size, source) {
  const batch = readySource(source);
  const r1Base = Number(batch.secondaryPlantReadyDays) || 0;
  const r1Days = r1Base > 0 ? r1Base : DEFAULT_SECONDARY_R1_READY_DAYS;
  const r2Explicit = Number(batch.secondaryR2PlantReadyDays) || 0;
  const r2Days = r2Explicit > 0 ? r2Explicit : DEFAULT_SECONDARY_R2_READY_DAYS;
  const r3Explicit = Number(batch.secondaryR3PlantReadyDays) || 0;
  const r3Days = r3Explicit > 0 ? r3Explicit : DEFAULT_SECONDARY_R3_READY_DAYS;
  const key = String(size ?? "").toUpperCase();
  if (key === "R2") return r2Days;
  if (key === "R3") return r3Days;
  return r1Days;
}

export function readyDaysBySizeFromSplit(splitNums, batchSecondaryDays) {
  const out = {};
  for (const size of ["R1", "R2", "R3"]) {
    if ((splitNums?.[size] ?? 0) > 0) {
      out[size] = secondaryReadyDaysForSize(size, batchSecondaryDays);
    }
  }
  return out;
}

export function dateOfDispatchFromInwardAndReadyDays(inwardYmd, secondaryReadyDays) {
  if (!inwardYmd || !dayjs(inwardYmd, "YYYY-MM-DD", true).isValid()) return inwardYmd;
  const d = Math.max(0, Number(secondaryReadyDays) || 0);
  if (d <= 0) return inwardYmd;
  return dayjs(inwardYmd).add(d, "day").format("YYYY-MM-DD");
}

export function expectedReadyLabel(inwardYmd, size, batchSecondaryDays) {
  if (!inwardYmd || !dayjs(inwardYmd).isValid()) return null;
  const days = secondaryReadyDaysForSize(size, batchSecondaryDays);
  return dayjs(inwardYmd).add(days, "day").format("DD MMM YYYY");
}

export function computeReadyDateYmd(inwardDate, splitNums, secondaryReadyDays) {
  const candidates = [];
  if (splitNums.R1 > 0) {
    candidates.push(
      dateOfDispatchFromInwardAndReadyDays(
        inwardDate,
        secondaryReadyDaysForSize("R1", secondaryReadyDays)
      )
    );
  }
  if (splitNums.R2 > 0) {
    candidates.push(
      dateOfDispatchFromInwardAndReadyDays(
        inwardDate,
        secondaryReadyDaysForSize("R2", secondaryReadyDays)
      )
    );
  }
  if (splitNums.R3 > 0) {
    candidates.push(
      dateOfDispatchFromInwardAndReadyDays(
        inwardDate,
        secondaryReadyDaysForSize("R3", secondaryReadyDays)
      )
    );
  }
  if (!candidates.length) {
    return dateOfDispatchFromInwardAndReadyDays(
      inwardDate,
      secondaryReadyDaysForSize("R1", secondaryReadyDays)
    );
  }
  return candidates.sort().reverse()[0];
}

export function autoTraysFromSplit(splitNums, cavityNum) {
  const cavity = Math.max(1, cavityNum);
  return (
    Math.ceil(splitNums.R1 / cavity) +
    Math.ceil(splitNums.R2 / cavity) +
    Math.ceil(splitNums.R3 / cavity)
  );
}

export function validateLagwadEntry(input) {
  if (!input.catalogReady) return "Loading plant catalog…";
  if (!input.plantId) return "Select plant";
  if (!input.subtypeId) return "Select subtype";
  if (!input.batchId && !String(input.batchName || "").trim()) {
    return "Select a batch";
  }
  if (input.plantsNum < 1) return "Enter plants in R1, or add R2 / R3";
  if (!input.pollyhouse) return "Select shed";
  if (!input.inwardDate) return "Select date";
  if ((input.labourTotal ?? 0) < 1) return "Enter labour (ladies + gents)";
  return "";
}

export function validateLagwadStep0(input) {
  return validateLagwadEntry({ ...input, labourTotal: 1 });
}

export function validateLagwadStep1(labourTotal) {
  if (labourTotal < 1) return "Enter labour count (ladies + gents ≥ 1)";
  return "";
}

export function filterBatchesForPlantSubtype(dispatchBatches, plantId, subtypeId) {
  if (!plantId || !subtypeId) return [];
  return (dispatchBatches || []).filter(
    (b) => refId(b.plantCmsId) === plantId && refId(b.plantSubtypeId) === subtypeId
  );
}

/** Match Banana / Keli / केळी — default crop for shed lagwad (same as primary mobile). */
export function findDefaultBananaPlant(plants) {
  if (!plants?.length) return null;
  return (
    plants.find((p) => /banana|keli|केळ/i.test(String(p.name ?? ""))) ?? null
  );
}

export function isBananaPlantName(name) {
  return /banana|keli|केळ/i.test(String(name ?? ""));
}

export function isG9SubtypeName(name) {
  return /g-?\s*9|grand\s*naine|grand\s*nine|जी\s*9/i.test(String(name ?? ""));
}

/** Prefer G-9 subtype when present on banana. */
export function findDefaultBananaSubtype(subtypes) {
  if (!subtypes?.length) return null;
  return subtypes.find((s) => isG9SubtypeName(s.name)) ?? subtypes[0];
}

/** Most recently added batch for plant+subtype (fallback: first in list). */
export function pickDefaultBatchForPlantSubtype(dispatchBatches, plantId, subtypeId) {
  const list = filterBatchesForPlantSubtype(dispatchBatches, plantId, subtypeId);
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => {
    const da = new Date(a.updatedAt ?? a.createdAt ?? a.dateAdded ?? 0).getTime();
    const db = new Date(b.updatedAt ?? b.createdAt ?? b.dateAdded ?? 0).getTime();
    return db - da;
  });
  return sorted[0];
}

export function plantsFromTrays(trays, cavity) {
  const t = Math.max(0, Number(trays) || 0);
  const c = Math.max(1, Number(cavity) || DEFAULT_CAVITY);
  return t > 0 ? t * c : 0;
}

export const SECONDARY_LAGWAD_LAST_BATCH_KEY = "erp:secondary-lagwad-last-batch";
