import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

export default function AgriOrderDispatchTab({ order, batchSummary }) {
  const lines = batchSummary?.lines || [];
  const allBatches = lines.flatMap((l) =>
    (l.batchAllocations || []).map((b) => ({
      ...b,
      productName: l.productName,
    }))
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Dispatch & delivery
      </Typography>
      <GridFacts order={order} />
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Batch allocations (FEFO)
      </Typography>
      {allBatches.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No batches allocated yet — dispatch pending
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#e3f2fd" }}>
              <TableCell>Product</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell align="right">Deducted</TableCell>
              <TableCell align="right">Returned</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allBatches.map((b, i) => (
              <TableRow key={`${b.batchId}-${i}`}>
                <TableCell>{b.productName || "—"}</TableCell>
                <TableCell>{b.batchNumber || "—"}</TableCell>
                <TableCell>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell align="right">{Number(b.quantityDeducted || 0)}</TableCell>
                <TableCell align="right">{Number(b.quantityReturned || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

function GridFacts({ order }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 1 }}>
      <Fact label="Dispatch status" value={order?.dispatchStatus || "NOT_DISPATCHED"} />
      <Fact label="Mode" value={order?.dispatchMode || "—"} />
      <Fact label="Vehicle" value={order?.vehicleNumber || order?.courierName || "—"} />
      <Fact label="Driver" value={order?.driverName || "—"} />
      <Fact
        label="Dispatched at"
        value={order?.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : "—"}
      />
    </Box>
  );
}

function Fact({ label, value }) {
  return (
    <Box sx={{ border: "1px solid #e2e8f0", borderRadius: 1, p: 1 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}
