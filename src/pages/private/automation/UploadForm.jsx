import React from "react";
import axios from "axios";
import { Card, CardContent, Typography, Button, FormControlLabel, Checkbox } from "@mui/material";

const UploadForm = ({ onCreated }) => {
  const fileRef = React.useRef();
  const [loading, setLoading] = React.useState(false);
  const [enforce, setEnforce] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const file = fileRef.current.files[0];
    if (!file) return alert("Select Excel file");
    const form = new FormData();
    form.append("file", file);
    form.append("column", "Mobile");
    form.append("message", "Hello from Ram");
    form.append("enforceOptIn", enforce ? "true" : "false");
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const res = await axios.post("/api/v1/automations/upload-and-create", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Created job ${res.data.jobId} with ${res.data.targetsCount} targets`);
      if (onCreated) onCreated({ _id: res.data.jobId });
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Excel
        </Typography>
        <form onSubmit={submit}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" />
          <FormControlLabel
            control={<Checkbox checked={enforce} onChange={(e) => setEnforce(e.target.checked)} />}
            label="Enforce opt-in"
            sx={{ ml: 2 }}
          />
          <div style={{ marginTop: 8 }}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Uploading..." : "Upload & Create Job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UploadForm;

