import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { formatDisplayDate } from '../../../../utils/dateUtils';
import SowingIssueInventorySourcePanel from './SowingIssueInventorySourcePanel';
import { sortBatchesByExpiry } from '../utils/fillBatchesByExpiry';

const SowingRequestDialog = ({ open, onClose, request, onSuccess }) => {
  const [batches, setBatches] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [expiryDates, setExpiryDates] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ open: false, message: '', title: '' });
  const autoFilledRef = useRef(false);
  const initializedRequestIdRef = useRef(null);
  const [inventorySource, setInventorySource] = useState('BIOTECH');
  const [packetsFromBiotech, setPacketsFromBiotech] = useState('');
  const [packetsFromRamAgri, setPacketsFromRamAgri] = useState('');
  const [agriAllocations, setAgriAllocations] = useState({});

  const avail = request?.inventoryAvailability;
  const biotechAvail = Number(avail?.totals?.biotechAvailable ?? request?.availablePackets) || 0;
  const agriAvail = Number(avail?.totals?.ramAgriAvailable) || 0;

  const getPacketsNeeded = () => request?.packetsNeeded || 0;

  const getPacketsRequestedTotal = () =>
    request?.packetsRequested || request?.packetsNeeded || 0;

  const getCompanyIssuePackets = () => {
    if (
      request?.packetsFromCompany != null &&
      Number.isFinite(Number(request.packetsFromCompany))
    ) {
      return Math.max(0, Number(request.packetsFromCompany));
    }
    if (request?.seedSource === 'RAISING') return 0;
    return getPacketsRequestedTotal();
  };

  const getRaisingPackets = () => Math.max(0, Number(request?.packetsFromRaising) || 0);

  const companyQty = getCompanyIssuePackets();

  const splitQtys = useMemo(() => {
    const company = companyQty;
    if (inventorySource === 'BIOTECH') {
      return { bio: company, agri: 0 };
    }
    return { bio: 0, agri: company };
  }, [inventorySource, companyQty]);

  const needBiotech = splitQtys.bio > 0.01;
  const needAgri = splitQtys.agri > 0.01;

  const calculateTotalAvailable = () => {
    if (!request || batches.length === 0) return 0;
    let total = 0;
    const primaryUnitId = request?.primaryUnit?._id?.toString();
    const secondaryUnitId = request?.secondaryUnit?._id?.toString();
    batches.forEach((batch) => {
      const batchUnitId = batch.unit?._id?.toString();
      const available = batch.remainingQuantity || 0;
      if (batchUnitId === primaryUnitId) total += available;
      else if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
        total += available / request.conversionFactor;
      } else total += available;
    });
    return total;
  };

  const autoFillAllocations = useCallback(() => {
    if (!request || batches.length === 0) return;

    const targetBio =
      inventorySource === 'BIOTECH' ? getCompanyIssuePackets() : 0;

    if (targetBio < 0.01) {
      setAllocations({});
      return;
    }

    const totalAvailable = calculateTotalAvailable();
    if (totalAvailable < targetBio) {
      setAlertDialog({
        open: true,
        title: 'Insufficient Biotech Stock',
        message: `Not enough Biotech warehouse stock.\n\nNeeded from Biotech: ${targetBio.toFixed(2)}\nAvailable: ${totalAvailable.toFixed(2)}\nShortage: ${(targetBio - totalAvailable).toFixed(2)}`,
      });
      return;
    }

    const newAllocations = {};
    const newExpiryDates = {};
    let remainingToAllocate = targetBio;
    const primaryUnitId = request?.primaryUnit?._id?.toString();
    const secondaryUnitId = request?.secondaryUnit?._id?.toString();

    const sortedBatches = sortBatchesByExpiry(batches, 'fifo');

    for (let i = 0; i < sortedBatches.length && remainingToAllocate > 0.01; i++) {
      const batch = sortedBatches[i];
      const batchUnitId = batch.unit?._id?.toString();
      const batchAvailable = batch.remainingQuantity || 0;
      if (batchAvailable <= 0) continue;

      let batchAllocationInPackets = 0;
      let batchAllocationInBatchUnit = 0;

      if (batchUnitId === primaryUnitId) {
        batchAllocationInPackets = Math.min(remainingToAllocate, batchAvailable);
        batchAllocationInBatchUnit = batchAllocationInPackets;
      } else if (batchUnitId === secondaryUnitId && request.conversionFactor) {
        const batchAvailableInPackets = batchAvailable / request.conversionFactor;
        batchAllocationInPackets = Math.min(remainingToAllocate, batchAvailableInPackets);
        batchAllocationInBatchUnit = batchAllocationInPackets * request.conversionFactor;
      } else {
        batchAllocationInPackets = Math.min(remainingToAllocate, batchAvailable);
        batchAllocationInBatchUnit = batchAllocationInPackets;
      }

      if (batchAllocationInPackets > 0.01) {
        newAllocations[batch._id] = parseFloat(batchAllocationInBatchUnit.toFixed(2));
        if (batch.expiryDate) newExpiryDates[batch._id] = batch.expiryDate;
        remainingToAllocate -= batchAllocationInPackets;
      }
    }

    if (remainingToAllocate > 0.01) {
      setAlertDialog({
        open: true,
        title: 'Partial Allocation',
        message: `Could not fully allocate Biotech qty. Remaining: ${remainingToAllocate.toFixed(2)}`,
      });
    }

    setAllocations(newAllocations);
    if (Object.keys(newExpiryDates).length > 0) {
      setExpiryDates((prev) => ({ ...prev, ...newExpiryDates }));
    }
  }, [request, batches, inventorySource]);

  useEffect(() => {
    if (open && request) {
      const reqId = request?._id ? String(request._id) : null;
      if (reqId && initializedRequestIdRef.current === reqId) {
        // Prevent re-initialization while the same request is still open.
        // This avoids resetting the user's selected inventorySource to BIOTECH.
        return;
      }
      initializedRequestIdRef.current = reqId;
      setBatches(request.batches || []);
      setAllocations({});
      setAgriAllocations({});
      setExpiryDates({});
      setError(null);
      autoFilledRef.current = false;
      const preferredSource =
        request?.inventoryAvailability?.preferredSource === 'RAM_AGRI'
          ? 'RAM_AGRI'
          : 'BIOTECH';
      setInventorySource(preferredSource);
      const company = (() => {
        if (
          request?.packetsFromCompany != null &&
          Number.isFinite(Number(request.packetsFromCompany))
        ) {
          return Math.max(0, Number(request.packetsFromCompany));
        }
        if (request?.seedSource === 'RAISING') return 0;
        return request?.packetsRequested || request?.packetsNeeded || 0;
      })();
      setPacketsFromBiotech(preferredSource === 'BIOTECH' ? String(company) : '0');
      setPacketsFromRamAgri(preferredSource === 'RAM_AGRI' ? String(company) : '0');
    }
  }, [open, request]);

  useEffect(() => {
    if (!open) initializedRequestIdRef.current = null;
  }, [open]);

  useEffect(() => {
    if (open && request && batches.length > 0 && !autoFilledRef.current && needBiotech) {
      const timer = setTimeout(() => {
        autoFillAllocations();
        autoFilledRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [batches, open, request, autoFillAllocations, needBiotech]);

  const autoFillAgriAllocations = useCallback(() => {
    const agriBatches = avail?.ramAgriBatches || [];
    const targetAgri = inventorySource === 'RAM_AGRI' ? getCompanyIssuePackets() : 0;
    if (targetAgri < 0.01 || agriBatches.length === 0) {
      setAgriAllocations({});
      return;
    }
    const filled = {};
    let remaining = targetAgri;
    for (const batch of sortBatchesByExpiry(agriBatches, 'fifo')) {
      if (remaining <= 0.01) break;
      const available = Number(batch.remainingQuantity) || 0;
      if (available <= 0) continue;
      const take = Math.min(remaining, available);
      if (take > 0.01) {
        filled[String(batch._id)] = parseFloat(take.toFixed(2));
        remaining -= take;
      }
    }
    setAgriAllocations(filled);
  }, [avail, inventorySource, request]);

  useEffect(() => {
    // Re-autofill when inventory pool changes
    if (!open || !request) return;
    autoFilledRef.current = false;
    if (inventorySource === 'RAM_AGRI') {
      setAllocations({});
      autoFillAgriAllocations();
      return;
    }
    setAgriAllocations({});
    if (batches.length > 0 && needBiotech) {
      const t = setTimeout(() => {
        autoFillAllocations();
        autoFilledRef.current = true;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [inventorySource]);

  const handleAgriAllocationChange = (batchId, value) => {
    const numValue = parseFloat(value) || 0;
    setAgriAllocations((prev) => ({ ...prev, [batchId]: numValue }));
  };

  const calculateAgriAllocated = () =>
    Object.values(agriAllocations).reduce((sum, qty) => sum + (Number(qty) || 0), 0);

  const handleAllocationChange = (batchId, value) => {
    const numValue = parseFloat(value) || 0;
    setAllocations((prev) => ({ ...prev, [batchId]: numValue }));
    if (numValue > 0) {
      const batch = batches.find((b) => b._id === batchId);
      if (batch?.expiryDate && !expiryDates[batchId]) {
        setExpiryDates((prev) => ({ ...prev, [batchId]: batch.expiryDate }));
      }
    }
  };

  const handleExpiryDateChange = (batchId, value) => {
    setExpiryDates((prev) => ({
      ...prev,
      [batchId]: value ? new Date(value) : null,
    }));
  };

  const calculateTotalAllocated = () => {
    let total = 0;
    const primaryUnitId = request?.primaryUnit?._id?.toString();
    const secondaryUnitId = request?.secondaryUnit?._id?.toString();
    batches.forEach((batch) => {
      const allocated = allocations[batch._id] || 0;
      const batchUnitId = batch.unit?._id?.toString();
      if (batchUnitId === primaryUnitId) total += allocated;
      else if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
        total += allocated / request.conversionFactor;
      } else total += allocated;
    });
    return total;
  };

  const getExcessPackets = () => {
    const needed = getPacketsNeeded();
    const requested = companyQty;
    return Math.max(0, requested - needed);
  };

  const handleSubmit = async () => {
    if (!request) return;

    const totalAllocated = calculateTotalAllocated();
    const packetsRequested = companyQty;

    if (packetsRequested < 0.01) {
      setSubmitting(true);
      setError(null);
      try {
        const instance = NetworkManager(API.sowing.ISSUE_STOCK_FROM_REQUEST);
        const response = await instance.request(
          {
            batchAllocations: [],
            notes: `Raising-only issue for ${request.requestNumber}`,
            purpose: 'production',
          },
          [request._id]
        );
        if (response?.data?.success) {
          setAlertDialog({
            open: true,
            title: 'Success',
            message: 'Raising-only request marked issued (no warehouse stock).',
          });
          onSuccess?.();
          setTimeout(() => onClose(), 1000);
        } else {
          setError(response?.data?.message || 'Failed to issue stock');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to issue stock');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (needBiotech && Math.abs(totalAllocated - splitQtys.bio) > 0.01) {
      setError(
        `Biotech allocated (${totalAllocated.toFixed(2)}) must match Biotech packets (${splitQtys.bio.toFixed(2)}).`
      );
      return;
    }

    const agriAllocated = calculateAgriAllocated();
    if (needAgri && agriAvail + 0.01 < splitQtys.agri) {
      setError(
        `Insufficient Ram Agri Input stock. Need ${splitQtys.agri.toFixed(2)}, available ${agriAvail.toFixed(2)}.`
      );
      return;
    }
    if (needAgri && Math.abs(agriAllocated - splitQtys.agri) > 0.01) {
      setError(
        `Ram Agri allocated (${agriAllocated.toFixed(2)}) must match Ram Agri packets (${splitQtys.agri.toFixed(2)}).`
      );
      return;
    }

    const ramAgriBatchAllocations = needAgri
      ? Object.entries(agriAllocations)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([batchId, quantity]) => {
            const batch = (avail?.ramAgriBatches || []).find(
              (row) => String(row._id) === String(batchId)
            );
            return {
              batchId,
              quantity: parseFloat(quantity),
              ramAgriCropId: batch?.ramAgriCropId?._id || batch?.ramAgriCropId,
              ramAgriVarietyId: batch?.ramAgriVarietyId?._id || batch?.ramAgriVarietyId,
            };
          })
      : [];

    const batchAllocations = needBiotech
      ? Object.entries(allocations)
          .filter(([, qty]) => qty > 0)
          .map(([batchId, quantity]) => {
            const batch = batches.find((b) => b._id.toString() === batchId);
            const expiryDate = expiryDates[batchId] || batch?.expiryDate;
            return {
              batchId,
              quantity: parseFloat(quantity),
              expiryDate: expiryDate
                ? typeof expiryDate === 'string'
                  ? expiryDate
                  : expiryDate.toISOString()
                : undefined,
            };
          })
      : [];

    if (needBiotech && batchAllocations.length === 0) {
      setError('Allocate Biotech batches for the Biotech packet share');
      return;
    }

    for (const allocation of ramAgriBatchAllocations) {
      const batch = (avail?.ramAgriBatches || []).find(
        (row) => String(row._id) === String(allocation.batchId)
      );
      if (batch && Number(batch.remainingQuantity) < allocation.quantity) {
        setError(
          `Insufficient quantity in Ram Agri batch ${batch.batchNumber}. Available: ${batch.remainingQuantity}, Allocated: ${allocation.quantity}`
        );
        return;
      }
    }

    for (const allocation of batchAllocations) {
      const batch = batches.find((b) => b._id.toString() === allocation.batchId);
      if (!batch) {
        setError('Batch not found');
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
          ramAgriBatchAllocations,
          notes: `Issued from sowing request ${request.requestNumber} [${inventorySource}]`,
          purpose: 'production',
          inventorySource,
          packetsFromBiotech: splitQtys.bio,
          packetsFromRamAgri: splitQtys.agri,
        },
        [request._id]
      );

      if (response?.data?.success) {
        setAlertDialog({
          open: true,
          title: 'Success',
          message: response.data.message || 'Stock issued successfully!',
        });
        onSuccess?.();
        setTimeout(() => onClose(), 1000);
      } else {
        setError(response?.data?.message || 'Failed to issue stock');
      }
    } catch (err) {
      console.error('Error issuing stock:', err);
      setError(err?.response?.data?.message || 'Failed to issue stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  const totalAllocated = calculateTotalAllocated();
  const packetsNeeded = getPacketsNeeded();
  const raisingPkts = getRaisingPackets();
  const totalRequested = getPacketsRequestedTotal();
  const excessPackets = getExcessPackets();
  const raisingOnly = companyQty < 0.01;
  const hasAllocations = Object.values(allocations).some((qty) => qty > 0);
  const agriAllocatedTotal = calculateAgriAllocated();
  const bioAllocOk = !needBiotech || (Math.abs(totalAllocated - splitQtys.bio) < 0.01 && hasAllocations);
  const agriOk =
    !needAgri ||
    (agriAvail + 0.01 >= splitQtys.agri &&
      Math.abs(agriAllocatedTotal - splitQtys.agri) < 0.01);
  const isValid = raisingOnly
    ? true
    : bioAllocOk && agriOk && (needBiotech || needAgri);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ py: 1.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Sowing Request: {request.requestNumber}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Chip
              label={`purpose: ${request.issuePurpose || 'production'}`}
              color="primary"
              variant="outlined"
              size="small"
            />
            <Chip
              label={request.status}
              color={request.status === 'pending' ? 'warning' : 'success'}
              size="small"
            />
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr' },
            gap: 1,
            mb: 1.5,
          }}
        >
          {[
            {
              label: 'Plant & subtype',
              value: `${request.plantName} · ${request.subtypeName}`,
            },
            {
              label: 'Packets needed',
              value: `${packetsNeeded.toFixed(2)} ${request.unitName}`,
            },
            {
              label: 'Company issue',
              value: `${companyQty.toFixed(2)} ${request.unitName}`,
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                px: 1.5,
                py: 1,
                border: '1px solid #e2e8f0',
                borderRadius: 1.5,
                bgcolor: '#f8fafc',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="body2" fontWeight={800}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Total {totalRequested.toFixed(2)}
          {raisingPkts > 0 ? ` · customer seed ${raisingPkts.toFixed(2)}` : ''}
          {request.seedSource ? ` · ${request.seedSource}` : ''}
        </Typography>

        {raisingOnly && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Raising-only request — no company packets. Confirm to mark issued without warehouse stock.
          </Alert>
        )}

        {!raisingOnly && (
          <SowingIssueInventorySourcePanel
            inventorySource={inventorySource}
            companyQty={companyQty}
            biotechAvail={biotechAvail}
            agriAvail={agriAvail}
            avail={avail}
            agriAllocations={agriAllocations}
            onAgriAllocationChange={handleAgriAllocationChange}
            onSourceChange={(e) => {
              const next = e.target.value;
              setInventorySource(next);
              setError(null);
              if (next === 'BIOTECH') {
                setPacketsFromBiotech(String(companyQty));
                setPacketsFromRamAgri('0');
              } else {
                setPacketsFromBiotech('0');
                setPacketsFromRamAgri(String(companyQty));
              }
            }}
          />
        )}

        {request.raisingIntakes?.length > 0 && (
          <Box mb={1.5} p={1.25} sx={{ border: '1px solid #dbeafe', borderRadius: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={800} mb={0.75}>
              Customer seed batches
            </Typography>
            <Box display="flex" gap={0.75} flexWrap="wrap">
              {request.raisingIntakes.flatMap((intake) => {
                const intakeBatches = intake.batches?.length
                  ? intake.batches
                  : [{
                      batchNumber: intake.batchNumber,
                      packets: intake.packetsReceived,
                      expiryDate: intake.expiryDate,
                    }];
                return intakeBatches.map((batch, index) => (
                  <Chip
                    key={`${intake._id}-${batch._id || index}`}
                    size="small"
                    variant="outlined"
                    label={`${batch.batchNumber || 'Batch'} · ${Number(batch.packets || 0).toFixed(2)} pkt${
                      batch.expiryDate
                        ? ` · exp ${formatDisplayDate(batch.expiryDate)}`
                        : ''
                    }`}
                  />
                ));
              })}
            </Box>
          </Box>
        )}

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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!raisingOnly && needBiotech && (
          <>
            <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={autoFillAllocations}
                disabled={batches.length === 0}
              >
                Auto-Fill Biotech qty ({splitQtys.bio.toFixed(2)})
              </Button>
              <Typography variant="caption" color="text.secondary">
                Biotech batches available: {calculateTotalAvailable().toFixed(2)} {request.unitName}
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Company warehouse batches
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Allocate Biotech batches (must equal {splitQtys.bio.toFixed(2)} {request.unitName})
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Batch Number</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell align="right">Unit</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell align="right">Allocate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortBatchesByExpiry(batches, 'fifo').map((batch) => {
                    const allocated = allocations[batch._id] || 0;
                    const batchUnitId = batch.unit?._id?.toString();
                    const secondaryUnitId = request?.secondaryUnit?._id?.toString();
                    let allocatedInPackets = allocated;
                    if (batchUnitId === secondaryUnitId && request?.conversionFactor) {
                      allocatedInPackets = allocated / request.conversionFactor;
                    }
                    const expiryDate = expiryDates[batch._id] || batch.expiryDate;
                    const expiryDateValue = expiryDate
                      ? typeof expiryDate === 'string'
                        ? new Date(expiryDate).toISOString().split('T')[0]
                        : expiryDate.toISOString().split('T')[0]
                      : '';

                    return (
                      <TableRow key={batch._id}>
                        <TableCell>{batch.batchNumber}</TableCell>
                        <TableCell align="right">{batch.remainingQuantity}</TableCell>
                        <TableCell align="right">
                          {batch.unit?.symbol || batch.unit?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {allocated > 0 ? (
                            <TextField
                              type="date"
                              size="small"
                              value={expiryDateValue}
                              onChange={(e) => handleExpiryDateChange(batch._id, e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              sx={{ width: 150 }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {batch.expiryDate ? formatDisplayDate(batch.expiryDate) : 'N/A'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={allocated || ''}
                            onChange={(e) => handleAllocationChange(batch._id, e.target.value)}
                            inputProps={{ min: 0, max: batch.remainingQuantity, step: 0.01 }}
                            sx={{ width: 100 }}
                            error={allocated > batch.remainingQuantity}
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

            <Box
              mt={2}
              p={2}
              sx={{
                bgcolor: bioAllocOk ? '#e8f5e9' : '#fff3e0',
                borderRadius: 1,
                border: `2px solid ${bioAllocOk ? '#2e7d32' : '#f57c00'}`,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Biotech allocated:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {totalAllocated.toFixed(2)} / {splitQtys.bio.toFixed(2)} {request.unitName}
                </Typography>
              </Box>
              {needAgri && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Ram Agri share: {splitQtys.agri.toFixed(2)}
                </Typography>
              )}
              {excessPackets > 0 && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Needed: {packetsNeeded.toFixed(2)} | Excess: {excessPackets.toFixed(2)}
                </Typography>
              )}
            </Box>
          </>
        )}

        {!raisingOnly && needAgri && !needBiotech && (
          <Alert severity={agriOk ? 'success' : 'warning'} sx={{ mt: 1 }}>
            {agriOk
              ? `Ready to issue ${splitQtys.agri.toFixed(2)} packets from Ram Agri Input.`
              : `Allocate ${splitQtys.agri.toFixed(2)} packets from Ram Agri batches${
                  agriAvail < splitQtys.agri ? ' — stock may be insufficient' : ''
                }.`}
          </Alert>
        )}
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
          {submitting
            ? 'Issuing...'
            : raisingOnly
              ? 'Confirm raising issue'
              : 'Issue Stock'}
        </Button>
      </DialogActions>

      <Dialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ open: false, message: '', title: '' })}
      >
        <DialogTitle>{alertDialog.title || 'Alert'}</DialogTitle>
        <DialogContent>
          <Typography style={{ whiteSpace: 'pre-line' }}>{alertDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog({ open: false, message: '', title: '' })}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default SowingRequestDialog;
