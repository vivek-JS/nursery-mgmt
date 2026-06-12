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

export async function fetchLocations() {
  const [pollyRes, shadeRes] = await Promise.all([
    request(API.POLLY_HOUSE.GET_HOUSES, {}, {}),
    request(API.SHADE.GET_SHADES, {}, {}),
  ]);
  const polly = unpackData(pollyRes);
  const shade = unpackData(shadeRes);
  const pollyList = Array.isArray(polly) ? polly : polly?.data ?? [];
  const shadeList = Array.isArray(shade) ? shade : shade?.data ?? [];
  const opts = [];
  const seen = new Set();
  for (const p of [...pollyList, ...shadeList]) {
    const val = String(p._id ?? p.id ?? p.name ?? "");
    if (!val || seen.has(val)) continue;
    seen.add(val);
    opts.push({ value: val, label: p.name ?? p.label ?? val });
  }
  return opts;
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

export { apiErrText };
