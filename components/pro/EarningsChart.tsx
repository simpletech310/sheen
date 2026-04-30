"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EarningsChart({
  data,
}: {
  data: { label: string; cents: number }[];
}) {
  // Render dollars (not cents) on the chart for human-readable axes.
  const series = data.map((d) => ({ ...d, dollars: d.cents / 100 }));

  return (
    <div className="w-full" style={{ height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={series} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(250,250,247,0.6)" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "rgba(250,250,247,0.6)" }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,163,0,0.15)" }}
            contentStyle={{
              background: "#0A0A0A",
              color: "#FAFAF7",
              border: "1px solid rgba(255,163,0,0.4)",
              fontSize: 12,
            }}
            formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Net"]}
          />
          <Bar dataKey="dollars" fill="#FFA300" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
