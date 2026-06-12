import {
  getActualRemainingPlants,
  getActualGapPlantsPositive,
  getActualGapPct,
  getActualSurplusPlants,
  getActualAvailablePlants,
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

  it("getActualAvailablePlants subtracts remainingToDispatch", () => {
    expect(getActualAvailablePlants(slot())).toBe(200);
  });
});

describe("rollupMonthSlotMetrics", () => {
  it("sums physical and booking totals across slots", () => {
    const rollup = rollupMonthSlotMetrics([
      {
        actualPlants: 500,
        remainingNative: 300,
        remainingRolledIn: 100,
        remainingToDispatch: 400,
        totalBookedPlants: 200,
        availablePlants: 100,
        totalPlants: 300,
      },
      {
        actualPlants: 200,
        remainingNative: 50,
        remainingRolledIn: 0,
        remainingToDispatch: 50,
        totalBookedPlants: 80,
        availablePlants: 40,
        totalPlants: 120,
      },
    ]);
    expect(rollup.totalActualPlants).toBe(700);
    expect(rollup.totalActualRemaining).toBe(450);
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
