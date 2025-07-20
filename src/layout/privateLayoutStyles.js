import { useTheme } from "@mui/system"

const drawerWidth = 270

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
        background: theme.palette.background.secondary,
        borderRadius: "5px",
        width: 65,
        boxSizing: "border-box",
        height: "98vh",
        "&:hover": {
          width: drawerWidth
        },
        // Custom scrollbar styling
        "& .MuiBox-root::-webkit-scrollbar": {
          width: "4px"
        },
        "& .MuiBox-root::-webkit-scrollbar-track": {
          background: "transparent"
        },
        "& .MuiBox-root::-webkit-scrollbar-thumb": {
          background: "rgba(255, 255, 255, 0.2)",
          borderRadius: "2px"
        },
        "& .MuiBox-root::-webkit-scrollbar-thumb:hover": {
          background: "rgba(255, 255, 255, 0.3)"
        }
      }
    },
    drawerHeader: {
      color: theme.palette.text.main
    },
    divider: {
      border: `1px solid rgba(255, 255, 255, 0.1)`,
      marginBottom: "21px"
    },
    activeListItem: {
      paddingLeft: 12,
      color: theme.palette.text.white,
      backgroundColor: theme.palette.primary.main,
      width: "90%",
      margin: "auto",
      borderRadius: "5px",
      padding: "16px",
      "&:hover": {
        backgroundColor: theme.palette.secondary.main
      }
    },
    listItem: {
      paddingLeft: 12,
      color: theme.palette.text.main,
      width: "90%",
      margin: "auto",
      borderRadius: "5px",
      padding: "16px"
    },
    listItemText: {
      fontFamily: theme.typography.fontFamily,
      fontSize: "14px",
      fontWeight: "400",
      lineHeight: "16px"
    },
    icon: {
      color: theme.palette.text.main
    },
    iconActive: {
      color: theme.palette.text.white
    },
    logout: {
      color: theme.palette.secondary.main,
      fontSize: "14px",
      fontWeight: "400"
    }
  }
}
