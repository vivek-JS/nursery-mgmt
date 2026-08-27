import { API, NetworkManager } from "network/core";
import { apiErrText, unpackData } from "./pipelineLabels";

async function request(router, body = {}, params = {}) {
  const inst = NetworkManager(router);
  const res = await inst.request(body, params);
  if (res?.success === false) {
    throw new Error(res.error || res.message || "Request failed");
  }
  return res;
}

export async function fetchOutwards() {
  const res = await request(API.PLANT_OUTWARD.GET_OUTWARDS, {}, {});
  const list = unpackData(res);
  return Array.isArray(list) ? list : [];
}

export async function fetchPrimaryDashboard(upcomingDays = 7) {
  const res = await request(API.PLANT_OUTWARD.PRIMARY_MOBILE_DASHBOARD, {}, { upcomingDays });
  const dash = unpackData(res);
  return dash && typeof dash === "object" ? dash : {};
}

export async function fetchSecondaryDashboard(upcomingDays = 7) {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_MOBILE_DASHBOARD,
    {},
    { upcomingDays, syncSlotStock: "true" }
  );
  const dash = unpackData(res);
  return dash && typeof dash === "object" ? dash : {};
}

export async function fetchDispatchBatches() {
  const res = await request(API.BATCH.GET_BATCHES, {}, {});
  const data = unpackData(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function shadeLocationOption(shade) {
  const name = String(shade?.name ?? "").trim();
  const num = String(shade?.number ?? "").trim();
  const label = name && num ? `${name} (${num})` : name || num;
  const value = label || String(shade?._id ?? shade?.id ?? "");
  if (!value) return null;
  return { value, label: label || value };
}

export async function fetchLocations() {
  const [pollyRes, shadeRes] = await Promise.all([
    request(API.POLLY_HOUSE.GET_HOUSES, {}, { page: 1, limit: 500, status: "true" }),
    request(API.SHADE.GET_SHADES, {}, { status: "true" }),
  ]);
  const polly = unpackData(pollyRes);
  const shade = unpackData(shadeRes);
  const pollyList = Array.isArray(polly) ? polly : polly?.data ?? [];
  const shadeList = Array.isArray(shade) ? shade : shade?.data ?? [];
  const opts = [];
  const seen = new Set();
  for (const p of [...pollyList, ...shadeList]) {
    if (p?.isActive === false) continue;
    const fromShade = p?.number != null ? shadeLocationOption(p) : null;
    const val = fromShade?.value ?? String(p._id ?? p.id ?? p.name ?? "");
    const label = fromShade?.label ?? p.name ?? p.label ?? val;
    if (!val || seen.has(val)) continue;
    seen.add(val);
    opts.push({ value: val, label });
  }
  return opts;
}

/** Secondary lagwad / shed ops — shaded locations only (excludes primary pollyhouses). */
export async function fetchSecondaryLocations() {
  const shadeRes = await request(API.SHADE.GET_SHADES, {}, {
    status: "true",
    excludePrimary: "true",
  });
  const shade = unpackData(shadeRes);
  const shadeList = Array.isArray(shade) ? shade : shade?.data ?? [];
  const opts = [];
  const seen = new Set();
  for (const s of shadeList) {
    if (s?.isActive === false || s?.is_primary === true) continue;
    const opt = shadeLocationOption(s);
    if (!opt || seen.has(opt.value)) continue;
    seen.add(opt.value);
    opts.push(opt);
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchTrays() {
  const res = await request(API.TRAY.GET_TRAYS, {}, {});
  const list = unpackData(res);
  const trays = Array.isArray(list) ? list : list?.data ?? [];
  return trays.map((t) => ({
    id: String(t._id ?? t.id),
    cavity: Number(t.cavity ?? t.numberOfCavities ?? 126),
    label: t.name ? `${t.name} (${t.cavity})` : `Cavity ${t.cavity}`,
  }));
}

export async function addLabEntry(batchId, labData) {
  await request(API.PLANT_OUTWARD.ADD_LAB, { batchId, labData }, {});
}

export async function reviewLabLine(batchId, labId, action, rejectionReason = "") {
  await request(
    API.PLANT_OUTWARD.LAB_REVIEW,
    { action, ...(action === "reject" ? { rejectionReason } : {}) },
    { pathParams: [batchId, labId] }
  );
}

export async function previewPrimaryInwardFifo(body) {
  const res = await request(API.PLANT_OUTWARD.PRIMARY_INWARD_FIFO_PREVIEW, body, {});
  return unpackData(res) ?? {};
}

export async function submitPrimaryInwardBulk(body) {
  await request(API.PLANT_OUTWARD.PRIMARY_INWARD_BULK, body, {});
}

export async function submitPrimaryOutwardBatch(batchId, body) {
  await request(API.PLANT_OUTWARD.PRIMARY_INWARD_TO_OUTWARD_BATCH, body, {
    pathParams: [batchId],
  });
}

export async function submitPrimaryToSecondary(batchId, body) {
  await request(API.PLANT_OUTWARD.PRIMARY_TO_SECONDARY, body, { pathParams: [batchId] });
}

export async function patchPrimaryReadinessBypass(batchId, primaryInwardId, reason) {
  await request(
    API.PLANT_OUTWARD.PRIMARY_INWARD_READINESS_BYPASS,
    { reason },
    { pathParams: [batchId, primaryInwardId] }
  );
}

export async function acknowledgePrimaryOutward(batchId, primaryOutwardId) {
  await request(
    API.PLANT_OUTWARD.SECONDARY_ACKNOWLEDGE_PRIMARY_OUTWARD,
    {},
    { pathParams: [batchId, primaryOutwardId] }
  );
}

export async function recordMortality(batchId, primaryOutwardId, quantity, remarks) {
  await request(
    API.PLANT_OUTWARD.SECONDARY_PRIMARY_OUTWARD_MORTALITY,
    { quantity, remarks },
    { pathParams: [batchId, primaryOutwardId] }
  );
}

export async function markSowingComplete(batchId, primaryOutwardId) {
  await request(
    API.PLANT_OUTWARD.SECONDARY_PRIMARY_OUTWARD_SOWING_COMPLETE,
    {},
    { pathParams: [batchId, primaryOutwardId] }
  );
}

export async function submitSecondaryLagwad(batchId, body) {
  await request(API.PLANT_OUTWARD.SECONDARY_BATCH_LAGWAD, body, { pathParams: [batchId] });
}

export async function patchSecondaryReadinessBypass(batchId, secondaryInwardId, reason) {
  await request(
    API.PLANT_OUTWARD.SECONDARY_INWARD_READINESS_BYPASS,
    { reason },
    { pathParams: [batchId, secondaryInwardId] }
  );
}

export async function fetchOrdersReadyForDispatch(batchId) {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_ORDERS_READY_FOR_DISPATCH,
    {},
    { pathParams: [batchId] }
  );
  const payload = unpackData(res);
  return Array.isArray(payload?.orders) ? payload.orders : [];
}

export async function submitSecondaryOutward(batchId, body) {
  await request(API.PLANT_OUTWARD.SECONDARY_INWARD_TO_OUTWARD_NS, body, {
    pathParams: [batchId],
  });
}

export async function fetchVehicleDispatches(page = 1, search = "") {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_VEHICLE_DISPATCHES,
    {},
    { page, limit: 20, ...(search.trim() ? { search: search.trim() } : {}) }
  );
  const payload = unpackData(res);
  return {
    items: payload?.items ?? [],
    page: payload?.page ?? 1,
    totalPages: payload?.totalPages ?? 1,
  };
}

export async function fetchVehicleAllocation(dispatchId, plantRowIndex = 0, batchId = "") {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_VEHICLE_DISPATCH_ALLOCATION,
    {},
    {
      pathParams: [dispatchId],
      plantRowIndex,
      ...(batchId ? { batchId } : {}),
    }
  );
  return unpackData(res) ?? {};
}

export async function submitVehicleLoad(dispatchId, body) {
  await request(API.PLANT_OUTWARD.SECONDARY_VEHICLE_LOAD, body, {
    pathParams: [dispatchId],
  });
}

export async function fetchVehicleSowReadyEntries(dispatchId, plantRowIndex = 0) {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_VEHICLE_SOW_READY_ENTRIES,
    {},
    { pathParams: [dispatchId], plantRowIndex }
  );
  return unpackData(res) ?? {};
}

export async function fetchSowReadyEntries(plantId, subtypeId) {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_SOW_READY_ENTRIES,
    {},
    { plantId, subtypeId }
  );
  return unpackData(res) ?? {};
}

/** All sowingAllowed sow-ready slots in ±4d, grouped by plantReadyDate. */
export async function fetchAllSowReadyEntriesByDate() {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_SOW_READY_ENTRIES,
    {},
    { all: "1" }
  );
  return unpackData(res) ?? {};
}

export async function fetchVehicleLoadedLines(dispatchId) {
  const res = await request(
    API.PLANT_OUTWARD.SECONDARY_VEHICLE_LOADED_LINES,
    {},
    { pathParams: [dispatchId] }
  );
  return unpackData(res) ?? {};
}

export async function fetchSowingAllowedPlants() {
  const res = await request(API.plantCms.GET_PLANTS, {}, {});
  const list = unpackData(res);
  const plants = Array.isArray(list) ? list : list?.data ?? [];
  return plants
    .filter((p) => p?.sowingAllowed)
    .map((p) => ({
      plantId: String(p._id ?? p.id),
      name: p.name ?? "Plant",
      subtypes: (p.subtypes || []).map((st) => ({
        subtypeId: String(st._id ?? st.id),
        name: st.name ?? "Subtype",
      })),
    }));
}

export { apiErrText };
