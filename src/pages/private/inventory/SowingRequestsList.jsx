import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { API, NetworkManager } from 'network/core';
import SowingRequestDialog from './components/SowingRequestDialog';

const SowingRequestsList = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ open: false, message: "", title: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "", title: "", onConfirm: null });
  const [promptDialog, setPromptDialog] = useState({ open: false, message: "", title: "", defaultValue: "", onConfirm: null, label: "" });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.sowing.GET_ALL_SOWING_REQUESTS);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sowing requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (request) => {
    if (request.status !== 'pending') {
      setAlertDialog({
        open: true,
        title: "Cannot Edit",
        message: 'Only pending requests can be edited',
      });
      return;
    }
    setEditingId(request._id);
    setEditData({
      packetsRequested: request.packetsRequested || request.packetsNeeded,
      notes: request.notes || '',
    });
  };

  const handleSave = async (id) => {
    try {
      const instance = NetworkManager(API.sowing.UPDATE_SOWING_REQUEST);
      const response = await instance.request(editData, [id]);
      if (response?.data?.success) {
        setAlertDialog({
          open: true,
          title: "Success",
          message: 'Request updated successfully',
        });
        setEditingId(null);
        setEditData({});
        fetchRequests();
      } else {
        setAlertDialog({
          open: true,
          title: "Error",
          message: response?.data?.message || 'Failed to update request',
        });
      }
    } catch (error) {
      console.error('Error updating request:', error);
      setAlertDialog({
        open: true,
        title: "Error",
        message: error?.response?.data?.message || 'Failed to update request',
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleView = async (request) => {
    try {
      const instance = NetworkManager(API.sowing.GET_SOWING_REQUEST_BY_ID);
      const response = await instance.request({}, [request._id]);
      if (response?.data?.success) {
        setSelectedRequest(response.data.data);
        setRequestDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      setAlertDialog({
        open: true,
        title: "Error",
        message: 'Error loading request details',
      });
    }
  };

  const handleCancelAll = async () => {
    setConfirmDialog({
      open: true,
      title: "Cancel All Requests",
      message: "Are you sure you want to cancel ALL pending sowing requests? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const instance = NetworkManager(API.sowing.CANCEL_ALL_SOWING_REQUESTS);
          const response = await instance.request({});
          if (response?.data?.success) {
            setAlertDialog({
              open: true,
              title: "Success",
              message: response.data.message || `Cancelled ${response.data.data?.cancelledCount || 0} request(s)`,
            });
            fetchRequests();
          } else {
            setAlertDialog({
              open: true,
              title: "Error",
              message: response?.data?.message || 'Failed to cancel all requests',
            });
          }
        } catch (error) {
          console.error('Error cancelling all requests:', error);
          setAlertDialog({
            open: true,
            title: "Error",
            message: error?.response?.data?.message || 'Failed to cancel all requests',
          });
        }
      },
    });
  };

  const handleReject = async (id) => {
    setPromptDialog({
      open: true,
      title: "Reject Request",
      message: "Enter rejection reason (optional):",
      label: "Rejection Reason",
      defaultValue: "",
      onConfirm: async (reason) => {
        try {
          const instance = NetworkManager(API.sowing.REJECT_SOWING_REQUEST);
          const response = await instance.request(
            { rejectionReason: reason || 'No reason provided' },
            [id]
          );
          if (response?.data?.success) {
            setAlertDialog({
              open: true,
              title: "Success",
              message: 'Request rejected successfully',
            });
            fetchRequests();
          } else {
            setAlertDialog({
              open: true,
              title: "Error",
              message: response?.data?.message || 'Failed to reject request',
            });
          }
        } catch (error) {
          console.error('Error rejecting request:', error);
          setAlertDialog({
            open: true,
            title: "Error",
            message: error?.response?.data?.message || 'Failed to reject request',
          });
        }
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'issued':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'rejected':
        return 'error';
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Sowing Requests
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancelAll}
              size="small"
            >
              Cancel All Pending ({requests.filter(r => r.status === 'pending').length})
            </Button>
          )}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="issued">Issued</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={fetchRequests} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {requests.length === 0 ? (
        <Alert severity="info">No sowing requests found</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request #</TableCell>
                <TableCell>Plant</TableCell>
                <TableCell>Subtype</TableCell>
                <TableCell align="right">Needed</TableCell>
                <TableCell align="right">Requested</TableCell>
                <TableCell align="right">Excess</TableCell>
                <TableCell align="right">Available</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested By</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request._id} hover>
                  <TableCell>{request.requestNumber}</TableCell>
                  <TableCell>{request.plantName}</TableCell>
                  <TableCell>{request.subtypeName}</TableCell>
                  <TableCell align="right">
                    {request.packetsNeeded?.toFixed(2) || request.packetsNeeded} {request.unitName}
                  </TableCell>
                  <TableCell align="right">
                    {editingId === request._id ? (
                      <TextField
                        type="number"
                        size="small"
                        value={editData.packetsRequested}
                        onChange={(e) =>
                          setEditData({ ...editData, packetsRequested: parseFloat(e.target.value) || 0 })
                        }
                        inputProps={{ min: request.packetsNeeded, step: 0.01 }}
                        sx={{ width: 100 }}
                      />
                    ) : (
                      `${request.packetsRequested?.toFixed(2) || request.packetsNeeded?.toFixed(2) || request.packetsNeeded} ${request.unitName}`
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {request.excessPackets > 0 ? (
                      <Chip
                        label={`+${request.excessPackets.toFixed(2)}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {request.availablePackets || 0} {request.unitName}
                  </TableCell>
                  <TableCell>
                    <Chip label={request.status} color={getStatusColor(request.status)} size="small" />
                  </TableCell>
                  <TableCell>{request.requestedBy?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {new Date(request.requestedDate).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell align="center">
                    {editingId === request._id ? (
                      <Box display="flex" gap={1} justifyContent="center">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleSave(request._id)}
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={handleCancel}>
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box display="flex" gap={1} justifyContent="center">
                        {request.status === 'pending' && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEdit(request)}
                            title="Edit"
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleView(request)}
                          title="View Details"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <SowingRequestDialog
        open={requestDialogOpen}
        onClose={() => {
          setRequestDialogOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />
    </Box>
  );
};

export default SowingRequestsList;

