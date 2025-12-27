import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip } from "react-leaflet";
import { GoogleMap, LoadScript, Marker as GoogleMarker, Polyline as GooglePolyline, InfoWindow, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API, NetworkManager } from "network/core";

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
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Badge,
  Fade,
  Zoom,
} from "@mui/material";
import {
  Delete,
  Route,
  LocationOn,
  CheckCircle,
  Clear,
  Add,
  Fullscreen,
  FullscreenExit,
  Assignment,
  LocalShipping,
  TrendingUp,
  Map as MapIcon,
  Public as PublicIcon,
  ChevronRight,
  ChevronLeft,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";


// Geocoding function - Uses Bhuvan (ISRO) for Indian addresses, Google Maps as fallback, then OpenStreetMap
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBq5k9ataLH59YpmLOyj4N2kiUWZquSQOs";
const BHUVAN_API_TOKEN = process.env.REACT_APP_BHUVAN_API_TOKEN || ""; // Optional: Get from https://bhuvan-app1.nrsc.gov.in/api/
const OPENROUTESERVICE_API_KEY = process.env.REACT_APP_OPENROUTESERVICE_API_KEY || ""; // Optional: Get free key from https://openrouteservice.org/

// Enhanced geocoding using Google Maps API - optimized for high accuracy
const geocodeLocation = async (village, taluka, district, state = "Maharashtra", retryCount = 0) => {
  const maxRetries = 1;
  
  // Helper function to normalize strings for comparison
  const normalize = (str) => str.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Helper function to check if two strings match (fuzzy)
  const matches = (str1, str2) => {
    const n1 = normalize(str1);
    const n2 = normalize(str2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
  };
  
  // Helper function to score a geocoding result
  const scoreResult = (result, village, taluka, district, state) => {
    const components = result.address_components || [];
    const formattedAddress = (result.formatted_address || "").toLowerCase();
    let score = 0;
    let matchedComponents = [];
    
    // Extract components
    const resultState = components.find(c => 
      c.types.includes('administrative_area_level_1')
    )?.long_name || "";
    
    const resultDistrict = components.find(c => 
      c.types.includes('administrative_area_level_2') || 
      c.types.includes('sublocality_level_1')
    )?.long_name || "";
    
    const resultTaluka = components.find(c => 
      c.types.includes('administrative_area_level_3') ||
      c.types.includes('locality') ||
      c.types.includes('sublocality')
    )?.long_name || "";
    
    const resultVillage = components.find(c => 
      c.types.includes('sublocality_level_2') ||
      c.types.includes('neighborhood') ||
      c.types.includes('political')
    )?.long_name || "";
    
    // State match (required, but low weight)
    if (matches(resultState, state) || formattedAddress.includes(normalize(state))) {
      score += 5;
      matchedComponents.push('state');
    }
    
    // District match (high weight - critical for accuracy)
    if (matches(resultDistrict, district) || formattedAddress.includes(normalize(district))) {
      score += 40;
      matchedComponents.push('district');
    }
    
    // Taluka match (high weight)
    if (matches(resultTaluka, taluka) || formattedAddress.includes(normalize(taluka))) {
      score += 30;
      matchedComponents.push('taluka');
    }
    
    // Village match (highest weight - most specific)
    if (matches(resultVillage, village) || formattedAddress.includes(normalize(village))) {
      score += 50;
      matchedComponents.push('village');
    }
    
    // Check formatted address for all components
    const villageNorm = normalize(village);
    const talukaNorm = normalize(taluka);
    const districtNorm = normalize(district);
    
    if (formattedAddress.includes(villageNorm) && !matchedComponents.includes('village')) {
      score += 25;
      matchedComponents.push('village');
    }
    if (formattedAddress.includes(talukaNorm) && !matchedComponents.includes('taluka')) {
      score += 15;
      matchedComponents.push('taluka');
    }
    if (formattedAddress.includes(districtNorm) && !matchedComponents.includes('district')) {
      score += 20;
      matchedComponents.push('district');
    }
    
    return { score, matchedComponents };
  };
  
  try {
    // Strategy 1: Try Google Maps API FIRST (most accurate with API key)
    if (GOOGLE_MAPS_API_KEY) {
      // Try multiple address formats in order of preference for Indian addresses
      const googleQueries = [
        `${village}, ${taluka}, ${district}, ${state}, India`, // Most specific
        `${district}, ${taluka}, ${village}, ${state}, India`, // District first (Indian format)
        `${taluka}, ${village}, ${district}, ${state}, India`, // Taluka first
        `${village}, ${district}, ${state}, India`, // Without taluka
        `${district}, ${taluka}, ${state}, India`, // Without village (fallback)
      ];
      
      let bestResult = null;
      let bestScore = 0;
      
      for (const query of googleQueries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=in&components=country:IN`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              // Score all results and pick the best one
              for (const result of data.results) {
                const components = result.address_components || [];
                
                // Check if result is in India
                const isInIndia = components.some(c => 
                  c.types.includes('country') && c.short_name === 'IN'
                );
                
                if (!isInIndia) continue;
                
                const { score, matchedComponents } = scoreResult(result, village, taluka, district, state);
                
                // Only consider results with at least district match (score >= 40)
                if (score >= 40 && score > bestScore) {
                  bestScore = score;
                  bestResult = {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    score,
                    matchedComponents,
                    result
                  };
                }
              }
            } else if (data.status === 'ZERO_RESULTS') {
              // No results for this query, try next
              continue;
            }
          }
        } catch (err) {
          // Continue to next query
          if (err.name !== 'AbortError') {
            console.log(`Geocoding query failed: ${err.message}`);
          }
        }
      }
      
      // Return best result if we found a good match
      if (bestResult) {
        // Determine accuracy based on score and matched components
        let accuracy = 'low';
        if (bestScore >= 100 || (bestResult.matchedComponents.includes('village') && bestResult.matchedComponents.includes('district'))) {
          accuracy = 'high';
        } else if (bestScore >= 60 || (bestResult.matchedComponents.includes('district') && bestResult.matchedComponents.includes('taluka'))) {
          accuracy = 'high';
        } else if (bestScore >= 40) {
          accuracy = 'medium';
        }
        
        return {
          lat: bestResult.lat,
          lng: bestResult.lng,
          accuracy,
          source: 'google',
          score: bestScore,
          matched: bestResult.matchedComponents.join(', ')
        };
      }
    }
    
    // Strategy 2: Try Bhuvan (ISRO) Village Geocoding API
    try {
      const bhuvanQuery = `${village}, ${taluka}, ${district}, ${state}`;
      const bhuvanUrl = BHUVAN_API_TOKEN 
        ? `https://bhuvan-app1.nrsc.gov.in/api/geocode/village?q=${encodeURIComponent(bhuvanQuery)}&token=${BHUVAN_API_TOKEN}`
        : `https://bhuvan-app1.nrsc.gov.in/api/geocode/village?q=${encodeURIComponent(bhuvanQuery)}`;
      
      const bhuvanResponse = await fetch(bhuvanUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NurseryManagementApp/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });
      
      if (bhuvanResponse.ok) {
        const bhuvanData = await bhuvanResponse.json();
        if (bhuvanData) {
          const lat = parseFloat(
            bhuvanData.lat || 
            bhuvanData.latitude || 
            bhuvanData.data?.lat || 
            bhuvanData.data?.latitude ||
            bhuvanData.coordinates?.[1] ||
            bhuvanData.geometry?.coordinates?.[1]
          );
          const lng = parseFloat(
            bhuvanData.lon || 
            bhuvanData.longitude || 
            bhuvanData.data?.lon || 
            bhuvanData.data?.lng ||
            bhuvanData.data?.longitude ||
            bhuvanData.coordinates?.[0] ||
            bhuvanData.geometry?.coordinates?.[0]
          );
          
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            return {
              lat,
              lng,
              accuracy: 'high',
              source: 'bhuvan'
            };
          }
        }
      }
    } catch (bhuvanError) {
      // Continue to other services
    }
    
    // Strategy 3: Use OpenStreetMap Nominatim with enhanced scoring
    const queries = [
      `${district}, ${taluka}, ${village}, ${state}, India`,
      `${village}, ${taluka}, ${district}, ${state}, India`,
      `${district}, ${taluka}, ${state}, India` // Fallback without village
    ];
    
    for (const query of queries) {
      try {
        // Enhanced query with Indian-specific parameters (bounded to India)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&countrycodes=in&addressdetails=1&extratags=1&namedetails=1&accept-language=en&bounded=1`,
          {
            headers: {
              'User-Agent': 'NurseryManagementApp/1.0',
              'Accept-Language': 'en'
            },
            signal: AbortSignal.timeout(8000)
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.length > 0) {
            // Enhanced scoring system for Indian addresses (similar to Bhuvan's boundary matching)
            const scoredResults = data.map(result => {
              const address = result.address || {};
              const displayName = (result.display_name || "").toLowerCase();
              
              // Indian address structure: state -> district -> taluka -> village
              const resultState = (address.state || "").toLowerCase();
              const resultDistrict = (address.county || address.state_district || address.district || 
                                     address.administrative || "").toLowerCase();
              const resultTaluka = (address.municipality || address.town || address.city || 
                                   address.village || address.suburb || "").toLowerCase();
              const resultVillage = (address.village || address.hamlet || address.locality || "").toLowerCase();
              
              let score = 0;
              
              // Use the same scoring system as Google Maps for consistency
              const matchedComponents = [];
              
              // State match (required but low weight)
              if (matches(resultState, state) || displayName.includes(normalize(state))) {
                score += 5;
                matchedComponents.push('state');
              }
              
              // District match (critical - highest weight)
              if (matches(resultDistrict, district) || displayName.includes(normalize(district))) {
                score += 40;
                matchedComponents.push('district');
              }
              
              // Taluka match (high weight)
              if (matches(resultTaluka, taluka) || displayName.includes(normalize(taluka))) {
                score += 30;
                matchedComponents.push('taluka');
              }
              
              // Village match (highest weight - most specific)
              if (matches(resultVillage, village) || displayName.includes(normalize(village))) {
                score += 50;
                matchedComponents.push('village');
              }
              
              return { ...result, score, matchedComponents };
            }).sort((a, b) => b.score - a.score);
            
            // Find best result with at least district match (score >= 40)
            const bestMatch = scoredResults.find(r => r.score >= 40);
            if (bestMatch) {
              // Determine accuracy based on score and matched components
              let accuracy = 'low';
              if (bestMatch.score >= 100 || (bestMatch.matchedComponents.includes('village') && bestMatch.matchedComponents.includes('district'))) {
                accuracy = 'high';
              } else if (bestMatch.score >= 60 || (bestMatch.matchedComponents.includes('district') && bestMatch.matchedComponents.includes('taluka'))) {
                accuracy = 'high';
              } else if (bestMatch.score >= 40) {
                accuracy = 'medium';
              }
              
              return {
                lat: parseFloat(bestMatch.lat),
                lng: parseFloat(bestMatch.lon),
                accuracy,
                source: 'openstreetmap',
                score: bestMatch.score,
                matched: bestMatch.matchedComponents.join(', ')
              };
            }
          }
        }
      } catch (err) {
        // Continue to next query
      }
    }
    
    // Retry with exponential backoff if we have retries left
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return geocodeLocation(village, taluka, district, state, retryCount + 1);
    }
    
    // Final fallback: return approximate coordinates based on district center
    // Try to get at least district center coordinates
    console.warn(`Could not geocode: ${village}, ${taluka}, ${district} - using district center`);
    
    // Try to get district center as fallback
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const districtQuery = `${district}, ${state}, India`;
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(districtQuery)}&key=${GOOGLE_MAPS_API_KEY}&region=in`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return {
              lat: location.lat,
              lng: location.lng,
              accuracy: 'fallback',
              source: 'google-district-center'
            };
          }
        }
      } catch (err) {
        // Continue to default fallback
      }
    }
    
    // Default fallback: Maharashtra center
    return { 
      lat: 19.0760, 
      lng: 72.8777,
      accuracy: 'fallback',
      source: 'default'
    };
    
  } catch (error) {
    console.error(`Error geocoding ${village}, ${taluka}, ${district}:`, error);
    // Return district center as fallback
    return { 
      lat: 19.0760, 
      lng: 72.8777,
      accuracy: 'error',
      source: 'error'
    };
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
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [routeToSave, setRouteToSave] = useState(null);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [mapCenter, setMapCenter] = useState([21.00229, 75.686018]); // Default: Warehouse location
  const [mapZoom, setMapZoom] = useState(8);
  const [isClient, setIsClient] = useState(false);
  const [selectedPlantFilter, setSelectedPlantFilter] = useState("all");
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vehicleCapacity, setVehicleCapacity] = useState("");
  const [suggestedRoutes, setSuggestedRoutes] = useState([]);
  const [showRouteSuggestions, setShowRouteSuggestions] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0, isGeocoding: false });
  const [allOrdersAssigned, setAllOrdersAssigned] = useState(false);
  const [useGoogleMaps, setUseGoogleMaps] = useState(true); // Toggle between Google Maps and OpenStreetMap
  const [selectedGoogleMarker, setSelectedGoogleMarker] = useState(null);
  const [highlightedRoute, setHighlightedRoute] = useState(null); // Route to highlight on map
  const [highlightedLocation, setHighlightedLocation] = useState(null); // Location to highlight on map
  const [isLoading, setIsLoading] = useState(false);
  const [focusedRoute, setFocusedRoute] = useState(null); // Route in focus mode (hide others)
  const [manualRouteMode, setManualRouteMode] = useState(false); // Manual route creation mode
  const [selectedOrdersForRoute, setSelectedOrdersForRoute] = useState(new Set()); // Selected orders for manual route
  const [hoveredOrders, setHoveredOrders] = useState(null); // Orders being hovered
  const [drivers, setDrivers] = useState([]); // Available drivers
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [routeDirections, setRouteDirections] = useState({}); // Store Google Directions for routes
  const [currentRouteDirections, setCurrentRouteDirections] = useState(null); // Store Google Directions for current route
  const [showRoutePanel, setShowRoutePanel] = useState(true); // Show/hide route planning panel
  const [showGeocodingPanel, setShowGeocodingPanel] = useState(true); // Show/hide geocoded villages panel
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const googleMapRef = useRef(null);

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

  // Get assigned order IDs from saved routes
  const assignedOrderIds = useMemo(() => {
    const assignedIds = new Set();
    routes.forEach(route => {
      if (route.locations) {
        route.locations.forEach(location => {
          location.orders.forEach(order => {
            assignedIds.add(order._id || order.id);
          });
        });
      }
    });
    return assignedIds;
  }, [routes]);

  // Group orders by location (village, taluka, district) - exclude already assigned orders
  const groupedOrders = useMemo(() => {
    const groups = new Map();
    
    // Filter orders by plant if filter is set, and exclude assigned orders
    const filteredOrders = (selectedPlantFilter === "all" 
      ? orders 
      : orders.filter(order => {
          const plantName = order.plantType?.name || order.plantName;
          return plantName === selectedPlantFilter;
        })
    ).filter(order => {
      // Exclude orders that are already assigned to saved routes
      const orderId = order._id || order.id;
      return !assignedOrderIds.has(orderId);
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
  }, [orders, selectedPlantFilter, assignedOrderIds]);

  // Check if all orders are assigned
  useEffect(() => {
    const totalOrders = orders.length;
    const assignedCount = assignedOrderIds.size;
    setAllOrdersAssigned(totalOrders > 0 && assignedCount === totalOrders);
  }, [orders.length, assignedOrderIds.size]);

  // Track if geocoding is in progress to prevent re-runs
  const geocodingInProgressRef = useRef(false);
  const lastGeocodedKeysRef = useRef('');

  // Geocode locations with progress tracking
  useEffect(() => {
    const geocodeLocations = async () => {
      if (groupedOrders.length === 0) {
        setGeocodingProgress({ current: 0, total: 0, isGeocoding: false });
        geocodingInProgressRef.current = false;
        return;
      }

      // Create a stable key from groupedOrders to detect actual changes
      const currentKeys = groupedOrders.map(g => g.key).sort().join('|');
      
      // Skip if already geocoding or if keys haven't changed
      if (geocodingInProgressRef.current) {
        console.log('Geocoding already in progress, skipping...');
        return;
      }
      
      if (lastGeocodedKeysRef.current === currentKeys && locationGroups.length > 0) {
        console.log('Locations already geocoded, skipping...');
        return;
      }

      geocodingInProgressRef.current = true;
      lastGeocodedKeysRef.current = currentKeys;

      setGeocodingProgress({ current: 0, total: groupedOrders.length, isGeocoding: true });
      const geocoded = [];
      
      // If using Google Maps (has API key), process in batches for speed
      // If using OpenStreetMap (no API key), process one by one with delay
      const useGoogleMaps = !!GOOGLE_MAPS_API_KEY;
      const batchSize = useGoogleMaps ? 3 : 1;
      const delayBetweenBatches = useGoogleMaps ? 300 : 1100; // Google allows faster, OSM needs 1 req/sec
      
      try {
        for (let i = 0; i < groupedOrders.length; i += batchSize) {
          const batch = groupedOrders.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (group) => {
            try {
              console.log(`[${i}/${groupedOrders.length}] Geocoding: ${group.village}, ${group.taluka}, ${group.district}`);
              const coords = await Promise.race([
                geocodeLocation(
                  group.village, 
                  group.taluka, 
                  group.district, 
                  group.state
                ),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Geocoding timeout')), 15000)
                )
              ]);
              console.log(`✓ Geocoded: ${group.village} -> ${coords.lat}, ${coords.lng} (${coords.accuracy || 'unknown'})`);
              return { ...group, coordinates: coords };
            } catch (error) {
              console.error(`✗ Error geocoding ${group.village}:`, error.message);
              // Return district center as fallback
              return { 
                ...group, 
                coordinates: { 
                  lat: 19.0760, 
                  lng: 72.8777, 
                  accuracy: 'error',
                  source: 'fallback'
                } 
              };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          geocoded.push(...batchResults);
          
          // Update progress
          setGeocodingProgress({ 
            current: geocoded.length, 
            total: groupedOrders.length, 
            isGeocoding: true 
          });
          
          // Update state incrementally for better UX
          setLocationGroups([...geocoded]);
          
          // Wait between batches to respect rate limits
          if (i + batchSize < groupedOrders.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        }
        
        console.log(`✓ Geocoding complete: ${geocoded.length} locations`);
        setLocationGroups(geocoded);
        setGeocodingProgress({ current: geocoded.length, total: groupedOrders.length, isGeocoding: false });
        setIsLoading(false);
      } catch (error) {
        console.error('Fatal error in geocoding:', error);
        // Ensure we always complete, even on error
        setLocationGroups(geocoded.length > 0 ? geocoded : groupedOrders.map(g => ({ ...g, coordinates: { lat: 19.0760, lng: 72.8777, accuracy: 'error' } })));
        setGeocodingProgress({ current: geocoded.length, total: groupedOrders.length, isGeocoding: false });
        setIsLoading(false);
      }
      
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
          setTimeout(() => {
            try {
              if (mapRef.current && !mapRef.current._destroyed) {
                mapRef.current.fitBounds(coords, { padding: [50, 50] });
              }
            } catch (error) {
              console.error("Error fitting bounds:", error);
            }
          }, 500);
        }
      }
    };
    
    if (groupedOrders.length > 0) {
      geocodeLocations();
    } else {
      setGeocodingProgress({ current: 0, total: 0, isGeocoding: false });
      geocodingInProgressRef.current = false;
    }
    
    // Cleanup function
    return () => {
      // Don't reset progress if geocoding is actually in progress
      if (!geocodingInProgressRef.current) {
        setGeocodingProgress({ current: 0, total: 0, isGeocoding: false });
      }
    }
  }, [groupedOrders.length, selectedPlantFilter]);

  // K-Means Clustering Algorithm for route optimization
  const kMeansClustering = (points, k, maxIterations = 100) => {
    if (points.length === 0 || k === 0) return [];
    
    // Initialize centroids randomly
    const centroids = [];
    const shuffled = [...points].sort(() => Math.random() - 0.5);
    for (let i = 0; i < k && i < shuffled.length; i++) {
      centroids.push({ ...shuffled[i].coordinates });
    }
    
    let clusters = [];
    let iterations = 0;
    
    while (iterations < maxIterations) {
      // Assign points to nearest centroid
      clusters = Array(k).fill(null).map(() => []);
      
      points.forEach(point => {
        if (!point.coordinates) return;
        
        let minDist = Infinity;
        let nearestCluster = 0;
        
        centroids.forEach((centroid, idx) => {
          const dist = calculateDistance(
            point.coordinates.lat, point.coordinates.lng,
            centroid.lat, centroid.lng
          );
          if (dist < minDist) {
            minDist = dist;
            nearestCluster = idx;
          }
        });
        
        clusters[nearestCluster].push(point);
      });
      
      // Update centroids
      let changed = false;
      centroids.forEach((centroid, idx) => {
        if (clusters[idx].length === 0) return;
        
        const avgLat = clusters[idx].reduce((sum, p) => sum + p.coordinates.lat, 0) / clusters[idx].length;
        const avgLng = clusters[idx].reduce((sum, p) => sum + p.coordinates.lng, 0) / clusters[idx].length;
        
        if (Math.abs(centroid.lat - avgLat) > 0.0001 || Math.abs(centroid.lng - avgLng) > 0.0001) {
          changed = true;
          centroid.lat = avgLat;
          centroid.lng = avgLng;
        }
      });
      
      if (!changed) break;
      iterations++;
    }
    
    return clusters.filter(cluster => cluster.length > 0);
  };
  
  // Get Google Directions with waypoint optimization
  // Decode Google polyline for Leaflet
  const decodePolyline = (encoded) => {
    if (!encoded) return [];
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push([lat * 1e-5, lng * 1e-5]);
    }
    return poly;
  };

  const getGoogleDirections = async (waypoints) => {
    if (!GOOGLE_MAPS_API_KEY || waypoints.length === 0) return null;
    
    try {
      // Google Directions API supports up to 25 waypoints
      // If more, we need to split
      if (waypoints.length > 25) {
        // Split into chunks and optimize separately
        const chunks = [];
        for (let i = 0; i < waypoints.length; i += 25) {
          chunks.push(waypoints.slice(i, i + 25));
        }
        
        const results = await Promise.all(
          chunks.map(chunk => getGoogleDirections(chunk))
        );
        
        // Combine results - take the first route from each chunk
        const combinedRoutes = results.filter(Boolean);
        if (combinedRoutes.length > 0) {
          // Merge the routes
          return combinedRoutes[0]; // For now, return first chunk's route
        }
        return null;
      }
      
      const waypointStr = waypoints
        .map(wp => `${wp.lat},${wp.lng}`)
        .join('|');
      
      // Use optimize:true to get optimized route order
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${WAREHOUSE_LOCATION.lat},${WAREHOUSE_LOCATION.lng}&destination=${WAREHOUSE_LOCATION.lat},${WAREHOUSE_LOCATION.lng}&waypoints=optimize:true|${waypointStr}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Google Directions API Response:', data);
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Ensure we have the full response structure for DirectionsRenderer
        return {
          ...route,
          request: {
            origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
            destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
            waypoints: waypoints.map(wp => ({ location: { lat: wp.lat, lng: wp.lng } })),
            travelMode: 'DRIVING',
            optimizeWaypoints: true,
          },
          // Store the full response for DirectionsRenderer
          _fullResponse: data,
        };
      }
      
      console.warn('Google Directions API returned:', data.status, data.error_message);
      return null;
    } catch (error) {
      console.error('Error getting Google Directions:', error);
      return null;
    }
  };
  
  // Advanced route optimization: K-Means clustering + Google Directions API
  const optimizeRoutes = async (locations, capacity) => {
    if (!capacity || capacity <= 0) return [];
    
    // Flatten locations to individual orders
    const orderLocations = [];
    locations.forEach(loc => {
      if (!loc.coordinates) return;
      
      loc.orders.forEach(order => {
        const plants = order.numberOfPlants || order.totalPlants || order.quantity || 0;
        orderLocations.push({
          ...loc,
          order: order,
          orderPlants: plants,
          locationKey: loc.key
        });
      });
    });
    
    if (orderLocations.length === 0) return [];
    
    // Calculate total plants to estimate number of routes needed
    const totalPlants = orderLocations.reduce((sum, ol) => sum + ol.orderPlants, 0);
    const estimatedRoutes = Math.ceil(totalPlants / capacity);
    const numClusters = Math.max(1, estimatedRoutes);
    
    // Step 1: K-Means clustering to group nearby orders
    const clusters = kMeansClustering(orderLocations, numClusters);
    
    // Step 2: For each cluster, create routes respecting capacity
    const routes = [];
    
    for (const cluster of clusters) {
      // Sort cluster by distance from warehouse
      const sortedCluster = [...cluster].sort((a, b) => {
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
      
      // Build routes from this cluster
      const usedOrders = new Set();
      
      while (usedOrders.size < sortedCluster.length) {
        const currentRoute = [];
        let currentCapacity = 0;
        const availableOrders = sortedCluster.filter((_, idx) => !usedOrders.has(idx));
        
        // Fill route to capacity
        for (const orderLoc of availableOrders) {
          if (usedOrders.has(sortedCluster.indexOf(orderLoc))) continue;
          
          const orderPlants = orderLoc.orderPlants;
          if (currentCapacity + orderPlants <= capacity) {
            usedOrders.add(sortedCluster.indexOf(orderLoc));
            currentCapacity += orderPlants;
            
            // Group by location
            const locationKey = orderLoc.locationKey;
            const existingLoc = currentRoute.find(loc => loc.key === locationKey);
            
            if (existingLoc) {
              if (!existingLoc.selectedOrders.find(o => 
                (o._id || o.id) === (orderLoc.order._id || orderLoc.order.id)
              )) {
                existingLoc.selectedOrders.push(orderLoc.order);
              }
            } else {
              const location = locations.find(l => l.key === locationKey);
              if (location) {
                currentRoute.push({
                  ...location,
                  selectedOrders: [orderLoc.order]
                });
              }
            }
          }
        }
        
        if (currentRoute.length > 0) {
          // Step 3: Use Google Directions API to optimize waypoint order
          const waypoints = currentRoute.map(loc => ({
            lat: loc.coordinates.lat,
            lng: loc.coordinates.lng
          }));
          
          // Always get Google Directions for proper road routes
          const directions = await getGoogleDirections(waypoints);
          
          if (directions) {
            let optimizedRoute;
            let totalDistance;
            
            if (directions.waypoint_order && directions.waypoint_order.length > 0) {
              // Reorder route based on Google's optimization
              optimizedRoute = directions.waypoint_order.map(idx => currentRoute[idx]);
              totalDistance = directions.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000; // Convert to km
            } else {
              // Use original order but still use Google Directions for proper route
              optimizedRoute = currentRoute;
              totalDistance = directions.legs ? 
                directions.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000 :
                calculateRouteDistance(currentRoute);
            }
            
            routes.push({
              locations: optimizedRoute,
              directions: directions,
              polyline: directions.overview_polyline?.points || null, // Store encoded polyline for Leaflet
              totalPlants: currentCapacity,
              totalDistance: totalDistance,
            });
          } else {
            // Fallback to nearest neighbor if Google Directions completely fails
            const optimized = optimizeRouteOrder(currentRoute);
            // Try one more time to get directions without optimization
            const fallbackWaypoints = optimized.map(loc => ({ lat: loc.coordinates.lat, lng: loc.coordinates.lng }));
            const fallbackDirections = await getGoogleDirections(fallbackWaypoints);
            
            routes.push({
              locations: optimized,
              directions: fallbackDirections,
              polyline: fallbackDirections?.overview_polyline?.points || null,
              totalPlants: currentCapacity,
              totalDistance: fallbackDirections ? 
                (fallbackDirections.legs?.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000 || calculateRouteDistance(optimized)) :
                calculateRouteDistance(optimized),
            });
          }
        } else {
          break;
        }
      }
    }
    
    return routes;
  };
  
  // Optimize route order using nearest neighbor (TSP fallback)
  const optimizeRouteOrder = (route) => {
    if (route.length <= 1) return route;
    
    const optimized = [];
    const remaining = [...route];
    let current = { coordinates: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng } };
    
    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      
      remaining.forEach((loc, idx) => {
        if (loc.coordinates) {
          const dist = calculateDistance(
            current.lat, current.lng,
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
      current = nearest.coordinates;
    }
    
    return optimized;
  };

  // Fetch drivers from API
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoadingDrivers(true);
        const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE);
        const response = await instance.request({});
        
        // Filter for drivers (jobTitle === "DRIVER")
        const allEmployees = response?.data?.data || [];
        const driverList = allEmployees.filter(emp => 
          emp.jobTitle === "DRIVER" || emp.role === "DRIVER"
        );
        
        setDrivers(driverList);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      } finally {
        setLoadingDrivers(false);
      }
    };
    
    fetchDrivers();
  }, []);
  
  // Handle route suggestion with advanced optimization
  const handleSuggestRoutes = async () => {
    setIsLoading(true);
    const capacity = parseInt(vehicleCapacity);
    if (!capacity || capacity <= 0) {
      alert("Please enter a valid vehicle capacity");
      setIsLoading(false);
      return;
    }
    
    try {
      // Use advanced optimization with K-Means + Google Directions
      const routes = await optimizeRoutes(validLocations, capacity);
      
      // Generate unique IDs for routes
      const routesWithIds = routes.map((route, idx) => ({
        ...route,
        id: `route-${Date.now()}-${idx}`,
        capacity: capacity,
        createdAt: new Date().toISOString()
      }));
      
      setSuggestedRoutes(routesWithIds);
      setShowRouteSuggestions(true);
    } catch (error) {
      console.error("Error optimizing routes:", error);
      alert("Error optimizing routes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle click on assigned route to show it on map
  const handleShowRoute = (route) => {
    setHighlightedRoute(route.id);
    
    // Fit map bounds to show the route
    if (route.locations && route.locations.length > 0) {
      const coords = route.locations
        .filter(loc => loc.coordinates)
        .map(loc => [loc.coordinates.lat, loc.coordinates.lng]);
      
      if (coords.length > 0) {
        // Add warehouse to bounds
        coords.push([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng]);
        
        if (useGoogleMaps && googleMapRef.current && window.google && window.google.maps) {
          const bounds = new window.google.maps.LatLngBounds();
          coords.forEach(coord => bounds.extend({ lat: coord[0], lng: coord[1] }));
          googleMapRef.current.fitBounds(bounds, { padding: 50 });
        } else if (mapRef.current) {
          setTimeout(() => {
            try {
              if (mapRef.current && !mapRef.current._destroyed) {
                mapRef.current.fitBounds(coords, { padding: [50, 50] });
              }
            } catch (error) {
              console.error("Error fitting bounds:", error);
            }
          }, 100);
        }
      }
    }
    
    // Don't auto-clear if in focus mode
    if (!focusedRoute) {
      setTimeout(() => setHighlightedRoute(null), 5000);
    }
  };
  
  // Handle hover on location to show orders
  const handleLocationHover = (location) => {
    setHoveredOrders(location);
  };
  
  // Handle order selection for manual route
  const handleOrderToggle = (orderId) => {
    const newSelected = new Set(selectedOrdersForRoute);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      const order = orders.find(o => (o._id || o.id) === orderId);
      const orderPlants = order?.numberOfPlants || order?.totalPlants || order?.quantity || 0;
      const remaining = getRemainingCapacity();
      if (orderPlants > remaining) {
        alert(`Order requires ${orderPlants} plants, but only ${remaining} remaining capacity`);
        return;
      }
      newSelected.add(orderId);
    }
    setSelectedOrdersForRoute(newSelected);
  };
  
  // Calculate remaining capacity for manual route
  const getRemainingCapacity = () => {
    const capacity = parseInt(vehicleCapacity) || 0;
    const selectedOrders = Array.from(selectedOrdersForRoute).map(id => 
      orders.find(o => (o._id || o.id) === id)
    ).filter(Boolean);
    
    const usedCapacity = selectedOrders.reduce((sum, order) => 
      sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
    );
    
    return capacity - usedCapacity;
  };
  
  // Add selected orders to manual route
  const handleAddToManualRoute = () => {
    if (selectedOrdersForRoute.size === 0) return;
    
    const selectedOrders = Array.from(selectedOrdersForRoute).map(id => 
      orders.find(o => (o._id || o.id) === id)
    ).filter(Boolean);
    
    // Group by location
    const locationMap = new Map();
    selectedOrders.forEach(order => {
      const village = order.farmer?.village || "Unknown";
      const taluka = order.farmer?.taluka || order.farmer?.talukaName || "Unknown";
      const district = order.farmer?.district || order.farmer?.districtName || "Unknown";
      const key = `${village}|${taluka}|${district}`;
      
      if (!locationMap.has(key)) {
        const location = locationGroups.find(loc => loc.key === key);
        if (location) {
          locationMap.set(key, {
            ...location,
            selectedOrders: []
          });
        }
      }
      
      const loc = locationMap.get(key);
      if (loc) {
        loc.selectedOrders.push(order);
      }
    });
    
    const newLocations = Array.from(locationMap.values());
    if (newLocations.length > 0) {
      const optimized = optimizeRouteOrder(newLocations);
      setCurrentRoute([...currentRoute, ...optimized]);
      setSelectedOrdersForRoute(new Set());
    }
  };
  
  // Handle click on village location to highlight it on map
  const handleHighlightLocation = (location) => {
    setHighlightedLocation(location.key);
    
    // Zoom to location
    if (location.coordinates) {
      const lat = location.coordinates.lat;
      const lng = location.coordinates.lng;
      
      if (useGoogleMaps && googleMapRef.current) {
        googleMapRef.current.setCenter({ lat, lng });
        googleMapRef.current.setZoom(12);
      } else if (mapRef.current) {
        setTimeout(() => {
          try {
            if (mapRef.current && !mapRef.current._destroyed) {
              mapRef.current.setView([lat, lng], 12);
            }
          } catch (error) {
            console.error("Error setting view:", error);
          }
        }, 100);
      }
    }
    
    // Auto-clear highlight after 3 seconds
    setTimeout(() => setHighlightedLocation(null), 3000);
  };

  // Handle marker click
  const handleMarkerClick = (location) => {
    setSelectedLocation(location);
    setShowOrdersDialog(true);
  };
  
  // Add stop to a route
  const handleAddStopToRoute = async (routeId, location) => {
    try {
      // Find the route
      const routeIndex = suggestedRoutes.findIndex(r => {
        const rId = r.id || `suggested-${suggestedRoutes.indexOf(r)}`;
        return rId === routeId;
      });
      
      if (routeIndex === -1) {
        alert("Route not found");
        return;
      }
      
      const route = suggestedRoutes[routeIndex];
      const updatedLocations = [...(route.locations || []), location];
      
      // Re-optimize route with new stop using Google Directions
      const waypoints = updatedLocations.map(loc => ({
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng
      }));
      
      const directions = await getGoogleDirections(waypoints);
      
      if (directions && directions.waypoint_order) {
        const optimizedRoute = directions.waypoint_order.map(idx => updatedLocations[idx]);
        const totalDistance = directions.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000;
        
        // Update the route
        const updatedRoutes = [...suggestedRoutes];
        updatedRoutes[routeIndex] = {
          ...route,
          locations: optimizedRoute,
          directions: directions,
          polyline: directions.overview_polyline?.points || null,
          totalDistance: totalDistance,
        };
        
        setSuggestedRoutes(updatedRoutes);
        alert("Stop added successfully! Route has been re-optimized.");
      } else {
        // Fallback: just add the location
        const updatedRoutes = [...suggestedRoutes];
        updatedRoutes[routeIndex] = {
          ...route,
          locations: updatedLocations,
        };
        setSuggestedRoutes(updatedRoutes);
        alert("Stop added to route");
      }
    } catch (error) {
      console.error("Error adding stop:", error);
      alert("Failed to add stop. Please try again.");
    }
  };

  // Fetch Google Directions when currentRoute changes
  useEffect(() => {
    const fetchCurrentRouteDirections = async () => {
      if (currentRoute.length > 0 && GOOGLE_MAPS_API_KEY) {
        try {
          const waypoints = currentRoute.map(loc => ({
            lat: loc.coordinates.lat,
            lng: loc.coordinates.lng
          }));
          const directions = await getGoogleDirections(waypoints);
          if (directions) {
            setCurrentRouteDirections(directions);
          } else {
            setCurrentRouteDirections(null);
          }
        } catch (error) {
          console.error("Error fetching directions for current route:", error);
          setCurrentRouteDirections(null);
        }
      } else {
        setCurrentRouteDirections(null);
      }
    };
    
    fetchCurrentRouteDirections();
  }, [currentRoute]);

  // Add location to current route or to a specific suggested route
  const handleAddToRoute = async (location) => {
    // Check if we're adding to a specific suggested route
    if (routeToSave && routeToSave._tempRouteId) {
      await handleAddStopToRoute(routeToSave._tempRouteId, location);
      setRouteToSave(null);
      setShowOrdersDialog(false);
      return;
    }
    
    // Otherwise add to current route
    if (!currentRoute.find(loc => loc.key === location.key)) {
      setCurrentRoute([...currentRoute, location]);
      // Directions will be fetched automatically by useEffect
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

  // Save suggested route with driver
  const handleSaveSuggestedRoute = (route) => {
    setRouteToSave(route);
    setShowDriverDialog(true);
  };

  const confirmSaveRoute = () => {
    if (routeName.trim()) {
      const driverName = selectedDriverId ? drivers.find(d => (d._id || d.id) === selectedDriverId)?.name || "Unassigned" : "Unassigned";
      setRoutes([...routes, {
        id: Date.now(),
        name: routeName.trim(),
        driver: driverName,
        driverId: selectedDriverId || null,
        locations: [...currentRoute],
        createdAt: new Date().toISOString(),
      }]);
      setCurrentRoute([]);
      setRouteName("");
      setSelectedDriverId("");
      setShowRouteNameDialog(false);
    }
  };

  // Save route and assign driver to orders
  const confirmSaveSuggestedRoute = async () => {
    if (!routeToSave || !selectedDriverId) {
      alert("Please select a driver");
      return;
    }
    
    const selectedDriver = drivers.find(d => (d._id || d.id) === selectedDriverId);
    if (!selectedDriver) {
      alert("Invalid driver selected");
      return;
    }
    
    setAssigningDriver(true);
    
    try {
      // Collect all order IDs from the route
      const orderIds = [];
      const routeLocations = routeToSave.locations || routeToSave;
      
      routeLocations.forEach((location, locIndex) => {
        const orders = location.selectedOrders || location.orders || [];
        orders.forEach((order, orderIndex) => {
          const orderId = order._id || order.id;
          if (orderId) {
            orderIds.push({
              orderId,
              locationIndex: locIndex,
              orderIndex: orderIndex
            });
          }
        });
      });
      
      // Generate route ID
      const routeId = `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update each order with driver assignment
      const updatePromises = orderIds.map(({ orderId, locationIndex, orderIndex }) => {
        const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
        return instance.request({
          id: orderId,
          assignedDriver: selectedDriverId,
          routeId: routeId,
          routeSequence: locationIndex + 1, // Sequence based on location in route
          assignedAt: new Date().toISOString(),
        });
      });
      
      await Promise.all(updatePromises);
      
      // Calculate route totals
      const totalPlants = routeToSave.totalPlants || routeLocations.reduce((sum, loc) => 
        sum + (loc.selectedOrders || loc.orders || []).reduce((s, o) => 
          s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
      );
      
      const totalDistance = routeToSave.totalDistance || calculateRouteDistance(routeLocations);
      
      // Save route locally
      setRoutes([...routes, {
        id: routeId,
        name: `Route ${routes.length + 1} - ${selectedDriver.name}`,
        driver: selectedDriver.name,
        driverId: selectedDriverId,
        locations: routeLocations,
        totalPlants,
        totalDistance,
        directions: routeToSave.directions,
        createdAt: new Date().toISOString(),
      }]);
      
      setRouteToSave(null);
      setSelectedDriverId("");
      setShowDriverDialog(false);
      setShowRouteSuggestions(false);
      setSuggestedRoutes([]);
      setVehicleCapacity(""); // Clear capacity for next round
      
      alert(`Successfully assigned ${selectedDriver.name} to route with ${orderIds.length} orders`);
    } catch (error) {
      console.error("Error assigning driver:", error);
      alert("Failed to assign driver. Please try again.");
    } finally {
      setAssigningDriver(false);
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
  const validLocations = useMemo(() => {
    let filtered = locationGroups.filter(loc => loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng);
    
    // If in focus mode, only show locations from focused route
    if (focusedRoute) {
      const focusedRouteData = routes.find(r => r.id === focusedRoute);
      if (focusedRouteData && focusedRouteData.locations) {
        const focusedKeys = new Set(focusedRouteData.locations.map(l => l.key));
        filtered = filtered.filter(loc => focusedKeys.has(loc.key));
      }
    }
    
    return filtered;
  }, [locationGroups, focusedRoute, routes]);

  // Get bounds for all markers
  const allBounds = useMemo(() => {
    if (validLocations.length === 0) return null;
    const coords = validLocations
      .map(loc => [loc.coordinates.lat, loc.coordinates.lng]);
    return coords.length > 0 ? coords : null;
  }, [validLocations]);

  // Get route polyline coordinates (synchronous - for immediate rendering)
  // Uses OpenRouteService if API key is available, otherwise straight-line
  const getRoutePolyline = (routeLocations, includeWarehouse = true) => {
    const coords = [];
    
    // Safety check: ensure routeLocations is an array
    if (!Array.isArray(routeLocations)) {
      console.warn("getRoutePolyline: routeLocations is not an array", routeLocations);
      return coords;
    }
    
    // Start from warehouse if route has locations
    if (includeWarehouse && routeLocations.length > 0) {
      coords.push([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng]);
    }
    
    // Add route locations
    routeLocations
      .filter(loc => loc && loc.coordinates)
      .forEach(loc => {
        coords.push([loc.coordinates.lat, loc.coordinates.lng]);
      });
    
    return coords;
  };

  // Calculate total distance for a route (synchronous - Haversine formula)
  // For real road distances, OpenRouteService can be used (see async version below)
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
  
  // Async version: Get real road-based route using OpenRouteService
  // Falls back to straight-line if API key not available
  const getRoutePolylineWithOpenRouteService = async (routeLocations, includeWarehouse = true) => {
    if (routeLocations.length === 0) return [];
    
    const coords = [];
    
    if (includeWarehouse && routeLocations.length > 0) {
      coords.push([WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng]);
    }
    
    routeLocations
      .filter(loc => loc.coordinates)
      .forEach(loc => {
        coords.push([loc.coordinates.lat, loc.coordinates.lng]);
      });
    
    // Use OpenRouteService for real road routing if API key available
    if (OPENROUTESERVICE_API_KEY && coords.length >= 2) {
      try {
        const waypoints = coords.map(coord => [coord[1], coord[0]]); // [lng, lat] format
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTESERVICE_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              coordinates: waypoints,
              geometry: true,
              format: 'geojson'
            })
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.geometry && data.geometry.coordinates) {
            // Convert from [lng, lat] to [lat, lng] for Leaflet
            return data.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          }
        }
      } catch (error) {
        console.log("OpenRouteService routing not available, using straight-line:", error);
      }
    }
    
    return coords; // Fallback to straight-line
  };
  
  // Async version: Calculate real road distance using OpenRouteService
  const calculateRouteDistanceWithOpenRouteService = async (routeLocations) => {
    if (routeLocations.length === 0) return 0;
    
    if (OPENROUTESERVICE_API_KEY && routeLocations.length >= 1) {
      try {
        const waypoints = [];
        waypoints.push([WAREHOUSE_LOCATION.lng, WAREHOUSE_LOCATION.lat]);
        
        routeLocations.forEach(location => {
          if (location.coordinates) {
            waypoints.push([location.coordinates.lng, location.coordinates.lat]);
          }
        });
        
        if (waypoints.length >= 2) {
          const response = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTESERVICE_API_KEY}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                coordinates: waypoints,
                format: 'json'
              })
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes[0] && data.routes[0].summary) {
              // Distance in meters, convert to km
              return data.routes[0].summary.distance / 1000;
            }
          }
        }
      } catch (error) {
        console.log("OpenRouteService distance calculation not available:", error);
      }
    }
    
    // Fallback to Haversine
    return calculateRouteDistance(routeLocations);
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
  const createMarkerIcon = (color, isInRoute, orderCount = 0) => {
    // Make markers more visible with better contrast
    const borderColor = "#ffffff";
    const shadowColor = "rgba(0,0,0,0.5)";
    const textColor = "#ffffff";
    
    return L.divIcon({
      className: "custom-marker",
      html: `<div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 4px solid ${borderColor};
        box-shadow: 0 3px 6px ${shadowColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: ${textColor};
        font-size: ${orderCount > 0 ? '11px' : '14px'};
        line-height: 1;
      ">${orderCount > 0 ? orderCount : (isInRoute ? '✓' : '')}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
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

  // Show completion summary when all orders are assigned
  if (allOrdersAssigned && routes.length > 0) {
    const totalStops = routes.reduce((sum, r) => sum + (r.locations?.length || 0), 0);
    const totalPlants = routes.reduce((sum, route) => {
      return sum + (route.locations?.reduce((s, loc) => 
        s + loc.orders.reduce((o, order) => 
          o + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0), 0) || 0);
    }, 0);
    const totalDistance = routes.reduce((sum, route) => 
      sum + (route.locations ? calculateRouteDistance(route.locations) : 0), 0);

    return (
      <Box sx={{ p: 3, height: "100%" }}>
        <Fade in={true}>
          <Card sx={{ maxWidth: 800, mx: "auto", boxShadow: 6, borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <Zoom in={true}>
                  <CheckCircle sx={{ fontSize: 80, color: "#4caf50", mb: 2 }} />
                </Zoom>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "#2e7d32" }}>
                  All Orders Assigned! 🎉
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  All delivery routes have been successfully planned and assigned
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2, mb: 3 }}>
                <Card sx={{ bgcolor: "rgba(25, 118, 210, 0.1)", p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <LocalShipping color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {routes.length}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Routes
                  </Typography>
                </Card>

                <Card sx={{ bgcolor: "rgba(76, 175, 80, 0.1)", p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <LocationOn color="success" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {totalStops}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Stops
                  </Typography>
                </Card>

                <Card sx={{ bgcolor: "rgba(255, 152, 0, 0.1)", p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <TrendingUp color="warning" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {totalPlants.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Plants
                  </Typography>
                </Card>

                <Card sx={{ bgcolor: "rgba(156, 39, 176, 0.1)", p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Route color="secondary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {totalDistance.toFixed(1)} km
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Distance
                  </Typography>
                </Card>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<MapIcon />}
                onClick={() => setAllOrdersAssigned(false)}
                sx={{ mt: 2, py: 1.5, fontSize: "1rem" }}
              >
                View Detailed Map
              </Button>
            </CardContent>
          </Card>
        </Fade>
      </Box>
    );
  }

  // Don't render if no valid locations
  if (validLocations.length === 0 && !geocodingProgress.isGeocoding) {
    return (
      <Box sx={{ height: "calc(100vh - 200px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Alert severity="info">
          <Typography variant="body1">
            {allOrdersAssigned ? "All orders have been assigned!" : "No locations to display on map"}
          </Typography>
        </Alert>
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
      {/* Geocoding Progress Indicator */}
      {geocodingProgress.isGeocoding && (
        <Fade in={geocodingProgress.isGeocoding}>
          <Paper
            sx={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1001,
              p: 2,
              minWidth: 300,
              boxShadow: 4,
              bgcolor: "rgba(255, 255, 255, 0.95)",
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Finding accurate locations...
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(geocodingProgress.current / geocodingProgress.total) * 100} 
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {geocodingProgress.current} of {geocodingProgress.total} locations geocoded
            </Typography>
          </Paper>
        </Fade>
      )}

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
            transform: "scale(1.05)",
          },
          transition: "all 0.2s",
        }}
        size="small"
      >
        {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>

      {/* Map Container */}
      <Box sx={{ 
        height: isFullscreen ? "100vh" : "calc(100vh - 200px)", 
        width: "100%", 
        position: "relative",
        overflow: "hidden", // Prevent page scrolling when interacting with map
        touchAction: "none", // Prevent default touch behaviors
      }}>
        {useGoogleMaps && GOOGLE_MAPS_API_KEY ? (
          <LoadScript 
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          >
            <GoogleMap
              mapContainerStyle={{ height: "100%", width: "100%" }}
              center={{ lat: mapCenter[0], lng: mapCenter[1] }}
              zoom={mapZoom}
              onLoad={(map) => {
                if (!googleMapRef.current) {
                  googleMapRef.current = map;
                  // Fit bounds to all locations - wait for Google Maps API to be ready
                  // Only fit bounds on initial load, not when routes are suggested
                  if (validLocations.length > 0 && suggestedRoutes.length === 0) {
                    setTimeout(() => {
                      if (window.google && window.google.maps && map && !map._destroyed) {
                        try {
                          const bounds = new window.google.maps.LatLngBounds();
                          bounds.extend({ lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng });
                          validLocations.forEach(loc => {
                            if (loc.coordinates) {
                              bounds.extend({ lat: loc.coordinates.lat, lng: loc.coordinates.lng });
                            }
                          });
                          map.fitBounds(bounds, { padding: 50 });
                        } catch (error) {
                          console.error("Error fitting bounds:", error);
                        }
                      }
                    }, 500);
                  }
                }
              }}
              onUnmount={() => {
                googleMapRef.current = null;
              }}
              options={{
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: false,
                draggable: true,
                scrollwheel: true,
                disableDoubleClickZoom: false,
                gestureHandling: 'greedy', // Allows normal scrolling with mouse wheel - more user-friendly
                zoomControl: true,
                clickableIcons: false,
                keyboardShortcuts: true,
                panControl: true,
                rotateControl: false,
                scaleControl: true,
              }}
            >
              {/* Warehouse Marker */}
              <GoogleMarker
                position={{ lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng }}
                icon={{
                  url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="14" fill="#d32f2f" stroke="white" stroke-width="4"/>
                      <text x="16" y="22" font-size="18" text-anchor="middle" fill="white">🏭</text>
                    </svg>
                  `),
                  scaledSize: { width: 32, height: 32 },
                  anchor: { x: 16, y: 16 },
                }}
                title={WAREHOUSE_LOCATION.name}
              />

              {/* Location Markers */}
              {validLocations.map((location) => {
                const isInCurrentRoute = currentRoute.some(loc => loc.key === location.key);
                const isInAnyRoute = routes.some(route => 
                  route.locations.some(loc => loc.key === location.key)
                );
                
                const markerColor = isInCurrentRoute 
                  ? "#2e7d32" 
                  : isInAnyRoute 
                    ? "#1976d2" 
                    : "#ff9800";
                
                const distanceFromWarehouse = location.coordinates 
                  ? calculateDistance(
                      WAREHOUSE_LOCATION.lat,
                      WAREHOUSE_LOCATION.lng,
                      location.coordinates.lat,
                      location.coordinates.lng
                    ).toFixed(1)
                  : "N/A";

                // Calculate total plants and status for Google Maps
                const totalPlants = location.orders.reduce((sum, order) => 
                  sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
                );
                const orderStatuses = [...new Set(location.orders.map(o => o.orderStatus || "UNKNOWN"))];
                const statusText = orderStatuses.length === 1 ? orderStatuses[0] : `${orderStatuses.length} statuses`;
                
                const orderDetails = location.orders.slice(0, 3).map(order => ({
                  farmerName: order.farmer?.name || "Unknown",
                  quantity: order.numberOfPlants || order.totalPlants || order.quantity || 0,
                  plantType: order.plantType?.name || order.plantName || "Unknown",
                  status: order.orderStatus || "UNKNOWN"
                }));

                return (
                  <GoogleMarker
                    key={location.key}
                    position={{ lat: location.coordinates.lat, lng: location.coordinates.lng }}
                    icon={{
                      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                        <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="18" cy="18" r="16" fill="${markerColor}" stroke="white" stroke-width="3"/>
                          <text x="18" y="24" font-size="14" font-weight="bold" text-anchor="middle" fill="white">${location.orders.length}</text>
                        </svg>
                      `),
                      scaledSize: { width: 36, height: 36 },
                      anchor: { x: 18, y: 18 },
                    }}
                    onClick={() => {
                      // Prevent flickering by using a small delay
                      setTimeout(() => {
                        setSelectedGoogleMarker(location.key === selectedGoogleMarker ? null : location.key);
                        handleMarkerClick(location);
                      }, 50);
                    }}
                    onMouseEnter={() => {
                      if (manualRouteMode) {
                        handleLocationHover(location);
                      }
                    }}
                    onMouseLeave={() => {
                      if (manualRouteMode) {
                        setHoveredOrders(null);
                      }
                    }}
                  >
                    {selectedGoogleMarker === location.key && (
                      <InfoWindow onCloseClick={() => setSelectedGoogleMarker(null)}>
                        <div style={{ minWidth: 220, padding: 8 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14, color: "#1976d2" }}>
                            {location.village}
                          </div>
                          <div style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>
                            {location.taluka}, {location.district}
                          </div>
                          <div style={{ background: "#f5f5f5", padding: 6, borderRadius: 4, marginBottom: 8 }}>
                            <div style={{ fontSize: 11, marginBottom: 2 }}><strong>Status:</strong> {statusText}</div>
                            <div style={{ fontSize: 11, marginBottom: 2 }}><strong>Total Plants:</strong> {totalPlants.toLocaleString()}</div>
                            <div style={{ fontSize: 11 }}><strong>Orders:</strong> {location.orders.length}</div>
                          </div>
                          <div style={{ color: "#1976d2", fontWeight: 600, marginBottom: 8, fontSize: 12 }}>
                            📍 {distanceFromWarehouse} km from warehouse
                          </div>
                          <div style={{ borderTop: "1px solid #ddd", paddingTop: 4, marginTop: 4 }}>
                            {orderDetails.map((detail, idx) => (
                              <div key={idx} style={{ fontSize: 11, marginBottom: 4 }}>
                                👤 {detail.farmerName} - {detail.quantity} plants ({detail.plantType})<br/>
                                <span style={{ color: "#666", fontSize: 10 }}>Status: {detail.status}</span>
                              </div>
                            ))}
                            {location.orders.length > 3 && (
                              <div style={{ fontSize: 10, color: "#666", fontStyle: "italic" }}>
                                +{location.orders.length - 3} more orders
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              handleAddToRoute(location);
                              setSelectedGoogleMarker(null);
                            }}
                            disabled={isInCurrentRoute}
                            style={{
                              marginTop: 8,
                              padding: "6px 12px",
                              fontSize: "12px",
                              border: "1px solid #1976d2",
                              borderRadius: "4px",
                              backgroundColor: isInCurrentRoute ? "#ccc" : "white",
                              color: isInCurrentRoute ? "#666" : "#1976d2",
                              cursor: isInCurrentRoute ? "not-allowed" : "pointer",
                            }}
                          >
                            {isInCurrentRoute ? "In Route" : "Add to Route"}
                          </button>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMarker>
                );
              })}

              {/* Navigation Routes using Google Directions */}
              {showRouteSuggestions && suggestedRoutes.map((route, routeIdx) => {
                const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
                const color = colors[routeIdx % colors.length];
                const isFocused = focusedRoute === `suggested-${routeIdx}`;
                const routeLocations = route.locations || [];
                
                // Only show if focused or no route is focused
                if (focusedRoute && !isFocused) return null;
                
                // Use DirectionsService to get proper navigation route
                // Only render if directions haven't been fetched yet
                if (routeLocations.length > 0 && !routeDirections[`suggested-${routeIdx}`]) {
                  return (
                    <DirectionsService
                      key={`service-suggested-${routeIdx}`}
                      options={{
                        origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                        destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                        waypoints: routeLocations.map(loc => ({
                          location: { lat: loc.coordinates.lat, lng: loc.coordinates.lng },
                          stopover: true,
                        })),
                        travelMode: window.google?.maps?.TravelMode?.DRIVING || 'DRIVING',
                        optimizeWaypoints: true,
                      }}
                      callback={(result, status) => {
                        if (status === 'OK' && result) {
                          // Only update if not already set to prevent unnecessary re-renders
                          setRouteDirections(prev => {
                            const key = `suggested-${routeIdx}`;
                            if (prev[key]) return prev; // Don't update if already exists
                            return {
                              ...prev,
                              [key]: result,
                            };
                          });
                        }
                      }}
                    />
                  );
                }
                return null;
              })}
              
              {/* Render directions using DirectionsRenderer */}
              {showRouteSuggestions && suggestedRoutes.map((route, routeIdx) => {
                const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
                const color = colors[routeIdx % colors.length];
                const isFocused = focusedRoute === `suggested-${routeIdx}`;
                
                if (focusedRoute && !isFocused) return null;
                
                if (routeDirections[`suggested-${routeIdx}`]) {
                  return (
                    <DirectionsRenderer
                      key={`renderer-suggested-${routeIdx}`}
                      directions={routeDirections[`suggested-${routeIdx}`]}
                      options={{
                        polylineOptions: {
                          strokeColor: color,
                          strokeWeight: isFocused ? 5 : 3,
                          strokeOpacity: isFocused ? 0.9 : 0.7,
                          zIndex: isFocused ? 1000 : 1,
                        },
                        suppressMarkers: true,
                        preserveViewport: true, // Always preserve viewport to prevent map jumping
                      }}
                    />
                  );
                }
                return null;
              })}

              {/* Saved Routes using DirectionsService */}
              {routes.map((route) => {
                const isHighlighted = highlightedRoute === route.id;
                const isFocused = focusedRoute === route.id;
                
                if (focusedRoute && !isFocused) return null;
                
                // Only render DirectionsService if directions haven't been fetched yet
                if (route.locations && route.locations.length > 0 && !routeDirections[route.id]) {
                  return (
                    <DirectionsService
                      key={`service-${route.id}`}
                      options={{
                        origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                        destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                        waypoints: route.locations.map(loc => ({
                          location: { lat: loc.coordinates.lat, lng: loc.coordinates.lng },
                          stopover: true,
                        })),
                        travelMode: window.google?.maps?.TravelMode?.DRIVING || 'DRIVING',
                        optimizeWaypoints: true,
                      }}
                      callback={(result, status) => {
                        if (status === 'OK' && result) {
                          // Only update if not already set to prevent unnecessary re-renders
                          setRouteDirections(prev => {
                            if (prev[route.id]) return prev; // Don't update if already exists
                            return {
                              ...prev,
                              [route.id]: result,
                            };
                          });
                        }
                      }}
                    />
                  );
                }
                return null;
              })}
              
              {/* Render saved routes directions */}
              {routes.map((route) => {
                const isHighlighted = highlightedRoute === route.id;
                const isFocused = focusedRoute === route.id;
                
                if (focusedRoute && !isFocused) return null;
                
                if (routeDirections[route.id]) {
                  return (
                    <DirectionsRenderer
                      key={`renderer-${route.id}`}
                      directions={routeDirections[route.id]}
                      options={{
                        polylineOptions: {
                          strokeColor: isHighlighted || isFocused ? "#ff5722" : "#1976d2",
                          strokeWeight: isHighlighted || isFocused ? 5 : 3,
                          strokeOpacity: isHighlighted || isFocused ? 0.9 : 0.6,
                          zIndex: isHighlighted || isFocused ? 1000 : 1,
                        },
                        suppressMarkers: true,
                        preserveViewport: true, // Always preserve viewport to prevent map jumping
                      }}
                    />
                  );
                }
                return null;
              })}

              {/* Current Route using DirectionsService */}
              {currentRoute.length > 0 && !currentRouteDirections && (
                <DirectionsService
                  options={{
                    origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                    destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                    waypoints: currentRoute.map(loc => ({
                      location: { lat: loc.coordinates.lat, lng: loc.coordinates.lng },
                      stopover: true,
                    })),
                    travelMode: window.google?.maps?.TravelMode?.DRIVING || 'DRIVING',
                    optimizeWaypoints: true,
                  }}
                  callback={(result, status) => {
                    if (status === 'OK' && result) {
                      // Only update if not already set to prevent unnecessary re-renders
                      setCurrentRouteDirections(prev => {
                        if (prev) return prev; // Don't update if already exists
                        return result;
                      });
                    }
                  }}
                />
              )}
              
              {/* Render current route directions */}
              {currentRoute.length > 0 && currentRouteDirections && (
                <DirectionsRenderer
                  directions={currentRouteDirections}
                  options={{
                    polylineOptions: {
                      strokeColor: "#2e7d32",
                      strokeWeight: 4,
                      strokeOpacity: 0.8,
                      zIndex: 100,
                    },
                    suppressMarkers: true,
                    preserveViewport: true, // Preserve viewport to prevent map jumping
                  }}
                />
              )}
            </GoogleMap>
          </LoadScript>
        ) : (
          <MapContainer
            key={`map-${validLocations.length}`}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%", zIndex: 1 }}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            zoomControl={true}
            touchZoom={true}
            boxZoom={true}
            keyboard={true}
            whenReady={(mapInstance) => {
              // Use whenReady for better initialization timing
              try {
                if (!mapRef.current) {
                  mapRef.current = mapInstance.target;
                  // Fit bounds when map is ready - only on initial load, not when routes are suggested
                  if (allBounds && allBounds.length > 0 && suggestedRoutes.length === 0) {
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
            const isHighlighted = highlightedLocation === location.key;
            
            const markerColor = isHighlighted
              ? "#ff5722" // Red/Orange for highlighted
              : isInCurrentRoute 
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

            // Calculate total plants and status
            const totalPlants = location.orders.reduce((sum, order) => 
              sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
            );
            const orderStatuses = [...new Set(location.orders.map(o => o.orderStatus || "UNKNOWN"))];
            const statusText = orderStatuses.length === 1 ? orderStatuses[0] : `${orderStatuses.length} statuses`;
            
            // Get order details for hover
            const orderDetails = location.orders.slice(0, 3).map(order => ({
              farmerName: order.farmer?.name || "Unknown",
              quantity: order.numberOfPlants || order.totalPlants || order.quantity || 0,
              plantType: order.plantType?.name || order.plantName || "Unknown",
              status: order.orderStatus || "UNKNOWN"
            }));

            // Build tooltip content
            const tooltipContent = `
              <div style="min-width: 220px; padding: 6px;">
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 14px; color: #1976d2;">${location.village}</div>
                <div style="color: #666; font-size: 11px; margin-bottom: 4px;">${location.taluka}, ${location.district}</div>
                <div style="background: #f5f5f5; padding: 6px; border-radius: 4px; margin: 6px 0;">
                  <div style="font-size: 11px; margin-bottom: 2px;"><strong>Status:</strong> ${statusText}</div>
                  <div style="font-size: 11px; margin-bottom: 2px;"><strong>Total Plants:</strong> ${totalPlants.toLocaleString()}</div>
                  <div style="font-size: 11px;"><strong>Orders:</strong> ${location.orders.length}</div>
                </div>
                <div style="color: #1976d2; font-weight: 600; font-size: 11px; margin-bottom: 8px;">📍 ${distanceFromWarehouse} km from warehouse</div>
                <div style="border-top: 1px solid #ddd; padding-top: 4px; margin-top: 4px;">
                  ${orderDetails.map(detail => `
                    <div style="font-size: 11px; margin-bottom: 2px;">
                      👤 ${detail.farmerName} - ${detail.quantity} plants (${detail.plantType})<br/>
                      <span style="color: #666; font-size: 10px;">Status: ${detail.status}</span>
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
                icon={createMarkerIcon(markerColor, isInCurrentRoute || isHighlighted, location.orders.length)}
                eventHandlers={{
                  click: () => {
                    // Prevent flickering by using a small delay
                    setTimeout(() => {
                      handleMarkerClick(location);
                    }, 50);
                  },
                  mouseover: () => {
                    if (manualRouteMode) {
                      handleLocationHover(location);
                    }
                  },
                  mouseout: () => {
                    if (manualRouteMode) {
                      setHoveredOrders(null);
                    }
                  },
                }}
              >
                <LeafletTooltip permanent={false} direction="top" offset={[0, -10]}>
                  <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
                </LeafletTooltip>
                <Popup>
                  <Box sx={{ minWidth: 220 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: "primary.main" }}>
                      {location.village}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                      {location.taluka}, {location.district}
                    </Typography>
                    <Box sx={{ background: "#f5f5f5", padding: 1, borderRadius: 1, mb: 1 }}>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                        <strong>Status:</strong> {statusText}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                        <strong>Total Plants:</strong> {totalPlants.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        <strong>Orders:</strong> {location.orders.length}
                      </Typography>
                    </Box>
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
          
          {/* Navigation Routes for suggested routes */}
          {showRouteSuggestions && suggestedRoutes.map((route, routeIdx) => {
            const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
            const color = colors[routeIdx % colors.length];
            const isFocused = focusedRoute === `suggested-${routeIdx}`;
            
            // Only show if focused or no route is focused
            if (focusedRoute && !isFocused) return null;
            
            // Use decoded polyline if available (from Google Directions), otherwise fallback to straight line
            let positions = [];
            if (route.polyline) {
              const decoded = decodePolyline(route.polyline);
              positions = decoded.length > 0 ? decoded : getRoutePolyline(route.locations || [], true);
            } else {
              positions = getRoutePolyline(route.locations || [], true);
            }
            
            return (
              <Polyline
                key={`suggested-${routeIdx}`}
                positions={positions}
                color={color}
                weight={isFocused ? 5 : 3}
                opacity={isFocused ? 0.9 : 0.7}
                dashArray={routeIdx === 0 ? "0" : "10, 5"}
              />
            );
          })}
          
          {/* Navigation Routes for saved routes */}
          {routes.map((route) => {
            const isHighlighted = highlightedRoute === route.id;
            const isFocused = focusedRoute === route.id;
            
            // Only show if focused or no route is focused
            if (focusedRoute && !isFocused) return null;
            
            // Use decoded polyline if available (from Google Directions), otherwise fallback to straight line
            let positions = [];
            if (route.polyline) {
              const decoded = decodePolyline(route.polyline);
              positions = decoded.length > 0 ? decoded : getRoutePolyline(route.locations || [], true);
            } else {
              positions = getRoutePolyline(route.locations || [], true);
            }
            
            return (
              <Polyline
                key={route.id}
                positions={positions}
                color={isHighlighted || isFocused ? "#ff5722" : "#1976d2"}
                weight={isHighlighted || isFocused ? 5 : 3}
                opacity={isHighlighted || isFocused ? 0.9 : 0.6}
              />
            );
          })}
          
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
        )}
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
          placeholder="e.g., 20000"
        />
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <Button
            fullWidth
            variant={manualRouteMode ? "contained" : "outlined"}
            color={manualRouteMode ? "secondary" : "primary"}
            onClick={() => {
              setManualRouteMode(!manualRouteMode);
              setSelectedOrdersForRoute(new Set());
            }}
            size="small"
          >
            {manualRouteMode ? "Exit Manual" : "Manual Route"}
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleSuggestRoutes}
            disabled={!vehicleCapacity || parseInt(vehicleCapacity) <= 0 || manualRouteMode}
            size="small"
          >
            Auto Suggest
          </Button>
        </Box>
        {manualRouteMode && (
          <Box sx={{ mb: 1, p: 1, bgcolor: "rgba(156, 39, 176, 0.1)", borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Remaining Capacity: <strong>{getRemainingCapacity().toLocaleString()}</strong> plants
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hover over locations to select orders
            </Typography>
            {selectedOrdersForRoute.size > 0 && (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="small"
                onClick={handleAddToManualRoute}
                sx={{ mt: 1 }}
              >
                Add {selectedOrdersForRoute.size} Selected to Route
              </Button>
            )}
          </Box>
        )}
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

      {/* Hover Order Selection Panel */}
      {hoveredOrders && manualRouteMode && (
        <Paper
          sx={{
            position: "absolute",
            top: isFullscreen ? 60 : 10,
            left: 10,
            p: 2,
            minWidth: 300,
            maxHeight: isFullscreen ? "calc(100vh - 80px)" : "calc(100vh - 220px)",
            overflow: "auto",
            zIndex: 1001,
            boxShadow: 4,
            bgcolor: "rgba(255, 255, 255, 0.98)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Select Orders from {hoveredOrders.village}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
            Remaining Capacity: {getRemainingCapacity().toLocaleString()} plants
          </Typography>
          <List dense>
            {hoveredOrders.orders.map((order) => {
              const orderId = order._id || order.id;
              const orderPlants = order.numberOfPlants || order.totalPlants || order.quantity || 0;
              const isSelected = selectedOrdersForRoute.has(orderId);
              const canSelect = orderPlants <= getRemainingCapacity();
              
              return (
                <ListItem
                  key={orderId}
                  button
                  onClick={() => canSelect && handleOrderToggle(orderId)}
                  disabled={!canSelect && !isSelected}
                  sx={{
                    bgcolor: isSelected ? "rgba(156, 39, 176, 0.2)" : "transparent",
                    mb: 0.5,
                    borderRadius: 1,
                    border: isSelected ? "1px solid #9c27b0" : "1px solid transparent",
                    opacity: canSelect || isSelected ? 1 : 0.5,
                  }}
                >
                  <ListItemText
                    primary={`${order.farmer?.name || "Unknown"} - ${orderPlants.toLocaleString()} plants`}
                    secondary={order.plantType?.name || order.plantName || "Unknown"}
                    primaryTypographyProps={{ fontSize: "0.85rem" }}
                    secondaryTypographyProps={{ fontSize: "0.7rem" }}
                  />
                  {isSelected && <CheckCircle sx={{ color: "#9c27b0", fontSize: 20 }} />}
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {/* Route Controls Panel */}
      {showRoutePanel ? (
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
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {suggestedRoutes.length > 0 && (
                <Chip 
                  label={`${suggestedRoutes.length} Suggested`} 
                  color="primary" 
                  size="small"
                />
              )}
              <IconButton
                size="small"
                onClick={() => setShowRoutePanel(false)}
                sx={{ ml: 1 }}
                title="Hide Route Panel"
              >
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>

        {/* Route Optimization Summary */}
        {showRouteSuggestions && suggestedRoutes.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(33, 150, 243, 0.1)", borderRadius: 1, border: "1px solid rgba(33, 150, 243, 0.3)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#1976d2" }}>
              📊 Route Summary
            </Typography>
            {(() => {
              const totalStops = suggestedRoutes.reduce((sum, r) => sum + (r.locations?.length || 0), 0);
              const totalPlants = suggestedRoutes.reduce((sum, r) => 
                sum + (r.totalPlants || (r.locations || []).reduce((s, loc) => 
                  s + (loc.selectedOrders || loc.orders || []).reduce((o, order) => 
                    o + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0), 0), 0)
              );
              const totalDistance = suggestedRoutes.reduce((sum, r) => 
                sum + (r.totalDistance || calculateRouteDistance(r.locations || [])), 0
              );
              const avgDistancePerRoute = totalDistance / suggestedRoutes.length;
              
              return (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption">Total Routes:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{suggestedRoutes.length}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption">Total Stops:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{totalStops}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption">Total Plants:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{totalPlants.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="caption">Total Distance:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{totalDistance.toFixed(1)} km</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption">Avg Distance/Route:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{avgDistancePerRoute.toFixed(1)} km</Typography>
                  </Box>
                </Box>
              );
            })()}
          </Box>
        )}

        {/* Route Optimization Logic Explanation */}
        {showRouteSuggestions && suggestedRoutes.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(76, 175, 80, 0.1)", borderRadius: 1, border: "1px solid rgba(76, 175, 80, 0.3)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#4caf50" }}>
              🧠 How Route Optimization Works
            </Typography>
            <Box component="ol" sx={{ pl: 2, m: 0, fontSize: "0.75rem", "& li": { mb: 0.5 } }}>
              <li>
                <strong>K-Means Clustering:</strong> Groups nearby orders into clusters based on geographic proximity
              </li>
              <li>
                <strong>Capacity-Based Packing:</strong> Fills each route up to vehicle capacity ({vehicleCapacity} plants) using a greedy algorithm
              </li>
              <li>
                <strong>Distance Sorting:</strong> Orders locations by distance from warehouse to minimize travel
              </li>
              <li>
                <strong>Google Directions Optimization:</strong> Uses Google&apos;s optimize:true to reorder waypoints for shortest path (if available)
              </li>
              <li>
                <strong>Nearest Neighbor Fallback:</strong> If Google Directions fails, uses TSP approximation to find shortest route
              </li>
              <li>
                <strong>Result:</strong> Multiple optimized routes that respect capacity and minimize total distance
              </li>
            </Box>
          </Box>
        )}

        {/* Suggested Routes */}
        {showRouteSuggestions && suggestedRoutes.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(233, 30, 99, 0.05)", borderRadius: 1, border: "1px solid rgba(233, 30, 99, 0.2)" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#e91e63" }}>
              🚚 Suggested Routes ({suggestedRoutes.length})
            </Typography>
            {suggestedRoutes.map((route, idx) => {
              // Route is an object with locations array, not an array itself
              const routeLocations = route.locations || [];
              const totalPlants = route.totalPlants || routeLocations.reduce((sum, loc) => 
                sum + (loc.selectedOrders || loc.orders || []).reduce((s, o) => 
                  s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
              );
              const routeDistance = route.totalDistance || calculateRouteDistance(routeLocations);
              const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
              const color = colors[idx % colors.length];
              
              const isFocused = focusedRoute === `suggested-${idx}`;
              
              return (
                <Box 
                  key={idx} 
                  onClick={() => {
                    if (isFocused) {
                      setFocusedRoute(null);
                    } else {
                      setFocusedRoute(`suggested-${idx}`);
                      // Fit map to route bounds
                      if (routeLocations.length > 0 && googleMapRef.current) {
                        setTimeout(() => {
                          if (window.google && window.google.maps && googleMapRef.current) {
                            try {
                              const bounds = new window.google.maps.LatLngBounds();
                              bounds.extend({ lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng });
                              routeLocations.forEach(loc => {
                                if (loc.coordinates) {
                                  bounds.extend({ lat: loc.coordinates.lat, lng: loc.coordinates.lng });
                                }
                              });
                              googleMapRef.current.fitBounds(bounds, { padding: 50 });
                            } catch (error) {
                              console.error("Error fitting bounds:", error);
                            }
                          }
                        }, 100);
                      }
                    }
                  }}
                  sx={{ 
                    mb: 1, 
                    p: 1, 
                    bgcolor: isFocused ? "rgba(255, 87, 34, 0.2)" : "rgba(255,255,255,0.7)", 
                    borderRadius: 1,
                    border: `2px solid ${isFocused ? "#ff5722" : color}`,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: isFocused ? "rgba(255, 87, 34, 0.3)" : "rgba(255,255,255,0.9)",
                      transform: "translateX(4px)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: isFocused ? "#ff5722" : color }}>
                      Route {idx + 1} ({routeLocations.length} stops) {isFocused ? "👁️" : ""}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add stop functionality - open location selection dialog
                          // Store the route ID for adding stop
                          setRouteToSave({ ...route, _tempRouteId: `suggested-${idx}` });
                          setSelectedLocation(null);
                          setShowOrdersDialog(true);
                        }}
                        sx={{ fontSize: "0.65rem", py: 0.25, minWidth: "auto", px: 0.5 }}
                        title="Add Stop"
                      >
                        +
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveSuggestedRoute(route);
                        }}
                        sx={{ fontSize: "0.7rem", py: 0.25 }}
                      >
                        Assign
                      </Button>
                    </Box>
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

        {/* Geocoded Villages List (Debug) */}
        {showGeocodingPanel && validLocations.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Geocoded Villages ({validLocations.length})
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowGeocodingPanel(false)}
                title="Hide Geocoding Panel"
              >
                <VisibilityOff sx={{ fontSize: "1rem" }} />
              </IconButton>
            </Box>
            <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
              {validLocations.map((location) => {
                const totalPlants = location.orders.reduce((sum, order) => 
                  sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
                );
                const distance = location.coordinates 
                  ? calculateDistance(
                      WAREHOUSE_LOCATION.lat,
                      WAREHOUSE_LOCATION.lng,
                      location.coordinates.lat,
                      location.coordinates.lng
                    ).toFixed(1)
                  : "N/A";
                const isHighlighted = highlightedLocation === location.key;
                
                return (
                  <ListItem
                    key={location.key}
                    onClick={() => handleHighlightLocation(location)}
                    sx={{
                      bgcolor: isHighlighted 
                        ? "rgba(255, 87, 34, 0.2)" 
                        : "rgba(255, 255, 255, 0.7)",
                      mb: 0.5,
                      borderRadius: 1,
                      py: 0.5,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      border: isHighlighted 
                        ? "2px solid #ff5722" 
                        : "1px solid rgba(0,0,0,0.1)",
                      "&:hover": {
                        bgcolor: "rgba(255, 87, 34, 0.1)",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LocationOn sx={{ fontSize: "0.9rem", color: isHighlighted ? "#ff5722" : "#1976d2" }} />
                          <Typography variant="body2" sx={{ fontWeight: isHighlighted ? 600 : 500 }}>
                            {location.village}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ display: "block", fontSize: "0.7rem" }}>
                            {location.taluka}, {location.district}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", fontSize: "0.7rem", color: "primary.main" }}>
                            📍 {distance} km | 📦 {totalPlants.toLocaleString()} plants | 📋 {location.orders.length} orders
                          </Typography>
                          {location.coordinates?.accuracy && (
                            <Typography variant="caption" sx={{ display: "block", fontSize: "0.65rem", color: "text.secondary" }}>
                              Accuracy: {location.coordinates.accuracy} ({location.coordinates.source || "unknown"})
                            </Typography>
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{ fontSize: "0.85rem" }}
                      secondaryTypographyProps={{ fontSize: "0.7rem" }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}

          {/* Saved Routes */}
          {routes.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Assigned Routes ({routes.length})
              </Typography>
              <List dense>
                {routes.map((route) => {
                  const totalPlants = route.locations?.reduce((sum, loc) => 
                    sum + loc.orders.reduce((s, o) => s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
                  ) || 0;
                  const routeDistance = route.locations ? calculateRouteDistance(route.locations) : 0;
                  
                  return (
                    <ListItem
                      key={route.id}
                      onClick={() => handleShowRoute(route)}
                      sx={{
                        bgcolor: focusedRoute === route.id
                          ? "rgba(255, 87, 34, 0.3)"
                          : highlightedRoute === route.id 
                          ? "rgba(25, 118, 210, 0.3)" 
                          : "rgba(25, 118, 210, 0.1)",
                        mb: 0.5,
                        borderRadius: 1,
                        py: 0.5,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        border: focusedRoute === route.id
                          ? "2px solid #ff5722"
                          : highlightedRoute === route.id 
                          ? "2px solid #1976d2" 
                          : "1px solid transparent",
                        "&:hover": {
                          bgcolor: focusedRoute === route.id
                            ? "rgba(255, 87, 34, 0.4)"
                            : "rgba(25, 118, 210, 0.2)",
                          transform: "translateX(4px)",
                        },
                      }}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRoute(route.id);
                          }}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={route.name || `Route ${route.id}`}
                        secondary={
                          <Box>
                            <Typography variant="caption" sx={{ display: "block" }}>
                              👤 {route.driver || "Unassigned"}
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block" }}>
                              {route.locations?.length || 0} stops | {totalPlants.toLocaleString()} plants | {routeDistance.toFixed(1)} km
                            </Typography>
                          </Box>
                        }
                        primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: 500 }}
                        secondaryTypographyProps={{ fontSize: "0.7rem" }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Paper>
      ) : (
        <IconButton
          onClick={() => setShowRoutePanel(true)}
          sx={{
            position: "absolute",
            top: isFullscreen ? 60 : 10,
            right: 10,
            zIndex: 1000,
            bgcolor: "white",
            boxShadow: 3,
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          title="Show Route Panel"
        >
          <ChevronLeft />
        </IconButton>
      )}

      {/* Geocoded Villages Panel Toggle Button (when hidden) */}
      {!showGeocodingPanel && validLocations.length > 0 && (
        <IconButton
          onClick={() => setShowGeocodingPanel(true)}
          sx={{
            position: "absolute",
            bottom: showRoutePanel ? 60 : 10,
            right: 10,
            zIndex: 1000,
            bgcolor: "white",
            boxShadow: 3,
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          title="Show Geocoding Panel"
        >
          <Visibility sx={{ fontSize: "1.2rem" }} />
        </IconButton>
      )}

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

      {/* Save Route Name Dialog */}
      <Dialog open={showRouteNameDialog} onClose={() => setShowRouteNameDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Current Route</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="routeName"
            label="Route Name"
            type="text"
            fullWidth
            variant="outlined"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="e.g., Route 1, North Zone"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Select Driver (Optional)</InputLabel>
            <Select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              label="Select Driver (Optional)"
              disabled={loadingDrivers}
            >
              <MenuItem value="">None (Unassigned)</MenuItem>
              {loadingDrivers ? (
                <MenuItem disabled>Loading drivers...</MenuItem>
              ) : drivers.length === 0 ? (
                <MenuItem disabled>No drivers available</MenuItem>
              ) : (
                drivers.map((driver) => (
                  <MenuItem key={driver._id || driver.id} value={driver._id || driver.id}>
                    {driver.name} {driver.phoneNumber ? `(${driver.phoneNumber})` : ''}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRouteNameDialog(false)}>Cancel</Button>
          <Button onClick={confirmSaveRoute} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Driver Dialog for Suggested Routes */}
      <Dialog open={showDriverDialog} onClose={() => {
        if (!assigningDriver) {
          setShowDriverDialog(false);
          setRouteToSave(null);
          setSelectedDriverId("");
        }
      }} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Driver to Route</DialogTitle>
        <DialogContent>
          {routeToSave && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
                Route Details:
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                • {(routeToSave.locations || routeToSave).length} stops
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                • {(routeToSave.totalPlants || (routeToSave.locations || routeToSave).reduce((sum, loc) => 
                    sum + (loc.selectedOrders || loc.orders || []).reduce((s, o) => s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
                  )).toLocaleString()} plants
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                • {(routeToSave.totalDistance || calculateRouteDistance(routeToSave.locations || routeToSave)).toFixed(1)} km
              </Typography>
            </Box>
          )}
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Select Driver *</InputLabel>
            <Select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              label="Select Driver *"
              disabled={loadingDrivers || assigningDriver}
            >
              {loadingDrivers ? (
                <MenuItem disabled>Loading drivers...</MenuItem>
              ) : drivers.length === 0 ? (
                <MenuItem disabled>No drivers available</MenuItem>
              ) : (
                drivers.map((driver) => (
                  <MenuItem key={driver._id || driver.id} value={driver._id || driver.id}>
                    {driver.name} {driver.phoneNumber ? `(${driver.phoneNumber})` : ''}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          {assigningDriver && (
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="caption">Assigning driver to orders...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              if (!assigningDriver) {
                setShowDriverDialog(false);
                setRouteToSave(null);
                setSelectedDriverId("");
              }
            }}
            disabled={assigningDriver}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmSaveSuggestedRoute} 
            variant="contained" 
            disabled={!selectedDriverId || assigningDriver}
          >
            {assigningDriver ? "Assigning..." : "Assign & Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderMapView;

