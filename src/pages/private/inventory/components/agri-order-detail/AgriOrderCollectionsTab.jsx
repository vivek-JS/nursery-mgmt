import React from "react";
import {
  Box,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Add } from "@mui/icons-material";

function SectionHeader({ title, balance, onCreate }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "#e3f2fd",
        px: 2,
        py: 1,
        borderRadius: 1,
        mb: 1,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
        {balance != null && (
          <Typography component="span" sx={{ ml: 2, color: "success.main", fontWeight: 700 }}>
            Balance due ₹{Number(balance).toLocaleString()}
          </Typography>
        )}
      </Typography>
      {onCreate ? (
        <Button size="small" startIcon={<Add />} onClick={onCreate}>
          Create
        </Button>
      ) : null}
    </Box>
  );
}

export default function AgriOrderCollectionsTab({ order, returnRequests, onAddPayment }) {
  const payments = order?.payment || [];
  const balance = Number(order?.balanceAmount ?? 0);

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <SectionHeader title="# SOC (Sell Order Collection)" balance={balance} onCreate={onAddPayment} />
        {payments.length === 0 ? (
          <Typography color="error" variant="body2">
            Data Not Found
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Amount</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p, i) => (
                <TableRow key={p._id || i}>
                  <TableCell>₹{Number(p.paidAmount || 0).toLocaleString()}</TableCell>
                  <TableCell>{p.modeOfPayment || "—"}</TableCell>
                  <TableCell>{p.paymentStatus || "—"}</TableCell>
                  <TableCell>
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Box>
        <SectionHeader title="# Credit Note to Buyer" />
        {!returnRequests?.length ? (
          <Typography color="text.secondary" variant="body2">
            No sales return requests
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Requested</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returnRequests.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.status}
                      color={
                        r.status === "APPROVED" ? "success" : r.status === "PENDING" ? "warning" : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {(r.lineReturns || []).reduce((s, l) => s + Number(l.returnQuantity || 0), 0)}
                  </TableCell>
                  <TableCell>{r.returnReason || "—"}</TableCell>
                  <TableCell>
                    {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Box>
        <SectionHeader title="# Debit Note to Buyer" />
        <Typography color="text.secondary" variant="body2">
          No data available
        </Typography>
      </Box>
    </Box>
  );
}
