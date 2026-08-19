import React from "react"
import LagwadCharts from "../private/LagwadAnalysis/LagwadCharts"
import "../private/LagwadAnalysis/lagwadAnalysis.css"

const mk = (over) => ({
  totalPlants: 0,
  lagwadRemaining: 0,
  rolledInAvailablePlants: 0,
  rolledInOrderCount: 0,
  physicalGap: 0,
  status: "active",
  isManual: false,
  lineCount: 4,
  batchCount: 2,
  overdueLineCount: 0,
  avgOverdueDays: 0,
  maxOverdueDays: 0,
  rolledInActualReadyPlants: 0,
  rolledInOrderPlants: 0,
  totalBookedPlants: 0,
  totalDispatchedPlants: 0,
  availablePlants: 0,
  isOverbooked: false,
  lagwadGross: 0,
  ...over
})

const slots = [
  mk({
    _id: "a",
    month: "July",
    windowState: "expired",
    actualPlants: 120000,
    expectedMortality: 13300,
    actualReadyPlants: 118000,
    remainingToDispatch: 40000,
    readyGap: 0
  }),
  mk({
    _id: "b",
    month: "August",
    windowState: "current",
    actualPlants: 180000,
    expectedMortality: 20000,
    actualReadyPlants: 52000,
    remainingToDispatch: 220000,
    readyGap: 168000
  }),
  mk({
    _id: "c",
    month: "September",
    windowState: "upcoming",
    actualPlants: 140000,
    expectedMortality: 15500,
    actualReadyPlants: 12000,
    remainingToDispatch: 96000,
    readyGap: 84000
  }),
  mk({
    _id: "d",
    month: "October",
    windowState: "upcoming",
    actualPlants: 78000,
    expectedMortality: 8600,
    actualReadyPlants: 0,
    remainingToDispatch: 130000,
    readyGap: 130000
  }),
  mk({
    _id: "e",
    month: "November",
    windowState: "upcoming",
    actualPlants: 60000,
    expectedMortality: 6600,
    actualReadyPlants: 0,
    remainingToDispatch: 90000,
    readyGap: 90000
  })
]

const totals = {
  sellablePool: 578000,
  expectedMortality: 64000,
  readyToDispatch: 182000,
  deliveryNeeded: 576000,
  readyGap: 394000,
  physicalGap: 0,
  readyCoveredByReady: 182000,
  lagwadGross: 642000
}

const LagwadPreview = () => (
  <div className="lag-root min-h-screen">
    <div className="w-full space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <LagwadCharts slots={slots} totals={totals} onSelectMonth={() => {}} />
    </div>
  </div>
)

export default LagwadPreview
