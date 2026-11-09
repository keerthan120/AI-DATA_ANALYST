"use client";

import React, { useState } from "react";
import { ChartConfig } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Layers, CircleDot } from "lucide-react";

interface ChartViewerProps {
  chart: ChartConfig;
  data: Record<string, any>[];
}

const PALETTE = ["#2cb8b2", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"];

export const ChartViewer: React.FC<ChartViewerProps> = ({ chart, data }) => {
  const [activeType, setActiveType] = useState<string>(chart.type);

  if (!data || data.length === 0 || chart.type === "none") {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-[#e2e8f0] rounded-xl bg-[#f8fafc] text-[#94a3b8] text-sm">
        <BarChart3 className="w-8 h-8 mb-2 opacity-40 text-[#2cb8b2]" />
        <span>No visualization available for this query</span>
      </div>
    );
  }

  const xKey = chart.x_key || Object.keys(data[0])[0];
  const yKeys = chart.y_keys && chart.y_keys.length > 0 ? chart.y_keys : [Object.keys(data[0])[1]];

  const tooltipStyle = {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#0f172a",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-[#0f172a]">{chart.title || "Data Visualization"}</h4>
          {chart.description && <p className="text-xs text-[#64748b] mt-0.5">{chart.description}</p>}
        </div>
        <div className="flex items-center gap-0.5 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg p-0.5">
          {[
            { type: "bar", icon: BarChart3, label: "Bar" },
            { type: "line", icon: LineIcon, label: "Line" },
            { type: "area", icon: Layers, label: "Area" },
            { type: "pie", icon: PieIcon, label: "Pie" },
            { type: "scatter", icon: CircleDot, label: "Scatter" },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              title={`${label} Chart`}
              className={`p-1.5 rounded-md transition ${
                activeType === type ? "bg-white text-[#2cb8b2] shadow-xs font-medium" : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5} dot={{ fill: PALETTE[i % PALETTE.length], r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          ) : activeType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {yKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.2} strokeWidth={2} />
              ))}
            </AreaChart>
          ) : activeType === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Pie data={data} dataKey={yKeys[0]} nameKey={xKey} cx="50%" cy="50%" outerRadius={95} innerRadius={45} paddingAngle={3} label={(entry) => `${entry[xKey]}: ${entry[yKeys[0]]}`}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : activeType === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xKey} name={xKey} stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis dataKey={yKeys[0]} name={yKeys[0]} stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
              <Scatter name={chart.title} data={data} fill="#2cb8b2" />
            </ScatterChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={xKey} stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
