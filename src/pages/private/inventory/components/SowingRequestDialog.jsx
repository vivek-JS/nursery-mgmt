import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { NetworkManager, API } from 'network/core';

const SowingRequestDialog = ({ open, onClose, request, onSuccess }) => {
  const [batches, setBatches] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ open: false, message: "", title: "" });

  const getPacketsNeeded = () => {
    return request?.packetsNeeded || 0;
  };

  const getPacketsRequested = () => {
    return request?.packetsRequested || request?.packetsNeeded || 0;
  };

  // Calculate total available stock in packets
  const calculateTotalAvailable = () => {
    if (!request || batches.length === 0) return 0;
    let total = 0;
    batches.forEach((batch) => {
      const batchUnitId = batch.unit?._id?.toString();
      const primaryUnitId = request?.primaryUnit?._id?.toString();
      const secondaryUnitId = request?.secondaryUnit?._id?.toString();
      const available = batch.remainingQuantity || 0;

      if (batchUnitId === primaryUnitId) {
        total += available;
      } else if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
        total += available / request.conversionFactor;
      } else {
        total += available;
      }
    });
    return total;
  };

  // Auto-fill allocations to match requested quantity
  const autoFillAllocations = () => {
    if (!request || batches.length === 0) return;

    const packetsRequested = getPacketsRequested();
    const totalAvailable = calculateTotalAvailable();

    // Check if stock is sufficient
    if (totalAvailable < packetsRequested) {
      setAlertDialog({
        open: true,
        title: "Insufficient Stock",
        message: `Insufficient stock available!\n\nRequested: ${packetsRequested.toFixed(2)} ${request.unitName}\nAvailable: ${totalAvailable.toFixed(2)} ${request.unitName}\nShortage: ${(packetsRequested - totalAvailable).toFixed(2)} ${request.unitName}`,
      });
      return;
    }

    // Distribute requested quantity across batches
    const newAllocations = {};
    let remainingToAllocate = packetsRequested;
    const primaryUnitId = request?.primaryUnit?._id?.toString();
    const secondaryUnitId = request?.secondaryUnit?._id?.toString();

    // Sort batches by available quantity (descending) for better distribution
    const sortedBatches = [...batches].sort((a, b) => {
      const aAvailable = a.remainingQuantity || 0;
      const bAvailable = b.remainingQuantity || 0;
      return bAvailable - aAvailable;
    });

    for (let i = 0; i < sortedBatches.length && remainingToAllocate > 0.01; i++) {
      const batch = sortedBatches[i];
      const batchUnitId = batch.unit?._id?.toString();
      const batchAvailable = batch.remainingQuantity || 0;

      if (batchAvailable <= 0) continue;

      let batchAllocationInPackets = 0;
      let batchAllocationInBatchUnit = 0;

      if (batchUnitId === primaryUnitId) {
        // Batch is in primary unit (packets)
        batchAllocationInPackets = Math.min(remainingToAllocate, batchAvailable);
        batchAllocationInBatchUnit = batchAllocationInPackets;
      } else if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
        // Batch is in secondary unit (seeds), convert to packets
        const batchAvailableInPackets = batchAvailable / request.conversionFactor;
        batchAllocationInPackets = Math.min(remainingToAllocate, batchAvailableInPackets);
        batchAllocationInBatchUnit = batchAllocationInPackets * request.conversionFactor;
      } else {
        // Unknown unit, assume it's already in packets
        batchAllocationInPackets = Math.min(remainingToAllocate, batchAvailable);
        batchAllocationInBatchUnit = batchAllocationInPackets;
      }

      if (batchAllocationInPackets > 0.01) {
        newAllocations[batch._id] = parseFloat(batchAllocationInBatchUnit.toFixed(2));
        remainingToAllocate -= batchAllocationInPackets;
      }
    }

    // If there's still remaining, show warning
    if (remainingToAllocate > 0.01) {
      setAlertDialog({
        open: true,
        title: "Partial Allocation",
        message: `Could not fully allocate requested quantity.\n\nRequested: ${packetsRequested.toFixed(2)} ${request.unitName}\nAllocated: ${(packetsRequested - remainingToAllocate).toFixed(2)} ${request.unitName}\nRemaining: ${remainingToAllocate.toFixed(2)} ${request.unitName}\n\nPlease manually adjust allocations.`,
      });
    }

    setAllocations(newAllocations);
  };

  useEffect(() => {
    if (open && request) {
      setBatches(request.batches || []);
      setAllocations({});
      setError(null);
    }
  }, [open, request]);

  // Auto-fill when batches are loaded
  useEffect(() => {
    if (open && request && batches.length > 0) {
      // Auto-fill allocations after a short delay to ensure state is set
      const timer = setTimeout(() => {
        autoFillAllocations();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [batches, open, request, autoFillAllocations]);

  const handleAllocationChange = (batchId, value) => {
    const numValue = parseFloat(value) || 0;
    setAllocations((prev) => ({
      ...prev,
      [batchId]: numValue,
    }));
  };

  const calculateTotalAllocated = () => {
    let total = 0;
    batches.forEach((batch) => {
      const allocated = allocations[batch._id] || 0;
      const batchUnitId = batch.unit?._id?.toString();
      const primaryUnitId = request?.primaryUnit?._id?.toString();
      const secondaryUnitId = request?.secondaryUnit?._id?.toString();

      if (batchUnitId === primaryUnitId) {
        total += allocated;
      } else if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
        total += allocated / request.conversionFactor;
      } else {
        total += allocated;
      }
    });
    return total;
  };

  const getExcessPackets = () => {
    const needed = getPacketsNeeded();
    const requested = getPacketsRequested();
    return Math.max(0, requested - needed);
  };

  const handleSubmit = async () => {
    if (!request) return;

    const totalAllocated = calculateTotalAllocated();
    const packetsNeeded = request.packetsNeeded;

    // Validate exact quantity (must match packetsRequested, not packetsNeeded)
    const packetsRequested = getPacketsRequested();
    if (Math.abs(totalAllocated - packetsRequested) > 0.01) {
      setError(
        `Total allocated (${totalAllocated.toFixed(2)}) must exactly match requested quantity (${packetsRequested.toFixed(2)}). Not more, not less.`
      );
      return;
    }

    // Validate all allocations are positive
    const batchAllocations = Object.entries(allocations)
      .filter(([_, qty]) => qty > 0)
      .map(([batchId, quantity]) => ({
        batchId,
        quantity: parseFloat(quantity),
      }));

    if (batchAllocations.length === 0) {
      setError('Please allocate at least one batch');
      return;
    }

    // Validate batch quantities
    for (const allocation of batchAllocations) {
      const batch = batches.find((b) => b._id.toString() === allocation.batchId);
      if (!batch) {
        setError(`Batch not found`);
        return;
      }
      if (batch.remainingQuantity < allocation.quantity) {
        setError(
          `Insufficient quantity in batch ${batch.batchNumber}. Available: ${batch.remainingQuantity}, Allocated: ${allocation.quantity}`
        );
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const instance = NetworkManager(API.sowing.ISSUE_STOCK_FROM_REQUEST);
      const response = await instance.request(
        {
          batchAllocations,
          notes: `Issued from sowing request ${request.requestNumber}`,
        },
        [request._id]
      );

      if (response?.data?.success) {
        setAlertDialog({
          open: true,
          title: "Success",
          message: 'Stock issued successfully!',
        });
        onSuccess?.();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(response?.data?.message || 'Failed to issue stock');
      }
    } catch (error) {
      console.error('Error issuing stock:', error);
      setError(error?.response?.data?.message || 'Failed to issue stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  const totalAllocated = calculateTotalAllocated();
  const packetsRequested = getPacketsRequested();
  const packetsNeeded = getPacketsNeeded();
  const excessPackets = getExcessPackets();
  const difference = packetsRequested - totalAllocated;
  
  // Check if at least one batch has allocation
  const hasAllocations = Object.values(allocations).some(qty => qty > 0);
  
  // Button is enabled when:
  // 1. Total allocated exactly matches packets requested (within 0.01 tolerance)
  // 2. At least one batch has allocation
  // 3. Batches are available
  const isValid = Math.abs(difference) < 0.01 && hasAllocations && batches.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Sowing Request: {request.requestNumber}
          </Typography>
          <Chip label={request.status} color={request.status === 'pending' ? 'warning' : 'success'} size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Plant & Subtype
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {request.plantName} - {request.subtypeName}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Packets Needed
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#f57c00' }}>
            {getPacketsNeeded().toFixed(2)} {request.unitName}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Packets Requested
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
            {getPacketsRequested().toFixed(2)} {request.unitName}
          </Typography>
        </Box>

        {getExcessPackets() > 0 && (
          <Box mb={3} p={1.5} sx={{ bgcolor: '#fff3e0', borderRadius: 1, border: '1px solid #f57c00' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Excess Packets
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#f57c00' }}>
              {getExcessPackets().toFixed(2)} {request.unitName}
            </Typography>
          </Box>
        )}

        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Available Stock
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, color: request.availablePackets > 0 ? '#2e7d32' : '#d32f2f' }}>
            {request.availablePackets || 0} {request.unitName}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={autoFillAllocations}
            disabled={batches.length === 0}
          >
            Auto-Fill to Requested
          </Button>
          <Typography variant="caption" color="text.secondary">
            Total Available: {calculateTotalAvailable().toFixed(2)} {request.unitName}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
          Allocate Batches (Must equal {getPacketsRequested().toFixed(2)} {request.unitName})
        </Typography>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Batch Number</TableCell>
                <TableCell align="right">Available</TableCell>
                <TableCell align="right">Unit</TableCell>
                <TableCell align="right">Allocate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((batch) => {
                const allocated = allocations[batch._id] || 0;
                const batchUnitId = batch.unit?._id?.toString();
                const primaryUnitId = request?.primaryUnit?._id?.toString();
                const secondaryUnitId = request?.secondaryUnit?._id?.toString();

                let allocatedInPackets = allocated;
                if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
                  allocatedInPackets = allocated / request.conversionFactor;
                }

                return (
                  <TableRow key={batch._id}>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell align="right">{batch.remainingQuantity}</TableCell>
                    <TableCell align="right">{batch.unit?.symbol || batch.unit?.name || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={allocated || ''}
                        onChange={(e) => handleAllocationChange(batch._id, e.target.value)}
                        inputProps={{ min: 0, max: batch.remainingQuantity, step: 0.01 }}
                        sx={{ width: 100 }}
                        error={allocated > batch.remainingQuantity}
                        helperText={allocated > batch.remainingQuantity ? 'Exceeds available' : ''}
                      />
                      {allocated > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          = {allocatedInPackets.toFixed(2)} {request.unitName}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} p={2} sx={{ bgcolor: isValid ? '#e8f5e9' : '#fff3e0', borderRadius: 1, border: `2px solid ${isValid ? '#2e7d32' : '#f57c00'}` }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Total Allocated:
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: isValid ? '#2e7d32' : '#f57c00' }}>
              {totalAllocated.toFixed(2)} {request.unitName}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Required:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {packetsRequested.toFixed(2)} {request.unitName}
            </Typography>
          </Box>
          {excessPackets > 0 && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Needed: {packetsNeeded.toFixed(2)} | Excess: {excessPackets.toFixed(2)}
              </Typography>
            </Box>
          )}
          {!isValid && hasAllocations && (
            <Typography variant="caption" color="error" display="block" mt={1}>
              Difference: {difference > 0 ? '+' : ''}{difference.toFixed(2)} {request.unitName}
              {Math.abs(difference) >= 0.01 && (
                <span> - Allocate exactly {packetsRequested.toFixed(2)} {request.unitName}</span>
              )}
            </Typography>
          )}
          {!hasAllocations && (
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Please allocate batches to enable Issue Stock button
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid || submitting}
          startIcon={submitting ? <CircularProgress size={16} /> : null}
          color={isValid ? 'success' : 'primary'}
        >
          {submitting ? 'Issuing...' : 'Issue Stock'}
        </Button>
      </DialogActions>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onClose={() => setAlertDialog({ open: false, message: "", title: "" })}>
        <DialogTitle>{alertDialog.title || "Alert"}</DialogTitle>
        <DialogContent>
          <Typography style={{ whiteSpace: 'pre-line' }}>{alertDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog({ open: false, message: "", title: "" })}>OK</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default SowingRequestDialog;

