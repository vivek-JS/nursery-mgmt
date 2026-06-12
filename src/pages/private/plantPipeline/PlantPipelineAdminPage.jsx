import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Tab,
  Tabs,
  Typography,
  Paper,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import BatchSelector from "./components/BatchSelector";
import PipelineStatusChips from "./components/PipelineStatusChips";
import LabOutwardSection from "./components/lab/LabOutwardSection";
import PrimarySection from "./components/primary/PrimarySection";
import SecondarySection from "./components/secondary/SecondarySection";
import DispatchSection from "./components/dispatch/DispatchSection";
import { usePlantPipeline } from "./hooks/usePlantPipeline";
import { usePipelineMasterData } from "./hooks/usePipelineMasterData";

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

  const handleRefresh = () => {
    refresh();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Plant Pipeline
        </Typography>
        <Box flex={1} />
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start" }}>
          <BatchSelector
            batchOptions={batchOptions}
            dispatchBatches={batches}
            value={selectedBatchId}
            onChange={setSelectedBatchId}
          />
          {selectedBatchId && batchDoc && (
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <PipelineStatusChips batchDoc={batchDoc} />
            </Box>
          )}
        </Box>
      </Paper>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Lab" />
            <Tab label="Primary" disabled={!selectedBatchId} />
            <Tab label="Secondary" disabled={!selectedBatchId} />
            <Tab label="Dispatch" disabled={!selectedBatchId} />
          </Tabs>

          {tab === TAB_LAB && (
            <LabOutwardSection
              batchId={selectedBatchId}
              batchDoc={batchDoc}
              onRefresh={handleRefresh}
            />
          )}
          {tab === TAB_PRIMARY && (
            <PrimarySection
              batchId={selectedBatchId}
              batchDoc={batchDoc}
              locations={locations}
              trays={trays}
              onRefresh={handleRefresh}
            />
          )}
          {tab === TAB_SECONDARY && (
            <SecondarySection
              batchId={selectedBatchId}
              batchDoc={batchDoc}
              locations={locations}
              trays={trays}
              onRefresh={handleRefresh}
            />
          )}
          {tab === TAB_DISPATCH && (
            <DispatchSection
              batchId={selectedBatchId}
              batchDoc={batchDoc}
              locations={locations}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}

      {!selectedBatchId && !loading && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography color="text.secondary">
            Select a batch above to manage primary, secondary, and dispatch stages. Lab outward
            can be added once a batch is selected.
          </Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={handleRefresh}>
            Reload batches
          </Button>
        </Paper>
      )}
    </Box>
  );
}
