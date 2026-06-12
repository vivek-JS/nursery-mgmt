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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LabOutwardDialog from "../../dialogs/LabOutwardDialog";
import { formatPipelineDate } from "../../utils/pipelineLabels";

function statusChip(status) {
  const s = status ?? "pending";
  if (s === "accepted") return <Chip size="small" color="success" label="Accepted" />;
  if (s === "rejected") return <Chip size="small" color="error" label="Rejected" />;
  return <Chip size="small" color="warning" label="Pending" />;
}

export default function LabOutwardSection({ batchId, batchDoc, onRefresh }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const lines = batchDoc?.outward ?? [];

  if (!batchId) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Select a batch to view lab outward lines.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, alignItems: "center" }}>
        <Typography variant="h6">Lab outward</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add lab outward
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Outward date</TableCell>
              <TableCell>Rooting date</TableCell>
              <TableCell>Size</TableCell>
              <TableCell align="right">Bottles</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No lab outward lines yet.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((row) => (
                <TableRow key={String(row._id)}>
                  <TableCell>{formatPipelineDate(row.outwardDate)}</TableCell>
                  <TableCell>{formatPipelineDate(row.rootingDate)}</TableCell>
                  <TableCell>{row.size ?? "—"}</TableCell>
                  <TableCell align="right">{row.bottles ?? "—"}</TableCell>
                  <TableCell align="right">{row.plants ?? "—"}</TableCell>
                  <TableCell>{statusChip(row.primaryReviewStatus)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <LabOutwardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        batchId={batchId}
        onSuccess={onRefresh}
      />
    </Box>
  );
}
