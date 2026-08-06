import React from "react"
import Lottie from "lottie-react"
import AnimationFile from "assets/animations/default-loader.json"
import styles from "./Loader.module.css"
import { useSelector } from "react-redux"
import { Typography } from "@mui/material"

function AppLoader({ visible: isVisible = false }) {
  const { visible, message } = useSelector((store) => store.loader)
  const showLoader = Boolean(visible || isVisible)

  if (!showLoader) return null

  return (
    <div className={styles.loader}>
      <Lottie animationData={AnimationFile} loop={true} />
      {Boolean(message) && <Typography>{message}</Typography>}
    </div>
  )
}

export default AppLoader
