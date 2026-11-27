import React, { useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Close, FlashOn } from "@mui/icons-material";
import FleetAssignmentPanel from "components/fleet/FleetAssignmentPanel";
import { DayChip, OrderMeta } from "./boardOrderBits";
import { vehicleTitle } from "./orderBoardUtils";

export default function VehiclesColumn({
  assignment,
  onAssignmentChange,
  vehicle,
  driverLabel,
  openDispatch,
  stagedOrders,
  onAssignIds,
  onRemoveStaged,
  onDispatch,
  onQuickOrder,
}) {
  const [over, setOver] = useState(false);
  const vehicleId = assignment?.vehicleId || "";
  const readyToDispatch = Boolean(assignment?.ownerId && assignment?.driverId && vehicleId);

  const plantGroups = useMemo(() => {
    const groups = new Map();
    stagedOrders.forEach((row) => {
      const name = row.plant || "Plant";
      const current = groups.get(name) || { name, plants: 0 };
      current.plants += row.plants;
      groups.set(name, current);
    });
    return [...groups.values()];
  }, [stagedOrders]);

  const takeDrop = (event) => {
    event.preventDefault();
    setOver(false);
    const id = event.dataTransfer.getData("text/plain");
    if (id) onAssignIds([id]);
  };

  return (
    <Box
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget;
        if (next && event.currentTarget.contains(next)) return;
        setOver(false);
      }}
      onDrop={takeDrop}
      sx={{
        bgcolor: over ? "#f8fbff" : "#fff",
        borderRadius: 3,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: over
          ? "inset 0 0 0 2px #2563eb, 0 10px 28px rgba(15, 23, 42, 0.06)"
          : "0 10px 28px rgba(15, 23, 42, 0.06)",
        borderTop: "4px solid #16a34a",
      }}
    >
      <Box sx={{ px: 1.15, pt: 1, pb: 0.4, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>3. Vehicles</Typography>
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: over ? "#2563eb" : "#94a3b8" }}>
          {over ? "Release to add to this vehicle" : vehicleId ? "Drop anywhere in this column" : "Select orders first, then pick a vehicle"}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 1.1, pb: 1.1 }}>
        <FleetAssignmentPanel
          compact
          value={assignment}
          onChange={onAssignmentChange}
          autoSelectSingle
          remarksExpandedDefault={Boolean(assignment?.routeNotes || assignment?.driverRemark || assignment?.vehicleRemark)}
        />

        {!vehicleId ? null : (
          <Box sx={{ mt: 1, border: "1px solid #e2e8f0", borderRadius: 2, p: 1 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }} noWrap>
                  {vehicleTitle(vehicle) || "Vehicle"}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }} noWrap>
                  Driver: {driverLabel || "No driver"}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FlashOn sx={{ fontSize: 15 }} />}
                disabled={!openDispatch}
                title={openDispatch ? "Add a quick order on this dispatch" : "Dispatch a first load before quick orders"}
                onClick={onQuickOrder}
                sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, fontSize: "0.72rem", px: 0.9 }}
              >
                Quick
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!readyToDispatch || !stagedOrders.length}
                onClick={onDispatch}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  borderRadius: 2,
                  fontSize: "0.72rem",
                  bgcolor: "#4f46e5",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#4338ca", boxShadow: "none" },
                }}
              >
                Dispatch
              </Button>
            </Box>

            {plantGroups.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.8 }}>
                {plantGroups.map((group) => (
                  <Box
                    key={group.name}
                    sx={{ px: 0.8, py: 0.35, borderRadius: 1.5, border: "1px solid #a7f3d0", bgcolor: "#ecfdf5" }}
                  >
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#064e3b" }} noWrap>
                      {group.name}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#047857" }}>
                      {group.plants.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {stagedOrders.length === 0 ? (
              <Typography sx={{ mt: 1, textAlign: "center", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700 }}>
                Select a ready order and it lands here. No plant limit.
              </Typography>
            ) : (
              <Box sx={{ mt: 0.6 }}>
                {stagedOrders.map((row) => (
                  <Box key={row.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, py: 0.65, borderBottom: "1px solid #e2e8f0" }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.45 }}>
                        <Typography sx={{ flex: 1, fontWeight: 800, fontSize: "0.76rem" }} noWrap>
                          {row.name}
                        </Typography>
                        <DayChip label={row.day} />
                      </Box>
                      <OrderMeta
                        variety={row.variety || row.plant}
                        count={row.plants}
                        taluka={row.taluka}
                        village={row.village}
                        phone={row.phone}
                      />
                    </Box>
                    <Button
                      size="small"
                      title="Remove from vehicle"
                      onClick={() => onRemoveStaged(row.id)}
                      sx={{ minWidth: 0, p: 0.25, color: "#64748b" }}
                    >
                      <Close sx={{ fontSize: 14 }} />
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
