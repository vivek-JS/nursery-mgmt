import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Grid,
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
  InputAdornment,
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
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  WhatsApp as WhatsAppIcon,
  Language as LanguageIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { format } from "date-fns";
import { useLanguage } from "contexts/LanguageContext";
import { getTranslation } from "translations/followUpTranslations";
import { getTranslation as getTaskTranslation } from "translations/taskTranslations";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const getStatusColor = (status) => {
  const colors = {
    pending: "warning",
    completed: "success",
    incomplete: "error",
    not_done: "default",
  };
  return colors[status] || "default";
};

const getPriorityColor = (priority) => {
  const colors = {
    low: "info",
    medium: "warning",
    high: "error",
    urgent: "error",
  };
  return colors[priority] || "default";
};

const FollowUpCard = ({ followUp, onEdit, onCopyLink, onShareWhatsApp, baseUrl, employeeId, t }) => (
  <Grow in={true} timeout={500}>
    <Card
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: 2,
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-2px)",
        },
      }}
    >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
        <Typography variant="h6" fontWeight={600}>
          {followUp.title}
        </Typography>
        <Box display="flex" gap={1}>
          <Chip
            label={followUp.status}
            color={getStatusColor(followUp.status)}
            size="small"
            sx={{
              fontWeight: 600,
              textTransform: "capitalize",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
              }
            }}
          />
          <Chip
            label={followUp.priority}
            color={getPriorityColor(followUp.priority)}
            size="small"
            icon={<FlagIcon />}
            sx={{
              fontWeight: 600,
              textTransform: "capitalize",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
              }
            }}
          />
        </Box>
      </Box>
      {followUp.description && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {followUp.description}
        </Typography>
      )}
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <CalendarIcon fontSize="small" color="action" />
          <Typography variant="body2">{followUp.followUpDate}</Typography>
        </Box>
        {followUp.dueTime && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="body2">{followUp.dueTime}</Typography>
          </Box>
        )}
      </Box>
      <Divider sx={{ my: 1 }} />
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          {t("created")}: {format(new Date(followUp.createdAt), "MMM dd, yyyy")}
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title={t("edit")}>
            <IconButton 
              size="small" 
              onClick={() => onEdit(followUp)}
              sx={{
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.2) rotate(15deg)",
                  color: "primary.main",
                }
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("copyLink")}>
            <IconButton 
              size="small" 
              onClick={() => onCopyLink(followUp.publicLink)}
              sx={{
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.2)",
                  color: "info.main",
                }
              }}
            >
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("shareWhatsApp")}>
            <IconButton 
              size="small" 
              onClick={() => onShareWhatsApp(followUp.publicLink, followUp.title, employeeId)}
              sx={{ 
                color: "#25D366",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.2) rotate(-15deg)",
                  color: "#128C7E",
                  backgroundColor: "rgba(37, 211, 102, 0.1)",
                }
              }}
            >
              <WhatsAppIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </CardContent>
  </Card>
  </Grow>
);

const CreateFollowUpModal = ({ open, onClose, employeeId, onSuccess, t }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    followUpDate: null,
    dueTime: "",
    priority: "medium",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title || !formData.followUpDate) {
      Toast.error("Title and date are required");
      return;
    }

    setLoading(true);
    try {
      const instance = NetworkManager(API.FOLLOW_UP.CREATE);
      const response = await instance.request(
        {
          title: formData.title,
          description: formData.description,
          followUpDate: format(formData.followUpDate, "yyyy-MM-dd"),
          dueTime: formData.dueTime,
          priority: formData.priority,
        },
        [employeeId]
      );

      if (response?.data?.status === "success") {
        Toast.success(t("followUpCreated"));
        onSuccess();
        onClose();
        setFormData({
          title: "",
          description: "",
          followUpDate: null,
          dueTime: "",
          priority: "medium",
        });
      } else {
        Toast.error(response?.data?.message || t("failedToCreate"));
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || t("failedToCreate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        fontWeight: 600
      }}>
        {t("createFollowUp")}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label={t("title")}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t("description")}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("followUpDate")}
              value={formData.followUpDate}
              onChange={(date) => setFormData({ ...formData, followUpDate: date })}
              renderInput={(params) => (
                <TextField {...params} fullWidth margin="normal" required />
              )}
            />
          </LocalizationProvider>
          <TextField
            fullWidth
            label={t("time")}
            type="time"
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
          />
          <FormControl fullWidth margin="normal">
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button 
          onClick={onClose}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            px: 3,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
            }
          }}
        >
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
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
            },
            "&:disabled": {
              background: "rgba(0,0,0,0.12)",
            }
          }}
        >
          {t("create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditFollowUpModal = ({ open, onClose, followUp, employeeId, onSuccess, t }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    followUpDate: "",
    dueTime: "",
    priority: "medium",
    status: "pending",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (followUp) {
      setFormData({
        title: followUp.title || "",
        description: followUp.description || "",
        followUpDate: followUp.followUpDate || "",
        dueTime: followUp.dueTime || "",
        priority: followUp.priority || "medium",
        status: followUp.status || "pending",
      });
    }
  }, [followUp]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.followUpDate) {
      Toast.error("Title and date are required");
      return;
    }

    setLoading(true);
    try {
      const instance = NetworkManager(API.FOLLOW_UP.UPDATE);
      const response = await instance.request(
        {
          title: formData.title,
          description: formData.description,
          followUpDate: formData.followUpDate,
          dueTime: formData.dueTime,
          priority: formData.priority,
          status: formData.status,
        },
        [employeeId, followUp._id]
      );

      if (response?.data?.status === "success") {
        Toast.success(t("statusUpdated"));
        onSuccess();
        onClose();
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || t("failedToUpdate"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        color: "white",
        fontWeight: 600
      }}>
        {t("edit")} {t("followUp")}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label={t("title")}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label={t("description")}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label={t("followUpDate")}
            type="date"
            value={formData.followUpDate}
            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            fullWidth
            label={t("time")}
            type="time"
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 300 }}
          />
          <FormControl fullWidth margin="normal">
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
          <FormControl fullWidth margin="normal">
            <InputLabel>{t("status")}</InputLabel>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              label={t("status")}
            >
              <MenuItem value="pending">{t("pending")}</MenuItem>
              <MenuItem value="completed">{t("completed")}</MenuItem>
              <MenuItem value="incomplete">{t("incomplete")}</MenuItem>
              <MenuItem value="not_done">{t("notDone")}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button 
          onClick={onClose}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            px: 3,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
            }
          }}
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <EditIcon />}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            px: 3,
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: "0 4px 12px rgba(240, 147, 251, 0.4)",
            },
            "&:disabled": {
              background: "rgba(0,0,0,0.12)",
            }
          }}
        >
          {t("update")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FollowUpManagement = () => {
  const { language } = useLanguage();
  const t = (key) => getTranslation(key, language);
  const tt = (key) => getTaskTranslation(key, language);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [groupedFollowUps, setGroupedFollowUps] = useState({});
  const [tasks, setTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [viewTab, setViewTab] = useState(0); // 0: List, 1: Analytics
  const [typeTab, setTypeTab] = useState(0); // 0: Follow-ups, 1: Tasks

  const fetchEmployees = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE);
      const response = await instance.request({});
      setEmployees(response?.data?.data || []);
    } catch (error) {
      Toast.error(t("failedToFetchEmployees"));
    }
  };

  const fetchAllFollowUps = async () => {
    try {
      const instance = NetworkManager(API.FOLLOW_UP.GET_ALL_FOLLOW_UPS);
      const response = await instance.request({});
      if (response?.data?.status === "success") {
        const currentBaseUrl = baseUrl || window.location.origin;
        const followUpsWithLinks = (response.data.data.followUps || []).map((followUp) => ({
          ...followUp,
          publicLink: `${currentBaseUrl}/follow-up/${followUp.publicToken}`,
          employeeId: followUp.employeeId || followUp.employee_id,
        }));
        setAllFollowUps(followUpsWithLinks);
        setAnalytics(response.data.data.analytics);
      }
    } catch (error) {
      console.error("Error fetching all follow-ups:", error);
    }
  };

  const fetchTasks = async (employeeId) => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.TASK.GET_ALL);
      const response = await instance.request({}, [], { employeeId });
      if (response?.data?.status === "success") {
        setTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      Toast.error(tt("failedToFetch") || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTasks = async () => {
    try {
      const instance = NetworkManager(API.TASK.GET_ALL);
      const response = await instance.request({});
      if (response?.data?.status === "success") {
        setTasks(response.data.data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching all tasks:", error);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const instance = NetworkManager(API.TASK.CREATE);
      const response = await instance.request(taskData);
      if (response?.data?.status === "success") {
        Toast.success(tt("taskCreated") || "Task created successfully");
        if (selectedEmployee) {
          fetchTasks(selectedEmployee._id);
        } else {
          fetchAllTasks();
        }
        setCreateTaskModalOpen(false);
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || (tt("failedToCreate") || "Failed to create task"));
    }
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const instance = NetworkManager(API.TASK.UPDATE);
      const response = await instance.request(taskData, [taskId]);
      if (response?.data?.status === "success") {
        Toast.success(tt("taskUpdated") || "Task updated successfully");
        if (selectedEmployee) {
          fetchTasks(selectedEmployee._id);
        } else {
          fetchAllTasks();
        }
        setEditTaskModalOpen(false);
        setEditingTask(null);
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || (tt("failedToUpdate") || "Failed to update task"));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm(tt("confirmDelete") || "Are you sure you want to delete this task?")) {
      return;
    }
    try {
      const instance = NetworkManager(API.TASK.DELETE);
      const response = await instance.request({}, [taskId]);
      if (response?.data?.status === "success") {
        Toast.success(tt("taskDeleted") || "Task deleted successfully");
        if (selectedEmployee) {
          fetchTasks(selectedEmployee._id);
        } else {
          fetchAllTasks();
        }
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || (tt("failedToDelete") || "Failed to delete task"));
    }
  };

  const fetchFollowUps = async (employeeId) => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.FOLLOW_UP.GET_ALL);
      const response = await instance.request({}, [employeeId]);
      if (response?.data?.status === "success") {
        const followUpsWithLinks = (response.data.data.followUps || []).map((followUp) => ({
          ...followUp,
          publicLink: `${baseUrl}/follow-up/${followUp.publicToken}`,
          employeeId: selectedEmployee?._id,
        }));
        setFollowUps(followUpsWithLinks);
        
        // Update groupedFollowUps with public links
        const groupedByDate = response.data.data.groupedByDate || {};
        const updatedGrouped = {};
        Object.keys(groupedByDate).forEach((date) => {
          updatedGrouped[date] = groupedByDate[date].map((followUp) => ({
            ...followUp,
            publicLink: `${baseUrl}/follow-up/${followUp.publicToken}`,
            employeeId: selectedEmployee?._id,
          }));
        });
        setGroupedFollowUps(updatedGrouped);
      }
    } catch (error) {
      Toast.error(t("failedToFetchFollowUps"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const origin = window.location.origin;
    setBaseUrl(origin);
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (baseUrl) {
      fetchAllFollowUps();
    }
  }, [baseUrl]);

  useEffect(() => {
    if (selectedEmployee) {
      if (typeTab === 0) {
        fetchFollowUps(selectedEmployee._id);
      } else {
        fetchTasks(selectedEmployee._id);
      }
    } else {
      fetchAllTasks();
    }
  }, [selectedEmployee, typeTab]);

  useEffect(() => {
    if (!selectedEmployee) {
      fetchAllTasks();
    }
  }, [typeTab]);

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    Toast.success(t("linkCopied"));
  };

  const handleShareWhatsApp = async (link, title, employeeId) => {
    try {
      let taskDetails = "";
      let todaysTasks = "";
      
      // Fetch tasks for this employee if employeeId is provided
      if (employeeId) {
        const taskInstance = NetworkManager(API.TASK.GET_ALL);
        const taskResponse = await taskInstance.request({}, [], { employeeId });
        
        if (taskResponse?.data?.status === "success") {
          const employeeTasks = taskResponse.data.data.tasks || [];
          
          // Get today's date in YYYY-MM-DD format
          const today = format(new Date(), "yyyy-MM-dd");
          
          // Filter today's tasks
          const todayTasks = employeeTasks.filter(task => task.dueDate === today);
          
          // Format all tasks
          if (employeeTasks.length > 0) {
            const taskList = employeeTasks.slice(0, 10).map((task, idx) => {
              const priorityEmoji = task.priority === "urgent" ? "🔴" : task.priority === "high" ? "🟠" : task.priority === "medium" ? "🟡" : "🟢";
              const statusEmoji = task.status === "completed" ? "✅" : task.status === "cancelled" ? "❌" : "⏳";
              return `${idx + 1}. ${priorityEmoji} ${task.title}${task.description ? `\n   ${task.description}` : ""}\n   📅 ${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ""} | ${statusEmoji} ${task.status}`;
            }).join("\n\n");
            
            taskDetails = language === "mr" 
              ? `\n\n━━━━━━━━━━━━━━━━━━━━\n📋 *सर्व कार्ये (${employeeTasks.length}):*\n━━━━━━━━━━━━━━━━━━━━\n${taskList}${employeeTasks.length > 10 ? `\n\n... आणि ${employeeTasks.length - 10} अधिक` : ""}`
              : `\n\n━━━━━━━━━━━━━━━━━━━━\n📋 *All Tasks (${employeeTasks.length}):*\n━━━━━━━━━━━━━━━━━━━━\n${taskList}${employeeTasks.length > 10 ? `\n\n... and ${employeeTasks.length - 10} more` : ""}`;
          }
          
          // Format today's tasks separately
          if (todayTasks.length > 0) {
            const todayTaskList = todayTasks.map((task, idx) => {
              const priorityEmoji = task.priority === "urgent" ? "🔴" : task.priority === "high" ? "🟠" : task.priority === "medium" ? "🟡" : "🟢";
              const statusEmoji = task.status === "completed" ? "✅" : task.status === "cancelled" ? "❌" : "⏳";
              return `${idx + 1}. ${priorityEmoji} ${task.title}${task.description ? ` - ${task.description}` : ""} | ${statusEmoji} ${task.status}`;
            }).join("\n");
            
            todaysTasks = language === "mr"
              ? `\n\n━━━━━━━━━━━━━━━━━━━━\n📅 *आजची कार्ये (${today}):*\n━━━━━━━━━━━━━━━━━━━━\n${todayTaskList}`
              : `\n\n━━━━━━━━━━━━━━━━━━━━\n📅 *Today's Tasks (${today}):*\n━━━━━━━━━━━━━━━━━━━━\n${todayTaskList}`;
          }
        }
      }
      
      const message = language === "mr" 
        ? `*📌 फॉलो-अप:* ${title}\n\n🔗 *लिंक:* ${link}${taskDetails}${todaysTasks}\n\n━━━━━━━━━━━━━━━━━━━━`
        : `*📌 Follow-up:* ${title}\n\n🔗 *Link:* ${link}${taskDetails}${todaysTasks}\n\n━━━━━━━━━━━━━━━━━━━━`;
      
      navigator.clipboard.writeText(message);
      Toast.success(language === "mr" ? "WhatsApp संदेश क्लिपबोर्डवर कॉपी केला" : "WhatsApp message copied to clipboard");
    } catch (error) {
      console.error("Error fetching tasks for WhatsApp:", error);
      // Fallback to simple message if task fetch fails
      const message = language === "mr" 
        ? `*📌 फॉलो-अप:* ${title}\n\n🔗 *लिंक:* ${link}`
        : `*📌 Follow-up:* ${title}\n\n🔗 *Link:* ${link}`;
      navigator.clipboard.writeText(message);
      Toast.success(language === "mr" ? "WhatsApp संदेश क्लिपबोर्डवर कॉपी केला" : "WhatsApp message copied to clipboard");
    }
  };

  const handleEdit = (followUp) => {
    setEditingFollowUp(followUp);
    setEditModalOpen(true);
  };

  const handleDelete = async (followUp) => {
    if (!selectedEmployee) return;
    
    const confirmMessage = language === "mr" 
      ? `तुम्हाला खात्री आहे की तुम्ही "${followUp.title}" हा फॉलो-अप हटवू इच्छिता?`
      : `Are you sure you want to delete "${followUp.title}"?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const instance = NetworkManager(API.FOLLOW_UP.DELETE);
      const response = await instance.request({}, [selectedEmployee._id, followUp._id]);
      
      if (response?.data?.status === "success") {
        Toast.success(language === "mr" ? "फॉलो-अप यशस्वीरित्या हटवला" : "Follow-up deleted successfully");
        fetchFollowUps(selectedEmployee._id);
      } else {
        Toast.error(response?.data?.message || (language === "mr" ? "फॉलो-अप हटवण्यात अयशस्वी" : "Failed to delete follow-up"));
      }
    } catch (error) {
      console.error("Error deleting follow-up:", error);
      Toast.error(error?.response?.data?.message || (language === "mr" ? "फॉलो-अप हटवण्यात अयशस्वी" : "Failed to delete follow-up"));
    }
  };

  const handleRefresh = () => {
    if (selectedEmployee) {
      fetchFollowUps(selectedEmployee._id);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phoneNumber?.toString().includes(searchQuery)
  );

  const sortedDates = Object.keys(groupedFollowUps).sort((a, b) => {
    return new Date(a) - new Date(b);
  });

  const { changeLanguage } = useLanguage();

  // Prepare analytics data for charts
  const COLORS = ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"];

  // Group all follow-ups by date
  const allGroupedByDate = (allFollowUps || []).reduce((acc, followUp) => {
    if (followUp && followUp.followUpDate) {
      const date = followUp.followUpDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(followUp);
    }
    return acc;
  }, {});

  const allSortedDates = Object.keys(allGroupedByDate || {}).sort((a, b) => {
    return new Date(a) - new Date(b);
  }) || [];

  return (
    <Fade in={true} timeout={500}>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={3}
          sx={{
            animation: "fadeInDown 0.6s ease-out",
            "@keyframes fadeInDown": {
              from: {
                opacity: 0,
                transform: "translateY(-20px)",
              },
              to: {
                opacity: 1,
                transform: "translateY(0)",
              },
            },
          }}
        >
          <Typography 
            variant="h4" 
            fontWeight={700}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("employeeFollowUpManagement")}
          </Typography>
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 120,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                }
              }
            }}
          >
            <Select
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="mr">मराठी</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Slide direction="down" in={true} timeout={600}>
      <Card 
        sx={{ 
          mb: 3, 
          borderRadius: 3, 
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          border: "1px solid rgba(0,0,0,0.05)",
          "&:hover": {
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            transform: "translateY(-2px)",
          }
        }}
      >
        <CardContent>
          <Autocomplete
            options={filteredEmployees}
            getOptionLabel={(option) =>
              `${option.name}${option.employee_id ? ` (${option.employee_id})` : ""} - ${option.phoneNumber || ""}`
            }
            value={selectedEmployee}
            onChange={(event, newValue) => setSelectedEmployee(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("searchEmployee")}
                placeholder={t("searchPlaceholder")}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    },
                    "&.Mui-focused": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
                    }
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#1976d2" }} />
                      </InputAdornment>
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}
            noOptionsText={t("noEmployeesFound")}
            sx={{
              "& .MuiAutocomplete-paper": {
                borderRadius: 2,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                mt: 1,
              }
            }}
          />
        </CardContent>
      </Card>
        </Slide>

        <Box sx={{ mb: 3 }}>
          <Tabs value={viewTab} onChange={(e, newValue) => setViewTab(newValue)} sx={{ 
            borderBottom: 1, 
            borderColor: "divider",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
            }
          }}>
            <Tab label={t("list") || "List"} />
            <Tab label={t("analytics") || "Analytics"} />
          </Tabs>
        </Box>

        {viewTab === 0 && (
          <Box sx={{ mb: 3 }}>
            <Tabs value={typeTab} onChange={(e, newValue) => setTypeTab(newValue)} sx={{ 
              borderBottom: 1, 
              borderColor: "divider",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
              }
            }}>
              <Tab label={t("followUp") || "Follow-ups"} />
              <Tab label={tt("task") || "Tasks"} />
            </Tabs>
          </Box>
        )}

        <Box>
        {viewTab === 1 && analytics && (
          <Fade in={true} timeout={700}>
            <Box>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Status Distribution Pie Chart */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      {t("statusDistribution")}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {analytics.statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* Priority Distribution Pie Chart */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      {t("priorityDistribution")}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.priorityChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={200}
                          animationDuration={800}
                        >
                          {analytics.priorityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* Date-wise Follow-ups Bar Chart */}
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      {t("followUpsByDate")}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.dateChartData.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#667eea" animationDuration={1000} radius={[8, 8, 0, 0]}>
                          {analytics.dateChartData.slice(-30).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* Top Employees Bar Chart */}
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                      {t("topEmployees")}
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.employeeChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#764ba2" animationDuration={1000} radius={[0, 8, 8, 0]}>
                          {analytics.employeeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </Grid>

                {/* Summary Cards */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                      {allFollowUps.length}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {t("totalFollowUps")}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2, background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", color: "white" }}>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                      {analytics.statusCounts.completed}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Completed
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2, background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", color: "white" }}>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                      {analytics.statusCounts.pending}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Pending
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, p: 2, background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", color: "white" }}>
                    <Typography variant="h4" fontWeight={700} mb={1}>
                      {analytics.priorityCounts.urgent || 0}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Urgent
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Fade>
        )}

        {viewTab === 0 && typeTab === 0 && !selectedEmployee && allFollowUps.length > 0 && (
          <Fade in={true} timeout={700}>
            <Box>
              <Typography variant="h6" fontWeight={600} mb={2}>
                All Follow-ups ({allFollowUps.length})
              </Typography>
              {(allSortedDates || []).map((date) => (
                <Box key={date} mb={4}>
                  <Typography variant="h6" fontWeight={600} mb={2} sx={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    pb: 1
                  }}>
                    {format(new Date(date), "MMMM dd, yyyy")}
                  </Typography>
                  <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2, overflow: "hidden" }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#1976d2" }}>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>Employee</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("title")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("description")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("priority")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("status")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(allGroupedByDate[date] || []).map((followUp) => (
                          <TableRow
                            key={followUp._id}
                            sx={{
                              "&:hover": { bgcolor: "action.hover" },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {followUp.employeeName || "Unknown"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {followUp.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {followUp.description || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={followUp.priority}
                                color={getPriorityColor(followUp.priority)}
                                size="small"
                                sx={{ fontWeight: 600, textTransform: "capitalize" }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={followUp.status}
                                color={getStatusColor(followUp.status)}
                                size="small"
                                sx={{ fontWeight: 600, textTransform: "capitalize" }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" gap={0.5} justifyContent="center">
                                <Tooltip title={t("copyLink")}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyLink(followUp.publicLink)}
                                    sx={{
                                      transition: "all 0.3s ease",
                                      "&:hover": {
                                        transform: "scale(1.2)",
                                        color: "info.main",
                                      },
                                    }}
                                  >
                                    <CopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t("shareWhatsApp")}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleShareWhatsApp(followUp.publicLink, followUp.title, followUp.employeeId || selectedEmployee?._id)}
                                    sx={{
                                      color: "#25D366",
                                      transition: "all 0.3s ease",
                                      "&:hover": {
                                        transform: "scale(1.2) rotate(-15deg)",
                                        color: "#128C7E",
                                        backgroundColor: "rgba(37, 211, 102, 0.1)",
                                      },
                                    }}
                                  >
                                    <WhatsAppIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Box>
          </Fade>
        )}

        {viewTab === 0 && typeTab === 1 && (
          <Fade in={true} timeout={700}>
            <Box>
              {selectedEmployee && (
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                  flexWrap="wrap"
                  gap={2}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                      {selectedEmployee.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedEmployee.employee_id && `${t("employeeId")}: ${selectedEmployee.employee_id}`}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateTaskModalOpen(true)}
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
                      }
                    }}
                  >
                    {tt("createTask") || "Create Task"}
                  </Button>
                </Box>
              )}

              {!selectedEmployee && (
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6" fontWeight={600}>
                    All Tasks ({tasks.length})
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateTaskModalOpen(true)}
                    sx={{ 
                      borderRadius: 2,
                      textTransform: "none",
                      px: 3,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    {tt("createTask") || "Create Task"}
                  </Button>
                </Box>
              )}

              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : tasks.length === 0 ? (
                <Alert severity="info">{tt("noTasks") || "No tasks found"}</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2, overflow: "hidden" }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#1976d2" }}>
                        <TableCell sx={{ color: "white", fontWeight: 600 }}>{tt("title") || "Title"}</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 600 }}>{tt("description") || "Description"}</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 600 }}>{tt("dueDate") || "Due Date"}</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 600 }}>{tt("priority") || "Priority"}</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 600 }}>{tt("status") || "Status"}</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 600 }}>{tt("assignedEmployees") || "Assigned To"}</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow
                          key={task._id}
                          sx={{
                            "&:hover": { bgcolor: "action.hover" },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {task.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {task.description || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {task.dueDate} {task.dueTime && `(${task.dueTime})`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.priority}
                              color={getPriorityColor(task.priority)}
                              size="small"
                              sx={{ fontWeight: 600, textTransform: "capitalize" }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.status}
                              color={getStatusColor(task.status)}
                              size="small"
                              sx={{ fontWeight: 600, textTransform: "capitalize" }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {task.assignedEmployees?.map(emp => emp.name || emp).join(", ") || "-"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={0.5} justifyContent="center">
                              <Tooltip title={tt("edit") || "Edit"}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setEditTaskModalOpen(true);
                                  }}
                                  sx={{
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                      transform: "scale(1.2)",
                                      color: "#2196f3",
                                    },
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={tt("delete") || "Delete"}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteTask(task._id)}
                                  sx={{
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                      transform: "scale(1.2)",
                                      color: "#f44336",
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Fade>
        )}

        {selectedEmployee && viewTab === 0 && typeTab === 0 && (
          <Fade in={true} timeout={700}>
            <Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
                flexWrap="wrap"
                gap={2}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                    {selectedEmployee.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEmployee.employee_id && `${t("employeeId")}: ${selectedEmployee.employee_id}`}
                    {selectedEmployee.department && ` • ${selectedEmployee.department}`}
                  </Typography>
                </Box>
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
                    }
                  }}
                >
                  {t("createFollowUp")}
                </Button>
              </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : sortedDates.length === 0 ? (
            <Alert severity="info">{t("noFollowUps")}</Alert>
          ) : (
            <Box>
              {sortedDates.map((date) => (
                <Box key={date} mb={4}>
                  <Typography variant="h6" fontWeight={600} mb={2} sx={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    pb: 1
                  }}>
                    {format(new Date(date), "MMMM dd, yyyy")}
                  </Typography>
                  <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2, overflow: "hidden" }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: "primary.main" }}>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("title")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("description")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("followUpDate")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("time")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("priority")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }}>{t("status")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">{t("created")}</TableCell>
                          <TableCell sx={{ color: "white", fontWeight: 600 }} align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupedFollowUps[date].map((followUp) => (
                          <TableRow
                            key={followUp._id}
                            sx={{
                              "&:hover": { bgcolor: "action.hover" },
                              transition: "all 0.2s ease",
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {followUp.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {followUp.description || "-"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <CalendarIcon fontSize="small" color="action" />
                                <Typography variant="body2">{followUp.followUpDate}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {followUp.dueTime ? (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TimeIcon fontSize="small" color="action" />
                                  <Typography variant="body2">{followUp.dueTime}</Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={followUp.priority}
                                color={getPriorityColor(followUp.priority)}
                                size="small"
                                icon={followUp.priority === "urgent" ? <FlagIcon /> : undefined}
                                sx={{
                                  fontWeight: 600,
                                  textTransform: "capitalize",
                                  ...(followUp.priority === "urgent" && {
                                    animation: "pulse 2s infinite",
                                    "@keyframes pulse": {
                                      "0%, 100%": { opacity: 1 },
                                      "50%": { opacity: 0.7 },
                                    },
                                  }),
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={followUp.status}
                                color={getStatusColor(followUp.status)}
                                size="small"
                                sx={{ fontWeight: 600, textTransform: "capitalize" }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(followUp.createdAt), "MMM dd, yyyy")}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" gap={0.5} justifyContent="center">
                                <Tooltip title={t("edit")}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEdit(followUp)}
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
                                <Tooltip title={t("copyLink")}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyLink(followUp.publicLink)}
                                    sx={{
                                      transition: "all 0.3s ease",
                                      "&:hover": {
                                        transform: "scale(1.2)",
                                        color: "info.main",
                                      },
                                    }}
                                  >
                                    <CopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t("shareWhatsApp")}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleShareWhatsApp(followUp.publicLink, followUp.title, followUp.employeeId || selectedEmployee?._id)}
                                    sx={{
                                      color: "#25D366",
                                      transition: "all 0.3s ease",
                                      "&:hover": {
                                        transform: "scale(1.2) rotate(-15deg)",
                                        color: "#128C7E",
                                        backgroundColor: "rgba(37, 211, 102, 0.1)",
                                      },
                                    }}
                                  >
                                    <WhatsAppIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t("delete")}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(followUp)}
                                    sx={{
                                      transition: "all 0.3s ease",
                                      "&:hover": {
                                        transform: "scale(1.2)",
                                        color: "error.main",
                                        backgroundColor: "rgba(211, 47, 47, 0.1)",
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Box>
          )}
            </Box>
          </Fade>
        )}

        {viewTab === 0 && selectedEmployee && (
          <Zoom in={selectedEmployee} timeout={500}>
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: "fixed",
            bottom: { xs: 16, md: 24 },
            right: { xs: 16, md: 24 },
            display: { xs: selectedEmployee ? "flex" : "none", md: "none" },
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.1) rotate(90deg)",
              boxShadow: "0 6px 30px rgba(102, 126, 234, 0.6)",
            },
          }}
          onClick={() => setCreateModalOpen(true)}
        >
          <AddIcon />
        </Fab>
      </Zoom>
        )}
        </Box>

      <CreateFollowUpModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        employeeId={selectedEmployee?._id}
        onSuccess={handleRefresh}
        t={t}
      />

      <EditFollowUpModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingFollowUp(null);
        }}
        followUp={editingFollowUp}
        employeeId={selectedEmployee?._id}
        onSuccess={handleRefresh}
        t={t}
      />

      <CreateTaskModal
        open={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        onSuccess={() => {
          if (selectedEmployee) {
            fetchTasks(selectedEmployee._id);
          } else {
            fetchAllTasks();
          }
        }}
        employees={employees}
        task={null}
        t={tt}
      />

      <CreateTaskModal
        open={editTaskModalOpen}
        onClose={() => {
          setEditTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSuccess={() => {
          if (selectedEmployee) {
            fetchTasks(selectedEmployee._id);
          } else {
            fetchAllTasks();
          }
        }}
        employees={employees}
        task={editingTask}
        t={tt}
      />
      </Box>
    </Fade>
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
        assignedEmployees: task.assignedEmployees?.map(emp => typeof emp === "object" ? emp : employees.find(e => e._id === emp)) || [],
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
  }, [task, open, employees]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.dueDate) {
      Toast.error((t("titleRequired") || "Title") + " & " + (t("dueDateRequired") || "Due Date") + " required");
      return;
    }

    if (formData.assignedEmployees.length === 0) {
      Toast.error(t("atLeastOneEmployee") || "At least one employee must be assigned");
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
        Toast.success(task ? (t("taskUpdated") || "Task updated") : (t("taskCreated") || "Task created"));
        
        // Save task template for future suggestions (only for new tasks)
        if (!task && formData.title) {
          saveTaskTemplate(formData.title, formData.description);
        }
        
        onSuccess();
        onClose();
      }
    } catch (error) {
      Toast.error(
        error?.response?.data?.message || (task ? (t("failedToUpdate") || "Failed to update") : (t("failedToCreate") || "Failed to create"))
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
        {task ? (t("editTask") || "Edit Task") : (t("createTask") || "Create Task")}
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
                label={t("title") || "Title"}
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
            label={t("description") || "Description"}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            sx={{ borderRadius: 2 }}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={t("dueDate") || "Due Date"}
              value={formData.dueDate}
              onChange={(date) => setFormData({ ...formData, dueDate: date })}
              renderInput={(params) => <TextField {...params} fullWidth required sx={{ borderRadius: 2 }} />}
            />
          </LocalizationProvider>

          <TextField
            fullWidth
            label={t("dueTime") || "Due Time"}
            type="time"
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ borderRadius: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>{t("priority") || "Priority"}</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              label={t("priority") || "Priority"}
            >
              <MenuItem value="low">{t("low") || "Low"}</MenuItem>
              <MenuItem value="medium">{t("medium") || "Medium"}</MenuItem>
              <MenuItem value="high">{t("high") || "High"}</MenuItem>
              <MenuItem value="urgent">{t("urgent") || "Urgent"}</MenuItem>
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
              <TextField {...params} label={t("assignedEmployees") || "Assigned Employees"} required />
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
          {t("cancel") || "Cancel"}
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
          {task ? (t("update") || "Update") : (t("create") || "Create")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FollowUpManagement;






