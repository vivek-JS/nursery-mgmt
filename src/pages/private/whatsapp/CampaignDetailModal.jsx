import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
  Chip,
  Stack,
  TableContainer,
  Paper
} from "@mui/material";
import { RotateCw, MessageSquare, Send, CheckCircle2, Eye, XCircle } from "lucide-react";
import { API, NetworkManager } from "network/core";

const STATUS_COLORS = {
  sent: { bg: "#dbeafe", color: "#1d4ed8", icon: Send },
  delivered: { bg: "#d1fae5", color: "#059669", icon: CheckCircle2 },
  read: { bg: "#e0e7ff", color: "#4f46e5", icon: Eye },
  failed: { bg: "#fee2e2", color: "#dc2626", icon: XCircle },
  pending: { bg: "#f3f4f6", color: "#6b7280" }
};

const StatusChip = ({ status }) => {
  const s = (status || "pending").toLowerCase();
  const config = STATUS_COLORS[s] || STATUS_COLORS.pending;
  const Icon = config.icon;
  return (
    <Chip
      size="small"
      label={s}
      icon={Icon ? <Icon size={12} style={{ color: config.color }} /> : undefined}
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 600,
        textTransform: "capitalize",
        "& .MuiChip-icon": { ml: 0.5 }
      }}
    />
  );
};

const CampaignDetailModal = ({ open, onClose, broadcastId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!broadcastId) return;
    if (!silent) setLoading(true);
    try {
      const instance = NetworkManager(API.WHATSAPP_BROADCAST.GET_BY_ID);
      const resp = await instance.request({}, [broadcastId]);
      setData(resp?.data?.data || resp?.data || resp);
    } catch (e) {
      console.error("Failed to fetch broadcast detail", e);
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [broadcastId]);

  useEffect(() => {
    if (!open || !broadcastId) return;
    fetchData();
  }, [open, broadcastId, fetchData]);

  useEffect(() => {
    if (!open || !broadcastId) return;
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [open, broadcastId, fetchData]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
          px: 3,
          background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
          color: "white"
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <MessageSquare size={28} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Campaign Detail
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {data?.name || "Loading..."}
            </Typography>
          </Box>
        </Stack>
        <IconButton size="small" onClick={fetchData} disabled={loading} sx={{ color: "white" }} title="Refresh">
          <RotateCw size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, bgcolor: "#f8fafc" }}>
        {loading ? (
          <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <CircularProgress sx={{ color: "#25D366" }} />
            <Typography variant="body2" color="text.secondary">Loading campaign...</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 3, pb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {data?.templateName || "Template"}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {[
                  { label: "Recipients", value: data?.contacts?.length ?? 0, color: "#6366f1" },
                  { label: "Sent", value: data?.counts?.sent ?? 0, color: "#3b82f6" },
                  { label: "Delivered", value: data?.counts?.delivered ?? 0, color: "#10b981" },
                  { label: "Read", value: data?.counts?.read ?? 0, color: "#8b5cf6" },
                  { label: "Failed", value: data?.counts?.failed ?? 0, color: "#ef4444" }
                ].map(({ label, value, color }) => (
                  <Box
                    key={label}
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      borderRadius: 2,
                      bgcolor: "white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      borderLeft: 3,
                      borderColor: color
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold" sx={{ color }}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ mx: 3, mb: 3, borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#475569" }}>Last seen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.contacts || []).map((c, i) => (
                    <TableRow key={c.phone || i} sx={{ "&:nth-of-type(even)": { bgcolor: "#fafafa" } }}>
                      <TableCell sx={{ fontFamily: "monospace" }}>{c.phone}</TableCell>
                      <TableCell>{c.name || "-"}</TableCell>
                      <TableCell><StatusChip status={c.statusRecord?.status || c.status} /></TableCell>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
                        {(c.statusRecord?.readAt || c.statusRecord?.deliveredAt)
                          ? new Date(c.statusRecord.readAt || c.statusRecord.deliveredAt).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f1f5f9", gap: 1 }}>
        <Button onClick={fetchData} disabled={loading} variant="outlined" sx={{ borderRadius: 2 }}>
          Refresh
        </Button>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2, bgcolor: "#25D366", "&:hover": { bgcolor: "#128C7E" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignDetailModal;

