import moment from "moment";
import { formatOrderFarmerDisplayName } from "utils/orderCustomerDisplay";
import { getCavityDisplayLabel, getCavityIdString } from "utils/cavityDisplay";
import { formatDateForAPI, formatDateForDisplay, parseOrderDate } from "../../utils/dateUtils";

export const DISPATCH_DAY_OPTIONS = [
  { value: "TODAY", label: "Aaj" },
  { value: "TOMORROW", label: "Udya" },
  { value: "DAY_AFTER", label: "Parva" },
];

export function refId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
}

export function orderMongoId(order) {
  return refId(order?._id || order?.id);
}

export function orderPublicId(order) {
  const code = order?.orderId ?? order?.publicOrderCode ?? order?.order;
  if (code != null && String(code).trim() !== "") return String(code).trim();
  const id = orderMongoId(order);
  return id ? id.slice(-6).toUpperCase() : "—";
}

export function orderFarmerName(order) {
  return formatOrderFarmerDisplayName(order) || order?.farmer?.name || "Unknown";
}

export function orderVillage(order) {
  const farmer = order?.farmer && typeof order.farmer === "object" ? order.farmer : {};
  const orderFor = order?.orderFor && typeof order.orderFor === "object" ? order.orderFor : {};
  return (
    String(farmer.village || farmer.villageName || orderFor.village || order?.village || "").trim() ||
    "Unknown"
  );
}

export function orderTaluka(order) {
  const farmer = order?.farmer && typeof order.farmer === "object" ? order.farmer : {};
  const orderFor = order?.orderFor && typeof order.orderFor === "object" ? order.orderFor : {};
  return String(
    farmer.talukaName ||
      farmer.taluka ||
      orderFor.talukaName ||
      orderFor.taluka ||
      order?.talukaName ||
      order?.taluka ||
      ""
  ).trim();
}

export function orderPhone(order) {
  const raw =
    (typeof order?.farmer === "object" && order.farmer?.mobileNumber) ||
    order?.contact ||
    order?.mobileNumber ||
    "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

export function orderPlantCount(order) {
  const n = Number(order?.numberOfPlants ?? order?.totalPlants ?? order?.quantity ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function orderDeliveryMoment(order) {
  return parseOrderDate(order?.deliveryDate || order?.orderBookingDate);
}

export function orderDeliveryShort(order) {
  const m = orderDeliveryMoment(order);
  if (!m || !m.isValid()) return "";
  return m.format("DD/MM");
}

export function orderDeliveryKey(order) {
  const m = orderDeliveryMoment(order);
  if (!m || !m.isValid()) return "";
  return m.format("YYYY-MM-DD");
}

const DISPATCH_DAY_OFFSET = { TODAY: 0, TOMORROW: 1, DAY_AFTER: 2 };

export function dispatchDayTitle(value) {
  const offset = DISPATCH_DAY_OFFSET[String(value || "").toUpperCase()];
  if (offset === undefined) return "";
  return moment().startOf("day").add(offset, "days").format("DD/MM/YYYY");
}

function dayParts(day) {
  if (!day || !day.isValid()) return { label: "", bucket: "" };
  const start = day.clone().startOf("day");
  const diff = start.diff(moment().startOf("day"), "days");
  if (diff === 0) return { label: "Aaj", bucket: "TODAY" };
  if (diff === 1) return { label: "Udya", bucket: "TOMORROW" };
  if (diff === 2) return { label: "Parva", bucket: "DAY_AFTER" };
  return { label: start.format("DD/MM"), bucket: start.format("YYYY-MM-DD") };
}

/** Dispatch day the order was marked for, otherwise its delivery date. */
export function orderDispatchMoment(order) {
  const target = parseOrderDate(order?.dispatchTargetDate);
  if (target?.isValid()) return target.clone().startOf("day");
  const key = String(order?.dispatchDayKey || "").toUpperCase();
  if (Object.prototype.hasOwnProperty.call(DISPATCH_DAY_OFFSET, key)) {
    return moment().startOf("day").add(DISPATCH_DAY_OFFSET[key], "days");
  }
  const delivery = orderDeliveryMoment(order);
  return delivery?.isValid() ? delivery.clone().startOf("day") : null;
}

export function orderDayLabel(order) {
  return dayParts(orderDispatchMoment(order)).label;
}

export function orderDayBucket(order) {
  return dayParts(orderDispatchMoment(order)).bucket;
}

export function orderDeliveryDayLabel(order) {
  return dayParts(orderDeliveryMoment(order)).label;
}

function named(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.name || value.subtypeName || "").trim();
}

export function orderPlantLabel(order) {
  const typeName = named(order?.plantType) || named(order?.plantName);
  const subName = named(order?.plantSubtype) || named(order?.subtypeName);
  if (typeName && subName) return `${typeName} → ${subName}`;
  return typeName || subName || "Unknown";
}

export function orderVariety(order) {
  return (
    named(order?.plantSubtype) ||
    named(order?.subtypeName) ||
    named(order?.plantType) ||
    named(order?.plantName) ||
    ""
  );
}

export function defaultCallingFilters() {
  return {
    search: "",
    farmReadyOnly: false,
    startDate: moment().subtract(7, "days").format("YYYY-MM-DD"),
    endDate: moment().add(7, "days").format("YYYY-MM-DD"),
    includePastDue: false,
    plantId: "",
    subtypeId: "",
    district: "",
    taluka: "",
    village: "",
  };
}

/** Queue params for GET /order/getOrders. Search ignores the date window, matching the mobile queue. */
export function buildCallingParams(filters = {}, { includePastDue = false } = {}) {
  const search = String(filters.search || "").trim();
  const params = {
    dispatched: false,
    status: filters.farmReadyOnly ? "FARM_READY" : "ACCEPTED,FARM_READY",
  };
  if (search) {
    params.search = search;
    return params;
  }
  const startDate = formatDateForAPI(filters.startDate);
  const endDate = formatDateForAPI(filters.endDate);
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  params.dateRangeField = "delivery";
  if (includePastDue) params.includePastDueBeyondRange = "true";
  if (filters.plantId) params.plantId = filters.plantId;
  if (filters.subtypeId) params.subtypeId = filters.subtypeId;
  if (filters.district) params.district = filters.district;
  if (filters.taluka) params.taluka = filters.taluka;
  if (filters.village) params.village = filters.village;
  return params;
}

export function extractOrderPage(response) {
  const body = response?.data;
  const payload = body?.data;
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : Array.isArray(body)
        ? body
        : [];
  const total = Number(payload?.total ?? body?.pagination?.total ?? rows.length);
  const totalPages = Number(payload?.totalPages ?? body?.pagination?.totalPages ?? 1);
  const currentPage = Number(payload?.currentPage ?? payload?.page ?? body?.pagination?.page ?? 1);
  return {
    rows,
    total: Number.isFinite(total) ? total : rows.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    currentPage: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : 1,
  };
}

export function extractList(response) {
  const body = response?.data;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body)) return body;
  return [];
}

/** Same row shape the dispatch form already expects from the mobile list. */
export function mapOrderToDispatchRow(order) {
  const quantity = orderPlantCount(order);
  const cavityIdStr = getCavityIdString(order?.cavity);
  const hasTrayRef = cavityIdStr !== "";
  const plantTypeId = refId(order?.plantType) || refId(order?.plantName);
  const plantSubtypeId = refId(order?.plantSubtype);
  return {
    order: order?.orderId,
    farmerName: orderFarmerName(order),
    plantType: orderPlantLabel(order),
    quantity,
    Delivery: order?.deliveryDate ? formatDateForDisplay(order.deliveryDate) : "-",
    orderDate: order?.orderBookingDate ? formatDateForDisplay(order.orderBookingDate) : "-",
    details: {
      orderid: order?._id || order?.id,
      remainingPlants: Number(order?.remainingPlants ?? quantity),
      plantID: plantTypeId || undefined,
      plantSubtypeID: plantSubtypeId || undefined,
      cavity: order?.cavity ?? null,
      cavityId: cavityIdStr || undefined,
      cavityName: getCavityDisplayLabel(order?.cavity) || (hasTrayRef ? "Not specified" : "No tray on order"),
      farmer: order?.farmer || null,
      expectedNursery: order?.expectedNursery,
    },
  };
}

export function dispatchPlantTotal(dispatch) {
  const details = Array.isArray(dispatch?.orderDispatchDetails) ? dispatch.orderDispatchDetails : [];
  const fromDetails = details.reduce((sum, row) => sum + (Number(row?.dispatchQuantity) || 0), 0);
  if (fromDetails > 0) return fromDetails;
  const plants = Array.isArray(dispatch?.plantsDetails) ? dispatch.plantsDetails : [];
  return plants.reduce((sum, plant) => sum + (Number(plant?.totalPlants ?? plant?.quantity) || 0), 0);
}

export function dispatchStatus(dispatch) {
  return String(dispatch?.transportStatus || dispatch?.dispatchStatus || "PENDING").toUpperCase();
}

export function isOpenDispatch(dispatch) {
  const status = dispatchStatus(dispatch);
  return status !== "DELIVERED" && status !== "CANCELLED";
}

export function dispatchMatchesVehicle(dispatch, vehicle) {
  const vehicleId = refId(vehicle);
  const fromDispatch = refId(dispatch?.vehicleId);
  if (vehicleId && fromDispatch && vehicleId === fromDispatch) return true;
  const plate = String(vehicle?.number || "").trim().toLowerCase();
  const dispatchPlate = String(dispatch?.vehicleNumber || "").trim().toLowerCase();
  if (plate && dispatchPlate && plate === dispatchPlate) return true;
  const name = String(vehicle?.name || "").trim().toLowerCase();
  const dispatchName = String(dispatch?.vehicleName || "").trim().toLowerCase();
  return Boolean(name && dispatchName && name === dispatchName);
}

export function vehicleTypeLabel(vehicle) {
  const raw = String(vehicle?.vehicleType || "").trim();
  if (!raw) return "Vehicle";
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

export function vehicleTitle(vehicle) {
  return String(vehicle?.number || vehicle?.name || "Vehicle").trim();
}

export function vehicleDriverLabel(vehicle, dispatch) {
  return (
    String(dispatch?.driverName || vehicle?.driverName || "").trim() || "No driver"
  );
}
