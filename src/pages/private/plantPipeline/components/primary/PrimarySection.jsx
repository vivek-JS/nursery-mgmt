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
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import GrassIcon from "@mui/icons-material/Grass";
import { Toast } from "helpers/toasts/toastHelper";
import PrimaryInwardDialog from "../../dialogs/PrimaryInwardDialog";
import PrimaryOutwardDialog from "../../dialogs/PrimaryOutwardDialog";
import PrimaryToSecondaryDialog from "../../dialogs/PrimaryToSecondaryDialog";
import PipelineSectionCard from "../PipelineSectionCard";
import PipelineEmptyState from "../PipelineEmptyState";
import PipelineFormDialog from "../PipelineFormDialog";
import {
  reviewLabLine,
  patchPrimaryReadinessBypass,
  apiErrText,
} from "../../utils/pipelineApi";
import { formatPipelineDate } from "../../utils/pipelineLabels";
import { STAGES, tableHeadSx, tableRowSx, contentPaperSx } from "../../utils/pipelineTheme";

function LabAcceptanceBlock({ batchId, lines, onRefresh }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const pending = (lines ?? []).filter(
    (l) => (l.primaryReviewStatus ?? "pending") === "pending"
  );

  const handleAccept = async (labId) => {
    try {
      await reviewLabLine(batchId, labId, "accept");
      Toast.success("Lab line accepted");
      onRefresh?.();
    } catch (e) {
      Toast.error(apiErrText(e) || "Accept failed");
    }
  };

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      Toast.error("Rejection reason required");
      return;
    }
    try {
      await reviewLabLine(batchId, rejectTarget, "reject", rejectReason.trim());
      Toast.success("Lab line rejected");
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason("");
      onRefresh?.();
    } catch (e) {
      Toast.error(apiErrText(e) || "Reject failed");
    }
  };

  if (!pending.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        All lab lines reviewed — nothing pending acceptance.
      </Typography>
    );
  }

  return (
    <>
      <TableContainer sx={contentPaperSx}>
        <Table size="small">
          <TableHead sx={tableHeadSx}>
            <TableRow>
              <TableCell>Outward</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.map((row) => (
              <TableRow key={String(row._id)} sx={tableRowSx}>
                <TableCell>{formatPipelineDate(row.outwardDate)}</TableCell>
                <TableCell>{row.size}</TableCell>
                <TableCell align="right">{row.plants}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleAccept(String(row._id))}
                      sx={{ borderRadius: 2, textTransform: "none" }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      onClick={() => {
                        setRejectTarget(String(row._id));
                        setRejectOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <PipelineFormDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject lab line"
        subtitle="Primary shed will not receive this line"
        stageColor="#dc2626"
        onSubmit={(e) => {
          e.preventDefault();
          submitReject();
        }}
        submitLabel="Reject line"
      >
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Rejection reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          required
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
        />
      </PipelineFormDialog>
    </>
  );
}

function InwardTable({ rows, batchId, onRefresh }) {
  const [bypassOpen, setBypassOpen] = useState(false);
  const [bypassId, setBypassId] = useState("");
  const [bypassReason, setBypassReason] = useState("");

  const submitBypass = async () => {
    if (!bypassReason.trim()) {
      Toast.error("Reason required");
      return;
    }
    try {
      await patchPrimaryReadinessBypass(batchId, bypassId, bypassReason.trim());
      Toast.success("Readiness bypass applied");
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
              <TableCell>Date</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell>Polyhouse</TableCell>
              <TableCell>Expected out</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rows ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No primary inward records.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={String(row._id)} sx={tableRowSx}>
                  <TableCell>{formatPipelineDate(row.primaryInwardDate)}</TableCell>
                  <TableCell>{row.size}</TableCell>
                  <TableCell align="right">{row.totalQuantity ?? row.numberOfTrays}</TableCell>
                  <TableCell>{row.pollyhouse ?? "—"}</TableCell>
                  <TableCell>{formatPipelineDate(row.primaryOutwardExpectedDate)}</TableCell>
                  <TableCell align="right">
                    {!row.readinessBypassAt && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setBypassId(String(row._id));
                          setBypassOpen(true);
                        }}
                        sx={{ borderRadius: 2, textTransform: "none" }}
                      >
                        Mark ready
                      </Button>
                    )}
                    {row.readinessBypassAt && (
                      <Chip size="small" label="Bypassed" color="info" />
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
        title="Primary readiness override"
        subtitle="Skip waiting period — requires a reason"
        stageColor={STAGES.primary.color}
        onSubmit={(e) => {
          e.preventDefault();
          submitBypass();
        }}
        submitLabel="Apply override"
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

export default function PrimarySection({
  batchId,
  batchDoc,
  locations,
  trays,
  onRefresh,
}) {
  const [inwardOpen, setInwardOpen] = useState(false);
  const [outwardOpen, setOutwardOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  if (!batchId) {
    return (
      <PipelineEmptyState
        icon={GrassIcon}
        title="Primary shed"
        description="Select a batch to accept lab lines and record primary inward/outward."
        stageColor={STAGES.primary.color}
      />
    );
  }

  const labLines = batchDoc?.outward ?? [];
  const primaryInward = batchDoc?.primaryInward ?? [];
  const primaryOutward = batchDoc?.primaryOutward ?? [];
  const pendingLab = labLines.filter((l) => (l.primaryReviewStatus ?? "pending") === "pending").length;

  return (
    <Box>
      <PipelineSectionCard
        stage={STAGES.lab}
        title="Lab acceptance"
        subtitle="Review lines before primary can record inward"
        count={pendingLab}
      >
        <LabAcceptanceBlock batchId={batchId} lines={labLines} onRefresh={onRefresh} />
      </PipelineSectionCard>

      <PipelineSectionCard
        stage={STAGES.primary}
        title="Primary inward"
        subtitle="Sowing in primary polyhouse — use FIFO preview before save"
        count={primaryInward.length}
        actionLabel="Add inward"
        actionIcon={AddIcon}
        onAction={() => setInwardOpen(true)}
      >
        <InwardTable rows={primaryInward} batchId={batchId} onRefresh={onRefresh} />
      </PipelineSectionCard>

      <PipelineSectionCard
        stage={STAGES.primary}
        title="Primary outward"
        subtitle="Plants ready to move to outward stock"
        count={primaryOutward.length}
        actionLabel="Add outward"
        actionIcon={AddIcon}
        onAction={() => setOutwardOpen(true)}
      >
        <TableContainer sx={contentPaperSx}>
          <Table size="small">
            <TableHead sx={tableHeadSx}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Plants</TableCell>
                <TableCell>Quality</TableCell>
                <TableCell>Secondary ack</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {primaryOutward.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No primary outward records yet.
                  </TableCell>
                </TableRow>
              ) : (
                primaryOutward.map((row) => (
                  <TableRow key={String(row._id)} sx={tableRowSx}>
                    <TableCell>{formatPipelineDate(row.primaryOutwardDate)}</TableCell>
                    <TableCell align="right">{row.totalQuantity ?? "—"}</TableCell>
                    <TableCell>{row.qualityOfDispatch ?? "—"}</TableCell>
                    <TableCell>
                      {row.secondaryAcknowledgedAt ? (
                        <Chip size="small" color="success" label="Acknowledged" />
                      ) : (
                        <Chip size="small" variant="outlined" label="Pending" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </PipelineSectionCard>

      <PipelineSectionCard
        stage={STAGES.secondary}
        title="Send to secondary"
        subtitle="Transfer primary outward stock to secondary shed"
        defaultOpen={false}
        actionLabel="Transfer"
        actionIcon={AddIcon}
        onAction={() => setTransferOpen(true)}
      >
        <Typography variant="body2" color="text.secondary">
          Pick a primary outward line, trays, and polyhouse — creates secondary inward on save.
        </Typography>
      </PipelineSectionCard>

      <PrimaryInwardDialog
        open={inwardOpen}
        onClose={() => setInwardOpen(false)}
        batchId={batchId}
        locations={locations}
        trays={trays}
        onSuccess={onRefresh}
      />
      <PrimaryOutwardDialog
        open={outwardOpen}
        onClose={() => setOutwardOpen(false)}
        batchId={batchId}
        locations={locations}
        onSuccess={onRefresh}
      />
      <PrimaryToSecondaryDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        batchId={batchId}
        batchDoc={batchDoc}
        locations={locations}
        trays={trays}
        onSuccess={onRefresh}
      />
    </Box>
  );
}
