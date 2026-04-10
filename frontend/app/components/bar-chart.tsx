"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CapabilityReport } from "../types";
import { CAPABILITY_LABELS } from "../types";

interface BarComparisonChartProps {
  capabilities: CapabilityReport[];
}

export default function BarComparisonChart({
  capabilities,
}: BarComparisonChartProps) {
  const data = capabilities.map((cap) => ({
    name: CAPABILITY_LABELS[cap.name] || cap.name,
    Base: cap.base_score,
    "Fine-tuned": cap.finetuned_score,
    status: cap.status,
  }));

  return (
    <div className="card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-6">
        Score Comparison
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#737373", fontSize: 11 }}
              axisLine={{ stroke: "#262626" }}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[0, 4]}
              tick={{ fill: "#737373", fontSize: 11 }}
              axisLine={{ stroke: "#262626" }}
              tickLine={false}
              ticks={[0, 1, 2, 3, 4]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: "8px",
                color: "#fff",
                fontSize: 13,
              }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#737373" }}
            />
            <Bar dataKey="Base" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((_, index) => (
                <Cell key={`base-${index}`} fill="#525252" />
              ))}
            </Bar>
            <Bar dataKey="Fine-tuned" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`ft-${index}`}
                  fill={
                    entry.status === "regression"
                      ? "#ffffff"
                      : entry.status === "improved"
                      ? "#d4d4d4"
                      : "#737373"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
