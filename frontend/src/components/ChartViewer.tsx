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

const PALETTE = ["#2563eb", "#059669", "#d97706", "#475569", "#dc2626", "#0284c7"];

export const ChartViewer: React.FC<ChartViewerProps> = ({ chart, data }) => {
  const [activeType, setActiveType] = useState<string>(chart.type);

  if (!data || data.length === 0 || chart.type === "none") {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-dashed border-[#383838] rounded-lg text-[#6b6b6b] text-sm">
        <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
        <span>No visualization available</span>
      </div>
    );
  }

  const xKey = chart.x_key || Object.keys(data[0])[0];
  const yKeys = chart.y_keys && chart.y_keys.length > 0 ? chart.y_keys : [Object.keys(data[0])[1]];

  const tooltipStyle = {
    backgroundColor: "#171717",
    borderColor: "#383838",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#ececec",
  };

  return (
    <div className="bg-[#171717] border border-[#383838] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-[#ececec]">{chart.title || "Visualization"}</h4>
          {chart.description && <p className="text-xs text-[#8e8e8e] mt-0.5">{chart.description}</p>}
        </div>
        <div className="flex items-center gap-0.5 bg-[#2f2f2f] rounded-lg p-1">
          {[
            { type: "bar", icon: BarChart3 },
            { type: "line", icon: LineIcon },
            { type: "area", icon: Layers },
            { type: "pie", icon: PieIcon },
          ].map(({ type, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`p-1.5 rounded-md transition ${
                activeType === type ? "bg-[#424242] text-[#ececec]" : "text-[#6b6b6b] hover:text-[#ececec]"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
              <XAxis dataKey={xKey} stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <YAxis stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              {yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ fill: PALETTE[i % PALETTE.length], r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          ) : activeType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
              <XAxis dataKey={xKey} stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <YAxis stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {yKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.15} />
              ))}
            </AreaChart>
          ) : activeType === "pie" ? (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Pie data={data} dataKey={yKeys[0]} nameKey={xKey} cx="50%" cy="50%" outerRadius={95} innerRadius={45} paddingAngle={2} label={(entry) => `${entry[xKey]}: ${entry[yKeys[0]]}`}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : activeType === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
              <XAxis dataKey={xKey} name={xKey} stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <YAxis dataKey={yKeys[0]} name={yKeys[0]} stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} />
              <Scatter name={chart.title} data={data} fill="#2563eb" />
            </ScatterChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
              <XAxis dataKey={xKey} stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <YAxis stroke="#6b6b6b" tick={{ fill: "#8e8e8e", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
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
