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

export const DashboardMenus = [
  new MenuPath("Accounting Dashboard", <AccountBalanceIcon />, "/u/accountant-dashboard", null, ["ACCOUNTANT", "SUPER_ADMIN"]),
  new MenuPath("Admin Stats", <QueryStatsIcon />, "/u/admin-stats", null, ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"]),
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
    "Dispatch Orders",
    <LocalShippingIcon />,
    "/u/dispatch-orders",
    null,
    ["DISPATCH_MANAGER", "ADMIN", "SUPER_ADMIN", "SUPERADMIN"]
  ),
  new MenuPath("Employees", <GroupIcon />, "/u/employeese"),
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
  new MenuPath("Orders", <HomeIcon />, "/u/dashboard"),
  new MenuPath("Plants and Products", <AlignHorizontalLeftIcon />, "/u/plants"),
  new MenuPath("Primary ops", <GrassIcon />, "/u/primary-mobile", null, ["SUPER_ADMIN", "ADMIN"]),
  new MenuPath("Public Farmer Links", <LinkIcon />, "/u/public-links", null, ["SUPER_ADMIN", "SUPERADMIN"]),
  new MenuPath("Rate Approvals", <PriceChangeIcon />, "/u/rate-approvals", null, ["SUPER_ADMIN", "SUPERADMIN"]),
  new MenuPath("Ram Agri Input", <DashboardIcon />, "/u/inventory/ram-agri-sales-dashboard"),
  new MenuPath("Secondary ops", <ParkIcon />, "/u/secondary-sowing-entry", null, ["SUPER_ADMIN", "ADMIN"]),
  new MenuPath("Slots Managment", <BiotechIcon />, "/u/slots"),
  new MenuPath("Sowing Gap Analysis", <TrendingDownIcon />, "/u/sowing-gap-analysis"),
  new MenuPath("Sowing Management", <GrassIcon />, "/u/sowing"),
  new MenuPath("WhatsApp Management", <WhatsAppIcon />, "/u/whatsapp", null, ["SUPER_ADMIN", "SUPERADMIN"])
]
