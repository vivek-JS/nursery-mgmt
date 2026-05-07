import React from "react";
import { Box, Typography, Stack, alpha, Chip } from "@mui/material";
import { Spa as PlantReadyIcon } from "@mui/icons-material";
import moment from "moment";

/** Calendar whole days from start of today until target day */
export const calendarDaysRemaining = (iso, nowMs) => {
  if (!iso) return null;
  const target = moment(iso).startOf("day");
  if (!target.isValid()) return null;
  const d = target.diff(moment(nowMs).startOf("day"), "days");
  if (d < 0) return 0;
  return d;
};

export const formatCountdownTo = (iso, nowMs) => {
  if (!iso) return null;
  const target = moment(iso);
  if (!target.isValid()) return null;
  const diff = target.diff(moment(nowMs));
  if (diff <= 0) return { text: "Due now / passed", done: true };
  const dur = moment.duration(diff);
  const days = Math.floor(dur.asDays());
  const h = dur.hours();
  const m = dur.minutes();
  const s = dur.seconds();
  if (days > 0) return { text: `${days}d ${h}h ${m}m ${s}s`, done: false };
  if (h > 0) return { text: `${h}h ${m}m ${s}s`, done: false };
  if (m > 0) return { text: `${m}m ${s}s`, done: false };
  return { text: `${s}s`, done: false };
};

export const normBatchKey = (bn) => (bn == null || bn === "" ? "" : String(bn).trim());
const digitsOnlyKey = (s) => String(s ?? "").replace(/\D/g, "");

export const getPlantReadyFromMap = (map, batchNumber) => {
  if (!map) return null;
  const k = normBatchKey(batchNumber);
  if (!k) return null;
  if (map[k] != null) return map[k];
  const want = digitsOnlyKey(k);
  if (!want) return null;
  for (const key of Object.keys(map)) {
    if (digitsOnlyKey(key) === want && map[key] != null) return map[key];
  }
  return null;
};

export const getMilestoneForBatch = (milestoneMap, batchNumber) => {
  if (!milestoneMap?.size) return null;
  const k = normBatchKey(batchNumber);
  if (!k) return null;
  if (milestoneMap.has(k)) return milestoneMap.get(k);
  const want = digitsOnlyKey(k);
  if (!want) return null;
  for (const [key, val] of milestoneMap) {
    if (digitsOnlyKey(key) === want) return val;
  }
  return null;
};

export const buildPlantReadyBatchIdMap = (plantReadyByBatch) => {
  const m = new Map();
  if (!plantReadyByBatch || typeof plantReadyByBatch !== "object") return m;
  for (const v of Object.values(plantReadyByBatch)) {
    if (v?.batchId) m.set(String(v.batchId), v);
  }
  return m;
};

export const resolvePlantReady = (mapByNumber, mapByBatchId, batchNumber, batchId) => {
  const byNum = getPlantReadyFromMap(mapByNumber, batchNumber);
  if (byNum) return byNum;
  if (batchId != null && mapByBatchId?.has(String(batchId))) {
    return mapByBatchId.get(String(batchId));
  }
  return null;
};

export const PlantReadyDetailBlock = ({ pr, nowTick, theme }) => {
  const primaryCd =
    pr?.hasAnchor && pr?.primaryStageReadyAt
      ? formatCountdownTo(pr.primaryStageReadyAt, nowTick)
      : null;
  const secondaryCd =
    pr?.hasAnchor && pr?.secondaryReadyAt
      ? formatCountdownTo(pr.secondaryReadyAt, nowTick)
      : null;
  const primaryDaysLeft =
    pr?.hasAnchor && pr?.primaryStageReadyAt
      ? calendarDaysRemaining(pr.primaryStageReadyAt, nowTick)
      : null;
  const secondaryDaysLeft =
    pr?.hasAnchor && pr?.secondaryReadyAt
      ? calendarDaysRemaining(pr.secondaryReadyAt, nowTick)
      : null;

  if (!pr?.hasAnchor || !primaryCd || !secondaryCd) return null;

  return (
    <Box
      sx={{
        mt: 0,
        p: 1,
        borderRadius: 1.5,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        border: "1px solid",
        borderColor: alpha(theme.palette.primary.main, 0.35),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
        <PlantReadyIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" fontWeight={800} color="primary.dark">
          Plant-ready
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Sowing ·{" "}
        {moment(pr.anchorSowingDate, "DD-MM-YYYY", true).isValid()
          ? moment(pr.anchorSowingDate, "DD-MM-YYYY").format("DD MMM YYYY")
          : pr.anchorSowingDate}
      </Typography>
      <Stack spacing={1.25}>
        <Box>
          <Typography variant="caption" fontWeight={700} color="primary.main" display="block">
            Primary stage
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            +{pr.primaryPlantReadyDays ?? 0}d from sowing →{" "}
            {pr.primaryStageReadyAt ? moment(pr.primaryStageReadyAt).format("DD MMM YYYY") : "—"}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={800}
            color={primaryCd.done ? "success.main" : "text.primary"}
            sx={{ mt: 0.25 }}
          >
            {primaryCd.done
              ? "Due"
              : `${primaryDaysLeft ?? 0} day${(primaryDaysLeft ?? 0) !== 1 ? "s" : ""} remaining`}
          </Typography>
          {!primaryCd.done && (
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              {primaryCd.text}
            </Typography>
          )}
        </Box>
        <Box>
          <Typography variant="caption" fontWeight={700} color="secondary.main" display="block">
            Secondary stage (your window)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            +{(pr.primaryPlantReadyDays ?? 0) + (pr.secondaryPlantReadyDays ?? 0)}d from sowing →{" "}
            {pr.secondaryReadyAt ? moment(pr.secondaryReadyAt).format("DD MMM YYYY") : "—"}
          </Typography>
          <Typography
            variant="body2"
            fontWeight={800}
            color={secondaryCd.done ? "success.main" : "text.primary"}
            sx={{ mt: 0.25 }}
          >
            {secondaryCd.done
              ? "Due"
              : `${secondaryDaysLeft ?? 0} day${(secondaryDaysLeft ?? 0) !== 1 ? "s" : ""} remaining`}
          </Typography>
          {!secondaryCd.done && (
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              {secondaryCd.text}
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export const PlantReadyBatchDaysOnly = ({ pr, theme }) => {
  const p = pr?.primaryPlantReadyDays ?? 0;
  const s = pr?.secondaryPlantReadyDays ?? 0;
  if (p === 0 && s === 0) return null;
  return (
    <Box
      sx={{
        mt: 0,
        p: 1,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: alpha(theme.palette.background.paper, 0.95),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
        <PlantReadyIcon sx={{ fontSize: 16, color: "primary.main" }} />
        <Typography variant="caption" fontWeight={800} color="primary.dark">
          Plant-ready (batch)
        </Typography>
      </Stack>
      <Typography variant="body2" fontWeight={600}>
        Primary <strong>{p}</strong> days · Secondary <strong>{s}</strong> days
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", lineHeight: 1.4 }}>
        From dispatch batch. Link sowing to this batch to see target dates and countdown.
      </Typography>
    </Box>
  );
};

export const hasPlantReadyUi = (pr) =>
  !!pr &&
  (pr.hasAnchor ||
    (Number(pr.primaryPlantReadyDays) || 0) > 0 ||
    (Number(pr.secondaryPlantReadyDays) || 0) > 0);

export const PlantReadyPanel = ({ pr, nowTick, theme }) => {
  if (!hasPlantReadyUi(pr)) return null;
  if (pr.hasAnchor) {
    return <PlantReadyDetailBlock pr={pr} nowTick={nowTick} theme={theme} />;
  }
  return <PlantReadyBatchDaysOnly pr={pr} theme={theme} />;
};

/** Compact strip for secondary Inward: availability + readiness (replaces PlantReadyPanel there). */
export const BatchAvailReadyStrip = ({
  avail,
  total,
  readyState,
  expectedReadyLabel,
  plantedOnLabel,
  pr,
  theme,
}) => {
  const stateColor =
    readyState === "Upcoming"
      ? "default"
      : readyState === "Ready (bypass)"
        ? "warning"
        : "success";
  return (
    <Box
      sx={{
        mt: 1,
        p: 1,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: alpha(theme.palette.background.paper, 0.95),
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="caption" fontWeight={800} color="text.primary">
          Batch availability · {avail}/{total} plants
        </Typography>
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={0.5}>
          <Chip size="small" label={readyState} color={stateColor} variant={readyState === "Upcoming" ? "outlined" : "filled"} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          Expected ready: <strong>{expectedReadyLabel}</strong>
          {plantedOnLabel ? ` · Planted ${plantedOnLabel}` : ""}
        </Typography>
        {pr?.hasAnchor && pr?.anchorSowingDate && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: "block" }}>
            Sowing-linked target (info): {pr.secondaryReadyAt ? moment(pr.secondaryReadyAt).format("DD MMM YYYY") : "—"} · sowing{" "}
            {moment(pr.anchorSowingDate, "DD-MM-YYYY", true).isValid()
              ? moment(pr.anchorSowingDate, "DD-MM-YYYY").format("DD MMM YYYY")
              : pr.anchorSowingDate}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
