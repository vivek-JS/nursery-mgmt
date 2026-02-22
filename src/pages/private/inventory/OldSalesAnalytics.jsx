import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Pagination,
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import InsightsIcon from "@mui/icons-material/Insights";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  LineChart,
  Line,
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
} from "recharts";
import { GoogleMap, LoadScript, HeatmapLayer, Circle, InfoWindow } from "@react-google-maps/api";
import html2canvas from "html2canvas";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API, APIConfig, NetworkManager } from "../../../network/core";
import { CookieKeys } from "../../../constants/cookieKeys";
import MessageSquareIcon from "@mui/icons-material/Message";

const COLORS = ["#6366F1", "#22C55E", "#F97316", "#06B6D4", "#A855F7", "#EF4444"];

const DEFAULT_FILTERS = {
  startDate: "",
  endDate: "",
  district: [],
  taluka: [],
  village: [],
  plant: [],
  variety: [],
  media: [],
  batch: [],
  paymentMode: [],
  reference: [],
  marketingReference: [],
  billGivenOrNot: [],
  verifiedOrNot: [],
  shadeNo: [],
  vehicleNo: [],
  driverName: [],
  customerName: "",
  bookingNo: "",
  mobileNo: "",
};

const QUALITY_FIELDS = [
  { key: "village", label: "Village" },
  { key: "district", label: "District" },
  { key: "taluka", label: "Taluka" },
  { key: "plant", label: "Plant" },
  { key: "variety", label: "Variety" },
  { key: "media", label: "Media" },
  { key: "batch", label: "Batch" },
];

const GOOGLE_MAPS_API_KEY =
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyBq5k9ataLH59YpmLOyj4N2kiUWZquSQOs";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value || 0);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const formatPercent = (value) => `${Math.round((value || 0) * 100)}%`;

const getConfidenceColor = (value) => {
  if (value >= 0.85) return "#22c55e";
  if (value >= 0.75) return "#f59e0b";
  return "#ef4444";
};

const buildParams = (filters) => {
  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) {
      params[key] = value.join(",");
    } else if (typeof value === "string" && value.trim()) {
      params[key] = value.trim();
    }
  });
  return params;
};

const KpiCard = ({ title, value, icon, subtitle }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: 3,
      background: "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.96) 100%)",
      color: "#fff",
      height: "100%",
      boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
    }}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Box>
        <Typography variant="caption" sx={{ opacity: 0.7, letterSpacing: 0.8 }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ mt: 0.8, fontWeight: 700 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ opacity: 0.6 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
    </Stack>
  </Paper>
);

const ChartCard = ({ title, children, subtitle }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: 4,
      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
      boxShadow: "0 14px 28px rgba(15, 23, 42, 0.08)",
      border: "1px solid rgba(148, 163, 184, 0.2)",
      height: "100%",
    }}
  >
    <Stack spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {subtitle}
        </Typography>
      )}
    </Stack>
    <Box sx={{ width: "100%", height: 280 }}>{children}</Box>
  </Paper>
);

const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 2,
        background: "#0f172a",
        color: "#fff",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.3)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {label && (
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {label}
        </Typography>
      )}
      {payload.map((entry) => (
        <Typography key={entry.name} variant="body2" sx={{ fontWeight: 600 }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </Typography>
      ))}
    </Paper>
  );
};

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f8fafc" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bae6fd" }] },
];

const geocodeOldSalesLocation = async (village, taluka, district, state = "Maharashtra") => {
  if (!village || !taluka || !district) return null;
  try {
    const query = `${village}, ${taluka}, ${district}, ${state}, India`;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&region=in&components=country:IN`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === "OK" && data.results?.length) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
};

const OldSalesGeoSection = ({ filters, metric }) => {
  const [locations, setLocations] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [viewMode, setViewMode] = useState("heatmap");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const geocodeCache = useRef(new Map());

  const metricLabel = {
    totalInvoiceAmount: "Invoice",
    totalRecords: "Orders",
    totalPlantQty: "Plant Qty",
  }[metric] || "Invoice";

  const formatMetricValue = (value) =>
    metric === "totalInvoiceAmount" ? formatCurrency(value) : formatNumber(value);

  const fetchGeoSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_GEO_SUMMARY);
      const response = await instance.request(
        {},
        {
          ...filters,
          limit: 400,
          sortBy: metric,
          sortOrder: "desc",
        }
      );
      if (response?.data?.success) {
        const data = response.data.data?.locations || [];
        setLocations(data);

        if (!data.length) {
          setHeatmapData([]);
          return;
        }

        const maxValue =
          Math.max(...data.map((item) => Number(item[metric] || 0)), 1) || 1;
        setGeocodingProgress({ current: 0, total: data.length });

        const points = [];
        const batchSize = 6;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (item) => {
              const key = `${item.village}|${item.taluka}|${item.district}|${item.state}`;
              let coords = geocodeCache.current.get(key);
              if (!coords) {
                coords = await geocodeOldSalesLocation(
                  item.village,
                  item.taluka,
                  item.district,
                  item.state
                );
                if (coords) {
                  geocodeCache.current.set(key, coords);
                }
              }
              if (!coords) return null;

              const rawValue = Number(item[metric] || 0);
              const weight = maxValue > 0 ? Math.max(rawValue / maxValue, 0.15) : 0.5;
              return {
                location: coords,
                weight,
                ...item,
              };
            })
          );
          points.push(...batchResults.filter(Boolean));
          setGeocodingProgress({
            current: Math.min(i + batchSize, data.length),
            total: data.length,
          });
          if (i + batchSize < data.length) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }
        setHeatmapData(points);
      } else {
        setError("Failed to load map data");
      }
    } catch (err) {
      console.error("Geo summary error:", err);
      setError("Failed to load map data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoSummary();
  }, [filters, metric]);

  useEffect(() => {
    if (!mapRef.current || !heatmapData.length || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    heatmapData.forEach((point) => {
      bounds.extend(new window.google.maps.LatLng(point.location.lat, point.location.lng));
    });
    mapRef.current.fitBounds(bounds, { padding: 50 });
  }, [heatmapData]);

  const topLocations = useMemo(
    () => locations.slice(0, 8),
    [locations]
  );

  const heatmapOptions = {
    radius: 28,
    opacity: 0.6,
    gradient: [
      "rgba(99, 102, 241, 0)",
      "rgba(99, 102, 241, 0.6)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(14, 165, 233, 0.9)",
      "rgba(34, 197, 94, 0.95)",
      "rgba(249, 115, 22, 0.95)",
      "rgba(239, 68, 68, 1)",
    ],
  };

  const getColorForWeight = (weight) => {
    if (weight >= 0.85) return "#ef4444";
    if (weight >= 0.65) return "#f97316";
    if (weight >= 0.45) return "#22c55e";
    if (weight >= 0.3) return "#38bdf8";
    return "#6366f1";
  };

  const getRadius = (weight) => {
    const minRadius = 1200;
    const maxRadius = 6200;
    return minRadius + (maxRadius - minRadius) * Math.min(weight, 1);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} lg={8}>
        <Box sx={{ position: "relative", height: 400, borderRadius: 3, overflow: "hidden" }}>
          {loading && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 2,
                p: 2,
                borderRadius: 2,
                background: "#ffffff",
              }}
            >
              <Stack spacing={0.5}>
                <Typography variant="caption">Geocoding {metricLabel} heatmap...</Typography>
                {geocodingProgress.total > 0 && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {geocodingProgress.current} / {geocodingProgress.total} locations
                  </Typography>
                )}
              </Stack>
            </Paper>
          )}
          {error && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: "#fee2e2",
              }}
            >
              <Typography variant="caption" sx={{ color: "#b91c1c" }}>
                {error}
              </Typography>
            </Paper>
          )}
          {!loading && !heatmapData.length && !error && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: "#fef9c3",
              }}
            >
              <Typography variant="caption" sx={{ color: "#92400e" }}>
                No locations found for the current filters.
              </Typography>
            </Paper>
          )}

          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={["visualization"]}>
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={{ lat: 19.076, lng: 72.8777 }}
              zoom={7}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              options={{
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                styles: MAP_STYLE,
              }}
            >
              {viewMode === "heatmap" && heatmapData.length > 0 && window.google?.maps && (
                <HeatmapLayer
                  data={heatmapData.map((point) => ({
                    location: new window.google.maps.LatLng(
                      point.location.lat,
                      point.location.lng
                    ),
                    weight: point.weight,
                  }))}
                  options={heatmapOptions}
                />
              )}

              {viewMode === "bubble" &&
                heatmapData.map((point) => (
                  <Circle
                    key={`${point.village}-${point.taluka}-${point.district}`}
                    center={point.location}
                    radius={getRadius(point.weight)}
                    options={{
                      fillColor: getColorForWeight(point.weight),
                      fillOpacity: 0.35,
                      strokeColor: getColorForWeight(point.weight),
                      strokeOpacity: 0.8,
                      strokeWeight: 1,
                    }}
                    onClick={() => setSelectedPoint(point)}
                  />
                ))}

              {selectedPoint && (
                <InfoWindow
                  position={selectedPoint.location}
                  onCloseClick={() => setSelectedPoint(null)}
                >
                  <Box sx={{ minWidth: 160 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {selectedPoint.village}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {selectedPoint.taluka}, {selectedPoint.district}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {metricLabel}: {formatMetricValue(selectedPoint[metric])}
                    </Typography>
                  </Box>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </Box>
      </Grid>
      <Grid item xs={12} lg={4}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            height: "100%",
            borderRadius: 3,
            background: "#ffffff",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Top Locations by {metricLabel}
          </Typography>
          <Stack spacing={1.5}>
            {topLocations.map((item) => (
              <Box
                key={`${item.village}-${item.taluka}-${item.district}`}
                sx={{ cursor: "pointer" }}
                onClick={() => {
                  const point = heatmapData.find(
                    (p) =>
                      p.village === item.village &&
                      p.taluka === item.taluka &&
                      p.district === item.district
                  );
                  if (point && mapRef.current) {
                    mapRef.current.panTo(point.location);
                    mapRef.current.setZoom(9);
                    setSelectedPoint(point);
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.village}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {item.taluka}, {item.district}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.4 }}>
                  {formatMetricValue(item[metric])}
                </Typography>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
            {!topLocations.length && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                No locations yet.
              </Typography>
            )}
          </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              View Mode
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant={viewMode === "heatmap" ? "contained" : "outlined"}
                onClick={() => setViewMode("heatmap")}
              >
                Heatmap
              </Button>
              <Button
                size="small"
                variant={viewMode === "bubble" ? "contained" : "outlined"}
                onClick={() => setViewMode("bubble")}
              >
                Bubble
              </Button>
            </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
};

const OldSalesAnalytics = () => {
  const chartsRef = useRef(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [qualityTab, setQualityTab] = useState(QUALITY_FIELDS[0].key);
  const [qualityConfig, setQualityConfig] = useState({
    minSimilarity: 0.7,
    maxSimilarity: 0.85,
    minCount: 1,
    referenceLimit: 50,
    suggestionLimit: 3,
  });
  const [qualityData, setQualityData] = useState({});
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [selectedMismatch, setSelectedMismatch] = useState(null);
  const [selectedFixValue, setSelectedFixValue] = useState("");
  const [manualFixValue, setManualFixValue] = useState("");
  const [fixReason, setFixReason] = useState("");
  const [confirmLowScore, setConfirmLowScore] = useState(false);
  const [caseTab, setCaseTab] = useState(QUALITY_FIELDS[0].key);
  const [caseData, setCaseData] = useState({});
  const [caseConfig, setCaseConfig] = useState({
    minVariants: 2,
    limit: 50,
  });
  const [loadingCase, setLoadingCase] = useState(false);
  const [repeatCustomerRows, setRepeatCustomerRows] = useState([]);
  const [loadingRepeatCustomers, setLoadingRepeatCustomers] = useState(false);
  const [repeatConfig, setRepeatConfig] = useState({
    minOrders: 2,
    limit: 12,
  });
  const [geoMetric, setGeoMetric] = useState("totalInvoiceAmount");
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastCustomers, setBroadcastCustomers] = useState([]);
  const [loadingBroadcast, setLoadingBroadcast] = useState(false);
  const [broadcastListName, setBroadcastListName] = useState("");
  const [savingBroadcast, setSavingBroadcast] = useState(false);
  const [broadcastError, setBroadcastError] = useState(null);
  const [broadcastPage, setBroadcastPage] = useState(1);
  const [broadcastLimit, setBroadcastLimit] = useState(200);
  const [broadcastTotal, setBroadcastTotal] = useState(0);
  const navigate = useNavigate();

  const analyticsParams = useMemo(() => buildParams(appliedFilters), [appliedFilters]);

  const fetchFilters = async (districtValues = [], talukaValues = []) => {
    setLoadingFilters(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_FILTER_OPTIONS);
      const params = {};
      if (districtValues?.length) params.district = districtValues.join(",");
      if (talukaValues?.length) params.taluka = talukaValues.join(",");
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        const d = response.data.data || {};
        setFilterOptions({
          district: Array.isArray(d.district) ? d.district : [],
          taluka: Array.isArray(d.taluka) ? d.taluka : [],
          village: Array.isArray(d.village) ? d.village : [],
          plant: Array.isArray(d.plant) ? d.plant : [],
          variety: Array.isArray(d.variety) ? d.variety : [],
          media: Array.isArray(d.media) ? d.media : [],
          batch: Array.isArray(d.batch) ? d.batch : [],
          paymentMode: Array.isArray(d.paymentMode) ? d.paymentMode : [],
          reference: Array.isArray(d.reference) ? d.reference : [],
          marketingReference: Array.isArray(d.marketingReference) ? d.marketingReference : [],
          billGivenOrNot: Array.isArray(d.billGivenOrNot) ? d.billGivenOrNot : [],
          verifiedOrNot: Array.isArray(d.verifiedOrNot) ? d.verifiedOrNot : [],
          shadeNo: Array.isArray(d.shadeNo) ? d.shadeNo : [],
          vehicleNo: Array.isArray(d.vehicleNo) ? d.vehicleNo : [],
          driverName: Array.isArray(d.driverName) ? d.driverName : [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_ANALYTICS);
      const response = await instance.request({}, analyticsParams);
      if (response?.data?.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchRecords = async (page = pagination.page) => {
    setLoadingRecords(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_RECORDS);
      const response = await instance.request(
        {},
        {
          ...analyticsParams,
          page,
          limit: pagination.limit,
        }
      );
      if (response?.data?.success) {
        setRecords(response.data.data.records || []);
        setPagination(response.data.data.pagination || pagination);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const fetchRepeatCustomers = async () => {
    setLoadingRepeatCustomers(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_REPEAT_CUSTOMERS);
      const response = await instance.request(
        {},
        {
          ...analyticsParams,
          minOrders: repeatConfig.minOrders,
          limit: repeatConfig.limit,
        }
      );
      if (response?.data?.success) {
        setRepeatCustomerRows(response.data.data.customers || []);
      }
    } catch (error) {
      console.error("Failed to fetch repeat customers:", error);
    } finally {
      setLoadingRepeatCustomers(false);
    }
  };

  const fetchQualitySuggestions = async (field = qualityTab) => {
    setLoadingQuality(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_SUGGESTIONS);
      const response = await instance.request(
        {},
        {
          field,
          minSimilarity: qualityConfig.minSimilarity,
          maxSimilarity: qualityConfig.maxSimilarity,
          minCount: qualityConfig.minCount,
          referenceLimit: qualityConfig.referenceLimit,
          suggestionLimit: qualityConfig.suggestionLimit,
        }
      );
      if (response?.data?.success) {
        setQualityData((prev) => ({
          ...prev,
          [field]: response.data.data,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch quality suggestions:", error);
    } finally {
      setLoadingQuality(false);
    }
  };

  const fetchCaseMismatches = async (field = caseTab) => {
    setLoadingCase(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_CASE_MISMATCHES);
      const response = await instance.request(
        {},
        {
          field,
          minVariants: caseConfig.minVariants,
          limit: caseConfig.limit,
        }
      );
      if (response?.data?.success) {
        setCaseData((prev) => ({
          ...prev,
          [field]: response.data.data,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch case mismatches:", error);
    } finally {
      setLoadingCase(false);
    }
  };

  const handleCaseTabChange = (_, value) => {
    setCaseTab(value);
    if (!caseData[value]) {
      fetchCaseMismatches(value);
    }
  };

  const handleFixCase = async (item) => {
    if (!item?.recommended) return;
    try {
      const instance = NetworkManager(API.OLD_SALES.NORMALIZE_CASE);
      const response = await instance.request({
        field: caseTab,
        normalizedKey: item.normalizedKey,
        toValue: item.recommended,
        reason: "Case mismatch normalization",
        source: "case-mismatch-tab",
      });
      if (response?.data?.success) {
        fetchAnalytics();
        fetchRecords(pagination.page);
        fetchCaseMismatches(caseTab);
      }
    } catch (error) {
      console.error("Failed to fix case mismatch:", error);
    }
  };

  const handleQualityTabChange = (_, value) => {
    setQualityTab(value);
    if (!qualityData[value]) {
      fetchQualitySuggestions(value);
    }
  };

  const openFixDialog = (mismatch) => {
    setSelectedMismatch(mismatch);
    setSelectedFixValue(mismatch?.suggestions?.[0]?.value || "");
    setManualFixValue("");
    setFixReason("");
    setConfirmLowScore(false);
    setFixDialogOpen(true);
  };

  const closeFixDialog = () => {
    setFixDialogOpen(false);
    setSelectedMismatch(null);
  };

  const handleApplyFix = async () => {
    if (!selectedMismatch) return;
    const manualValue = manualFixValue.trim();
    const toValue = manualValue || selectedFixValue;
    if (!toValue) return;

    const selectedSuggestion = selectedMismatch.suggestions?.find(
      (item) => item.value === selectedFixValue
    );
    const similarity = manualValue ? null : selectedSuggestion?.similarity ?? null;

    if (similarity !== null && similarity < 0.8 && !confirmLowScore) {
      return;
    }

    try {
      const instance = NetworkManager(API.OLD_SALES.NORMALIZE);
      const response = await instance.request({
        field: qualityTab,
        fromValue: selectedMismatch.value,
        toValue,
        similarity,
        reason: fixReason,
        source: "fuzzy-suggestions",
      });
      if (response?.data?.success) {
        closeFixDialog();
        fetchAnalytics();
        fetchRecords(pagination.page);
        fetchQualitySuggestions(qualityTab);
      }
    } catch (error) {
      console.error("Failed to apply fix:", error);
    }
  };

  useEffect(() => {
    fetchFilters([], []);
  }, []);

  useEffect(() => {
    fetchQualitySuggestions(qualityTab);
  }, []);

  useEffect(() => {
    fetchCaseMismatches(caseTab);
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchRecords(1);
    fetchRepeatCustomers();
  }, [analyticsParams]);

  const handleFilterChange = (key, value) => {
    let districtForFetch = filters.district;
    let talukaForFetch = filters.taluka;
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "district") {
        next.taluka = [];
        next.village = [];
        districtForFetch = Array.isArray(value) ? value : [];
        talukaForFetch = [];
      } else if (key === "taluka") {
        next.village = [];
        talukaForFetch = Array.isArray(value) ? value : [];
      }
      return next;
    });
    if (["district", "taluka"].includes(key)) {
      fetchFilters(districtForFetch || [], talukaForFetch || []);
    }
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchAnalytics();
    fetchRecords(pagination.page);
  };

  const applyQuickRange = (type) => {
    const today = new Date();
    if (type === "last30") {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setFilters((prev) => ({
        ...prev,
        startDate: start.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }));
      return;
    }
    if (type === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilters((prev) => ({
        ...prev,
        startDate: start.toISOString().split("T")[0],
        endDate: today.toISOString().split("T")[0],
      }));
      return;
    }
    if (type === "allTime") {
      const minDate = summary?.minDeliveryDate
        ? new Date(summary.minDeliveryDate).toISOString().split("T")[0]
        : "";
      const maxDate = summary?.maxDeliveryDate
        ? new Date(summary.maxDeliveryDate).toISOString().split("T")[0]
        : "";
      setFilters((prev) => ({
        ...prev,
        startDate: minDate,
        endDate: maxDate,
      }));
    }
  };

  const activeFilterChips = useMemo(() => {
    const chips = [];
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length) {
        chips.push(`${key}: ${value.join(", ")}`);
      } else if (typeof value === "string" && value.trim()) {
        chips.push(`${key}: ${value}`);
      }
    });
    return chips;
  }, [appliedFilters]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem(CookieKeys.Auth);
      const url = `${APIConfig.BASE_URL}${API.OLD_SALES.EXPORT_CSV.endpoint}`;
      const response = await axios.get(url, {
        params: analyticsParams,
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `old-sales-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("CSV export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportFarmers = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem(CookieKeys.Auth);
      const url = `${APIConfig.BASE_URL}${API.OLD_SALES.EXPORT_FARMERS.endpoint}`;
      const response = await axios.get(url, {
        params: analyticsParams,
        responseType: "blob",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `old-sales-farmers-${Date.now()}.csv`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Farmers export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportDashboard = async () => {
    if (!chartsRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(chartsRef.current, {
        scale: 2,
        backgroundColor: "#f8fafc",
      });
      const link = document.createElement("a");
      link.download = `old-sales-dashboard-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Dashboard export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const openBroadcastModal = async () => {
    // Fetch first page of unique customers with opt_in included
    setLoadingBroadcast(true);
    setBroadcastError(null);
    setBroadcastCustomers([]);
    setBroadcastListName("");
    setBroadcastPage(1);
    setBroadcastTotal(0);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_UNIQUE_CUSTOMERS);
      const response = await instance.request(
        {},
        { ...analyticsParams, page: 1, limit: broadcastLimit }
      );
      const data = response?.data?.data || {};
      const customers = data.customers || [];
      const pagination = data.pagination || {};
      setBroadcastCustomers(customers);
      setBroadcastTotal(pagination.total || customers.length);
      setBroadcastModalOpen(true);
      if (!customers.length) {
        setBroadcastError("No farmers/customers found for the current filters.");
      }
    } catch (err) {
      console.error("Failed to fetch customers for broadcast:", err);
      setBroadcastError("Failed to load farmers for broadcast.");
    } finally {
      setLoadingBroadcast(false);
    }
  };

  const loadMoreBroadcastCustomers = async () => {
    if (loadingBroadcast) return;
    const nextPage = broadcastPage + 1;
    setLoadingBroadcast(true);
    try {
      const instance = NetworkManager(API.OLD_SALES.GET_UNIQUE_CUSTOMERS);
      const response = await instance.request(
        {},
        { ...analyticsParams, page: nextPage, limit: broadcastLimit }
      );
      const data = response?.data?.data || {};
      const customers = data.customers || [];
      const pagination = data.pagination || {};
      setBroadcastCustomers(prev => [...prev, ...customers]);
      setBroadcastPage(nextPage);
      setBroadcastTotal(pagination.total ?? broadcastTotal);
    } catch (err) {
      console.error("Failed to load more broadcast customers:", err);
    } finally {
      setLoadingBroadcast(false);
    }
  }

  const handleSaveBroadcastList = async () => {
    if (!broadcastListName.trim()) {
      setBroadcastError("Enter a list name.");
      return;
    }
    if (broadcastCustomers.length === 0) {
      setBroadcastError("No contacts to save.");
      return;
    }
    setSavingBroadcast(true);
    setBroadcastError(null);
    try {
      const contacts = broadcastCustomers.map((c) => ({
        phone: (c.mobileNumber || c.mobileNo || "")
          .toString()
          .replace(/\D/g, "")
          .replace(/^(\d{10})$/, "91$1"),
        name: (c.name || c.customerName || "").trim(),
      })).filter((c) => c.phone.length >= 10);
      const instance = NetworkManager(API.WHATSAPP_CONTACT_LIST.CREATE);
      await instance.request({
        name: broadcastListName.trim(),
        description: `From Old Sales Analytics (filtered)`,
        contacts,
        source: "manual",
      });
      setBroadcastModalOpen(false);
      navigate("/u/whatsapp");
    } catch (err) {
      console.error("Failed to create broadcast list:", err);
      setBroadcastError(err?.response?.data?.message || "Failed to create list.");
    } finally {
      setSavingBroadcast(false);
    }
  };

  const summary = analytics?.summary || {};
  const collectionRate = summary.totalInvoiceAmount
    ? Math.round(((summary.totalPaymentAmount || 0) / summary.totalInvoiceAmount) * 100)
    : 0;
  const balanceRate = summary.totalInvoiceAmount
    ? Math.round(((summary.totalRemainingAmount || 0) / summary.totalInvoiceAmount) * 100)
    : 0;
  const currentSuggestions = qualityData?.[qualityTab]?.suggestions || [];
  const currentCaseMismatches = caseData?.[caseTab]?.mismatches || [];
  const repeatStats = analytics?.repeatCustomerStats || {};
  const totalCustomers = repeatStats.totalCustomers || 0;
  const repeatCustomerCount = repeatStats.repeatCustomers || 0;
  const oneTimeCustomers = repeatStats.oneTimeCustomers || 0;
  const repeatCustomerShare = totalCustomers
    ? Math.round((repeatCustomerCount / totalCustomers) * 100)
    : 0;
  const repeatOrderShare = repeatStats.totalOrders
    ? Math.round((repeatStats.repeatOrders / repeatStats.totalOrders) * 100)
    : 0;

  return (
    <Box sx={{ p: 3, backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          boxShadow: "0 25px 50px rgba(15, 23, 42, 0.25)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsIcon sx={{ color: "#38bdf8" }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Old Sales Analytics
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.75, mt: 1 }}>
              Power BI inspired insights with smart filters, instant KPIs, and export-ready visuals.
            </Typography>
            {(summary.minDeliveryDate || summary.maxDeliveryDate) && (
              <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: "block" }}>
                Data range: {formatDate(summary.minDeliveryDate)} → {formatDate(summary.maxDeliveryDate)}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={loadingBroadcast ? <CircularProgress size={18} sx={{ color: "#0f172a" }} /> : <MessageSquareIcon />}
              onClick={openBroadcastModal}
              disabled={loadingBroadcast}
              sx={{ backgroundColor: "#10b981", color: "#fff", fontWeight: 600, "&:hover": { backgroundColor: "#059669" } }}
            >
              Create Broadcast from Filtered
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportCsv}
              disabled={exporting}
              sx={{ backgroundColor: "#38bdf8", color: "#0f172a", fontWeight: 600 }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportFarmers}
              disabled={exporting}
              sx={{ backgroundColor: "#8b5cf6", color: "#fff", fontWeight: 600, "&:hover": { backgroundColor: "#7c3aed" } }}
            >
              Export Farmers
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoGraphIcon />}
              onClick={handleExportDashboard}
              disabled={exporting}
              sx={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}
            >
              Export Dashboard
            </Button>
            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} sx={{ color: "#fff" }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 3, overflow: "hidden" }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            background: "linear-gradient(90deg, rgba(99,102,241,0.08), rgba(14,165,233,0.08))",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterAltIcon sx={{ color: "#6366f1" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Advanced Filters
            </Typography>
            {loadingFilters && <CircularProgress size={16} />}
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ backgroundColor: "#f8fafc" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={() => applyQuickRange("last30")}>
              Last 30 days
            </Button>
            <Button variant="outlined" onClick={() => applyQuickRange("thisMonth")}>
              This month
            </Button>
            <Button variant="outlined" onClick={() => applyQuickRange("allTime")}>
              All time
            </Button>
          </Stack>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.district || []}
                value={filters.district}
                onChange={(_, value) => handleFilterChange("district", value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option} label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="District" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.taluka || []}
                value={filters.taluka}
                onChange={(_, value) => handleFilterChange("taluka", value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip key={option} label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="Taluka" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.village || []}
                value={filters.village}
                onChange={(_, value) => handleFilterChange("village", value)}
                renderInput={(params) => <TextField {...params} label="Village" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.plant || []}
                value={filters.plant}
                onChange={(_, value) => handleFilterChange("plant", value)}
                renderInput={(params) => <TextField {...params} label="Plant" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.variety || []}
                value={filters.variety}
                onChange={(_, value) => handleFilterChange("variety", value)}
                renderInput={(params) => <TextField {...params} label="Variety" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.media || []}
                value={filters.media}
                onChange={(_, value) => handleFilterChange("media", value)}
                renderInput={(params) => <TextField {...params} label="Media" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.batch || []}
                value={filters.batch}
                onChange={(_, value) => handleFilterChange("batch", value)}
                renderInput={(params) => <TextField {...params} label="Batch" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.paymentMode || []}
                value={filters.paymentMode}
                onChange={(_, value) => handleFilterChange("paymentMode", value)}
                renderInput={(params) => <TextField {...params} label="Payment Mode" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.reference || []}
                value={filters.reference}
                onChange={(_, value) => handleFilterChange("reference", value)}
                renderInput={(params) => <TextField {...params} label="Reference" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.marketingReference || []}
                value={filters.marketingReference}
                onChange={(_, value) => handleFilterChange("marketingReference", value)}
                renderInput={(params) => <TextField {...params} label="Marketing Reference" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.billGivenOrNot || []}
                value={filters.billGivenOrNot}
                onChange={(_, value) => handleFilterChange("billGivenOrNot", value)}
                renderInput={(params) => <TextField {...params} label="Bill Given" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.verifiedOrNot || []}
                value={filters.verifiedOrNot}
                onChange={(_, value) => handleFilterChange("verifiedOrNot", value)}
                renderInput={(params) => <TextField {...params} label="Verified" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.shadeNo || []}
                value={filters.shadeNo}
                onChange={(_, value) => handleFilterChange("shadeNo", value)}
                renderInput={(params) => <TextField {...params} label="Shade No." />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.vehicleNo || []}
                value={filters.vehicleNo}
                onChange={(_, value) => handleFilterChange("vehicleNo", value)}
                renderInput={(params) => <TextField {...params} label="Vehicle No." />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                multiple
                options={filterOptions.driverName || []}
                value={filters.driverName}
                onChange={(_, value) => handleFilterChange("driverName", value)}
                renderInput={(params) => <TextField {...params} label="Driver Name" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Customer Name"
                fullWidth
                value={filters.customerName}
                onChange={(e) => handleFilterChange("customerName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Booking No."
                fullWidth
                value={filters.bookingNo}
                onChange={(e) => handleFilterChange("bookingNo", e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Mobile No."
                fullWidth
                value={filters.mobileNo}
                onChange={(e) => handleFilterChange("mobileNo", e.target.value)}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button variant="contained" onClick={handleApplyFilters} sx={{ fontWeight: 600 }}>
              Apply Filters
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {activeFilterChips.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            background: "#ffffff",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block" }}>
            Active filters
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {activeFilterChips.map((chip) => (
              <Chip key={chip} label={chip} color="primary" variant="outlined" />
            ))}
          </Stack>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsIcon sx={{ color: "#6366F1" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Repeat Customer Spotlight
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Customers with {repeatConfig.minOrders}+ orders sorted by total invoice.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              label="Min Orders"
              type="number"
              size="small"
              value={repeatConfig.minOrders}
              onChange={(e) =>
                setRepeatConfig((prev) => ({ ...prev, minOrders: Number(e.target.value) }))
              }
              inputProps={{ min: 2 }}
            />
            <TextField
              label="Limit"
              type="number"
              size="small"
              value={repeatConfig.limit}
              onChange={(e) =>
                setRepeatConfig((prev) => ({ ...prev, limit: Number(e.target.value) }))
              }
              inputProps={{ min: 5, max: 100 }}
            />
            <Button variant="contained" onClick={fetchRepeatCustomers}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {loadingRepeatCustomers ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <TableContainer sx={{ maxHeight: 360 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Invoice</TableCell>
                  <TableCell align="right">Plant Qty</TableCell>
                  <TableCell>First / Last</TableCell>
                  <TableCell>Last Pay Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {repeatCustomerRows.map((row, index) => (
                  <TableRow key={`${row.customerName}-${row.mobileNo}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Stack spacing={0.2}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.customerName}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${row.totalRecords} orders`}
                          sx={{
                            width: "fit-content",
                            backgroundColor: "#EEF2FF",
                            color: "#4338CA",
                          }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>{row.mobileNo}</TableCell>
                    <TableCell align="right">{formatNumber(row.totalRecords)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.totalInvoiceAmount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.totalPlantQty)}</TableCell>
                    <TableCell>
                      <Stack spacing={0.2}>
                        <Typography variant="caption">
                          {formatDate(row.firstDeliveryDate)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {formatDate(row.lastDeliveryDate)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{row.lastPaymentMode || "-"}</TableCell>
                  </TableRow>
                ))}
                {!repeatCustomerRows.length && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No repeat customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: "#fff",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <ReceiptLongIcon sx={{ color: "#6366f1" }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Farmers / Recent Records (Old Sales)
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Apply filters above, then use &quot;Create Broadcast from Filtered&quot; or &quot;Export Farmers&quot; to send WhatsApp or export name, mobile, village, taluka, district.
            </Typography>
          </Box>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        {loadingRecords ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Delivery Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Village / Taluka / District</TableCell>
                    <TableCell>Plant</TableCell>
                    <TableCell>Variety</TableCell>
                    <TableCell align="right">Plant Qty</TableCell>
                    <TableCell align="right">Invoice</TableCell>
                    <TableCell>Payment Mode</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{formatDate(row.deliveryDate)}</TableCell>
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography variant="body2">{row.customerName || "-"}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {row.mobileNo || "-"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.2}>
                          <Typography variant="caption">{row.village || "-"}</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {row.taluka || "-"} · {row.district || "-"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{row.plant || "-"}</TableCell>
                      <TableCell>{row.variety || "-"}</TableCell>
                      <TableCell align="right">{formatNumber(row.plantQty)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.totalInvoiceAmount)}</TableCell>
                      <TableCell>{row.paymentMode || "-"}</TableCell>
                      <TableCell align="right">{formatCurrency(row.remainingAmount)}</TableCell>
                    </TableRow>
                  ))}
                  {!records.length && (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Showing page {pagination.page} of {pagination.totalPages || 1} · Total {pagination.total}
              </Typography>
              <Pagination
                count={pagination.totalPages || 1}
                page={pagination.page}
                onChange={(_, value) => fetchRecords(value)}
                color="primary"
                size="small"
              />
            </Stack>
          </>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: "#ffffff",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsIcon sx={{ color: "#6366f1" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Data Quality Studio
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Detect spelling mismatches between {Math.round(qualityConfig.minSimilarity * 100)}% and{" "}
              {Math.round(qualityConfig.maxSimilarity * 100)}% similarity.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => fetchQualitySuggestions(qualityTab)}>
              Scan Suggestions
            </Button>
            {loadingQuality && <CircularProgress size={22} />}
          </Stack>
        </Stack>

        <Tabs
          value={qualityTab}
          onChange={handleQualityTabChange}
          sx={{ mt: 2, borderBottom: "1px solid rgba(148,163,184,0.3)" }}
        >
          {QUALITY_FIELDS.map((item) => (
            <Tab key={item.key} label={item.label} value={item.key} />
          ))}
        </Tabs>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={2}>
            <TextField
              label="Min Similarity"
              type="number"
              value={qualityConfig.minSimilarity}
              onChange={(e) =>
                setQualityConfig((prev) => ({ ...prev, minSimilarity: Number(e.target.value) }))
              }
              inputProps={{ step: 0.01, min: 0, max: 1 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Max Similarity"
              type="number"
              value={qualityConfig.maxSimilarity}
              onChange={(e) =>
                setQualityConfig((prev) => ({ ...prev, maxSimilarity: Number(e.target.value) }))
              }
              inputProps={{ step: 0.01, min: 0, max: 1 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              label="Min Count"
              type="number"
              value={qualityConfig.minCount}
              onChange={(e) =>
                setQualityConfig((prev) => ({ ...prev, minCount: Number(e.target.value) }))
              }
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Reference Limit"
              type="number"
              value={qualityConfig.referenceLimit}
              onChange={(e) =>
                setQualityConfig((prev) => ({ ...prev, referenceLimit: Number(e.target.value) }))
              }
              inputProps={{ min: 10 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Suggestion Limit"
              type="number"
              value={qualityConfig.suggestionLimit}
              onChange={(e) =>
                setQualityConfig((prev) => ({ ...prev, suggestionLimit: Number(e.target.value) }))
              }
              inputProps={{ min: 1, max: 8 }}
              fullWidth
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {loadingQuality ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Value</TableCell>
                  <TableCell align="right">Count</TableCell>
                  <TableCell>Suggestions</TableCell>
                  <TableCell align="right">Best Match</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentSuggestions.map((item) => {
                  const best = item.suggestions?.[0];
                  return (
                    <TableRow key={`${qualityTab}-${item.value}`}>
                      <TableCell>{item.value}</TableCell>
                      <TableCell align="right">{formatNumber(item.count)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                          {item.suggestions.map((suggestion) => (
                            <Chip
                              key={`${item.value}-${suggestion.value}`}
                              label={`${suggestion.value} • ${formatPercent(suggestion.similarity)}`}
                              size="small"
                              sx={{
                                borderColor: getConfidenceColor(suggestion.similarity),
                                color: getConfidenceColor(suggestion.similarity),
                              }}
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        {best ? (
                          <Chip
                            label={formatPercent(best.similarity)}
                            size="small"
                            sx={{
                              backgroundColor: getConfidenceColor(best.similarity),
                              color: "#fff",
                            }}
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" onClick={() => openFixDialog(item)}>
                          Fix
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!currentSuggestions.length && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No mismatches found. Try adjusting the similarity range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: "#ffffff",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsIcon sx={{ color: "#f97316" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Case Mismatch Fixer
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Normalize different letter cases (e.g., chilli vs Chilli) with one click.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={() => fetchCaseMismatches(caseTab)}>
              Scan Case Issues
            </Button>
            {loadingCase && <CircularProgress size={22} />}
          </Stack>
        </Stack>

        <Tabs
          value={caseTab}
          onChange={handleCaseTabChange}
          sx={{ mt: 2, borderBottom: "1px solid rgba(148,163,184,0.3)" }}
        >
          {QUALITY_FIELDS.map((item) => (
            <Tab key={item.key} label={item.label} value={item.key} />
          ))}
        </Tabs>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Min Variants"
              type="number"
              value={caseConfig.minVariants}
              onChange={(e) =>
                setCaseConfig((prev) => ({ ...prev, minVariants: Number(e.target.value) }))
              }
              inputProps={{ min: 2 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Limit"
              type="number"
              value={caseConfig.limit}
              onChange={(e) =>
                setCaseConfig((prev) => ({ ...prev, limit: Number(e.target.value) }))
              }
              inputProps={{ min: 10 }}
              fullWidth
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {loadingCase ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Variants</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Recommended</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentCaseMismatches.map((item) => (
                  <TableRow key={`${caseTab}-${item.normalizedKey}`}>
                    <TableCell>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {item.variants.map((variant) => (
                          <Chip
                            key={`${item.normalizedKey}-${variant.value}`}
                            label={`${variant.value} (${formatNumber(variant.count)})`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{formatNumber(item.totalCount)}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.recommended}
                        size="small"
                        sx={{ backgroundColor: "#22c55e", color: "#fff" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="contained" onClick={() => handleFixCase(item)}>
                        Fix Case
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!currentCaseMismatches.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No case mismatches found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Box ref={chartsRef}>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Total Records"
              value={formatNumber(summary.totalRecords)}
              icon={<ReceiptLongIcon sx={{ color: "#38bdf8" }} />}
              subtitle="Filtered rows count"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Total Invoice"
              value={formatCurrency(summary.totalInvoiceAmount)}
              icon={<ShowChartIcon sx={{ color: "#facc15" }} />}
              subtitle="Total invoice amount"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Total Plant Qty"
              value={formatNumber(summary.totalPlantQty)}
              icon={<AutoGraphIcon sx={{ color: "#22c55e" }} />}
              subtitle="Sum of plant quantity"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Average Rate"
              value={formatCurrency(summary.avgRate)}
              icon={<InsightsIcon sx={{ color: "#f472b6" }} />}
              subtitle="Average rate per plant"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Advance Paid"
              value={formatCurrency(summary.totalAdvancePaid)}
              icon={<ShowChartIcon sx={{ color: "#38bdf8" }} />}
              subtitle="Advance collection"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Payment Collected"
              value={formatCurrency(summary.totalPaymentAmount)}
              icon={<AutoGraphIcon sx={{ color: "#22c55e" }} />}
              subtitle={`Collection rate ${collectionRate}%`}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <KpiCard
              title="Remaining Balance"
              value={formatCurrency(summary.totalRemainingAmount)}
              icon={<InsightsIcon sx={{ color: "#f97316" }} />}
              subtitle={`Balance share ${balanceRate}%`}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={7}>
            <ChartCard title="Invoice Trend" subtitle="Daily total invoice amount">
              {loadingAnalytics ? (
                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                  <CircularProgress />
                </Stack>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.timeSeries || []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="invoiceGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <RechartsTooltip content={<ChartTooltip formatter={formatCurrency} />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalInvoiceAmount"
                      stroke="#6366F1"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalInvoiceAmount"
                      stroke="url(#invoiceGlow)"
                      strokeWidth={10}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <ChartCard title="Payment Modes" subtitle="Invoice split by mode">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.paymentModeBreakdown || []}
                    dataKey="totalInvoiceAmount"
                    nameKey="name"
                    outerRadius={92}
                    innerRadius={58}
                    paddingAngle={2}
                  >
                    {(analytics?.paymentModeBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltip formatter={formatCurrency} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <ChartCard title="Repeat Customers" subtitle="Loyalty & repeat order share">
              <Box
                sx={{
                  height: "100%",
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
                  gap: 2,
                  alignItems: "center",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Repeat", value: repeatCustomerCount },
                        { name: "One-time", value: oneTimeCustomers },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={85}
                      innerRadius={55}
                      paddingAngle={2}
                    >
                      <Cell fill="#6366F1" />
                      <Cell fill="#E2E8F0" />
                    </Pie>
                    <RechartsTooltip
                      content={<ChartTooltip formatter={(value) => formatNumber(value)} />}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={1.2}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Total Customers
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {formatNumber(totalCustomers)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Repeat Customers
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#6366F1" }}>
                      {formatNumber(repeatCustomerCount)} ({repeatCustomerShare}%)
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Repeat Orders Share
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {repeatOrderShare}%
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={5}>
            <ChartCard title="Collections Mix" subtitle="Advance, paid, and balance">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: "Amount",
                      advancePaid: summary.totalAdvancePaid || 0,
                      paymentAmount: summary.totalPaymentAmount || 0,
                      remainingAmount: summary.totalRemainingAmount || 0,
                    },
                  ]}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <RechartsTooltip content={<ChartTooltip formatter={formatCurrency} />} />
                  <Legend />
                  <Bar dataKey="advancePaid" stackId="a" fill="#38bdf8" />
                  <Bar dataKey="paymentAmount" stackId="a" fill="#22c55e" />
                  <Bar dataKey="remainingAmount" stackId="a" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={6}>
            <ChartCard title="Top Plants" subtitle="Top 10 plants by invoice amount">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.plantBreakdown || []} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "#475569" }} />
                  <RechartsTooltip content={<ChartTooltip formatter={formatCurrency} />} />
                  <Bar dataKey="totalInvoiceAmount" fill="#22C55E" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={6}>
            <ChartCard title="Top Districts" subtitle="Top 10 districts by invoice">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.districtBreakdown || []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <RechartsTooltip content={<ChartTooltip formatter={formatCurrency} />} />
                  <Bar dataKey="totalInvoiceAmount" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12} lg={6}>
            <ChartCard title="Top Sales Persons" subtitle="Top 10 by invoice amount">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.topSalesPersons || []} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: "#475569" }} />
                  <RechartsTooltip content={<ChartTooltip formatter={formatCurrency} />} />
                  <Bar dataKey="totalInvoiceAmount" fill="#6366F1" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid item xs={12}>
            <ChartCard title="Top Customers" subtitle="Top 10 customers by invoice">
              <TableContainer sx={{ maxHeight: 260 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell>Mobile</TableCell>
                      <TableCell align="right">Total Invoice</TableCell>
                      <TableCell align="right">Plant Qty</TableCell>
                      <TableCell align="right">Orders</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(analytics?.topCustomers || []).map((row) => (
                      <TableRow key={`${row.customerName}-${row.mobileNo}`}>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell>{row.mobileNo}</TableCell>
                        <TableCell align="right">{formatCurrency(row.totalInvoiceAmount)}</TableCell>
                        <TableCell align="right">{formatNumber(row.totalPlantQty)}</TableCell>
                        <TableCell align="right">{formatNumber(row.totalRecords)}</TableCell>
                      </TableRow>
                    ))}
                    {!analytics?.topCustomers?.length && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No customer data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </ChartCard>
          </Grid>
        </Grid>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mt: 3,
          borderRadius: 3,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <InsightsIcon sx={{ color: "#0ea5e9" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Geo Heatmap — Village · Taluka · District
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Identify demand clusters across villages and talukas.
            </Typography>
          </Box>
          <Tabs
            value={geoMetric}
            onChange={(_, value) => setGeoMetric(value)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Invoice" value="totalInvoiceAmount" />
            <Tab label="Orders" value="totalRecords" />
            <Tab label="Plant Qty" value="totalPlantQty" />
          </Tabs>
        </Stack>

        <OldSalesGeoSection filters={analyticsParams} metric={geoMetric} />
      </Paper>

      <Dialog open={broadcastModalOpen} onClose={() => setBroadcastModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Broadcast List from Filtered Farmers</DialogTitle>
        <DialogContent>
          {broadcastError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBroadcastError(null)}>
              {broadcastError}
            </Alert>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            {broadcastCustomers.length} unique farmer(s) / customer(s) match your current filters. Total: {broadcastTotal}. Save as a contact list
            and open WhatsApp Management to send messages.
          </Typography>
          <TextField
            fullWidth
            label="List name"
            value={broadcastListName}
            onChange={(e) => setBroadcastListName(e.target.value)}
            placeholder="e.g. Old Sales Nov 2025"
            sx={{ mt: 1 }}
          />
          {broadcastCustomers.length < broadcastTotal && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" variant="outlined" onClick={loadMoreBroadcastCustomers} disabled={loadingBroadcast}>
                {loadingBroadcast ? "Loading..." : `Load more (${broadcastCustomers.length}/${broadcastTotal})`}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Page {broadcastPage} · Showing {broadcastCustomers.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBroadcastModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveBroadcastList}
            disabled={savingBroadcast || broadcastCustomers.length === 0 || !broadcastListName.trim()}
            startIcon={savingBroadcast ? <CircularProgress size={18} /> : <MessageSquareIcon />}
            sx={{ backgroundColor: "#10b981", "&:hover": { backgroundColor: "#059669" } }}
          >
            {savingBroadcast ? "Saving..." : "Save & Open WhatsApp"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={fixDialogOpen} onClose={closeFixDialog} fullWidth maxWidth="sm">
        <DialogTitle>Normalize {qualityTab} value</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Current value: <strong>{selectedMismatch?.value}</strong>
            </Typography>
            <Typography variant="body2">
              Rows affected: {formatNumber(selectedMismatch?.count || 0)}
            </Typography>
            <Autocomplete
              options={selectedMismatch?.suggestions || []}
              value={
                (selectedMismatch?.suggestions || []).find(
                  (option) => option.value === selectedFixValue
                ) || null
              }
              onChange={(_, option) => setSelectedFixValue(option?.value || "")}
              getOptionLabel={(option) =>
                option?.value
                  ? `${option.value} (${formatPercent(option.similarity)})`
                  : ""
              }
              renderInput={(params) => (
                <TextField {...params} label="Suggested match" placeholder="Select suggestion" />
              )}
            />
            <TextField
              label="Manual value (optional)"
              value={manualFixValue}
              onChange={(e) => setManualFixValue(e.target.value)}
              fullWidth
            />
            <TextField
              label="Reason / Notes"
              value={fixReason}
              onChange={(e) => setFixReason(e.target.value)}
              fullWidth
            />
            {(() => {
              const selectedSuggestion = selectedMismatch?.suggestions?.find(
                (option) => option.value === selectedFixValue
              );
              const similarity = manualFixValue.trim()
                ? null
                : selectedSuggestion?.similarity ?? null;
              if (similarity !== null && similarity < 0.8) {
                return (
                  <>
                    <Alert severity="warning">
                      This match is below 80% confidence ({formatPercent(similarity)}). Please
                      confirm before applying.
                    </Alert>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={confirmLowScore}
                          onChange={(e) => setConfirmLowScore(e.target.checked)}
                        />
                      }
                      label="I understand and want to apply this change"
                    />
                  </>
                );
              }
              return null;
            })()}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFixDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleApplyFix}>
            Apply Fix
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OldSalesAnalytics;
