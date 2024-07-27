import ScaleLoader from "react-spinners/ScaleLoader"
import React from "react"
const PageLoader = () => {
  return (
    <ScaleLoader
      style={{ position: "absolute", top: "50%", right: "50%" }}
      color="rgba(0, 15, 231, 1)"
    />
  )
}
export default PageLoader
