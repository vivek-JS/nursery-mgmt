import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  CircularProgress,
  Button,
  Stack,
  TableContainer,
  Chip,
} from "@mui/material";
import { Eye, Send, RotateCw, Megaphone } from "lucide-react";
import { API, NetworkManager } from "network/core";

const CampaignListTab = ({ onCreateCampaign, onView, refreshTrigger = 0 }) => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.WHATSAPP_BROADCAST.GET_ALL);
      const response = await instance.request({}, { page: 1, limit: 50 });
      const data = response?.data?.data || response?.data || {};
      setBroadcasts(data.broadcasts || []);
    } catch (err) {
      console.error("Failed to fetch broadcasts:", err);
      setBroadcasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <CircularProgress sx={{ color: "#25D366" }} size={40} />
        <Typography variant="body2" color="text.secondary">Loading campaigns...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: "0 auto" }}>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            p: 2.5,
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            color: "white"
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Megaphone size={28} />
              <Box>
                <Typography variant="h6" fontWeight="bold">Campaigns</Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {broadcasts.length} campaign{broadcasts.length !== 1 ? "s" : ""}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={fetchBroadcasts}
                startIcon={<RotateCw size={16} />}
                sx={{
                  color: "white",
                  borderColor: "rgba(255,255,255,0.5)",
                  "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                onClick={() => onCreateCampaign && onCreateCampaign()}
                startIcon={<Send size={16} />}
                sx={{
                  bgcolor: "white",
                  color: "#25D366",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.9)" }
                }}
              >
                Create Campaign
              </Button>
            </Stack>
          </Stack>
        </Box>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>Template</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }} align="center">Recipients</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }} align="center">Sent</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }} align="center">Delivered</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }} align="center">Read</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }} align="center">Failed</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: "#475569", py: 2 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {broadcasts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No campaigns yet. Create one to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  broadcasts.map((b) => (
                    <TableRow
                      key={b._id}
                      hover
                      sx={{
                        "&:nth-of-type(even)": { bgcolor: "#fafafa" },
                        "&:hover": { bgcolor: "#f0fdf4" }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{b.name}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>{b.templateName || "-"}</TableCell>
                      <TableCell align="center">
                        <Chip label={(b.contacts || []).length} size="small" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="center" sx={{ color: "#3b82f6", fontWeight: 600 }}>{b.counts?.sent ?? "-"}</TableCell>
                      <TableCell align="center" sx={{ color: "#10b981", fontWeight: 600 }}>{b.counts?.delivered ?? "-"}</TableCell>
                      <TableCell align="center" sx={{ color: "#8b5cf6", fontWeight: 600 }}>{b.counts?.read ?? "-"}</TableCell>
                      <TableCell align="center" sx={{ color: "#ef4444", fontWeight: 600 }}>{b.counts?.failed ?? "-"}</TableCell>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                        {b.sentAt ? new Date(b.sentAt).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => onView && onView(b._id)}
                          sx={{
                            bgcolor: "#25D366",
                            color: "white",
                            "&:hover": { bgcolor: "#128C7E" }
                          }}
                          title="View details"
                        >
                          <Eye size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CampaignListTab;

