import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript, HeatmapLayer } from "@react-google-maps/api";
import { API } from '../../network/config/endpoints';
import NetworkManager from '../../network/core/networkManager';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBq5k9ataLH59YpmLOyj4N2kiUWZquSQOs";

// Geocoding function - simplified version for heat map
const geocodeLocation = async (village, taluka, district, state = "Maharashtra") => {
  if (!village || !taluka || !district) {
    return null;
  }

  try {
    const query = `${village}, ${taluka}, ${district}, ${state}, India`;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=in&components=country:IN`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components || [];
        
        // Check if result is in India
        const isInIndia = components.some(c => 
          c.types.includes('country') && c.short_name === 'IN'
        );
        
        if (isInIndia) {
          return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          };
        }
      }
    }
  } catch (error) {
    console.error(`Geocoding error for ${village}, ${taluka}, ${district}:`, error);
  }
  
  return null;
};

const OrderHeatMap = ({ filters = {} }) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const heatmapLayerRef = useRef(null);

  const defaultCenter = { lat: 19.0760, lng: 72.8777 }; // Mumbai, Maharashtra
  const defaultZoom = 7;

  // Fetch orders and prepare heat map data
  const fetchOrdersAndGeocode = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare API parameters
      const params = {
        search: '',
        dispatched: false,
        limit: 10000,
        page: 1
      };

      // Add date filters if provided
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        params.startDate = `${startDate.getDate().toString().padStart(2, '0')}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getFullYear()}`;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        params.endDate = `${endDate.getDate().toString().padStart(2, '0')}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getFullYear()}`;
      }

      // Add status filter if provided
      if (filters.status) {
        params.status = filters.status;
      }

      console.log('[OrderHeatMap] Fetching orders with params:', params);

      const instance = NetworkManager(API.ORDER.GET_ORDERS);
      const response = await instance.request({}, params);

      if (response?.data?.success || response?.data?.data) {
        const ordersData = response.data.data?.data || response.data.data || [];
        console.log(`[OrderHeatMap] Fetched ${ordersData.length} orders`);

        // Group orders by location (village, taluka, district)
        const locationGroups = {};
        
        ordersData.forEach(order => {
          if (order.farmer && typeof order.farmer === 'object') {
            const village = order.farmer.village || '';
            const taluka = order.farmer.talukaName || order.farmer.taluka || '';
            const district = order.farmer.districtName || order.farmer.district || '';
            const state = order.farmer.stateName || order.farmer.state || 'Maharashtra';

            if (village && taluka && district) {
              const locationKey = `${village}|${taluka}|${district}|${state}`;
              
              if (!locationGroups[locationKey]) {
                locationGroups[locationKey] = {
                  village,
                  taluka,
                  district,
                  state,
                  orderCount: 0,
                  totalPlants: 0,
                  totalAmount: 0
                };
              }
              
              locationGroups[locationKey].orderCount += 1;
              locationGroups[locationKey].totalPlants += order.numberOfPlants || 0;
              locationGroups[locationKey].totalAmount += (order.numberOfPlants || 0) * (order.rate || 0);
            }
          }
        });

        const locations = Object.values(locationGroups);
        console.log(`[OrderHeatMap] Found ${locations.length} unique locations`);

        // Geocode locations
        setGeocodingProgress({ current: 0, total: locations.length });
        const heatmapPoints = [];

        // Find max orders for normalization
        const maxOrders = locations.length > 0 ? Math.max(...locations.map(l => l.orderCount)) : 1;

        // Process in batches to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < locations.length; i += batchSize) {
          const batch = locations.slice(i, i + batchSize);
          
          const geocodePromises = batch.map(async (location) => {
            const coords = await geocodeLocation(
              location.village,
              location.taluka,
              location.district,
              location.state
            );
            
            if (coords) {
              // Weight the point by order count (more orders = higher intensity)
              // Google Maps heatmap uses weight, normalize to 0-1 range
              const weight = maxOrders > 0 ? Math.min(location.orderCount / maxOrders, 1) : 0.5;
              
              return {
                location: { lat: coords.lat, lng: coords.lng },
                weight: weight,
                orderCount: location.orderCount,
                totalPlants: location.totalPlants,
                totalAmount: location.totalAmount,
                village: location.village,
                taluka: location.taluka,
                district: location.district
              };
            }
            return null;
          });

          const results = await Promise.all(geocodePromises);
          const validResults = results.filter(r => r !== null);
          heatmapPoints.push(...validResults);

          setGeocodingProgress({ current: Math.min(i + batchSize, locations.length), total: locations.length });

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < locations.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        console.log(`[OrderHeatMap] Geocoded ${heatmapPoints.length} locations`);
        setHeatmapData(heatmapPoints);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error('[OrderHeatMap] Error:', err);
      setError(err?.response?.data?.message || 'Failed to load order data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrdersAndGeocode();
  }, [fetchOrdersAndGeocode]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    
    // Fit bounds to show all heatmap points if available
    if (heatmapData.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      heatmapData.forEach(point => {
        bounds.extend(new window.google.maps.LatLng(point.location.lat, point.location.lng));
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [heatmapData]);

  const heatmapOptions = {
    radius: 30,
    opacity: 0.6,
    gradient: [
      'rgba(0, 255, 255, 0)',
      'rgba(0, 255, 255, 1)',
      'rgba(0, 191, 255, 1)',
      'rgba(0, 127, 255, 1)',
      'rgba(0, 63, 255, 1)',
      'rgba(0, 0, 255, 1)',
      'rgba(0, 0, 223, 1)',
      'rgba(0, 0, 191, 1)',
      'rgba(0, 0, 159, 1)',
      'rgba(0, 0, 127, 1)',
      'rgba(63, 0, 91, 1)',
      'rgba(127, 0, 63, 1)',
      'rgba(191, 0, 31, 1)',
      'rgba(255, 0, 0, 1)'
    ]
  };

  return (
    <div className="h-full w-full relative">
      {loading && (
        <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div>
              <p className="text-sm font-medium text-gray-700">Loading orders...</p>
              {geocodingProgress.total > 0 && (
                <p className="text-xs text-gray-500">
                  Geocoding: {geocodingProgress.current} / {geocodingProgress.total} locations
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      {!loading && heatmapData.length === 0 && !error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded">
          No orders found for the selected filters
        </div>
      )}

      {!loading && heatmapData.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-white p-3 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Heat Map Legend</p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Low</span>
            <div className="w-4 h-4 bg-red-500 rounded ml-2"></div>
            <span>High</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Showing {heatmapData.length} locations
          </p>
        </div>
      )}

      <LoadScript
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        libraries={['visualization']}
      >
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={defaultCenter}
          zoom={defaultZoom}
          onLoad={onMapLoad}
          options={{
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          {heatmapData.length > 0 && window.google && window.google.maps && (
            <HeatmapLayer
              data={heatmapData.map(point => {
                const latLng = new window.google.maps.LatLng(point.location.lat, point.location.lng);
                return {
                  location: latLng,
                  weight: point.weight
                };
              })}
              options={heatmapOptions}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default OrderHeatMap;

