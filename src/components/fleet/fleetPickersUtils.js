import { NetworkManager, API } from "network/core";

export const getFleetDriverId = (d) => String(d?._id || d?.id || "");

export const formatFleetDriverLabel = (d) => {
  if (!d) return "";
  const m =
    d.mobile != null && String(d.mobile).trim() !== "" ? String(d.mobile).trim() : "—";
  return `${d.name || ""} (${m})`;
};

/** Active vehicle owners (transport operators). */
export async function loadFleetOwners() {
  try {
    const instance = NetworkManager(API.VEHICLE_OWNER.GET_ACTIVE);
    const response = await instance.request({}, {});
    const list = Array.isArray(response?.data?.data) ? response.data.data : [];
    return list;
  } catch (e) {
    console.error("Error fetching vehicle owners:", e);
    return [];
  }
}

/**
 * Drivers and vehicles for an owner.
 * @returns {{ drivers: any[], vehicles: any[] }}
 */
export async function loadFleetForOwner(ownerMongoId) {
  if (!ownerMongoId) {
    return { drivers: [], vehicles: [] };
  }
  try {
    const dInst = NetworkManager(API.VEHICLE_DRIVER.GET_BY_OWNER);
    const vInst = NetworkManager(API.VEHICLE.GET_ACTIVE_VEHICLES);
    const [dRes, vRes] = await Promise.all([
      dInst.request({}, { pathParams: [ownerMongoId] }),
      vInst.request({}, { ownerId: ownerMongoId }),
    ]);
    const drList = Array.isArray(dRes?.data?.data) ? dRes.data.data : [];
    const vList = Array.isArray(vRes?.data?.data) ? vRes.data.data : [];
    return { drivers: drList, vehicles: vList };
  } catch (error) {
    console.error("Error loading fleet drivers/vehicles:", error);
    return { drivers: [], vehicles: [] };
  }
}

export const emptyFleetAssignment = () => ({
  ownerId: "",
  driverId: "",
  vehicleId: "",
  routeNotes: "",
  driverRemark: "",
  vehicleRemark: "",
});
