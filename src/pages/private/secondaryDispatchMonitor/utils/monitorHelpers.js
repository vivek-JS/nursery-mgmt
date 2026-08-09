export function num(v) {
  return Math.max(0, Math.floor(Number(v) || 0));
}

export function fmtReadyDate(value) {
  if (!value) return "—";
  const m = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function vehicleHasSowReady(vehicle) {
  return (vehicle?.plantRowsSummary || []).some((r) => r?.sowingAllowed);
}

export function collectSowReadyPairsFromVehicles(vehicles = []) {
  const map = new Map();
  for (const v of vehicles) {
    for (const row of v.plantRowsSummary || []) {
      if (!row?.sowingAllowed) continue;
      const plantId = row.plantId ? String(row.plantId) : "";
      const subtypeId = row.subTypeId ? String(row.subTypeId) : "";
      if (!plantId || !subtypeId) continue;
      const key = `${plantId}:${subtypeId}`;
      if (!map.has(key)) {
        map.set(key, {
          plantId,
          subtypeId,
          label: String(row.name || "Sow-ready plant"),
        });
      }
    }
  }
  return [...map.values()];
}

export function summarizeVehicles(vehicles = []) {
  let need = 0;
  let loaded = 0;
  let sowReadyVehicles = 0;
  for (const v of vehicles) {
    need += num(v.vehiclePlantQty ?? v.totalPlantQty);
    loaded += num(v.shedLoadedPlantsTotal);
    if (vehicleHasSowReady(v)) sowReadyVehicles += 1;
  }
  const remaining = Math.max(0, need - loaded);
  const pct = need > 0 ? Math.min(100, Math.round((loaded / need) * 100)) : 0;
  return {
    vehicleCount: vehicles.length,
    need,
    loaded,
    remaining,
    pct,
    sowReadyVehicles,
  };
}
