import React from "react"
import { MenuPath } from "../core.js"
import HomeIcon from "@mui/icons-material/Home"
import BiotechIcon from "@mui/icons-material/Biotech"
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft"
import AodIcon from "@mui/icons-material/Aod"
import GroupIcon from "@mui/icons-material/Group"
import InventoryIcon from "@mui/icons-material/Inventory"
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest"
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings"
import ListAltIcon from "@mui/icons-material/ListAlt"
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined"
import PaidIcon from "@mui/icons-material/Paid"
import PaymentIcon from "@mui/icons-material/Payment"

export const DashboardMenus = [
  new MenuPath("Orders", <HomeIcon />, "/u/dashboard"),
  new MenuPath("Stats", <BiotechIcon />, "/u/stats"),
  new MenuPath("Plants and Products", <AlignHorizontalLeftIcon />, "/u/plants"),
  new MenuPath("Slots Managment", <BiotechIcon />, "/u/slots"),
  new MenuPath("Hardening", <BiotechIcon />, "/u/hardening"),
  new MenuPath("CMS", <AodIcon />, "/u/cms"),
  new MenuPath("Backup & Import", <BiotechIcon />, "/u/data"),
  new MenuPath("Farmers", <BiotechIcon />, "/u/farmers"),
  // new MenuPath("Weekly", <DateRangeOutlinedIcon />, "/u/weekly"),
  // new MenuPath("Transactions", <PaidIcon />, "/u/transactions"),
  new MenuPath("Employees", <GroupIcon />, "/u/employeese"),
  new MenuPath("Inventory", <InventoryIcon />, "/u/inventory"),
  // new MenuPath("Settings", <SettingsSuggestIcon />, "/u/settings"),
  // new MenuPath("Admin", <AdminPanelSettingsIcon />, "/u/admin"),
  new MenuPath("Labs", <BiotechIcon />, "/u/labs"),
  new MenuPath("Order", <ListAltIcon />, "/u/orders"),
  new MenuPath("Orders-upload", <ListAltIcon />, "/u/upload-orders"),
  new MenuPath("Dealers", <ListAltIcon />, "/u/dealers"),
  new MenuPath("Payments", <PaymentIcon />, "/u/payments")
]
