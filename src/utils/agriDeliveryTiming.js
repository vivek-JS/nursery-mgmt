/** Ram Agri order send/dispatch timing: today / tomorrow / custom date. */

export const AGRI_DELIVERY_TIMING = {
  TODAY: "today",
  TOMORROW: "tomorrow",
  CUSTOM: "custom",
};

export function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addLocalDays(d, days) {
  const x = startOfLocalDay(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Earliest allowed send date (today or order date, whichever is later). */
export function minAgriSendDate(orderDate = new Date()) {
  const today = startOfLocalDay(new Date());
  const orderDay = startOfLocalDay(orderDate);
  return orderDay.getTime() > today.getTime() ? orderDay : today;
}

export function resolveAgriDeliveryDate(timing, customDate, orderDate = new Date()) {
  const minDay = minAgriSendDate(orderDate);
  const calendarToday = startOfLocalDay(new Date());
  const calendarTomorrow = addLocalDays(calendarToday, 1);

  if (timing === AGRI_DELIVERY_TIMING.TODAY) {
    return calendarToday.getTime() >= minDay.getTime() ? calendarToday : minDay;
  }
  if (timing === AGRI_DELIVERY_TIMING.TOMORROW) {
    const tomorrow = calendarTomorrow.getTime() >= minDay.getTime() ? calendarTomorrow : addLocalDays(minDay, 1);
    return tomorrow;
  }
  if (timing === AGRI_DELIVERY_TIMING.CUSTOM) {
    if (customDate) {
      const picked = startOfLocalDay(customDate);
      return picked.getTime() >= minDay.getTime() ? picked : minDay;
    }
    const defaultCustom = addLocalDays(minDay, 1);
    return defaultCustom.getTime() > calendarTomorrow.getTime() ? defaultCustom : addLocalDays(calendarTomorrow, 1);
  }
  return null;
}

export function inferAgriDeliveryTiming(deliveryDate, orderDate = new Date()) {
  if (!deliveryDate) return AGRI_DELIVERY_TIMING.TODAY;
  const d = startOfLocalDay(deliveryDate);
  const today = startOfLocalDay(new Date());
  const tomorrow = addLocalDays(today, 1);
  const minDay = minAgriSendDate(orderDate);
  const effectiveToday = today.getTime() >= minDay.getTime() ? today : minDay;
  const effectiveTomorrow =
    tomorrow.getTime() >= minDay.getTime() ? tomorrow : addLocalDays(minDay, 1);
  if (d.getTime() === effectiveToday.getTime()) return AGRI_DELIVERY_TIMING.TODAY;
  if (d.getTime() === effectiveTomorrow.getTime()) return AGRI_DELIVERY_TIMING.TOMORROW;
  return AGRI_DELIVERY_TIMING.CUSTOM;
}

export function formatAgriDeliveryTimingLabel(timing, deliveryDate) {
  const dateStr = deliveryDate ? startOfLocalDay(deliveryDate).toLocaleDateString("en-IN") : "";
  if (timing === AGRI_DELIVERY_TIMING.TODAY) return dateStr ? `आज · ${dateStr}` : "आज";
  if (timing === AGRI_DELIVERY_TIMING.TOMORROW) return dateStr ? `उद्या · ${dateStr}` : "उद्या";
  if (deliveryDate) return dateStr;
  return "तारीख निवडा";
}

/** Display label for stored order deliveryDate (आज / उद्या / date). */
export function formatAgriOrderDeliveryLabel(deliveryDate, orderDate = new Date()) {
  if (!deliveryDate) return "—";
  const timing = inferAgriDeliveryTiming(deliveryDate, orderDate);
  return formatAgriDeliveryTimingLabel(timing, deliveryDate);
}

/**
 * Normalize any picker/Date/string into API-safe ISO for agri delivery/order dates.
 * Uses local calendar day + noon UTC so "आज" does not flip to the previous UTC day,
 * and always matches backend validators that expect ...T...Z.
 */
export function toAgriApiDateISO(value) {
  if (value == null || value === "") return null;

  let localDay = null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    localDay = startOfLocalDay(value);
  } else if (typeof value === "object" && typeof value.toDate === "function") {
    const asDate = value.toDate();
    if (!(asDate instanceof Date) || Number.isNaN(asDate.getTime())) return null;
    localDay = startOfLocalDay(asDate);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      localDay = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 0, 0, 0, 0);
    } else {
      const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (dmy) {
        localDay = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 0, 0, 0, 0);
      } else {
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return null;
        localDay = startOfLocalDay(parsed);
      }
    }
  } else {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    localDay = startOfLocalDay(parsed);
  }

  if (!localDay || Number.isNaN(localDay.getTime())) return null;

  const y = localDay.getFullYear();
  const m = String(localDay.getMonth() + 1).padStart(2, "0");
  const d = String(localDay.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T12:00:00.000Z`;
}
