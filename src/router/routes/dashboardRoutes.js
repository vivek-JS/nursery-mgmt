import React from "react"
import { MenuPath } from "../core.js"
import HomeIcon from "@mui/icons-material/Home"
import BiotechIcon from "@mui/icons-material/Biotech"
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft"
import AodIcon from "@mui/icons-material/Aod"
import GroupIcon from "@mui/icons-material/Group"
import InventoryIcon from "@mui/icons-material/Inventory"
import ListAltIcon from "@mui/icons-material/ListAlt"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import LinkIcon from "@mui/icons-material/Link"
import GrassIcon from "@mui/icons-material/Grass"
import AssessmentIcon from "@mui/icons-material/Assessment"
import PriceChangeIcon from "@mui/icons-material/PriceChange"
import AccountTreeIcon from "@mui/icons-material/AccountTree"
import EventNoteIcon from "@mui/icons-material/EventNote"
import TrendingDownIcon from "@mui/icons-material/TrendingDown"
import DashboardIcon from "@mui/icons-material/Dashboard"
import ParkIcon from "@mui/icons-material/Park"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"
import LocalShippingIcon from "@mui/icons-material/LocalShipping"
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus"
import BackupIcon from "@mui/icons-material/Backup"
import PercentIcon from "@mui/icons-material/Percent"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import QueryStatsIcon from "@mui/icons-material/QueryStats"
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined"
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart"
import UndoIcon from "@mui/icons-material/Undo"
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn"
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet"
import WarehouseIcon from "@mui/icons-material/Warehouse"
import InsightsIcon from "@mui/icons-material/Insights"

export const DashboardMenus = [
  new MenuPath("Orders", <HomeIcon />, "/u/dashboard"),
  new MenuPath("Accounting Dashboard", <AccountBalanceIcon />, "/u/accountant-dashboard", null, [
    "ACCOUNTANT",
    "SUPER_ADMIN",
    "RAM_AGRI_MASTER",
  ]),
  new MenuPath("Plant Pipeline", <AccountTreeIcon />, "/u/plant-pipeline", null, [
    "ADMIN",
    "SUPER_ADMIN",
    "SUPERADMIN"
  ]),
  new MenuPath("Admin Stats", <QueryStatsIcon />, "/u/admin-stats", null, ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN", "OFFICEADMIN"]),
  new MenuPath("CMS", <AodIcon />, "/u/cms"),
  new MenuPath(
    "Commission Management",
    <PercentIcon />,
    "/u/commission",
    null,
    ["ACCOUNTANT", "SUPER_ADMIN", "SUPERADMIN"]
  ),
  new MenuPath(
    "Reward Programs",
    <EmojiEventsIcon />,
    "/u/rewards-admin",
    null,
    ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN"]
  ),
  new MenuPath(
    "My Rewards",
    <EmojiEventsIcon />,
    "/u/my-rewards",
    null,
    ["DEALER", "SALES", "RAM_AGRI_SALES", "RAM_AGRI_SALES_MANAGER", "RAM_AGRI_SALES_OFFICE_MANAGER", "AGRI_INPUT_DEALER"]
  ),
  new MenuPath("Database Backup", <BackupIcon />, "/u/database-backup", null, ["SUPER_ADMIN", "SUPERADMIN"]),
  new MenuPath("Dealers", <ListAltIcon />, "/u/dealers"),
  new MenuPath(
    "Dispatched Vehicles",
    <DirectionsBusIcon />,
    "/u/dispatched-vehicles",
    null,
    ["DISPATCH_MANAGER", "ADMIN", "SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN", "OFFICEADMIN"]
  ),
  new MenuPath(
    "Dispatch Orders",
    <LocalShippingIcon />,
    "/u/dispatch-orders",
    null,
    ["DISPATCH_MANAGER", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"]
  ),
  new MenuPath(
    "Delivery Report",
    <LocalShippingOutlinedIcon />,
    "/u/delivery-report",
    null,
    ["DISPATCH_MANAGER", "ADMIN", "SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN", "OFFICEADMIN"]
  ),
  new MenuPath("Employees", <GroupIcon />, "/u/employeese"),
  new MenuPath("Attendance", <EventNoteIcon />, "/u/attendance", null, [
    "SUPER_ADMIN",
    "SUPERADMIN",
    "OFFICE_ADMIN",
    "OFFICEADMIN",
  ]),
  new MenuPath("Farmers", <BiotechIcon />, "/u/farmers"),
  new MenuPath(
    "Fleet",
    <DirectionsBusIcon />,
    "/u/fleet",
    null,
    ["DISPATCH_MANAGER", "ADMIN", "SUPER_ADMIN", "SUPERADMIN", "ACCOUNTANT"]
  ),
  new MenuPath("Hardening", <BiotechIcon />, "/u/hardening"),
  new MenuPath("Inventory", <InventoryIcon />, "/u/inventory"),
  new MenuPath("Labs", <BiotechIcon />, "/u/labs", ["LABORATORY_MANAGER", "SUPER_ADMIN"]),
  new MenuPath("Old Sales Analytics", <AssessmentIcon />, "/u/inventory/old-sales-analytics"),
  new MenuPath("Order Bucketing", <AccountTreeIcon />, "/u/order-bucketing"),
  new MenuPath("Plants and Products", <AlignHorizontalLeftIcon />, "/u/plants"),
  new MenuPath("Primary ops", <GrassIcon />, "/u/primary-mobile", null, ["SUPER_ADMIN", "ADMIN"]),
  new MenuPath("Public Farmer Links", <LinkIcon />, "/u/public-links", null, ["SUPER_ADMIN", "SUPERADMIN"]),
  new MenuPath("Rate Approvals", <PriceChangeIcon />, "/u/rate-approvals", null, ["SUPER_ADMIN", "SUPERADMIN"]),
  new MenuPath("Ram Agri Input", <DashboardIcon />, "/u/ram-agri-input"),
  new MenuPath("Stock", <WarehouseIcon />, "/u/inventory/ram-agri-stock"),
  new MenuPath("Sell Returns", <UndoIcon />, "/u/inventory/agri-sales-returns"),
  new MenuPath("Purchase Returns", <AssignmentReturnIcon />, "/u/inventory/purchase-returns"),
  new MenuPath("Money Ledger", <AccountBalanceWalletIcon />, "/u/inventory/ledger"),
  new MenuPath("Secondary ops", <ParkIcon />, "/u/secondary-sowing-entry", null, ["SUPER_ADMIN", "ADMIN"]),
  new MenuPath(
    "Secondary Dispatch Monitor",
    <MonitorHeartIcon />,
    "/u/secondary-dispatch-monitor",
    null,
    ["SUPER_ADMIN", "SUPERADMIN", "ADMIN", "DISPATCH_MANAGER", "OFFICE_ADMIN", "OFFICEADMIN"]
  ),
  new MenuPath("Slots Managment", <BiotechIcon />, "/u/slots"),
  new MenuPath("Lagwad Analysis", <InsightsIcon />, "/u/lagwad-analysis"),
  new MenuPath("Sowing Gap Analysis", <TrendingDownIcon />, "/u/sowing-gap-analysis"),
  new MenuPath(
    "Direct Sow Portal",
    <EventNoteIcon />,
    "/u/admin-direct-sow",
    null,
    ["SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN", "OFFICEADMIN"]
  ),
  new MenuPath("Sowing Management", <GrassIcon />, "/u/sowing"),
  new MenuPath("WhatsApp Management", <WhatsAppIcon />, "/u/whatsapp", null, ["SUPER_ADMIN", "SUPERADMIN"])
]
