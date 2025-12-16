import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  Save,
  Refresh,
  CalendarToday,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import axios from "axios";
import { CookieKeys } from "constants/cookieKeys";
import { Toast } from "helpers/toasts/toastHelper";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useUserData, useUserRole } from "utils/roleUtils";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import { Loader } from "redux/dispatcher/Loader";
import LogoutIcon from "@mui/icons-material/Logout";
import MotivationalQuoteModal from "components/Modals/MotivationalQuoteModal";

const PrimarySowingEntry = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const userData = useUserData();
  const userRole = useUserRole();
  const logoutModel = useLogoutModel();
  
  // Handle logout
  const handleLogout = async () => {
    Loader.show();
    await logoutModel.logout();
    Loader.hide();
    navigate("/auth/login", { replace: true });
  };
  
  // Check if user has access: PRIMARY jobTitle, SUPER_ADMIN, or ADMIN role
  const userJobTitle = useSelector((state) => state?.userData?.userData?.jobTitle);
  const isPrimaryEmployee = userJobTitle && (userJobTitle.toUpperCase() === "PRIMARY");
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN";
  const hasAccess = isPrimaryEmployee || isSuperAdmin || isAdmin;
  
  // Redirect if user doesn't have access (only after userData is loaded)
  useEffect(() => {
    if (userData !== undefined && userRole !== undefined) {
      if (!hasAccess) {
        Toast.error("Access denied. This page is only for PRIMARY employees, ADMIN, or SUPER_ADMIN.");
        navigate("/u/dashboard", { replace: true });
      }
    }
  }, [userData, userRole, hasAccess, navigate]);

  const [availablePackets, setAvailablePackets] = useState([]);
  const [loadingPackets, setLoadingPackets] = useState(false);
  const [selectedPackets, setSelectedPackets] = useState([]); // Array of selected packets with quantities
  const [primaryQuantities, setPrimaryQuantities] = useState({}); // Map of itemId -> primary quantity for field sowing
  const [plantReadyDays, setPlantReadyDays] = useState({}); // Map of plantId_subtypeId -> plantReadyDays value
  const [formData, setFormData] = useState({
    sowingDate: moment(),
    batchNumber: "",
    notes: "",
    reminderBeforeDays: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quote, setQuote] = useState(null);

  // Check if user has seen today's quote
  const hasSeenTodaysQuote = () => {
    const lastSeenDate = localStorage.getItem("lastQuoteSeenDate");
    const today = new Date().toDateString();
    return lastSeenDate === today;
  };

  // Mark today's quote as seen
  const markQuoteAsSeen = () => {
    const today = new Date().toDateString();
    localStorage.setItem("lastQuoteSeenDate", today);
  };

  // Fetch today's motivational quote
  const fetchTodaysQuote = async () => {
    try {
      const instance = NetworkManager(API.MOTIVATIONAL_QUOTE.GET_TODAY);
      const response = await instance.request();

      // NetworkManager returns { success: boolean, data: backendResponse }
      // Backend response structure: { status: "Success", message: "...", data: { quote } }
      if (response?.success && response?.data) {
        const backendData = response.data.data || response.data;
        if (backendData && backendData.line1 && backendData.line2) {
          return {
            line1: backendData.line1,
            line2: backendData.line2,
            id: backendData.id
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching motivational quote:", error);
      return null;
    }
  };

  // Check and show motivational quote if not seen today
  const checkAndShowQuote = async () => {
    // Check if user has already seen today's quote
    if (hasSeenTodaysQuote()) {
      return;
    }

    // Fetch today's quote
    const todaysQuote = await fetchTodaysQuote();
    if (todaysQuote) {
      setQuote(todaysQuote);
      setShowQuoteModal(true);
      markQuoteAsSeen();
    }
  };

  const handleQuoteModalClose = () => {
    setShowQuoteModal(false);
  };

  useEffect(() => {
    if (hasAccess && userData !== undefined) {
      fetchAllAvailablePackets();
      // Check and show motivational quote if not seen today
      checkAndShowQuote();
    }
  }, [hasAccess, userData]);

  // Auto-fill Packets and Primary (Field) on form load (only once)
  useEffect(() => {
    if (availablePackets.length > 0 && !hasAutoFilled && selectedPackets.length === 0) {
      const primaryQuantitiesKeys = Object.keys(primaryQuantities);
      if (primaryQuantitiesKeys.length === 0) {
        console.log("[PrimarySowingEntry] Auto-filling inputs on form load");
        
        const newSelectedPackets = [];
        const newPrimaryQuantities = {};
        
        availablePackets.forEach(plantGroup => {
          plantGroup.subtypes?.forEach(subtypeGroup => {
            // Combine packets by batch (same logic as in render)
            const combinedMap = new Map();
            subtypeGroup.packets?.forEach(packet => {
              const key = `${packet.productId || packet.productName}_${packet.batchNumber || 'NO_BATCH'}`;
              
              if (!combinedMap.has(key)) {
                combinedMap.set(key, {
                  productId: packet.productId,
                  productName: packet.productName,
                  batchNumber: packet.batchNumber || 'N/A',
                  unit: packet.unit,
                  plantId: packet.plantId,
                  plantName: packet.plantName,
                  subtypeId: packet.subtypeId,
                  subtypeName: subtypeGroup.subtypeName,
                  outwardId: packet.outwardId,
                  totalAvailableQuantity: 0,
                  itemIds: [],
                  packets: [],
                  conversionFactor: packet.conversionFactor || 1
                });
              }
              
              const combined = combinedMap.get(key);
              combined.totalAvailableQuantity += packet.availableQuantity;
              combined.itemIds.push(packet.itemId);
              combined.packets.push(packet);
              if (!combined.conversionFactor && packet.conversionFactor) {
                combined.conversionFactor = packet.conversionFactor;
              }
            });
            
            // Auto-fill for each combined batch
            combinedMap.forEach((combined) => {
              const availableQty = combined.totalAvailableQuantity;
              const conversionFactor = combined.conversionFactor || 1;
              
              if (availableQty > 0) {
                console.log(`[PrimarySowingEntry] Auto-filling for ${combined.productName} - ${combined.batchNumber}:`, {
                  availableQty,
                  conversionFactor,
                });
                
                // Auto-fill Packets with available quantity
                combined.packets.forEach((p) => {
                  newSelectedPackets.push({
                    ...p,
                    quantity: p.availableQuantity,
                    plantId: combined.plantId,
                    plantName: combined.plantName,
                    subtypeId: combined.subtypeId,
                    subtypeName: combined.subtypeName,
                  });
                });
                
                // Auto-fill Primary (Field) = packets * conversionFactor
                const primaryQty = availableQty * conversionFactor;
                const itemCount = combined.itemIds.length;
                const qtyPerItem = itemCount > 0 ? Math.floor(primaryQty / itemCount) : 0;
                const remainder = itemCount > 0 ? primaryQty % itemCount : 0;
                
                combined.itemIds.forEach((itemId, idx) => {
                  const itemQty = qtyPerItem + (idx < remainder ? 1 : 0);
                  if (itemQty > 0) {
                    newPrimaryQuantities[itemId] = itemQty;
                  }
                });
              }
            });
          });
        });
        
        if (newSelectedPackets.length > 0) {
          console.log(`[PrimarySowingEntry] Auto-filled ${newSelectedPackets.length} packets`);
          setSelectedPackets(newSelectedPackets);
        }
        
        if (Object.keys(newPrimaryQuantities).length > 0) {
          console.log(`[PrimarySowingEntry] Auto-filled primaryQuantities:`, newPrimaryQuantities);
          setPrimaryQuantities(newPrimaryQuantities);
        }
        
        setHasAutoFilled(true);
      }
    }
  }, [availablePackets, hasAutoFilled, selectedPackets.length, primaryQuantities]); // Run when availablePackets changes

  // Fetch all available packets
  const fetchAllAvailablePackets = async () => {
    setLoadingPackets(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_AVAILABLE_PACKETS_FOR_SOWING);
      const response = await instance.request({}, {});
      
      console.log("[PrimarySowingEntry] Fetched packets response:", response?.data);
      
      if (response?.data?.success && response?.data?.data) {
        // Initialize plant ready days from API response
        const initialReadyDays = {};
        response.data.data.forEach(plantGroup => {
          plantGroup.subtypes?.forEach(subtype => {
            const readyDaysKey = `${plantGroup.plantId}_${subtype.subtypeId}`;
            if (subtype.plantReadyDays !== undefined) {
              initialReadyDays[readyDaysKey] = subtype.plantReadyDays || 0;
            }
            subtype.packets?.forEach(packet => {
              console.log(`[PrimarySowingEntry] Packet conversionFactor:`, {
                productName: packet.productName,
                batchNumber: packet.batchNumber,
                conversionFactor: packet.conversionFactor,
                availableQuantity: packet.availableQuantity,
                plantReadyDays: packet.plantReadyDays,
              });
            });
          });
        });
        setPlantReadyDays(prev => ({ ...prev, ...initialReadyDays }));
        setAvailablePackets(response.data.data);
      } else {
        setAvailablePackets([]);
      }
    } catch (error) {
      console.error("[PrimarySowingEntry] Error fetching available packets:", error);
      Toast.error("Failed to fetch available packets");
      setAvailablePackets([]);
    } finally {
      setLoadingPackets(false);
    }
  };

  // Create sowings from selected packets and primary quantities (same logic as AddSowingModal)
  const handleCreateSowings = async () => {
    const hasPackets = selectedPackets.length > 0;
    const hasPrimaryQuantities = Object.keys(primaryQuantities).length > 0;
    
    if (!hasPackets && !hasPrimaryQuantities) {
      Toast.error("Please enter quantities in at least one packet card");
      return;
    }

    // Date is always required
    if (!formData.sowingDate) {
      Toast.error("Please select a sowing date");
      return;
    }

    // Validate batch numbers for packets (OFFICE location)
    if (hasPackets) {
      const packetsWithoutBatch = selectedPackets.filter(p => !p.batchNumber || p.batchNumber.trim() === "");
      if (packetsWithoutBatch.length > 0) {
        Toast.error("Batch number is mandatory for all packets. Please ensure all selected packets have batch numbers.");
        return;
      }
    }

    // Validate batch number for PRIMARY location - extract from packets
    if (hasPrimaryQuantities) {
      // Get batch numbers from packets used in primaryQuantities
      const primaryBatchNumbers = [];
      Object.keys(primaryQuantities).forEach(itemId => {
        const packet = availablePackets
          .flatMap(pg => pg.subtypes?.flatMap(sg => sg.packets || []) || [])
          .find(p => p.itemId === itemId);
        if (packet && packet.batchNumber && packet.batchNumber.trim() !== "") {
          primaryBatchNumbers.push(packet.batchNumber);
        }
      });
      
      // If no batch numbers found in packets, check formData.batchNumber
      if (primaryBatchNumbers.length === 0 && (!formData.batchNumber || formData.batchNumber.trim() === "")) {
        Toast.error("Batch number is mandatory for PRIMARY location. Please ensure packets have batch numbers or enter a batch number.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const user = userData;
      const sowingsToCreate = [];

      // Group selected packets by plant/subtype combination (same as AddSowingModal)
      const groupedPackets = new Map();
      
      selectedPackets.forEach(packet => {
        const groupKey = `${packet.plantId}_${packet.subtypeId}`;
        
        if (!groupedPackets.has(groupKey)) {
          groupedPackets.set(groupKey, {
            plantId: packet.plantId,
            plantName: packet.plantName,
            subtypeId: packet.subtypeId,
            subtypeName: packet.subtypeName,
            slotId: null,
            packets: [],
            totalQuantity: 0,
          });
        }
        
        const group = groupedPackets.get(groupKey);
        group.packets.push(packet);
        group.totalQuantity += packet.quantity || packet.availableQuantity;
      });

      // Calculate total primary quantities from Primary (Field) input fields
      const totalPrimaryQuantities = Object.values(primaryQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

      // Create sowing for each OFFICE group
      if (hasPackets) {
        for (const [groupKey, group] of groupedPackets) {
          // Extract batch numbers from packets (mandatory)
          const packetBatchNumbers = group.packets
            .map(p => p.batchNumber)
            .filter(bn => bn && bn.trim() !== "");
          
          if (packetBatchNumbers.length === 0) {
            Toast.error(`Batch number is required. Please ensure all packets have batch numbers for ${group.plantName} - ${group.subtypeName}`);
            setSubmitting(false);
            return;
          }
          
          // Combine batch numbers: if all same, use single; if different, use comma-separated
          const uniqueBatchNumbers = [...new Set(packetBatchNumbers)];
          const batchNumberFromPackets = uniqueBatchNumbers.length === 1 
            ? uniqueBatchNumbers[0] 
            : uniqueBatchNumbers.join(", ");
          
          // Get plant ready days for this group
          const readyDaysKey = `${group.plantId}_${group.subtypeId}`;
          const groupReadyDays = plantReadyDays[readyDaysKey] || 0;
          
          const payload = {
            plantId: group.plantId,
            subtypeId: group.subtypeId,
            sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
            totalQuantityRequired: group.totalQuantity,
            sowedPlant: totalPrimaryQuantities || 0, // Use Primary (Field) input value
            reminderBeforeDays: parseInt(formData.reminderBeforeDays),
            notes: formData.notes || "",
            batchNumber: batchNumberFromPackets, // Use batch number from packets (mandatory)
            sowingLocation: "OFFICE",
            slotId: group.slotId,
            plantReadyDays: groupReadyDays, // Include plant ready days from state
            packets: group.packets.map(p => ({
              outwardId: p.outwardId,
              itemId: p.itemId,
              quantity: p.quantity || p.availableQuantity,
              batchNumber: p.batchNumber,
            })),
          };

          if (user?._id) {
            payload.createdBy = user._id;
          }

          sowingsToCreate.push(payload);
        }
      }

      // Handle PRIMARY quantities - group by plant/subtype from primaryQuantities (same as AddSowingModal)
      if (hasPrimaryQuantities) {
        // Group by plant/subtype from primaryQuantities
        const primaryGroups = new Map();
        
        Object.entries(primaryQuantities).forEach(([itemId, qty]) => {
          if (qty > 0) {
            const packet = availablePackets
              .flatMap(pg => pg.subtypes?.flatMap(sg => sg.packets || []) || [])
              .find(p => p.itemId === itemId);
            
            if (packet) {
              const key = `${packet.plantId}_${packet.subtypeId}`;
              if (!primaryGroups.has(key)) {
                primaryGroups.set(key, {
                  plantId: packet.plantId,
                  plantName: packet.plantName,
                  subtypeId: packet.subtypeId,
                  subtypeName: packet.subtypeName,
                  slotId: null,
                  totalQty: 0,
                });
              }
              primaryGroups.get(key).totalQty += qty;
            }
          }
        });

        for (const [key, group] of primaryGroups) {
          if (group.totalQty > 0) {
            // Extract batch numbers from packets used in this PRIMARY group
            const primaryBatchNumbers = [];
            Object.entries(primaryQuantities).forEach(([itemId, qty]) => {
              if (qty > 0) {
                const packet = availablePackets
                  .flatMap(pg => pg.subtypes?.flatMap(sg => sg.packets || []) || [])
                  .find(p => p.itemId === itemId && 
                    p.plantId === group.plantId && 
                    p.subtypeId === group.subtypeId);
                if (packet && packet.batchNumber && packet.batchNumber.trim() !== "") {
                  primaryBatchNumbers.push(packet.batchNumber);
                }
              }
            });
            
            // Use batch numbers from packets, fallback to formData.batchNumber if needed
            let batchNumberToUse = "";
            if (primaryBatchNumbers.length > 0) {
              const uniqueBatchNumbers = [...new Set(primaryBatchNumbers)];
              batchNumberToUse = uniqueBatchNumbers.length === 1 
                ? uniqueBatchNumbers[0] 
                : uniqueBatchNumbers.join(", ");
            } else if (formData.batchNumber && formData.batchNumber.trim() !== "") {
              batchNumberToUse = formData.batchNumber.trim();
            } else {
              console.error(`[Primary Sowing] No batch number found for PRIMARY group: ${group.plantName} - ${group.subtypeName}`);
              Toast.error(`Batch number is required for ${group.plantName} - ${group.subtypeName}`);
              setSubmitting(false);
              return;
            }
            
            // Get plant ready days for this PRIMARY group
            const readyDaysKey = `${group.plantId}_${group.subtypeId}`;
            const groupReadyDays = plantReadyDays[readyDaysKey] || 0;
            
            const payload = {
              plantId: group.plantId,
              subtypeId: group.subtypeId,
              sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
              totalQuantityRequired: group.totalQty,
              sowedPlant: group.totalQty, // Use Primary (Field) input value
              reminderBeforeDays: parseInt(formData.reminderBeforeDays),
              notes: formData.notes || "",
              batchNumber: batchNumberToUse, // Use batch number from packets or form
              sowingLocation: "PRIMARY",
              slotId: group.slotId,
              plantReadyDays: groupReadyDays, // Include plant ready days from state
            };

            if (user?._id) {
              payload.createdBy = user._id;
            }

            sowingsToCreate.push(payload);
          }
        }
      }

      if (sowingsToCreate.length === 0) {
        Toast.error("No valid sowings to create");
        setSubmitting(false);
        return;
      }

      // Ensure sowedPlant is added to all sowings using Primary (Field) values (same as AddSowingModal)
      const finalPrimaryQty = totalPrimaryQuantities || 0;
      sowingsToCreate.forEach((sowing, index) => {
        if (sowing.sowedPlant === undefined || sowing.sowedPlant === null) {
          // Use primaryQuantities if available, otherwise fallback to totalQuantityRequired
          sowing.sowedPlant = finalPrimaryQty > 0 ? finalPrimaryQty : sowing.totalQuantityRequired;
          console.log(`[Primary Sowing] ⚠️ Added missing sowedPlant to ${sowing.sowingLocation} sowing #${index + 1}:`, sowing.sowedPlant);
        } else {
          console.log(`[Primary Sowing] ✅ ${sowing.sowingLocation} sowing #${index + 1} has sowedPlant:`, sowing.sowedPlant);
        }
      });

      // Log all sowings before sending with explicit verification (same as AddSowingModal)
      console.log("[Primary Sowing] 📤 Final payload being sent:", JSON.stringify(sowingsToCreate, null, 2));
      
      // Verify all sowings have sowedPlant
      const sowingsWithoutSowedPlant = sowingsToCreate.filter(s => !s.sowedPlant);
      if (sowingsWithoutSowedPlant.length > 0) {
        console.error("[Primary Sowing] ❌ ERROR: Found sowings without sowedPlant:", sowingsWithoutSowedPlant);
      } else {
        console.log(`[Primary Sowing] ✅ All ${sowingsToCreate.length} sowing(s) have sowedPlant`);
      }

      // Call the multiple sowings endpoint (same as AddSowingModal)
      const finalTotalPrimaryQty = totalPrimaryQuantities || 0;
      const requestPayload = { 
        sowings: sowingsToCreate.map(sowing => ({
          ...sowing,
          // Use primaryQuantities value if available, otherwise keep existing sowedPlant or use totalQuantityRequired
          sowedPlant: sowing.sowedPlant !== undefined && sowing.sowedPlant !== null 
            ? sowing.sowedPlant 
            : (finalTotalPrimaryQty > 0 ? finalTotalPrimaryQty : sowing.totalQuantityRequired)
        }))
      };
      
      // Final verification - log the exact payload being sent (same as AddSowingModal)
      console.log("[Primary Sowing] 🔍 Request payload object:", JSON.stringify(requestPayload, null, 2));
      console.log("[Primary Sowing] 🔍 First sowing in request:", JSON.stringify(requestPayload.sowings[0], null, 2));
      console.log("[Primary Sowing] 🔍 Has sowedPlant?", requestPayload.sowings[0]?.sowedPlant !== undefined);
      console.log("[Primary Sowing] 🔍 sowedPlant value:", requestPayload.sowings[0]?.sowedPlant);
      
      // Verify all sowings have sowedPlant before sending
      requestPayload.sowings.forEach((sowing, idx) => {
        if (sowing.sowedPlant === undefined || sowing.sowedPlant === null) {
          console.error(`[Primary Sowing] ❌ CRITICAL: Sowing #${idx + 1} missing sowedPlant!`, sowing);
          // Use primaryQuantities value if available, otherwise fallback to totalQuantityRequired
          sowing.sowedPlant = finalTotalPrimaryQty > 0 ? finalTotalPrimaryQty : sowing.totalQuantityRequired;
          console.log(`[Primary Sowing] ✅ Fixed sowedPlant to:`, sowing.sowedPlant);
        }
      });

      const instance = NetworkManager(API.sowing.CREATE_MULTIPLE_SOWINGS);
      const response = await instance.request(requestPayload);

      if (response?.data) {
        const successCount = response.data.success || 0;
        const failedCount = response.data.failed || 0;
        
        if (successCount > 0) {
          Toast.success(`Successfully created ${successCount} sowing record(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
          
          // Update plant subtypes with edited plant ready days (future functionality)
          // Track which plant/subtype combinations had ready days edited
          const updatedReadyDays = new Map(); // Map of plantId_subtypeId -> readyDays
          Object.entries(plantReadyDays).forEach(([key, value]) => {
            const [plantId, subtypeId] = key.split('_');
            const originalValue = availablePackets
              .find(pg => pg.plantId === plantId)
              ?.subtypes?.find(st => st.subtypeId === subtypeId)?.plantReadyDays || 0;
            if (value !== originalValue && value > 0) {
              updatedReadyDays.set(key, { plantId, subtypeId, plantReadyDays: value });
            }
          });
          
          // Update each plant subtype if ready days were edited
          if (updatedReadyDays.size > 0) {
            const updatePromises = Array.from(updatedReadyDays.values()).map(async ({ plantId, subtypeId, plantReadyDays: readyDays }) => {
              try {
                // Update subtype using the plant CMS endpoint
                const baseURL = process.env.REACT_APP_BASE_URL || 'http://localhost:8000';
                const cleanBaseURL = baseURL.replace(/\/api\/v1\/?$/, '');
                const token = localStorage.getItem(CookieKeys.Auth);
                const updateUrl = `${cleanBaseURL}/api/v1/plantcms/plants/${plantId}/subtypes/${subtypeId}`;
                await axios.put(updateUrl, { plantReadyDays: readyDays }, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                });
                console.log(`[PrimarySowingEntry] ✅ Updated plant ${plantId} subtype ${subtypeId} with plantReadyDays: ${readyDays}`);
              } catch (error) {
                console.error(`[PrimarySowingEntry] ❌ Failed to update plant ${plantId} subtype ${subtypeId}:`, error);
                // Don't show error to user as sowing was successful, just log it
              }
            });
            
            // Update in background (don't wait for completion)
            Promise.all(updatePromises).then(() => {
              console.log(`[PrimarySowingEntry] ✅ Updated ${updatedReadyDays.size} plant subtype(s) with new plant ready days`);
            }).catch(error => {
              console.error(`[PrimarySowingEntry] ❌ Error updating plant subtypes:`, error);
            });
          }
          
          // Reset form
          setSelectedPackets([]);
          setPrimaryQuantities({});
          setFormData({
            sowingDate: moment(),
            batchNumber: "",
            notes: "",
            reminderBeforeDays: 5,
          });
          setShowSummary(false);
          fetchAllAvailablePackets();
        } else {
          Toast.error(`Failed to create sowing records. ${response.data.message || ''}`);
        }
      }
    } catch (error) {
      console.error("Error creating sowings:", error);
      Toast.error(error?.response?.data?.message || "Failed to create sowing records");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total quantity entered (packets + primary)
  const totalPacketQuantity = selectedPackets.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalPrimaryQuantity = Object.values(primaryQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
  const totalQuantity = totalPacketQuantity + totalPrimaryQuantity;

  // Prepare summary data - separate Packets and Primary
  const getSummaryData = () => {
    const packetGroups = [];
    const primaryGroups = [];

    // Group selected packets by plant/subtype (OFFICE location)
    const groupedPackets = new Map();
    selectedPackets.forEach(packet => {
      const groupKey = `${packet.plantId}_${packet.subtypeId}`;
      
      if (!groupedPackets.has(groupKey)) {
        groupedPackets.set(groupKey, {
          plantId: packet.plantId,
          plantName: packet.plantName,
          subtypeId: packet.subtypeId,
          subtypeName: packet.subtypeName,
          sowingLocation: "OFFICE",
          packets: [],
          totalQuantity: 0,
        });
      }
      
      const group = groupedPackets.get(groupKey);
      group.packets.push(packet);
      group.totalQuantity += packet.quantity || packet.availableQuantity;
    });

    // Add OFFICE groups to packetGroups
    groupedPackets.forEach((group) => {
      packetGroups.push(group);
    });

    // Group PRIMARY quantities by plant/subtype
    const primaryGroupsMap = new Map();
    Object.entries(primaryQuantities).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const packet = availablePackets
          .flatMap(pg => pg.subtypes?.flatMap(sg => sg.packets || []) || [])
          .find(p => p.itemId === itemId);
        
        if (packet) {
          const key = `${packet.plantId}_${packet.subtypeId}`;
          if (!primaryGroupsMap.has(key)) {
            primaryGroupsMap.set(key, {
              plantId: packet.plantId,
              plantName: packet.plantName,
              subtypeId: packet.subtypeId,
              subtypeName: packet.subtypeName,
              sowingLocation: "PRIMARY",
              totalQty: 0,
              packets: [],
            });
          }
          const group = primaryGroupsMap.get(key);
          group.totalQty += qty;
          group.packets.push({
            productName: packet.productName,
            batchNumber: packet.batchNumber || formData.batchNumber,
            quantity: qty,
          });
        }
      }
    });

    // Add PRIMARY groups to primaryGroups
    primaryGroupsMap.forEach((group) => {
      primaryGroups.push({
        plantId: group.plantId,
        plantName: group.plantName,
        subtypeId: group.subtypeId,
        subtypeName: group.subtypeName,
        sowingLocation: "PRIMARY",
        totalQuantity: group.totalQty,
        packets: group.packets,
      });
    });

    return { packetGroups, primaryGroups };
  };

  const { packetGroups, primaryGroups } = getSummaryData();
  const summaryData = [...packetGroups, ...primaryGroups];

  // Show loading while checking access
  if (userData === undefined || userRole === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box sx={{ 
        minHeight: "100vh", 
        bgcolor: "#f5f5f5",
        pb: isMobile ? 12 : 4
      }}>
        {/* Simple AppBar */}
        <AppBar 
          position="sticky" 
          sx={{ 
            bgcolor: "#2e7d32",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}
        >
          <Toolbar sx={{ px: isMobile ? 1.5 : 2, minHeight: isMobile ? 56 : 64 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate("/u/dashboard")}
              sx={{ mr: 1 }}
            >
              <ArrowBack />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600, fontSize: isMobile ? "1rem" : "1.125rem" }}>
              Primary Sowing Entry
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{ 
                ml: 1,
                p: 0.75,
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }
              }}
              title="Logout"
            >
              <LogoutIcon sx={{ fontSize: isMobile ? "1.25rem" : "1.5rem" }} />
            </IconButton>
            {!showSummary ? (
              <Button
                variant="contained"
                size={isMobile ? "small" : "medium"}
                onClick={() => {
                  if (totalQuantity === 0) {
                    Toast.error("Please enter quantities in at least one packet");
                    return;
                  }
                  if (!formData.sowingDate) {
                    Toast.error("Please select a sowing date");
                    return;
                  }
                  setShowSummary(true);
                }}
                disabled={submitting || (selectedPackets.length === 0 && Object.keys(primaryQuantities).length === 0)}
                startIcon={<Save />}
                sx={{
                  bgcolor: "white",
                  color: "#2e7d32",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                  "&:disabled": { bgcolor: "rgba(255,255,255,0.5)", color: "rgba(0,0,0,0.3)" },
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                  px: isMobile ? 1.5 : 2,
                }}
              >
                Review
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  size={isMobile ? "small" : "medium"}
                  onClick={() => setShowSummary(false)}
                  disabled={submitting}
                  sx={{
                    borderColor: "white",
                    color: "white",
                    fontWeight: 600,
                    mr: 1,
                    fontSize: isMobile ? "0.75rem" : "0.875rem",
                    px: isMobile ? 1.5 : 2,
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  size={isMobile ? "small" : "medium"}
                  onClick={handleCreateSowings}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={16} sx={{ color: "white" }} /> : <Save />}
                  sx={{
                    bgcolor: "white",
                    color: "#2e7d32",
                    fontWeight: 600,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                    "&:disabled": { bgcolor: "rgba(255,255,255,0.5)", color: "rgba(0,0,0,0.3)" },
                    fontSize: isMobile ? "0.75rem" : "0.875rem",
                    px: isMobile ? 1.5 : 2,
                  }}
                >
                  {submitting ? "Saving..." : "Confirm & Save"}
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ px: isMobile ? 1.5 : 2, pt: 2 }}>
          {/* Review Summary Section */}
          {showSummary && summaryData.length > 0 && (
            <Paper sx={{ 
              p: isMobile ? 2 : 2.5, 
              mb: 2, 
              bgcolor: "white", 
              borderRadius: 2,
              border: "2px solid #2e7d32",
              boxShadow: "0 2px 8px rgba(46, 125, 50, 0.2)"
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: "#2e7d32", 
                  mb: 2.5,
                  fontSize: isMobile ? "1rem" : "1.125rem"
                }}
              >
                Review Summary
              </Typography>

              {/* Sowing Details */}
              <Box sx={{ mb: 3, p: 1.5, bgcolor: "#f5f5f5", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", mb: 1, fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                  Sowing Date:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: "#1976d2", fontSize: isMobile ? "0.95rem" : "1rem" }}>
                  {moment(formData.sowingDate).format("DD-MM-YYYY")}
                </Typography>
                {formData.batchNumber && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", mb: 1, mt: 2, fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                      Batch Number:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1976d2", fontSize: isMobile ? "0.95rem" : "1rem" }}>
                      {formData.batchNumber}
                    </Typography>
                  </>
                )}
                {formData.notes && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", mb: 1, mt: 2, fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                      Notes:
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#666", fontSize: isMobile ? "0.9rem" : "0.95rem" }}>
                      {formData.notes}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Packets Summary Section */}
              {packetGroups.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      color: "#1976d2", 
                      mb: 2,
                      fontSize: isMobile ? "0.95rem" : "1.05rem"
                    }}
                  >
                    Packets (OFFICE)
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {packetGroups.map((group, idx) => (
                      <Paper 
                        key={idx}
                        sx={{ 
                          p: 1.5, 
                          bgcolor: "#f5f5f5", 
                          border: "1px solid #e0e0e0", 
                          borderRadius: 1.5 
                        }}
                      >
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          mb: 1.5 
                        }}>
                          <Box>
                            <Typography variant="body1" sx={{ 
                              fontWeight: 600, 
                              color: "#1976d2", 
                              fontSize: isMobile ? "0.95rem" : "1rem" 
                            }}>
                              {group.plantName} - {group.subtypeName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#666", fontSize: isMobile ? "0.75rem" : "0.8rem" }}>
                              Plant ID: {group.plantId?.toString().slice(-8) || "N/A"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              color: "#2e7d32", 
                              fontSize: isMobile ? "1rem" : "1.125rem" 
                            }}>
                              {group.totalQuantity} units
                            </Typography>
                            {group.sowingLocation && (
                              <Chip
                                label={group.sowingLocation}
                                size="small"
                                sx={{
                                  mt: 0.5,
                                  fontSize: "0.65rem",
                                  height: 18,
                                }}
                                color="default"
                              />
                            )}
                          </Box>
                        </Box>
                        
                        {/* Compact packet display - group by batch */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                          {(() => {
                            // Group packets by batch number
                            const batchMap = new Map();
                            group.packets.forEach(p => {
                              const batchKey = p.batchNumber || 'N/A';
                              if (!batchMap.has(batchKey)) {
                                batchMap.set(batchKey, {
                                  batchNumber: batchKey,
                                  productName: p.productName,
                                  quantities: []
                                });
                              }
                              batchMap.get(batchKey).quantities.push(p.quantity);
                            });
                            
                            return Array.from(batchMap.values()).map((batchGroup, batchIdx) => {
                              const totalQty = batchGroup.quantities.reduce((sum, q) => sum + q, 0);
                              return (
                                <Box 
                                  key={batchIdx}
                                  sx={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 1,
                                    p: 0.75,
                                    bgcolor: "#e8f5e9",
                                    borderRadius: 1,
                                    border: "1px solid #c8e6c9"
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#1976d2", fontSize: isMobile ? "0.75rem" : "0.8rem", minWidth: "fit-content" }}>
                                    {batchGroup.productName}
                                  </Typography>
                                  <Chip
                                    label={`Batch: ${batchGroup.batchNumber}`}
                                    size="small"
                                    sx={{ 
                                      fontSize: "0.65rem", 
                                      height: 20,
                                      bgcolor: "white"
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#2e7d32", fontSize: isMobile ? "0.75rem" : "0.8rem", ml: "auto" }}>
                                    {totalQty} units
                                  </Typography>
                                </Box>
                              );
                            });
                          })()}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Primary Summary Section */}
              {primaryGroups.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      color: "#1976d2", 
                      mb: 2,
                      fontSize: isMobile ? "0.95rem" : "1.05rem"
                    }}
                  >
                    Primary (Field)
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {primaryGroups.map((group, idx) => (
                      <Paper 
                        key={idx}
                        sx={{ 
                          p: 1.5, 
                          bgcolor: "#fff9e6", 
                          border: "1px solid #ffd54f", 
                          borderRadius: 1.5 
                        }}
                      >
                        <Box sx={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          mb: 1.5 
                        }}>
                          <Box>
                            <Typography variant="body1" sx={{ 
                              fontWeight: 600, 
                              color: "#1976d2", 
                              fontSize: isMobile ? "0.95rem" : "1rem" 
                            }}>
                              {group.plantName} - {group.subtypeName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#666", fontSize: isMobile ? "0.75rem" : "0.8rem" }}>
                              Plant ID: {group.plantId?.toString().slice(-8) || "N/A"}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 700, 
                              color: "#f57c00", 
                              fontSize: isMobile ? "1rem" : "1.125rem" 
                            }}>
                              {group.totalQuantity} units
                            </Typography>
                            {group.sowingLocation && (
                              <Chip
                                label={group.sowingLocation}
                                size="small"
                                sx={{
                                  mt: 0.5,
                                  fontSize: "0.65rem",
                                  height: 18,
                                }}
                                color="primary"
                              />
                            )}
                          </Box>
                        </Box>
                        
                        {/* Compact packet display - group by batch */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                          {(() => {
                            // Group packets by batch number
                            const batchMap = new Map();
                            group.packets.forEach(p => {
                              const batchKey = p.batchNumber || 'N/A';
                              if (!batchMap.has(batchKey)) {
                                batchMap.set(batchKey, {
                                  batchNumber: batchKey,
                                  productName: p.productName,
                                  quantities: []
                                });
                              }
                              batchMap.get(batchKey).quantities.push(p.quantity);
                            });
                            
                            return Array.from(batchMap.values()).map((batchGroup, batchIdx) => {
                              const totalQty = batchGroup.quantities.reduce((sum, q) => sum + q, 0);
                              return (
                                <Box 
                                  key={batchIdx}
                                  sx={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 1,
                                    p: 0.75,
                                    bgcolor: "#fff3cd",
                                    borderRadius: 1,
                                    border: "1px solid #ffd54f"
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#1976d2", fontSize: isMobile ? "0.75rem" : "0.8rem", minWidth: "fit-content" }}>
                                    {batchGroup.productName}
                                  </Typography>
                                  <Chip
                                    label={`Batch: ${batchGroup.batchNumber}`}
                                    size="small"
                                    sx={{ 
                                      fontSize: "0.65rem", 
                                      height: 20,
                                      bgcolor: "white"
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: "#f57c00", fontSize: isMobile ? "0.75rem" : "0.8rem", ml: "auto" }}>
                                    {totalQty} units
                                  </Typography>
                                </Box>
                              );
                            });
                          })()}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Total Summary */}
              <Box sx={{ 
                mt: 2.5, 
                p: 1.5, 
                bgcolor: "#e8f5e9", 
                borderRadius: 1.5,
                border: "1px solid #4caf50"
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#2e7d32", fontSize: isMobile ? "0.9rem" : "1rem" }}>
                    Total Sowings to Create:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b5e20", fontSize: isMobile ? "1.1rem" : "1.25rem" }}>
                    {summaryData.length} record(s)
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#2e7d32", fontSize: isMobile ? "0.9rem" : "1rem" }}>
                    Total Quantity:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#1b5e20", fontSize: isMobile ? "1.1rem" : "1.25rem" }}>
                    {totalQuantity} units
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {/* Simple Form Section */}
          {!showSummary && (
            <Paper sx={{ 
              p: isMobile ? 2 : 2.5, 
              mb: 2, 
              bgcolor: "white", 
              borderRadius: 2,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: "#1976d2", 
                  mb: 2.5,
                  fontSize: isMobile ? "1rem" : "1.125rem"
                }}
              >
                Sowing Information
              </Typography>
              
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: "#666", fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                  Sowing Date <span style={{ color: "#f44336" }}>*</span>
                </Typography>
                <DatePicker
                  value={formData.sowingDate}
                  onChange={(newValue) => {
                    setFormData({ ...formData, sowingDate: newValue || moment() });
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: isMobile ? "medium" : "small",
                      placeholder: "Select sowing date",
                      sx: {
                        "& .MuiInputBase-input": {
                          fontSize: isMobile ? "16px" : "0.95rem",
                          py: isMobile ? 1.5 : 1,
                        },
                      }
                    },
                  }}
                  format="DD-MM-YYYY"
                />
              </Box>
            </Paper>
          )}

          {/* Packets Section */}
          {!showSummary && (
          <Paper sx={{ 
            p: isMobile ? 2 : 2.5, 
            bgcolor: "white", 
            borderRadius: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <Box sx={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              mb: 2.5 
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: "#1976d2",
                  fontSize: isMobile ? "1rem" : "1.125rem"
                }}
              >
                Available Packets
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchAllAvailablePackets}
                disabled={loadingPackets}
                startIcon={loadingPackets ? <CircularProgress size={14} /> : <Refresh />}
                sx={{
                  fontSize: isMobile ? "0.75rem" : "0.8rem",
                  minHeight: isMobile ? 36 : 32,
                }}
              >
                Refresh
              </Button>
            </Box>

            {loadingPackets ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5, fontSize: "0.875rem" }}>
                  Loading packets...
                </Typography>
              </Box>
            ) : availablePackets.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                  No packets available. Create outward entries with purpose &quot;production&quot; for seeds products first.
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {availablePackets.map((plantGroup, plantIdx) => {
                  return (
                    <Box key={plantGroup.plantId || plantIdx}>
                      {/* Plant Header */}
                      <Box sx={{ 
                        p: 1.5, 
                        mb: 1.5, 
                        bgcolor: "#e3f2fd", 
                        borderRadius: 1.5,
                        border: "1px solid #2196f3"
                      }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#1976d2", fontSize: isMobile ? "0.95rem" : "1rem" }}>
                          {plantGroup.plantName}
                        </Typography>
                      </Box>

                      {/* Subtypes */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pl: isMobile ? 0 : 1 }}>
                        {plantGroup.subtypes?.map((subtypeGroup, subtypeIdx) => {
                          // Initialize plant ready days for this subtype if not already set
                          const readyDaysKey = `${plantGroup.plantId}_${subtypeGroup.subtypeId}`;
                          if (!plantReadyDays[readyDaysKey] && subtypeGroup.plantReadyDays !== undefined) {
                            // Initialize on first render if not in state
                            setPlantReadyDays(prev => ({
                              ...prev,
                              [readyDaysKey]: subtypeGroup.plantReadyDays || 0
                            }));
                          }
                          const currentReadyDays = plantReadyDays[readyDaysKey] ?? (subtypeGroup.plantReadyDays || 0);
                          
                          // Calculate expected ready date: sowing date + plant ready days
                          const expectedReadyDate = formData.sowingDate && currentReadyDays > 0
                            ? moment(formData.sowingDate).add(currentReadyDays, 'days').format("DD-MM-YYYY")
                            : null;
                          
                          // Combine packets by batch
                          const combinedMap = new Map();
                          subtypeGroup.packets?.forEach(packet => {
                            const key = `${packet.productId || packet.productName}_${packet.batchNumber || 'NO_BATCH'}`;
                            
                            if (!combinedMap.has(key)) {
                              combinedMap.set(key, {
                                productId: packet.productId,
                                productName: packet.productName,
                                batchNumber: packet.batchNumber || 'N/A',
                                unit: packet.unit,
                                plantId: packet.plantId,
                                plantName: packet.plantName,
                                subtypeId: packet.subtypeId,
                                subtypeName: subtypeGroup.subtypeName,
                                outwardId: packet.outwardId,
                                totalAvailableQuantity: 0,
                                itemIds: [],
                                packets: [],
                                conversionFactor: packet.conversionFactor || 1
                              });
                            }
                            
                            const combined = combinedMap.get(key);
                            combined.totalAvailableQuantity += packet.availableQuantity;
                            combined.itemIds.push(packet.itemId);
                                combined.packets.push(packet);
                            // Use conversionFactor from first packet (all should have same conversionFactor)
                            if (!combined.conversionFactor && packet.conversionFactor) {
                              combined.conversionFactor = packet.conversionFactor;
                            }
                            
                            console.log(`[PrimarySowingEntry] Combined packet:`, {
                              key,
                              productName: combined.productName,
                              batchNumber: combined.batchNumber,
                              conversionFactor: combined.conversionFactor,
                              packetConversionFactor: packet.conversionFactor,
                            });
                          });

                          const combinedBatches = Array.from(combinedMap.values());

                          return (
                            <Box key={`${subtypeGroup.subtypeId}_${subtypeIdx}`}>
                              <Box sx={{ mb: 1.5 }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                                    {subtypeGroup.subtypeName}
                                  </Typography>
                                  <TextField
                                    type="number"
                                    label="Plant Ready Days"
                                    size="small"
                                    value={currentReadyDays || ''}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      setPlantReadyDays(prev => ({
                                        ...prev,
                                        [readyDaysKey]: value
                                      }));
                                    }}
                                    inputProps={{
                                      min: 0,
                                      step: 1
                                    }}
                                    sx={{
                                      width: isMobile ? "120px" : "140px",
                                      "& .MuiInputBase-input": {
                                        fontSize: isMobile ? "0.875rem" : "0.9rem",
                                        py: isMobile ? 1 : 0.75,
                                      },
                                    }}
                                  />
                                </Box>
                                {expectedReadyDate && (
                                  <Box sx={{ 
                                    p: 0.75, 
                                    bgcolor: "#e8f5e9", 
                                    borderRadius: 1,
                                    border: "1px solid #4caf50",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5
                                  }}>
                                    <CalendarToday sx={{ fontSize: "0.875rem", color: "#2e7d32" }} />
                                    <Typography variant="body2" sx={{ 
                                      fontWeight: 600, 
                                      color: "#2e7d32", 
                                      fontSize: isMobile ? "0.75rem" : "0.8rem" 
                                    }}>
                                      Plants will be ready on: {expectedReadyDate}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                              
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                {combinedBatches.map((combined, batchIdx) => {
                                  const selectedItems = selectedPackets.filter(sp => 
                                    combined.itemIds.includes(sp.itemId)
                                  );
                                  const isSelected = selectedItems.length > 0;
                                  const selectedQuantity = selectedItems.reduce((sum, sp) => sum + (sp.quantity || 0), 0);
                                  const totalQtyForBatch = combined.itemIds.reduce((sum, itemId) => {
                                    return sum + (primaryQuantities[itemId] || 0);
                                  }, 0);
                                  
                                  // Debug logging
                                  console.log(`[PrimarySowingEntry] Combined Batch:`, {
                                    productName: combined.productName,
                                    batchNumber: combined.batchNumber,
                                    conversionFactor: combined.conversionFactor,
                                    totalAvailableQuantity: combined.totalAvailableQuantity,
                                    selectedQuantity,
                                    totalQtyForBatch,
                                    itemIds: combined.itemIds,
                                  });

                                  const handleCardClick = () => {
                                    const conversionFactor = combined.conversionFactor || 1;
                                    const availableQty = combined.totalAvailableQuantity;
                                    
                                    // Toggle selection - if selected, deselect; if not selected, select with auto-fill
                                    if (isSelected || totalQtyForBatch > 0) {
                                      console.log(`[PrimarySowingEntry] Deselecting packet card: ${combined.productName} - ${combined.batchNumber}`);
                                      
                                      // Clear selectedPackets for this batch
                                      setSelectedPackets(selectedPackets.filter(sp => 
                                        !combined.itemIds.includes(sp.itemId)
                                      ));
                                      
                                      // Clear primaryQuantities for this batch
                                      const updatedPrimaryQuantities = { ...primaryQuantities };
                                      combined.itemIds.forEach((itemId) => {
                                        delete updatedPrimaryQuantities[itemId];
                                      });
                                      setPrimaryQuantities(updatedPrimaryQuantities);
                                    } else {
                                      // Select and auto-fill with available quantity
                                      console.log(`[PrimarySowingEntry] Selecting packet card: ${combined.productName} - ${combined.batchNumber}`);
                                      
                                      if (availableQty > 0) {
                                        // Auto-fill Packets with available quantity
                                        const updatedPackets = selectedPackets.filter(sp => 
                                          !combined.itemIds.includes(sp.itemId)
                                        );
                                        
                                        combined.packets.forEach((p) => {
                                          updatedPackets.push({
                                            ...p,
                                            quantity: p.availableQuantity,
                                            plantId: combined.plantId,
                                            plantName: combined.plantName,
                                            subtypeId: combined.subtypeId,
                                            subtypeName: combined.subtypeName,
                                          });
                                        });
                                        
                                        setSelectedPackets(updatedPackets);
                                        
                                        // Auto-fill Primary (Field) = packets * conversionFactor
                                        const primaryQty = availableQty * conversionFactor;
                                        const itemCount = combined.itemIds.length;
                                        const qtyPerItem = itemCount > 0 ? Math.floor(primaryQty / itemCount) : 0;
                                        const remainder = itemCount > 0 ? primaryQty % itemCount : 0;
                                        
                                        const updatedPrimaryQuantities = { ...primaryQuantities };
                                        combined.itemIds.forEach((itemId, idx) => {
                                          const itemQty = qtyPerItem + (idx < remainder ? 1 : 0);
                                          if (itemQty > 0) {
                                            updatedPrimaryQuantities[itemId] = itemQty;
                                          }
                                        });
                                        
                                        console.log(`[PrimarySowingEntry] Auto-filled on card click:`, {
                                          availableQty,
                                          conversionFactor,
                                          primaryQty,
                                          updatedPrimaryQuantities,
                                        });
                                        
                                        setPrimaryQuantities(updatedPrimaryQuantities);
                                      }
                                    }
                                  };

                                  return (
                                    <Paper
                                      key={`${combined.productId}_${combined.batchNumber}_${batchIdx}`}
                                      onClick={handleCardClick}
                                      sx={{
                                        p: 1.5,
                                        border: (isSelected || totalQtyForBatch > 0) ? "2px solid #4caf50" : "1px solid #e0e0e0",
                                        bgcolor: (isSelected || totalQtyForBatch > 0) ? "rgba(76, 175, 80, 0.05)" : "white",
                                        borderRadius: 1.5,
                                        position: "relative",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        "&:hover": {
                                          boxShadow: (isSelected || totalQtyForBatch > 0) ? "0 2px 8px rgba(76, 175, 80, 0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
                                          border: (isSelected || totalQtyForBatch > 0) ? "2px solid #4caf50" : "1px solid #1976d2",
                                        },
                                      }}
                                    >
                                      {(isSelected || totalQtyForBatch > 0) && (
                                        <Box sx={{
                                          position: "absolute",
                                          top: 8,
                                          right: 8,
                                          bgcolor: "#4caf50",
                                          borderRadius: "50%",
                                          width: 24,
                                          height: 24,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "white",
                                          fontSize: 14,
                                          fontWeight: 800,
                                          zIndex: 1,
                                        }}>
                                          ✓
                                        </Box>
                                      )}
                                      <Box sx={{ mb: 1.5 }}>
                                        <Typography variant="body1" sx={{ fontWeight: 600, color: "#1976d2", mb: 0.5, fontSize: isMobile ? "0.9rem" : "0.95rem" }}>
                                          {combined.productName}
                                        </Typography>
                                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
                                          <Chip 
                                            label={`Batch: ${combined.batchNumber}`} 
                                            size="small" 
                                            sx={{ fontSize: "0.7rem", height: 20 }}
                                          />
                                          <Chip 
                                            label={`Available: ${combined.totalAvailableQuantity} ${combined.unit?.abbreviation || ''}`} 
                                            size="small" 
                                            color="success"
                                            sx={{ fontSize: "0.7rem", height: 20 }}
                                          />
                                        </Box>
                                      </Box>

                                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }} onClick={(e) => e.stopPropagation()}>
                        <TextField
                          type="number"
                          label="Packets"
                          size={isMobile ? "medium" : "small"}
                          fullWidth
                          value={selectedQuantity || ''}
                          onChange={(e) => {
                            const qty = parseFloat(e.target.value) || 0;
                            const maxQty = combined.totalAvailableQuantity;
                            const conversionFactor = combined.conversionFactor || 1;
                            
                            console.log(`[PrimarySowingEntry] Packets onChange:`, {
                              productName: combined.productName,
                              batchNumber: combined.batchNumber,
                              enteredQty: qty,
                              maxQty,
                              conversionFactor: conversionFactor,
                            });
                            
                            // Enforce maximum limit
                            if (qty > maxQty) {
                              Toast.warn(`Maximum available: ${maxQty}`);
                              const finalQty = maxQty;
                              const updatedPackets = selectedPackets.filter(sp => 
                                !combined.itemIds.includes(sp.itemId)
                              );
                              
                              let remainingQty = finalQty;
                              combined.packets.forEach((p) => {
                                if (remainingQty > 0) {
                                  const packetQty = Math.min(p.availableQuantity, remainingQty);
                                  updatedPackets.push({
                                    ...p,
                                    quantity: packetQty,
                                    plantId: combined.plantId,
                                    plantName: combined.plantName,
                                    subtypeId: combined.subtypeId,
                                    subtypeName: combined.subtypeName,
                                  });
                                  remainingQty -= packetQty;
                                }
                              });
                              
                              setSelectedPackets(updatedPackets);
                              
                              // Auto-fill Primary (Field) = packets * conversionFactor
                              const primaryQty = finalQty * conversionFactor;
                              const itemCount = combined.itemIds.length;
                              const qtyPerItem = itemCount > 0 ? Math.floor(primaryQty / itemCount) : 0;
                              const remainder = itemCount > 0 ? primaryQty % itemCount : 0;
                              const updatedPrimaryQuantities = { ...primaryQuantities };
                              combined.itemIds.forEach((itemId, idx) => {
                                const itemQty = qtyPerItem + (idx < remainder ? 1 : 0);
                                if (itemQty > 0) {
                                  updatedPrimaryQuantities[itemId] = itemQty;
                                } else {
                                  delete updatedPrimaryQuantities[itemId];
                                }
                              });
                              console.log(`[PrimarySowingEntry] Auto-filled Primary (Field) from Packets:`, {
                                packetQty: finalQty,
                                conversionFactor,
                                calculatedPrimaryQty: primaryQty,
                                updatedPrimaryQuantities,
                              });
                              setPrimaryQuantities(updatedPrimaryQuantities);
                              return;
                            }

                            // Update or add/remove from selectedPackets (same logic as AddSowingModal)
                            if (qty > 0) {
                              console.log(`[PrimarySowingEntry] Updating selectedPackets with qty:`, qty);
                              const existingPackets = selectedPackets.filter(sp => 
                                combined.itemIds.includes(sp.itemId)
                              );
                              
                              if (existingPackets.length > 0) {
                                const updatedPackets = [...selectedPackets];
                                let remainingQty = qty;
                                
                                combined.itemIds.forEach(itemId => {
                                  const idx = updatedPackets.findIndex(sp => sp.itemId === itemId);
                                  if (idx >= 0) {
                                    updatedPackets.splice(idx, 1);
                                  }
                                });
                                
                                combined.packets.forEach((p) => {
                                  if (remainingQty > 0) {
                                    const packetQty = Math.min(p.availableQuantity, remainingQty);
                                    updatedPackets.push({
                                      ...p,
                                      quantity: packetQty,
                                      plantId: combined.plantId,
                                      plantName: combined.plantName,
                                      subtypeId: combined.subtypeId,
                                      subtypeName: combined.subtypeName,
                                    });
                                    remainingQty -= packetQty;
                                  }
                                });
                                
                                setSelectedPackets(updatedPackets);
                              } else {
                                const packetsToAdd = [];
                                let remainingQty = qty;
                                
                                combined.packets.forEach((p) => {
                                  if (remainingQty > 0) {
                                    const packetQty = Math.min(p.availableQuantity, remainingQty);
                                    packetsToAdd.push({
                                      ...p,
                                      quantity: packetQty,
                                      plantId: combined.plantId,
                                      plantName: combined.plantName,
                                      subtypeId: combined.subtypeId,
                                      subtypeName: combined.subtypeName,
                                    });
                                    remainingQty -= packetQty;
                                  }
                                });
                                
                                setSelectedPackets([...selectedPackets, ...packetsToAdd]);
                                console.log(`[PrimarySowingEntry] Added new packets:`, packetsToAdd);
                              }
                              
                              // Auto-fill Primary (Field) = packets * conversionFactor
                              const primaryQty = qty * conversionFactor;
                              const itemCount = combined.itemIds.length;
                              const qtyPerItem = itemCount > 0 ? Math.floor(primaryQty / itemCount) : 0;
                              const remainder = itemCount > 0 ? primaryQty % itemCount : 0;
                              const updatedPrimaryQuantities = { ...primaryQuantities };
                              combined.itemIds.forEach((itemId, idx) => {
                                const itemQty = qtyPerItem + (idx < remainder ? 1 : 0);
                                if (itemQty > 0) {
                                  updatedPrimaryQuantities[itemId] = itemQty;
                                } else {
                                  delete updatedPrimaryQuantities[itemId];
                                }
                              });
                              console.log(`[PrimarySowingEntry] Auto-filled Primary (Field) from Packets:`, {
                                packetQty: qty,
                                conversionFactor,
                                calculatedPrimaryQty: primaryQty,
                                updatedPrimaryQuantities,
                              });
                              setPrimaryQuantities(updatedPrimaryQuantities);
                              
                              console.log(`[PrimarySowingEntry] Final selectedPackets count:`, selectedPackets.length);
                            } else {
                              console.log(`[PrimarySowingEntry] Clearing selectedPackets for this batch`);
                              setSelectedPackets(selectedPackets.filter(sp => 
                                !combined.itemIds.includes(sp.itemId)
                              ));
                              
                              // Clear Primary (Field) when Packets is cleared
                              const updatedPrimaryQuantities = { ...primaryQuantities };
                              combined.itemIds.forEach((itemId) => {
                                delete updatedPrimaryQuantities[itemId];
                              });
                              setPrimaryQuantities(updatedPrimaryQuantities);
                            }
                          }}
                          inputProps={{
                            min: 0,
                            max: combined.totalAvailableQuantity,
                            step: 1
                          }}
                          placeholder="0"
                          sx={{
                            "& .MuiInputBase-input": {
                              fontSize: isMobile ? "16px" : "0.95rem",
                              py: isMobile ? 1.5 : 1,
                            },
                          }}
                        />
                                        
                                        <TextField
                                          type="number"
                                          label="Primary (Field)"
                                          size={isMobile ? "medium" : "small"}
                                          fullWidth
                                          value={totalQtyForBatch || ''}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            const qty = parseFloat(e.target.value) || 0;
                                            const conversionFactor = combined.conversionFactor || 1;
                                            
                                            console.log(`[PrimarySowingEntry] Primary (Field) onChange:`, {
                                              productName: combined.productName,
                                              batchNumber: combined.batchNumber,
                                              enteredQty: qty,
                                              conversionFactor: conversionFactor,
                                              itemIds: combined.itemIds,
                                            });
                                            
                                            const itemCount = combined.itemIds.length;
                                            const qtyPerItem = itemCount > 0 ? Math.floor(qty / itemCount) : 0;
                                            const remainder = itemCount > 0 ? qty % itemCount : 0;

                                            const updatedPrimaryQuantities = { ...primaryQuantities };
                                            combined.itemIds.forEach((itemId, idx) => {
                                              const itemQty = qtyPerItem + (idx < remainder ? 1 : 0);
                                              if (itemQty > 0) {
                                                updatedPrimaryQuantities[itemId] = itemQty;
                                              } else {
                                                delete updatedPrimaryQuantities[itemId];
                                              }
                                            });
                                            
                                            console.log(`[PrimarySowingEntry] Updated primaryQuantities:`, updatedPrimaryQuantities);
                                            setPrimaryQuantities(updatedPrimaryQuantities);
                                            
                                            // Auto-fill Packets = primary / conversionFactor
                                            if (qty > 0 && conversionFactor > 0) {
                                              const packetQty = Math.floor(qty / conversionFactor);
                                              const maxQty = combined.totalAvailableQuantity;
                                              const finalPacketQty = Math.min(packetQty, maxQty);
                                              
                                              console.log(`[PrimarySowingEntry] Auto-filling Packets from Primary:`, {
                                                primaryQty: qty,
                                                conversionFactor,
                                                calculatedPacketQty: packetQty,
                                                finalPacketQty,
                                                maxQty,
                                              });
                                              
                                              if (finalPacketQty > 0) {
                                                const existingPackets = selectedPackets.filter(sp => 
                                                  combined.itemIds.includes(sp.itemId)
                                                );
                                                
                                                if (existingPackets.length > 0) {
                                                  const updatedPackets = [...selectedPackets];
                                                  let remainingQty = finalPacketQty;
                                                  
                                                  combined.itemIds.forEach(itemId => {
                                                    const idx = updatedPackets.findIndex(sp => sp.itemId === itemId);
                                                    if (idx >= 0) {
                                                      updatedPackets.splice(idx, 1);
                                                    }
                                                  });
                                                  
                                                  combined.packets.forEach((p) => {
                                                    if (remainingQty > 0) {
                                                      const packetQty = Math.min(p.availableQuantity, remainingQty);
                                                      updatedPackets.push({
                                                        ...p,
                                                        quantity: packetQty,
                                                        plantId: combined.plantId,
                                                        plantName: combined.plantName,
                                                        subtypeId: combined.subtypeId,
                                                        subtypeName: combined.subtypeName,
                                                      });
                                                      remainingQty -= packetQty;
                                                    }
                                                  });
                                                  
                                                  setSelectedPackets(updatedPackets);
                                                  console.log(`[PrimarySowingEntry] Updated existing packets`);
                                                } else {
                                                  const packetsToAdd = [];
                                                  let remainingQty = finalPacketQty;
                                                  
                                                  combined.packets.forEach((p) => {
                                                    if (remainingQty > 0) {
                                                      const packetQty = Math.min(p.availableQuantity, remainingQty);
                                                      packetsToAdd.push({
                                                        ...p,
                                                        quantity: packetQty,
                                                        plantId: combined.plantId,
                                                        plantName: combined.plantName,
                                                        subtypeId: combined.subtypeId,
                                                        subtypeName: combined.subtypeName,
                                                      });
                                                      remainingQty -= packetQty;
                                                    }
                                                  });
                                                  
                                                  setSelectedPackets([...selectedPackets, ...packetsToAdd]);
                                                  console.log(`[PrimarySowingEntry] Added new packets from Primary:`, packetsToAdd);
                                                }
                                              } else {
                                                // Clear Packets when Primary is too small
                                                console.log(`[PrimarySowingEntry] Primary quantity too small, clearing Packets`);
                                                setSelectedPackets(selectedPackets.filter(sp => 
                                                  !combined.itemIds.includes(sp.itemId)
                                                ));
                                              }
                                            } else {
                                              // Clear Packets when Primary is cleared
                                              console.log(`[PrimarySowingEntry] Primary cleared, clearing Packets`);
                                              setSelectedPackets(selectedPackets.filter(sp => 
                                                !combined.itemIds.includes(sp.itemId)
                                              ));
                                            }
                                          }}
                                          inputProps={{
                                            min: 0,
                                            step: 1
                                          }}
                                          placeholder="0"
                                          sx={{
                                            "& .MuiInputBase-input": {
                                              fontSize: isMobile ? "16px" : "0.95rem",
                                              py: isMobile ? 1.5 : 1,
                                              bgcolor: "#fff9e6",
                                            },
                                            "& .MuiInputLabel-root": {
                                              fontWeight: 600,
                                            },
                                          }}
                                        />
                                      </Box>
                                    </Paper>
                                  );
                                })}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>
          )}
        </Container>
      </Box>

      {/* Motivational Quote Modal - shown once per day */}
      <MotivationalQuoteModal
        open={showQuoteModal}
        onClose={handleQuoteModalClose}
        quote={quote}
      />
    </LocalizationProvider>
  );
};

export default PrimarySowingEntry;
