import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { formatDisplayDate } from '../../../../utils/dateUtils';
import { sortBatchesByExpiry } from '../utils/fillBatchesByExpiry';

export default function SowingIssueInventorySourcePanel({
  inventorySource,
  onSourceChange,
  companyQty,
  biotechAvail,
  agriAvail,
  avail,
  agriAllocations = {},
  onAgriAllocationChange,
}) {
  const biotechLinked = (avail?.biotech || [])
    .map((link) => link.displayName || link.productId?.name)
    .filter(Boolean);
  const agriLinked = (avail?.ramAgri || [])
    .map((link) => link.displayName)
    .filter(Boolean);
  const sourceOptions = [
    {
      value: 'BIOTECH',
      label: 'Biotech warehouse',
      available: biotechAvail,
      linked: biotechLinked,
    },
    {
      value: 'RAM_AGRI',
      label: 'Ram Agri Input',
      available: agriAvail,
      linked: agriLinked,
    },
  ];
  const agriBatches = useMemo(
    () => sortBatchesByExpiry(avail?.ramAgriBatches || [], 'fifo'),
    [avail?.ramAgriBatches]
  );
  const agriAllocated = agriBatches.reduce(
    (sum, batch) => sum + (Number(agriAllocations[String(batch._id)]) || 0),
    0
  );

  return (
    <Box
      mb={1.5}
      p={1.25}
      sx={{
        bgcolor: '#f8fafc',
        borderRadius: 1.5,
        border: '1px solid #e2e8f0',
      }}
    >
      <FormControl component="fieldset" fullWidth>
        <FormLabel
          component="legend"
          sx={{ fontWeight: 800, mb: 0.75, color: 'text.primary', fontSize: 13 }}
        >
          Inventory source
        </FormLabel>
        <RadioGroup
          row
          sx={{ gap: 1 }}
          value={inventorySource}
          onChange={(event, value) =>
            onSourceChange?.({ target: { value } })
          }
        >
          {sourceOptions.map((option) => {
            const selected = inventorySource === option.value;
            return (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio size="small" />}
                sx={{
                  m: 0,
                  flex: '1 1 220px',
                  alignItems: 'flex-start',
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : '#e2e8f0',
                  borderRadius: 1.25,
                  px: 1,
                  py: 0.5,
                  bgcolor: selected ? '#eff6ff' : '#fff',
                }}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={800}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.available.toFixed(2)} pkt available
                      {option.linked.length
                        ? ` · ${option.linked.join(', ')}`
                        : ''}
                    </Typography>
                  </Box>
                }
              />
            );
          })}
        </RadioGroup>
      </FormControl>

      {inventorySource === 'RAM_AGRI' && (
        <>
          {agriBatches.length > 0 && (
            <TableContainer sx={{ mt: 1, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Batch</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell>Expiry</TableCell>
                    <TableCell align="right">Allocate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agriBatches.map((batch) => {
                    const allocated = Number(agriAllocations[String(batch._id)]) || 0;
                    const available = Number(batch.remainingQuantity) || 0;
                    return (
                      <TableRow key={batch._id}>
                        <TableCell>{batch.batchNumber}</TableCell>
                        <TableCell align="right">{available.toFixed(2)}</TableCell>
                        <TableCell>
                          {batch.expiryDate ? formatDisplayDate(batch.expiryDate) : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={allocated || ''}
                            onChange={(e) =>
                              onAgriAllocationChange?.(String(batch._id), e.target.value)
                            }
                            inputProps={{ min: 0, max: available, step: 0.01 }}
                            sx={{ width: 90 }}
                            error={allocated > available}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Alert
            severity={Math.abs(agriAllocated - companyQty) < 0.01 ? 'success' : 'info'}
            sx={{ mt: 1, py: 0 }}
          >
            {agriAllocated.toFixed(2)} / {companyQty.toFixed(2)} packets allocated from Ram Agri Input.
          </Alert>
        </>
      )}
    </Box>
  );
}
