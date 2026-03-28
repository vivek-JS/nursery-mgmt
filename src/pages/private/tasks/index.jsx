import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add,
  AssignmentTurnedInRounded,
  CalendarToday,
  ChevronRight,
  Close,
  ErrorOutline,
  EventBusy,
  PlaylistAddCheckCircle,
  TaskAlt,
  Timer,
} from "@mui/icons-material";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useNavigate } from "react-router-dom";

const CARD_ICON_BG = {
  total: "#E8F2FF",
  todo: "#EEF2FF",
  inProgress: "#E6F7FF",
  completed: "#EAF8EE",
  urgent: "#FDECEC",
  overdue: "#FFF5E6",
};

const priorities = ["low", "medium", "high", "urgent"];

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const getAssignmentEmployeeId = (assignment) =>
  normalizeId(assignment?.employeeId || assignment?.employee || assignment?.assignee);

const statusForAssignment = (status) => {
  if (status === "done" || status === "completed") return "done";
  if (status === "in_progress") return "in_progress";
  return "todo";
};

const priorityChipStyle = (priority) => {
  const p = String(priority || "medium").toLowerCase();
  if (p === "urgent") return { bgcolor: "#FFE8EC", color: "#E53935" };
  if (p === "high") return { bgcolor: "#FFF4E5", color: "#F57C00" };
  if (p === "low") return { bgcolor: "#E8F5E9", color: "#2E7D32" };
  return { bgcolor: "#E3F2FD", color: "#0288D1" };
};

const TaskModal = ({ open, onClose, employees, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [callLists, setCallLists] = useState([]);
  const [callListsLoading, setCallListsLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tags: "",
    assignedEmployees: [],
    sourceType: "manual",
    callAssignmentListId: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        tags: "",
        assignedEmployees: [],
        sourceType: "manual",
        callAssignmentListId: "",
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || form.sourceType !== "call_assignment") return;
    const loadLists = async () => {
      setCallListsLoading(true);
      try {
        const instance = NetworkManager(API.CALL_ASSIGNMENT.GET_LISTS);
        const res = await instance.request({});
        const listData = res?.data?.data?.lists || res?.data?.lists || [];
        setCallLists(Array.isArray(listData) ? listData : []);
      } catch (error) {
        Toast.error("Failed to load call assignment lists");
        setCallLists([]);
      } finally {
        setCallListsLoading(false);
      }
    };
    loadLists();
  }, [open, form.sourceType]);

  const toggleEmployee = (id) => {
    setForm((prev) => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.includes(id)
        ? prev.assignedEmployees.filter((e) => e !== id)
        : [...prev.assignedEmployees, id],
    }));
  };

  const submit = async () => {
    if (!form.title.trim()) return Toast.error("Title is required");
    if (!form.dueDate) return Toast.error("Deadline is required");
    if (!form.assignedEmployees.length) return Toast.error("Assign at least one employee");
    if (form.sourceType === "call_assignment" && !form.callAssignmentListId) {
      return Toast.error("Select a call assignment list");
    }

    setLoading(true);
    try {
      const instance = NetworkManager(API.TASK.CREATE);
      const response = await instance.request({
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        dueTime: "",
        priority: form.priority,
        tags: form.tags,
        assignedEmployees: form.assignedEmployees,
        sourceType: form.sourceType,
        callAssignmentListId:
          form.sourceType === "call_assignment" ? form.callAssignmentListId : null,
      });
      if (response?.data?.status === "success") {
        Toast.success("Task created");
        onSaved();
        onClose();
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, fontWeight: 800, fontSize: "1.9rem" }}>
        Create New Task
        <IconButton onClick={onClose} sx={{ position: "absolute", top: 14, right: 14 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography fontWeight={700} mb={0.75}>Title</Typography>
            <TextField
              fullWidth
              placeholder="Enter task title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </Box>

          <Box>
            <Typography fontWeight={700} mb={0.75}>Description</Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="Describe the task..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box flex={1}>
              <Typography fontWeight={700} mb={0.75}>Task Type</Typography>
              <FormControl fullWidth>
                <Select
                  value={form.sourceType}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sourceType: e.target.value,
                      callAssignmentListId: "",
                      assignedEmployees: [],
                    }))
                  }
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="call_assignment">Call assignment</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box flex={1}>
              <Typography fontWeight={700} mb={0.75}>Priority</Typography>
              <FormControl fullWidth>
                <Select
                  value={form.priority}
                  onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  {priorities.map((p) => (
                    <MenuItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box flex={1}>
              <Typography fontWeight={700} mb={0.75}>Deadline</Typography>
              <TextField
                fullWidth
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Stack>

          {form.sourceType === "call_assignment" && (
            <Box>
              <Typography fontWeight={700} mb={0.75}>Call Assignment List</Typography>
              <FormControl fullWidth>
                <Select
                  value={form.callAssignmentListId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedList = callLists.find((l) => String(l._id) === String(selectedId));
                    const assignedToId =
                      selectedList?.assignedTo?._id ||
                      selectedList?.assignedTo?.id ||
                      selectedList?.assignedTo;
                    setForm((p) => ({
                      ...p,
                      callAssignmentListId: selectedId,
                      assignedEmployees: assignedToId ? [String(assignedToId)] : [],
                    }));
                  }}
                  displayEmpty
                >
                  <MenuItem value="">Select list</MenuItem>
                  {callLists.map((l) => (
                    <MenuItem key={l._id} value={String(l._id)}>
                      {l.name} - {l.assignedTo?.name || "Unassigned"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {callListsLoading && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                  Loading lists...
                </Typography>
              )}
            </Box>
          )}

          <Box>
            <Typography fontWeight={700} mb={0.75}>Tags (comma separated)</Typography>
            <TextField
              fullWidth
              placeholder="frontend, design, urgent"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
            />
          </Box>

          <Box>
            <Typography fontWeight={700} mb={0.75}>Assign to Employees</Typography>
            {form.sourceType === "call_assignment" ? (
              <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
                For call-assignment tasks, assignee comes from the selected call list.
              </Alert>
            ) : (
              <Box
                sx={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 2,
                  p: 1,
                  maxHeight: 210,
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 0.5,
                }}
              >
                {employees.map((emp) => (
                  <Box
                    key={emp._id || emp.id}
                    onClick={() => toggleEmployee(emp._id || emp.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 1.5,
                      px: 0.5,
                      py: 0.25,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#F9FAFB" },
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.25}>
                      <Checkbox checked={form.assignedEmployees.includes(emp._id || emp.id)} />
                      <Typography fontWeight={600}>{emp.name}</Typography>
                    </Box>
                    <Typography color="text.secondary">{emp.department || emp.designation || "-"}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Button
            variant="contained"
            disabled={loading}
            onClick={submit}
            sx={{ textTransform: "none", minHeight: 46, fontSize: "1rem", borderRadius: 2, mt: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Create & Assign Task"}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

const TaskManagement = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [drawerEmployee, setDrawerEmployee] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE);
      const response = await instance.request({});
      setEmployees(response?.data?.data || []);
    } catch (error) {
      Toast.error("Failed to load employees");
    }
  };

  const fetchStats = async () => {
    try {
      const instance = NetworkManager(API.TASK.STATS);
      const response = await instance.request({});
      if (response?.data?.status === "success") {
        setStats(response?.data?.data || null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.TASK.GET_ALL);
      const response = await instance.request({});
      if (response?.data?.status === "success") {
        setTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      Toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
    fetchStats();
  }, []);

  const cards = useMemo(() => {
    const fallback = {
      total: tasks.length,
      todo: 0,
      inProgress: 0,
      completed: 0,
      urgent: 0,
      overdue: 0,
    };
    if (stats) return stats;
    tasks.forEach((task) => {
      if ((task.priority || "").toLowerCase() === "urgent") fallback.urgent += 1;
      if (task.dueDate && new Date(task.dueDate) < new Date()) fallback.overdue += 1;
      const statuses = (task.assignments || []).map((a) => statusForAssignment(a.status));
      if (!statuses.length || statuses.includes("todo")) fallback.todo += 1;
      if (statuses.includes("in_progress")) fallback.inProgress += 1;
      if (statuses.length && statuses.every((s) => s === "done")) fallback.completed += 1;
    });
    return fallback;
  }, [stats, tasks]);

  const list = useMemo(() => {
    let output = tasks;
    if (taskFilter !== "all") {
      output = output.filter((t) => {
        const statuses = (t.assignments || []).map((a) => statusForAssignment(a.status));
        if (taskFilter === "todo") return statuses.includes("todo") || !statuses.length;
        if (taskFilter === "in_progress") return statuses.includes("in_progress");
        if (taskFilter === "done") return statuses.length && statuses.every((s) => s === "done");
        return true;
      });
    }
    if (priorityFilter !== "all") {
      output = output.filter((t) => String(t.priority || "medium").toLowerCase() === priorityFilter);
    }
    if (sourceFilter !== "all") {
      output = output.filter(
        (t) => String(t.sourceType || "manual").toLowerCase() === sourceFilter
      );
    }
    const q = taskSearch.trim().toLowerCase();
    if (q) {
      output = output.filter((t) => {
        const tags = Array.isArray(t.tags) ? t.tags.join(", ") : (t.tags || "");
        return (
          String(t.title || "").toLowerCase().includes(q) ||
          String(t.description || "").toLowerCase().includes(q) ||
          String(tags).toLowerCase().includes(q)
        );
      });
    }
    return output;
  }, [tasks, taskFilter, priorityFilter, sourceFilter, taskSearch]);

  const drawerTasks = useMemo(() => {
    if (!drawerEmployee) return [];
    const targetId = normalizeId(drawerEmployee._id || drawerEmployee.id);
    return tasks
      .filter((t) =>
        (t.assignments || []).some(
          (a) => getAssignmentEmployeeId(a) === targetId
        )
      )
      .sort((a, b) => {
        const da = a?.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b?.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
  }, [tasks, drawerEmployee]);

  const employeeStats = (employeeId) => {
    const targetId = normalizeId(employeeId);
    const related = tasks.filter((t) =>
      (t.assignments || []).some((a) => getAssignmentEmployeeId(a) === targetId)
    );
    let active = 0;
    let done = 0;
    related.forEach((t) => {
      const row = (t.assignments || []).find((a) => getAssignmentEmployeeId(a) === targetId);
      const s = statusForAssignment(row?.status);
      if (s === "done") done += 1;
      if (s === "in_progress") active += 1;
    });
    return { total: related.length, active, done };
  };

  const visibleMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return employees.filter((emp) => {
      const es = employeeStats(emp._id || emp.id);
      if (es.total === 0) return false; // show only assigned members
      if (!q) return true;
      return String(emp.name || "").toLowerCase().includes(q);
    });
  }, [employees, tasks, memberSearch]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F8FAFC" }}>
      <Box sx={{ borderBottom: "1px solid #E5E7EB", bgcolor: "white", position: "sticky", top: 0, zIndex: 20 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto", px: { xs: 2, md: 3 }, py: 1.8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: "#1E64D8", color: "white", display: "grid", placeItems: "center" }}>
              <AssignmentTurnedInRounded fontSize="small" />
            </Box>
            <Box>
              <Typography fontWeight={800} fontSize="1.15rem">Task Manager</Typography>
              <Typography variant="caption" color="text.secondary">ERP · Real-time Task Tracking</Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: "none", borderRadius: 2, px: 2.25, py: 1, fontWeight: 700 }}
          >
            Create Task
          </Button>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: "auto", p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(6,1fr)" }, gap: 1.5, mb: 2.5 }}>
          {[
            { key: "total", label: "Total Tasks", icon: <AssignmentTurnedInRounded fontSize="small" /> },
            { key: "todo", label: "To Do", icon: <PlaylistAddCheckCircle fontSize="small" /> },
            { key: "inProgress", label: "In Progress", icon: <Timer fontSize="small" /> },
            { key: "completed", label: "Completed", icon: <TaskAlt fontSize="small" /> },
            { key: "urgent", label: "Urgent", icon: <ErrorOutline fontSize="small" /> },
            { key: "overdue", label: "Overdue", icon: <EventBusy fontSize="small" /> },
          ].map((it) => (
            <Card key={it.key} sx={{ borderRadius: 3, boxShadow: 0, border: "1px solid #E5E7EB" }}>
              <CardContent sx={{ p: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: CARD_ICON_BG[it.key], color: "#1E64D8", mb: 1 }}>
                  {it.icon}
                </Box>
                <Typography fontWeight={800} fontSize="1.35rem">{cards?.[it.key] ?? 0}</Typography>
                <Typography color="text.secondary" fontWeight={600} fontSize="0.82rem">{it.label}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 0, border: "1px solid #E5E7EB" }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography fontWeight={800} fontSize="1.05rem">All Tasks</Typography>
                <Stack direction="row" spacing={0.75}>
                  {["all", "todo", "in_progress", "done"].map((s) => (
                    <Button
                      key={s}
                      size="small"
                      variant={taskFilter === s ? "contained" : "text"}
                      onClick={() => setTaskFilter(s)}
                      sx={{ textTransform: "none", borderRadius: 2, minWidth: 64, fontWeight: 700 }}
                    >
                      {s === "all" ? "All" : s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done"}
                    </Button>
                  ))}
                </Stack>
              </Box>
              <Box sx={{ px: 2, pb: 1.25 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search tasks by title, description, tag..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="all">All priorities</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <Select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="all">All sources</MenuItem>
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="call_assignment">Call assignment</MenuItem>
                    </Select>
                  </FormControl>
                  <Chip
                    clickable
                    color={priorityFilter === "urgent" ? "error" : "default"}
                    label={`Urgent ${cards?.urgent ?? 0}`}
                    onClick={() =>
                      setPriorityFilter((prev) => (prev === "urgent" ? "all" : "urgent"))
                    }
                    sx={{ alignSelf: { xs: "flex-start", sm: "center" }, fontWeight: 700 }}
                  />
                </Stack>
              </Box>
              <Divider />

              {loading ? (
                <Box py={6} display="flex" justifyContent="center"><CircularProgress /></Box>
              ) : list.length === 0 ? (
                <Box p={2}><Alert severity="info">No tasks found.</Alert></Box>
              ) : (
                list.map((task) => {
                  const doneCount = (task.assignments || []).filter((a) => statusForAssignment(a.status) === "done").length;
                  const totalCount = task.assignments?.length || 0;
                  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
                  const dueObj = task?.dueDate ? new Date(task.dueDate) : null;
                  const isOverdue = dueObj && !Number.isNaN(dueObj.getTime()) && dueObj < new Date() && pct < 100;
                  const taskStatus =
                    pct === 100 ? "Done" : pct > 0 ? "In Progress" : "To Do";
                  return (
                    <Box key={task._id} sx={{ p: 1.5, borderBottom: "1px solid #F1F5F9" }}>
                      <Box display="flex" alignItems="center" gap={0.75} mb={0.35} flexWrap="wrap">
                        <Typography fontWeight={700} fontSize="0.95rem">{task.title}</Typography>
                        <Chip
                          size="small"
                          label={String(task.priority || "medium").toUpperCase()}
                          sx={{ ...priorityChipStyle(task.priority), fontWeight: 700, borderRadius: 6 }}
                        />
                        <Chip
                          size="small"
                          label={taskStatus}
                          color={taskStatus === "Done" ? "success" : taskStatus === "In Progress" ? "primary" : "default"}
                          sx={{ height: 20 }}
                        />
                        {isOverdue && (
                          <Chip size="small" color="error" label="Overdue" sx={{ height: 20 }} />
                        )}
                        {task.sourceType === "call_assignment" && (
                          <Chip size="small" color="secondary" variant="outlined" label="Call Assignment" sx={{ height: 20 }} />
                        )}
                      </Box>
                      <Typography color="text.secondary" fontSize="0.8rem" mb={0.8}>
                        {task.description || "No description"}
                      </Typography>

                      <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
                        <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
                          <CalendarToday sx={{ fontSize: 14 }} />
                          <Typography fontSize="0.78rem">{task.dueDate || "-"}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Assignees: {totalCount}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {(task.assignedEmployees || []).slice(0, 3).map((emp, idx) => (
                            <Avatar key={emp._id || idx} sx={{ width: 22, height: 22, fontSize: "1rem", bgcolor: "#EEF2FF", color: "#1E64D8" }}>
                              {(emp?.name || emp || "U").slice(0, 2).toUpperCase()}
                            </Avatar>
                          ))}
                        </Stack>
                        <Box ml="auto" minWidth={120} display="flex" alignItems="center" gap={1}>
                          <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 6, borderRadius: 99 }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>{doneCount}/{totalCount}</Typography>
                        </Box>
                        {task.sourceType === "call_assignment" && task.callAssignmentListId && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => navigate(`/u/call-assignment?listId=${task.callAssignmentListId}`)}
                            sx={{ textTransform: "none", ml: "auto", mt: 0.5 }}
                          >
                            Open call list
                          </Button>
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, boxShadow: 0, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: "1px solid #EEF2F7" }}>
              <Typography fontWeight={800} fontSize="1.05rem">Team Members</Typography>
              <Typography color="text.secondary" fontSize="0.8rem">Click to view employee&apos;s tasks</Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search team member..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                sx={{ mt: 1.25 }}
              />
            </Box>
            <Box>
              {visibleMembers.map((emp) => {
                const es = employeeStats(emp._id || emp.id);
                return (
                  <Box
                    key={emp._id || emp.id}
                    onClick={() => {
                      setDrawerEmployee(emp);
                      setDrawerOpen(true);
                    }}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: "1px solid #F1F5F9",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#FAFBFD" },
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                    }}
                  >
                    <Avatar sx={{ width: 34, height: 34, bgcolor: "#EFF6FF", color: "#1E64D8", fontWeight: 700 }}>
                      {(emp.name || "U").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={700} noWrap>{emp.name}</Typography>
                      <Typography color="text.secondary" fontSize="0.78rem" noWrap>{emp.department || emp.designation || "-"}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1.1} alignItems="center">
                      <Typography variant="caption" color="text.secondary">{es.total} tasks</Typography>
                      <Typography variant="caption" color="#03A9F4" fontWeight={700}>{es.active} active</Typography>
                      <Typography variant="caption" color="#4CAF50" fontWeight={700}>{es.done} done</Typography>
                      <ChevronRight sx={{ fontSize: 16, color: "#9CA3AF" }} />
                    </Stack>
                  </Box>
                );
              })}
              {visibleMembers.length === 0 && (
                <Box sx={{ p: 2 }}>
                  <Alert severity="info">No assigned team member found.</Alert>
                </Box>
              )}
            </Box>
          </Card>
        </Box>
      </Box>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 380 }, p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography fontWeight={800} fontSize="1.05rem">
              {drawerEmployee?.name || "Employee"} Tasks
            </Typography>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {drawerEmployee?.department || drawerEmployee?.designation || "-"}
          </Typography>
          <Divider sx={{ my: 1.5 }} />

          {drawerTasks.length === 0 ? (
            <Alert severity="info" sx={{ fontSize: "0.8rem" }}>
              No tasks assigned.
            </Alert>
          ) : (
            <Stack spacing={1.25}>
              {drawerTasks.map((task) => {
                const row = (task.assignments || []).find(
                  (a) =>
                    getAssignmentEmployeeId(a) ===
                    normalizeId(drawerEmployee?._id || drawerEmployee?.id)
                );
                const state = statusForAssignment(row?.status);
                return (
                  <Card key={task._id} sx={{ boxShadow: 0, border: "1px solid #E5E7EB" }}>
                    <CardContent sx={{ p: 1.2 }}>
                      <Typography fontWeight={700} fontSize="0.9rem" mb={0.4}>
                        {task.title}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" mb={0.6} flexWrap="wrap" useFlexGap>
                        <Chip
                          size="small"
                          label={String(task.priority || "medium").toUpperCase()}
                          sx={{ ...priorityChipStyle(task.priority), fontWeight: 700, borderRadius: 6 }}
                        />
                        <Chip
                          size="small"
                          label={state === "done" ? "Done" : state === "in_progress" ? "In Progress" : "To Do"}
                          color={state === "done" ? "success" : state === "in_progress" ? "primary" : "default"}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Due: {task.dueDate || "-"}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </Drawer>

      <TaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        employees={employees}
        onSaved={async () => {
          await fetchTasks();
          await fetchStats();
        }}
      />
    </Box>
  );
};

export default TaskManagement;







