import {
  getActualRemainingPlants,
  getActualGapPlantsPositive,
  getActualGapPct,
  getActualSurplusPlants,
  getActualAvailablePlants,
  getActualReadyPlants,
  getExpectedMortality,
  getLagwadGrossPlants,
  rollupMonthSlotMetrics,
} from "./slotMetrics";
import moment from "moment";
import { getDefaultMonthTabIndex } from "./slotMonthUtils";

const slot = (overrides = {}) => ({
  actualPlants: 1000,
  remainingNative: 600,
  remainingRolledIn: 200,
  remainingToDispatch: 800,
  ...overrides,
});

describe("slot physical metrics helpers", () => {
  it("getActualRemainingPlants sums native + rolled", () => {
    expect(getActualRemainingPlants(slot())).toBe(800);
  });

  it("getActualGapPct uses actualPlants denominator", () => {
    expect(getActualGapPct(slot())).toBe(0);
    expect(
      getActualGapPct(slot({ actualPlants: 500, remainingNative: 600, remainingRolledIn: 0 }))
    ).toBe(20);
  });

  it("getActualSurplusPlants when physical exceeds queue", () => {
    expect(getActualSurplusPlants(slot({ actualPlants: 1500 }))).toBe(700);
    expect(getActualGapPlantsPositive(slot({ actualPlants: 1500 }))).toBe(0);
  });

  it("getActualAvailablePlants subtracts dispatched, not remaining queue", () => {
    expect(
      getActualAvailablePlants(
        slot({
          actualPlants: 1000,
          remainingToDispatch: 800,
          totalAllDispatchedPlants: 200,
        })
      )
    ).toBe(800);
  });

  it("getActualReadyPlants reads API shed rollup", () => {
    expect(getActualReadyPlants(slot({ actualReadyPlants: 350 }))).toBe(350);
    expect(getActualReadyPlants(slot({ actualReadyPlants: -5 }))).toBe(0);
  });

  it("getLagwadGrossPlants sums actual and expected mortality", () => {
    expect(getLagwadGrossPlants(slot({ actualPlants: 900, expectedMortality: 100 }))).toBe(1000);
    expect(getLagwadGrossPlants(slot({ actualPlants: 0, expectedMortality: 0 }))).toBe(0);
  });

  it("getExpectedMortality reads slot field", () => {
    expect(getExpectedMortality(slot({ expectedMortality: 50 }))).toBe(50);
  });
});

describe("rollupMonthSlotMetrics", () => {
  it("sums physical and booking totals across slots", () => {
    const rollup = rollupMonthSlotMetrics([
      {
        actualPlants: 500,
        expectedMortality: 50,
        lagwadRemaining: 400,
        remainingNative: 300,
        remainingRolledIn: 100,
        remainingToDispatch: 400,
        totalBookedPlants: 200,
        availablePlants: 100,
        totalPlants: 300,
        actualReadyPlants: 120,
        shedReadyInShed: 150,
      },
      {
        actualPlants: 200,
        expectedMortality: 20,
        lagwadRemaining: 180,
        remainingNative: 50,
        remainingRolledIn: 0,
        remainingToDispatch: 50,
        totalBookedPlants: 80,
        availablePlants: 40,
        totalPlants: 120,
        actualReadyPlants: 30,
      },
    ]);
    expect(rollup.totalActualPlants).toBe(700);
    expect(rollup.totalExpectedMortality).toBe(70);
    expect(rollup.totalLagwadGrossPlants).toBe(770);
    expect(rollup.totalActualRemaining).toBe(450);
    expect(rollup.totalActualReadyPlants).toBe(150);
    expect(rollup.totalShedReadyInShed).toBe(150);
    expect(rollup.actualGapPlants).toBe(0);
    expect(rollup.actualSurplusPlants).toBe(250);
    expect(rollup.totalBookedPlants).toBe(280);
  });
});

describe("getDefaultMonthTabIndex", () => {
  it("picks current calendar month when present", () => {
    const months = ["January", "February", "June"];
    const idx = getDefaultMonthTabIndex(months, {}, moment("2026-06-15"));
    expect(idx).toBe(2);
  });
});
