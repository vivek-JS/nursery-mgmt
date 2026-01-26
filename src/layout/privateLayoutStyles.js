import { useTheme } from "@mui/system"

const drawerWidth = 270

// Sidebar palette – light, clean look (no dark gradient)
const sidebar = {
  bg: "#ffffff",
  bgHover: "#f0fdfa",
  border: "#e2e8f0",
  accent: "#0f766e",
  accentLight: "#14b8a6",
  text: "#475569",
  textActive: "#ffffff",
  scrollbar: "rgba(15, 118, 110, 0.2)",
  scrollbarHover: "rgba(15, 118, 110, 0.35)"
}

export const useStyles = () => {
  const theme = useTheme()

  return {
    drawer: {
      position: "absolute",
      width: drawerWidth,
      flexShrink: 0,
      transition: "0.5s",

      "& .MuiDrawer-docked": {
        position: "absolute",
        transition: "0.5s"
      },
      "& .MuiDrawer-paper": {
        transition: "0.5s",
        overflowX: "hidden",
        marginBottom: "66px",
        background: sidebar.bg,
        borderRight: `1px solid ${sidebar.border}`,
        borderTop: `3px solid ${sidebar.accent}`,
        borderRadius: 0,
        width: 65,
        boxSizing: "border-box",
        height: "98vh",
        boxShadow: "2px 0 12px rgba(15, 118, 110, 0.06)",
        "&:hover": {
          width: drawerWidth
        },
        "& .MuiBox-root::-webkit-scrollbar": {
          width: "5px"
        },
        "& .MuiBox-root::-webkit-scrollbar-track": {
          background: "#f1f5f9"
        },
        "& .MuiBox-root::-webkit-scrollbar-thumb": {
          background: sidebar.scrollbar,
          borderRadius: "4px"
        },
        "& .MuiBox-root::-webkit-scrollbar-thumb:hover": {
          background: sidebar.scrollbarHover
        }
      }
    },
    drawerHeader: {
      color: sidebar.text
    },
    divider: {
      borderBottom: `1px solid ${sidebar.border}`,
      margin: "0 12px 16px"
    },
    activeListItem: {
      paddingLeft: 12,
      color: sidebar.textActive,
      backgroundColor: sidebar.accent,
      width: "calc(100% - 16px)",
      margin: "0 8px",
      borderRadius: "10px",
      padding: "14px 16px",
      boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)",
      "&:hover": {
        backgroundColor: sidebar.accentLight,
        boxShadow: "0 4px 12px rgba(15, 118, 110, 0.3)"
      },
      "& .MuiListItemIcon-root": { color: "inherit" }
    },
    listItem: {
      paddingLeft: 12,
      color: sidebar.text,
      width: "calc(100% - 16px)",
      margin: "0 8px",
      borderRadius: "10px",
      padding: "14px 16px",
      "&:hover": {
        backgroundColor: sidebar.bgHover,
        color: sidebar.accent
      },
      "& .MuiListItemIcon-root": { color: "inherit" }
    },
    listItemText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px"
    },
    logout: {
      color: sidebar.accent,
      fontSize: "14px",
      fontWeight: "600"
    },
    logoutButton: {
      paddingLeft: "12px !important",
      padding: "14px 16px",
      margin: "0 8px",
      borderRadius: "10px",
      color: sidebar.accent,
      "&:hover": {
        backgroundColor: sidebar.bgHover,
        color: sidebar.accentLight
      },
      "& .MuiListItemIcon-root": {
        color: "inherit",
        paddingLeft: "10px"
      }
    }
  }
}
