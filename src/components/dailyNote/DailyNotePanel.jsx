import React, { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Fade,
  Slide,
  Chip,
  Divider,
} from "@mui/material"
import { styled, keyframes } from "@mui/material/styles"
import CloseIcon from "@mui/icons-material/Close"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import NoteAltIcon from "@mui/icons-material/NoteAlt"
import { Toast } from "helpers/toasts/toastHelper"
import {
  deleteNote,
  fetchNotes,
  fetchTodayNote,
  formatNoteDate,
  getISTDateString,
  saveNote,
  saveTodayNote,
  updateNote,
} from "./dailyNoteApi"

const ACCENT = "#1B5E40"
const ACCENT_SOFT = "#E8F5EE"

const riseIn = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    backgroundColor: "rgba(15, 35, 25, 0.45)",
    backdropFilter: "blur(6px)",
  },
  "& .MuiDialog-paper": {
    borderRadius: 20,
    width: "100%",
    maxWidth: 520,
    margin: 16,
    maxHeight: "88vh",
    overflow: "hidden",
    boxShadow: "0 24px 64px rgba(15, 40, 28, 0.28)",
    animation: `${riseIn} 0.32s cubic-bezier(0.22, 1, 0.36, 1)`,
    display: "flex",
    flexDirection: "column",
    background: `linear-gradient(180deg, ${ACCENT_SOFT} 0%, #fff 140px)`,
    [theme.breakpoints.down("sm")]: {
      margin: 12,
      maxHeight: "90vh",
      borderRadius: 18,
    },
  },
}))

function previewText(text, max = 110) {
  const t = String(text || "").replace(/\s+/g, " ").trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function groupByMonth(notes) {
  const groups = []
  const map = new Map()
  for (const note of notes) {
    const [y, m] = (note.noteDate || "").split("-")
    const key = y && m ? `${y}-${m}` : "other"
    if (!map.has(key)) {
      let label = "Notes"
      try {
        const d = new Date(Number(y), Number(m) - 1, 1)
        label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      } catch {
        /* keep default */
      }
      const group = { key, label, notes: [] }
      map.set(key, group)
      groups.push(group)
    }
    map.get(key).notes.push(note)
  }
  return groups
}

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />
})

export default function DailyNotePanel({ open, onClose }) {
  const today = getISTDateString()
  const [view, setView] = useState("list") // list | form
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [todayNote, setTodayNote] = useState(null)

  const [activeNote, setActiveNote] = useState(null)
  const [noteDate, setNoteDate] = useState(today)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadList = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    try {
      const [listData, todayData] = await Promise.all([
        fetchNotes({ page: pageNum, limit: 30 }),
        pageNum === 1 ? fetchTodayNote() : Promise.resolve(null),
      ])
      const list = listData?.notes || []
      setNotes((prev) => (append ? [...prev, ...list] : list))
      setHasMore(Boolean(listData?.pagination?.hasMore))
      setPage(pageNum)
      if (todayData) setTodayNote(todayData.note || null)
    } catch (err) {
      if (!append) {
        setNotes([])
        Toast.error(err?.message || "Could not load notes")
      }
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setView("list")
    setActiveNote(null)
    setTitle("")
    setContent("")
    setNoteDate(today)
    loadList(1, false)
  }, [open, today, loadList])

  const openForm = (note = null, date = today) => {
    setActiveNote(note)
    setNoteDate(note?.noteDate || date)
    setTitle(note?.title || "")
    setContent(note?.content || "")
    setView("form")
  }

  const openNew = async () => {
    try {
      const data = await fetchTodayNote()
      openForm(data?.note || null, data?.noteDate || today)
    } catch {
      openForm(null, today)
    }
  }

  const backToList = () => {
    setView("list")
    setActiveNote(null)
    setTitle("")
    setContent("")
  }

  const handleSave = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      Toast.error("Please write something in your note")
      return
    }
    setSaving(true)
    try {
      const payload = { title: title.trim(), content: trimmed, noteDate }
      let saved
      if (activeNote?._id) {
        saved = await updateNote(activeNote._id, payload)
      } else if (noteDate === today) {
        saved = await saveTodayNote(payload)
      } else {
        saved = await saveNote(payload)
      }
      Toast.success(activeNote?._id ? "Note updated" : "Note saved")
      setTodayNote(saved?.noteDate === today ? saved : todayNote)
      await loadList(1, false)
      backToList()
    } catch (err) {
      Toast.error(err?.message || "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!activeNote?._id) return
    if (!window.confirm("Delete this note?")) return
    setDeleting(true)
    try {
      await deleteNote(activeNote._id)
      Toast.success("Note deleted")
      await loadList(1, false)
      backToList()
    } catch (err) {
      Toast.error(err?.message || "Failed to delete note")
    } finally {
      setDeleting(false)
    }
  }

  const groups = groupByMonth(notes)
  const isToday = noteDate === today
  const isEdit = Boolean(activeNote?._id)

  return (
    <StyledDialog
      open={open}
      onClose={saving || deleting ? undefined : onClose}
      TransitionComponent={Transition}
      transitionDuration={280}
      keepMounted={false}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          pt: 2.25,
          pb: 1.75,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          {view === "form" && (
            <IconButton
              size="small"
              onClick={backToList}
              disabled={saving || deleting}
              sx={{ bgcolor: "rgba(27,94,64,0.08)", mr: 0.25 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              bgcolor: ACCENT,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              boxShadow: "0 8px 18px rgba(27,94,64,0.28)",
            }}
          >
            <NoteAltIcon fontSize="small" />
          </Box>
          <Box minWidth={0}>
            <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#123528", lineHeight: 1.2 }}>
              {view === "list"
                ? "Daily Notes"
                : isEdit
                  ? "Edit Note"
                  : isToday
                    ? "New Note · Today"
                    : "New Note"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(18,53,40,0.65)", fontWeight: 500 }}>
              {view === "list"
                ? "Write today · browse by date"
                : formatNoteDate(noteDate)}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={saving || deleting}
          sx={{ color: "rgba(18,53,40,0.7)" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(27,94,64,0.08)" }} />

      {/* Body */}
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 280 }}>
        {view === "list" ? (
          <Fade in key="list">
            <Box sx={{ p: 2, pb: 2.5 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openNew}
                sx={{
                  mb: 2,
                  py: 1.25,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 15,
                  bgcolor: ACCENT,
                  boxShadow: "0 8px 20px rgba(27,94,64,0.25)",
                  "&:hover": { bgcolor: "#144832" },
                }}
              >
                {todayNote ? "Edit Today’s Note" : "Add New Note"}
              </Button>

              {todayNote && (
                <Box
                  onClick={() => openForm(todayNote, today)}
                  sx={{
                    mb: 2,
                    p: 1.75,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    bgcolor: "#fff",
                    border: "1px solid rgba(27,94,64,0.16)",
                    boxShadow: "0 4px 14px rgba(27,94,64,0.08)",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 8px 20px rgba(27,94,64,0.14)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <Chip
                      label="Today"
                      size="small"
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        bgcolor: ACCENT,
                        color: "#fff",
                        fontSize: 11,
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: "#123528" }}>
                      {todayNote.title || formatNoteDate(today)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: "rgba(18,53,40,0.7)", lineHeight: 1.45 }}>
                    {previewText(todayNote.content)}
                  </Typography>
                </Box>
              )}

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  color: "rgba(18,53,40,0.45)",
                  mb: 1.25,
                  px: 0.25,
                }}
              >
                Previous notes
              </Typography>

              {loading ? (
                <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
                  <CircularProgress size={30} sx={{ color: ACCENT }} />
                </Box>
              ) : notes.filter((n) => n.noteDate !== today).length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 5,
                    px: 2,
                    borderRadius: 2.5,
                    bgcolor: "rgba(255,255,255,0.7)",
                    border: "1px dashed rgba(27,94,64,0.2)",
                  }}
                >
                  <Typography sx={{ color: "rgba(18,53,40,0.55)", fontWeight: 500 }}>
                    No previous notes yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(18,53,40,0.4)", mt: 0.5 }}>
                    Your earlier notes will appear here, date-wise.
                  </Typography>
                </Box>
              ) : (
                groups.map((group) => {
                  const prevNotes = group.notes.filter((n) => n.noteDate !== today)
                  if (!prevNotes.length) return null
                  return (
                    <Box key={group.key} sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: ACCENT,
                          mb: 1,
                          px: 0.25,
                        }}
                      >
                        {group.label}
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {prevNotes.map((note) => (
                          <Box
                            key={note._id}
                            onClick={() => openForm(note, note.noteDate)}
                            sx={{
                              p: 1.5,
                              borderRadius: 2.25,
                              cursor: "pointer",
                              bgcolor: "#fff",
                              border: "1px solid rgba(18,53,40,0.08)",
                              transition: "background 0.15s ease, border-color 0.15s ease",
                              "&:hover": {
                                bgcolor: ACCENT_SOFT,
                                borderColor: "rgba(27,94,64,0.22)",
                              },
                            }}
                          >
                            <Typography
                              sx={{ fontWeight: 600, fontSize: 13.5, color: "#123528", mb: 0.35 }}
                            >
                              {formatNoteDate(note.noteDate)}
                              {note.title ? ` · ${note.title}` : ""}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "rgba(18,53,40,0.65)", lineHeight: 1.4 }}
                            >
                              {previewText(note.content)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )
                })
              )}

              {hasMore && !loading && (
                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Button
                    onClick={() => loadList(page + 1, true)}
                    disabled={loadingMore}
                    sx={{ textTransform: "none", color: ACCENT, fontWeight: 600 }}
                  >
                    {loadingMore ? <CircularProgress size={18} /> : "Load more"}
                  </Button>
                </Box>
              )}
            </Box>
          </Fade>
        ) : (
          <Fade in key="form">
            <Box sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.75 }}>
              <TextField
                label="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ maxLength: 200 }}
                disabled={saving || deleting}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" },
                }}
              />
              <TextField
                label="Your note"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                fullWidth
                multiline
                minRows={7}
                maxRows={14}
                placeholder="Write today’s note…"
                inputProps={{ maxLength: 10000 }}
                disabled={saving || deleting}
                autoFocus
                helperText={`${content.length}/10000`}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff" },
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  pt: 0.5,
                }}
              >
                <Box>
                  {isEdit && (
                    <Button
                      color="error"
                      startIcon={
                        deleting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />
                      }
                      onClick={handleDelete}
                      disabled={saving || deleting}
                      sx={{ textTransform: "none" }}
                    >
                      Delete
                    </Button>
                  )}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    onClick={backToList}
                    disabled={saving || deleting}
                    sx={{ textTransform: "none" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || deleting || !content.trim()}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      minWidth: 104,
                      borderRadius: 2,
                      bgcolor: ACCENT,
                      "&:hover": { bgcolor: "#144832" },
                    }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Fade>
        )}
      </Box>
    </StyledDialog>
  )
}
