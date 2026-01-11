import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { API, NetworkManager } from '../../../network/core';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

// Helper functions for date conversion (DD-MM-YYYY <-> Date)
const parseDateFromDDMMYYYY = (dateString) => {
  if (!dateString || dateString.trim() === '') return null;
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
};

const formatDateToDDMMYYYY = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Use only merchants as suppliers (filter for both or supplier category)
  const allSuppliers = React.useMemo(() => {
    const filtered = merchants
      .filter(m => m.category === 'both' || m.category === 'supplier')
      .map(m => ({
        ...m,
        type: 'merchant',
        displayName: m.name,
        contact: m.contactPerson || m.phone || '',
        gstNumber: m.gstin || '',
        address: typeof m.address === 'string' ? m.address : 
          m.address ? `${m.address.street || ''} ${m.address.city || ''} ${m.address.state || ''} ${m.address.pincode || ''}`.trim() : '',
      }));
    console.log('All suppliers (merchants) filtered:', filtered.length, filtered);
    return filtered;
  }, [merchants]);
  const [orderItems, setOrderItems] = useState([]);
  const [productSlots, setProductSlots] = useState({}); // Store slots for each product
  const [loadingSlots, setLoadingSlots] = useState({}); // Track loading state for each product
  const [plants, setPlants] = useState([]); // For ready plants product selection
  const [subtypes, setSubtypes] = useState({}); // Store subtypes by plantId: { plantId: [subtypes] }
  const [loadingSubtypes, setLoadingSubtypes] = useState({}); // Track loading state for subtypes
  const [formData, setFormData] = useState({
    supplier: {
      name: '',
      contact: '',
      email: '',
      address: '',
      gstNumber: '',
    },
    expectedDeliveryDate: '',
    notes: '',
    autoGRN: true, // Auto GRN toggle - pre-ticked by default
  });

  useEffect(() => {
    loadProducts();
    loadMerchants();
    loadCategories();
    loadUnits();
    loadPlants(); // Load plants for ready plants product selection
    if (isEditMode && id) {
      loadPurchaseOrder();
    }
  }, [id]);

  useEffect(() => {
    loadProducts();
  }, [filterCategory]);

  const loadProducts = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS);
      const params = { limit: 1000, isActive: true };
      if (filterCategory) params.category = filterCategory;
      const response = await instance.request({}, params);
      
      if (response?.data) {
        const apiResponse = response.data;
        // Handle both response formats: {success: true, data: [...]} or {status: "Success", data: {data: [...]}}
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const productsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setProducts(productsData);
        } else if (apiResponse.success && apiResponse.data) {
          const productsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setProducts(productsData);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadMerchants = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      
      if (response?.data) {
        const apiResponse = response.data;
        // Handle format: {success: true, data: [...], pagination: {...}}
        if (apiResponse.success && apiResponse.data) {
          const merchantsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setMerchants(merchantsData);
          console.log('Merchants loaded:', merchantsData.length, merchantsData);
        } 
        // Handle format: {status: "Success", data: {data: [...], pagination: {...}}}
        else if (apiResponse.status === 'Success' && apiResponse.data) {
          const merchantsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setMerchants(merchantsData);
          console.log('Merchants loaded:', merchantsData.length, merchantsData);
        }
      }
    } catch (error) {
      console.error('Error loading merchants:', error);
      alert('Error loading merchants: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadCategories = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_CATEGORIES);
      const response = await instance.request({}, { isActive: true });
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const categoriesData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setCategories(categoriesData);
        } else if (apiResponse.success && apiResponse.data) {
          const categoriesData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setCategories(categoriesData);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPlants = async () => {
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS);
      const response = await instance.request();
      if (response?.data) {
        const plantsData = response.data.map((plant) => ({
          label: plant.name,
          value: plant.plantId || plant._id,
        }));
        setPlants(plantsData);
      }
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const loadSubtypes = async (plantId, itemIndex) => {
    if (!plantId) {
      setSubtypes(prev => ({ ...prev, [itemIndex]: [] }));
      return;
    }

    setLoadingSubtypes(prev => ({ ...prev, [itemIndex]: true }));
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE);
      const currentYear = new Date().getFullYear();
      const response = await instance.request(null, { plantId, year: currentYear });
      
      if (response?.data?.subtypes) {
        const subtypesData = response.data.subtypes.map((subtype) => ({
          label: subtype.subtypeName || subtype.name,
          value: subtype.subtypeId || subtype._id,
        }));
        setSubtypes(prev => ({ ...prev, [itemIndex]: subtypesData }));
      } else {
        setSubtypes(prev => ({ ...prev, [itemIndex]: [] }));
      }
    } catch (error) {
      console.error('Error loading subtypes:', error);
      setSubtypes(prev => ({ ...prev, [itemIndex]: [] }));
    } finally {
      setLoadingSubtypes(prev => ({ ...prev, [itemIndex]: false }));
    }
  };

  const loadUnits = async () => {
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
      console.error('Error loading units:', error);
    }
  };

  const loadPurchaseOrder = async () => {
    try {
      setLoadingData(true);
      // Wait for merchants and products to load first
      if (merchants.length === 0) {
        await loadMerchants();
      }
      if (products.length === 0) {
        await loadProducts();
      }
      
      const instance = NetworkManager(API.INVENTORY.GET_PURCHASE_ORDER_BY_ID);
      const response = await instance.request({}, [id]);
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          const poData = apiResponse.data.purchaseOrder || apiResponse.data;
          
          // Set supplier
          if (poData.supplier) {
            const supplierId = typeof poData.supplier === 'object' ? (poData.supplier._id || poData.supplier) : poData.supplier;
            // Use useEffect to set supplier once merchants are loaded
            const supplier = merchants.find(m => m._id === supplierId);
            if (supplier) {
              setSelectedSupplier(supplier);
              setFormData(prev => ({
                ...prev,
                supplier: {
                  name: supplier.name || poData.supplier?.name || '',
                  contact: supplier.contactPerson || supplier.phone || poData.supplier?.phone || '',
                  email: supplier.email || poData.supplier?.email || '',
                  address: typeof supplier.address === 'string' ? supplier.address : 
                    supplier.address ? `${supplier.address.street || ''} ${supplier.address.city || ''} ${supplier.address.state || ''} ${supplier.address.pincode || ''}`.trim() : '',
                  gstNumber: supplier.gstin || poData.supplier?.gstin || '',
                }
              }));
            } else {
              // Supplier not found in merchants, try to find it after merchants load
              setTimeout(() => {
                const allMerchants = merchants;
                const foundSupplier = allMerchants.find(m => m._id === supplierId);
                if (foundSupplier) {
                  setSelectedSupplier(foundSupplier);
                }
              }, 500);
            }
          }
          
          // Set form data
          setFormData(prev => ({
            ...prev,
            expectedDeliveryDate: poData.expectedDeliveryDate ? new Date(poData.expectedDeliveryDate).toISOString().split('T')[0] : '',
            notes: poData.notes || '',
            autoGRN: poData.autoGRN || false,
          }));
          
          // Set order items
          if (poData.items && Array.isArray(poData.items)) {
            const items = poData.items.map(item => {
              const product = typeof item.product === 'object' ? item.product : products.find(p => p._id === item.product);
              const productId = typeof item.product === 'object' ? item.product._id : item.product;
              
              const itemData = {
                productId: productId,
                quantity: item.quantity || 1,
                secondaryQuantity: '',
                rate: item.rate || 0,
                amount: item.amount || (item.quantity || 0) * (item.rate || 0),
                batchNumber: item.batchNumber || '',
                expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
                slotId: item.slotId || '',
                productName: item.productName || '',
                isReadyPlantsProduct: item.isReadyPlantsProduct || false,
                dateRange: item.dateRange ? {
                  startDate: item.dateRange.startDate || '',
                  endDate: item.dateRange.endDate || '',
                } : { startDate: '', endDate: '' },
                displayTitle: item.displayTitle || '',
                plantId: typeof item.plantId === 'object' ? item.plantId._id : item.plantId || '',
                subtypeId: item.subtypeId || '',
              };
              
              return itemData;
            });
            setOrderItems(items);
          }
        }
      }
    } catch (error) {
      console.error('Error loading purchase order:', error);
      alert('Error loading purchase order: ' + (error.response?.data?.message || error.message));
      navigate('/u/inventory/purchase-orders');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = allSuppliers.find(s => s._id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData(prev => ({
        ...prev,
        supplier: {
          name: supplier.name,
          contact: supplier.contact || supplier.contactPerson || supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
          gstNumber: supplier.gstNumber || supplier.gstin || '',
        }
      }));
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      quantity: 1,
      secondaryQuantity: '', // For secondary unit
      rate: 0, // Optional, can be 0
      amount: 0,
      batchNumber: '', // For auto GRN
      expiryDate: '', // For auto GRN
      slotId: '', // For slot selection when autoGRN is enabled
      productName: '', // Product name reference for plant products (e.g., "Ghatude")
      // Ready Plants Product fields
      isReadyPlantsProduct: false,
      dateRange: {
        startDate: '',
        endDate: '',
      },
      displayTitle: '',
      plantId: '', // For ready plants products
      subtypeId: '', // For ready plants products
    }]);
  };

  // Fetch slots for a product when it has plantId and subtypeId
  const fetchSlotsForProduct = async (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.plantId || !product.subtypeId) {
      return;
    }

    const plantId = typeof product.plantId === 'object' ? product.plantId._id : product.plantId;
    const subtypeId = product.subtypeId;

    setLoadingSlots(prev => ({ ...prev, [productId]: true }));
    try {
      const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      
      const yearPromises = years.map(year => 
        instance.request({}, { plantId, subtypeId, year })
          .catch(error => {
            console.error(`Error fetching slots for year ${year}:`, error);
            return null;
          })
      );
      
      const responses = await Promise.all(yearPromises);
      const mergedSlots = [];
      
      responses.forEach((response) => {
        if (response) {
          const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
          if (Array.isArray(slotsData) && slotsData.length > 0) {
            mergedSlots.push(...slotsData);
          }
        }
      });

      // Format slots for dropdown
      const formattedSlots = mergedSlots
        .filter(slot => slot.startDay && slot.endDay && slot.status)
        .map((slot) => {
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              return `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
            return dateStr;
          };
          
          const available = slot.availablePlants || 0;
          const startDate = formatDate(slot.startDay);
          const endDate = formatDate(slot.endDay);
          
          return {
            label: `${startDate} to ${endDate} (${available} available)`,
            value: slot._id,
            availableQuantity: available,
            startDay: slot.startDay,
            endDay: slot.endDay,
          };
        });

      setProductSlots(prev => ({ ...prev, [productId]: formattedSlots }));
    } catch (error) {
      console.error(`Error fetching slots for product ${productId}:`, error);
      setProductSlots(prev => ({ ...prev, [productId]: [] }));
    } finally {
      setLoadingSlots(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Check if a unit requires secondary UOM
  const requiresSecondaryUnit = (unit) => {
    if (!unit) return false;
    if (unit.requiresSecondaryUnit === true) return true;
    const unitName = unit.name?.toLowerCase() || '';
    const unitsRequiringSecondary = ['bag', 'box', 'seeds'];
    return unitsRequiringSecondary.includes(unitName);
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    const currentItem = updatedItems[index];
    
    updatedItems[index] = {
      ...currentItem,
      [field]: value,
    };

    // When product is selected, check if it needs secondary unit and fetch slots if needed
    if (field === 'productId' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        const primaryUnit = typeof product.primaryUnit === 'object' 
          ? product.primaryUnit 
          : units.find(u => u._id === product.primaryUnit);
        
        if (primaryUnit && requiresSecondaryUnit(primaryUnit)) {
          // Product requires secondary unit - keep secondary quantity field
          // Auto-calculate secondary quantity if primary quantity exists
          if (currentItem.quantity && product.conversionFactor) {
            updatedItems[index].secondaryQuantity = (currentItem.quantity / product.conversionFactor).toFixed(2);
          }
        } else {
          // Clear secondary quantity if not needed
          updatedItems[index].secondaryQuantity = '';
        }

        // Helper function to check if category is ready plants (handles both 'ready plants' and 'ready_plants')
        const isReadyPlantsCategory = (category) => {
          if (!category) return false;
          const normalized = category.toLowerCase().trim().replace(/_/g, ' ');
          return normalized === 'ready plants';
        };

        // Auto-enable ready plants mode if product category is "ready plants" or "ready_plants"
        if (isReadyPlantsCategory(product.category)) {
          updatedItems[index].isReadyPlantsProduct = true;
          // Use product's plantId and subtypeId - handle both populated and unpopulated cases
          let plantId = null;
          let subtypeId = null;
          
          if (product.plantId) {
            plantId = typeof product.plantId === 'object' && product.plantId._id 
              ? product.plantId._id 
              : (typeof product.plantId === 'string' ? product.plantId : null);
          }
          
          if (product.subtypeId) {
            subtypeId = typeof product.subtypeId === 'object' && product.subtypeId._id
              ? product.subtypeId._id
              : (typeof product.subtypeId === 'string' ? product.subtypeId : null);
          }
          
          updatedItems[index].plantId = plantId || '';
          updatedItems[index].subtypeId = subtypeId || '';
          // Use product name as display title
          updatedItems[index].displayTitle = product.name || '';
          
          // Log for debugging
          if (!plantId || !subtypeId) {
            console.warn('Ready plants product missing plant/subtype:', {
              productId: product._id,
              productName: product.name,
              productCategory: product.category,
              plantId: product.plantId,
              subtypeId: product.subtypeId,
              extractedPlantId: plantId,
              extractedSubtypeId: subtypeId
            });
          }
          
          // Load subtypes for this plant (if needed for display)
          if (plantId) {
            loadSubtypes(plantId, index);
          }
        } else {
          // Clear ready plants fields if product is not ready plants category
          updatedItems[index].isReadyPlantsProduct = false;
          updatedItems[index].plantId = '';
          updatedItems[index].subtypeId = '';
          updatedItems[index].dateRange = { startDate: '', endDate: '' };
          updatedItems[index].displayTitle = '';
        }

        // If product has plantId/subtypeId, fetch slots (for productStock tracking)
        // This works with or without autoGRN - allows tracking products even if GRN happens later
        if (product.plantId && product.subtypeId) {
          fetchSlotsForProduct(value);
        } else {
          // Clear slot selection if product is not linked to plant/subtype
          updatedItems[index].slotId = '';
          updatedItems[index].productName = '';
        }
      }
    }
    
    // Handle slotId changes - clear productName when slot is cleared
    if (field === 'slotId') {
      if (!value) {
        // Clear productName when slot is cleared
        updatedItems[index].productName = '';
      }
    }
    
    // Clear slot and productName when product is cleared
    if (field === 'productId' && !value) {
      updatedItems[index].slotId = '';
      updatedItems[index].productName = '';
    }

    // Auto-calculate secondary quantity when primary quantity changes
    // Secondary is dependent on primary: Secondary = Primary * Conversion Factor
    if (field === 'quantity' && value) {
      const product = products.find(p => p._id === currentItem.productId);
      if (product && product.conversionFactor && product.conversionFactor > 0) {
        const primaryUnit = typeof product.primaryUnit === 'object' 
          ? product.primaryUnit 
          : units.find(u => u._id === product.primaryUnit);
        
        if (primaryUnit && requiresSecondaryUnit(primaryUnit)) {
          // Calculate secondary quantity: primary * conversionFactor
          const secondaryQty = (parseFloat(value) * product.conversionFactor).toFixed(2);
          updatedItems[index].secondaryQuantity = parseFloat(secondaryQty);
        }
      }
    }

    // Calculate amount only if both quantity and rate are provided
    if (field === 'quantity' || field === 'rate' || field === 'secondaryQuantity') {
      const quantity = updatedItems[index].quantity || 0;
      const rate = updatedItems[index].rate || 0;
      updatedItems[index].amount = quantity * rate;
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.amount, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only merchant (supplier) and expected delivery date are mandatory
    if (!selectedSupplier || !selectedSupplier._id) {
      alert('Please select a merchant');
      return;
    }

    if (!formData.expectedDeliveryDate) {
      alert('Please select expected delivery date');
      return;
    }

    if (orderItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Validate order items - only product and quantity are required
    if (orderItems.some(item => !item.productId || !item.quantity || item.quantity <= 0)) {
      alert('Please select product and enter quantity for all items');
      return;
    }

    // Helper function to check if category is ready plants
    const isReadyPlantsCategory = (category) => {
      if (!category) return false;
      const normalized = category.toLowerCase().trim().replace(/_/g, ' ');
      return normalized === 'ready plants';
    };

    // Validate ready plants products
    for (const item of orderItems) {
      if (item.isReadyPlantsProduct) {
        const product = products.find(p => p._id === item.productId);
        const isReadyPlantsCat = product && isReadyPlantsCategory(product.category);
        
        // For ready plants category products, plantId/subtypeId come from product
        // For manually enabled ready plants, require plant/subtype selection
        if (!isReadyPlantsCat) {
          if (!item.plantId) {
            alert('Plant Type is required for ready plants products');
            return;
          }
          if (!item.subtypeId) {
            alert('Subtype is required for ready plants products');
            return;
          }
          if (!item.displayTitle || item.displayTitle.trim() === '') {
            alert('Display title is required for ready plants products');
            return;
          }
        } else {
          // For ready_plants category products, ensure plantId/subtypeId are set from product
          // Check both item (which should be set from product) and product itself
          const productPlantId = typeof product.plantId === 'object' ? product.plantId?._id : product.plantId;
          const productSubtypeId = product.subtypeId;
          
          if (!item.plantId && !productPlantId) {
            alert(`Product "${product.name}" (${product.code}) is missing plant link. Please edit the product and select a plant.`);
            return;
          }
          
          if (!item.subtypeId && !productSubtypeId) {
            alert(`Product "${product.name}" (${product.code}) is missing subtype link. Please edit the product and select a subtype.`);
            return;
          }
          
          // If product has plantId/subtypeId but item doesn't, set them from product
          if (!item.plantId && productPlantId) {
            item.plantId = productPlantId;
          }
          if (!item.subtypeId && productSubtypeId) {
            item.subtypeId = productSubtypeId;
          }
        }
        
        // Date range is always required
        if (!item.dateRange?.startDate || !item.dateRange?.endDate) {
          alert('Date range (start date and end date) is required for ready plants products');
          return;
        }
        // Validate date format (DD-MM-YYYY)
        const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
        if (!dateRegex.test(item.dateRange.startDate) || !dateRegex.test(item.dateRange.endDate)) {
          alert('Invalid date format. Please use DD-MM-YYYY format for ready plants products');
          return;
        }
      }
    }

    try {
      setLoading(true);
      
      // Transform items: productId -> product, add unit from product's primaryUnit
      const transformedItems = orderItems.map(item => {
        const product = products.find(p => p._id === item.productId);
        if (!product) {
          throw new Error(`Product not found for item: ${item.productId}`);
        }
        
        // Get unit - handle both populated and non-populated cases
        let unitId = null;
        if (product.primaryUnit) {
          unitId = typeof product.primaryUnit === 'object' 
            ? product.primaryUnit._id 
            : product.primaryUnit;
        }
        
        if (!unitId) {
          throw new Error(`Product ${product.name} (${product.code}) does not have a primary unit assigned`);
        }
        
        const itemData = {
          product: item.productId, // Use productId as product ObjectId
          unit: unitId, // Get unit from product's primaryUnit
          quantity: item.quantity,
          rate: item.rate || 0, // Default to 0 if not provided
          amount: (item.quantity || 0) * (item.rate || 0), // Calculate amount
          gst: 0, // Default GST
          discount: 0, // Default discount
        };

        // Add slotId and productName for plant products (works with or without autoGRN)
        // This allows tracking products even if GRN happens later
        if (item.slotId) {
          itemData.slotId = item.slotId; // Slot ID for productStock tracking
        }
        if (item.productName) {
          itemData.productName = item.productName; // Product name reference for plant products
        }
        
        // Add ready plants product fields
        if (item.isReadyPlantsProduct) {
          const product = products.find(p => p._id === item.productId);
          
          // Helper function to check if category is ready plants
          const isReadyPlantsCat = (category) => {
            if (!category) return false;
            const normalized = category.toLowerCase().trim().replace(/_/g, ' ');
            return normalized === 'ready plants';
          };
          
          const isReadyPlantsCatProduct = product && isReadyPlantsCat(product.category);
          
          itemData.isReadyPlantsProduct = true;
          
          // For ready plants category products, use product's plantId/subtypeId
          // For manually enabled ready plants, use selected plantId/subtypeId
          if (isReadyPlantsCatProduct) {
            const plantId = typeof product.plantId === 'object' ? product.plantId._id : product.plantId;
            itemData.plantId = plantId || item.plantId;
            itemData.subtypeId = product.subtypeId || item.subtypeId;
            itemData.displayTitle = product.name || item.displayTitle; // Use product name as display title
          } else {
            itemData.plantId = item.plantId;
            itemData.subtypeId = item.subtypeId;
            itemData.displayTitle = item.displayTitle;
          }
          
          itemData.dateRange = {
            startDate: item.dateRange.startDate,
            endDate: item.dateRange.endDate,
          };
        }
        
        // Add batch number and expiry date only if auto GRN is enabled
        if (formData.autoGRN) {
          itemData.batchNumber = item.batchNumber || ''; // Will be auto-generated in backend if empty
          itemData.expiryDate = item.expiryDate || null;
        }

        return itemData;
      });
      
      if (isEditMode) {
        // Update existing purchase order
        const instance = NetworkManager(API.INVENTORY.UPDATE_PURCHASE_ORDER);
        const response = await instance.request({
          expectedDeliveryDate: formData.expectedDeliveryDate,
          items: transformedItems,
          notes: formData.notes,
        }, [id]);

        if (response?.data) {
          const apiResponse = response.data;
          if (apiResponse.success || apiResponse.status === 'Success') {
            alert('Purchase order updated successfully!');
            navigate('/u/inventory/purchase-orders');
          } else {
            alert('Error updating purchase order: ' + (apiResponse.message || 'Unknown error'));
          }
        }
      } else {
        // Create new purchase order
        const instance = NetworkManager(API.INVENTORY.CREATE_PURCHASE_ORDER);
        const response = await instance.request({
          supplier: selectedSupplier._id, // Send supplier ObjectId, not object
          expectedDeliveryDate: formData.expectedDeliveryDate,
          items: transformedItems,
          notes: formData.notes,
          autoGRN: formData.autoGRN || false, // Include auto GRN flag
        });

        if (response?.data) {
          const apiResponse = response.data;
          if (apiResponse.success || apiResponse.status === 'Success') {
            alert('Purchase order created successfully!');
            navigate('/u/inventory/purchase-orders');
          } else {
            alert('Error creating purchase order: ' + (apiResponse.message || 'Unknown error'));
          }
        }
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Error creating purchase order: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get plant name from product
  const getPlantName = (product) => {
    if (!product || !product.plantId) return null;
    if (typeof product.plantId === 'object' && product.plantId.name) {
      return product.plantId.name;
    }
    return null;
  };

  // Helper function to get subtype name from product
  const getSubtypeName = (product) => {
    if (!product || !product.plantId || !product.subtypeId) return null;
    if (typeof product.plantId === 'object' && Array.isArray(product.plantId.subtypes)) {
      const subtype = product.plantId.subtypes.find(
        st => (st._id === product.subtypeId || st._id?.toString() === product.subtypeId?.toString())
      );
      return subtype?.name || null;
    }
    return null;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/u/inventory/purchase-orders')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{isEditMode ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
              <p className="text-gray-600">{isEditMode ? 'Update purchase order details' : 'Add new purchase order for inventory'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Supplier Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Supplier / Merchant <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSupplier?._id || ''}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a merchant</option>
                  {allSuppliers.map(supplier => {
                    const linkedProductsCount = supplier.linkedProducts?.length || 0;
                    const displayName = supplier.displayName || supplier.name;
                    const suffix = linkedProductsCount > 0 
                      ? ` (${linkedProductsCount} Ram Agri ${linkedProductsCount === 1 ? 'Product' : 'Products'})`
                      : '';
                    return (
                      <option key={supplier._id} value={supplier._id}>
                        {displayName}{suffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    expectedDeliveryDate: e.target.value
                  }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.supplier.contact}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-filled from merchant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.supplier.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-filled from merchant"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.supplier.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, address: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier address"
                />
              </div>
            </div>
            
            {/* Auto GRN Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.autoGRN}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoGRN: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    Auto GRN (Automatically create GRN when order is approved)
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.autoGRN 
                      ? 'GRN will be automatically created and approved when the purchase order is approved. Stock will be updated immediately.'
                      : 'GRN can be created separately later from the purchase order details page. Stock will be updated when GRN is approved.'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Order Items</h2>
              <button
                type="button"
                onClick={addOrderItem}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Product Search and Filter */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category._id || category.name} value={category.name || category.displayName}>
                      {category.displayName || category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto GRN Toggle */}
            <div className="mb-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoGRN}
                    onChange={(e) => {
                      const newAutoGRN = e.target.checked;
                      setFormData(prev => ({
                        ...prev,
                        autoGRN: newAutoGRN
                      }));
                      // When autoGRN is enabled, fetch slots for products that have plantId/subtypeId
                      if (newAutoGRN) {
                        orderItems.forEach((item) => {
                          if (item.productId) {
                            const product = products.find(p => p._id === item.productId);
                            if (product && product.plantId && product.subtypeId) {
                              fetchSlotsForProduct(item.productId);
                            }
                          }
                        });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Auto-create GRN when order is approved
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  When enabled, a GRN will be automatically created once this purchase order is approved. You can add batch numbers, expiry dates, and select slots below.
                </p>
              </div>
              </div>
            </div>

            {/* Items Table */}
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product / Ram Agri Inputs <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Primary Qty <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Secondary Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate (Optional)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Slot (Optional)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ready Plants
                      </th>
                      {formData.autoGRN && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Batch/Lot No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expiry Date
                          </th>
                        </>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4">
                          <select
                            value={item.productId || ''}
                            onChange={(e) => updateOrderItem(index, 'productId', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Product</option>
                            {filteredProducts.map(product => {
                              const plantName = getPlantName(product);
                              const subtypeName = getSubtypeName(product);
                              let displayText = `${product.name} (${product.category})`;
                              if (plantName && subtypeName) {
                                displayText += ` - ${plantName} / ${subtypeName}`;
                              } else if (plantName) {
                                displayText += ` - ${plantName}`;
                              }
                              return (
                                <option key={product._id} value={product._id}>
                                  {displayText}
                                </option>
                              );
                            })}
                          </select>
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            if (!product) return null;
                            const plantName = getPlantName(product);
                            const subtypeName = getSubtypeName(product);
                            if (plantName || subtypeName) {
                              return (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                  {plantName && (
                                    <div className="text-blue-700 font-medium">
                                      Plant: {plantName}
                                    </div>
                                  )}
                                  {subtypeName && (
                                    <div className="text-blue-600 mt-1">
                                      Subtype: {subtypeName}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Primary quantity"
                          />
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            if (product) {
                              const primaryUnit = typeof product.primaryUnit === 'object' 
                                ? product.primaryUnit 
                                : units.find(u => u._id === product.primaryUnit);
                              const secondaryUnit = product.secondaryUnit 
                                ? (typeof product.secondaryUnit === 'object'
                                  ? product.secondaryUnit
                                  : units.find(u => u._id === product.secondaryUnit))
                                : null;
                              const conversionFactor = product.conversionFactor;
                              
                              if (primaryUnit) {
                                return (
                                  <div className="mt-1 space-y-1">
                                    <p className="text-xs text-gray-500">
                                      {primaryUnit.name} ({primaryUnit.abbreviation})
                                    </p>
                                    {secondaryUnit && conversionFactor && conversionFactor !== 1 && (
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md">
                                        <Info className="w-3 h-3 text-purple-600" />
                                        <span className="text-xs font-medium text-purple-700">
                                          1 {primaryUnit.abbreviation} = {conversionFactor} {secondaryUnit.abbreviation}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            if (product) {
                              const primaryUnit = typeof product.primaryUnit === 'object' 
                                ? product.primaryUnit 
                                : units.find(u => u._id === product.primaryUnit);
                              
                              if (primaryUnit && requiresSecondaryUnit(primaryUnit)) {
                                const secondaryUnit = typeof product.secondaryUnit === 'object'
                                  ? product.secondaryUnit
                                  : units.find(u => u._id === product.secondaryUnit);
                                
                                const conversionFactor = product.conversionFactor || 1;
                                
                                return (
                                  <div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.secondaryQuantity || ''}
                                      onChange={(e) => updateOrderItem(index, 'secondaryQuantity', parseFloat(e.target.value) || '')}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Secondary quantity"
                                    />
                                    {secondaryUnit && (
                                      <div className="mt-1 space-y-0.5">
                                        <p className="text-xs text-gray-500">
                                          {secondaryUnit.name} ({secondaryUnit.abbreviation})
                                        </p>
                                        {conversionFactor && conversionFactor !== 1 && (
                                          <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                                            <span className="text-xs font-medium text-blue-700">
                                              1 {primaryUnit?.abbreviation || ''} = {conversionFactor} {secondaryUnit.abbreviation}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                            return <span className="text-xs text-gray-400">N/A</span>;
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateOrderItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        {/* Slot selection - available for all plant products (with or without autoGRN) */}
                        <td className="px-4 py-4">
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            const hasPlantLink = product && product.plantId && product.subtypeId;
                            const slots = productSlots[item.productId] || [];
                            const isLoading = loadingSlots[item.productId];

                            if (!hasPlantLink) {
                              return (
                                <span className="text-xs text-gray-400">
                                  Product not linked to plant
                                </span>
                              );
                            }

                            if (isLoading) {
                              return (
                                <div className="text-xs text-gray-500">Loading slots...</div>
                              );
                            }

                            if (slots.length === 0) {
                              return (
                                <span className="text-xs text-gray-400">No slots available</span>
                              );
                            }

                            return (
                              <select
                                value={item.slotId || ''}
                                onChange={(e) => updateOrderItem(index, 'slotId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Select slot (optional)</option>
                                {slots.map((slot) => (
                                  <option key={slot.value} value={slot.value}>
                                    {slot.label}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </td>
                        {/* Product Name - available for plant products with slot */}
                        <td className="px-4 py-4">
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            const isPlantProduct = product && product.category === 'plants';
                            
                            if (!isPlantProduct) {
                              return (
                                <span className="text-xs text-gray-400">
                                  Only for plants category
                                </span>
                              );
                            }
                            
                            if (!item.slotId) {
                              return (
                                <span className="text-xs text-gray-400">
                                  Select slot first
                                </span>
                              );
                            }
                            
                            return (
                              <input
                                type="text"
                                value={item.productName || ''}
                                onChange={(e) => updateOrderItem(index, 'productName', e.target.value)}
                                placeholder="e.g., Ghatude, Banana G9"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            );
                          })()}
                        </td>
                        {/* Ready Plants Product Fields */}
                        <td className="px-4 py-4">
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            
                            // Helper function to check if category is ready plants
                            const isReadyPlantsCat = (category) => {
                              if (!category) return false;
                              const normalized = category.toLowerCase().trim().replace(/_/g, ' ');
                              return normalized === 'ready plants';
                            };
                            
                            const isReadyPlantsProduct = product && isReadyPlantsCat(product.category);
                            
                            // If product is "ready plants" or "ready_plants" category, auto-enable and show only date range
                            if (isReadyPlantsProduct) {
                              const startDateValue = parseDateFromDDMMYYYY(item.dateRange?.startDate);
                              const endDateValue = parseDateFromDDMMYYYY(item.dateRange?.endDate);
                              
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded border border-blue-200">
                                    <Calendar className="w-3 h-3 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-800">Ready Plants</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">
                                        Start <span className="text-red-500">*</span>
                                      </label>
                                      <DatePicker
                                        selected={startDateValue}
                                        onChange={(date) => {
                                          const formattedDate = formatDateToDDMMYYYY(date);
                                          updateOrderItem(index, 'dateRange', {
                                            ...item.dateRange,
                                            startDate: formattedDate,
                                          });
                                        }}
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="Start"
                                        minDate={new Date()}
                                        isClearable
                                        showYearDropdown
                                        showMonthDropdown
                                        dropdownMode="select"
                                        wrapperClassName="w-full"
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                        required={item.isReadyPlantsProduct}
                                        withPortal
                                        portalId="root-portal"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">
                                        End <span className="text-red-500">*</span>
                                      </label>
                                      <DatePicker
                                        selected={endDateValue}
                                        onChange={(date) => {
                                          const formattedDate = formatDateToDDMMYYYY(date);
                                          updateOrderItem(index, 'dateRange', {
                                            ...item.dateRange,
                                            endDate: formattedDate,
                                          });
                                        }}
                                        dateFormat="dd-MM-yyyy"
                                        placeholderText="End"
                                        minDate={startDateValue || new Date()}
                                        isClearable
                                        showYearDropdown
                                        showMonthDropdown
                                        dropdownMode="select"
                                        wrapperClassName="w-full"
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                        required={item.isReadyPlantsProduct}
                                        withPortal
                                        portalId="root-portal"
                                      />
                                    </div>
                                  </div>
                                  {item.dateRange?.startDate && item.dateRange?.endDate && (
                                    <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                      <CheckCircle className="w-3 h-3 inline mr-1" />
                                      {item.dateRange.startDate} to {item.dateRange.endDate}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            
                            // For other products, show manual checkbox and full form
                            return (
                              <div className="space-y-1.5">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.isReadyPlantsProduct || false}
                                    onChange={(e) => {
                                      const isReady = e.target.checked;
                                      updateOrderItem(index, 'isReadyPlantsProduct', isReady);
                                      if (!isReady) {
                                        // Clear ready plants fields when unchecked
                                        updateOrderItem(index, 'dateRange', { startDate: '', endDate: '' });
                                        updateOrderItem(index, 'displayTitle', '');
                                        updateOrderItem(index, 'plantId', '');
                                        updateOrderItem(index, 'subtypeId', '');
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700">Ready Plants</span>
                                </label>
                                {item.isReadyPlantsProduct && (
                                  <div className="space-y-1.5 mt-1.5 p-2 bg-blue-50 rounded border border-blue-200">
                                    {/* Plant Type Selection */}
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-0.5">
                                        Plant <span className="text-red-500">*</span>
                                      </label>
                                      <select
                                        value={item.plantId || ''}
                                        onChange={(e) => {
                                          const selectedPlantId = e.target.value;
                                          updateOrderItem(index, 'plantId', selectedPlantId);
                                          updateOrderItem(index, 'subtypeId', ''); // Clear subtype when plant changes
                                          if (selectedPlantId) {
                                            loadSubtypes(selectedPlantId, index);
                                          } else {
                                            setSubtypes(prev => ({ ...prev, [index]: [] }));
                                          }
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        required={item.isReadyPlantsProduct}
                                      >
                                        <option value="">Select Plant</option>
                                        {plants.map(plant => (
                                          <option key={plant.value} value={plant.value}>
                                            {plant.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    {/* Subtype Selection - Show all subtypes when plant is selected */}
                                    {item.plantId && (
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-0.5">
                                          Subtype <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                          value={item.subtypeId || ''}
                                          onChange={(e) => updateOrderItem(index, 'subtypeId', e.target.value)}
                                          disabled={loadingSubtypes[index]}
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          required={item.isReadyPlantsProduct && item.plantId}
                                        >
                                          <option value="">
                                            {loadingSubtypes[index] ? 'Loading subtypes...' : `Select Subtype (${(subtypes[index] || []).length} available)`}
                                          </option>
                                          {(subtypes[index] || []).map(subtype => (
                                            <option key={subtype.value} value={subtype.value}>
                                              {subtype.label}
                                            </option>
                                          ))}
                                        </select>
                                        {!loadingSubtypes[index] && (subtypes[index] || []).length === 0 && item.plantId && (
                                          <p className="text-xs text-gray-500 mt-0.5">No subtypes found for this plant</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Display Title */}
                                    {item.plantId && item.subtypeId && (
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-0.5">
                                          Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={item.displayTitle || ''}
                                          onChange={(e) => updateOrderItem(index, 'displayTitle', e.target.value)}
                                          placeholder="e.g., Banana G9"
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          required={item.isReadyPlantsProduct}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Date Range - Only show when plant and subtype are selected */}
                                    {item.plantId && item.subtypeId && (
                                      <div className="mt-2 pt-2 border-t border-blue-200">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs text-gray-600 mb-0.5">
                                              Start <span className="text-red-500">*</span>
                                            </label>
                                            <DatePicker
                                              selected={parseDateFromDDMMYYYY(item.dateRange?.startDate)}
                                              onChange={(date) => {
                                                const formattedDate = formatDateToDDMMYYYY(date);
                                                updateOrderItem(index, 'dateRange', {
                                                  ...item.dateRange,
                                                  startDate: formattedDate,
                                                });
                                              }}
                                              dateFormat="dd-MM-yyyy"
                                              placeholderText="Start"
                                              minDate={new Date()}
                                              isClearable
                                              showYearDropdown
                                              showMonthDropdown
                                              dropdownMode="select"
                                              wrapperClassName="w-full"
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                              required={item.isReadyPlantsProduct}
                                              withPortal
                                              portalId="root-portal"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs text-gray-600 mb-0.5">
                                              End <span className="text-red-500">*</span>
                                            </label>
                                            <DatePicker
                                              selected={parseDateFromDDMMYYYY(item.dateRange?.endDate)}
                                              onChange={(date) => {
                                                const formattedDate = formatDateToDDMMYYYY(date);
                                                updateOrderItem(index, 'dateRange', {
                                                  ...item.dateRange,
                                                  endDate: formattedDate,
                                                });
                                              }}
                                              dateFormat="dd-MM-yyyy"
                                              placeholderText="End"
                                              minDate={parseDateFromDDMMYYYY(item.dateRange?.startDate) || new Date()}
                                              isClearable
                                              showYearDropdown
                                              showMonthDropdown
                                              dropdownMode="select"
                                              wrapperClassName="w-full"
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                              required={item.isReadyPlantsProduct}
                                              withPortal
                                              portalId="root-portal"
                                            />
                                          </div>
                                        </div>
                                        {item.dateRange?.startDate && item.dateRange?.endDate && (
                                          <div className="mt-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                            <CheckCircle className="w-3 h-3 inline mr-1" />
                                            {item.dateRange.startDate} to {item.dateRange.endDate}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        {/* Batch Number and Expiry Date - only for autoGRN */}
                        {formData.autoGRN && (
                          <>
                            <td className="px-4 py-4">
                              <input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={(e) => updateOrderItem(index, 'batchNumber', e.target.value)}
                                placeholder="Auto-generated if empty"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Will be auto-generated if left empty</p>
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => updateOrderItem(index, 'expiryDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          </>
                        )}
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(formatDecimal(item.amount) || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No items added yet. Click &quot;Add Item&quot; to get started.</p>
              </div>
            )}

            {/* Total Amount */}
            {orderItems.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="bg-gray-50 px-6 py-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">
                    Total Amount: {formatCurrency(formatDecimal(getTotalAmount()) || 0)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any additional notes or special instructions..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/purchase-orders')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || orderItems.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;