import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  LinearProgress,
  CircularProgress,
  Tooltip,
  Badge,
  InputAdornment,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  TrendingUp,
  TrendingDown,
  Agriculture,
  EventNote,
  LocalFlorist,
  GridView,
  Save as SaveIcon,
  DeleteForever,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { Toast } from "helpers/toasts/toastHelper";
import { NetworkManager, API } from "network/core";
import { useSelector } from "react-redux";
import SowingAlerts from "./components/SowingAlerts";
import AddSowingModal from "./components/AddSowingModal";
import SowingDateWiseLog from "./components/SowingDateWiseLog";
import ClearAllSowingDialog from "./components/ClearAllSowingDialog";

const createTransferDialogState = () => ({
  open: false,
  sourceSlot: null,
  sourceSubtype: null,
  maxQuantity: 0,
  quantity: "",
  options: [],
  targetSlotId: "",
  reason: "",
  loading: false,
  submitting: false,
  error: "",
});

const SowingManagement = () => {
  const userData = useSelector((state) => state?.userData?.userData);
  const appUser = useSelector((state) => state?.app?.user);
  const [sowings, setSowings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  // Removed reminders, alerts, and todaySummary states - now handled by SowingAlerts component
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubtypeTab, setActiveSubtypeTab] = useState(0);
  const [plantSlots, setPlantSlots] = useState({});
  const [viewMode, setViewMode] = useState("slots"); // Only slot-wise view

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDateWiseLogOpen, setIsDateWiseLogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [selectedSowing, setSelectedSowing] = useState(null);
  const [dateWiseLogFilters, setDateWiseLogFilters] = useState({
    plantId: null,
    subtypeId: null,
    slotId: null,
    date: null,
  });

  // Slot-wise sowing states
  const [slotSowingData, setSlotSowingData] = useState({});
  const [savingSlots, setSavingSlots] = useState(new Set());
  const [expandedMonths, setExpandedMonths] = useState({});
  const [monthReadyDaysInputs, setMonthReadyDaysInputs] = useState({});
  const [savingMonthReadyDays, setSavingMonthReadyDays] = useState(() => new Set());
  const [transferDialog, setTransferDialog] = useState(() => createTransferDialogState());

  const selectedTransferOption = useMemo(() => {
    if (!transferDialog.targetSlotId) {
      return null;
    }
    return (
      transferDialog.options.find((opt) => opt.slotId === transferDialog.targetSlotId) || null
    );
  }, [transferDialog.options, transferDialog.targetSlotId]);

  const maxTransferableForSelection = useMemo(() => {
    const base = transferDialog.maxQuantity || 0;
    if (!selectedTransferOption) {
      return base;
    }
    return Math.min(base, selectedTransferOption.gap || base);
  }, [transferDialog.maxQuantity, selectedTransferOption]);
  
  // Enhanced UI states
  const [monthFilter, setMonthFilter] = useState("all"); // all, urgent, overdue
  const [searchSlot, setSearchSlot] = useState("");
  const [compactView, setCompactView] = useState(false);
  const [highlightedSlot, setHighlightedSlot] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    sowingDate: moment(),
    totalQuantityRequired: "",
    notes: "",
    reminderBeforeDays: 5,
    batchNumber: "",
  });

  // Update modal states
  const [updateData, setUpdateData] = useState({
    quantity: "",
    location: "OFFICE",
    notes: "",
    batchNumber: "",
  });

  useEffect(() => {
    fetchPlants();
    fetchSowings();
    fetchStats();
    // Removed old fetchReminders() and fetchAlerts() - now handled by SowingAlerts component
  }, []);

  useEffect(() => {
    if (plants.length > 0 && activeTab < plants.length) {
      const currentPlant = plants[activeTab];
      // Reset subtype tab when switching plants
      setActiveSubtypeTab(0);
      // Don't auto-fetch slots - wait for subtype selection or month expand
      // fetchPlantSlots will be called when subtype is selected or month is expanded
    }
  }, [activeTab, plants]);

  // Auto-expand months with urgent/overdue slots
  // Fetch slots when subtype is selected or month is expanded (optimized)
  useEffect(() => {
    if (plants.length > 0 && activeTab < plants.length && activeSubtypeTab < plants[activeTab]?.subtypes?.length) {
      const currentPlant = plants[activeTab];
      const currentSubtype = currentPlant.subtypes[activeSubtypeTab];
      
      // Check if we need to fetch slots for this subtype
      const subtypeKey = `${currentPlant._id}-${currentSubtype._id}`;
      const hasSlots = plantSlots[currentPlant._id]?.some(s => s.subtypeId === currentSubtype._id);
      
      // Fetch slots if subtype is selected and not already loaded
      if (currentSubtype && !hasSlots) {
        fetchPlantSlots(currentPlant._id, currentSubtype._id);
      }
    }
  }, [activeTab, activeSubtypeTab, plants]);

  // Auto-expand months with urgent/overdue slots (only if slots are loaded)
  useEffect(() => {
    if (plants.length > 0 && activeTab < plants.length && plantSlots[plants[activeTab]._id]) {
      const autoExpand = {};
      const currentPlant = plants[activeTab];
      const currentSubtype = currentPlant.subtypes?.[activeSubtypeTab];
      
      if (currentSubtype) {
        const subtypeData = plantSlots[currentPlant._id]?.find(
          (s) => s.subtypeId === currentSubtype._id
        );
        const slots = Array.isArray(subtypeData?.slots) ? subtypeData.slots : [];
        
        if (slots.length > 0) {
          const defaultReadyDays = currentSubtype.plantReadyDays || 0;
          const reminderDays = 5;

          // Group slots by month to check for urgent/overdue
          const slotsByMonth = slots.reduce((acc, slot) => {
            const month = slot.month || "Unknown";
            if (!acc[month]) acc[month] = [];
            
            const deliveryDate = moment(slot?.endDay, "DD-MM-YYYY");
            const slotReadyDaysValue = slot?.plantReadyDays;
            const isSlotReadyDaysSet = slotReadyDaysValue !== null && slotReadyDaysValue !== undefined && slotReadyDaysValue > 0;
            const slotReadyDays = isSlotReadyDaysSet 
              ? Number(slotReadyDaysValue) 
              : defaultReadyDays;
            const hasReadyDays = slotReadyDays > 0;
            const sowByDate = hasReadyDays ? deliveryDate.clone().subtract(slotReadyDays, "days") : null;
            const alertDate = hasReadyDays ? sowByDate.clone().subtract(reminderDays, "days") : null;
            const today = moment().startOf('day');
            const daysUntilSow = hasReadyDays ? sowByDate.diff(today, "days") : null;
            const daysUntilAlert = hasReadyDays ? alertDate.diff(today, "days") : null;
            const gap = slot?.gap ?? ((slot?.totalBookedPlants || 0) - (slot?.primarySowed || 0));
            
            let priority = "upcoming";
            if (!hasReadyDays && gap > 0) {
              priority = "missingReadyDays";
            } else if (gap > 0 && daysUntilSow !== null && daysUntilSow < 0) {
              priority = "overdue";
            } else if (gap > 0 && daysUntilAlert !== null && daysUntilAlert <= 0) {
              priority = "urgent";
            }
            
            acc[month].push({ priority });
            return acc;
          }, {});

          // Auto-expand months with urgent/overdue slots
          Object.keys(slotsByMonth).forEach(month => {
            const monthKey = `${currentSubtype._id}-${month}`;
            const hasUrgent = slotsByMonth[month].some(
              s => s.priority === "overdue" || s.priority === "urgent" || s.priority === "missingReadyDays"
            );
            if (hasUrgent && expandedMonths[monthKey] === undefined) {
              autoExpand[monthKey] = true;
            }
          });
        }
      }

      if (Object.keys(autoExpand).length > 0) {
        setExpandedMonths(prev => ({ ...prev, ...autoExpand }));
      }
    }
  }, [plants, activeTab, activeSubtypeTab, plantSlots, expandedMonths]);

  const fetchPlants = async () => {
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS);
      const response = await instance.request();
      if (response?.data?.data) {
        const sowingPlants = response.data.data.filter((plant) => plant.sowingAllowed);
        setPlants(sowingPlants);
      }
    } catch (error) {
      console.error("Error fetching plants:", error);
      Toast.error("Failed to fetch plants");
    }
  };

  const fetchPlantSlots = async (plantId, subtypeId = null) => {
    try {
      const year = new Date().getFullYear();
      const plant = plants.find(p => p._id === plantId);
      
      if (!plant) return;
      
      // Optimized: Fetch only for selected subtype if provided, otherwise fetch all
      const subtypesToFetch = subtypeId 
        ? plant.subtypes.filter(s => s._id === subtypeId)
        : plant.subtypes;
      
      if (subtypesToFetch.length === 0) return;
      
      // Fetch slots for subtypes (optimized - fetch only what's needed)
      const allSlots = [];
      
      for (const subtype of subtypesToFetch) {
        // Use faster simple endpoint for sowing page
        const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
        const response = await instance.request({}, { plantId, subtypeId: subtype._id, year });
        
        // Handle the new API response structure
        const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
        
        if (Array.isArray(slotsData) && slotsData.length > 0) {
          allSlots.push({
            subtypeId: subtype._id,
            subtypeName: subtype.name,
            slots: slotsData
          });
        }
      }
      
      // Merge with existing slots or replace if fetching all
      setPlantSlots((prev) => {
        const existingSlots = prev[plantId] || [];
        const mergedSlots = subtypeId 
          ? [
              ...existingSlots.filter(s => s.subtypeId !== subtypeId),
              ...allSlots
            ]
          : allSlots;
        
        return {
          ...prev,
          [plantId]: mergedSlots,
        };
      });
    } catch (error) {
      console.error("Error fetching slots:", error);
      Toast.error("Failed to fetch slots data");
    }
  };

  // Handle slot-wise sowing input change
  const handleSlotSowingChange = (slotId, field, value) => {
    setSlotSowingData((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        [field]: value,
      },
    }));
  };

  const handleMonthReadyDaysInputChange = (monthKey, value) => {
    setMonthReadyDaysInputs((prev) => ({
      ...prev,
      [monthKey]: value,
    }));
  };

  const updateSlotPlantReadyDays = async (slotId, plantReadyDaysValue) => {
    const instance = NetworkManager(API.slots.UPDATE_SLOT);
    return instance.request({ plantReadyDays: plantReadyDaysValue }, [slotId]);
  };

  const applyPlantReadyDaysToMonth = async (monthKey, monthSlots) => {
    const rawValue = monthReadyDaysInputs[monthKey];
    const parsedValue = parseInt(rawValue, 10);

    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      Toast.error("Please enter a valid plant ready days value");
      return;
    }

    // Filter to only FUTURE slots (endDay >= today) - past slots should not be affected
    const today = moment().startOf('day');
    const futureSlots = monthSlots.filter((item) => {
      if (!item.slot?.endDay) return false;
      const slotEndDate = moment(item.slot.endDay, "DD-MM-YYYY");
      return slotEndDate.isSameOrAfter(today, 'day');
    });

    if (futureSlots.length === 0) {
      Toast.warning("No future slots found in this month. Past slots are not updated to preserve historical data.");
      return;
    }

    const uniqueSlotIds = Array.from(
      new Set(
        futureSlots
          .map((item) => item.slot?._id)
          .filter(Boolean)
      )
    );

    if (uniqueSlotIds.length === 0) {
      Toast.error("No slots available in this month to update");
      return;
    }

    const pastSlotsCount = monthSlots.length - futureSlots.length;
    const warningMessage = pastSlotsCount > 0 
      ? ` Note: ${pastSlotsCount} past slot${pastSlotsCount > 1 ? 's' : ''} not updated to preserve historical data.`
      : '';

    setSavingMonthReadyDays((prev) => {
      const next = new Set(prev);
      next.add(monthKey);
      return next;
    });

    try {
      for (const slotId of uniqueSlotIds) {
        await updateSlotPlantReadyDays(slotId, parsedValue);
      }

      Toast.success(
        `Plant ready days updated to ${parsedValue} for ${uniqueSlotIds.length} future slot${uniqueSlotIds.length > 1 ? "s" : ""}.${warningMessage}`
      );
      setMonthReadyDaysInputs((prev) => ({ ...prev, [monthKey]: "" }));

      if (plants[activeTab]) {
        fetchPlantSlots(plants[activeTab]._id);
      }
    } catch (error) {
      console.error("Error updating plant ready days:", error);
      Toast.error(error?.response?.data?.message || "Failed to update plant ready days");
    } finally {
      setSavingMonthReadyDays((prev) => {
        const next = new Set(prev);
        next.delete(monthKey);
        return next;
      });
    }
  };

  const resetTransferDialog = () => {
    setTransferDialog(createTransferDialogState());
  };

  const openTransferDialog = async (slot, subtype, surplusValue) => {
    const safeSurplus = Math.max(0, Number(surplusValue) || 0);
    setTransferDialog({
      ...createTransferDialogState(),
      open: true,
      sourceSlot: slot,
      sourceSubtype: subtype,
      maxQuantity: safeSurplus,
      quantity: safeSurplus > 0 ? safeSurplus.toString() : "",
      loading: true,
    });

    try {
      const instance = NetworkManager(API.slots.GET_TRANSFER_OPTIONS);
      const response = await instance.request({}, {
        slotId: slot._id,
        backDays: 5,
        forwardDays: 10,
      });

      console.debug("Transfer options response", response);

      if (response?.data?.success) {
        const payload = response.data.data || {};
        const options = Array.isArray(payload.options) ? payload.options : [];
        const updatedMax = Math.max(0, payload.source?.surplus ?? safeSurplus);
        const firstOption = options[0] || null;
        const defaultQuantity =
          firstOption && updatedMax > 0
            ? Math.min(updatedMax, firstOption.gap || updatedMax)
            : updatedMax;

        setTransferDialog((prev) => ({
          ...prev,
          loading: false,
          maxQuantity: updatedMax,
          options,
          targetSlotId: firstOption ? firstOption.slotId : "",
          quantity: defaultQuantity > 0 ? defaultQuantity.toString() : "",
          error:
            options.length === 0
              ? "No eligible target slots found within the allowed window."
              : "",
        }));
      } else {
        setTransferDialog((prev) => ({
          ...prev,
          loading: false,
          error: response?.error || response?.data?.message || "Failed to load transfer options",
        }));
        console.warn("Transfer options error", response);
      }
    } catch (error) {
      console.error("Transfer options request failed", error);
      setTransferDialog((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || "Failed to load transfer options",
      }));
    }
  };

  const handleTransferTargetChange = (event) => {
    const targetSlotId = event.target.value;
    const option = transferDialog.options.find((opt) => opt.slotId === targetSlotId);
    setTransferDialog((prev) => {
      const maxAllowed = option
        ? Math.min(prev.maxQuantity, option.gap || prev.maxQuantity)
        : prev.maxQuantity;
      const currentQty = Number(prev.quantity);
      const adjustedQuantity =
        currentQty > 0 ? Math.min(currentQty, maxAllowed) : maxAllowed;

      return {
        ...prev,
        targetSlotId,
        quantity: adjustedQuantity > 0 ? adjustedQuantity.toString() : "",
        error: "",
      };
    });
  };

  const handleTransferQuantityChange = (event) => {
    const value = event.target.value;
    setTransferDialog((prev) => ({
      ...prev,
      quantity: value,
      error: "",
    }));
  };

  const closeTransferDialog = () => {
    if (transferDialog.submitting) {
      return;
    }
    resetTransferDialog();
  };

  const handleConfirmTransfer = async () => {
    if (!transferDialog.sourceSlot) {
      setTransferDialog((prev) => ({
        ...prev,
        error: "Source slot information is missing.",
      }));
      return;
    }

    if (!transferDialog.targetSlotId) {
      setTransferDialog((prev) => ({
        ...prev,
        error: "Select a target slot to transfer plants.",
      }));
      return;
    }

    const qty = Number(transferDialog.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setTransferDialog((prev) => ({
        ...prev,
        error: "Enter a valid positive quantity to transfer.",
      }));
      return;
    }

    if (qty > transferDialog.maxQuantity) {
      setTransferDialog((prev) => ({
        ...prev,
        error: `Quantity exceeds available surplus (${transferDialog.maxQuantity}).`,
      }));
      return;
    }

    if (selectedTransferOption && qty > (selectedTransferOption.gap || 0)) {
      setTransferDialog((prev) => ({
        ...prev,
        error: `Target slot can accept up to ${selectedTransferOption.gap} plants.`,
      }));
      return;
    }

    setTransferDialog((prev) => ({
      ...prev,
      submitting: true,
      error: "",
    }));

    try {
      const instance = NetworkManager(API.slots.TRANSFER_PLANTS);
      const payload = {
        sourceSlotId: transferDialog.sourceSlot._id,
        targetSlotId: transferDialog.targetSlotId,
        quantity: qty,
        reason: transferDialog.reason,
      };

      const response = await instance.request(payload);
      console.debug("Transfer plants response", response);
      if (response?.data?.success) {
        Toast.success(response?.data?.message || "Plants transferred successfully");
        resetTransferDialog();
        if (plants[activeTab]) {
          fetchPlantSlots(plants[activeTab]._id);
        }
        // Removed old fetchAlerts() - now handled by SowingAlerts component
      } else {
        setTransferDialog((prev) => ({
          ...prev,
          submitting: false,
          error: response?.error || response?.data?.message || "Transfer failed",
        }));
        Toast.error(response?.error || response?.data?.message || "Transfer failed");
        console.warn("Transfer failed response", response);
      }
    } catch (error) {
      setTransferDialog((prev) => ({
        ...prev,
        submitting: false,
        error: error?.message || "Transfer failed",
      }));
      Toast.error(error?.message || "Transfer failed");
      console.error("Transfer plants request failed", error);
    }
  };

  // Navigate to slot from reminder
  const navigateToSlot = (reminder) => {
    // Find the plant index
    const plantIndex = plants.findIndex(p => p._id === reminder.plantId?._id || p._id === reminder.plantId);
    
    if (plantIndex === -1) {
      Toast.error("Plant not found");
      return;
    }

    // Switch to slots view
    setViewMode("slots");
    setActiveTab(plantIndex);

    // Highlight the slot and auto-expand its month
    if (reminder.slotId && reminder.subtypeId) {
      setHighlightedSlot(reminder.slotId);
      
      // Find the month from the slot and auto-expand it
      const plant = plants[plantIndex];
      const subtypeData = plantSlots[plant._id]?.find(s => s.subtypeId === reminder.subtypeId);
      const slot = subtypeData?.slots?.find(s => s._id === reminder.slotId);
      
      if (slot?.month) {
        const monthKey = `${reminder.subtypeId}-${slot.month}`;
        setExpandedMonths(prev => ({ ...prev, [monthKey]: true }));
      }
      
      // Scroll to the highlighted slot after a delay to allow rendering
      setTimeout(() => {
        const slotElement = document.getElementById(`slot-${reminder.slotId}`);
        if (slotElement) {
          slotElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        
        // Clear highlight after 5 seconds
        setTimeout(() => setHighlightedSlot(null), 5000);
      }, 800);
    }

    Toast.success(`📍 Navigating to ${reminder.plantName?.name || reminder.plantName} - ${reminder.subtypeName || "subtype"}`);
  };

  // Save sowing for a specific slot
  const handleSaveSlotSowing = async (slot, subtypeId) => {
    const sowingData = slotSowingData[slot._id];
    
    if (!sowingData?.quantity || sowingData.quantity <= 0) {
      Toast.error("Please enter a valid quantity");
      return;
    }

    // Auto-set sowing date to today if not provided
    const finalSowingDate = sowingData?.sowingDate || moment().format("YYYY-MM-DD");
    
    if (!finalSowingDate) {
      Toast.error("Please select a sowing date");
      return;
    }

    setSavingSlots((prev) => new Set(prev).add(slot._id));

    try {
      const instance = NetworkManager(API.sowing.CREATE_SOWING);
      
      // Get current user ID
      const user = userData || appUser;
      const userId = user?._id;
      
      const payload = {
        plantId: plants[activeTab]._id,
        subtypeId: subtypeId,
        sowingDate: moment(finalSowingDate).format("DD-MM-YYYY"),
        totalQuantityRequired: parseInt(sowingData.quantity),
        slotId: slot._id,
        sowingLocation: sowingData.location || "OFFICE", // Default to OFFICE
        notes: sowingData.notes || "",
        batchNumber: sowingData.batchNumber || "",
      };

      // Only add createdBy if we have a valid user ID
      if (userId) {
        payload.createdBy = userId;
      }

      const response = await instance.request(payload);
      if (response?.data) {
        const locationText = sowingData.location === "OFFICE" ? "Packets" : "Primary";
        const batchText = sowingData.batchNumber ? ` (Batch: ${sowingData.batchNumber})` : "";
        Toast.success(`${locationText} sowing record created for slot ${slot.startDay} - ${slot.endDay}${batchText}`);
        
        // Clear the slot data
        setSlotSowingData((prev) => {
          const newData = { ...prev };
          delete newData[slot._id];
          return newData;
        });
        
        // Refresh all data to show updated counts
        fetchSowings();
        fetchStats();
        fetchPlantSlots(plants[activeTab]._id);
        // Removed old fetchAlerts() - now handled by SowingAlerts component
      }
    } catch (error) {
      console.error("Error creating slot sowing:", error);
      Toast.error(error?.response?.data?.message || "Failed to create sowing record");
    } finally {
      setSavingSlots((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slot._id);
        return newSet;
      });
    }
  };

  const fetchSowings = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.sowing.GET_SOWINGS);
      const response = await instance.request({}, {});
      if (response?.data?.data) {
        setSowings(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching sowings:", error);
      Toast.error("Failed to fetch sowing records");
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const instance = NetworkManager(API.sowing.GET_STATS);
      const response = await instance.request();
      if (response?.data?.stats) {
        const statsData = {
          ...response.data.stats,
          plantWiseStats: response.data.plantWiseStats || [],
          subtypeWiseStats: response.data.subtypeWiseStats || []
        };
        console.log("Stats data loaded:", {
          plantWiseCount: statsData.plantWiseStats.length,
          subtypeWiseCount: statsData.subtypeWiseStats.length,
          plantsWithGaps: statsData.plantWiseStats.filter(p => p.totalGap > 0).length
        });
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Removed fetchReminders and fetchAlerts functions - now handled by SowingAlerts component

  const handleCreateSowing = async () => {
    if (!selectedPlant || !selectedSubtype) {
      Toast.error("Please select plant and subtype");
      return;
    }

    if (!formData.totalQuantityRequired || formData.totalQuantityRequired <= 0) {
      Toast.error("Please enter valid quantity");
      return;
    }

    try {
      const payload = {
        plantId: selectedPlant._id,
        subtypeId: selectedSubtype._id,
        sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
        totalQuantityRequired: parseInt(formData.totalQuantityRequired),
        reminderBeforeDays: parseInt(formData.reminderBeforeDays),
        notes: formData.notes,
        batchNumber: formData.batchNumber,
      };

      const instance = NetworkManager(API.sowing.CREATE_SOWING);
      const response = await instance.request(payload);
      if (response?.data) {
        Toast.success("Sowing record created successfully");
        setIsAddModalOpen(false);
        resetForm();
        fetchSowings();
        fetchStats();
        // Removed old fetchAlerts() - now handled by SowingAlerts component
      }
    } catch (error) {
      console.error("Error creating sowing:", error);
      Toast.error(error?.data?.message || "Failed to create sowing record");
    }
  };

  const handleUpdateSowing = async (type) => {
    if (!updateData.quantity || updateData.quantity <= 0) {
      Toast.error("Please enter valid quantity");
      return;
    }

    try {
      const payload = {
        quantity: parseInt(updateData.quantity),
        notes: updateData.notes,
        date: moment().format("DD-MM-YYYY"),
        performedBy: null,
        batchNumber: updateData.batchNumber,
      };

      const apiEndpoint =
        type === "OFFICE"
          ? API.sowing.UPDATE_OFFICE_SOWED
          : API.sowing.UPDATE_PRIMARY_SOWED;

      const instance = NetworkManager(apiEndpoint);
      const response = await instance.request(payload, [selectedSowing._id]);
      if (response?.data) {
        Toast.success(`${type} sowing updated successfully`);
        setIsUpdateModalOpen(false);
        setUpdateData({ quantity: "", location: "OFFICE", notes: "", batchNumber: "" });
        fetchSowings();
        fetchStats();
        // Removed old fetchAlerts() - now handled by SowingAlerts component
      }
    } catch (error) {
      console.error("Error updating sowing:", error);
      Toast.error("Failed to update sowing");
    }
  };

  const resetForm = () => {
    setFormData({
      sowingDate: moment(),
      totalQuantityRequired: "",
      notes: "",
      reminderBeforeDays: 5,
      batchNumber: "",
    });
    setSelectedPlant(null);
    setSelectedSubtype(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "PARTIALLY_SOWED":
        return "info";
      case "FULLY_SOWED":
        return "primary";
      case "READY":
        return "success";
      case "OVERDUE":
        return "error";
      default:
        return "default";
    }
  };

  const calculatePlantStats = (plant) => {
    const plantSowings = sowings.filter((s) => s.plantId === plant._id);
    const totalRequired = plantSowings.reduce((sum, s) => sum + s.totalQuantityRequired, 0);
    const totalSowed = plantSowings.reduce((sum, s) => sum + s.totalSowed, 0);
    const pending = plantSowings.filter((s) => s.status === "PENDING" || s.status === "PARTIALLY_SOWED").length;
    const overdue = plantSowings.filter((s) => s.status === "OVERDUE").length;
    
    return {
      totalRequired,
      totalSowed,
      pending,
      overdue,
      completion: totalRequired > 0 ? ((totalSowed / totalRequired) * 100).toFixed(1) : 0,
    };
  };

  const getSubtypeBookings = (plantId, subtypeId) => {
    const slots = plantSlots[plantId];
    if (!slots || !slots.length) return { booked: 0, capacity: 0 };

    let totalBooked = 0;
    let totalCapacity = 0;

    slots.forEach((slotGroup) => {
      const subtypeSlot = slotGroup.subtypeSlots?.find((st) => st.subtypeId === subtypeId);
      if (subtypeSlot) {
        subtypeSlot.slots?.forEach((slot) => {
          totalBooked += slot.totalBookedPlants || 0;
          totalCapacity += slot.totalPlants || 0;
        });
      }
    });

    return { booked: totalBooked, capacity: totalCapacity };
  };

  const getSubtypeSowing = (plantId, subtypeId) => {
    const subtypeSowings = sowings.filter(
      (s) => s.plantId === plantId && s.subtypeId === subtypeId
    );
    const totalSowed = subtypeSowings.reduce((sum, s) => sum + s.totalSowed, 0);
    const totalRequired = subtypeSowings.reduce((sum, s) => sum + s.totalQuantityRequired, 0);
    const officeSowed = subtypeSowings.reduce((sum, s) => sum + s.officeSowed, 0);
    const primarySowed = subtypeSowings.reduce((sum, s) => sum + s.primarySowed, 0);

    return { totalSowed, totalRequired, officeSowed, primarySowed };
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#2e7d32" }}>
              🌱 Sowing Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Track and manage plant sowing operations
            </Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchSowings();
                fetchStats();
                // Removed fetchReminders() - now handled by SowingAlerts component
                fetchPlants();
                // Removed old fetchAlerts() - now handled by SowingAlerts component
              }}
              sx={{ mr: 2 }}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsAddModalOpen(true)}
              sx={{
                bgcolor: "#2e7d32",
                "&:hover": { bgcolor: "#1b5e20" },
                mr: 1,
              }}>
              Add Sowing
            </Button>
            <Button
              variant="outlined"
              startIcon={<EventNote />}
              onClick={() => {
                setDateWiseLogFilters({
                  plantId: plants[activeTab]?._id || null,
                  subtypeId: plants[activeTab]?.subtypes[activeSubtypeTab]?._id || null,
                  slotId: null,
                  date: null,
                });
                setIsDateWiseLogOpen(true);
              }}
              sx={{
                borderColor: "#1976d2",
                color: "#1976d2",
                "&:hover": { borderColor: "#1565c0", bgcolor: "#e3f2fd" },
                mr: 1,
              }}>
              Date Log
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForever />}
              onClick={() => setIsClearAllDialogOpen(true)}
              sx={{
                borderColor: "#d32f2f",
                color: "#d32f2f",
                "&:hover": { borderColor: "#b71c1c", bgcolor: "#ffebee" },
              }}>
              Clear All
            </Button>
          </Box>
        </Box>

        <SowingAlerts onNavigateToSlot={navigateToSlot} />

        {/* Removed old reminders section - now handled by SowingAlerts component */}


        {/* Plant Tabs */}
        <Card elevation={3} sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              bgcolor: "#f9f9f9",
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "0.95rem",
              },
            }}>
            {plants.map((plant, index) => {
              const plantStats = calculatePlantStats(plant);
              return (
                <Tab
                  key={plant._id}
                  label={
                    <Badge badgeContent={plantStats.overdue} color="error">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LocalFlorist />
                        {plant.name}
                      </Box>
                    </Badge>
                  }
                />
              );
            })}
          </Tabs>

              {/* Plant Details */}
              {plants[activeTab] && (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "#2e7d32" }}>
                      {plants[activeTab].name} - Sowing Details
                    </Typography>
                  </Box>

                  {/* Subtype Tabs */}
                  {plants[activeTab].subtypes && plants[activeTab].subtypes.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Tabs
                        value={activeSubtypeTab}
                        onChange={(e, newValue) => {
                          setActiveSubtypeTab(newValue);
                          // Fetch slots when subtype is selected (optimized loading)
                          const currentPlant = plants[activeTab];
                          const selectedSubtype = currentPlant?.subtypes?.[newValue];
                          if (currentPlant && selectedSubtype) {
                            const hasSlots = plantSlots[currentPlant._id]?.some(
                              s => s.subtypeId === selectedSubtype._id
                            );
                            if (!hasSlots) {
                              fetchPlantSlots(currentPlant._id, selectedSubtype._id);
                            }
                          }
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                          bgcolor: "#f0f0f0",
                          borderRadius: 1,
                          "& .MuiTab-root": {
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            minHeight: 40,
                          },
                        }}>
                        {plants[activeTab].subtypes.map((subtype, index) => {
                          // Check if slots are loaded for this subtype
                          const hasSlotsLoaded = plantSlots[plants[activeTab]._id]?.some(
                            s => s.subtypeId === subtype._id
                          );
                          
                          return (
                            <Tab
                              key={subtype._id}
                              label={
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Agriculture sx={{ fontSize: 20 }} />
                                  {subtype.name}
                                  <Chip 
                                    label={`${subtype.plantReadyDays}d`} 
                                    size="small" 
                                    color="success" 
                                    sx={{ fontSize: "0.7rem", height: 18 }}
                                  />
                                  {!hasSlotsLoaded && (
                                    <Chip 
                                      label="Click to load" 
                                      size="small" 
                                      color="info" 
                                      variant="outlined"
                                      sx={{ fontSize: "0.65rem", height: 16 }}
                                    />
                                  )}
                                </Box>
                              }
                              onClick={() => {
                                // Fetch slots when subtype tab is clicked
                                if (!hasSlotsLoaded) {
                                  fetchPlantSlots(plants[activeTab]._id, subtype._id);
                                }
                              }}
                            />
                          );
                        })}
                      </Tabs>
                    </Box>
                  )}

              {/* Plant Level Stats */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {(() => {
                  const stats = calculatePlantStats(plants[activeTab]);
                  return (
                    <>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
                          <Typography variant="caption" color="textSecondary">
                            Total Required
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1976d2" }}>
                            {stats.totalRequired.toLocaleString()}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
                          <Typography variant="caption" color="textSecondary">
                            Total Sowed
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: "#2e7d32" }}>
                            {stats.totalSowed.toLocaleString()}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0" }}>
                          <Typography variant="caption" color="textSecondary">
                            Pending Tasks
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: "#f57c00" }}>
                            {stats.pending}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Paper sx={{ p: 2, textAlign: "center" }}>
                          <Typography variant="caption" color="textSecondary">
                            Completion
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: "#4caf50" }}>
                            {stats.completion}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={parseFloat(stats.completion)}
                            sx={{ mt: 1, height: 8, borderRadius: 4 }}
                          />
                        </Paper>
                      </Grid>
                    </>
                  );
                })()}
              </Grid>

              {/* View Mode Toggle */}
              <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={() => fetchPlantSlots(plants[activeTab]._id)}>
                  Refresh Slots
                </Button>
              </Box>


              {/* Slot-wise Sowing View - REDESIGNED */}
              <>
                  {/* Enhanced Filter Controls */}
                  <Card sx={{ mb: 3, p: 2, bgcolor: "#fafafa" }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Search by date (e.g., Jan, 01-11, Nov 1)..."
                          value={searchSlot}
                          onChange={(e) => setSearchSlot(e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">🔍</InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Filter Slots</InputLabel>
                          <Select
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            label="Filter Slots">
                            <MenuItem value="all">All Slots</MenuItem>
                            <MenuItem value="urgent">⚠️ Urgent Only (≤5 days)</MenuItem>
                            <MenuItem value="overdue">🚨 Overdue Only</MenuItem>
                            <MenuItem value="pending">📋 Pending Gap</MenuItem>
                            <MenuItem value="missingReady">❗ Missing Ready Days</MenuItem>
                            <MenuItem value="complete">✅ Complete</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Button
                          variant={compactView ? "contained" : "outlined"}
                          onClick={() => setCompactView(!compactView)}
                          size="small"
                          fullWidth
                          startIcon={<GridView />}>
                          {compactView ? "Compact View" : "Normal View"}
                        </Button>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSearchSlot("");
                            setMonthFilter("all");
                            setExpandedMonths({});
                            setMonthReadyDaysInputs({});
                          }}
                          startIcon={<RefreshIcon />}>
                          Reset
                        </Button>
                      </Grid>
                    </Grid>
                  </Card>

                  {!plantSlots[plants[activeTab]._id] ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <RefreshIcon sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
                      <Typography variant="h6" color="textSecondary">
                        Loading slots data...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {(() => {
                        // Show only the selected subtype
                        const currentSubtype = plants[activeTab].subtypes[activeSubtypeTab];
                        if (!currentSubtype) return null;
                        
                        const subtypeData = plantSlots[plants[activeTab]._id]?.find(
                          (s) => s.subtypeId === currentSubtype._id
                        );
                        const slots = Array.isArray(subtypeData?.slots) ? subtypeData.slots : [];
                        
                        const defaultReadyDays = currentSubtype.plantReadyDays || 0;
                        const reminderDays = 5;

                        // Group slots by month
                        const slotsByMonth = slots.reduce((acc, slot) => {
                          const month = slot.month || "Unknown";
                          if (!acc[month]) acc[month] = [];
                          
                          const deliveryDate = moment(slot?.endDay, "DD-MM-YYYY");
                          // Priority: First from slot.plantReadyDays (if explicitly set), then from subtype.plantReadyDays
                          // If slot.plantReadyDays is null/undefined or 0, fall back to subtype default
                          const slotReadyDaysValue = slot?.plantReadyDays;
                          const isSlotReadyDaysSet = slotReadyDaysValue !== null && slotReadyDaysValue !== undefined && slotReadyDaysValue > 0;
                          const slotReadyDays = isSlotReadyDaysSet 
                            ? Number(slotReadyDaysValue) 
                            : defaultReadyDays;
                          const hasReadyDays = slotReadyDays > 0;
                          const sowByDate = hasReadyDays ? deliveryDate.clone().subtract(slotReadyDays, "days") : null;
                          const alertDate = hasReadyDays ? sowByDate.clone().subtract(reminderDays, "days") : null;
                          const today = moment().startOf('day');
                          const daysUntilSow = hasReadyDays ? sowByDate.diff(today, "days") : null;
                          const daysUntilAlert = hasReadyDays ? alertDate.diff(today, "days") : null;
                          // Gap is now calculated in BE as bookedPlants - primarySowed
                          const gap = slot?.gap ?? ((slot?.totalBookedPlants || 0) - (slot?.primarySowed || 0));
                          const surplus = gap < 0 ? Math.abs(gap) : 0;
                          
                          // Determine priority
                          let priority = "upcoming";
                          let bgcolor = "#ffffff";
                          let borderColor = "#e0e0e0";
                          
                          if (gap <= 0 && slot.totalBookedPlants === 0) {
                            priority = "noBooking";
                            bgcolor = "#fafafa";
                          } else if (gap <= 0) {
                            priority = "complete";
                            bgcolor = "#e8f5e9";
                            borderColor = "#66bb6a";
                          } else if (!hasReadyDays) {
                            priority = "missingReadyDays";
                            bgcolor = "#fff9c4";
                            borderColor = "#fbc02d";
                          } else if (daysUntilSow !== null && daysUntilSow < 0) {
                            priority = "overdue";
                            bgcolor = "#ffebee";
                            borderColor = "#ef5350";
                          } else if (daysUntilAlert !== null && daysUntilAlert <= 0) {
                            priority = "urgent";
                            bgcolor = "#fff3e0";
                            borderColor = "#ffa726";
                          }
                          
                          acc[month].push({
                            slot,
                            daysUntilSow,
                            gap,
                            surplus,
                            priority,
                            bgcolor,
                            borderColor,
                            sowByDate,
                            readyDays: slotReadyDays,
                            hasReadyDays,
                            alertDate,
                            isSlotReadyDaysSet, // Track if ready days is from slot or subtype
                          });
                          return acc;
                        }, {});

                        // Get month order
                        const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        let sortedMonths = Object.keys(slotsByMonth).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

                        // Apply filters
                        if (monthFilter !== "all") {
                          sortedMonths = sortedMonths.filter(month => {
                            const monthSlots = slotsByMonth[month];
                            if (monthFilter === "urgent") {
                              return monthSlots.some(s => s.priority === "urgent");
                            } else if (monthFilter === "overdue") {
                              return monthSlots.some(s => s.priority === "overdue");
                            } else if (monthFilter === "pending") {
                              return monthSlots.some(s => s.gap > 0);
                            } else if (monthFilter === "missingReady") {
                              return monthSlots.some(s => s.priority === "missingReadyDays");
                            } else if (monthFilter === "complete") {
                              return monthSlots.some(s => s.priority === "complete");
                            }
                            return true;
                          });
                        }

                        // Apply search filter
                        if (searchSlot.trim()) {
                          sortedMonths = sortedMonths.filter(month => {
                            const monthSlots = slotsByMonth[month];
                            const searchLower = searchSlot.toLowerCase();
                            
                            // Check if month name matches
                            if (month.toLowerCase().includes(searchLower)) return true;
                            
                            // Check if any slot date matches
                            return monthSlots.some(s => {
                              const startDay = s.slot.startDay || "";
                              const endDay = s.slot.endDay || "";
                              return startDay.includes(searchSlot) || endDay.includes(searchSlot);
                            });
                          });
                        }

                        return (
                          <Box key={currentSubtype?._id || `subtype-${Math.random()}`} sx={{ mb: 4 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#2e7d32", display: "flex", alignItems: "center", gap: 1 }}>
                              <Agriculture sx={{ fontSize: 28 }} />
                              {currentSubtype?.name || "Unknown"} 
                              <Chip label={`Default ${defaultReadyDays} days`} size="small" color="success" />
                              <Chip label={`${slots.length} slots`} size="small" variant="outlined" />
                            </Typography>

                            {/* Month-wise Collapsible Sections */}
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {sortedMonths.length === 0 ? (
                                <Card sx={{ p: 4, textAlign: "center" }}>
                                  <Typography variant="h6" color="textSecondary" gutterBottom>
                                    🔍 No slots found
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    Try adjusting your filters or search terms
                                  </Typography>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      setSearchSlot("");
                                      setMonthFilter("all");
                                    }}
                                    sx={{ mt: 2 }}>
                                    Clear Filters
                                  </Button>
                                </Card>
                              ) : (
                              sortedMonths.map(month => {
                                const monthKey = `${currentSubtype._id}-${month}`;
                                const monthSlots = slotsByMonth[month];
                                const overdue = monthSlots.filter(s => s.priority === "overdue").length;
                                const urgent = monthSlots.filter(s => s.priority === "urgent").length;
                                const missingReady = monthSlots.filter(s => s.priority === "missingReadyDays").length;
                                const hasIssues = overdue > 0 || urgent > 0;
                                const totalBooked = monthSlots.reduce((sum, s) => sum + (s.slot.totalBookedPlants || 0), 0);
                                const totalGap = monthSlots.reduce((sum, s) => sum + s.gap, 0);
                                const avgReadyDays = monthSlots.length
                                  ? Math.round(
                                      monthSlots.reduce(
                                        (sum, s) => sum + (Number(s.readyDays) || 0),
                                        0
                                      ) / monthSlots.length
                                    )
                                  : 0;
                                const today = moment().startOf('day');
                                const futureSlotsCount = monthSlots.filter(s => {
                                  const slotEndDate = moment(s.slot?.endDay, "DD-MM-YYYY");
                                  return slotEndDate.isSameOrAfter(today, 'day');
                                }).length;
                                const pastSlotsCount = monthSlots.length - futureSlotsCount;
                                const monthInputValue = monthReadyDaysInputs[monthKey] ?? "";
                                const isSavingMonth = savingMonthReadyDays.has(monthKey);
                                
                                return (
                                  <Card key={month} sx={{ border: hasIssues ? "2px solid #f57c00" : "1px solid #e0e0e0" }}>
                                    {/* Month Header */}
                                    <Box 
                                      onClick={() => {
                                        const isExpanding = !expandedMonths[monthKey];
                                        setExpandedMonths(prev => ({ ...prev, [monthKey]: isExpanding }));
                                        
                                        // Fetch slots if not already loaded when expanding
                                        if (isExpanding && plants[activeTab] && currentSubtype) {
                                          const hasLoaded = plantSlots[plants[activeTab]._id]?.some(
                                            s => s.subtypeId === currentSubtype._id && s.slots?.length > 0
                                          );
                                          if (!hasLoaded) {
                                            fetchPlantSlots(plants[activeTab]._id, currentSubtype._id);
                                          }
                                        }
                                      }}
                                      sx={{ 
                                        p: 2, 
                                        bgcolor: hasIssues ? "#fff3e0" : "#f5f5f5",
                                        cursor: "pointer",
                                        "&:hover": { bgcolor: hasIssues ? "#ffe0b2" : "#eeeeee" },
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                      }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                          📅 {month}
                                        </Typography>
                                        <Chip label={`${monthSlots.length} slots`} size="small" />
                                        {futureSlotsCount > 0 && (
                                          <Chip 
                                            label={`${futureSlotsCount} future`} 
                                            size="small" 
                                            color="info" 
                                            variant="outlined"
                                            sx={{ fontSize: "0.7rem" }}
                                          />
                                        )}
                                        {pastSlotsCount > 0 && (
                                          <Chip 
                                            label={`${pastSlotsCount} past`} 
                                            size="small" 
                                            sx={{ fontSize: "0.7rem", opacity: 0.7 }}
                                          />
                                        )}
                                        {overdue > 0 && <Chip label={`${overdue} overdue`} size="small" color="error" />}
                                        {urgent > 0 && <Chip label={`${urgent} urgent`} size="small" color="warning" />}
                                        {avgReadyDays > 0 && (
                                          <Chip label={`Avg ${avgReadyDays}d`} size="small" color="primary" variant="outlined" />
                                        )}
                                        {missingReady > 0 && (
                                          <Chip label={`${missingReady} need ready days`} size="small" color="warning" variant="outlined" />
                                        )}
                                      </Box>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Typography variant="body2" color="textSecondary">
                                          Booked: {totalBooked} | Gap: {totalGap}
                                        </Typography>
                                        <TextField
                                          size="small"
                                          type="number"
                                          placeholder={avgReadyDays ? `Avg ${avgReadyDays}` : "Ready days"}
                                          value={monthInputValue}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => handleMonthReadyDaysInputChange(monthKey, e.target.value)}
                                          sx={{ width: 110 }}
                                        />
                                        <Tooltip title="Updates plant ready days for future slots only (endDay >= today). Past slots remain unchanged to preserve historical data.">
                                          <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={!isSavingMonth ? <SaveIcon fontSize="small" /> : null}
                                            disabled={isSavingMonth}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              applyPlantReadyDaysToMonth(monthKey, monthSlots);
                                            }}
                                            sx={{ minWidth: 90 }}
                                          >
                                            {isSavingMonth ? "Saving..." : "Apply"}
                                          </Button>
                                        </Tooltip>
                                        <IconButton size="small">
                                          {expandedMonths[monthKey] ? <TrendingDown /> : <TrendingUp />}
                                        </IconButton>
                                      </Box>
                                    </Box>

                                    {/* Month Content - Collapsible */}
                                    {expandedMonths[monthKey] && (
                                      <CardContent sx={{ p: 2, bgcolor: "#fafafa" }}>
                                        <Grid container spacing={compactView ? 1 : 1.5}>
                                          {monthSlots.map(({ slot, daysUntilSow, gap, surplus, priority, bgcolor, borderColor, sowByDate, readyDays, hasReadyDays, isSlotReadyDaysSet }) => {
                                            const isHighlighted = highlightedSlot === slot._id;
                                            const isPastSlot = moment(slot?.endDay, "DD-MM-YYYY").isBefore(moment().startOf('day'));
                                            return (
                                            <Grid item xs={12} sm={compactView ? 4 : 6} md={compactView ? 3 : 4} lg={compactView ? 2 : 3} key={slot._id}>
                                              <Paper 
                                                id={`slot-${slot._id}`}
                                                title={slot._id}
                                                sx={{ 
                                                  p: compactView ? 1 : 1.5, 
                                                  bgcolor: isHighlighted ? "#fff9c4" : bgcolor, 
                                                  border: isHighlighted ? `3px solid #fbc02d` : `2px solid ${borderColor}`,
                                                  transition: "all 0.2s",
                                                  "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
                                                  boxShadow: isHighlighted ? 6 : 1,
                                                  opacity: isPastSlot ? 0.8 : 1
                                                }}>
                                                {/* Header */}
                                                <Box sx={{ mb: 1 }}>
                                                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                                    {moment(slot.startDay, "DD-MM-YYYY").format("MMM D")} - {moment(slot.endDay, "DD-MM-YYYY").format("MMM D")}
                                                    {isPastSlot && <span style={{ fontSize: "0.7rem", color: "#999", marginLeft: 4 }}>(Past)</span>}
                                                  </Typography>
                                                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                                                    {priority === "overdue" && <Chip label="🚨" size="small" color="error" sx={{ fontSize: "0.65rem", height: 16 }} />}
                                                    {priority === "urgent" && <Chip label="⚠️" size="small" color="warning" sx={{ fontSize: "0.65rem", height: 16 }} />}
                                                    {priority === "complete" && <Chip label="✓" size="small" color="success" sx={{ fontSize: "0.65rem", height: 16 }} />}
                                                    <Tooltip title={hasReadyDays ? (isSlotReadyDaysSet ? `Slot-specific: ${readyDays} days` : `Subtype default: ${readyDays} days`) : "No ready days set"}>
                                                      <Chip
                                                        label={hasReadyDays ? `${readyDays}d${isSlotReadyDaysSet ? " (slot)" : ""}` : "Set days"}
                                                        size="small"
                                                        color={hasReadyDays ? (isSlotReadyDaysSet ? "primary" : "info") : "warning"}
                                                        variant={hasReadyDays ? "outlined" : "filled"}
                                                        sx={{ fontSize: "0.65rem", height: 16 }}
                                                      />
                                                    </Tooltip>
                                                    {hasReadyDays && daysUntilSow !== null && daysUntilSow >= 0 && gap > 0 && (
                                                      <Chip label={`${daysUntilSow}d`} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 16 }} />
                                                    )}
                                                  </Box>
                                                </Box>

                                                {/* Stats Grid */}
                                                <Grid container spacing={0.5} sx={{ mb: 1 }}>
                                                  <Grid item xs={3}>
                                                    <Box sx={{ bgcolor: "rgba(25,118,210,0.1)", p: 0.5, borderRadius: 0.5, textAlign: "center" }}>
                                                      <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>Book</Typography>
                                                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#1976d2", fontSize: "0.75rem" }}>
                                                        {slot.totalBookedPlants || 0}
                                                      </Typography>
                                                    </Box>
                                                  </Grid>
                                                  <Grid item xs={3}>
                                                    <Box sx={{ bgcolor: "rgba(158,158,158,0.1)", p: 0.5, borderRadius: 0.5, textAlign: "center" }}>
                                                      <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>Pkts</Typography>
                                                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#666", fontSize: "0.75rem" }}>
                                                        {slot.officeSowed || 0}
                                                      </Typography>
                                                    </Box>
                                                  </Grid>
                                                  <Grid item xs={3}>
                                                    <Box sx={{ bgcolor: "rgba(46,125,50,0.1)", p: 0.5, borderRadius: 0.5, textAlign: "center" }}>
                                                      <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>Pri</Typography>
                                                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "0.75rem" }}>
                                                        {slot.primarySowed || 0}
                                                      </Typography>
                                                    </Box>
                                                  </Grid>
                                                  <Grid item xs={3}>
                                                    <Box sx={{ bgcolor: gap > 0 ? "rgba(255,152,0,0.15)" : "rgba(158,158,158,0.1)", p: 0.5, borderRadius: 0.5, textAlign: "center" }}>
                                                      <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>Gap</Typography>
                                                      <Typography variant="body2" sx={{ fontWeight: 700, color: gap > 0 ? "#f57c00" : "#666", fontSize: "0.75rem" }}>
                                                        {gap > 0 ? '+' : ''}{gap}
                                                      </Typography>
                                                    </Box>
                                                  </Grid>
                                                </Grid>

                                                {gap > 0 && hasReadyDays && sowByDate && (
                                                  <Box sx={{ mb: 1, p: 0.5, bgcolor: priority === "overdue" ? "#ffcdd2" : priority === "urgent" ? "#ffe0b2" : "#bbdefb", borderRadius: 1 }}>
                                                    <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600 }}>
                                                      Need to sow: {gap} by {sowByDate.format("MMM D")}
                                                    </Typography>
                                                  </Box>
                                                )}
                                                {(!hasReadyDays || priority === "missingReadyDays") && (
                                                  <Box sx={{ mb: 1, p: 0.5, bgcolor: "#fff9c4", borderRadius: 1, border: "1px dashed #fbc02d" }}>
                                                    <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#f57c00" }}>
                                                      Set plant ready days to compute sowing schedule
                                                    </Typography>
                                                  </Box>
                                                )}

                                                {surplus > 0 && (
                                                  <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      console.debug("Transfer surplus clicked", {
                                                        slotId: slot._id,
                                                        surplus,
                                                      });
                                                      setTimeout(() => {
                                                        openTransferDialog(slot, currentSubtype, surplus);
                                                      }, 30);
                                                    }}
                                                    sx={{ alignSelf: "flex-start", mb: 1 }}
                                                  >
                                                    Transfer Surplus ({surplus})
                                                  </Button>
                                                )}

                                                {/* Quick Entry */}
                                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                  <TextField
                                                    type="date"
                                                    size="small"
                                                    value={slotSowingData[slot._id]?.sowingDate || moment().format("YYYY-MM-DD")}
                                                    onChange={(e) => handleSlotSowingChange(slot._id, "sowingDate", e.target.value)}
                                                    sx={{ "& input": { fontSize: "0.7rem", p: 0.5 } }}
                                                  />
                                                  
                                                  {/* Location Selector */}
                                                  <Select
                                                    value={slotSowingData[slot._id]?.location || "OFFICE"}
                                                    onChange={(e) => handleSlotSowingChange(slot._id, "location", e.target.value)}
                                                    size="small"
                                                    fullWidth
                                                    sx={{ 
                                                      height: 28,
                                                      fontSize: "0.65rem"
                                                    }}>
                                                    <MenuItem value="OFFICE">
                                                      📦 Add Packets
                                                    </MenuItem>
                                                    <MenuItem value="PRIMARY">
                                                      🌱 Primary
                                                    </MenuItem>
                                                  </Select>
                                                  
                                                  {/* Batch Number Input */}
                                                  <TextField
                                                    size="small"
                                                    placeholder="Batch #"
                                                    value={slotSowingData[slot._id]?.batchNumber || ""}
                                                    onChange={(e) => handleSlotSowingChange(slot._id, "batchNumber", e.target.value)}
                                                    sx={{ "& input": { fontSize: "0.7rem", p: 0.5 } }}
                                                  />
                                                  
                                                  <Box sx={{ display: "flex", gap: 0.5 }}>
                                                    <TextField
                                                      type="number"
                                                      size="small"
                                                      placeholder={gap > 0 ? gap.toString() : "Qty"}
                                                      value={slotSowingData[slot._id]?.quantity || ""}
                                                      onChange={(e) => handleSlotSowingChange(slot._id, "quantity", e.target.value)}
                                                      sx={{ flex: 1, "& input": { fontSize: "0.75rem", p: 0.5 } }}
                                                    />
                                                    <TextField
                                                      type="number"
                                                      size="small"
                                                      placeholder="%"
                                                      value={slotSowingData[slot._id]?.percentage || ""}
                                                      onChange={(e) => handleSlotSowingChange(slot._id, "percentage", e.target.value)}
                                                      sx={{ width: 50, "& input": { fontSize: "0.7rem", p: 0.5, textAlign: "center" } }}
                                                    />
                                                    <Button
                                                      size="small"
                                                      variant="outlined"
                                                      onClick={() => {
                                                        const currentQuantity = parseInt(slotSowingData[slot._id]?.quantity || "0");
                                                        const percentage = parseInt(slotSowingData[slot._id]?.percentage || "25");
                                                        const percentageToAdd = gap > 0 ? Math.ceil(gap * (percentage / 100)) : percentage;
                                                        const newQuantity = currentQuantity + percentageToAdd;
                                                        handleSlotSowingChange(slot._id, "quantity", newQuantity.toString());
                                                      }}
                                                      sx={{ minWidth: 40, fontSize: "0.65rem", px: 0.5 }}>
                                                      Add%
                                                    </Button>
                                                    <Button
                                                      size="small"
                                                      variant="contained"
                                                      disabled={!slotSowingData[slot._id]?.quantity || savingSlots.has(slot._id)}
                                                      onClick={() => handleSaveSlotSowing(slot, currentSubtype._id)}
                                                      sx={{ 
                                                        minWidth: 55,
                                                        fontSize: "0.7rem",
                                                        bgcolor: priority === "overdue" ? "#d32f2f" : priority === "urgent" ? "#f57c00" : "#2e7d32",
                                                        "&:hover": { 
                                                          bgcolor: priority === "overdue" ? "#b71c1c" : priority === "urgent" ? "#e65100" : "#1b5e20"
                                                        }
                                                      }}>
                                                      {savingSlots.has(slot._id) ? "..." : 
                                                        (slotSowingData[slot._id]?.location === "OFFICE" ? "Add Packets" : "Sow")}
                                                    </Button>
                                                  </Box>
                                                </Box>
                                              </Paper>
                                            </Grid>
                                            );
                                          })}
                                        </Grid>
                                      </CardContent>
                                    )}
                                  </Card>
                                );
                              })
                              )}
                            </Box>
                          </Box>
                        );
                      })()}
                    </>
                  )}
                </>
            </Box>
          )}
        </Card>

        {/* Add Sowing Modal - New Card Style */}
        <AddSowingModal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          plants={plants}
          userData={userData}
          appUser={appUser}
          onSuccess={() => {
            fetchSowings();
            fetchStats();
            // Removed old fetchAlerts() - now handled by SowingAlerts component
            if (plants[activeTab]) {
              fetchPlantSlots(plants[activeTab]._id);
            }
          }}
        />

        {/* Date-wise Log Modal */}
        <SowingDateWiseLog
          open={isDateWiseLogOpen}
          onClose={() => setIsDateWiseLogOpen(false)}
          plantId={dateWiseLogFilters.plantId}
          subtypeId={dateWiseLogFilters.subtypeId}
          slotId={dateWiseLogFilters.slotId}
          selectedDate={dateWiseLogFilters.date}
        />

        {/* Clear All Sowing Dialog */}
        <ClearAllSowingDialog
          open={isClearAllDialogOpen}
          onClose={() => setIsClearAllDialogOpen(false)}
          onSuccess={() => {
            fetchSowings();
            fetchStats();
            // Removed fetchReminders() - now handled by SowingAlerts component
            // Removed old fetchAlerts() - now handled by SowingAlerts component
            if (plants[activeTab]) {
              fetchPlantSlots(plants[activeTab]._id);
            }
          }}
          sowingCount={sowings.length}
        />

        {/* Update Sowing Modal */}
        <Dialog open={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <EditIcon />
              Update Sowing Progress
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {selectedSowing && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>
                      {selectedSowing.plantName} - {selectedSowing.subtypeName}
                    </strong>
                  </Typography>
                  <Typography variant="caption">
                    Required: {selectedSowing.totalQuantityRequired.toLocaleString()} | Remaining:{" "}
                    {selectedSowing.remainingToSow.toLocaleString()}
                  </Typography>
                </Alert>

                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={updateData.location}
                    label="Location"
                    onChange={(e) => setUpdateData({ ...updateData, location: e.target.value })}>
                    <MenuItem value="OFFICE">Office</MenuItem>
                    <MenuItem value="PRIMARY">Primary</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Quantity Sowed"
                  type="number"
                  value={updateData.quantity}
                  onChange={(e) => setUpdateData({ ...updateData, quantity: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Notes"
                  multiline
                  rows={2}
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  fullWidth
                />

                <TextField
                  label="Batch Number"
                  value={updateData.batchNumber}
                  onChange={(e) => setUpdateData({ ...updateData, batchNumber: e.target.value })}
                  fullWidth
                  placeholder="Enter batch number (optional)"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsUpdateModalOpen(false)} variant="outlined">
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleUpdateSowing(updateData.location)}
              sx={{ bgcolor: "#1976d2" }}>
              Update
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={transferDialog.open}
          onClose={transferDialog.submitting ? undefined : closeTransferDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Transfer Surplus Plants</DialogTitle>
          <DialogContent sx={{ mt: 1 }}>
            {transferDialog.loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Source Slot
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {transferDialog.sourceSubtype?.name ||
                      transferDialog.sourceSubtype?.subtypeName ||
                      ""}
                  </Typography>
                  <Typography variant="body2">
                    {transferDialog.sourceSlot?.startDay} → {transferDialog.sourceSlot?.endDay} (
                    {transferDialog.sourceSlot?.month})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Surplus available: {transferDialog.maxQuantity.toLocaleString()} plants
                  </Typography>
                </Box>

                {transferDialog.options.length > 0 ? (
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Target Slot"
                      size="small"
                      value={transferDialog.targetSlotId}
                      onChange={handleTransferTargetChange}
                      fullWidth
                    >
                      {transferDialog.options.map((option) => (
                        <MenuItem key={option.slotId} value={option.slotId}>
                          {option.startDay} → {option.endDay} ({option.month}) •{" "}
                          {option.subtypeName} • Need {option.gap.toLocaleString()}
                        </MenuItem>
                      ))}
                    </TextField>
                    {selectedTransferOption && (
                      <Typography variant="caption" color="textSecondary">
                        Starts in{" "}
                        {selectedTransferOption.daysDifference >= 0 ? "+" : ""}
                        {selectedTransferOption.daysDifference} day
                        {Math.abs(selectedTransferOption.daysDifference) === 1 ? "" : "s"} •
                        Remaining gap {selectedTransferOption.gap.toLocaleString()}
                      </Typography>
                    )}
                    <TextField
                      label="Quantity to transfer"
                      type="number"
                      size="small"
                      value={transferDialog.quantity}
                      onChange={handleTransferQuantityChange}
                      fullWidth
                      inputProps={{ min: 1 }}
                      helperText={`Max ${maxTransferableForSelection.toLocaleString()} plants`}
                    />
                    <TextField
                      label="Reason (optional)"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={transferDialog.reason}
                      onChange={(e) =>
                        setTransferDialog((prev) => ({ ...prev, reason: e.target.value }))
                      }
                    />
                  </Stack>
                ) : (
                  <Box sx={{ p: 2, bgcolor: "#fff8e1", borderRadius: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      No eligible target slots found within -5 to +10 days of the source slot.
                    </Typography>
                  </Box>
                )}

                {transferDialog.error && (
                  <Typography variant="body2" color="error">
                    {transferDialog.error}
                  </Typography>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={closeTransferDialog}
              variant="outlined"
              disabled={transferDialog.submitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmTransfer}
              disabled={
                transferDialog.submitting ||
                transferDialog.loading ||
                transferDialog.options.length === 0 ||
                !transferDialog.quantity ||
                !transferDialog.targetSlotId
              }
            >
              {transferDialog.submitting ? <CircularProgress size={20} /> : "Confirm Transfer"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default SowingManagement;
