import {
  getActualRemainingPlants,
  getActualGapPlantsPositive,
  getActualGapPct,
  getActualSurplusPlants,
  getActualAvailablePlants,
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

describe("getDefaultMonthTabIndex", () => {
  it("picks current calendar month when present", () => {
    const months = ["January", "February", "June"];
    const idx = getDefaultMonthTabIndex(months, {}, moment("2026-06-15"));
    expect(idx).toBe(2);
  });
});
