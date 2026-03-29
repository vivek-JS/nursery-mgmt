import React from "react"
import { MenuPath } from "../core.js"
import HomeIcon from "@mui/icons-material/Home"
import BiotechIcon from "@mui/icons-material/Biotech"
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft"
import AodIcon from "@mui/icons-material/Aod"
import GroupIcon from "@mui/icons-material/Group"
import InventoryIcon from "@mui/icons-material/Inventory"
import ListAltIcon from "@mui/icons-material/ListAlt"
import PaymentIcon from "@mui/icons-material/Payment"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import LinkIcon from "@mui/icons-material/Link"
import GrassIcon from "@mui/icons-material/Grass"
import AssessmentIcon from "@mui/icons-material/Assessment"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import TrendingDownIcon from "@mui/icons-material/TrendingDown"
import TaskIcon from "@mui/icons-material/Task"
import CloudUploadIcon from "@mui/icons-material/CloudUpload"
import DashboardIcon from "@mui/icons-material/Dashboard"
import PhoneIcon from "@mui/icons-material/Phone"
import ParkIcon from "@mui/icons-material/Park"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"

export const DashboardMenus = [
  new MenuPath("Orders", <HomeIcon />, "/u/dashboard"),
  new MenuPath("Stats", <BiotechIcon />, "/u/stats"),
  new MenuPath("Plants and Products", <AlignHorizontalLeftIcon />, "/u/plants"),
  new MenuPath("Sowing Management", <GrassIcon />, "/u/sowing"),
  new MenuPath("Plant Availability", <AssessmentIcon />, "/u/plant-availability"),
  new MenuPath("Sowing Gap Analysis", <TrendingDownIcon />, "/u/sowing-gap-analysis"),
  // new MenuPath("Flow Charts", <AccountTreeIcon />, "/u/flow-charts"),
  new MenuPath("Slots Managment", <BiotechIcon />, "/u/slots"),
  new MenuPath("Hardening", <BiotechIcon />, "/u/hardening"),
  new MenuPath("CMS", <AodIcon />, "/u/cms"),
  new MenuPath("Farmers", <BiotechIcon />, "/u/farmers"),
  new MenuPath("Call Assignment", <PhoneIcon />, "/u/call-assignment"),
  new MenuPath("Primary ops", <GrassIcon />, "/u/primary-mobile", null, ["SUPER_ADMIN", "ADMIN"]),
  new MenuPath("Secondary ops", <ParkIcon />, "/u/secondary-sowing-entry", null, ["SUPER_ADMIN", "ADMIN"]),
  // new MenuPath("Weekly", <DateRangeOutlinedIcon />, "/u/weekly"),
  // new MenuPath("Transactions", <PaidIcon />, "/u/transactions"),
  new MenuPath("Employees", <GroupIcon />, "/u/employeese"),
  new MenuPath("Task Manager", <TaskIcon />, "/u/task-manager", null, ["SUPER_ADMIN", "ADMIN"]),
  new MenuPath("Inventory", <InventoryIcon />, "/u/inventory"),
  new MenuPath("Ram Agri Input", <DashboardIcon />, "/u/inventory/ram-agri-sales-dashboard"),
  new MenuPath("Old Sales Analytics", <AssessmentIcon />, "/u/inventory/old-sales-analytics"),
  // new MenuPath("Settings", <SettingsSuggestIcon />, "/u/settings"),
  // new MenuPath("Admin", <AdminPanelSettingsIcon />, "/u/admin"),
  new MenuPath("Labs", <BiotechIcon />, "/u/labs", ["LABORATORY_MANAGER", "SUPER_ADMIN"]),
  new MenuPath("Order Bucketing", <AccountTreeIcon />, "/u/order-bucketing"),
  new MenuPath("Excel Import", <CloudUploadIcon />, "/u/upload-orders"),
  new MenuPath("Dealers", <ListAltIcon />, "/u/dealers"),
  new MenuPath("Accounting Dashboard", <AccountBalanceIcon />, "/u/accountant-dashboard", null, ["ACCOUNTANT", "SUPER_ADMIN"]),
  new MenuPath("WhatsApp Management", <WhatsAppIcon />, "/u/whatsapp", ["SUPER_ADMIN"]),
  new MenuPath("Public Farmer Links", <LinkIcon />, "/u/public-links", ["SUPER_ADMIN"])
  ,
  new MenuPath("कॅशियर पेमेंट", <PaymentIcon />, "/u/mobile/cashier", null, ["CASHIER", "SUPER_ADMIN"])
]
