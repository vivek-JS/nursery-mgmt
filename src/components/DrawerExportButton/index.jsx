import React, { useState } from "react"
import { Button, CircularProgress } from "@mui/material"
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined"
import { Toast } from "helpers/toasts/toastHelper"
import { downloadSheets, hasExportRows } from "utils/exportCsv"

/**
 * One-click CSV export for a side drawer.
 *
 * `getSheets` returns `[{ title?, headers, rows }]` (sync or async — async lets a drawer fetch
 * every page before exporting). `fileName` is the base name; the date and `.csv` are added.
 */
export default function DrawerExportButton({
  getSheets,
  fileName,
  label = "Export",
  disabled = false,
  sx,
}) {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      const sheets = await getSheets()
      if (!hasExportRows(sheets)) {
        Toast.error("Nothing to export here yet")
        return
      }
      downloadSheets(fileName, sheets)
    } catch (err) {
      Toast.error(err?.response?.data?.message || err?.message || "Export failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      size="small"
      variant="outlined"
      onClick={handleClick}
      disabled={disabled || busy}
      startIcon={busy ? <CircularProgress size={14} /> : <FileDownloadOutlinedIcon fontSize="small" />}
      sx={{ textTransform: "none", fontWeight: 700, whiteSpace: "nowrap", ...sx }}>
      {busy ? "Exporting…" : label}
    </Button>
  )
}
