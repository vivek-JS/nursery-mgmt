import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Stack,
  Divider,
  Fade,
  Zoom,
  Grow,
  LinearProgress,
  Tabs,
  Tab,
  Skeleton,
  TextField,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  TrendingDown,
  Assignment,
  LocalFlorist,
  Agriculture,
  CalendarToday,
  Warning,
  CheckCircle,
  Schedule,
  Info as InfoIcon,
  Inventory,
  ShoppingCart,
  AccountBalance,
  Analytics,
  PieChart as PieChartIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
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
  LineChart,
  Line,
} from "recharts";
import { NetworkManager, API } from "network/core";

const SowingGapAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedPlants, setExpandedPlants] = useState(new Set());
  const [expandedSubtypes, setExpandedSubtypes] = useState(new Map());
  const [subtypeReminders, setSubtypeReminders] = useState(new Map());
  const [subtypeStats, setSubtypeStats] = useState(new Map()); // Store stats for each subtype
  const [slotOrders, setSlotOrders] = useState(new Map());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotOrdersDialogOpen, setSlotOrdersDialogOpen] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(new Set());
  const [loadingOrders, setLoadingOrders] = useState(new Set());
  const [activeTab, setActiveTab] = useState(0); // 0 = Critical, 1 = Available
  // Today's sowing cards state
  const [todayCardsData, setTodayCardsData] = useState(null);
  const [loadingTodayCards, setLoadingTodayCards] = useState(false);
  const [todayCardsError, setTodayCardsError] = useState(null);
  // Plants with sowing buffer - maintain a map of plantId -> sowingBuffer
  const [plantsSowingBuffer, setPlantsSowingBuffer] = useState(new Map());
  // Expanded cards state for today's sowing cards
  const [expandedCards, setExpandedCards] = useState(new Set());
  // Track existing requests for each card
  const [existingRequests, setExistingRequests] = useState(new Map());
  // Dialog states
  const [alertDialog, setAlertDialog] = useState({ open: false, message: "", title: "" });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "", title: "", onConfirm: null });
  const [promptDialog, setPromptDialog] = useState({ open: false, message: "", title: "", defaultValue: "", onConfirm: null, label: "" });
  const promptInputRef = useRef(null);

  useEffect(() => {
    fetchGapSummary();
    fetchTodaySowingCards();
  }, []);

  // Check for existing requests when cards data changes
  useEffect(() => {
    if (todayCardsData?.subtypeCards) {
      checkExistingRequests();
    }
  }, [todayCardsData]);

  const fetchTodaySowingCards = async () => {
    setLoadingTodayCards(true);
    setTodayCardsError(null);
    try {
      const instance = NetworkManager(API.sowing.GET_TODAY_SOWING_CARDS);
      const params = { _t: Date.now() };
      
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setTodayCardsData(response.data);
        // Extract and store sowing buffer for each plant
        const bufferMap = new Map();
        if (response.data.subtypeCards) {
          response.data.subtypeCards.forEach((card) => {
            if (card.sowingBuffer !== undefined && card.sowingBuffer !== null) {
              bufferMap.set(card.plantId.toString(), card.sowingBuffer);
            }
          });
        }
        setPlantsSowingBuffer(bufferMap);
      } else {
        setTodayCardsError("Failed to fetch today&apos;s sowing cards");
      }
    } catch (err) {
      console.error("Error fetching today's sowing cards:", err);
      setTodayCardsError("Error loading today&apos;s sowing cards. Please try again.");
    } finally {
      setLoadingTodayCards(false);
    }
  };

  const checkExistingRequests = async () => {
    if (!todayCardsData?.subtypeCards) return;

    const requestsMap = new Map();
    const checkPromises = todayCardsData.subtypeCards.map(async (card) => {
      try {
        const instance = NetworkManager(API.sowing.CHECK_REQUEST_EXISTS);
        const response = await instance.request({}, {
          plantId: card.plantId,
          subtypeId: card.subtypeId,
        });
        if (response?.data?.success && response.data.exists) {
          requestsMap.set(`${card.plantId}-${card.subtypeId}`, response.data.data);
        }
      } catch (error) {
        console.error(`Error checking request for ${card.plantId}-${card.subtypeId}:`, error);
      }
    });

    await Promise.all(checkPromises);
    setExistingRequests(requestsMap);
  };

  const fetchGapSummary = async (isAvailableTab = false) => {
    setLoading(true);
    setError(null);
    try {
      const instance = NetworkManager(API.sowing.GET_PLANTS_GAP_SUMMARY);
      const params = { _t: Date.now() };
      
      // Add available parameter if on Available tab
      if (isAvailableTab) {
        params.available = "true";
      }
      
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setData(response.data);
      } else {
        setError("Failed to fetch gap summary");
      }
    } catch (err) {
      console.error("Error fetching gap summary:", err);
      setError("Error loading gap summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlantExpansion = (plantId) => {
    const newExpanded = new Set(expandedPlants);
    if (newExpanded.has(plantId)) {
      newExpanded.delete(plantId);
    } else {
      newExpanded.add(plantId);
    }
    setExpandedPlants(newExpanded);
  };

  const toggleSubtypeExpansion = async (plantId, subtypeId) => {
    console.log("[toggleSubtypeExpansion] Called with:", { plantId, subtypeId, activeTab });
    const key = `${plantId}-${subtypeId}`;
    const isAvailableTab = activeTab === 1;
    console.log("[toggleSubtypeExpansion] isAvailableTab:", isAvailableTab);

    // Use functional state update to ensure we have latest state
    let isExpanding = false;
    
    setExpandedSubtypes((prev) => {
      const newMap = new Map(prev);
      const plantExpanded = newMap.get(plantId) || new Set();
      isExpanding = !plantExpanded.has(subtypeId);
      console.log("[toggleSubtypeExpansion] isExpanding:", isExpanding);

      if (isExpanding) {
        plantExpanded.add(subtypeId);
        newMap.set(plantId, plantExpanded);
        console.log("[toggleSubtypeExpansion] Will fetch API for expanding subtype");
      } else {
        plantExpanded.delete(subtypeId);
        if (plantExpanded.size > 0) {
          newMap.set(plantId, plantExpanded);
        } else {
          newMap.delete(plantId);
        }
        console.log("[toggleSubtypeExpansion] Collapsing subtype, no fetch needed");
      }
      
      return newMap;
    });

    // Fetch API after state update if expanding - check isExpanding directly
    if (isExpanding) {
      console.log(`[toggleSubtypeExpansion] Expanding ${key}, isAvailableTab: ${isAvailableTab}, activeTab: ${activeTab}`);
      try {
        await fetchSubtypeReminders(plantId, subtypeId, isAvailableTab);
      } catch (err) {
        console.error("Error in fetchSubtypeReminders:", err);
      }
    } else {
      console.log("[toggleSubtypeExpansion] Not fetching, collapsing subtype");
    }
  };

  const handleTabChange = async (event, newValue) => {
    setActiveTab(newValue);
    // Clear all reminders when switching tabs so they're refetched with new filters
    setSubtypeReminders(new Map());
    setSubtypeStats(new Map()); // Clear stats too
    // Also collapse all subtypes
    setExpandedSubtypes(new Map());
    // Refetch gap summary with appropriate parameter
    await fetchGapSummary(newValue === 1); // 1 = Available tab
  };

  const fetchSubtypeReminders = async (plantId, subtypeId, isAvailableTab = false) => {
    const key = `${plantId}-${subtypeId}`;
    
    console.log(`[fetchSubtypeReminders] Starting fetch for ${key}, isAvailableTab: ${isAvailableTab}`);
    
    // Use functional state update to ensure we have latest state
    setLoadingReminders((prev) => {
      const newSet = new Set(prev);
      newSet.add(key);
      console.log(`[fetchSubtypeReminders] Added ${key} to loading set`);
      return newSet;
    });
    
    try {
      const instance = NetworkManager(API.sowing.GET_PLANT_REMINDERS);
      const params = {
        plantId: plantId.toString(),
        subtypeId: subtypeId.toString(),
        _t: Date.now(),
      };
      
      if (isAvailableTab) {
        // Available tab: negative gaps, show all priorities (future, current, past)
        params.gapFilter = "negative";
        // Don't filter by priority - we want all (future, current, past)
        // The API excludes future by default, so we need a way to include it
        // For now, we'll let the API return what it can (current + past)
        // Note: The backend excludes future by default, but for available we want all
        console.log(`[AVAILABLE TAB] Setting gapFilter=negative for ${key} (will get current + past, future excluded by API)`);
      } else {
        // Critical tab: positive gaps, only overdue and urgent
        params.gapFilter = "positive";
        console.log(`[CRITICAL TAB] Setting gapFilter=positive for ${key}`);
      }
      
      console.log(`[${isAvailableTab ? 'AVAILABLE' : 'CRITICAL'}] Calling API for ${key} with params:`, params);
      const response = await instance.request({}, params);
      console.log(`[${isAvailableTab ? 'AVAILABLE' : 'CRITICAL'}] API Response for ${key}:`, response?.data);
      
      if (response?.data?.success) {
        let reminders = response.data.reminders || [];
        const stats = response.data.summary?.currentSowingNeeded || null;
        
        // Show all reminders including future when gapFilter is set
        // The API now includes future entries when gapFilter is provided
        // No need to filter - show all entries returned by API
        
        // Use functional state update to ensure we have latest state
        setSubtypeReminders((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, reminders);
          return newMap;
        });
        
        // Store stats for this subtype (excluding future entries)
        if (stats) {
          setSubtypeStats((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, stats);
            return newMap;
          });
        }
        
        console.log(`[${isAvailableTab ? 'AVAILABLE' : 'CRITICAL'}] Set ${reminders.length} reminders for ${key} (including future)`);
      } else {
        console.error(`[${isAvailableTab ? 'AVAILABLE' : 'CRITICAL'}] API returned unsuccessful response for ${key}:`, response?.data);
        // Set empty array so UI knows the fetch completed
        setSubtypeReminders((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, []);
          return newMap;
        });
        // Clear stats on error
        setSubtypeStats((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
      }
    } catch (err) {
      console.error(`[${isAvailableTab ? 'AVAILABLE' : 'CRITICAL'}] Error fetching subtype reminders for ${key}:`, err);
      // Set empty array on error so UI knows the fetch completed
      setSubtypeReminders((prev) => {
        const newMap = new Map(prev);
        newMap.set(key, []);
        return newMap;
      });
      // Clear stats on error
      setSubtypeStats((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    } finally {
      // Use functional state update to ensure we have latest state
      setLoadingReminders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const handleSlotClick = async (slotId) => {
    if (slotOrders.has(slotId)) {
      setSelectedSlot({ slotId, orders: slotOrders.get(slotId) });
      setSlotOrdersDialogOpen(true);
      return;
    }

    setLoadingOrders(new Set([...loadingOrders, slotId]));
    try {
      const instance = NetworkManager(API.sowing.GET_SLOT_ORDERS_SUMMARY);
      const response = await instance.request({}, [slotId]);
      if (response?.data?.success) {
        const orders = response.data.orders || [];
        setSlotOrders(new Map(slotOrders).set(slotId, orders));
        setSelectedSlot({
          slotId,
          orders,
          slotInfo: response.data.slotInfo,
          summary: response.data.summary,
        });
        setSlotOrdersDialogOpen(true);
      }
    } catch (err) {
      console.error("Error fetching slot orders:", err);
    } finally {
      const newLoading = new Set(loadingOrders);
      newLoading.delete(slotId);
      setLoadingOrders(newLoading);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return new Intl.NumberFormat("en-IN").format(num);
  };

  const handleCreateRequest = async (card) => {
    const packetsNeeded = (card.totalGap || 0) / card.conversionFactor;
    
    if (!packetsNeeded || packetsNeeded <= 0) {
      setAlertDialog({
        open: true,
        title: "No Packets Needed",
        message: "No packets needed for this subtype",
      });
      return;
    }

    // Show prompt dialog for packets requested
    const unitName = card.primaryUnit?.symbol || card.primaryUnit?.name || card.secondaryUnit?.symbol || card.secondaryUnit?.name || "pkt";
    setPromptDialog({
      open: true,
      title: `Create Stock Request - ${card.plantName} - ${card.subtypeName}`,
      message: `Packets Needed: ${packetsNeeded.toFixed(2)} ${unitName}\n\nEnter packets to request (can be more than needed):`,
      label: "Packets to Request",
      defaultValue: packetsNeeded.toFixed(2),
      onConfirm: async (packetsRequestedInput) => {
        if (!packetsRequestedInput) {
          setAlertDialog({
            open: true,
            title: "Invalid Input",
            message: "Please enter a valid number",
          });
          return;
        }

        const packetsRequested = parseFloat(packetsRequestedInput);
        
        if (isNaN(packetsRequested) || packetsRequested <= 0) {
          setAlertDialog({
            open: true,
            title: "Invalid Input",
            message: "Please enter a valid number greater than 0",
          });
          return;
        }

        if (packetsRequested < packetsNeeded) {
          setAlertDialog({
            open: true,
            title: "Invalid Quantity",
            message: `Requested packets (${packetsRequested.toFixed(2)}) cannot be less than needed (${packetsNeeded.toFixed(2)})`,
          });
          return;
        }

        const excessPackets = packetsRequested - packetsNeeded;
        const confirmMessage = excessPackets > 0
          ? `Request ${packetsRequested.toFixed(2)} packets?\n\nNeeded: ${packetsNeeded.toFixed(2)}\nExcess: ${excessPackets.toFixed(2)}`
          : `Request ${packetsRequested.toFixed(2)} packets?`;

        setConfirmDialog({
          open: true,
          title: "Confirm Request",
          message: confirmMessage,
          onConfirm: async () => {
            try {
              const instance = NetworkManager(API.sowing.CREATE_SOWING_REQUEST);
              const response = await instance.request({
                plantId: card.plantId,
                subtypeId: card.subtypeId,
                packetsNeeded: packetsNeeded,
                packetsRequested: packetsRequested,
                notes: `Auto-generated from Today's Sowing Cards${excessPackets > 0 ? ` (Excess: ${excessPackets.toFixed(2)} packets)` : ''}`,
              });

              if (response?.data?.success) {
                setAlertDialog({
                  open: true,
                  title: "Success",
                  message: `Stock request created successfully!\n\nRequest Number: ${response.data.data.requestNumber}\nRequested: ${packetsRequested.toFixed(2)} packets${excessPackets > 0 ? `\nExcess: ${excessPackets.toFixed(2)} packets` : ''}`,
                });
                // Refresh data and check existing requests
                await fetchTodaySowingCards();
                await checkExistingRequests();
              } else {
                setAlertDialog({
                  open: true,
                  title: "Error",
                  message: response?.data?.message || "Failed to create request",
                });
              }
            } catch (error) {
              console.error("Error creating sowing request:", error);
              setAlertDialog({
                open: true,
                title: "Error",
                message: error?.response?.data?.message || "Failed to create stock request",
              });
            }
          },
        });
      },
    });
  };

  const handleCancelRequest = async (card, requestId) => {
    setConfirmDialog({
      open: true,
      title: "Cancel Request",
      message: `Are you sure you want to cancel the stock request for ${card.plantName} - ${card.subtypeName}?`,
      onConfirm: async () => {
        try {
          const instance = NetworkManager(API.sowing.CANCEL_SOWING_REQUEST);
          const response = await instance.request({}, [requestId]);
          if (response?.data?.success) {
            setAlertDialog({
              open: true,
              title: "Success",
              message: "Stock request cancelled successfully",
            });
            // Refresh data and check existing requests
            await fetchTodaySowingCards();
            await checkExistingRequests();
          } else {
            setAlertDialog({
              open: true,
              title: "Error",
              message: response?.data?.message || "Failed to cancel request",
            });
          }
        } catch (error) {
          console.error("Error cancelling sowing request:", error);
          setAlertDialog({
            open: true,
            title: "Error",
            message: error?.response?.data?.message || "Failed to cancel stock request",
          });
        }
      },
    });
  };

  const handleRequestAll = async () => {
    if (!todayCardsData?.subtypeCards || todayCardsData.subtypeCards.length === 0) {
      setAlertDialog({
        open: true,
        title: "No Cards",
        message: "No cards to request",
      });
      return;
    }

    // Filter cards that can be requested (have conversion factor and no existing pending/issued request)
    const requestableCards = todayCardsData.subtypeCards.filter((card) => {
      if (!card.conversionFactor || (!card.primaryUnit && !card.secondaryUnit)) {
        return false;
      }
      const requestKey = `${card.plantId}-${card.subtypeId}`;
      const existingRequest = existingRequests.get(requestKey);
      // Only include if no request exists or if it's rejected/cancelled
      return !existingRequest || existingRequest.status === 'rejected' || existingRequest.status === 'cancelled';
    });

    if (requestableCards.length === 0) {
      setAlertDialog({
        open: true,
        title: "All Requested",
        message: "All cards already have pending or issued requests",
      });
      return;
    }

    const confirmMessage = `Create stock requests for ${requestableCards.length} subtype(s)?\n\nThis will create requests for:\n${requestableCards.map((card, idx) => `${idx + 1}. ${card.plantName} - ${card.subtypeName}`).join('\n')}`;

    setConfirmDialog({
      open: true,
      title: "Request All",
      message: confirmMessage,
      onConfirm: async () => {
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        // Process requests sequentially to avoid overwhelming the server
        for (const card of requestableCards) {
          try {
            const packetsNeeded = (card.totalGap || 0) / card.conversionFactor;
            
            if (!packetsNeeded || packetsNeeded <= 0) {
              continue;
            }

            const instance = NetworkManager(API.sowing.CREATE_SOWING_REQUEST);
            const response = await instance.request({
              plantId: card.plantId,
              subtypeId: card.subtypeId,
              packetsNeeded: packetsNeeded,
              packetsRequested: packetsNeeded, // Use needed as requested by default
              notes: `Auto-generated from Today's Sowing Cards (Batch Request)`,
            });

            if (response?.data?.success) {
              successCount++;
            } else {
              failCount++;
              errors.push(`${card.plantName} - ${card.subtypeName}: ${response?.data?.message || "Failed"}`);
            }
          } catch (error) {
            failCount++;
            errors.push(`${card.plantName} - ${card.subtypeName}: ${error?.response?.data?.message || "Error"}`);
            console.error(`Error creating request for ${card.plantId}-${card.subtypeId}:`, error);
          }
        }

        // Refresh data
        await fetchTodaySowingCards();
        await checkExistingRequests();

        // Show summary
        let message = `Requests created: ${successCount}`;
        if (failCount > 0) {
          message += `\nFailed: ${failCount}`;
          if (errors.length > 0) {
            message += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
            if (errors.length > 5) {
              message += `\n... and ${errors.length - 5} more`;
            }
          }
        }
        setAlertDialog({
          open: true,
          title: successCount > 0 ? "Requests Created" : "Request Failed",
          message: message,
        });
      },
    });
  };

  const handlePrint = async () => {
    if (!todayCardsData?.subtypeCards || todayCardsData.subtypeCards.length === 0) {
      setAlertDialog({
        open: true,
        title: "No Data",
        message: "No data to print",
      });
      return;
    }

    // Fetch orders for all slots before printing
    const allSlotIds = new Set();
    todayCardsData.subtypeCards.forEach((card) => {
      if (card.slots && card.slots.length > 0) {
        card.slots.forEach((slot) => {
          allSlotIds.add(slot.slotId);
        });
      }
    });

    // Fetch orders for slots that don't have orders yet
    const slotsToFetch = Array.from(allSlotIds).filter(slotId => !slotOrders.has(slotId));
    
    if (slotsToFetch.length > 0) {
      try {
        const fetchPromises = slotsToFetch.map(async (slotId) => {
          try {
            const instance = NetworkManager(API.sowing.GET_SLOT_ORDERS_SUMMARY);
            const response = await instance.request({}, [slotId]);
            if (response?.data?.success) {
              const orders = response.data.orders || [];
              return { slotId, orders };
            }
          } catch (err) {
            console.error(`Error fetching orders for slot ${slotId}:`, err);
          }
          return { slotId, orders: [] };
        });

        const results = await Promise.all(fetchPromises);
        const newSlotOrders = new Map(slotOrders);
        results.forEach(({ slotId, orders }) => {
          newSlotOrders.set(slotId, orders);
        });
        setSlotOrders(newSlotOrders);
        
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error("Error fetching slot orders for print:", err);
      }
    }

    // Generate print HTML with current slotOrders
    const currentSlotOrders = new Map(slotOrders);
    const printContent = generatePrintHTML(currentSlotOrders);
    
    // Open print window
    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 500);
  };

  const generatePrintHTML = (ordersMap = slotOrders) => {
    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Generate sowing summary table
    let sowingTableRows = "";
    todayCardsData.subtypeCards.forEach((card, index) => {
      const packetsNeeded = card.conversionFactor && (card.primaryUnit || card.secondaryUnit)
        ? ((card.totalGap || 0) / card.conversionFactor)
        : 0;
      const unitName = card.primaryUnit?.symbol || card.primaryUnit?.name || card.secondaryUnit?.symbol || card.secondaryUnit?.name || "pkt";
      
      sowingTableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${card.plantName || "N/A"}</td>
          <td>${card.subtypeName || "N/A"}</td>
          <td>${formatNumber(card.totalGap || 0)}</td>
          <td>${packetsNeeded.toFixed(2)} ${unitName}</td>
        </tr>
      `;
    });

    // Generate orders table for each slot
    let ordersTables = "";
    todayCardsData.subtypeCards.forEach((card) => {
      if (card.slots && card.slots.length > 0) {
        card.slots.forEach((slot) => {
          const slotKey = `${card.plantName} - ${card.subtypeName} - ${slot.slotStartDay} to ${slot.slotEndDay}`;
          const orders = ordersMap.get(slot.slotId) || [];
          
          if (orders.length > 0) {
            let orderRows = "";
            orders.forEach((order, idx) => {
              orderRows += `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${order.orderNumber || "N/A"}</td>
                  <td>${order.farmerName || "N/A"}</td>
                  <td>${order.village || "N/A"}</td>
                  <td>${formatNumber(order.numberOfPlants || 0)}</td>
                  <td>${order.orderStatus || "N/A"}</td>
                </tr>
              `;
            });

            ordersTables += `
              <div style="page-break-inside: avoid; margin-bottom: 20px;">
                <h3 style="margin: 15px 0 10px 0; font-size: 14px; font-weight: bold; color: #333;">
                  ${slotKey}
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr style="background-color: #f5f5f5;">
                      <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">#</th>
                      <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Order No</th>
                      <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Farmer Name</th>
                      <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Village</th>
                      <th style="border: 1px solid #ddd; padding: 6px; text-align: right;">Plants</th>
                      <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orderRows}
                  </tbody>
                </table>
              </div>
            `;
          }
        });
      }
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sowing Report - ${date}</title>
          <style>
            @media print {
              @page {
                margin: 1cm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                font-size: 11px;
                color: #333;
              }
              .no-print {
                display: none;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #333;
              padding: 20px;
            }
            h1 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
              color: #1976d2;
            }
            h2 {
              font-size: 14px;
              font-weight: bold;
              margin: 15px 0 10px 0;
              color: #333;
            }
            h3 {
              font-size: 12px;
              font-weight: bold;
              margin: 10px 0 5px 0;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .summary {
              margin-bottom: 20px;
              padding: 10px;
              background-color: #f0f0f0;
              border-radius: 4px;
            }
            .page-break {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          <h1>Sowing Report - ${date}</h1>
          <div class="summary">
            <strong>Summary:</strong> ${todayCardsData.summary.totalSubtypes} Subtypes • 
            ${formatNumber(todayCardsData.summary.totalGap)} Plants Needed • 
            ${todayCardsData.summary.totalSlots} Slots
          </div>

          <h2>Sowing Summary</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Plant Name</th>
                <th>Subtype</th>
                <th>Sowing Needed</th>
                <th>Packets Needed</th>
              </tr>
            </thead>
            <tbody>
              ${sowingTableRows}
            </tbody>
          </table>

          ${ordersTables ? `<h2>Orders by Slot</h2>${ordersTables}` : ""}
        </body>
      </html>
    `;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "overdue":
        return "error";
      case "urgent":
        return "warning";
      case "upcoming":
        return "info";
      case "future":
        return "default";
      default:
        return "default";
    }
  };

  // Analytics data preparation - All based on subtypes
  const analyticsData = useMemo(() => {
    if (!data?.plants) return null;

    // Subtype-wise gap distribution for bar chart
    const allSubtypes = data.plants.flatMap((plant) =>
      (plant.subtypes || [])
        .filter((subtype) => subtype.totalBookingGap > 0)
        .map((subtype) => ({
          name: `${subtype.subtypeName}`,
          fullName: `${plant.plantName} - ${subtype.subtypeName}`,
          plantName: plant.plantName,
          subtypeName: subtype.subtypeName,
          gap: subtype.totalBookingGap,
          booked: subtype.totalBookedPlants,
          sowed: subtype.totalPrimarySowed,
          slotCount: subtype.slotCount,
          completionPercentage: subtype.totalBookedPlants > 0
            ? ((subtype.totalPrimarySowed / subtype.totalBookedPlants) * 100).toFixed(1)
            : 0,
        }))
    );

    // Top subtypes by gap
    const topSubtypesData = allSubtypes
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 15) // Top 15 subtypes
      .map((subtype, index) => ({
        ...subtype,
        displayName: subtype.subtypeName.length > 20 
          ? subtype.subtypeName.substring(0, 20) + "..." 
          : subtype.subtypeName,
      }));

    // Gap distribution by range
    const gapRanges = {
      critical: { min: 100000, label: "Critical (>100K)", count: 0, total: 0, color: "#d32f2f" },
      high: { min: 50000, max: 100000, label: "High (50K-100K)", count: 0, total: 0, color: "#f57c00" },
      medium: { min: 10000, max: 50000, label: "Medium (10K-50K)", count: 0, total: 0, color: "#fbc02d" },
      low: { min: 0, max: 10000, label: "Low (<10K)", count: 0, total: 0, color: "#388e3c" },
    };

    allSubtypes.forEach((subtype) => {
      const gap = subtype.gap || 0;
      if (gap >= 100000) {
        gapRanges.critical.count++;
        gapRanges.critical.total += gap;
      } else if (gap >= 50000) {
        gapRanges.high.count++;
        gapRanges.high.total += gap;
      } else if (gap >= 10000) {
        gapRanges.medium.count++;
        gapRanges.medium.total += gap;
      } else if (gap > 0) {
        gapRanges.low.count++;
        gapRanges.low.total += gap;
      }
    });

    const pieChartData = Object.values(gapRanges)
      .filter((range) => range.count > 0)
      .map((range) => ({
        name: range.label,
        value: range.count,
        total: range.total,
        color: range.color,
      }));

    // Plant-wise subtype distribution
    const plantSubtypeData = data.plants
      .filter((plant) => plant.subtypes && plant.subtypes.some((st) => st.totalBookingGap > 0))
      .map((plant) => {
        const subtypesWithGap = (plant.subtypes || []).filter((st) => st.totalBookingGap > 0);
        return {
          name: plant.plantName.length > 15 ? plant.plantName.substring(0, 15) + "..." : plant.plantName,
          fullName: plant.plantName,
          subtypeCount: subtypesWithGap.length,
          totalGap: subtypesWithGap.reduce((sum, st) => sum + st.totalBookingGap, 0),
          subtypes: subtypesWithGap,
        };
      })
      .sort((a, b) => b.subtypeCount - a.subtypeCount)
      .slice(0, 10);

    // Priority distribution from reminders - only past (overdue) and current (urgent/upcoming), exclude future
    const priorityStats = {
      overdue: 0, // Past
      urgent: 0, // Current
      upcoming: 0, // Current
    };

    subtypeReminders.forEach((reminders) => {
      reminders.forEach((reminder) => {
        // Only count overdue, urgent, and upcoming - exclude future
        if (reminder.priority === "overdue" || reminder.priority === "urgent" || reminder.priority === "upcoming") {
          if (Object.prototype.hasOwnProperty.call(priorityStats, reminder.priority)) {
            priorityStats[reminder.priority]++;
          }
        }
      });
    });

    // Group into Past (overdue) and Current (urgent + upcoming)
    const priorityChartData = [
      {
        name: "Past (Overdue)",
        value: priorityStats.overdue,
        color: "#d32f2f",
      },
      {
        name: "Current (Urgent)",
        value: priorityStats.urgent,
        color: "#f57c00",
      },
      {
        name: "Current (Upcoming)",
        value: priorityStats.upcoming,
        color: "#1976d2",
      },
    ].filter((item) => item.value > 0);

    return {
      topSubtypesData,
      pieChartData,
      priorityChartData,
      plantSubtypeData,
      allSubtypesCount: allSubtypes.length,
    };
  }, [data, subtypeReminders]);

  const COLORS = ["#ff4444", "#ff8800", "#ffbb33", "#00C851", "#33b5e5", "#aa66cc"];

  const statCards = data?.summary
    ? [
        {
          label: "Total Plants",
          value: data.summary.totalPlants,
          icon: <LocalFlorist />,
          color: "#1976d2",
          bgcolor: "#e3f2fd",
          tooltip: activeTab === 1 ? "Total plants with available capacity" : "Total plants with sowing gaps",
        },
        {
          label: "Total Subtypes",
          value: data.summary.totalSubtypes,
          icon: <Agriculture />,
          color: "#2e7d32",
          bgcolor: "#e8f5e9",
          tooltip: "Total subtypes across all plants",
        },
        {
          label: activeTab === 1 ? "Total Available" : "Total Booking Gap",
          value: formatNumber(
            activeTab === 1 
              ? (data.summary.totalAvailableGap || 0)
              : (data.summary.totalBookingGap || 0)
          ),
          icon: activeTab === 1 ? <Inventory /> : <TrendingDown />,
          color: activeTab === 1 ? "#1976d2" : "#d32f2f",
          bgcolor: activeTab === 1 ? "#e3f2fd" : "#ffebee",
          tooltip: activeTab === 1 
            ? "Total plants available (surplus/sowed more than booked)" 
            : "Total plants that need to be sown",
        },
      ]
    : [];

  // Skeleton loader component for today's cards
  const TodayCardsSkeleton = () => (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="80%" height={40} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Box flex={1}>
                    <Skeleton variant="text" width="60%" height={14} />
                    <Skeleton variant="text" width="80%" height={24} sx={{ mt: 0.5 }} />
                  </Box>
                  <Skeleton variant="rectangular" width={40} height={24} sx={{ borderRadius: 1 }} />
                </Box>
                <Skeleton variant="rectangular" height={1} sx={{ my: 1.5 }} />
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="100%" height={20} sx={{ mt: 0.5 }} />
                <Skeleton variant="text" width="100%" height={20} sx={{ mt: 0.5 }} />
                <Skeleton variant="rectangular" height={1} sx={{ my: 1 }} />
                <Skeleton variant="text" width="100%" height={16} />
                <Skeleton variant="text" width="100%" height={16} sx={{ mt: 0.5 }} />
                <Skeleton variant="rectangular" width="100%" height={6} sx={{ mt: 1.5, borderRadius: 3 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );

  // Skeleton loader component for main gap analysis
  const GapAnalysisSkeleton = () => (
    <>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box flex={1}>
                    <Skeleton variant="text" width="60%" height={16} />
                    <Skeleton variant="text" width="80%" height={36} sx={{ mt: 1 }} />
                  </Box>
                  <Skeleton variant="circular" width={48} height={48} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {[1, 2, 3].map((i) => (
        <Card key={i} sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2} flex={1}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flex={1}>
                  <Skeleton variant="text" width="40%" height={28} />
                  <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                    <Skeleton variant="text" width="30%" height={16} />
                    <Skeleton variant="rectangular" width={100} height={6} sx={{ borderRadius: 3 }} />
                    <Skeleton variant="text" width="20%" height={16} />
                  </Box>
                </Box>
              </Box>
              <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </>
  );

  if (error) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchGapSummary}>
              Retry
            </Button>
          }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!data || !data.plants || data.plants.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">No plants with sowing gaps found.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Analytics sx={{ fontSize: 32, color: "#1976d2" }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: "#1976d2" }}>
            Sowing Gap Analysis
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <IconButton
            onClick={fetchTodaySowingCards}
            color="primary"
            sx={{
              bgcolor: "#e3f2fd",
              "&:hover": { bgcolor: "#bbdefb" },
              transition: "all 0.3s",
            }}>
            <RefreshIcon />
          </IconButton>
          <IconButton
            onClick={fetchGapSummary}
            color="primary"
            sx={{
              bgcolor: "#e3f2fd",
              "&:hover": { bgcolor: "#bbdefb" },
              transition: "all 0.3s",
            }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Today's Sowing Cards Section */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarToday color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1976d2" }}>
                Today&apos;s Sowing (Due & Current Day)
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {todayCardsData?.summary && (
                <Chip
                  label={`${todayCardsData.summary.totalSubtypes} Subtypes • ${formatNumber(todayCardsData.summary.totalGap)} Plants Needed`}
                  color="primary"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {todayCardsData?.subtypeCards && todayCardsData.subtypeCards.length > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleRequestAll}
                  sx={{ ml: 1 }}
                  disabled={loadingTodayCards}
                >
                  Request All
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ ml: 1 }}
              >
                Print
              </Button>
            </Box>
          </Box>

          {loadingTodayCards ? (
            <TodayCardsSkeleton />
          ) : todayCardsError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {todayCardsError}
            </Alert>
          ) : todayCardsData?.subtypeCards && todayCardsData.subtypeCards.length > 0 ? (
            <>
              {/* Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: "#ffebee", border: "2px solid #d32f2f" }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Due (Overdue)
                      </Typography>
                      <Typography variant="h5" color="error" sx={{ fontWeight: 700 }}>
                        {formatNumber(todayCardsData.summary.totalDueGap || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {todayCardsData.summary.dueSlots || 0} slots
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: "#fff3e0", border: "2px solid #f57c00" }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Today
                      </Typography>
                      <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                        {formatNumber(todayCardsData.summary.totalTodayGap || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {todayCardsData.summary.todaySlots || 0} slots
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: "#f5f5f5", border: "2px solid #616161" }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Total Needed
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "#616161" }}>
                        {formatNumber(todayCardsData.summary.totalGap || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {todayCardsData.summary.totalSlots || 0} slots
                      </Typography>
                      {(() => {
                        // Calculate total raw sowing and buffer
                        const totalRawSowing = todayCardsData.subtypeCards?.reduce((sum, card) => {
                          const rawGap = card.slots?.[0]?.bookingGapRaw || card.totalGap || 0;
                          return sum + rawGap;
                        }, 0) || 0;
                        const totalBuffer = todayCardsData.summary.totalGap - totalRawSowing;
                        const hasBuffer = totalBuffer > 0;
                        
                        return hasBuffer ? (
                          <Box mt={1} p={0.75} sx={{ bgcolor: "#fff3e0", borderRadius: 1, border: "1px solid #f57c00" }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#616161" }}>
                                Sowing:
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#616161" }}>
                                {formatNumber(totalRawSowing)}
                              </Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.25}>
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#f57c00" }}>
                                Buffer:
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#f57c00" }}>
                                {formatNumber(totalBuffer)}
                              </Typography>
                            </Box>
                            <Divider sx={{ my: 0.25 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#616161" }}>
                                Total:
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#616161" }}>
                                {formatNumber(todayCardsData.summary.totalGap || 0)}
                              </Typography>
                            </Box>
                          </Box>
                        ) : null;
                      })()}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: "#e3f2fd", border: "2px solid #1976d2" }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        Total Subtypes
                      </Typography>
                      <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                        {todayCardsData.summary.totalSubtypes || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {todayCardsData.summary.totalPlants || 0} plants
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Subtype Cards Grid */}
              <Grid container spacing={1.5}>
                {todayCardsData.subtypeCards.map((card, index) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} xl={2} key={`${card.plantId}-${card.subtypeId}`}>
                    <Fade in timeout={300 + index * 50}>
                      <Card
                        sx={{
                          height: "100%",
                          border: `2px solid ${card.totalGap > 0 ? "#d32f2f" : "#e0e0e0"}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: 6,
                            transform: "translateY(-4px)",
                          },
                        }}>
                        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <Box display="flex" justifyContent="space-between" alignItems="start" mb={0.75}>
                            <Box flex={1} sx={{ minWidth: 0 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {card.plantName}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 700, 
                                  color: "#1976d2",
                                  bgcolor: "#e3f2fd",
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 0.5,
                                  display: "inline-block",
                                  mt: 0.25,
                                  fontSize: "0.75rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "100%"
                                }}
                              >
                                {card.subtypeName}
                              </Typography>
                            </Box>
                            <Chip
                              label={card.totalSlots}
                              size="small"
                              color={card.totalGap > 0 ? "error" : "default"}
                              sx={{ fontSize: "0.65rem", height: "18px", ml: 0.5 }}
                            />
                          </Box>

                          <Box 
                            display="flex" 
                            justifyContent="space-between" 
                            alignItems="center" 
                            mb={0.75}
                            p={1}
                            sx={{ 
                              bgcolor: "#e8f5e9", 
                              borderRadius: 0.75, 
                              border: "1.5px solid #2e7d32" 
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "0.7rem" }}>
                              Total
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "0.95rem" }}>
                              {formatNumber(card.totalGap || 0)}
                            </Typography>
                          </Box>
                          {card.conversionFactor && (card.primaryUnit || card.secondaryUnit) && (
                            <Box 
                              display="flex" 
                              justifyContent="space-between" 
                              alignItems="center"
                              p={1}
                              mb={0.75}
                              sx={{ 
                                bgcolor: "#fff3e0", 
                                borderRadius: 0.75, 
                                border: "1.5px solid #f57c00" 
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: "#f57c00", fontSize: "0.7rem" }}>
                                Packets
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 700, color: "#f57c00", fontSize: "0.95rem" }}>
                                {((card.totalGap || 0) / card.conversionFactor).toFixed(2)} {card.primaryUnit?.symbol || card.primaryUnit?.name || card.secondaryUnit?.symbol || card.secondaryUnit?.name || "pkt"}
                              </Typography>
                            </Box>
                          )}
                          {card.availablePackets !== undefined && (
                            <Box 
                              display="flex" 
                              justifyContent="space-between" 
                              alignItems="center"
                              p={1}
                              mb={0.75}
                              sx={{ 
                                bgcolor: card.availablePackets > 0 ? "#e8f5e9" : "#ffebee", 
                                borderRadius: 0.75, 
                                border: `1.5px solid ${card.availablePackets > 0 ? "#2e7d32" : "#d32f2f"}` 
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700, color: card.availablePackets > 0 ? "#2e7d32" : "#d32f2f", fontSize: "0.7rem" }}>
                                Available
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 700, color: card.availablePackets > 0 ? "#2e7d32" : "#d32f2f", fontSize: "0.95rem" }}>
                                {formatNumber(card.availablePackets || 0)} {card.primaryUnit?.symbol || card.primaryUnit?.name || card.secondaryUnit?.symbol || card.secondaryUnit?.name || "pkt"}
                              </Typography>
                            </Box>
                          )}
                          {(() => {
                            const requestKey = `${card.plantId}-${card.subtypeId}`;
                            const existingRequest = existingRequests.get(requestKey);
                            
                            if (existingRequest) {
                              if (existingRequest.status === 'issued' && existingRequest.isIssuedToday) {
                                return (
                                  <Chip
                                    label="Stock Issued"
                                    size="small"
                                    color="success"
                                    sx={{ 
                                      mt: 0.5,
                                      width: "100%",
                                      fontSize: "0.7rem",
                                      height: "24px"
                                    }}
                                  />
                                );
                              } else if (existingRequest.status === 'pending' || existingRequest.status === 'processing') {
                                return (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    onClick={() => handleCancelRequest(card, existingRequest._id)}
                                    sx={{ 
                                      mt: 0.5,
                                      fontSize: "0.7rem",
                                      py: 0.5,
                                      borderColor: "#f57c00",
                                      color: "#f57c00",
                                      "&:hover": { 
                                        borderColor: "#e65100",
                                        bgcolor: "#fff3e0"
                                      }
                                    }}
                                  >
                                    Cancel Request
                                  </Button>
                                );
                              } else if (existingRequest.status === 'rejected') {
                                return (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    onClick={() => handleCreateRequest(card)}
                                    sx={{ 
                                      mt: 0.5,
                                      fontSize: "0.7rem",
                                      py: 0.5,
                                      borderColor: "#f57c00",
                                      color: "#f57c00",
                                      "&:hover": { 
                                        borderColor: "#e65100",
                                        bgcolor: "#fff3e0"
                                      }
                                    }}
                                  >
                                    Request Again
                                  </Button>
                                );
                              }
                            }
                            
                            if (card.conversionFactor && (card.primaryUnit || card.secondaryUnit)) {
                              return (
                                <Button
                                  variant="contained"
                                  size="small"
                                  fullWidth
                                  onClick={() => handleCreateRequest(card)}
                                  sx={{ 
                                    mt: 0.5,
                                    fontSize: "0.7rem",
                                    py: 0.5,
                                    bgcolor: "#1976d2",
                                    "&:hover": { bgcolor: "#1565c0" }
                                  }}
                                >
                                  Request Stock
                                </Button>
                              );
                            }
                            return null;
                          })()}
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : (
            <Alert severity="info">
              No sowing data for today. All slots are up to date or in the future.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Critical and Available */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              fontWeight: 600,
              fontSize: "1rem",
              textTransform: "none",
            },
            "& .Mui-selected": {
              color: activeTab === 0 ? "#d32f2f" : "#1976d2",
            },
          }}
          TabIndicatorProps={{
            style: {
              backgroundColor: activeTab === 0 ? "#d32f2f" : "#1976d2",
              height: 3,
            },
          }}>
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Warning color="error" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Critical (Overdue & Urgent)
                </Typography>
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Inventory color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Available (Negative Gaps)
                </Typography>
              </Box>
            }
          />
        </Tabs>
      </Card>

      {/* Stats Cards */}
      {loading ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box flex={1}>
                      <Skeleton variant="text" width="60%" height={16} />
                      <Skeleton variant="text" width="80%" height={36} sx={{ mt: 1 }} />
                    </Box>
                    <Skeleton variant="circular" width={48} height={48} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {statCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Fade in timeout={300 + index * 100}>
                <Tooltip title={card.tooltip} arrow>
                  <Card
                    sx={{
                      bgcolor: card.bgcolor,
                      border: `2px solid ${card.color}40`,
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 6,
                        borderColor: card.color,
                      },
                    }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
                            {card.label}
                          </Typography>
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              color: card.color,
                              mt: 1,
                            }}>
                            {card.value}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            color: card.color,
                            fontSize: "3rem",
                            opacity: 0.8,
                          }}>
                          {card.icon}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Tooltip>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Analytics Charts - All based on Subtypes */}
      {loading ? (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : analyticsData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Top Subtypes by Gap - Horizontal Bar Chart */}
          {analyticsData.topSubtypesData.length > 0 && (
            <Grid item xs={12} md={8}>
              <Card 
                sx={{ 
                  height: "100%",
                  boxShadow: 3,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
                }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          bgcolor: "#d32f2f",
                          borderRadius: 2,
                          p: 1,
                          display: "flex",
                          alignItems: "center",
                        }}>
                        <TrendingDown sx={{ color: "white", fontSize: 24 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>
                          Top Subtypes by Booking Gap
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {analyticsData.allSubtypesCount} subtypes with gaps
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={analyticsData.topSubtypesData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                          return value.toString();
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="displayName"
                        tick={{ fontSize: 11 }}
                        width={95}
                      />
                      <RechartsTooltip
                        formatter={(value, name, props) => {
                          const data = props.payload;
                          return [
                            <Box key="tooltip">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {data.fullName}
                              </Typography>
                              <Typography variant="caption">
                                Gap: {formatNumber(value)} plants
                              </Typography>
                              <Typography variant="caption" display="block">
                                Booked: {formatNumber(data.booked)}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Sowed: {formatNumber(data.sowed)} ({data.completionPercentage}%)
                              </Typography>
                              <Typography variant="caption" display="block">
                                Slots: {data.slotCount}
                              </Typography>
                            </Box>,
                            "Gap",
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                          padding: 8,
                        }}
                      />
                      <Bar
                        dataKey="gap"
                        radius={[0, 8, 8, 0]}
                        fill="#d32f2f">
                        {analyticsData.topSubtypesData.map((entry, index) => {
                          const gap = entry.gap;
                          let color = "#388e3c"; // green
                          if (gap >= 100000) color = "#d32f2f"; // red - critical
                          else if (gap >= 50000) color = "#f57c00"; // orange - high
                          else if (gap >= 10000) color = "#fbc02d"; // yellow - medium
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Gap Distribution Pie Chart */}
          {analyticsData.pieChartData.length > 0 && (
            <Grid item xs={12} md={4}>
              <Card
                sx={{
                  height: "100%",
                  boxShadow: 3,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
                }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box
                      sx={{
                        bgcolor: "#1976d2",
                        borderRadius: 2,
                        p: 1,
                        display: "flex",
                        alignItems: "center",
                      }}>
                      <PieChartIcon sx={{ color: "white", fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>
                      Gap Distribution by Range
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <defs>
                        {analyticsData.pieChartData.map((entry, index) => (
                          <linearGradient
                            key={`gradient-${index}`}
                            id={`gradient-${index}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={analyticsData.pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) =>
                          `${name}\n${value} subtypes (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={100}
                        innerRadius={40}
                        paddingAngle={2}
                        dataKey="value">
                        {analyticsData.pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`url(#gradient-${index})`}
                            stroke={entry.color}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name, props) => {
                          const data = props.payload;
                          return [
                            <Box key="tooltip">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {data.name}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Subtypes: {value}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Total Gap: {formatNumber(data.total)} plants
                              </Typography>
                            </Box>,
                            "Count",
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                          padding: 8,
                        }}
                      />
                      <Legend
                        formatter={(value, entry) => (
                          <span style={{ color: entry.color, fontWeight: 600 }}>
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Priority Distribution Chart */}
          {analyticsData.priorityChartData.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  height: "100%",
                  boxShadow: 3,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
                }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box
                      sx={{
                        bgcolor: "#f57c00",
                        borderRadius: 2,
                        p: 1,
                        display: "flex",
                        alignItems: "center",
                      }}>
                      <Warning sx={{ color: "white", fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>
                      Priority Distribution (Slots)
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.priorityChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <RechartsTooltip
                        formatter={(value) => [`${value} slots`, "Count"]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                          padding: 8,
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {analyticsData.priorityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Plant-wise Subtype Count */}
          {analyticsData.plantSubtypeData.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  height: "100%",
                  boxShadow: 3,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
                }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box
                      sx={{
                        bgcolor: "#2e7d32",
                        borderRadius: 2,
                        p: 1,
                        display: "flex",
                        alignItems: "center",
                      }}>
                      <LocalFlorist sx={{ color: "white", fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2" }}>
                      Plants by Subtype Count
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData.plantSubtypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value, name, props) => {
                          const data = props.payload;
                          return [
                            <Box key="tooltip">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {data.fullName}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Subtypes with gaps: {value}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Total gap: {formatNumber(data.totalGap)} plants
                              </Typography>
                            </Box>,
                            "Subtypes",
                          ];
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e0e0e0",
                          borderRadius: 8,
                          padding: 8,
                        }}
                      />
                      <Bar dataKey="subtypeCount" radius={[8, 8, 0, 0]} fill="#2e7d32">
                        {analyticsData.plantSubtypeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Plants List with Enhanced Analytics */}
      {loading ? (
        <>
          {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box flex={1}>
                      <Skeleton variant="text" width="40%" height={28} />
                      <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                        <Skeleton variant="text" width="30%" height={16} />
                        <Skeleton variant="rectangular" width={100} height={6} sx={{ borderRadius: 3 }} />
                        <Skeleton variant="text" width="20%" height={16} />
                      </Box>
                    </Box>
                  </Box>
                  <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </>
      ) : data.plants ? (
        data.plants
        .filter((plant) => {
          // Filter plants based on active tab
          if (activeTab === 0) {
            // Critical tab: show plants with positive gaps (overdue/urgent)
            return (plant.totalBookingGap || 0) > 0;
          } else {
            // Available tab: show all plants (we'll check subtypes for negative gaps via API)
            console.log("[Render] Available tab - plant:", plant.plantName, "subtypes:", plant.subtypes?.length);
            return true;
          }
        })
        .map((plant, plantIndex) => {
          const isPlantExpanded = expandedPlants.has(plant._id);
          const plantSubtypes = plant.subtypes || [];
          const totalSubtypes = plantSubtypes.length;
          
          // Filter subtypes based on active tab
          const filteredSubtypes = activeTab === 0
            ? plantSubtypes.filter((st) => (st.totalBookingGap || 0) > 0)
            : plantSubtypes; // Available tab: show all subtypes, API will filter by negative gaps
          
          if (activeTab === 1) {
            console.log(`[Render] Available tab - Plant ${plant.plantName}: ${filteredSubtypes.length} subtypes`);
          }
          
          const subtypesWithGap = filteredSubtypes.length;
          const completionPercentage = totalSubtypes > 0 ? (subtypesWithGap / totalSubtypes) * 100 : 0;

        return (
          <Zoom
            in
            timeout={300 + plantIndex * 100}
            key={plant._id}
            style={{ transitionDelay: `${plantIndex * 50}ms` }}>
            <Card
              sx={{
                mb: 2,
                transition: "all 0.3s ease",
                border: `2px solid ${isPlantExpanded ? "#1976d2" : "#e0e0e0"}`,
                "&:hover": {
                  boxShadow: 4,
                  borderColor: "#1976d2",
                },
              }}>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ cursor: "pointer" }}
                  onClick={() => togglePlantExpansion(plant._id)}>
                  <Box display="flex" alignItems="center" gap={2} flex={1}>
                    <IconButton
                      size="small"
                      sx={{
                        bgcolor: isPlantExpanded ? "#e3f2fd" : "transparent",
                        transition: "all 0.3s",
                      }}>
                      {isPlantExpanded ? (
                        <ExpandLessIcon color="primary" />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                    <LocalFlorist sx={{ color: "#1976d2", fontSize: 28 }} />
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {plant.plantName}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {totalSubtypes} subtypes • {subtypesWithGap} {activeTab === 1 ? "with available" : "with gaps"}
                        </Typography>
                        <Box sx={{ width: 100 }}>
                          <LinearProgress
                            variant="determinate"
                            value={completionPercentage}
                            color={activeTab === 1 ? "primary" : "error"}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography 
                          variant="caption" 
                          color={activeTab === 1 ? "primary.main" : "error.main"} 
                          sx={{ fontWeight: 600 }}>
                          {completionPercentage.toFixed(0)}% {activeTab === 1 ? "available" : "with gaps"}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Chip
                    label={
                      activeTab === 1
                        ? `Available: ${formatNumber(plant.totalAvailableGap || 0)}`
                        : `Gap: ${formatNumber(plant.totalBookingGap || 0)}`
                    }
                    color={activeTab === 1 ? "primary" : "error"}
                    icon={activeTab === 1 ? <Inventory /> : <TrendingDown />}
                    sx={{ fontSize: "0.9rem", fontWeight: 600, ml: 2 }}
                  />
                </Box>

                <Collapse in={isPlantExpanded} timeout="auto" unmountOnExit>
                  <Box mt={3}>
                    {filteredSubtypes.length > 0 ? (
                      filteredSubtypes.map((subtype, subtypeIndex) => {
                        const subtypeKey = `${plant._id}-${subtype._id}`;
                        const isSubtypeExpanded =
                          expandedSubtypes.get(plant._id)?.has(subtype._id) || false;
                        const reminders = subtypeReminders.get(subtypeKey) || [];
                        const stats = subtypeStats.get(subtypeKey) || null;
                        const isLoadingReminders = loadingReminders.has(subtypeKey);
                        const gapPercentage = activeTab === 1
                          ? (subtype.totalPrimarySowed > 0
                              ? ((subtype.totalAvailableGap || 0) / subtype.totalPrimarySowed * 100).toFixed(1)
                              : 0)
                          : (subtype.totalBookedPlants > 0
                              ? ((subtype.totalBookingGap || 0) / subtype.totalBookedPlants * 100).toFixed(1)
                              : 0);
                        
                        // For available tab, we want to show available/surplus
                        const isAvailableTab = activeTab === 1;

                        return (
                          <Grow
                            in
                            timeout={300}
                            key={subtype._id}
                            style={{ transitionDelay: `${subtypeIndex * 50}ms` }}>
                            <Card
                              variant="outlined"
                              sx={{
                                mb: 2,
                                ml: 4,
                                bgcolor: isSubtypeExpanded ? "#fafafa" : "white",
                                transition: "all 0.3s ease",
                                border: `2px solid ${isSubtypeExpanded ? "#2e7d32" : "#e0e0e0"}`,
                                "&:hover": {
                                  borderColor: "#2e7d32",
                                  boxShadow: 2,
                                },
                              }}>
                              <CardContent>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  sx={{ cursor: "pointer" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("[onClick] Subtype clicked:", { plantId: plant._id, subtypeId: subtype._id, activeTab });
                                    toggleSubtypeExpansion(plant._id, subtype._id);
                                  }}>
                                  <Box display="flex" alignItems="center" gap={2} flex={1}>
                                    <IconButton size="small">
                                      {isSubtypeExpanded ? (
                                        <ExpandLessIcon color="success" />
                                      ) : (
                                        <ExpandMoreIcon />
                                      )}
                                    </IconButton>
                                    <Agriculture sx={{ color: "#2e7d32", fontSize: 20 }} />
                                    <Box flex={1}>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {subtype.subtypeName}
                                      </Typography>
                                      <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                                        <Typography variant="caption" color="text.secondary">
                                          {subtype.slotCount} slots
                                        </Typography>
                                        {activeTab === 1 ? (
                                          subtype.totalPrimarySowed > 0 && (
                                            <>
                                              <Typography variant="caption" color="text.secondary">
                                                • Available: {gapPercentage}% of sowed
                                              </Typography>
                                              <Box sx={{ width: 80 }}>
                                                <LinearProgress
                                                  variant="determinate"
                                                  value={Math.min(Number(gapPercentage), 100)}
                                                  color="primary"
                                                  sx={{ height: 4, borderRadius: 2 }}
                                                />
                                              </Box>
                                            </>
                                          )
                                        ) : (
                                          subtype.totalBookedPlants > 0 && (
                                            <>
                                              <Typography variant="caption" color="text.secondary">
                                                • Gap: {gapPercentage}% of booked
                                              </Typography>
                                              <Box sx={{ width: 80 }}>
                                                <LinearProgress
                                                  variant="determinate"
                                                  value={Math.min(Number(gapPercentage), 100)}
                                                  color={Number(gapPercentage) > 50 ? "error" : "warning"}
                                                  sx={{ height: 4, borderRadius: 2 }}
                                                />
                                              </Box>
                                            </>
                                          )
                                        )}
                                      </Box>
                                    </Box>
                                  </Box>
                                  <Box display="flex" gap={1} alignItems="center">
                                    {activeTab === 1 ? (
                                      <Chip
                                        label={`Available: ${formatNumber(subtype.totalAvailableGap || 0)}`}
                                        color={subtype.totalAvailableGap > 0 ? "primary" : "default"}
                                        size="small"
                                        icon={<Inventory />}
                                      />
                                    ) : (
                                      <Chip
                                        label={`Gap: ${formatNumber(subtype.totalBookingGap || 0)}`}
                                        color={subtype.totalBookingGap > 0 ? "error" : "success"}
                                        size="small"
                                        icon={<TrendingDown />}
                                      />
                                    )}
                                    <Chip
                                      label={`${subtype.slotCount} slots`}
                                      size="small"
                                      variant="outlined"
                                      icon={<CalendarToday />}
                                    />
                                  </Box>
                                </Box>

                                <Collapse
                                  in={isSubtypeExpanded}
                                  timeout="auto"
                                  unmountOnExit>
                                  <Box mt={2}>
                                    {isLoadingReminders ? (
                                      <Box display="flex" justifyContent="center" p={3}>
                                        <CircularProgress />
                                      </Box>
                                    ) : reminders.length > 0 ? (
                                      <>
                                        {/* Sowing Needed Stats Cards (Excluding Future) */}
                                        {!isAvailableTab && stats && (
                                          <Box mb={3}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#1976d2" }}>
                                                📊 Sowing Needed (Current & Past - Excluding Future)
                                              </Typography>
                                              {plantsSowingBuffer.has(plant._id.toString()) && (
                                                <Chip
                                                  label={`Buffer: ${plantsSowingBuffer.get(plant._id.toString()) || 0}%`}
                                                  size="small"
                                                  color={plantsSowingBuffer.get(plant._id.toString()) > 0 ? "warning" : "default"}
                                                  sx={{ fontSize: "0.7rem" }}
                                                />
                                              )}
                                            </Box>
                                            <Grid container spacing={2}>
                                              <Grid item xs={12} sm={6} md={3}>
                                                <Card sx={{ bgcolor: "#ffebee", border: "2px solid #d32f2f" }}>
                                                  <CardContent>
                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                      <Warning color="error" fontSize="small" />
                                                      <Typography variant="caption" color="text.secondary">
                                                        Overdue
                                                      </Typography>
                                                    </Box>
                                                    <Typography variant="h5" color="error" sx={{ fontWeight: 700 }}>
                                                      {formatNumber(stats.overdueGap || 0)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      {stats.overdueCount || 0} slots
                                                    </Typography>
                                                  </CardContent>
                                                </Card>
                                              </Grid>
                                              <Grid item xs={12} sm={6} md={3}>
                                                <Card sx={{ bgcolor: "#fff3e0", border: "2px solid #f57c00" }}>
                                                  <CardContent>
                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                      <Warning color="warning" fontSize="small" />
                                                      <Typography variant="caption" color="text.secondary">
                                                        Urgent (≤2 days)
                                                      </Typography>
                                                    </Box>
                                                    <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                                                      {formatNumber(stats.urgentGap || 0)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      {stats.urgentCount || 0} slots
                                                    </Typography>
                                                  </CardContent>
                                                </Card>
                                              </Grid>
                                              <Grid item xs={12} sm={6} md={3}>
                                                <Card sx={{ bgcolor: "#e3f2fd", border: "2px solid #1976d2" }}>
                                                  <CardContent>
                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                      <Schedule color="info" fontSize="small" />
                                                      <Typography variant="caption" color="text.secondary">
                                                        Upcoming (≤5 days)
                                                      </Typography>
                                                    </Box>
                                                    <Typography variant="h5" color="info.main" sx={{ fontWeight: 700 }}>
                                                      {formatNumber(stats.upcomingGap || 0)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      {stats.upcomingCount || 0} slots
                                                    </Typography>
                                                  </CardContent>
                                                </Card>
                                              </Grid>
                                              <Grid item xs={12} sm={6} md={3}>
                                                <Card sx={{ bgcolor: "#f5f5f5", border: "2px solid #616161" }}>
                                                  <CardContent>
                                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                                      <TrendingDown color="action" fontSize="small" />
                                                      <Typography variant="caption" color="text.secondary">
                                                        Total Needed
                                                      </Typography>
                                                    </Box>
                                                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#616161" }}>
                                                      {formatNumber(stats.totalBookingGap || 0)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                      {stats.totalSlots || 0} slots (excl. future)
                                                    </Typography>
                                                  </CardContent>
                                                </Card>
                                              </Grid>
                                            </Grid>
                                          </Box>
                                        )}

                                        {/* Summary Stats for Reminders */}
                                        <Box mb={2} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                                          <Grid container spacing={2}>
                                            <Grid item xs={12} sm={4}>
                                              <Typography variant="caption" color="text.secondary">
                                                {isAvailableTab ? "Total Slots Available" : "Total Slots with Gaps"}
                                              </Typography>
                                              <Typography variant="h6" color={isAvailableTab ? "primary" : "error"}>
                                                {reminders.length}
                                              </Typography>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                              <Typography variant="caption" color="text.secondary">
                                                {isAvailableTab ? "Total Available" : "Total Gap"}
                                              </Typography>
                                              <Typography variant="h6" color={isAvailableTab ? "primary" : "error"}>
                                                {formatNumber(
                                                  isAvailableTab
                                                    ? reminders.reduce(
                                                        (sum, r) => sum + Math.abs(r.bookingGap || 0),
                                                        0
                                                      )
                                                    : reminders.reduce(
                                                        (sum, r) => sum + (r.bookingGap || 0),
                                                        0
                                                      )
                                                )}
                                              </Typography>
                                            </Grid>
                                            {!isAvailableTab && (
                                              <Grid item xs={12} sm={4}>
                                                <Typography variant="caption" color="text.secondary">
                                                  Overdue Slots
                                                </Typography>
                                                <Typography variant="h6" color="error">
                                                  {
                                                    reminders.filter(
                                                      (r) => r.priority === "overdue"
                                                    ).length
                                                  }
                                                </Typography>
                                              </Grid>
                                            )}
                                          </Grid>
                                        </Box>

                                        <TableContainer
                                          component={Paper}
                                          variant="outlined"
                                          sx={{ borderRadius: 2 }}>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                                                <TableCell>
                                                  <Box display="flex" alignItems="center" gap={1}>
                                                    <CalendarToday fontSize="small" />
                                                    Slot Date
                                                  </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                                    <ShoppingCart fontSize="small" />
                                                    Booked
                                                  </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                                    <CheckCircle fontSize="small" />
                                                    Sowed
                                                  </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                                    {isAvailableTab ? (
                                                      <Inventory fontSize="small" />
                                                    ) : (
                                                      <TrendingDown fontSize="small" />
                                                    )}
                                                    {isAvailableTab ? "Available" : "Gap"}
                                                  </Box>
                                                </TableCell>
                                                <TableCell>
                                                  <Box display="flex" alignItems="center" gap={1}>
                                                    <Schedule fontSize="small" />
                                                    Sow By
                                                  </Box>
                                                </TableCell>
                                                <TableCell>
                                                  <Box display="flex" alignItems="center" gap={1}>
                                                    <Warning fontSize="small" />
                                                    Priority
                                                  </Box>
                                                </TableCell>
                                                <TableCell>Actions</TableCell>
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {reminders.map((reminder, reminderIndex) => {
                                                const isLoadingSlotOrders =
                                                  loadingOrders.has(reminder.slotId);
                                                
                                                // For Available tab, bookingGap is negative, convert to positive available
                                                const availableAmount = isAvailableTab 
                                                  ? Math.abs(reminder.bookingGap || 0)
                                                  : (reminder.bookingGap || 0);
                                                
                                                const gapPercentage = isAvailableTab
                                                  ? (reminder.primarySowed > 0
                                                      ? ((availableAmount / reminder.primarySowed) * 100).toFixed(1)
                                                      : 0)
                                                  : (reminder.totalBookedPlants > 0
                                                      ? ((reminder.bookingGap / reminder.totalBookedPlants) * 100).toFixed(1)
                                                      : 0);
                                                return (
                                                  <TableRow
                                                    key={reminder._id}
                                                    hover
                                                    sx={{
                                                      bgcolor:
                                                        reminder.priority === "overdue"
                                                          ? "#ffebee"
                                                          : reminder.priority === "future"
                                                          ? "#fafafa"
                                                          : "transparent",
                                                      opacity: reminder.priority === "future" ? 0.8 : 1,
                                                      transition: "all 0.2s",
                                                      "&:hover": {
                                                        bgcolor:
                                                          reminder.priority === "overdue"
                                                            ? "#ffcdd2"
                                                            : reminder.priority === "future"
                                                            ? "#f0f0f0"
                                                            : "#f5f5f5",
                                                      },
                                                    }}>
                                                    <TableCell>
                                                      {reminder.slotStartDay === reminder.slotEndDay
                                                        ? reminder.slotStartDay
                                                        : `${reminder.slotStartDay} - ${reminder.slotEndDay}`}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Typography sx={{ fontWeight: 600 }}>
                                                        {formatNumber(reminder.totalBookedPlants)}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Typography
                                                        sx={{
                                                          fontWeight: 600,
                                                          color: "#2e7d32",
                                                        }}>
                                                        {formatNumber(reminder.primarySowed)}
                                                      </Typography>
                                                      {reminder.totalBookedPlants > 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                          (
                                                          {(
                                                            (reminder.primarySowed / reminder.totalBookedPlants) *
                                                            100
                                                          ).toFixed(1)}
                                                          %)
                                                        </Typography>
                                                      )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                      <Box>
                                                        <Chip
                                                          label={
                                                            isAvailableTab
                                                              ? `${formatNumber(availableAmount)} (${gapPercentage}%)`
                                                              : `${formatNumber(reminder.bookingGap)} (${gapPercentage}%)`
                                                          }
                                                          color={
                                                            isAvailableTab
                                                              ? "primary"
                                                              : reminder.bookingGap > 0
                                                              ? "error"
                                                              : "success"
                                                          }
                                                          size="small"
                                                          sx={{ fontWeight: 600 }}
                                                        />
                                                        {!isAvailableTab && reminder.bookingGapRaw !== undefined && reminder.bookingGapRaw !== reminder.bookingGap && (
                                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block", mt: 0.5 }}>
                                                            Raw: {formatNumber(reminder.bookingGapRaw)} + Buffer
                                                          </Typography>
                                                        )}
                                                      </Box>
                                                      {(isAvailableTab ? reminder.primarySowed > 0 : reminder.totalBookedPlants > 0) && (
                                                        <Box sx={{ width: "100%", mt: 0.5 }}>
                                                          <LinearProgress
                                                            variant="determinate"
                                                            value={Math.min(Math.abs(Number(gapPercentage)), 100)}
                                                            color={
                                                              isAvailableTab
                                                                ? "primary"
                                                                : Number(gapPercentage) > 50
                                                                ? "error"
                                                                : "warning"
                                                            }
                                                            sx={{ height: 4, borderRadius: 2 }}
                                                          />
                                                        </Box>
                                                      )}
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip
                                                        label={reminder.sowByDate}
                                                        size="small"
                                                        variant="outlined"
                                                        icon={<Schedule />}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Chip
                                                        label={reminder.priority}
                                                        color={getPriorityColor(reminder.priority)}
                                                        size="small"
                                                        icon={<Warning />}
                                                      />
                                                    </TableCell>
                                                    <TableCell>
                                                      <Tooltip title="View Orders">
                                                        <IconButton
                                                          size="small"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSlotClick(reminder.slotId);
                                                          }}
                                                          disabled={isLoadingSlotOrders}
                                                          color="primary"
                                                          sx={{
                                                            "&:hover": {
                                                              bgcolor: "#e3f2fd",
                                                            },
                                                          }}>
                                                          {isLoadingSlotOrders ? (
                                                            <CircularProgress size={16} />
                                                          ) : (
                                                            <Assignment fontSize="small" />
                                                          )}
                                                        </IconButton>
                                                      </Tooltip>
                                                    </TableCell>
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        </TableContainer>
                                      </>
                                    ) : (
                                      <Alert severity="info" icon={<InfoIcon />}>
                                        No reminders found for this subtype.
                                      </Alert>
                                    )}
                                  </Box>
                                </Collapse>
                              </CardContent>
                            </Card>
                          </Grow>
                        );
                      })
                    ) : (
                      <Alert severity="info" sx={{ ml: 4 }} icon={<InfoIcon />}>
                        No subtypes found for this plant.
                      </Alert>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Zoom>
        );
      })
      ) : null}

      {/* Slot Orders Dialog */}
      <Dialog
        open={slotOrdersDialogOpen}
        onClose={() => setSlotOrdersDialogOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}>
        <DialogTitle
          sx={{
            bgcolor: "#1976d2",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Assignment />
            <Typography variant="h6">Slot Orders Summary</Typography>
          </Box>
          <IconButton
            onClick={() => setSlotOrdersDialogOpen(false)}
            sx={{ color: "white" }}>
            <InfoIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedSlot && (
            <>
              {selectedSlot.slotInfo && (
                <Card sx={{ mb: 2, bgcolor: "#f5f5f5" }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      📋 Slot Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <LocalFlorist fontSize="small" color="primary" />
                          <Typography variant="body2">
                            <strong>Plant:</strong> {selectedSlot.slotInfo.plantName}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <CalendarToday fontSize="small" color="primary" />
                          <Typography variant="body2">
                            <strong>Date:</strong> {selectedSlot.slotInfo.slot?.startDay}
                            {selectedSlot.slotInfo.slot?.endDay !==
                            selectedSlot.slotInfo.slot?.startDay
                              ? ` - ${selectedSlot.slotInfo.slot?.endDay}`
                              : ""}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Inventory fontSize="small" color="primary" />
                          <Typography variant="body2">
                            <strong>Total Capacity:</strong>{" "}
                            {formatNumber(selectedSlot.slotInfo.slot?.totalPlants)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <CheckCircle fontSize="small" color="success" />
                          <Typography variant="body2">
                            <strong>Primary Sowed:</strong>{" "}
                            {formatNumber(selectedSlot.slotInfo.slot?.primarySowed)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              )}

              {selectedSlot.summary && (
                <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
                  <Chip
                    icon={<ShoppingCart />}
                    label={`Total Orders: ${selectedSlot.summary.totalOrders}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={<Inventory />}
                    label={`Total Plants: ${formatNumber(selectedSlot.summary.totalPlants)}`}
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    icon={<AccountBalance />}
                    label={`Total Value: ₹${formatNumber(selectedSlot.summary.totalValue)}`}
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              {selectedSlot.orders && selectedSlot.orders.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Farmer</TableCell>
                        <TableCell>Mobile</TableCell>
                        <TableCell align="right">Plants</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Payment</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedSlot.orders.map((order) => (
                        <TableRow key={order._id} hover>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>
                              {order.orderId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>
                              {order.farmer?.name || "Unknown"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.farmer?.village || ""}
                              {order.farmer?.taluka ? `, ${order.farmer.taluka}` : ""}
                            </Typography>
                          </TableCell>
                          <TableCell>{order.farmer?.mobileNumber || "-"}</TableCell>
                          <TableCell align="right">
                            <Typography sx={{ fontWeight: 600 }}>
                              {formatNumber(order.numberOfPlants)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ fontWeight: 600, color: "#2e7d32" }}>
                              ₹{order.rate || 0}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.orderStatus}
                              size="small"
                              color={
                                order.orderStatus === "COMPLETED"
                                  ? "success"
                                  : order.orderStatus === "CANCELLED"
                                  ? "error"
                                  : "default"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.orderPaymentStatus}
                              size="small"
                              color={
                                order.orderPaymentStatus === "COMPLETED"
                                  ? "success"
                                  : "warning"
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info" icon={<InfoIcon />}>
                  No orders found for this slot.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button
            onClick={() => setSlotOrdersDialogOpen(false)}
            variant="contained"
            color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Dialog */}
      <Dialog open={alertDialog.open} onClose={() => setAlertDialog({ open: false, message: "", title: "" })}>
        <DialogTitle>{alertDialog.title || "Alert"}</DialogTitle>
        <DialogContent>
          <Typography style={{ whiteSpace: 'pre-line' }}>{alertDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialog({ open: false, message: "", title: "" })}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, message: "", title: "", onConfirm: null })}>
        <DialogTitle>{confirmDialog.title || "Confirm"}</DialogTitle>
        <DialogContent>
          <Typography style={{ whiteSpace: 'pre-line' }}>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, message: "", title: "", onConfirm: null })}>Cancel</Button>
          <Button
            onClick={() => {
              if (confirmDialog.onConfirm) {
                confirmDialog.onConfirm();
              }
              setConfirmDialog({ open: false, message: "", title: "", onConfirm: null });
            }}
            variant="contained"
            color="primary"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog open={promptDialog.open} onClose={() => setPromptDialog({ open: false, message: "", title: "", defaultValue: "", onConfirm: null, label: "" })}>
        <DialogTitle>{promptDialog.title || "Input"}</DialogTitle>
        <DialogContent>
          <Typography style={{ whiteSpace: 'pre-line', mb: 2 }}>{promptDialog.message}</Typography>
          <TextField
            autoFocus
            margin="dense"
            label={promptDialog.label || "Value"}
            type="number"
            fullWidth
            variant="outlined"
            defaultValue={promptDialog.defaultValue}
            inputProps={{ step: 0.01, min: 0 }}
            inputRef={(input) => {
              if (input) {
                promptInputRef.current = input;
                setTimeout(() => input.select(), 100);
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const value = e.target.value || promptDialog.defaultValue;
                if (promptDialog.onConfirm) {
                  promptDialog.onConfirm(value);
                }
                setPromptDialog({ open: false, message: "", title: "", defaultValue: "", onConfirm: null, label: "" });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptDialog({ open: false, message: "", title: "", defaultValue: "", onConfirm: null, label: "" })}>Cancel</Button>
          <Button
            onClick={() => {
              const value = promptInputRef.current?.value || promptDialog.defaultValue;
              if (promptDialog.onConfirm) {
                promptDialog.onConfirm(value);
              }
              setPromptDialog({ open: false, message: "", title: "", defaultValue: "", onConfirm: null, label: "" });
            }}
            variant="contained"
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SowingGapAnalysis;
