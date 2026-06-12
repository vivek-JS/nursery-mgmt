import React from "react";
import { Stack, Chip } from "@mui/material";

export default function PipelineStatusChips({ batchDoc }) {
  if (!batchDoc) return null;
  const lab = batchDoc.outward?.length ?? 0;
  const priIn = batchDoc.primaryInward?.length ?? 0;
  const priOut = batchDoc.primaryOutward?.length ?? 0;
  const secIn = batchDoc.secondaryInward?.length ?? 0;
  const secOut = batchDoc.secondaryOutward?.length ?? 0;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Chip size="small" label={`Lab: ${lab}`} color="default" variant="outlined" />
      <Chip size="small" label={`Primary in: ${priIn}`} color="primary" variant="outlined" />
      <Chip size="small" label={`Primary out: ${priOut}`} color="primary" variant="filled" />
      <Chip size="small" label={`Secondary in: ${secIn}`} color="secondary" variant="outlined" />
      <Chip size="small" label={`Dispatch: ${secOut}`} color="success" variant="outlined" />
    </Stack>
  );
}
