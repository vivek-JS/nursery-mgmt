import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Send,
  X,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Sprout,
  Users,
} from "lucide-react";
import { NetworkManager } from "network/core";
import { API } from "network/config/endpoints";
import { Autocomplete, TextField as MuiTextField } from "@mui/material";

const SowingReminderModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Plant selection
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  
  // Preview data
  const [previewData, setPreviewData] = useState(null);
  
  // Note: Sowing reminders are STRICTLY sent to 2 phone numbers only:
  // 7588686453 and 7588686452 (hardcoded in backend)
  
  // Send results
  const [sendResults, setSendResults] = useState(null);

  // Load plants
  useEffect(() => {
    if (open) {
      loadPlants();
    }
  }, [open]);

  const loadPlants = async () => {
    try {
      const response = await NetworkManager(API.plantCms.GET_PLANTS).request();
      if (response?.data?.success && response?.data?.data) {
        const sowingAllowedPlants = response.data.data.filter(
          (plant) => plant.sowingAllowed === true
        );
        setPlants(sowingAllowedPlants);
      }
    } catch (err) {
      console.error("Error loading plants:", err);
      setError("Failed to load plants");
    }
  };

  const handlePreview = async () => {
    if (!selectedPlant) {
      setError("Please select a plant first");
      return;
    }

    setPreviewLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      const response = await NetworkManager(API.sowing.SEND_SOWING_REMINDERS_WHATSAPP).request({
        plantId: selectedPlant._id,
        sendNow: false,
      });

      if (response?.data?.success) {
        setPreviewData(response.data);
        setError(null); // Clear any previous errors
      } else {
        const errorMsg = response?.data?.message || response?.data?.error || "Failed to generate preview";
        console.error("Preview error:", response?.data);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Error generating preview:", err);
      const errorMsg = err?.response?.data?.message || 
                      err?.response?.data?.error || 
                      err?.message || 
                      "Failed to generate preview. Please check console for details.";
      setError(errorMsg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedPlant) {
      setError("Please select a plant first");
      return;
    }

    const messageCount = previewData?.messageCount || 2; // Default to 2 (hardcoded phone numbers)
    
    const confirmed = window.confirm(
      `Are you sure you want to send ${messageCount} WhatsApp messages to the configured phone numbers?`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    setSendResults(null);

    try {
      const response = await NetworkManager(API.sowing.SEND_SOWING_REMINDERS_WHATSAPP).request({
        plantId: selectedPlant._id,
        sendNow: true,
      });

      if (response?.data?.success) {
        setSuccess(true);
        setSendResults(response.data);
        setPreviewData(response.data);
      } else {
        const errorMsg = response?.data?.message || response?.data?.error || "Failed to send messages";
        console.error("Send error:", response?.data);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("Error sending messages:", err);
      const errorMsg = err?.response?.data?.message || 
                      err?.response?.data?.error || 
                      err?.message || 
                      "Failed to send messages. Please check console for details.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPlant(null);
    setPreviewData(null);
    setSendResults(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const formatMessage = (farmerName, totalPending, totalOverdue, subtypeBreakdown) => {
    return `Hello ${farmerName || "Farmer"},

Total pending plants: ${totalPending?.toLocaleString() || 0}

Previous overdue total: ${totalOverdue?.toLocaleString() || 0}

Subtype-wise overdue:

${subtypeBreakdown || "No overdue subtypes"}

Please prioritise sowing accordingly`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <MessageSquare size={20} />
            <Typography variant="h6">Send Sowing Reminders</Typography>
          </Box>
          <Button onClick={handleClose} size="small">
            <X size={20} />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Plant Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Select Plant <span style={{ color: "red" }}>*</span>
            </Typography>
            <Autocomplete
              options={plants}
              getOptionLabel={(option) => option.name || ""}
              value={selectedPlant}
              onChange={(event, newValue) => {
                setSelectedPlant(newValue);
                setPreviewData(null);
                setSendResults(null);
              }}
              renderInput={(params) => (
                <MuiTextField {...params} placeholder="Select plant" />
              )}
              fullWidth
            />
          </Box>

          {/* Info Alert */}
          {selectedPlant && (
            <Alert severity="info" icon={<Users size={16} />}>
              <Typography variant="body2">
                <strong>Note:</strong> Sowing reminders will be sent to 2 specific phone numbers only:
                <br />
                • 7588686453
                <br />
                • 7588686452
              </Typography>
            </Alert>
          )}

          {/* Preview Button */}
          {selectedPlant && (
            <Button
              variant="outlined"
              onClick={handlePreview}
              disabled={previewLoading}
              startIcon={previewLoading ? <CircularProgress size={16} /> : <Sprout size={16} />}
              fullWidth
            >
              {previewLoading ? "Generating Preview..." : "Preview Messages"}
            </Button>
          )}

          {/* Preview Data */}
          {previewData && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Preview
                </Typography>
                <Divider sx={{ my: 1 }} />

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Pending:
                    </Typography>
                    <Typography variant="h6">
                      {previewData.summary?.totalPending?.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Overdue:
                    </Typography>
                    <Typography variant="h6" color="error">
                      {previewData.summary?.totalOverdue?.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Messages to Send:
                    </Typography>
                    <Typography variant="h6">
                      {previewData.messageCount || 0}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Subtype Breakdown */}
                {previewData.subtypeBreakdown && previewData.subtypeBreakdown.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Subtype-wise Breakdown:
                    </Typography>
                    <Stack spacing={0.5}>
                      {previewData.subtypeBreakdown.map((subtype, idx) => (
                        <Box
                          key={idx}
                          display="flex"
                          justifyContent="space-between"
                          sx={{ p: 1, bgcolor: "grey.50", borderRadius: 1 }}
                        >
                          <Typography variant="body2">{subtype.subtypeName}</Typography>
                          <Chip
                            label={`Overdue: ${subtype.overdue?.toLocaleString() || 0}`}
                            size="small"
                            color="error"
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Message Preview */}
                {previewData.messages && previewData.messages.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Sample Message:
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: "grey.50",
                        borderRadius: 1,
                        maxHeight: 200,
                        overflow: "auto",
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                        {formatMessage(
                          previewData.messages[0]?.farmerName,
                          previewData.summary?.totalPending,
                          previewData.summary?.totalOverdue,
                          previewData.subtypeBreakdown
                            ?.filter((s) => s.overdue > 0)
                            .map((s) => `${s.subtypeName}: ${s.overdue.toLocaleString()} plants`)
                            .join("\n")
                        )}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Send Results */}
          {sendResults && sendResults.sent && (
            <Box>
              <Alert
                severity={sendResults.successCount > 0 ? "success" : "error"}
                icon={sendResults.successCount > 0 ? <CheckCircle /> : <AlertCircle />}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Sent: {sendResults.successCount} / {sendResults.messageCount}
                </Typography>
                {sendResults.failureCount > 0 && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Failed: {sendResults.failureCount}
                  </Typography>
                )}
              </Alert>
              
              {/* Show error details if all failed */}
              {sendResults.failureCount > 0 && sendResults.sendResults && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Error Details:
                  </Typography>
                  {sendResults.sendResults.map((result, idx) => 
                    !result.success && result.error ? (
                      <Typography key={idx} variant="caption" component="div" sx={{ mt: 0.5 }}>
                        <strong>{result.phoneNumber}:</strong> {typeof result.error === 'string' ? result.error : result.error?.items?.[0]?.description || JSON.stringify(result.error)}
                      </Typography>
                    ) : null
                  )}
                  <Typography variant="body2" sx={{ mt: 2, fontWeight: "bold" }}>
                    ⚠️ Action Required:
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                    Please verify the WATI template <strong>&quot;sowing_alert&quot;</strong> exists and is approved in your WATI dashboard:
                  </Typography>
                  <Box sx={{ mt: 1, p: 1, bgcolor: "grey.100", borderRadius: 1, fontFamily: "monospace", fontSize: "0.75rem" }}>
                    Hello {`{{1}}`},<br />
                    <br />
                    Total pending plants: {`{{2}}`}<br />
                    <br />
                    Previous overdue total: {`{{3}}`}<br />
                    <br />
                    Subtype-wise overdue:<br />
                    <br />
                    {`{{4}}`}<br />
                    <br />
                    Please prioritise sowing accordingly
                  </Box>
                </Alert>
              )}
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" icon={<AlertCircle />}>
              {error}
            </Alert>
          )}

          {/* Success Display */}
          {success && (
            <Alert severity="success" icon={<CheckCircle />}>
              Messages sent successfully!
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          color="primary"
          disabled={!selectedPlant || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Send size={16} />}
        >
          {loading ? "Sending..." : "Send Messages"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SowingReminderModal;

