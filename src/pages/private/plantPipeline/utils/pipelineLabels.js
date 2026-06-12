import dayjs from "dayjs";
import { batchPlantSubtypeLabel } from "utils/batchPlantDisplay";

export const SIZES = ["R1", "R2", "R3"];

export const PLANTS_PER_BOTTLE = { R1: 10, R2: 10, R3: 9 };

export function resolveBatchId(doc) {
  if (!doc) return "";
  const raw = doc.batchId;
  if (raw && typeof raw === "object" && raw._id) return String(raw._id);
  return raw != null ? String(raw) : "";
}

export function batchNumber(doc) {
  const b = doc?.batchId;
  if (b && typeof b === "object") return b.batchNumber ?? b.batchNo ?? "—";
  return "—";
}

export function batchLabel(doc) {
  const id = resolveBatchId(doc);
  const num = batchNumber(doc);
  const { plant, subtype } = batchPlantSubtypeLabel(
    doc?.batchId && typeof doc.batchId === "object" ? doc.batchId : null
  );
  return `${num} · ${plant} / ${subtype}${id ? ` (${id.slice(-6)})` : ""}`;
}

export function formatPipelineDate(value) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : "—";
}

export function toIsoDate(value) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.toISOString() : null;
}

export function calcPlantsFromBottles(size, bottles) {
  const n = Number(bottles) || 0;
  const mult = PLANTS_PER_BOTTLE[size] ?? 10;
  return n * mult;
}

export function apiErrText(err) {
  return String(
    err?.response?.data?.message ||
      err?.message ||
      err?.data?.message ||
      err?.error ||
      ""
  );
}

export function unpackData(res) {
  const body = res?.data;
  if (body?.data !== undefined) return body.data;
  return body;
}
