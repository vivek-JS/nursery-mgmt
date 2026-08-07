import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import FaceRetouchingNaturalIcon from "@mui/icons-material/FaceRetouchingNatural"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import CameraAltIcon from "@mui/icons-material/CameraAlt"
import RefreshIcon from "@mui/icons-material/Refresh"
import {
  fetchEmployees,
  kioskIdentifyFace,
  kioskRegisterFace,
  kioskVerifyAndMark,
} from "./attendanceApi"
import KioskCameraView from "./kiosk/KioskCameraView"
import KioskEmployeeCard from "./kiosk/KioskEmployeeCard"
import KioskStepBar from "./kiosk/KioskStepBar"
import { ATTENDANCE_MODES, KIOSK_THEME, MARK_STEPS } from "./kiosk/kioskTheme"

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",")
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}

export default function KioskAttendancePanel() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [mode, setMode] = useState("mark")
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [facePreview, setFacePreview] = useState("")
  const [beardPreview, setBeardPreview] = useState("")
  const [identified, setIdentified] = useState(null)
  const [markStep, setMarkStep] = useState("face")
  const [successState, setSuccessState] = useState(null)

  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [hasBeard, setHasBeard] = useState(false)
  const [consent, setConsent] = useState(false)
  const [registerFacePreview, setRegisterFacePreview] = useState("")
  const [registerBeardPreview, setRegisterBeardPreview] = useState("")

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError("")
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
    } catch (err) {
      setCameraError(err?.message || "Allow camera access for this site in browser settings.")
    }
  }, [stopCamera])

  useEffect(() => {
    startCamera()
    fetchEmployees({ limit: 500 }).then(setEmployees).catch(() => {})
    return stopCamera
  }, [startCamera, stopCamera])

  function resetMarkFlow() {
    setFacePreview("")
    setBeardPreview("")
    setIdentified(null)
    setMarkStep("face")
    setSuccessState(null)
    setMessage("")
    setError("")
  }

  function resetRegisterFlow() {
    setRegisterFacePreview("")
    setRegisterBeardPreview("")
    setHasBeard(false)
    setConsent(false)
    setMessage("")
    setError("")
  }

  function captureFrame() {
    const video = videoRef.current
    if (!video || !cameraReady) return null
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext("2d").drawImage(video, 0, 0)
    return canvas.toDataURL("image/jpeg", 0.92)
  }

  async function handleMarkCapture() {
    const dataUrl = captureFrame()
    if (!dataUrl) return
    setLoading(true)
    setError("")
    setMessage("")
    setSuccessState(null)

    try {
      if (markStep === "face") {
        setFacePreview(dataUrl)
        const identifyRes = await kioskIdentifyFace(dataUrlToBlob(dataUrl))
        if (!identifyRes?.employee) {
          setError(identifyRes?.message || "Face not recognized.")
          setIdentified(null)
          return
        }
        setIdentified(identifyRes)
        if (identifyRes.requires_beard_capture) {
          setMarkStep("beard")
          setMessage(`${identifyRes.employee.name} identified — capture beard next.`)
        } else {
          await submitMark(dataUrl, null, identifyRes)
        }
      } else {
        setBeardPreview(dataUrl)
        await submitMark(facePreview, dataUrl, identified)
      }
    } catch (err) {
      setError(err?.message || "Capture failed.")
    } finally {
      setLoading(false)
    }
  }

  async function submitMark(faceDataUrl, beardDataUrl, info) {
    setLoading(true)
    try {
      const result = await kioskVerifyAndMark(dataUrlToBlob(faceDataUrl), beardDataUrl ? dataUrlToBlob(beardDataUrl) : null)
      if (result?.requires_beard_capture && !beardDataUrl) {
        setMarkStep("beard")
        setMessage(`${result.employee?.name || info?.employee?.name} — beard photo required.`)
        return
      }
      if (!result?.attendance_type) {
        setError(result?.message || "Could not mark attendance.")
        return
      }
      const modeInfo = ATTENDANCE_MODES[result.attendance_type] || { label: result.attendance_type }
      setSuccessState({ name: result.employee_name, label: `${modeInfo.label} recorded` })
      setMarkStep("done")
      setTimeout(resetMarkFlow, 4500)
    } catch (err) {
      setError(err?.message || "Failed to mark attendance.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterSubmit() {
    if (!selectedEmployee) return setError("Select an employee.")
    if (!registerFacePreview) return setError("Capture face photo first.")
    if (hasBeard && !registerBeardPreview) return setError("Capture beard photo.")
    if (!consent) return setError("Confirm employee consent.")

    setLoading(true)
    setError("")
    try {
      const result = await kioskRegisterFace({
        employeeId: selectedEmployee._id || selectedEmployee.id,
        faceBlob: dataUrlToBlob(registerFacePreview),
        beardBlob: hasBeard ? dataUrlToBlob(registerBeardPreview) : null,
        hasBeard,
        consent: true,
      })
      setMessage(`Face registered for ${result.employee_name || selectedEmployee.name}.`)
      resetRegisterFlow()
      setSelectedEmployee(null)
    } catch (err) {
      setError(err?.message || "Registration failed.")
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = successState ? 2 : markStep === "beard" ? 1 : 0
  const cameraVariant = mode === "mark" && markStep === "beard" ? "beard" : "face"
  const cameraHint =
    markStep === "beard"
      ? "Frame chin and beard inside the oval"
      : "Center face in the oval — good lighting helps"

  return (
    <Box>
      {/* Hero header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${KIOSK_THEME.teal[700]} 0%, ${KIOSK_THEME.teal[900]} 100%)`,
          color: "#fff",
        }}
      >
        <Typography variant="h5" fontWeight={800}>
          Office Face Kiosk
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5, maxWidth: 560 }}>
          Capture face → name appears → auto check-in or check-out. Bearded employees need an extra chin capture.
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={mode}
          onChange={(_, v) => {
            if (!v) return
            setMode(v)
            resetMarkFlow()
            resetRegisterFlow()
          }}
          sx={{ mt: 2, bgcolor: "rgba(255,255,255,0.12)", borderRadius: 2 }}
        >
          <ToggleButton
            value="mark"
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.2) !important",
              "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.22) !important", color: "#fff" },
            }}
          >
            <FaceRetouchingNaturalIcon sx={{ mr: 1, fontSize: 20 }} />
            Mark In / Out
          </ToggleButton>
          <ToggleButton
            value="register"
            sx={{
              color: "#fff",
              borderColor: "rgba(255,255,255,0.2) !important",
              "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.22) !important", color: "#fff" },
            }}
          >
            <PersonAddIcon sx={{ mr: 1, fontSize: 20 }} />
            Register Face
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {cameraError && <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" onClick={startCamera}>Retry</Button>}>{cameraError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {message && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" }, gap: 3 }}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: "1px solid #e2e8f0" }}>
          {mode === "mark" && <KioskStepBar steps={MARK_STEPS} activeIndex={stepIndex} />}
          <KioskCameraView
            videoRef={videoRef}
            cameraReady={cameraReady}
            cameraError={cameraError}
            hint={mode === "register" ? "Capture reference photo" : cameraHint}
            variant={cameraVariant}
          />
          <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!cameraReady || loading}
              startIcon={<CameraAltIcon />}
              onClick={mode === "mark" ? handleMarkCapture : () => {
                const url = captureFrame()
                if (!url) return
                if (hasBeard && registerFacePreview && !registerBeardPreview) setRegisterBeardPreview(url)
                else setRegisterFacePreview(url)
              }}
              sx={{
                py: 1.5,
                fontWeight: 700,
                bgcolor: KIOSK_THEME.teal[600],
                "&:hover": { bgcolor: KIOSK_THEME.teal[700] },
              }}
            >
              {loading
                ? "Processing…"
                : mode === "mark"
                  ? markStep === "beard"
                    ? "Capture Beard & Mark"
                    : "Capture & Identify"
                  : registerFacePreview && hasBeard && !registerBeardPreview
                    ? "Capture Beard"
                    : "Capture Face"}
            </Button>
            {mode === "mark" && (
              <Button variant="outlined" disabled={loading} onClick={resetMarkFlow} sx={{ minWidth: 52 }}>
                <RefreshIcon />
              </Button>
            )}
          </Box>
        </Paper>

        <Box>
          {mode === "mark" && (
            <>
              {successState ? (
                <KioskEmployeeCard success name={successState.name} successLabel={successState.label} />
              ) : (
                <>
                  <KioskEmployeeCard
                    dataUrl={facePreview}
                    name={identified?.employee?.name}
                    employeeCode={identified?.employee?.employee_code ? `ID ${identified.employee.employee_code}` : null}
                    department={identified?.employee?.department}
                    nextType={identified?.next_attendance_type}
                    faceScore={identified?.face_match_score}
                  />
                  {beardPreview && (
                    <Box sx={{ mt: 2 }}>
                      <KioskEmployeeCard dataUrl={beardPreview} subtitle="Beard verification" compact />
                    </Box>
                  )}
                </>
              )}
            </>
          )}

          {mode === "register" && (
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e2e8f0" }}>
              <Autocomplete
                options={employees}
                getOptionLabel={(o) => `${o.name}${o.employeeCode ? ` (${o.employeeCode})` : ""}`}
                value={selectedEmployee}
                onChange={(_, v) => setSelectedEmployee(v)}
                renderInput={(params) => <TextField {...params} label="Employee" size="small" />}
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={<Checkbox checked={hasBeard} onChange={(e) => setHasBeard(e.target.checked)} />}
                label="Has beard (requires chin photo)"
              />
              <FormControlLabel
                control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
                label="Employee consent for face data"
              />
              {registerFacePreview && (
                <Box sx={{ mt: 2 }}>
                  <KioskEmployeeCard
                    dataUrl={registerFacePreview}
                    name={selectedEmployee?.name}
                    subtitle="Face reference"
                    compact
                  />
                </Box>
              )}
              {registerBeardPreview && (
                <Box sx={{ mt: 2 }}>
                  <KioskEmployeeCard dataUrl={registerBeardPreview} subtitle="Beard reference" compact />
                </Box>
              )}
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 2, py: 1.25, fontWeight: 700 }}
                disabled={loading || !registerFacePreview}
                onClick={handleRegisterSubmit}
              >
                Save Registration
              </Button>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  )
}
