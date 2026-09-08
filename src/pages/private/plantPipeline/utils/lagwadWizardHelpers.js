import dayjs from "dayjs";

export const DEFAULT_CAVITY = "8";
export const DEFAULT_SECONDARY_R1_READY_DAYS = 30;
export const DEFAULT_SECONDARY_R3_READY_DAYS = 40;

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

export function secondaryReadyDaysForSize(size, batchSecondaryDays) {
  const base = Number(batchSecondaryDays) || 0;
  const r1Days = base > 0 ? base : DEFAULT_SECONDARY_R1_READY_DAYS;
  if (String(size).toUpperCase() === "R3") return DEFAULT_SECONDARY_R3_READY_DAYS;
  return r1Days;
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

export function validateLagwadStep0(input) {
  if (!input.catalogReady) return "Loading plant catalog…";
  if (!input.plantId) return "Select plant";
  if (!input.subtypeId) return "Select subtype";
  if (!input.batchId && !String(input.batchName || "").trim()) {
    return "Select or enter batch number";
  }
  if (input.plantsNum < 1) return "Enter at least 1 plant in R1/R2/R3";
  if (input.singleSizeLagwad && input.traysNum < 1) return "Enter tray count";
  if (!input.pollyhouse) return "Select polyhouse / shed";
  if (!input.inwardDate) return "Select sowing date";
  return "";
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

/** Prefer G-9 subtype when present on banana. */
export function findDefaultBananaSubtype(subtypes) {
  if (!subtypes?.length) return null;
  const g9 = subtypes.find((s) =>
    /g-?\s*9|grand\s*nine|जी\s*9/i.test(String(s.name ?? ""))
  );
  return g9 ?? subtypes[0];
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
