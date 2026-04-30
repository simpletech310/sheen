"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: { date: string; gmv: number }[] }) {
  return (
    <div className="w-full" style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#5A5A56" }} />
          <YAxis tick={{ fontSize: 10, fill: "#5A5A56" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            cursor={{ fill: "#E8E6E0" }}
            contentStyle={{ background: "#0A0A0A", color: "#FAFAF7", border: "none" }}
            formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "GMV"]}
          />
          <Bar dataKey="gmv" fill="#003594" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
