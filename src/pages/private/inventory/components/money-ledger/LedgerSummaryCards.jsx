import React from "react";
import { Box, Stack, Typography } from "@mui/material";

function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/**
 * Colorful Outstanding / Advance + Debit / Credit summary cards.
 */
export default function LedgerSummaryCards({ side, totals }) {
  const closing = Number(totals?.closing ?? totals?.balance ?? 0);
  const debit = Number(totals?.debit || 0);
  const credit = Number(totals?.credit || 0);
  const unified = side === "ALL" || side === "UNIFIED";
  const isAp = side === "AP";

  const outstanding = Math.max(0, closing);
  const advance = Math.max(0, -closing);

  const cards = [
    {
      key: "out",
      label: unified
        ? "Net receivable (they owe)"
        : isAp
          ? "Outstanding (we owe)"
          : "Outstanding (they owe)",
      value: unified ? Math.max(0, closing) : outstanding,
      bg: "linear-gradient(135deg, #ffebee 0%, #fff5f5 100%)",
      border: "#ef9a9a",
      color: "#c62828",
    },
    {
      key: "adv",
      label: unified
        ? "Net payable (we owe)"
        : isAp
          ? "Advance paid"
          : "Advance / credit",
      value: unified ? Math.max(0, -closing) : advance,
      bg: "linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 100%)",
      border: "#81c784",
      color: "#2e7d32",
    },
    {
      key: "dr",
      label: "Total Debit",
      value: debit,
      bg: "linear-gradient(135deg, #fce4ec 0%, #fff 100%)",
      border: "#f48fb1",
      color: "#ad1457",
    },
    {
      key: "cr",
      label: "Total Credit",
      value: credit,
      bg: "linear-gradient(135deg, #e0f2f1 0%, #fff 100%)",
      border: "#4db6ac",
      color: "#00695c",
    },
  ];

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.25}
      sx={{ mt: 1.5, flexWrap: "wrap" }}
      useFlexGap
    >
      {cards.map((c) => (
        <Box
          key={c.key}
          sx={{
            flex: "1 1 140px",
            minWidth: 130,
            p: 1.25,
            borderRadius: 2,
            border: "1px solid",
            borderColor: c.border,
            background: c.bg,
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
            {c.label}
          </Typography>
          <Typography variant="h6" fontWeight={900} sx={{ color: c.color, lineHeight: 1.2 }}>
            {formatMoney(c.value)}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
