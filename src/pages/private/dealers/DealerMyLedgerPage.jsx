import React from "react"
import { Box } from "@mui/material"
import { useSelector } from "react-redux"
import { useIsDealer } from "utils/roleUtils"
import { Navigate } from "react-router-dom"
import DealerWalletLedgerPanel from "./DealerWalletLedgerPanel"

export default function DealerMyLedgerPage() {
  const isDealer = useIsDealer()
  const user = useSelector((state) => state?.userData?.userData)
  const dealerId = user?._id || user?.id

  if (!isDealer) {
    return <Navigate to="/u/dashboard" replace />
  }

  if (!dealerId) {
    return null
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F8FAFC",
        px: { xs: 0, md: 2 },
        py: { xs: 0, md: 2 },
        maxWidth: 1200,
        mx: "auto",
      }}
    >
      <DealerWalletLedgerPanel dealerId={dealerId} dealerName={user?.name} embedded />
    </Box>
  )
}
