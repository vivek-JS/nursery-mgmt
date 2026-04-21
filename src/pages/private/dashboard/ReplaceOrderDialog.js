import React from "react"

/**
 * Placeholder for adding other orders to an active dispatch.
 * Extend with order search / selection when the flow is wired end-to-end.
 */
const ReplaceOrderDialog = ({ open, onClose }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Add other order</h3>
        <p className="mt-2 text-sm text-gray-600">
          Order picker for this dispatch is not configured in this build. Close and use dispatch
          management if you need to attach orders another way.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Close
        </button>
      </div>
    </div>
  )
}

export default ReplaceOrderDialog
