import React from 'react';
import { Package, Plus, Sprout } from 'lucide-react';
import PoLineRow from './PoLineRow';
import { formatCurrency, formatDecimal } from '../../../../../utils/numberUtils';
const PO_RAM_AGRI_TYPES = ['seed', 'chemical'];

export default function PoItemsTable({
  orderItems,
  products,
  filteredProducts,
  units,
  ramAgriCrops,
  productSlots,
  loadingSlots,
  isSuperAdmin,
  isAgriMode = false,
  ramAgriProductType = 'seed',
  setRamAgriProductType,
  getRamAgriProductTypeRadioLabel,
  autoGRN,
  plants,
  subtypes,
  loadingSubtypes,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  categories,
  updateOrderItem,
  removeOrderItem,
  addOrderItem,
  addRamAgriOrderItem,
  loadSubtypes,
  setSubtypes,
  totalAmount,
}) {
  const th =
    'px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
  const showAdminColumns = isSuperAdmin && !isAgriMode;
  const showExpiry = autoGRN && !isAgriMode;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50/80">
        <h2 className="text-sm font-semibold text-slate-800 mr-1">Line items</h2>
        <div className="flex-1" />

        {isAgriMode ? (
          <>
            <div className="flex items-center gap-3 mr-1">
              {PO_RAM_AGRI_TYPES.map((type) => (
                <label
                  key={type}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="ramAgriProductType"
                    value={type}
                    checked={ramAgriProductType === type}
                    onChange={() => setRamAgriProductType(type)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  {getRamAgriProductTypeRadioLabel?.(type) || type}
                </label>
              ))}
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter crop / variety…"
              className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white w-44 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <button
              type="button"
              onClick={addRamAgriOrderItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add line
            </button>
          </>
        ) : (
          <>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter product list…"
              className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white w-44 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id || c.name} value={c.name || c.displayName}>
                  {c.displayName || c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addOrderItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Product
            </button>
            <button
              type="button"
              onClick={addRamAgriOrderItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition"
            >
              <Sprout className="w-4 h-4" />
              Ram Agri
            </button>
          </>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {orderItems.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 px-4">
            <Package className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No lines yet</p>
            <p className="text-xs mt-1 text-center max-w-sm">
              {isAgriMode
                ? 'Add a seed or chemical line from Ram Agri master (crop + variety).'
                : 'Add a product or Ram Agri input. Filter by Gifts category for gift products.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-[2] bg-slate-100/95 backdrop-blur border-b border-slate-200">
              <tr>
                <th className={`${th} sticky left-0 bg-slate-100 z-[3]`}>
                  {isAgriMode ? 'Crop / variety *' : 'Product *'}
                </th>
                <th className={th}>Qty *</th>
                <th className={th}>Sec qty</th>
                <th className={th}>Rate *</th>
                {showAdminColumns ? (
                  <>
                    <th className={th}>Slot</th>
                    <th className={th}>Product name</th>
                    <th className={th}>Ready plants</th>
                  </>
                ) : null}
                {autoGRN ? (
                  <>
                    <th className={th}>Batch / lot</th>
                    {showExpiry ? <th className={th}>Expiry</th> : null}
                  </>
                ) : null}
                <th className={th}>Amount</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orderItems.map((item, index) => (
                <PoLineRow
                  key={index}
                  item={isAgriMode ? { ...item, isRamAgriProduct: true } : item}
                  index={index}
                  products={products}
                  filteredProducts={filteredProducts}
                  units={units}
                  ramAgriCrops={ramAgriCrops}
                  productSlots={productSlots}
                  loadingSlots={loadingSlots}
                  isSuperAdmin={isSuperAdmin}
                  isAgriMode={isAgriMode}
                  autoGRN={autoGRN}
                  plants={plants}
                  subtypes={subtypes}
                  loadingSubtypes={loadingSubtypes}
                  updateOrderItem={updateOrderItem}
                  removeOrderItem={removeOrderItem}
                  loadSubtypes={loadSubtypes}
                  setSubtypes={setSubtypes}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500">
          {orderItems.length} line{orderItems.length === 1 ? '' : 's'}
          {showAdminColumns ? ' · Slot / ready-plants columns (super admin)' : ''}
        </p>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
            Total
          </div>
          <div className="text-lg font-bold text-slate-900">
            {formatCurrency(formatDecimal(totalAmount) || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
