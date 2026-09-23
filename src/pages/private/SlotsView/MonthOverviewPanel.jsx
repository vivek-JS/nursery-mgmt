import React from "react"
import { Tooltip } from "@mui/material"
import MetricDefinitionIcon from "./MetricDefinitionIcon"
import { SLOT_METRIC_DEFINITIONS as D } from "./slotMetricDefinitions"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const tileClass = "relative p-3 pr-6 rounded-xl min-w-0 border"

const SplitFootnote = ({ native, rolled, nativeLabel = "नेटिव्ह", rolledLabel = "रोलओव्हर" }) => (
  <p className="text-[10px] leading-snug mt-1 tabular-nums">
    <span className="font-semibold text-slate-600">{nativeLabel}</span>{" "}
    <span className="text-slate-800">{fmt(native)}</span>
    <span className="mx-1 text-slate-300">·</span>
    <span className="font-semibold text-slate-600">{rolledLabel}</span>{" "}
    <span className="text-slate-800">{fmt(rolled)}</span>
  </p>
)

const MonthOverviewPanel = ({ summary, isOverbooked, sowingAllowed = false }) => {
  const {
    totalAvailablePlants,
    totalExcessAvailableForBooking,
    totalSowingGapPlants,
    totalExpectedInSlots,
    totalDeliveryThisMonth,
    totalDeliveryNative,
    totalDeliveryRolled,
    totalRemainingToDispatch,
    totalRemainingNative,
    totalRemainingRolled,
    totalAllDispatchedPlants,
    totalDispatchedNative,
    totalDispatchedRolled,
    totalDispatchedOther,
  } = summary

  const dispatchedRollover =
    totalDispatchedRolled + Math.max(0, (totalDispatchedOther || 0) - (totalDispatchedRolled || 0))

  const deliveryCrossCheck = (totalRemainingToDispatch || 0) + (totalAllDispatchedPlants || 0)

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
        sowingAllowed ? "xl:grid-cols-6" : "xl:grid-cols-5"
      } gap-3`}>
      {sowingAllowed ? (
        <>
          <Tooltip title={D.monthExcess.mr} arrow>
            <div className={`${tileClass} bg-green-50 border-green-200`}>
              <div className="flex items-center gap-0.5">
                <p className="text-[10px] font-semibold text-green-800">{D.monthExcess.label}</p>
                <MetricDefinitionIcon definitionKey="monthExcess" />
              </div>
              <p className="text-xl font-bold tabular-nums text-green-900">
                {fmt(totalExcessAvailableForBooking)}
              </p>
              <p className="text-[10px] text-green-700">नवीन बुकिंगसाठी (पेरणी परवानगी)</p>
            </div>
          </Tooltip>
          <Tooltip title={D.monthSowingGap.mr} arrow>
            <div
              className={`${tileClass} ${
                (totalSowingGapPlants || 0) > 0
                  ? "bg-orange-50 border-orange-200"
                  : "bg-gray-50 border-gray-200"
              }`}>
              <div className="flex items-center gap-0.5">
                <p className="text-[10px] font-semibold text-orange-800">{D.monthSowingGap.label}</p>
                <MetricDefinitionIcon definitionKey="monthSowingGap" />
              </div>
              <p
                className={`text-xl font-bold tabular-nums ${
                  (totalSowingGapPlants || 0) > 0 ? "text-orange-900" : "text-gray-800"
                }`}>
                {fmt(totalSowingGapPlants)}
              </p>
              <p className="text-[10px] text-orange-700">ऑर्डरची पेरणी बाकी</p>
            </div>
          </Tooltip>
        </>
      ) : (
        <Tooltip title={D.monthAvailable.mr} arrow>
          <div className={`${tileClass} ${isOverbooked ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-center gap-0.5">
              <p className="text-[10px] font-semibold text-green-800">{D.monthAvailable.label}</p>
              <MetricDefinitionIcon definitionKey="monthAvailable" />
            </div>
            <p
              className={`text-xl font-bold tabular-nums ${
                isOverbooked ? "text-red-700" : "text-green-900"
              }`}>
              {fmt(totalAvailablePlants)}
            </p>
            <p className="text-[10px] text-green-700">या महिन्यात नवीन बुकिंग</p>
          </div>
        </Tooltip>
      )}

      <Tooltip title={D.monthExpected.mr} arrow>
        <div className={`${tileClass} bg-violet-50 border-violet-200`}>
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-semibold text-violet-800">{D.monthExpected.label}</p>
            <MetricDefinitionIcon definitionKey="monthExpected" />
          </div>
          <p className="text-xl font-bold tabular-nums text-violet-900">
            {fmt(totalExpectedInSlots)}
          </p>
          <p className="text-[10px] text-violet-700">स्लॉट तारखेत नोंदलेली लागवड</p>
        </div>
      </Tooltip>

      <Tooltip title={D.monthDelivery.mr} arrow>
        <div className={`${tileClass} bg-blue-50 border-blue-200`}>
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-semibold text-blue-800">{D.monthDelivery.label}</p>
            <MetricDefinitionIcon definitionKey="monthDelivery" />
          </div>
          <p className="text-xl font-bold tabular-nums text-blue-900">
            {fmt(totalDeliveryThisMonth ?? deliveryCrossCheck)}
          </p>
          <SplitFootnote
            native={totalDeliveryNative}
            rolled={totalDeliveryRolled}
            rolledLabel="रोलओव्हर आणि इतर"
          />
          <p className="text-[10px] text-blue-600 mt-0.5">= उरलेले + डिस्पॅच</p>
        </div>
      </Tooltip>

      <Tooltip title={D.monthRemaining.mr} arrow>
        <div className={`${tileClass} bg-amber-50 border-amber-200`}>
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-semibold text-amber-800">{D.monthRemaining.label}</p>
            <MetricDefinitionIcon definitionKey="monthRemaining" />
          </div>
          <p className="text-xl font-bold tabular-nums text-amber-900">
            {fmt(totalRemainingToDispatch)}
          </p>
          <SplitFootnote native={totalRemainingNative} rolled={totalRemainingRolled} />
        </div>
      </Tooltip>

      <Tooltip title={D.monthDispatched.mr} arrow>
        <div className={`${tileClass} bg-slate-50 border-slate-200`}>
          <div className="flex items-center gap-0.5">
            <p className="text-[10px] font-semibold text-slate-700">{D.monthDispatched.label}</p>
            <MetricDefinitionIcon definitionKey="monthDispatched" />
          </div>
          <p className="text-xl font-bold tabular-nums text-slate-900">
            {fmt(totalAllDispatchedPlants)}
          </p>
          <SplitFootnote
            native={totalDispatchedNative}
            rolled={dispatchedRollover}
            rolledLabel="रोलओव्हर आणि इतर"
          />
        </div>
      </Tooltip>
    </div>
  )
}

export default MonthOverviewPanel
