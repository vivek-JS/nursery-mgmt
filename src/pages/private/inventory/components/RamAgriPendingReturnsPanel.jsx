import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { Toast } from "helpers/toasts/toastHelper";
import {
  approveAgriReturnRequest,
  listPendingAgriReturnRequests,
  rejectAgriReturnRequest,
} from "./agri-order-detail/agriOrderDetailApi";

export default function RamAgriPendingReturnsPanel({ onChanged }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingAgriReturnRequests();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      Toast.error(e?.message || "Failed to load pending returns");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await approveAgriReturnRequest(id);
      Toast.success("Return approved — stock and ledger updated");
      await load();
      onChanged?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this sales return request?")) return;
    setBusyId(id);
    try {
      await rejectAgriReturnRequest(id, "Rejected by office");
      Toast.success("Return rejected");
      await load();
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Paper variant="outlined" sx={{ p: 3, mb: 2, textAlign: "center", bgcolor: "#fafafa" }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
          No pending sales returns
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          You&apos;re all caught up — dealer return requests will appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", mb: 2 }}>
      <Box sx={{ bgcolor: "#fff8e1", px: 2, py: 1.5, borderBottom: "1px solid #ffe082" }}>
        <Typography variant="subtitle2" fontWeight={700} color="#e65100">
          Pending sales returns ({rows.length})
        </Typography>
      </Box>
      <Table size="small">
        <TableBody>
          {rows.map((r) => {
            const qty = (r.lineReturns || []).reduce((s, l) => s + Number(l.returnQuantity || 0), 0);
            return (
              <TableRow key={r._id} sx={{ "&:last-child td": { borderBottom: 0 } }}>
                <TableCell sx={{ py: 2 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Order {r.orderNumber || r.orderId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Dealer: {r.dealer?.name || "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {(r.lineReturns || []).length} line(s) · {qty} qty
                    {r.returnReason ? ` · ${r.returnReason}` : ""}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 2, whiteSpace: "nowrap" }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleOutlineIcon />}
                    disabled={busyId === r._id}
                    onClick={() => handleApprove(r._id)}
                    sx={{ mr: 1, textTransform: "none", fontWeight: 700 }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<CancelOutlinedIcon />}
                    disabled={busyId === r._id}
                    onClick={() => handleReject(r._id)}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
