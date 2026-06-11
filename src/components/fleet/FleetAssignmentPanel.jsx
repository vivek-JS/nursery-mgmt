import React, { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Truck } from "lucide-react";
import {
  loadFleetOwners,
  loadFleetForOwner,
  formatFleetDriverLabel,
  getFleetDriverId,
  emptyFleetAssignment,
} from "./fleetPickersUtils";

const inputClass =
  "mt-1 block w-full border border-slate-300 rounded-lg shadow-sm p-2.5 bg-white text-sm disabled:bg-slate-100 disabled:text-slate-500";

/**
 * @param {{
 *   value?: object,
 *   onChange: (next: object) => void,
 *   disabled?: boolean,
 *   compact?: boolean,
 *   showRemarks?: boolean,
 *   autoSelectSingle?: boolean,
 *   mui?: boolean,
 *   remarksExpandedDefault?: boolean,
 * }} props
 */
export default function FleetAssignmentPanel({
  value,
  onChange,
  disabled = false,
  compact = false,
  showRemarks = true,
  autoSelectSingle = true,
  mui = false,
  remarksExpandedDefault = false,
}) {
  const v = { ...emptyFleetAssignment(), ...(value || {}) };
  const [owners, setOwners] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [remarksOpen, setRemarksOpen] = useState(remarksExpandedDefault);

  const patch = useCallback(
    (partial) => {
      onChange({ ...emptyFleetAssignment(), ...value, ...partial });
    },
    [onChange, value]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOwners(true);
      const list = await loadFleetOwners();
      if (cancelled) return;
      setOwners(list);
      setLoadingOwners(false);
      if (autoSelectSingle && list.length === 1 && !v.ownerId) {
        patch({ ownerId: getFleetDriverId(list[0]) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoSelectSingle]);

  useEffect(() => {
    if (!v.ownerId) {
      setDrivers([]);
      setVehicles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingFleet(true);
      const { drivers: dr, vehicles: ve } = await loadFleetForOwner(v.ownerId);
      if (cancelled) return;
      setDrivers(dr);
      setVehicles(ve);
      setLoadingFleet(false);
      const next = {};
      if (autoSelectSingle && dr.length === 1 && !v.driverId) {
        next.driverId = getFleetDriverId(dr[0]);
      }
      if (autoSelectSingle && ve.length === 1 && !v.vehicleId) {
        next.vehicleId = getFleetDriverId(ve[0]);
      }
      if (Object.keys(next).length) patch(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [v.ownerId, autoSelectSingle]);

  const onOwnerChange = (ownerId) => {
    onChange({
      ...v,
      ownerId,
      driverId: "",
      vehicleId: "",
    });
  };

  const SelectField = mui
    ? MuiSelectField
    : ({ label, children, ...rest }) => (
        <div>
          <label className="block text-xs font-medium text-slate-600">{label}</label>
          <select className={inputClass} {...rest}>
            {children}
          </select>
        </div>
      );

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/60 ${
        compact ? "p-3 space-y-3" : "p-4 space-y-4"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Truck className="text-slate-600 shrink-0" size={18} />
        Transport assignment
      </div>

      {(loadingOwners || loadingFleet) && (
        <div className="h-1 w-full bg-slate-200 rounded overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse w-1/2" />
        </div>
      )}

      <div
        className={`grid gap-3 ${
          compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
        }`}
      >
        <SelectField
          label="Owner"
          value={v.ownerId}
          onChange={(e) => onOwnerChange(e.target.value)}
          disabled={disabled || loadingOwners}
          required
        >
          <option value="">Select owner</option>
          {owners.map((o) => (
            <option key={getFleetDriverId(o)} value={getFleetDriverId(o)}>
              {o.name || getFleetDriverId(o)}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Driver"
          value={v.driverId}
          onChange={(e) => patch({ driverId: e.target.value })}
          disabled={disabled || !v.ownerId || loadingFleet}
          required
        >
          <option value="">Select driver</option>
          {drivers.map((d) => (
            <option key={getFleetDriverId(d)} value={getFleetDriverId(d)}>
              {formatFleetDriverLabel(d)}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Vehicle"
          value={v.vehicleId}
          onChange={(e) => patch({ vehicleId: e.target.value })}
          disabled={disabled || !v.ownerId || loadingFleet}
          required
        >
          <option value="">Select vehicle</option>
          {vehicles.map((veh) => (
            <option key={getFleetDriverId(veh)} value={getFleetDriverId(veh)}>
              {[veh.number, veh.name].filter(Boolean).join(" — ") || getFleetDriverId(veh)}
            </option>
          ))}
        </SelectField>
      </div>

      {showRemarks ? (
        <div className="border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setRemarksOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            {remarksOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Transport notes (optional)
          </button>
          {remarksOpen ? (
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Route notes</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Loading time, area, sequence…"
                  value={v.routeNotes}
                  onChange={(e) => patch({ routeNotes: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Driver remark</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Call before arrival, language…"
                    value={v.driverRemark}
                    onChange={(e) => patch({ driverRemark: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Vehicle remark</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="Height limit, crate type…"
                    value={v.vehicleRemark}
                    onChange={(e) => patch({ vehicleRemark: e.target.value })}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Lazy MUI path — only used when mui=true */
function MuiSelectField({ label, children, ...rest }) {
  const [TextField, setTextField] = useState(null);
  const [MenuItem, setMenuItem] = useState(null);

  useEffect(() => {
    import("@mui/material").then((m) => {
      setTextField(() => m.TextField);
      setMenuItem(() => m.MenuItem);
    });
  }, []);

  if (!TextField || !MenuItem) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600">{label}</label>
        <select className={inputClass} {...rest}>
          {children}
        </select>
      </div>
    );
  }

  const childArray = React.Children.toArray(children).filter(
    (c) => c.type === "option" && c.props.value !== ""
  );

  return (
    <TextField
      select
      fullWidth
      size="small"
      label={typeof label === "string" ? label : " "}
      InputLabelProps={typeof label !== "string" ? { shrink: true } : undefined}
      {...rest}
    >
      {childArray.map((opt) => (
        <MenuItem key={opt.props.value} value={opt.props.value}>
          {opt.props.children}
        </MenuItem>
      ))}
    </TextField>
  );
}
