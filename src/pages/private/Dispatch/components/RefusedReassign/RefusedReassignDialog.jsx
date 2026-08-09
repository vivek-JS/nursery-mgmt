import React, { useEffect, useMemo, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import StepMode from "./StepMode"
import StepOriginalOrders from "./StepOriginalOrders"
import StepNewFarmers from "./StepNewFarmers"
import StepReview from "./StepReview"
import { orderMongoId, onVehicleQty } from "./reassignHelpers"

const STEP_TITLES = {
  1: "Step 1 · Kay zale?",
  2: "Step 2 · Original orders",
  3: "Step 3 · Kunala rope geli?",
  4: "Step 4 · Review & submit",
}

const RefusedReassignDialog = ({ open, onClose, dispatchData, onSuccess }) => {
  const orders = useMemo(
    () => (Array.isArray(dispatchData?.orderIds) ? dispatchData.orderIds : []),
    [dispatchData]
  )
  const vehiclePlants = useMemo(
    () => orders.reduce((sum, o) => sum + onVehicleQty(o), 0),
    [orders]
  )

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState("")
  const [rows, setRows] = useState({})
  const [farmers, setFarmers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setStep(1)
      setMode("")
      setRows({})
      setFarmers([])
      setSubmitting(false)
    }
  }, [open])

  const handleSelectMode = (m) => {
    setMode(m)
    const nextRows = {}
    orders.forEach((o) => {
      const id = orderMongoId(o)
      nextRows[id] = {
        disposition: "TEMP",
        returnedQty: m === "RETURNED" ? onVehicleQty(o) : 0,
      }
    })
    setRows(nextRows)
  }

  const totalReturned = useMemo(
    () => Object.values(rows).reduce((s, r) => s + Math.max(0, Number(r?.returnedQty) || 0), 0),
    [rows]
  )
  const totalReassigned = useMemo(
    () => farmers.reduce((s, f) => s + Math.max(0, Number(f?.numberOfPlants) || 0), 0),
    [farmers]
  )
  const remainingToAssign = Math.max(0, vehiclePlants - totalReturned - totalReassigned)

  if (!open) return null

  const isReturned = mode === "RETURNED"
  const nextStep = () => setStep((s) => (s === 2 && isReturned ? 4 : s + 1))
  const prevStep = () => setStep((s) => (s === 4 && isReturned ? 2 : s - 1))

  const canProceed = () => {
    if (step === 1) return Boolean(mode)
    if (step === 2) {
      if (isReturned) return true
      // ensure we don't return more than on-vehicle handled by inputs; require something to assign
      return vehiclePlants - totalReturned > 0
    }
    if (step === 3) {
      if (!farmers.length) return false
      return farmers.every(
        (f) =>
          String(f.name || "").trim() &&
          f.state &&
          f.district &&
          f.taluka &&
          f.village &&
          Number(f.numberOfPlants) > 0 &&
          Number(f.rate) > 0
      )
    }
    return true
  }

  const buildPayment = (f) => {
    const amt = Number(f.payment?.paidAmount || 0)
    if (!(amt > 0)) return []
    if (!f.payment?.modeOfPayment) {
      throw new Error(`Select a payment mode for ${f.name || "the new farmer"}`)
    }
    const utr = String(f.payment?.utrNumber || "").trim()
    return [
      {
        paidAmount: amt,
        modeOfPayment: f.payment.modeOfPayment,
        isWalletPayment: false,
        paymentStatus: "PENDING",
        utrNumber: utr || undefined,
        transactionId: utr || undefined,
        remark: f.payment?.remark || "",
      },
    ]
  }

  const handleSubmit = async () => {
    try {
      if (totalReassigned + totalReturned !== vehiclePlants) {
        Toast.error(
          `Plants must add up to ${vehiclePlants} on the vehicle (now ${totalReassigned + totalReturned}).`
        )
        return
      }
      setSubmitting(true)

      const originalOrders = orders.map((o) => {
        const id = orderMongoId(o)
        const row = rows[id] || { disposition: "TEMP", returnedQty: 0 }
        return {
          orderId: id,
          disposition: row.disposition === "KEEP" ? "KEEP" : "TEMPORARY_CANCELLED",
          returnedQty: Math.max(0, Number(row.returnedQty) || 0),
        }
      })

      const newFarmers = isReturned
        ? []
        : farmers.map((f) => ({
            name: String(f.name || "").trim(),
            mobileNumber: f.mobileNumber || "",
            state: f.state || "",
            district: f.district || "",
            taluka: f.taluka || "",
            village: f.village || "",
            stateName: f.state || "",
            districtName: f.district || "",
            talukaName: f.taluka || "",
            sourceOrderId: f.sourceOrderId,
            numberOfPlants: Number(f.numberOfPlants),
            rate: Number(f.rate),
            payment: buildPayment(f),
          }))

      const instance = NetworkManager(API.DISPATCHED.REASSIGN_REFUSED)
      const res = await instance.request(
        { mode, originalOrders, newFarmers },
        [String(dispatchData?._id)]
      )
      if (res?.data?.status === "Success" || res?.data?.status) {
        Toast.success(res?.data?.message || "Reassignment complete")
        onSuccess?.()
        onClose?.()
      } else {
        Toast.error(res?.data?.message || "Could not complete reassignment")
      }
    } catch (err) {
      console.error("reassignRefusedDelivery:", err)
      Toast.error(err?.response?.data?.message || err?.message || "Reassignment failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Reassign refused delivery</h2>
            <p className="text-xs text-gray-500">{STEP_TITLES[step]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {step === 1 && (
            <StepMode mode={mode} onSelect={handleSelectMode} vehiclePlants={vehiclePlants} />
          )}
          {step === 2 && (
            <StepOriginalOrders
              orders={orders}
              mode={mode}
              rows={rows}
              onRowChange={(id, row) => setRows((prev) => ({ ...prev, [id]: row }))}
            />
          )}
          {step === 3 && !isReturned && (
            <StepNewFarmers
              farmers={farmers}
              onChange={setFarmers}
              orders={orders}
              remainingToAssign={remainingToAssign}
            />
          )}
          {step === 4 && (
            <StepReview
              mode={mode}
              orders={orders}
              rows={rows}
              farmers={farmers}
              vehiclePlants={vehiclePlants}
              totalReturned={totalReturned}
              totalReassigned={totalReassigned}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={step === 1 ? onClose : prevStep}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" /> {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || totalReassigned + totalReturned !== vehiclePlants}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "Processing…" : "Confirm reassignment"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default RefusedReassignDialog
