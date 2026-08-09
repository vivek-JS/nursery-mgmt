import moment from "moment";

export function parseDispatchFromGetByIdResponse(res) {
  const raw = res?.data?.data ?? res?.data;
  if (raw && raw._id && typeof raw === "object" && !Array.isArray(raw)) return raw;
  const inner = raw?.data;
  if (inner && inner._id && typeof inner === "object" && !Array.isArray(inner)) return inner;
  return null;
}

export function mergeDispatchWithFreshDetail(listRow, freshDetail) {
  if (!freshDetail?._id) return listRow;
  const freshOrders = Array.isArray(freshDetail.orderIds) ? freshDetail.orderIds : [];
  const byId = new Map(freshOrders.map((o) => [String(o?._id ?? ""), o]));
  const mergedOrderIds = (Array.isArray(listRow.orderIds) ? listRow.orderIds : []).map((o) => {
    const id = String(o?._id ?? o?.details?.orderid ?? o?.details?.orderId ?? "");
    const f = id ? byId.get(id) : null;
    if (!f) return o;
    const fromFresh =
      f.deliveryChallanInvoiceNumber != null && String(f.deliveryChallanInvoiceNumber).trim() !== ""
        ? String(f.deliveryChallanInvoiceNumber).trim()
        : "";
    const fromDetails = o.details?.deliveryChallanInvoiceNumber;
    const dcVal = fromFresh || (fromDetails != null ? String(fromDetails).trim() : "");
    const fromFreshOff =
      f.officialDeliveryChallanNumber != null &&
      String(f.officialDeliveryChallanNumber).trim() !== ""
        ? String(f.officialDeliveryChallanNumber).trim()
        : "";
    const fromDetailsOff = o.details?.officialDeliveryChallanNumber;
    const offVal =
      fromFreshOff || (fromDetailsOff != null ? String(fromDetailsOff).trim() : "");
    const farmer =
      f.farmer && typeof f.farmer === "object"
        ? {
            name: f.farmer.name,
            mobileNumber: f.farmer.mobileNumber,
            village: f.farmer.village,
          }
        : o.details?.farmer;
    const freightVal =
      f.freightCharges != null && f.freightCharges !== ""
        ? Math.max(0, Number(f.freightCharges) || 0)
        : null;
    return {
      ...o,
      ...(dcVal ? { deliveryChallanInvoiceNumber: dcVal } : {}),
      ...(offVal ? { officialDeliveryChallanNumber: offVal } : {}),
      ...(freightVal != null ? { freightCharges: freightVal } : {}),
      details: {
        ...(o.details || {}),
        ...(dcVal ? { deliveryChallanInvoiceNumber: dcVal } : {}),
        ...(offVal ? { officialDeliveryChallanNumber: offVal } : {}),
        ...(Array.isArray(f.payment) ? { payment: f.payment } : {}),
        ...(farmer ? { farmer } : {}),
        ...(freightVal != null ? { freightCharges: freightVal } : {}),
      },
    };
  });
  return {
    ...listRow,
    ...freshDetail,
    plantsDetails: freshDetail.plantsDetails ?? listRow.plantsDetails,
    orderDispatchDetails: freshDetail.orderDispatchDetails ?? listRow.orderDispatchDetails,
    transportStatus: freshDetail.transportStatus ?? listRow.transportStatus,
    orderIds: mergedOrderIds,
  };
}

export function transformGetDispatchToMap(d) {
  const m = new Map();
  const rows = Array.isArray(d?.orderIds) ? d.orderIds : [];
  for (const o of rows) {
    const id = o?._id;
    if (!id) continue;
    const subtypes = Array.isArray(o.plantName?.subtypes) ? o.plantName.subtypes : [];
    const stName =
      subtypes.find((s) => String(s?._id) === String(o.plantSubtype))?.name || "Unknown";
    const cavity = o.cavity;
    const cavityIdRaw =
      typeof cavity === "object" && cavity?._id != null
        ? String(cavity._id)
        : cavity != null
          ? String(cavity)
          : "";
    const qty = Number(o.numberOfPlants || 0) + Number(o.additionalPlants || 0);
    m.set(String(id), {
      order: o.orderId,
      farmerName: o.farmer?.name || "Unknown",
      plantType: `${o.plantName?.name || "Unknown"} -> ${stName}`,
      quantity: qty,
      orderDate: o.orderBookingDate ? moment(o.orderBookingDate).format("DD-MM-YYYY") : "",
      rate: o.rate,
      total: qty * Number(o.rate || 0),
      "Paid Amt": 0,
      "remaining Amt": 0,
      orderStatus: o.orderStatus,
      Delivery: o.deliveryDate ? moment(o.deliveryDate).format("DD-MM-YYYY") : "",
      details: {
        farmer: o.farmer || {},
        orderid: id,
        remainingPlants: Number(o.remainingPlants ?? qty),
        plantID: o.plantName?._id || o.plantName,
        plantSubtypeID: o.plantSubtype,
        cavity: cavity ?? null,
        cavityId: cavityIdRaw || undefined,
        cavityName: (typeof cavity === "object" && cavity?.name) || (cavityIdRaw ? "Tray" : ""),
      },
    });
  }
  return m;
}

export function transformDataToMap(data) {
  const map = new Map();
  (data.orderIds || []).forEach((order) => {
    const {
      details: { farmer, contact, orderid, salesPerson, bookingSlot, payment },
      plantDetails,
      quantity,
      rate,
      total,
      remainingAmt,
      PaidAmt,
      orderStatus,
      orderDate,
    } = order;
    const delivery =
      bookingSlot?.startDay && bookingSlot?.endDay && bookingSlot?.month
        ? `${bookingSlot.startDay} - ${bookingSlot.endDay} ${bookingSlot.month}, ${new Date().getFullYear()}`
        : "";
    map.set(orderid, {
      order: order.order,
      farmerName: farmer?.name,
      plantType: plantDetails?.name,
      quantity,
      orderDate,
      rate,
      total,
      "Paid Amt": PaidAmt,
      "remaining Amt": remainingAmt,
      orderStatus,
      Delivery: delivery,
      details: {
        farmer: { name: farmer?.name, mobileNumber: farmer?.mobileNumber, village: farmer?.village },
        contact,
        orderNotes: order.details?.orderNotes || "",
        payment,
        orderid,
        salesPerson: { name: salesPerson?.name, phoneNumber: salesPerson?.phoneNumber },
        plantID: order.details?.bookingSlot?.plantId || "",
        plantSubtypeID: order.details?.bookingSlot?.subtypeId || "",
        cavityId: order.cavity || order.details?.cavity || order.details?.cavityId,
        bookingSlot: {
          slotId: bookingSlot?._id || "",
          startDay: bookingSlot?.startDay || "",
          endDay: bookingSlot?.endDay || "",
          subtypeId: bookingSlot?.subtypeId || "",
          month: bookingSlot?.month || "",
        },
      },
    });
  });
  return map;
}

export function transformDispatchForForm(dispatchData) {
  const plants = dispatchData.plantsDetails?.map((plant) => {
    const plantOrders = dispatchData.orderIds?.map((order) => {
      const firstPickup =
        Array.isArray(plant.pickupDetails) && plant.pickupDetails.length > 0
          ? plant.pickupDetails[0]
          : null;
      return {
        order: order.order,
        farmerName: order.farmerName,
        plantType: plant.name,
        quantity: order.quantity,
        orderDate: order.orderDate,
        rate: order.rate,
        total: order.total,
        "Paid Amt": order["Paid Amt"],
        "remaining Amt": order["remaining Amt"],
        orderStatus: order.orderStatus,
        Delivery: order.Delivery,
        details: {
          ...(order.details || {}),
          farmer: order.details?.farmer || {},
          plantID: plant.plantId,
          plantSubtypeID: plant.subTypeId,
          cavityName: order.details?.cavityName ?? firstPickup?.cavityName,
          cavityId:
            order.details?.cavityId ??
            (order.details?.cavity && typeof order.details.cavity === "object"
              ? order.details.cavity._id ?? order.details.cavity.id
              : undefined) ??
            firstPickup?.cavity,
        },
      };
    });
    return {
      id: plant.id,
      name: plant.name,
      quantity: plant.quantity,
      pickupDetails: plant.pickupDetails?.map((pickup) => ({
        shade: pickup.shade,
        quantity: pickup.quantity,
        shadeName: pickup.shadeName,
        cavityName: pickup.cavityName,
        cavity: pickup.cavity,
        cavitySize: pickup.cavitySize,
        numberPerCrate: pickup.numberPerCrate,
      })),
      crates: plant.crates?.map((crate) => ({
        cavity: crate.cavity,
        cavityName: crate.cavityName,
        cavitySize: crate.cavitySize,
        numberPerCrate: crate.numberPerCrate,
        crateCount: crate.crateCount,
        plantCount: crate.plantCount,
        crateDetails: crate.crateDetails || [],
      })),
      orders: plantOrders,
    };
  });

  return {
    _id: dispatchData._id,
    name: dispatchData.name || "",
    driverName: dispatchData.driverName,
    driverMobile: dispatchData.driverMobile,
    vehicleName: dispatchData.vehicleName,
    transportId: dispatchData.transportId,
    plants,
    orderIds: Array.isArray(dispatchData.orderIds) ? dispatchData.orderIds : [],
    orderDispatchDetails: Array.isArray(dispatchData.orderDispatchDetails)
      ? dispatchData.orderDispatchDetails
      : [],
  };
}
