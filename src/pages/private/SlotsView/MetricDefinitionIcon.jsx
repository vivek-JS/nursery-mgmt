import React, { useState } from "react"
import { Popover } from "@mui/material"
import { Info } from "lucide-react"
import { SLOT_METRIC_DEFINITIONS } from "./slotMetricDefinitions"

const MetricDefinitionIcon = ({ definitionKey }) => {
  const def = SLOT_METRIC_DEFINITIONS[definitionKey]
  const [anchor, setAnchor] = useState(null)
  if (!def) return null

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        className="absolute top-1 right-1 z-10 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm ring-1 ring-white cursor-pointer hover:bg-sky-700"
        aria-label={`${def.title} definition`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setAnchor(e.currentTarget)
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return
          e.stopPropagation()
          e.preventDefault()
          setAnchor(e.currentTarget)
        }}>
        <Info className="w-2.5 h-2.5" strokeWidth={2.5} />
      </span>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        slotProps={{ paper: { className: "max-w-xs" } }}>
        <div className="px-3 py-2 max-w-[16rem]">
          <p className="text-xs text-slate-800 leading-snug" lang="mr">
            {def.mr}
          </p>
        </div>
      </Popover>
    </>
  )
}

export default MetricDefinitionIcon
