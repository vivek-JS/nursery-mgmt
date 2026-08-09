import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
  Fade,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SearchIcon from "@mui/icons-material/Search";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import BatchSelector from "./components/BatchSelector";
import PipelineFlowRail from "./components/PipelineFlowRail";
import PipelineStageTabs from "./components/PipelineStageTabs";
import PipelineEmptyState from "./components/PipelineEmptyState";
import LabOutwardSection from "./components/lab/LabOutwardSection";
import PrimarySection from "./components/primary/PrimarySection";
import SecondarySection from "./components/secondary/SecondarySection";
import DispatchSection from "./components/dispatch/DispatchSection";
import { usePlantPipeline } from "./hooks/usePlantPipeline";
import { usePipelineMasterData } from "./hooks/usePipelineMasterData";
import { pageShellSx, heroPaperSx, contentPaperSx } from "./utils/pipelineTheme";

const TAB_LAB = 0;
const TAB_PRIMARY = 1;
const TAB_SECONDARY = 2;
const TAB_DISPATCH = 3;

function isAdminUser(userData) {
  const jt = userData?.jobTitle;
  const role = userData?.role;
  return (
    jt === "ADMIN" ||
    jt === "SUPER_ADMIN" ||
    jt === "SUPERADMIN" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "SUPERADMIN"
  );
}

export default function PlantPipelineAdminPage() {
  const navigate = useNavigate();
  const userData = useSelector((s) => s?.userData?.userData);
  const isAdmin = isAdminUser(userData);

  const [tab, setTab] = useState(TAB_LAB);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  const { batches, locations, trays, loading: masterLoading } = usePipelineMasterData();
  const {
    batchDoc,
    batchOptions,
    loading: pipelineLoading,
    refresh,
  } = usePlantPipeline(selectedBatchId);

  useEffect(() => {
    if (userData && !isAdmin) navigate("/u/dashboard", { replace: true });
  }, [userData, isAdmin, navigate]);

  const loading = masterLoading || pipelineLoading;

  return (
    <Box sx={pageShellSx}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: "auto" }}>
        {/* Hero header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                color: "#fff",
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.35)",
              }}
            >
              <AccountTreeIcon />
            </Box>
            <Box flex={1}>
              <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
                Plant Pipeline
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lab → Primary → Secondary → Dispatch — one place for the full hardening flow
              </Typography>
            </Box>
            <Tooltip title="Refresh data">
              <IconButton
                onClick={refresh}
                disabled={loading}
                sx={{
                  bgcolor: "#fff",
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": { bgcolor: "#f0fdf4" },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Batch picker + flow rail */}
        <Paper sx={{ ...heroPaperSx, mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            Batch
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start", mt: 1 }}>
            <BatchSelector
              batchOptions={batchOptions}
              dispatchBatches={batches}
              value={selectedBatchId}
              onChange={setSelectedBatchId}
            />
          </Box>
          {selectedBatchId && batchDoc && (
            <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                Pipeline snapshot
              </Typography>
              <PipelineFlowRail batchDoc={batchDoc} activeTab={tab} />
            </Box>
          )}
        </Paper>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={36} sx={{ color: "#059669" }} />
          </Box>
        )}

        {!loading && (
          <Fade in timeout={300}>
            <Box>
              <PipelineStageTabs
                value={tab}
                onChange={setTab}
                batchDoc={batchDoc}
                batchSelected={Boolean(selectedBatchId)}
              />

              <Paper sx={{ ...contentPaperSx, p: { xs: 2, md: 2.5 } }}>
                {tab === TAB_LAB && (
                  <LabOutwardSection
                    batchId={selectedBatchId}
                    batchDoc={batchDoc}
                    onRefresh={refresh}
                  />
                )}
                {tab === TAB_PRIMARY && (
                  <PrimarySection
                    batchId={selectedBatchId}
                    batchDoc={batchDoc}
                    locations={locations}
                    trays={trays}
                    onRefresh={refresh}
                  />
                )}
                {tab === TAB_SECONDARY && (
                  <SecondarySection
                    batchId={selectedBatchId}
                    batchDoc={batchDoc}
                    locations={locations}
                    trays={trays}
                    onRefresh={refresh}
                  />
                )}
                {tab === TAB_DISPATCH && (
                  <DispatchSection
                    batchId={selectedBatchId}
                    batchDoc={batchDoc}
                    locations={locations}
                    onRefresh={refresh}
                  />
                )}
              </Paper>
            </Box>
          </Fade>
        )}

        {!selectedBatchId && !loading && (
          <PipelineEmptyState
            icon={SearchIcon}
            title="Select a batch to begin"
            description="Choose a dispatch batch above. You can add lab outward, record primary/secondary sowing, and link dispatch — all in one flow."
            stageColor="#059669"
          />
        )}
      </Box>
    </Box>
  );
}
