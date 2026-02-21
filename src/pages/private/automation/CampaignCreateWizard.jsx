import React from "react";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

const CampaignCreateWizard = () => {
  const [name, setName] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [file, setFile] = React.useState(null);
  const [farmerLists, setFarmerLists] = React.useState([]);
  const [selectedLists, setSelectedLists] = React.useState([]);
  const [preview, setPreview] = React.useState(null);
  const [profileId, setProfileId] = React.useState("");
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("auth_token");
      try {
        const res = await axios.get("/api/v1/farmer-list", { headers: { Authorization: `Bearer ${token}` } });
        const lists = res.data?.data || res.data || [];
        setFarmerLists(lists);
        const p = await axios.get("/api/v1/profiles", { headers: { Authorization: `Bearer ${token}` } });
        setProfiles(p.data || []);
      } catch (e) {
        console.error("Failed to load farmer lists or profiles:", e)
      }
    };
    load();
  }, []);

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const doPreview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("name", name);
        form.append("message", message);
        form.append("profileId", profileId);
        const res = await axios.post("/api/v1/campaigns/upload-and-create?preview=true", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPreview(res.data);
      } else {
        const res = await axios.post("/api/v1/campaigns?preview=true", {
          name,
          message,
          farmerListIds: selectedLists,
          profileId,
        }, { headers: { Authorization: `Bearer ${token}` } });
        setPreview(res.data);
      }
    } catch (e) {
      alert("Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const createAndStart = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      let campaignRes;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("name", name);
        form.append("message", message);
        form.append("profileId", profileId);
        campaignRes = await axios.post("/api/v1/campaigns/upload-and-create", form, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        campaignRes = await axios.post("/api/v1/campaigns", { name, message, farmerListIds: selectedLists, profileId }, { headers: { Authorization: `Bearer ${token}` } });
      }
      const campaignId = campaignRes.data.campaignId;
      await axios.post(`/api/v1/campaigns/${campaignId}/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert("Campaign created and started");
    } catch (e) {
      alert("Create failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Create Campaign</Typography>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <TextField fullWidth label="Campaign Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth multiline label="Message" value={message} onChange={(e) => setMessage(e.target.value)} sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="profile-label">Profile</InputLabel>
            <Select labelId="profile-label" value={profileId} label="Profile" onChange={(e) => setProfileId(e.target.value)}>
              <MenuItem value=""><em>None</em></MenuItem>
              {profiles.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Typography variant="subtitle2">Add recipients:</Typography>
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <input type="file" accept=".xlsx,.xls" onChange={onFileChange} />
          </div>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="lists-label">Or choose Farmer Lists</InputLabel>
            <Select labelId="lists-label" multiple value={selectedLists} onChange={(e) => setSelectedLists(e.target.value)} renderValue={(v)=>v.join(", ")}>
              {farmerLists.map((l)=> <MenuItem key={l._id} value={l._id}>{l.name} ({(l.farmers||[]).length})</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" onClick={doPreview} disabled={loading}>Preview</Button>
            <Button variant="contained" onClick={createAndStart} disabled={loading}>Create & Start</Button>
          </Box>
        </CardContent>
      </Card>
      {preview && (
        <Card variant="outlined">
          <CardContent>
            <Typography>Preview: {preview.uniqueRecipients} unique recipients, {preview.duplicatesCount} duplicates</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CampaignCreateWizard;

