import React from "react";
import axios from "axios";
import { Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell, Button } from "@mui/material";

const JobHistory = ({ jobId }) => {
  const [events, setEvents] = React.useState([]);

  React.useEffect(() => {
    let cancelled = false;
    if (!jobId) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const res = await axios.get(`/api/v1/automations/${jobId}/history`, { headers: { Authorization: `Bearer ${token}` } });
        if (!cancelled) setEvents(res.data.events || []);
      } catch (e) {
        console.warn(e);
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [jobId]);

  const onExport = async () => {
    if (!jobId) return alert("Select a job");
    const token = localStorage.getItem("auth_token");
    try {
      const res = await axios.get(`/api/v1/automations/${jobId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `automation-${jobId}-events.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Export failed");
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          History
        </Typography>
        <div style={{ marginBottom: 8 }}>
          <Button onClick={onExport} disabled={!jobId} variant="outlined">
            Export CSV
          </Button>
        </div>
        {!jobId && <div>Select a job to view history</div>}
        {jobId && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e._id}>
                  <TableCell>{new Date(e.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{e.phone}</TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell style={{ maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.message}</TableCell>
                  <TableCell>{e.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default JobHistory;

