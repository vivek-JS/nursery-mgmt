import React from "react";
import moment from "moment";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { NetworkManager } from "network/core";
import CallingListColumn from "./CallingListColumn";
import ReadyColumn from "./ReadyColumn";
import VehiclesColumn from "./VehiclesColumn";

jest.mock("network/core", () => ({
  NetworkManager: jest.fn(),
  API: {
    slots: { GET_PLANTS: "plants" },
    ORDER: { GET_DISTRICTS: "districts", GET_TALUKAS: "talukas", GET_VILLAGES: "villages" },
  },
}));

beforeEach(() => {
  NetworkManager.mockImplementation(() => ({
    request: jest.fn(async () => ({ data: [] })),
  }));
});

jest.mock("components/fleet/FleetAssignmentPanel", () => () => <div>Fleet</div>);

function order(overrides = {}) {
  return {
    _id: "a1",
    orderId: "4195",
    numberOfPlants: 1200,
    deliveryDate: moment().format("YYYY-MM-DD"),
    farmer: { name: "Kiran chaudhari", village: "Abit Khind", taluka: "Raver", mobileNumber: "9876543210" },
    plantSubtype: { name: "Grand Naine" },
    ...overrides,
  };
}

const later = {
  ...order({
    _id: "b2",
    orderId: "4207",
    numberOfPlants: 800,
    deliveryDate: "2026-01-05",
    farmer: { name: "Old farmer", village: "Abit Khind", taluka: "Yawal" },
    plantSubtype: { name: "Robusta" },
  }),
};

test("calling rows show variety, count, highlighted place, and Aaj without the date", async () => {
  const onReady = jest.fn();
  render(
    <CallingListColumn
      orders={[order()]}
      loading={false}
      filters={{ search: "", farmReadyOnly: false, startDate: "2026-11-19", endDate: "2026-12-03", includePastDue: false, plantId: "", subtypeId: "", district: "", taluka: "", village: "" }}
      onFiltersChange={jest.fn()}
      dayKey="TODAY"
      onDayKey={jest.fn()}
      onReady={onReady}
      onReadyAll={jest.fn()}
      markingIds={new Set()}
    />
  );

  expect(screen.getByText("Kiran chaudhari")).toBeInTheDocument();
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByText("Grand Naine")).toBeInTheDocument();
  expect(screen.getByText((1200).toLocaleString())).toBeInTheDocument();
  expect(screen.getByText("Raver → Abit Khind")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /98765 43210/ })).toBeInTheDocument();
  expect(screen.queryByText(moment().format("DD/MM"))).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Plant, variety, taluka, village/ })).toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Plant")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Ready" }));
  expect(onReady).toHaveBeenCalledTimes(1);
});

test("selecting a ready order moves it, and Aaj stays a word while other dates show the date", () => {
  const onToggle = jest.fn();
  const onToggleGroup = jest.fn();
  const columnProps = {
    orders: [order(), later],
    loading: false,
    stagedIds: new Set(),
    selectedIds: new Set(),
    onToggle,
    onToggleGroup,
    onEditQty: jest.fn(),
    savingQtyId: "",
  };
  const { rerender } = render(<ReadyColumn {...columnProps} />);

  expect(screen.getByText("Grand Naine")).toBeInTheDocument();
  expect(screen.getByText("Raver → Abit Khind")).toBeInTheDocument();
  expect(screen.getByText("05/01")).toBeInTheDocument();
  expect(screen.queryByText(moment().format("DD/MM"))).not.toBeInTheDocument();

  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(onToggle).toHaveBeenCalledWith("a1");

  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  expect(onToggleGroup).toHaveBeenCalledWith(["a1", "b2"], true);

  rerender(<ReadyColumn {...columnProps} stagedIds={new Set(["a1"])} />);
  expect(screen.queryByText("Kiran chaudhari")).not.toBeInTheDocument();
  expect(screen.getByText("Old farmer")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Aaj" }));
  expect(screen.queryByText("Old farmer")).not.toBeInTheDocument();

  const dateInput = document.querySelector('input[type="date"]');
  fireEvent.change(dateInput, { target: { value: "2026-01-05" } });
  expect(dateInput.value).toBe("2026-01-05");
  expect(screen.getByText("Old farmer")).toBeInTheDocument();
});

test("the vehicle column accepts a drop anywhere and does not show a capacity limit", () => {
  const onAssignIds = jest.fn();
  render(
    <VehiclesColumn
      assignment={{ ownerId: "o", driverId: "d", vehicleId: "v1" }}
      onAssignmentChange={jest.fn()}
      vehicle={{ number: "MH 19", name: "Tata" }}
      driverLabel="Ramesh"
      openDispatch={null}
      stagedOrders={[]}
      onAssignIds={onAssignIds}
      onRemoveStaged={jest.fn()}
      onDispatch={jest.fn()}
      onQuickOrder={jest.fn()}
    />
  );

  expect(screen.getByText(/No plant limit/i)).toBeInTheDocument();
  expect(screen.queryByText(/staged/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

  const column = screen.getByText("3. Vehicles").parentElement.parentElement;
  fireEvent.drop(column, { dataTransfer: { getData: () => "a1" } });
  expect(onAssignIds).toHaveBeenCalledWith(["a1"]);
});
