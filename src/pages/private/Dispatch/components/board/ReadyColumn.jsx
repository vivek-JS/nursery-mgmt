import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, CircularProgress, IconButton, Popover, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Edit, Search } from "@mui/icons-material";
import { DayChip, PlaceChip, VarietyCount } from "./boardOrderBits";
import {
  DISPATCH_DAY_OPTIONS,
  dispatchDayTitle,
  orderDayBucket,
  orderDayLabel,
  orderFarmerName,
  orderMongoId,
  orderPlantCount,
  orderPublicId,
  orderTaluka,
  orderVariety,
  orderVillage,
} from "./orderBoardUtils";

const DOTS = ["#ef4444", "#22c55e", "#8b5cf6", "#f59e0b", "#0ea5e9", "#ec4899"];
const NAMED_DAYS = new Set(["TODAY", "TOMORROW", "DAY_AFTER"]);

function pickCalendarDay(ymd) {
  if (!ymd) return "";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, date] = ymd.split("-").map(Number);
  const picked = new Date(year, month - 1, date);
  const diff = Math.round((picked.getTime() - start.getTime()) / 86400000);
  if (diff === 0) return "TODAY";
  if (diff === 1) return "TOMORROW";
  if (diff === 2) return "DAY_AFTER";
  return ymd;
}

export default function ReadyColumn({ orders, loading, stagedIds, onMove, onEditQty, savingQtyId }) {
  const [query, setQuery] = useState("");
  const [dayPick, setDayPick] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [village, setVillage] = useState("all");
  const [editAnchor, setEditAnchor] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editQty, setEditQty] = useState("");

  const available = useMemo(
    () => orders.filter((order) => !stagedIds.has(orderMongoId(order))),
    [orders, stagedIds]
  );

  const villageCounts = useMemo(() => {
    const counts = new Map();
    available.forEach((order) => {
      const name = orderVillage(order);
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [available]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter((order) => {
      if (village !== "all" && orderVillage(order) !== village) return false;
      if (dayPick && orderDayBucket(order) !== dayPick) return false;
      if (!q) return true;
      const hay = `${orderFarmerName(order)} ${orderPublicId(order)} ${orderVariety(order)} ${orderTaluka(order)} ${orderVillage(order)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [available, query, village, dayPick]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((order) => {
      const name = orderVillage(order);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(order);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]) * dir)
      .map(([name, list]) => ({
        name,
        orders: [...list].sort((a, b) => orderFarmerName(a).localeCompare(orderFarmerName(b)) * dir),
      }));
  }, [filtered, sortDir]);

  useEffect(() => {
    if (village !== "all" && !villageCounts.some(([name]) => name === village)) setVillage("all");
  }, [village, villageCounts]);

  const namedDay = NAMED_DAYS.has(dayPick);
  const customDate = dayPick && !namedDay ? dayPick : "";

  const openEdit = (event, order) => {
    event.stopPropagation();
    setEditAnchor(event.currentTarget);
    setEditOrder(order);
    setEditQty(String(orderPlantCount(order)));
  };

  const saveEdit = async () => {
    if (!editOrder) return;
    const ok = await onEditQty(editOrder, editQty);
    if (ok) {
      setEditAnchor(null);
      setEditOrder(null);
    }
  };

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: 3,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
        borderTop: "4px solid #2563eb",
      }}
    >
      <Box sx={{ px: 1.15, pt: 1, pb: 0.75, flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.7 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>2. Ready for dispatch</Typography>
          <Box
            sx={{
              minWidth: 20,
              height: 20,
              px: 0.65,
              borderRadius: 99,
              bgcolor: "#dbeafe",
              color: "#1d4ed8",
              fontSize: "0.7rem",
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
            }}
          >
            {available.length}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.45, flexWrap: "nowrap", overflowX: "auto", mb: 0.7, pb: 0.15 }}>
          <VillageChip label={`All ${available.length}`} active={village === "all"} onClick={() => setVillage("all")} />
          {villageCounts.map(([name, count], index) => (
            <VillageChip
              key={name}
              label={`${name} ${count}`}
              dot={DOTS[index % DOTS.length]}
              active={village === name}
              onClick={() => setVillage(name)}
            />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 0.6 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search name / order"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{ startAdornment: <Search sx={{ fontSize: 15, color: "#94a3b8", mr: 0.4 }} /> }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.78rem" }, "& .MuiOutlinedInput-input": { py: 0.7 } }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))}
            sx={{ textTransform: "none", fontWeight: 800, borderRadius: 2, minWidth: 52, color: "#334155" }}
          >
            {sortDir === "asc" ? "A–Z" : "Z–A"}
          </Button>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.65, flexWrap: "wrap" }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={namedDay ? dayPick : null}
            onChange={(_, value) => setDayPick(value || "")}
            sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, fontSize: "0.72rem", px: 1, py: 0.2 } }}
          >
            {DISPATCH_DAY_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value} title={dispatchDayTitle(option.value)}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            size="small"
            type="date"
            value={customDate}
            title="Other date"
            onChange={(event) => setDayPick(pickCalendarDay(event.target.value))}
            sx={{ width: 138, "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.75rem" }, "& .MuiOutlinedInput-input": { py: 0.65 } }}
          />
        </Box>
      </Box>
      <Box sx={{ flex: { xs: "1 1 auto", lg: "1 1 0" }, minHeight: { xs: 220, lg: 0 }, overflowY: "auto", px: 1, pb: 1 }}>
        {loading && !orders.length ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : groups.length === 0 ? (
          <Typography sx={{ color: "#64748b", fontSize: "0.8rem", px: 0.5, py: 2 }}>
            {orders.length > 0 && available.length === 0
              ? "Every ready order is on a vehicle."
              : available.length > 0
                ? "No orders match these filters."
                : "No orders are ready for dispatch."}
          </Typography>
        ) : (
          groups.map((group, index) => {
            const ids = group.orders.map(orderMongoId).filter(Boolean);
            const plants = group.orders.reduce((sum, order) => sum + orderPlantCount(order), 0);
            return (
              <Box key={group.name} sx={{ mb: 0.9 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.25, px: 0.15 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: DOTS[index % DOTS.length], flexShrink: 0 }} />
                  <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: "#0f172a", flex: 1 }} noWrap>
                    {group.name}
                  </Typography>
                  <Typography sx={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {group.orders.length} · {plants.toLocaleString()}
                  </Typography>
                  <Button
                    size="small"
                    disabled={!ids.length}
                    onClick={() => onMove(ids)}
                    sx={{ textTransform: "none", fontWeight: 800, fontSize: "0.7rem", minWidth: 0, py: 0.1, color: "#2563eb" }}
                  >
                    Select all
                  </Button>
                </Box>
                {group.orders.map((order) => {
                  const id = orderMongoId(order);
                  return (
                    <Box
                      key={id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.35,
                        py: 0.4,
                        px: 0.3,
                        mb: 0.35,
                        borderRadius: 1.5,
                        bgcolor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        cursor: "grab",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={false}
                        title="Add to the vehicle"
                        onMouseDown={(event) => event.stopPropagation()}
                        onChange={() => onMove([id])}
                        sx={{ p: 0.3 }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", lineHeight: 1.25 }} noWrap>
                          {orderFarmerName(order)}
                          <Box component="span" sx={{ ml: 0.55, fontWeight: 600, color: "#94a3b8", fontSize: "0.66rem" }}>
                            {orderPublicId(order)}
                          </Box>
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.4, mt: 0.15 }}>
                          <VarietyCount variety={orderVariety(order)} count={orderPlantCount(order)} />
                          <PlaceChip taluka={orderTaluka(order)} village={orderVillage(order)} />
                        </Box>
                      </Box>
                      <DayChip label={orderDayLabel(order)} />
                      <IconButton size="small" title="Edit plant count" onClick={(event) => openEdit(event, order)} sx={{ p: 0.35 }}>
                        <Edit sx={{ fontSize: 14, color: "#64748b" }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>
      <Popover
        open={Boolean(editAnchor)}
        anchorEl={editAnchor}
        onClose={() => setEditAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Box sx={{ p: 1.25, width: 200 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.8rem", mb: 1 }}>Plant count</Typography>
          <TextField
            size="small"
            type="number"
            fullWidth
            value={editQty}
            onChange={(event) => setEditQty(event.target.value)}
            inputProps={{ min: 1 }}
          />
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 1, textTransform: "none", fontWeight: 800 }}
            disabled={savingQtyId === orderMongoId(editOrder)}
            onClick={saveEdit}
          >
            {savingQtyId === orderMongoId(editOrder) ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Popover>
    </Box>
  );
}

function VillageChip({ label, active, onClick, dot }) {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        textTransform: "none",
        fontWeight: 800,
        fontSize: "0.68rem",
        borderRadius: 99,
        minWidth: 0,
        px: 0.85,
        py: 0.1,
        color: active ? "#1d4ed8" : "#475569",
        bgcolor: active ? "#dbeafe" : "#f8fafc",
        border: "1px solid",
        borderColor: active ? "#93c5fd" : "#e2e8f0",
      }}
    >
      {dot ? <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: dot, mr: 0.5 }} /> : null}
      {label}
    </Button>
  );
}
