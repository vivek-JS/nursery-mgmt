import React from "react";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  FormControl,
  InputLabel,
  FormControlLabel,
  Radio,
} from "@mui/material";

const MessageComposer = ({ selectedJob }) => {
  const [type, setType] = React.useState("text");
  const [text, setText] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [mediaList, setMediaList] = React.useState([]);
  const [selectedMedia, setSelectedMedia] = React.useState([]);
  const fileRef = React.useRef();
  const [profiles, setProfiles] = React.useState([]);
  const [selectedProfile, setSelectedProfile] = React.useState(null);
  const [farmerLists, setFarmerLists] = React.useState([]);
  const [selectedFarmerList, setSelectedFarmerList] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await axios.get("/api/v1/media", { headers: { Authorization: `Bearer ${token}` } });
        setMediaList(res.data || []);
      } catch (e) {
        console.warn(e);
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    const loadLists = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await axios.get("/api/v1/farmer-list", { headers: { Authorization: `Bearer ${token}` } });
        // controller returns generateResponse format: data is in res.data.data
        const lists = res.data?.data || res.data || [];
        setFarmerLists(lists);
      } catch (e) {
        console.warn(e);
      }
    };
    loadLists();
  }, []);

  React.useEffect(() => {
    const loadProfiles = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await axios.get("/api/v1/profiles", { headers: { Authorization: `Bearer ${token}` } });
        setProfiles(res.data || []);
        if (res.data && res.data.length > 0) setSelectedProfile(res.data[0]._id);
      } catch (e) {
        console.warn(e);
      }
    };
    loadProfiles();
  }, []);

  const uploadFile = async (file) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await axios.post("/api/v1/media/upload", form, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      setMediaList((m) => [res.data, ...m]);
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Upload failed");
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (f) uploadFile(f);
  };

  const toggleMedia = (m) => {
    const id = String(m._id || m.mediaId);
    setSelectedMedia((s) => {
      if (s.find((x) => String(x._id || x.mediaId) === id)) return s.filter((x) => String(x._id || x.mediaId) !== id);
      return [m, ...s];
    });
  };

  const sendToJobTargets = async () => {
    if (!selectedJob) return alert("Select a job first");
    const targets = (selectedJob.targets || []).filter((t) => !t.status || t.status === "pending").map((t) => ({
      name: t.name,
      phone: t.phone,
      farmerId: t.farmerId,
      message: "",
    }));
    if (targets.length === 0) return alert("No pending targets in selected job");
    const message = type === "text" ? text : `Video: ${videoUrl}`;
    if (!message) return alert("Enter message or video URL");
    try {
      setSending(true);
      const token = localStorage.getItem("auth_token");
      const body = {
        name: `Ad-hoc send for ${selectedJob.name}`,
        message,
        mode: "immediate",
        batchSize: 30,
        targets,
        mediaIds: selectedMedia.map((m) => m.mediaId || m._id),
        profileId: selectedProfile || null,
      };
      // preview first to show dedupe counts
      const previewRes = await axios.post("/api/v1/automations?preview=true", body, { headers: { Authorization: `Bearer ${token}` } });
      const preview = previewRes.data;
      if (preview && preview.preview) {
        if (!confirm(`Campaign will send to ${preview.uniqueRecipients} unique recipients. Duplicates skipped: ${preview.duplicatesCount}. Proceed?`)) {
          setSending(false);
          return;
        }
      }
      const res = await axios.post("/api/v1/automations", body, { headers: { Authorization: `Bearer ${token}` } });
      const jobId = res.data.jobId;
      await axios.post(`/api/v1/automations/${jobId}/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert("Message queued and sending started");
    } catch (e) {
      alert(e.response?.data?.error || e.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const sendToAllFarmers = async () => {
    alert("Use Upload Excel to create targets or select a job.");
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Message Composer
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel control={<Radio checked={type === "text"} onChange={() => setType("text")} />} label="Text" />
            <FormControlLabel control={<Radio checked={type === "video"} onChange={() => setType("video")} />} label="Video URL" />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2">Media (upload or choose)</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <input ref={fileRef} type="file" onChange={onFileChange} />
              <Box sx={{ display: "flex", gap: 1, overflowX: "auto" }}>
                {mediaList.slice(0, 8).map((m) => {
                  const isSelected = selectedMedia.some((s) => String(s._id || s.mediaId) === String(m._id || m.mediaId));
                  return (
                    <Box
                      key={m._id || m.mediaId}
                      onClick={() => toggleMedia(m)}
                      sx={{
                        border: isSelected ? "2px solid primary.main" : "1px solid #ddd",
                        p: 0.5,
                        borderRadius: 1,
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        bgcolor: "#fff",
                      }}
                    >
                      {m.mimeType && m.mimeType.startsWith("image") ? (
                        <img src={m.url} alt={m.originalName} style={{ maxWidth: "100%", maxHeight: "100%" }} />
                      ) : (
                        <Typography variant="caption" align="center">
                          {m.originalName}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            {type === "text" ? (
              <TextField fullWidth multiline minRows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write message..." />
            ) : (
              <TextField fullWidth value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste video URL" />
            )}
          </Grid>

      <Grid item xs={12} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="contained" onClick={sendToJobTargets} disabled={sending || !selectedJob}>
              {sending ? "Sending..." : "Send to selected job targets"}
            </Button>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="profile-select-label">Profile</InputLabel>
              <Select labelId="profile-select-label" value={selectedProfile || ""} label="Profile" onChange={(e) => setSelectedProfile(e.target.value)}>
                <MenuItem value="">
                  <em>Choose profile</em>
                </MenuItem>
                {profiles.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="farmerlist-select-label">Farmer List</InputLabel>
          <Select
            labelId="farmerlist-select-label"
            value={selectedFarmerList || ""}
            label="Farmer List"
            onChange={(e) => setSelectedFarmerList(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {farmerLists.map((l) => (
              <MenuItem key={l._id} value={l._id}>
                {l.name} ({(l.farmers || []).length})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" disabled onClick={sendToAllFarmers}>
          Send to all farmers
        </Button>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Note: Video sending currently sends the URL as text. For file attachments, use the worker with media support.
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default MessageComposer;

