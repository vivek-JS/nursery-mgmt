import React, { useState } from "react"
import { Box, Chip, TextField, Typography, Button, Paper } from "@mui/material"
import { styled } from "@mui/material/styles"

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 400,
  margin: "auto",
  backgroundColor: "white",
  borderRadius: theme.shape.borderRadius
}))

const TagsInput = ({ tags, onConfirm, onRemove, tag_title }) => {
  //   const [tags, setTags] = useState([
  //     "coding",
  //     "javascript",
  //     "html",
  //     "css",
  //     "php",
  //     "nodejs",
  //     "python"
  //   ])
  const [input, setInput] = useState("")

  const handleInputChange = (e) => {
    setInput(e.target.value)
  }

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  const addTag = () => {
    const trimmedInput = input.trim()
    if (trimmedInput && !tags?.includes(trimmedInput)) {
      onConfirm(trimmedInput)
    }
  }

  const removeTag = (tagToRemove) => {
    // setTags(tags.filter((tag) => tag !== tagToRemove))
    onRemove(tagToRemove)
  }

  const removeAllTags = () => {
    onRemove([])
  }

  return (
    <StyledPaper elevation={3}>
      <Typography variant="h6" gutterBottom>
        {tag_title}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Press enter or add a comma after each tag
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          mb: 2,
          p: 1,
          border: "1px solid #e0e0e0",
          borderRadius: 1
        }}>
        {tags?.map((tag) => (
          <Chip key={tag} label={tag} onDelete={() => removeTag(tag)} size="small" />
        ))}
        <TextField
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder="Add a tag..."
          variant="standard"
          size="small"
          sx={{ flexGrow: 1, "& .MuiInput-underline:before": { borderBottom: "none" } }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {tags?.length && (
          <Typography variant="body2" color="textSecondary">
            {10 - tags?.length} tags are remaining
          </Typography>
        )}{" "}
        <Button onClick={removeAllTags} variant="contained" color="primary" size="small">
          Remove All
        </Button>
      </Box>
    </StyledPaper>
  )
}

export default TagsInput
