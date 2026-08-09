import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Link as MuiLink,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Link } from "react-router-dom";
import SecondaryOutwardDialog from "../../dialogs/SecondaryOutwardDialog";
import VehicleLoadDialog from "../../dialogs/VehicleLoadDialog";
import PipelineSectionCard from "../PipelineSectionCard";
import PipelineEmptyState from "../PipelineEmptyState";
import { fetchOrdersReadyForDispatch, fetchVehicleDispatches } from "../../utils/pipelineApi";
import { formatPipelineDate } from "../../utils/pipelineLabels";
import { STAGES, tableHeadSx, tableRowSx, contentPaperSx } from "../../utils/pipelineTheme";

export default function DispatchSection({ batchId, batchDoc, locations, onRefresh }) {
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
      <PipelineEmptyState
        icon={LocalShippingIcon}
        title="Dispatch"
        description="Link secondary inward stock to farmer orders or load vehicles."
        stageColor={STAGES.dispatch.color}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Button
          component={Link}
          to="/u/secondary-dispatch-monitor"
          endIcon={<OpenInNewIcon />}
          variant="contained"
          size="small"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            bgcolor: STAGES.dispatch.color,
            "&:hover": { bgcolor: STAGES.dispatch.color, filter: "brightness(0.92)" },
          }}
        >
          Dispatch monitor
        </Button>
        <Button
          component={Link}
          to="/u/dispatch-orders"
          endIcon={<OpenInNewIcon />}
          variant="outlined"
          size="small"
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Open fleet board
        </Button>
      </Box>

      <PipelineSectionCard
        stage={STAGES.dispatch}
        title="Order-linked dispatch"
        subtitle={`${orders.length} farmer order(s) ready for this batch`}
        count={secondaryOutward.length}
        actionLabel="Dispatch to order"
        actionIcon={AddIcon}
        onAction={() => setOutwardOpen(true)}
      >
        <TableContainer sx={contentPaperSx}>
          <Table size="small">
            <TableHead sx={tableHeadSx}>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell align="right">Trays</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Order</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {secondaryOutward.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No dispatch records yet — link inward stock to a ready farmer order.
                  </TableCell>
                </TableRow>
              ) : (
                secondaryOutward.map((row) => (
                  <TableRow key={String(row._id)} sx={tableRowSx}>
                    <TableCell>{formatPipelineDate(row.secondaryOutwardDate)}</TableCell>
                    <TableCell align="right">{row.numberOfTrays ?? "—"}</TableCell>
                    <TableCell>{row.size ?? "—"}</TableCell>
                    <TableCell>
                      {row.linkedOrderId ? (
                        <Chip size="small" label={`…${String(row.linkedOrderId).slice(-8)}`} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </PipelineSectionCard>

      <PipelineSectionCard
        stage={STAGES.dispatch}
        title="Vehicle load"
        subtitle="Pull stock from secondary shed onto active dispatches"
        count={vehicles.length}
        defaultOpen
      >
        <TableContainer sx={contentPaperSx}>
          <Table size="small">
            <TableHead sx={tableHeadSx}>
              <TableRow>
                <TableCell>Vehicle</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No active vehicles.{" "}
                      <MuiLink component={Link} to="/u/dispatch-orders">
                        Create a dispatch
                      </MuiLink>
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.slice(0, 15).map((v) => (
                  <TableRow key={String(v._id)} sx={tableRowSx}>
                    <TableCell>{v.vehicleName ?? v.driverName ?? "Vehicle"}</TableCell>
                    <TableCell>{formatPipelineDate(v.dispatchDate ?? v.createdAt)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={v.status ?? "Active"} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setSelectedDispatch(v);
                          setVehicleOpen(true);
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: "none",
                          bgcolor: STAGES.dispatch.color,
                          "&:hover": { bgcolor: STAGES.dispatch.color, filter: "brightness(0.92)" },
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
      </PipelineSectionCard>

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
