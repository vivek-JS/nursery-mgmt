import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import { API, NetworkManager } from '../../../network/core';
import { useIsSuperAdmin, useUserData } from '../../../utils/roleUtils';
import { useWorkspace } from '../../../workspace/WorkspaceContext';
import { canPurchaseOrderAutoAccept } from '../../../workspace/agriAccess';
import {
  getRamAgriProductTypeRadioLabel,
  normalizeRamAgriProductType,
} from '../../../utils/ramAgriProductType';
import PoSupplierPanel from './components/po/PoSupplierPanel';
import PoItemsTable from './components/po/PoItemsTable';
import {
  emptyOrderItem,
  isReadyPlantsCategory,
  buildBiotechLinkedProductIndex,
  resolveBiotechMasterFromProductId,
} from './components/po/poFormUtils';
import {
  buildPoItemPayloads,
  validateReadyPlantsItems,
  validateExpiryDates,
} from './components/po/poSubmitHelpers';

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const isSuperAdmin = useIsSuperAdmin();
  const user = useUserData();
  const canPoAutoAccept = canPurchaseOrderAutoAccept(user);
  const { isAgriMode } = useWorkspace();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [units, setUnits] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [productSlots, setProductSlots] = useState({});
  const [loadingSlots, setLoadingSlots] = useState({});
  const [plants, setPlants] = useState([]);
  const [ramAgriCrops, setRamAgriCrops] = useState([]);
  const [biotechPlants, setBiotechPlants] = useState([]);
  const [ramAgriProductType, setRamAgriProductType] = useState('seed');
  const ramAgriTypeInitialized = useRef(false);
  const [subtypes, setSubtypes] = useState({});
  const [loadingSubtypes, setLoadingSubtypes] = useState({});
  const [formData, setFormData] = useState({
    supplier: { name: '', contact: '', email: '', address: '', gstNumber: '' },
    expectedDeliveryDate: new Date().toISOString().split('T')[0],
    supplierInvoiceNumber: '',
    notes: '',
    autoGRN: false,
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [existingInvoiceUrl, setExistingInvoiceUrl] = useState('');

  const allSuppliers = useMemo(
    () =>
      merchants
        .filter((m) => m.category === 'both' || m.category === 'supplier')
        .map((m) => ({
          ...m,
          type: 'merchant',
          displayName: m.name,
          contact: m.contactPerson || m.phone || '',
          gstNumber: m.gstin || '',
          address:
            typeof m.address === 'string'
              ? m.address
              : m.address
                ? `${m.address.street || ''} ${m.address.city || ''} ${m.address.state || ''} ${m.address.pincode || ''}`.trim()
                : '',
        })),
    [merchants]
  );

  const biotechProductIndex = useMemo(
    () => buildBiotechLinkedProductIndex(biotechPlants),
    [biotechPlants]
  );

  const productsForPo = useMemo(
    () => Array.from(biotechProductIndex.values()),
    [biotechProductIndex]
  );

  useEffect(() => {
    if (!isEditMode && canPoAutoAccept) {
      setFormData((prev) => ({ ...prev, autoGRN: true }));
    }
  }, [canPoAutoAccept, isEditMode]);

  // Biotech Seed Master + Ram Agri only — no GET /inventory/products (sowing catalog).
  useEffect(() => {
    loadMerchants();
    loadUnits();
    loadPlants();
    loadBiotechPlants();
    loadRamAgriCrops(ramAgriProductType);
  }, []);

  useEffect(() => {
    loadRamAgriCrops(ramAgriProductType);
  }, [ramAgriProductType]);

  useEffect(() => {
    if (!ramAgriTypeInitialized.current) {
      ramAgriTypeInitialized.current = true;
      return;
    }
    setOrderItems((prev) =>
      prev.map((item) =>
        item.isRamAgriProduct
          ? {
              ...emptyOrderItem({ isRamAgriProduct: true }),
              quantity: item.quantity,
              rate: item.rate,
              batchNumber: item.batchNumber,
            }
          : item
      )
    );
  }, [ramAgriProductType]);

  useEffect(() => {
    if (isEditMode && id && merchants.length) {
      loadPurchaseOrder();
    }
  }, [id, merchants.length, isEditMode]);

  // When Biotech master loads after PO edit hydrate, remap product lines to plant→variety.
  useEffect(() => {
    if (!biotechPlants.length) return;
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.isRamAgriProduct) return item;
        const meta = item.productId
          ? resolveBiotechMasterFromProductId(biotechPlants, item.productId)
          : null;
        return {
          ...item,
          isBiotechProduct: true,
          biotechPlantId: meta?.biotechPlantId || item.biotechPlantId || '',
          biotechVarietyId: meta?.biotechVarietyId || item.biotechVarietyId || '',
          biotechPlantName: meta?.biotechPlantName || item.biotechPlantName || '',
          biotechVarietyName: meta?.biotechVarietyName || item.biotechVarietyName || '',
        };
      })
    );
  }, [biotechPlants]);

  const unwrapList = (apiResponse) => {
    if (!apiResponse) return [];
    if (apiResponse.status === 'Success' && apiResponse.data) {
      return Array.isArray(apiResponse.data.data)
        ? apiResponse.data.data
        : Array.isArray(apiResponse.data)
          ? apiResponse.data
          : [];
    }
    if (apiResponse.success && apiResponse.data) {
      return Array.isArray(apiResponse.data) ? apiResponse.data : [];
    }
    return [];
  };

  const loadMerchants = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      setMerchants(unwrapList(response?.data));
    } catch (error) {
      console.error('Error loading merchants:', error);
      alert('Error loading merchants: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadRamAgriCrops = async (productType) => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const params = { limit: 500, isActive: true };
      if (productType) params.productType = normalizeRamAgriProductType(productType);
      const response = await instance.request({}, params);
      setRamAgriCrops(unwrapList(response?.data));
    } catch (error) {
      console.error('Error loading Ram Agri crops:', error);
    }
  };

  const loadBiotechPlants = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_BIOTECH_SEED_PRODUCTS);
      const response = await instance.request({}, { limit: 500, isActive: true });
      setBiotechPlants(unwrapList(response?.data));
    } catch (error) {
      console.error('Error loading Biotech Seed Master plants:', error);
    }
  };

  const loadPlants = async () => {
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS);
      const response = await instance.request();
      if (response?.data) {
        setPlants(
          response.data.map((plant) => ({
            label: plant.name,
            value: plant.plantId || plant._id,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading plants:', error);
    }
  };

  const loadSubtypes = async (plantId, itemIndex) => {
    if (!plantId) {
      setSubtypes((prev) => ({ ...prev, [itemIndex]: [] }));
      return;
    }
    setLoadingSubtypes((prev) => ({ ...prev, [itemIndex]: true }));
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE);
      const response = await instance.request(null, {
        plantId,
        year: new Date().getFullYear(),
      });
      const list = (response?.data?.subtypes || []).map((subtype) => ({
        label: subtype.subtypeName || subtype.name,
        value: subtype.subtypeId || subtype._id,
      }));
      setSubtypes((prev) => ({ ...prev, [itemIndex]: list }));
    } catch (error) {
      console.error('Error loading subtypes:', error);
      setSubtypes((prev) => ({ ...prev, [itemIndex]: [] }));
    } finally {
      setLoadingSubtypes((prev) => ({ ...prev, [itemIndex]: false }));
    }
  };

  const loadUnits = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      setUnits(unwrapList(response?.data));
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const loadPurchaseOrder = async () => {
    try {
      setLoadingData(true);
      const instance = NetworkManager(API.INVENTORY.GET_PURCHASE_ORDER_BY_ID);
      const response = await instance.request({}, [id]);
      const apiResponse = response?.data;
      if (!(apiResponse?.success && apiResponse.data)) return;

      const poData = apiResponse.data.purchaseOrder || apiResponse.data;
      if (poData.supplier) {
        const supplierId =
          typeof poData.supplier === 'object'
            ? poData.supplier._id || poData.supplier
            : poData.supplier;
        const supplier = merchants.find((m) => m._id === supplierId);
        if (supplier) {
          setSelectedSupplier(supplier);
          setFormData((prev) => ({
            ...prev,
            supplier: {
              name: supplier.name || '',
              contact: supplier.contactPerson || supplier.phone || '',
              email: supplier.email || '',
              address:
                typeof supplier.address === 'string'
                  ? supplier.address
                  : supplier.address
                    ? `${supplier.address.street || ''} ${supplier.address.city || ''} ${supplier.address.state || ''} ${supplier.address.pincode || ''}`.trim()
                    : '',
              gstNumber: supplier.gstin || '',
            },
          }));
        }
      }

      setFormData((prev) => ({
        ...prev,
        expectedDeliveryDate: poData.expectedDeliveryDate
          ? new Date(poData.expectedDeliveryDate).toISOString().split('T')[0]
          : '',
        supplierInvoiceNumber: poData.supplierInvoiceNumber || '',
        notes: poData.notes || '',
        autoGRN: poData.autoGRN || false,
      }));
      setExistingInvoiceUrl(poData.supplierInvoiceFile?.url || '');
      setInvoiceFile(null);

      if (Array.isArray(poData.items)) {
        const items = poData.items.map((item) => {
          if (item.isRamAgriProduct) {
            return emptyOrderItem({
              quantity: item.quantity || 1,
              rate: item.rate || 0,
              amount: item.amount || (item.quantity || 0) * (item.rate || 0),
              batchNumber: item.batchNumber || '',
              expiryDate: item.expiryDate
                ? new Date(item.expiryDate).toISOString().split('T')[0]
                : '',
              isRamAgriProduct: true,
              ramAgriCropId: item.ramAgriCropId || '',
              ramAgriVarietyId: item.ramAgriVarietyId || '',
              ramAgriCropName: item.ramAgriCropName || '',
              ramAgriVarietyName: item.ramAgriVarietyName || '',
              selectedUnitType: item.selectedUnitType || 'primary',
              conversionFactor: item.conversionFactor || 1,
              unitId: typeof item.unit === 'object' ? item.unit?._id : item.unit || '',
            });
          }
          const productId =
            typeof item.product === 'object' ? item.product._id : item.product;
          const biotechMeta = resolveBiotechMasterFromProductId(biotechPlants, productId);
          return emptyOrderItem({
            productId,
            quantity: item.quantity || 1,
            rate: item.rate || 0,
            amount: item.amount || (item.quantity || 0) * (item.rate || 0),
            batchNumber: item.batchNumber || '',
            expiryDate: item.expiryDate
              ? new Date(item.expiryDate).toISOString().split('T')[0]
              : '',
            slotId: item.slotId || '',
            productName: item.productName || '',
            isReadyPlantsProduct: item.isReadyPlantsProduct || false,
            dateRange: {
              startDate: item.dateRange?.startDate || '',
              endDate: item.dateRange?.endDate || '',
            },
            displayTitle: item.displayTitle || '',
            plantId: typeof item.plantId === 'object' ? item.plantId._id : item.plantId || '',
            subtypeId: item.subtypeId || '',
            conversionFactor: item.conversionFactor || 1,
            unitId: typeof item.unit === 'object' ? item.unit?._id : item.unit || '',
            isBiotechProduct: true,
            biotechPlantId: biotechMeta?.biotechPlantId || '',
            biotechVarietyId: biotechMeta?.biotechVarietyId || '',
            biotechPlantName: biotechMeta?.biotechPlantName || '',
            biotechVarietyName: biotechMeta?.biotechVarietyName || '',
          });
        });
        setOrderItems(items);
        items.forEach((it) => {
          if (it.productId) {
            const p =
              biotechProductIndex.get(String(it.productId)) ||
              (typeof poData.items.find((i) =>
                (typeof i.product === 'object' ? i.product._id : i.product) === it.productId
              )?.product === 'object'
                ? poData.items.find((i) =>
                    (typeof i.product === 'object' ? i.product._id : i.product) === it.productId
                  ).product
                : null);
            if (p?.plantId && p?.subtypeId) fetchSlotsForProduct(it.productId, p);
          }
        });
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
    const supplier = allSuppliers.find((s) => s._id === supplierId);
    if (!supplier) {
      setSelectedSupplier(null);
      return;
    }
    setSelectedSupplier(supplier);
    setFormData((prev) => ({
      ...prev,
      supplier: {
        name: supplier.name,
        contact: supplier.contact || supplier.contactPerson || supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        gstNumber: supplier.gstNumber || supplier.gstin || '',
      },
    }));
  };

  const fetchSlotsForProduct = async (productId, productOverride) => {
    const product =
      productOverride || biotechProductIndex.get(String(productId));
    if (!product?.plantId || !product?.subtypeId) return;

    const plantId = typeof product.plantId === 'object' ? product.plantId._id : product.plantId;
    const subtypeId = product.subtypeId;
    setLoadingSlots((prev) => ({ ...prev, [productId]: true }));
    try {
      const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
      const responses = await Promise.all(
        years.map((year) =>
          NetworkManager(API.slots.GET_SIMPLE_SLOTS, false, { abortScope: `y${year}` })
            .request({}, { plantId, subtypeId, year })
            .catch(() => null)
        )
      );
      const merged = [];
      responses.forEach((response) => {
        const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
        if (Array.isArray(slotsData)) merged.push(...slotsData);
      });
      const formatted = merged
        .filter((slot) => slot.startDay && slot.endDay && slot.status)
        .map((slot) => ({
          label: `${slot.startDay} to ${slot.endDay} (${slot.availablePlants || 0} avail)`,
          value: slot._id,
          availableQuantity: slot.availablePlants || 0,
          startDay: slot.startDay,
          endDay: slot.endDay,
        }));
      setProductSlots((prev) => ({ ...prev, [productId]: formatted }));
    } catch (error) {
      console.error(`Error fetching slots for product ${productId}:`, error);
      setProductSlots((prev) => ({ ...prev, [productId]: [] }));
    } finally {
      setLoadingSlots((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const updateOrderItem = (index, field, value) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      const current = updated[index];
      updated[index] = { ...current, [field]: value };

      if (field === 'quantity' || field === 'rate') {
        const qty = field === 'quantity' ? value : updated[index].quantity;
        const rate = field === 'rate' ? value : updated[index].rate;
        updated[index].amount = (qty || 0) * (rate || 0);
      }

      if (field === 'productId') {
        const product = biotechProductIndex.get(String(value));
        if (product) {
          if (isReadyPlantsCategory(product.category)) {
            updated[index].isReadyPlantsProduct = true;
            const plantId =
              typeof product.plantId === 'object' ? product.plantId?._id : product.plantId;
            updated[index].plantId = plantId || '';
            updated[index].subtypeId = product.subtypeId || '';
            updated[index].displayTitle = product.name || '';
          }
          if (product.plantId && product.subtypeId) {
            fetchSlotsForProduct(value, product);
          } else {
            updated[index].slotId = '';
            updated[index].productName = '';
          }
        } else {
          updated[index].slotId = '';
          updated[index].productName = '';
        }
      }

      if (field === 'slotId' && !value) updated[index].productName = '';
      if (field === 'productId' && !value) {
        updated[index].slotId = '';
        updated[index].productName = '';
      }

      return updated;
    });
  };

  const removeOrderItem = (index) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addOrderItem = () =>
    setOrderItems((prev) => [...prev, emptyOrderItem({ isBiotechProduct: true })]);
  const addRamAgriOrderItem = () =>
    setOrderItems((prev) => [...prev, emptyOrderItem({ isRamAgriProduct: true })]);

  const getTotalAmount = () =>
    orderItems.reduce((total, item) => total + (item.amount || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSupplier?._id) {
      alert('Please select a supplier');
      return;
    }
    if (formData.autoGRN && !String(formData.supplierInvoiceNumber || '').trim()) {
      alert('Supplier invoice number is required when Auto GRN is enabled');
      return;
    }
    if (formData.autoGRN && !isEditMode && !invoiceFile) {
      alert('Please upload the supplier invoice file (JPG/PNG/PDF) when Auto GRN is enabled');
      return;
    }
    if (
      formData.autoGRN &&
      isEditMode &&
      !existingInvoiceUrl &&
      !invoiceFile
    ) {
      alert('Please upload the supplier invoice file when Auto GRN is enabled');
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
    if (
      orderItems.some((item) => {
        if (item.isRamAgriProduct) {
          return (
            !item.ramAgriCropId ||
            !item.ramAgriVarietyId ||
            !item.quantity ||
            item.quantity <= 0 ||
            !item.rate ||
            item.rate <= 0
          );
        }
        if (item.isBiotechProduct) {
          return (
            !item.biotechPlantId ||
            !item.biotechVarietyId ||
            !item.productId ||
            !item.quantity ||
            item.quantity <= 0 ||
            !item.rate ||
            item.rate <= 0
          );
        }
        return !item.productId || !item.quantity || item.quantity <= 0 || !item.rate || item.rate <= 0;
      })
    ) {
      alert('Please complete product/crop, variety, quantity, and rate for all items');
      return;
    }

    const expiryErr = validateExpiryDates(orderItems);
    if (expiryErr) {
      alert(expiryErr);
      return;
    }

    if (isSuperAdmin) {
      const readyErr = validateReadyPlantsItems(orderItems, productsForPo);
      if (readyErr) {
        alert(readyErr);
        return;
      }
    }

    try {
      setLoading(true);
      const transformedItems = buildPoItemPayloads({
        orderItems,
        products: productsForPo,
        ramAgriCrops: ramAgriCrops,
        biotechProductsById: biotechProductIndex,
        units,
        autoGRN: formData.autoGRN,
        isSuperAdmin,
      });

      const fd = new FormData();
      fd.append('expectedDeliveryDate', formData.expectedDeliveryDate);
      fd.append('items', JSON.stringify(transformedItems));
      fd.append('notes', formData.notes || '');
      fd.append(
        'supplierInvoiceNumber',
        String(formData.supplierInvoiceNumber || '').trim()
      );
      if (invoiceFile) {
        fd.append('supplierInvoiceFile', invoiceFile);
      }

      if (isEditMode) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_PURCHASE_ORDER);
        const response = await instance.request(fd, [id]);
        if (response?.data?.success || response?.data?.status === 'Success') {
          alert('Purchase order updated successfully!');
          navigate('/u/inventory/purchase-orders');
        } else {
          alert('Error updating purchase order: ' + (response?.data?.message || 'Unknown'));
        }
      } else {
        fd.append('supplier', selectedSupplier._id);
        fd.append('autoGRN', canPoAutoAccept && formData.autoGRN ? 'true' : 'false');
        const instance = NetworkManager(API.INVENTORY.CREATE_PURCHASE_ORDER);
        const response = await instance.request(fd);
        if (response?.data?.success || response?.data?.status === 'Success') {
          alert('Purchase order created successfully!');
          navigate('/u/inventory/purchase-orders');
        } else {
          alert('Error creating purchase order: ' + (response?.data?.message || 'Unknown'));
        }
      }
    } catch (error) {
      console.error('Error saving purchase order:', error);
      alert('Error saving purchase order: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredRamAgriCrops = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return ramAgriCrops;
    return ramAgriCrops.filter((crop) => {
      const cropMatch = crop.cropName?.toLowerCase().includes(term);
      const varietyMatch = (crop.varieties || []).some((v) =>
        v.name?.toLowerCase().includes(term)
      );
      return cropMatch || varietyMatch;
    });
  }, [ramAgriCrops, searchTerm]);

  const filteredBiotechPlants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return biotechPlants;
    return biotechPlants.filter((plant) => {
      const plantMatch = plant.plantName?.toLowerCase().includes(term);
      const varietyMatch = (plant.varieties || []).some((v) =>
        v.name?.toLowerCase().includes(term)
      );
      return plantMatch || varietyMatch;
    });
  }, [biotechPlants, searchTerm]);

  if (loadingData) {
    return (
      <div className="h-[calc(100dvh-4rem)] flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Loading purchase order…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] overflow-hidden flex flex-col bg-slate-100">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/u/inventory/purchase-orders')}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {isEditMode ? 'Edit purchase order' : 'New purchase order'}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              Biotech Seed Master + Ram Agri inputs · supplier invoice required · ledger book by product type
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/u/inventory/purchase-orders')}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="po-form"
            disabled={loading || orderItems.length === 0}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Saving…' : isEditMode ? 'Update PO' : 'Create PO'}
          </button>
        </div>
      </div>

      <form
        id="po-form"
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        <PoSupplierPanel
          allSuppliers={allSuppliers}
          selectedSupplier={selectedSupplier}
          formData={formData}
          setFormData={setFormData}
          onSupplierChange={handleSupplierChange}
          isEditMode={isEditMode}
          invoiceFile={invoiceFile}
          onInvoiceFileChange={setInvoiceFile}
          existingInvoiceUrl={existingInvoiceUrl}
          canPoAutoAccept={canPoAutoAccept}
        />

        <PoItemsTable
          orderItems={orderItems}
          products={productsForPo}
          units={units}
          ramAgriCrops={filteredRamAgriCrops}
          biotechPlants={filteredBiotechPlants}
          productSlots={productSlots}
          loadingSlots={loadingSlots}
          isSuperAdmin={isSuperAdmin}
          isAgriMode={isAgriMode}
          ramAgriProductType={ramAgriProductType}
          setRamAgriProductType={setRamAgriProductType}
          getRamAgriProductTypeRadioLabel={getRamAgriProductTypeRadioLabel}
          autoGRN={formData.autoGRN}
          plants={plants}
          subtypes={subtypes}
          loadingSubtypes={loadingSubtypes}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          updateOrderItem={updateOrderItem}
          removeOrderItem={removeOrderItem}
          addOrderItem={addOrderItem}
          addRamAgriOrderItem={addRamAgriOrderItem}
          loadSubtypes={loadSubtypes}
          setSubtypes={setSubtypes}
          totalAmount={getTotalAmount()}
        />
      </form>
    </div>
  );
};

export default PurchaseOrderForm;
