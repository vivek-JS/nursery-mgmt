import React from "react";
import axios from "axios";
import { Card, CardContent, Typography, TextField, Button, List, ListItem, ListItemText } from "@mui/material";

const ProfileManager = () => {
  const [profiles, setProfiles] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", userDataDir: "", description: "", active: true });

  const load = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const res = await axios.get("/api/v1/profiles", { headers: { Authorization: `Bearer ${token}` } });
      setProfiles(res.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      await axios.post("/api/v1/profiles", form, { headers: { Authorization: `Bearer ${token}` } });
      setForm({ name: "", userDataDir: "", description: "", active: true });
      load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete profile?")) return;
    const token = localStorage.getItem("auth_token");
    await axios.delete(`/api/v1/profiles/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6">WhatsApp Profiles</Typography>
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 8 }}>
          <TextField placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField
            placeholder="Chrome user-data-dir path"
            value={form.userDataDir}
            onChange={(e) => setForm({ ...form, userDataDir: e.target.value })}
          />
          <Button variant="contained" onClick={create}>
            Add
          </Button>
        </div>
        <div>
          {loading && <div>Loading...</div>}
          {!loading && (
            <List>
              {profiles.map((p) => (
                <ListItem key={p._id} secondaryAction={<Button onClick={() => remove(p._id)}>Delete</Button>}>
                  <ListItemText primary={`${p.name} ${p.active ? "(active)" : "(inactive)"}`} secondary={`${p.userDataDir} — ${p.description}`} />
                </ListItem>
              ))}
            </List>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileManager;

