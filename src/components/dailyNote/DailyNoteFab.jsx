import React, { useState } from "react"
import { Fab, Zoom } from "@mui/material"
import NoteAltIcon from "@mui/icons-material/NoteAlt"
import DailyNotePanel from "./DailyNotePanel"

const ACCENT = "#1B5E40"

/**
 * Floating button — one click opens the Daily Notes popup
 * (add new + previous notes date-wise).
 */
export default function DailyNoteFab({ bottomOffset = 24 } = {}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Zoom in>
        <Fab
          aria-label="Daily notes"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
            zIndex: 1300,
            bgcolor: ACCENT,
            color: "#fff",
            boxShadow: "0 8px 24px rgba(27, 94, 64, 0.38)",
            "&:hover": {
              bgcolor: "#144832",
              boxShadow: "0 10px 28px rgba(27, 94, 64, 0.45)",
            },
          }}
        >
          <NoteAltIcon />
        </Fab>
      </Zoom>

      <DailyNotePanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
