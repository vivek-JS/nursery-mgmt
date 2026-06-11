import React, { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  useTheme,
  useMediaQuery
} from "@mui/material"
import { Leaf, Truck, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { ArrowLeft, X } from "lucide-react"

import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import FleetAssignmentPanel from "components/fleet/FleetAssignmentPanel"
import {
  emptyFleetAssignment,
  formatFleetDriverLabel,
  loadFleetForOwner,
} from "components/fleet/fleetPickersUtils"
import {
  getCavityIdString,
  getCavityLabelForDispatchOrder,
  orderRowHasTrayRef,
} from "utils/cavityDisplay"

const cavityKey = (v) => (v != null && v !== "" ? String(v) : "")

const resolveMongoId = (v) => {
  if (v == null || v === "") return ""
  if (typeof v === "object") return String(v._id ?? v.id ?? "")
  return String(v)
}

/** View/edit plants from API lack `orders`; attach from selected dispatch orders when possible. */
const attachOrdersToPlantsForView = (plants, ordersArray) => {
  if (!Array.isArray(plants) || !ordersArray?.length) return plants
  return plants.map((plant) => {
    if (Array.isArray(plant.orders) && plant.orders.length > 0) return plant
    const pid = resolveMongoId(plant.plantId) || resolveMongoId(plant.id)
    const sid = resolveMongoId(plant.subTypeId)
    const matched = ordersArray.filter((order) => {
      const d = order.details || order
      const op = resolveMongoId(d?.plantID)
      const os = resolveMongoId(d?.plantSubtypeID)
      if (pid && sid) return op === pid && os === sid
      if (pid) return op === pid
      return String(order.plantType || "").trim() === String(plant.name || "").trim()
    })
    return matched.length > 0 ? { ...plant, orders: matched } : plant
  })
}

const formatPlantationDateShort = (raw) => {
  if (!raw) return ""
  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) return ""
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

const clearPickupBatchMetaOnDetail = (detail) => {
  if (!detail || typeof detail !== "object") return
  detail.batchId = ""
  detail.batchNumber = ""
  detail.plantOutwardId = ""
  detail.secondaryInwardId = ""
  detail.secondaryInwardDate = null
  detail.pollyhouseMatched = ""
}

const applyRecommendedBatchToDetail = (detail, rec) => {
  if (!detail || !rec) return
  detail.batchId = rec.batchId != null ? String(rec.batchId) : ""
  detail.batchNumber = rec.batchNumber != null ? String(rec.batchNumber) : ""
  detail.plantOutwardId = rec.plantOutwardId != null ? String(rec.plantOutwardId) : ""
  detail.secondaryInwardId = rec.secondaryInwardId != null ? String(rec.secondaryInwardId) : ""
  detail.secondaryInwardDate = rec.secondaryInwardDate ?? null
  detail.pollyhouseMatched = rec.pollyhouse ? String(rec.pollyhouse) : ""
}

/** Same tray id resolution as Add Cavity + backend — cavityId field OR populated cavity object. */
const getOrderCavityKey = (order) => {
  const d = order?.details
  if (!d) return ""
  const fromId = cavityKey(d.cavityId)
  if (fromId) return fromId
  const c = d.cavity
  if (c != null && typeof c === "object") {
    return cavityKey(c._id ?? c.id)
  }
  return cavityKey(c)
}

const formatOrderDateForCard = (value) => {
  if (!value) return "-"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN")
}

const orderFarmerDisplayName = (order) => {
  const f = order?.farmer
  if (f && typeof f === "object") {
    if (f.name) return f.name
    if (f.farmerName) return f.farmerName
  }
  if (typeof order?.farmerName === "string" && order.farmerName.trim()) return order.farmerName.trim()
  return ""
}

const mapOrderToDispatchRow = (order) => {
  const quantity = Number(order?.numberOfPlants || order?.totalPlants || 0)
  const cavityIdStr = getCavityIdString(order?.cavity)
  const hasTrayRef = cavityIdStr !== ""
  const rate = Number(order?.rate || 0)
  return {
    order: order?.orderId,
    farmerName: orderFarmerDisplayName(order) || (order?.dealerOrder ? "Dealer" : "Unknown"),
    plantType: `${order?.plantType?.name || "Unknown"} -> ${order?.plantSubtype?.name || "Unknown"}`,
    quantity,
    orderDate: order?.orderBookingDate ? formatOrderDateForCard(order.orderBookingDate) : "-",
    rate,
    total: quantity * rate,
    "Paid Amt": 0,
    "remaining Amt": quantity * rate,
    orderStatus: order?.orderStatus || "",
    Delivery: order?.deliveryDate ? formatOrderDateForCard(order.deliveryDate) : "-",
    oldDeliveryDate: order?.oldDeliveryDate || null,
    dispatchedFromAnotherSlot: !!order?.dispatchedFromAnotherSlot,
    details: {
      orderid: order?._id || order?.id,
      oldDeliveryDate: order?.oldDeliveryDate || null,
      dispatchedFromAnotherSlot: !!order?.dispatchedFromAnotherSlot,
      remainingPlants: Number(order?.remainingPlants ?? quantity),
      plantID: order?.plantType?._id || order?.plantType?.id,
      plantSubtypeID: order?.plantSubtype?._id || order?.plantSubtype?.id,
      cavity: order?.cavity ?? null,
      cavityId: cavityIdStr || undefined,
      cavityName:
        getCavityLabelForDispatchOrder(
          { cavity: order?.cavity, cavityId: cavityIdStr || undefined },
          [],
          () => ""
        ) ||
        (hasTrayRef ? "Not specified" : "No tray on order"),
      farmer: order?.farmer || null,
      dealerOrder: order?.dealerOrder,
    },
  }
}

/**
 * Matches FINAL_NURSERY_BE `calculateDispatchCrates` — trays = floor(qty/traySize),
 * full crates = floor(trays / traysPerCrate), remainder = qty - plants in full crates.
 */
const buildCratesPayloadForQuantity = ({
  dispatchQuantity,
  cavityId,
  cavityName,
  cavitySize,
  numberPerCrate
}) => {
  const qty = Number(dispatchQuantity) || 0
  const traySize = Number(cavitySize) || 0
  const traysPerCrate = Number(numberPerCrate) || 0
  if (qty <= 0 || traySize <= 0 || traysPerCrate <= 0) return null

  const numberOfTrays = Math.floor(qty / traySize)
  const fullCrates = Math.floor(numberOfTrays / traysPerCrate)
  const plantsInFullCrates = fullCrates * traysPerCrate * traySize
  const remainingPlants = Math.max(0, qty - plantsInFullCrates)

  const crateDetails = []
  if (fullCrates > 0) {
    crateDetails.push({
      crateCount: fullCrates,
      plantCount: plantsInFullCrates
    })
  }
  if (remainingPlants > 0) {
    crateDetails.push({
      crateCount: 1,
      plantCount: remainingPlants
    })
  }
  if (!crateDetails.length) return null

  return {
    cavity: cavityId,
    cavityName: cavityName || "",
    crateCount: crateDetails.reduce((s, r) => s + Number(r.crateCount || 0), 0),
    plantCount: crateDetails.reduce((s, r) => s + Number(r.plantCount || 0), 0),
    crateDetails
  }
}

/** UI rows for Crate Details (numberOfCrates + plant quantity per line). */
const buildDisplayCrateLines = (qty, cavitySize, numberPerCrate) => {
  const row = buildCratesPayloadForQuantity({
    dispatchQuantity: qty,
    cavityId: "",
    cavityName: "",
    cavitySize,
    numberPerCrate
  })
  if (!row?.crateDetails?.length) return []
  return row.crateDetails.map((d) => ({
    numberOfCrates: d.crateCount,
    quantity: d.plantCount
  }))
}

/** Build cavityGroups[] for view/edit from API plant row (pickups + crates), same shape as create flow. */
const buildCavityGroupsFromPlantForView = (plant) => {
  const groups = {}
  const ensure = (rawCavity, meta = {}) => {
    const k =
      rawCavity != null && rawCavity !== ""
        ? String(rawCavity)
        : "default"
    if (!groups[k]) {
      groups[k] = {
        cavity: meta.cavity != null ? meta.cavity : rawCavity,
        cavityName: meta.cavityName || "",
        cavitySize: meta.cavitySize,
        numberPerCrate: meta.numberPerCrate,
        pickupDetails: [],
        crates: []
      }
    }
    return groups[k]
  }

  if (Array.isArray(plant.pickupDetails)) {
    plant.pickupDetails.forEach((detail) => {
      const cid = detail.cavity
      const g = ensure(cid, {
        cavity: cid,
        cavityName: detail.cavityName,
        cavitySize: detail.cavitySize,
        numberPerCrate: detail.numberPerCrate
      })
      g.pickupDetails.push({
        shade: detail.shade,
        shadeName: detail.shadeName,
        quantity: detail.quantity,
        cavity: cid,
        cavityName: detail.cavityName,
        batchId: detail.batchId != null ? String(detail.batchId) : "",
        batchNumber: detail.batchNumber != null ? String(detail.batchNumber) : "",
        plantOutwardId: detail.plantOutwardId != null ? String(detail.plantOutwardId) : "",
        secondaryInwardId: detail.secondaryInwardId != null ? String(detail.secondaryInwardId) : "",
        secondaryInwardDate: detail.secondaryInwardDate ?? null,
        pollyhouseMatched: detail.pollyhouseMatched != null ? String(detail.pollyhouseMatched) : "",
      })
    })
  }

  if (Array.isArray(plant.crates)) {
    plant.crates.forEach((crate) => {
      const cid = crate.cavity
      const g = ensure(cid, {
        cavity: cid,
        cavityName: crate.cavityName,
        cavitySize: crate.cavitySize,
        numberPerCrate: crate.numberPerCrate
      })
      const cs = Number(g.cavitySize) || 0
      const transformedCrates =
        crate.crateDetails?.map((detail) => ({
          numberOfCrates: detail.crateCount || 0,
          quantity: detail.plantCount || 0,
          numberOfCavityTrays:
            cs && detail.plantCount ? Math.ceil(detail.plantCount / cs) || 0 : 0
        })) || []
      if (transformedCrates.length > 0) {
        g.crates = transformedCrates
      }
    })
  }

  return Object.values(groups)
}

const DispatchForm = ({
  open,
  onClose,
  onDispatchSuccess,
  selectedOrders,
  mode = "create",
  dispatchData = null,
  readyDispatchGroupId = null,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const [formData, setFormData] = useState({
    name: "",
    driverName: "",
    vehicleName: "",
    plants: []
  })
  const [expandedPlants, setExpandedPlants] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fleetAssignment, setFleetAssignment] = useState(emptyFleetAssignment)
  const [fleetDrivers, setFleetDrivers] = useState([])
  const [fleetVehicles, setFleetVehicles] = useState([])
  const [shades, setShades] = useState([])
  const [cavities, setCavities] = useState([])
  /** `"${plantIndex}-${groupIndex}-${detailIndex}"` while fetching FIFO batch for shade */
  const [pickupBatchLoadingKey, setPickupBatchLoadingKey] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  /** Snapshot of selected orders while editing in view mode (supports remove-from-dispatch). */
  const [editOrdersMap, setEditOrdersMap] = useState(null)
  const [eligibleAddOrders, setEligibleAddOrders] = useState([])
  const [addOrderDialogOpen, setAddOrderDialogOpen] = useState(false)
  const [addOrderLoading, setAddOrderLoading] = useState(false)
  const [eligibleAddLoading, setEligibleAddLoading] = useState(false)
  const [selectedAddOrderIds, setSelectedAddOrderIds] = useState(new Set())
  const [addOrderSearch, setAddOrderSearch] = useState("")
  const [addOrderShadeId, setAddOrderShadeId] = useState("")
  const [linkedAgriBlockedBy, setLinkedAgriBlockedBy] = useState([])
  const [linkedAgriCheckLoading, setLinkedAgriCheckLoading] = useState(false)
  const [nurserySites, setNurserySites] = useState([])
  const [expectedNursery, setExpectedNursery] = useState("RB")
  // Track dispatch quantities per order (orderId -> quantity to dispatch)
  const [orderQuantities, setOrderQuantities] = useState(new Map())
  const orderQuantitiesRef = useRef(new Map())
  const initialViewSnapshotRef = useRef(null)
  const getId = (obj) => String(obj?._id || obj?.id || "")
  const getOrderId = (order) =>
    order?.details?.orderid || order?.details?.orderId || order?._id || order?.id || ""
  /** Stable string key for Maps (orderDispatchDetails uses string ids). */
  const orderRowKey = (order) => {
    const id = getOrderId(order)
    return id != null && id !== "" ? String(id) : ""
  }
  const getOrdersSourceMap = () =>
    mode === "view" && isEditing && editOrdersMap != null ? editOrdersMap : selectedOrders

  const getSelectedOrdersArray = () =>
    Array.from(getOrdersSourceMap()?.values?.() || []).filter((order) => Boolean(orderRowKey(order)))

  const applyDispatchDataToForm = (dispatchDoc) => {
    if (!dispatchDoc) return
    const plantSource = dispatchDoc.plants || dispatchDoc.plantsDetails || []
    const transformedPlants = plantSource.map((plant) => {
      const cavityGroups = buildCavityGroupsFromPlantForView(plant)
      const pickupSum = cavityGroups.reduce(
        (sum, g) =>
          sum +
          (g.pickupDetails || []).reduce(
            (s, d) => s + Number(d.quantity || 0),
            0
          ),
        0
      )
      return {
        ...plant,
        cavityGroups,
        quantity: pickupSum > 0 ? pickupSum : plant.quantity
      }
    })
    const plantsWithOrders = attachOrdersToPlantsForView(
      transformedPlants,
      getSelectedOrdersArray()
    )

    const nextForm = {
      name: dispatchDoc.name || "",
      driverName: dispatchDoc.driverName || "",
      vehicleName: dispatchDoc.vehicleName || "",
      plants: plantsWithOrders
    }
    setFormData(nextForm)

    setFleetAssignment({
      ownerId: getId(dispatchDoc.ownerId) || "",
      driverId: getId(dispatchDoc.driverId) || "",
      vehicleId: getId(dispatchDoc.vehicleId) || "",
      routeNotes: dispatchDoc.routeNotes || "",
      driverRemark: dispatchDoc.driverRemark || "",
      vehicleRemark: dispatchDoc.vehicleRemark || "",
    })

    const qtyMap = new Map()
    const details = Array.isArray(dispatchDoc.orderDispatchDetails)
      ? dispatchDoc.orderDispatchDetails
      : []
    details.forEach((row) => {
      if (row?.orderId != null) {
        qtyMap.set(String(row.orderId), Number(row.dispatchQuantity || 0))
      }
    })
    if (qtyMap.size === 0) {
      getSelectedOrdersArray().forEach((order) => {
        const rk = orderRowKey(order)
        const q = Number(order.quantity || 0)
        if (rk) qtyMap.set(rk, q)
      })
    }
    setOrderQuantities(qtyMap)
    orderQuantitiesRef.current = qtyMap

    const oidRows = Array.isArray(dispatchDoc.orderIds) ? dispatchDoc.orderIds : []
    const exView = oidRows
      .map((o) => o?.expectedNursery)
      .find((x) => x != null && String(x).trim() !== "")
    const exNorm = exView ? String(exView).trim().toUpperCase() : "RB"
    setExpectedNursery(exNorm)

    initialViewSnapshotRef.current = {
      formData: JSON.parse(JSON.stringify(nextForm)),
      orderQuantities: new Map(qtyMap),
      expectedNursery: exNorm
    }

    const initialExpandedState = plantsWithOrders?.reduce((acc, plant) => {
      acc[plant.id] = true
      return acc
    }, {})
    setExpandedPlants(initialExpandedState)
  }

  const refreshDispatchViewData = async () => {
    const dispatchId = dispatchData?._id
    if (!dispatchId) return
    const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
    const response = await inst.request({}, [String(dispatchId)])
    const raw = response?.data?.data ?? response?.data
    const doc =
      raw && typeof raw === "object" && !Array.isArray(raw) && raw._id
        ? raw
        : raw?.data
    if (!doc?._id) throw new Error("Could not refresh dispatch data")
    applyDispatchDataToForm(doc)
  }

  const fetchEligibleOrdersForEditAdd = async () => {
    if (!isViewMode || !isEditing) return
    setEligibleAddLoading(true)
    try {
      const params = {
        search: "",
        dispatched: false,
        status: "READY_FOR_DISPATCH,DISPATCH_PROCESS",
        limit: 500,
        page: 1,
        sortKey: "deliveryDate",
        sortOrder: "asc",
      }
      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      const response = await instance.request({}, params)
      const payload = response?.data?.data
      const list = Array.isArray(payload?.data)
        ? payload.data
        : response?.data?.data?.data || response?.data?.data || []
      const existingKeys = new Set(getSelectedOrdersArray().map((o) => orderRowKey(o)))
      const eligible = list.filter((order) => {
        const oid = String(order?._id || order?.id || "")
        if (!oid) return false
        return !existingKeys.has(oid)
      })
      setEligibleAddOrders(eligible)
    } catch (err) {
      setEligibleAddOrders([])
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load eligible orders"
      )
    } finally {
      setEligibleAddLoading(false)
    }
  }

  const toggleAddOrderSelection = (orderId) => {
    setSelectedAddOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const handleConfirmAddOrders = async () => {
    if (!dispatchData?._id || selectedAddOrderIds.size === 0) return
    if (!addOrderShadeId) {
      setError("Please select a shade before adding orders.")
      return
    }
    const shade = shades.find((s) => getId(s) === addOrderShadeId)
    if (!shade) {
      setError("Selected shade is invalid.")
      return
    }

    setAddOrderLoading(true)
    setError("")
    let addedCount = 0
    let skippedNoCavity = 0
    const nextMap = new Map(editOrdersMap || selectedOrders || new Map())

    try {
      const selectedOrdersToAdd = eligibleAddOrders.filter((o) =>
        selectedAddOrderIds.has(String(o?._id || o?.id || ""))
      )
      for (const order of selectedOrdersToAdd) {
        const orderId = String(order?._id || order?.id || "")
        const row = mapOrderToDispatchRow(order)
        const rowKey = orderRowKey(row)
        if (!orderId || !rowKey) continue
        if (nextMap.has(rowKey)) continue

        const cavityId =
          row?.details?.cavityId ||
          getCavityIdString(row?.details?.cavity) ||
          getCavityIdString(order?.cavity)
        if (!cavityId) {
          skippedNoCavity += 1
          continue
        }

        const dispatchQuantity = Number(row?.details?.remainingPlants ?? row?.quantity ?? 0)
        if (dispatchQuantity <= 0) continue

        const instance = NetworkManager(API.DISPATCHED.ADD_ORDER_TO_DISPATCH)
        await instance.request(
          {
            orderId,
            dispatchQuantity,
            cavityId,
            shadeId: addOrderShadeId,
            shadeName: shade?.name || "",
          },
          [dispatchData._id]
        )
        nextMap.set(rowKey, row)
        addedCount += 1
      }

      setEditOrdersMap(nextMap)
      await refreshDispatchViewData()
      setSelectedAddOrderIds(new Set())
      setAddOrderSearch("")
      setAddOrderDialogOpen(false)
      if (addedCount > 0) {
        Toast.success(`${addedCount} order${addedCount > 1 ? "s" : ""} added to dispatch.`)
      }
      if (skippedNoCavity > 0) {
        setError(
          `${skippedNoCavity} selected order${skippedNoCavity > 1 ? "s were" : " was"} skipped because tray/cavity is missing.`
        )
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to add selected orders"
      )
    } finally {
      setAddOrderLoading(false)
    }
  }

  useEffect(() => {
    if (!open || mode === "view") {
      setLinkedAgriBlockedBy([])
      setLinkedAgriCheckLoading(false)
      return
    }

    const selectedOrdersArray = getSelectedOrdersArray()
    const orderIds = selectedOrdersArray.map((order) => orderRowKey(order)).filter(Boolean)
    if (!orderIds.length) {
      setLinkedAgriBlockedBy([])
      return
    }

    let mounted = true
    const loadLinkedAgriGuard = async () => {
      try {
        setLinkedAgriCheckLoading(true)
        const instance = NetworkManager(API.INVENTORY.GET_DISPATCH_LOAD_STATUS)
        const response = await instance.request({ orderIds })
        const blockedBy = Array.isArray(response?.data?.data?.blockedBy)
          ? response.data.data.blockedBy
          : []
        if (mounted) {
          setLinkedAgriBlockedBy(blockedBy)
        }
      } catch (error) {
        if (mounted) {
          setLinkedAgriBlockedBy([])
        }
      } finally {
        if (mounted) setLinkedAgriCheckLoading(false)
      }
    }

    loadLinkedAgriGuard()
    return () => {
      mounted = false
    }
  }, [open, mode, selectedOrders, isEditing, editOrdersMap])

  const getShades = async () => {
    try {
      const instance = NetworkManager(API.SHADE.GET_SHADES)
      const response = await instance.request({}, {})
      if (response.data?.data) {
        setShades(response.data.data.data)
      }
    } catch (error) {
      console.error("Error fetching shades:", error)
    }
  }

  const getCavities = async () => {
    try {
      const instance = NetworkManager(API.TRAY.GET_TRAYS)
      const response = await instance.request({}, {})
      if (response.data?.data) {
        setCavities(response.data.data.data)
      }
    } catch (error) {
      console.error("Error fetching cavities:", error)
    }
  }

  // Validation
  const validateForm = () => {
    setError("")

    if (mode !== "view" && !fleetAssignment.ownerId) {
      throw new Error("Please select an owner")
    }

    const selectedOrdersArray = getSelectedOrdersArray()
    // Removing every order deletes the dispatch — no plant/driver validation needed.
    if (mode === "view" && selectedOrdersArray.length === 0) {
      return true
    }

    if (!formData.driverName) {
      throw new Error("Please select a driver")
    }
    if (!formData.vehicleName) {
      throw new Error("Please select a vehicle")
    }

    // Validate order quantities
    for (const order of selectedOrdersArray) {
      const orderId = orderRowKey(order)
      const dispatchQty = orderQuantities.get(orderId) || 0
      const orderTotal = Number(order.quantity) || 0
      const remainingQty = order.details?.remainingPlants ?? order.quantity ?? 0

      if (dispatchQty <= 0) {
        throw new Error(`Dispatch quantity for order #${order.order} must be greater than 0`)
      }

      if (mode === "view") {
        if (orderTotal > 0 && dispatchQty > orderTotal) {
          throw new Error(
            `Dispatch quantity (${dispatchQty}) cannot exceed order quantity (${orderTotal}) for order #${order.order}`
          )
        }
      } else if (dispatchQty > remainingQty) {
        throw new Error(
          `Dispatch quantity (${dispatchQty}) exceeds remaining quantity (${remainingQty}) for order #${order.order}`
        )
      }
    }

    if (!formData.plants?.length) {
      throw new Error(
        "Plant pickup layout is empty. Adjust cavity quantities or remove orders, then save."
      )
    }

    formData.plants.forEach((plant) => {
      if (!plant.cavityGroups || plant.cavityGroups.length === 0) {
        throw new Error(`Please select at least one cavity for ${plant.name}`)
      }

      // Check if every cavity group has a cavity selected
      const emptyCavity = plant.cavityGroups.find((group) => !group.cavity)
      if (emptyCavity) {
        throw new Error(`Please select a cavity for all cavity groups for ${plant.name}`)
      }

      // Check for valid pickup details in each cavity group
      plant.cavityGroups.forEach((cavityGroup) => {
        if (!cavityGroup.pickupDetails || cavityGroup.pickupDetails.length === 0) {
          throw new Error(
            `Please add pickup details for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }

        // Check for empty shades
        const emptyShade = cavityGroup.pickupDetails.find((detail) => !detail.shade)
        if (emptyShade) {
          throw new Error(
            `Please select all shades for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }

        // Check for valid quantities
        const invalidQuantity = cavityGroup.pickupDetails.find(
          (detail) => !detail.quantity || Number(detail.quantity) <= 0
        )
        if (invalidQuantity) {
          throw new Error(
            `All quantities must be greater than 0 for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }

        // Check total pickup quantity for this cavity group
        const pickupTotal = cavityGroup.pickupDetails?.reduce(
          (sum, detail) => sum + Number(detail.quantity),
          0
        )

        if (pickupTotal <= 0) {
          throw new Error(
            `Total pickup quantity must be greater than 0 for ${plant.name} (Cavity: ${cavityGroup.cavityName})`
          )
        }
      })

      // Check if total pickup quantity across all cavity groups matches required plant quantity
      const totalPickup = plant.cavityGroups.reduce(
        (sum, group) =>
          sum + group.pickupDetails.reduce((subSum, detail) => subSum + Number(detail.quantity), 0),
        0
      )

      if (totalPickup !== plant.quantity) {
        throw new Error(
          `Total pickup quantity (${totalPickup}) doesn't match required quantity (${plant.quantity}) for ${plant.name}`
        )
      }
    })

    return true
  }

  // Data transformation
  const transformDispatchData = (formData, selectedOrders) => {
    const selectedOrdersArray = getSelectedOrdersArray()
    const orderIds = selectedOrdersArray.map((order) => getOrderId(order))
    
    let selectedDriver = fleetAssignment.driverId
      ? fleetDrivers.find((d) => getId(d) === fleetAssignment.driverId)
      : null
    if (!selectedDriver && formData.driverName) {
      const driverDisplayName = formData.driverName.includes("(")
        ? formData.driverName.split(" (")[0].trim()
        : formData.driverName.trim()
      selectedDriver = fleetDrivers.find((d) => (d.name || "").trim() === driverDisplayName)
    }

    const formattedDriverName = selectedDriver
      ? formatFleetDriverLabel(selectedDriver)
      : formData.driverName

    const driverMobile =
      selectedDriver?.mobile?.toString?.() ||
      selectedDriver?.phoneNumber?.toString?.() ||
      ""

    const selectedVehicle = fleetAssignment.vehicleId
      ? fleetVehicles.find((v) => getId(v) === fleetAssignment.vehicleId)
      : fleetVehicles.find((v) => (v.name || "") === (formData.vehicleName || ""))

    const vehicleNameOut = selectedVehicle?.name || formData.vehicleName
    
    // Map plants to their orders to group crate information
    const plantsByOrder = new Map()
    formData.plants?.forEach(plant => {
      plant.orders?.forEach(order => {
        const k = orderRowKey(order)
        if (k && !plantsByOrder.has(k)) {
          plantsByOrder.set(k, plant)
        }
      })
    })
    
    // Prepare order dispatch details with quantities, driver info, vehicle info, and crates
    const orderDispatchDetails = selectedOrdersArray.map(order => {
      const orderId = getOrderId(order)
      const rowKey = orderRowKey(order)
      const dispatchQty = orderQuantities.get(rowKey) || 0
      const remainingQty = order.details?.remainingPlants || order.quantity || 0
      const plantForOrder = plantsByOrder.get(rowKey)
      
      // Calculate crate details for this specific order based on its dispatch quantity
      const cratesForOrder = []
      if (plantForOrder?.cavityGroups && dispatchQty > 0) {
        const orderCavityKey = getOrderCavityKey(order)
        let matchingCavityGroup = plantForOrder.cavityGroups.find(
          (group) => cavityKey(group.cavity) === orderCavityKey
        )
        if (!matchingCavityGroup && plantForOrder.cavityGroups.length === 1) {
          matchingCavityGroup = plantForOrder.cavityGroups[0]
        }

        if (matchingCavityGroup?.cavitySize && matchingCavityGroup?.numberPerCrate) {
          const built = buildCratesPayloadForQuantity({
            dispatchQuantity: dispatchQty,
            cavityId: matchingCavityGroup.cavity,
            cavityName: matchingCavityGroup.cavityName,
            cavitySize: matchingCavityGroup.cavitySize,
            numberPerCrate: matchingCavityGroup.numberPerCrate
          })
          if (built) cratesForOrder.push(built)
        }
      }
      
      return {
        orderId: orderId,
        dispatchQuantity: dispatchQty,
        remainingAfterDispatch: remainingQty - dispatchQty,
        isPartialDispatch: dispatchQty < remainingQty,
        driverName: formattedDriverName,
        driverMobile,
        vehicleName: vehicleNameOut,
        crates: cratesForOrder
      }
    })
    
    const plantsDetails = formData.plants?.map((plant) => {
      const firstOrder = plant.orders?.[0]?.details

      // Transform cavity groups into the expected API format
      const pickupDetailsList = []
      const cratesList = []

      ;(plant.cavityGroups || []).forEach((cavityGroup) => {
        if (!cavityGroup.cavity) return

        // Process pickup details for this cavity
        cavityGroup.pickupDetails.forEach((detail) => {
          if (!detail.shade || Number(detail.quantity) <= 0) return

          pickupDetailsList.push({
            shade: detail.shade,
            shadeName: detail.shadeName || "",
            quantity: Number(detail.quantity),
            cavity: cavityGroup.cavity,
            cavityName: cavityGroup.cavityName,
            ...(detail.batchId ? { batchId: detail.batchId } : {}),
            ...(detail.batchNumber ? { batchNumber: detail.batchNumber } : {}),
            ...(detail.plantOutwardId ? { plantOutwardId: detail.plantOutwardId } : {}),
            ...(detail.secondaryInwardId ? { secondaryInwardId: detail.secondaryInwardId } : {}),
            ...(detail.secondaryInwardDate != null
              ? { secondaryInwardDate: detail.secondaryInwardDate }
              : {}),
            ...(detail.pollyhouseMatched ? { pollyhouseMatched: detail.pollyhouseMatched } : {}),
          })
        })

        // Process crates for this cavity
        if (cavityGroup.crates && cavityGroup.crates.length > 0) {
          const totalCrateCount = cavityGroup.crates.reduce(
            (sum, crate) => sum + (crate.numberOfCrates || 0),
            0
          )

          const totalPlantCount = cavityGroup.crates.reduce(
            (sum, crate) => sum + Number(crate.quantity || 0),
            0
          )

          const crateDetails = cavityGroup.crates
            .map((crate) => ({
              crateCount: crate.numberOfCrates || 0,
              plantCount: Number(crate.quantity || 0)
            }))
            .filter((detail) => detail.crateCount > 0)

          if (crateDetails.length > 0) {
            cratesList.push({
              cavity: cavityGroup.cavity,
              cavityName: cavityGroup.cavityName,
              crateCount: totalCrateCount,
              plantCount: totalPlantCount,
              crateDetails: crateDetails
            })
          }
        }
      })

      return {
        name: plant.name,
        id: plant.id,
        plantId:
          resolveMongoId(firstOrder?.plantID) ||
          resolveMongoId(plant.plantId) ||
          resolveMongoId(plant.id) ||
          "",
        subTypeId:
          resolveMongoId(firstOrder?.plantSubtypeID) ||
          resolveMongoId(plant.subTypeId) ||
          "",
        quantity: plant.quantity,
        totalPlants: pickupDetailsList.reduce((sum, detail) => sum + Number(detail.quantity), 0),
        pickupDetails: pickupDetailsList,
        crates: cratesList
      }
    })

    const exp = String(expectedNursery || "").trim().toUpperCase()
    const vehicleNumberOut =
      selectedVehicle?.number != null
        ? String(selectedVehicle.number).trim()
        : selectedVehicle?.vehicleNumber != null
          ? String(selectedVehicle.vehicleNumber).trim()
          : ""

    return {
      name: formData.name?.trim() || "",
      driverName: formattedDriverName,
      driverMobile,
      vehicleName: vehicleNameOut,
      vehicleNumber: vehicleNumberOut,
      vehicleId: fleetAssignment.vehicleId || null,
      driverId: fleetAssignment.driverId || null,
      ownerId: fleetAssignment.ownerId || null,
      routeNotes: fleetAssignment.routeNotes || "",
      driverRemark: fleetAssignment.driverRemark || "",
      vehicleRemark: fleetAssignment.vehicleRemark || "",
      orderIds: orderIds,
      orderDispatchDetails: orderDispatchDetails,
      plantsDetails: plantsDetails,
      ...(exp ? { expectedNursery: exp } : {})
    }
  }

  // Handlers
  const handleSubmit = async () => {
    setLoading(true)
    try {
      validateForm()
      const payload = transformDispatchData(formData, selectedOrders)
      if (readyDispatchGroupId) {
        payload.readyDispatchGroupId = readyDispatchGroupId
      }
      if (linkedAgriBlockedBy.length > 0) {
        payload.autoMarkLinkedAgriLoaded = true
      }
      console.log("[DispatchForm] Creating dispatch with payload:", payload)
      const instance = NetworkManager(API.DISPATCHED.CREATE_TRAY)
      const response = await instance.request(payload)
      if (response.data) {
        console.log("[DispatchForm] Dispatch created successfully:", response.data)
        // Trigger refresh of parent components
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dispatchCreated"))
        }
        onDispatchSuccess?.({
          orderIds: payload.orderIds,
          driverName: payload.driverName,
          vehicleName: payload.vehicleName,
          driverMobile: payload.driverMobile,
        })
        onClose()
      }
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error creating dispatch"
      console.error("[DispatchForm] Failed to create dispatch", {
        message: apiMessage,
        status: error?.response?.status,
        responseData: error?.response?.data,
        validationError: error?.name === "Error" ? error?.message : null,
      })
      setError(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCavityGroup = (plantIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      if (!updatedPlants[plantIndex].cavityGroups) {
        updatedPlants[plantIndex].cavityGroups = []
      }

      // Get the plant's orders to check for cavity information
      const plant = updatedPlants[plantIndex]
      const plantOrders = plant.orders || []
      
      // Extract unique cavity IDs from all orders for this plant
      const cavityIds = new Set()
      const cavityDetails = new Map()
      const cavityQuantities = new Map() // Track quantity per cavity
      
      plantOrders.forEach(order => {
        const cavityId =
          cavityKey(order.details?.cavityId) ||
          cavityKey(
            order.details?.cavity && typeof order.details.cavity === "object"
              ? order.details.cavity._id ?? order.details.cavity.id
              : order.details?.cavity
          )
        const cavityName =
          getCavityLabelForDispatchOrder(order.details, cavities, getId) ||
          "" ||
          ""
        const rowKey = orderRowKey(order)

        if (cavityId) {
          cavityIds.add(cavityId)
          if (!cavityDetails.has(cavityId)) {
            cavityDetails.set(cavityId, { id: cavityId, name: cavityName })
          }

          // Calculate dispatched quantity for this cavity
          const dispatchQty = orderQuantities.get(rowKey) || 0
          const currentQty = cavityQuantities.get(cavityId) || 0
          cavityQuantities.set(cavityId, currentQty + dispatchQty)
        }
      })
      
      // Auto-select cavity if:
      // 1. All orders have the same cavity (cavityIds size is 1)
      // 2. This cavity is not already selected in another cavity group
      let autoSelectedCavity = ""
      let autoSelectedCavityName = ""
      let autoFilledQuantity = 0
      
      if (cavityIds.size === 1) {
        const [singleCavityId] = Array.from(cavityIds)
        const isAlreadySelected = updatedPlants[plantIndex].cavityGroups?.some(
          (group) => cavityKey(group.cavity) === cavityKey(singleCavityId)
        )
        
        if (!isAlreadySelected) {
          autoSelectedCavity = singleCavityId
          autoSelectedCavityName = cavityDetails.get(singleCavityId)?.name || ""
          autoFilledQuantity = cavityQuantities.get(singleCavityId) || 0
        }
      }

      const newCavityGroup = {
        cavity: autoSelectedCavity,
        cavityName: autoSelectedCavityName,
        pickupDetails: [],
        crates: [],
        autoSelected: !!autoSelectedCavity // Track if cavity was auto-selected
      }
      
      // If cavity is auto-selected, initialize with one pickup detail
      if (autoSelectedCavity) {
          const selectedCavity = cavities.find((c) => getId(c) === String(autoSelectedCavity))
        if (selectedCavity) {
          newCavityGroup.cavitySize = selectedCavity.cavity || 1
          newCavityGroup.numberPerCrate = selectedCavity.numberPerCrate || 1
          newCavityGroup.pickupDetails = [{
            shade: "",
            quantity: autoFilledQuantity, // Auto-fill with dispatched quantity
            cavity: autoSelectedCavity,
            cavityName: autoSelectedCavityName,
            batchId: "",
            batchNumber: "",
            plantOutwardId: "",
            secondaryInwardId: "",
            secondaryInwardDate: null,
            pollyhouseMatched: "",
          }]
          
          if (autoFilledQuantity > 0) {
            newCavityGroup.crates = buildDisplayCrateLines(
              autoFilledQuantity,
              selectedCavity.cavity,
              selectedCavity.numberPerCrate
            )
          }
        }
      }

      updatedPlants[plantIndex].cavityGroups.push(newCavityGroup)

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleCavityChange = (plantIndex, groupIndex, value) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const selectedCavity = cavities.find((cavity) => getId(cavity) === String(value))

      // Check if this cavity is already selected in another group
      const isDuplicate = updatedPlants[plantIndex].cavityGroups.some(
        (group, idx) => idx !== groupIndex && String(group.cavity) === String(value)
      )

      if (isDuplicate) {
        setError(
          `Cavity ${selectedCavity?.name} is already selected. Please choose a different cavity.`
        )
        return prev
      }

      const cavitySize = selectedCavity?.cavity || 1
      const numberPerCrate = selectedCavity?.numberPerCrate || 1

      updatedPlants[plantIndex].cavityGroups[groupIndex] = {
        ...updatedPlants[plantIndex].cavityGroups[groupIndex],
        cavity: value,
        cavityName: selectedCavity?.name || "",
        cavitySize: cavitySize,
        numberPerCrate: numberPerCrate
      }

      // Reset pickup details whenever cavity changes, and ensure they have the cavity reference
      updatedPlants[plantIndex].cavityGroups[groupIndex].pickupDetails = [
        {
          shade: "",
          quantity: 0,
          cavity: value,
          cavityName: selectedCavity?.name || "",
          batchId: "",
          batchNumber: "",
          plantOutwardId: "",
          secondaryInwardId: "",
          secondaryInwardDate: null,
          pollyhouseMatched: "",
        }
      ]

      // Reset crates
      updatedPlants[plantIndex].cavityGroups[groupIndex].crates = []

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleDeleteCavityGroup = (plantIndex, groupIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      updatedPlants[plantIndex].cavityGroups = updatedPlants[plantIndex].cavityGroups.filter(
        (_, index) => index !== groupIndex
      )
      return { ...prev, plants: updatedPlants }
    })
  }

  const handleAddPickupDetail = (plantIndex, groupIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const cavityGroup = updatedPlants[plantIndex].cavityGroups[groupIndex]

      // Add the new pickup detail with cavity reference
      cavityGroup.pickupDetails.push({
        shade: "",
        quantity: 0,
        cavity: cavityGroup.cavity,
        cavityName: cavityGroup.cavityName,
        batchId: "",
        batchNumber: "",
        plantOutwardId: "",
        secondaryInwardId: "",
        secondaryInwardDate: null,
        pollyhouseMatched: "",
      })

      return { ...prev, plants: updatedPlants }
    })
  }

  const handlePickupDetailChange = (plantIndex, groupIndex, detailIndex, field, value) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const cavityGroup = updatedPlants[plantIndex].cavityGroups[groupIndex]

      if (field === "shade") {
        const selectedShade = shades.find((shade) => getId(shade) === String(value))
        cavityGroup.pickupDetails[detailIndex][field] = value
        cavityGroup.pickupDetails[detailIndex].shadeName = selectedShade?.name || ""

        // Make sure each pickup detail has the cavity reference
        cavityGroup.pickupDetails[detailIndex].cavity = cavityGroup.cavity
        cavityGroup.pickupDetails[detailIndex].cavityName = cavityGroup.cavityName
        if (!value) {
          clearPickupBatchMetaOnDetail(cavityGroup.pickupDetails[detailIndex])
        }
      } else {
        cavityGroup.pickupDetails[detailIndex][field] = value
      }

      // Recalculate crates based on the total pickup quantity for this cavity
      const totalQuantity = cavityGroup.pickupDetails.reduce(
        (sum, detail) => sum + Number(detail.quantity),
        0
      )

      if (totalQuantity > 0 && cavityGroup.cavitySize && cavityGroup.numberPerCrate) {
        cavityGroup.crates = buildDisplayCrateLines(
          totalQuantity,
          cavityGroup.cavitySize,
          cavityGroup.numberPerCrate
        )
      } else {
        cavityGroup.crates = []
      }

      return { ...prev, plants: updatedPlants }
    })
  }

  const handleShadeSelectWithBatchLookup = async (
    plantIndex,
    groupIndex,
    detailIndex,
    shadeId,
    plant,
    cavityGroup
  ) => {
    handlePickupDetailChange(plantIndex, groupIndex, detailIndex, "shade", shadeId)
    const loadKey = `${plantIndex}-${groupIndex}-${detailIndex}`
    if (!shadeId) {
      setPickupBatchLoadingKey("")
      return
    }
    const firstDetails = plant?.orders?.[0]?.details
    const plantCmsId = resolveMongoId(firstDetails?.plantID) || resolveMongoId(plant?.id)
    const plantSubtypeId = resolveMongoId(firstDetails?.plantSubtypeID)
    if (!plantCmsId || !plantSubtypeId) {
      return
    }
    const selectedShade = shades.find((s) => getId(s) === String(shadeId))
    const tray = cavities.find((c) => getId(c) === String(cavityGroup.cavity))
    const trayCavity = tray != null && tray.cavity != null ? Number(tray.cavity) : null
    setPickupBatchLoadingKey(loadKey)
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.FARMER_DISPATCH_PICKUP_BATCH_SUGGESTIONS)
      const res = await inst.request(
        {},
        {
          plantCmsId,
          plantSubtypeId,
          shadeName: selectedShade?.name || "",
          shadeNumber: selectedShade?.number || "",
          ...(trayCavity != null && Number.isFinite(trayCavity) && trayCavity > 0
            ? { trayCavity }
            : {}),
        }
      )
      const payload = res?.data?.data ?? res?.data
      const rec = payload?.recommended
      setFormData((prev) => {
        const plants = prev.plants.map((p, pi) => {
          if (pi !== plantIndex) return p
          return {
            ...p,
            cavityGroups: p.cavityGroups.map((g, gi) => {
              if (gi !== groupIndex) return g
              return {
                ...g,
                pickupDetails: g.pickupDetails.map((d, di) => {
                  if (di !== detailIndex) return d
                  if (String(d.shade) !== String(shadeId)) return d
                  const next = { ...d }
                  if (rec) applyRecommendedBatchToDetail(next, rec)
                  else clearPickupBatchMetaOnDetail(next)
                  return next
                }),
              }
            }),
          }
        })
        return { ...prev, plants }
      })
    } catch {
      setFormData((prev) => {
        const plants = prev.plants.map((p, pi) => {
          if (pi !== plantIndex) return p
          return {
            ...p,
            cavityGroups: p.cavityGroups.map((g, gi) => {
              if (gi !== groupIndex) return g
              return {
                ...g,
                pickupDetails: g.pickupDetails.map((d, di) => {
                  if (di !== detailIndex) return d
                  if (String(d.shade) !== String(shadeId)) return d
                  const next = { ...d }
                  clearPickupBatchMetaOnDetail(next)
                  return next
                }),
              }
            }),
          }
        })
        return { ...prev, plants }
      })
    } finally {
      setPickupBatchLoadingKey("")
    }
  }

  const handleDeletePickupDetail = (plantIndex, groupIndex, detailIndex) => {
    setFormData((prev) => {
      const updatedPlants = [...prev.plants]
      const pickupDetails = updatedPlants[plantIndex].cavityGroups[groupIndex].pickupDetails

      if (pickupDetails.length === 1) {
        return prev
      }

      updatedPlants[plantIndex].cavityGroups[groupIndex].pickupDetails = pickupDetails.filter(
        (_, index) => index !== detailIndex
      )

      return { ...prev, plants: updatedPlants }
    })
  }

  const togglePlantExpansion = (plantId) => {
    setExpandedPlants((prev) => ({
      ...prev,
      [plantId]: !prev[plantId]
    }))
  }

  // Handle order quantity change
  const handleOrderQuantityChange = (changedOrderId, newQuantity, maxQuantity) => {
    const chKey = String(changedOrderId ?? "")
    // Allow empty string for better UX when user is typing
    if (newQuantity === "" || newQuantity === undefined || newQuantity === null) {
      setOrderQuantities((prev) => {
        const updated = new Map(prev)
        updated.set(chKey, 0)
        orderQuantitiesRef.current = updated
        return updated
      })
      return
    }

    const qty = Math.max(0, Math.min(Number(newQuantity) || 0, maxQuantity))

    // Update the orderQuantities map and ref
    setOrderQuantities((prev) => {
      const updated = new Map(prev)
      updated.set(chKey, qty)
      orderQuantitiesRef.current = updated
      return updated
    })

    // Update formData separately to avoid stale state
    setFormData((prev) => {
      // Recalculate plant quantities with the updated map
      const selectedOrdersArray = getSelectedOrdersArray()
      const plantGroups = selectedOrdersArray?.reduce((acc, order) => {
        const plantId = order.details?.plantID
        const plantSubtypeId = order.details?.plantSubtypeID
        const key = `${plantId}_${plantSubtypeId}`
        const rk = orderRowKey(order)

        // Get the dispatch quantity for this order (use updated qty if this is the changed order)
        const dispatchQty =
          rk === chKey
            ? qty
            : (orderQuantitiesRef.current.get(rk) || order.quantity || 0)

        if (!acc[key]) {
          acc[key] = {
            id: plantId,
            name: order.plantType,
            quantity: dispatchQty,
            cavityGroups: prev.plants.find(p => p.id === plantId)?.cavityGroups || [],
            orders: []
          }
        } else {
          acc[key].quantity += dispatchQty
        }

        acc[key].orders.push(order)
        return acc
      }, {})

      return {
        ...prev,
        plants: Object.values(plantGroups)
      }
    })
  }

  /** Drop an order from this dispatch while editing (saved via PATCH; backend reverts order to ready queue). */
  const handleRemoveOrderFromDispatch = (rowKey) => {
    if (!rowKey || mode !== "view" || !isEditing) return
    setEditOrdersMap((prev) => {
      const base = prev != null ? prev : selectedOrders ? new Map(selectedOrders) : new Map()
      const next = new Map(base)
      next.delete(rowKey)
      return next
    })
    const nextQty = new Map(orderQuantitiesRef.current)
    nextQty.delete(rowKey)
    orderQuantitiesRef.current = nextQty
    setOrderQuantities(nextQty)
    setFormData((prev) => {
      const nextPlants = (prev.plants || [])
        .map((p) => ({
          ...p,
          orders: (p.orders || []).filter((o) => orderRowKey(o) !== rowKey),
        }))
        .filter((p) => (p.orders || []).length > 0)
        .map((p) => {
          const po = p.orders || []
          const q = po.reduce((sum, o) => {
            const k = orderRowKey(o)
            const v = nextQty.get(k)
            return sum + (v !== undefined ? Number(v) : Number(o.quantity) || 0)
          }, 0)
          return { ...p, quantity: q }
        })
      return { ...prev, plants: nextPlants }
    })
  }

  useEffect(() => {
    getShades()
    getCavities()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const inst = NetworkManager(API.NURSERY_SITE.LIST)
        const res = await inst.request({}, { activeOnly: "true" })
        const raw = res?.data?.data
        if (!cancelled) setNurserySites(Array.isArray(raw) ? raw : [])
      } catch {
        if (!cancelled) setNurserySites([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setIsEditing(false)
      setEditOrdersMap(null)
      setEligibleAddOrders([])
      setAddOrderDialogOpen(false)
      setSelectedAddOrderIds(new Set())
      setAddOrderSearch("")
      setAddOrderShadeId("")
      setError("")
      setFleetAssignment(emptyFleetAssignment())
      setFleetDrivers([])
      setFleetVehicles([])
    }
  }, [open])

  useEffect(() => {
    if (!open || !readyDispatchGroupId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const inst = NetworkManager(API.READY_DISPATCH_GROUP.GET_BY_ID)
        const res = await inst.request({}, { pathParams: [String(readyDispatchGroupId)] })
        const g = res?.data?.data
        if (cancelled || !g) return
        const ownerId = getId(g.ownerId)
        const driverId = getId(g.driverId)
        const vehicleId = getId(g.vehicleId)
        setFleetAssignment({
          ownerId,
          driverId,
          vehicleId,
          routeNotes: g.routeNotes || "",
          driverRemark: g.driverRemark || "",
          vehicleRemark: g.vehicleRemark || "",
        })
        const runName = (g.notes || "").trim() || g.groupCode || ""
        if (runName) {
          setFormData((prev) => ({ ...prev, name: runName }))
        }
        if (g.driverName || g.vehicleName) {
          setFormData((prev) => ({
            ...prev,
            driverName: g.driverName || prev.driverName,
            vehicleName: g.vehicleName || prev.vehicleName,
          }))
        }
      } catch (e) {
        console.error("Failed to load ready dispatch group", e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, readyDispatchGroupId])

  useEffect(() => {
    if (!fleetAssignment.ownerId) {
      setFleetDrivers([])
      setFleetVehicles([])
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const { drivers, vehicles } = await loadFleetForOwner(fleetAssignment.ownerId)
      if (cancelled) return
      setFleetDrivers(drivers)
      setFleetVehicles(vehicles)
      const d = fleetAssignment.driverId
        ? drivers.find((x) => getId(x) === fleetAssignment.driverId)
        : null
      const v = fleetAssignment.vehicleId
        ? vehicles.find((x) => getId(x) === fleetAssignment.vehicleId)
        : null
      setFormData((prev) => ({
        ...prev,
        driverName: d ? formatFleetDriverLabel(d) : prev.driverName,
        vehicleName: v?.name || prev.vehicleName,
      }))
    })()
    return () => {
      cancelled = true
    }
  }, [
    fleetAssignment.ownerId,
    fleetAssignment.driverId,
    fleetAssignment.vehicleId,
  ])

  // Keep ref in sync with state
  useEffect(() => {
    orderQuantitiesRef.current = orderQuantities
  }, [orderQuantities])

  useEffect(() => {
    if (mode === "view" && dispatchData) {
      applyDispatchDataToForm(dispatchData)
    } else if (selectedOrders?.size > 0) {
      const selectedOrdersArray = getSelectedOrdersArray()
      
      // Initialize order quantities with full order quantity or remaining quantity
      const initialQuantities = new Map()
      selectedOrdersArray.forEach(order => {
        const rk = orderRowKey(order)
        const availableQty = order.details?.remainingPlants || order.quantity || 0
        initialQuantities.set(rk, availableQty)
      })
      setOrderQuantities(initialQuantities)
      orderQuantitiesRef.current = initialQuantities
      
      const plantGroups = selectedOrdersArray?.reduce((acc, order) => {
        const plantId = order.details?.plantID
        const plantSubtypeId = order.details?.plantSubtypeID
        const key = `${plantId}_${plantSubtypeId}`
        const rk = orderRowKey(order)

        // Get the dispatch quantity for this order (from state or default to full quantity)
        const dispatchQty = initialQuantities.get(rk) || order.quantity || 0

        if (!acc[key]) {
          acc[key] = {
            id: plantId,
            name: order.plantType,
            quantity: dispatchQty,
            // Initialize with empty cavity groups - user must add cavities manually
            cavityGroups: [],
            orders: []
          }
        } else {
          acc[key].quantity += dispatchQty
        }

        acc[key].orders.push(order)
        return acc
      }, {})

      setFormData((prev) => ({
        ...prev,
        driverName: "",
        vehicleName: "",
        plants: Object.values(plantGroups)
      }))

      const initialExpandedState = Object.keys(plantGroups)?.reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {})
      setExpandedPlants(initialExpandedState)

      const exCreate = selectedOrdersArray
        .map((o) => o?.details?.expectedNursery || o?.expectedNursery)
        .find((x) => x != null && String(x).trim() !== "")
      setExpectedNursery(exCreate ? String(exCreate).trim().toUpperCase() : "RB")
    }
  }, [mode, dispatchData, selectedOrders?.size])

  const handleCancelEdit = () => {
    const snap = initialViewSnapshotRef.current
    if (snap?.formData) {
      setFormData(JSON.parse(JSON.stringify(snap.formData)))
    }
    if (snap?.orderQuantities) {
      const m = new Map(snap.orderQuantities)
      setOrderQuantities(m)
      orderQuantitiesRef.current = m
    }
    if (snap?.expectedNursery != null && String(snap.expectedNursery).trim() !== "") {
      setExpectedNursery(String(snap.expectedNursery).trim().toUpperCase())
    } else {
      setExpectedNursery("RB")
    }
    setIsEditing(false)
    setEditOrdersMap(null)
    setError("")
    setFleetAssignment(emptyFleetAssignment())
    setFleetDrivers([])
    setFleetVehicles([])
  }

  const handleUpdate = async () => {
    if (!dispatchData?._id) {
      setError("Missing dispatch id — cannot save.")
      return
    }
    setLoading(true)
    setError("")
    try {
      validateForm()
      const payload = transformDispatchData(formData, selectedOrders)
      if (!payload.driverMobile && dispatchData?.driverMobile) {
        payload.driverMobile = dispatchData.driverMobile
      }
      const instance = NetworkManager(API.DISPATCHED.UPDATE_DISPATCH)
      await instance.request(payload, [dispatchData._id])
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dispatchCreated"))
      }
      onDispatchSuccess?.({
        orderIds: payload.orderIds,
        driverName: payload.driverName,
        vehicleName: payload.vehicleName,
        driverMobile: payload.driverMobile,
      })
      setIsEditing(false)
      setEditOrdersMap(null)
      initialViewSnapshotRef.current = {
        formData: JSON.parse(JSON.stringify(formData)),
        orderQuantities: new Map(orderQuantitiesRef.current || orderQuantities)
      }
      onClose()
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Error updating dispatch"
      setError(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  const isViewMode = mode === "view"
  const filteredEligibleAddOrders = eligibleAddOrders.filter((order) => {
    if (!addOrderSearch.trim()) return true
    const s = addOrderSearch.trim().toLowerCase()
    const farmer = orderFarmerDisplayName(order).toLowerCase()
    const orderCode = String(order?.orderId || "").toLowerCase()
    const plant = `${order?.plantType?.name || ""} ${order?.plantSubtype?.name || ""}`.toLowerCase()
    return farmer.includes(s) || orderCode.includes(s) || plant.includes(s)
  })
  const selectedCount = selectedAddOrderIds.size
  const handleHeaderClose = () => {
    if (isEditing) {
      handleCancelEdit()
      return
    }
    onClose()
  }
  const handleDialogClose = (_event, reason) => {
    // Prevent accidental immediate close when opening from mobile sticky actions.
    if (reason === "backdropClick") return
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: isMobile ? "max-h-[100vh] overflow-y-auto" : "max-h-[90vh] overflow-y-auto"
      }}>
      <DialogTitle className={`bg-green-50 border-b border-green-100 flex items-center justify-between ${isMobile ? "py-3 px-3" : ""}`}>
        <div className="flex items-center gap-2">
          <Truck className="text-green-600" size={24} />
          <span className={`text-green-800 ${isMobile ? "text-base font-semibold" : ""}`}>
            {!isViewMode ? "Create New Dispatch" : isEditing ? "Edit Dispatch" : "View Dispatch"}
          </span>
        </div>
        <IconButton
          onClick={handleHeaderClose}
          size="small"
          className="text-green-700"
          aria-label={isMobile ? "Back" : "Close"}
        >
          {isMobile ? <ArrowLeft size={18} /> : <X size={18} />}
        </IconButton>
      </DialogTitle>

      <DialogContent className={`space-y-6 bg-gray-50 ${isMobile ? "mt-2 px-2 pb-2" : "mt-6"}`}>
        {isViewMode && isEditing && (
          <div className="flex items-center justify-between gap-2 bg-white border border-blue-100 rounded-lg p-3">
            <div className="text-sm text-blue-900">
              Add more ready orders to this dispatch.
            </div>
            <Button
              variant="outlined"
              onClick={async () => {
                setAddOrderDialogOpen(true)
                setSelectedAddOrderIds(new Set())
                await fetchEligibleOrdersForEditAdd()
              }}
              className="border-blue-300 text-blue-700">
              Add Order
            </Button>
          </div>
        )}

        {/* Order Summary Cards with Quantity Input */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isMobile ? "gap-2" : "gap-3"}`}>
          {getSelectedOrdersArray().map((order) => {
            const rk = orderRowKey(order)
            const orderId = rk || getOrderId(order)
            const totalQty = order.quantity || 0
            const remainingQty = order.details?.remainingPlants || totalQty
            const dispatchQty =
              orderQuantities.get(rk) !== undefined
                ? orderQuantities.get(rk)
                : remainingQty
            const isPartialDispatch = dispatchQty < remainingQty

            return (
              <div
                key={orderId}
                className={`bg-white rounded-lg border ${
                  isPartialDispatch ? "border-orange-200" : "border-green-100"
                } hover:border-green-200 transition-colors shadow-sm`}>
                <div className={isMobile ? "p-2.5" : "p-3"}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-900">{order.farmerName}</span>
                      <span className="text-xs text-gray-500 font-mono">#{order.order}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Plant: </span>
                        <span className="text-gray-700">{order.plantType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Village: </span>
                        <span className="text-gray-700">
                          {order.details?.farmer?.village || "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Total Qty: </span>
                        <span className="text-gray-700">{totalQty.toLocaleString()}</span>
                        {remainingQty < totalQty && (
                          <span className="text-orange-600 ml-2">
                            (Remaining: {remainingQty.toLocaleString()})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Cavity: </span>
                        <span className="text-gray-700 font-medium">
                          {getCavityLabelForDispatchOrder(order.details, cavities, getId) ||
                            (orderRowHasTrayRef(order.details)
                              ? "Not specified"
                              : "No tray on order — select below")}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Delivery: </span>
                        <span className="text-gray-700">{order.Delivery}</span>
                        {order.dispatchedFromAnotherSlot && order.oldDeliveryDate && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Was: {formatOrderDateForCard(order.oldDeliveryDate)}
                            <span className="ml-1 text-sky-700">(from another slot)</span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Booking: </span>
                        <span className="text-gray-700">{order.orderDate}</span>
                      </div>
                    </div>
                    
                    {/* Dispatch Quantity Input */}
                    {isViewMode && isEditing && (
                      <div className="mt-2 pt-2 border-t border-red-100">
                        <button
                          type="button"
                          onClick={() => handleRemoveOrderFromDispatch(rk)}
                          className={`text-xs font-medium text-red-700 hover:text-red-900 underline ${isMobile ? "py-2" : ""}`}>
                          Remove from this dispatch
                        </button>
                      </div>
                    )}
                    {!isViewMode && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <label className="block text-xs text-gray-600 mb-1">
                          Dispatch Quantity {isPartialDispatch && <span className="text-orange-600">(Split Order)</span>}
                        </label>
                        <div className={`flex gap-2 items-center ${isMobile ? "flex-wrap" : ""}`}>
                          <input
                            type="number"
                            min="0"
                            max={remainingQty}
                            value={dispatchQty === 0 ? "" : dispatchQty}
                            onChange={(e) => {
                              handleOrderQuantityChange(rk, e.target.value, remainingQty)
                            }}
                            className={`flex-1 px-2 ${isMobile ? "py-2 text-base" : "py-1 text-sm"} border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                            placeholder="Enter quantity"
                          />
                          <button
                            onClick={() => handleOrderQuantityChange(rk, remainingQty, remainingQty)}
                            className={`text-xs px-2 ${isMobile ? "py-2 min-w-[64px]" : "py-1"} bg-green-50 text-green-600 rounded hover:bg-green-100`}
                            title="Use full quantity">
                            Full
                          </button>
                        </div>
                        {isPartialDispatch && (
                          <p className="text-xs text-orange-600 mt-1">
                            {remainingQty - dispatchQty} plants will remain for later dispatch
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button className="absolute top-0 right-0 px-4 py-3" onClick={() => setError("")}>
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-3">
            <input
              type="text"
              className={`${isMobile ? "p-3 text-base" : "p-2"} border rounded-lg w-full`}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              disabled={isViewMode && !isEditing}
              placeholder="Dispatch name (e.g., Nashik Morning Run)"
            />
            {isViewMode && !isEditing ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                <div>
                  <span className="text-slate-500">Driver:</span> {formData.driverName || "—"}
                </div>
                <div>
                  <span className="text-slate-500">Vehicle:</span> {formData.vehicleName || "—"}
                </div>
                {fleetAssignment.routeNotes ? (
                  <div>
                    <span className="text-slate-500">Route notes:</span> {fleetAssignment.routeNotes}
                  </div>
                ) : null}
                {fleetAssignment.driverRemark ? (
                  <div>
                    <span className="text-slate-500">Driver remark:</span> {fleetAssignment.driverRemark}
                  </div>
                ) : null}
                {fleetAssignment.vehicleRemark ? (
                  <div>
                    <span className="text-slate-500">Vehicle remark:</span> {fleetAssignment.vehicleRemark}
                  </div>
                ) : null}
              </div>
            ) : (
              <FleetAssignmentPanel
                value={fleetAssignment}
                onChange={setFleetAssignment}
                disabled={isViewMode && !isEditing}
                autoSelectSingle={mode !== "view"}
                remarksExpandedDefault={Boolean(
                  fleetAssignment.driverRemark ||
                    fleetAssignment.vehicleRemark ||
                    fleetAssignment.routeNotes
                )}
              />
            )}
          </div>

          <div className={`flex flex-wrap items-center gap-2 ${isMobile ? "text-base" : ""}`}>
            <label className="text-sm text-gray-600 shrink-0">Expected nursery</label>
            <select
              className={`border rounded-lg bg-white ${isMobile ? "p-3 flex-1 min-w-[120px]" : "p-2"}`}
              value={expectedNursery}
              disabled={isViewMode && !isEditing}
              onChange={(e) => setExpectedNursery(String(e.target.value || "").toUpperCase())}>
              {nurserySites.length === 0 ? (
                <option value="RB">RB (RAMBIOTECH)</option>
              ) : (
                nurserySites.map((s) => (
                  <option key={s._id} value={String(s.code || "").toUpperCase()}>
                    {s.name} ({String(s.code || "").toUpperCase()})
                  </option>
                ))
              )}
            </select>
          </div>



          {/* Plants Details */}
          <div className="space-y-4">
            {formData.plants?.map((plant, plantIndex) => (
              <div key={plant.id} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-4 bg-green-50 cursor-pointer"
                  onClick={() => togglePlantExpansion(plant.id)}>
                  <div className="flex items-center gap-2">
                    <Leaf className="text-green-600" size={20} />
                    <span className="font-medium">{plant.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        {plant.quantity.toLocaleString()} plants
                      </span>
                    </div>
                  </div>
                  {expandedPlants[plant.id] ? (
                    <ChevronUp className="text-green-600" size={20} />
                  ) : (
                    <ChevronDown className="text-green-600" size={20} />
                  )}
                </div>

                {expandedPlants[plant.id] && (
                  <div className="p-4 space-y-4">
                    {/* Add Cavity Button */}
                    {!isViewMode && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAddCavityGroup(plantIndex)}
                          className="text-sm bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-md border border-green-200">
                          + Add Cavity
                        </button>
                      </div>
                    )}

                    {/* Cavity Groups */}
                    {plant.cavityGroups?.length > 0 ? (
                      <div className="space-y-6">
                        {plant.cavityGroups.map((cavityGroup, groupIndex) => (
                          <div
                            key={groupIndex}
                            className="border rounded-lg bg-white p-4 space-y-4">
                            {/* Cavity Selection */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Cavity Selection</h4>
                              {!isViewMode && (
                                <IconButton
                                  onClick={() => handleDeleteCavityGroup(plantIndex, groupIndex)}
                                  disabled={isViewMode}>
                                  <Trash2 size={18} className="text-red-500" />
                                </IconButton>
                              )}
                            </div>

                            <div className="space-y-2">
                              {cavityGroup.autoSelected && cavityGroup.cavity && (
                                <div className="text-xs text-green-600 bg-green-50 p-2 rounded flex items-center gap-1">
                                  <span>✓</span>
                                  <span>Auto-selected from order cavity: <strong>{cavityGroup.cavityName}</strong></span>
                                </div>
                              )}
                              <div className="flex gap-4">
                                <select
                                  className="flex-1 p-2 border rounded"
                                  value={cavityGroup.cavity || ""}
                                  onChange={(e) =>
                                    handleCavityChange(plantIndex, groupIndex, e.target.value)
                                  }
                                  disabled={isViewMode && !isEditing}>
                                  <option value="">Select Cavity</option>
                                  {cavities?.map((cavity) => (
                                    <option
                                      key={getId(cavity)}
                                      value={getId(cavity)}
                                      disabled={plant.cavityGroups.some(
                                        (group, idx) =>
                                          idx !== groupIndex &&
                                          String(group.cavity) === String(getId(cavity))
                                      )}>
                                      {cavity.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Pickup Details - only shown if cavity is selected */}
                            {cavityGroup.cavity && (
                              <div className="space-y-4 mt-4 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">
                                    Pickup Details for {cavityGroup.cavityName}
                                  </h4>
                                  {!isViewMode && (
                                    <button
                                      onClick={() => handleAddPickupDetail(plantIndex, groupIndex)}
                                      className="text-sm text-green-600 hover:text-green-700">
                                      + Add Pickup Detail
                                    </button>
                                  )}
                                </div>

                                {cavityGroup.pickupDetails?.map((detail, detailIndex) => {
                                  const batchLoadKey = `${plantIndex}-${groupIndex}-${detailIndex}`
                                  return (
                                    <div key={detailIndex} className="flex flex-col gap-1 w-full">
                                      <div className="flex gap-4 items-center">
                                        <select
                                          className="flex-1 p-2 border rounded"
                                          value={detail.shade}
                                          onChange={(e) =>
                                            handleShadeSelectWithBatchLookup(
                                              plantIndex,
                                              groupIndex,
                                              detailIndex,
                                              e.target.value,
                                              plant,
                                              cavityGroup
                                            )
                                          }
                                          disabled={
                                            (isViewMode && !isEditing) ||
                                            pickupBatchLoadingKey === batchLoadKey
                                          }>
                                          <option value="">Select Shade</option>
                                          {shades?.map((shade) => (
                                            <option key={getId(shade)} value={getId(shade)}>
                                              {shade.name}
                                            </option>
                                          ))}
                                        </select>

                                        <input
                                          type="number"
                                          className="flex-1 p-2 border rounded"
                                          value={detail.quantity}
                                          onChange={(e) =>
                                            handlePickupDetailChange(
                                              plantIndex,
                                              groupIndex,
                                              detailIndex,
                                              "quantity",
                                              e.target.value
                                            )
                                          }
                                          placeholder="Quantity"
                                          disabled={isViewMode && !isEditing}
                                        />

                                        {!isViewMode && (
                                          <IconButton
                                            onClick={() =>
                                              handleDeletePickupDetail(
                                                plantIndex,
                                                groupIndex,
                                                detailIndex
                                              )
                                            }
                                            disabled={cavityGroup.pickupDetails.length === 1}>
                                            <Trash2 size={20} className="text-red-500" />
                                          </IconButton>
                                        )}
                                      </div>
                                      {pickupBatchLoadingKey === batchLoadKey && (
                                        <p className="text-xs text-gray-500 pl-0.5">
                                          Looking up nursery batch (FIFO) for this shed…
                                        </p>
                                      )}
                                      {(detail.batchNumber || detail.secondaryInwardId) &&
                                        pickupBatchLoadingKey !== batchLoadKey && (
                                          <p className="text-xs text-gray-600 pl-0.5">
                                            <span className="font-medium">Plantation / batch:</span>{" "}
                                            {detail.batchNumber
                                              ? `Batch ${detail.batchNumber}`
                                              : "—"}
                                            {detail.secondaryInwardDate
                                              ? ` · planted ${formatPlantationDateShort(
                                                  detail.secondaryInwardDate
                                                )}`
                                              : ""}
                                            {detail.pollyhouseMatched
                                              ? ` · stock at ${detail.pollyhouseMatched}`
                                              : ""}
                                          </p>
                                        )}
                                    </div>
                                  )
                                })}

                                {/* Crate Details */}
                                {cavityGroup.crates?.length > 0 && (
                                  <div className="mt-4 pt-4 border-t">
                                    <h4 className="font-medium mb-2">Crate Details</h4>
                                    <div className="space-y-2">
                                      {cavityGroup.crates.map((crate, crateIndex) => (
                                        <div
                                          key={crateIndex}
                                          className="grid grid-cols-2 gap-4 p-2 bg-gray-50 rounded">
                                          <div className="text-sm">
                                            <span className="text-gray-500">Crates: </span>
                                            <span className="font-medium">
                                              {crate.numberOfCrates}
                                            </span>
                                          </div>
                                          <div className="text-sm">
                                            <span className="text-gray-500">Plants: </span>
                                            <span className="font-medium">{crate.quantity}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500 italic">
                        Please add a cavity to continue
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>

      <DialogActions className={`${isMobile ? "p-2 pb-3" : "p-4"} bg-gray-50 border-t`}>
        <Button
          onClick={isEditing ? handleCancelEdit : onClose}
          variant="outlined"
          className={`text-gray-600 border-gray-400 hover:bg-gray-100 ${isMobile ? "flex-1 min-h-[42px]" : ""}`}>
          {isEditing || !isViewMode ? "Cancel" : "Close"}
        </Button>
        {isViewMode && !isEditing && (
          <Button
            onClick={() => {
              setEditOrdersMap(selectedOrders ? new Map(selectedOrders) : new Map())
              setIsEditing(true)
            }}
            variant="contained"
            className="bg-blue-600 hover:bg-blue-700 text-white">
            Edit
          </Button>
        )}
        {isEditing && (
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={loading}
            className={`bg-green-600 hover:bg-green-700 text-white ${isMobile ? "flex-1 min-h-[42px]" : ""}`}>
            {loading ? "Updating..." : "Save Changes"}
          </Button>
        )}
        {!isViewMode && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            className={`bg-green-600 hover:bg-green-700 text-white ${isMobile ? "flex-1 min-h-[42px]" : ""}`}>
            {loading ? "Creating..." : "Create Dispatch"}
          </Button>
        )}
      </DialogActions>

      <Dialog
        open={addOrderDialogOpen}
        onClose={() => {
          if (!addOrderLoading) setAddOrderDialogOpen(false)
        }}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth>
        <DialogTitle className="bg-blue-50 border-b border-blue-100">Add Orders to Dispatch</DialogTitle>
        <DialogContent className={`space-y-4 ${isMobile ? "mt-2 px-3 pb-3" : "mt-4"}`}>
          <TextField
            fullWidth
            size="small"
            label="Search order/farmer/plant"
            value={addOrderSearch}
            onChange={(e) => setAddOrderSearch(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shade for quick add</label>
            <select
              value={addOrderShadeId}
              onChange={(e) => setAddOrderShadeId(e.target.value)}
              className="w-full p-2 border rounded-md bg-white">
              <option value="">Select shade</option>
              {shades.map((s) => {
                const sid = getId(s)
                return (
                  <option key={sid} value={sid}>
                    {s.name}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="max-h-[360px] overflow-y-auto border rounded-md bg-white">
            {eligibleAddLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading eligible orders...</div>
            ) : filteredEligibleAddOrders.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No eligible orders found.</div>
            ) : (
              filteredEligibleAddOrders.map((order) => {
                const oid = String(order?._id || order?.id || "")
                const cavityId = getCavityIdString(order?.cavity)
                const disabled = !cavityId
                const selected = selectedAddOrderIds.has(oid)
                return (
                  <label
                    key={oid}
                    className={`flex items-start gap-3 p-3 border-b last:border-b-0 ${
                      disabled ? "bg-gray-50 opacity-70" : "cursor-pointer hover:bg-blue-50"
                    }`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleAddOrderSelection(oid)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">
                        #{order?.orderId || "N/A"} - {orderFarmerDisplayName(order) || "Unknown"}
                      </div>
                      <div className="text-gray-700">
                        {(order?.plantType?.name || "Unknown")} {"->"} {(order?.plantSubtype?.name || "Unknown")}
                      </div>
                      <div className="text-gray-500">
                        Remaining: {Number(order?.remainingPlants ?? order?.numberOfPlants ?? order?.totalPlants ?? 0).toLocaleString()}
                      </div>
                      {disabled && (
                        <div className="text-xs text-red-600 mt-1">
                          Tray/cavity missing on order (cannot quick add).
                        </div>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </DialogContent>
        <DialogActions className={`${isMobile ? "p-2 pb-3" : "p-4"} bg-gray-50 border-t`}>
          <Button
            variant="outlined"
            onClick={() => setAddOrderDialogOpen(false)}
            disabled={addOrderLoading}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmAddOrders}
            disabled={addOrderLoading || selectedCount === 0 || !addOrderShadeId}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            {addOrderLoading ? "Adding..." : `Add Selected (${selectedCount})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}

export default DispatchForm
