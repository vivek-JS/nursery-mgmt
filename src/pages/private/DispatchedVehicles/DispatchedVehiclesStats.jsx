import React from "react";
import { CheckCircle, Package, Truck, Users } from "lucide-react";

export default function DispatchedVehiclesStats({ stats }) {
  const cards = [
    { label: "Vehicles", value: stats.vehicles, icon: Truck, tone: "text-green-700 bg-green-50 border-green-100" },
    { label: "Orders", value: stats.orders, icon: Users, tone: "text-blue-700 bg-blue-50 border-blue-100" },
    { label: "Plants", value: stats.plants.toLocaleString(), icon: Package, tone: "text-purple-700 bg-purple-50 border-purple-100" },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className={`rounded-xl border px-4 py-3 shadow-sm ${tone.split(" ").slice(1).join(" ")}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${tone.split(" ")[0]}`}>{value}</p>
            </div>
            <Icon className={`h-8 w-8 opacity-70 ${tone.split(" ")[0]}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
