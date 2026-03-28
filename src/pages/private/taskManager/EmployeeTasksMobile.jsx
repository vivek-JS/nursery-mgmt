import React, { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  Box,
  Typography,
  Card,
  Button,
  Chip,
  CircularProgress,
  Avatar,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  LinearProgress,
  Collapse,
  Fade,
} from "@mui/material"
import {
  ArrowBack,
  PlayArrow,
  CheckCircle,
  CalendarToday,
  AssignmentTurnedIn,
  Timer,
  Refresh,
  Search,
  ErrorOutline,
  PhoneCallback,
  ExpandMore,
  ExpandLess,
  RadioButtonUnchecked,
  CheckCircleOutline,
  Pending,
  EventBusy,
  FilterList,
  Close,
} from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

// ─── Colour tokens ────────────────────────────────────────────────────────────
const GRAD = "linear-gradient(135deg,#5B5FC7 0%,#8B5CF6 100%)"
const BG   = "#F0F2FA"

const PRIORITY_META = {
  urgent:  { color: "#E53935", bg: "#FDE8E8", label: "Urgent",  icon: <ErrorOutline sx={{ fontSize: 11 }} /> },
  high:    { color: "#F57C00", bg: "#FFF3E0", label: "High",    icon: <ErrorOutline sx={{ fontSize: 11 }} /> },
  medium:  { color: "#1565C0", bg: "#E3F2FD", label: "Medium",  icon: null },
  low:     { color: "#2E7D32", bg: "#E8F5E9", label: "Low",     icon: null },
}
const pm = (p) => PRIORITY_META[String(p||"medium").toLowerCase()] || PRIORITY_META.medium

const STATUS_META = {
  pending:     { color: "#6B7280", bg: "#F3F4F6", label: "To do",       icon: <RadioButtonUnchecked sx={{ fontSize: 12 }} /> },
  in_progress: { color: "#1565C0", bg: "#E3F2FD", label: "In progress", icon: <Pending sx={{ fontSize: 12 }} /> },
  completed:   { color: "#2E7D32", bg: "#E8F5E9", label: "Done",        icon: <CheckCircleOutline sx={{ fontSize: 12 }} /> },
}
const sm = (s) => STATUS_META[s] || STATUS_META.pending

// ─── Helpers ─────────────────────────────────────────────────────────────────
function myAssignmentStatus(task, userId) {
  const id = userId?.toString?.() || String(userId)
  const row = (task.assignments || []).find((a) => {
    const eid = a?.employeeId?._id || a?.employeeId?.id || a?.employeeId
    return eid?.toString?.() === id
  })
  return row?.status || "pending"
}

function safeDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d
}

function dateKey(dateStr) {
  const d = safeDate(dateStr)
  if (!d) return "No date"
  return d.toISOString().slice(0, 10)
}

function relativeDay(dateStr) {
  const d = safeDate(dateStr)
  if (!d) return "No due date"
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((target - today) / 86400000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff <= 7) return `In ${diff}d`
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
}

function shortDate(dateStr) {
  const d = safeDate(dateStr)
  if (!d) return "No date"
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })
}

function isOverdue(dateStr, status) {
  const d = safeDate(dateStr)
  if (!d || status === "completed") return false
  return d < new Date()
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const meta = pm(priority)
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.3,
        px: 0.9, py: 0.2, borderRadius: 10,
        bgcolor: meta.bg, color: meta.color,
        fontSize: "0.67rem", fontWeight: 800, letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      {meta.icon}
      {meta.label}
    </Box>
  )
}

function StatusBadge({ status }) {
  const meta = sm(status)
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.3,
        px: 0.9, py: 0.2, borderRadius: 10,
        bgcolor: meta.bg, color: meta.color,
        fontSize: "0.67rem", fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {meta.icon}
      {meta.label}
    </Box>
  )
}

// ─── Stat mini-card ───────────────────────────────────────────────────────────
const STATS_CFG = [
  { key: "all",        label: "Total",    grad: "linear-gradient(135deg,#5B5FC7,#8B5CF6)", icon: <AssignmentTurnedIn sx={{ fontSize: 18 }} /> },
  { key: "todo",       label: "To Do",    grad: "linear-gradient(135deg,#7C3AED,#A78BFA)", icon: <RadioButtonUnchecked sx={{ fontSize: 18 }} /> },
  { key: "inProgress", label: "Active",   grad: "linear-gradient(135deg,#0284C7,#38BDF8)", icon: <Timer sx={{ fontSize: 18 }} /> },
  { key: "completed",  label: "Done",     grad: "linear-gradient(135deg,#16A34A,#4ADE80)", icon: <CheckCircle sx={{ fontSize: 18 }} /> },
  { key: "overdue",    label: "Overdue",  grad: "linear-gradient(135deg,#DC2626,#F87171)", icon: <EventBusy sx={{ fontSize: 18 }} /> },
  { key: "partial",    label: "Partial",  grad: "linear-gradient(135deg,#D97706,#FCD34D)", icon: <Pending sx={{ fontSize: 18 }} /> },
]

function StatCard({ cfg, value, active, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        borderRadius: 3,
        background: cfg.grad,
        p: 1.5, cursor: "pointer",
        boxShadow: active ? "0 4px 18px rgba(0,0,0,0.22)" : "0 2px 8px rgba(0,0,0,0.1)",
        transform: active ? "scale(1.04)" : "scale(1)",
        transition: "all .15s ease",
        border: active ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
      }}
    >
      <Box sx={{ color: "rgba(255,255,255,0.85)", mb: 0.5 }}>{cfg.icon}</Box>
      <Typography sx={{ color: "white", fontWeight: 900, fontSize: "1.4rem", lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: "0.72rem", fontWeight: 600, mt: 0.2 }}>{cfg.label}</Typography>
    </Box>
  )
}

// ─── Priority chips ───────────────────────────────────────────────────────────
const PRIORITY_CHIPS = [
  { id: "all",    label: "All",    color: "#5B5FC7", bg: "#EEEEF9" },
  { id: "urgent", label: "🚨 Urgent", color: "#E53935", bg: "#FDE8E8" },
  { id: "high",   label: "🔥 High",   color: "#F57C00", bg: "#FFF3E0" },
  { id: "medium", label: "Medium", color: "#1565C0", bg: "#E3F2FD" },
  { id: "low",    label: "Low",    color: "#2E7D32", bg: "#E8F5E9" },
]

// ─── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, userId, userName, busyId, patchAssignment, openCompleteWithReason, navigate, getPartialReason }) {
  const [expanded, setExpanded] = useState(false)
  const mine = myAssignmentStatus(task, userId)
  const reason = getPartialReason(task)
  const overdue = isOverdue(task.dueDate, mine)
  const rel = relativeDay(task.dueDate)
  const priorityMeta = pm(task.priority)
  const isBusy = busyId === task._id

  const leftBorderColor = mine === "completed"
    ? "#16A34A"
    : overdue
      ? "#DC2626"
      : mine === "in_progress"
        ? "#0284C7"
        : priorityMeta.color

  return (
    <Card
      elevation={0}
      sx={{
        mb: 1.5, borderRadius: 3,
        border: "1px solid #E8EBF4",
        borderLeft: `4px solid ${leftBorderColor}`,
        boxShadow: "0 2px 8px rgba(91,95,199,0.07)",
        bgcolor: mine === "completed" ? "#F9FFF9" : "white",
        opacity: mine === "completed" ? 0.88 : 1,
        transition: "box-shadow .2s",
      }}
    >
      {/* ── Card header ─────────────────────────────────── */}
      <Box sx={{ px: 1.8, pt: 1.5, pb: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.8 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              fontWeight={800}
              sx={{
                fontSize: "0.95rem",
                lineHeight: 1.35,
                color: mine === "completed" ? "#6B7280" : "#1A1D2E",
                textDecoration: mine === "completed" ? "line-through" : "none",
              }}
            >
              {task.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setExpanded((v) => !v)}
            sx={{ mt: -0.3, color: "#9CA3AF", flexShrink: 0 }}
          >
            {expanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
          </IconButton>
        </Box>

        {/* badges row */}
        <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={mine} />
          {overdue && (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.3, px: 0.9, py: 0.2, borderRadius: 10, bgcolor: "#FDE8E8", color: "#DC2626", fontSize: "0.67rem", fontWeight: 800 }}>
              <EventBusy sx={{ fontSize: 11 }} /> Overdue
            </Box>
          )}
          {task.sourceType === "call_assignment" && (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.3, px: 0.9, py: 0.2, borderRadius: 10, bgcolor: "#F3E8FF", color: "#7C3AED", fontSize: "0.67rem", fontWeight: 700 }}>
              <PhoneCallback sx={{ fontSize: 10 }} /> Call list
            </Box>
          )}
          {reason && mine !== "completed" && (
            <Box component="span" sx={{ px: 0.9, py: 0.2, borderRadius: 10, bgcolor: "#FFF7ED", color: "#C2410C", fontSize: "0.67rem", fontWeight: 700 }}>
              Partial
            </Box>
          )}
        </Stack>

        {/* due date + progress row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
          <CalendarToday sx={{ fontSize: 11, color: overdue ? "#DC2626" : "#9CA3AF" }} />
          <Typography
            variant="caption"
            sx={{ color: overdue ? "#DC2626" : "#9CA3AF", fontWeight: 600, fontSize: "0.72rem" }}
          >
            {rel}
          </Typography>
          {task.assignments?.length > 0 && (
            <>
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "#D1D5DB" }} />
              <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "0.72rem" }}>
                {(task.assignments || []).filter((a) => a.status === "completed").length}/{task.assignments.length} done
              </Typography>
            </>
          )}
        </Box>

        {/* thin progress bar */}
        {task.assignments?.length > 0 && (
          <LinearProgress
            variant="determinate"
            value={Math.round(((task.assignments || []).filter((a) => a.status === "completed").length / task.assignments.length) * 100)}
            sx={{
              height: 4, borderRadius: 4, mb: 1.2,
              bgcolor: "#F0F2FA",
              "& .MuiLinearProgress-bar": {
                background: mine === "completed" ? "#16A34A" : GRAD,
                borderRadius: 4,
              },
            }}
          />
        )}
      </Box>

      {/* ── Expandable body ─────────────────────────────── */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.8, pb: 1 }}>
          {task.description && (
            <Typography variant="body2" sx={{ color: "#6B7280", fontSize: "0.8rem", mb: 1, lineHeight: 1.55 }}>
              {task.description}
            </Typography>
          )}
          {reason && (
            <Box sx={{ bgcolor: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 2, px: 1.2, py: 0.8, mb: 1 }}>
              <Typography variant="caption" sx={{ color: "#C2410C", fontWeight: 700, display: "block", mb: 0.3 }}>Partial note</Typography>
              <Typography variant="caption" sx={{ color: "#92400E", fontSize: "0.75rem" }}>{reason}</Typography>
            </Box>
          )}
          {Array.isArray(task.tags) && task.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              {task.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: "0.65rem", bgcolor: "#EEF0FF", color: "#5B5FC7" }} />
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>

      {/* ── Actions ─────────────────────────────────────── */}
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
          {mine !== "in_progress" && mine !== "completed" && (
            <Button
              size="small"
              variant="contained"
              startIcon={<PlayArrow sx={{ fontSize: 13 }} />}
              disabled={isBusy}
              onClick={() => patchAssignment(task, "in_progress")}
              sx={{
                textTransform: "none", fontWeight: 700, borderRadius: 2,
                fontSize: "0.75rem", py: 0.5, px: 1.2,
                background: "linear-gradient(135deg,#0284C7,#38BDF8)",
                boxShadow: "0 2px 8px rgba(2,132,199,0.3)",
              }}
            >
              Start
            </Button>
          )}
          {mine !== "completed" && (
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckCircle sx={{ fontSize: 13 }} />}
              disabled={isBusy}
              onClick={() => patchAssignment(task, "completed")}
              sx={{
                textTransform: "none", fontWeight: 700, borderRadius: 2,
                fontSize: "0.75rem", py: 0.5, px: 1.2,
                background: "linear-gradient(135deg,#16A34A,#4ADE80)",
                boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
              }}
            >
              Done
            </Button>
          )}
          {mine !== "completed" && (
            <Button
              size="small"
              variant="outlined"
              disabled={isBusy}
              onClick={() => openCompleteWithReason(task)}
              sx={{
                textTransform: "none", fontWeight: 700, borderRadius: 2,
                fontSize: "0.75rem", py: 0.5, px: 1.2,
                borderColor: "#FCD34D", color: "#D97706",
                "&:hover": { borderColor: "#F59E0B", bgcolor: "#FFFBEB" },
              }}
            >
              + Reason
            </Button>
          )}
          {mine !== "pending" && mine !== "in_progress" && (
            <Button
              size="small"
              variant="text"
              disabled={isBusy}
              onClick={() => patchAssignment(task, "pending")}
              sx={{ textTransform: "none", color: "#9CA3AF", fontSize: "0.73rem", borderRadius: 2, py: 0.5, px: 1 }}
            >
              Reset
            </Button>
          )}
          {mine === "in_progress" && (
            <Button
              size="small"
              variant="text"
              disabled={isBusy}
              onClick={() => patchAssignment(task, "pending")}
              sx={{ textTransform: "none", color: "#9CA3AF", fontSize: "0.73rem", borderRadius: 2, py: 0.5, px: 1 }}
            >
              Pause
            </Button>
          )}
          {task.sourceType === "call_assignment" && task.callAssignmentListId && (
            <Button
              size="small"
              variant="text"
              startIcon={<PhoneCallback sx={{ fontSize: 13 }} />}
              onClick={() => navigate(`/u/call-assignment?listId=${task.callAssignmentListId}`)}
              sx={{ textTransform: "none", color: "#7C3AED", fontSize: "0.73rem", borderRadius: 2, py: 0.5, px: 1, ml: "auto" }}
            >
              Call list
            </Button>
          )}
        </Stack>
        {isBusy && <LinearProgress sx={{ mt: 0.8, borderRadius: 4, height: 3 }} />}
      </Box>
    </Card>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function EmployeeTasksMobile() {
  const navigate    = useNavigate()
  const userData    = useSelector((s) => s?.userData?.userData)
  const appUser     = useSelector((s) => s?.app?.user)
  const user        = userData || appUser || {}
  const userId      = user?._id || user?.id
  const userName    = user?.name || user?.firstName || "User"
  const initial     = (userName || "U").charAt(0).toUpperCase()
  const dept        = user?.department || user?.jobTitle || ""

  const [tasks,         setTasks]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [statusFilter,  setStatusFilter]  = useState("all")
  const [priorityFilter,setPriorityFilter]= useState("all")
  const [sourceFilter,  setSourceFilter]  = useState("all")
  const [searchText,    setSearchText]    = useState("")
  const [showFilters,   setShowFilters]   = useState(false)
  const [busyId,        setBusyId]        = useState(null)
  const [reasonOpen,    setReasonOpen]    = useState(false)
  const [reasonTask,    setReasonTask]    = useState(null)
  const [partialReason, setPartialReason] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.TASK.GET_ALL)
      const res = await instance.request({})
      if (res?.data?.status === "success") setTasks(res.data.data.tasks || [])
    } catch { Toast.error("Failed to load tasks") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const getPartialReason = useCallback((task) => {
    const id = userId?.toString?.() || String(userId)
    const comments = Array.isArray(task?.comments) ? task.comments : []
    const mine = comments.filter((c) => {
      const cid = c?.employeeId?._id || c?.employeeId
      return cid?.toString?.() === id
    }).reverse()
    const marked = mine.find((c) => String(c?.comment || "").startsWith("Partial done reason:"))
    return marked ? String(marked.comment).replace("Partial done reason:", "").trim() : ""
  }, [userId])

  // ── Stats ────────────────────────────────────────────────────────────────────
  const counts = useCallback(() => {
    let all = 0, todo = 0, inProgress = 0, completed = 0, partial = 0, overdue = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (const t of tasks) {
      all++
      const s = myAssignmentStatus(t, userId)
      if (s === "completed") completed++
      else if (s === "in_progress") inProgress++
      else todo++
      if (getPartialReason(t) && s !== "completed") partial++
      const due = safeDate(t.dueDate)
      if (due && due < today && s !== "completed") overdue++
    }
    return { all, todo, inProgress, completed, partial, overdue }
  }, [tasks, userId, getPartialReason])

  const c = counts()

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredSorted = (() => {
    const q = searchText.trim().toLowerCase()
    const out = tasks.filter((t) => {
      const s = myAssignmentStatus(t, userId)
      if (statusFilter === "todo"        && s !== "pending")       return false
      if (statusFilter === "in_progress" && s !== "in_progress")   return false
      if (statusFilter === "completed"   && s !== "completed")     return false
      if (statusFilter === "partial"     && (!getPartialReason(t) || s === "completed")) return false
      if (statusFilter === "overdue") {
        const due = safeDate(t.dueDate)
        const today = new Date(); today.setHours(0, 0, 0, 0)
        if (!due || due >= today || s === "completed") return false
      }
      if (priorityFilter !== "all" && String(t.priority || "medium").toLowerCase() !== priorityFilter) return false
      if (sourceFilter !== "all"   && String(t.sourceType || "manual").toLowerCase() !== sourceFilter) return false
      if (q) {
        const tags = Array.isArray(t.tags) ? t.tags.join(" ") : String(t.tags || "")
        const hay = `${t.title || ""} ${t.description || ""} ${tags}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    return out.sort((a, b) => {
      const ad = safeDate(a.dueDate), bd = safeDate(b.dueDate)
      if (!ad && !bd) return 0
      if (!ad) return 1
      if (!bd) return -1
      return ad - bd
    })
  })()

  const grouped = filteredSorted.reduce((acc, t) => {
    const key = dateKey(t.dueDate)
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "No date") return 1
    if (b === "No date") return -1
    return new Date(a) - new Date(b)
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const patchAssignment = async (task, next) => {
    setBusyId(task._id)
    try {
      const inst = NetworkManager(API.TASK.UPDATE_MY_ASSIGNMENT)
      const res  = await inst.request({ status: next }, { pathParams: [task._id] })
      if (res?.data?.status === "success") {
        Toast.success(next === "completed" ? "✅ Marked complete" : "Updated")
        await load()
      }
    } catch (e) { Toast.error(e?.message || "Update failed") }
    finally { setBusyId(null) }
  }

  const openCompleteWithReason = (task) => {
    setReasonTask(task)
    setPartialReason(getPartialReason(task) || "")
    setReasonOpen(true)
  }

  const submitCompleteWithReason = async () => {
    if (!reasonTask) return
    const text = partialReason.trim()
    if (!text) { Toast.error("Please enter reason"); return }
    setBusyId(reasonTask._id)
    try {
      const commentInst = NetworkManager(API.TASK.ADD_COMMENT)
      await commentInst.request(
        { employeeId: userId, name: userName, comment: `Partial done reason: ${text}`, statusUpdate: "in_progress" },
        { pathParams: [reasonTask._id] }
      )
      const updateInst = NetworkManager(API.TASK.UPDATE_MY_ASSIGNMENT)
      const res = await updateInst.request({ status: "completed" }, { pathParams: [reasonTask._id] })
      if (res?.data?.status === "success") {
        Toast.success("✅ Completed with reason")
        setReasonOpen(false); setReasonTask(null); setPartialReason("")
        await load()
      }
    } catch (e) { Toast.error(e?.response?.data?.message || e?.message || "Failed") }
    finally { setBusyId(null) }
  }

  const activeFilterCount = [
    statusFilter !== "all",
    priorityFilter !== "all",
    sourceFilter !== "all",
    searchText.trim() !== "",
  ].filter(Boolean).length

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: BG, pb: 5 }}>

      {/* ── Header ──────────────────────────────────────── */}
      <Box
        sx={{
          background: GRAD,
          px: 2, pt: 2.5, pb: 3,
          boxShadow: "0 6px 30px rgba(91,95,199,0.25)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" }, borderRadius: 2 }}
            onClick={() => navigate("/u/mobile")}
            aria-label="Back"
          >
            <ArrowBack />
          </IconButton>
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              border: "2px solid rgba(255,255,255,0.5)",
              fontWeight: 900, fontSize: "1rem",
              width: 42, height: 42,
            }}
          >
            {initial}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: "white", fontWeight: 900, fontSize: "1rem", lineHeight: 1.2 }}>
              {userName}
            </Typography>
            {dept && (
              <Typography sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.72rem", fontWeight: 500 }}>
                {dept}
              </Typography>
            )}
          </Box>
          <IconButton
            sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" }, borderRadius: 2 }}
            onClick={load}
            aria-label="Refresh"
          >
            <Refresh />
          </IconButton>
        </Stack>

        {/* My Tasks label */}
        <Box sx={{ mt: 2, mb: 0.5 }}>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: 0.2 }}>
            My Tasks
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
            {filteredSorted.length} of {c.all} task{c.all !== 1 ? "s" : ""} shown
          </Typography>
        </Box>
      </Box>

      {/* ── Stats grid (scrollable horizontal) ──────────── */}
      <Box
        sx={{
          mt: -1.5,
          px: 1.5,
          pb: 0.5,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
        }}
      >
        {STATS_CFG.map((cfg) => (
          <StatCard
            key={cfg.key}
            cfg={cfg}
            value={c[cfg.key] ?? 0}
            active={statusFilter === (cfg.key === "all" ? "all" : cfg.key === "inProgress" ? "in_progress" : cfg.key)}
            onClick={() => {
              const mapped = cfg.key === "all" ? "all" : cfg.key === "inProgress" ? "in_progress" : cfg.key
              setStatusFilter((prev) => prev === mapped ? "all" : mapped)
            }}
          />
        ))}
      </Box>

      {/* ── Filter bar ──────────────────────────────────── */}
      <Box sx={{ px: 1.5, mt: 2 }}>
        {/* Search + filter toggle */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search tasks..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "#9CA3AF" }} /></InputAdornment>,
              endAdornment: searchText && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchText("")}><Close sx={{ fontSize: 14 }} /></IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5, bgcolor: "white",
                "& fieldset": { borderColor: "#E5E7EB" },
              },
            }}
          />
          <IconButton
            onClick={() => setShowFilters((v) => !v)}
            sx={{
              bgcolor: showFilters ? "#5B5FC7" : "white",
              color: showFilters ? "white" : "#5B5FC7",
              border: "1px solid #E5E7EB",
              borderRadius: 2.5, flexShrink: 0,
            }}
          >
            <FilterList />
            {activeFilterCount > 0 && (
              <Box
                sx={{
                  position: "absolute", top: 4, right: 4,
                  width: 8, height: 8, borderRadius: "50%", bgcolor: "#E53935",
                }}
              />
            )}
          </IconButton>
        </Stack>

        {/* Priority + source chips */}
        <Collapse in={showFilters}>
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 700, letterSpacing: 0.5, mb: 0.5, display: "block" }}>
              PRIORITY
            </Typography>
            <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
              {PRIORITY_CHIPS.map((p) => {
                const active = priorityFilter === p.id
                return (
                  <Chip
                    key={p.id}
                    label={p.label}
                    size="small"
                    clickable
                    onClick={() => setPriorityFilter(active ? "all" : p.id)}
                    sx={{
                      fontWeight: 700, fontSize: "0.72rem",
                      bgcolor: active ? p.color : p.bg,
                      color: active ? "white" : p.color,
                      border: `1px solid ${active ? p.color : "transparent"}`,
                      "& .MuiChip-label": { px: 1.2 },
                    }}
                  />
                )
              })}
            </Stack>
            <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 700, letterSpacing: 0.5, mb: 0.5, display: "block" }}>
              SOURCE
            </Typography>
            <Stack direction="row" spacing={0.7} useFlexGap>
              {[
                { id: "all",             label: "All",       color: "#5B5FC7", bg: "#EEEEF9" },
                { id: "manual",          label: "Manual",    color: "#374151", bg: "#F3F4F6" },
                { id: "call_assignment", label: "📞 Call list", color: "#7C3AED", bg: "#F3E8FF" },
              ].map((s) => {
                const active = sourceFilter === s.id
                return (
                  <Chip
                    key={s.id}
                    label={s.label}
                    size="small"
                    clickable
                    onClick={() => setSourceFilter(active ? "all" : s.id)}
                    sx={{
                      fontWeight: 700, fontSize: "0.72rem",
                      bgcolor: active ? s.color : s.bg,
                      color: active ? "white" : s.color,
                      "& .MuiChip-label": { px: 1.2 },
                    }}
                  />
                )
              })}
            </Stack>
            {activeFilterCount > 0 && (
              <Button
                size="small"
                sx={{ mt: 1, textTransform: "none", color: "#9CA3AF", fontSize: "0.75rem" }}
                onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setSourceFilter("all"); setSearchText("") }}
              >
                Clear all filters ({activeFilterCount})
              </Button>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* ── Task list ────────────────────────────────────── */}
      <Box sx={{ px: 1.5, mt: 0.5 }}>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
            <CircularProgress sx={{ color: "#5B5FC7" }} />
            <Typography variant="caption" color="text.secondary">Loading tasks…</Typography>
          </Box>
        ) : filteredSorted.length === 0 ? (
          <Fade in>
            <Box
              sx={{
                textAlign: "center", py: 8,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 68, height: 68, borderRadius: "50%",
                  background: "linear-gradient(135deg,#EEF0FF,#F5F0FF)",
                  display: "grid", placeItems: "center",
                }}
              >
                <AssignmentTurnedIn sx={{ fontSize: 30, color: "#8B5CF6" }} />
              </Box>
              <Typography fontWeight={700} sx={{ color: "#374151" }}>No tasks found</Typography>
              <Typography variant="caption" color="text.secondary">
                {activeFilterCount > 0 ? "Try clearing filters" : "You have no tasks assigned"}
              </Typography>
              {activeFilterCount > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 2, textTransform: "none", mt: 0.5, borderColor: "#5B5FC7", color: "#5B5FC7" }}
                  onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setSourceFilter("all"); setSearchText("") }}
                >
                  Clear filters
                </Button>
              )}
            </Box>
          </Fade>
        ) : (
          groupKeys.map((key) => (
            <Box key={key} sx={{ mb: 2 }}>
              {/* Date section header */}
              <Box
                sx={{
                  display: "flex", alignItems: "center", gap: 1, mb: 1,
                  px: 0.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 2,
                    background: key === "No date" ? "#F3F4F6" : GRAD,
                  }}
                >
                  <CalendarToday sx={{ fontSize: 13, color: key === "No date" ? "#9CA3AF" : "white" }} />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 800, color: "#374151",
                    fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: 0.5,
                  }}
                >
                  {key === "No date" ? "No due date" : shortDate(key)}
                </Typography>
                <Box
                  sx={{
                    ml: "auto", px: 0.9, py: 0.1, borderRadius: 10,
                    bgcolor: "#EEEEF9", color: "#5B5FC7",
                    fontSize: "0.68rem", fontWeight: 800,
                  }}
                >
                  {grouped[key].length}
                </Box>
              </Box>
              {grouped[key].map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  userId={userId}
                  userName={userName}
                  busyId={busyId}
                  patchAssignment={patchAssignment}
                  openCompleteWithReason={openCompleteWithReason}
                  navigate={navigate}
                  getPartialReason={getPartialReason}
                />
              ))}
            </Box>
          ))
        )}
      </Box>

      {/* ── Complete with reason dialog ──────────────────── */}
      <Dialog
        open={reasonOpen}
        onClose={() => setReasonOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4, mx: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1rem", pb: 0.5 }}>
          ✏️ Complete with reason
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            {reasonTask?.title}
          </Typography>
          <TextField
            fullWidth multiline minRows={3} autoFocus
            label="Reason / partial notes"
            placeholder="Describe what was done partially..."
            value={partialReason}
            onChange={(e) => setPartialReason(e.target.value)}
            sx={{ mt: 0.5, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setReasonOpen(false)}
            sx={{ textTransform: "none", borderRadius: 2, color: "#6B7280" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitCompleteWithReason}
            disabled={busyId === reasonTask?._id}
            sx={{
              textTransform: "none", borderRadius: 2, fontWeight: 700,
              background: "linear-gradient(135deg,#16A34A,#4ADE80)",
              boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
            }}
          >
            {busyId === reasonTask?._id ? "Saving…" : "Save & Complete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
