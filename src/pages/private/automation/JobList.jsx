import React from "react";
import axios from "axios";
import { Card, CardContent, Typography, List, ListItem, ListItemText, Button, Box, Chip } from "@mui/material";

const JobList = ({ onSelect }) => {
  const [jobs, setJobs] = React.useState([]);

  const fetch = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await axios.get("/api/v1/automations", { headers: { Authorization: `Bearer ${token}` } });
      setJobs(res.data || []);
    } catch (e) {
      console.warn(e);
    }
  };

  React.useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => clearInterval(iv);
  }, []);

  const startJob = async (id) => {
    const token = localStorage.getItem("auth_token");
    await axios.post(`/api/v1/automations/${id}/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetch();
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Jobs
        </Typography>
        <List>
          {jobs.map((j) => (
            <ListItem key={j._id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography variant="subtitle1">{j.name}</Typography>
                    <Chip label={j.status} size="small" />
                  </Box>
                }
                secondary={`${j.targets?.length || 0} targets • created ${new Date(j.createdAt).toLocaleString()}`}
              />
              <Box>
                <Button size="small" onClick={() => onSelect && onSelect(j)}>
                  Select
                </Button>
                <Button size="small" sx={{ ml: 1 }} onClick={() => startJob(j._id)}>
                  Start
                </Button>
              </Box>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default JobList;

