import * as React from "react"
import { useEffect, useRef } from "react"
import { styled } from "@mui/material/styles"
import {
  Box,
  Drawer,
  List,
  Typography,
  ListItemIcon,
  Divider,
  ListItemText,
  ListItemButton
} from "@mui/material"
import { DashboardMenus } from "router/routes/dashboardRoutes"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import LogoutIcon from "@mui/icons-material/Logout"
import { usePrivateLayoutController } from "./privateLayout.controller"
import { useStyles } from "layout/privateLayoutStyles"
import { useSelector } from "react-redux"
import PasswordChangeModal from "components/Modals/PasswordChangeModal"
import MotivationalQuoteModal from "components/Modals/MotivationalQuoteModal"
import DailyNoteFab from "components/dailyNote/DailyNoteFab"
import { useUserRole } from "utils/roleUtils"
import { useWorkspace } from "workspace/WorkspaceContext"
import AgriModeChrome from "workspace/AgriModeChrome"
import WorkspaceTopBar from "workspace/WorkspaceTopBar"
import {
  ACCOUNTING_PATH,
  AGRI_HUB_PATH,
  AGRI_HOME_PATH,
  canSeeAgriAccounting,
  isAgriLockedRole,
  isAgriPathAllowed,
  isAgriInventoryPathBlocked,
  isRamAgriInputAdmin,
  isRamAgriMaster,
} from "workspace/agriAccess"
const drawerWidth = 65

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    // padding: theme.spacing(3),
    paddingRight: "unset",
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    padding: "24px 0px",
    marginLeft: `${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen
      })
    })
  })
)

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  height: "65px",
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "center"
}))

export default function PrivateLayout(props) {
  // useEffect(() => {
  //   const source = new EventSource(`${process.env.REACT_APP_BASE_URL}api/v2/sse/init`)

  //   source.addEventListener("open", () => {})
  //   source.onmessage = (event) => {
  //     const appointment = JSON.parse(event.data)
  //     if (appointment?.appointmentStatus === 2 || appointment?.appointmentStatus === 3)
  //       PatientDispatcher.checkInActive(appointment)
  //   }
  //   source.addEventListener("post", (e) => {
  //     const data = JSON.parse(e.data)
  //     PatientDispatcher.checkInActive(data[0])
  //     //   setDonation(data)
  //   })

  //   return () => {
  //     //source.close()
  //   }
  // }, [])
  const styles = useStyles()
  const location = useLocation()
  const navigate = useNavigate()

  const userType = useSelector((state) => state?.userData?.userData?.jobTitle)
  const userRole = useUserRole()
  const userData = useSelector((state) => state?.userData?.userData)
  const primaryRedirectRef = useRef(false)
  const secondaryRedirectRef = useRef(false)
  const ramAgriSalesManagerRedirectRef = useRef(false)
  const agriLockedRedirectRef = useRef(false)
  const agriModeRedirectRef = useRef(false)
  const accountantRedirectRef = useRef(false)
  const cashierRedirectRef = useRef(false)
  const lastPathRef = useRef(location.pathname)
  const { isAgriMode } = useWorkspace()
  const agriLocked = isAgriLockedRole(userData)
  
  console.log("User Type:", userType, "User Role:", userRole)
  
  // Check if user is PRIMARY employee
  const isPrimaryEmployee = userType && (userType.toUpperCase() === "PRIMARY")
  const isSecondaryEmployee = userType && (userType.toUpperCase() === "SECONDARY")
  const isSuperAdmin =
    userData?.jobTitle === "SUPER_ADMIN" ||
    userData?.jobTitle === "SUPERADMIN" ||
    userData?.role === "SUPER_ADMIN" ||
    userData?.role === "SUPERADMIN"
  const isAdmin =
    userData?.jobTitle === "ADMIN" ||
    userData?.role === "ADMIN" ||
    isSuperAdmin
  const jtUpper = String(userData?.jobTitle || "").toUpperCase().trim()
  const roleUpper = String(userRole || "").toUpperCase().trim()
  // Ram Agri programme leads: restricted nav like sales manager (Dashboard, Ram Agri inventory only)
  const isRamAgriSalesManager =
    jtUpper === "RAM_AGRI_SALES_MANAGER" ||
    roleUpper === "RAM_AGRI_SALES_MANAGER" ||
    jtUpper === "RAM_AGRI_SALES_OFFICE_MANAGER" ||
    roleUpper === "RAM_AGRI_SALES_OFFICE_MANAGER"
  const isCashier = userType === "CASHIER" || userRole === "CASHIER" || userData?.jobTitle === "CASHIER"

  // Reset redirect flags when path changes (user navigated to a different route)
  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      primaryRedirectRef.current = false
      secondaryRedirectRef.current = false
      ramAgriSalesManagerRedirectRef.current = false
      agriLockedRedirectRef.current = false
      agriModeRedirectRef.current = false
      accountantRedirectRef.current = false
      cashierRedirectRef.current = false
      lastPathRef.current = location.pathname
    }
  }, [location.pathname])
  
  // PRIMARY users can ONLY access /u/primary-sowing-entry route
  // Redirect them immediately if they try to access any other route
  useEffect(() => {
    // Only run redirect if user data is loaded (to prevent infinite loops)
    if (!userData) return
    
    // Prevent multiple redirects for the same path
    if (primaryRedirectRef.current) return
    
    if (isPrimaryEmployee && !isSuperAdmin && !isAdmin) {
      const currentPath = location.pathname
      // With BrowserRouter, pathname is the actual route path
      const isPrimarySowingRoute = currentPath === "/u/primary-sowing-entry" || currentPath.includes("/u/primary-sowing-entry")
      
      if (!isPrimarySowingRoute) {
        // Redirect PRIMARY users to primary sowing entry page
        console.log(`[PrivateLayout] PRIMARY user accessing ${currentPath}, redirecting to /u/primary-sowing-entry`)
        primaryRedirectRef.current = true
        navigate("/u/primary-sowing-entry", { replace: true })
      }
    }
  }, [isPrimaryEmployee, isSuperAdmin, isAdmin, location.pathname, navigate, userData])

  // SECONDARY users land on /u/secondary-sowing-entry (parallel to /u/primary-sowing-entry); /u/secondary-mobile is an alias
  useEffect(() => {
    if (!userData) return
    if (secondaryRedirectRef.current) return
    if (isSecondaryEmployee && !isSuperAdmin && !isAdmin) {
      const currentPath = location.pathname
      const isSecondaryAllowedRoute =
        currentPath === "/u/secondary-sowing-entry" ||
        currentPath.includes("/u/secondary-sowing-entry") ||
        currentPath === "/u/secondary-mobile" ||
        currentPath.includes("/u/secondary-mobile")
      if (!isSecondaryAllowedRoute) {
        console.log(
          `[PrivateLayout] SECONDARY user accessing ${currentPath}, redirecting to /u/secondary-sowing-entry`
        )
        secondaryRedirectRef.current = true
        navigate("/u/secondary-sowing-entry", { replace: true })
      }
    }
  }, [isSecondaryEmployee, isSuperAdmin, isAdmin, location.pathname, navigate, userData])

  // RAM_AGRI_SALES_MANAGER / RAM_AGRI_SALES_OFFICE_MANAGER can ONLY access: Dashboard, Ram Agri Input hub/dashboard, Inventory, Ram Agri Input Order, Ram Agri Inputs Master
  useEffect(() => {
    if (!userData) return
    if (ramAgriSalesManagerRedirectRef.current) return
    if (!isRamAgriSalesManager || isSuperAdmin || isAdmin) return
    const p = location.pathname
    const allowed =
      p === "/u/dashboard" ||
      p === "/u/inventory" ||
      p.startsWith(AGRI_HUB_PATH) ||
      p.startsWith("/u/inventory/ram-agri-sales-dashboard") ||
      p.startsWith("/u/inventory/ram-agri-input-order") ||
      p.startsWith("/u/inventory/ram-agri-inputs-master")
    if (!allowed) {
      ramAgriSalesManagerRedirectRef.current = true
      navigate(AGRI_HOME_PATH, { replace: true })
    }
  }, [isRamAgriSalesManager, isSuperAdmin, isAdmin, location.pathname, navigate, userData])

  // RAM_AGRI_MASTER / RAM_AGRI_INPUT_ADMIN: agri paths only (+ Master may use agri Accounting)
  useEffect(() => {
    if (!userData) return
    if (agriLockedRedirectRef.current) return
    if (!agriLocked || isSuperAdmin) return
    const p = location.pathname
    const master = isRamAgriMaster(userData)
    if (p.startsWith(ACCOUNTING_PATH) && !master) {
      agriLockedRedirectRef.current = true
      navigate(AGRI_HOME_PATH, { replace: true })
      return
    }
    const adminOnly = isRamAgriInputAdmin(userData) && !master
    if (adminOnly && p.startsWith("/u/inventory/ram-agri-inputs-master")) {
      agriLockedRedirectRef.current = true
      navigate(AGRI_HOME_PATH, { replace: true })
      return
    }
    if (isAgriInventoryPathBlocked(p) || !isAgriPathAllowed(p)) {
      agriLockedRedirectRef.current = true
      navigate(AGRI_HOME_PATH, { replace: true })
    }
  }, [agriLocked, isSuperAdmin, location.pathname, navigate, userData])

  // Agri workspace mode: agri routes + agri accounting; block GRN/suppliers/etc.
  useEffect(() => {
    if (!userData) return
    if (agriModeRedirectRef.current) return
    if (!isAgriMode || agriLocked) return
    const p = location.pathname
    if (isAgriInventoryPathBlocked(p) || !isAgriPathAllowed(p)) {
      agriModeRedirectRef.current = true
      navigate(AGRI_HOME_PATH, { replace: true })
    }
  }, [isAgriMode, agriLocked, location.pathname, navigate, userData])
 
  // ACCOUNTANT can ONLY access: Orders and Accounting Dashboard (sidebar + route-level)
  useEffect(() => {
    if (!userData) return
    if (accountantRedirectRef.current) return
    // Check both role and jobTitle, prioritizing jobTitle
    const isAccountant = userData?.jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
    if (!isAccountant || isSuperAdmin) return

    const p = location.pathname
    // Restrict ACCOUNTANT to Orders (dashboard) and Accounting Dashboard only
    const allowed =
      p === "/u/dashboard" ||
      p === "/u/accountant-dashboard" ||
      p.startsWith("/u/accountant-dashboard/")

    if (!allowed) {
      console.log(`[PrivateLayout] ACCOUNTANT user accessing ${p}, redirecting to /u/dashboard`)
      accountantRedirectRef.current = true
      navigate("/u/dashboard", { replace: true })
    }
  }, [userRole, isSuperAdmin, location.pathname, navigate, userData])

  // CASHIER can only access cashier route
  useEffect(() => {
    if (!userData) return
    if (cashierRedirectRef.current) return
    if (!isCashier || isSuperAdmin || isAdmin) return
    const p = location.pathname
    const allowed = p === "/u/cashier" || p.startsWith("/u/cashier/")
    if (!allowed) {
      cashierRedirectRef.current = true
      navigate("/u/cashier", { replace: true })
    }
  }, [isCashier, isSuperAdmin, isAdmin, location.pathname, navigate, userData])

  // OFFICEADMIN / OFFICE_ADMIN: restrict sidebar & routes to a subset of menus
  useEffect(() => {
    if (!userData) return
    // jobTitle or role may indicate OFFICEADMIN or OFFICE_ADMIN
    const isOfficeAdmin = userData?.jobTitle === "OFFICEADMIN" || userRole === "OFFICEADMIN" || userData?.jobTitle === "OFFICE_ADMIN" || userRole === "OFFICE_ADMIN"
    if (!isOfficeAdmin || isSuperAdmin) return

    const p = location.pathname
    const allowed =
      p === "/u/dashboard" ||
      p === "/u/plants" ||
      p.startsWith("/u/plants/") ||
      p === "/u/sowing" ||
      p.startsWith("/u/sowing/") ||
      p === "/u/sowing-gap-analysis" ||
      p.startsWith("/u/sowing-gap-analysis/") ||
      p === "/u/slots" ||
      p.startsWith("/u/slots/") ||
      p === "/u/admin-stats" ||
      p.startsWith("/u/admin-stats/") ||
      p === "/u/cms" ||
      p.startsWith("/u/cms/") ||
      p === "/u/employeese" ||
      p.startsWith("/u/employeese/") ||
      p === "/u/attendance" ||
      p.startsWith("/u/attendance/") ||
      p === "/u/inventory" ||
      p.startsWith("/u/inventory") ||
      p === "/u/dealers" ||
      p.startsWith("/u/dealers/") ||
      p === "/u/farmers" ||
      p.startsWith("/u/farmers/") ||
      p === "/u/dispatched-vehicles" ||
      p.startsWith("/u/dispatched-vehicles/") ||
      p === "/u/delivery-report" ||
      p.startsWith("/u/delivery-report/") ||
      p === "/u/admin-direct-sow" ||
      p.startsWith("/u/admin-direct-sow/")

    if (!allowed) {
      console.log(`[PrivateLayout] OFFICEADMIN user accessing ${p}, redirecting to /u/dashboard`)
      navigate("/u/dashboard", { replace: true })
    }
  }, [userRole, isSuperAdmin, location.pathname, navigate, userData])

  // Hide sidebar for primary sowing entry, primary/secondary mobile ops, cashier
  // With BrowserRouter, pathname is the actual route path
  const hideSidebar =
    isCashier ||
    location.pathname === "/u/primary-sowing-entry" ||
    location.pathname === "/u/primary-mobile" ||
    location.pathname === "/u/secondary-sowing-entry" ||
    location.pathname === "/u/secondary-mobile"
  
  const { 
    handleLogout, 
    activeMenu,
    showPasswordModal,
    showQuoteModal,
    quote,
    handlePasswordChangeSuccess,
    handlePasswordModalClose,
    handleQuoteModalClose,
    userProfile
  } = usePrivateLayoutController(props)

  // Function to check if user has access to a menu item
  const hasMenuAccess = (menuItem) => {
    const userRoles = [userData?.jobTitle, userData?.role].filter(Boolean)

    // SUPER_ADMIN has access to everything (check both jobTitle and role)
    if (
      userRoles.some((r) => r === "SUPER_ADMIN" || r === "SUPERADMIN")
    ) {
      return true
    }
    
    // ACCOUNTANT can only see: Orders and Accounting Dashboard tabs
    // Check both role and jobTitle, prioritizing jobTitle
    const isAccountant = userData?.jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
    if (isAccountant) {
      // ACCOUNTANT should only see Orders (dashboard) and Accounting Dashboard in sidebar
      const allowedTitles = ["Orders", "Accounting Dashboard"]
      const allowedRoutes = ["/u/dashboard", "/u/accountant-dashboard"]
      const hasAccess = allowedTitles.includes(menuItem.title) || allowedRoutes.includes(menuItem.route)
      return hasAccess
    }

    if (isCashier) {
      const allowedTitles = ["कॅशियर पेमेंट"]
      const allowedRoutes = ["/u/cashier"]
      return allowedTitles.includes(menuItem.title) || allowedRoutes.includes(menuItem.route)
    }

    // OFFICEADMIN / OFFICE_ADMIN: sidebar order follows DashboardMenus (alphabetical)
    const isOfficeAdmin = userData?.jobTitle === "OFFICEADMIN" || userRole === "OFFICEADMIN" || userData?.jobTitle === "OFFICE_ADMIN" || userRole === "OFFICE_ADMIN"
    if (isOfficeAdmin) {
      const allowedTitles = [
        "Orders",
        "Plants and Products",
        "Sowing Management",
        "Sowing Gap Analysis",
        "Direct Sow Portal",
        "Slots Managment",
        "Admin Stats",
        "Delivery Report",
        "Dispatched Vehicles",
        "CMS",
        "Farmers",
        "Employees",
        "Attendance",
        "Inventory",
        "Ram Agri Input",
        "Dealers",
        "Reward Programs"
      ]
      const allowedRoutes = [
        "/u/dashboard",
        "/u/plants",
        "/u/sowing",
        "/u/sowing-gap-analysis",
        "/u/admin-direct-sow",
        "/u/slots",
        "/u/admin-stats",
        "/u/delivery-report",
        "/u/dispatched-vehicles",
        "/u/cms",
        "/u/farmers",
        "/u/employeese",
        "/u/attendance",
        "/u/inventory",
        "/u/inventory/ram-agri-sales-dashboard",
        AGRI_HUB_PATH,
        "/u/dealers",
        "/u/rewards-admin"
      ]
      const hasAccess = allowedTitles.includes(menuItem.title) || allowedRoutes.includes(menuItem.route)
      return hasAccess
    }

    if (agriLocked) {
      const allowedTitles = ["Ram Agri Input", "Inventory", "Orders"]
      const allowedRoutes = [
        AGRI_HUB_PATH,
        "/u/inventory",
        "/u/dashboard",
        "/u/inventory/ram-agri-sales-dashboard",
        "/u/inventory/ram-agri-input-order/new",
      ]
      if (isRamAgriMaster(userData)) {
        allowedTitles.push("Accounting Dashboard")
        allowedRoutes.push(ACCOUNTING_PATH, "/u/inventory/ram-agri-inputs-master")
      }
      return (
        allowedTitles.includes(menuItem.title) ||
        allowedRoutes.includes(menuItem.route)
      )
    }
    
    // If no allowedRoles specified, allow access (backward compatibility)
    if (!menuItem.allowedRoles) {
      return true
    }
    
    // Check if user's role or jobTitle is in the allowed roles
    const hasAccess = menuItem.allowedRoles.some((r) => userRoles.includes(r))

    return hasAccess
  }

  return (
    <Box sx={{ display: "flex" }}>
      {!hideSidebar && (
      <Drawer open={false} sx={styles.drawer} variant="permanent" anchor="left">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden"
          }}>
          {/* Header Section */}
          <Box sx={{ flexShrink: 0 }}>
            <DrawerHeader>
              <ListItemButton
                style={{ padding: 10 }}
                sx={{ paddingLeft: "10px !important" }}></ListItemButton>
            </DrawerHeader>
            <Divider sx={styles.divider} />
          </Box>

          {/* Menu Items Section - Scrollable */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              overflowX: "hidden"
            }}>
            <List>
              {DashboardMenus.filter((item) => {
                // Debug logging for WhatsApp Management
                if (item.title === "WhatsApp Management") {
                  console.log("🔍 Filtering WhatsApp Management:", {
                    title: item.title,
                    allowedRoles: item.allowedRoles,
                    userRole: userRole,
                    userType: userType,
                    hasMenuAccessResult: hasMenuAccess(item)
                  })
                }
                
                // Legacy filter for LABORATORY_MANAGER (keeping for backward compatibility)
                if (userType === "LABORATORY_MANAGER" && item.title !== "Labs") {
                  return false
                }
                
                // PRIMARY users should only see menu items that lead to primary-sowing-entry
                // Since PRIMARY users are redirected to primary-sowing-entry, hide all menu items
                if (isPrimaryEmployee && !isSuperAdmin && !isAdmin) {
                  return false
                }

                if (isSecondaryEmployee && !isSuperAdmin && !isAdmin) {
                  return false
                }
                
                // RAM_AGRI_SALES_MANAGER / RAM_AGRI_SALES_OFFICE_MANAGER: only Dashboard, Ram Agri Input + Inventory
                if (isRamAgriSalesManager && !isSuperAdmin && !isAdmin) {
                  return (
                    item.route === "/u/dashboard" ||
                    item.route === AGRI_HUB_PATH ||
                    item.route === "/u/inventory/ram-agri-sales-dashboard" ||
                    item.route === "/u/inventory"
                  )
                }

                // Agri workspace: agri menus + Accounting (Ram Agri org only) for allowed roles
                if (isAgriMode || agriLocked) {
                  const isAccounting =
                    item.title === "Accounting Dashboard" ||
                    item.route === ACCOUNTING_PATH
                  if (isAccounting) {
                    return canSeeAgriAccounting(userData) && hasMenuAccess(item)
                  }
                  const agriMenuOk =
                    item.route === AGRI_HUB_PATH ||
                    item.route === "/u/inventory" ||
                    item.route === "/u/dashboard" ||
                    item.route === "/u/inventory/ram-agri-sales-dashboard" ||
                    item.title === "Ram Agri Input" ||
                    item.title === "Inventory" ||
                    item.title === "Orders"
                  if (!agriMenuOk) return false
                }
                
                // Apply role-based access control
                return hasMenuAccess(item)
              }).map((item, index) => {
                return (
                  <ListItemButton
                    sx={activeMenu(item) ? styles.activeListItem : styles.listItem}
                    key={`${item.alias}-${item.route}-${index}`}
                    onClick={() => navigate(item.route)}>
                    <ListItemIcon sx={{ color: "inherit" }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText>
                      <Typography sx={styles.listItemText}>{item.title}</Typography>
                    </ListItemText>
                  </ListItemButton>
                )
              })}
            </List>
          </Box>

          {/* Logout Section - Fixed at Bottom */}
          <Box sx={{ flexShrink: 0 }}>
            <Divider sx={styles.divider} />
            <List>
              <ListItemButton sx={styles.logoutButton} onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText>
                  <Typography sx={styles.listItemText}>Logout</Typography>
                </ListItemText>
              </ListItemButton>
            </List>
          </Box>
        </Box>
      </Drawer>
      )}
      <Main open={false} sx={hideSidebar ? { marginLeft: 0, padding: 0, minWidth: 0 } : { minWidth: 0 }}>
        <WorkspaceTopBar />
        <AgriModeChrome />
        <Outlet />
      </Main>
      
      {/* Password Change Modal - shown if user hasn't set password */}
      {showPasswordModal && userProfile && (
        <PasswordChangeModal
          open={showPasswordModal}
          onClose={handlePasswordModalClose}
          onSuccess={handlePasswordChangeSuccess}
          loginResponse={{
            isPasswordSet: false,
            forcePasswordReset: true,
            user: userProfile
          }}
        />
      )}

      {/* Motivational Quote Modal - shown once per day */}
      <MotivationalQuoteModal
        open={showQuoteModal}
        onClose={handleQuoteModalClose}
        quote={quote}
      />

      {/* Daily Notes — floating SpeedDial (add / previous / all) */}
      {!showPasswordModal && (
        <DailyNoteFab bottomOffset={hideSidebar ? 96 : 24} />
      )}
    </Box>
  )
}
