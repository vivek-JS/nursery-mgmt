import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ArrowLeft,
  Crop,
  Package,
  Search,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
} from 'lucide-react';
import { API, NetworkManager } from 'network/core';
import { Toast } from 'helpers/toasts/toastHelper';

const RamAgriInputsProductMaster = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [crops, setCrops] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [varietyDialogOpen, setVarietyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteVarietyDialogOpen, setDeleteVarietyDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingVariety, setEditingVariety] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteVarietyTarget, setDeleteVarietyTarget] = useState(null);
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState({
    cropName: '',
    description: '',
  });
  const [varietyFormData, setVarietyFormData] = useState({
    name: '',
    description: '',
    primaryUnit: '',
    secondaryUnit: '',
    conversionFactor: 1,
    defaultRate: '',
    purchasePrice: '',
  });
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [selectedVarietyForRate, setSelectedVarietyForRate] = useState(null);
  const [rateFormData, setRateFormData] = useState({
    minRate: '',
    maxRate: '',
    startDate: '',
    endDate: '',
    season: '',
    notes: '',
  });
  const [deleteRateDialogOpen, setDeleteRateDialogOpen] = useState(false);
  const [deleteRateTarget, setDeleteRateTarget] = useState(null);
  const [errors, setErrors] = useState({});
  const [rateErrors, setRateErrors] = useState({});

  useEffect(() => {
    fetchCrops();
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          setUnits(apiResponse.data);
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
          setUnits(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const response = await instance.request({ search: searchTerm });
      if (response?.data?.success || response?.data?.status === 'Success') {
        const data = response.data.data?.data || response.data.data || [];
        setCrops(data);
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
      Toast.error('Error loading crops');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== '') {
        fetchCrops();
      } else {
        fetchCrops();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const openCreateDialog = () => {
    setEditingCrop(null);
    setFormData({ cropName: '', description: '' });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (crop) => {
    setEditingCrop(crop);
    setFormData({
      cropName: crop.cropName,
      description: crop.description || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openVarietyDialog = (crop, variety = null) => {
    setSelectedCrop(crop);
    setEditingVariety(variety);
    if (variety) {
      setVarietyFormData({
        name: variety.name,
        description: variety.description || '',
        primaryUnit: variety.primaryUnit?._id || variety.primaryUnit || '',
        secondaryUnit: variety.secondaryUnit?._id || variety.secondaryUnit || '',
        conversionFactor: variety.conversionFactor || 1,
        defaultRate: variety.defaultRate ? variety.defaultRate.toString() : '',
        purchasePrice: variety.purchasePrice ? variety.purchasePrice.toString() : '',
      });
    } else {
      setVarietyFormData({ name: '', description: '', primaryUnit: '', secondaryUnit: '', conversionFactor: 1, defaultRate: '', purchasePrice: '' });
    }
    setErrors({});
    setVarietyDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCrop(null);
    setFormData({ cropName: '', description: '' });
    setErrors({});
  };

  const closeVarietyDialog = () => {
    setVarietyDialogOpen(false);
    setEditingVariety(null);
    setSelectedCrop(null);
    setVarietyFormData({ name: '', description: '', primaryUnit: '', secondaryUnit: '', conversionFactor: 1, defaultRate: '' });
    setErrors({});
  };

  const openRateDialog = (crop, variety, rate = null) => {
    setSelectedCrop(crop);
    setSelectedVarietyForRate(variety);
    setEditingRate(rate);
    if (rate) {
      const startDate = new Date(rate.startDate).toISOString().split('T')[0];
      const endDate = new Date(rate.endDate).toISOString().split('T')[0];
      setRateFormData({
        minRate: rate.minRate !== undefined ? rate.minRate.toString() : (rate.rate ? rate.rate.toString() : ''),
        maxRate: rate.maxRate !== undefined ? rate.maxRate.toString() : (rate.rate ? rate.rate.toString() : ''),
        startDate,
        endDate,
        season: rate.season || '',
        notes: rate.notes || '',
      });
    } else {
      setRateFormData({
        minRate: '',
        maxRate: '',
        startDate: '',
        endDate: '',
        season: '',
        notes: '',
      });
    }
    setRateErrors({});
    setRateDialogOpen(true);
  };

  const closeRateDialog = () => {
    setRateDialogOpen(false);
    setEditingRate(null);
    setSelectedVarietyForRate(null);
    setSelectedCrop(null);
    setRateFormData({
      minRate: '',
      maxRate: '',
      startDate: '',
      endDate: '',
      season: '',
      notes: '',
    });
    setRateErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.cropName.trim()) {
      newErrors.cropName = 'Crop name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateVarietyForm = () => {
    const newErrors = {};
    if (!varietyFormData.name.trim()) {
      newErrors.name = 'Variety name is required';
    }
    if (!varietyFormData.primaryUnit) {
      newErrors.primaryUnit = 'Primary unit is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      let response;
      if (editingCrop) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_RAM_AGRI_INPUT);
        response = await instance.request(
          { cropName: formData.cropName.trim(), description: formData.description.trim() },
          [editingCrop._id]
        );
      } else {
        const instance = NetworkManager(API.INVENTORY.CREATE_RAM_AGRI_INPUT);
        response = await instance.request({
          cropName: formData.cropName.trim(),
          description: formData.description.trim(),
          varieties: [],
        });
      }

      if (response?.data?.success || response?.data?.status === 'Success') {
        Toast.success(`Crop ${editingCrop ? 'updated' : 'created'} successfully`);
        closeDialog();
        fetchCrops();
      } else {
        Toast.error(response?.data?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving crop:', error);
      Toast.error(error?.response?.data?.message || 'Error saving crop');
    } finally {
      setLoading(false);
    }
  };

  const handleVarietySubmit = async (e) => {
    e.preventDefault();
    if (!validateVarietyForm()) return;

    try {
      setLoading(true);
      let response;
      if (editingVariety) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_VARIETY);
        response = await instance.request(
          {
            name: varietyFormData.name.trim(),
            description: varietyFormData.description.trim(),
            primaryUnit: varietyFormData.primaryUnit,
            secondaryUnit: varietyFormData.secondaryUnit || undefined,
            conversionFactor: varietyFormData.conversionFactor || 1,
            defaultRate: varietyFormData.defaultRate ? varietyFormData.defaultRate : null,
            purchasePrice: varietyFormData.purchasePrice ? varietyFormData.purchasePrice : null,
          },
          [selectedCrop._id, editingVariety._id]
        );
      } else {
        const instance = NetworkManager(API.INVENTORY.ADD_VARIETY);
        response = await instance.request(
          {
            name: varietyFormData.name.trim(),
            description: varietyFormData.description.trim(),
            primaryUnit: varietyFormData.primaryUnit,
            secondaryUnit: varietyFormData.secondaryUnit || undefined,
            conversionFactor: varietyFormData.conversionFactor || 1,
            defaultRate: varietyFormData.defaultRate ? varietyFormData.defaultRate : null,
            purchasePrice: varietyFormData.purchasePrice ? varietyFormData.purchasePrice : null,
          },
          [selectedCrop._id]
        );
      }

      if (response?.data?.success || response?.data?.status === 'Success') {
        Toast.success(`Variety ${editingVariety ? 'updated' : 'added'} successfully`);
        closeVarietyDialog();
        fetchCrops();
      } else {
        Toast.error(response?.data?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving variety:', error);
      Toast.error(error?.response?.data?.message || 'Error saving variety');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.DELETE_RAM_AGRI_INPUT);
      const response = await instance.request({}, [deleteTarget._id]);

      if (response?.data?.success || response?.data?.status === 'Success') {
        Toast.success('Crop deleted successfully');
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        fetchCrops();
      } else {
        Toast.error(response?.data?.message || 'Failed to delete crop');
      }
    } catch (error) {
      console.error('Error deleting crop:', error);
      Toast.error(error?.response?.data?.message || 'Error deleting crop');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariety = async () => {
    if (!deleteVarietyTarget || !selectedCrop) return;

    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.DELETE_VARIETY);
      const response = await instance.request(
        {},
        [selectedCrop._id, 'varieties', deleteVarietyTarget._id]
      );

      if (response?.data?.success || response?.data?.status === 'Success') {
        Toast.success('Variety deleted successfully');
        setDeleteVarietyDialogOpen(false);
        setDeleteVarietyTarget(null);
        setSelectedCrop(null);
        fetchCrops();
      } else {
        Toast.error(response?.data?.message || 'Failed to delete variety');
      }
    } catch (error) {
      console.error('Error deleting variety:', error);
      Toast.error(error?.response?.data?.message || 'Error deleting variety');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (crop) => {
    setDeleteTarget(crop);
    setDeleteDialogOpen(true);
  };

  const openDeleteVarietyDialog = (crop, variety) => {
    setSelectedCrop(crop);
    setDeleteVarietyTarget(variety);
    setDeleteVarietyDialogOpen(true);
  };

  const validateRateForm = () => {
    const newErrors = {};
    
    // Validate minRate
    if (!rateFormData.minRate || rateFormData.minRate.trim() === '') {
      newErrors.minRate = 'Min rate is required';
    } else {
      const minRate = parseFloat(rateFormData.minRate);
      if (isNaN(minRate) || minRate < 0) {
        newErrors.minRate = 'Min rate must be a positive number';
      }
    }
    
    // Validate maxRate
    if (!rateFormData.maxRate || rateFormData.maxRate.trim() === '') {
      newErrors.maxRate = 'Max rate is required';
    } else {
      const maxRate = parseFloat(rateFormData.maxRate);
      if (isNaN(maxRate) || maxRate < 0) {
        newErrors.maxRate = 'Max rate must be a positive number';
      }
    }
    
    // Validate that minRate <= maxRate
    if (!newErrors.minRate && !newErrors.maxRate) {
      const minRate = parseFloat(rateFormData.minRate);
      const maxRate = parseFloat(rateFormData.maxRate);
      if (minRate > maxRate) {
        newErrors.maxRate = 'Max rate must be greater than or equal to min rate';
      }
    }
    
    if (!rateFormData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!rateFormData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    if (rateFormData.startDate && rateFormData.endDate) {
      if (new Date(rateFormData.startDate) >= new Date(rateFormData.endDate)) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    setRateErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRateSubmit = async (e) => {
    e.preventDefault();
    if (!validateRateForm()) return;

    try {
      setLoading(true);
      let response;
      if (editingRate) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_RATE);
        response = await instance.request(
          {
            minRate: parseFloat(rateFormData.minRate),
            maxRate: parseFloat(rateFormData.maxRate),
            startDate: rateFormData.startDate,
            endDate: rateFormData.endDate,
            season: rateFormData.season.trim(),
            notes: rateFormData.notes.trim(),
          },
          [selectedCrop._id, selectedVarietyForRate._id, editingRate._id]
        );
      } else {
        const instance = NetworkManager(API.INVENTORY.ADD_RATE);
        response = await instance.request(
          {
            minRate: parseFloat(rateFormData.minRate),
            maxRate: parseFloat(rateFormData.maxRate),
            startDate: rateFormData.startDate,
            endDate: rateFormData.endDate,
            season: rateFormData.season.trim(),
            notes: rateFormData.notes.trim(),
          },
          [selectedCrop._id, selectedVarietyForRate._id]
        );
      }

      if (response?.data?.success || response?.data?.status === 'Success') {
        Toast.success(`Rate ${editingRate ? 'updated' : 'added'} successfully`);
        closeRateDialog();
        fetchCrops();
      } else {
        Toast.error(response?.data?.message || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving rate:', error);
      Toast.error(error?.response?.data?.message || 'Error saving rate');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRate = async () => {
    if (!deleteRateTarget || !selectedVarietyForRate || !selectedCrop) return;

    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.DELETE_RATE);
      const response = await instance.request(
        {},
        [selectedCrop._id, selectedVarietyForRate._id, deleteRateTarget._id]
      );

      if (response?.data?.success || response?.data?.status === 'Success') {
        Toast.success('Rate deleted successfully');
        setDeleteRateDialogOpen(false);
        setDeleteRateTarget(null);
        setSelectedVarietyForRate(null);
        setSelectedCrop(null);
        fetchCrops();
      } else {
        Toast.error(response?.data?.message || 'Failed to delete rate');
      }
    } catch (error) {
      console.error('Error deleting rate:', error);
      Toast.error(error?.response?.data?.message || 'Error deleting rate');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteRateDialog = (crop, variety, rate) => {
    setSelectedCrop(crop);
    setSelectedVarietyForRate(variety);
    setDeleteRateTarget(rate);
    setDeleteRateDialogOpen(true);
  };

  const [expandedCrops, setExpandedCrops] = useState({});

  const toggleCrop = (cropId) => {
    setExpandedCrops((prev) => ({
      ...prev,
      [cropId]: !prev[cropId],
    }));
  };

  // Format rate display (handles both range and single rate)
  const formatRateDisplay = (rate) => {
    if (!rate) return 'N/A';
    
    // Check if rate has minRate and maxRate (new format)
    if (rate.minRate !== undefined && rate.maxRate !== undefined) {
      const minRate = Number(rate.minRate);
      const maxRate = Number(rate.maxRate);
      
      if (minRate === maxRate) {
        return `₹${minRate.toFixed(2)}`;
      } else {
        return `₹${minRate.toFixed(2)} - ₹${maxRate.toFixed(2)}`;
      }
    }
    
    // Fallback to single rate (backward compatibility)
    if (rate.rate !== undefined) {
      return `₹${Number(rate.rate).toFixed(2)}`;
    }
    
    return 'N/A';
  };

  // Get current rate for a variety
  const getCurrentRate = (variety) => {
    if (!variety.rates || variety.rates.length === 0) return null;
    const currentDate = new Date();
    const activeRate = variety.rates.find(
      (r) => new Date(r.startDate) <= currentDate && new Date(r.endDate) >= currentDate
    );
    if (activeRate) return activeRate;
    
    // If no active rate, return the latest rate
    return variety.rates.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
  };

  const filteredCrops = crops.filter((crop) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      crop.cropName.toLowerCase().includes(searchLower) ||
      crop.description?.toLowerCase().includes(searchLower) ||
      crop.varieties?.some((v) => v.name.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/u/inventory')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Inventory</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
              <Crop className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                Ram Agri Inputs Product Master
              </h1>
              <p className="text-gray-600">Manage crops and their varieties</p>
            </div>
          </div>
          <button
            onClick={openCreateDialog}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Add Crop</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Crops</p>
              <p className="text-3xl font-bold text-gray-800">{crops.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Crop className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Varieties</p>
              <p className="text-3xl font-bold text-gray-800">
                {crops.reduce((sum, crop) => sum + (crop.varieties?.length || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Avg Varieties/Crop</p>
              <p className="text-3xl font-bold text-gray-800">
                {crops.length > 0
                  ? (
                      crops.reduce((sum, crop) => sum + (crop.varieties?.length || 0), 0) / crops.length
                    ).toFixed(1)
                  : 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search crops or varieties..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && crops.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <>
          {/* Crops Accordion List */}
          <div className="space-y-3">
            {filteredCrops.map((crop) => {
              const isExpanded = expandedCrops[crop._id];
              const varietiesCount = crop.varieties?.length || 0;
              const totalRates = crop.varieties?.reduce((sum, v) => sum + (v.rates?.length || 0), 0) || 0;
              
              return (
                <div
                  key={crop._id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 overflow-hidden"
                >
                  {/* Accordion Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCrop(crop._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                          <Crop className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-800">{crop.cropName}</h3>
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                                {varietiesCount} Variet{varietiesCount !== 1 ? 'ies' : 'y'}
                              </span>
                              {totalRates > 0 && (
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                                  {totalRates} Rate{totalRates !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          {crop.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{crop.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(crop);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Crop"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(crop);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Crop"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400 ml-2" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Varieties
                          </h4>
                          <button
                            onClick={() => openVarietyDialog(crop)}
                            className="flex items-center space-x-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Variety</span>
                          </button>
                        </div>

                        {crop.varieties && crop.varieties.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {crop.varieties.map((variety) => {
                              const currentRate = getCurrentRate(variety);
                              return (
                                <div
                                  key={variety._id}
                                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 hover:shadow-md transition-all group"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <span className="font-semibold text-gray-800 text-sm">{variety.name}</span>
                                        {variety.isActive ? (
                                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                            Active
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      {variety.description && (
                                        <p className="text-xs text-gray-500 mt-1 ml-6 line-clamp-2">
                                          {variety.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                                      <button
                                        onClick={() => openVarietyDialog(crop, variety)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit Variety"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => openDeleteVarietyDialog(crop, variety)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete Variety"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Current Rate Display */}
                                  {currentRate ? (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <IndianRupee className="w-4 h-4 text-green-600" />
                                            <span className="text-lg font-bold text-gray-800">
                                              {formatRateDisplay(currentRate)}
                                            </span>
                                            {currentRate.season && (
                                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                {currentRate.season}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {new Date(currentRate.startDate).toLocaleDateString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                            })}{' '}
                                            -{' '}
                                            {new Date(currentRate.endDate).toLocaleDateString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                            })}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => openRateDialog(crop, variety)}
                                          className="text-xs text-green-600 hover:text-green-700 font-semibold px-2 py-1 hover:bg-green-50 rounded transition-colors"
                                        >
                                          {variety.rates && variety.rates.length > 1 ? 'View All' : 'Add Rate'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : variety.defaultRate ? (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <IndianRupee className="w-4 h-4 text-green-600" />
                                            <span className="text-lg font-bold text-gray-800">
                                              ₹{Number(variety.defaultRate).toFixed(2)}
                                            </span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                              Default
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">Default rate</p>
                                        </div>
                                        <button
                                          onClick={() => openRateDialog(crop, variety)}
                                          className="text-xs text-green-600 hover:text-green-700 font-semibold px-2 py-1 hover:bg-green-50 rounded transition-colors"
                                        >
                                          Add Rate
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <button
                                        onClick={() => openRateDialog(crop, variety)}
                                        className="w-full flex items-center justify-center space-x-2 text-sm text-green-600 hover:text-green-700 font-semibold py-2 hover:bg-green-50 rounded transition-colors"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Rate</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Rate count badge */}
                                  {variety.rates && variety.rates.length > 1 && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() => openVarietyDialog(crop, variety)}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                      >
                                        View all {variety.rates.length} rates →
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-sm text-gray-500 mb-4">No varieties added yet</p>
                            <button
                              onClick={() => openVarietyDialog(crop)}
                              className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add First Variety</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>


          {filteredCrops.length === 0 && (
            <div className="text-center py-20">
              <Crop className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <p className="text-xl text-gray-500 mb-2">No crops found</p>
              <p className="text-gray-400 mb-6">
                {searchTerm ? 'Try a different search term' : 'Get started by adding your first crop'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreateDialog}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Crop</span>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Crop Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingCrop ? 'Edit Crop' : 'Add New Crop'}
              </h2>
              <button
                onClick={closeDialog}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Crop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cropName}
                  onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                    errors.cropName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Watermelon"
                />
                {errors.cropName && (
                  <p className="text-red-500 text-sm mt-1">{errors.cropName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingCrop ? 'Update' : 'Create'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Variety Dialog */}
      {varietyDialogOpen && selectedCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 truncate">
                  {editingVariety ? 'Edit Variety' : 'Add Variety'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate">For: {selectedCrop.cropName}</p>
              </div>
              <button
                onClick={closeVarietyDialog}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleVarietySubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Variety Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={varietyFormData.name}
                  onChange={(e) => setVarietyFormData({ ...varietyFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Veejay"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={varietyFormData.description}
                  onChange={(e) =>
                    setVarietyFormData({ ...varietyFormData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  placeholder="Optional description..."
                />
              </div>

              {/* Unit of Measurement Section */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Unit of Measurement</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Primary Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={varietyFormData.primaryUnit}
                      onChange={(e) => setVarietyFormData({ ...varietyFormData, primaryUnit: e.target.value })}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        errors.primaryUnit ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select primary unit</option>
                      {units.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name} ({unit.abbreviation})
                        </option>
                      ))}
                    </select>
                    {errors.primaryUnit && (
                      <p className="text-red-500 text-xs mt-1">{errors.primaryUnit}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Secondary Unit
                    </label>
                    <select
                      value={varietyFormData.secondaryUnit}
                      onChange={(e) => setVarietyFormData({ ...varietyFormData, secondaryUnit: e.target.value, conversionFactor: e.target.value ? varietyFormData.conversionFactor : 1 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select secondary unit (optional)</option>
                      {units.filter(u => u._id !== varietyFormData.primaryUnit).map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name} ({unit.abbreviation})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {varietyFormData.secondaryUnit && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Conversion Factor
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={varietyFormData.conversionFactor}
                      onChange={(e) => setVarietyFormData({ ...varietyFormData, conversionFactor: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="e.g., 1000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      1 {units.find(u => u._id === varietyFormData.primaryUnit)?.name || 'primary unit'} = {varietyFormData.conversionFactor} {units.find(u => u._id === varietyFormData.secondaryUnit)?.name || 'secondary unit'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Default Rate (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={varietyFormData.defaultRate}
                  onChange={(e) =>
                    setVarietyFormData({ ...varietyFormData, defaultRate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g., 150.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default rate for this variety (can be overridden by seasonal rates)
                </p>
              </div>

              {/* Historical Rates Section (only when editing) */}
              {editingVariety && editingVariety.rates && editingVariety.rates.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Rate History
                    </h4>
                    <button
                      type="button"
                      onClick={() => openRateDialog(selectedCrop, editingVariety)}
                      className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Rate</span>
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {editingVariety.rates
                      .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                      .map((rate) => (
                        <div
                          key={rate._id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-sm text-gray-800">{formatRateDisplay(rate)}</span>
                              {rate.season && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap">
                                  {rate.season}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(rate.startDate).toLocaleDateString('en-IN')} -{' '}
                              {new Date(rate.endDate).toLocaleDateString('en-IN')}
                            </p>
                            {rate.notes && (
                              <p className="text-xs text-gray-600 mt-0.5 truncate">{rate.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => openRateDialog(selectedCrop, editingVariety, rate)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Rate"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteRateDialog(selectedCrop, editingVariety, rate)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Rate"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Add Rate Button (when not editing or no rates) */}
              {(!editingVariety || !editingVariety.rates || editingVariety.rates.length === 0) && (
                <div className="pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => openRateDialog(selectedCrop, editingVariety || { _id: 'new', ...varietyFormData })}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 transition-colors font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rate</span>
                  </button>
                </div>
              )}

              <div className="flex space-x-2 pt-3 sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 pb-3 mt-3">
                <button
                  type="button"
                  onClick={closeVarietyDialog}
                  className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingVariety ? 'Update' : 'Add'}</span>
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Crop Confirmation Dialog */}
      {deleteDialogOpen && deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Crop</h2>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <span className="font-semibold">{deleteTarget.cropName}</span>?
                {deleteTarget.varieties?.length > 0 && (
                  <span className="block mt-2 text-sm text-orange-600">
                    This will also delete all {deleteTarget.varieties.length} variety(ies) associated with this crop.
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setDeleteTarget(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Variety Confirmation Dialog */}
      {deleteVarietyDialogOpen && deleteVarietyTarget && selectedCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Variety</h2>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete the variety{' '}
                <span className="font-semibold">{deleteVarietyTarget.name}</span> from{' '}
                <span className="font-semibold">{selectedCrop.cropName}</span>?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setDeleteVarietyDialogOpen(false);
                    setDeleteVarietyTarget(null);
                    setSelectedCrop(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVariety}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Rate Dialog */}
      {rateDialogOpen && selectedCrop && selectedVarietyForRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingRate ? 'Edit Rate' : 'Add Rate'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCrop.cropName} - {selectedVarietyForRate.name}
                </p>
              </div>
              <button
                onClick={closeRateDialog}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateFormData.minRate}
                    onChange={(e) =>
                      setRateFormData({ ...rateFormData, minRate: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      rateErrors.minRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {rateErrors.minRate && (
                    <p className="text-red-500 text-sm mt-1">{rateErrors.minRate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateFormData.maxRate}
                    onChange={(e) =>
                      setRateFormData({ ...rateFormData, maxRate: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      rateErrors.maxRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {rateErrors.maxRate && (
                    <p className="text-red-500 text-sm mt-1">{rateErrors.maxRate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={rateFormData.startDate}
                    onChange={(e) =>
                      setRateFormData({ ...rateFormData, startDate: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      rateErrors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {rateErrors.startDate && (
                    <p className="text-red-500 text-sm mt-1">{rateErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={rateFormData.endDate}
                    onChange={(e) =>
                      setRateFormData({ ...rateFormData, endDate: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                      rateErrors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {rateErrors.endDate && (
                    <p className="text-red-500 text-sm mt-1">{rateErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Season</label>
                <input
                  type="text"
                  value={rateFormData.season}
                  onChange={(e) =>
                    setRateFormData({ ...rateFormData, season: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g., Kharif 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={rateFormData.notes}
                  onChange={(e) =>
                    setRateFormData({ ...rateFormData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeRateDialog}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingRate ? 'Update' : 'Add'} Rate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rate Confirmation Dialog */}
      {deleteRateDialogOpen && deleteRateTarget && selectedVarietyForRate && selectedCrop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Delete Rate</h2>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete the rate{' '}
                <span className="font-semibold">{formatRateDisplay(deleteRateTarget)}</span> for{' '}
                <span className="font-semibold">{selectedVarietyForRate.name}</span>?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setDeleteRateDialogOpen(false);
                    setDeleteRateTarget(null);
                    setSelectedVarietyForRate(null);
                    setSelectedCrop(null);
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRate}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RamAgriInputsProductMaster;

