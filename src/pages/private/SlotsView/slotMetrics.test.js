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
  getGrossOrderCoveredPlants,
  getExcessAvailableForBooking,
  getDisplaySowingGap,
  getSowingGapPlants,
  getBookedUncoveredPlants,
  getSowedForOtherDeliveryPlants,
  getSowingFromOtherSlotPlants,
  hasSowingFromOtherSlot,
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

describe("sowing-allowed slot metrics", () => {
  it("getExcessAvailableForBooking subtracts gross order cover from available", () => {
    const slot = {
      availablePlants: 103204,
      availablePlantsMaterialized: true,
      sowingBatches: [{ orderCoveredPlants: 33000, excessPlants: 15510 }],
    };
    expect(getGrossOrderCoveredPlants(slot)).toBe(33000);
    expect(getExcessAvailableForBooking(slot)).toBe(70204);
  });

  it("prefers API excessAvailableForBooking when present", () => {
    expect(getExcessAvailableForBooking({ excessAvailableForBooking: 50000 })).toBe(50000);
  });

  it("getSowingGapPlants mirrors bookedUncoveredPlants", () => {
    const covered = {
      totalBookedPlants: 33000,
      bookedCoveredPlants: 33000,
      bookedUncoveredPlants: 0,
    };
    expect(getSowingGapPlants(covered)).toBe(0);
    expect(getBookedUncoveredPlants(covered)).toBe(0);

    const gap = {
      totalBookedPlants: 10000,
      bookedCoveredPlants: 0,
      bookedUncoveredPlants: 10000,
    };
    expect(getSowingGapPlants(gap)).toBe(10000);
  });

  it("getDisplaySowingGap prefers API bookedUncovered over booked-primarySowed", () => {
    expect(
      getDisplaySowingGap(
        { totalBookedPlants: 33000, primarySowed: 0, bookedUncoveredPlants: 0 },
        false
      )
    ).toBe(0)
    expect(getDisplaySowingGap({ totalBookedPlants: 10000, primarySowed: 3000 }, false)).toBe(7000)
    expect(getDisplaySowingGap({ sowingGapPlants: 5000 }, true)).toBe(5000)
  })

  it("getSowedForOtherDeliveryPlants uses gross cover when no local booked", () => {
    expect(
      getSowedForOtherDeliveryPlants({
        totalBookedPlants: 0,
        sowingBatches: [{ orderCoveredPlants: 33000 }],
      })
    ).toBe(33000)
  })

  it("getSowingFromOtherSlotPlants falls back when API field missing", () => {
    expect(
      getSowingFromOtherSlotPlants({
        totalBookedPlants: 33000,
        bookedCoveredPlants: 33000,
        bookedUncoveredPlants: 0,
        grossOrderCoveredPlants: 0,
      })
    ).toBe(33000)
  })

  it("rollupMonthSlotMetrics sums excess and sowing gap", () => {
    const rollup = rollupMonthSlotMetrics([
      {
        availablePlants: 103204,
        availablePlantsMaterialized: true,
        sowingBatches: [{ orderCoveredPlants: 33000 }],
        bookedUncoveredPlants: 0,
      },
      {
        availablePlants: 0,
        totalBookedPlants: 33000,
        bookedCoveredPlants: 33000,
        bookedUncoveredPlants: 0,
      },
    ]);
    expect(rollup.totalExcessAvailableForBooking).toBe(70204);
    expect(rollup.totalSowingGapPlants).toBe(0);
  });
});

describe("getDefaultMonthTabIndex", () => {
  it("picks current calendar month when present", () => {
    const months = ["January", "February", "June"];
    const idx = getDefaultMonthTabIndex(months, {}, moment("2026-06-15"));
    expect(idx).toBe(2);
  });
});
