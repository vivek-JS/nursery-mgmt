import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  LocalFlorist,
  Agriculture,
} from '@mui/icons-material';
import { NetworkManager, API } from 'network/core';
import { Toast } from 'helpers/toasts/toastHelper';

const ExcessiveSowingModal = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const [availablePlants, setAvailablePlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [selectedSubtypeId, setSelectedSubtypeId] = useState('');
  const [packetsRequested, setPacketsRequested] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [checkingCard, setCheckingCard] = useState(false);
  const [cardExists, setCardExists] = useState(null);

  useEffect(() => {
    if (open) {
      fetchAvailablePlants();
    }
  }, [open]);

  useEffect(() => {
    if (selectedPlantId && selectedSubtypeId) {
      checkExistingCard();
    } else {
      setCardExists(null);
    }
  }, [selectedPlantId, selectedSubtypeId]);

  const fetchAvailablePlants = async () => {
    setLoadingPlants(true);
    setError(null);
    try {
      const instance = NetworkManager(API.sowing.GET_EXCESSIVE_AVAILABLE_PLANTS);
      const response = await instance.request();

      if (response?.data?.success) {
        setAvailablePlants(response.data.data || []);
      } else {
        setError('Failed to fetch available plants');
      }
    } catch (err) {
      console.error('Error fetching available plants:', err);
      setError('Error loading available plants');
    } finally {
      setLoadingPlants(false);
    }
  };

  const checkExistingCard = async () => {
    setCheckingCard(true);
    try {
      const instance = NetworkManager(API.sowing.CHECK_EXCESSIVE_CARD);
      const response = await instance.request({}, [selectedPlantId, selectedSubtypeId]);

      if (response?.data?.success) {
        setCardExists(response.data);
      }
    } catch (err) {
      console.error('Error checking card:', err);
      setCardExists(null);
    } finally {
      setCheckingCard(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedPlantId || !selectedSubtypeId || !packetsRequested || parseFloat(packetsRequested) <= 0) {
      Toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const instance = NetworkManager(API.sowing.CREATE_EXCESSIVE_REQUEST);
      const response = await instance.request({
        plantId: selectedPlantId,
        subtypeId: selectedSubtypeId,
        ...(selectedSubtype?.productId ? { productId: selectedSubtype.productId } : {}),
        packetsRequested: parseFloat(packetsRequested),
        notes: notes || 'Excessive sowing (no orders)',
      });

      if (response?.data?.success) {
        const request = response.data.data || {};
        Toast.success(
          `Packet request ${request.requestNumber || ''} created — issue stock, then sow in shed ops`.trim()
        );
        handleClose();
        if (onSuccess) {
          onSuccess(request);
        }
      } else {
        setError(response?.data?.message || 'Failed to create request');
        Toast.error(response?.data?.message || 'Failed to create request');
      }
    } catch (err) {
      console.error('Error creating excessive sowing request:', err);
      const errorMsg = err?.response?.data?.message || 'Failed to create request';
      setError(errorMsg);
      Toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPlantId('');
    setSelectedSubtypeId('');
    setPacketsRequested('');
    setNotes('');
    setError(null);
    setCardExists(null);
    onClose();
  };

  const selectedPlant = availablePlants.find((p) => p.plantId === selectedPlantId);
  const selectedSubtype = selectedPlant?.subtypes?.find((st) => st.subtypeId === selectedSubtypeId);

  const expectedPlants = selectedSubtype && packetsRequested
    ? parseFloat(packetsRequested) * (selectedSubtype.conversionFactor || 1)
    : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: '#1976d2',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
        }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AddIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Request Excess Packets
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          Same flow as order packet request: pending → issue stock → sowing in progress → complete sow.
          Sowing date and ready date are entered when sowing is done in shed ops.
        </Alert>

        {loadingPlants ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : availablePlants.length === 0 ? (
          <Alert severity="info">
            No plants available for excessive sowing. Make sure plants have seed products and available stock.
          </Alert>
        ) : (
          <Box>
            {checkingCard && (
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Checking for existing card...
                </Typography>
              </Box>
            )}

            {cardExists?.exists && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Card already exists for this plant/subtype
                </Typography>
                <Typography variant="caption">
                  You can still create additional requests; they join the same pending / issue queue.
                </Typography>
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Select Plant"
                  value={selectedPlantId}
                  onChange={(e) => {
                    setSelectedPlantId(e.target.value);
                    setSelectedSubtypeId('');
                    setPacketsRequested('');
                  }}
                  required>
                  <MenuItem value="">
                    <em>-- Select Plant --</em>
                  </MenuItem>
                  {availablePlants.map((plant) => (
                    <MenuItem key={plant.plantId} value={plant.plantId}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LocalFlorist fontSize="small" color="primary" />
                        {plant.plantName}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {selectedPlantId && (
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Select Subtype"
                    value={selectedSubtypeId}
                    onChange={(e) => {
                      setSelectedSubtypeId(e.target.value);
                      setPacketsRequested('');
                    }}
                    required>
                    <MenuItem value="">
                      <em>-- Select Subtype --</em>
                    </MenuItem>
                    {selectedPlant?.subtypes?.map((subtype) => (
                      <MenuItem key={subtype.subtypeId} value={subtype.subtypeId}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Agriculture fontSize="small" color="success" />
                            {subtype.subtypeName}
                          </Box>
                          <Chip
                            label={`${subtype.availablePackets} packets available`}
                            size="small"
                            color={subtype.availablePackets > 0 ? 'success' : 'default'}
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              {selectedSubtype && (
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: '#f5f5f5' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Subtype Details
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Product:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedSubtype.productName}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Conversion Factor:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            1 {selectedSubtype.primaryUnit?.symbol || selectedSubtype.secondaryUnit?.symbol || 'pkt'} = {selectedSubtype.conversionFactor} plants
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Available Packets:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                            {selectedSubtype.availablePackets} {selectedSubtype.primaryUnit?.symbol || selectedSubtype.secondaryUnit?.symbol || 'pkt'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Plant Ready Days:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {selectedSubtype.plantReadyDays} days (at sow complete)
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {selectedSubtypeId && (
                <Grid item xs={12} md={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Packets to Request"
                    value={packetsRequested}
                    onChange={(e) => setPacketsRequested(e.target.value)}
                    inputProps={{
                      min: 0.01,
                      step: 0.01,
                      max: selectedSubtype?.availablePackets || 999999,
                    }}
                    helperText={`Company seed only · max ${selectedSubtype?.availablePackets || 0} in stock`}
                    required
                  />
                </Grid>
              )}

              {expectedPlants > 0 && (
                <Grid item xs={12} md={6}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#e8f5e9',
                      borderRadius: 1,
                      border: '1px solid #4caf50',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                    <Typography variant="caption" color="text.secondary">
                      Expected Plants:
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                      {Math.round(expectedPlants)} plants
                    </Typography>
                  </Box>
                </Grid>
              )}

              {selectedSubtypeId && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Notes (Optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this excess packet request"
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateRequest}
          disabled={loading || !selectedPlantId || !selectedSubtypeId || !packetsRequested || parseFloat(packetsRequested) <= 0}
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
          {loading ? 'Creating...' : 'Request Packets'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExcessiveSowingModal;
