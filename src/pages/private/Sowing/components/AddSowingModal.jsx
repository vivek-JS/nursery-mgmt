import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Typography,
  Chip,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Stack,
} from "@mui/material";
import {
  Close,
  Add as AddIcon,
  CalendarToday,
  LocationOn,
  Inventory,
  Notes,
  Save,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useSelector } from "react-redux";

const AddSowingModal = ({ open, onClose, plants = [], onSuccess, userData, appUser }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [plantSowingBuffer, setPlantSowingBuffer] = useState(0); // Store sowing buffer for selected plant
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availablePackets, setAvailablePackets] = useState([]); // Now grouped by plant -> subtype
  const [loadingPackets, setLoadingPackets] = useState(false);
  const [selectedPackets, setSelectedPackets] = useState([]); // Array of selected packets with quantities and slots
  const [primaryQuantities, setPrimaryQuantities] = useState({}); // Map of itemId -> primary quantity for field sowing
  const [remainingPlants, setRemainingPlants] = useState([]);
  const [loadingRemaining, setLoadingRemaining] = useState(false);
  const [showRemainingPopup, setShowRemainingPopup] = useState(false);
  const [showSummary, setShowSummary] = useState(false); // Show summary before creating sowings
  const [plantSlotsMap, setPlantSlotsMap] = useState({}); // Map of plantId -> subtypeId -> slots
  const [slotSelections, setSlotSelections] = useState({}); // Map of plantId_subtypeId -> slotId
  const [formData, setFormData] = useState({
    sowingDate: moment(),
    totalQuantityRequired: "",
    sowingLocation: "OFFICE",
    batchNumber: "",
    notes: "",
    reminderBeforeDays: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch sowing buffer when plant is selected
  useEffect(() => {
    if (selectedPlant && plants.length > 0) {
      const plant = plants.find(p => p._id === selectedPlant._id);
      if (plant && plant.sowingBuffer !== undefined) {
        setPlantSowingBuffer(plant.sowingBuffer || 0);
      } else {
        setPlantSowingBuffer(0);
      }
    } else {
      setPlantSowingBuffer(0);
    }
  }, [selectedPlant, plants]);

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({
        sowingDate: moment(),
        totalQuantityRequired: "",
        sowingLocation: "OFFICE",
        batchNumber: "",
        notes: "",
        reminderBeforeDays: 5,
      });
      setSelectedPlant(null);
      setSelectedSubtype(null);
      setSelectedSlot(null);
      setSelectedPackets([]);
      setPrimaryQuantities({});
      setAvailablePackets([]);
      setRemainingPlants([]);
      setErrors({});
      setShowSummary(false);
      setPlantSlotsMap({});
      setSlotSelections({});
      // Fetch remaining plants and available packets when modal opens
      fetchRemainingPlants();
      fetchAllAvailablePackets(false); // Don't filter by selected plant/subtype on open
    }
  }, [open]);

  useEffect(() => {
    if (selectedPlant && selectedSubtype) {
      fetchAvailableSlots();
      // Don't auto-fetch packets when plant/subtype changes - let user manually refresh if needed
      // This prevents API calls when entering numbers in input fields
    } else {
      setAvailableSlots([]);
    }
  }, [selectedPlant, selectedSubtype]);

  // Packets are already loaded on modal open, no need to reload when location changes
  // Just clear selection if location changes away from OFFICE
  useEffect(() => {
    if (formData.sowingLocation !== "OFFICE") {
      setSelectedPackets([]);
    }
  }, [formData.sowingLocation]);

  // Fetch remaining plants to sow
  const fetchRemainingPlants = async () => {
    setLoadingRemaining(true);
    try {
      const instance = NetworkManager(API.sowing.GET_SOWINGS);
      // Pass query params as object - axios will convert to query string
      const response = await instance.request({}, {
        showPendingOnly: "true", // Backend expects string "true"
        limit: 1000,
      });

      if (response?.data?.success && response?.data?.data) {
        const sowings = response.data.data;
        
        // Group by plant and subtype, calculate remaining
        const plantMap = new Map();
        
        sowings.forEach((sowing) => {
          const key = `${sowing.plantId?._id || sowing.plantId}_${sowing.subtypeId}`;
          const remaining = sowing.remainingToSow || (sowing.totalQuantityRequired - sowing.totalSowed);
          
          if (remaining > 0) {
            if (!plantMap.has(key)) {
              plantMap.set(key, {
                plantId: sowing.plantId?._id || sowing.plantId,
                plantName: sowing.plantName || sowing.plantId?.name || "Unknown",
                subtypeId: sowing.subtypeId,
                subtypeName: sowing.subtypeName || "Unknown",
                totalRequired: 0,
                totalSowed: 0,
                remaining: 0,
                sowings: [],
              });
            }
            
            const entry = plantMap.get(key);
            entry.totalRequired += sowing.totalQuantityRequired || 0;
            entry.totalSowed += sowing.totalSowed || 0;
            entry.remaining += remaining;
            entry.sowings.push({
              id: sowing._id,
              sowingDate: sowing.sowingDate,
              expectedReadyDate: sowing.expectedReadyDate,
              status: sowing.status,
              remaining: remaining,
            });
          }
        });

        const remainingList = Array.from(plantMap.values()).sort((a, b) => b.remaining - a.remaining);
        setRemainingPlants(remainingList);
      } else {
        setRemainingPlants([]);
      }
    } catch (error) {
      console.error("Error fetching remaining plants:", error);
      Toast.error("Failed to fetch remaining plants");
      setRemainingPlants([]);
    } finally {
      setLoadingRemaining(false);
    }
  };

  // Fetch all available packets in single API call
  // Optionally filter by plantId and subtypeId if plant/subtype is selected
  const fetchAllAvailablePackets = async (filterBySelected = false) => {
    setLoadingPackets(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_AVAILABLE_PACKETS_FOR_SOWING);
      
      // Build query params - filter by selected plant/subtype if requested
      const queryParams = {};
      if (filterBySelected && selectedPlant) {
        queryParams.plantId = selectedPlant._id;
        if (selectedSubtype) {
          queryParams.subtypeId = selectedSubtype._id;
        }
      }
      
      const response = await instance.request({}, queryParams);
      
      if (response?.data?.success && response?.data?.data) {
        // Data is now grouped by plant -> subtype
        setAvailablePackets(response.data.data);
      } else {
        setAvailablePackets([]);
      }
    } catch (error) {
      console.error("Error fetching available packets:", error);
      Toast.error("Failed to fetch available packets");
      setAvailablePackets([]);
    } finally {
      setLoadingPackets(false);
    }
  };

  // Legacy function - kept for backward compatibility, but now uses single API
  const fetchAvailablePackets = async () => {
    await fetchAllAvailablePackets();
  };

  const fetchAvailableSlots = async () => {
    if (!selectedPlant || !selectedSubtype) return;

    setLoadingSlots(true);
    try {
      const years = [2025, 2026]; // Fetch slots for both 2025 and 2026
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      
      // Fetch slots for both years in parallel
      const yearPromises = years.map(year => 
        instance.request(
          {},
          {
            plantId: selectedPlant._id,
            subtypeId: selectedSubtype._id,
            year,
          }
        ).catch(error => {
          console.error(`Error fetching slots for year ${year}:`, error);
          return null; // Continue with other years even if one fails
        })
      );
      
      const responses = await Promise.all(yearPromises);
      
      // Merge slots from all years
      const mergedSlotsData = [];
      responses.forEach((response) => {
        if (response) {
          const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
          if (Array.isArray(slotsData) && slotsData.length > 0) {
            mergedSlotsData.push(...slotsData);
          }
        }
      });
      
      setAvailableSlots(mergedSlotsData);
    } catch (error) {
      console.error("Error fetching slots:", error);
      Toast.error("Failed to fetch available slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  // Fetch slots for a specific plant and subtype
  const fetchSlotsForPlantSubtype = async (plantId, subtypeId) => {
    const key = `${plantId}_${subtypeId}`;
    
    // Check if already fetched
    if (plantSlotsMap[plantId]?.[subtypeId]) {
      return plantSlotsMap[plantId][subtypeId];
    }

    try {
      const years = [2025, 2026]; // Fetch slots for both 2025 and 2026
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      
      // Fetch slots for both years in parallel
      const yearPromises = years.map(year => 
        instance.request(
          {},
          {
            plantId,
            subtypeId,
            year,
          }
        ).catch(error => {
          console.error(`Error fetching slots for year ${year}:`, error);
          return null; // Continue with other years even if one fails
        })
      );
      
      const responses = await Promise.all(yearPromises);
      
      // Merge slots from all years
      const mergedSlotsData = [];
      responses.forEach((response) => {
        if (response) {
          const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
          if (Array.isArray(slotsData) && slotsData.length > 0) {
            mergedSlotsData.push(...slotsData);
          }
        }
      });
      
      // Store in map
      setPlantSlotsMap(prev => ({
        ...prev,
        [plantId]: {
          ...(prev[plantId] || {}),
          [subtypeId]: mergedSlotsData,
        },
      }));

      return mergedSlotsData;
    } catch (error) {
      console.error(`Error fetching slots for plant ${plantId}, subtype ${subtypeId}:`, error);
      return [];
    }
  };

  // Fetch slots for all plant/subtype combinations when packets are loaded
  useEffect(() => {
    if (availablePackets.length > 0) {
      availablePackets.forEach(plantGroup => {
        if (plantGroup.plantId && plantGroup.subtypes) {
          plantGroup.subtypes.forEach(subtypeGroup => {
            if (subtypeGroup.subtypeId && subtypeGroup.packets?.length > 0) {
              fetchSlotsForPlantSubtype(plantGroup.plantId, subtypeGroup.subtypeId);
            }
          });
        }
      });
    }
  }, [availablePackets]);

  // Original handleSubmit for PRIMARY location or when no packets selected
  const handleSubmit = async () => {
    // Validate
    const newErrors = {};
    if (!selectedPlant) newErrors.plant = "Please select a plant";
    if (!selectedSubtype) newErrors.subtype = "Please select a subtype";
    if (!formData.totalQuantityRequired || formData.totalQuantityRequired <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }
    if (!formData.sowingDate) {
      newErrors.date = "Please select a sowing date";
    }
    
    // Validate batch number
    if (formData.sowingLocation === "OFFICE" && selectedPackets.length > 0) {
      // For OFFICE location with packets, validate all packets have batch numbers
      const packetsWithoutBatch = selectedPackets.filter(p => !p.batchNumber || p.batchNumber.trim() === "");
      if (packetsWithoutBatch.length > 0) {
        newErrors.batchNumber = "Batch number is mandatory for all packets";
      }
    } else if (formData.sowingLocation === "PRIMARY") {
      // For PRIMARY location, validate form field
      if (!formData.batchNumber || formData.batchNumber.trim() === "") {
        newErrors.batchNumber = "Batch number is required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const user = userData || appUser;
      
      // Calculate sowedPlant from Primary (Field) input values
      const totalPrimaryQty = Object.values(primaryQuantities).reduce((sum, qty) => sum + (qty || 0), 0);
      
      // Extract batch number from packets if OFFICE location, otherwise use form field
      let batchNumberToUse = "";
      if (formData.sowingLocation === "OFFICE" && selectedPackets.length > 0) {
        // Extract batch numbers from packets
        const packetBatchNumbers = selectedPackets
          .map(p => p.batchNumber)
          .filter(bn => bn && bn.trim() !== "");
        const uniqueBatchNumbers = [...new Set(packetBatchNumbers)];
        batchNumberToUse = uniqueBatchNumbers.length === 1 
          ? uniqueBatchNumbers[0] 
          : uniqueBatchNumbers.join(", ");
      } else {
        batchNumberToUse = formData.batchNumber.trim();
      }
      
      const payload = {
        plantId: selectedPlant._id,
        subtypeId: selectedSubtype._id,
        sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
        totalQuantityRequired: parseInt(formData.totalQuantityRequired),
        sowedPlant: totalPrimaryQty > 0 ? totalPrimaryQty : parseInt(formData.totalQuantityRequired), // Use Primary (Field) value if available
        reminderBeforeDays: parseInt(formData.reminderBeforeDays),
        notes: formData.notes,
        batchNumber: batchNumberToUse, // Use batch number from packets or form field
        sowingLocation: formData.sowingLocation,
        slotId: selectedSlot?._id,
      };

      // Add packet references if location is OFFICE and packets are selected
      if (formData.sowingLocation === "OFFICE" && selectedPackets.length > 0) {
        payload.packets = selectedPackets.map(p => ({
          outwardId: p.outwardId,
          itemId: p.itemId,
          quantity: p.quantity,
          batchNumber: p.batchNumber,
        }));
      }

      if (user?._id) {
        payload.createdBy = user._id;
      }

      console.log("[Sowing] 📤 Single sowing payload:", payload);
      console.log("[Sowing] 🔍 Has sowedPlant?", payload.sowedPlant !== undefined);
      console.log("[Sowing] 🔍 sowedPlant value:", payload.sowedPlant);
      
      if (payload.sowedPlant) {
        console.log(`[Sowing] ✅ ${formData.sowingLocation} sowing has sowedPlant:`, payload.sowedPlant);
      } else {
        console.error(`[Sowing] ❌ ERROR: ${formData.sowingLocation} sowing missing sowedPlant!`);
      }

      const instance = NetworkManager(API.sowing.CREATE_SOWING);
      const response = await instance.request(payload);

      if (response?.data) {
        const locationText = formData.sowingLocation === "OFFICE" ? "Packets" : "Primary";
        Toast.success(`${locationText} sowing record created successfully`);
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Error creating sowing:", error);
      Toast.error(error?.response?.data?.message || "Failed to create sowing record");
    } finally {
      setSubmitting(false);
    }
  };

  // Show summary before creating sowings
  const handleShowSummary = () => {
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

    // If packets are selected, plant/subtype come from packets (no validation needed)
    // If only PRIMARY quantities, no plant/subtype validation needed
    // Only validate if no packets and no primary quantities (shouldn't happen due to first check)

    setShowSummary(true);
  };

  // Create multiple sowings from selected packets and primary quantities
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
    if (hasPackets && formData.sowingLocation === "OFFICE") {
      const packetsWithoutBatch = selectedPackets.filter(p => !p.batchNumber || p.batchNumber.trim() === "");
      if (packetsWithoutBatch.length > 0) {
        Toast.error("Batch number is mandatory for all packets. Please ensure all selected packets have batch numbers.");
        return;
      }
    }

    // Validate batch number for PRIMARY location
    if (formData.sowingLocation === "PRIMARY" && (!formData.batchNumber || formData.batchNumber.trim() === "")) {
      Toast.error("Batch number is mandatory for PRIMARY location");
      setErrors({ ...errors, batchNumber: "Batch number is required" });
      return;
    }

    // Plant/subtype come from packets API response - no manual validation needed

    setSubmitting(true);
    setErrors({});

    try {
      const user = userData || appUser;
      const sowingsToCreate = [];

      // Group selected packets by plant/subtype/slot combination
      const groupedPackets = new Map();
      
      selectedPackets.forEach(packet => {
        const slotKey = `${packet.plantId}_${packet.subtypeId}`;
        const slotId = slotSelections[slotKey];
        
        // Debug: Log slot selection
        console.log(`[Sowing] Packet: ${packet.productName}, slotKey: ${slotKey}, slotId from state: ${slotId}, slotSelections:`, slotSelections);
        
        const groupKey = `${packet.plantId}_${packet.subtypeId}_${slotId || 'no-slot'}`;
        
        if (!groupedPackets.has(groupKey)) {
          groupedPackets.set(groupKey, {
            plantId: packet.plantId,
            plantName: packet.plantName,
            subtypeId: packet.subtypeId,
            subtypeName: packet.subtypeName,
            slotId: slotId || null, // Keep null if no slot selected
            packets: [],
            totalQuantity: 0,
          });
        }
        
        const group = groupedPackets.get(groupKey);
        group.packets.push(packet);
        group.totalQuantity += packet.quantity || packet.availableQuantity;
      });
      
      // Debug: Log final groups
      console.log(`[Sowing] Grouped packets:`, Array.from(groupedPackets.entries()).map(([key, group]) => ({
        key,
        plantId: group.plantId,
        subtypeId: group.subtypeId,
        slotId: group.slotId,
        totalQuantity: group.totalQuantity
      })));

      // Calculate total primary quantities from Primary (Field) input fields
      const totalPrimaryQuantities = Object.values(primaryQuantities).reduce((sum, qty) => sum + (qty || 0), 0);

      // Create sowing for each OFFICE group
      if (hasPackets && formData.sowingLocation === "OFFICE") {
        for (const [groupKey, group] of groupedPackets) {
          // Extract batch numbers from packets (mandatory)
          const packetBatchNumbers = group.packets
            .map(p => p.batchNumber)
            .filter(bn => bn && bn.trim() !== ""); // Filter out empty/null batch numbers
          
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
          
          const payload = {
            plantId: group.plantId,
            subtypeId: group.subtypeId,
            sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
            totalQuantityRequired: group.totalQuantity,
            sowedPlant: totalPrimaryQuantities || 0, // Use Primary (Field) input value
            reminderBeforeDays: parseInt(formData.reminderBeforeDays),
            notes: formData.notes,
            batchNumber: batchNumberFromPackets, // Use batch number from packets (mandatory)
            sowingLocation: "OFFICE",
            slotId: group.slotId,
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

      // Handle PRIMARY quantities - use selected plant and subtype from form
      if (hasPrimaryQuantities && formData.sowingLocation === "PRIMARY" && selectedPlant && selectedSubtype) {
        const totalPrimaryQty = totalPrimaryQuantities;
        
        if (totalPrimaryQty > 0) {
          const payload = {
            plantId: selectedPlant._id,
            subtypeId: selectedSubtype._id,
            sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
            totalQuantityRequired: totalPrimaryQty,
            sowedPlant: totalPrimaryQty, // Use Primary (Field) input value
            reminderBeforeDays: parseInt(formData.reminderBeforeDays),
            notes: formData.notes,
            batchNumber: formData.batchNumber.trim(), // Mandatory for PRIMARY (validated above)
            sowingLocation: "PRIMARY",
            slotId: selectedSlot?._id || slotSelections[`${selectedPlant._id}_${selectedSubtype._id}`] || null,
          };

          if (user?._id) {
            payload.createdBy = user._id;
          }

          console.log("[Sowing] PRIMARY payload with sowedPlant:", payload);
          sowingsToCreate.push(payload);
        }
      }

      if (sowingsToCreate.length === 0) {
        Toast.error("No valid sowings to create");
        setSubmitting(false);
        return;
      }

      // Ensure sowedPlant is added to all sowings using Primary (Field) values
      // If primaryQuantities exist, use them; otherwise use totalQuantityRequired
      const finalPrimaryQty = totalPrimaryQuantities || 0;
      sowingsToCreate.forEach((sowing, index) => {
        if (sowing.sowedPlant === undefined || sowing.sowedPlant === null) {
          // Use primaryQuantities if available, otherwise fallback to totalQuantityRequired
          sowing.sowedPlant = finalPrimaryQty > 0 ? finalPrimaryQty : sowing.totalQuantityRequired;
          console.log(`[Sowing] ⚠️ Added missing sowedPlant to ${sowing.sowingLocation} sowing #${index + 1}:`, sowing.sowedPlant);
        } else {
          console.log(`[Sowing] ✅ ${sowing.sowingLocation} sowing #${index + 1} has sowedPlant:`, sowing.sowedPlant);
        }
      });

      // Log all sowings before sending with explicit verification
      console.log("[Sowing] 📤 Final payload being sent:", JSON.stringify(sowingsToCreate, null, 2));
      
      // Verify all sowings have sowedPlant
      const sowingsWithoutSowedPlant = sowingsToCreate.filter(s => !s.sowedPlant);
      if (sowingsWithoutSowedPlant.length > 0) {
        console.error("[Sowing] ❌ ERROR: Found sowings without sowedPlant:", sowingsWithoutSowedPlant);
      } else {
        console.log(`[Sowing] ✅ All ${sowingsToCreate.length} sowing(s) have sowedPlant`);
      }

      // Call the multiple sowings endpoint
      // Ensure sowedPlant uses Primary (Field) input values
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
      
      // Final verification - log the exact payload being sent
      console.log("[Sowing] 🔍 Request payload object:", JSON.stringify(requestPayload, null, 2));
      console.log("[Sowing] 🔍 First sowing in request:", JSON.stringify(requestPayload.sowings[0], null, 2));
      console.log("[Sowing] 🔍 Has sowedPlant?", requestPayload.sowings[0]?.sowedPlant !== undefined);
      console.log("[Sowing] 🔍 sowedPlant value:", requestPayload.sowings[0]?.sowedPlant);
      
      // Verify all sowings have sowedPlant before sending
      requestPayload.sowings.forEach((sowing, idx) => {
        if (sowing.sowedPlant === undefined || sowing.sowedPlant === null) {
          console.error(`[Sowing] ❌ CRITICAL: Sowing #${idx + 1} missing sowedPlant!`, sowing);
          // Use primaryQuantities value if available, otherwise fallback to totalQuantityRequired
          sowing.sowedPlant = finalTotalPrimaryQty > 0 ? finalTotalPrimaryQty : sowing.totalQuantityRequired;
          console.log(`[Sowing] ✅ Fixed sowedPlant to:`, sowing.sowedPlant);
        }
      });
      
      const instance = NetworkManager(API.sowing.CREATE_MULTIPLE_SOWINGS);
      const response = await instance.request(requestPayload);

      if (response?.data) {
        const successCount = response.data.success || 0;
        const failedCount = response.data.failed || 0;
        
        if (successCount > 0) {
          Toast.success(`Successfully created ${successCount} sowing record(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
          onSuccess?.();
          onClose();
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

  const getExpectedReadyDate = () => {
    if (!selectedSubtype || !formData.sowingDate) return null;
    const readyDays = selectedSubtype.plantReadyDays || 0;
    return moment(formData.sowingDate).add(readyDays, "days").format("DD-MM-YYYY");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Dialog 
        open={open} 
        onClose={onClose} 
        fullScreen={isMobile}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            m: isMobile ? 0 : 2,
            width: isMobile ? "100%" : "95%",
            height: isMobile ? "100%" : "95%",
            maxHeight: isMobile ? "100%" : "95vh",
          }
        }}>
        <DialogTitle
          sx={{
            bgcolor: "#2e7d32",
            color: "white",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? 1.5 : 1,
            p: isMobile ? 1.5 : 2,
          }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: isMobile ? "100%" : "auto" }}>
            <AddIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontSize: isMobile ? "1rem" : "1.25rem", fontWeight: 700 }}>
              Add New Sowing
            </Typography>
          </Box>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1, 
            flexWrap: isMobile ? "wrap" : "nowrap",
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile ? "space-between" : "flex-end"
          }}>
            <Button
              variant="outlined"
              size={isMobile ? "medium" : "small"}
              onClick={() => {
                setShowRemainingPopup(true);
                fetchRemainingPlants();
              }}
              sx={{
                color: "white",
                borderColor: "white",
                fontSize: isMobile ? "0.875rem" : "0.75rem",
                px: isMobile ? 2 : 1.5,
                py: isMobile ? 1 : 0.5,
                minHeight: isMobile ? 40 : 32,
                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
              }}>
              {isMobile ? "Remaining" : "View Remaining Plants"}
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? "medium" : "small"}
              onClick={() => {
                if (formData.sowingLocation === "OFFICE") {
                  fetchAvailablePackets();
                } else {
                  setFormData({ ...formData, sowingLocation: "OFFICE" });
                  setTimeout(() => fetchAvailablePackets(), 100);
                }
              }}
              disabled={loadingPackets}
              sx={{
                color: "white",
                borderColor: "white",
                fontSize: isMobile ? "0.875rem" : "0.75rem",
                px: isMobile ? 2 : 1.5,
                py: isMobile ? 1 : 0.5,
                minHeight: isMobile ? 40 : 32,
                "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
                "&:disabled": { borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
              }}>
              {loadingPackets ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CircularProgress size={isMobile ? 18 : 14} sx={{ color: "white" }} />
                  {!isMobile && "Loading..."}
                </Box>
              ) : (
                isMobile ? "Packets" : "View Pending Packets"
              )}
            </Button>
            <IconButton 
              onClick={onClose} 
              sx={{ 
                color: "white",
                p: isMobile ? 1 : 0.5,
                minWidth: isMobile ? 40 : 32,
                minHeight: isMobile ? 40 : 32,
              }}>
              <Close sx={{ fontSize: isMobile ? 24 : 20 }} />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Action Buttons Header - Always Visible */}
        <Box sx={{ 
          p: isMobile ? 1 : 1.5, 
          bgcolor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "2px solid rgba(0, 0, 0, 0.1)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "flex-end",
          gap: isMobile ? 1 : 1.5,
        }}>
          {selectedPackets.length > 0 || Object.keys(primaryQuantities).length > 0 ? (
            <>
              {!showSummary ? (
                <Button
                  variant="contained"
                  size={isMobile ? "large" : "medium"}
                  onClick={handleShowSummary}
                  disabled={submitting}
                  fullWidth={isMobile}
                  sx={{
                    bgcolor: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: isMobile ? "1rem" : "0.875rem",
                    minHeight: isMobile ? 48 : 36,
                    boxShadow: "0 4px 12px rgba(76, 175, 80, 0.4)",
                    "&:hover": {
                      bgcolor: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 16px rgba(76, 175, 80, 0.5)",
                    },
                  }}>
                  Review & Create ({selectedPackets.length} packets)
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    size={isMobile ? "large" : "medium"}
                    onClick={() => setShowSummary(false)}
                    disabled={submitting}
                    fullWidth={isMobile}
                    sx={{
                      borderColor: "#667eea",
                      color: "#667eea",
                      fontWeight: 600,
                      fontSize: isMobile ? "1rem" : "0.875rem",
                      minHeight: isMobile ? 48 : 36,
                      "&:hover": {
                        borderColor: "#764ba2",
                        bgcolor: "rgba(102, 126, 234, 0.1)",
                      },
                    }}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    size={isMobile ? "large" : "medium"}
                    onClick={handleCreateSowings}
                    disabled={submitting}
                    fullWidth={isMobile}
                    startIcon={submitting ? <CircularProgress size={isMobile ? 20 : 18} sx={{ color: "white" }} /> : null}
                    sx={{
                      bgcolor: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
                      color: "white",
                      fontWeight: 700,
                      fontSize: isMobile ? "1rem" : "0.875rem",
                      minHeight: isMobile ? 48 : 36,
                      boxShadow: "0 4px 12px rgba(76, 175, 80, 0.4)",
                      "&:hover": {
                        bgcolor: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 16px rgba(76, 175, 80, 0.5)",
                      },
                    }}>
                    {submitting ? "Creating..." : "Create All Sowings"}
                  </Button>
                </>
              )}
            </>
          ) : null}
          
          {/* Cancel Button - Always Visible */}
          <Button
            variant="outlined"
            size={isMobile ? "large" : "medium"}
            onClick={onClose}
            disabled={submitting}
            fullWidth={isMobile}
            sx={{
              borderColor: "#f44336",
              color: "#f44336",
              fontWeight: 600,
              fontSize: isMobile ? "1rem" : "0.875rem",
              minWidth: isMobile ? "100%" : "100px",
              minHeight: isMobile ? 48 : 36,
              "&:hover": {
                borderColor: "#d32f2f",
                bgcolor: "rgba(244, 67, 54, 0.1)",
              },
            }}>
            Cancel
          </Button>
        </Box>

        <DialogContent sx={{ 
          p: isMobile ? 1 : 1.5, 
          bgcolor: "#f5f5f5", 
          height: isMobile ? "calc(100vh - 180px)" : "calc(100vh - 120px)", 
          overflow: "auto" 
        }}>
          {/* Form Fields Section - Always Visible */}
          {!showSummary && (
            <Paper sx={{ 
              p: isMobile ? 1.5 : 2, 
              mb: isMobile ? 1.5 : 2, 
              bgcolor: "white", 
              border: "2px solid #2196f3", 
              borderRadius: 2 
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 700, 
                  color: "#1976d2", 
                  mb: isMobile ? 1.5 : 2, 
                  fontSize: isMobile ? "0.95rem" : "1rem",
                  display: "flex", 
                  alignItems: "center", 
                  gap: 1 
                }}>
                <CalendarToday sx={{ fontSize: isMobile ? 18 : 20 }} />
                Sowing Details
              </Typography>
              <Grid container spacing={isMobile ? 1.5 : 2}>
                {/* Sowing Date Picker */}
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Sowing Date *"
                    value={formData.sowingDate}
                    onChange={(newValue) => {
                      setFormData({ ...formData, sowingDate: newValue || moment() });
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: isMobile ? "medium" : "small",
                        error: !!errors.date,
                        helperText: errors.date || "",
                        required: true,
                        sx: {
                          "& .MuiInputBase-input": {
                            fontSize: isMobile ? "16px" : "0.875rem",
                            minHeight: isMobile ? "48px" : "auto",
                          },
                        }
                      },
                    }}
                    format="DD-MM-YYYY"
                  />
                </Grid>

                {/* Batch Number */}
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label={formData.sowingLocation === "PRIMARY" ? "Batch Number *" : "Batch Number"}
                    fullWidth
                    size={isMobile ? "medium" : "small"}
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    placeholder={formData.sowingLocation === "PRIMARY" ? "Required for PRIMARY location" : "Auto-filled from packets for OFFICE"}
                    error={!!errors.batchNumber}
                    helperText={errors.batchNumber || (formData.sowingLocation === "OFFICE" ? "Auto-filled from packets" : "Required")}
                    required={formData.sowingLocation === "PRIMARY"}
                    InputProps={{
                      readOnly: formData.sowingLocation === "OFFICE" && selectedPackets.length > 0,
                    }}
                    sx={{
                      ...(formData.sowingLocation === "OFFICE" && selectedPackets.length > 0
                        ? {
                            "& .MuiOutlinedInput-root": {
                              bgcolor: "#f5f5f5",
                            },
                          }
                        : {}),
                      "& .MuiInputBase-input": {
                        fontSize: isMobile ? "16px" : "0.875rem",
                        minHeight: isMobile ? "48px" : "auto",
                      },
                    }}
                  />
                </Grid>

                {/* Reminder Before Days */}
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    label="Reminder Days"
                    type="number"
                    fullWidth
                    size={isMobile ? "medium" : "small"}
                    value={formData.reminderBeforeDays}
                    onChange={(e) => setFormData({ ...formData, reminderBeforeDays: parseInt(e.target.value) || 5 })}
                    inputProps={{ min: 0, max: 30 }}
                    sx={{
                      "& .MuiInputBase-input": {
                        fontSize: isMobile ? "16px" : "0.875rem",
                        minHeight: isMobile ? "48px" : "auto",
                      },
                    }}
                  />
                </Grid>

                {/* Expected Ready Date (Read-only) */}
                {selectedSubtype && formData.sowingDate && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Expected Ready Date"
                      fullWidth
                      size={isMobile ? "medium" : "small"}
                      value={getExpectedReadyDate() || ""}
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "#f5f5f5",
                        },
                        "& .MuiInputBase-input": {
                          fontSize: isMobile ? "16px" : "0.875rem",
                          minHeight: isMobile ? "48px" : "auto",
                        },
                      }}
                    />
                  </Grid>
                )}

                {/* Notes */}
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={isMobile ? 3 : 2}
                    size={isMobile ? "medium" : "small"}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes for this sowing"
                    sx={{
                      "& .MuiInputBase-input": {
                        fontSize: isMobile ? "16px" : "0.875rem",
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Summary View */}
          {showSummary && selectedPackets.length > 0 && (
            <Paper sx={{ 
              p: isMobile ? 1.25 : 1.5, 
              mb: isMobile ? 1 : 1.5, 
              bgcolor: "white", 
              border: "2px solid #2e7d32", 
              borderRadius: 1.5 
            }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 700, 
                color: "#2e7d32", 
                mb: isMobile ? 1 : 1.5, 
                fontSize: isMobile ? "0.95rem" : "1rem" 
              }}>
                Sowing Summary
              </Typography>
              
              {/* Group by plant/subtype/slot */}
              {(() => {
                const grouped = new Map();
                selectedPackets.forEach(packet => {
                  const slotKey = `${packet.plantId}_${packet.subtypeId}`;
                  const slotId = slotSelections[slotKey];
                  const groupKey = `${packet.plantId}_${packet.subtypeId}_${slotId || 'no-slot'}`;
                  
                  if (!grouped.has(groupKey)) {
                    const slots = plantSlotsMap[packet.plantId]?.[packet.subtypeId] || [];
                    const selectedSlot = slots.find(s => s._id === slotId);
                    
                    grouped.set(groupKey, {
                      plantId: packet.plantId,
                      plantName: packet.plantName,
                      subtypeId: packet.subtypeId,
                      subtypeName: packet.subtypeName,
                      slotId: slotId,
                      slot: selectedSlot,
                      packets: [],
                      totalQuantity: 0,
                    });
                  }
                  
                  const group = grouped.get(groupKey);
                  group.packets.push(packet);
                  group.totalQuantity += packet.quantity || packet.availableQuantity;
                });

                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: isMobile ? 1 : 1.25 }}>
                    {Array.from(grouped.values()).map((group, idx) => (
                      <Paper key={idx} sx={{ 
                        p: isMobile ? 1 : 1.25, 
                        bgcolor: "#f5f5f5", 
                        border: "1px solid #e0e0e0", 
                        borderRadius: 1 
                      }}>
                        <Box sx={{ 
                          display: "flex", 
                          flexDirection: isMobile ? "column" : "row",
                          justifyContent: "space-between", 
                          alignItems: isMobile ? "flex-start" : "center", 
                          mb: 1,
                          gap: isMobile ? 0.75 : 0
                        }}>
                          <Box sx={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 700, 
                              color: "#1976d2", 
                              fontSize: isMobile ? "0.875rem" : "0.9rem" 
                            }}>
                              {group.plantName} - {group.subtypeName}
                            </Typography>
                            {group.slot && (
                              <Typography variant="caption" color="textSecondary" sx={{ 
                                fontSize: isMobile ? "0.75rem" : "0.7rem",
                                display: "block",
                                mt: 0.5
                              }}>
                                Slot: {moment(group.slot.startDay, "DD-MM-YYYY").format("MMM D")} - {moment(group.slot.endDay, "DD-MM-YYYY").format("MMM D")}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 700, 
                            color: "#2e7d32", 
                            fontSize: isMobile ? "0.875rem" : "0.95rem",
                            mt: isMobile ? 0.5 : 0
                          }}>
                            {group.totalQuantity} units
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                          {group.packets.map((p, pIdx) => (
                            <Chip
                              key={pIdx}
                              label={`${p.productName} - Batch: ${p.batchNumber} (${p.quantity || p.availableQuantity})`}
                              size="small"
                              sx={{ 
                                bgcolor: "#e8f5e9", 
                                fontSize: isMobile ? "0.75rem" : "0.7rem", 
                                height: isMobile ? 28 : 22,
                                "& .MuiChip-label": {
                                  fontSize: isMobile ? "0.75rem" : "0.7rem",
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                );
              })()}
            </Paper>
          )}

          {/* Available Packets Card - Compact View */}
          {!showSummary && availablePackets.length > 0 && availablePackets.some(plant => 
            plant.subtypes?.some(subtype => subtype.packets?.length > 0)
          ) && (
            <Paper sx={{ 
              p: isMobile ? 1 : 1.5, 
              mb: isMobile ? 1 : 1.5, 
              bgcolor: "white", 
              border: "2px solid #2196f3", 
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(33, 150, 243, 0.1)"
            }}>
              {/* Compact Header */}
              <Box sx={{ 
                display: "flex", 
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center", 
                justifyContent: "space-between", 
                mb: 1.5,
                gap: isMobile ? 1 : 0
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Inventory sx={{ color: "#2196f3", fontSize: isMobile ? 18 : 20 }} />
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 700, 
                    color: "#1976d2", 
                    fontSize: isMobile ? "0.875rem" : "0.95rem" 
                  }}>
                    {isMobile ? "Available Packets" : "Available Packets for Sowing"}
                  </Typography>
                  <Chip 
                    label={`${availablePackets.reduce((sum, plant) => 
                      sum + (plant.subtypes?.reduce((subSum, subtype) => 
                        subSum + (subtype.packets?.length || 0), 0) || 0), 0
                    )} packets`} 
                    size="small" 
                    color="primary"
                    sx={{ 
                      fontWeight: 600, 
                      ml: isMobile ? 0 : 1,
                      mt: isMobile ? 0.5 : 0,
                      fontSize: isMobile ? "0.7rem" : "0.75rem" 
                    }}
                  />
                </Box>
                <Button
                  variant="outlined"
                  size={isMobile ? "medium" : "small"}
                  onClick={() => fetchAllAvailablePackets()}
                  disabled={loadingPackets}
                  fullWidth={isMobile}
                  startIcon={loadingPackets ? <CircularProgress size={isMobile ? 18 : 14} /> : <Inventory />}
                  sx={{
                    borderColor: "#2196f3",
                    color: "#1976d2",
                    fontSize: isMobile ? "0.875rem" : "0.75rem",
                    minHeight: isMobile ? 40 : 32,
                    "&:hover": { borderColor: "#1976d2", bgcolor: "rgba(33, 150, 243, 0.1)" },
                  }}>
                  {loadingPackets ? "Refreshing..." : "Refresh"}
                </Button>
              </Box>

              {/* Compact Content */}
              {loadingPackets ? (
                <Box sx={{ textAlign: "center", py: 2 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontSize: "0.8rem" }}>
                    Loading available packets...
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: "auto", pr: 1 }}>
                  {/* Display packets grouped by Plant -> Subtype */}
                  {(() => {
                    // Don't filter - show all available packets
                    // This allows users to enter multiple values across different plants
                    let filteredPackets = availablePackets;
                    // Removed filtering to show all plants always

                    if (filteredPackets.length === 0) {
                      return (
                        <Box sx={{ 
                          display: "flex", 
                          flexDirection: "column",
                          alignItems: "center", 
                          justifyContent: "center",
                          minHeight: "50vh",
                          textAlign: "center",
                          p: 4
                        }}>
                          <Box sx={{ 
                            bgcolor: "rgba(255,255,255,0.2)", 
                            borderRadius: "50%", 
                            p: 4, 
                            mb: 2,
                            display: "inline-flex",
                            backdropFilter: "blur(10px)",
                          }}>
                            <Inventory sx={{ fontSize: 80, color: "white" }} />
                          </Box>
                          <Typography variant="h4" sx={{ color: "white", fontWeight: 700, mb: 1 }}>
                            No Packets Available
                          </Typography>
                          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.9)", maxWidth: 500 }}>
                            {selectedPlant && selectedSubtype 
                              ? `No available packets found for ${selectedPlant.name} - ${selectedSubtype.name}. Create outward entries with purpose "production" for this product first.`
                              : 'No available packets found. Create outward entries with purpose "production" for seeds products first.'
                            }
                          </Typography>
                        </Box>
                      );
                    }

                    return (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {availablePackets.map((plantGroup, plantIdx) => {
                        // Calculate total packets for this plant
                        const totalPacketsForPlant = plantGroup.subtypes?.reduce((sum, subtype) => 
                          sum + (subtype.packets?.length || 0), 0
                        ) || 0;

                        return (
                          <Paper 
                            key={plantGroup.plantId || plantIdx}
                            sx={{ 
                              p: 1.25, 
                              bgcolor: "white", 
                              border: "2px solid #2196f3",
                              borderRadius: 1.5,
                              boxShadow: "0 1px 4px rgba(33, 150, 243, 0.1)"
                            }}>
                            {/* Plant Header Box */}
                            <Box sx={{ 
                              p: 1, 
                              mb: 1.25, 
                              bgcolor: "#e3f2fd", 
                              border: "2px solid #2196f3",
                              borderRadius: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between"
                            }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{
                                  bgcolor: "#2196f3",
                                  borderRadius: "50%",
                                  width: 32,
                                  height: 32,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: "0.9rem"
                                }}>
                                  {plantGroup.plantName?.charAt(0) || "P"}
                                </Box>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1976d2", fontSize: "0.9rem" }}>
                                    {plantGroup.plantName}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                                    ID: {plantGroup.plantId?.toString().slice(-8) || "N/A"}
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip 
                                label={`${totalPacketsForPlant} packet${totalPacketsForPlant !== 1 ? 's' : ''}`} 
                                size="small" 
                                color="primary"
                                sx={{ fontWeight: 600, height: 22, fontSize: "0.7rem" }}
                              />
                            </Box>

                            {/* Subtypes */}
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {plantGroup.subtypes?.map((subtypeGroup, subtypeIdx) => {
                                // Combine packets by batch number within this subtype
                                const combinedMap = new Map();
                                subtypeGroup.packets?.forEach(packet => {
                                  const key = `${packet.productId || packet.productName}_${packet.batchNumber || 'NO_BATCH'}`;
                                  
                                  if (!combinedMap.has(key)) {
                                    combinedMap.set(key, {
                                      productId: packet.productId,
                                      productName: packet.productName,
                                      productCode: packet.productCode,
                                      batchNumber: packet.batchNumber || 'N/A',
                                      batch: packet.batch,
                                      unit: packet.unit,
                                      plantId: packet.plantId,
                                      plantName: packet.plantName,
                                      subtypeId: packet.subtypeId,
                                      subtypeName: subtypeGroup.subtypeName,
                                      totalAvailableQuantity: 0,
                                      outwardNumbers: [],
                                      outwardDates: [],
                                      itemIds: [],
                                      packets: []
                                    });
                                  }
                                  
                                  const combined = combinedMap.get(key);
                                  combined.totalAvailableQuantity += packet.availableQuantity;
                                  combined.outwardNumbers.push(packet.outwardNumber);
                                  combined.outwardDates.push(packet.outwardDate);
                                  combined.itemIds.push(packet.itemId);
                                  combined.packets.push(packet);
                                });

                                const combinedBatches = Array.from(combinedMap.values());
                                const slotKey = `${plantGroup.plantId}_${subtypeGroup.subtypeId}`;
                                const slotsForSubtype = plantSlotsMap[plantGroup.plantId]?.[subtypeGroup.subtypeId] || [];
                                const selectedSlotId = slotSelections[slotKey];

                                return (
                                  <Box 
                                    key={`${subtypeGroup.subtypeId}_${subtypeIdx}`}
                                    sx={{ 
                                      p: 0.75,
                                      bgcolor: "white", 
                                      border: "1px solid #e0e0e0",
                                      borderRadius: 1,
                                      mb: 0.75
                                    }}>
                                    {/* Compact Subtype Header with Slot */}
                                    <Box sx={{ 
                                      display: "flex", 
                                      flexDirection: isMobile ? "column" : "row",
                                      alignItems: isMobile ? "flex-start" : "center", 
                                      justifyContent: "space-between",
                                      gap: isMobile ? 1 : 0.75, 
                                      mb: 0.75,
                                      pb: 0.75,
                                      borderBottom: "1px solid #e0e0e0"
                                    }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, width: isMobile ? "100%" : "auto" }}>
                                        <Box sx={{
                                          bgcolor: "#42a5f5",
                                          borderRadius: "50%",
                                          width: isMobile ? 28 : 24,
                                          height: isMobile ? 28 : 24,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "white",
                                          fontWeight: 700,
                                          fontSize: isMobile ? "0.8rem" : "0.75rem"
                                        }}>
                                          {subtypeGroup.subtypeName?.charAt(0) || "S"}
                                        </Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1976d2", fontSize: isMobile ? "0.875rem" : "0.8rem" }}>
                                          {subtypeGroup.subtypeName}
                                        </Typography>
                                      </Box>
                                      
                                      {/* Compact Slot Selection */}
                                      <Box sx={{ minWidth: isMobile ? "100%" : 150, mr: isMobile ? 0 : 0.5, width: isMobile ? "100%" : "auto" }}>
                                        <FormControl size={isMobile ? "medium" : "small"} fullWidth>
                                          <InputLabel sx={{ fontSize: isMobile ? "0.875rem" : "0.7rem" }}>Slot</InputLabel>
                                          <Select
                                            value={selectedSlotId || ""}
                                            label="Slot"
                                            onChange={(e) => {
                                              const newSlotId = e.target.value || null;
                                              console.log(`[Sowing] Slot selection changed: slotKey=${slotKey}, newSlotId=${newSlotId}`);
                                              setSlotSelections(prev => {
                                                const updated = {
                                                  ...prev,
                                                  [slotKey]: newSlotId,
                                                };
                                                console.log(`[Sowing] Updated slotSelections:`, updated);
                                                return updated;
                                              });
                                            }}
                                            sx={{ 
                                              fontSize: isMobile ? "0.875rem" : "0.75rem", 
                                              height: isMobile ? "48px" : "32px",
                                              "& .MuiSelect-select": {
                                                fontSize: isMobile ? "16px" : "0.75rem",
                                              }
                                            }}>
                                            <MenuItem value="" sx={{ fontSize: isMobile ? "0.875rem" : "0.75rem" }}>
                                              <em>None</em>
                                            </MenuItem>
                                            {slotsForSubtype.map((slot) => {
                                              const gap = (slot.totalBookedPlants || 0) - (slot.primarySowed || 0);
                                              // Ensure slot._id is converted to string
                                              const slotIdString = slot._id?.toString() || slot._id;
                                              return (
                                                <MenuItem key={slotIdString} value={slotIdString} sx={{ fontSize: isMobile ? "0.875rem" : "0.75rem" }}>
                                                  <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? 0.5 : 0 }}>
                                                    <span style={{ fontSize: isMobile ? "0.8rem" : "0.7rem" }}>
                                                      {moment(slot.startDay, "DD-MM-YYYY").format("MMM D")} -{" "}
                                                      {moment(slot.endDay, "DD-MM-YYYY").format("MMM D")}
                                                    </span>
                                                    <Chip
                                                      label={`Gap: ${gap}`}
                                                      size="small"
                                                      color={gap > 0 ? "warning" : "success"}
                                                      sx={{ ml: isMobile ? 0 : 0.5, height: isMobile ? 20 : 16, fontSize: isMobile ? "0.65rem" : "0.6rem" }}
                                                    />
                                                  </Box>
                                                </MenuItem>
                                              );
                                            })}
                                          </Select>
                                        </FormControl>
                                      </Box>

                                      <Chip 
                                        label={`${combinedBatches.length} batch${combinedBatches.length > 1 ? 'es' : ''}`} 
                                        size="small" 
                                        color="info"
                                        sx={{ 
                                          height: isMobile ? 24 : 20, 
                                          fontSize: isMobile ? "0.7rem" : "0.65rem", 
                                          fontWeight: 600,
                                          width: isMobile ? "100%" : "auto"
                                        }}
                                      />
                                    </Box>

                                {/* Compact Packet Cards - Wrapped Grid */}
                                <Grid container spacing={isMobile ? 1 : 0.75}>
                                  {combinedBatches.map((combined, batchIdx) => {
                                    const selectedItems = selectedPackets.filter(sp => 
                                      combined.itemIds.includes(sp.itemId)
                                    );
                                    const isSelected = selectedItems.length > 0;
                                    const selectedQuantity = selectedItems.reduce((sum, sp) => sum + (sp.quantity || 0), 0);
                                    
                                    const expiryDate = combined.batch?.expiryDate 
                                      ? moment(combined.batch.expiryDate) 
                                      : null;
                                    const isExpired = expiryDate && expiryDate.isBefore(moment(), 'day');
                                    const isExpiringSoon = expiryDate && expiryDate.isBefore(moment().add(30, 'days'), 'day') && !isExpired;

                                    return (
                                      <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={`${combined.productId}_${combined.batchNumber}_${batchIdx}`}>
                                      <Paper
                                        sx={{
                                          p: isMobile ? 1.5 : 1.5,
                                          border: isSelected ? "3px solid #4caf50" : "2px solid rgba(102, 126, 234, 0.3)",
                                          bgcolor: isSelected ? "rgba(76, 175, 80, 0.1)" : "rgba(255, 255, 255, 0.9)",
                                          backdropFilter: "blur(10px)",
                                          borderRadius: 2,
                                          transition: "all 0.3s",
                                          position: "relative",
                                          boxShadow: isSelected 
                                            ? "0 8px 24px rgba(76, 175, 80, 0.3)" 
                                            : "0 4px 12px rgba(0,0,0,0.08)",
                                          "&:hover": {
                                            boxShadow: isSelected 
                                              ? "0 12px 32px rgba(76, 175, 80, 0.4)" 
                                              : "0 8px 20px rgba(102, 126, 234, 0.2)",
                                            transform: isMobile ? "none" : "translateY(-4px)",
                                            borderColor: isSelected ? "#4caf50" : "#667eea",
                                          },
                                        }}>
                                          {isSelected && (
                                            <Box sx={{
                                              position: "absolute",
                                              top: 8,
                                              right: 8,
                                              bgcolor: "#4caf50",
                                              borderRadius: "50%",
                                              width: 28,
                                              height: 28,
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              color: "white",
                                              fontSize: 16,
                                              fontWeight: 800,
                                              boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
                                              zIndex: 1,
                                            }}>
                                              ✓
                                            </Box>
                                          )}

                                          {/* Product Name and Batch Info */}
                                          <Box sx={{ mb: 1.5 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem", color: "#1976d2", mb: 1 }}>
                                              {combined.productName}
                                            </Typography>
                                            
                                            {/* Batch Number - More Prominent */}
                                            <Box sx={{ 
                                              display: "flex", 
                                              alignItems: "center", 
                                              gap: 1,
                                              mb: 1,
                                              p: 1,
                                              bgcolor: "rgba(102, 126, 234, 0.1)",
                                              borderRadius: 1,
                                              border: "1px solid rgba(102, 126, 234, 0.3)",
                                            }}>
                                              <Typography variant="caption" sx={{ 
                                                fontSize: "0.7rem", 
                                                fontWeight: 600, 
                                                color: "#667eea",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                              }}>
                                                Batch:
                                              </Typography>
                                              <Typography variant="body2" sx={{ 
                                                fontWeight: 700, 
                                                fontSize: "0.85rem", 
                                                color: "#1976d2",
                                                fontFamily: "monospace",
                                              }}>
                                                {combined.batchNumber || 'N/A'}
                                              </Typography>
                                            </Box>
                                            
                                            {combined.outwardNumbers.length === 1 && (
                                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem", fontWeight: 500 }}>
                                                  📦 {combined.outwardNumbers[0]}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                                                  • {moment(combined.outwardDates[0]).format("DD MMM YY")}
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>

                                          {/* Available Quantity */}
                                          <Box sx={{ 
                                            display: "flex", 
                                            justifyContent: "space-between", 
                                            alignItems: "center",
                                            p: 1,
                                            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                                            borderRadius: 1.5,
                                            mb: 1.5,
                                            border: "1px solid #4caf50",
                                          }}>
                                            <Typography variant="body2" color="textSecondary" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>
                                              Available:
                                            </Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#2e7d32", fontSize: "1.1rem" }}>
                                              {combined.totalAvailableQuantity} {combined.unit?.abbreviation || ''}
                                            </Typography>
                                          </Box>

                                          {expiryDate && (
                                            <Box sx={{ mb: 1.5 }}>
                                              <Chip
                                                label={`Exp: ${expiryDate.format("DD MMM YY")}`}
                                                size="small"
                                                sx={{ 
                                                  fontSize: "0.75rem", 
                                                  height: 24,
                                                  fontWeight: 600,
                                                  bgcolor: isExpired 
                                                    ? "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)"
                                                    : isExpiringSoon 
                                                    ? "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)"
                                                    : "linear-gradient(135deg, #ffc107 0%, #ffa000 100%)",
                                                  color: "white",
                                                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                                }}
                                              />
                                            </Box>
                                          )}

                                          {/* Compact Input Boxes */}
                                          <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
                                            {/* Packets Input */}
                                            <TextField
                                              type="number"
                                              label="Packets"
                                              size={isMobile ? "medium" : "small"}
                                              fullWidth
                                              value={selectedQuantity || ''}
                                              onChange={(e) => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                const maxQty = combined.totalAvailableQuantity;
                                                
                                                // Enforce maximum limit
                                                if (qty > maxQty) {
                                                  Toast.warn(`Maximum available: ${maxQty}`);
                                                  // Set to max if exceeds
                                                  const finalQty = maxQty;
                                                  // Continue with maxQty instead of returning
                                                  const existingPackets = selectedPackets.filter(sp => 
                                                    combined.itemIds.includes(sp.itemId)
                                                  );
                                                  
                                                  // Remove existing packets for these items and redistribute
                                                  const updatedPackets = selectedPackets.filter(sp => 
                                                    !combined.itemIds.includes(sp.itemId)
                                                  );
                                                  
                                                  // Distribute maxQty across packets, prioritizing first packets
                                                  let remainingQty = finalQty;
                                                  combined.packets.forEach((p, idx) => {
                                                    if (remainingQty > 0) {
                                                      const packetQty = Math.min(
                                                        p.availableQuantity,
                                                        remainingQty
                                                      );
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
                                                  
                                                  if (formData.sowingLocation === "OFFICE") {
                                                    const currentTotal = parseFloat(formData.totalQuantityRequired || 0);
                                                    const diff = finalQty - selectedQuantity;
                                                    setFormData({ ...formData, totalQuantityRequired: currentTotal + diff });
                                                  }
                                                  return;
                                                }

                                                // Update or add/remove from selectedPackets
                                                if (qty > 0) {
                                                  // Add or update packets
                                                  const existingPackets = selectedPackets.filter(sp => 
                                                    combined.itemIds.includes(sp.itemId)
                                                  );
                                                  
                                                  // Don't auto-populate plant/subtype - let user see all plants
                                                  // This prevents filtering and API calls when entering numbers
                                                  
                                                  if (existingPackets.length > 0) {
                                                    // Update existing - distribute quantity intelligently
                                                    const updatedPackets = [...selectedPackets];
                                                    let remainingQty = qty;
                                                    
                                                    // First, remove existing quantities for these items
                                                    combined.itemIds.forEach(itemId => {
                                                      const idx = updatedPackets.findIndex(sp => sp.itemId === itemId);
                                                      if (idx >= 0) {
                                                        updatedPackets.splice(idx, 1);
                                                      }
                                                    });
                                                    
                                                    // Distribute quantity across packets, prioritizing first packets
                                                    combined.packets.forEach((p, idx) => {
                                                      if (remainingQty > 0) {
                                                        const packetQty = Math.min(
                                                          p.availableQuantity,
                                                          remainingQty
                                                        );
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
                                                    // Add new packets - distribute quantity intelligently
                                                    const packetsToAdd = [];
                                                    let remainingQty = qty;
                                                    
                                                    combined.packets.forEach((p, idx) => {
                                                      if (remainingQty > 0) {
                                                        const packetQty = Math.min(
                                                          p.availableQuantity,
                                                          remainingQty
                                                        );
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
                                                  }
                                                  
                                                  // Update total quantity for OFFICE location
                                                  if (formData.sowingLocation === "OFFICE") {
                                                    const currentTotal = parseFloat(formData.totalQuantityRequired || 0);
                                                    const diff = qty - selectedQuantity;
                                                    setFormData({ ...formData, totalQuantityRequired: currentTotal + diff });
                                                  }
                                                } else {
                                                  // Remove from selectedPackets
                                                  setSelectedPackets(selectedPackets.filter(sp => 
                                                    !combined.itemIds.includes(sp.itemId)
                                                  ));
                                                  if (formData.sowingLocation === "OFFICE") {
                                                    const currentTotal = parseFloat(formData.totalQuantityRequired || 0);
                                                    setFormData({ ...formData, totalQuantityRequired: currentTotal - selectedQuantity });
                                                  }
                                                }
                                              }}
                                              inputProps={{
                                                min: 0,
                                                max: combined.totalAvailableQuantity,
                                                step: 1
                                              }}
                                              sx={{
                                                "& .MuiOutlinedInput-root": {
                                                  fontSize: isMobile ? "16px" : "0.75rem",
                                                  height: isMobile ? "48px" : "32px"
                                                },
                                                "& .MuiInputLabel-root": {
                                                  fontSize: isMobile ? "0.875rem" : "0.7rem"
                                                },
                                                "& .MuiInputBase-input": {
                                                  fontSize: isMobile ? "16px" : "0.75rem",
                                                }
                                              }}
                                            />

                                            {/* Primary (Field) Sowing Input */}
                                            <TextField
                                              type="number"
                                              label="Primary (Field)"
                                              size={isMobile ? "medium" : "small"}
                                              fullWidth
                                              value={(() => {
                                                return combined.itemIds.reduce((sum, itemId) => {
                                                  return sum + (primaryQuantities[itemId] || 0);
                                                }, 0) || '';
                                              })()}
                                              onChange={(e) => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                
                                                // No limit validation for PRIMARY field - allow any quantity
                                                // Distribute quantity across all items in this batch
                                                const itemCount = combined.itemIds.length;
                                                const qtyPerItem = itemCount > 0 ? Math.floor(qty / itemCount) : 0;
                                                const remainder = itemCount > 0 ? qty % itemCount : 0;

                                                // Update primaryQuantities for each item (no max limit)
                                                const updatedPrimaryQuantities = { ...primaryQuantities };
                                                combined.itemIds.forEach((itemId, idx) => {
                                                  const itemQty = qtyPerItem + (idx < remainder ? 1 : 0);
                                                  if (itemQty > 0) {
                                                    // No max limit - allow any quantity
                                                    updatedPrimaryQuantities[itemId] = itemQty;
                                                  } else {
                                                    delete updatedPrimaryQuantities[itemId];
                                                  }
                                                });
                                                setPrimaryQuantities(updatedPrimaryQuantities);

                                                // Update total quantity for PRIMARY location
                                                if (formData.sowingLocation === "PRIMARY") {
                                                  setFormData({ ...formData, totalQuantityRequired: qty });
                                                }
                                              }}
                                              inputProps={{
                                                min: 0,
                                                step: 1
                                                // No max limit for PRIMARY field
                                              }}
                                              sx={{
                                                "& .MuiOutlinedInput-root": {
                                                  fontSize: isMobile ? "16px" : "0.85rem",
                                                  height: isMobile ? "48px" : "40px",
                                                  bgcolor: "white",
                                                  borderRadius: 1,
                                                },
                                                "& .MuiInputLabel-root": {
                                                  fontSize: isMobile ? "0.875rem" : "0.8rem",
                                                  fontWeight: 600,
                                                },
                                                "& .MuiInputBase-input": {
                                                  fontSize: isMobile ? "16px" : "0.85rem",
                                                }
                                              }}
                                            />
                                          </Box>
                                        </Paper>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </Box>
                            );
                          })}
                        </Box>
                      </Paper>
                    );
                        })}
                      </Box>
                    );
                    })()}
                </Box>
              )}
          </Paper>
          )}

          {/* Selected Packets Summary - Compact */}
          {selectedPackets.length > 0 && (
            <Paper sx={{ 
              mt: isMobile ? 1 : 1.5, 
              p: isMobile ? 1.25 : 1, 
              bgcolor: "#e8f5e9", 
              borderRadius: 1.5,
              border: "1.5px solid #4caf50"
            }}>
              <Box sx={{ 
                display: "flex", 
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "flex-start" : "center", 
                gap: isMobile ? 0.75 : 0.75, 
                mb: 1 
              }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 700, 
                  color: "#2e7d32", 
                  fontSize: isMobile ? "0.875rem" : "0.85rem" 
                }}>
                  Selected: {selectedPackets.length} packets
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontWeight: 700, 
                  color: "#1b5e20", 
                  fontSize: isMobile ? "0.875rem" : "0.9rem", 
                  ml: isMobile ? 0 : "auto" 
                }}>
                  Total: {selectedPackets.reduce((sum, p) => sum + p.quantity, 0)} units
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selectedPackets.map((packet) => (
                  <Chip
                    key={packet.itemId}
                    label={`${packet.productName} - ${packet.batchNumber} (${packet.quantity})`}
                    size="small"
                    sx={{ 
                      bgcolor: "white", 
                      fontSize: isMobile ? "0.75rem" : "0.7rem", 
                      height: isMobile ? 28 : 22,
                      "& .MuiChip-label": {
                        fontSize: isMobile ? "0.75rem" : "0.7rem",
                      }
                    }}
                  />
                ))}
              </Box>
            </Paper>
          )}

        </DialogContent>

        {/* DialogActions removed - buttons are now in the header parallel to "Available Packets for Sowing" */}
      </Dialog>

      {/* Remaining Plants Popup */}
      <Dialog
        open={showRemainingPopup}
        onClose={() => setShowRemainingPopup(false)}
        fullScreen={isMobile}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            m: isMobile ? 0 : 2,
            width: isMobile ? "100%" : "95%",
            height: isMobile ? "100%" : "90%",
            maxHeight: isMobile ? "100%" : "90vh",
          }
        }}>
        <DialogTitle
          sx={{
            bgcolor: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "white",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            p: isMobile ? 1.25 : 1.5,
            gap: isMobile ? 1 : 0,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, width: isMobile ? "100%" : "auto" }}>
            <Box sx={{ 
              bgcolor: "rgba(255,255,255,0.2)", 
              borderRadius: "50%", 
              p: isMobile ? 0.75 : 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Inventory sx={{ fontSize: isMobile ? 24 : 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: isMobile ? "1rem" : "1.1rem" }}>
                Remaining Plants to Sow
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? "0.7rem" : "0.75rem" }}>
                Track pending sowing tasks and plant requirements
              </Typography>
            </Box>
          </Box>
          <IconButton 
            onClick={() => setShowRemainingPopup(false)} 
            sx={{ 
              color: "white",
              p: isMobile ? 1 : 0.5,
              minWidth: isMobile ? 40 : 32,
              minHeight: isMobile ? 40 : 32,
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }
            }}>
            <Close sx={{ fontSize: isMobile ? 24 : 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ 
          p: isMobile ? 1 : 1.5, 
          bgcolor: "#f5f5f5", 
          height: isMobile ? "calc(100vh - 150px)" : "calc(100vh - 120px)", 
          overflow: "auto" 
        }}>
          {loadingRemaining ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <CircularProgress size={48} sx={{ color: "#1976d2" }} />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontSize: "0.9rem" }}>
                Loading remaining plants...
              </Typography>
            </Box>
          ) : remainingPlants.length === 0 ? (
            <Box sx={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              minHeight: "50vh",
              textAlign: "center",
              p: 4
            }}>
              <Box sx={{ 
                bgcolor: "#e8f5e9", 
                borderRadius: "50%", 
                p: 3, 
                mb: 2,
                display: "inline-flex"
              }}>
                <Inventory sx={{ fontSize: 64, color: "#2e7d32" }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#2e7d32", mb: 1 }}>
                🎉 All Caught Up!
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 400 }}>
                <strong>Great!</strong> No remaining plants to sow. All sowing tasks are complete.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Summary Stats Card */}
              <Paper
                sx={{
                  p: isMobile ? 1.5 : 2,
                  mb: isMobile ? 1.5 : 2,
                  bgcolor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: isMobile ? 1.5 : 2, fontSize: isMobile ? "0.95rem" : "1rem" }}>
                  📊 Summary Overview
                </Typography>
                <Grid container spacing={isMobile ? 1.5 : 2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: isMobile ? 1.25 : 1.5, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? "0.7rem" : "0.75rem" }}>
                        Plants with Remaining
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, fontSize: isMobile ? "1.75rem" : "2.125rem" }}>
                        {remainingPlants.length}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: isMobile ? 1.25 : 1.5, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? "0.7rem" : "0.75rem" }}>
                        Total Remaining Quantity
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, fontSize: isMobile ? "1.75rem" : "2.125rem" }}>
                        {remainingPlants.reduce((sum, p) => sum + p.remaining, 0)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: "center", p: isMobile ? 1.25 : 1.5, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1.5 }}>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: isMobile ? "0.7rem" : "0.75rem" }}>
                        Total Required
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, fontSize: isMobile ? "1.75rem" : "2.125rem" }}>
                        {remainingPlants.reduce((sum, p) => sum + p.totalRequired, 0)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              <Grid container spacing={isMobile ? 1 : 1.5}>
                {remainingPlants.map((plant, index) => (
                  <Grid item xs={12} sm={6} md={4} key={`${plant.plantId}_${plant.subtypeId}`}>
                    <Paper
                      sx={{
                        p: isMobile ? 1.25 : 1.5,
                        border: "2px solid #e0e0e0",
                        bgcolor: "white",
                        borderRadius: 2,
                        transition: "all 0.3s",
                        "&:hover": { 
                          boxShadow: 6,
                          transform: isMobile ? "none" : "translateY(-2px)",
                          borderColor: "#1976d2",
                        },
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}>
                      {/* Header */}
                      <Box sx={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "flex-start", 
                        mb: 1.5,
                        pb: 1.5,
                        borderBottom: "2px solid #f0f0f0"
                      }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Box sx={{
                              bgcolor: "#1976d2",
                              borderRadius: "50%",
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.9rem"
                            }}>
                              {plant.plantName?.charAt(0) || "P"}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1976d2", fontSize: "0.95rem" }}>
                                {plant.plantName}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#666", fontSize: "0.85rem" }}>
                                {plant.subtypeName}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                            ID: {plant.plantId?.toString().slice(-8) || "N/A"}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${plant.remaining} left`}
                          color="warning"
                          size="small"
                          sx={{ 
                            fontWeight: 700,
                            height: 24,
                            fontSize: "0.75rem"
                          }}
                        />
                      </Box>

                      {/* Stats Grid */}
                      <Grid container spacing={1} sx={{ mb: 1.5 }}>
                        <Grid item xs={4}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1, 
                            bgcolor: "#e3f2fd", 
                            borderRadius: 1,
                            border: "1px solid #bbdefb"
                          }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                              Required
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1976d2", fontSize: "1.1rem" }}>
                              {plant.totalRequired}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1, 
                            bgcolor: "#e8f5e9", 
                            borderRadius: 1,
                            border: "1px solid #c8e6c9"
                          }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                              Sowed
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "1.1rem" }}>
                              {plant.totalSowed}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1, 
                            bgcolor: "#fff3e0", 
                            borderRadius: 1,
                            border: "1px solid #ffe0b2"
                          }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                              Remaining
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#f57c00", fontSize: "1.1rem" }}>
                              {plant.remaining}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Sowing Records */}
                      {plant.sowings.length > 0 && (
                        <Box sx={{ mt: 1.5, mb: 1.5 }}>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, fontSize: "0.75rem", display: "block", mb: 1 }}>
                            📋 Sowing Records ({plant.sowings.length})
                          </Typography>
                          <Box sx={{ maxHeight: 120, overflowY: "auto", pr: 0.5 }}>
                            {plant.sowings.map((sowing, idx) => (
                              <Paper
                                key={sowing.id || idx}
                                sx={{
                                  p: 0.75,
                                  mb: 0.5,
                                  bgcolor: "#fafafa",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 0.75,
                                }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.7rem", display: "block" }}>
                                      {sowing.sowingDate} → {sowing.expectedReadyDate}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                                      Remaining: {sowing.remaining}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={sowing.status}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: "0.65rem",
                                      fontWeight: 600
                                    }}
                                    color={
                                      sowing.status === "OVERDUE"
                                        ? "error"
                                        : sowing.status === "PARTIALLY_SOWED"
                                        ? "warning"
                                        : "default"
                                    }
                                  />
                                </Box>
                              </Paper>
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* Action Button */}
                      <Button
                        variant="contained"
                        size={isMobile ? "medium" : "small"}
                        fullWidth
                        sx={{ 
                          mt: "auto",
                          bgcolor: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
                          "&:hover": {
                            bgcolor: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
                            transform: isMobile ? "none" : "translateY(-1px)",
                            boxShadow: 4,
                          },
                          fontWeight: 700,
                          fontSize: isMobile ? "0.875rem" : "0.85rem",
                          py: isMobile ? 1 : 0.75,
                          minHeight: isMobile ? 44 : 32
                        }}
                        onClick={() => {
                          // Auto-fill the form with this plant
                          const foundPlant = plants.find((p) => p._id === plant.plantId);
                          if (foundPlant) {
                            setSelectedPlant(foundPlant);
                            const foundSubtype = foundPlant.subtypes?.find(
                              (s) => s._id?.toString() === plant.subtypeId?.toString()
                            );
                            if (foundSubtype) {
                              setSelectedSubtype(foundSubtype);
                              setFormData((prev) => ({
                                ...prev,
                                totalQuantityRequired: plant.remaining,
                              }));
                            }
                          }
                          setShowRemainingPopup(false);
                          Toast.success(`Selected ${plant.plantName} - ${plant.subtypeName}`);
                        }}>
                        🌱 Use This Plant
                      </Button>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: isMobile ? 1 : 1.5, 
          bgcolor: "#f5f5f5", 
          borderTop: "1px solid #e0e0e0",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 1 : 0
        }}>
          <Button 
            onClick={() => setShowRemainingPopup(false)} 
            variant="outlined"
            size={isMobile ? "medium" : "small"}
            fullWidth={isMobile}
            sx={{
              borderColor: "#1976d2",
              color: "#1976d2",
              fontSize: isMobile ? "1rem" : "0.875rem",
              minHeight: isMobile ? 44 : 32,
              "&:hover": {
                borderColor: "#1565c0",
                bgcolor: "rgba(25, 118, 210, 0.04)",
              }
            }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default AddSowingModal;





