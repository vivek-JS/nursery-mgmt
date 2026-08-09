import React, { useCallback, useEffect, useState } from "react"
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Typography
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import DownloadIcon from "@mui/icons-material/Download"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import { resolvePaymentMediaUrl, isProbablyImage, isProbablyPdf } from "components/Modals/AttachmentViewerModal"
import { StatusBadge } from "./StatusBadge"
import { PaymentReceiptViewer } from "./PaymentReceiptViewer"

export { buildOrderAttachmentContext, buildBulkAttachmentContext } from "./paymentAttachmentContext"

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`

function ContextRow({ label, value, sub }) {
  if (value == null || value === "") return null
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} noWrap title={String(value)}>
        {value}
      </Typography>
      {sub ? (
        <Typography variant="caption" color="text.secondary" noWrap title={String(sub)}>
          {sub}
        </Typography>
      ) : null}
    </Box>
  )
}

function downloadFile(url, filename) {
  const link = document.createElement("a")
  link.href = url
  link.download = filename || "attachment"
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function PaymentAttachmentModal({ open, onClose, context }) {
  const urls = Array.isArray(context?.urls)
    ? context.urls.map(resolvePaymentMediaUrl).filter(Boolean)
    : []
  const [activeIndex, setActiveIndex] = useState(0)

  const resetIndex = useCallback(() => setActiveIndex(0), [])

  useEffect(() => {
    if (open) resetIndex()
  }, [open, context?.key, resetIndex])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.()
      if (e.key === "ArrowLeft" && urls.length > 1) setActiveIndex((i) => Math.max(0, i - 1))
      if (e.key === "ArrowRight" && urls.length > 1) setActiveIndex((i) => Math.min(urls.length - 1, i + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose, urls.length])

  const currentUrl = urls[activeIndex] || ""
  const c = context

  return (
    <Dialog
      open={Boolean(open && context)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      aria-labelledby="payment-attachment-title"
    >
      <DialogTitle
        id="payment-attachment-title"
        sx={{ pb: 1, pr: 6 }}
        component="div"
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={c?.kind === "bulk" ? "Bulk" : "Order"}
            color={c?.kind === "bulk" ? "secondary" : "primary"}
            sx={{ fontWeight: 700, fontSize: 10 }}
          />
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
            {c?.title}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {c?.subtitle ? (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5} noWrap>
            {c.subtitle}
          </Typography>
        ) : null}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5 }}>
        <Grid container spacing={1.5} sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}>
          <Grid item xs={6} sm={3}>
            <ContextRow label="Farmer / Customer" value={c?.customerName} sub={c?.customerSub} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <ContextRow label="Sales person" value={c?.salesPersonName} sub={c?.salesPersonPhone} />
          </Grid>
          {c?.bookingFarmerName ? (
            <Grid item xs={6} sm={3}>
              <ContextRow label="Booking farmer" value={c.bookingFarmerName} />
            </Grid>
          ) : null}
          <Grid item xs={6} sm={3}>
            <ContextRow label="Ref #" value={c?.refLabel} />
          </Grid>
          {c?.plantDetail ? (
            <Grid item xs={6} sm={3}>
              <ContextRow label="Plant / detail" value={c.plantDetail} sub={c.plantSub} />
            </Grid>
          ) : null}
          {c?.paidAmount != null ? (
            <Grid item xs={6} sm={3}>
              <ContextRow label="This payment" value={fmt(c.paidAmount)} sub={c?.paymentMode} />
            </Grid>
          ) : null}
          {c?.status ? (
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase" }}>
                Status
              </Typography>
              <Box mt={0.5}>
                <StatusBadge status={c.status} />
              </Box>
            </Grid>
          ) : null}
        </Grid>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {urls.length > 0 ? `Attachment ${activeIndex + 1} of ${urls.length}` : "No attachments"}
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {urls.length > 1 ? (
              <>
                <IconButton
                  size="small"
                  disabled={activeIndex <= 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  aria-label="Previous attachment"
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={activeIndex >= urls.length - 1}
                  onClick={() => setActiveIndex((i) => Math.min(urls.length - 1, i + 1))}
                  aria-label="Next attachment"
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </>
            ) : null}
            {currentUrl ? (
              <>
                <IconButton
                  size="small"
                  aria-label="Download"
                  onClick={() => downloadFile(currentUrl, `payment-${c?.refLabel || "attach"}-${activeIndex + 1}`)}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Open in new tab"
                  component="a"
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </>
            ) : null}
          </Stack>
        </Stack>

        {urls.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            No attachments for this payment
          </Typography>
        ) : (
          <PaymentReceiptViewer url={currentUrl} />
        )}

        {urls.length > 1 ? (
          <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: "auto", pb: 0.5 }}>
            {urls.map((url, idx) => (
              <Box
                key={`${url}-${idx}`}
                component="button"
                type="button"
                onClick={() => setActiveIndex(idx)}
                sx={{
                  flexShrink: 0,
                  width: 52,
                  height: 52,
                  p: 0,
                  border: 2,
                  borderColor: idx === activeIndex ? "primary.main" : "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                  cursor: "pointer",
                  bgcolor: "grey.100"
                }}
              >
                {isProbablyImage(url) ? (
                  <Box
                    component="img"
                    src={url}
                    alt=""
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <Typography variant="caption" fontWeight={700} sx={{ lineHeight: "48px" }}>
                    {isProbablyPdf(url) ? "PDF" : idx + 1}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
