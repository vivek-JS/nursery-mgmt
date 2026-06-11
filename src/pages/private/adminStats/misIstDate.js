/**
 * Admin MIS — IST date helpers (aligns with backend istOrderDateStats + istSlotDate).
 */
export {
  formatMisDailyDate,
  formatIstYmd,
  parseIstYmd,
  parseIstYmdRange,
  generateIstDateKeys,
  istTodayYmd,
  istYesterdayYmd,
  istTodayMoment,
  toApiIstDateRange,
  sameIstCalendarDay,
  API_YMD_FORMAT as MIS_API_YMD_FORMAT,
} from "utils/istCalendar"

export {
  isDeliveryDateInSlotWindow,
  slotWindowToDeliveryUtcRange,
  deliveryDateToIstMoment,
  slotDayStartMoment,
  slotDayEndMoment,
} from "utils/istSlotDate"
