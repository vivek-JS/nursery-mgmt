import React, { useState, useMemo } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  TextField,
  InputAdornment,
  Divider,
  Chip,
  Collapse,
  IconButton,
  Badge,
} from "@mui/material";
import {
  LocalFlorist,
  Agriculture,
  ExpandMore,
  ExpandLess,
  Search,
} from "@mui/icons-material";

const SowingSidebar = ({
  plants = [],
  selectedPlantId,
  selectedSubtypeId,
  onPlantSelect,
  onSubtypeSelect,
  reminders = [],
  sx = {},
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPlants, setExpandedPlants] = useState({});

  // Filter plants based on search
  const filteredPlants = useMemo(() => {
    if (!searchQuery.trim()) return plants;
    const query = searchQuery.toLowerCase();
    return plants.filter((plant) => {
      const plantMatch = plant.name?.toLowerCase().includes(query);
      const subtypeMatch = plant.subtypes?.some((sub) =>
        sub.name?.toLowerCase().includes(query)
      );
      return plantMatch || subtypeMatch;
    });
  }, [plants, searchQuery]);

  // Count reminders for plant/subtype
  const getReminderCount = (plantId, subtypeId = null) => {
    return reminders.filter((r) => {
      const plantMatch = r.plantId?._id === plantId || r.plantId === plantId;
      if (!subtypeId) return plantMatch;
      return plantMatch && (r.subtypeId?._id === subtypeId || r.subtypeId === subtypeId);
    }).length;
  };

  const togglePlantExpand = (plantId) => {
    setExpandedPlants((prev) => ({
      ...prev,
      [plantId]: !prev[plantId],
    }));
  };

  // Auto-expand selected plant
  const isPlantExpanded = (plantId) => {
    if (selectedPlantId === plantId) return true;
    return expandedPlants[plantId] || false;
  };

  return (
    <Box
      sx={{
        width: 320,
        height: "100vh",
        bgcolor: "#f5f5f5",
        borderRight: "1px solid #e0e0e0",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...sx,
      }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0", bgcolor: "#fff" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2e7d32", mb: 1 }}>
          🌱 Sowing Plants
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Search plants/subtypes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Plants List */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {filteredPlants.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              {searchQuery ? "No plants found" : "No plants available"}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filteredPlants.map((plant, index) => {
              const isSelected = selectedPlantId === plant._id;
              const isExpanded = isPlantExpanded(plant._id);
              const plantReminderCount = getReminderCount(plant._id);

              return (
                <React.Fragment key={plant._id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => {
                        onPlantSelect(plant._id);
                        if (!isExpanded) togglePlantExpand(plant._id);
                      }}
                      sx={{
                        bgcolor: isSelected ? "#e8f5e9" : "transparent",
                        "&:hover": { bgcolor: isSelected ? "#c8e6c9" : "#f5f5f5" },
                        py: 1.5,
                      }}>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <LocalFlorist
                          sx={{ color: isSelected ? "#2e7d32" : "#757575" }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: isSelected ? 600 : 400,
                                color: isSelected ? "#2e7d32" : "inherit",
                              }}>
                              {plant.name}
                            </Typography>
                            {plantReminderCount > 0 && (
                              <Badge
                                badgeContent={plantReminderCount}
                                color="error"
                                sx={{
                                  "& .MuiBadge-badge": {
                                    fontSize: "0.7rem",
                                    height: 18,
                                    minWidth: 18,
                                  },
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {plant.subtypes?.length || 0} subtype{plant.subtypes?.length !== 1 ? "s" : ""}
                          </Typography>
                        }
                      />
                      {plant.subtypes && plant.subtypes.length > 0 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlantExpand(plant._id);
                          }}
                          sx={{ ml: 1 }}>
                          {isExpanded ? (
                            <ExpandLess fontSize="small" />
                          ) : (
                            <ExpandMore fontSize="small" />
                          )}
                        </IconButton>
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Subtypes */}
                  {plant.subtypes && plant.subtypes.length > 0 && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List disablePadding sx={{ bgcolor: "#fafafa", pl: 2 }}>
                        {plant.subtypes.map((subtype) => {
                          const isSubtypeSelected =
                            isSelected && selectedSubtypeId === subtype._id;
                          const subtypeReminderCount = getReminderCount(
                            plant._id,
                            subtype._id
                          );

                          return (
                            <ListItem key={subtype._id} disablePadding>
                              <ListItemButton
                                selected={isSubtypeSelected}
                                onClick={() => {
                                  onPlantSelect(plant._id);
                                  onSubtypeSelect(subtype._id);
                                }}
                                sx={{
                                  bgcolor: isSubtypeSelected ? "#fff3e0" : "transparent",
                                  "&:hover": {
                                    bgcolor: isSubtypeSelected ? "#ffe0b2" : "#f5f5f5",
                                  },
                                  py: 1,
                                  pl: 3,
                                }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <Agriculture
                                    sx={{
                                      fontSize: 18,
                                      color: isSubtypeSelected ? "#f57c00" : "#757575",
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: isSubtypeSelected ? 600 : 400,
                                          color: isSubtypeSelected ? "#f57c00" : "inherit",
                                        }}>
                                        {subtype.name}
                                      </Typography>
                                      <Chip
                                        label={`${subtype.plantReadyDays || 0}d`}
                                        size="small"
                                        color="success"
                                        sx={{ height: 18, fontSize: "0.65rem" }}
                                      />
                                      {subtypeReminderCount > 0 && (
                                        <Badge
                                          badgeContent={subtypeReminderCount}
                                          color="error"
                                          sx={{
                                            "& .MuiBadge-badge": {
                                              fontSize: "0.6rem",
                                              height: 16,
                                              minWidth: 16,
                                            },
                                          }}
                                        />
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}

                  {index < filteredPlants.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default SowingSidebar;








