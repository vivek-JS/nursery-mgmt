import {
  applyTrayToOrderDetails,
  buildOrderCavityPatch,
  getOrderCavityIdFromRow,
  syncPlantGroupsAfterOrderCavityChange,
} from "./dispatchOrderCavityUtils";

const buildDisplayCrateLines = (qty, cavitySize, numberPerCrate) => {
  const trays = Math.floor(qty / cavitySize);
  const fullCrates = Math.floor(trays / numberPerCrate);
  const plantsInFullCrates = fullCrates * numberPerCrate * cavitySize;
  const remainingPlants = Math.max(0, qty - plantsInFullCrates);
  const rows = [];
  if (fullCrates > 0) rows.push({ numberOfCrates: fullCrates, quantity: plantsInFullCrates });
  if (remainingPlants > 0) rows.push({ numberOfCrates: 1, quantity: remainingPlants });
  return rows;
};

describe("dispatchOrderCavityUtils", () => {
  it("buildOrderCavityPatch includes order id and cavity", () => {
    const patch = buildOrderCavityPatch(
      { details: { orderid: "abc123", remainingPlants: 500 }, quantity: 500 },
      "tray1"
    );
    expect(patch).toEqual({ id: "abc123", cavity: "tray1", numberOfPlants: 500 });
  });

  it("getOrderCavityIdFromRow resolves cavityId on details", () => {
    expect(
      getOrderCavityIdFromRow({ details: { cavityId: "t1", cavity: { _id: "t1" } } })
    ).toBe("t1");
  });

  it("applyTrayToOrderDetails sets tray fields", () => {
    const tray = { _id: "t2", name: "8-cell", cavity: 8, numberPerCrate: 10 };
    const details = applyTrayToOrderDetails({ orderid: "x" }, tray, (o) => o._id);
    expect(details.cavityId).toBe("t2");
    expect(details.cavityName).toBe("8-cell");
  });

  it("syncPlantGroupsAfterOrderCavityChange updates matching group and recalculates crates", () => {
    const oldTrayId = "old-tray";
    const newTray = { _id: "new-tray", name: "10-cell", cavity: 10, numberPerCrate: 5 };
    const plants = [
      {
        id: "p1",
        orders: [{ details: { orderid: "order-1" } }],
        cavityGroups: [
          {
            cavity: oldTrayId,
            cavityName: "Old",
            cavitySize: 8,
            numberPerCrate: 4,
            pickupDetails: [{ shade: "s1", quantity: 100, cavity: oldTrayId }],
            crates: [{ numberOfCrates: 3, quantity: 96 }],
          },
        ],
      },
    ];

    const next = syncPlantGroupsAfterOrderCavityChange({
      plants,
      orderRowKeyStr: "order-1",
      oldCavityKey: oldTrayId,
      newTray,
      getId: (o) => o._id,
      buildDisplayCrateLines,
    });

    const group = next[0].cavityGroups[0];
    expect(group.cavity).toBe("new-tray");
    expect(group.cavitySize).toBe(10);
    expect(group.numberPerCrate).toBe(5);
    expect(group.pickupDetails[0].cavity).toBe("new-tray");
    expect(group.crates.length).toBeGreaterThan(0);
    expect(group.crates.reduce((s, c) => s + c.quantity, 0)).toBe(100);
  });
});
