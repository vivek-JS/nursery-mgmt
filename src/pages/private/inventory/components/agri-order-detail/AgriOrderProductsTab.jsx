import React, { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";

function LineBatchRows({ batches }) {
  if (!batches?.length) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
        No batch allocations yet
      </Typography>
    );
  }
  return (
    <Table size="small" sx={{ mt: 1, bgcolor: "#f8fafc" }}>
      <TableHead>
        <TableRow>
          <TableCell>Batch</TableCell>
          <TableCell>Expiry</TableCell>
          <TableCell align="right">Deducted</TableCell>
          <TableCell align="right">Returned</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {batches.map((b, i) => (
          <TableRow key={b.batchId || i}>
            <TableCell>{b.batchNumber || "—"}</TableCell>
            <TableCell>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "—"}</TableCell>
            <TableCell align="right">{Number(b.quantityDeducted || 0)}</TableCell>
            <TableCell align="right">{Number(b.quantityReturned || 0)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AgriOrderProductsTab({ order, batchSummary }) {
  const lines = order?.lineItems?.length
    ? order.lineItems
    : order?.productName
      ? [
          {
            productName: order.productName,
            ramAgriCropName: order.ramAgriCropName,
            ramAgriVarietyName: order.ramAgriVarietyName,
            quantity: order.quantity,
            rate: order.rate,
            lineTotal: order.totalAmount,
            batchAllocations: order.batchAllocations,
          },
        ]
      : [];

  const summaryLines = batchSummary?.lines || [];
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <Box sx={{ p: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "#e3f2fd" }}>
            <TableCell>Product</TableCell>
            <TableCell align="right">Qty</TableCell>
            <TableCell align="right">Rate</TableCell>
            <TableCell align="right">Total</TableCell>
            <TableCell width={48} />
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((ln, idx) => {
            const label = ln.ramAgriCropName
              ? `${ln.ramAgriCropName} · ${ln.ramAgriVarietyName || ""}`
              : ln.productName;
            const batches =
              summaryLines[idx]?.batchAllocations || ln.batchAllocations || [];
            const expanded = openIdx === idx;
            return (
              <React.Fragment key={ln._id || idx}>
                <TableRow hover>
                  <TableCell>{label}</TableCell>
                  <TableCell align="right">{Number(ln.quantity || 0)}</TableCell>
                  <TableCell align="right">₹{Number(ln.rate || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">₹{Number(ln.lineTotal || ln.quantity * ln.rate || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => setOpenIdx(expanded ? null : idx)}>
                      {expanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                    <Collapse in={expanded}>
                      <LineBatchRows batches={batches} />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
