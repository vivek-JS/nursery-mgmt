import React from "react"
import { Box, CircularProgress, Typography } from "@mui/material"
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural"
import { KIOSK_THEME } from "./kioskTheme"

export default function KioskCameraView({
  videoRef,
  cameraReady,
  cameraError,
  hint = "Position your face inside the oval",
  variant = "face",
}) {
  const isBeard = variant === "beard"

  return (
    <Box>
      <Typography variant="overline" sx={{ color: KIOSK_THEME.slate[600], letterSpacing: 1.2, fontWeight: 600 }}>
        {isBeard ? "Beard / chin capture" : "Live camera"}
      </Typography>
      <Box
        sx={{
          position: "relative",
          mt: 1,
          bgcolor: KIOSK_THEME.slate[900],
          borderRadius: 3,
          overflow: "hidden",
          aspectRatio: "4/3",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
        {!cameraReady && !cameraError && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <CircularProgress sx={{ color: "#fff" }} size={36} />
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
              Starting camera…
            </Typography>
          </Box>
        )}
        {/* Face guide overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            sx={{
              width: isBeard ? "55%" : "68%",
              height: isBeard ? "42%" : "72%",
              border: "3px dashed",
              borderColor: isBeard ? KIOSK_THEME.warning : "rgba(20, 184, 166, 0.85)",
              borderRadius: isBeard ? "40% 40% 50% 50%" : "50%",
              boxShadow: "inset 0 0 0 9999px rgba(15, 23, 42, 0.35)",
            }}
          />
        </Box>
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            py: 1.25,
            px: 2,
            background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <FaceRetouchingNaturalIcon sx={{ color: KIOSK_THEME.teal[500], fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: "#fff", fontWeight: 500 }}>
            {hint}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
