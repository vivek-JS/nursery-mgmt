import React from "react"
import { Button, IconButton, Tooltip } from "@mui/material"
import { Edit2, Shield, Sparkles, TrendingUp } from "lucide-react"
import { getBufferStatusMeta } from "./bufferUi"

/**
 * Compact buffer strip for slot cards — friendly copy, status badge, mini capacity bar.
 */
const SlotBufferPanel = ({
  slot,
  compact = true,
  onEditBuffer,
  onReleaseBuffer,
  onStopPropagation,
}) => {
  const meta = getBufferStatusMeta(slot)
  const { styles, state, pct, bufferBarPct, headline, subline, primaryAction, secondaryAction } =
    meta

  const wrapClick = (fn) => (e) => {
    onStopPropagation?.(e)
    fn?.(e)
  }

  const handlePrimary = (e) => {
    if (!primaryAction) return
    if (primaryAction.id === "release") onReleaseBuffer?.(slot, e)
    else onEditBuffer?.(slot, e)
  }

  const handleSecondary = (e) => {
    if (!secondaryAction) return
    if (secondaryAction.id === "release") onReleaseBuffer?.(slot, e)
    else onEditBuffer?.(slot, e)
  }

  const showPrimary =
    primaryAction &&
    (primaryAction.id !== "release" || meta.releasable > 0)

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${styles.shell} ${
        compact ? "p-2.5" : "p-4"
      }`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}>
      {state === "inherited" && (
        <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-300/20 blur-xl" />
      )}
      {state === "releasable" && (
        <div className="pointer-events-none absolute -right-2 -top-2 h-12 w-12 rounded-full bg-violet-400/20 blur-lg" />
      )}

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
              {state === "inherited" ? (
                <Sparkles className="h-3 w-3" aria-hidden />
              ) : (
                <Shield className="h-3 w-3" aria-hidden />
              )}
              {styles.badgeLabel}
            </span>
            {pct > 0 && (
              <span className={`text-[10px] font-bold ${styles.accent}`}>{pct}%</span>
            )}
            <Tooltip title="Edit buffer %" arrow>
              <IconButton
                size="small"
                onClick={wrapClick((e) => onEditBuffer?.(slot, e))}
                sx={{ padding: "2px", width: 18, height: 18, ml: "auto" }}>
                <Edit2 className="h-3 w-3 text-purple-700" />
              </IconButton>
            </Tooltip>
          </div>

          <p className={`text-sm font-bold leading-tight ${styles.number}`}>{headline}</p>
          <p className={`mt-0.5 text-[10px] leading-snug ${styles.accent} opacity-90`}>{subline}</p>

          {meta.total > 0 && bufferBarPct > 0 && (
            <div className="mt-2">
              <div className="mb-0.5 flex justify-between text-[9px] text-gray-500">
                <span>Capacity</span>
                <span>{meta.total.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/80">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                  style={{ width: `${bufferBarPct}%` }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
                <span>Sellable {meta.sellable.toLocaleString()}</span>
                <span>Avail {meta.available.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showPrimary || secondaryAction) && (
        <div className="relative mt-2 flex flex-wrap gap-1 border-t border-white/60 pt-2">
          {showPrimary && (
            <Button
              size="small"
              variant={primaryAction.id === "release" ? "contained" : "text"}
              onClick={wrapClick(handlePrimary)}
              startIcon={
                primaryAction.id === "release" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )
              }
              sx={{
                fontSize: "0.7rem",
                py: 0.25,
                px: 1.25,
                minWidth: 0,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                ...(primaryAction.id === "release"
                  ? {
                      bgcolor: "#7c3aed",
                      "&:hover": { bgcolor: "#6d28d9" },
                    }
                  : {
                      color: state === "inherited" ? "#b45309" : "#7c3aed",
                      "&:hover": {
                        bgcolor:
                          state === "inherited"
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(139, 92, 246, 0.1)",
                      },
                    }),
              }}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size="small"
              variant="text"
              onClick={wrapClick(handleSecondary)}
              sx={{
                fontSize: "0.65rem",
                py: 0.25,
                px: 1,
                minWidth: 0,
                textTransform: "none",
                color: "#64748b",
              }}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default SlotBufferPanel
