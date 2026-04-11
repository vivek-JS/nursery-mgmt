import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip } from "react-leaflet";
import { GoogleMap, LoadScript, Marker as GoogleMarker, InfoWindow, DirectionsService, DirectionsRenderer, Polyline as GooglePolyline } from "@react-google-maps/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
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
  ChevronRight,
  ChevronLeft,
  Visibility,
  VisibilityOff,
  List as ListIcon,
  Warning,
  Edit,
  Close as CloseIcon,
} from "@mui/icons-material";


// Geocoding function - Uses Bhuvan (ISRO) for Indian addresses, Google Maps as fallback, then OpenStreetMap
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBq5k9ataLH59YpmLOyj4N2kiUWZquSQOs";
const BHUVAN_API_TOKEN = process.env.REACT_APP_BHUVAN_API_TOKEN || ""; // Optional: Get from https://bhuvan-app1.nrsc.gov.in/api/
const OPENROUTESERVICE_API_KEY = process.env.REACT_APP_OPENROUTESERVICE_API_KEY || ""; // Optional: Get free key from https://openrouteservice.org/

// Simple geocoding function for searching any location (used in Add Stop dialog)
const geocodeAnyLocation = async (query) => {
  if (!GOOGLE_MAPS_API_KEY || !query) return null;
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=in`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      
      // Extract address components
      const addressComponents = result.address_components || [];
      let village = query.split(',')[0].trim();
      let taluka = '';
      let district = '';
      let state = 'Maharashtra';
      
      addressComponents.forEach(component => {
        const types = component.types || [];
        if (types.includes('locality') || types.includes('sublocality')) {
          village = component.long_name;
        } else if (types.includes('administrative_area_level_2')) {
          district = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
      });
      
      return {
        lat: location.lat,
        lng: location.lng,
        accuracy: 'high',
        source: 'google-search',
        village: village,
        taluka: taluka,
        district: district,
        state: state,
        formattedAddress: result.formatted_address
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
};

// Enhanced geocoding using Google Maps API - PRIORITIZES VILLAGE AND TALUKA MATCHING FIRST
// Approximate bounding boxes for major Maharashtra districts used to bias Google geocoding
const MH_DISTRICT_BOUNDS = {
  "Jalgaon":    { sw: [20.6, 74.5], ne: [21.6, 76.5] },
  "Nashik":     { sw: [19.5, 73.5], ne: [20.9, 75.2] },
  "Pune":       { sw: [17.8, 73.4], ne: [19.3, 75.0] },
  "Aurangabad": { sw: [19.4, 74.8], ne: [20.4, 75.9] },
  "Ahmednagar": { sw: [18.3, 74.1], ne: [19.8, 75.9] },
  "Solapur":    { sw: [17.2, 75.1], ne: [18.2, 76.2] },
  "Kolhapur":   { sw: [16.1, 73.6], ne: [17.4, 74.6] },
  "Satara":     { sw: [17.2, 73.9], ne: [18.1, 75.0] },
  "Sangli":     { sw: [16.6, 74.2], ne: [17.5, 75.3] },
  "Amravati":   { sw: [20.5, 76.8], ne: [21.8, 78.0] },
  "Akola":      { sw: [20.3, 76.5], ne: [21.3, 77.7] },
  "Nagpur":     { sw: [20.6, 78.5], ne: [21.7, 80.1] },
  "Wardha":     { sw: [20.2, 78.2], ne: [21.0, 79.2] },
  "Yavatmal":   { sw: [19.8, 77.5], ne: [20.9, 78.9] },
  "Nanded":     { sw: [17.8, 77.1], ne: [19.0, 78.5] },
  "Latur":      { sw: [17.5, 76.3], ne: [18.4, 77.4] },
  "Osmanabad":  { sw: [17.6, 75.7], ne: [18.5, 76.7] },
  "Beed":       { sw: [18.3, 75.3], ne: [19.3, 76.5] },
  "Hingoli":    { sw: [19.3, 77.0], ne: [20.0, 77.9] },
  "Parbhani":   { sw: [18.7, 76.3], ne: [20.0, 77.5] },
  "Buldhana":   { sw: [20.1, 75.9], ne: [21.2, 77.0] },
  "Washim":     { sw: [20.0, 77.0], ne: [20.7, 77.9] },
  "Chandrapur": { sw: [19.7, 79.1], ne: [20.7, 80.5] },
  "Gadchiroli": { sw: [19.4, 79.7], ne: [21.2, 81.0] },
  "Gondia":     { sw: [21.0, 80.0], ne: [21.7, 81.0] },
  "Bhandara":   { sw: [20.7, 79.4], ne: [21.5, 80.2] },
  "Raigad":     { sw: [17.9, 72.8], ne: [18.9, 73.5] },
  "Ratnagiri":  { sw: [16.5, 73.0], ne: [17.9, 74.0] },
  "Sindhudurg": { sw: [15.7, 73.5], ne: [16.7, 74.2] },
  "Thane":      { sw: [19.0, 72.8], ne: [20.3, 73.5] },
  "Mumbai":     { sw: [18.8, 72.7], ne: [19.3, 73.1] },
  "Dhule":      { sw: [20.8, 73.6], ne: [22.0, 75.0] },
  "Nandurbar":  { sw: [21.2, 73.5], ne: [22.1, 74.5] },
};

// Safe fallback coordinates:
// 1) District centroid from MH_DISTRICT_BOUNDS (preferred)
// 2) Maharashtra centroid (never Mumbai-specific)
const getDistrictFallbackCoordinates = (district, state = "Maharashtra") => {
  const districtNorm = String(district || "").toLowerCase().trim();
  const districtKey = Object.keys(MH_DISTRICT_BOUNDS).find(
    (k) => k.toLowerCase() === districtNorm
  );
  if (districtKey) {
    const b = MH_DISTRICT_BOUNDS[districtKey];
    return {
      lat: (b.sw[0] + b.ne[0]) / 2,
      lng: (b.sw[1] + b.ne[1]) / 2,
      source: "district-bounds-center",
    };
  }

  if (String(state || "").toLowerCase().includes("maharashtra")) {
    return {
      lat: 19.7515,
      lng: 75.7139,
      source: "state-center",
    };
  }

  return {
    lat: 20.5937,
    lng: 78.9629,
    source: "india-center",
  };
};

const geocodeLocation = async (village, taluka, district, state = "Maharashtra", retryCount = 0) => {
  // Keep geocoding snappy in UI; avoid long duplicate retries.
  const maxRetries = 0;
  
  // Helper function to normalize strings for comparison
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '') // Remove special characters for better matching
      .replace(/\b(village|vil|vlg|taluka|tal|district|dist|state)\b/gi, ''); // Remove common abbreviations
  };
  
  // Enhanced matching function - prioritizes exact and near-exact matches
  const matches = (str1, str2, strict = false) => {
    if (!str1 || !str2) return false;
    const n1 = normalize(str1);
    const n2 = normalize(str2);
    
    // Exact match is best
    if (n1 === n2) return { match: true, confidence: 1.0 };
    
    // For strict matching (village/taluka), require high similarity
    if (strict) {
      // Check if strings are very similar (85%+ similarity)
      const similarity = calculateSimilarity(n1, n2);
      if (similarity >= 0.85) {
        return { match: true, confidence: similarity };
      }
      
      // Check if one contains the other (for compound names like "New Village Name")
      if (n1.includes(n2) || n2.includes(n1)) {
        const shorter = Math.min(n1.length, n2.length);
        const longer = Math.max(n1.length, n2.length);
        const containmentRatio = shorter / longer;
        if (containmentRatio >= 0.8) {
          return { match: true, confidence: containmentRatio };
        }
      }
      
      return { match: false, confidence: 0 };
    }
    
    // For non-strict matching, be more lenient
    const similarity = calculateSimilarity(n1, n2);
    return { match: similarity >= 0.7, confidence: similarity };
  };
  
  // Calculate string similarity using Levenshtein distance
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };
  
  // Levenshtein distance calculation
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };
  
  // Helper function to check if village name appears in address (VERY STRICT)
  const villageInAddress = (village, addressText, components) => {
    if (!village || !addressText) return { found: false, confidence: 0 };
    const villageNorm = normalize(village);
    const addressNorm = normalize(addressText);
    
    // First check: exact match in address
    if (addressNorm.includes(villageNorm)) {
      return { found: true, confidence: 1.0 };
    }
    
    // Second check: village words match
    const villageWords = villageNorm.split(/\s+/).filter(w => w.length > 2);
    if (villageWords.length === 0) return { found: false, confidence: 0 };
    
    let matchedWords = 0;
    for (const word of villageWords) {
      if (addressNorm.includes(word)) {
        matchedWords++;
      }
    }
    
    const wordMatchRatio = matchedWords / villageWords.length;
    if (wordMatchRatio >= 0.8) {
      return { found: true, confidence: wordMatchRatio };
    }
    
    // Third check: in address components
    if (components) {
      for (const component of components) {
        const longName = normalize(component.long_name || '');
        const shortName = normalize(component.short_name || '');
        const longMatch = matches(village, longName, true);
        const shortMatch = matches(village, shortName, true);
        
        if (longMatch.match || shortMatch.match) {
          return { found: true, confidence: Math.max(longMatch.confidence, shortMatch.confidence) };
        }
      }
    }
    
    return { found: false, confidence: 0 };
  };
  
  // Helper function to find component in all address components (comprehensive search)
  const findComponentInAll = (components, searchTerm, strict = false) => {
    const searchNorm = normalize(searchTerm);
    let bestMatch = null;
    let bestConfidence = 0;
    
    // Check all components, not just specific types
    for (const component of components) {
      const longName = normalize(component.long_name || '');
      const shortName = normalize(component.short_name || '');
      
      // Check long name
      const longMatch = matches(longName, searchTerm, strict);
      if (longMatch.match && longMatch.confidence > bestConfidence) {
        bestConfidence = longMatch.confidence;
        bestMatch = { name: component.long_name, confidence: longMatch.confidence };
      }
      
      // Check short name
      const shortMatch = matches(shortName, searchTerm, strict);
      if (shortMatch.match && shortMatch.confidence > bestConfidence) {
        bestConfidence = shortMatch.confidence;
        bestMatch = { name: component.short_name, confidence: shortMatch.confidence };
      }
      
      // Also check if search term is contained in component name
      if (longName.includes(searchNorm) || searchNorm.includes(longName)) {
        const containmentRatio = Math.min(longName.length, searchNorm.length) / Math.max(longName.length, searchNorm.length);
        if (containmentRatio >= 0.7 && containmentRatio > bestConfidence) {
          bestConfidence = containmentRatio;
          bestMatch = { name: component.long_name, confidence: containmentRatio };
        }
      }
    }
    
    return bestMatch;
  };

  // Enhanced scoring function - PRIORITIZES VILLAGE AND TALUKA MATCHES
  const scoreResult = (result, village, taluka, district, state) => {
    const components = result.address_components || [];
    const formattedAddress = (result.formatted_address || "").toLowerCase();
    let score = 0;
    let matchedComponents = [];
    let confidenceScores = {};
    
    // Extract components with priority order
    const resultState = components.find(c => 
      c.types.includes('administrative_area_level_1')
    )?.long_name || "";
    
    const resultDistrict = components.find(c => 
      c.types.includes('administrative_area_level_2') || 
      c.types.includes('sublocality_level_1')
    )?.long_name || "";
    
    // Try multiple component types for taluka - ENHANCED SEARCH
    let resultTaluka = components.find(c => 
      c.types.includes('administrative_area_level_3') ||
      c.types.includes('locality') ||
      c.types.includes('sublocality') ||
      c.types.includes('sublocality_level_1')
    )?.long_name || "";
    
    // If not found in specific types, search ALL components for taluka
    if (!resultTaluka || !matches(resultTaluka, taluka, false).match) {
      const talukaInAll = findComponentInAll(components, taluka, false);
      if (talukaInAll && talukaInAll.confidence >= 0.7) {
        resultTaluka = talukaInAll.name;
      }
    }
    
    // Try multiple component types for village
    const resultVillage = components.find(c => 
      c.types.includes('sublocality_level_2') ||
      c.types.includes('neighborhood') ||
      c.types.includes('political') ||
      c.types.includes('locality')
    )?.long_name || "";
    
    // PRIORITY 1: Village match (CRITICAL - highest weight)
    const villageMatch = matches(resultVillage, village, true);
    const villageInAddr = villageInAddress(village, formattedAddress, components);
    
    if (villageMatch.match) {
      score += 100; // Highest weight for village
      matchedComponents.push('village');
      confidenceScores.village = villageMatch.confidence;
    } else if (villageInAddr.found) {
      score += 80; // High weight for village found in address
      matchedComponents.push('village');
      confidenceScores.village = villageInAddr.confidence;
    }
    
    // PRIORITY 2: Taluka match (CRITICAL - high weight) - ENHANCED
    const talukaMatch = matches(resultTaluka, taluka, false); // Less strict for taluka
    if (talukaMatch.match) {
      score += 80; // Very high weight for taluka
      matchedComponents.push('taluka');
      confidenceScores.taluka = talukaMatch.confidence;
    } else {
      // Check in formatted address more thoroughly
      const talukaNorm = normalize(taluka);
      const addrNorm = normalize(formattedAddress);
      
      // Check if taluka appears as whole word or significant part
      if (addrNorm.includes(talukaNorm)) {
        // Calculate how significant the match is
        const talukaWords = talukaNorm.split(/\s+/).filter(w => w.length > 2);
        let matchedWords = 0;
        for (const word of talukaWords) {
          if (addrNorm.includes(word)) {
            matchedWords++;
          }
        }
        const wordMatchRatio = talukaWords.length > 0 ? matchedWords / talukaWords.length : 0;
        
        if (wordMatchRatio >= 0.7) {
          score += 60; // Good weight if found in address
          matchedComponents.push('taluka');
          confidenceScores.taluka = wordMatchRatio;
        }
      }
      
      // Also check all components for taluka match
      const talukaInAll = findComponentInAll(components, taluka, false);
      if (talukaInAll && talukaInAll.confidence >= 0.7 && !matchedComponents.includes('taluka')) {
        score += 70; // High weight if found in any component
        matchedComponents.push('taluka');
        confidenceScores.taluka = talukaInAll.confidence;
      }
    }
    
    // PRIORITY 3: District match (important but not critical) - ENHANCED
    const districtMatch = matches(resultDistrict, district, false);
    if (districtMatch.match) {
      score += 40;
      matchedComponents.push('district');
      confidenceScores.district = districtMatch.confidence;
    } else {
      // Check in formatted address
      const districtNorm = normalize(district);
      const addrNorm = normalize(formattedAddress);
      
      if (addrNorm.includes(districtNorm)) {
        score += 30; // Good weight if found in address
        matchedComponents.push('district');
        confidenceScores.district = 0.75;
      } else {
        // Search all components for district
        const districtInAll = findComponentInAll(components, district, false);
        if (districtInAll && districtInAll.confidence >= 0.7) {
          score += 35;
          matchedComponents.push('district');
          confidenceScores.district = districtInAll.confidence;
        }
      }
    }
    
    // PRIORITY 4: State match (required but low weight)
    const stateMatch = matches(resultState, state, false);
    if (stateMatch.match || formattedAddress.includes(normalize(state))) {
      score += 10;
      matchedComponents.push('state');
      confidenceScores.state = stateMatch.match ? stateMatch.confidence : 0.5;
    }
    
    // Bonus: If both village AND taluka match, add bonus points
    if (matchedComponents.includes('village') && matchedComponents.includes('taluka')) {
      score += 50; // Big bonus for perfect match
    }
    
    // Additional bonus: If village + taluka + district all match
    if (matchedComponents.includes('village') && matchedComponents.includes('taluka') && matchedComponents.includes('district')) {
      score += 30; // Extra bonus for complete match
    }
    
    return { score, matchedComponents, confidenceScores };
  };
  
  try {
    // Strategy 1: Try Google Maps API FIRST with IMPROVED ACCURACY
    if (GOOGLE_MAPS_API_KEY) {
      // Queries ordered District → Taluka → Village so Google locks onto the right
      // administrative area BEFORE looking for the village name.
      // This prevents "Sonala in Mumbai" when we asked for "Sonala, Jamner, Jalgaon".
      const googleQueries = [
        `${village}, ${taluka}, ${district}, ${state}, India`,                                    // exact place first
        `${district}, ${taluka}, ${village}, ${state}, India`,                                    // district-first anchor
        `${district} district, ${taluka} taluka, ${village} village, ${state}, India`,            // explicit labels
        `${district}, ${taluka}, ${state}, India`,                                                 // taluka anchor (no village)
      ];

      // Bounding box for the district — applied to ALL queries (not just some)
      const districtKey = Object.keys(MH_DISTRICT_BOUNDS).find(
        k => k.toLowerCase() === district.toLowerCase().trim()
      );
      const districtBounds = districtKey ? MH_DISTRICT_BOUNDS[districtKey] : null;
      const boundsParam = districtBounds
        ? `&bounds=${districtBounds.sw[0]},${districtBounds.sw[1]}|${districtBounds.ne[0]},${districtBounds.ne[1]}`
        : "";
      // Always restrict to the correct district + India for every query
      const componentsStrict = `&components=administrative_area:${encodeURIComponent(district)}|country:IN`;

      let bestResult = null;
      let bestScore = 0;
      const allResults = [];
      
      for (const [queryIdx, query] of googleQueries.entries()) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          // Apply district bounds + components to ALL queries
          const compParam = componentsStrict;
          const bParam = boundsParam;

          // Use geocoding API with better parameters
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=in${compParam}${bParam}&language=en`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
              // Collect all results for comprehensive scoring
              for (const result of data.results) {
                const components = result.address_components || [];
                
                // Check if result is in India
                const isInIndia = components.some(c => 
                  c.types.includes('country') && c.short_name === 'IN'
                );
                
                if (!isInIndia) continue;
                
                // Enhanced component extraction for Indian addresses
                const extractedComponents = {
                  state: components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
                  district: components.find(c => 
                    c.types.includes('administrative_area_level_2') || 
                    c.types.includes('sublocality_level_1')
                  )?.long_name || '',
                  taluka: components.find(c => 
                    c.types.includes('administrative_area_level_3') ||
                    c.types.includes('locality') ||
                    c.types.includes('sublocality') ||
                    c.types.includes('sublocality_level_1') ||
                    c.types.includes('postal_town')
                  )?.long_name || '',
                  village: components.find(c => 
                    c.types.includes('sublocality_level_2') ||
                    c.types.includes('neighborhood') ||
                    c.types.includes('political') ||
                    c.types.includes('locality') ||
                    c.types.includes('sublocality')
                  )?.long_name || '',
                  formatted: result.formatted_address || ''
                };
                
                const { score, matchedComponents, confidenceScores } = scoreResult(
                  result, 
                  village, 
                  taluka, 
                  district, 
                  state
                );
                
                // Enhanced validation - BALANCED matching for village, taluka, and district
                const hasVillageMatch = matchedComponents.includes('village');
                const hasDistrictMatch = matchedComponents.includes('district');
                const hasTalukaMatch = matchedComponents.includes('taluka');
                const villageConf = confidenceScores?.village || 0;
                const talukaConf = confidenceScores?.taluka || 0;
                const districtConf = confidenceScores?.district || 0;

                // ── STRICT HIERARCHY GATE ─────────────────────────────────────────
                // Level 1: State must match  (hard reject if wrong state)
                // Level 2: District must match (hard reject if wrong district)
                // Level 3: Taluka preferred
                // Level 4: Village preferred (most specific)
                // ------------------------------------------------------------------
                const districtIsKnown = district && district !== "Unknown";
                const resultStateStr = (components.find(c =>
                  c.types.includes('administrative_area_level_1'))?.long_name || "").toLowerCase();
                const resultDistrictStr = (components.find(c =>
                  c.types.includes('administrative_area_level_2'))?.long_name || "").toLowerCase();
                const formattedLower = (result.formatted_address || "").toLowerCase();

                // Level 1 — State
                const stateIsOk = !resultStateStr ||
                  resultStateStr.includes(state.toLowerCase()) ||
                  (resultStateStr && state.toLowerCase().includes(resultStateStr));

                // Level 2 — District (hard gate when district is known)
                // Guard: empty resultDistrictStr must NOT pass — "jalgaon".includes("") = true in JS
                const districtIsOk = !districtIsKnown ||
                  hasDistrictMatch ||
                  (resultDistrictStr && resultDistrictStr.includes(district.toLowerCase())) ||
                  (resultDistrictStr && district.toLowerCase().includes(resultDistrictStr)) ||
                  formattedLower.includes(district.toLowerCase());

                // Extra safety: reject if formatted address contains a known non-Jalgaon major city
                const KNOWN_OTHER_CITIES = ["mumbai", "pune", "nashik", "nagpur", "aurangabad", "solapur", "kolhapur", "thane", "navi mumbai"];
                const isWrongCity = KNOWN_OTHER_CITIES.some(city =>
                  formattedLower.includes(city) && !formattedLower.includes(district.toLowerCase())
                );

                // Accept ANY result that passes state + district and is not a wrong city.
                // Taluka and village are used only for ranking (higher = better).
                const isValidResult = stateIsOk && districtIsOk && !isWrongCity;
                
                if (isValidResult) {
                  // Assign a hierarchy tier so we pick the most specific result
                  // Tier 4 = village+taluka+district, Tier 3 = village+taluka,
                  // Tier 2 = village+district, Tier 1 = taluka+district, Tier 0 = district only
                  let tier = 0;
                  if (hasVillageMatch && hasTalukaMatch && hasDistrictMatch) tier = 4;
                  else if (hasVillageMatch && hasTalukaMatch) tier = 3;
                  else if (hasVillageMatch && hasDistrictMatch) tier = 2;
                  else if (hasTalukaMatch && hasDistrictMatch) tier = 1;

                  allResults.push({
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    score,
                    tier,
                    matchedComponents,
                    confidenceScores,
                    extractedComponents,
                    result,
                    formatted: result.formatted_address
                  });
                  
                  if (score > bestScore) {
                    bestScore = score;
                    bestResult = {
                      lat: result.geometry.location.lat,
                      lng: result.geometry.location.lng,
                      score,
                      tier,
                      matchedComponents,
                      confidenceScores,
                      extractedComponents,
                      result
                    };
                  }
                }
              }
            } else if (data.status === 'ZERO_RESULTS') {
              continue;
            }
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.log(`Geocoding query failed: ${err.message}`);
          }
        }
      }
      
      // ── Pick best result using strict hierarchy ────────────────────────────
      // Priority: Tier 4 (village+taluka+district) > Tier 3 > Tier 2 > Tier 1 > Tier 0
      // Within same tier, highest confidence wins.
      if (allResults.length > 1) {
        allResults.sort((a, b) => {
          if (b.tier !== a.tier) return b.tier - a.tier;           // higher tier first
          const aConf = (a.confidenceScores?.village || 0) +
                        (a.confidenceScores?.taluka  || 0) +
                        (a.confidenceScores?.district|| 0);
          const bConf = (b.confidenceScores?.village || 0) +
                        (b.confidenceScores?.taluka  || 0) +
                        (b.confidenceScores?.district|| 0);
          if (bConf !== aConf) return bConf - aConf;
          return b.score - a.score;
        });
        bestResult = allResults[0];
        bestScore  = bestResult.score;
      }
      
      // Return best result if we found a good match
      if (bestResult) {
        const tier = bestResult.tier ?? 0;
        let accuracy;
        if (tier >= 4)       accuracy = 'high';    // village + taluka + district ✅
        else if (tier === 3) accuracy = 'high';    // village + taluka ✅
        else if (tier === 2) accuracy = 'medium';  // village + district
        else if (tier === 1) accuracy = 'medium';  // taluka + district
        else                 accuracy = 'low';     // district only

        // Log what we found
        const tierLabel = ['district-only','taluka+district','village+district','village+taluka','village+taluka+district'][tier] || 'unknown';
        console.log(`📍 Geocoded "${village}, ${taluka}, ${district}" → tier ${tier} (${tierLabel}) | ${bestResult.result?.formatted_address}`);
        if (tier < 3) console.warn(`⚠️ Partial match for "${village}, ${taluka}, ${district}". Level: ${tierLabel}`);
        
        return {
          lat: bestResult.lat,
          lng: bestResult.lng,
          accuracy,
          source: 'google',
          score: bestScore,
          matched: bestResult.matchedComponents.join(', '),
          confidenceScores: bestResult.confidenceScores
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
    const osmQueries = [
      `${district}, ${taluka}, ${village}, ${state}, India`,
      `${village}, ${taluka}, ${district}, ${state}, India`,
      `${district}, ${taluka}, ${state}, India` // Fallback without village
    ];

    // Build Nominatim viewbox from district bounds for geographic bias
    const districtKeyOsm = Object.keys(MH_DISTRICT_BOUNDS).find(
      k => k.toLowerCase() === district.toLowerCase().trim()
    );
    const districtBoundsOsm = districtKeyOsm ? MH_DISTRICT_BOUNDS[districtKeyOsm] : null;
    // Nominatim viewbox format: left,top,right,bottom (west,north,east,south)
    const viewboxParam = districtBoundsOsm
      ? `&viewbox=${districtBoundsOsm.sw[1]},${districtBoundsOsm.ne[0]},${districtBoundsOsm.ne[1]},${districtBoundsOsm.sw[0]}&bounded=1`
      : "&countrycodes=in";
    
    for (const query of osmQueries) {
      try {
        // Enhanced query with Indian-specific parameters (bounded to district when known)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&countrycodes=in&addressdetails=1&extratags=1&namedetails=1&accept-language=en${viewboxParam}`,
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
              
              // Village match (highest weight - most specific, REQUIRED)
              const villageMatch = matches(resultVillage, village) || villageInAddress(village, displayName, null);
              if (villageMatch) {
                score += 50;
                matchedComponents.push('village');
              }
              
              return { ...result, score, matchedComponents };
            }).sort((a, b) => b.score - a.score);
            
            // Find best result - prioritize village+district+taluka first, then village alone
            const hasVillageMatch = scoredResults.find(r =>
              r.matchedComponents.includes('village') &&
              r.matchedComponents.includes('district')
            );
            const villageOnlyMatch = scoredResults.find(r => r.matchedComponents.includes('village'));
            const bestMatch = hasVillageMatch || scoredResults.find(r => 
              r.score >= 40 && 
              r.matchedComponents.includes('district') && 
              r.matchedComponents.includes('taluka')
            ) || (villageOnlyMatch?.score >= 50 ? villageOnlyMatch : null);
            
            if (bestMatch) {
              // Determine accuracy based on score and matched components
              let accuracy = 'low';
              const hasVillage = bestMatch.matchedComponents.includes('village');
              const hasDistrict = bestMatch.matchedComponents.includes('district');
              const hasTaluka = bestMatch.matchedComponents.includes('taluka');
              
              if (hasVillage && hasDistrict) {
                // Village + District = high accuracy (covers both with and without taluka)
                accuracy = 'high';
              } else if (hasDistrict && hasTaluka && bestMatch.score >= 70) {
                // District + Taluka = medium-high accuracy (no village match)
                accuracy = 'medium';
              } else if (bestMatch.score >= 40) {
                accuracy = 'medium';
              } else {
                accuracy = 'low';
              }
              
              // If no village match found, log warning
              if (!hasVillage) {
                console.warn(`⚠️ OSM: No village match for "${village}" in ${taluka}, ${district}. Found: ${bestMatch.matchedComponents.join(', ')}`);
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
    
    // Strategy 4: OSM Overpass API — searches for the village node by name within district bounding box.
    // This is the most reliable source for small Indian villages that aren't in Nominatim text search.
    try {
      const districtKeyOv = Object.keys(MH_DISTRICT_BOUNDS).find(
        k => k.toLowerCase() === district.toLowerCase().trim()
      );
      const dBounds = districtKeyOv ? MH_DISTRICT_BOUNDS[districtKeyOv] : null;

      if (dBounds) {
        // Escape the village name for Overpass regex
        const villageEsc = village.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // sw[0]=lat_min, sw[1]=lng_min, ne[0]=lat_max, ne[1]=lng_max
        const bbox = `${dBounds.sw[0]},${dBounds.sw[1]},${dBounds.ne[0]},${dBounds.ne[1]}`;
        const overpassQuery = `[out:json][timeout:15];(node["name"~"^${villageEsc}$",i]["place"~"village|hamlet|locality|neighbourhood|town"](${bbox});way["name"~"^${villageEsc}$",i]["place"~"village|hamlet|locality|neighbourhood"](${bbox});relation["name"~"^${villageEsc}$",i]["place"~"village|hamlet|locality|neighbourhood"](${bbox}););out center;`;

        const ovResponse = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
          {
            headers: { 'User-Agent': 'NurseryManagementApp/1.0' },
            signal: AbortSignal.timeout(15000),
          }
        );

        if (ovResponse.ok) {
          const ovData = await ovResponse.json();
          const elements = ovData?.elements || [];

          // Score each result: prefer those whose display name contains both taluka & district
          const scored = elements.map(el => {
            const lat = el.lat ?? el.center?.lat;
            const lng = el.lon ?? el.center?.lon;
            if (!lat || !lng) return null;
            const name = (el.tags?.name || "").toLowerCase();
            const displayParts = [
              el.tags?.["addr:village"],
              el.tags?.["addr:city"],
              el.tags?.["addr:district"],
              el.tags?.["addr:state"],
            ].filter(Boolean).join(" ").toLowerCase();
            let sc = 0;
            if (name.includes(normalize(village))) sc += 60;
            if (displayParts.includes(normalize(taluka)) || (el.tags?.["addr:city"] || "").toLowerCase().includes(normalize(taluka))) sc += 30;
            if (displayParts.includes(normalize(district)) || (el.tags?.["addr:district"] || "").toLowerCase().includes(normalize(district))) sc += 20;
            return { lat, lng, sc };
          }).filter(Boolean).sort((a, b) => b.sc - a.sc);

          if (scored.length > 0) {
            const best = scored[0];
            return {
              lat: best.lat,
              lng: best.lng,
              accuracy: 'high',
              source: 'overpass',
              score: best.sc,
              matched: 'village(overpass)',
            };
          }
        }
      }
    } catch (ovErr) {
      // Continue to retry
    }

    // Strategy 4b: Nominatim structured search (city + county + state).
    // Uses structured address fields which are better for small villages than free-text q=.
    try {
      const structuredUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=10&countrycodes=in&addressdetails=1` +
        `&city=${encodeURIComponent(village)}` +
        `&county=${encodeURIComponent(district)}` +
        `&state=${encodeURIComponent(state)}` +
        `&country=India`;

      const structResp = await fetch(structuredUrl, {
        headers: { 'User-Agent': 'NurseryManagementApp/1.0', 'Accept-Language': 'en' },
        signal: AbortSignal.timeout(8000),
      });

      if (structResp.ok) {
        const structData = await structResp.json();
        if (structData?.length > 0) {
          const first = structData[0];
          const addr = first.address || {};
          const inDistrict =
            (addr.county || addr.state_district || addr.district || "").toLowerCase().includes(district.toLowerCase()) ||
            (first.display_name || "").toLowerCase().includes(district.toLowerCase());
          const inTaluka =
            (first.display_name || "").toLowerCase().includes(taluka.toLowerCase());

          if (inDistrict) {
            return {
              lat: parseFloat(first.lat),
              lng: parseFloat(first.lon),
              accuracy: inTaluka ? 'high' : 'medium',
              source: 'nominatim-structured',
              matched: inTaluka ? 'village,taluka,district' : 'village,district',
            };
          }
        }
      }
    } catch (structErr) {
      // Fall through to retry
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
    
    // Final non-Mumbai fallback
    const fallback = getDistrictFallbackCoordinates(district, state);
    return {
      lat: fallback.lat,
      lng: fallback.lng,
      accuracy: 'fallback',
      source: fallback.source,
    };
    
  } catch (error) {
    console.error(`Error geocoding ${village}, ${taluka}, ${district}:`, error);
    // Return district/state center as fallback (never hardcoded Mumbai)
    const fallback = getDistrictFallbackCoordinates(district, state);
    return {
      lat: fallback.lat,
      lng: fallback.lng,
      accuracy: 'error',
      source: fallback.source,
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

// ─── OSRM (Open Source Routing Machine) ──────────────────────────────────────
// Completely free, no API key required, uses real OpenStreetMap road data.
// Public demo server: https://router.project-osrm.org
// /trip endpoint solves TSP and returns the optimal visit order + road polyline.
// /route endpoint returns road polyline for a fixed waypoint order.
const OSRM_BASE_URL = "https://router.project-osrm.org";
const OSRM_MAX_WAYPOINTS = 100; // public server practical limit

/**
 * Solve TSP and return optimised visit order + road polyline using OSRM /trip.
 * @param {{lat: number, lng: number}[]} waypoints
 * @returns {Promise<{orderedIndices: number[], distanceKm: number, durationMin: number, polyline: [number,number][]} | null>}
 */
const getOSRMTrip = async (waypoints) => {
  if (!waypoints || waypoints.length < 2) return null;
  const limited = waypoints.slice(0, OSRM_MAX_WAYPOINTS);
  const coordStr = limited.map(w => `${w.lng},${w.lat}`).join(";");
  try {
    const res = await fetch(
      `${OSRM_BASE_URL}/trip/v1/driving/${coordStr}?roundtrip=false&source=first&destination=last&steps=false&geometries=geojson&overview=full`,
      { signal: AbortSignal.timeout(20000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.trips?.length) return null;
    const trip = data.trips[0];
    const wpts = data.waypoints || [];
    // orderedIndices[visitOrder] = originalIndex
    const orderedIndices = new Array(limited.length);
    wpts.forEach((wp, origIdx) => {
      if (wp.waypoint_index != null) orderedIndices[wp.waypoint_index] = origIdx;
    });
    const cleanIndices = orderedIndices.filter(i => i !== undefined);
    const polyline = trip.geometry?.coordinates
      ? trip.geometry.coordinates.map(c => [c[1], c[0]]) // → [lat, lng] for Leaflet
      : null;
    return {
      orderedIndices: cleanIndices,
      distanceKm: (trip.distance || 0) / 1000,
      durationMin: (trip.duration || 0) / 60,
      polyline,
    };
  } catch (err) {
    console.warn("OSRM /trip failed:", err.message);
    return null;
  }
};

/**
 * Get real road polyline for a fixed waypoint sequence using OSRM /route.
 * @param {{lat: number, lng: number}[]} waypoints
 * @returns {Promise<{polyline: [number,number][], distanceKm: number, durationMin: number} | null>}
 */
const getOSRMRoute = async (waypoints) => {
  if (!waypoints || waypoints.length < 2) return null;
  const limited = waypoints.slice(0, OSRM_MAX_WAYPOINTS);
  const coordStr = limited.map(w => `${w.lng},${w.lat}`).join(";");
  try {
    const res = await fetch(
      `${OSRM_BASE_URL}/route/v1/driving/${coordStr}?steps=false&geometries=geojson&overview=full`,
      { signal: AbortSignal.timeout(20000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    return {
      polyline: route.geometry?.coordinates
        ? route.geometry.coordinates.map(c => [c[1], c[0]])
        : null,
      distanceKm: (route.distance || 0) / 1000,
      durationMin: (route.duration || 0) / 60,
    };
  } catch (err) {
    console.warn("OSRM /route failed:", err.message);
    return null;
  }
};
// ─────────────────────────────────────────────────────────────────────────────

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

const OrderMapView = ({ orders = [], onClose }) => {
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
  const [vehicleCapacity, setVehicleCapacity] = useState(""); // Keep for backward compatibility
  const [vehicles, setVehicles] = useState([]); // Vehicles from CMS
  const [selectedVehicle, setSelectedVehicle] = useState(null); // Selected vehicle (single, kept for manual-mode compat)
  const [selectedVehicles, setSelectedVehicles] = useState([]); // Multi-vehicle fleet selection
  const [loadingVehicles, setLoadingVehicles] = useState(false);
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
  const [currentRoutePolyline, setCurrentRoutePolyline] = useState(null); // Road polyline for current route (OSRM)
  const [selectedRouteDetails, setSelectedRouteDetails] = useState(null); // Selected route for details dialog
  const [showRouteDetailsDialog, setShowRouteDetailsDialog] = useState(false); // Show route details dialog
  const [editingLocation, setEditingLocation] = useState(null); // Location being edited/dragged
  const [draggedCoordinates, setDraggedCoordinates] = useState(null); // Temporary coordinates while dragging
  const [mapLoadError, setMapLoadError] = useState(false); // Track if map failed to load
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'table' or 'list'
  const [locationErrors, setLocationErrors] = useState(new Map()); // Track location geocoding errors
  const [manualLocationCorrections, setManualLocationCorrections] = useState(new Map()); // Manual location corrections
  const [routeCreationMode, setRouteCreationMode] = useState('auto'); // 'auto', 'manual', or 'hybrid'
  const [showRouteWizard, setShowRouteWizard] = useState(false); // Show route creation wizard
  const [routeStep, setRouteStep] = useState(1); // Current step in route wizard
  const [mapClickMode, setMapClickMode] = useState(false); // Enable map click to set coordinates
  const [locationForCoordinateEdit, setLocationForCoordinateEdit] = useState(null); // Location being edited via map click
  const [clickedCoordinates, setClickedCoordinates] = useState(null); // Coordinates from map click
  const [showCoordinateConfirmDialog, setShowCoordinateConfirmDialog] = useState(false); // Show confirmation dialog
  const [editingRouteId, setEditingRouteId] = useState(null); // Route being edited
  const [showAddStopDialog, setShowAddStopDialog] = useState(false); // Show dialog to add stop to route
  const [routeForStopAddition, setRouteForStopAddition] = useState(null); // Route to add stop to
  const [villageSearchQuery, setVillageSearchQuery] = useState(""); // Search query for village selection
  const [searchingLocation, setSearchingLocation] = useState(false); // Searching for any location
  const [geocodedLocation, setGeocodedLocation] = useState(null); // Geocoded location from search
  const [showRouteAlternatives, setShowRouteAlternatives] = useState(false); // Show alternative routes dialog
  const [routeAlternatives, setRouteAlternatives] = useState([]); // Alternative routes for comparison
  const [selectedRouteForAlternatives, setSelectedRouteForAlternatives] = useState(null); // Route to show alternatives for
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
      const plantName = (typeof order.plantType === "string" ? order.plantType : order.plantType?.name) || order.plantName;
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
          const plantName = (typeof order.plantType === "string" ? order.plantType : order.plantType?.name) || order.plantName;
          return plantName === selectedPlantFilter;
        })
    ).filter(order => {
      // Exclude orders that are already assigned to saved routes
      const orderId = order._id || order.id;
      return !assignedOrderIds.has(orderId);
    });
    
    filteredOrders.forEach(order => {
      // Location extraction — try all shapes produced by FarmerOrdersTable and the API:
      // 1. Regular nursery orders: details.farmer.{village, taluka, district}
      // 2. Agri Sales orders:      details.{customerVillage, customerTaluka, customerDistrict}
      // 3. Direct top-level farmer (legacy / DispatchedListPage usage)
      const df = order.details?.farmer;
      const village =
        df?.village ||
        df?.villageName ||
        order.details?.customerVillage ||
        order.farmer?.village ||
        "Unknown";
      const taluka =
        df?.taluka ||
        df?.talukaName ||
        order.details?.customerTaluka ||
        order.farmer?.taluka ||
        order.farmer?.talukaName ||
        "Unknown";
      const district =
        df?.district ||
        df?.districtName ||
        order.details?.customerDistrict ||
        order.farmer?.district ||
        order.farmer?.districtName ||
        "Unknown";
      const state =
        df?.state ||
        df?.stateName ||
        order.farmer?.state ||
        order.farmer?.stateName ||
        "Maharashtra";
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
  const boundsFittedRef = useRef(false); // Track if bounds have been fitted initially
  const geocodeCacheRef = useRef(new Map()); // key -> coordinates cache (in-memory)

  // Warm cache from browser storage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem("orderMapGeocodeCacheV1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        geocodeCacheRef.current = new Map(Object.entries(parsed));
      }
    } catch (e) {
      // ignore malformed cache
    }
  }, []);

  // Geocode locations with progress tracking
  useEffect(() => {
    const geocodeLocations = async () => {
      if (groupedOrders.length === 0) {
        setGeocodingProgress({ current: 0, total: 0, isGeocoding: false });
        geocodingInProgressRef.current = false;
        boundsFittedRef.current = false; // Reset when no orders
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
      boundsFittedRef.current = false; // Reset bounds fitting flag for new geocoding

      setGeocodingProgress({ current: 0, total: groupedOrders.length, isGeocoding: true });
      const geocoded = [];
      
      // If using Google Maps (has API key), process larger batches for speed.
      // If using OpenStreetMap only, keep conservative pace.
      const useGoogleMaps = !!GOOGLE_MAPS_API_KEY;
      const batchSize = useGoogleMaps ? 8 : 2;
      const delayBetweenBatches = useGoogleMaps ? 120 : 450;
      
      try {
        for (let i = 0; i < groupedOrders.length; i += batchSize) {
          const batch = groupedOrders.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (group) => {
            try {
              const cacheKey = `${(group.village || "").toLowerCase().trim()}|${(group.taluka || "").toLowerCase().trim()}|${(group.district || "").toLowerCase().trim()}|${(group.state || "").toLowerCase().trim()}`;
              const cached = geocodeCacheRef.current.get(cacheKey);
              if (cached?.lat && cached?.lng) {
                return { ...group, coordinates: cached };
              }

              console.log(`[${i}/${groupedOrders.length}] Geocoding: ${group.village}, ${group.taluka}, ${group.district}`);
              const coords = await Promise.race([
                geocodeLocation(
                  group.village, 
                  group.taluka, 
                  group.district, 
                  group.state
                ),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Geocoding timeout')), 14000)
                )
              ]);
              console.log(`✓ Geocoded: ${group.village} -> ${coords.lat}, ${coords.lng} (${coords.accuracy || 'unknown'})`);

              geocodeCacheRef.current.set(cacheKey, coords);
              
              // Track location errors if accuracy is low
              if (coords.accuracy === 'low' || coords.accuracy === 'error') {
                setLocationErrors(prev => {
                  const newMap = new Map(prev);
                  newMap.set(group.key, {
                    village: group.village,
                    taluka: group.taluka,
                    district: group.district,
                    reason: coords.accuracy === 'error' ? 'Geocoding failed' : 
                           'Low accuracy match',
                    accuracy: coords.accuracy
                  });
                  return newMap;
                });
              } else {
                // Clear error if geocoding succeeded
                setLocationErrors(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(group.key);
                  return newMap;
                });
              }
              
              return { ...group, coordinates: coords };
            } catch (error) {
              console.error(`✗ Error geocoding ${group.village}:`, error.message);
              
              // Track the error
              setLocationErrors(prev => {
                const newMap = new Map(prev);
                newMap.set(group.key, {
                  village: group.village,
                  taluka: group.taluka,
                  district: group.district,
                  reason: error.message || 'Geocoding timeout',
                  accuracy: 'error'
                });
                return newMap;
              });
              
              // Fast fallback: use district/state center immediately (no extra API call)
              const safeFallback = getDistrictFallbackCoordinates(group.district, group.state);
              geocodeCacheRef.current.set(
                `${(group.village || "").toLowerCase().trim()}|${(group.taluka || "").toLowerCase().trim()}|${(group.district || "").toLowerCase().trim()}|${(group.state || "").toLowerCase().trim()}`,
                {
                  lat: safeFallback.lat,
                  lng: safeFallback.lng,
                  accuracy: 'fallback',
                  source: safeFallback.source,
                }
              );
              return {
                ...group,
                coordinates: {
                  lat: safeFallback.lat,
                  lng: safeFallback.lng,
                  accuracy: 'fallback',
                  source: safeFallback.source
                }
              };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          geocoded.push(...batchResults);
          
          // Update progress only (don't update locationGroups yet to prevent map refresh)
          setGeocodingProgress({ 
            current: geocoded.length, 
            total: groupedOrders.length, 
            isGeocoding: true 
          });
          
          // Wait between batches to respect rate limits
          if (i + batchSize < groupedOrders.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
          }
        }
        
        console.log(`✓ Geocoding complete: ${geocoded.length} locations`);
        // Update locationGroups only once at the end to prevent multiple map refreshes
        setLocationGroups(geocoded);
        setGeocodingProgress({ current: geocoded.length, total: groupedOrders.length, isGeocoding: false });
        setIsLoading(false);
        try {
          localStorage.setItem(
            "orderMapGeocodeCacheV1",
            JSON.stringify(Object.fromEntries(geocodeCacheRef.current))
          );
        } catch (e) {
          // ignore storage quota issues
        }
        
        // Set map center to first location or default (only if not already set)
        if (geocoded.length > 0 && geocoded[0].coordinates && !boundsFittedRef.current) {
          setMapCenter([geocoded[0].coordinates.lat, geocoded[0].coordinates.lng]);
        }
        
        // Fit bounds only once after geocoding completes (not during)
        if (!boundsFittedRef.current && geocoded.length > 0) {
          boundsFittedRef.current = true;
          // Use a longer timeout to ensure map is fully loaded
          setTimeout(() => {
            if (mapRef.current && !mapRef.current._destroyed) {
              try {
                const coords = geocoded
                  .filter(loc => loc.coordinates)
                  .map(loc => [loc.coordinates.lat, loc.coordinates.lng]);
                if (coords.length > 0) {
                  mapRef.current.fitBounds(coords, { padding: [50, 50] });
                }
              } catch (error) {
                console.error("Error fitting bounds:", error);
              }
            } else if (googleMapRef.current && window.google && window.google.maps) {
              try {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend({ lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng });
                geocoded.forEach(loc => {
                  if (loc.coordinates) {
                    bounds.extend({ lat: loc.coordinates.lat, lng: loc.coordinates.lng });
                  }
                });
                googleMapRef.current.fitBounds(bounds, { padding: 50 });
              } catch (error) {
                console.error("Error fitting bounds:", error);
              }
            }
          }, 1000); // Longer delay to ensure map is ready
        }
      } catch (error) {
        console.error('Fatal error in geocoding:', error);
        // Ensure we always complete, even on error
        const fallbackLocations = geocoded.length > 0
          ? geocoded
          : groupedOrders.map((g) => {
              const safeFallback = getDistrictFallbackCoordinates(g.district, g.state);
              return {
                ...g,
                coordinates: {
                  lat: safeFallback.lat,
                  lng: safeFallback.lng,
                  accuracy: 'error',
                  source: safeFallback.source,
                },
              };
            });
        setLocationGroups(fallbackLocations);
        setGeocodingProgress({ current: geocoded.length, total: groupedOrders.length, isGeocoding: false });
        setIsLoading(false);
        try {
          localStorage.setItem(
            "orderMapGeocodeCacheV1",
            JSON.stringify(Object.fromEntries(geocodeCacheRef.current))
          );
        } catch (e) {
          // ignore
        }
      } finally {
        geocodingInProgressRef.current = false;
      }
    };
    
    if (groupedOrders.length > 0) {
      geocodeLocations();
    } else {
      setGeocodingProgress({ current: 0, total: 0, isGeocoding: false });
      geocodingInProgressRef.current = false;
      boundsFittedRef.current = false;
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

  // Convert Leaflet-style [lat,lng] positions to Google Polyline path format.
  const toGooglePath = (positions = []) =>
    positions
      .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p) => ({ lat: p[0], lng: p[1] }));

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
      
      // Use backend endpoint to avoid CORS issues
      const instance = NetworkManager(API.MAPS.GET_DIRECTIONS);
      const response = await instance.request({
        origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
        destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
        waypoints: waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })),
        optimizeWaypoints: true,
        alternatives: true, // Request alternative routes
      });
      
      const data = response?.data?.data || response?.data;
      
      console.log('Google Directions API Response:', data);
      
      if (data && data.status === 'OK' && data.routes && data.routes.length > 0) {
        // Process all routes (including alternatives)
        const processedRoutes = data.routes.map((route, index) => {
          // Extract toll information from the route
          let totalTollCost = 0;
          let tollCurrency = 'INR';
          const tollInfo = [];
          
          // Check for fare information (includes tolls)
          if (route.fare) {
            totalTollCost = route.fare.value || 0;
            tollCurrency = route.fare.currency || 'INR';
          }
          
          // Also check legs for toll information
          if (route.legs && Array.isArray(route.legs)) {
            route.legs.forEach((leg, legIndex) => {
              // Check for toll steps in each leg
              if (leg.steps && Array.isArray(leg.steps)) {
                leg.steps.forEach((step, stepIndex) => {
                  // Check if step contains toll information
                  if (step.html_instructions && (
                    step.html_instructions.toLowerCase().includes('toll') ||
                    step.html_instructions.toLowerCase().includes('toll road')
                  )) {
                    tollInfo.push({
                      legIndex,
                      stepIndex,
                      instruction: step.html_instructions,
                      distance: step.distance?.text || 'N/A',
                    });
                  }
                });
              }
            });
          }
          
          // Calculate total distance and duration
          const totalDistance = route.legs?.reduce((sum, leg) => 
            sum + (leg.distance?.value || 0), 0) / 1000 || 0;
          const totalDuration = route.legs?.reduce((sum, leg) => 
            sum + (leg.duration?.value || 0), 0) || 0;
          
          return {
            ...route,
            request: {
              origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
              destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
              waypoints: waypoints.map(wp => ({ location: { lat: wp.lat, lng: wp.lng } })),
              travelMode: 'DRIVING',
              optimizeWaypoints: index === 0, // Only optimize first route
              alternatives: true,
            },
            // Store toll information
            tollInfo: {
              totalCost: totalTollCost,
              currency: tollCurrency,
              tollPoints: tollInfo,
              hasTolls: totalTollCost > 0 || tollInfo.length > 0,
            },
            // Store calculated metrics
            totalDistance: totalDistance,
            totalDuration: totalDuration,
            // Store the full response for DirectionsRenderer
            _fullResponse: data,
            _routeIndex: index,
          };
        });
        
        // Return the first route (optimized) but store alternatives
        const primaryRoute = processedRoutes[0];
        primaryRoute._alternatives = processedRoutes.slice(1); // Store alternative routes
        primaryRoute._allRoutes = processedRoutes; // Store all routes for comparison
        return primaryRoute;
      }
      
      console.warn('Google Directions API returned:', data?.status, data?.error_message);
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
          // Step 3: Use OSRM Trip (free TSP solver) to optimise waypoint order + get road polyline.
          // Falls back to nearest-neighbour + OSRM Route if /trip fails.
          const waypoints = [
            { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
            ...currentRoute.filter(l => l.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng })),
          ];

          const osrmTrip = await getOSRMTrip(
            // exclude the warehouse from the optimisation coordinates (it's always first)
            currentRoute.filter(l => l.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng }))
          );

          if (osrmTrip) {
            // Reorder stops based on OSRM's TSP solution
            const optimizedRoute = osrmTrip.orderedIndices.map(idx => currentRoute[idx]).filter(Boolean);
            // Full road polyline (warehouse → stops in optimised order)
            const fullWaypoints = [
              { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
              ...osrmTrip.orderedIndices
                .map(idx => currentRoute[idx])
                .filter(l => l?.coordinates)
                .map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng })),
            ];
            const osrmRouteResult = await getOSRMRoute(fullWaypoints);

            routes.push({
              locations: optimizedRoute,
              directions: null,
              polyline: null,
              osrmPolyline: osrmRouteResult?.polyline || osrmTrip.polyline || null,
              totalPlants: currentCapacity,
              totalDistance: osrmRouteResult?.distanceKm ?? osrmTrip.distanceKm,
              durationMin: osrmRouteResult?.durationMin ?? osrmTrip.durationMin,
            });
          } else {
            // Fallback: nearest-neighbour ordering + OSRM Route for polyline
            const optimized = optimizeRouteOrder(currentRoute);
            const fbWaypoints = [
              { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
              ...optimized.filter(l => l.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng })),
            ];
            const fbRoute = await getOSRMRoute(fbWaypoints);
            routes.push({
              locations: optimized,
              directions: null,
              polyline: null,
              osrmPolyline: fbRoute?.polyline || null,
              totalPlants: currentCapacity,
              totalDistance: fbRoute?.distanceKm ?? calculateRouteDistance(optimized),
              durationMin: fbRoute?.durationMin ?? null,
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

  // ── Multi-vehicle fleet optimization ──────────────────────────────────────────
  // Assigns orders to N vehicles using geographic k-means clustering + OSRM Trip
  // per vehicle for TSP-optimal stop ordering and real road polylines.
  const optimizeRoutesForFleet = async (locations, fleetVehicles) => {
    if (!fleetVehicles?.length || !locations?.length) return [];

    // Flatten locations → individual order rows with coordinates
    const orderLocs = [];
    locations.forEach(loc => {
      if (!loc.coordinates) return;
      loc.orders.forEach(order => {
        orderLocs.push({
          ...loc,
          order,
          orderPlants: order.numberOfPlants || order.totalPlants || order.quantity || 0,
          locationKey: loc.key,
        });
      });
    });
    if (orderLocs.length === 0) return [];

    const numV = fleetVehicles.length;

    // Step 1 — geographic k-means: group nearby orders into N clusters
    const clusters = kMeansClustering(orderLocs, numV);

    // Step 2 — match clusters to vehicles by size (largest cluster → largest vehicle)
    const sortedClusters = [...clusters].sort(
      (a, b) => b.reduce((s, o) => s + o.orderPlants, 0) - a.reduce((s, o) => s + o.orderPlants, 0)
    );
    const sortedVehicles = [...fleetVehicles].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));

    const routes = [];

    for (let vi = 0; vi < sortedVehicles.length; vi++) {
      const vehicle = sortedVehicles[vi];
      const cap = vehicle.capacity || 50000;
      const cluster = sortedClusters[vi] || [];
      if (cluster.length === 0) continue;

      // Step 3 — fill route to capacity (nearest stops first)
      const sorted = [...cluster].sort((a, b) =>
        calculateDistance(WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng, a.coordinates.lat, a.coordinates.lng) -
        calculateDistance(WAREHOUSE_LOCATION.lat, WAREHOUSE_LOCATION.lng, b.coordinates.lat, b.coordinates.lng)
      );

      const routeLocMap = new Map(); // locationKey → {loc, selectedOrders}
      let used = 0;
      for (const ol of sorted) {
        if (used + ol.orderPlants <= cap) {
          used += ol.orderPlants;
          if (!routeLocMap.has(ol.locationKey)) {
            const base = locations.find(l => l.key === ol.locationKey);
            if (base) routeLocMap.set(ol.locationKey, { ...base, selectedOrders: [] });
          }
          routeLocMap.get(ol.locationKey)?.selectedOrders.push(ol.order);
        }
      }

      const locArr = Array.from(routeLocMap.values());
      if (locArr.length === 0) continue;

      // Step 4 — OSRM Trip (TSP) for optimal stop order + road polyline
      const stopWaypoints = locArr.filter(l => l.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng }));
      const osrmTrip = await getOSRMTrip(stopWaypoints);

      let optimizedLocs = locArr;
      let distKm = calculateRouteDistance(locArr);
      let durMin = null;
      let osrmPolyline = null;

      if (osrmTrip) {
        optimizedLocs = osrmTrip.orderedIndices.map(i => locArr[i]).filter(Boolean);
        const fullWps = [
          { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
          ...osrmTrip.orderedIndices.map(i => locArr[i]).filter(l => l?.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng })),
        ];
        const roadResult = await getOSRMRoute(fullWps);
        osrmPolyline = roadResult?.polyline ?? osrmTrip.polyline;
        distKm = roadResult?.distanceKm ?? osrmTrip.distanceKm;
        durMin = roadResult?.durationMin ?? osrmTrip.durationMin;
      } else {
        optimizedLocs = optimizeRouteOrder(locArr);
        const fbWps = [
          { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
          ...optimizedLocs.filter(l => l.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng })),
        ];
        const fbRes = await getOSRMRoute(fbWps);
        osrmPolyline = fbRes?.polyline ?? null;
        distKm = fbRes?.distanceKm ?? distKm;
        durMin = fbRes?.durationMin ?? null;
      }

      routes.push({
        locations: optimizedLocs,
        vehicle,
        vehicleName: vehicle.name || `Vehicle ${vi + 1}`,
        vehicleNumber: vehicle.number || "",
        vehicleCapacity: cap,
        totalPlants: used,
        totalDistance: distKm,
        durationMin: durMin,
        osrmPolyline,
        directions: null,
        polyline: null,
      });
    }

    return routes;
  };
  // ──────────────────────────────────────────────────────────────────────────────
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

  // Fetch vehicles from CMS
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const instance = NetworkManager(API.VEHICLE.GET_VEHICLES);
        const response = await instance.request({});
        
        // Handle different response structures
        // Response structure: { status, message, data: { data: [...], pagination: {...} } }
        let allVehicles = [];
        if (response?.data?.data?.data) {
          // Nested structure: response.data.data.data
          allVehicles = response.data.data.data;
        } else if (response?.data?.data && Array.isArray(response.data.data)) {
          // Direct array: response.data.data
          allVehicles = response.data.data;
        } else if (response?.data && Array.isArray(response.data)) {
          // Direct array: response.data
          allVehicles = response.data;
        }
        
        // Filter for active vehicles only
        const activeVehicles = allVehicles.filter(vehicle => 
          vehicle && (vehicle.isActive !== false && vehicle.isActive !== undefined)
        );
        
        console.log("Fetched vehicles:", activeVehicles);
        setVehicles(activeVehicles);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setVehicles([]);
      } finally {
        setLoadingVehicles(false);
      }
    };
    
    fetchVehicles();
  }, []);

  // Compute OSRM road polyline whenever currentRoute changes
  useEffect(() => {
    if (!currentRoute || currentRoute.length === 0) {
      setCurrentRoutePolyline(null);
      return;
    }
    let cancelled = false;
    const waypoints = [
      { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
      ...currentRoute.filter(l => l.coordinates).map(l => ({ lat: l.coordinates.lat, lng: l.coordinates.lng })),
    ];
    getOSRMRoute(waypoints).then(result => {
      if (!cancelled) setCurrentRoutePolyline(result?.polyline || null);
    });
    return () => { cancelled = true; };
  }, [currentRoute]);
  
  const handleSuggestRoutes = async () => {
    setIsLoading(true);

    try {
      let routesWithIds;

      if (selectedVehicles.length > 1) {
        // ── Multi-vehicle fleet mode ────────────────────────────────────────
        const routes = await optimizeRoutesForFleet(validLocations, selectedVehicles);
        routesWithIds = routes.map((route, idx) => ({
          ...route,
          id: `route-${Date.now()}-${idx}`,
          createdAt: new Date().toISOString(),
        }));
      } else {
        // ── Single vehicle mode (legacy) ────────────────────────────────────
        const singleV = selectedVehicles[0] || selectedVehicle;
        const capacity = singleV
          ? (singleV.capacity || parseInt(vehicleCapacity) || 0)
          : parseInt(vehicleCapacity) || 0;

        if (!capacity || capacity <= 0) {
          alert("Please select a vehicle or enter a valid vehicle capacity");
          setIsLoading(false);
          return;
        }

        const routes = await optimizeRoutes(validLocations, capacity);
        routesWithIds = routes.map((route, idx) => ({
          ...route,
          id: `route-${Date.now()}-${idx}`,
          capacity,
          vehicleName: singleV?.name || "Vehicle",
          vehicleNumber: singleV?.number || "",
          createdAt: new Date().toISOString(),
        }));
      }

      setRouteDirections({});
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
  // Show alternative routes for a given route
  const handleShowRouteAlternatives = async (route) => {
    if (!route.locations || route.locations.length === 0) {
      alert("Route has no locations");
      return;
    }
    
    setIsLoading(true);
    try {
      const waypoints = route.locations.map(loc => ({
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng
      }));
      
      const directions = await getGoogleDirections(waypoints);
      
      // Check if we have alternatives or multiple routes
      if (directions) {
        const allRoutes = directions._allRoutes || 
                         (directions._alternatives && directions._alternatives.length > 0 
                           ? [directions, ...directions._alternatives] 
                           : [directions]);
        
        // Always show at least the current route (even if no alternatives)
        setRouteAlternatives(allRoutes.length > 0 ? allRoutes : [directions]);
        setSelectedRouteForAlternatives(route);
        setShowRouteAlternatives(true);
      } else {
          // Try to get alternatives by requesting without optimization
          try {
            const waypoints = route.locations.map(loc => ({
              lat: loc.coordinates.lat,
              lng: loc.coordinates.lng
            }));
            
            // Request without optimization to get alternatives
            const instance = NetworkManager(API.MAPS.GET_DIRECTIONS);
            const response = await instance.request({
              origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
              destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
              waypoints: waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng })),
              optimizeWaypoints: false, // Don't optimize to get alternatives
              alternatives: true,
            });
            
            const data = response?.data?.data || response?.data;
            if (data && data.status === 'OK' && data.routes && data.routes.length > 0) {
              // Process routes inline (same as in getGoogleDirections)
              const processedRoutes = data.routes.map((r, index) => {
                let totalTollCost = 0;
                let tollCurrency = 'INR';
                const tollInfo = [];
                
                if (r.fare) {
                  totalTollCost = r.fare.value || 0;
                  tollCurrency = r.fare.currency || 'INR';
                }
                
                const totalDistance = r.legs?.reduce((sum, leg) => 
                  sum + (leg.distance?.value || 0), 0) / 1000 || 0;
                const totalDuration = r.legs?.reduce((sum, leg) => 
                  sum + (leg.duration?.value || 0), 0) || 0;
                
                return {
                  ...r,
                  request: {
                    origin: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                    destination: { lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng },
                    waypoints: waypoints.map(wp => ({ location: { lat: wp.lat, lng: wp.lng } })),
                    travelMode: 'DRIVING',
                    optimizeWaypoints: index === 0,
                    alternatives: true,
                  },
                  tollInfo: {
                    totalCost: totalTollCost,
                    currency: tollCurrency,
                    tollPoints: tollInfo,
                    hasTolls: totalTollCost > 0 || tollInfo.length > 0,
                  },
                  totalDistance: totalDistance,
                  totalDuration: totalDuration,
                  _fullResponse: data,
                  _routeIndex: index,
                };
              });
              
              setRouteAlternatives(processedRoutes);
              setSelectedRouteForAlternatives(route);
              setShowRouteAlternatives(true);
            } else {
              // Even if no alternatives, show the current route
              if (directions) {
                setRouteAlternatives([directions]);
                setSelectedRouteForAlternatives(route);
                setShowRouteAlternatives(true);
              } else {
                alert("No alternative routes available. The current route is the only option.");
              }
            }
          } catch (altError) {
            console.error("Error getting alternative routes:", altError);
            // Even if error, show current route if available
            if (directions) {
              setRouteAlternatives([directions]);
              setSelectedRouteForAlternatives(route);
              setShowRouteAlternatives(true);
            } else {
              alert("No alternative routes available for this route");
            }
          }
        }
    } catch (error) {
      console.error("Error getting alternative routes:", error);
      alert("Error loading alternative routes");
    } finally {
      setIsLoading(false);
    }
  };

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
    // Use selected vehicle capacity, fallback to manual input
    const capacity = selectedVehicle 
      ? (selectedVehicle.capacity || parseInt(vehicleCapacity) || 0)
      : parseInt(vehicleCapacity) || 0;
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
      const df2 = order.details?.farmer;
      const village = df2?.village || df2?.villageName || order.details?.customerVillage || order.farmer?.village || "Unknown";
      const taluka = df2?.taluka || df2?.talukaName || order.details?.customerTaluka || order.farmer?.taluka || order.farmer?.talukaName || "Unknown";
      const district = df2?.district || df2?.districtName || order.details?.customerDistrict || order.farmer?.district || order.farmer?.districtName || "Unknown";
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

  // Assign driver + vehicle to all orders in a suggested route (saves to backend)
  const assignRouteToBackend = async (route, markReady = true) => {
    const allOrders = (route.locations || []).flatMap(loc => loc.selectedOrders || loc.orders || []);
    const orderIds = allOrders.map(o => o._id || o.id).filter(Boolean);
    if (orderIds.length === 0) {
      alert("No orders in this route to assign.");
      return;
    }
    try {
      setIsLoading(true);
      const instance = NetworkManager(API.DISPATCHED.ASSIGN_ROUTE);
      await instance.request({
        orderIds,
        vehicleId: route.vehicle?._id || route.vehicle?.id || null,
        vehicleName: route.vehicleName || "",
        vehicleNumber: route.vehicleNumber || route.vehicle?.number || "",
        driverName: route.vehicle?.driverName || "",
        driverMobile: route.vehicle?.driverMobile || "",
        routeNotes: `Route ${route.vehicleName || ""} — ${orderIds.length} orders`,
        markReady,
      });
      alert(`✅ ${orderIds.length} orders assigned to ${route.vehicleName || "vehicle"}.${markReady ? " Marked as Ready for Dispatch." : ""}`);
    } catch (err) {
      alert("Error assigning route: " + (err?.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
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

  // Enhanced route creation wizard
  const startRouteWizard = () => {
    setShowRouteWizard(true);
    setRouteStep(1);
    setRouteToSave(null);
    setSelectedDriverId("");
  };

  // Save route and assign driver to orders with better error handling
  const confirmSaveSuggestedRoute = async () => {
    if (!routeToSave || !selectedDriverId) {
      alert("Please select a driver");
      return;
    }
    
    // Validate route has locations
    const routeLocations = routeToSave.locations || routeToSave;
    if (!routeLocations || routeLocations.length === 0) {
      alert("Route must have at least one location");
      return;
    }
    
    // Validate all locations have coordinates
    const invalidLocations = routeLocations.filter(loc => !loc.coordinates || !loc.coordinates.lat || !loc.coordinates.lng);
    if (invalidLocations.length > 0) {
      alert(`Warning: ${invalidLocations.length} location(s) have invalid coordinates. Please correct them first.`);
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
        totalTollCost: routeToSave.totalTollCost || 0,
        tollCurrency: routeToSave.tollCurrency || 'INR',
        tollInfo: routeToSave.tollInfo || null,
        directions: routeToSave.directions,
        createdAt: new Date().toISOString(),
      }]);
      
      setRouteToSave(null);
      setSelectedDriverId("");
      setShowDriverDialog(false);
      setShowRouteSuggestions(false);
      setSuggestedRoutes([]);
      setVehicleCapacity(""); // Clear capacity for next round
      setShowRouteWizard(false);
      setRouteStep(1);
      
      // Show success message with route details
      const tollInfo = routeToSave.totalTollCost > 0 
        ? `\n🛣️ Toll Cost: ₹${routeToSave.totalTollCost.toLocaleString()}`
        : '';
      const routeDetails = `Route: ${routeLocations.length} stops, ${totalPlants.toLocaleString()} plants, ${totalDistance.toFixed(1)} km${tollInfo}`;
      alert(`✅ Successfully assigned ${selectedDriver.name} to route!\n\n${routeDetails}\n\n${orderIds.length} orders assigned.`);
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

  // Add stop to route and recalculate route with Google Directions
  const handleAddStopToRoute = async (routeId, location) => {
    // Handle suggested routes
    if (routeId.startsWith('suggested-')) {
      const routeIdx = parseInt(routeId.replace('suggested-', ''));
      const route = suggestedRoutes[routeIdx];
      if (!route) return;
      
      // Check if location already in route
      if (route.locations.some(loc => loc.key === location.key)) {
        alert("This location is already in the route");
        return;
      }
      
      // Add location to route
      const updatedLocations = [...route.locations, location];
      
      // Recalculate route using Google Directions API with new stop
      try {
        setIsLoading(true);
        const waypoints = updatedLocations.map(loc => ({
          lat: loc.coordinates.lat,
          lng: loc.coordinates.lng
        }));
        
        const directions = await getGoogleDirections(waypoints);
        
        if (directions) {
          // Check if we have waypoint_order for optimization
          const waypointOrder = directions.waypoint_order || directions._fullResponse?.routes?.[0]?.waypoint_order;
          
          let optimizedLocations = updatedLocations;
          if (waypointOrder && Array.isArray(waypointOrder)) {
            // Use the optimized route order from Google
            optimizedLocations = waypointOrder.map(idx => updatedLocations[idx]);
          }
          
          // Calculate total distance from legs
          const legs = directions.legs || directions._fullResponse?.routes?.[0]?.legs || [];
          const totalDistance = legs.reduce((sum, leg) => 
            sum + (leg.distance?.value || 0), 0) / 1000 || 0;
          
          // Extract toll information from directions
          const tollInfo = directions.tollInfo || {
            totalCost: 0,
            currency: 'INR',
            tollPoints: [],
            hasTolls: false,
          };
          
          const updatedRoute = {
            ...route,
            locations: optimizedLocations,
            totalPlants: (route.totalPlants || 0) + (location.orders?.reduce((sum, o) => 
              sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0),
            totalDistance: totalDistance || route.totalDistance || 0,
            totalTollCost: tollInfo.totalCost || 0,
            tollCurrency: tollInfo.currency || 'INR',
            tollInfo: tollInfo,
            directions: directions
          };
          
          setSuggestedRoutes(suggestedRoutes.map((r, idx) => idx === routeIdx ? updatedRoute : r));
          
          // Clear and recalculate route directions
          setRouteDirections(prev => {
            const newPrev = { ...prev };
            delete newPrev[routeId];
            return newPrev;
          });
          
          alert(`✅ Added ${location.village} to route! Route recalculated and optimized.`);
        } else {
          // Fallback: just add without optimization
          const updatedRoute = {
            ...route,
            locations: updatedLocations,
            totalPlants: (route.totalPlants || 0) + (location.orders?.reduce((sum, o) => 
              sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0)
          };
          setSuggestedRoutes(suggestedRoutes.map((r, idx) => idx === routeIdx ? updatedRoute : r));
          setRouteDirections(prev => {
            const newPrev = { ...prev };
            delete newPrev[routeId];
            return newPrev;
          });
          alert(`✅ Added ${location.village} to route!`);
        }
      } catch (error) {
        console.error("Error recalculating route:", error);
        // Fallback: just add the location
        const updatedRoute = {
          ...route,
          locations: updatedLocations,
          totalPlants: (route.totalPlants || 0) + (location.orders?.reduce((sum, o) => 
            sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0)
        };
        setSuggestedRoutes(suggestedRoutes.map((r, idx) => idx === routeIdx ? updatedRoute : r));
        setRouteDirections(prev => {
          const newPrev = { ...prev };
          delete newPrev[routeId];
          return newPrev;
        });
        alert(`✅ Added ${location.village} to route!`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Handle saved routes
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    // Check if location already in route
    if (route.locations.some(loc => loc.key === location.key)) {
      alert("This location is already in the route");
      return;
    }
    
    // Add location to route
    const updatedLocations = [...route.locations, location];
    
    // Recalculate route using Google Directions API
    try {
      setIsLoading(true);
      const waypoints = updatedLocations.map(loc => ({
        lat: loc.coordinates.lat,
        lng: loc.coordinates.lng
      }));
      
      const directions = await getGoogleDirections(waypoints);
      
      if (directions) {
        // Check if we have waypoint_order for optimization
        const waypointOrder = directions.waypoint_order || directions._fullResponse?.routes?.[0]?.waypoint_order;
        
        let optimizedLocations = updatedLocations;
        if (waypointOrder && Array.isArray(waypointOrder)) {
          // Use the optimized route order from Google
          optimizedLocations = waypointOrder.map(idx => updatedLocations[idx]);
        }
        
        // Calculate total distance from legs
        const legs = directions.legs || directions._fullResponse?.routes?.[0]?.legs || [];
        const totalDistance = legs.reduce((sum, leg) => 
          sum + (leg.distance?.value || 0), 0) / 1000 || 0;
        
        const updatedRoute = {
          ...route,
          locations: optimizedLocations,
          totalPlants: (route.totalPlants || 0) + (location.orders?.reduce((sum, o) => 
            sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0),
          totalDistance: totalDistance || route.totalDistance || 0
        };
        
        setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
        
        // Clear and recalculate route directions
        setRouteDirections(prev => {
          const newPrev = { ...prev };
          delete newPrev[routeId];
          return newPrev;
        });
        
        alert(`✅ Added ${location.village} to route! Route recalculated and optimized.`);
      } else {
        // Fallback: just add without optimization
        const updatedRoute = {
          ...route,
          locations: updatedLocations,
          totalPlants: (route.totalPlants || 0) + (location.orders?.reduce((sum, o) => 
            sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0)
        };
        setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
        setRouteDirections(prev => {
          const newPrev = { ...prev };
          delete newPrev[routeId];
          return newPrev;
        });
        alert(`✅ Added ${location.village} to route!`);
      }
    } catch (error) {
      console.error("Error recalculating route:", error);
      // Fallback: just add the location
      const updatedRoute = {
        ...route,
        locations: updatedLocations,
        totalPlants: (route.totalPlants || 0) + (location.orders?.reduce((sum, o) => 
          sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0)
      };
      setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
      setRouteDirections(prev => {
        const newPrev = { ...prev };
        delete newPrev[routeId];
        return newPrev;
      });
      alert(`✅ Added ${location.village} to route!`);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove stop from route
  const handleRemoveStopFromRoute = (routeId, locationKey) => {
    // Handle suggested routes
    if (routeId.startsWith('suggested-')) {
      const routeIdx = parseInt(routeId.replace('suggested-', ''));
      const route = suggestedRoutes[routeIdx];
      if (!route) return;
      
      const locationToRemove = route.locations.find(loc => loc.key === locationKey);
      if (!locationToRemove) return;
      
      const removedPlants = locationToRemove.orders?.reduce((sum, o) => 
        sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0;
      
      const updatedRoute = {
        ...route,
        locations: route.locations.filter(loc => loc.key !== locationKey),
        totalPlants: (route.totalPlants || 0) - removedPlants
      };
      
      setSuggestedRoutes(suggestedRoutes.map((r, idx) => idx === routeIdx ? updatedRoute : r));
      // Clear route directions to force recalculation
      setRouteDirections(prev => {
        const newPrev = { ...prev };
        delete newPrev[routeId];
        return newPrev;
      });
      return;
    }
    
    // Handle saved routes
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    const locationToRemove = route.locations.find(loc => loc.key === locationKey);
    if (!locationToRemove) return;
    
    const removedPlants = locationToRemove.orders?.reduce((sum, o) => 
      sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0;
    
    const updatedRoute = {
      ...route,
      locations: route.locations.filter(loc => loc.key !== locationKey),
      totalPlants: (route.totalPlants || 0) - removedPlants
    };
    
    setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
    // Clear route directions to force recalculation
    setRouteDirections(prev => {
      const newPrev = { ...prev };
      delete newPrev[routeId];
      return newPrev;
    });
  };

  // Reorder stops in route
  const handleReorderRouteStops = (routeId, newOrder) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    const reorderedLocations = newOrder.map(key => 
      route.locations.find(loc => loc.key === key)
    ).filter(Boolean);
    
    const updatedRoute = {
      ...route,
      locations: reorderedLocations
    };
    
    setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
  };

  // Update route with new locations (for manual editing)
  const handleUpdateRoute = (routeId, updatedLocations) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    const totalPlants = updatedLocations.reduce((sum, loc) => 
      sum + (loc.orders?.reduce((s, o) => 
        s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0) || 0), 0
    );
    
    const updatedRoute = {
      ...route,
      locations: updatedLocations,
      totalPlants
    };
    
    setRoutes(routes.map(r => r.id === routeId ? updatedRoute : r));
  };

  // Clear current route
  const handleClearRoute = () => {
    setCurrentRoute([]);
  };

  // Get locations with manual corrections applied - MUST be before any conditional returns
  const getCorrectedLocations = useMemo(() => {
    return locationGroups.map(loc => {
      const correction = manualLocationCorrections.get(loc.key);
      if (correction) {
        return {
          ...loc,
          coordinates: { ...correction, accuracy: 'manual', source: 'user-corrected' }
        };
      }
      return loc;
    });
  }, [locationGroups, manualLocationCorrections]);

  // Get valid locations with coordinates (must be before any early returns)
  const validLocations = useMemo(() => {
    let filtered = getCorrectedLocations.filter(loc => loc && loc.coordinates && loc.coordinates.lat && loc.coordinates.lng);
    
    // If in focus mode, only show locations from focused route
    if (focusedRoute) {
      const focusedRouteData = routes.find(r => r.id === focusedRoute);
      if (focusedRouteData && focusedRouteData.locations) {
        const focusedKeys = new Set(focusedRouteData.locations.map(l => l.key));
        filtered = filtered.filter(loc => focusedKeys.has(loc.key));
      }
    }
    
    return filtered;
  }, [getCorrectedLocations, focusedRoute, routes]);

  // Memoize map center to prevent unnecessary re-renders (must be before return)
  const memoizedMapCenter = useMemo(() => {
    return { lat: mapCenter[0], lng: mapCenter[1] };
  }, [mapCenter[0], mapCenter[1]]);

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
  
  // Async version: Get real road-based route polyline.
  // Priority: OSRM (free) → OpenRouteService (free with key) → straight-line fallback
  const getRoutePolylineWithOpenRouteService = async (routeLocations, includeWarehouse = true) => {
    if (routeLocations.length === 0) return [];
    
    const coords = [];
    
    if (includeWarehouse && routeLocations.length > 0) {
      coords.push({ lat: WAREHOUSE_LOCATION.lat, lng: WAREHOUSE_LOCATION.lng });
    }
    
    routeLocations
      .filter(loc => loc.coordinates)
      .forEach(loc => {
        coords.push({ lat: loc.coordinates.lat, lng: loc.coordinates.lng });
      });

    // Try OSRM first (completely free, no API key needed)
    if (coords.length >= 2) {
      const osrmResult = await getOSRMRoute(coords);
      if (osrmResult?.polyline) return osrmResult.polyline;
    }

    // Fallback: OpenRouteService (free tier, API key required)
    if (OPENROUTESERVICE_API_KEY && coords.length >= 2) {
      try {
        const waypoints = coords.map(c => [c.lng, c.lat]); // [lng, lat] for ORS
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${OPENROUTESERVICE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coordinates: waypoints, geometry: true, format: 'geojson' })
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.geometry?.coordinates) {
            return data.geometry.coordinates.map(c => [c[1], c[0]]);
          }
        }
      } catch (error) {
        console.log("OpenRouteService routing not available:", error);
      }
    }
    
    // Final fallback: straight-line between waypoints
    return coords.map(c => [c.lat, c.lng]);
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

  // Handle map load errors
  const handleMapError = () => {
    setMapLoadError(true);
    setViewMode('table'); // Switch to table view if map fails
  };

  // Manual location correction
  const handleManualLocationCorrection = (locationKey, lat, lng) => {
    setManualLocationCorrections(prev => {
      const newMap = new Map(prev);
      newMap.set(locationKey, { lat, lng, corrected: true });
      return newMap;
    });
    
    // Update the location in locationGroups
    setLocationGroups(prev => prev.map(loc => {
      if (loc.key === locationKey) {
        return {
          ...loc,
          coordinates: { lat, lng, accuracy: 'manual', source: 'user-corrected' }
        };
      }
      return loc;
    }));
    
    // Clear error for this location
    setLocationErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(locationKey);
      return newMap;
    });
  };

  // Enable map click mode for coordinate selection
  const enableMapClickMode = (location) => {
    setLocationForCoordinateEdit(location);
    setMapClickMode(true);
    setClickedCoordinates(null);
  };

  // Handle map click for coordinate selection (Google Maps)
  const handleGoogleMapClick = (event) => {
    // Handle coordinate editing mode
    if (mapClickMode && locationForCoordinateEdit) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      setClickedCoordinates({ lat, lng });
      setShowCoordinateConfirmDialog(true);
      return;
    }
    
    // Handle manual route building - add stop on map click
    if (manualRouteMode && !mapClickMode) {
      // Find nearest location to clicked point
      const clickedLat = event.latLng.lat();
      const clickedLng = event.latLng.lng();
      
      // Find location within 100m of click
      const nearestLocation = validLocations.find(loc => {
        if (!loc.coordinates) return false;
        const distance = calculateDistance(
          clickedLat, clickedLng,
          loc.coordinates.lat, loc.coordinates.lng
        );
        return distance < 0.1; // 100 meters
      });
      
      if (nearestLocation) {
        handleOrderToggle(nearestLocation.orders[0]?._id || nearestLocation.orders[0]?.id);
      }
    }
  };

  // Handle map click for coordinate selection (Leaflet/OpenStreetMap)
  const handleLeafletMapClick = (event) => {
    // Handle coordinate editing mode
    if (mapClickMode && locationForCoordinateEdit) {
      const { lat, lng } = event.latlng;
      
      setClickedCoordinates({ lat, lng });
      setShowCoordinateConfirmDialog(true);
      return;
    }
    
    // Handle manual route building - add stop on map click
    if (manualRouteMode && !mapClickMode) {
      // Find nearest location to clicked point
      const clickedLat = event.latlng.lat;
      const clickedLng = event.latlng.lng;
      
      // Find location within 100m of click
      const nearestLocation = validLocations.find(loc => {
        if (!loc.coordinates) return false;
        const distance = calculateDistance(
          clickedLat, clickedLng,
          loc.coordinates.lat, loc.coordinates.lng
        );
        return distance < 0.1; // 100 meters
      });
      
      if (nearestLocation) {
        handleOrderToggle(nearestLocation.orders[0]?._id || nearestLocation.orders[0]?.id);
      }
    }
  };

  // Confirm coordinate selection from map click
  const confirmCoordinateSelection = () => {
    if (!clickedCoordinates || !locationForCoordinateEdit) return;
    
    handleManualLocationCorrection(
      locationForCoordinateEdit.key,
      clickedCoordinates.lat,
      clickedCoordinates.lng
    );
    
    // Reset state
    setMapClickMode(false);
    setLocationForCoordinateEdit(null);
    setClickedCoordinates(null);
    setShowCoordinateConfirmDialog(false);
  };

  // Cancel coordinate selection
  const cancelCoordinateSelection = () => {
    setMapClickMode(false);
    setLocationForCoordinateEdit(null);
    setClickedCoordinates(null);
    setShowCoordinateConfirmDialog(false);
  };

  // Drag and drop handlers for route building
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    // If dragging from available locations to route
    if (source.droppableId === 'available-locations' && destination.droppableId === 'route-builder') {
      const location = getCorrectedLocations.find(loc => loc.key === draggableId);
      if (location && !currentRoute.find(loc => loc.key === location.key)) {
        setCurrentRoute([...currentRoute, location]);
      }
    }
    
    // If reordering within route
    if (source.droppableId === 'route-builder' && destination.droppableId === 'route-builder') {
      const newRoute = Array.from(currentRoute);
      const [removed] = newRoute.splice(source.index, 1);
      newRoute.splice(destination.index, 0, removed);
      setCurrentRoute(newRoute);
    }
    
    // If removing from route
    if (source.droppableId === 'route-builder' && destination.droppableId === 'available-locations') {
      setCurrentRoute(currentRoute.filter(loc => loc.key !== draggableId));
    }
  };

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
        height: "100vh", // Always fullscreen
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        overflow: "hidden"
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

      {/* View Mode Toggle and Controls */}
      <Box sx={{ 
        position: "absolute", 
        top: 10, 
        right: showRoutePanel ? 400 : 10, 
        zIndex: 1001, 
        display: "flex", 
        gap: 1,
        transition: "right 0.3s ease"
      }}>
        {/* View Mode Toggle */}
        <Paper sx={{ 
          display: "flex", 
          p: 0.5, 
          bgcolor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          borderRadius: 2,
          border: "1px solid rgba(0,0,0,0.08)"
        }}>
          <Button
            size="small"
            variant={viewMode === 'map' ? 'contained' : 'text'}
            onClick={() => {
              setViewMode('map');
              setMapLoadError(false);
            }}
            disabled={mapLoadError}
            sx={{ 
              minWidth: 70,
              borderRadius: 1.5,
              fontWeight: 600,
              textTransform: "none"
            }}
            startIcon={<MapIcon />}
          >
            Map
          </Button>
          <Button
            size="small"
            variant={viewMode === 'table' ? 'contained' : 'text'}
            onClick={() => setViewMode('table')}
            sx={{ 
              minWidth: 70,
              borderRadius: 1.5,
              fontWeight: 600,
              textTransform: "none"
            }}
            startIcon={<Assignment />}
          >
            Table
          </Button>
          <Button
            size="small"
            variant={viewMode === 'list' ? 'contained' : 'text'}
            onClick={() => setViewMode('list')}
            sx={{ 
              minWidth: 70,
              borderRadius: 1.5,
              fontWeight: 600,
              textTransform: "none"
            }}
            startIcon={<ListIcon />}
          >
            List
          </Button>
        </Paper>
        
        {/* Fullscreen Toggle */}
        <IconButton
          onClick={toggleFullscreen}
          sx={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 2,
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 1)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s",
          }}
          size="medium"
        >
          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>

        {/* Close / back button — shown when opened as a dialog from parent */}
        {onClose && (
          <IconButton
            onClick={onClose}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "rgba(255, 220, 220, 1)",
                transform: "scale(1.05)",
              },
              transition: "all 0.2s",
            }}
            size="medium"
            title="Close map"
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Map Click Mode Indicator */}
      {/* Edit Mode Alert */}
      {editingRouteId && (
        <Alert
          severity="info"
          sx={{
            position: "absolute",
            top: mapClickMode ? 100 : 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            minWidth: 400,
            maxWidth: "90%",
            boxShadow: 3,
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setEditingRouteId(null);
                setRouteForStopAddition(null);
                setShowAddStopDialog(false);
              }}
            >
              Done Editing
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Edit Mode Active:</strong> Click on location markers to add/remove stops from route
          </Typography>
        </Alert>
      )}

      {/* Add Stop Mode Alert */}
      {showAddStopDialog && routeForStopAddition && !editingRouteId && (
        <Alert
          severity="success"
          sx={{
            position: "absolute",
            top: mapClickMode ? 100 : 60,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            minWidth: 400,
            maxWidth: "90%",
            boxShadow: 3,
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setRouteForStopAddition(null);
                setShowAddStopDialog(false);
              }}
            >
              Cancel
            </Button>
          }
        >
          <Typography variant="body2">
            <strong>Add Stop Mode:</strong> Select a village from the dialog to add it to the route
          </Typography>
        </Alert>
      )}

      {mapClickMode && (
        <Alert 
          severity="info" 
          sx={{ 
            position: "absolute", 
            top: 60, 
            left: "50%", 
            transform: "translateX(-50%)", 
            zIndex: 1002,
            maxWidth: 500,
            boxShadow: 4,
            bgcolor: "rgba(33, 150, 243, 0.95)",
            color: "white",
          }}
          icon={<LocationOn />}
          action={
            <IconButton
              size="small"
              onClick={cancelCoordinateSelection}
              sx={{ color: "white" }}
            >
              <Clear />
            </IconButton>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: "white" }}>
            📍 Click on the map to set coordinates for {locationForCoordinateEdit?.village}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.9)" }}>
            Click anywhere on the map to set the location coordinates. The cursor will show as a crosshair.
          </Typography>
        </Alert>
      )}

      {/* Location Errors Alert */}
      {locationErrors.size > 0 && !mapClickMode && (
        <Alert 
          severity="warning" 
          sx={{ 
            position: "absolute", 
            top: mapClickMode ? 140 : 60, 
            left: "50%", 
            transform: "translateX(-50%)", 
            zIndex: 1001,
            maxWidth: 600,
            boxShadow: 3
          }}
          onClose={() => setLocationErrors(new Map())}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {locationErrors.size} location(s) have geocoding issues
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
            Route still works using district-center fallback. For exact point, use Table view → &quot;Set from Map&quot;.
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            {Array.from(locationErrors.values())
              .slice(0, 2)
              .map((e) => `${e.village} (${e.taluka}, ${e.district}): ${e.reason}`)
              .join(" | ")}
            {locationErrors.size > 2 ? ` | +${locationErrors.size - 2} more` : ""}
          </Typography>
        </Alert>
      )}

      {/* Map/Table/List Container */}
      <Box sx={{ 
        height: "100%", 
        width: "100%", 
        position: "relative",
        flex: 1,
        overflow: viewMode === 'map' ? "hidden" : "auto",
        touchAction: viewMode === 'map' ? "none" : "auto",
      }}>
        {/* Table View - REVAMPED */}
        {viewMode === 'table' && (
          <Box sx={{ 
            height: "100%", 
            width: "100%", 
            display: "flex", 
            flexDirection: "column",
            backgroundColor: "#f8f9fa",
            overflow: "hidden"
          }}>
            {/* Header Section */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 0,
                borderBottom: "2px solid #e0e0e0",
                backgroundColor: "white",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#1976d2", mb: 0.5 }}>
                    📍 Locations & Orders
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getCorrectedLocations.length} locations • {getCorrectedLocations.reduce((sum, loc) => 
                      sum + loc.orders.length, 0
                    )} total orders
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {locationErrors.size > 0 && (
                    <Chip 
                      icon={<Warning />}
                      label={`${locationErrors.size} Issues`} 
                      color="warning" 
                      size="small"
                    />
                  )}
                  <Chip 
                    label={`${getCorrectedLocations.filter(loc => manualLocationCorrections.has(loc.key)).length} Corrected`} 
                    color="info" 
                    size="small"
                  />
                </Box>
              </Box>
            </Paper>

            {/* Table Container */}
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              <Paper 
                elevation={2}
                sx={{ 
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: "white"
                }}
              >
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ 
                    width: "100%", 
                    borderCollapse: "separate",
                    borderSpacing: 0
                  }}>
                    <thead>
                      <tr style={{ 
                        backgroundColor: "#f5f7fa",
                        position: "sticky",
                        top: 0,
                        zIndex: 5
                      }}>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "left", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>Village</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "left", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>Taluka</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "left", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>District</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "center", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>📦 Orders</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "center", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>🌱 Plants</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "center", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>📍 Coordinates</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "center", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap"
                        }}>Accuracy</th>
                        <th style={{ 
                          padding: "16px", 
                          textAlign: "center", 
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "#374151",
                          borderBottom: "2px solid #e5e7eb",
                          whiteSpace: "nowrap",
                          minWidth: "280px"
                        }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCorrectedLocations.map((location, idx) => {
                        const totalPlants = location.orders.reduce((sum, order) => 
                          sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
                        );
                        const hasError = locationErrors.has(location.key);
                        const isCorrected = manualLocationCorrections.has(location.key);
                        const accuracy = location.coordinates?.accuracy || 'unknown';
                        const distance = location.coordinates 
                          ? calculateDistance(
                              WAREHOUSE_LOCATION.lat,
                              WAREHOUSE_LOCATION.lng,
                              location.coordinates.lat,
                              location.coordinates.lng
                            ).toFixed(1)
                          : "N/A";
                        
                        return (
                          <tr 
                            key={location.key}
                            style={{ 
                              borderBottom: "1px solid #f3f4f6",
                              backgroundColor: hasError 
                                ? "rgba(255, 193, 7, 0.08)" 
                                : isCorrected 
                                  ? "rgba(40, 167, 69, 0.08)" 
                                  : idx % 2 === 0 
                                    ? "white" 
                                    : "#fafbfc",
                              transition: "background-color 0.2s",
                              cursor: "pointer"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = hasError 
                                ? "rgba(255, 193, 7, 0.15)" 
                                : isCorrected 
                                  ? "rgba(40, 167, 69, 0.15)" 
                                  : "#f0f4f8";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = hasError 
                                ? "rgba(255, 193, 7, 0.08)" 
                                : isCorrected 
                                  ? "rgba(40, 167, 69, 0.08)" 
                                  : idx % 2 === 0 
                                    ? "white" 
                                    : "#fafbfc";
                            }}
                          >
                            <td style={{ padding: "16px", fontWeight: 600, color: "#1f2937" }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {hasError && <Warning sx={{ fontSize: "1rem", color: "#f59e0b" }} />}
                                {isCorrected && <CheckCircle sx={{ fontSize: "1rem", color: "#10b981" }} />}
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {location.village}
                                </Typography>
                              </Box>
                            </td>
                            <td style={{ padding: "16px", color: "#6b7280" }}>
                              <Typography variant="body2">{location.taluka}</Typography>
                            </td>
                            <td style={{ padding: "16px", color: "#6b7280" }}>
                              <Typography variant="body2">{location.district}</Typography>
                            </td>
                            <td style={{ padding: "16px", textAlign: "center" }}>
                              <Chip 
                                label={location.orders.length} 
                                size="small" 
                                color="primary"
                                sx={{ fontWeight: 600 }}
                              />
                            </td>
                            <td style={{ padding: "16px", textAlign: "center" }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#059669" }}>
                                {totalPlants.toLocaleString()}
                              </Typography>
                            </td>
                            <td style={{ padding: "16px", textAlign: "center" }}>
                              {location.coordinates ? (
                                <Box>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontFamily: "monospace", 
                                      fontSize: "0.75rem",
                                      color: "#4b5563",
                                      display: "block"
                                    }}
                                  >
                                    {location.coordinates.lat.toFixed(6)}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontFamily: "monospace", 
                                      fontSize: "0.75rem",
                                      color: "#4b5563",
                                      display: "block"
                                    }}
                                  >
                                    {location.coordinates.lng.toFixed(6)}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: "0.7rem",
                                      color: "#6b7280",
                                      display: "block",
                                      mt: 0.5
                                    }}
                                  >
                                    {distance} km
                                  </Typography>
                                </Box>
                              ) : (
                                <Chip label="Not Found" size="small" color="error" />
                              )}
                            </td>
                            <td style={{ padding: "16px", textAlign: "center" }}>
                              <Chip 
                                label={accuracy.toUpperCase()} 
                                size="small" 
                                color={
                                  accuracy === 'high' ? 'success' :
                                  accuracy === 'medium' ? 'warning' :
                                  accuracy === 'manual' ? 'info' :
                                  'error'
                                }
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: "0.7rem"
                                }}
                              />
                            </td>
                            <td style={{ padding: "16px" }}>
                              <Box sx={{ 
                                display: "flex", 
                                gap: 1, 
                                flexWrap: "wrap", 
                                justifyContent: "center",
                                minWidth: "260px"
                              }}>
                                <Tooltip title="Set coordinates by clicking on map">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<LocationOn />}
                                    onClick={() => {
                                      setViewMode('map');
                                      setTimeout(() => enableMapClickMode(location), 100);
                                    }}
                                    disabled={mapClickMode}
                                    sx={{ 
                                      fontSize: "0.7rem",
                                      px: 1,
                                      py: 0.5
                                    }}
                                  >
                                    Map
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Enter coordinates manually">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                      const newLat = prompt("Enter Latitude:", location.coordinates?.lat || "");
                                      const newLng = prompt("Enter Longitude:", location.coordinates?.lng || "");
                                      if (newLat && newLng && !isNaN(parseFloat(newLat)) && !isNaN(parseFloat(newLng))) {
                                        handleManualLocationCorrection(location.key, parseFloat(newLat), parseFloat(newLng));
                                      }
                                    }}
                                    sx={{ 
                                      fontSize: "0.7rem",
                                      px: 1,
                                      py: 0.5
                                    }}
                                  >
                                    Manual
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Add to current route">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleAddToRoute(location)}
                                    disabled={currentRoute.some(loc => loc.key === location.key)}
                                    sx={{ 
                                      fontSize: "0.7rem",
                                      px: 1.5,
                                      py: 0.5,
                                      fontWeight: 600
                                    }}
                                  >
                                    {currentRoute.some(loc => loc.key === location.key) ? "Added" : "Add"}
                                  </Button>
                                </Tooltip>
                              </Box>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {/* Drag & Drop Route Builder View (when map fails) */}
        {viewMode === 'table' && mapLoadError && (
          <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Map failed to load. Use drag-and-drop to build your route.
              </Typography>
              <Typography variant="caption">
                Drag locations from the left panel to the route builder on the right to create your delivery route.
              </Typography>
            </Alert>
            
            <DragDropContext onDragEnd={onDragEnd}>
              <Box sx={{ display: "flex", gap: 2, height: "calc(100% - 100px)" }}>
                {/* Available Locations */}
                <Paper sx={{ flex: 1, p: 2, overflow: "auto" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Available Locations ({getCorrectedLocations.length})
                  </Typography>
                  <Droppable droppableId="available-locations">
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          bgcolor: snapshot.isDraggingOver ? "rgba(25, 118, 210, 0.1)" : "transparent",
                          minHeight: 200,
                          p: 1,
                          borderRadius: 1,
                          border: snapshot.isDraggingOver ? "2px dashed #1976d2" : "1px solid #ddd"
                        }}
                      >
                        {getCorrectedLocations
                          .filter(loc => !currentRoute.find(r => r.key === loc.key))
                          .map((location, index) => {
                            const totalPlants = location.orders.reduce((sum, order) => 
                              sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
                            );
                            const hasError = locationErrors.has(location.key);
                            
                            return (
                              <Draggable key={location.key} draggableId={location.key} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      mb: 1,
                                      p: 1.5,
                                      bgcolor: snapshot.isDragging ? "#e3f2fd" : hasError ? "#fff3cd" : "white",
                                      border: snapshot.isDragging ? "2px solid #1976d2" : "1px solid #ddd",
                                      cursor: "grab",
                                      "&:active": { cursor: "grabbing" },
                                      transform: snapshot.isDragging ? "rotate(2deg)" : "none",
                                      boxShadow: snapshot.isDragging ? 4 : 1
                                    }}
                                  >
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                      <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                          {location.village}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {location.taluka}, {location.district}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                                          📦 {location.orders.length} orders | {totalPlants.toLocaleString()} plants
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 0.5 }}>
                                        <Chip 
                                          label={location.coordinates?.accuracy || 'unknown'} 
                                          size="small" 
                                          color={
                                            location.coordinates?.accuracy === 'high' ? 'success' :
                                            location.coordinates?.accuracy === 'medium' ? 'warning' :
                                            'error'
                                          }
                                        />
                                        {hasError && (
                                          <Chip label="⚠️" size="small" color="error" />
                                        )}
                                      </Box>
                                    </Box>
                                  </Card>
                                )}
                              </Draggable>
                            );
                          })}
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </Paper>
                
                {/* Route Builder */}
                <Paper sx={{ flex: 1, p: 2, overflow: "auto", bgcolor: "#f5f5f5" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Route Builder ({currentRoute.length} stops)
                    </Typography>
                    {currentRoute.length > 0 && (
                      <Button size="small" variant="outlined" color="error" onClick={handleClearRoute}>
                        Clear Route
                      </Button>
                    )}
                  </Box>
                  
                  {/* Warehouse Start */}
                  <Card sx={{ mb: 1, p: 1.5, bgcolor: "#d32f2f", color: "white" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      🏭 Warehouse (Start)
                    </Typography>
                  </Card>
                  
                  <Droppable droppableId="route-builder">
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{
                          minHeight: 200,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: snapshot.isDraggingOver ? "rgba(46, 125, 50, 0.1)" : "transparent",
                          border: snapshot.isDraggingOver ? "2px dashed #2e7d32" : "1px dashed #ccc"
                        }}
                      >
                        {currentRoute.length === 0 ? (
                          <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                            <Typography variant="body2">Drag locations here to build your route</Typography>
                          </Box>
                        ) : (
                          currentRoute.map((location, index) => {
                            const totalPlants = location.orders.reduce((sum, order) => 
                              sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
                            );
                            
                            return (
                              <Draggable key={location.key} draggableId={location.key} index={index}>
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      mb: 1,
                                      p: 1.5,
                                      bgcolor: snapshot.isDragging ? "#c8e6c9" : "#2e7d32",
                                      color: "white",
                                      cursor: "grab",
                                      "&:active": { cursor: "grabbing" },
                                      transform: snapshot.isDragging ? "rotate(-2deg)" : "none",
                                      boxShadow: snapshot.isDragging ? 4 : 2
                                    }}
                                  >
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                      <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                          {index + 1}. {location.village}
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                          {location.taluka}, {location.district}
                                        </Typography>
                                        <Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.9 }}>
                                          📦 {location.orders.length} orders | {totalPlants.toLocaleString()} plants
                                        </Typography>
                                      </Box>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRemoveFromRoute(location.key)}
                                        sx={{ color: "white" }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </Card>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                  
                  {/* Route Summary */}
                  {currentRoute.length > 0 && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: "white", borderRadius: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Route Summary
                      </Typography>
                      <Typography variant="body2">
                        📍 Distance: {calculateRouteDistance(currentRoute).toFixed(1)} km
                      </Typography>
                      <Typography variant="body2">
                        📦 Total Plants: {currentRoute.reduce((sum, loc) => 
                          sum + loc.orders.reduce((s, o) => s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
                        ).toLocaleString()}
                      </Typography>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        onClick={handleSaveRoute}
                        sx={{ mt: 2 }}
                      >
                        Save Route & Assign Driver
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Box>
            </DragDropContext>
          </Box>
        )}

        {/* List View - REVAMPED */}
        {viewMode === 'list' && (
          <Box sx={{ 
            height: "100%", 
            width: "100%", 
            display: "flex", 
            flexDirection: "column",
            backgroundColor: "#f8f9fa",
            overflow: "hidden"
          }}>
            {/* Header Section */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: 0,
                borderBottom: "2px solid #e0e0e0",
                backgroundColor: "white",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#1976d2", mb: 0.5 }}>
                    📋 Locations & Orders
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getCorrectedLocations.length} locations • {getCorrectedLocations.reduce((sum, loc) => 
                      sum + loc.orders.length, 0
                    )} total orders
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {locationErrors.size > 0 && (
                    <Chip 
                      icon={<Warning />}
                      label={`${locationErrors.size} Issues`} 
                      color="warning" 
                      size="small"
                    />
                  )}
                  <Chip 
                    label={`${getCorrectedLocations.filter(loc => manualLocationCorrections.has(loc.key)).length} Corrected`} 
                    color="info" 
                    size="small"
                  />
                </Box>
              </Box>
            </Paper>

            {/* List Container */}
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
              <Box sx={{ 
                display: "grid", 
                gridTemplateColumns: { xs: "1fr", sm: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: 2
              }}>
                {getCorrectedLocations.map((location) => {
                  const totalPlants = location.orders.reduce((sum, order) => 
                    sum + (order.numberOfPlants || order.totalPlants || order.quantity || 0), 0
                  );
                  const hasError = locationErrors.has(location.key);
                  const isCorrected = manualLocationCorrections.has(location.key);
                  const accuracy = location.coordinates?.accuracy || 'unknown';
                  const distance = location.coordinates 
                    ? calculateDistance(
                        WAREHOUSE_LOCATION.lat,
                        WAREHOUSE_LOCATION.lng,
                        location.coordinates.lat,
                        location.coordinates.lng
                      ).toFixed(1)
                    : "N/A";
                  
                  return (
                    <Card 
                      key={location.key} 
                      elevation={2}
                      sx={{ 
                        p: 2.5,
                        borderRadius: 2,
                        backgroundColor: "white",
                        border: hasError 
                          ? "2px solid #fbbf24" 
                          : isCorrected 
                            ? "2px solid #10b981" 
                            : "1px solid #e5e7eb",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 4,
                          borderColor: hasError ? "#f59e0b" : isCorrected ? "#059669" : "#3b82f6"
                        }
                      }}
                    >
                      {/* Header */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            {hasError && <Warning sx={{ fontSize: "1.2rem", color: "#f59e0b" }} />}
                            {isCorrected && <CheckCircle sx={{ fontSize: "1.2rem", color: "#10b981" }} />}
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1f2937" }}>
                              {location.village}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {location.taluka}, {location.district}
                          </Typography>
                          <Chip 
                            label={accuracy.toUpperCase()} 
                            size="small" 
                            color={
                              accuracy === 'high' ? 'success' :
                              accuracy === 'medium' ? 'warning' :
                              accuracy === 'manual' ? 'info' :
                              'error'
                            }
                            sx={{ 
                              fontWeight: 600,
                              fontSize: "0.7rem"
                            }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Stats */}
                      <Box sx={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(2, 1fr)", 
                        gap: 2,
                        mb: 2
                      }}>
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: "#eff6ff", 
                          borderRadius: 1,
                          textAlign: "center"
                        }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "#2563eb" }}>
                            {location.orders.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Orders
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: "#f0fdf4", 
                          borderRadius: 1,
                          textAlign: "center"
                        }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "#059669" }}>
                            {totalPlants.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Plants
                          </Typography>
                        </Box>
                      </Box>

                      {/* Coordinates */}
                      {location.coordinates ? (
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: "#f9fafb", 
                          borderRadius: 1,
                          mb: 2
                        }}>
                          <Typography variant="caption" sx={{ 
                            display: "block", 
                            fontWeight: 600,
                            color: "#6b7280",
                            mb: 0.5
                          }}>
                            Coordinates
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            fontFamily: "monospace", 
                            fontSize: "0.75rem",
                            color: "#4b5563",
                            display: "block"
                          }}>
                            {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            fontSize: "0.7rem",
                            color: "#6b7280",
                            display: "block",
                            mt: 0.5
                          }}>
                            📍 {distance} km from warehouse
                          </Typography>
                        </Box>
                      ) : (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <Typography variant="caption">Coordinates not found</Typography>
                        </Alert>
                      )}

                      {/* Actions */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<LocationOn />}
                          onClick={() => {
                            setViewMode('map');
                            setTimeout(() => enableMapClickMode(location), 100);
                          }}
                          disabled={mapClickMode}
                          sx={{ 
                            fontSize: "0.75rem",
                            py: 1
                          }}
                        >
                          Set from Map
                        </Button>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => {
                              const newLat = prompt("Enter Latitude:", location.coordinates?.lat || "");
                              const newLng = prompt("Enter Longitude:", location.coordinates?.lng || "");
                              if (newLat && newLng && !isNaN(parseFloat(newLat)) && !isNaN(parseFloat(newLng))) {
                                handleManualLocationCorrection(location.key, parseFloat(newLat), parseFloat(newLng));
                              }
                            }}
                            sx={{ 
                              fontSize: "0.75rem",
                              py: 1
                            }}
                          >
                            Manual
                          </Button>
                          <Button
                            fullWidth
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<Add />}
                            onClick={() => handleAddToRoute(location)}
                            disabled={currentRoute.some(loc => loc.key === location.key)}
                            sx={{ 
                              fontSize: "0.75rem",
                              py: 1,
                              fontWeight: 600
                            }}
                          >
                            {currentRoute.some(loc => loc.key === location.key) ? "Added" : "Add Route"}
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <>
          {useGoogleMaps && GOOGLE_MAPS_API_KEY ? (
          <LoadScript 
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            onError={handleMapError}
          >
            <GoogleMap
              mapContainerStyle={{ height: "100%", width: "100%" }}
              center={memoizedMapCenter}
              zoom={mapZoom}
              // Removed onCenterChanged and onZoomChanged to prevent infinite loops
              // Map will manage its own center/zoom internally after initial load
              onLoad={(map) => {
                if (!googleMapRef.current) {
                  googleMapRef.current = map;
                  // Don't auto-fit bounds here - let geocoding useEffect handle it
                  // This prevents map from refreshing multiple times
                }
              }}
              onUnmount={() => {
                googleMapRef.current = null;
              }}
              onClick={handleGoogleMapClick}
              options={{
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
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
                cursor: mapClickMode ? 'crosshair' : 'default', // Show crosshair when in click mode
                disableDefaultUI: false,
                zoomControlOptions: {
                  position: window.google?.maps?.ControlPosition?.RIGHT_TOP
                }
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
                  farmerName: order.details?.farmer?.name || order.farmer?.name || order.farmerName || order.details?.customerName || "Unknown",
                  quantity: order.numberOfPlants || order.totalPlants || order.quantity || 0,
                  plantType: order.plantType?.name || order.plantType || order.plantName || "Unknown",
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
                    onClick={(e) => {
                      // If editing a route, add/remove this location from the route
                      if (editingRouteId) {
                        // Check if it's a suggested route
                        if (editingRouteId.startsWith('suggested-')) {
                          const routeIdx = parseInt(editingRouteId.replace('suggested-', ''));
                          const route = suggestedRoutes[routeIdx];
                          if (route && route.locations.some(loc => loc.key === location.key)) {
                            if (window.confirm(`Remove ${location.village} from route?`)) {
                              handleRemoveStopFromRoute(editingRouteId, location.key);
                            }
                          } else if (route) {
                            handleAddStopToRoute(editingRouteId, location);
                            alert(`Added ${location.village} to route`);
                          }
                        } else {
                          // Saved route
                          const route = routes.find(r => r.id === editingRouteId);
                          if (route && route.locations.some(loc => loc.key === location.key)) {
                            if (window.confirm(`Remove ${location.village} from route?`)) {
                              handleRemoveStopFromRoute(editingRouteId, location.key);
                            }
                          } else if (route) {
                            handleAddStopToRoute(editingRouteId, location);
                            alert(`Added ${location.village} to route`);
                          }
                        }
                        return;
                      }
                      
                      // If adding stop to a route
                      if (routeForStopAddition) {
                        // Check if it's a suggested route
                        if (routeForStopAddition.startsWith('suggested-')) {
                          const routeIdx = parseInt(routeForStopAddition.replace('suggested-', ''));
                          const route = suggestedRoutes[routeIdx];
                          if (route && !route.locations.some(loc => loc.key === location.key)) {
                            handleAddStopToRoute(routeForStopAddition, location);
                            setRouteForStopAddition(null);
                            setShowAddStopDialog(false);
                            alert(`Added ${location.village} to route`);
                          } else {
                            alert("This location is already in the route");
                          }
                        } else {
                          // Saved route
                          const route = routes.find(r => r.id === routeForStopAddition);
                          if (route && !route.locations.some(loc => loc.key === location.key)) {
                            handleAddStopToRoute(routeForStopAddition, location);
                            setRouteForStopAddition(null);
                            setShowAddStopDialog(false);
                            alert(`Added ${location.village} to route`);
                          } else {
                            alert("This location is already in the route");
                          }
                        }
                        return;
                      }
                      
                      // Normal marker selection
                      const newSelected = location.key === selectedGoogleMarker ? null : location.key;
                      setSelectedGoogleMarker(newSelected);
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
                      <InfoWindow 
                        position={{ lat: location.coordinates.lat, lng: location.coordinates.lng }}
                        onCloseClick={() => {
                          setSelectedGoogleMarker(null);
                          setEditingLocation(null);
                          setDraggedCoordinates(null);
                        }}
                        options={{
                          disableAutoPan: true, // CRITICAL: Prevent map from jumping when InfoWindow opens
                          pixelOffset: (window.google && window.google.maps) 
                            ? new window.google.maps.Size(0, -40) 
                            : { width: 0, height: -40 }, // Offset to prevent jumping
                          maxWidth: 300,
                          zIndex: 1000,
                          shouldFocus: false, // Don't focus the InfoWindow
                        }}
                        onOpen={() => {
                          // InfoWindow is already configured with disableAutoPan: true
                          // No need to manually set center/zoom as it will cause infinite loops
                        }}
                      >
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
                            {location.coordinates && (
                              <div style={{ fontSize: 10, marginTop: 4, color: "#666" }}>
                                📍 {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
                                {location.coordinates.accuracy && (
                                  <span style={{ marginLeft: 4, color: location.coordinates.accuracy === 'high' ? '#4caf50' : location.coordinates.accuracy === 'medium' ? '#ff9800' : '#f44336' }}>
                                    ({location.coordinates.accuracy})
                                  </span>
                                )}
                              </div>
                            )}
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
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                onClick={() => {
                                  enableMapClickMode(location);
                                  setSelectedGoogleMarker(null);
                                }}
                                disabled={mapClickMode}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  border: "1px solid #4caf50",
                                  borderRadius: "4px",
                                  backgroundColor: mapClickMode ? "#ccc" : "white",
                                  color: mapClickMode ? "#666" : "#4caf50",
                                  cursor: mapClickMode ? "not-allowed" : "pointer",
                                  flex: 1,
                                  fontWeight: "600",
                                }}
                              >
                                📍 Set from Map
                              </button>
                              <button
                                onClick={() => {
                                  const newLat = prompt("Enter Latitude:", location.coordinates?.lat || "");
                                  const newLng = prompt("Enter Longitude:", location.coordinates?.lng || "");
                                  if (newLat && newLng && !isNaN(parseFloat(newLat)) && !isNaN(parseFloat(newLng))) {
                                    handleManualLocationCorrection(location.key, parseFloat(newLat), parseFloat(newLng));
                                  }
                                }}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: "12px",
                                  border: "1px solid #9c27b0",
                                  borderRadius: "4px",
                                  backgroundColor: "white",
                                  color: "#9c27b0",
                                  cursor: "pointer",
                                  flex: 1,
                                }}
                              >
                                ✏️ Enter Manually
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                handleAddToRoute(location);
                                setSelectedGoogleMarker(null);
                              }}
                              disabled={isInCurrentRoute}
                              style={{
                                padding: "8px 12px",
                                fontSize: "12px",
                                border: "1px solid #1976d2",
                                borderRadius: "4px",
                                backgroundColor: isInCurrentRoute ? "#ccc" : "#1976d2",
                                color: "white",
                                cursor: isInCurrentRoute ? "not-allowed" : "pointer",
                                width: "100%",
                                fontWeight: "600",
                              }}
                            >
                              {isInCurrentRoute ? "✓ In Route" : "+ Add to Route"}
                            </button>
                          </div>
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

              {/* Google fallback polyline: still show route even if Directions API fails/limits */}
              {showRouteSuggestions && suggestedRoutes.map((route, routeIdx) => {
                const key = `suggested-${routeIdx}`;
                const colors = ["#e91e63", "#9c27b0", "#3f51b5", "#00bcd4", "#4caf50", "#ff9800", "#f44336"];
                const color = colors[routeIdx % colors.length];
                const isFocused = focusedRoute === key;
                if (focusedRoute && !isFocused) return null;
                if (routeDirections[key]) return null;

                let positions = [];
                if (route.osrmPolyline?.length) {
                  positions = route.osrmPolyline;
                } else if (route.polyline) {
                  const decoded = decodePolyline(route.polyline);
                  positions = decoded.length > 0 ? decoded : getRoutePolyline(route.locations || [], true);
                } else {
                  positions = getRoutePolyline(route.locations || [], true);
                }

                const path = toGooglePath(positions);
                if (path.length < 2) return null;

                return (
                  <GooglePolyline
                    key={`fallback-suggested-${routeIdx}`}
                    path={path}
                    options={{
                      strokeColor: color,
                      strokeWeight: isFocused ? 5 : 3,
                      strokeOpacity: isFocused ? 0.9 : 0.72,
                      zIndex: isFocused ? 999 : 2,
                    }}
                  />
                );
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
            style={{ height: "100%", width: "100%", zIndex: 1, cursor: mapClickMode ? 'crosshair' : 'default' }}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            zoomControl={true}
            touchZoom={true}
            boxZoom={true}
            keyboard={true}
            eventHandlers={{
              click: handleLeafletMapClick,
            }}
            whenReady={(mapInstance) => {
              // Use whenReady for better initialization timing
              try {
                if (!mapRef.current) {
                  mapRef.current = mapInstance.target;
                  // Don't auto-fit bounds here - let geocoding useEffect handle it
                  // This prevents map from refreshing multiple times
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
              farmerName: order.details?.farmer?.name || order.farmer?.name || order.farmerName || order.details?.customerName || "Unknown",
              quantity: order.numberOfPlants || order.totalPlants || order.quantity || 0,
              plantType: order.plantType?.name || order.plantType || order.plantName || "Unknown",
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
                  click: (e) => {
                    // Prevent map from panning to marker
                    e.originalEvent.stopPropagation();
                    // Open popup without causing map to pan
                    if (mapRef.current) {
                      const marker = e.target;
                      marker.openPopup();
                      // Prevent map from centering on marker
                      const currentCenter = mapRef.current.getCenter();
                      const currentZoom = mapRef.current.getZoom();
                      setTimeout(() => {
                        if (mapRef.current && currentCenter) {
                          mapRef.current.setView(currentCenter, currentZoom, { animate: false });
                        }
                      }, 10);
                    }
                    // Also show dialog if needed
                    handleMarkerClick(location);
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
                <Popup 
                  autoPan={false}
                  autoPanPaddingTopLeft={[0, 0]}
                  autoPanPaddingBottomRight={[0, 0]}
                  closeOnClick={false}
                >
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
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<LocationOn />}
                        onClick={() => {
                          enableMapClickMode(location);
                          if (mapRef.current) {
                            mapRef.current.closePopup();
                          }
                        }}
                        disabled={mapClickMode}
                        sx={{ fontSize: "0.7rem" }}
                      >
                        Set from Map
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const newLat = prompt("Enter Latitude:", location.coordinates?.lat || "");
                          const newLng = prompt("Enter Longitude:", location.coordinates?.lng || "");
                          if (newLat && newLng && !isNaN(parseFloat(newLat)) && !isNaN(parseFloat(newLng))) {
                            handleManualLocationCorrection(location.key, parseFloat(newLat), parseFloat(newLng));
                          }
                        }}
                        sx={{ fontSize: "0.7rem" }}
                      >
                        Enter Manually
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleAddToRoute(location)}
                        sx={{ fontSize: "0.7rem" }}
                        disabled={isInCurrentRoute}
                      >
                        {isInCurrentRoute ? "In Route" : "Add to Route"}
                      </Button>
                    </Box>
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
            
            // Road polyline priority: OSRM (free) > Google encoded > straight-line
            let positions = [];
            if (route.osrmPolyline?.length) {
              positions = route.osrmPolyline;
            } else if (route.polyline) {
              const decoded = decodePolyline(route.polyline);
              positions = decoded.length > 0 ? decoded : getRoutePolyline(route.locations || [], true);
            } else {
              positions = getRoutePolyline(route.locations || [], true);
            }
            
            const label = route.vehicleName
              ? `Route ${routeIdx + 1} · ${route.vehicleName}${route.vehicleNumber ? ` (${route.vehicleNumber})` : ""}`
              : `Route ${routeIdx + 1}`;

            return (
              <Polyline
                key={`suggested-${routeIdx}`}
                positions={positions}
                color={color}
                weight={isFocused ? 5 : 3}
                opacity={isFocused ? 0.9 : 0.7}
                dashArray={routeIdx === 0 ? "0" : "10, 5"}
              >
                <LeafletTooltip sticky>{label}</LeafletTooltip>
              </Polyline>
            );
          })}
          
          {/* Navigation Routes for saved routes */}
          {routes.map((route) => {
            const isHighlighted = highlightedRoute === route.id;
            const isFocused = focusedRoute === route.id;
            
            // Only show if focused or no route is focused
            if (focusedRoute && !isFocused) return null;
            
            // Road polyline priority: OSRM (free) > Google encoded > straight-line
            let positions = [];
            if (route.osrmPolyline?.length) {
              positions = route.osrmPolyline;
            } else if (route.polyline) {
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
          
          {/* Polyline for current route (from warehouse) — uses OSRM road polyline when available */}
          {currentRoute.length > 0 && (
            <Polyline
              positions={currentRoutePolyline || getRoutePolyline(currentRoute, true)}
              color="#2e7d32"
              weight={4}
              opacity={0.8}
              dashArray={currentRoutePolyline ? "0" : "10, 5"}
            />
          )}
        </MapContainer>
        )}
          </>
        )}
      </Box>

      {/* Plant Filter Panel - Only show in map view */}
      {viewMode === 'map' && (
      <Paper
        sx={{
          position: "absolute",
          top: 10,
          left: 10,
          p: 2.5,
          minWidth: 280,
          maxWidth: 320,
          zIndex: 1000,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          borderRadius: 2,
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,0,0,0.08)",
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

        {/* Routing Service Toggle — Free (ORS) vs Premium (Google) */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ display: "block", mb: 0.75, color: "text.secondary", fontWeight: 600 }}>
            Routing Service
          </Typography>
          <Box sx={{ display: "flex", gap: 0.75 }}>
            <Button
              size="small"
              fullWidth
              variant={!useGoogleMaps ? "contained" : "outlined"}
              color={!useGoogleMaps ? "success" : "inherit"}
              onClick={() => setUseGoogleMaps(false)}
              sx={{ textTransform: "none", fontSize: "0.72rem", fontWeight: 600, borderRadius: 1.5 }}
            >
              🆓 Free (ORS)
            </Button>
            <Button
              size="small"
              fullWidth
              variant={useGoogleMaps ? "contained" : "outlined"}
              color={useGoogleMaps ? "primary" : "inherit"}
              onClick={() => setUseGoogleMaps(true)}
              disabled={!GOOGLE_MAPS_API_KEY}
              sx={{ textTransform: "none", fontSize: "0.72rem", fontWeight: 600, borderRadius: 1.5 }}
            >
              ⭐ Premium (Google)
            </Button>
          </Box>
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary", lineHeight: 1.4 }}>
            {useGoogleMaps
              ? "Google Directions — real-time traffic, paid per request"
              : "OSRM (OpenStreetMap) — real roads, 100% free, no API key"}
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={startRouteWizard}
          size="small"
          sx={{ mb: 1.5 }}
        >
          🚀 Create Route (Wizard)
        </Button>
        
        {/* Vehicle Multi-Select */}
        <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, color: "text.secondary" }}>
          Select Vehicle(s)
        </Typography>
        <Box
          sx={{
            maxHeight: 160,
            overflowY: "auto",
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            mb: 1,
            bgcolor: "#fafafa",
          }}
        >
          {loadingVehicles ? (
            <Box sx={{ p: 1, textAlign: "center" }}><CircularProgress size={18} /></Box>
          ) : vehicles.length === 0 ? (
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">No vehicles found</Typography>
            </Box>
          ) : (
            vehicles.map((vehicle) => {
              const vid = vehicle._id || vehicle.id;
              const isChecked = selectedVehicles.some(v => (v._id || v.id) === vid);
              const cap = vehicle.capacity || 0;
              return (
                <Box
                  key={vid}
                  onClick={() => {
                    const next = isChecked
                      ? selectedVehicles.filter(v => (v._id || v.id) !== vid)
                      : [...selectedVehicles, vehicle];
                    setSelectedVehicles(next);
                    // keep selectedVehicle in sync for manual-route compat
                    setSelectedVehicle(next.length === 1 ? next[0] : next[0] || null);
                    setVehicleCapacity(next.length === 1 ? (next[0].capacity?.toString() || "") : "");
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1,
                    py: 0.75,
                    cursor: "pointer",
                    bgcolor: isChecked ? "rgba(25,118,210,0.08)" : "transparent",
                    borderBottom: "1px solid #f0f0f0",
                    "&:hover": { bgcolor: isChecked ? "rgba(25,118,210,0.12)" : "rgba(0,0,0,0.04)" },
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <input type="checkbox" checked={isChecked} readOnly style={{ pointerEvents: "none", width: 13, height: 13, flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.2 }}>
                      {vehicle.name || "Unnamed"}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.2 }}>
                      {vehicle.number || "—"} · {cap > 0 ? `${cap.toLocaleString()} plants` : "no capacity"}
                    </Typography>
                  </Box>
                  {isChecked && <CheckCircle sx={{ fontSize: 14, color: "primary.main", flexShrink: 0 }} />}
                </Box>
              );
            })
          )}
        </Box>

        {/* Fleet summary */}
        {selectedVehicles.length > 0 && (
          <Box sx={{ mb: 1, p: 0.75, bgcolor: "rgba(25,118,210,0.07)", borderRadius: 1, border: "1px solid rgba(25,118,210,0.2)" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
              {selectedVehicles.length} vehicle{selectedVehicles.length > 1 ? "s" : ""} selected
            </Typography>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              Total capacity:{" "}
              <strong>{selectedVehicles.reduce((s, v) => s + (v.capacity || 0), 0).toLocaleString()}</strong> plants
            </Typography>
            {selectedVehicles.length > 1 && (
              <Typography variant="caption" sx={{ display: "block", color: "success.main", fontWeight: 600 }}>
                🚛 Fleet mode — one route per vehicle
              </Typography>
            )}
          </Box>
        )}

        {/* Manual Capacity Input (Fallback — single vehicle only) */}
        {selectedVehicles.length === 0 && (
        <TextField
          fullWidth
          size="small"
          label="Or Enter Capacity Manually"
          type="number"
          value={vehicleCapacity}
          onChange={(e) => {
            setVehicleCapacity(e.target.value);
            setSelectedVehicle(null);
            setSelectedVehicles([]);
          }}
          sx={{ mb: 1 }}
          placeholder="e.g., 20000"
          helperText="Enter capacity if no vehicle selected"
        />
        )}
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
            disabled={
              (selectedVehicles.length === 0 && (!vehicleCapacity || parseInt(vehicleCapacity) <= 0)) ||
              manualRouteMode
            }
            size="small"
          >
            {selectedVehicles.length > 1 ? `🚛 Suggest Routes (${selectedVehicles.length} vehicles)` : "Auto Suggest"}
          </Button>
        </Box>
        {manualRouteMode && (
          <Box sx={{ mb: 1, p: 1, bgcolor: "rgba(156, 39, 176, 0.1)", borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              Remaining Capacity: <strong>{getRemainingCapacity().toLocaleString()}</strong> plants
            </Typography>
            {/* Select All / Deselect All */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <input
                  type="checkbox"
                  id="select-all-orders"
                  checked={
                    locationGroups.flatMap(lg => lg.orders || []).length > 0 &&
                    locationGroups.flatMap(lg => lg.orders || []).every(o => selectedOrdersForRoute.has(o._id || o.id))
                  }
                  onChange={(e) => {
                    const allIds = locationGroups.flatMap(lg => lg.orders || []).map(o => o._id || o.id).filter(Boolean);
                    if (e.target.checked) {
                      setSelectedOrdersForRoute(new Set(allIds));
                    } else {
                      setSelectedOrdersForRoute(new Set());
                    }
                  }}
                  style={{ cursor: "pointer", width: 14, height: 14 }}
                />
                <label htmlFor="select-all-orders" style={{ fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }}>
                  Select All
                </label>
              </Box>
              <Typography variant="caption" sx={{ color: "purple", fontWeight: 600 }}>
                {selectedOrdersForRoute.size}/{locationGroups.flatMap(lg => lg.orders || []).length} selected
              </Typography>
            </Box>
            {/* Per-order checkbox list */}
            <Box sx={{ maxHeight: 180, overflowY: "auto", mt: 0.5 }}>
              {locationGroups.flatMap(lg => lg.orders || []).map((order) => {
                const orderId = order._id || order.id;
                const orderPlants = order.numberOfPlants || order.totalPlants || order.quantity || 0;
                const isSelected = selectedOrdersForRoute.has(orderId);
                const canSelect = orderPlants <= getRemainingCapacity();
                return (
                  <Box
                    key={orderId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      py: 0.4,
                      px: 0.5,
                      borderRadius: 1,
                      bgcolor: isSelected ? "rgba(156, 39, 176, 0.15)" : "transparent",
                      border: isSelected ? "1px solid rgba(156, 39, 176, 0.4)" : "1px solid transparent",
                      opacity: canSelect || isSelected ? 1 : 0.45,
                      cursor: canSelect || isSelected ? "pointer" : "not-allowed",
                      "&:hover": { bgcolor: isSelected ? "rgba(156,39,176,0.2)" : "rgba(0,0,0,0.04)" },
                    }}
                    onClick={() => (canSelect || isSelected) && handleOrderToggle(orderId)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      style={{ pointerEvents: "none", width: 13, height: 13, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: "0.72rem", fontWeight: 600, lineHeight: 1.2 }}>
                        {order.details?.farmer?.name || order.farmer?.name || order.farmerName || order.details?.customerName || "Unknown"} — {orderPlants.toLocaleString()} plants
                      </Typography>
                      <Typography noWrap sx={{ fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.2 }}>
                        {order.plantType || order.details?.plantName?.name || "Unknown plant"} · {order.details?.farmer?.village || order.details?.customerVillage || order.farmer?.village || ""}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
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
      )}

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
                    primary={`${order.details?.farmer?.name || order.farmer?.name || order.farmerName || order.details?.customerName || "Unknown"} - ${orderPlants.toLocaleString()} plants`}
                    secondary={order.plantType?.name || order.plantType || order.plantName || "Unknown"}
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

      {/* Route Controls Panel - Only show in map view */}
      {viewMode === 'map' && showRoutePanel && (
        <Paper
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            p: 2.5,
            minWidth: 320,
            maxWidth: 380,
            maxHeight: "calc(100vh - 20px)",
            overflow: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            borderRadius: 2,
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(0,0,0,0.08)",
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "rgba(0,0,0,0.05)",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(0,0,0,0.2)",
              borderRadius: "4px",
              "&:hover": {
                background: "rgba(0,0,0,0.3)",
              },
            },
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
              const totalPlants = suggestedRoutes.reduce((sum, r) => {
                const routePlants = r.totalPlants || (r.locations || []).reduce((s, loc) => 
                  s + (loc.selectedOrders || loc.orders || []).reduce((o, order) => {
                    const plants = order.numberOfPlants || order.totalPlants || order.quantity || 0;
                    return o + (typeof plants === 'number' ? plants : 0);
                  }, 0), 0);
                return sum + (typeof routePlants === 'number' ? routePlants : 0);
              }, 0);
              const totalDistance = suggestedRoutes.reduce((sum, r) => 
                sum + (r.totalDistance || calculateRouteDistance(r.locations || [])), 0
              );
              const avgDistancePerRoute = totalDistance / suggestedRoutes.length;
              const totalTollCost = suggestedRoutes.reduce((sum, r) => 
                sum + (r.totalTollCost || 0), 0
              );
              
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
                  {totalTollCost > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption">🛣️ Total Toll Cost:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "#f57c00" }}>
                        ₹{totalTollCost.toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption">Avg Distance/Route:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{avgDistancePerRoute.toFixed(1)} km</Typography>
                  </Box>
                </Box>
              );
            })()}
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
                  onClick={(e) => {
                    // Don't trigger if clicking on buttons
                    if (e.target.closest('button')) return;
                    
                    // Show route details dialog
                    setSelectedRouteDetails({ ...route, routeIndex: idx });
                    setShowRouteDetailsDialog(true);
                    // Also focus on the route
                    if (!isFocused) {
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
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: isFocused ? "#ff5722" : color }}>
                        Route {idx + 1} ({routeLocations.length} stops) {isFocused ? "👁️" : ""}
                      </Typography>
                      {route.vehicleName && (
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontSize: "0.65rem" }}>
                          🚛 {route.vehicleName}{route.vehicleNumber ? ` · ${route.vehicleNumber}` : ""}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create a temporary route object for alternatives
                          const tempRoute = {
                            id: `suggested-${idx}`,
                            locations: routeLocations,
                            ...route
                          };
                          handleShowRouteAlternatives(tempRoute);
                        }}
                        sx={{ fontSize: "0.65rem", py: 0.25, minWidth: "auto", px: 0.5 }}
                        title="View Alternative Routes"
                      >
                        <Route sx={{ fontSize: "0.8rem" }} />
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Open village selection dialog
                          setRouteForStopAddition(`suggested-${idx}`);
                          setShowAddStopDialog(true);
                          setVillageSearchQuery("");
                        }}
                        sx={{ fontSize: "0.65rem", py: 0.25, minWidth: "auto", px: 0.5 }}
                        title="Add Stop - Select Village"
                      >
                        <Add sx={{ fontSize: "0.8rem" }} />
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Enable edit mode for this route
                          setEditingRouteId(`suggested-${idx}`);
                          alert("Edit mode enabled. Click markers to add/remove stops. Click 'Done Editing' when finished.");
                        }}
                        sx={{ fontSize: "0.65rem", py: 0.25, minWidth: "auto", px: 0.5 }}
                        title="Edit Route"
                      >
                        <Edit sx={{ fontSize: "0.8rem" }} />
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
                      {route.vehicle && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignRouteToBackend(route, true);
                          }}
                          sx={{ fontSize: "0.68rem", py: 0.25, whiteSpace: "nowrap" }}
                          title="Assign this vehicle + mark orders Ready for Dispatch"
                        >
                          ✅ Ready
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ display: "block", fontSize: "0.7rem" }}>
                    📦 {totalPlants.toLocaleString()} plants | 📍 {routeDistance.toFixed(1)} km
                    {route.durationMin > 0 && (
                      <span style={{ marginLeft: "8px", color: "#1976d2" }}>
                        | ⏱ {Math.round(route.durationMin)} min
                      </span>
                    )}
                    {route.totalTollCost > 0 && (
                      <span style={{ marginLeft: "8px", color: "#f57c00", fontWeight: 600 }}>
                        | 🛣️ Toll: ₹{route.totalTollCost.toLocaleString()}
                      </span>
                    )}
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
                      onClick={(e) => {
                        // Show route on map
                        handleShowRoute(route);
                        // Also show alternatives option
                        e.stopPropagation();
                      }}
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
                        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRouteForStopAddition(route.id);
                              setShowAddStopDialog(true);
                              setVillageSearchQuery("");
                            }}
                            color="primary"
                            title="Add Stop - Select Village"
                          >
                            <Add fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRouteId(route.id);
                              alert("Edit mode enabled. Click markers to add/remove stops. Click 'Done Editing' when finished.");
                            }}
                            color="warning"
                            title="Edit Route"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete route "${route.name || route.id}"?`)) {
                                handleDeleteRoute(route.id);
                              }
                            }}
                            color="error"
                            title="Delete Route"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
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
                              {route.totalTollCost > 0 && (
                                <span style={{ marginLeft: "4px", color: "#f57c00", fontWeight: 600 }}>
                                  | 🛣️ ₹{route.totalTollCost.toLocaleString()}
                                </span>
                              )}
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
      )}
      
      {/* Route Panel Toggle Button - Only in map view */}
      {viewMode === 'map' && !showRoutePanel && (
        <IconButton
          onClick={() => setShowRoutePanel(true)}
          sx={{
            position: "absolute",
            top: 10,
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

      {/* Geocoded Villages Panel Toggle Button (when hidden) - Only in map view */}
      {viewMode === 'map' && !showGeocodingPanel && validLocations.length > 0 && (
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
                        Farmer: {order.details?.farmer?.name || order.farmer?.name || order.farmerName || order.details?.customerName || "N/A"}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Plants: {order.numberOfPlants || order.totalPlants || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block" }}>
                        Phone: {order.details?.farmer?.mobileNumber || order.details?.contact || order.farmer?.mobileNumber || "N/A"}
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

      {/* Route Details Dialog */}
      <Dialog
        open={showRouteDetailsDialog}
        onClose={() => {
          setShowRouteDetailsDialog(false);
          setSelectedRouteDetails(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">
              Route {selectedRouteDetails?.routeIndex !== undefined ? selectedRouteDetails.routeIndex + 1 : ""} Details
            </Typography>
            <IconButton
              onClick={() => {
                setShowRouteDetailsDialog(false);
                setSelectedRouteDetails(null);
              }}
              size="small"
            >
              <Clear />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRouteDetails && (() => {
            const route = selectedRouteDetails;
            const routeLocations = route.locations || [];
            const totalPlants = route.totalPlants || routeLocations.reduce((sum, loc) => 
              sum + (loc.selectedOrders || loc.orders || []).reduce((s, o) => 
                s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
            );
            const routeDistance = route.totalDistance || calculateRouteDistance(routeLocations);
            
            return (
              <Box>
                {/* Route Summary */}
                <Box sx={{ mb: 3, p: 2, bgcolor: "rgba(33, 150, 243, 0.1)", borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Route Summary
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Stops</Typography>
                      <Typography variant="h6">{routeLocations.length}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Plants</Typography>
                      <Typography variant="h6">{typeof totalPlants === 'number' ? totalPlants.toLocaleString() : '0'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Total Distance</Typography>
                      <Typography variant="h6">{routeDistance.toFixed(1)} km</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Vehicle Capacity</Typography>
                      <Typography variant="h6">{route.capacity?.toLocaleString() || 'N/A'}</Typography>
                    </Box>
                    {route.totalTollCost > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">🛣️ Total Toll Cost</Typography>
                        <Typography variant="h6" sx={{ color: "#f57c00", fontWeight: 600 }}>
                          ₹{route.totalTollCost.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {route.tollInfo && route.tollInfo.tollPoints && route.tollInfo.tollPoints.length > 0 && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        Toll Points on Route:
                      </Typography>
                      {route.tollInfo.tollPoints.map((toll, idx) => (
                        <Typography key={idx} variant="caption" sx={{ display: "block", fontSize: "0.7rem" }}>
                          • {toll.distance} - {toll.instruction.replace(/<[^>]*>/g, '')}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Route Stops with Orders */}
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Stops & Orders ({routeLocations.length})
                </Typography>
                <List>
                  {routeLocations.map((location, locIdx) => {
                    const locationOrders = location.selectedOrders || location.orders || [];
                    const locationPlants = locationOrders.reduce((sum, o) => 
                      sum + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0
                    );
                    
                    return (
                      <Box key={locIdx} sx={{ mb: 2, p: 2, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Stop {locIdx + 1}: {location.village}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {location.taluka}, {location.district}
                            </Typography>
                          </Box>
                          <Chip 
                            label={`${locationOrders.length} orders | ${locationPlants.toLocaleString()} plants`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        {/* Orders in this location */}
                        <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                          Orders:
                        </Typography>
                        <List dense>
                          {locationOrders.map((order, orderIdx) => {
                            const orderPlants = order.numberOfPlants || order.totalPlants || order.quantity || 0;
                            const farmerName = order.details?.farmer?.name || order.farmer?.name || order.farmerName || order.details?.customerName || "Unknown";
                            const plantName = order.plantType?.name || order.plantType || order.plantName || order.plantSubtype?.name || "Unknown";
                            const plantSubtype = order.plantSubtype?.name || "";
                            
                            return (
                              <ListItem
                                key={order._id || order.id || orderIdx}
                                sx={{
                                  bgcolor: "rgba(0,0,0,0.02)",
                                  mb: 0.5,
                                  borderRadius: 1,
                                  border: "1px solid rgba(0,0,0,0.05)",
                                }}
                              >
                                <ListItemText
                                  primary={
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {farmerName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {order.details?.farmer?.mobileNumber || order.details?.contact || order.farmer?.mobileNumber || order.mobileNumber || "N/A"}
                                      </Typography>
                                    </Box>
                                  }
                                  secondary={
                                    <Box sx={{ mt: 0.5 }}>
                                      <Typography variant="caption" sx={{ display: "block" }}>
                                        <strong>Plant:</strong> {plantName} {plantSubtype ? `(${plantSubtype})` : ""}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: "block" }}>
                                        <strong>Quantity:</strong> {orderPlants.toLocaleString()} plants
                                      </Typography>
                                      {order.orderId && (
                                        <Typography variant="caption" sx={{ display: "block" }}>
                                          <strong>Order ID:</strong> {order.orderId}
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    );
                  })}
                </List>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowRouteDetailsDialog(false);
              setSelectedRouteDetails(null);
            }}
          >
            Close
          </Button>
          {selectedRouteDetails && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                // Assign driver for this route
                handleSaveSuggestedRoute(selectedRouteDetails);
                setShowRouteDetailsDialog(false);
                setSelectedRouteDetails(null);
              }}
            >
              Assign Driver
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Route Creation Wizard */}
      <Dialog
        open={showRouteWizard}
        onClose={() => {
          if (!assigningDriver) {
            setShowRouteWizard(false);
            setRouteStep(1);
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6">Create Route - Step {routeStep} of 3</Typography>
            <Stepper activeStep={routeStep - 1} sx={{ flex: 1, mx: 3 }}>
              <Step><StepLabel>Select Mode</StepLabel></Step>
              <Step><StepLabel>Configure Route</StepLabel></Step>
              <Step><StepLabel>Assign Driver</StepLabel></Step>
            </Stepper>
            <IconButton onClick={() => {
              if (!assigningDriver) {
                setShowRouteWizard(false);
                setRouteStep(1);
              }
            }} disabled={assigningDriver}>
              <Clear />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {routeStep === 1 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Choose Route Creation Mode
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Card 
                  sx={{ 
                    p: 2, 
                    cursor: "pointer",
                    border: routeCreationMode === 'auto' ? "2px solid #1976d2" : "1px solid #ddd",
                    bgcolor: routeCreationMode === 'auto' ? "rgba(25, 118, 210, 0.05)" : "white"
                  }}
                  onClick={() => setRouteCreationMode('auto')}
                >
                  <Typography variant="h6" sx={{ mb: 1 }}>🤖 Auto Route</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Automatically optimize routes using AI clustering and Google Directions API. Best for large order sets.
                  </Typography>
                </Card>
                <Card 
                  sx={{ 
                    p: 2, 
                    cursor: "pointer",
                    border: routeCreationMode === 'manual' ? "2px solid #1976d2" : "1px solid #ddd",
                    bgcolor: routeCreationMode === 'manual' ? "rgba(25, 118, 210, 0.05)" : "white"
                  }}
                  onClick={() => setRouteCreationMode('manual')}
                >
                  <Typography variant="h6" sx={{ mb: 1 }}>✋ Manual Route</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manually select locations and orders. Best for custom routes or when you need specific control.
                  </Typography>
                </Card>
                <Card 
                  sx={{ 
                    p: 2, 
                    cursor: "pointer",
                    border: routeCreationMode === 'hybrid' ? "2px solid #1976d2" : "1px solid #ddd",
                    bgcolor: routeCreationMode === 'hybrid' ? "rgba(25, 118, 210, 0.05)" : "white"
                  }}
                  onClick={() => setRouteCreationMode('hybrid')}
                >
                  <Typography variant="h6" sx={{ mb: 1 }}>🔄 Hybrid Route</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start with auto-optimization, then manually adjust. Best balance of speed and control.
                  </Typography>
                </Card>
              </Box>
            </Box>
          )}
          
          {routeStep === 2 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Configure Route Parameters
              </Typography>
              
              {routeCreationMode === 'auto' || routeCreationMode === 'hybrid' ? (
                <>
                  {/* Vehicle Selector */}
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Vehicle</InputLabel>
                    <Select
                      value={selectedVehicle ? (selectedVehicle._id || selectedVehicle.id || "") : ""}
                      label="Select Vehicle"
                      onChange={(e) => {
                        const vehicleId = e.target.value;
                        const vehicle = vehicles.find(v => (v._id || v.id) === vehicleId);
                        setSelectedVehicle(vehicle || null);
                        if (vehicle) {
                          setVehicleCapacity(vehicle.capacity?.toString() || "");
                        } else {
                          setVehicleCapacity("");
                        }
                      }}
                      disabled={loadingVehicles}
                    >
                      <MenuItem value="">
                        <em>Select a vehicle...</em>
                      </MenuItem>
                      {loadingVehicles ? (
                        <MenuItem disabled>Loading vehicles...</MenuItem>
                      ) : vehicles.length === 0 ? (
                        <MenuItem disabled>No vehicles available</MenuItem>
                      ) : (
                        vehicles.map((vehicle) => {
                          const capacity = vehicle.capacity || 0;
                          return (
                            <MenuItem key={vehicle._id || vehicle.id} value={vehicle._id || vehicle.id}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {vehicle.name || "Unnamed Vehicle"}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {vehicle.number || "No number"}
                                  </Typography>
                                </Box>
                                <Chip 
                                  label={capacity > 0 ? `${capacity.toLocaleString()} plants` : "No capacity"} 
                                  size="small" 
                                  color={capacity > 0 ? "primary" : "default"}
                                  sx={{ ml: 1 }}
                                />
                              </Box>
                            </MenuItem>
                          );
                        })
                      )}
                    </Select>
                  </FormControl>
                  
                  {/* Manual Capacity Input (Fallback) */}
                  <TextField
                    fullWidth
                    label="Or Enter Capacity Manually"
                    type="number"
                    value={vehicleCapacity}
                    onChange={(e) => {
                      setVehicleCapacity(e.target.value);
                      setSelectedVehicle(null);
                    }}
                    sx={{ mb: 2 }}
                    placeholder="e.g., 20000"
                    disabled={!!selectedVehicle && (selectedVehicle.capacity || 0) > 0} // Disable if vehicle with capacity is selected
                    helperText={
                      selectedVehicle 
                        ? (selectedVehicle.capacity || 0) > 0 
                          ? `Using ${selectedVehicle.name} capacity: ${(selectedVehicle.capacity || 0).toLocaleString()} plants`
                          : `${selectedVehicle.name} has no capacity set. Please enter capacity manually.`
                        : "Enter capacity if no vehicle selected"
                    }
                    error={selectedVehicle && (selectedVehicle.capacity || 0) === 0}
                  />
                  
                  {routeCreationMode === 'auto' && (
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={async () => {
                        const capacity = selectedVehicle 
                          ? (selectedVehicle.capacity || parseInt(vehicleCapacity) || 0)
                          : parseInt(vehicleCapacity) || 0;
                        if (!capacity || capacity <= 0) {
                          alert("Please select a vehicle or enter a valid vehicle capacity");
                          return;
                        }
                        setIsLoading(true);
                        try {
                          const routes = await optimizeRoutes(validLocations, capacity);
                          const routesWithIds = routes.map((route, idx) => ({
                            ...route,
                            id: `route-${Date.now()}-${idx}`,
                            capacity: capacity,
                            createdAt: new Date().toISOString()
                          }));
                          setRouteDirections({});
                          setSuggestedRoutes(routesWithIds);
                          setShowRouteSuggestions(true);
                          setRouteStep(3);
                        } catch (error) {
                          console.error("Error optimizing routes:", error);
                          alert("Error optimizing routes. Please try again.");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={!vehicleCapacity || parseInt(vehicleCapacity) <= 0 || isLoading}
                      sx={{ mb: 2 }}
                    >
                      {isLoading ? "Optimizing..." : "Generate Routes"}
                    </Button>
                  )}
                </>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  In manual mode, click on locations on the map or in the table/list view to add them to your route.
                </Alert>
              )}
              
              {routeCreationMode === 'manual' && currentRoute.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Current Route ({currentRoute.length} stops)
                  </Typography>
                  <List dense>
                    {currentRoute.map((loc, idx) => (
                      <ListItem key={loc.key}>
                        <ListItemText 
                          primary={`${idx + 1}. ${loc.village}`}
                          secondary={`${loc.orders.length} orders`}
                        />
                        <IconButton size="small" onClick={() => handleRemoveFromRoute(loc.key)}>
                          <Delete />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
          
          {routeStep === 3 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Assign Driver to Route
              </Typography>
              
              {suggestedRoutes.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Select a route to assign a driver:
                  </Typography>
                  <List>
                    {suggestedRoutes.map((route, idx) => {
                      const routeLocations = route.locations || [];
                      const totalPlants = route.totalPlants || routeLocations.reduce((sum, loc) => 
                        sum + (loc.selectedOrders || loc.orders || []).reduce((s, o) => 
                          s + (o.numberOfPlants || o.totalPlants || o.quantity || 0), 0), 0
                      );
                      const routeDistance = route.totalDistance || calculateRouteDistance(routeLocations);
                      
                      return (
                        <ListItem
                          key={idx}
                          button
                          onClick={() => {
                            setRouteToSave(route);
                            setShowDriverDialog(true);
                            setShowRouteWizard(false);
                          }}
                          sx={{
                            mb: 1,
                            border: "1px solid #ddd",
                            borderRadius: 1,
                            "&:hover": { bgcolor: "rgba(25, 118, 210, 0.05)" }
                          }}
                        >
                          <ListItemText
                            primary={`Route ${idx + 1} - ${routeLocations.length} stops`}
                            secondary={`${totalPlants.toLocaleString()} plants | ${routeDistance.toFixed(1)} km`}
                          />
                          <ChevronRight />
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              ) : currentRoute.length > 0 ? (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your manual route is ready. Click below to assign a driver.
                  </Alert>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      setRouteToSave({ locations: currentRoute });
                      setShowDriverDialog(true);
                      setShowRouteWizard(false);
                    }}
                  >
                    Assign Driver to Manual Route
                  </Button>
                </Box>
              ) : (
                <Alert severity="warning">
                  No route available. Please create a route first.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {routeStep > 1 && (
            <Button onClick={() => setRouteStep(routeStep - 1)} disabled={assigningDriver}>
              Back
            </Button>
          )}
          {routeStep < 3 && (
            <Button 
              variant="contained" 
              onClick={() => {
                if (routeStep === 1) {
                  setRouteStep(2);
                } else if (routeStep === 2) {
                  if (routeCreationMode === 'manual' && currentRoute.length === 0) {
                    alert("Please add at least one location to your route");
                    return;
                  }
                  if ((routeCreationMode === 'auto' || routeCreationMode === 'hybrid') && suggestedRoutes.length === 0) {
                    alert("Please generate routes first");
                    return;
                  }
                  setRouteStep(3);
                }
              }}
              disabled={assigningDriver}
            >
              {routeStep === 2 && routeCreationMode === 'manual' ? 'Review Route' : 'Next'}
            </Button>
          )}
          <Button onClick={() => {
            if (!assigningDriver) {
              setShowRouteWizard(false);
              setRouteStep(1);
            }
          }} disabled={assigningDriver}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Coordinate Selection Confirmation Dialog */}
      <Dialog
        open={showCoordinateConfirmDialog}
        onClose={cancelCoordinateSelection}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LocationOn color="primary" />
            <Typography variant="h6">
              Confirm Location Coordinates
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {locationForCoordinateEdit && clickedCoordinates && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Setting coordinates for: {locationForCoordinateEdit.village}
                </Typography>
                <Typography variant="caption">
                  {locationForCoordinateEdit.taluka}, {locationForCoordinateEdit.district}
                </Typography>
              </Alert>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Selected Coordinates:
                </Typography>
                <Box sx={{ p: 2, bgcolor: "rgba(33, 150, 243, 0.1)", borderRadius: 1 }}>
                  <Typography variant="body1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                    Latitude: {clickedCoordinates.lat.toFixed(6)}
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                    Longitude: {clickedCoordinates.lng.toFixed(6)}
                  </Typography>
                </Box>
              </Box>

              {locationForCoordinateEdit.coordinates && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Previous Coordinates:
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.05)", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                      Latitude: {locationForCoordinateEdit.coordinates.lat.toFixed(6)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                      Longitude: {locationForCoordinateEdit.coordinates.lng.toFixed(6)}
                    </Typography>
                    {locationForCoordinateEdit.coordinates.accuracy && (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
                        Previous accuracy: {locationForCoordinateEdit.coordinates.accuracy}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  These coordinates will be saved and used for route planning. You can always change them later.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelCoordinateSelection} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={confirmCoordinateSelection} 
            variant="contained" 
            color="primary"
            startIcon={<CheckCircle />}
          >
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Village Selection Dialog for Adding Stops */}
      <Dialog
        open={showAddStopDialog}
        onClose={() => {
          setShowAddStopDialog(false);
          setRouteForStopAddition(null);
          setVillageSearchQuery("");
          setGeocodedLocation(null);
          setSearchingLocation(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Add color="primary" />
            <Typography variant="h6">
              Add Stop to Route
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Search Village or Location"
            placeholder="Type village name, address, or any location (e.g., 'Mumbai', 'Pune, Maharashtra')..."
            value={villageSearchQuery}
            onChange={(e) => {
              setVillageSearchQuery(e.target.value);
              setGeocodedLocation(null); // Clear previous geocoded result
            }}
            sx={{ mb: 2, mt: 1 }}
            autoFocus
            InputProps={{
              endAdornment: villageSearchQuery && (
                <IconButton
                  size="small"
                  onClick={async () => {
                    if (!villageSearchQuery.trim()) return;
                    setSearchingLocation(true);
                    try {
                      // Use simple geocoding function for any location
                      const geocoded = await geocodeAnyLocation(villageSearchQuery.trim());
                      
                      if (geocoded && geocoded.lat && geocoded.lng) {
                        // Create a location object from geocoded result
                        const newLocation = {
                          key: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          village: geocoded.village || villageSearchQuery.split(',')[0].trim(),
                          taluka: geocoded.taluka || "",
                          district: geocoded.district || "",
                          state: geocoded.state || "Maharashtra",
                          coordinates: {
                            lat: geocoded.lat,
                            lng: geocoded.lng,
                            accuracy: geocoded.accuracy || 'high',
                            source: 'google-search'
                          },
                          orders: [], // No orders for custom locations
                          selectedOrders: []
                        };
                        setGeocodedLocation(newLocation);
                      } else {
                        alert("Could not find location. Please try a more specific address.");
                        setGeocodedLocation(null);
                      }
                    } catch (error) {
                      console.error("Error geocoding location:", error);
                      alert("Error searching for location. Please try again.");
                      setGeocodedLocation(null);
                    } finally {
                      setSearchingLocation(false);
                    }
                  }}
                  disabled={searchingLocation || !villageSearchQuery.trim()}
                >
                  {searchingLocation ? <CircularProgress size={20} /> : <LocationOn />}
                </IconButton>
              )
            }}
          />
          
          {/* Show geocoded location if found */}
          {geocodedLocation && (
            <Alert 
              severity="success" 
              sx={{ mb: 2 }}
              action={
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    if (!geocodedLocation.coordinates) {
                      alert("Location coordinates are missing");
                      return;
                    }
                    setIsLoading(true);
                    try {
                      await handleAddStopToRoute(routeForStopAddition, geocodedLocation);
                      setShowAddStopDialog(false);
                      setRouteForStopAddition(null);
                      setVillageSearchQuery("");
                      setGeocodedLocation(null);
                    } catch (error) {
                      console.error("Error adding stop:", error);
                      alert("Error adding stop to route");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={16} /> : "Add to Route"}
                </Button>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                ✅ Found: {geocodedLocation.village}
                {geocodedLocation.taluka && `, ${geocodedLocation.taluka}`}
                {geocodedLocation.district && `, ${geocodedLocation.district}`}
                {geocodedLocation.state && `, ${geocodedLocation.state}`}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                📍 Coordinates: {geocodedLocation.coordinates.lat.toFixed(6)}, {geocodedLocation.coordinates.lng.toFixed(6)}
              </Typography>
              {geocodedLocation.formattedAddress && (
                <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
                  {geocodedLocation.formattedAddress}
                </Typography>
              )}
            </Alert>
          )}
          
          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="text.secondary">
              OR Select from Existing Villages
            </Typography>
          </Divider>
          
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Available Villages ({validLocations.filter(loc => {
              if (!villageSearchQuery) return true;
              const query = villageSearchQuery.toLowerCase();
              return (
                loc.village?.toLowerCase().includes(query) ||
                loc.taluka?.toLowerCase().includes(query) ||
                loc.district?.toLowerCase().includes(query) ||
                loc.state?.toLowerCase().includes(query)
              );
            }).length})
          </Typography>
          
          <List sx={{ maxHeight: 400, overflow: "auto" }}>
            {validLocations
              .filter(loc => {
                // Filter out locations already in the route
                if (routeForStopAddition) {
                  if (routeForStopAddition.startsWith('suggested-')) {
                    const routeIdx = parseInt(routeForStopAddition.replace('suggested-', ''));
                    const route = suggestedRoutes[routeIdx];
                    if (route && route.locations.some(l => l.key === loc.key)) {
                      return false;
                    }
                  } else {
                    const route = routes.find(r => r.id === routeForStopAddition);
                    if (route && route.locations.some(l => l.key === loc.key)) {
                      return false;
                    }
                  }
                }
                
                // Filter by search query
                if (!villageSearchQuery) return true;
                const query = villageSearchQuery.toLowerCase();
                return (
                  loc.village?.toLowerCase().includes(query) ||
                  loc.taluka?.toLowerCase().includes(query) ||
                  loc.district?.toLowerCase().includes(query) ||
                  loc.state?.toLowerCase().includes(query)
                );
              })
              .map((location) => {
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
                
                return (
                  <ListItem
                    key={location.key}
                    onClick={async () => {
                      if (!location.coordinates) {
                        alert("This location doesn't have coordinates. Please geocode it first.");
                        return;
                      }
                      
                      setIsLoading(true);
                      await handleAddStopToRoute(routeForStopAddition, location);
                      setIsLoading(false);
                      
                      setShowAddStopDialog(false);
                      setRouteForStopAddition(null);
                      setVillageSearchQuery("");
                    }}
                    sx={{
                      border: "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 1,
                      mb: 1,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: "rgba(25, 118, 210, 0.1)",
                        border: "1px solid #1976d2",
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LocationOn color="primary" sx={{ fontSize: "1.2rem" }} />
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {location.village}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ display: "block" }}>
                            {location.taluka}, {location.district}, {location.state}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              📍 {distance} km
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              📦 {totalPlants.toLocaleString()} plants
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              📋 {location.orders.length} orders
                            </Typography>
                          </Box>
                          {location.coordinates?.accuracy && (
                            <Chip
                              label={`Accuracy: ${location.coordinates.accuracy}`}
                              size="small"
                              color={
                                location.coordinates.accuracy === 'high' ? 'success' :
                                location.coordinates.accuracy === 'medium' ? 'warning' : 'error'
                              }
                              sx={{ mt: 0.5, fontSize: "0.65rem", height: "20px" }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <ChevronRight color="action" />
                  </ListItem>
                );
              })}
          </List>
          
          {validLocations.filter(loc => {
            if (!villageSearchQuery) return false;
            const query = villageSearchQuery.toLowerCase();
            return (
              loc.village?.toLowerCase().includes(query) ||
              loc.taluka?.toLowerCase().includes(query) ||
              loc.district?.toLowerCase().includes(query)
            );
          }).length === 0 && villageSearchQuery && !geocodedLocation && (
            <Alert 
              severity="info" 
              sx={{ mt: 2 }}
              action={
                <Button
                  size="small"
                  onClick={async () => {
                    if (!villageSearchQuery.trim()) return;
                    setSearchingLocation(true);
                    try {
                      // Use simple geocoding function for any location
                      const geocoded = await geocodeAnyLocation(villageSearchQuery.trim());
                      
                      if (geocoded && geocoded.lat && geocoded.lng) {
                        // Create a location object from geocoded result
                        const newLocation = {
                          key: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          village: geocoded.village || villageSearchQuery.split(',')[0].trim(),
                          taluka: geocoded.taluka || "",
                          district: geocoded.district || "",
                          state: geocoded.state || "Maharashtra",
                          coordinates: {
                            lat: geocoded.lat,
                            lng: geocoded.lng,
                            accuracy: geocoded.accuracy || 'high',
                            source: 'google-search'
                          },
                          orders: [],
                          selectedOrders: []
                        };
                        setGeocodedLocation(newLocation);
                      } else {
                        alert("Could not find location. Please try a more specific address.");
                      }
                    } catch (error) {
                      console.error("Error geocoding location:", error);
                      alert("Error searching for location. Please try again.");
                    } finally {
                      setSearchingLocation(false);
                    }
                  }}
                  disabled={searchingLocation}
                >
                  Search on Map
                </Button>
              }
            >
              No villages found matching &quot;{villageSearchQuery}&quot;. Click &quot;Search on Map&quot; to find any location.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowAddStopDialog(false);
              setRouteForStopAddition(null);
              setVillageSearchQuery("");
              setGeocodedLocation(null);
              setSearchingLocation(false);
            }}
            variant="outlined"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alternative Routes Comparison Dialog */}
      <Dialog
        open={showRouteAlternatives}
        onClose={() => {
          setShowRouteAlternatives(false);
          setRouteAlternatives([]);
          setSelectedRouteForAlternatives(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Route color="primary" />
            <Typography variant="h6">
              Compare Alternative Routes
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRouteForAlternatives && routeAlternatives.length > 0 && (
            <Box>
              {routeAlternatives.length > 1 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Compare different route options. Click on a route to select it.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Only one route option available. Google Maps may not have alternative routes for this path. You can still view the route details below.
                  </Typography>
                </Alert>
              )}
              
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 2 }}>
                {routeAlternatives.map((altRoute, idx) => {
                  const isCurrent = idx === 0;
                  const distance = altRoute.totalDistance || (altRoute.legs ? 
                    altRoute.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000 : 0);
                  const duration = altRoute.totalDuration ? Math.round(altRoute.totalDuration / 60) : 
                    (altRoute.legs ? Math.round(altRoute.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0) / 60) : 0);
                  const tollCost = altRoute.tollInfo?.totalCost || 0;
                  
                  return (
                    <Card
                      key={idx}
                      sx={{
                        p: 2,
                        border: isCurrent ? "2px solid #1976d2" : "1px solid rgba(0,0,0,0.1)",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "rgba(25, 118, 210, 0.05)",
                          border: "2px solid #1976d2",
                        },
                      }}
                      onClick={() => {
                        // Update the route with selected alternative
                        if (selectedRouteForAlternatives) {
                          const updatedRoute = {
                            ...selectedRouteForAlternatives,
                            directions: altRoute,
                            totalDistance: distance,
                            totalTollCost: tollCost,
                            tollInfo: altRoute.tollInfo,
                          };
                          
                          // Update in routes array
                          setRoutes(routes.map(r => 
                            r.id === selectedRouteForAlternatives.id ? updatedRoute : r
                          ));
                          
                          // Clear route directions to force recalculation
                          setRouteDirections(prev => {
                            const newPrev = { ...prev };
                            delete newPrev[selectedRouteForAlternatives.id];
                            return newPrev;
                          });
                          
                          alert(`✅ Route updated with ${isCurrent ? 'optimized' : 'alternative'} route!`);
                        }
                        setShowRouteAlternatives(false);
                        setRouteAlternatives([]);
                        setSelectedRouteForAlternatives(null);
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {isCurrent ? "⭐ Optimized Route" : `Route Option ${idx + 1}`}
                        </Typography>
                        {isCurrent && (
                          <Chip label="Current" color="primary" size="small" />
                        )}
                      </Box>
                      
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">Distance:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {distance.toFixed(1)} km
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="caption" color="text.secondary">Duration:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {duration} min
                          </Typography>
                        </Box>
                        {tollCost > 0 && (
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="caption" color="text.secondary">🛣️ Toll Cost:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#f57c00" }}>
                              ₹{tollCost.toLocaleString()}
                            </Typography>
                          </Box>
                        )}
                        {altRoute.summary && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: "rgba(0,0,0,0.05)", borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {altRoute.summary}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Card>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowRouteAlternatives(false);
              setRouteAlternatives([]);
              setSelectedRouteForAlternatives(null);
            }}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderMapView;

