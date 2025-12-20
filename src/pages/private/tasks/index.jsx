import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Paper,
  Divider,
  Tooltip,
  CircularProgress,
  Alert,
  Fade,
  Slide,
  Grow,
  Zoom,
  Grid,
  Avatar,
  AvatarGroup,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { format } from "date-fns";
import { useLanguage } from "contexts/LanguageContext";
import { getTranslation } from "translations/taskTranslations";

const getPriorityColor = (priority) => {
  const colors = {
    low: "info",
    medium: "warning",
    high: "error",
    urgent: "error",
  };
  return colors[priority] || "default";
};

const getStatusColor = (status) => {
  const colors = {
    pending: "warning",
    in_progress: "info",
    completed: "success",
    cancelled: "default",
  };
  return colors[status] || "default";
};

const TaskCard = ({ task, onEdit, onDelete, onViewDetails, t }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Grow in={true} timeout={500}>
      <Card
        sx={{
          mb: 2,
          borderRadius: 3,
          boxShadow: 2,
          transition: "all 0.3s ease",
          "&:hover": {
            boxShadow: 6,
            transform: "translateY(-4px)",
          },
          background: "linear-gradient(135deg, #ffffff 0%, #f5f7fa 100%)",
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={600} mb={1}>
                {task.title}
              </Typography>
              {task.description && (
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  {task.description}
                </Typography>
              )}
              <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                <Chip
                  label={task.priority}
                  color={getPriorityColor(task.priority)}
                  size="small"
                  icon={<FlagIcon />}
                  sx={{ fontWeight: 600, textTransform: "capitalize" }}
                />
                <Chip
                  label={task.status}
                  color={getStatusColor(task.status)}
                  size="small"
                  sx={{ fontWeight: 600, textTransform: "capitalize" }}
                />
              </Box>
            </Box>
            <Box display="flex" gap={0.5}>
              <Tooltip title={t("edit")}>
                <IconButton
                  size="small"
                  onClick={() => onEdit(task)}
                  sx={{
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.2) rotate(15deg)",
                      color: "primary.main",
                    },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("delete")}>
                <IconButton
                  size="small"
                  onClick={() => onDelete(task)}
                  sx={{
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.2)",
                      color: "error.main",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box display="flex" flexWrap="wrap" gap={2} mb={1.5}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="body2">{task.dueDate}</Typography>
            </Box>
            {task.dueTime && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="body2">{task.dueTime}</Typography>
              </Box>
            )}
            <Box display="flex" alignItems="center" gap={0.5}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {task.assignedEmployees?.length || 0} {t("assignedEmployees")}
              </Typography>
            </Box>
            {task.comments?.length > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <CommentIcon fontSize="small" color="action" />
                <Typography variant="body2">{task.comments.length} {t("comments")}</Typography>
              </Box>
            )}
          </Box>

          {task.assignedEmployees && task.assignedEmployees.length > 0 && (
            <Box mb={1.5}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                {t("assignedTo")}:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {task.assignedEmployees.slice(0, 3).map((emp) => (
                  <Chip
                    key={emp._id || emp}
                    label={emp.name || emp}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.7rem" }}
                  />
                ))}
                {task.assignedEmployees.length > 3 && (
                  <Chip
                    label={`+${task.assignedEmployees.length - 3} more`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.7rem" }}
                  />
                )}
              </Box>
            </Box>
          )}

          <Button
            variant="outlined"
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ mt: 1, textTransform: "none" }}
          >
            {expanded ? t("close") : t("viewDetails")}
          </Button>

          {expanded && (
            <Box mt={2}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                {t("comments")} ({task.comments?.length || 0})
              </Typography>
              {task.comments && task.comments.length > 0 ? (
                <Box>
                  {task.comments.map((comment, idx) => (
                    <Paper key={idx} sx={{ p: 1.5, mb: 1, bgcolor: "grey.50" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {comment.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {comment.comment}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(comment.createdAt), "MMM dd, yyyy HH:mm")}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("noComments")}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Grow>
  );
};

const CreateTaskModal = ({ open, onClose, onSuccess, employees, task, t }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: null,
    dueTime: "",
    priority: "medium",
    assignedEmployees: [],
  });
  const [loading, setLoading] = useState(false);
  const [taskSuggestions, setTaskSuggestions] = useState([]);

  // Load task suggestions from localStorage
  useEffect(() => {
    if (!task && open) {
      const stored = localStorage.getItem("taskSuggestions");
      if (stored) {
        try {
          const suggestions = JSON.parse(stored);
          setTaskSuggestions(suggestions);
        } catch (e) {
          console.error("Error loading task suggestions:", e);
        }
      }
    }
  }, [open, task]);

  // Save task template to localStorage
  const saveTaskTemplate = (title, description) => {
    if (!title || !title.trim()) return;
    
    const stored = localStorage.getItem("taskSuggestions");
    let suggestions = stored ? JSON.parse(stored) : [];
    
    // Check if this title already exists
    const existingIndex = suggestions.findIndex(s => s.title.toLowerCase() === title.toLowerCase());
    
    const template = {
      title: title.trim(),
      description: description?.trim() || "",
      lastUsed: new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      // Update existing suggestion
      suggestions[existingIndex] = template;
    } else {
      // Add new suggestion
      suggestions.push(template);
    }
    
    // Sort by lastUsed (most recent first) and limit to 20
    suggestions.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
    suggestions = suggestions.slice(0, 20);
    
    localStorage.setItem("taskSuggestions", JSON.stringify(suggestions));
    setTaskSuggestions(suggestions);
  };

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        dueTime: task.dueTime || "",
        priority: task.priority || "medium",
        assignedEmployees: task.assignedEmployees || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        dueDate: null,
        dueTime: "",
        priority: "medium",
        assignedEmployees: [],
      });
    }
  }, [task, open]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.dueDate) {
      Toast.error(t("titleRequired") + " & " + t("dueDateRequired"));
      return;
    }

    if (formData.assignedEmployees.length === 0) {
      Toast.error(t("atLeastOneEmployee"));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: format(formData.dueDate, "yyyy-MM-dd"),
        dueTime: formData.dueTime || "",
        priority: formData.priority,
        assignedEmployees: formData.assignedEmployees.map((emp) =>
          typeof emp === "object" ? emp._id : emp
        ),
      };

      let response;
      if (task) {
        const instance = NetworkManager(API.TASK.UPDATE);
        response = await instance.request(payload, [task._id]);
      } else {
        const instance = NetworkManager(API.TASK.CREATE);
        response = await instance.request(payload);
      }

      if (response?.data?.status === "success") {
        Toast.success(task ? t("taskUpdated") : t("taskCreated"));
        
        // Save task template for future suggestions (only for new tasks)
        if (!task && formData.title) {
          saveTaskTemplate(formData.title, formData.description);
        }
        
        onSuccess();
        onClose();
      }
    } catch (error) {
      Toast.error(
        error?.response?.data?.message || (task ? t("failedToUpdate") : t("failedToCreate"))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
        {task ? t("editTask") : t("createTask")}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Autocomplete
            freeSolo
            options={taskSuggestions}
            getOptionLabel={(option) => typeof option === "string" ? option : option.title}
            value={formData.title}
            onInputChange={(event, newInputValue) => {
              setFormData({ ...formData, title: newInputValue });
            }}
            onChange={(event, newValue) => {
              if (newValue && typeof newValue === "object") {
                setFormData({
                  ...formData,
                  title: newValue.title,
                  description: newValue.description || "",
                });
              } else if (typeof newValue === "string") {
                setFormData({ ...formData, title: newValue });
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                label={t("title")}
                required
                sx={{ borderRadius: 2 }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {option.title}
                </Typography>
                {option.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {option.description}
                  </Typography>
                )}
              </Box>
            )}
            filterOptions={(options, { inputValue }) => {
              if (!inputValue) return options;
              const lowerInput = inputValue.toLowerCase();
              return options.filter(
                (option) =>
                  option.title.toLowerCase().includes(lowerInput) ||
                  (option.description && option.description.toLowerCase().includes(lowerInput))
              );
            }}
          />

          <TextField
            fullWidth
            label={t("description")}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ borderRadius: 2 }}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("dueDate")}
              value={formData.dueDate}
              onChange={(date) => setFormData({ ...formData, dueDate: date })}
              renderInput={(params) => <TextField {...params} fullWidth required sx={{ borderRadius: 2 }} />}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            label={t("dueTime")}
            type="time"
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ borderRadius: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>{t("priority")}</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              label={t("priority")}
            >
              <MenuItem value="low">{t("low")}</MenuItem>
              <MenuItem value="medium">{t("medium")}</MenuItem>
              <MenuItem value="high">{t("high")}</MenuItem>
              <MenuItem value="urgent">{t("urgent")}</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            multiple
            options={employees}
            getOptionLabel={(option) => option.name || option}
            value={formData.assignedEmployees}
            onChange={(event, newValue) => {
              setFormData({ ...formData, assignedEmployees: newValue });
            }}
            renderInput={(params) => (
              <TextField {...params} label={t("assignedEmployees")} required />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name || option}
                  {...getTagProps({ index })}
                  key={option._id || option}
                />
              ))
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2, textTransform: "none", px: 3 }}>
          {t("cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            px: 3,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "&:hover": {
              transform: "scale(1.05)",
            },
          }}
        >
          {task ? t("update") : t("create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TaskManagement = () => {
  const { language } = useLanguage();
  const t = (key) => getTranslation(key, language);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  const fetchEmployees = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE);
      const response = await instance.request({});
      setEmployees(response?.data?.data || []);
    } catch (error) {
      Toast.error(t("failedToFetchEmployees"));
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const instance = NetworkManager(API.TASK.GET_ALL);
      const response = await instance.request(params);
      if (response?.data?.status === "success") {
        setTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      Toast.error(t("failedToFetchTasks"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setEditModalOpen(true);
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    try {
      const instance = NetworkManager(API.TASK.DELETE);
      const response = await instance.request({}, [task._id]);
      if (response?.data?.status === "success") {
        Toast.success(t("taskDeleted"));
        fetchTasks();
      }
    } catch (error) {
      Toast.error(t("failedToDelete"));
    }
  };

  const handleViewDetails = (task) => {
    // Could open a detailed view modal here
    console.log("View details for task:", task);
  };

  const filteredTasks = tasks;

  return (
    <Fade in={true} timeout={500}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="h4" fontWeight={700} sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {t("taskManagement")}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
            {t("createTask")}
          </Button>
        </Box>

        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t("filterByStatus")}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label={t("filterByStatus")}
                  >
                    <MenuItem value="">{t("allStatuses")}</MenuItem>
                    <MenuItem value="pending">{t("pending")}</MenuItem>
                    <MenuItem value="in_progress">{t("inProgress")}</MenuItem>
                    <MenuItem value="completed">{t("completed")}</MenuItem>
                    <MenuItem value="cancelled">{t("cancelled")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t("filterByPriority")}</InputLabel>
                  <Select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    label={t("filterByPriority")}
                  >
                    <MenuItem value="">{t("allPriorities")}</MenuItem>
                    <MenuItem value="low">{t("low")}</MenuItem>
                    <MenuItem value="medium">{t("medium")}</MenuItem>
                    <MenuItem value="high">{t("high")}</MenuItem>
                    <MenuItem value="urgent">{t("urgent")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : filteredTasks.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {t("noTasks")}
          </Alert>
        ) : (
          <Box>
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                t={t}
              />
            ))}
          </Box>
        )}

        <CreateTaskModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={fetchTasks}
          employees={employees}
          t={t}
        />

        <CreateTaskModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingTask(null);
          }}
          onSuccess={fetchTasks}
          employees={employees}
          task={editingTask}
          t={t}
        />
      </Box>
    </Fade>
  );
};

export default TaskManagement;



