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
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Layers } from "lucide-react";

interface ChartViewerProps {
  chart: ChartConfig;
  data: Record<string, any>[];
}

// Strictly neutral, professional data visualization palette (no purple gradients)
const PALETTE = ["#2563eb", "#059669", "#d97706", "#475569", "#dc2626", "#0284c7"];

export const ChartViewer: React.FC<ChartViewerProps> = ({ chart, data }) => {
  const [activeType, setActiveType] = useState<string>(chart.type);

  if (!data || data.length === 0 || chart.type === "none") {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-md text-zinc-500 text-xs">
        <BarChart3 className="w-8 h-8 mb-2 opacity-30 text-zinc-400" />
        <span>No visualization available for this query</span>
      </div>
    );
  }

  const xKey = chart.x_key || Object.keys(data[0])[0];
  const yKeys = chart.y_keys && chart.y_keys.length > 0 ? chart.y_keys : [Object.keys(data[0])[1]];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4">
      {/* Chart Header & Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100">{chart.title || "Data Visualization"}</h4>
          {chart.description && <p className="text-xs text-zinc-400 mt-0.5">{chart.description}</p>}
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1">
          <button
            onClick={() => setActiveType("bar")}
            className={`p-1.5 rounded transition ${activeType === "bar" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
            title="Bar Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveType("line")}
            className={`p-1.5 rounded transition ${activeType === "line" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
            title="Line Chart"
          >
            <LineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveType("area")}
            className={`p-1.5 rounded transition ${activeType === "area" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
            title="Area Chart"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveType("pie")}
            className={`p-1.5 rounded transition ${activeType === "pie" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
            title="Pie Chart"
          >
            <PieIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Render Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xKey} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "6px", fontSize: "12px", color: "#f43f5e" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {yKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ fill: PALETTE[i % PALETTE.length], r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : activeType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xKey} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "6px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {yKeys.map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.2}
                />
              ))}
            </AreaChart>
          ) : activeType === "pie" ? (
            <PieChart>
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "6px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Pie
                data={data}
                dataKey={yKeys[0]}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={45}
                paddingAngle={2}
                label={(entry) => `${entry[xKey]}: ${entry[yKeys[0]]}`}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : activeType === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xKey} name={xKey} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis dataKey={yKeys[0]} name={yKeys[0]} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "6px", fontSize: "12px" }}
              />
              <Scatter name={chart.title} data={data} fill="#2563eb" />
            </ScatterChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey={xKey} stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "6px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={PALETTE[i % PALETTE.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
