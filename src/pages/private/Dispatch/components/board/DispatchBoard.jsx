import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import DispatchForm from "../../../dashboard/DispatchedForm";
import QuickOrderDialog from "../QuickOrderDialog";
import CallingListColumn from "./CallingListColumn";
import ReadyColumn from "./ReadyColumn";
import VehiclesColumn from "./VehiclesColumn";
import useDispatchBoardData from "./useDispatchBoardData";
import {
  dispatchMatchesVehicle,
  dispatchPlantTotal,
  mapOrderToDispatchRow,
  orderDayLabel,
  orderFarmerName,
  orderMongoId,
  orderPlantCount,
  orderPlantLabel,
  orderPhone,
  orderTaluka,
  orderVariety,
  orderVillage,
} from "./orderBoardUtils";
import {
  emptyFleetAssignment,
  formatFleetDriverLabel,
  getFleetDriverId,
  loadFleetForOwner,
} from "components/fleet/fleetPickersUtils";
import { Toast } from "helpers/toasts/toastHelper";

export default function DispatchBoard() {
  const {
    callingOrders,
    callingFilters,
    patchCallingFilters,
    readyOrders,
    openDispatches,
    callingLoading,
    readyLoading,
    markingIds,
    savingQtyId,
    refresh,
    markReady,
    updatePlantCount,
  } = useDispatchBoardData();

  const [dayKey, setDayKey] = useState("TODAY");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [fleetAssignment, setFleetAssignment] = useState(emptyFleetAssignment);
  const [ownerFleet, setOwnerFleet] = useState({ drivers: [], vehicles: [] });
  const [stagedByVehicle, setStagedByVehicle] = useState({});
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [quickTarget, setQuickTarget] = useState(null);

  const readyById = useMemo(() => {
    const map = new Map();
    readyOrders.forEach((order) => {
      const id = orderMongoId(order);
      if (id) map.set(id, order);
    });
    return map;
  }, [readyOrders]);

  useEffect(() => {
    setStagedByVehicle((prev) => {
      let changed = false;
      const next = {};
      Object.entries(prev).forEach(([vehicleId, list]) => {
        const kept = (list || []).filter((id) => readyById.has(id));
        if (kept.length !== (list || []).length) changed = true;
        next[vehicleId] = kept;
      });
      return changed ? next : prev;
    });
  }, [readyById]);

  const stagedIds = useMemo(() => {
    const ids = new Set();
    Object.values(stagedByVehicle).forEach((list) => {
      (list || []).forEach((id) => ids.add(id));
    });
    return ids;
  }, [stagedByVehicle]);

  useEffect(() => {
    if (!fleetAssignment.ownerId) {
      setOwnerFleet({ drivers: [], vehicles: [] });
      return undefined;
    }
    let cancelled = false;
    loadFleetForOwner(fleetAssignment.ownerId).then((result) => {
      if (!cancelled) setOwnerFleet(result);
    });
    return () => {
      cancelled = true;
    };
  }, [fleetAssignment.ownerId]);

  const selectedDriver = ownerFleet.drivers.find((driver) => getFleetDriverId(driver) === fleetAssignment.driverId) || null;
  const selectedVehicle =
    ownerFleet.vehicles.find((vehicle) => getFleetDriverId(vehicle) === fleetAssignment.vehicleId) || null;
  const driverLabel = selectedDriver ? formatFleetDriverLabel(selectedDriver) : "";

  const openDispatch = useMemo(() => {
    if (!selectedVehicle) return null;
    return openDispatches.find((dispatch) => dispatchMatchesVehicle(dispatch, selectedVehicle)) || null;
  }, [openDispatches, selectedVehicle]);

  const stagedOrders = useMemo(() => {
    const vehicleId = fleetAssignment.vehicleId;
    if (!vehicleId) return [];
    return (stagedByVehicle[vehicleId] || [])
      .map((orderId) => readyById.get(orderId))
      .filter(Boolean)
      .map((order) => ({
        id: orderMongoId(order),
        name: orderFarmerName(order),
        plants: orderPlantCount(order),
        plant: orderPlantLabel(order),
        variety: orderVariety(order),
        taluka: orderTaluka(order),
        village: orderVillage(order),
        phone: orderPhone(order),
        day: orderDayLabel(order),
      }));
  }, [fleetAssignment.vehicleId, stagedByVehicle, readyById]);

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const assignToVehicle = (ids) => {
    const vehicleId = fleetAssignment.vehicleId;
    if (!vehicleId) {
      Toast.error("Select a vehicle first");
      return false;
    }
    const nextIds = [...new Set(ids.map(String).filter((id) => readyById.has(id)))];
    if (!nextIds.length) {
      Toast.error("Select a ready order, or drop one onto the vehicle");
      return false;
    }
    const moving = new Set(nextIds);
    setStagedByVehicle((prev) => {
      const next = {};
      Object.entries(prev).forEach(([id, list]) => {
        next[id] = (list || []).filter((orderId) => !moving.has(orderId));
      });
      next[vehicleId] = [...new Set([...(next[vehicleId] || []), ...nextIds])];
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      nextIds.forEach((id) => next.delete(id));
      return next;
    });
    return true;
  };

  useEffect(() => {
    const vehicleId = fleetAssignment.vehicleId;
    if (!vehicleId) return;
    const waiting = [...selectedIdsRef.current].filter((id) => readyById.has(id));
    if (!waiting.length) return;
    assignToVehicle(waiting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetAssignment.vehicleId]);

  const toggleReady = (id) => {
    if (fleetAssignment.vehicleId) {
      assignToVehicle([id]);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleReadyGroup = (ids, select) => {
    if (fleetAssignment.vehicleId && select) {
      assignToVehicle(ids);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((orderId) => {
        if (select) next.add(orderId);
        else next.delete(orderId);
      });
      return next;
    });
  };

  const openDispatchForm = () => {
    if (!fleetAssignment.ownerId || !fleetAssignment.driverId || !fleetAssignment.vehicleId) {
      Toast.error("Select an owner, driver, and vehicle");
      return;
    }
    const ids = stagedOrders.map((row) => row.id);
    if (!ids.length) {
      Toast.error("Assign orders to this vehicle first");
      return;
    }
    const selectedOrders = new Map();
    ids.forEach((id) => {
      const order = readyById.get(id);
      if (!order) return;
      const row = mapOrderToDispatchRow(order);
      const key = String(row.details.orderid || "");
      if (key) selectedOrders.set(key, row);
    });
    if (!selectedOrders.size) {
      Toast.error("Those orders are no longer ready");
      return;
    }
    setDispatchTarget({
      vehicleId: fleetAssignment.vehicleId,
      selectedOrders,
      fleet: {
        ownerId: fleetAssignment.ownerId,
        driverId: fleetAssignment.driverId,
        vehicleId: fleetAssignment.vehicleId,
        routeNotes: fleetAssignment.routeNotes || "",
        driverRemark: fleetAssignment.driverRemark || "",
        vehicleRemark: fleetAssignment.vehicleRemark || "",
        driverName: driverLabel,
        vehicleName: selectedVehicle?.name || selectedVehicle?.number || "",
      },
    });
  };

  const closeDispatchForm = async (didDispatch) => {
    const vehicleId = dispatchTarget?.vehicleId;
    setDispatchTarget(null);
    if (didDispatch && vehicleId) {
      setStagedByVehicle((prev) => ({ ...prev, [vehicleId]: [] }));
    }
    await refresh();
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1, px: 0.25 }}>
        <Typography sx={{ flex: 1, color: "#475569", fontSize: "0.78rem", fontWeight: 700 }}>
          Tick ready orders first, then pick a vehicle. They move onto it.
        </Typography>
        <IconButton size="small" title="Refresh" onClick={refresh}>
          <Refresh sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
      <Box
        sx={{
          flex: "1 1 0",
          minHeight: 0,
          height: "100%",
          display: "grid",
          gridTemplateRows: { lg: "minmax(0, 1fr)" },
          gridTemplateColumns: { xs: "1fr", lg: "minmax(280px, 0.95fr) minmax(340px, 1.2fr) minmax(320px, 1fr)" },
          gap: 1.25,
          overflow: { xs: "auto", lg: "hidden" },
          "& > *": { minHeight: 0, minWidth: 0, height: { lg: "100%" }, overflow: "hidden" },
        }}
      >
        <CallingListColumn
          orders={callingOrders}
          loading={callingLoading}
          filters={callingFilters}
          onFiltersChange={patchCallingFilters}
          dayKey={dayKey}
          onDayKey={setDayKey}
          markingIds={markingIds}
          onReady={(order) => markReady([order], dayKey)}
          onReadyAll={() => markReady(callingOrders, dayKey)}
        />
        <ReadyColumn
          orders={readyOrders}
          loading={readyLoading}
          stagedIds={stagedIds}
          selectedIds={selectedIds}
          savingQtyId={savingQtyId}
          onEditQty={updatePlantCount}
          onToggle={toggleReady}
          onToggleGroup={toggleReadyGroup}
        />
        <VehiclesColumn
          assignment={fleetAssignment}
          onAssignmentChange={setFleetAssignment}
          vehicle={selectedVehicle}
          driverLabel={driverLabel}
          openDispatch={
            openDispatch
              ? {
                  ...openDispatch,
                  loadedPlants: dispatchPlantTotal(openDispatch),
                }
              : null
          }
          stagedOrders={stagedOrders}
          onAssignIds={assignToVehicle}
          onRemoveStaged={(orderId) => {
            const vehicleId = fleetAssignment.vehicleId;
            if (!vehicleId) return;
            setStagedByVehicle((prev) => ({
              ...prev,
              [vehicleId]: (prev[vehicleId] || []).filter((id) => id !== orderId),
            }));
          }}
          onDispatch={openDispatchForm}
          onQuickOrder={() => {
            if (!openDispatch) return;
            const title = selectedVehicle?.number || selectedVehicle?.name || "Vehicle";
            setQuickTarget({
              dispatchId: String(openDispatch._id || openDispatch.id || ""),
              label: `${title}${openDispatch.transportId ? ` · #${openDispatch.transportId}` : ""}`,
              snapshot: openDispatch,
            });
          }}
        />
      </Box>

      {dispatchTarget && (
        <DispatchForm
          open
          mode="create"
          selectedOrders={dispatchTarget.selectedOrders}
          initialFleet={dispatchTarget.fleet}
          onClose={() => closeDispatchForm(false)}
          onDispatchSuccess={() => closeDispatchForm(true)}
        />
      )}

      <QuickOrderDialog
        open={Boolean(quickTarget)}
        onClose={() => setQuickTarget(null)}
        onSuccess={() => {
          setQuickTarget(null);
          refresh();
        }}
        dispatchId={quickTarget?.dispatchId || ""}
        dispatchLabel={quickTarget?.label || ""}
        dispatchSnapshot={quickTarget?.snapshot || null}
      />
    </Box>
  );
}
