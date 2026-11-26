import moment from "moment";
import { orderDayBucket, orderDayLabel, orderDeliveryDayLabel } from "./orderBoardUtils";

test("today is Aaj only", () => {
  const order = { deliveryDate: moment().format("YYYY-MM-DD") };
  expect(orderDayLabel(order)).toBe("Aaj");
  expect(orderDayBucket(order)).toBe("TODAY");
  expect(orderDeliveryDayLabel(order)).toBe("Aaj");
});

test("tomorrow and the day after use Udya and Parva", () => {
  expect(orderDayLabel({ deliveryDate: moment().add(1, "day").format("YYYY-MM-DD") })).toBe("Udya");
  expect(orderDayBucket({ deliveryDate: moment().add(1, "day").format("YYYY-MM-DD") })).toBe("TOMORROW");
  expect(orderDayLabel({ deliveryDate: moment().add(2, "day").format("YYYY-MM-DD") })).toBe("Parva");
});

test("any other date shows that date", () => {
  const order = { deliveryDate: "2026-01-05" };
  expect(orderDayLabel(order)).toBe("05/01");
  expect(orderDayBucket(order)).toBe("2026-01-05");
});

test("dispatch day wins over the delivery date", () => {
  const order = {
    deliveryDate: moment().add(10, "days").format("YYYY-MM-DD"),
    dispatchDayKey: "TOMORROW",
  };
  expect(orderDayLabel(order)).toBe("Udya");
  expect(orderDeliveryDayLabel(order)).toBe(moment().add(10, "days").format("DD/MM"));
});

test("a saved target date of today stays Aaj", () => {
  const order = {
    dispatchDayKey: "DAY_AFTER",
    dispatchTargetDate: moment().format("YYYY-MM-DD"),
    deliveryDate: moment().add(9, "days").format("YYYY-MM-DD"),
  };
  expect(orderDayLabel(order)).toBe("Aaj");
  expect(orderDayBucket(order)).toBe("TODAY");
});
