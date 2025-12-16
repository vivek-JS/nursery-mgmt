import React, { useState, useEffect } from "react"
import Dialog from "@mui/material/Dialog"
import DialogContent from "@mui/material/DialogContent"
import { Box, Typography, Button, Fade, Grow } from "@mui/material"
import { styled, keyframes } from "@mui/material/styles"
import CloseIcon from "@mui/icons-material/Close"
import WbTwilightIcon from "@mui/icons-material/WbTwilight"
import { useSelector } from "react-redux"

// Animation keyframes
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: "24px",
    maxWidth: "600px",
    width: "95%",
    margin: "16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    position: "relative",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("sm")]: {
      width: "92%",
      maxWidth: "92%",
      margin: "auto",
      borderRadius: "20px",
      maxHeight: "85vh",
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
  },
  "& .MuiDialog-container": {
    [theme.breakpoints.down("sm")]: {
      alignItems: "center",
      justifyContent: "center",
    },
  },
}))

const ModalContainer = styled(Box)(({ theme }) => ({
  position: "relative",
  padding: "48px 40px",
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%)",
  backdropFilter: "blur(10px)",
  minHeight: "300px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  overflow: "auto",
  maxHeight: "90vh",
  [theme.breakpoints.down("sm")]: {
    padding: "28px 20px",
    minHeight: "auto",
    maxHeight: "85vh",
    justifyContent: "flex-start",
    paddingTop: "40px",
    paddingBottom: "28px",
  },
}))

const CloseButton = styled(Button)(({ theme }) => ({
  position: "absolute",
  top: "16px",
  right: "16px",
  minWidth: "auto",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  color: "white",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  [theme.breakpoints.down("sm")]: {
    top: "12px",
    right: "12px",
    width: "36px",
    height: "36px",
  },
}))

const GreetingBox = styled(Box)(({ theme }) => ({
  marginBottom: "32px",
  textAlign: "center",
  animation: `${fadeInUp} 0.6s ease-out`,
  width: "100%",
  [theme.breakpoints.down("sm")]: {
    marginBottom: "20px",
    padding: "0 8px",
  },
}))

const QuoteContainer = styled(Box)(({ theme }) => ({
  textAlign: "center",
  marginBottom: "32px",
  animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
  width: "100%",
  [theme.breakpoints.down("sm")]: {
    marginBottom: "20px",
    padding: "0 8px",
  },
}))

const QuoteLine = styled(Typography)(({ theme }) => ({
  fontSize: "28px",
  fontWeight: 600,
  lineHeight: 1.5,
  color: "#2d3748",
  marginBottom: "16px",
  fontFamily: "'Noto Sans Devanagari', 'Arial Unicode MS', sans-serif",
  wordWrap: "break-word",
  overflowWrap: "break-word",
  [theme.breakpoints.down("sm")]: {
    fontSize: "20px",
    lineHeight: 1.4,
    marginBottom: "10px",
    padding: "0 4px",
  },
}))

const TimeBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  marginTop: "24px",
  padding: "12px 24px",
  backgroundColor: "rgba(102, 126, 234, 0.1)",
  borderRadius: "16px",
  animation: `${fadeInUp} 1s ease-out 0.4s both`,
  [theme.breakpoints.down("sm")]: {
    padding: "8px 16px",
    marginTop: "16px",
    gap: "6px",
  },
}))

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: "24px",
  padding: "12px 48px",
  borderRadius: "24px",
  fontSize: "16px",
  fontWeight: 600,
  textTransform: "none",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
  animation: `${fadeInUp} 1s ease-out 0.6s both`,
  "&:hover": {
    background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
    boxShadow: "0 6px 20px rgba(102, 126, 234, 0.5)",
    transform: "translateY(-2px)",
  },
  transition: "all 0.3s ease",
  [theme.breakpoints.down("sm")]: {
    padding: "10px 32px",
    fontSize: "14px",
    marginTop: "16px",
    width: "auto",
    minWidth: "140px",
  },
}))

const DecorativeCircle = styled(Box)(({ theme }) => ({
  position: "absolute",
  borderRadius: "50%",
  background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
  animation: `${pulse} 3s ease-in-out infinite`,
  "&.circle1": {
    width: "120px",
    height: "120px",
    top: "-60px",
    right: "-60px",
  },
  "&.circle2": {
    width: "80px",
    height: "80px",
    bottom: "-40px",
    left: "-40px",
    animationDelay: "1s",
  },
  [theme.breakpoints.down("sm")]: {
    "&.circle1": {
      width: "80px",
      height: "80px",
      top: "-40px",
      right: "-40px",
    },
    "&.circle2": {
      width: "60px",
      height: "60px",
      bottom: "-30px",
      left: "-30px",
    },
  },
}))

const MotivationalQuoteModal = ({ open, onClose, quote }) => {
  const { user } = useSelector((store) => store.app)
  const [currentTime, setCurrentTime] = useState("")
  const [greeting, setGreeting] = useState("")

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

      setCurrentTime(timeString)

      // Determine greeting based on time
      let timeGreeting = "नमस्कार" // Default greeting
      if (hours >= 5 && hours < 12) {
        timeGreeting = "सुप्रभात"
      } else {
        timeGreeting = "नमस्कार"
      }

      setGreeting(timeGreeting)
    }

    updateTimeAndGreeting()
    const interval = setInterval(updateTimeAndGreeting, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Format user name - add "भाई" if not already present
  const userName = user?.name 
    ? (user.name.toLowerCase().includes("भाई") || user.name.toLowerCase().includes("bhai") 
        ? user.name 
        : `${user.name} भाई`)
    : "भाई"

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 400 }}
      maxWidth="sm"
      fullWidth
      fullScreen={false}
      PaperProps={{
        sx: {
          m: 0,
          "@media (max-width: 600px)": {
            margin: "auto",
            maxHeight: "85vh",
          },
        },
      }}
      sx={{
        "@media (max-width: 600px)": {
          "& .MuiDialog-container": {
            alignItems: "center",
            justifyContent: "center",
          },
        },
      }}>
      <ModalContainer>
        <DecorativeCircle className="circle1" />
        <DecorativeCircle className="circle2" />

        <CloseButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </CloseButton>

        <GreetingBox>
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: "18px", sm: "24px" },
              fontWeight: 700,
              color: "#667eea",
              marginBottom: "8px",
              wordWrap: "break-word",
              overflowWrap: "break-word",
            }}>
            {greeting} {userName}!
          </Typography>
          <TimeBox>
            <WbTwilightIcon sx={{ color: "#667eea", fontSize: { xs: "18px", sm: "20px" } }} />
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "13px", sm: "16px" },
                fontWeight: 600,
                color: "#667eea",
              }}>
              {currentTime}
            </Typography>
          </TimeBox>
        </GreetingBox>

        {quote && (
          <QuoteContainer>
            <QuoteLine>{quote.line1}</QuoteLine>
            <QuoteLine sx={{ color: "#667eea", fontWeight: 700 }}>
              {quote.line2}
            </QuoteLine>
          </QuoteContainer>
        )}

        <ActionButton onClick={onClose} variant="contained">
          आभारी आहे
        </ActionButton>
      </ModalContainer>
    </StyledDialog>
  )
}

export default MotivationalQuoteModal

