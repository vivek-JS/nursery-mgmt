import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Link as MuiLink,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Link } from "react-router-dom";
import SecondaryOutwardDialog from "../../dialogs/SecondaryOutwardDialog";
import VehicleLoadDialog from "../../dialogs/VehicleLoadDialog";
import { fetchOrdersReadyForDispatch, fetchVehicleDispatches } from "../../utils/pipelineApi";
import { formatPipelineDate } from "../../utils/pipelineLabels";

export default function DispatchSection({
  batchId,
  batchDoc,
  locations,
  onRefresh,
}) {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [outwardOpen, setOutwardOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const loadOrders = useCallback(async () => {
    if (!batchId) {
      setOrders([]);
      return;
    }
    try {
      const list = await fetchOrdersReadyForDispatch(batchId);
      setOrders(list);
    } catch {
      setOrders([]);
    }
  }, [batchId]);

  const loadVehicles = useCallback(async () => {
    try {
      const { items } = await fetchVehicleDispatches(1, "");
      setVehicles(items);
    } catch {
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadVehicles();
  }, [loadOrders, loadVehicles]);

  const secondaryOutward = batchDoc?.secondaryOutward ?? [];

  if (!batchId) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">Select a batch for dispatch operations.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          component={Link}
          to="/u/dispatch-orders"
          endIcon={<OpenInNewIcon />}
          size="small"
        >
          Fleet / dispatch orders
        </Button>
      </Stack>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%", pr: 2 }}>
            <Typography fontWeight={600}>Order-linked dispatch</Typography>
            <Box flex={1} />
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setOutwardOpen(true);
              }}
            >
              Dispatch to order
            </Button>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Ready orders: {orders.length}
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Trays</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Linked order</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {secondaryOutward.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No secondary outward (dispatch) records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  secondaryOutward.map((row) => (
                    <TableRow key={String(row._id)}>
                      <TableCell>{formatPipelineDate(row.secondaryOutwardDate)}</TableCell>
                      <TableCell align="right">{row.numberOfTrays ?? "—"}</TableCell>
                      <TableCell>{row.size ?? "—"}</TableCell>
                      <TableCell>{row.linkedOrderId ? String(row.linkedOrderId).slice(-8) : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Vehicle dispatch load</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No active vehicle dispatches.{" "}
                      <MuiLink component={Link} to="/u/dispatch-orders">
                        Create in dispatch orders
                      </MuiLink>
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.slice(0, 15).map((v) => (
                    <TableRow key={String(v._id)}>
                      <TableCell>{v.vehicleName ?? v.driverName ?? v._id}</TableCell>
                      <TableCell>{formatPipelineDate(v.dispatchDate ?? v.createdAt)}</TableCell>
                      <TableCell>{v.status ?? "—"}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedDispatch(v);
                            setVehicleOpen(true);
                          }}
                        >
                          Load stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <SecondaryOutwardDialog
        open={outwardOpen}
        onClose={() => setOutwardOpen(false)}
        batchId={batchId}
        batchDoc={batchDoc}
        locations={locations}
        orders={orders}
        onSuccess={() => {
          onRefresh?.();
          loadOrders();
        }}
      />
      <VehicleLoadDialog
        open={vehicleOpen}
        onClose={() => {
          setVehicleOpen(false);
          setSelectedDispatch(null);
        }}
        dispatch={selectedDispatch}
        batchId={batchId}
        onSuccess={() => {
          onRefresh?.();
          loadVehicles();
        }}
      />
    </Box>
  );
}
