import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import {
  Delete,
  Route,
  LocationOn,
  Clear,
  Add,
  Fullscreen,
  FullscreenExit,
} from "@mui/icons-material";


// Geocoding function - Uses Google Maps if API key is provided, otherwise uses OpenStreetMap (free)
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";

const geocodeLocation = async (village, taluka, district, state = "Maharashtra") => {
  try {
    const address = `${village}, ${taluka}, ${district}, ${state}, India`;
    
    // Try Google Maps API if key is available
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&region=in`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return {
              lat: location.lat,
              lng: location.lng
            };
          }
          
          // If not found, try with just taluka and district
          if (data.status === 'ZERO_RESULTS') {
            const fallbackAddress = `${taluka}, ${district}, ${state}, India`;
            const fallbackResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fallbackAddress)}&key=${GOOGLE_MAPS_API_KEY}&region=in`
            );
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (fallbackData.status === 'OK' && fallbackData.results && fallbackData.results.length > 0) {
                const location = fallbackData.results[0].geometry.location;
                return {
                  lat: location.lat,
                  lng: location.lng
                };
              }
            }
          }
        }
      } catch (googleError) {
        console.warn("Google Maps geocoding failed, falling back to OpenStreetMap:", googleError);
        // Fall through to OpenStreetMap
      }
    }
    
    // Use OpenStreetMap Nominatim (free, no API key needed)
    const query = `${village}, ${taluka}, ${district}, ${state}, India`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'NurseryManagementApp/1.0' // Required by Nominatim
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    // If not found, try with just taluka and district
    const fallbackQuery = `${taluka}, ${district}, ${state}, India`;
    const fallbackResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'NurseryManagementApp/1.0'
        }
      }
    );
    
    if (fallbackResponse.ok) {
      const fallbackData = await fallbackResponse.json();
      if (fallbackData && fallbackData.length > 0) {
        return {
          lat: parseFloat(fallbackData[0].lat),
          lng: parseFloat(fallbackData[0].lon)
        };
      }
    }
    
    // If still not found, return fallback coordinates
    console.warn(`Could not geocode: ${query}, using fallback coordinates`);
    return { lat: 19.0760, lng: 72.8777 }; // Mumbai coordinates as fallback
    
  } catch (error) {
    console.error(`Error geocoding ${village}, ${taluka}, ${district}:`, error);
    // Return fallback coordinates
    return { lat: 19.0760, lng: 72.8777 }; // Mumbai coordinates as fallback
  }
};

// Alternative: Google Geocoding API (requires API key)
// Uncomment and use this if you have a Google Maps API key
/*
const geocodeLocationWithGoogle = async (village, taluka, district, state = "Maharashtra", apiKey) => {
  try {
    const address = `${village}, ${taluka}, ${district}, ${state}, India`;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    
    return { lat: 19.0760, lng: 72.8777 }; // Fallback
  } catch (error) {
    console.error('Google Geocoding error:', error);
    return { lat: 19.0760, lng: 72.8777 }; // Fallback
  }
};
*/

// Warehouse/Company location
const WAREHOUSE_LOCATION = {
  lat: 21.00229,
  lng: 75.686018,
  name: "Warehouse/Company"
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const OrderMapView = ({ orders = [] }) => {
  const [locationGroups, setLocationGroups] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [showRouteNameDialog, setShowRouteNameDialog] = useState(false);
  const [mapCenter, setMapCenter] = useState([21.00229, 75.686018]); // Default: Warehouse location
  const [mapZoom, setMapZoom] = useState(8);
  const [isClient, setIsClient] = useState(false);
  const [selectedPlantFilter, setSelectedPlantFilter] = useState("all");
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vehicleCapacity, setVehicleCapacity] = useState("");
  const [suggestedRoutes, setSuggestedRoutes] = useState([]);
  const [showRouteSuggestions, setShowRouteSuggestions] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (mapContainerRef.current.requestFullscreen) {
        mapContainerRef.current.requestFullscreen();
      } else if (mapContainerRef.current.webkitRequestFullscreen) {
        mapContainerRef.current.webkitRequestFullscreen();
      } else if (mapContainerRef.current.mozRequestFullScreen) {
        mapContainerRef.current.mozRequestFullScreen();
      } else if (mapContainerRef.current.msRequestFullscreen) {
        mapContainerRef.current.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement)
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Get unique plants for filter
  const availablePlants = useMemo(() => {
    const plants = new Set();
    orders.forEach(order => {
      const plantName = order.plantType?.name || order.plantName;
      if (plantName) {
        plants.add(plantName);
      }
    });
    return Array.from(plants).sort();
  }, [orders]);

  // Group orders by location (village, taluka, district)
  const groupedOrders = useMemo(() => {
    const groups = new Map();
    
    // Filter orders by plant if filter is set
    const filteredOrders = selectedPlantFilter === "all" 
      ? orders 
      : orders.filter(order => {
          const plantName = order.plantType?.name || order.plantName;
          return plantName === selectedPlantFilter;
        });
    
    filteredOrders.forEach(order => {
      const village = order.farmer?.village || "Unknown";
      const taluka = order.farmer?.taluka || order.farmer?.talukaName || "Unknown";
      const district = order.farmer?.district || order.farmer?.districtName || "Unknown";
      const state = order.farmer?.state || order.farmer?.stateName || "Maharashtra";
      const key = `${village}|${taluka}|${district}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          village,
          taluka,
          district,
          state,
          orders: [],
          coordinates: null,
        });
      }
      
      groups.get(key).orders.push(order);
    });
    
    return Array.from(groups.values());
  }, [orders, selectedPlantFilter]);

  // Geocode locations with rate limiting (Nominatim allows 1 request/second)
  useEffect(() => {
    const geocodeLocations = async () => {
      const geocoded = [];
      
      // Process locations one by one with delay to respect rate limits
      for (let i = 0; i < groupedOrders.length; i++) {
        const group = groupedOrders[i];
        try {
          const coords = await geocodeLocation(
            group.village, 
            group.taluka, 
            group.district, 
            group.state
          );
          geocoded.push({ ...group, coordinates: coords });
          
          // Update state incrementally for better UX
          setLocationGroups([...geocoded]);
          
          // Wait 1.1 seconds between requests to respect Nominatim rate limit
          if (i < groupedOrders.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1100));
          }
        } catch (error) {
          console.error(`Error geocoding ${group.village}:`, error);
          // Add with fallback coordinates
          geocoded.push({ ...group, coordinates: { lat: 19.0760, lng: 72.8777 } });
        }
      }
      
      setLocationGroups(geocoded);
      
      // Set map center to first location or default
      if (geocoded.length > 0 && geocoded[0].coordinates) {
        setMapCenter([geocoded[0].coordinates.lat, geocoded[0].coordinates.lng]);
      }
      
      // Fit bounds if map is already created
      if (mapRef.current && geocoded.length > 0) {
        const coords = geocoded
          .filter(loc => loc.coordinates)
          .map(loc => [loc.coordinates.lat, loc.coordinates.lng]);
        if (coords.length > 0) {
          try {
            mapRef.current.fitBounds(coords, { padding: [50, 50] });
          } catch (error) {
            console.error("Error fitting bounds:", error);
          }
        }
      }
    };
    
    if (groupedOrders.length > 0) {
      geocodeLocations();
    }
  }, [groupedOrders]);

  // Route optimization algorithm (bin packing + nearest neighbor)
  const optimizeRoutes = (locations, capacity) => {
    if (!capacity || capacity <= 0) return [];
    
    // Calculate total plants for each location
    const locationsWithCapacity = locations.map(loc => ({
      ...loc,
      totalPlants: loc.orders.reduce((sum, order) => 
        sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
      )
    }));
    
    // Sort by distance from warehouse (nearest first)
    const sortedLocations = [...locationsWithCapacity].sort((a, b) => {
      if (!a.coordinates || !b.coordinates) return 0;
      const distA = calculateDistance(
        WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng,
        a.coordinates.lat, a.coordinates.lng
      );
      const distB = calculateDistance(
        WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng,
        b.coordinates.lat, b.coordinates.lng
      );
      return distA - distB;
    });
    
    const routes = [];
    let currentRoute = [];
    let currentCapacity = 0;
    
    for (const location of sortedLocations) {
      if (currentCapacity + location.totalPlants <= capacity) {
        // Add to current route
        currentRoute.push(location);
        currentCapacity += location.totalPlants;
      } else {
        // Start new route
        if (currentRoute.length > 0) {
          routes.push([...currentRoute]);
        }
        currentRoute = [location];
        currentCapacity = location.totalPlants;
      }
    }
    
    // Add last route
    if (currentRoute.length > 0) {
      routes.push(currentRoute);
    }
    
    // Optimize each route using nearest neighbor (TSP approximation)
    return routes.map(route => {
      if (route.length <= 1) return route;
      
      // Start from warehouse
      const optimized = [];
      const remaining = [...route];
      let current = { coordinates: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng } };
      
      while (remaining.length > 0) {
        // Find nearest location
        let nearestIdx = 0;
        let nearestDist = Infinity;
        
        remaining.forEach((loc, idx) => {
          if (loc.coordinates) {
            const dist = calculateDistance(
              current.coordinates.lat, current.coordinates.lng,
              loc.coordinates.lat, loc.coordinates.lng
            );
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIdx = idx;
            }
          }
        });
        
        const nearest = remaining.splice(nearestIdx, 1)[0];
        optimized.push(nearest);
        current = nearest;
      }
      
      return optimized;
    });
  };

  // Handle route suggestion
  const handleSuggestRoutes = () => {
    const capacity = parseInt(vehicleCapacity);
    if (!capacity || capacity <= 0) {
      alert("Please enter a valid vehicle capacity");
      return;
    }
    
    const routes = optimizeRoutes(validLocations, capacity);
    setSuggestedRoutes(routes);
    setShowRouteSuggestions(true);
  };

  // Handle marker click
  const handleMarkerClick = (location) => {
    setSelectedLocation(location);
    setShowOrdersDialog(true);
  };

  // Add location to current route
  const handleAddToRoute = (location) => {
    if (!currentRoute.find(loc => loc.key === location.key)) {
      setCurrentRoute([...currentRoute, location]);
    }
  };

  // Remove location from current route
  const handleRemoveFromRoute = (locationKey) => {
    setCurrentRoute(currentRoute.filter(loc => loc.key !== locationKey));
  };

  // Save current route
  const handleSaveRoute = () => {
    if (currentRoute.length === 0) return;
    setShowRouteNameDialog(true);
  };

  const confirmSaveRoute = () => {
    if (routeName.trim()) {
      setRoutes([...routes, {
        id: Date.now(),
        name: routeName.trim(),
        locations: [...currentRoute],
      }]);
      setCurrentRoute([]);
      setRouteName("");
      setShowRouteNameDialog(false);
    }
  };

  // Delete route
  const handleDeleteRoute = (routeId) => {
    setRoutes(routes.filter(r => r.id !== routeId));
  };

  // Clear current route
  const handleClearRoute = () => {
    setCurrentRoute([]);
  };

  // Get valid locations with coordinates (must be before any early returns)
  const validLocations = useMemo(() => 
    locationGroups.filter(loc => loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng),
    [locationGroups]
  );

  // Get bounds for all markers
  const allBounds = useMemo(() => {
    if (validLocations.length === 0) return null;
    const coords = validLocations
      .map(loc => [loc.coordinates.lat, loc.coordinates.lng]);
    return coords.length > 0 ? coords : null;
  }, [validLocations]);

  // Get route polyline coordinates (including warehouse as start point)
  const getRoutePolyline = (routeLocations, includeWarehouse = true) => {
    const coords = [];
    
    // Start from warehouse if route has locations
    if (includeWarehouse && routeLocations.length > 0) {
      coords.push([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng]);
    }
    
    // Add route locations
    routeLocations
      .filter(loc => loc.coordinates)
      .forEach(loc => {
        coords.push([loc.coordinates.lat, loc.coordinates.lng]);
      });
    
    return coords;
  };

  // Calculate total distance for a route
  const calculateRouteDistance = (routeLocations) => {
    if (routeLocations.length === 0) return 0;
    
    let totalDistance = 0;
    
    // Distance from warehouse to first location
    if (routeLocations[0]?.coordinates) {
      totalDistance += calculateDistance(
        WAREHOUSE_LOCATION.lat,
        WAREHOUSE_LOCATION.lng,
        routeLocations[0].coordinates.lat,
        routeLocations[0].coordinates.lng
      );
    }
    
    // Distance between route locations
    for (let i = 0; i < routeLocations.length - 1; i++) {
      if (routeLocations[i]?.coordinates && routeLocations[i + 1]?.coordinates) {
        totalDistance += calculateDistance(
          routeLocations[i].coordinates.lat,
          routeLocations[i].coordinates.lng,
          routeLocations[i + 1].coordinates.lat,
          routeLocations[i + 1].coordinates.lng
        );
      }
    }
    
    return totalDistance;
  };

  // Calculate route summary (total plants by subtype)
  const getRouteSummary = (routeLocations) => {
    const summary = new Map();
    
    routeLocations.forEach(location => {
      location.orders.forEach(order => {
        const plantType = order.plantType?.name || order.plantName || "Unknown";
        const plantSubtype = order.plantSubtype?.name || "Unknown";
        const key = `${plantType} - ${plantSubtype}`;
        const quantity = order.numberOfPlants || order.totalPlants || order.quantity || 0;
        
        if (summary.has(key)) {
          summary.set(key, summary.get(key) + quantity);
        } else {
          summary.set(key, quantity);
        }
      });
    });
    
    return Array.from(summary.entries()).map(([name, total]) => ({
      name,
      total
    }));
  };

  // Create custom marker icon
  const createMarkerIcon = (color, isInRoute) => {
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      ">${isInRoute ? '✓' : ''}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Don't render map until client-side
  if (!isClient || typeof window === "undefined") {
    return (
      <Box sx={{ height: "calc(100vh - 200px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Don't render if no valid locations
  if (validLocations.length === 0) {
    return (
      <Box sx={{ height: "calc(100vh - 200px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No locations to display on map
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      ref={mapContainerRef}
      sx={{ 
        position: "relative", 
        height: isFullscreen ? "100vh" : "100%", 
        width: "100%",
        ...(isFullscreen && {
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          backgroundColor: "#fff",
        })
      }}
    >
      {/* Fullscreen Toggle Button */}
      <IconButton
        onClick={toggleFullscreen}
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1001,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 1)",
          },
        }}
        size="small"
      >
        {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>

      {/* Map Container */}
      <Box sx={{ height: isFullscreen ? "100vh" : "calc(100vh - 200px)", width: "100%", position: "relative" }}>
        <MapContainer
            key={`map-${validLocations.length}`}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%", zIndex: 1 }}
            whenReady={(mapInstance) => {
              // Use whenReady for better initialization timing
              try {
                mapRef.current = mapInstance.target;
                // Fit bounds when map is ready
                if (allBounds && allBounds.length > 0) {
                  setTimeout(() => {
                    try {
                      if (mapInstance.target && !mapInstance.target._destroyed) {
                        mapInstance.target.fitBounds(allBounds, { padding: [50, 50] });
                      }
                    } catch (error) {
                      console.error("Error fitting bounds:", error);
                    }
                  }, 200);
                }
              } catch (error) {
                console.error("Error in whenReady:", error);
              }
            }}
          >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Warehouse Marker */}
          <Marker
            position={[WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng]}
            icon={L.divIcon({
              className: "warehouse-marker",
              html: `<div style="
                background-color: #d32f2f;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 18px;
              ">🏭</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {WAREHOUSE_LOCATION.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Starting Point
                </Typography>
              </Box>
            </Popup>
          </Marker>
          
          {/* Markers for all locations */}
          {validLocations.map((location) => {
            
            const isInCurrentRoute = currentRoute.some(loc => loc.key === location.key);
            const isInAnyRoute = routes.some(route => 
              route.locations.some(loc => loc.key === location.key)
            );
            
            const markerColor = isInCurrentRoute 
              ? "#2e7d32" // Green for current route
              : isInAnyRoute 
                ? "#1976d2" // Blue for saved routes
                : "#ff9800"; // Orange for unselected
            
            // Calculate distance from warehouse
            const distanceFromWarehouse = location.coordinates 
              ? calculateDistance(
                  WAREHOUSE_LOCATION.lat,
                  WAREHOUSE_LOCATION.lng,
                  location.coordinates.lat,
                  location.coordinates.lng
                ).toFixed(1)
              : "N/A";

            // Get order details for hover
            const orderDetails = location.orders.slice(0, 3).map(order => ({
              farmerName: order.farmer?.name || "Unknown",
              quantity: order.numberOfPlants || order.totalPlants || order.quantity || 0,
              plantType: order.plantType?.name || order.plantName || "Unknown"
            }));

            // Build tooltip content
            const tooltipContent = `
              <div style="min-width: 200px; padding: 4px;">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${location.village}</div>
                <div style="color: #666; font-size: 11px; margin-bottom: 4px;">${location.taluka}, ${location.district}</div>
                <div style="color: #1976d2; font-weight: 600; font-size: 11px; margin-bottom: 8px;">📍 ${distanceFromWarehouse} km from warehouse</div>
                <div style="border-top: 1px solid #ddd; padding-top: 4px; margin-top: 4px;">
                  ${orderDetails.map(detail => `
                    <div style="font-size: 11px; margin-bottom: 2px;">
                      👤 ${detail.farmerName} - ${detail.quantity} plants (${detail.plantType})
                    </div>
                  `).join('')}
                  ${location.orders.length > 3 ? `<div style="font-size: 10px; color: #666; font-style: italic;">+${location.orders.length - 3} more orders</div>` : ''}
                </div>
              </div>
            `;

            return (
              <Marker
                key={location.key}
                position={[location.coordinates.lat, location.coordinates.lng]}
                icon={createMarkerIcon(markerColor, isInCurrentRoute)}
                eventHandlers={{
                  click: () => handleMarkerClick(location),
                }}
              >
                <LeafletTooltip permanent={false} direction="top" offset={[0, -10]}>
                  <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
                </LeafletTooltip>
                <Popup>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {location.village}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {location.taluka}, {location.district}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 500, mb: 0.5 }}>
                      {location.orders.length} {location.orders.length === 1 ? "order" : "orders"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block", mb: 1 }}>
                      📍 {distanceFromWarehouse} km from warehouse
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => handleAddToRoute(location)}
                      sx={{ mt: 1, fontSize: "0.7rem" }}
                      disabled={isInCurrentRoute}
                    >
                      {isInCurrentRoute ? "In Route" : "Add to Route"}
                    </Button>
                  </Box>
                </Popup>
              </Marker>
            );
          })}
          
          {/* Polylines for suggested routes */}
          {showRouteSuggestions && suggestedRoutes.map((route, routeIdx) => {
            const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
            const color = colors[routeIdx % colors.length];
            return (
              <Polyline
                key={`suggested-${routeIdx}`}
                positions={getRoutePolyline(route, true)}
                color={color}
                weight={3}
                opacity={0.7}
                dashArray={routeIdx === 0 ? "0" : "10, 5"}
              />
            );
          })}
          
          {/* Polylines for saved routes */}
          {routes.map((route) => (
            <Polyline
              key={route.id}
              positions={getRoutePolyline(route.locations, true)}
              color="#1976d2"
              weight={3}
              opacity={0.6}
            />
          ))}
          
          {/* Polyline for current route (from warehouse) */}
          {currentRoute.length > 0 && (
            <Polyline
              positions={getRoutePolyline(currentRoute, true)}
              color="#2e7d32"
              weight={4}
              opacity={0.8}
              dashArray="10, 5"
            />
          )}
        </MapContainer>
      </Box>

      {/* Plant Filter Panel */}
      <Paper
        sx={{
          position: "absolute",
          top: isFullscreen ? 60 : 10,
          left: 10,
          p: 2,
          minWidth: 250,
          zIndex: 1000,
          boxShadow: 3,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Filter by Plant
        </Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Plant Type</InputLabel>
          <Select
            value={selectedPlantFilter}
            label="Plant Type"
            onChange={(e) => setSelectedPlantFilter(e.target.value)}
          >
            <MenuItem value="all">All Plants</MenuItem>
            {availablePlants.map((plant) => (
              <MenuItem key={plant} value={plant}>
                {plant}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Divider sx={{ my: 1.5 }} />
        
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Route Optimization
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Vehicle Capacity (plants)"
          type="number"
          value={vehicleCapacity}
          onChange={(e) => setVehicleCapacity(e.target.value)}
          sx={{ mb: 1 }}
          placeholder="e.g., 1000"
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleSuggestRoutes}
          disabled={!vehicleCapacity || parseInt(vehicleCapacity) <= 0}
          sx={{ mt: 1 }}
        >
          Suggest Routes
        </Button>
        {suggestedRoutes.length > 0 && (
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => {
              setShowRouteSuggestions(!showRouteSuggestions);
            }}
            sx={{ mt: 1 }}
          >
            {showRouteSuggestions ? "Hide" : "Show"} Routes ({suggestedRoutes.length})
          </Button>
        )}
      </Paper>

      {/* Route Controls Panel */}
      <Paper
        sx={{
          position: "absolute",
          top: isFullscreen ? 60 : 10,
          right: 10,
          p: 2,
          minWidth: 300,
          maxHeight: isFullscreen ? "calc(100vh - 80px)" : "calc(100vh - 220px)",
          overflow: "auto",
          zIndex: 1000,
          boxShadow: 3,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Route Planning
          </Typography>
          {suggestedRoutes.length > 0 && (
            <Chip 
              label={`${suggestedRoutes.length} Suggested`} 
              color="primary" 
              size="small"
            />
          )}
        </Box>

        {/* Suggested Routes */}
        {showRouteSuggestions && suggestedRoutes.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(233, 30, 99, 0.05)", borderRadius: 1, border: "1px solid rgba(233, 30, 99, 0.2)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#e91e63" }}>
              🚚 Suggested Routes ({suggestedRoutes.length})
            </Typography>
            {suggestedRoutes.map((route, idx) => {
              const totalPlants = route.reduce((sum, loc) => 
                sum + loc.orders.reduce((s, o) => s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
              );
              const routeDistance = calculateRouteDistance(route);
              const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
              const color = colors[idx % colors.length];
              
              return (
                <Box 
                  key={idx} 
                  sx={{ 
                    mb: 1, 
                    p: 1, 
                    bgcolor: "rgba(255,255,255,0.7)", 
                    borderRadius: 1,
                    border: `2px solid ${color}`,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color }}>
                      Route {idx + 1} ({route.length} stops)
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setCurrentRoute(route);
                        setShowRouteSuggestions(false);
                      }}
                      sx={{ fontSize: "0.7rem", py: 0.25 }}
                    >
                      Use This
                    </Button>
                  </Box>
                  <Typography variant="caption" sx={{ display: "block", fontSize: "0.7rem" }}>
                    📦 {totalPlants.toLocaleString()} plants | 📍 {routeDistance.toFixed(1)} km
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Current Route */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Current Route ({currentRoute.length} stops)
            </Typography>
            {currentRoute.length > 0 && (
              <IconButton size="small" onClick={handleClearRoute} color="error">
                <Clear fontSize="small" />
              </IconButton>
            )}
          </Box>
          
          {currentRoute.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              Click markers and select &quot;Add to Route&quot; to build a route
            </Typography>
          ) : (
            <List dense>
              {/* Warehouse as starting point */}
              <ListItem
                sx={{
                  bgcolor: "rgba(211, 47, 47, 0.1)",
                  mb: 0.5,
                  borderRadius: 1,
                  py: 0.5,
                }}
              >
                <ListItemText
                  primary="🏭 Warehouse (Start)"
                  secondary="Starting point"
                  primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.7rem" }}
                />
              </ListItem>
              
              {currentRoute.map((location, index) => {
                const distance = location.coordinates 
                  ? (index === 0 
                      ? calculateDistance(
                          WAREHOUSE_LOCATION.lat,
                          WAREHOUSE_LOCATION.lng,
                          location.coordinates.lat,
                          location.coordinates.lng
                        ).toFixed(1)
                      : calculateDistance(
                          currentRoute[index - 1].coordinates.lat,
                          currentRoute[index - 1].coordinates.lng,
                          location.coordinates.lat,
                          location.coordinates.lng
                        ).toFixed(1)
                    )
                  : "N/A";
                
                return (
                  <ListItem
                    key={location.key}
                    sx={{
                      bgcolor: "rgba(46, 125, 50, 0.1)",
                      mb: 0.5,
                      borderRadius: 1,
                      py: 0.5,
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveFromRoute(location.key)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={`${index + 1}. ${location.village}`}
                      secondary={
                        <Box>
                          <Typography variant="caption" sx={{ display: "block" }}>
                            {location.orders.length} orders
                          </Typography>
                          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                            📍 {distance} km {index > 0 ? `from stop ${index}` : "from warehouse"}
                          </Typography>
                        </Box>
                      }
                      primaryTypographyProps={{ fontSize: "0.85rem" }}
                      secondaryTypographyProps={{ fontSize: "0.7rem" }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
          
          {/* Route Summary */}
          {currentRoute.length > 0 && (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: "rgba(46, 125, 50, 0.05)", borderRadius: 1, border: "1px solid rgba(46, 125, 50, 0.2)" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Route Summary
              </Typography>
              
              {/* Total Distance */}
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
                  📍 Total Distance: {calculateRouteDistance(currentRoute).toFixed(1)} km
                </Typography>
              </Box>
              
              {/* Plants by Subtype */}
              <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                Plants to Load:
              </Typography>
              {getRouteSummary(currentRoute).map((item, idx) => (
                <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.7rem" }}>
                    {item.total.toLocaleString()}
                  </Typography>
                </Box>
              ))}
              
              {/* Total Plants */}
              <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Total Plants: {getRouteSummary(currentRoute).reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
          
          {currentRoute.length > 0 && (
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<Route />}
              onClick={handleSaveRoute}
              sx={{ mt: 1 }}
            >
              Save Route
            </Button>
          )}
        </Box>

        {/* Saved Routes */}
        {routes.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Saved Routes ({routes.length})
            </Typography>
            <List dense>
              {routes.map((route) => (
                <ListItem
                  key={route.id}
                  sx={{
                    bgcolor: "rgba(25, 118, 210, 0.1)",
                    mb: 0.5,
                    borderRadius: 1,
                    py: 0.5,
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteRoute(route.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={route.name}
                    secondary={`${route.locations.length} stops`}
                    primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}
                    secondaryTypographyProps={{ fontSize: "0.7rem" }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>

      {/* Orders Dialog */}
      <Dialog
        open={showOrdersDialog}
        onClose={() => setShowOrdersDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocationOn color="primary" />
            <Typography variant="h6">
              {selectedLocation?.village}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {selectedLocation?.taluka}, {selectedLocation?.district}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Orders ({selectedLocation?.orders.length || 0})
          </Typography>
          <List>
            {selectedLocation?.orders.map((order, index) => (
              <ListItem
                key={order._id || order.id || index}
                sx={{
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemText
                  primary={`Order #${order.orderId || order._id || "N/A"}`}
                  secondary={
                    <Box>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Farmer: {order.farmer?.name || "N/A"}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Plants: {order.numberOfPlants || order.totalPlants || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Phone: {order.farmer?.mobileNumber || "N/A"}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOrdersDialog(false)}>Close</Button>
          {selectedLocation && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                handleAddToRoute(selectedLocation);
                setShowOrdersDialog(false);
              }}
              disabled={currentRoute.some(loc => loc.key === selectedLocation.key)}
            >
              Add to Route
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Route Name Dialog */}
      <Dialog
        open={showRouteNameDialog}
        onClose={() => setShowRouteNameDialog(false)}
      >
        <DialogTitle>Save Route</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Route Name"
            fullWidth
            variant="outlined"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="e.g., Route 1, North Zone, Driver A"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRouteNameDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmSaveRoute}
            variant="contained"
            disabled={!routeName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderMapView;

