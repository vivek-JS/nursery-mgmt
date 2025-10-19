import * as React from "react"
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
import { Outlet } from "react-router-dom"
import LogoutIcon from "@mui/icons-material/Logout"
import { usePrivateLayoutController } from "./privateLayout.controller"
import { useStyles } from "layout/privateLayoutStyles"
import { useSelector } from "react-redux"
import PasswordChangeModal from "components/Modals/PasswordChangeModal"
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

  const userType = useSelector((state) => state?.userData?.userData?.jobTitle)
  console.log(userType)
  const { 
    navigate, 
    handleLogout, 
    activeMenu,
    showPasswordModal,
    handlePasswordChangeSuccess,
    handlePasswordModalClose,
    userProfile
  } = usePrivateLayoutController(props)

  return (
    <Box sx={{ display: "flex" }}>
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

              {/* <Typography sx={styles.drawerHeader} variant="h4">
                <img src={Logo} style={{ height: 30 }}></img>
              </Typography>
              &nbsp; &nbsp;
              <Typography sx={styles.listItemText}>Practease</Typography> */}
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
              {DashboardMenus.filter((item) =>
                userType === "LABORATORY_MANAGER" ? item.title === "Labs" : true
              ).map((item) => {
                return (
                  <ListItemButton
                    sx={activeMenu(item) ? styles.activeListItem : styles.listItem}
                    key={item.alias}
                    onClick={() => navigate(item.route)}>
                    <ListItemIcon sx={activeMenu(item) ? styles.iconActive : styles.icon}>
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
              <ListItemButton
                style={{ paddingLeft: 10 }}
                sx={{ paddingLeft: "10px !important" }}
                onClick={handleLogout}>
                <ListItemIcon sx={{ paddingLeft: 10 }}>
                  <LogoutIcon color="secondary" />
                </ListItemIcon>
                <ListItemText>
                  <Typography sx={styles.listItemText}>Logout</Typography>
                </ListItemText>
              </ListItemButton>
            </List>
          </Box>
        </Box>
      </Drawer>
      <Main open={open}>
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
    </Box>
  )
}
