import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { Toast } from "helpers/toasts/toastHelper";
import PrimaryInwardDialog from "../../dialogs/PrimaryInwardDialog";
import PrimaryOutwardDialog from "../../dialogs/PrimaryOutwardDialog";
import PrimaryToSecondaryDialog from "../../dialogs/PrimaryToSecondaryDialog";
import {
  reviewLabLine,
  patchPrimaryReadinessBypass,
  apiErrText,
} from "../../utils/pipelineApi";
import { formatPipelineDate } from "../../utils/pipelineLabels";

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
      <Typography variant="body2" color="text.secondary">
        No pending lab lines for acceptance.
      </Typography>
    );
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Outward</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.map((row) => (
              <TableRow key={String(row._id)}>
                <TableCell>{formatPipelineDate(row.outwardDate)}</TableCell>
                <TableCell>{row.size}</TableCell>
                <TableCell align="right">{row.plants}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      size="small"
                      color="success"
                      startIcon={<CheckIcon />}
                      onClick={() => handleAccept(String(row._id))}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
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

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject lab line</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={submitReject}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
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
      <TableContainer>
        <Table size="small">
          <TableHead>
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
                <TableRow key={String(row._id)}>
                  <TableCell>{formatPipelineDate(row.primaryInwardDate)}</TableCell>
                  <TableCell>{row.size}</TableCell>
                  <TableCell align="right">{row.totalQuantity ?? row.numberOfTrays}</TableCell>
                  <TableCell>{row.pollyhouse ?? "—"}</TableCell>
                  <TableCell>{formatPipelineDate(row.primaryOutwardExpectedDate)}</TableCell>
                  <TableCell align="right">
                    {!row.readinessBypassAt && (
                      <Button
                        size="small"
                        onClick={() => {
                          setBypassId(String(row._id));
                          setBypassOpen(true);
                        }}
                      >
                        Bypass ready
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

      <Dialog open={bypassOpen} onClose={() => setBypassOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Primary readiness bypass</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Reason"
            value={bypassReason}
            onChange={(e) => setBypassReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBypassOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitBypass}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
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
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Select a batch for primary operations.</Typography>
      </Paper>
    );
  }

  const labLines = batchDoc?.outward ?? [];
  const primaryInward = batchDoc?.primaryInward ?? [];
  const primaryOutward = batchDoc?.primaryOutward ?? [];

  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Lab acceptance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <LabAcceptanceBlock batchId={batchId} lines={labLines} onRefresh={onRefresh} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%", pr: 2 }}>
            <Typography fontWeight={600}>Primary inward</Typography>
            <Box flex={1} />
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setInwardOpen(true);
              }}
            >
              Add inward
            </Button>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <InwardTable rows={primaryInward} batchId={batchId} onRefresh={onRefresh} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%", pr: 2 }}>
            <Typography fontWeight={600}>Primary outward</Typography>
            <Box flex={1} />
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setOutwardOpen(true);
              }}
            >
              Add outward
            </Button>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Plants</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Ack secondary</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {primaryOutward.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No primary outward records.
                    </TableCell>
                  </TableRow>
                ) : (
                  primaryOutward.map((row) => (
                    <TableRow key={String(row._id)}>
                      <TableCell>{formatPipelineDate(row.primaryOutwardDate)}</TableCell>
                      <TableCell align="right">{row.totalQuantity ?? "—"}</TableCell>
                      <TableCell>{row.qualityOfDispatch ?? "—"}</TableCell>
                      <TableCell>
                        {row.secondaryAcknowledgedAt ? (
                          <Chip size="small" color="success" label="Acknowledged" />
                        ) : (
                          <Chip size="small" label="Pending" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%", pr: 2 }}>
            <Typography fontWeight={600}>Send to secondary</Typography>
            <Box flex={1} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setTransferOpen(true);
              }}
            >
              Transfer
            </Button>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary">
            Record transfer of primary outward stock to secondary shed inward.
          </Typography>
        </AccordionDetails>
      </Accordion>

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
