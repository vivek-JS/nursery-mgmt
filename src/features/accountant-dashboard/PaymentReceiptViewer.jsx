import React from "react"
import { Box, Link, Typography } from "@mui/material"
import { isProbablyPdf } from "components/Modals/AttachmentViewerModal"

/**
 * Single receipt preview — plain img / iframe, no loading overlays or transforms.
 * Same approach as AttachmentViewerModal (proven on accountant dashboard).
 */
export function PaymentReceiptViewer({ url }) {
  if (!url) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
        No attachment
      </Typography>
    )
  }

  if (isProbablyPdf(url)) {
    return (
      <Box
        component="iframe"
        title="Payment attachment PDF"
        src={url}
        sx={{
          display: "block",
          width: "100%",
          height: { xs: 360, sm: 480 },
          border: 0,
          borderRadius: 1,
          bgcolor: "grey.100"
        }}
      />
    )
  }

  // Default to image preview (receipt URLs often lack .jpg extension)
  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" underline="none" sx={{ display: "block" }}>
      <Box
        component="img"
        key={url}
        src={url}
        alt="Payment receipt"
        sx={{
          display: "block",
          width: "100%",
          height: "auto",
          maxHeight: { xs: "55vh", sm: "65vh" },
          objectFit: "contain",
          bgcolor: "grey.100",
          borderRadius: 1,
          mx: "auto"
        }}
      />
    </Link>
  )
}
