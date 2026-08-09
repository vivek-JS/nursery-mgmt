import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
  IconButton,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { Logout } from "@mui/icons-material";
import { useUserRole, useIsDispatchManager, useUserData } from "utils/roleUtils";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import { Loader } from "redux/dispatcher/Loader";
import { Toast } from "helpers/toasts/toastHelper";
import {
  isWhatsappMessagingDisabled,
  setWhatsappMessagingDisabled,
} from "utils/whatsappMessagingPref";
import RemainingDispatchQueue from "./components/RemainingDispatchQueue";
import SecondaryAbsentQuickComplete from "./components/SecondaryAbsentQuickComplete";

const DispatchedListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const userRole = useUserRole();
  const userData = useUserData();
  const isDispatchManager = useIsDispatchManager();
  const logoutModel = useLogoutModel();

  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN";
  const hasAccess = isDispatchManager || isSuperAdmin || isAdmin;

  const [whatsappMessagingEnabled, setWhatsappMessagingEnabled] = React.useState(
    () => !isWhatsappMessagingDisabled()
  );
  const [pageTab, setPageTab] = React.useState("matrix");

  useEffect(() => {
    if (userData === undefined || userRole === undefined) return;
    if (!hasAccess) {
      Toast.error("Access denied. This page is only for DISPATCH_MANAGER, ADMIN, or SUPER_ADMIN.");
      navigate("/u/dashboard", { replace: true });
    }
  }, [userData, userRole, hasAccess, navigate]);

  const handleLogout = async () => {
    Loader.show();
    await logoutModel.logout();
    Loader.hide();
    navigate("/auth/login", { replace: true });
  };

  if (userData === undefined || userRole === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        bgcolor: "#e8efe9",
      }}
    >
      <AppBar
        position="sticky"
        sx={{
          flexShrink: 0,
          background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <Toolbar sx={{ px: isMobile ? 1.25 : 2, minHeight: 56 }}>
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              Dispatch Orders
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={whatsappMessagingEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setWhatsappMessagingEnabled(on);
                    setWhatsappMessagingDisabled(!on);
                  }}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "rgba(255,255,255,0.5)",
                    },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.95)",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    maxWidth: 72,
                    lineHeight: 1.1,
                  }}
                >
                  WA msgs
                </Typography>
              }
              sx={{ mr: 0.5, alignItems: "center", m: 0 }}
            />
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{
                ml: 1,
                p: 1,
                borderRadius: 1.5,
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.15)",
                  transform: "scale(1.05)",
                },
              }}
              title="Logout"
            >
              <Logout sx={{ fontSize: "1.5rem" }} />
            </IconButton>
          </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          px: { xs: 0.5, sm: 1 },
          py: { xs: 0.75, sm: 1 },
          pb: isMobile ? 9 : 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ToggleButtonGroup
          exclusive
          value={pageTab}
          onChange={(_, v) => v && setPageTab(v)}
          size="small"
          sx={{ mb: 1, alignSelf: "flex-start", bgcolor: "rgba(255,255,255,0.9)", borderRadius: 2 }}
        >
          <ToggleButton value="matrix" sx={{ textTransform: "none", fontWeight: 700, px: 2 }}>
            Pending by variety
          </ToggleButton>
          <ToggleButton value="quick" sx={{ textTransform: "none", fontWeight: 700, px: 2 }}>
            Quick complete
          </ToggleButton>
        </ToggleButtonGroup>
        {pageTab === "matrix" ? <RemainingDispatchQueue /> : <SecondaryAbsentQuickComplete />}
      </Box>
    </Box>
  );
};

export default DispatchedListPage;
