import React from "react";
import axios from "axios";
import { Card, CardContent, Typography, List, ListItem, ListItemText, Button, Box, Chip } from "@mui/material";

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = React.useState([]);

  const fetch = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await axios.get("/api/v1/campaigns", { headers: { Authorization: `Bearer ${token}` } });
      setCampaigns(res.data || []);
    } catch (e) {
      console.warn(e);
    }
  };

  React.useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => clearInterval(iv);
  }, []);

  const start = async (id) => {
    const token = localStorage.getItem("auth_token");
    await axios.post(`/api/v1/campaigns/${id}/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetch();
  };
  const pause = async (id) => {
    const token = localStorage.getItem("auth_token");
    await axios.post(`/api/v1/campaigns/${id}/pause`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetch();
  };
  const stop = async (id) => {
    if (!confirm("Stop campaign? This will skip remaining targets.")) return;
    const token = localStorage.getItem("auth_token");
    await axios.post(`/api/v1/campaigns/${id}/stop`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetch();
  };
  const resume = async (id) => {
    const token = localStorage.getItem("auth_token");
    await axios.post(`/api/v1/campaigns/${id}/resume`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetch();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Campaigns
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <List>
            {campaigns.map((c) => (
              <ListItem key={c._id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Typography variant="subtitle1">{c.name}</Typography>
                      <Chip label={c.status} size="small" />
                    </Box>
                  }
                  secondary={`${c.recipientsCount || 0} recipients • duplicates ${c.duplicatesCount || 0} • created ${new Date(c.createdAt).toLocaleString()}`}
                />
                <Box>
                  <Button size="small" onClick={() => start(c._id)} disabled={c.status === "active"}>
                    Start
                  </Button>
                  <Button size="small" sx={{ ml: 1 }} onClick={() => pause(c._id)} disabled={c.status !== "active"}>
                    Pause
                  </Button>
                  <Button size="small" sx={{ ml: 1 }} onClick={() => stop(c._id)}>
                    Stop
                  </Button>
                  <Button size="small" sx={{ ml: 1 }} onClick={() => resume(c._id)} disabled={c.status === "active"}>
                    Resume
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CampaignsPage;

