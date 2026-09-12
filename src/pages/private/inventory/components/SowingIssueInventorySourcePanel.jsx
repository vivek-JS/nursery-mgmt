import React from 'react';
import {
  Alert,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';

export default function SowingIssueInventorySourcePanel({
  inventorySource,
  onSourceChange,
  companyQty,
  biotechAvail,
  agriAvail,
  avail,
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
          {avail?.ramAgriBatches?.length > 0 && (
            <Box mt={1}>
              <Typography variant="caption" fontWeight={800}>
                Ram Agri batches
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                {avail.ramAgriBatches.map((batch) => (
                  <Typography
                    key={batch._id}
                    variant="caption"
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      bgcolor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 1,
                    }}
                  >
                    {batch.batchNumber} ·{' '}
                    {Number(batch.remainingQuantity || 0).toFixed(2)} pkt
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 1, py: 0 }}>
            {companyQty.toFixed(2)} packets will issue from Ram Agri Input.
          </Alert>
        </>
      )}
    </Box>
  );
}
