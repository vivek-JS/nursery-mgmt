import { useTheme } from "@mui/system"

export const useStyles = () => {
  const theme = useTheme()
  return {
    imgLogo: {
      height: 60,
      width: 60
    }
  }
}
