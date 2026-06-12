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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import { Toast } from "helpers/toasts/toastHelper";
import SecondaryLagwadDialog from "../../dialogs/SecondaryLagwadDialog";
import {
  acknowledgePrimaryOutward,
  recordMortality,
  markSowingComplete,
  patchSecondaryReadinessBypass,
  apiErrText,
} from "../../utils/pipelineApi";
import { formatPipelineDate } from "../../utils/pipelineLabels";

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
      <TableContainer>
        <Table size="small">
          <TableHead>
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
              <TableRow key={String(row._id)}>
                <TableCell>{formatPipelineDate(row.primaryOutwardDate)}</TableCell>
                <TableCell align="right">{row.totalQuantity ?? row.availableQuantity ?? "—"}</TableCell>
                <TableCell>
                  {row.secondaryAcknowledgedAt ? (
                    <Chip size="small" color="success" label="Yes" />
                  ) : (
                    <Button size="small" onClick={() => handleAck(String(row._id))}>
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

      <Dialog open={mortalityOpen} onClose={() => setMortalityOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record mortality</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="number"
            label="Quantity"
            value={mortalityQty}
            onChange={(e) => setMortalityQty(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Remarks"
            value={mortalityRemarks}
            onChange={(e) => setMortalityRemarks(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMortalityOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={submitMortality}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
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
      <TableContainer>
        <Table size="small">
          <TableHead>
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
                <TableRow key={String(row._id)}>
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

      <Dialog open={bypassOpen} onClose={() => setBypassOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Secondary readiness bypass</DialogTitle>
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
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Select a batch for secondary operations.</Typography>
      </Paper>
    );
  }

  const primaryOutward = batchDoc?.primaryOutward ?? [];
  const secondaryInward = batchDoc?.secondaryInward ?? [];

  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Incoming from primary</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <IncomingBlock batchId={batchId} rows={primaryOutward} onRefresh={onRefresh} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%", pr: 2 }}>
            <Typography fontWeight={600}>Secondary lagwad (sowing)</Typography>
            <Box flex={1} />
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setLagwadOpen(true);
              }}
            >
              Add lagwad
            </Button>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            FIFO lagwad from acknowledged primary outward stock (batch-scoped).
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Secondary inward</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <SecondaryInwardTable
            batchId={batchId}
            rows={secondaryInward}
            onRefresh={onRefresh}
          />
        </AccordionDetails>
      </Accordion>

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
