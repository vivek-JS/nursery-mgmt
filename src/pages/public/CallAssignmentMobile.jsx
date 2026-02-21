import React, { useState } from "react";
import { Box, Card, CardContent, Typography, TextField, Button, Stack, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useIsLoggedIn } from "hooks/state";
import { CookieKeys } from "constants/cookieKeys";

const CallAssignmentMobile = () => {
  const isLoggedIn = useIsLoggedIn();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const goLogin = () => {
    navigate(`/auth/login?redirect=/u/call-assignment`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!phone) {
      setError("Phone is required");
      return;
    }
    if (!scheduledAt) {
      setError("Please choose date and time for follow-up");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem(CookieKeys.Auth);
      const res = await fetch("/api/v1/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone, scheduledAt, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || "Failed to create assignment");
      } else {
        setSuccess("Follow-up scheduled successfully");
        setPhone("");
        setScheduledAt("");
        setNotes("");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ maxWidth: 600, mx: "auto", mt: 6 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Schedule a Follow-up
          </Typography>
          {!isLoggedIn ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please login with your account to schedule and manage follow-ups.
              </Alert>
              <Stack direction="row" spacing={2}>
                <Button variant="contained" onClick={goLogin}>
                  Login
                </Button>
                <Button variant="outlined" onClick={() => navigate("/")}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <TextField
                label="Schedule date & time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <TextField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={3} />
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? "Scheduling..." : "Schedule Follow-up"}
                </Button>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CallAssignmentMobile;

