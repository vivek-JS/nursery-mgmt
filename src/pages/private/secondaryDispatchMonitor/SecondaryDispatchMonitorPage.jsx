import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Stack,
  Button,
  Link as MuiLink,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchVehicleDispatches } from "pages/private/plantPipeline/utils/pipelineApi";
import { pageShellSx } from "pages/private/plantPipeline/utils/pipelineTheme";
import MonitorKpiStrip from "./components/MonitorKpiStrip";
import SowReadyStockPanel from "./components/SowReadyStockPanel";
import VehicleDispatchMonitorPanel from "./components/VehicleDispatchMonitorPanel";
import { summarizeVehicles } from "./utils/monitorHelpers";

function isAllowedUser(userData) {
  const jt = userData?.jobTitle;
  const role = userData?.role;
  const allowed = new Set([
    "ADMIN",
    "SUPER_ADMIN",
    "SUPERADMIN",
    "DISPATCH_MANAGER",
    "OFFICE_ADMIN",
    "OFFICEADMIN",
  ]);
  return allowed.has(jt) || allowed.has(role);
}

export default function SecondaryDispatchMonitorPage() {
  const navigate = useNavigate();
  const userData = useSelector((s) => s?.userData?.userData);
  const allowed = isAllowedUser(userData);

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sowReadyTotal, setSowReadyTotal] = useState(0);
  const [windowLabel, setWindowLabel] = useState("");

  useEffect(() => {
    if (userData && !allowed) navigate("/u/dashboard", { replace: true });
  }, [userData, allowed, navigate]);

  const refreshVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await fetchVehicleDispatches(1, search);
      setVehicles(items);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshVehicles();
    }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [refreshVehicles, search]);

  const vehicleSummary = useMemo(() => summarizeVehicles(vehicles), [vehicles]);

  const onSowTotals = useCallback((total, label) => {
    setSowReadyTotal(total);
    setWindowLabel(label || "");
  }, []);

  if (userData && !allowed) return null;

  return (
    <Box sx={pageShellSx}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          spacing={1.5}
          mb={3}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #2563eb 0%, #0d9488 100%)",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
            }}
          >
            <MonitorHeartIcon />
          </Box>
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
              Secondary Dispatch Monitor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sow-ready sellable stock · vehicle load progress · secondary inward & papaya paths
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/u/dispatch-orders"
            size="small"
            endIcon={<OpenInNewIcon />}
            sx={{ textTransform: "none" }}
          >
            Dispatch orders
          </Button>
          <Button
            component={Link}
            to="/u/secondary-sowing-entry"
            size="small"
            endIcon={<OpenInNewIcon />}
            sx={{ textTransform: "none" }}
          >
            Secondary ops
          </Button>
          <Tooltip title="Refresh vehicles">
            <IconButton onClick={refreshVehicles} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box mb={2.5}>
          <MonitorKpiStrip
            vehicleSummary={vehicleSummary}
            sowReadyTotal={sowReadyTotal}
            windowLabel={windowLabel}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1.2fr" },
            alignItems: "start",
          }}
        >
          <SowReadyStockPanel vehicles={vehicles} onTotals={onSowTotals} />
          <VehicleDispatchMonitorPanel
            vehicles={vehicles}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            onRefresh={refreshVehicles}
          />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mt={2}>
          Tip: papaya / sowingAllowed rows load from slot sow-ready stock; banana / TC rows use
          secondary inward.{" "}
          <MuiLink component={Link} to="/u/plant-pipeline">
            Plant Pipeline
          </MuiLink>{" "}
          for batch-scoped ops.
        </Typography>
      </Box>
    </Box>
  );
}
