import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';

/**
 * Issue-dialog inventory pool picker: Biotech | Ram Agri | Both (+ qty split).
 */
export default function SowingIssueInventorySourcePanel({
  inventorySource,
  onSourceChange,
  companyQty,
  packetsFromBiotech,
  packetsFromRamAgri,
  onPacketsFromBiotech,
  onPacketsFromRamAgri,
  biotechAvail,
  agriAvail,
  avail,
  bothSplitOk,
  splitQtys,
}) {
  return (
    <Box mb={3} p={2} sx={{ bgcolor: '#f5f5f5', borderRadius: 1 }}>
      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
          Inventory source
        </FormLabel>
        <RadioGroup row value={inventorySource} onChange={onSourceChange}>
          <FormControlLabel value="BIOTECH" control={<Radio size="small" />} label="Biotech warehouse" />
          <FormControlLabel value="RAM_AGRI" control={<Radio size="small" />} label="Ram Agri Input" />
          <FormControlLabel value="BOTH" control={<Radio size="small" />} label="Both" />
        </RadioGroup>
      </FormControl>

      <Box display="flex" gap={2} flexWrap="wrap" mt={1.5}>
        <Typography variant="body2" color="text.secondary">
          Biotech available: <strong>{biotechAvail.toFixed(2)}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ram Agri available: <strong>{agriAvail.toFixed(2)}</strong>
        </Typography>
      </Box>

      {(avail?.biotech?.length > 0 || avail?.ramAgri?.length > 0) && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          Linked:{' '}
          {(avail.biotech || [])
            .map((l) => l.displayName || l.productId?.name)
            .filter(Boolean)
            .join(', ') || '—'}
          {' · '}
          {(avail.ramAgri || []).map((l) => l.displayName).filter(Boolean).join(', ') || '—'}
        </Typography>
      )}

      {inventorySource === 'BOTH' && (
        <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
          <TextField
            label="Packets from Biotech"
            type="number"
            size="small"
            value={packetsFromBiotech}
            onChange={(e) => onPacketsFromBiotech(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 180 }}
          />
          <TextField
            label="Packets from Ram Agri"
            type="number"
            size="small"
            value={packetsFromRamAgri}
            onChange={(e) => onPacketsFromRamAgri(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ width: 180 }}
          />
          <Typography
            variant="body2"
            sx={{
              alignSelf: 'center',
              color: bothSplitOk ? 'success.main' : 'error.main',
              fontWeight: 600,
            }}
          >
            Sum {(splitQtys.bio + splitQtys.agri).toFixed(2)} / {companyQty.toFixed(2)}
          </Typography>
        </Box>
      )}

      {inventorySource === 'RAM_AGRI' && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Full company qty ({companyQty.toFixed(2)}) will deduct from linked Ram Agri Input varieties
          (FEFO).
        </Alert>
      )}
    </Box>
  );
}
