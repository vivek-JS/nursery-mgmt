import React from "react"
import { TableCell, Tooltip, Typography, Box } from "@mui/material"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import { getColumnGuide } from "./misGuide"

export default function MisColumnHeader({ colKey, label, align = "center", sx = {}, children }) {
  const guide = getColumnGuide(colKey)
  const content = children ?? label

  const labelBlock = (
    <Box
      component="span"
      display="inline-flex"
      alignItems="center"
      justifyContent={align === "left" ? "flex-start" : "center"}
      gap={0.25}>
      {content}
      {guide ? <HelpOutlineIcon sx={{ fontSize: 12, opacity: 0.45, flexShrink: 0 }} aria-hidden /> : null}
    </Box>
  )

  return (
    <TableCell
      align={align}
      data-tour={`mis-col-${colKey}`}
      sx={{
        fontWeight: 700,
        fontSize: 11,
        py: 1.25,
        whiteSpace: "nowrap",
        cursor: guide ? "help" : undefined,
        ...sx,
      }}>
      {guide ? (
        <Tooltip
          title={
            <Box sx={{ maxWidth: 280 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {guide.title}
              </Typography>
              <Typography variant="caption" component="div" sx={{ lineHeight: 1.45 }}>
                {guide.body}
              </Typography>
            </Box>
          }
          arrow
          placement="top"
          enterDelay={200}>
          {labelBlock}
        </Tooltip>
      ) : (
        labelBlock
      )}
    </TableCell>
  )
}
