import React from "react"
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material"

export default function StepSubtype({
  plantName,
  subtypes,
  loading,
  selectedId,
  onSelect,
  onSkip,
}) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Subtype निवडा (optional)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Plant: <strong>{plantName || "—"}</strong>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Skip करा — सर्व subtypes समाविष्ट होतील.
      </Typography>

      <Button variant="outlined" onClick={onSkip} sx={{ mb: 2 }}>
        Skip — All subtypes
      </Button>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Grid container spacing={1.5}>
          {(subtypes || []).map((st) => {
            const id = String(st._id || st.id)
            const selected = id === String(selectedId)
            return (
              <Grid item xs={12} sm={6} md={4} key={id}>
                <Card
                  variant={selected ? "elevation" : "outlined"}
                  sx={{ borderColor: selected ? "primary.main" : "divider" }}
                >
                  <CardActionArea onClick={() => onSelect(id, st.name)}>
                    <CardContent>
                      <Typography fontWeight={selected ? 700 : 500}>{st.name}</Typography>
                      {selected ? <Chip size="small" label="Selected" color="primary" sx={{ mt: 1 }} /> : null}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Box>
  )
}
