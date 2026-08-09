import React, { useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Stack,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ParkIcon from "@mui/icons-material/Park";
import { Toast } from "helpers/toasts/toastHelper";
import SecondaryLagwadDialog from "../../dialogs/SecondaryLagwadDialog";
import PipelineSectionCard from "../PipelineSectionCard";
import PipelineEmptyState from "../PipelineEmptyState";
import PipelineFormDialog from "../PipelineFormDialog";
import {
  acknowledgePrimaryOutward,
  recordMortality,
  markSowingComplete,
  patchSecondaryReadinessBypass,
  apiErrText,
} from "../../utils/pipelineApi";
import { formatPipelineDate } from "../../utils/pipelineLabels";
import { STAGES, tableHeadSx, tableRowSx, contentPaperSx } from "../../utils/pipelineTheme";

function IncomingBlock({ batchId, rows, onRefresh }) {
  const [mortalityOpen, setMortalityOpen] = useState(false);
  const [mortalityTarget, setMortalityTarget] = useState(null);
  const [mortalityQty, setMortalityQty] = useState("");
  const [mortalityRemarks, setMortalityRemarks] = useState("");

  const incoming = (rows ?? []).filter((po) => !po.secondarySowingCompletedAt);

  const handleAck = async (poId) => {
    try {
      await acknowledgePrimaryOutward(batchId, poId);
      Toast.success("Acknowledged for secondary");
      onRefresh?.();
    } catch (e) {
      Toast.error(apiErrText(e) || "Acknowledge failed");
    }
  };

  const handleSowingDone = async (poId) => {
    try {
      await markSowingComplete(batchId, poId);
      Toast.success("Sowing marked complete");
      onRefresh?.();
    } catch (e) {
      Toast.error(apiErrText(e) || "Failed");
    }
  };

  const submitMortality = async () => {
    const qty = Number(mortalityQty);
    if (!mortalityTarget || qty < 1) {
      Toast.error("Enter valid quantity");
      return;
    }
    try {
      await recordMortality(batchId, mortalityTarget, qty, mortalityRemarks);
      Toast.success("Mortality recorded");
      setMortalityOpen(false);
      onRefresh?.();
    } catch (e) {
      Toast.error(apiErrText(e) || "Mortality failed");
    }
  };

  if (!incoming.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No incoming primary outward lines pending secondary action.
      </Typography>
    );
  }

  return (
    <>
      <TableContainer sx={contentPaperSx}>
        <Table size="small">
          <TableHead sx={tableHeadSx}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell>Ack</TableCell>
              <TableCell>Sowing</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incoming.map((row) => (
              <TableRow key={String(row._id)} sx={tableRowSx}>
                <TableCell>{formatPipelineDate(row.primaryOutwardDate)}</TableCell>
                <TableCell align="right">{row.totalQuantity ?? row.availableQuantity ?? "—"}</TableCell>
                <TableCell>
                  {row.secondaryAcknowledgedAt ? (
                    <Chip size="small" color="success" label="Yes" />
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleAck(String(row._id))}
                      sx={{ borderRadius: 2, textTransform: "none", bgcolor: STAGES.secondary.color }}
                    >
                      Accept
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  {row.secondarySowingCompletedAt ? (
                    <Chip size="small" color="success" label="Done" />
                  ) : (
                    <Chip size="small" label="Pending" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {!row.secondarySowingCompletedAt && row.secondaryAcknowledgedAt && (
                      <Button size="small" onClick={() => handleSowingDone(String(row._id))}>
                        Sowing done
                      </Button>
                    )}
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => {
                        setMortalityTarget(String(row._id));
                        setMortalityQty("");
                        setMortalityOpen(true);
                      }}
                    >
                      Mortality
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <PipelineFormDialog
        open={mortalityOpen}
        onClose={() => setMortalityOpen(false)}
        title="Record mortality"
        subtitle="Loss during secondary sowing stage"
        stageColor="#d97706"
        onSubmit={(e) => {
          e.preventDefault();
          submitMortality();
        }}
        submitLabel="Save mortality"
      >
        <TextField
          fullWidth
          type="number"
          label="Quantity (plants)"
          value={mortalityQty}
          onChange={(e) => setMortalityQty(e.target.value)}
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Remarks"
          value={mortalityRemarks}
          onChange={(e) => setMortalityRemarks(e.target.value)}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </PipelineFormDialog>
    </>
  );
}

function SecondaryInwardTable({ batchId, rows, onRefresh }) {
  const [bypassOpen, setBypassOpen] = useState(false);
  const [bypassId, setBypassId] = useState("");
  const [bypassReason, setBypassReason] = useState("");

  const submitBypass = async () => {
    if (!bypassReason.trim()) {
      Toast.error("Reason required");
      return;
    }
    try {
      await patchSecondaryReadinessBypass(batchId, bypassId, bypassReason.trim());
      Toast.success("Marked ready for dispatch");
      setBypassOpen(false);
      onRefresh?.();
    } catch (e) {
      Toast.error(apiErrText(e) || "Bypass failed");
    }
  };

  return (
    <>
      <TableContainer sx={contentPaperSx}>
        <Table size="small">
          <TableHead sx={tableHeadSx}>
            <TableRow>
              <TableCell>Inward date</TableCell>
              <TableCell>Dispatch date</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No secondary inward records.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={String(row._id)} sx={tableRowSx}>
                  <TableCell>{formatPipelineDate(row.secondaryInwardDate)}</TableCell>
                  <TableCell>{formatPipelineDate(row.dateOfDispatch ?? row.expectedReadyDate)}</TableCell>
                  <TableCell>{row.size ?? "—"}</TableCell>
                  <TableCell align="right">{row.totalQuantity ?? "—"}</TableCell>
                  <TableCell align="right">
                    {!row.readinessBypassAt && (
                      <Button
                        size="small"
                        onClick={() => {
                          setBypassId(String(row._id));
                          setBypassOpen(true);
                        }}
                      >
                        Mark ready
                      </Button>
                    )}
                    {row.readinessBypassAt && (
                      <Chip size="small" color="success" label="Ready" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <PipelineFormDialog
        open={bypassOpen}
        onClose={() => setBypassOpen(false)}
        title="Mark ready for dispatch"
        subtitle="Override expected ready date"
        stageColor={STAGES.dispatch.color}
        onSubmit={(e) => {
          e.preventDefault();
          submitBypass();
        }}
        submitLabel="Mark ready"
      >
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Reason"
          value={bypassReason}
          onChange={(e) => setBypassReason(e.target.value)}
          required
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </PipelineFormDialog>
    </>
  );
}

export default function SecondarySection({
  batchId,
  batchDoc,
  locations,
  trays,
  onRefresh,
}) {
  const [lagwadOpen, setLagwadOpen] = useState(false);

  if (!batchId) {
    return (
      <PipelineEmptyState
        icon={ParkIcon}
        title="Secondary shed"
        description="Accept primary transfers, record lagwad sowing, and manage inward lines."
        stageColor={STAGES.secondary.color}
      />
    );
  }

  const primaryOutward = batchDoc?.primaryOutward ?? [];
  const secondaryInward = batchDoc?.secondaryInward ?? [];
  const incomingCount = primaryOutward.filter((po) => !po.secondarySowingCompletedAt).length;

  return (
    <Box>
      <PipelineSectionCard
        stage={STAGES.primary}
        title="Incoming from primary"
        subtitle="Accept → sow → mark complete or record mortality"
        count={incomingCount}
      >
        <IncomingBlock batchId={batchId} rows={primaryOutward} onRefresh={onRefresh} />
      </PipelineSectionCard>

      <PipelineSectionCard
        stage={STAGES.secondary}
        title="Secondary lagwad"
        subtitle="FIFO sowing from acknowledged primary outward stock"
        actionLabel="Add lagwad"
        actionIcon={AddIcon}
        onAction={() => setLagwadOpen(true)}
      >
        <Typography variant="body2" color="text.secondary">
          Enter R1/R2/R3 split, cavity, polyhouse and labour — one session per size group (R3 separate from R1/R2).
        </Typography>
      </PipelineSectionCard>

      <PipelineSectionCard
        stage={STAGES.secondary}
        title="Secondary inward"
        subtitle="Plants in secondary polyhouse — mark ready when dispatch date arrives"
        count={secondaryInward.length}
      >
        <SecondaryInwardTable
          batchId={batchId}
          rows={secondaryInward}
          onRefresh={onRefresh}
        />
      </PipelineSectionCard>

      <SecondaryLagwadDialog
        open={lagwadOpen}
        onClose={() => setLagwadOpen(false)}
        batchId={batchId}
        locations={locations}
        trays={trays}
        onSuccess={onRefresh}
      />
    </Box>
  );
}
