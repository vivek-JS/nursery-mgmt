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

const SowingRequestDialog = ({ open, onClose, request, onSuccess }) => {
  const [batches, setBatches] = useState([]);
  const [allocations, setAllocations] = useState({});
  const [expiryDates, setExpiryDates] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alertDialog, setAlertDialog] = useState({ open: false, message: '', title: '' });
  const autoFilledRef = useRef(false);
  const [inventorySource, setInventorySource] = useState('BIOTECH');
  const [packetsFromBiotech, setPacketsFromBiotech] = useState('');
  const [packetsFromRamAgri, setPacketsFromRamAgri] = useState('');

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
    if (inventorySource === 'RAM_AGRI') {
      return { bio: 0, agri: company };
    }
    const bio = Number(packetsFromBiotech);
    const agri = Number(packetsFromRamAgri);
    return {
      bio: Number.isFinite(bio) ? bio : 0,
      agri: Number.isFinite(agri) ? agri : 0,
    };
  }, [inventorySource, packetsFromBiotech, packetsFromRamAgri, companyQty]);

  const needBiotech = splitQtys.bio > 0.01;
  const needAgri = splitQtys.agri > 0.01;

  const bothSplitOk =
    inventorySource !== 'BOTH' ||
    (splitQtys.bio > 0.01 &&
      splitQtys.agri > 0.01 &&
      Math.abs(splitQtys.bio + splitQtys.agri - companyQty) < 0.01);

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
      inventorySource === 'BIOTECH'
        ? getCompanyIssuePackets()
        : inventorySource === 'BOTH'
          ? Number(packetsFromBiotech) || 0
          : 0;

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

    const sortedBatches = [...batches].sort(
      (a, b) => (b.remainingQuantity || 0) - (a.remainingQuantity || 0)
    );

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
  }, [request, batches, inventorySource, packetsFromBiotech]);

  useEffect(() => {
    if (open && request) {
      setBatches(request.batches || []);
      setAllocations({});
      setExpiryDates({});
      setError(null);
      autoFilledRef.current = false;
      setInventorySource('BIOTECH');
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
      setPacketsFromBiotech(String(company));
      setPacketsFromRamAgri('');
    }
  }, [open, request]);

  useEffect(() => {
    if (open && request && batches.length > 0 && !autoFilledRef.current && needBiotech) {
      const timer = setTimeout(() => {
        autoFillAllocations();
        autoFilledRef.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [batches, open, request, autoFillAllocations, needBiotech]);

  useEffect(() => {
    // Re-autofill when pool/split changes for Biotech share
    if (!open || !request) return;
    autoFilledRef.current = false;
    if (inventorySource === 'RAM_AGRI') {
      setAllocations({});
      return;
    }
    if (batches.length > 0 && needBiotech) {
      const t = setTimeout(() => {
        autoFillAllocations();
        autoFilledRef.current = true;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [inventorySource, packetsFromBiotech]);

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

    if (!bothSplitOk) {
      setError(
        `For Both, Biotech + Ram Agri packets must equal company qty (${companyQty.toFixed(2)}) and both must be > 0.`
      );
      return;
    }

    if (needBiotech && Math.abs(totalAllocated - splitQtys.bio) > 0.01) {
      setError(
        `Biotech allocated (${totalAllocated.toFixed(2)}) must match Biotech packets (${splitQtys.bio.toFixed(2)}).`
      );
      return;
    }

    if (needAgri && agriAvail + 0.01 < splitQtys.agri) {
      setError(
        `Insufficient Ram Agri Input stock. Need ${splitQtys.agri.toFixed(2)}, available ${agriAvail.toFixed(2)}.`
      );
      return;
    }

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
  const bioAllocOk = !needBiotech || (Math.abs(totalAllocated - splitQtys.bio) < 0.01 && hasAllocations);
  const agriOk = !needAgri || agriAvail + 0.01 >= splitQtys.agri;
  const isValid = raisingOnly
    ? true
    : bothSplitOk && bioAllocOk && agriOk && (needBiotech || needAgri);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
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
            {packetsNeeded.toFixed(2)} {request.unitName}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Issue from warehouse (company)
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
            {companyQty.toFixed(2)} {request.unitName}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Total requested {totalRequested.toFixed(2)}
            {raisingPkts > 0
              ? ` · raising ${raisingPkts.toFixed(2)} (already collected — not from warehouse)`
              : ''}
            {request.seedSource ? ` · ${request.seedSource}` : ''}
          </Typography>
        </Box>

        {raisingOnly && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Raising-only request — no company packets. Confirm to mark issued without warehouse stock.
          </Alert>
        )}

        {!raisingOnly && (
          <SowingIssueInventorySourcePanel
            inventorySource={inventorySource}
            companyQty={companyQty}
            packetsFromBiotech={packetsFromBiotech}
            packetsFromRamAgri={packetsFromRamAgri}
            onPacketsFromBiotech={setPacketsFromBiotech}
            onPacketsFromRamAgri={setPacketsFromRamAgri}
            biotechAvail={biotechAvail}
            agriAvail={agriAvail}
            avail={avail}
            bothSplitOk={bothSplitOk}
            splitQtys={splitQtys}
            onSourceChange={(e) => {
              const next = e.target.value;
              setInventorySource(next);
              setError(null);
              if (next === 'BIOTECH') {
                setPacketsFromBiotech(String(companyQty));
                setPacketsFromRamAgri('0');
              } else if (next === 'RAM_AGRI') {
                setPacketsFromBiotech('0');
                setPacketsFromRamAgri(String(companyQty));
              } else {
                setPacketsFromBiotech('');
                setPacketsFromRamAgri('');
              }
            }}
          />
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

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
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
                  {batches.map((batch) => {
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
                  Ram Agri share: {splitQtys.agri.toFixed(2)} (FEFO on issue)
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
          <Alert severity="success" sx={{ mt: 1 }}>
            Ready to issue {splitQtys.agri.toFixed(2)} packets from Ram Agri Input
            {agriAvail < splitQtys.agri ? ' — stock may be insufficient' : ''}.
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
