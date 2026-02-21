import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Tabs, Tab, Typography, Button, Stack, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from "@mui/material";
import { format } from "date-fns";
import { CookieKeys } from "constants/cookieKeys";

const Assignments = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [current, setCurrent] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(CookieKeys.Auth);
      const [curRes, futRes] = await Promise.all([
        fetch("/api/v1/assignments?filter=current", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then((r) => r.json()),
        fetch("/api/v1/assignments?filter=followup", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).then((r) => r.json()),
      ]);
      if (curRes?.status === "success" || curRes?.success) setCurrent(curRes.data?.items ?? curRes.data ?? curRes.items ?? []);
      if (futRes?.status === "success" || futRes?.success) setFollowups(futRes.data?.items ?? futRes.data ?? futRes.items ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleMarkDone = async (id) => {
    try {
      const token = localStorage.getItem(CookieKeys.Auth);
      await fetch(`/api/v1/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: "completed" }),
      });
      fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  const openReschedule = (item) => {
    setEditing(item);
    setRescheduleValue(item.scheduledAt ? format(new Date(item.scheduledAt), "yyyy-MM-dd'T'HH:mm") : "");
  };

  const handleReschedule = async () => {
    if (!editing) return;
    try {
      const token = localStorage.getItem(CookieKeys.Auth);
      await fetch(`/api/v1/assignments/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ scheduledAt: rescheduleValue }),
      });
      setEditing(null);
      fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Assignments
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Card>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label={`Current (${current.length})`} />
          <Tab label={`Follow-ups (${followups.length})`} />
        </Tabs>
        <CardContent>
          {(activeTab === 0 ? current : followups).map((it) => (
            <Box key={it._id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1, borderBottom: "1px solid #eee" }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>{it.farmer?.name || "Farmer"}</Typography>
                <Typography variant="body2" color="text.secondary">{it.phone}</Typography>
                <Typography variant="caption" color="text.secondary">{it.notes}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">Scheduled: {it.scheduledAt ? new Date(it.scheduledAt).toLocaleString() : "—"}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => openReschedule(it)}>Reschedule</Button>
                <Button size="small" variant="contained" color="success" onClick={() => handleMarkDone(it._id)}>Mark Done</Button>
              </Stack>
            </Box>
          ))}
          {loading && <Typography sx={{ mt: 2 }}>Loading...</Typography>}
          {(!loading && activeTab === 0 && current.length === 0) && <Typography color="text.secondary" sx={{ mt: 2 }}>No current assignments</Typography>}
          {(!loading && activeTab === 1 && followups.length === 0) && <Typography color="text.secondary" sx={{ mt: 2 }}>No follow-ups scheduled</Typography>}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onClose={() => setEditing(null)}>
        <DialogTitle>Reschedule</DialogTitle>
        <DialogContent>
          <TextField
            label="New date & time"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={rescheduleValue}
            onChange={(e) => setRescheduleValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleReschedule}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Assignments;

