import React from "react"
import { Box, Card, CardActionArea, CardContent, CircularProgress, Grid, Typography } from "@mui/material"
import GrassIcon from "@mui/icons-material/Grass"
import { resolvePlantRowId } from "../deliveryReportConstants"

export default function StepPlant({ plants, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        कुठल्या रोपांची delivery पाहायची?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select the plant / crop for this delivery report.
      </Typography>
      <Grid container spacing={2}>
        {(plants || [])
          .map((p) => ({ plant: p, id: resolvePlantRowId(p) }))
          .filter(({ id }) => Boolean(id))
          .map(({ plant: p, id }) => {
          const selected = id === String(selectedId)
          return (
            <Grid item xs={12} sm={6} md={4} key={id}>
              <Card
                variant={selected ? "elevation" : "outlined"}
                sx={{
                  borderColor: selected ? "primary.main" : "divider",
                  borderWidth: selected ? 2 : 1,
                  bgcolor: selected ? "primary.50" : "background.paper",
                }}
              >
                <CardActionArea onClick={() => onSelect(id, p.name)}>
                  <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <GrassIcon color={selected ? "primary" : "action"} />
                    <Typography fontWeight={selected ? 700 : 500}>{p.name}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
