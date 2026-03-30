import React from "react"
import { X, ExternalLink } from "lucide-react"
import { APIConfig } from "network/config/serverConfig"

/** Resolve relative media paths to absolute URLs (same as accountant payments table). */
export function resolvePaymentMediaUrl(u) {
  const s = String(u || "").trim()
  if (!s) return ""
  if (/^https?:\/\//i.test(s)) return s
  const base = (APIConfig.BASE_URL || "").replace(/\/$/, "")
  return s.startsWith("/") ? `${base}${s}` : `${base}/${s}`
}

export function isProbablyImage(url) {
  return /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(String(url))
}

export function isProbablyPdf(url) {
  return /\.pdf(\?|#|$)/i.test(String(url))
}

/**
 * Lightbox-style attachment viewer used on accountant dashboard (payments table, bulk payment entry, etc.).
 */
export default function AttachmentViewerModal({ open, onClose, title, urls }) {
  const list = Array.isArray(urls) ? urls.map(resolvePaymentMediaUrl).filter(Boolean) : []

  if (!open || list.length === 0) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[13040] bg-foreground/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-[13050] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal
          aria-labelledby="attachment-viewer-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-muted/30 shrink-0">
            <div id="attachment-viewer-title" className="text-sm font-semibold text-foreground truncate pr-2">
              {title || "Attachments"}
            </div>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-4">
            {list.map((url, idx) => (
              <div key={`${url}-${idx}`} className="border border-border rounded-lg overflow-hidden bg-muted/20">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border bg-muted/40">
                  <span className="text-[10px] font-mono truncate text-muted-foreground">{url}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[11px] text-primary font-semibold shrink-0"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {isProbablyImage(url) ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt="" className="w-full max-h-[70vh] object-contain bg-black/5" />
                  </a>
                ) : isProbablyPdf(url) ? (
                  <iframe
                    title={`PDF ${idx + 1}`}
                    src={url}
                    className="w-full min-h-[60vh] border-0 bg-muted/30"
                  />
                ) : (
                  <div className="px-3 py-4 text-xs text-muted-foreground">
                    Preview not available — use Open to view this file.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
