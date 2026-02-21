import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Container,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { format } from "date-fns";

const getStatusColor = (status) => {
  const colors = {
    pending: "warning",
    completed: "success",
    incomplete: "error",
    not_done: "default",
    in_progress: "info",
    cancelled: "default",
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

const StatusButton = ({ status, onClick, disabled }) => {
  const buttons = [
    {
      status: "completed",
      label: "✓ Done",
      icon: <CheckIcon />,
      bgColor: "#4caf50",
      activeColor: "#2e7d32",
    },
    {
      status: "incomplete",
      label: "⊘ Incomplete",
      icon: <CancelIcon />,
      bgColor: "#ff9800",
      activeColor: "#e65100",
    },
    {
      status: "not_done",
      label: "✕ Not Done",
      icon: <PauseIcon />,
      bgColor: "#f44336",
      activeColor: "#c62828",
    },
  ];

  return (
    <Box display="flex" gap={1.5} flexWrap="wrap">
      {buttons.map((btn) => (
        <Button
          key={btn.status}
          onClick={() => onClick(btn.status)}
          disabled={disabled}
          sx={{
            flex: 1,
            minWidth: 100,
            py: 1.5,
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
            backgroundColor: status === btn.status ? btn.activeColor : "#ffffff",
            color: status === btn.status ? "#ffffff" : btn.bgColor,
            border: `2px solid ${btn.bgColor}`,
            boxShadow: status === btn.status ? `0 4px 15px ${btn.bgColor}40` : "none",
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: btn.bgColor,
              color: "#ffffff",
              transform: "translateY(-3px)",
              boxShadow: `0 6px 20px ${btn.bgColor}50`,
            },
            "&:disabled": {
              backgroundColor: "#e0e0e0",
              borderColor: "#bdbdbd",
              color: "#9e9e9e",
            },
          }}
        >
          {btn.label}
        </Button>
      ))}
    </Box>
  );
};

const CommentItem = ({ comment }) => (
  <Box
    sx={{
      display: "flex",
      gap: 2,
      mb: 2,
      p: 2,
      borderRadius: 2,
      bgcolor: "background.paper",
      boxShadow: 1,
    }}
  >
    <Avatar sx={{ bgcolor: "#1976d2" }}>
      <PersonIcon />
    </Avatar>
    <Box flex={1}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" fontWeight={600}>
          {comment.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {format(new Date(comment.createdAt), "MMM dd, yyyy HH:mm")}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        {comment.comment}
      </Typography>
      {comment.statusUpdate && (
        <Chip
          label={comment.statusUpdate}
          color={getStatusColor(comment.statusUpdate)}
          size="small"
        />
      )}
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        IP: {comment.ip}
      </Typography>
    </Box>
  </Box>
);

const NameCaptureModal = ({ open, onClose, onConfirm, employeeName }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleYes = () => {
    if (employeeName) {
      console.log("Saving name to localStorage:", employeeName);
      localStorage.setItem("followUpUserName", employeeName);
      onConfirm(employeeName);
    }
  };

  const handleNo = () => {
    // If No, still allow them to proceed but ask for name manually
    const manualName = prompt("कृपया आपले नाव प्रविष्ट करा / Please enter your name:");
    if (manualName && manualName.trim()) {
      localStorage.setItem("followUpUserName", manualName.trim());
      onConfirm(manualName.trim());
    } else {
      Toast.error("Name is required to continue");
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => {}} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          animation: isAnimating ? "slideIn 0.5s ease-out" : "none",
          "@keyframes slideIn": {
            "0%": {
              transform: "translateY(-50px)",
              opacity: 0,
            },
            "100%": {
              transform: "translateY(0)",
              opacity: 1,
            },
          },
        },
      }}
    >
      <Box
        sx={{
          p: 4,
          textAlign: "center",
          color: "white",
        }}
      >
        <Box
          sx={{
            mb: 3,
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%, 100%": { transform: "scale(1)" },
              "50%": { transform: "scale(1.05)" },
            },
          }}
        >
          <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.9 }} />
        </Box>
        
        <Typography 
          variant="h5" 
          fontWeight={700} 
          mb={2}
          sx={{
            animation: "fadeIn 0.8s ease-in",
            "@keyframes fadeIn": {
              "0%": { opacity: 0 },
              "100%": { opacity: 1 },
            },
          }}
        >
          Your name is
        </Typography>
        
        <Typography 
          variant="h4" 
          fontWeight={800} 
          mb={3}
          sx={{
            textTransform: "capitalize",
            textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            animation: "glow 2s ease-in-out infinite",
            "@keyframes glow": {
              "0%, 100%": { textShadow: "0 2px 10px rgba(0,0,0,0.3)" },
              "50%": { textShadow: "0 2px 20px rgba(255,255,255,0.5)" },
            },
          }}
        >
          {employeeName || "Employee"}
        </Typography>

        <Typography 
          variant="h6" 
          fontWeight={600} 
          mb={4}
          sx={{
            animation: "fadeIn 1s ease-in",
            lineHeight: 1.6,
          }}
        >
          तुमचे नाव <strong>{employeeName || "Employee"}</strong> आहे बरोबर?
          <br />
          <span style={{ fontSize: "0.9em", opacity: 0.9 }}>
            Is your name <strong>{employeeName || "Employee"}</strong> correct?
          </span>
        </Typography>

        <Box display="flex" gap={2} justifyContent="center" mt={3}>
          <Button
            onClick={handleYes}
            sx={{
              minWidth: 120,
              py: 1.5,
              px: 4,
              borderRadius: 3,
              fontSize: "1.1rem",
              fontWeight: 700,
              background: "rgba(255,255,255,0.2) !important",
              backdropFilter: "blur(10px)",
              border: "2px solid rgba(255,255,255,0.3)",
              color: "white !important",
              textTransform: "none",
              transition: "all 0.3s ease",
              animation: "bounceIn 0.6s ease-out 0.2s both",
              "@keyframes bounceIn": {
                "0%": {
                  transform: "scale(0.3)",
                  opacity: 0,
                },
                "50%": {
                  transform: "scale(1.05)",
                },
                "70%": {
                  transform: "scale(0.9)",
                },
                "100%": {
                  transform: "scale(1)",
                  opacity: 1,
                },
              },
              "&:hover": {
                background: "rgba(255,255,255,0.3) !important",
                transform: "scale(1.05)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                color: "white !important",
              },
            }}
          >
            हो / Yes
          </Button>
          <Button
            onClick={handleNo}
            sx={{
              minWidth: 120,
              py: 1.5,
              px: 4,
              borderRadius: 3,
              fontSize: "1.1rem",
              fontWeight: 700,
              background: "transparent",
              border: "2px solid rgba(255,255,255,0.5)",
              color: "white !important",
              textTransform: "none",
              transition: "all 0.3s ease",
              animation: "bounceIn 0.6s ease-out 0.4s both",
              "&:hover": {
                background: "rgba(255,255,255,0.1) !important",
                transform: "scale(1.05)",
                borderColor: "rgba(255,255,255,0.8)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
                color: "white !important",
              },
            }}
          >
            नाही / No
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

const PublicFollowUpPage = () => {
  const { token } = useParams();
  const [employee, setEmployee] = useState(null);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [globalTasks, setGlobalTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [error, setError] = useState(null);
  const [taskTab, setTaskTab] = useState(0);
  const [taskCommentModalOpen, setTaskCommentModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComment, setTaskComment] = useState("");
  const [taskStatusUpdate, setTaskStatusUpdate] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!employee?._id) return;
    
    try {
      const instance = NetworkManager(API.TASK.GET_PUBLIC_BY_EMPLOYEE);
      const response = await instance.request({}, [employee._id]);
      if (response?.data?.status === "success") {
        setAssignedTasks(response.data.data.assignedTasks || []);
        setGlobalTasks(response.data.data.globalTasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [employee]);

  const fetchEmployeeAndTasks = useCallback(async () => {
    if (!token) {
      setError("Invalid token");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Get employee from follow-up endpoint
      const instance = NetworkManager(API.FOLLOW_UP.GET_PUBLIC);
      const response = await instance.request({}, [token]);
      
      if (response?.data?.status === "success") {
        setEmployee(response.data.data.employee);
        
        // Fetch tasks using employee ID
        if (response.data.data.employee?._id) {
          const taskInstance = NetworkManager(API.TASK.GET_PUBLIC_BY_EMPLOYEE);
          const taskResponse = await taskInstance.request({}, [response.data.data.employee._id]);
          if (taskResponse?.data?.status === "success") {
            setAssignedTasks(taskResponse.data.data.assignedTasks || []);
            setGlobalTasks(taskResponse.data.data.globalTasks || []);
          }
        }
        
        // Handle name modal
        const storedName = localStorage.getItem("followUpUserName");
        if (!storedName && response.data.data.employee?.name) {
          setLoading(false);
          setShowNameModal(true);
        } else {
          setUserName(storedName || response.data.data.employee?.name || "");
          setLoading(false);
        }
      } else {
        setError(response?.data?.message || "Invalid token");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error?.response?.data?.message || "Failed to load data");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchEmployeeAndTasks();
    }
  }, [token, fetchEmployeeAndTasks]);

  const handleNameConfirm = (name) => {
    setUserName(name);
    setShowNameModal(false);
    setLoading(true);
    fetchEmployeeAndTasks();
  };


  const handleSubmitTaskComment = async () => {
    if (!taskComment.trim() && !taskStatusUpdate) {
      Toast.error("Please enter a remark or select status");
      return;
    }

    if (!selectedTask || !employee) return;

    setSubmitting(true);
    try {
      const instance = NetworkManager(API.TASK.ADD_PUBLIC_COMMENT);
      const response = await instance.request(
        {
          employeeId: employee._id,
          name: userName,
          comment: taskComment || (taskStatusUpdate ? `Status updated to ${taskStatusUpdate}` : "Remark added"),
          statusUpdate: taskStatusUpdate || undefined,
        },
        [selectedTask._id]
      );

      if (response?.data?.status === "success") {
        Toast.success("Remark added successfully");
        setTaskComment("");
        setTaskStatusUpdate(null);
        setTaskCommentModalOpen(false);
        setSelectedTask(null);
        fetchTasks();
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Failed to add remark");
    } finally {
      setSubmitting(false);
    }
  };

  if (showNameModal && employee) {
    return (
      <NameCaptureModal
        open={showNameModal}
        onClose={() => {}}
        onConfirm={handleNameConfirm}
        employeeName={employee.name}
      />
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <CircularProgress sx={{ color: "white" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2
      }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      py: { xs: 2, md: 3 }
    }}>
      <Container maxWidth="md" sx={{ px: { xs: 1.5, md: 3 } }}>
        <Card sx={{ borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
          <Box sx={{
            background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            p: 2,
            color: "white"
          }}>
            <Typography variant="h6" fontWeight={700}>
              📋 Tasks
            </Typography>
          </Box>
          
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Tabs 
              value={taskTab} 
              onChange={(e, newValue) => setTaskTab(newValue)} 
              sx={{ 
                mb: 2,
                minHeight: 40,
                "& .MuiTab-root": {
                  minHeight: 40,
                  fontSize: "0.875rem",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                }
              }}
            >
              <Tab label={`My Tasks (${assignedTasks.length})`} />
              <Tab label={`All Tasks (${globalTasks.length})`} />
            </Tabs>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {(taskTab === 0 ? assignedTasks : globalTasks).length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    No tasks available
                  </Typography>
                </Box>
              ) : (
                (taskTab === 0 ? assignedTasks : globalTasks).map((task) => {
                  // All tasks are clickable to allow undoing status
                  const isClickable = true;
                  const priorityColors = {
                    urgent: { bg: "#ffebee", color: "#c62828", emoji: "🔴" },
                    high: { bg: "#fff3e0", color: "#e65100", emoji: "🟠" },
                    medium: { bg: "#e3f2fd", color: "#1565c0", emoji: "🟡" },
                    low: { bg: "#e8f5e9", color: "#2e7d32", emoji: "🟢" },
                  };
                  const statusColors = {
                    completed: { bg: "#e8f5e9", color: "#2e7d32", emoji: "✅", label: "Completed" },
                    cancelled: { bg: "#ffebee", color: "#c62828", emoji: "❌", label: "Cancelled" },
                    in_progress: { bg: "#fff3e0", color: "#e65100", emoji: "⏳", label: "In Progress" },
                    pending: { bg: "#fff3e0", color: "#e65100", emoji: "⏳", label: "Not Completed" },
                  };
                  const priorityInfo = priorityColors[task.priority] || priorityColors.medium;
                  const statusInfo = statusColors[task.status] || { bg: "#f5f5f5", color: "#757575", emoji: "📋", label: "Not Completed" };
                  const isUrgent = task.priority === "urgent";
                  const isActive = task.status !== "completed" && task.status !== "cancelled";

                  return (
                    <Card
                      key={task._id}
                      onClick={() => {
                        setSelectedTask(task);
                        // If task is completed/cancelled, allow changing status
                        if (task.status === "completed" || task.status === "cancelled") {
                          setTaskStatusUpdate(null); // Reset to allow choosing new status
                        } else {
                          setTaskStatusUpdate(null);
                        }
                        setTaskComment("");
                        setTaskCommentModalOpen(true);
                      }}
                      sx={{
                        borderRadius: 2,
                        boxShadow: isClickable ? 2 : 1,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        border: `1px solid ${priorityInfo.color + "40"}`,
                        ...(isUrgent && {
                          animation: "urgentPulse 2s ease-in-out infinite",
                          "@keyframes urgentPulse": {
                            "0%, 100%": {
                              boxShadow: `0 2px 8px ${priorityInfo.color}40`,
                              borderColor: priorityInfo.color + "40",
                            },
                            "50%": {
                              boxShadow: `0 4px 16px ${priorityInfo.color}80`,
                              borderColor: priorityInfo.color,
                            },
                          },
                        }),
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 4,
                          borderColor: priorityInfo.color,
                        },
                        opacity: task.status === "completed" || task.status === "cancelled" ? 0.8 : 1,
                      }}
                    >
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="body2" 
                              fontWeight={700} 
                              sx={{ 
                                fontSize: "0.9rem",
                                mb: 0.5,
                                wordBreak: "break-word",
                                color: "#212121",
                              }}
                            >
                              {task.title}
                            </Typography>
                            {task.description && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                sx={{ 
                                  fontSize: "0.75rem",
                                  display: "block",
                                  wordBreak: "break-word",
                                  lineHeight: 1.4,
                                }}
                              >
                                {task.description}
                              </Typography>
                            )}
                          </Box>
                          {isClickable && (
                            <Chip
                              label="Tap to Add Remark"
                              size="small"
                              sx={{
                                ml: 1,
                                height: 24,
                                fontSize: "0.7rem",
                                bgcolor: "#667eea",
                                color: "#ffffff",
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </Box>
                        
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5, alignItems: "center" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                              {task.dueDate}
                            </Typography>
                            {task.dueTime && (
                              <>
                                <TimeIcon sx={{ fontSize: 14, color: "text.secondary", ml: 0.5 }} />
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                                  {task.dueTime}
                                </Typography>
                              </>
                            )}
                          </Box>
                          
                          <Chip
                            icon={<FlagIcon sx={{ fontSize: 12 }} />}
                            label={`${priorityInfo.emoji} ${task.priority}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              bgcolor: priorityInfo.bg,
                              color: priorityInfo.color,
                              textTransform: "capitalize",
                              fontWeight: 600,
                              "& .MuiChip-icon": {
                                color: priorityInfo.color,
                              },
                            }}
                          />
                          
                          <Chip
                            label={`${statusInfo.emoji} ${statusInfo.label}`}
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: "0.7rem",
                              bgcolor: statusInfo.bg,
                              color: statusInfo.color,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </Box>
          </CardContent>
        </Card>

      {employee && (
        <NameCaptureModal
          open={showNameModal}
          onClose={() => {
            // Don't allow closing without name
          }}
          onConfirm={handleNameConfirm}
          employeeName={employee.name}
        />
      )}

      {/* Task Remark Modal */}
      <Dialog
        open={taskCommentModalOpen}
        onClose={() => {
          setTaskCommentModalOpen(false);
          setSelectedTask(null);
          setTaskComment("");
          setTaskStatusUpdate(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{
          background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
          p: 2,
          color: "white"
        }}>
          <DialogTitle sx={{ color: "white", p: 0, pb: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {selectedTask?.title || "Add Remark"}
            </Typography>
            {taskStatusUpdate && (
              <Typography variant="body2" sx={{ opacity: 0.95, mt: 0.5 }}>
                {taskStatusUpdate === "completed" ? "✓ Mark as Completed" : taskStatusUpdate === "cancelled" ? "✕ Mark as Cancelled" : "↺ Mark as Not Completed"}
              </Typography>
            )}
          </DialogTitle>
        </Box>
        <DialogContent sx={{ p: 2.5 }}>
          {selectedTask && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "#f5f5f5", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Due: {selectedTask.dueDate} | Priority: {selectedTask.priority}
              </Typography>
              {selectedTask.description && (
                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                  {selectedTask.description}
                </Typography>
              )}
            </Box>
          )}
          
          {!taskStatusUpdate && (
            <Box display="flex" flexDirection="column" gap={1} mb={2}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600 }}>
                Current Status: {selectedTask?.status === "completed" ? "✅ Completed" : selectedTask?.status === "cancelled" ? "❌ Cancelled" : "⏳ Not Completed"}
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  fullWidth
                  onClick={() => setTaskStatusUpdate("completed")}
                  sx={{
                    py: 1,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: selectedTask?.status === "completed" ? "#9e9e9e" : "#4caf50",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: selectedTask?.status === "completed" ? "#757575" : "#2e7d32",
                    },
                  }}
                >
                  {selectedTask?.status === "completed" ? "✓ Keep Completed" : "✓ Mark as Completed"}
                </Button>
                <Button
                  fullWidth
                  onClick={() => setTaskStatusUpdate("cancelled")}
                  sx={{
                    py: 1,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: selectedTask?.status === "cancelled" ? "#9e9e9e" : "#f44336",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: selectedTask?.status === "cancelled" ? "#757575" : "#c62828",
                    },
                  }}
                >
                  {selectedTask?.status === "cancelled" ? "✕ Keep Cancelled" : "✕ Mark as Cancelled"}
                </Button>
              </Box>
              {(selectedTask?.status === "completed" || selectedTask?.status === "cancelled") && (
                <Button
                  fullWidth
                  onClick={() => setTaskStatusUpdate("pending")}
                  sx={{
                    py: 1,
                    borderRadius: 2,
                    textTransform: "none",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: "#ff9800",
                    color: "#ffffff",
                    "&:hover": {
                      backgroundColor: "#e65100",
                    },
                  }}
                >
                  ↺ Undo - Mark as Not Completed
                </Button>
              )}
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Enter your remark..."
            value={taskComment}
            onChange={(e) => setTaskComment(e.target.value)}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                bgcolor: "#f5f5f5",
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => {
              setTaskCommentModalOpen(false);
              setSelectedTask(null);
              setTaskComment("");
              setTaskStatusUpdate(null);
            }}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitTaskComment}
            disabled={submitting || (!taskComment.trim() && !taskStatusUpdate)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              px: 3,
              backgroundColor: taskStatusUpdate === "completed" ? "#4caf50" : taskStatusUpdate === "cancelled" ? "#f44336" : "#667eea",
              "&:hover": {
                backgroundColor: taskStatusUpdate === "completed" ? "#2e7d32" : taskStatusUpdate === "cancelled" ? "#c62828" : "#5568d3",
              },
            }}
          >
            {submitting ? "Submitting..." : taskStatusUpdate ? "Submit" : "Add Remark"}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default PublicFollowUpPage;







