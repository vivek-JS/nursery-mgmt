import { useState, useEffect, useCallback, useRef } from "react";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute
const ALERTS_CACHE_DURATION = 30000; // 30 seconds for alerts/reminders (time-sensitive)

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const invalidateCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

export const useSowingData = () => {
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState([]);
  const [stats, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [alerts, setAlerts] = useState({
    summary: null,
    dayAlerts: [],
    slotAlerts: [],
    plantAlerts: [],
  });
  const [todaySummary, setTodaySummary] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchPlants = useCallback(async (forceRefresh = false) => {
    const cacheKey = "plants";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setPlants(cached);
        return cached;
      }
    }

    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS);
      const response = await instance.request();
      if (response?.data?.data) {
        const sowingPlants = response.data.data.filter((plant) => plant.sowingAllowed);
        setPlants(sowingPlants);
        setCachedData(cacheKey, sowingPlants);
        return sowingPlants;
      }
    } catch (error) {
      console.error("Error fetching plants:", error);
      if (!forceRefresh) Toast.error("Failed to fetch plants");
    }
    return [];
  }, []);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    const cacheKey = "stats";
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        setStats(cached);
        return cached;
      }
    }

    try {
      const instance = NetworkManager(API.sowing.GET_STATS);
      const response = await instance.request();
      if (response?.data?.stats) {
        const statsData = {
          ...response.data.stats,
          plantWiseStats: response.data.plantWiseStats || [],
          subtypeWiseStats: response.data.subtypeWiseStats || [],
        };
        setStats(statsData);
        setCachedData(cacheKey, statsData);
        return statsData;
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
    return null;
  }, []);

  const fetchReminders = useCallback(async (forceRefresh = false) => {
    const cacheKey = "reminders";
    // Always invalidate cache and fetch fresh for reminders (time-sensitive)
    // Reminders change frequently and should always be fresh
    cache.delete(cacheKey);

    try {
      // Always add timestamp to force fresh fetch
      const params = { _t: Date.now() };
      const instance = NetworkManager(API.sowing.GET_REMINDERS);
      const response = await instance.request({}, params);
      if (response?.data?.data) {
        // Filter out invalid reminders (safety check)
        const validReminders = (response.data.data || []).filter(reminder => {
          if (reminder.reminderType === 'SLOT') {
            return (reminder.remainingToSow > 0 || reminder.totalQuantityRequired > 0) && 
                   (reminder.ordersBooked > 0 || reminder.totalBookedPlants > 0);
          } else if (reminder.reminderType === 'ORDER') {
            return reminder.remainingToSow > 0 && reminder.totalQuantityRequired > 0;
          }
          return true;
        });
        
        setReminders(validReminders);
        // Don't cache reminders - they should always be fresh
        return validReminders;
      } else {
        // No data means no reminders
        setReminders([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      // On error, clear reminders
      setReminders([]);
    }
    return [];
  }, []);

  const fetchAlerts = useCallback(async (forceRefresh = false) => {
    const cacheKey = "alerts";
    // Check cache with shorter duration for alerts (time-sensitive)
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ALERTS_CACHE_DURATION) {
        setAlerts(cached.data.alerts);
        setTodaySummary(cached.data.todaySummary);
        return cached.data;
      }
    } else {
      // Invalidate cache when force refreshing
      cache.delete(cacheKey);
    }

    try {
      const alertsInstance = NetworkManager(API.sowing.GET_SOWING_ALERTS_BY_START);
      const todayInstance = NetworkManager(API.sowing.GET_TODAY_SOWING_SUMMARY);

      const [alertsResponse, todayResponse] = await Promise.all([
        alertsInstance.request(),
        todayInstance.request(),
      ]);

      const alertsData = {
        summary: null,
        dayAlerts: [],
        slotAlerts: [],
        plantAlerts: [],
      };

      if (alertsResponse?.data?.data) {
        Object.assign(alertsData, alertsResponse.data.data);
      }

      const todayData = todayResponse?.data?.data || null;

      setAlerts(alertsData);
      setTodaySummary(todayData);
      setCachedData(cacheKey, { alerts: alertsData, todaySummary: todayData });
      return { alerts: alertsData, todaySummary: todayData };
    } catch (error) {
      console.error("Error fetching sowing alerts:", error);
      Toast.error("Failed to fetch sowing alerts");
    }
    return { alerts: { summary: null, dayAlerts: [], slotAlerts: [], plantAlerts: [] }, todaySummary: null };
  }, []);

  const fetchPlantSlots = useCallback(async (plantId, subtypeId, year, forceRefresh = false) => {
    const cacheKey = `plantSlots-${plantId}-${subtypeId}-${year}`;
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) return cached;
    }

    try {
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      const response = await instance.request({}, { plantId, subtypeId, year });
      const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
      setCachedData(cacheKey, slotsData);
      return slotsData;
    } catch (error) {
      console.error("Error fetching slots:", error);
      Toast.error("Failed to fetch slots data");
    }
    return [];
  }, []);

  const refreshAll = useCallback(async () => {
    invalidateCache();
    setLoading(true);
    try {
      await Promise.all([
        fetchPlants(true),
        fetchStats(true),
        fetchReminders(true),
        fetchAlerts(true),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchPlants, fetchStats, fetchReminders, fetchAlerts]);

  const refreshPlantSlots = useCallback((plantId, subtypeId, year) => {
    const cacheKey = `plantSlots-${plantId}-${subtypeId}-${year}`;
    invalidateCache(cacheKey);
  }, []);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchPlants(),
          fetchStats(),
          fetchReminders(),
          fetchAlerts(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPlants, fetchStats, fetchReminders, fetchAlerts]);

  return {
    loading,
    plants,
    stats,
    reminders,
    alerts,
    todaySummary,
    fetchPlants,
    fetchStats,
    fetchReminders,
    fetchAlerts,
    fetchPlantSlots,
    refreshAll,
    refreshPlantSlots,
    invalidateCache,
  };
};

